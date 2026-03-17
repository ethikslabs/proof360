// TODO Phase 2: Wire real HTTP scraping of homepage/pricing/about pages + LLM parsing
// via Trust360. Current implementation is MVP simulation only. Do not ship to production
// without replacing this with actual extraction. See brief-api.md for the real pipeline.

import { ENTERPRISE_SIGNALS_SCHEMA } from '../config/gaps.js';

export async function extractSignals({ website_url, deck_file }) {
  // Simulate async extraction delay (real version: HTTP scrape + Trust360 LLM calls)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const sources_read = [];
  const signals = [];

  // MVP enterprise signals — all false until real scraping is wired
  const enterprise_signals = { ...ENTERPRISE_SIGNALS_SCHEMA };
  const competitor_mentions = [];

  if (website_url) {
    sources_read.push('homepage', 'pricing page', 'about page');
    signals.push(
      { type: 'product_type', value: 'B2B SaaS', confidence: 'confident' },
      { type: 'customer_type', value: 'Enterprise (B2B)', confidence: 'likely' },
      { type: 'data_sensitivity', value: 'Customer data', confidence: 'likely' },
    );
    // MVP: simulate detecting an enterprise pricing tier
    enterprise_signals.pricing_enterprise_tier = true;
  }

  if (deck_file) {
    sources_read.push('pitch deck');
    signals.push(
      { type: 'stage', value: 'Seed', confidence: 'confident' },
      { type: 'use_case', value: 'Enterprise sales', confidence: 'likely' },
    );
  }

  // Fallback when no signals extracted
  if (signals.length === 0) {
    signals.push(
      { type: 'product_type', value: 'Software product', confidence: 'probable' },
    );
    sources_read.push('homepage');
  }

  return { signals, sources_read, enterprise_signals, competitor_mentions };
}
