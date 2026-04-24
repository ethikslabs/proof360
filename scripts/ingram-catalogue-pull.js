#!/usr/bin/env node
/**
 * Ingram Xvantage Reseller API — catalogue pull
 *
 * Pulls the product catalogue, filters to trust-relevant categories, maps SKUs
 * to proof360 vendor_ids, and writes a partner-register-ready JSON file.
 *
 * Usage:
 *   INGRAM_CLIENT_ID=xxx INGRAM_CLIENT_SECRET=xxx \
 *   INGRAM_CUSTOMER_NUMBER=xxx INGRAM_COUNTRY_CODE=AU \
 *   node scripts/ingram-catalogue-pull.js
 *
 * Output: docs/ingram-catalogue.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const {
  INGRAM_CLIENT_ID,
  INGRAM_CLIENT_SECRET,
  INGRAM_CUSTOMER_NUMBER,
  INGRAM_COUNTRY_CODE = 'AU',
  INGRAM_API_BASE = 'https://api.ingrammicro.com',
} = process.env;

if (!INGRAM_CLIENT_ID || !INGRAM_CLIENT_SECRET || !INGRAM_CUSTOMER_NUMBER) {
  console.error('Missing required env: INGRAM_CLIENT_ID, INGRAM_CLIENT_SECRET, INGRAM_CUSTOMER_NUMBER');
  process.exit(1);
}

// ── Vendor name → proof360 vendor_id mapping ────────────────────────────────
// Ingram catalogue returns vendor names as strings. Map them to the IDs used
// in api/src/config/vendors.js. Unmapped vendors are returned but flagged.
const VENDOR_NAME_TO_ID = {
  'VANTA': 'vanta',
  'DRATA': 'drata',
  'CLOUDFLARE': 'cloudflare',
  'CISCO': 'cisco_duo',        // collapses Duo / Umbrella at catalogue level
  'PALO ALTO': 'palo_alto',
  'PALO ALTO NETWORKS': 'palo_alto',
  'FORTINET': 'fortinet',
  'SONICWALL': 'sonicwall',
  'JUNIPER': 'juniper',
  'CROWDSTRIKE': 'crowdstrike',
  'TRELLIX': 'trellix',
  'TREND MICRO': 'trendmicro',
  'SOPHOS': 'sophos',
  'OKTA': 'okta',
  'MICROSOFT': 'microsoft',
  'RSA': 'rsa',
  'KEEPER': 'keeper',
  'JAMF': 'jamf',
  'VEEAM': 'veeam',
  'COHESITY': 'cohesity',
  'NETAPP': 'netapp',
  'NUTANIX': 'nutanix',
  'VERITAS': 'veritas',
  'PROOFPOINT': 'proofpoint',
  'OPENTEXT': 'opentext',
  'TRUSTWAVE': 'trustwave',
  'DOCUSIGN': 'docusign',
  'BLANCCO': 'blancco',
};

// Trust-relevant category keywords. Ingram's taxonomy varies — match loosely.
const TRUST_KEYWORDS = [
  'security', 'endpoint', 'firewall', 'identity', 'authentication',
  'backup', 'recovery', 'compliance', 'grc', 'siem', 'edr', 'xdr',
  'zero trust', 'vpn', 'ddos', 'waf', 'email security', 'encryption',
  'access management', 'data loss', 'dlp', 'threat', 'vulnerability',
];

function isTrustRelevant(product) {
  const haystack = [
    product.productCategory,
    product.productSubCategory,
    product.description,
    product.vendorName,
  ].filter(Boolean).join(' ').toLowerCase();
  return TRUST_KEYWORDS.some(kw => haystack.includes(kw));
}

// ── Auth ────────────────────────────────────────────────────────────────────
async function getAccessToken() {
  const url = `${INGRAM_API_BASE}/oauth/oauth20/token?grant_type=client_credentials&client_id=${encodeURIComponent(INGRAM_CLIENT_ID)}&client_secret=${encodeURIComponent(INGRAM_CLIENT_SECRET)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ── Catalogue search ────────────────────────────────────────────────────────
// Endpoint: GET /resellers/v6/catalog
// Headers: IM-CustomerNumber, IM-CountryCode, IM-CorrelationID
async function fetchCatalogPage(token, pageNumber, pageSize = 100) {
  const url = `${INGRAM_API_BASE}/resellers/v6/catalog?pageNumber=${pageNumber}&pageSize=${pageSize}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'IM-CustomerNumber': INGRAM_CUSTOMER_NUMBER,
      'IM-CountryCode': INGRAM_COUNTRY_CODE,
      'IM-CorrelationID': `proof360-catalogue-${Date.now()}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Catalog fetch failed p${pageNumber}: ${res.status} ${body}`);
  }
  return res.json();
}

async function pullFullCatalogue() {
  const token = await getAccessToken();
  console.error('Auth OK. Pulling catalogue...');

  const all = [];
  let page = 1;
  const pageSize = 100;
  const maxPages = 500; // safety cap

  while (page <= maxPages) {
    const data = await fetchCatalogPage(token, page, pageSize);
    const items = data.catalog || data.items || [];
    if (!items.length) break;

    all.push(...items);
    console.error(`Page ${page}: ${items.length} items (total ${all.length})`);

    const recordsFound = data.recordsFound ?? data.totalRecords;
    if (recordsFound && all.length >= recordsFound) break;
    if (items.length < pageSize) break;
    page++;
  }

  console.error(`Pulled ${all.length} total SKUs across ${page} pages`);
  return all;
}

// ── Aggregate by vendor ─────────────────────────────────────────────────────
function aggregateByVendor(products) {
  const trust = products.filter(isTrustRelevant);
  console.error(`${trust.length} trust-relevant SKUs of ${products.length} total`);

  const byVendor = new Map();
  for (const p of trust) {
    const vendorNameRaw = (p.vendorName || 'UNKNOWN').toUpperCase().trim();
    const vendorId = VENDOR_NAME_TO_ID[vendorNameRaw] || null;

    if (!byVendor.has(vendorNameRaw)) {
      byVendor.set(vendorNameRaw, {
        vendor_name_ingram: vendorNameRaw,
        vendor_id_proof360: vendorId,
        mapped: vendorId !== null,
        sku_count: 0,
        sample_skus: [],
        categories: new Set(),
      });
    }
    const entry = byVendor.get(vendorNameRaw);
    entry.sku_count++;
    if (entry.sample_skus.length < 5) {
      entry.sample_skus.push({
        sku: p.ingramPartNumber || p.vendorPartNumber,
        description: p.description,
        category: p.productCategory,
      });
    }
    if (p.productCategory) entry.categories.add(p.productCategory);
  }

  return Array.from(byVendor.values()).map(e => ({
    ...e,
    categories: Array.from(e.categories),
  })).sort((a, b) => b.sku_count - a.sku_count);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const products = await pullFullCatalogue();
    const aggregated = aggregateByVendor(products);

    const output = {
      pulled_at: new Date().toISOString(),
      country: INGRAM_COUNTRY_CODE,
      customer_number: INGRAM_CUSTOMER_NUMBER,
      total_skus: products.length,
      trust_relevant_skus: aggregated.reduce((s, v) => s + v.sku_count, 0),
      vendors_mapped: aggregated.filter(v => v.mapped).length,
      vendors_unmapped: aggregated.filter(v => !v.mapped).length,
      vendors: aggregated,
    };

    const outPath = path.resolve(process.cwd(), 'docs/ingram-catalogue.json');
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(output, null, 2));
    console.error(`\nWrote ${outPath}`);
    console.error(`\nSummary:`);
    console.error(`  ${output.total_skus} total SKUs`);
    console.error(`  ${output.trust_relevant_skus} trust-relevant`);
    console.error(`  ${output.vendors_mapped} vendors map to proof360 IDs`);
    console.error(`  ${output.vendors_unmapped} unmapped (review in output file)`);
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exit(1);
  }
}

main();
