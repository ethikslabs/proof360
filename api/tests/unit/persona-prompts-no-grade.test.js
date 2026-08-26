// John's ruling 2026-08-26, said twice: "We are not doing scores" / "No numbers
// — makes you feel like you are in school being graded." The landing emotional
// contract has said it since 2026-05-18 ("Not a grading rubric", "The founder
// never feels evaluated") and the HX north star gives the reason: a founder who
// sees 23/100 feels judged and defensive, which is the opposite of the product.
//
// Removing the rings from the dashboards would have missed the worst of it. The
// score was injected into EVERY persona's system prompt as "Trust score: 15/100",
// Leonardo was instructed to "Reference at least one specific gap or score", and
// Edison was told to "optimise for the fastest path to a meaningful score
// improvement". A number a persona speaks is worse than a number on a ring: it
// arrives in a trusted voice, so it reads as judgement from someone who knows you.
//
// These tests pin the prompt itself, because that is the surface the founder
// actually hears. Related: the percentage ban in grade-words.test.js
// (frontend) — same wave, one rung down.
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../src/services/persona-prompts.js';

const PERSONAS = ['sophia', 'leonardo', 'edison'];

const CONTEXT = {
  company_name: 'Cognisys',
  website: 'cognisys.co.uk',
  score: 15,
  gaps: [
    { gap_id: 'dmarc', title: 'Email domain protection gap (DMARC)', severity: 'moderate' },
    { gap_id: 'soc2', title: 'SOC 2 certification gap', severity: 'critical' },
  ],
  recon: null,
};

describe('persona prompts never hand a persona a grade', () => {
  for (const persona of PERSONAS) {
    describe(persona, () => {
      const prompt = () => buildSystemPrompt(persona, CONTEXT);

      it('does not state a trust score', () => {
        expect(prompt()).not.toMatch(/trust score/i);
      });

      it('does not carry a score out of 100 in any form', () => {
        const p = prompt();
        expect(p).not.toContain('/100');
        expect(p).not.toMatch(/out of 100/i);
        // The bare number must not survive either — "15" alone next to the
        // company is still the grade.
        expect(p).not.toMatch(/\bscore[^a-z]{0,3}15\b/i);
      });

      it('never instructs the persona to reference or improve a score', () => {
        const p = prompt();
        expect(p).not.toMatch(/score improvement/i);
        expect(p).not.toMatch(/reference at least one specific gap or score/i);
      });

      it('still hands the persona the company and its gaps — subtraction, not blinding', () => {
        const p = prompt();
        expect(p).toContain('Cognisys');
        expect(p).toMatch(/dmarc/i);
        expect(p).toMatch(/soc 2/i);
      });
    });
  }

  it('a score in the context object cannot leak through any persona', () => {
    for (const persona of PERSONAS) {
      const p = buildSystemPrompt(persona, { ...CONTEXT, score: 73 });
      expect(p).not.toContain('73');
    }
  });

  it('builds cleanly when no score is passed at all', () => {
    for (const persona of PERSONAS) {
      const p = buildSystemPrompt(persona, { ...CONTEXT, score: undefined });
      expect(p).toContain('Cognisys');
      expect(p).not.toMatch(/undefined/);
      expect(p).not.toMatch(/NaN/);
    }
  });
});
