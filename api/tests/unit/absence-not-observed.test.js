// HX loop fix 1 (beat 4 · Uneasy · Law 5 observed-not-confirmed). Seat-walk of
// 12 Sept 2026: the read said "we simply didn't see it"; Sophia said "your own
// SOC 2 gap". CORPUS holds no claim that Cognisys lacks SOC 2. The absence was
// laundered into a fact in three hops, none of them the model's:
//   inference-builder: no compliance signal → "Pre-SOC 2" (probable)
//   context-normalizer: that inference exists → compliance_status 'none'
//   gaps.js soc2 fires on 'none' → prompt "Gaps identified: SOC 2 certification gap"
// Fix at the seam: an absence travels as state 'not_observed' on every hop, and
// the prompt renders it as an absence, never a finding. Enforced here, not by
// asking the model nicely (CANON-hx-loop R1, 2026-09-13).
import { describe, it, expect } from 'vitest';
import { buildInferences } from '../../src/services/inference-builder.js';
import { normalizeContext } from '../../src/services/context-normalizer.js';
import { runGapAnalysis } from '../../src/services/gap-mapper.js';
import { buildSystemPrompt } from '../../src/services/persona-prompts.js';
import { appendChatReceipt } from '../../src/handlers/record.js';
import { createSession, getSession } from '../../src/services/session-store.js';

describe('hop 1 — inference-builder: no compliance signal is an absence, not "Pre-SOC 2"', () => {
  it('emits the compliance inference as not_observed', () => {
    const { inferences } = buildInferences([], ['https://cognisys.co.uk'], 'https://cognisys.co.uk');
    const inf = inferences.find((i) => i.inference_id === 'inf_compliance');
    expect(inf).toBeDefined();
    expect(inf.state).toBe('not_observed');
    expect(inf.confidence).toBe('not_observed');
    expect(inf.label).not.toBe('Pre-SOC 2');
    expect(inf.label.toLowerCase()).toContain('not seen');
  });

  it('a compliance signal that WAS read carries no not_observed state', () => {
    const signals = [{ type: 'compliance_status', value: 'certified', confidence: 'observed' }];
    const { inferences } = buildInferences(signals, ['https://x.com'], 'https://x.com');
    // A read signal maps to inf_compliance_status; the absence placeholder is never added.
    expect(inferences.find((i) => i.inference_id === 'inf_compliance')).toBeUndefined();
    const read = inferences.find((i) => i.inference_id === 'inf_compliance_status');
    expect(read).toBeDefined();
    expect(read.state).not.toBe('not_observed');
  });
});

describe('hop 2 — context-normalizer: an absence derives "unknown", never "none"', () => {
  it('not_observed compliance inference → compliance_status unknown', () => {
    const session = {
      correctable_fields: [],
      inferences: [{ inference_id: 'inf_compliance', state: 'not_observed', label: 'SOC 2: not seen on the pages read' }],
      raw_signals: [],
    };
    const ctx = normalizeContext(session);
    expect(ctx.compliance_status).toBe('unknown');
  });
});

describe('hop 3 — gap-mapper: a gap fired from an absence is tagged not_observed', () => {
  it('soc2 from compliance_status unknown → state not_observed', async () => {
    const result = await runGapAnalysis({ compliance_status: 'unknown' });
    const soc2 = result.gaps.find((g) => g.gap_id === 'soc2');
    expect(soc2).toBeDefined();
    expect(soc2.state).toBe('not_observed');
  });

  it('soc2 from an observed "none" → state observed', async () => {
    const result = await runGapAnalysis({ compliance_status: 'none' });
    const soc2 = result.gaps.find((g) => g.gap_id === 'soc2');
    expect(soc2).toBeDefined();
    expect(soc2.state).toBe('observed');
  });
});

describe('hop 4 — persona prompt: an absence is never handed to the advisor as a finding', () => {
  const OBSERVED_GAP = {
    gap_id: 'dmarc', severity: 'moderate', title: 'Email domain protection gap (DMARC)',
    why: 'Your domain has a DMARC record but the policy is p=none.', state: 'observed',
  };
  const ABSENT_GAP = {
    gap_id: 'soc2', severity: 'critical', title: 'SOC 2 certification gap',
    why: "Without SOC 2 Type II, enterprise buyers can't verify your security controls.",
    state: 'not_observed',
  };
  const CONTEXT = { company_name: 'Cognisys', website: 'cognisys.co.uk', gaps: [OBSERVED_GAP, ABSENT_GAP] };

  for (const persona of ['sophia', 'leonardo', 'edison']) {
    it(`${persona}: the not_observed gap is outside "Gaps identified" and inside "Not seen on the pages read"`, () => {
      const prompt = buildSystemPrompt(persona, CONTEXT);
      const gapsAt = prompt.indexOf('Gaps identified:');
      const absentAt = prompt.indexOf('Not seen on the pages read');
      expect(gapsAt).toBeGreaterThan(-1);
      expect(absentAt).toBeGreaterThan(-1);
      const gapsBlock = prompt.slice(gapsAt, absentAt);
      expect(gapsBlock).toContain('Email domain protection gap (DMARC)');
      expect(gapsBlock).not.toContain('SOC 2 certification gap');
      const absentBlock = prompt.slice(absentAt);
      expect(absentBlock).toContain('SOC 2');
      // The "why" is a consequence of a fact — an absence has none to hand over.
      expect(absentBlock).not.toContain("Without SOC 2 Type II");
    });
  }

  it('the absence block tells the advisor the register: "did not see", never "your gap"', () => {
    const prompt = buildSystemPrompt('sophia', CONTEXT);
    const absentBlock = prompt.slice(prompt.indexOf('Not seen on the pages read'));
    expect(absentBlock).toMatch(/did not see/i);
    expect(absentBlock).toMatch(/never .*(your gap|you lack)/i);
  });

  it('with only observed gaps there is no absence block at all', () => {
    const prompt = buildSystemPrompt('sophia', { ...CONTEXT, gaps: [OBSERVED_GAP] });
    expect(prompt).not.toContain('Not seen on the pages read');
  });
});

describe('second seam — the receipt keeps could-not-look (null) apart from found-nothing ([])', () => {
  it('null hits persist as null on the receipt', () => {
    const session = createSession({ company_name: 'Cognisys' });
    appendChatReceipt(session, { query: 'q', hits: null });
    const stored = getSession(session.id);
    expect(stored.chat_receipts.at(-1).hits).toBeNull();
  });

  it('empty hits persist as an empty list', () => {
    const session = createSession({ company_name: 'Cognisys' });
    appendChatReceipt(session, { query: 'q', hits: [] });
    const stored = getSession(session.id);
    expect(stored.chat_receipts.at(-1).hits).toEqual([]);
  });
});
