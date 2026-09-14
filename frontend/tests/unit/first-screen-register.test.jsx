// The first screen (HX loop, findings 15–16, 14 Sept 2026) — the frontend half.
// Law 11: the engine rides as data, never as words. R10: a probe fact never leads.
import { describe, it, expect } from 'vitest';
import { vendorsForAct } from '../../src/components/chat/VendorMarks.jsx';
import { partitionLines } from '../../src/components/chat/ActTrace.jsx';
import { coldReadOpener } from '../../src/rendering/coldReadOpener.js';

describe('engines ride beside the words', () => {
  it('vendor marks read the structured engine field, so a wordless note still resolves the mark', () => {
    const names = vendorsForAct({ id: 'reading', engine: 'claude-haiku/bedrock', note: undefined, phase: 'done' }).map((v) => v.name);
    expect(names).toEqual(['Anthropic', 'AWS']);
    expect(vendorsForAct({ id: 'correlate', engine: 'claude-haiku/bedrock', phase: 'done' }).map((v) => v.name)).toEqual(['Anthropic', 'AWS']);
  });
  it('partitionLines carries the engine off the act start without putting it in the title or note', () => {
    const { acts } = partitionLines([
      { type: 'act', act: 'perplexity', phase: 'start', title: 'Asking the live web about you', engine: 'perplexity/sonar' },
      { type: 'act', act: 'perplexity', phase: 'done', note: 'answered' },
    ]);
    expect(acts[0].engine).toBe('perplexity/sonar');
    expect(acts[0].title).not.toMatch(/perplexity|sonar/i);
    expect(acts[0].note).not.toMatch(/perplexity|sonar/i);
  });
});

describe('a probe fact never leads (R10)', () => {
  it('the opener leaves a probe: true inference out of the first read', () => {
    const text = coldReadOpener({
      name: 'Acme', sourcesRead: 3, reading: null,
      inferences: [
        { inference_id: 'inf_product', label: 'B2B SaaS', confidence: 'probable' },
        { inference_id: 'inf_infrastructure', label: 'Hosted on Oracle', confidence: 'observed', category: 'infrastructure', probe: true },
      ],
    });
    expect(text).toContain('B2B SaaS');
    expect(text).not.toMatch(/Hosted on|Oracle/);
  });
  it('an unflagged inference still appears (the flag is the mechanism, not the label)', () => {
    const text = coldReadOpener({ name: 'Acme', sourcesRead: 3, reading: null,
      inferences: [{ inference_id: 'inf_infrastructure', label: 'Hosted on AWS', confidence: 'probable', category: 'infrastructure' }] });
    expect(text).toContain('Hosted on AWS');
  });
});

// ── Review round 1 (14 Sept, fresh Opus reviewer) ──
import { readingAnchorLabels } from '../../src/rendering/coldReadOpener.js';
import { deriveWorkUnits } from '../../src/rendering/workUnits.js';

const MACHINERY = /\b(perplexity|sonar|gemini|flash|haiku|claude|bedrock|anthropic|firecrawl|hibp|abuseipdb|ssllabs|veritas|corpus|dns|dmarc|spf|csp|hsts|tls|ssl|recon|engine|scan|probe)\b/i;

describe('older streams still resolve a vendor mark from the note', () => {
  it('note-only act resolves Anthropic and AWS', () => {
    expect(vendorsForAct({ id: 'reading', note: 'claude haiku · bedrock', phase: 'done' }).map((v) => v.name)).toEqual(['Anthropic', 'AWS']);
  });
});

describe('the first sentence and the chips under the reading name no machinery', () => {
  it('the degraded headline speaks plainly', () => {
    const text = coldReadOpener({ name: 'Acme', sourcesRead: 0, inferences: [], reading: null });
    expect(text.split('\n')[0]).not.toMatch(MACHINERY);
  });
  it('a probe anchor never becomes a chip under the reading (R10)', () => {
    expect(readingAnchorLabels('a reading', [{ label: 'what the site says' }, { label: 'where the site is hosted', probe: true }])).toEqual(['what the site says']);
  });
});

describe('the work panel counts what we did without naming engines', () => {
  it('no Engines row of names; a count instead', () => {
    const rows = deriveWorkUnits({ pages_read_count: 3, sources_read: ['a'], inferences: [], research_engines: ['perplexity', 'gemini'], corpus_citations: { hits: [{}] } });
    for (const r of rows) {
      expect(`${r.label} ${r.value}`).not.toMatch(MACHINERY);
    }
    expect(rows.some((r) => /answers? from the web/i.test(r.label) && r.value === 2)).toBe(true);
  });
});

describe('an act without a title never shows its id as the heading', () => {
  it('an untagged error before any act start is shown under the read itself, never under the outside look', () => {
    const { acts } = partitionLines([{ type: 'err', text: '  ✗  the read stopped early' }]);
    expect(acts.length).toBe(1);
    expect(acts[0].title).not.toBe('perimeter');
    expect(acts[0].title).not.toMatch(/outside/i);
    expect(acts[0].title).not.toMatch(MACHINERY);
    expect(acts[0].body[0].text).toContain('stopped early');
  });
  it('an untagged line arriving while an act is open joins that act', () => {
    const { acts } = partitionLines([
      { type: 'act', act: 'site', phase: 'start', title: 'Reading your site' },
      { type: 'err', text: '  ✗  the read stopped early' },
    ]);
    expect(acts.length).toBe(1);
    expect(acts[0].id).toBe('site');
    expect(acts[0].body.map((b) => b.text).join(' ')).toContain('stopped early');
  });
});
