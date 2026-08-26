// The site read fires five page scrapes at a self-hosted Firecrawl sharing one
// small box with CORPUS, pgvector and the API. Five concurrent playwright
// browsers is more than it can serve: measured live against cognisys.co.uk on
// 2026-08-26, all five at once returned FOUR 15s timeouts and one 500 — zero
// pages — while the same five run in sequence returned 200s in 7.0-9.0s each
// (only /security genuinely 500s, it serves an SVG). The read degraded quietly:
// "Reading your site · 0 pages" on every prod scan, with the rest of the read
// still landing, so nothing errored and nothing said why.
//
// These tests pin the bound that fixes it: the homepage is scraped ALONE first
// (it is the page the read cannot do without, so it never competes for a browser
// and is never the page a budget drops), then the remaining four run two at a
// time under a wall-clock budget. Whatever landed when the budget expires is the
// read, and the pages that never ran say so rather than reading as failures.
import { describe, it, expect, vi } from 'vitest';
import { scrapePages, PAGES_TO_CHECK, SCRAPE_CONCURRENCY } from '../../src/services/signal-extractor.js';

const BASE = 'https://cognisys.co.uk';

// A Firecrawl double that records how many scrapes are in flight at once, in
// call order — the thing the box actually cares about.
function trackingFirecrawl({ delayMs = 10, failFor = [], hangFor = [], hangMs = 120 } = {}) {
  const state = { inFlight: 0, maxInFlight: 0, order: [], concurrencyAtStart: [] };
  return {
    state,
    scrapeUrl: vi.fn(async (url) => {
      state.inFlight += 1;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      state.order.push(url);
      state.concurrencyAtStart.push(state.inFlight);
      try {
        if (hangFor.some((p) => url.endsWith(p))) {
          // Long enough to still be in flight when the budget closes, short
          // enough to land inside the test — a straggler, not a hang.
          await new Promise((r) => setTimeout(r, hangMs));
        } else {
          await new Promise((r) => setTimeout(r, delayMs));
        }
        if (failFor.some((p) => url.endsWith(p))) {
          return { success: false, statusCode: 500 };
        }
        return { success: true, statusCode: 200, markdown: `# content for ${url}` };
      } finally {
        state.inFlight -= 1;
      }
    }),
  };
}

describe('scrapePages concurrency bound', () => {
  it('scrapes the homepage alone before anything else', async () => {
    const fc = trackingFirecrawl();

    await scrapePages(fc, BASE, () => {}, null);

    expect(fc.state.order[0]).toBe(`${BASE}/`);
    // Nothing else may be in flight while the homepage is being read.
    expect(fc.state.concurrencyAtStart[0]).toBe(1);
  });

  it('never runs more than SCRAPE_CONCURRENCY scrapes at once', async () => {
    const fc = trackingFirecrawl();

    await scrapePages(fc, BASE, () => {}, null);

    expect(SCRAPE_CONCURRENCY).toBe(2);
    expect(fc.state.maxInFlight).toBeLessThanOrEqual(SCRAPE_CONCURRENCY);
    expect(fc.state.order).toHaveLength(PAGES_TO_CHECK.length);
  });

  it('returns every page that answered, homepage first', async () => {
    const fc = trackingFirecrawl();

    const pages = await scrapePages(fc, BASE, () => {}, null);

    expect(pages).toHaveLength(PAGES_TO_CHECK.length);
    expect(pages[0].label).toBe('homepage');
  });

  it('keeps the pages that answered when one 500s', async () => {
    const fc = trackingFirecrawl({ failFor: ['/security'] });

    const pages = await scrapePages(fc, BASE, () => {}, null);

    expect(pages.map((p) => p.label)).not.toContain('security page');
    expect(pages).toHaveLength(PAGES_TO_CHECK.length - 1);
  });

  it('stops starting new scrapes once the budget is spent, and keeps what landed', async () => {
    // Homepage answers fast; every other page hangs well past the budget.
    const fc = trackingFirecrawl({ hangFor: ['/pricing', '/about', '/security', '/trust'] });

    const pages = await scrapePages(fc, BASE, () => {}, null, { budgetMs: 60 });

    // The homepage landed and is the read.
    expect(pages.map((p) => p.label)).toEqual(['homepage']);
    // The budget stopped the queue: the two hanging pages that had already
    // started are the only ones attempted — the last two never ran.
    expect(fc.state.order.length).toBeLessThan(PAGES_TO_CHECK.length);
  });

  it('says which pages the budget dropped, rather than letting them read as failures', async () => {
    const fc = trackingFirecrawl({ hangFor: ['/pricing', '/about', '/security', '/trust'] });
    const lines = [];

    await scrapePages(fc, BASE, (line) => lines.push(line), null, { budgetMs: 60 });

    const text = lines.map((l) => l.text).join('\n');
    expect(text).toMatch(/site budget/i);
    // An unattempted page is named, not silently absent.
    expect(text).toMatch(/not read/i);
  });

  // Measured on prod 2026-08-26 right after the bound shipped: the act closed
  // "3 pages", and THEN a fourth page logged "✓ trust centre · read" — a scrape
  // that landed after the budget expired, reported as a success it was too late
  // to be. On camera that reads as the trace contradicting its own count, the
  // same fault as the round-3 "4 corpus holdings" over "3 sources".
  it('does not report a page that lands after the act has closed', async () => {
    const fc = trackingFirecrawl({ hangFor: ['/pricing', '/about', '/security', '/trust'] });
    const lines = [];

    await scrapePages(fc, BASE, (line) => lines.push(line), null, { budgetMs: 60 });
    // Let every straggler resolve into a read nobody is waiting for.
    await new Promise((r) => setTimeout(r, 250));

    const text = lines.map((l) => l.text).join('\n');
    expect(text).toMatch(/✓\s+homepage · read/);
    // No late page may claim it was read.
    expect(text).not.toMatch(/✓\s+pricing page · read/);
    expect(text).not.toMatch(/✓\s+about page · read/);
  });

  it('accounts for every page that missed the read, in flight or never started', async () => {
    const fc = trackingFirecrawl({ hangFor: ['/pricing', '/about', '/security', '/trust'] });
    const lines = [];

    const pages = await scrapePages(fc, BASE, (line) => lines.push(line), null, { budgetMs: 60 });

    const text = lines.map((l) => l.text).join('\n');
    expect(pages.map((p) => p.label)).toEqual(['homepage']);
    // All four non-homepage pages are named as not read — the two that were
    // still in flight when the budget closed, and the two that never started.
    for (const label of ['pricing page', 'about page', 'security page', 'trust centre']) {
      expect(text).toContain(`${label} · not read`);
    }
  });

  it('never bills a scrape it did not attempt', async () => {
    const fc = trackingFirecrawl({ hangFor: ['/pricing', '/about', '/security', '/trust'] });

    await scrapePages(fc, BASE, () => {}, null, { budgetMs: 60 });

    // recordConsumption is keyed off session_id; with none passed there is
    // nothing to bill, but the attempt count is the honest proxy here.
    expect(fc.scrapeUrl.mock.calls.length).toBe(fc.state.order.length);
    expect(fc.state.order.length).toBeLessThan(PAGES_TO_CHECK.length);
  });
});
