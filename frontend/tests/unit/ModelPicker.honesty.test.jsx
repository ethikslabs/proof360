// A picker that promises seven models and serves two.
//
// The chip on John's screenshot read "● Claude Sonnet 4.6 · Bedrock" while the
// message beneath it was signed claude-haiku-4-5-20251001 — because the API
// hardcoded Haiku and never read the override. That half is fixed at the seam
// (resolveChatModel). This is the other half: four of the seven entries are not
// wired to anything, and selecting one used to produce a Haiku answer wearing a
// Google or NVIDIA badge.
//
// The breadth stays on screen deliberately — the point John is making with this
// product is that inference is a market, not a monolith, and NIM and Perplexity
// and Gemini belong in the frame. But an offer the chrome cannot honour is a lie
// with good intentions. They show; they are marked; they do not silently answer
// as something else.
import { describe, it, expect } from 'vitest';
import { VECTOR_MODELS } from '../../src/data/vectorModels.js';

const byId = (id) => VECTOR_MODELS.find((m) => m.id === id);

describe('the model catalogue tells the truth about itself', () => {
  it('still shows the whole market — this is the argument, not decoration', () => {
    const providers = new Set(VECTOR_MODELS.map((m) => m.provider));
    expect(providers.size).toBeGreaterThanOrEqual(4);
  });

  it('marks what this seam can actually serve', () => {
    expect(byId('claude-haiku-4-5').served).toBe(true);
    expect(byId('claude-sonnet-4-6').served).toBe(true);
  });

  it('marks what is on the map but not yet wired, rather than pretending', () => {
    for (const id of ['gemini-flash', 'llama-nemotron', 'gpt-4o', 'claude-opus-4-7']) {
      expect(byId(id).served).toBe(false);
    }
  });

  it('every entry declares one way or the other — no silent default', () => {
    for (const m of VECTOR_MODELS) expect(typeof m.served).toBe('boolean');
  });

  // The chat seam whitelists exactly these two (api SERVED_MODELS). If the two
  // lists drift, the chip starts lying again — which is the whole bug.
  it('agrees with the API on which two are live', () => {
    const served = VECTOR_MODELS.filter((m) => m.served).map((m) => m.id).sort();
    expect(served).toEqual(['claude-haiku-4-5', 'claude-sonnet-4-6']);
  });
});
