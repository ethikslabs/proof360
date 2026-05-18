#!/usr/bin/env node
/**
 * Ingram AU catalogue pull — trust-relevant vendors only.
 *
 * Searches the Ingram v6 catalog by each vendor in the shortlist,
 * filters to trust-relevant SKUs, maps to proof360 vendor IDs,
 * writes docs/ingram-catalogue.json.
 *
 * Load credentials from SSM before running:
 *   export INGRAM_CLIENT_ID=$(aws ssm get-parameter --name /ethikslabs/ingram/client-id --with-decryption --query Parameter.Value --output text)
 *   export INGRAM_CLIENT_SECRET=$(aws ssm get-parameter --name /ethikslabs/ingram/client-secret --with-decryption --query Parameter.Value --output text)
 *   export INGRAM_CUSTOMER_NUMBER=$(aws ssm get-parameter --name /ethikslabs/ingram/customer-number --query Parameter.Value --output text)
 *   node scripts/ingram-catalogue-pull.js
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT_PATH = path.join(ROOT, 'docs', 'ingram-catalogue.json');

const BASE_URL = 'https://api.ingrammicro.com:443/resellers/v6';
const TOKEN_URL = 'https://api.ingrammicro.com:443/oauth/oauth20/token';

const CLIENT_ID = process.env.INGRAM_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.INGRAM_CLIENT_SECRET ?? '';
const CUSTOMER_NUMBER = process.env.INGRAM_CUSTOMER_NUMBER ?? '';

if (!CLIENT_ID || !CLIENT_SECRET || !CUSTOMER_NUMBER) {
  console.error('Missing required env: INGRAM_CLIENT_ID, INGRAM_CLIENT_SECRET, INGRAM_CUSTOMER_NUMBER');
  process.exit(1);
}

// Vendors to pull — Ingram AU cybersecurity catalog (ingram-au-public-vendors.md)
// Each entry: { search: string for API keyword, vendor_id: proof360 vendors.js key }
const VENDOR_SHORTLIST = [
  { search: 'Cisco',              vendor_id: 'cisco_duo'      }, // covers Duo + Umbrella + all Cisco
  { search: 'Palo Alto Networks', vendor_id: 'palo_alto'      },
  { search: 'Fortinet',           vendor_id: 'fortinet'       },
  { search: 'SonicWall',          vendor_id: 'sonicwall'      },
  { search: 'Trellix',            vendor_id: 'trellix'        },
  { search: 'Trend Micro',        vendor_id: 'trendmicro'     },
  { search: 'Proofpoint',         vendor_id: 'proofpoint'     },
  { search: 'Veeam',              vendor_id: 'veeam'          },
  { search: 'Blancco',            vendor_id: 'blancco'        },
  { search: 'Microsoft',          vendor_id: 'microsoft'      },
  { search: 'Okta',               vendor_id: 'okta'           },
  { search: 'Nutanix',            vendor_id: 'nutanix'        },
  { search: 'Veritas',            vendor_id: 'veritas'        },
  { search: 'Acronis',            vendor_id: null             }, // in Ingram AU, not yet in vendors.js
  { search: 'AvePoint',           vendor_id: null             }, // M365 data governance + backup
  { search: 'Skyhigh Security',   vendor_id: null             }, // SASE / CASB / DLP
  { search: 'DocuSign',           vendor_id: 'docusign'       },
];

// Category filter — keep SKUs where any of these appear in category/subcategory/description
const TRUST_KEYWORDS = [
  'security', 'endpoint', 'firewall', 'identity', 'authentication', 'mfa',
  'backup', 'recovery', 'compliance', 'grc', 'siem', 'edr', 'xdr', 'sase',
  'zero trust', 'vpn', 'ddos', 'waf', 'email', 'encryption', 'dlp',
  'access management', 'threat', 'vulnerability', 'ransomware', 'governance',
  'network', 'cloud security', 'data protection',
];

function isTrustRelevant(product) {
  const text = [
    product.category,
    product.subCategory,
    product.productType,
    product.description,
    product.extraDescription,
  ].filter(Boolean).join(' ').toLowerCase();
  return TRUST_KEYWORDS.some(kw => text.includes(kw));
}

// ── Auth ─────────────────────────────────────────────────────────────────────

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }).toString(),
  });

  if (!res.ok) throw new Error(`Token ${res.status}: ${await res.text()}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return cachedToken;
}

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'IM-CustomerNumber': CUSTOMER_NUMBER,
    'IM-CountryCode': 'AU',
    'IM-CorrelationID': randomUUID().replace(/-/g, '').slice(0, 20),
    'Accept': 'application/json',
  };
}

// ── Catalog search ────────────────────────────────────────────────────────────

async function fetchCatalogPage(token, keyword, page) {
  const url = new URL(`${BASE_URL}/catalog`);
  url.searchParams.set('searchKeyword', keyword);
  url.searchParams.set('pageSize', '50');
  url.searchParams.set('pageNumber', String(page));

  const res = await fetch(url.toString(), { headers: headers(token) });
  if (!res.ok) throw new Error(`Catalog ${res.status}: ${await res.text()}`);
  return res.json();
}

function vendorNameMatches(productVendorName, searchTerm) {
  if (!productVendorName) return false;
  const name = productVendorName.toLowerCase();
  const term = searchTerm.toLowerCase();
  // exact match or vendor name starts with / contains the search term
  return name.includes(term) || term.includes(name);
}

async function searchVendor(token, vendorEntry) {
  const all = [];
  let page = 1;

  while (true) {
    const body = await fetchCatalogPage(token, vendorEntry.search, page);
    const items = body.catalog ?? [];
    if (!items.length) break;

    // filter to items actually from this vendor
    const matched = items.filter(p => vendorNameMatches(p.vendorName, vendorEntry.search));
    all.push(...matched);

    const total = body.recordsFound ?? 0;
    if (!total || all.length >= total || items.length < 50) break;
    page++;
  }

  const relevant = all.filter(isTrustRelevant);

  return {
    vendor_id: vendorEntry.vendor_id,
    vendor_search: vendorEntry.search,
    total_matched: all.length,
    trust_relevant: relevant.length,
    skus: relevant.map(p => ({
      ingram_part: p.ingramPartNumber ?? null,
      vendor_part: p.vendorPartNumber ?? null,
      description: p.description ?? p.extraDescription ?? null,
      vendor_name: p.vendorName ?? null,
      category: p.category ?? null,
      sub_category: p.subCategory ?? null,
      product_type: p.productType ?? null,
      discontinued: p.discontinued === 'True',
      authorized: p.authorizedToPurchase !== 'False',
    })),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.error('Authenticating...');
  const token = await getToken();
  console.error('Auth OK\n');

  const results = [];

  for (const vendor of VENDOR_SHORTLIST) {
    process.stderr.write(`  ${vendor.search.padEnd(20)} ... `);
    try {
      const result = await searchVendor(token, vendor);
      results.push(result);
      console.error(`${result.trust_relevant} trust-relevant (${result.total_matched} vendor-matched)`);
    } catch (err) {
      console.error(`ERROR: ${err.message}`);
      results.push({ vendor_id: vendor.vendor_id, vendor_search: vendor.search, error: err.message });
    }
  }

  const output = {
    pulled_at: new Date().toISOString(),
    country: 'AU',
    vendor_count: results.filter(r => !r.error).length,
    total_trust_skus: results.reduce((s, r) => s + (r.trust_relevant ?? 0), 0),
    vendors: results,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2));

  console.error(`\nWrote ${OUT_PATH}`);
  console.error(`  ${output.vendor_count} vendors`);
  console.error(`  ${output.total_trust_skus} trust-relevant SKUs`);
}

main().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
