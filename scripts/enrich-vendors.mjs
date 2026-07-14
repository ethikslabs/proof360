#!/usr/bin/env node
// proof360/scripts/enrich-vendors.mjs
// Enriches vendor catalog with structured positioning data — Bedrock + Perplexity, direct.
// Chain: Perplexity (live web intel) → Claude Haiku (structured extraction — EXTRACT_MODEL below)
// Output: runs/vendor-matrix.json
//
// Usage:
//   node scripts/enrich-vendors.mjs              # all vendors missing enrichment
//   node scripts/enrich-vendors.mjs --vendor vanta   # single vendor
//   node scripts/enrich-vendors.mjs --force      # re-run all, overwrite existing

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

loadEnv(resolve(ROOT, 'api/.env'));

import { VENDORS } from '../api/src/config/vendors.js';
import { chatComplete } from '../api/src/lib/inference.js';

// Inference is DIRECT — Perplexity for live intel, Bedrock for structured extraction. No VECTOR.
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar';
const EXTRACT_MODEL = 'claude-haiku-4-5-20251001';
const RUNS_DIR = resolve(ROOT, 'runs');
const OUTPUT_PATH = resolve(RUNS_DIR, 'vendor-matrix.json');

const args = process.argv.slice(2);
const singleVendor = args.includes('--vendor') ? args[args.indexOf('--vendor') + 1] : null;
const forceAll = args.includes('--force');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
};

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}

function loadMatrix() {
  if (!existsSync(OUTPUT_PATH)) return {};
  try { return JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')); } catch { return {}; }
}

function saveMatrix(matrix) {
  if (!existsSync(RUNS_DIR)) mkdirSync(RUNS_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(matrix, null, 2));
}

// Direct inference: Perplexity (sonar) for live web intel, Bedrock for everything else.
async function inferCall(model, messages, extra = {}) {
  if (model === PERPLEXITY_MODEL) {
    if (!PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY not set (live intel is Perplexity-direct)');
    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` },
      body: JSON.stringify({ model, messages, max_tokens: 1024, ...extra }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Perplexity ${res.status}: ${text.slice(0, 120)}`);
    }
    return res.json();
  }
  // Bedrock-direct (instance role / local AWS creds)
  return chatComplete({ model, messages, max_tokens: 1024, correlation_id: 'enrich-vendors', ...extra });
}

async function fetchPerplexityIntel(vendor) {
  const prompt = `Research the cybersecurity/compliance vendor "${vendor.display_name}".

Provide detailed information on:
1. Target company stage (seed/startup/SMB/mid-market/enterprise)
2. Typical company size (headcount ranges)
3. Cloud platform fit (AWS-native? Azure? GCP? Cloud-agnostic?)
4. Edge/CDN integrations (Cloudflare, Akamai, other?)
5. Pricing tier and rough cost (free tier? startup pricing? enterprise custom?)
6. Implementation effort (self-serve in hours? weeks? months with professional services?)
7. Key competitors and how they differ
8. What stage/scenario this vendor is NOT right for
9. Any startup programs, free tiers, or partner discounts available
10. Recent notable news or changes in the last 12 months

Be specific and factual. Include pricing signals where available.`;

  const result = await inferCall(PERPLEXITY_MODEL, [
    { role: 'user', content: prompt }
  ]);
  return result.choices?.[0]?.message?.content || '';
}

async function extractStructuredFields(vendor, intelText) {
  const prompt = `Based on the following vendor research, extract structured positioning data.

Vendor: ${vendor.display_name}
Current closes (gaps addressed): ${JSON.stringify(vendor.closes || [])}
Current best_for: ${vendor.best_for || 'not set'}

Research:
${intelText}

Return ONLY valid JSON matching this exact schema:
{
  "stage_fit": [],          // array: "seed", "early", "series_a", "series_b", "enterprise"
  "size_fit": [],           // array: "1-10", "11-50", "51-200", "201-1000", "1000+"
  "cloud_fit": [],          // array: "aws", "azure", "gcp", "cloudflare", "any"
  "edge_fit": [],           // array: "cloudflare", "akamai", "none", "any"
  "effort": "",             // "low" (hours/self-serve), "medium" (days-weeks), "high" (months/PS required)
  "pricing_tier": "",       // "free", "startup", "smb", "enterprise", "custom"
  "pricing_signal": "",     // human-readable eg "$50/mo", "$7-15k/yr", "custom"
  "competes_with": [],      // vendor ids from: ${JSON.stringify(Object.keys(VENDORS))}
  "not_right_for": "",      // one sentence: when NOT to recommend this vendor
  "positioning": "",        // one sentence: what makes this vendor distinct
  "startup_program": "",    // any free tier or startup program, empty string if none
  "updated_best_for": ""    // improved version of best_for field
}`;

  const result = await inferCall(EXTRACT_MODEL, [
    { role: 'user', content: prompt }
  ]);

  const content = result.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in extraction response');
  return JSON.parse(jsonMatch[0]);
}

async function enrichVendor(vendor, matrix) {
  const id = vendor.id;
  process.stdout.write(`${C.dim}[${id}]${C.reset} `);

  try {
    process.stdout.write(`${C.cyan}perplexity${C.reset}...`);
    const intel = await fetchPerplexityIntel(vendor);

    process.stdout.write(` ${C.cyan}haiku${C.reset}...`);
    const structured = await extractStructuredFields(vendor, intel);

    matrix[id] = {
      id,
      display_name: vendor.display_name,
      closes: vendor.closes || [],
      enriched_at: new Date().toISOString(),
      perplexity_intel: intel.slice(0, 800),   // truncated for matrix readability
      ...structured,
    };

    saveMatrix(matrix);
    console.log(` ${C.green}done${C.reset} — ${structured.stage_fit?.join('/') || '?'} · ${structured.pricing_signal || '?'} · effort=${structured.effort || '?'}`);
    return true;
  } catch (err) {
    console.log(` ${C.red}failed: ${err.message}${C.reset}`);
    return false;
  }
}

async function main() {
  console.log(`${C.bold}proof360 vendor enrichment${C.reset}`);
  console.log(`${C.dim}chain: Perplexity (live intel) → Claude Haiku (structured extraction)${C.reset}`);
  console.log(`${C.dim}output: runs/vendor-matrix.json${C.reset}\n`);

  // Inference is direct (Bedrock instance role + Perplexity key) — no carrier to health-check.
  if (!PERPLEXITY_API_KEY) {
    console.error(`${C.red}PERPLEXITY_API_KEY not set — live vendor intel needs it (Perplexity-direct)${C.reset}`);
    process.exit(1);
  }

  const matrix = loadMatrix();

  const allVendors = Object.values(VENDORS);

  let vendors = allVendors;
  if (singleVendor) {
    vendors = allVendors.filter(v => v.id === singleVendor);
    if (!vendors.length) {
      console.error(`${C.red}Vendor "${singleVendor}" not found in vendors.js${C.reset}`);
      process.exit(1);
    }
    console.log(`${C.yellow}Single vendor mode: ${singleVendor}${C.reset}\n`);
  } else if (!forceAll) {
    vendors = allVendors.filter(v => !matrix[v.id]);
    console.log(`${C.dim}Skipping ${allVendors.length - vendors.length} already enriched · processing ${vendors.length} remaining${C.reset}\n`);
  } else {
    console.log(`${C.yellow}--force: re-enriching all ${vendors.length} vendors${C.reset}\n`);
  }

  if (!vendors.length) {
    console.log(`${C.green}All vendors already enriched. Use --force to re-run.${C.reset}`);
    return;
  }

  let done = 0, failed = 0;
  for (const vendor of vendors) {
    const ok = await enrichVendor(vendor, matrix);
    ok ? done++ : failed++;
    // Small pause between vendors to be a good citizen
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${C.bold}Complete${C.reset} — ${C.green}${done} enriched${C.reset}${failed ? ` · ${C.red}${failed} failed${C.reset}` : ''}`);
  console.log(`${C.dim}Review: runs/vendor-matrix.json${C.reset}`);
}

main().catch(err => {
  console.error(`${C.red}Fatal: ${err.message}${C.reset}`);
  process.exit(1);
});
