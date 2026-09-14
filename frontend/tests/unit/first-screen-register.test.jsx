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
