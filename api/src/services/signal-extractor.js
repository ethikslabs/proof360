import FirecrawlApp from '@mendable/firecrawl-js';
import OpenAI from 'openai';
import { ENTERPRISE_SIGNALS_SCHEMA } from '../config/gaps.js';
import { runReconPipeline } from './recon-pipeline.js';

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

async function scrapePages(firecrawl, baseUrl, log) {
  const tasks = PAGES_TO_CHECK.map(async ({ path, label }) => {
    try {
      const result = await firecrawl.scrapeUrl(baseUrl + path, {
        formats: ['markdown'],
        timeout: 15000,
      });
      if (result.success && result.markdown) {
        log({ text: `  ✓  ${label} · read`, type: 'ok' });
        return { label, content: result.markdown.slice(0, 3000) };
      } else {
        log({ text: `  ↳  ${label} · no content returned`, type: 'muted' });
      }
    } catch (err) {
      const reason = err?.message?.includes('timeout') ? 'timeout' : (err?.message || 'failed');
      log({ text: `  ✗  ${label} · ${reason}`, type: 'err' });
    }
    return null;
  });

  const settled = await Promise.allSettled(tasks);
  return settled
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
}

async function extractWithClaude(pages, log = () => {}) {
  const client = new OpenAI({ baseURL: process.env.AI_GATEWAY_URL || 'http://localhost:3003/v1', apiKey: 'gateway' });

  const content = pages.map((p) => `### ${p.label}\n${p.content}`).join('\n\n');

  const prompt = `Analyze this website content and extract business signals about the company.

IMPORTANT: You are reading marketing copy and public pages. Extract only what the NARRATIVE tells you — who they are, what they sell, who they sell to. Do NOT infer technical infrastructure, security posture, or compliance status from page content — those facts come from technical scans, not marketing pages.

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
  "confidence": "confident" | "likely" | "probable"
}`;

  let response;
  try {
    response = await client.chat.completions.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (err) {
    log({ text: `  ✗  Claude API error: ${err.message}`, type: 'err' });
    if (err.status) log({ text: `  ↳  HTTP ${err.status}`, type: 'err' });
    throw err;
  }

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

function mapToSignals(extracted) {
  const confidence = extracted.confidence || 'probable';
  const signals = [];

  // Business signals only — infrastructure/compliance/identity come from recon + founder answers
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

  return { signals, sources_read, enterprise_signals, competitor_mentions: [] };
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
  infrastructure:    (v) => `Infrastructure: ${v}`,
  compliance_status: (v) => `Compliance: ${v}`,
  identity_model:    (v) => `Identity model: ${v}`,
  insurance_status:  (v) => `Insurance: ${v}`,
};

export async function extractSignals({ website_url, deck_file }, log = () => {}) {
  // No Firecrawl key — fall back to simulation (gateway handles AI credentials)
  if (!process.env.FIRECRAWL_API_KEY) {
    await new Promise((r) => setTimeout(r, 2000));
    return fallbackSignals(website_url, deck_file);
  }

  if (!website_url) {
    return fallbackSignals(null, deck_file);
  }

  try {
    const baseUrl = normalizeUrl(website_url);
    let domain = baseUrl;
    try { domain = new URL(baseUrl).hostname.replace('www.', ''); } catch {}

    const firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY || 'self-hosted',
      apiUrl: process.env.FIRECRAWL_API_URL || undefined,
    });

    log({ text: `$ proof360 --url ${domain}`, type: 'cmd' });
    log({ text: '', type: 'blank' });
    log({ text: '  Fetching public signals...', type: 'muted' });
    for (const { path, label } of PAGES_TO_CHECK) {
      log({ text: `  ↳  ${label} ${baseUrl + path}`, type: 'muted' });
    }

    // Run scraping + recon in parallel
    const [pages, recon_context] = await Promise.all([
      scrapePages(firecrawl, baseUrl, log),
      Promise.race([
        runReconPipeline(website_url, null, { firecrawl, abuseIpdbKey: process.env.ABUSEIPDB_API_KEY || null }),
        new Promise((resolve) => setTimeout(() => {
          log({ text: '  ✗  Recon timed out after 20s — continuing without it', type: 'err' });
          resolve(null);
        }, 20000)),
      ]).catch((err) => {
        log({ text: `  ✗  Recon: ${err.message}`, type: 'err' });
        return null;
      }),
    ]);

    if (pages.length === 0) {
      log({ text: '  ✗  No pages could be read from this site', type: 'err' });
      log({ text: '  ↳  Falling back to domain-level signals only', type: 'muted' });
      return { ...fallbackSignals(website_url, deck_file), recon_context };
    }

    log({ text: '', type: 'blank' });
    log({ text: `  ✓  ${pages.length} pages read`, type: 'ok' });
    log({ text: '', type: 'blank' });
    log({ text: '  Querying VERITAS corpus...', type: 'muted' });
    log({ text: '  ↳  SOC 2 / ISO 27001 / APRA CPS 234', type: 'query' });
    log({ text: '  ↳  NIST CSF 2.0 / Essential Eight', type: 'query' });
    log({ text: '', type: 'blank' });
    log({ text: '  Extracting signals...', type: 'muted' });
    log({ text: '  ↳  Sending to Claude Haiku for analysis', type: 'muted' });

    const sources_read = pages.map((p) => p.label);
    const extracted = await extractWithClaude(pages, log);
    const signals = mapToSignals(extracted);

    for (const signal of signals) {
      const label = SIGNAL_READABLE[signal.type]?.(signal.value);
      if (label) log({ text: `  ↳  ${label}`, type: 'query' });
    }

    log({ text: '', type: 'blank' });
    log({ text: `  ✓  ${signals.length} signals detected`, type: 'ok' });
    log({ text: '  Building your read...', type: 'muted' });

    const enterprise_signals = {
      ...ENTERPRISE_SIGNALS_SCHEMA,
      ...(extracted.enterprise_signals || {}),
    };
    const competitor_mentions = extracted.competitor_mentions || [];

    if (signals.length === 0) {
      log({ text: '  ✗  Claude returned no signals from page content', type: 'err' });
      log({ text: '  ↳  Falling back to domain-level signals only', type: 'muted' });
      return { ...fallbackSignals(website_url, deck_file), recon_context };
    }

    return { signals, sources_read, enterprise_signals, competitor_mentions, recon_context };
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
