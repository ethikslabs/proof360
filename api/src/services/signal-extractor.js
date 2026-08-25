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

const PAGES_TO_CHECK = [
  { path: '/', label: 'homepage' },
  { path: '/pricing', label: 'pricing page' },
  { path: '/about', label: 'about page' },
  { path: '/security', label: 'security page' },
  { path: '/trust', label: 'trust centre' },
];

function normalizeUrl(url) {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  const parsed = new URL(normalized);
  return parsed.origin;
}

async function scrapePages(firecrawl, baseUrl, log, session_id) {
  const tasks = PAGES_TO_CHECK.map(async ({ path, label }) => {
    try {
      const result = await firecrawl.scrapeUrl(baseUrl + path, {
        formats: ['markdown'],
        timeout: 15000,
      });
      if (result.success && result.markdown && !(result.statusCode >= 400)) {
        log({ text: `  ✓  ${label} · read`, type: 'ok' });
        if (session_id) {
          recordConsumption({ session_id, source: 'firecrawl', units: 1, unit_type: 'credits', success: true });
        }
        return { label, content: result.markdown.slice(0, 3000) };
      } else {
        const reason = result.statusCode >= 400 ? `${result.statusCode}` : 'no content returned';
        log({ text: `  ↳  ${label} · ${reason}`, type: 'muted' });
        if (session_id) {
          recordConsumption({ session_id, source: 'firecrawl', units: 1, unit_type: 'credits', success: false, error: 'no content returned' });
        }
      }
    } catch (err) {
      const reason = err?.message?.includes('timeout') ? 'timeout' : (err?.message || 'failed');
      log({ text: `  ✗  ${label} · ${reason}`, type: 'err' });
      if (session_id) {
        recordConsumption({ session_id, source: 'firecrawl', units: 1, unit_type: 'credits', success: false, error: reason });
      }
    }
    return null;
  });

  const settled = await Promise.allSettled(tasks);
  return settled
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
}

async function extractWithClaude(pages, log = () => {}, session_id = null) {
  const correlationId = session_id || 'proof360';

  const content = pages.map((p) => `### ${p.label}\n${p.content}`).join('\n\n');

  const prompt = `Analyze this website content and extract business signals about the company.

IMPORTANT: You are reading marketing copy and public pages. Extract only what the NARRATIVE tells you — who they are, what they sell, who they sell to. Do NOT guess at technical infrastructure, security posture, or compliance status — those facts come from technical scans, not marketing pages. The two exceptions are own_hosting_provider and vendor_relationships below, and even those are extracted ONLY from an explicit textual statement, never inferred from logos, integrations, or vibes — a live technical probe always outranks whatever you extract here.

${content}

Respond with ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "product_type": "B2B SaaS" | "B2C App" | "Platform" | "API" | "Software product" | "Unknown",
  "customer_type": "Enterprise (B2B)" | "SMB (B2B)" | "Consumer (B2C)" | "Mixed" | "Unknown",
  "data_sensitivity": "PII" | "Financial data" | "Healthcare data" | "Customer data" | "None" | "Unknown",
  "stage": "Pre-seed" | "Seed" | "Series A" | "Series B+" | "Unknown",
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
    ['product_type', extracted.product_type],
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

  return signals;
}

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
    log({ type: 'act', act, phase: 'skip', note: RESEARCH_SKIP_NOTES[result.skip] || 'no answer' });
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
    log({ type: 'act', act: 'perimeter', phase: 'start', title: 'Perimeter scan', note: 'running in the background' });
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
      log({ type: 'act', act: 'site', phase: 'done', note: `${real_pages_count} pages` });
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
      log({ type: 'act', act: 'perimeter', phase: 'done', note: `${perimeterChecks} checks` });
    } else {
      log({ type: 'act', act: 'perimeter', phase: 'done', note: reconTimedOut ? 'timed out' : 'failed' });
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
      log({ type: 'act', act: 'correlate', phase: 'done', note: 'failed' });
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

    log({ type: 'act', act: 'correlate', phase: 'done', note: `${signals.length} signals` });

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
