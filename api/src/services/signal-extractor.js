import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { ENTERPRISE_SIGNALS_SCHEMA } from '../config/gaps.js';
import { chatComplete } from '../lib/inference.js';
import { runReconPipeline } from './recon-pipeline.js';
import { researchQuery, fetchPerplexityResearch, fetchGeminiResearch } from './recon-company.js';
import { record as recordConsumption } from './consumption-emitter.js';
import { resolve as resolveModel } from '../lib/model-resolver.mjs';
import * as meter from '../lib/meter.mjs';

// Model resolution: ask the vendored registry for the role's model (governed SSOT,
// synced from workspace-control via sync-registry) instead of hardcoding an id that can
// silently deprecate. Aliased to resolveModel — this file uses `resolve` as a Promise cb below.
const _registry = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../config/models.registry.json'), 'utf8'));

// The homepage leads deliberately: it is the page the read cannot do without,
// so it is scraped alone and is never the page a spent budget drops.
export const PAGES_TO_CHECK = [
  { path: '/', label: 'homepage' },
  { path: '/pricing', label: 'pricing page' },
  { path: '/about', label: 'about page' },
  { path: '/security', label: 'security page' },
  { path: '/trust', label: 'trust centre' },
];

// Firecrawl is self-hosted on a small box it shares with CORPUS, pgvector and
// this API, and each scrape costs it a playwright browser. Measured live against
// cognisys.co.uk 2026-08-26: five at once returned four 15s timeouts and one 500
// — zero pages, on every prod scan — while the same five in sequence returned
// 200s in 7.0-9.0s each. Two at a time is what the box actually serves; the
// worker says so itself when pushed past it ("Can't accept connection due to
// RAM/CPU load"). Raise this only against a measurement, never a guess.
export const SCRAPE_CONCURRENCY = 2;

// Wall-clock ceiling for the whole site act. The homepage lands first (~9s
// measured), leaving room for roughly two more pairs. Whatever answered when the
// budget expires is the read — the act is one of several the scan is waiting on.
const SITE_BUDGET_MS = 20000;

function normalizeUrl(url) {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  const parsed = new URL(normalized);
  return parsed.origin;
}

export async function scrapePages(firecrawl, baseUrl, log, session_id, { budgetMs = SITE_BUDGET_MS } = {}) {
  // Set the moment the act closes over what it had. A scrape still in flight at
  // that point keeps running — we cannot recall it — but it has missed the read,
  // so it must not narrate. Measured on prod: without this the act logged
  // "3 pages" and then a fourth page reported "✓ read" underneath it.
  let closed = false;
  const reported = new Set();
  const emit = (label, line) => { if (!closed) { reported.add(label); log(line); } };

  const scrapeOne = async ({ path, label }) => {
    try {
      const result = await firecrawl.scrapeUrl(baseUrl + path, {
        formats: ['markdown'],
        timeout: 15000,
      });
      if (result.success && result.markdown && !(result.statusCode >= 400)) {
        emit(label, { text: `  ✓  ${label} · read`, type: 'ok' });
        if (session_id) {
          recordConsumption({ session_id, source: 'firecrawl', units: 1, unit_type: 'credits', success: true });
        }
        return { label, content: result.markdown.slice(0, 3000) };
      } else {
        const reason = result.statusCode >= 400 ? `${result.statusCode}` : 'no content returned';
        emit(label, { text: `  ↳  ${label} · ${reason}`, type: 'muted' });
        if (session_id) {
          recordConsumption({ session_id, source: 'firecrawl', units: 1, unit_type: 'credits', success: false, error: 'no content returned' });
        }
      }
    } catch (err) {
      const reason = err?.message?.includes('timeout') ? 'timeout' : (err?.message || 'failed');
      emit(label, { text: `  ✗  ${label} · ${reason}`, type: 'err' });
      if (session_id) {
        recordConsumption({ session_id, source: 'firecrawl', units: 1, unit_type: 'credits', success: false, error: reason });
      }
    }
    return null;
  };

  const deadline = Date.now() + budgetMs;
  const pages = [];
  const [homepage, ...rest] = PAGES_TO_CHECK;

  // The homepage alone first — it never competes for a browser.
  const home = await scrapeOne(homepage);
  if (home) pages.push(home);

  // The remainder, SCRAPE_CONCURRENCY at a time, until the budget is spent.
  // A worker that finds the deadline passed stops claiming work rather than
  // starting a scrape it cannot finish — an unstarted scrape is never billed.
  let next = 0;
  const worker = async () => {
    while (next < rest.length && !closed) {
      if (Date.now() >= deadline) return;
      const page = rest[next++];
      const result = await scrapeOne(page);
      // A scrape that lands after the budget expired arrives too late to be
      // part of the read — the act has already closed over what it had.
      if (result && !closed) pages.push(result);
    }
  };

  // The deadline has to bound the wait, not just the claiming: a worker already
  // inside a scrape cannot check a clock, and firecrawl's own per-scrape ceiling
  // is 15s — long enough on its own to push the act past its budget. Racing the
  // pool against the deadline lets the act close with what landed and leaves the
  // stragglers to finish into a result nobody reads.
  const remaining = Math.max(0, deadline - Date.now());
  let timer;
  const budgetSpent = new Promise((resolve) => {
    timer = setTimeout(resolve, remaining);
    timer.unref?.();
  });
  await Promise.race([
    Promise.all(Array.from({ length: SCRAPE_CONCURRENCY }, worker)).then(() => { closed = true; }),
    budgetSpent.then(() => { closed = true; }),
  ]);
  clearTimeout(timer);

  // Every page that never narrated missed the read — whether it was still in
  // flight when the budget closed or never started at all. Name it, so it does
  // not read as a page that failed: silence here is indistinguishable from a
  // 500, and the count above would be the only clue that anything was left out.
  for (const { label } of rest) {
    if (!reported.has(label)) {
      log({ text: `  ↳  ${label} · not read (${Math.round(budgetMs / 1000)}s site budget)`, type: 'muted' });
    }
  }

  return pages;
}

async function extractWithClaude(pages, log = () => {}, session_id = null) {
  const correlationId = session_id || 'proof360';

  const content = pages.map((p) => `### ${p.label}\n${p.content}`).join('\n\n');

  const prompt = `Analyze this website content and extract business signals about the company.

IMPORTANT: You are reading marketing copy and public pages. Extract only what the NARRATIVE tells you — who they are, what they sell, who they sell to. Do NOT guess at technical infrastructure, security posture, or compliance status — those facts come from technical scans, not marketing pages. The two exceptions are own_hosting_provider and vendor_relationships below, and even those are extracted ONLY from an explicit textual statement, never inferred from logos, integrations, or vibes — a live technical probe always outranks whatever you extract here.

${content}

Respond with ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "offering": { "physical": boolean, "software": boolean, "services": boolean },
  "product_type": "B2B SaaS" | "B2C App" | "Platform" | "API" | "Software product" | "Professional services" | "Managed service" | "Unknown",
  "revenue_model": "Subscription" | "Usage-based" | "Project fees" | "Retainer" | "Resale margin" | "Mixed" | "Unknown",
  "delivery_model": "Self-serve" | "Sales-led" | "Partner-led" | "Consultant-delivered" | "Unknown",
  "positioning_claim": "the single strongest specific position claim the company makes, verbatim, or null",
  "claim_conferred_by": "Self-asserted" | "Named third party" | "Verifiable accreditation" | "None",
  "concentration": ["array of platforms, vendors or clients the positioning visibly depends on"],
  "customer_type": "Enterprise (B2B)" | "SMB (B2B)" | "Consumer (B2C)" | "Mixed" | "Unknown",
  "data_sensitivity": "PII" | "Financial data" | "Healthcare data" | "Customer data" | "None" | "Unknown",
  "stage": "Pre-seed" | "Seed" | "Series A" | "Series B+" | "Bootstrapped" | "Profitable / self-funded" | "PE-backed / acquired" | "Unknown",
  "sector": "healthcare" | "fintech" | "financial_services" | "government" | "legal" | "ecommerce" | "education" | "saas" | "infrastructure" | "unknown",
  "geo_market": "AU" | "US" | "UK" | "SG" | "Global" | "Unknown",
  "handles_payments": true | false,
  "use_case": "brief description of main use case in plain English",
  "competitor_mentions": ["array of competitor product/company names mentioned on the page"],
  "enterprise_signals": {
    "security_page_detected": boolean,
    "trust_centre_detected": boolean,
    "soc2_mentioned": boolean,
    "pricing_enterprise_tier": boolean
  },
  "uses_ai": boolean,
  "handles_personal_data": boolean,
  "pen_test_completed": true | false | null,
  "has_backup": true | false | null,
  "aws_program_enrolled": true | false | null,
  "microsoft_program_enrolled": true | false | null,
  "own_hosting_provider": "AWS" | "GCP" | "Azure" | "Oracle" | "Cloudflare" | "Unknown",
  "vendor_relationships": ["array of cloud/tech vendor names mentioned"],
  "confidence": "confident" | "likely" | "probable",
  "company_summary": "2-3 sentence market read: what they build, who they sell to, and where they operate. Be specific — name the sector, geography, and buyer type. Plain English, no jargon."
}

Signal rules:
- offering: what they SELL, as three independent booleans. A thing you can touch (physical), a thing that runs (software), a thing people do (services). Any combination is valid and combinations are common — a consultancy that ships a tool is services AND software. This is the primary read; product_type below is the legacy narrower label. Do not force a single choice.
- product_type: keep consistent with offering. Services-only companies are "Professional services" (project-shaped) or "Managed service" (ongoing/retained). NEVER label a consultancy "Software product" — if they sell people's time, it is services.
- revenue_model: how they charge. Recurring (Subscription/Retainer) versus one-off (Project fees) is the distinction that matters most; "Mixed" when the page clearly shows both.
- delivery_model: how a customer actually gets it. "Consultant-delivered" when humans do the work; "Partner-led" when resellers or channel partners deliver.
- positioning_claim: the strongest SPECIFIC claim they make about where they stand — a ranking, a "first", a named partner status, an accreditation. Quote it verbatim. null when they make no specific claim, and never invent one from general marketing language.
- claim_conferred_by: who stands behind positioning_claim. "Self-asserted" when only the company says it. "Named third party" when a named organisation is credited. "Verifiable accreditation" when it is a formal scheme with a register. "None" when there is no claim. This is a state the company can change, not a judgement of them.
- concentration: platforms, vendors or named clients the positioning visibly leans on. A company describing itself as a top partner of one platform is concentrated on that platform. Empty array if none.
- uses_ai: true when the product or company messaging prominently features AI, ML, LLM, or AI-powered capabilities. false otherwise.
- handles_personal_data: true when the company processes user PII, health records, financial data, or personal profiles — infer from privacy policy mentions, GDPR/CCPA references, or data-type descriptions. false otherwise.
- pen_test_completed: true only when they explicitly mention penetration testing, third-party security audits, or security assessments. null when not mentioned.
- has_backup: true only when they explicitly mention backup, disaster recovery, or data redundancy. null when not mentioned.
- aws_program_enrolled: true only when they explicitly mention AWS Activate, AWS Startup program, or AWS credits. null when not mentioned.
- microsoft_program_enrolled: true only when they explicitly mention Microsoft for Startups, Founders Hub, Azure credits, or Azure startup program. null when not mentioned.
- own_hosting_provider: a cloud provider ONLY when the page explicitly states their OWN product/site/company is hosted, built, or run on that provider (e.g. "built on AWS infrastructure", "we host on Oracle Cloud"). "Unknown" otherwise — never guess from a logo or an integration badge.
- vendor_relationships: cloud/tech vendor names mentioned as something they USE, IMPLEMENT, INTEGRATE, RESELL, or WORK WITH for/with clients — a relationship, not their own hosting. Example: a security consultancy whose page says "we deploy AWS environments for clients" → "AWS" goes here, never into own_hosting_provider. Empty array if none mentioned this way.`;

  let response;
  try {
    response = await chatComplete({
      model: resolveModel('classify', { registry: _registry, onLedger: () => {} }).model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      correlation_id: correlationId,
    });
  } catch (err) {
    log({ text: `  ✗  Bedrock inference error: ${err.message}`, type: 'err' });
    if (err.status) log({ text: `  ↳  ${err.name || 'error'} ${err.status}`, type: 'err' });
    throw err;
  }

  // chatComplete() already emits the meter event (provider=bedrock).
  const text = response.choices[0].message.content.trim();
  // Strip markdown code fences if present
  const json = text.startsWith('```') ? text.replace(/^```\w*\n?/, '').replace(/```$/, '').trim() : text;
  try {
    return JSON.parse(json);
  } catch (err) {
    log({ text: `  ✗  Claude returned invalid JSON`, type: 'err' });
    log({ text: `  ↳  Got: ${json.slice(0, 120)}${json.length > 120 ? '…' : ''}`, type: 'err' });
    throw err;
  }
}

export function mapToSignals(extracted) {
  const confidence = extracted.confidence || 'probable';
  const signals = [];

  // Business signals only — compliance/identity come from recon + founder answers.
  // Infrastructure is the one exception: own_hosting_provider / vendor_relationships
  // below, handled separately because they need re-typing (hosting vs relationship),
  // not the flat value-copy every other business field gets.
  const mappings = [
    ['offering', offeringLabel(extracted.offering)],
    ['product_type', extracted.product_type],
    ['revenue_model', extracted.revenue_model],
    ['delivery_model', extracted.delivery_model],
    ['positioning_claim', extracted.positioning_claim],
    ['claim_conferred_by', extracted.claim_conferred_by],
    ['customer_type', extracted.customer_type],
    ['data_sensitivity', extracted.data_sensitivity],
    ['stage', extracted.stage],
    ['sector', extracted.sector],
    ['geo_market', extracted.geo_market],
    ['handles_payments', extracted.handles_payments],
    ['use_case', extracted.use_case],
  ];

  for (const [type, value] of mappings) {
    if (value && value !== 'Unknown' && value !== 'unknown') {
      signals.push({ type, value, confidence });
    }
  }

  // Boolean signals — include only when explicitly true; undefined means unknown (gap fires conservatively)
  for (const key of ['uses_ai', 'handles_personal_data', 'pen_test_completed', 'has_backup', 'aws_program_enrolled', 'microsoft_program_enrolled']) {
    if (extracted[key] === true) {
      signals.push({ type: key, value: true, confidence });
    }
  }

  // Hosting vs relationship re-typing (John ruling, mid-build amendment): a cloud
  // mention in marketing text is a claim about THEIR OWN hosting only when the
  // extraction prompt found an explicit self-hosting statement — everything else
  // (a vendor they implement/integrate/resell for clients) is a relationship, and
  // relationships never compete with the live probe's hosting fact.
  const ownHosting = extracted.own_hosting_provider;
  if (ownHosting && ownHosting !== 'Unknown' && ownHosting !== 'unknown') {
    signals.push({ type: 'infrastructure', value: ownHosting, confidence, claim_type: 'hosting' });
  }
  const relationships = Array.isArray(extracted.vendor_relationships) ? extracted.vendor_relationships : [];
  const seenRelationships = new Set();
  for (const vendor of relationships) {
    if (!vendor || vendor === 'Unknown' || vendor === 'unknown') continue;
    const key = String(vendor).toLowerCase();
    if (seenRelationships.has(key)) continue;
    seenRelationships.add(key);
    signals.push({ type: 'works_with', value: vendor, confidence, claim_type: 'relationship' });
  }

  const concentration = Array.isArray(extracted.concentration) ? extracted.concentration : [];
  const seenConcentration = new Set();
  for (const name of concentration) {
    if (!name || name === 'Unknown' || name === 'unknown') continue;
    const key = String(name).toLowerCase();
    if (seenConcentration.has(key)) continue;
    seenConcentration.add(key);
    signals.push({ type: 'concentration', value: name, confidence, claim_type: 'dependency' });
  }

  // Class every signal so the renderer can lead with position and bury posture,
  // WITHOUT dropping anything — the gap engine still consumes the posture fields.
  // Direction: the read sells market position; security is an instrument, not the
  // output (John, 2026-09-02). Filtering here would break gaps; classing does not.
  for (const sig of signals) {
    sig.signal_class = SIGNAL_CLASS[sig.type] ?? 'context';
  }

  return signals;
}

// physical / software / services — three independent primitives, any combination.
// John's model (2026-09-02): "you either sell a physical thing, a software thing,
// or a services thing - or any combination of those 3". Replaces a flat enum that
// had no value for a consultancy and forced them to be called "Software product".
export function offeringLabel(offering) {
  if (!offering || typeof offering !== 'object') return null;
  const parts = [];
  if (offering.physical) parts.push('physical');
  if (offering.software) parts.push('software');
  if (offering.services) parts.push('services');
  if (parts.length === 0) return null;
  if (parts.length === 3) return 'Physical, software and services';
  const [head, ...rest] = parts;
  const label = rest.length ? `${head} + ${rest.join(' + ')}` : head;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const SIGNAL_CLASS = {
  offering: 'position', product_type: 'position', revenue_model: 'position',
  delivery_model: 'position', positioning_claim: 'position',
  claim_conferred_by: 'position', concentration: 'position',
  customer_type: 'position', stage: 'position', sector: 'position',
  geo_market: 'position', use_case: 'position', works_with: 'position',
  handles_payments: 'context', uses_ai: 'context',
  aws_program_enrolled: 'context', microsoft_program_enrolled: 'context',
  infrastructure: 'infrastructure',
  data_sensitivity: 'posture', handles_personal_data: 'posture',
  pen_test_completed: 'posture', has_backup: 'posture',
  compliance_status: 'posture', identity_model: 'posture',
  insurance_status: 'posture',
};

function fallbackSignals(website_url, deck_file) {
  const sources_read = [];
  const signals = [];
  const enterprise_signals = { ...ENTERPRISE_SIGNALS_SCHEMA };

  if (website_url) {
    sources_read.push('homepage');
    signals.push(
      { type: 'product_type', value: 'Software product', confidence: 'probable' },
      { type: 'customer_type', value: 'Enterprise (B2B)', confidence: 'probable' },
    );
  }
  if (deck_file) {
    sources_read.push('pitch deck');
    signals.push({ type: 'stage', value: 'Seed', confidence: 'probable' });
  }
  if (signals.length === 0) {
    signals.push({ type: 'product_type', value: 'Software product', confidence: 'probable' });
    sources_read.push('homepage');
  }

  // No real page was fetched here — this is simulated/placeholder signal, never an
  // actual scrape (no Firecrawl key, no website_url, or the live scrape read zero
  // pages). pages_read_count: 0 is the honest-degradation flag the client uses to
  // decide between "read complete" and "perimeter read only" (INVARIANTS §1).
  return { signals, sources_read, enterprise_signals, competitor_mentions: [], pages_read_count: 0, used_web_research: false, research_engines: [] };
}

const SIGNAL_READABLE = {
  offering:           (v) => `Sells: ${v}`,
  revenue_model:      (v) => `Revenue: ${v}`,
  delivery_model:     (v) => `Delivered: ${v}`,
  positioning_claim:  (v) => `Claims: ${v}`,
  claim_conferred_by: (v) => `Claim is: ${v}`,
  concentration:      (v) => `Depends on: ${v}`,
  product_type:      (v) => `Product type: ${v}`,
  customer_type:     (v) => `Customer type: ${v}`,
  data_sensitivity:  (v) => `Data: ${v}`,
  stage:             (v) => `Stage: ${v}`,
  sector:            (v) => `Sector: ${v}`,
  geo_market:        (v) => `Market: ${v}`,
  handles_payments:  (v) => v ? 'Handles payments' : null,
  use_case:          (v) => `Use case: ${v}`,
  infrastructure:         (v) => `Infrastructure: ${v}`,
  compliance_status:      (v) => `Compliance: ${v}`,
  identity_model:         (v) => `Identity model: ${v}`,
  insurance_status:       (v) => `Insurance: ${v}`,
  uses_ai:                () => 'Uses AI',
  handles_personal_data:  () => 'Handles personal data',
  pen_test_completed:     () => 'Penetration tested',
  has_backup:             () => 'Has backup/DR',
  aws_program_enrolled:       () => 'AWS program enrolled',
  microsoft_program_enrolled: () => 'Microsoft program enrolled',
  works_with:              (v) => `Works with ${v}`,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Wraps plain text at ~width chars on word boundaries — used only to display the
// verbatim research query without one giant unreadable line. Never alters content.
function wrapText(text, width = 110) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Splits real returned research content into sentences for a paced reveal — this
// paces REAL returned content, it never invents any; capped by the caller at 12 lines.
function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 'quota exhausted' and 'engine error (NNN)' (recon-company.js) are already the exact
// honest note text — no translation entry needed, they pass through via the fallback
// below rather than collapsing to the generic 'no answer' (finding 3, live rehearsal
// 2026-08-25: a 429 "prepayment credits depleted" was narrated as "no answer").
const RESEARCH_SKIP_NOTES = { 'no key': 'no key configured', 'no answer': 'no answer', 'too thin': 'answer too thin' };

// Shared body for the perplexity/gemini acts — SAME shape for both engines by
// construction (one implementation, two call sites in extractSignals below).
// Emits the verbatim query, then a paced reveal of the real returned content
// (never invented — this is pacing, not generation), then closes the act honestly.
async function runResearchAct(act, query, fetchFn, log) {
  log({ act, type: 'act_body', text: 'we asked:', color: 'query' });
  for (const line of wrapText(query, 110)) {
    log({ act, type: 'act_body', text: line, color: 'query' });
  }

  const result = await fetchFn();

  if (result.content) {
    const sentences = splitSentences(result.content);
    const capped = sentences.length > 12 ? [...sentences.slice(0, 11), '…'] : sentences;
    for (const sentence of capped) {
      log({ act, type: 'act_body', text: sentence, color: 'muted' });
      await sleep(250);
    }
    log({ type: 'act', act, phase: 'done', note: 'answered' });
  } else {
    log({ type: 'act', act, phase: 'skip', note: RESEARCH_SKIP_NOTES[result.skip] || result.skip || 'no answer' });
  }

  return result;
}

export async function extractSignals({ website_url, deck_file, session_id }, log = () => {}) {
  // No Firecrawl key — fall back to simulation (gateway handles AI credentials)
  if (!process.env.FIRECRAWL_API_KEY) {
    await new Promise((r) => setTimeout(r, 2000));
    return fallbackSignals(website_url, deck_file);
  }

  if (!website_url) {
    return fallbackSignals(null, deck_file);
  }

  // Wraps a sub-routine's existing {text,type} log line as this act's act_body
  // shape. scrapePages/extractWithClaude/recon's onSourceComplete keep emitting
  // exactly the honest lines they always did — this only retags the envelope so
  // the frontend can bucket them under the right accordion.
  const actLine = (act) => (line) => log({ act, type: 'act_body', text: line.text, color: line.color ?? line.type });

  try {
    const baseUrl = normalizeUrl(website_url);
    let domain = baseUrl;
    try { domain = new URL(baseUrl).hostname.replace('www.', ''); } catch {}
    const companyName = domain.split('.')[0].replace(/[-_]/g, ' ');

    const firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY || 'self-hosted',
      apiUrl: process.env.FIRECRAWL_API_URL || undefined,
    });

    log({ text: `$ proof360 --url ${domain}`, type: 'cmd' });

    // 1. Perimeter scan — commodity, demoted. Fired now, awaited later (step 5)
    // so its probe lines can stream in throughout every other act below.
    log({ type: 'act', act: 'perimeter', phase: 'start', title: 'Infrastructure and posture', note: 'running in the background' });
    let perimeterChecks = 0;
    let reconTimedOut = false;
    const reconPromise = new Promise((resolve) => {
      let timer = setTimeout(() => {
        timer = null;
        reconTimedOut = true;
        log({ act: 'perimeter', type: 'act_body', text: 'Recon timed out after 20s — continuing without it', color: 'err' });
        resolve(null);
      }, 20000);
      runReconPipeline(website_url, companyName, {
        firecrawl,
        abuseIpdbKey: process.env.ABUSEIPDB_API_KEY || null,
        onSourceComplete: (source, line) => {
          perimeterChecks++;
          log({ act: 'perimeter', type: 'act_body', text: line.text, color: line.color ?? line.type });
        },
        session_id,
      }).then((result) => {
        if (timer) { clearTimeout(timer); timer = null; }
        resolve(result);
      }).catch((err) => {
        if (timer) { clearTimeout(timer); timer = null; }
        log({ act: 'perimeter', type: 'act_body', text: `Recon: ${err.message}`, color: 'err' });
        resolve(null);
      });
    });

    // 2. Reading the site — awaited now, the first thing the founder actually sees land.
    log({ type: 'act', act: 'site', phase: 'start', title: 'Reading your site' });
    for (const { path, label } of PAGES_TO_CHECK) {
      log({ act: 'site', type: 'act_body', text: `↳  ${label} ${baseUrl + path}`, color: 'muted' });
    }
    const pages = await scrapePages(firecrawl, baseUrl, actLine('site'), session_id);
    const real_pages_count = pages.length;
    if (real_pages_count === 0) {
      log({ act: 'site', type: 'act_body', text: 'No pages could be read from this site', color: 'err' });
      log({ type: 'act', act: 'site', phase: 'done', note: '0 pages' });
    } else {
      log({ type: 'act', act: 'site', phase: 'done', note: `${real_pages_count} page${real_pages_count === 1 ? '' : 's'}` });
    }

    // 3 & 4. Perplexity, then Gemini — BOTH run on every read (John ruling
    // 2026-08-25: no longer primary/fallback). Same shape, two independent acts.
    const query = researchQuery(domain);

    log({ type: 'act', act: 'perplexity', phase: 'start', title: 'Asking the live web about you', note: 'perplexity · sonar' });
    const perplexityResult = await runResearchAct('perplexity', query, () => fetchPerplexityResearch(domain), log);

    log({ type: 'act', act: 'gemini', phase: 'start', title: 'A second, independent read', note: 'gemini · 2.5 flash' });
    const geminiResult = await runResearchAct('gemini', query, () => fetchGeminiResearch(domain), log);

    // 5. Perimeter closes out — correlation (step 6) needs it.
    const recon_context = await reconPromise;
    if (recon_context) {
      log({ type: 'act', act: 'perimeter', phase: 'done', note: `${perimeterChecks} check${perimeterChecks === 1 ? '' : 's'}` });
    } else {
      log({ type: 'act', act: 'perimeter', phase: 'fail', note: reconTimedOut ? 'timed out' : 'failed' });
    }

    // Each answered engine becomes its own synthetic research page feeding
    // extraction — real_pages_count above was taken BEFORE this unshift, so it
    // never counts a synthetic page as a genuinely scraped one.
    const researchPages = [];
    const research_engines = [];
    if (perplexityResult.content) {
      researchPages.push({ label: `company research (${perplexityResult.source})`, content: perplexityResult.content });
      research_engines.push('perplexity');
    }
    if (geminiResult.content) {
      researchPages.push({ label: `company research (${geminiResult.source})`, content: geminiResult.content });
      research_engines.push('gemini');
    }
    pages.unshift(...researchPages);
    const used_web_research = research_engines.length > 0;

    if (pages.length === 0) {
      return { ...fallbackSignals(website_url, deck_file), recon_context, used_web_research, research_engines };
    }

    // 6. Correlate — the haiku extraction call, over every witness gathered so far.
    log({ type: 'act', act: 'correlate', phase: 'start', title: 'Correlating what every witness saw', note: 'claude haiku · bedrock' });
    const perimeterPart = recon_context ? 'perimeter context' : 'no perimeter context';
    log({ act: 'correlate', type: 'act_body', text: `${real_pages_count} pages + ${research_engines.length} research answers + ${perimeterPart} → signal extraction` });

    const sources_read = pages.map((p) => p.label);
    let extracted;
    try {
      extracted = await extractWithClaude(pages, actLine('correlate'), session_id);
    } catch (err) {
      log({ type: 'act', act: 'correlate', phase: 'fail', note: 'failed' });
      throw err;
    }
    const signals = mapToSignals(extracted);

    for (const signal of signals) {
      const label = SIGNAL_READABLE[signal.type]?.(signal.value);
      if (label) log({ act: 'correlate', type: 'act_body', text: `↳  ${label}`, color: 'query' });
    }

    const enterprise_signals = {
      ...ENTERPRISE_SIGNALS_SCHEMA,
      ...(extracted.enterprise_signals || {}),
    };
    const competitor_mentions = extracted.competitor_mentions || [];

    if (signals.length === 0) {
      log({ act: 'correlate', type: 'act_body', text: 'Claude returned no signals from page content', color: 'err' });
      log({ type: 'act', act: 'correlate', phase: 'done', note: '0 signals' });
      // Pages WERE actually read here — the site opened, extraction just found nothing
      // to say. Overriding fallbackSignals' pages_read_count:0 keeps the honest-read
      // flag accurate even though the signals themselves are placeholders. real_pages_count
      // (not pages.length) so a research-only contribution never counts as a page read.
      return { ...fallbackSignals(website_url, deck_file), recon_context, pages_read_count: real_pages_count, used_web_research, research_engines };
    }

    log({ type: 'act', act: 'correlate', phase: 'done', note: `${signals.length} signal${signals.length === 1 ? '' : 's'}` });

    const company_summary = extracted.company_summary || null;
    return { signals, sources_read, enterprise_signals, competitor_mentions, recon_context, company_summary, pages_read_count: real_pages_count, used_web_research, research_engines };
  } catch (err) {
    console.error('[signal-extractor] pipeline error:', err.message, err.stack);
    // Only emit to terminal if not already emitted by the specific handler above
    if (!err._logged) {
      log({ text: `  ✗  ${err.message}`, type: 'err' });
    }
    if (err.cause) log({ text: `  ↳  Cause: ${err.cause}`, type: 'err' });
    log({ text: '  ↳  Falling back to partial read', type: 'muted' });
    return fallbackSignals(website_url, deck_file);
  }
}
