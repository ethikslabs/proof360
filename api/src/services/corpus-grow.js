// corpus-grow.js — lane 2 of the corpus-grows-by-question design
// (_working/2026-09-14-corpus-grows-by-question-spec.md §5; approved edge suggestion, 30 Sept).
//
// Every look proof360 makes at the internet on a founder's behalf is held in CORPUS with its
// sources, so the corpus grows by the questions asked of it. CORPUS's write door (POST /ingest,
// loopback + bearer, default deny) shipped 14 Sept; until now nothing called it, and every read's
// research evaporated with the session file.
//
//   holdResearch   — one engine answer → a research object: source_type derived_projection,
//                    method read_research, the cited urls as `cites`. An observation with its
//                    method named, never evidence (R7).
//   holdCitedPages — hop two (R1): each cited page fetched once, stripped to text, held as an
//                    original_source with its source_url. At most five, sequential, then stop.
//
// MEMBRANE (R5, 27 Aug): only what we fetched from the internet crosses. A body is built from
// the domain, engine output and fetched page text only. `session_id` is accepted for the
// consumption line and never enters a body (pinned by test).
//
// Best effort and silent toward the founder (§7): a closed door, a slow library or a failed
// fetch never changes the reading. Nothing here throws.
import { assertPublicHost } from './ssrf-guard.js';
import { record } from './consumption-emitter.js';

const DEFAULT_INGEST_URL = 'http://localhost:3009/ingest';
const DOOR_TIMEOUT_MS = 4_000;
const PAGE_TIMEOUT_MS = 8_000;
const PAGE_MAX_BYTES = 1_000_000;
const MAX_PAGES = 5;
const MAX_REDIRECTS = 3;
const MIN_TEXT = 200;
const MAX_TEXT = 200_000;
const ENGINES = new Set(['perplexity', 'gemini']);

// Default deny: a token must be positively present and long enough to be the minted one.
function doorToken(env) {
  const t = env?.CORPUS_INGEST_TOKEN;
  return typeof t === 'string' && t.length >= 16 ? t : null;
}

function groupOf(domain) {
  const g = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return /^[a-z0-9][a-z0-9.-]{2,79}$/.test(g) && !g.includes('..') ? g : null;
}

const webUrls = (citations) =>
  (Array.isArray(citations) ? citations : [])
    .map((c) => (typeof c === 'string' ? c : c?.url))
    .filter((u) => typeof u === 'string' && /^https?:\/\/\S+$/i.test(u));

async function postDoor(body, { fetchImpl, env, token }) {
  try {
    const res = await fetchImpl(env.CORPUS_INGEST_URL || DEFAULT_INGEST_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DOOR_TIMEOUT_MS),
    });
    return !!res?.ok;
  } catch {
    return false;
  }
}

function meterHeld(session_id, n) {
  if (n > 0) record({ session_id, source: 'corpus', units: n, unit_type: 'object', success: true });
}

export async function holdResearch(
  { domain, engine, content, citations = [], fetched_at = null, session_id = null },
  { fetchImpl = fetch, env = process.env } = {},
) {
  const token = doorToken(env);
  if (!token) return { held: 0, closed: true };
  const group = groupOf(domain);
  if (!group || !ENGINES.has(engine) || typeof content !== 'string' || content.length < MIN_TEXT) return { held: 0 };
  const body = {
    layer: 'research',
    group,
    title: `Research on ${group}`,
    text: content.slice(0, MAX_TEXT),
    source_url: null,
    fetched_at: fetched_at || new Date().toISOString(),
    captured_by: `proof360/${engine}`,
    source_type: 'derived_projection',
    method: 'read_research',
    cites: webUrls(citations).slice(0, 10),
  };
  const ok = await postDoor(body, { fetchImpl, env, token });
  meterHeld(session_id, ok ? 1 : 0);
  return ok ? { held: 1 } : { held: 0, closed: true };
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m]);

export function pageText(html) {
  const src = String(html || '');
  const t = src.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = t ? decode(t[1]).replace(/\s+/g, ' ').trim() : null;
  const text = decode(
    src
      .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  return { title: title || null, text };
}

// Fetch one public page. Redirects are followed by hand so every hop's host is re-checked; a
// redirect into a private address stops the fetch rather than following it.
async function fetchPublicPage(url, { fetchImpl, assertHost }) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let parsed;
    try { parsed = new URL(current); } catch { return null; }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    try { await assertHost(parsed.hostname); } catch { return null; }
    let res;
    try {
      res = await fetchImpl(parsed.href, { redirect: 'manual', signal: AbortSignal.timeout(PAGE_TIMEOUT_MS), headers: { 'User-Agent': 'proof360-research/1.0' } });
    } catch { return null; }
    const status = res?.status ?? 0;
    if (status >= 300 && status < 400) {
      const loc = res.headers?.get?.('location');
      if (!loc) return null;
      try { current = new URL(loc, parsed.href).href; } catch { return null; }
      continue;
    }
    if (!res.ok) return null;
    const type = String(res.headers?.get?.('content-type') || '');
    if (type && !/text\/html|text\/plain|application\/xhtml/i.test(type)) return null;
    let html;
    try { html = await res.text(); } catch { return null; }
    if (html.length > PAGE_MAX_BYTES) html = html.slice(0, PAGE_MAX_BYTES);
    return { url: parsed.href, html };
  }
  return null;
}

export async function holdCitedPages(
  { domain, citations = [], session_id = null },
  { fetchImpl = fetch, env = process.env, assertHost = assertPublicHost } = {},
) {
  const token = doorToken(env);
  if (!token) return { held: 0, closed: true };
  const group = groupOf(domain);
  if (!group) return { held: 0 };
  let held = 0;
  for (const url of webUrls(citations).slice(0, MAX_PAGES)) {
    const page = await fetchPublicPage(url, { fetchImpl, assertHost });
    if (!page) continue;
    const { title, text } = pageText(page.html);
    if (text.length < MIN_TEXT) continue;
    const ok = await postDoor({
      layer: 'research',
      group,
      title: (title || new URL(url).hostname + new URL(url).pathname).slice(0, 200).padEnd(3, '.'),
      text: text.slice(0, MAX_TEXT),
      source_url: url,
      fetched_at: new Date().toISOString(),
      captured_by: 'proof360/fetch',
      source_type: 'original_source',
      method: 'cited_page',
      cites: [],
    }, { fetchImpl, env, token });
    if (ok) held++;
  }
  meterHeld(session_id, held);
  return { held };
}
