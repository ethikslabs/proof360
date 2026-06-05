// api/src/config/inference.js
//
// Single declaration of the proof360 inference endpoint (one writer).
//
// proof360 ships direct: the inference transport is read from ONE place, not
// re-declared at every call site. INFERENCE_URL is the forward name; VECTOR_URL is
// kept as a backward-compatible fallback so existing SSM/EC2 env keeps working on
// deploy. Today this still defaults to the local carrier (:3003) — pointing it at a
// direct provider endpoint is now a one-line change here, not a 4-site edit.
//
// Note: this declares WHERE inference goes (transport). WHICH model runs is a
// separate fact, resolved per-role via lib/model-resolver.mjs.

export const INFERENCE_URL =
  process.env.INFERENCE_URL ||
  process.env.VECTOR_URL ||
  'http://localhost:3003/v1';

// Derived endpoints — also declared once, so call sites never re-derive them.
export const INFERENCE_HEALTH_URL = INFERENCE_URL.replace(/\/v1\/?$/, '') + '/health';
export const CHAT_COMPLETIONS_URL = `${INFERENCE_URL}/chat/completions`;
