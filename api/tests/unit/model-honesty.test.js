// The chrome said one thing; the model was another.
//
// On John's screenshot, 2026-08-26, three labels for one answer, all visible at
// once: the header chip read "● Claude Sonnet 4.6 · Bedrock", the footer of the
// message read "claude-haiku-4-5-20251001", and the trace above it read "Writing
// your read · claude haiku · bedrock". The picker offers seven models across four
// providers; session-chat.js hardcoded ONE and never read the model_override the
// frontend was sending. So the dropdown was decorative, and a product whose whole
// thesis is provenance was misreporting its own inference path on the front page.
//
// Two rules, and the second is the one that bites: serve what the founder picked,
// and when we can't serve it, say so — never silently answer as something else.
// A silent fallback is how "Claude Sonnet 4.6" ended up over a Haiku answer.
import { describe, it, expect } from 'vitest';
import { resolveChatModel, SERVED_MODELS } from '../../src/handlers/session-chat.js';

describe('resolveChatModel — the badge must not outrank the truth', () => {
  it('serves the model the founder actually picked', () => {
    expect(resolveChatModel('claude-sonnet-4-6').model).toBe('claude-sonnet-4-6');
  });

  it('falls back to the default when nothing was picked', () => {
    expect(resolveChatModel(undefined).model).toBe('claude-haiku-4-5-20251001');
    expect(resolveChatModel(null).model).toBe('claude-haiku-4-5-20251001');
  });

  // The Azure lane is banned estate-wide (feedback_inference_priority: Bedrock →
  // NIM → paid; Azure BANNED), and Gemini / Perplexity / NIM are not Bedrock at
  // all. Before this, picking any of them answered as Haiku wearing their name.
  it('refuses a model this seam cannot serve rather than quietly substituting one', () => {
    for (const unserved of ['gpt-4o', 'gemini-flash', 'llama-nemotron', 'claude-opus-4-7']) {
      const r = resolveChatModel(unserved);
      expect(r.model).toBe('claude-haiku-4-5-20251001');
      expect(r.substituted).toBe(true);
      expect(r.requested).toBe(unserved);
    }
  });

  it('reports no substitution when the pick was honoured', () => {
    expect(resolveChatModel('claude-sonnet-4-6').substituted).toBe(false);
  });

  // Default-deny on an untrusted body field: anything not on the list is refused,
  // never passed through to the inference layer to be interpreted.
  it('never passes an arbitrary string through to Bedrock', () => {
    const r = resolveChatModel('../../etc/passwd');
    expect(r.model).toBe('claude-haiku-4-5-20251001');
    expect(r.substituted).toBe(true);
  });

  it('only lists models the inference layer genuinely maps', () => {
    expect(SERVED_MODELS).toContain('claude-haiku-4-5-20251001');
    expect(SERVED_MODELS).toContain('claude-sonnet-4-6');
    expect(SERVED_MODELS).not.toContain('gpt-4o');
  });
});
