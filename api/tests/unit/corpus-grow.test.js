// Lane 2 of _working/2026-09-14-corpus-grows-by-question-spec.md §5 (approved edge suggestion,
// 30 Sept close): every read writes its research and the pages that research cited through
// CORPUS's one write door, so the next read — anyone's — finds them with source_url and
// fetched_at. CORPUS's half (POST /ingest) shipped 14 Sept; this is proof360's half.
//
// The membrane (R5, 27 Aug): only what we fetched from the internet crosses. The session id,
// the founder's answers and the deck never enter a body — pinned below.
import { describe, it, expect, vi } from 'vitest';
import { holdResearch, holdCitedPages, pageText } from '../../src/services/corpus-grow.js';

const TOKEN = 'x'.repeat(48);
const ENV = { CORPUS_INGEST_TOKEN: TOKEN };
const SID = 'sess-7f3a-SECRET-SESSION';
const ANSWER = 'Acme builds payroll software for Australian SMBs and raised a seed round in 2025. '.repeat(6);
const CITES = [
  { url: 'https://acme.com/about', title: 'About', date: null },
  { url: 'https://news.example.com/acme-seed', title: 'Acme raises', date: '2025-11-02' },
];
const okDoor = () => vi.fn(async () => ({ ok: true, status: 202, json: async () => ({ held: true }) }));
const passHost = async () => ['93.184.216.34'];

describe('holdResearch — an engine answer is held as an observation with its cited urls', () => {
  it('posts one research object through the door, bearer-authorised', async () => {
    const fetchImpl = okDoor();
    const r = await holdResearch({ domain: 'Acme.com', engine: 'perplexity', content: ANSWER, citations: CITES, fetched_at: '2026-09-30T02:00:00Z', session_id: SID }, { fetchImpl, env: ENV });
    expect(r).toEqual({ held: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://localhost:3009/ingest');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      layer: 'research',
      group: 'acme.com',
      source_type: 'derived_projection',
      method: 'read_research',
      captured_by: 'proof360/perplexity',
      source_url: null,
      fetched_at: '2026-09-30T02:00:00Z',
      cites: ['https://acme.com/about', 'https://news.example.com/acme-seed'],
    });
    expect(body.text).toBe(ANSWER);
  });

  it('the session id never enters the body (membrane)', async () => {
    const fetchImpl = okDoor();
    await holdResearch({ domain: 'acme.com', engine: 'gemini', content: ANSWER, citations: [], fetched_at: '2026-09-30T02:00:00Z', session_id: SID }, { fetchImpl, env: ENV });
    expect(fetchImpl.mock.calls[0][1].body).not.toContain(SID);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).captured_by).toBe('proof360/gemini');
  });

  it('no token configured: nothing is sent, the door is reported closed', async () => {
    const fetchImpl = okDoor();
    expect(await holdResearch({ domain: 'acme.com', engine: 'perplexity', content: ANSWER, citations: [] }, { fetchImpl, env: {} })).toEqual({ held: 0, closed: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('a short token is no token (default deny)', async () => {
    const fetchImpl = okDoor();
    expect((await holdResearch({ domain: 'acme.com', engine: 'perplexity', content: ANSWER, citations: [] }, { fetchImpl, env: { CORPUS_INGEST_TOKEN: 'short' } })).closed).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('an engine the door does not know is never sent', async () => {
    const fetchImpl = okDoor();
    expect((await holdResearch({ domain: 'acme.com', engine: 'founder', content: ANSWER, citations: [] }, { fetchImpl, env: ENV })).held).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('a refusing or unreachable door never throws into the read', async () => {
    const refusing = vi.fn(async () => ({ ok: false, status: 503 }));
    expect(await holdResearch({ domain: 'acme.com', engine: 'perplexity', content: ANSWER, citations: [] }, { fetchImpl: refusing, env: ENV })).toEqual({ held: 0, closed: true });
    const throwing = vi.fn(async () => { throw new Error('ECONNREFUSED'); });
    expect(await holdResearch({ domain: 'acme.com', engine: 'perplexity', content: ANSWER, citations: [] }, { fetchImpl: throwing, env: ENV })).toEqual({ held: 0, closed: true });
  });
});

describe('holdCitedPages — hop two: each cited page, fetched once, held as an original source', () => {
  const page = (html) => ({ ok: true, status: 200, headers: new Map([['content-type', 'text/html']]), text: async () => html });
  const BODY = `<html><head><title>Acme raises seed</title><script>evil()</script></head><body><p>${'Acme, a Sydney payroll company, raised a seed round led by Example Ventures. '.repeat(5)}</p></body></html>`;

  it('fetches each page, strips it to text, and holds it with its source_url', async () => {
    const calls = [];
    const fetchImpl = vi.fn(async (url, init) => {
      calls.push([url, init]);
      return url.endsWith('/ingest') ? { ok: true, status: 202 } : page(BODY);
    });
    const r = await holdCitedPages({ domain: 'acme.com', citations: CITES.slice(1), session_id: SID }, { fetchImpl, env: ENV, assertHost: passHost });
    expect(r).toEqual({ held: 1 });
    const post = calls.find(([u]) => u.endsWith('/ingest'));
    const body = JSON.parse(post[1].body);
    expect(body).toMatchObject({ layer: 'research', group: 'acme.com', source_type: 'original_source', method: 'cited_page', captured_by: 'proof360/fetch', source_url: 'https://news.example.com/acme-seed', title: 'Acme raises seed' });
    expect(body.text).not.toContain('evil()');
    expect(body.text).not.toContain('<p>');
    expect(post[1].body).not.toContain(SID);
  });

  it('at most five pages, then stop (two hops, then hold)', async () => {
    const fetchImpl = vi.fn(async (url) => (url.endsWith('/ingest') ? { ok: true, status: 202 } : page(BODY)));
    const many = Array.from({ length: 9 }, (_, i) => ({ url: `https://s${i}.example.com/p` }));
    const r = await holdCitedPages({ domain: 'acme.com', citations: many }, { fetchImpl, env: ENV, assertHost: passHost });
    expect(r.held).toBe(5);
    expect(fetchImpl.mock.calls.filter(([u]) => !u.endsWith('/ingest'))).toHaveLength(5);
  });

  it('a page on a private host is never fetched', async () => {
    const fetchImpl = vi.fn(async () => page(BODY));
    const blocked = async () => { throw new Error('blocked'); };
    expect(await holdCitedPages({ domain: 'acme.com', citations: [{ url: 'https://internal.example/' }] }, { fetchImpl, env: ENV, assertHost: blocked })).toEqual({ held: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('a redirect is re-checked at every hop, and a redirect into a private host stops the fetch', async () => {
    const fetchImpl = vi.fn(async (url) => ({ ok: false, status: 302, headers: new Map([['location', 'http://10.0.0.5/admin']]) }));
    const assertHost = vi.fn(async (h) => { if (h === '10.0.0.5') throw new Error('blocked'); return ['93.184.216.34']; });
    expect((await holdCitedPages({ domain: 'acme.com', citations: [{ url: 'https://acme.com/x' }] }, { fetchImpl, env: ENV, assertHost })).held).toBe(0);
    expect(assertHost).toHaveBeenCalledWith('10.0.0.5');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('a page too thin to hold is skipped', async () => {
    const fetchImpl = vi.fn(async (url) => (url.endsWith('/ingest') ? { ok: true, status: 202 } : page('<html><body>hi</body></html>')));
    expect((await holdCitedPages({ domain: 'acme.com', citations: [{ url: 'https://acme.com/' }] }, { fetchImpl, env: ENV, assertHost: passHost })).held).toBe(0);
    expect(fetchImpl.mock.calls.some(([u]) => u.endsWith('/ingest'))).toBe(false);
  });

  it('no token: no page is fetched at all', async () => {
    const fetchImpl = vi.fn();
    expect(await holdCitedPages({ domain: 'acme.com', citations: CITES }, { fetchImpl, env: {}, assertHost: passHost })).toEqual({ held: 0, closed: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('pageText', () => {
  it('drops script and style, keeps the title and the words', () => {
    const r = pageText('<html><head><title> A &amp; B </title><style>x{}</style></head><body><h1>Hello</h1><p>World &quot;ok&quot;</p></body></html>');
    expect(r.title).toBe('A & B');
    expect(r.text).toContain('Hello');
    expect(r.text).toContain('World "ok"');
    expect(r.text).not.toContain('x{}');
  });
});
