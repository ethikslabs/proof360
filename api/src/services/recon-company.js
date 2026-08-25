// Company research — real-time web intelligence about the target company.
// Perplexity sonar and Gemini 2.5 Flash now BOTH run on every read (John ruling
// 2026-08-25 — no longer primary/fallback: each engine is its own narrated act
// in the cold-read pipeline (signal-extractor.js), so both real answers feed
// extraction whenever available). A missing key, a failed call, or content
// under MIN_CHARS all resolve to an honest `skip` reason for the caller's act
// note — never invented, never silently swapped for the other engine.
//
// Token usage is metered at each direct call site (Perplexity, Gemini) → estate usage ledger.
import * as meter from '../lib/meter.mjs';

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=`;
const TIMEOUT_MS = 10_000;
const MIN_CHARS = 400;

// The verbatim research query — exported so the cold-read pipeline can display
// the exact text sent (radical transparency, John ruling 2026-08-25).
export const researchQuery = (domain) =>
  `Research the company at ${domain}. Cover: what they build and sell, who their customers are, funding stage and amount raised if known, founding team, and any notable news or partnerships in the last 12 months. Be specific and factual. 200 words max.`;

async function fetchPerplexity(query, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: query }], max_tokens: 400 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    // Meter the spend even if the content is later judged thin — the tokens were consumed.
    meter.emit({ provider: 'perplexity', model: 'sonar', ...meter.extractUsage(data) });
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function fetchGemini(query, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_URL}${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: query }] }] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    // Gemini reports usageMetadata (not OpenAI-shaped usage), so pass tokens explicitly.
    const um = data.usageMetadata || {};
    meter.emit({ provider: 'gemini', model: 'gemini-2.5-flash', in: um.promptTokenCount ?? 0, out: um.candidatesTokenCount ?? 0 });
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// Each engine's result is one of:
//   { content, source }         — a real, usable answer
//   { skip: 'no key' }          — the API key isn't configured
//   { skip: 'no answer' }       — the call failed or returned nothing
//   { skip: 'too thin' }        — an answer came back but under MIN_CHARS
// Never both content and skip — the caller narrates whichever is honest.

export async function fetchPerplexityResearch(domain) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { skip: 'no key' };
  const content = await fetchPerplexity(researchQuery(domain), apiKey).catch(() => null);
  if (!content) return { skip: 'no answer' };
  if (content.length < MIN_CHARS) return { skip: 'too thin' };
  return { content: content.slice(0, 2000), source: 'perplexity/sonar' };
}

export async function fetchGeminiResearch(domain) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { skip: 'no key' };
  const content = await fetchGemini(researchQuery(domain), apiKey).catch(() => null);
  if (!content) return { skip: 'no answer' };
  if (content.length < MIN_CHARS) return { skip: 'too thin' };
  return { content: content.slice(0, 2000), source: 'gemini/2.5-flash' };
}

// Thin combiner kept for any caller wanting a single best-answer result
// (perplexity preferred, gemini fallback). The cold-read pipeline itself does
// NOT use this — it calls fetchPerplexityResearch/fetchGeminiResearch directly
// since both now run and narrate as independent acts (signal-extractor.js).
export async function reconCompany(domain, session_id = null) {
  const perplexity = await fetchPerplexityResearch(domain);
  if (perplexity.content) return { label: `company research (${perplexity.source})`, content: perplexity.content };
  const gemini = await fetchGeminiResearch(domain);
  if (gemini.content) return { label: `company research (${gemini.source})`, content: gemini.content };
  return null;
}
