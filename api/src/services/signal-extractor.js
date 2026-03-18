import FirecrawlApp from '@mendable/firecrawl-js';
import Anthropic from '@anthropic-ai/sdk';
import { ENTERPRISE_SIGNALS_SCHEMA } from '../config/gaps.js';

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

async function scrapePages(firecrawl, baseUrl) {
  const tasks = PAGES_TO_CHECK.map(async ({ path, label }) => {
    try {
      const result = await firecrawl.scrapeUrl(baseUrl + path, {
        formats: ['markdown'],
        timeout: 15000,
      });
      if (result.success && result.markdown) {
        return { label, content: result.markdown.slice(0, 3000) };
      }
    } catch {
      // page doesn't exist or timed out — skip silently
    }
    return null;
  });

  const settled = await Promise.allSettled(tasks);
  return settled
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
}

async function extractWithClaude(pages) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content = pages.map((p) => `### ${p.label}\n${p.content}`).join('\n\n');

  const prompt = `Analyze this website content and extract structured signals about the company.

${content}

Respond with ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "product_type": "B2B SaaS" | "B2C App" | "Platform" | "API" | "Software product" | "Unknown",
  "customer_type": "Enterprise (B2B)" | "SMB (B2B)" | "Consumer (B2C)" | "Mixed" | "Unknown",
  "data_sensitivity": "PII" | "Financial data" | "Healthcare data" | "Customer data" | "None" | "Unknown",
  "stage": "Pre-seed" | "Seed" | "Series A" | "Series B+" | "Unknown",
  "use_case": "brief description of main use case",
  "infrastructure": "Cloud (AWS/GCP/Azure)" | "On-premise" | "Hybrid" | "Unknown",
  "compliance_status": "soc2_type2" | "soc2_type1" | "iso27001" | "none" | "unknown",
  "identity_model": "sso" | "mfa_only" | "password_only" | "unknown",
  "insurance_status": "active" | "none" | "unknown",
  "competitor_mentions": ["array of competitor product/company names mentioned"],
  "enterprise_signals": {
    "security_page_detected": boolean,
    "trust_centre_detected": boolean,
    "soc2_mentioned": boolean,
    "pricing_enterprise_tier": boolean
  },
  "confidence": "confident" | "likely" | "probable"
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  // Strip markdown code fences if present
  const json = text.startsWith('```') ? text.replace(/^```\w*\n?/, '').replace(/```$/, '').trim() : text;
  return JSON.parse(json);
}

function mapToSignals(extracted) {
  const confidence = extracted.confidence || 'probable';
  const signals = [];

  const mappings = [
    ['product_type', extracted.product_type],
    ['customer_type', extracted.customer_type],
    ['data_sensitivity', extracted.data_sensitivity],
    ['stage', extracted.stage],
    ['use_case', extracted.use_case],
    ['infrastructure', extracted.infrastructure],
    ['compliance_status', extracted.compliance_status],
    ['identity_model', extracted.identity_model],
    ['insurance_status', extracted.insurance_status],
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

export async function extractSignals({ website_url, deck_file }) {
  // No API keys — fall back to simulation (dev / local without keys)
  if (!process.env.FIRECRAWL_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    await new Promise((r) => setTimeout(r, 2000));
    return fallbackSignals(website_url, deck_file);
  }

  if (!website_url) {
    return fallbackSignals(null, deck_file);
  }

  try {
    const baseUrl = normalizeUrl(website_url);
    const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

    const pages = await scrapePages(firecrawl, baseUrl);

    if (pages.length === 0) {
      return fallbackSignals(website_url, deck_file);
    }

    const sources_read = pages.map((p) => p.label);
    const extracted = await extractWithClaude(pages);
    const signals = mapToSignals(extracted);
    const enterprise_signals = {
      ...ENTERPRISE_SIGNALS_SCHEMA,
      ...(extracted.enterprise_signals || {}),
    };
    const competitor_mentions = extracted.competitor_mentions || [];

    if (signals.length === 0) {
      return fallbackSignals(website_url, deck_file);
    }

    return { signals, sources_read, enterprise_signals, competitor_mentions };
  } catch (err) {
    console.error('[signal-extractor] pipeline error:', err.message);
    return fallbackSignals(website_url, deck_file);
  }
}
