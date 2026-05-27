// Company research — real-time web intelligence about the target company.
// Perplexity sonar is primary (real-time web). Gemini 2.0 Flash is fallback if Perplexity
// returns thin content or fails. Silent if neither key is present.

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=`;
const TIMEOUT_MS = 10_000;
const MIN_CHARS = 400;

const QUERY = (domain) =>
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export async function reconCompany(domain, session_id = null) {
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const geminiKey     = process.env.GEMINI_API_KEY;
  if (!perplexityKey && !geminiKey) return null;

  const query = QUERY(domain);
  let content = null;
  let source  = null;

  if (perplexityKey) {
    content = await fetchPerplexity(query, perplexityKey).catch(() => null);
    if (content && content.length >= MIN_CHARS) {
      source = 'perplexity/sonar';
    } else {
      content = null;
    }
  }

  if (!content && geminiKey) {
    content = await fetchGemini(query, geminiKey).catch(() => null);
    if (content && content.length >= MIN_CHARS) {
      source = 'gemini/2.0-flash';
    } else {
      content = null;
    }
  }

  if (!content) return null;

  return { label: `company research (${source})`, content: content.slice(0, 2000) };
}
