// Found 2026-08-26 while removing the grade from the persona prompts, and it is
// the sharper half of that find.
//
// gapsBlock reads `g.label || g.id`. runGapAnalysis returns `title` and
// `gap_id`. Nothing else. So every persona's system prompt has been carrying:
//
//     Gaps identified:
//     - undefined (critical)
//       Why it matters: Without SOC 2 certification, enterprise buyers cannot…
//
// The personas know the founder's score and cannot name a single one of their
// gaps. They reason about problems they have no word for, which is why their
// answers reach for the one concrete thing they were handed — the number.
//
// activeGapBlock has the identical fault on `gap.label`, and it feeds the
// "FOUNDER IS CURRENTLY LOOKING AT THIS GAP" block — the one place the prompt
// claims to know exactly what is in front of them.
//
// The fixtures here are the REAL shape (gap-mapper.js, "Build confirmed gap
// objects"), never a hand-invented one — that mismatch is the whole bug.
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../src/services/persona-prompts.js';

const PERSONAS = ['sophia', 'leonardo', 'edison'];

// Exactly what runGapAnalysis emits and session-chat.js puts on session.gaps.
const REAL_GAP = {
  gap_id: 'soc2',
  category: 'governance',
  severity: 'critical',
  title: 'SOC 2 certification gap',
  why: 'Without SOC 2 certification, enterprise buyers cannot verify your security controls.',
  risk: 'This gap increases risk to your enterprise deal readiness.',
  control: 'SOC 2 certification gap',
  remediation: ['Start a readiness assessment'],
};

const REAL_DMARC_GAP = {
  gap_id: 'dmarc',
  category: 'infrastructure',
  severity: 'moderate',
  title: 'Email domain protection gap (DMARC)',
  why: 'Your domain has a DMARC record but the policy is set to p=none — monitoring only.',
  remediation: ['Move the policy to p=quarantine'],
};

const CONTEXT = {
  company_name: 'Cognisys',
  website: 'cognisys.co.uk',
  gaps: [REAL_GAP, REAL_DMARC_GAP],
};

describe('persona prompts name the gaps they are given', () => {
  for (const persona of PERSONAS) {
    it(`${persona} is never handed an "undefined" gap`, () => {
      const prompt = buildSystemPrompt(persona, CONTEXT);
      expect(prompt).not.toContain('undefined');
    });

    it(`${persona} can name each gap`, () => {
      const prompt = buildSystemPrompt(persona, CONTEXT);
      expect(prompt).toContain('SOC 2 certification gap');
      expect(prompt).toContain('Email domain protection gap (DMARC)');
    });
  }

  it('keeps the older label/id shape working — this is a widening, not a swap', () => {
    const legacy = { id: 'mfa', label: 'MFA not enforced', severity: 'high', why: 'because' };
    const prompt = buildSystemPrompt('edison', { ...CONTEXT, gaps: [legacy] });
    expect(prompt).toContain('MFA not enforced');
    expect(prompt).not.toContain('undefined');
  });

  it('the active-gap block names the gap the founder has open', () => {
    const prompt = buildSystemPrompt('edison', { ...CONTEXT, active_gap: REAL_DMARC_GAP });
    const active = prompt.split('FOUNDER IS CURRENTLY LOOKING AT THIS GAP:')[1] || '';
    expect(active).toContain('Email domain protection gap (DMARC)');
    expect(active).not.toContain('undefined');
  });

  it('says so honestly when there are no gaps, rather than inventing one', () => {
    const prompt = buildSystemPrompt('sophia', { ...CONTEXT, gaps: [] });
    expect(prompt).toContain('none identified');
    expect(prompt).not.toContain('undefined');
  });
});
