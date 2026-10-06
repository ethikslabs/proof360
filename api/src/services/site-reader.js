// Site reader — replaces the self-hosted Firecrawl for the five-page site read.
//
// What the read needs is narrow: the company's own words on five fixed pages, as
// text a model can extract from. That is a fetch and an HTML-to-text pass, not a
// crawler. Firecrawl ran a playwright browser per page on the shared box, held
// ~1 GB resident, and its API container died 2026-09-14 (RabbitMQ channel close,
// restart=no) — every read since got zero pages. This module keeps the same
// scrapeUrl() shape scrapePages() already consumes, so the budget/concurrency
// contract in scrape-concurrency.test.js holds unchanged.
//
// Two layers:
//   1. Plain fetch. Every redirect hop is re-checked against the SSRF guard (the
//      founder supplies the URL on an unauthenticated route), the body is capped,
//      and only HTML/plain text is read.
//   2. Cloudflare Browser Rendering, only when layer 1 returns a page with no
//      readable text (a JS-only site) AND CF_BROWSER_ACCOUNT_ID/CF_BROWSER_API_TOKEN
//      are set. Nothing resident on the box; off when unconfigured.
//
// Each page that lands carries a sha256 of the bytes read, so a later read can
// say "unchanged" without trusting a summary.
//
// Known gap: the guard resolves the host, then fetch() resolves it again. A DNS
// rebind between the two is not closed here (it would need a pinned-lookup agent).

import { createHash } from 'node:crypto';
import { assertPublicUrl } from './ssrf-guard.js';

export const MAX_BYTES = 1024 * 1024;     // 1 MiB per page, matching CORPUS v2's fetch cap
export const MAX_REDIRECTS = 4;
export const MIN_TEXT_CHARS = 200;        // below this a page is treated as JS-rendered
const USER_AGENT = 'Mozilla/5.0 (compatible; proof360-reader/1.0; +https://proof360.au)';
const READABLE_TYPES = /^(text\/html|application\/xhtml\+xml|text\/plain)\b/i;

// --- HTML → text -----------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', copy: '©', reg: '®', trade: '™' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/[ \t\f\v\r]+/g, ' ').trim();
}

/**
 * Markdown-ish text from an HTML page: title and meta description first, then the
 * <main>/<article> body when there is one (else <body>), with chrome (nav, footer,
 * scripts, forms) removed and headings/list items kept as structure.
 */
export function htmlToText(html) {
  const src = String(html || '');
  const title = stripTags((src.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const desc = decodeEntities(
    (src.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || src.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)
      || [])[1] || '',
  ).trim();

  let body = src
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head|form|nav|footer)\b[\s\S]*?<\/\1>/gi, ' ');

  const main = body.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (main && stripTags(main[2]).length >= MIN_TEXT_CHARS) body = main[2];
  else body = (body.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || [null, body])[1];

  body = body
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (m, n, t) => `\n\n${'#'.repeat(Number(n))} ${stripTags(t)}\n\n`)
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|ul|ol|table|tr|blockquote|header|aside)>/gi, '\n\n');

  const text = body
    .split('\n')
    .map((line) => stripTags(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^- *$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const head = [title && `# ${title}`, desc].filter(Boolean).join('\n\n');
  return [head, text].filter(Boolean).join('\n\n');
}

// --- Layer 1: guarded fetch --------------------------------------------------

async function readCapped(res, maxBytes) {
  if (!res.body?.getReader) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { bytes: buf.subarray(0, maxBytes), truncated: buf.length > maxBytes };
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    if (total >= maxBytes) { truncated = true; await reader.cancel().catch(() => {}); break; }
  }
  return { bytes: Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, maxBytes), truncated };
}

async function fetchGuarded(url, { fetchImpl, guard, timeoutMs, maxBytes }) {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await guard(current);
    const res = await fetchImpl(current, {
      redirect: 'manual',
      signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9' },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current).toString();
      continue;
    }
    const type = res.headers.get('content-type') || '';
    if (res.status >= 400) return { status: res.status, finalUrl: current };
    if (!READABLE_TYPES.test(type)) return { status: res.status, finalUrl: current, reason: `not a page (${type.split(';')[0] || 'no type'})` };
    const { bytes, truncated } = await readCapped(res, maxBytes);
    return { status: res.status, finalUrl: current, bytes, truncated, type };
  }
  return { status: 0, finalUrl: current, reason: 'too many redirects' };
}

// --- Layer 2: Cloudflare Browser Rendering (optional) ------------------------

async function renderWithCloudflare(url, { fetchImpl, accountId, token, timeoutMs }) {
  const res = await fetchImpl(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/markdown`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success || typeof json.result !== 'string') return null;
  return json.result;
}

// --- The reader ----------------------------------------------------------------

/**
 * A scraper with the scrapeUrl() shape scrapePages() consumes:
 *   { success, statusCode, markdown, via, sha256, finalUrl, reason }
 * Never throws for a page that simply cannot be read; it throws only when the
 * whole call is aborted (timeout), which scrapePages reports as 'timeout'.
 */
export function createSiteReader({
  fetchImpl = globalThis.fetch,
  guard = assertPublicUrl,
  env = process.env,
  maxBytes = MAX_BYTES,
} = {}) {
  const cf = env.CF_BROWSER_ACCOUNT_ID && env.CF_BROWSER_API_TOKEN
    ? { accountId: env.CF_BROWSER_ACCOUNT_ID, token: env.CF_BROWSER_API_TOKEN }
    : null;

  return {
    async scrapeUrl(url, { timeout = 15000 } = {}) {
      const got = await fetchGuarded(url, { fetchImpl, guard, timeoutMs: timeout, maxBytes });
      if (!got.bytes) {
        return { success: false, statusCode: got.status, finalUrl: got.finalUrl, reason: got.reason, via: 'fetch' };
      }

      const raw = got.bytes.toString('utf8');
      const markdown = /html/i.test(got.type) ? htmlToText(raw) : raw.trim();
      const sha256 = createHash('sha256').update(got.bytes).digest('hex');

      if (markdown.length >= MIN_TEXT_CHARS) {
        return { success: true, statusCode: got.status, markdown, via: 'fetch', sha256, finalUrl: got.finalUrl, truncated: got.truncated };
      }

      if (cf) {
        const rendered = await renderWithCloudflare(got.finalUrl, { fetchImpl, ...cf, timeoutMs: timeout }).catch(() => null);
        if (rendered && rendered.trim().length >= MIN_TEXT_CHARS) {
          return {
            success: true, statusCode: got.status, markdown: rendered.trim(), via: 'cf-browser',
            sha256: createHash('sha256').update(rendered).digest('hex'), finalUrl: got.finalUrl,
          };
        }
      }

      return {
        success: false, statusCode: got.status, finalUrl: got.finalUrl, via: 'fetch',
        reason: 'no readable text (page needs a browser)',
      };
    },
  };
}
