// Approved edge suggestion, 2026-09-30 close (John: "approve suggestions"): keep Perplexity's
// citations. Every sonar answer arrives with `citations` (URLs) and `search_results` (url, title,
// date), and fetchPerplexity read only `choices[0].message.content` — the sources were thrown away
// before anything could show or store them (sweep 30 Sept, recon-company.js:49-52). The check@
// path already keeps them (inbound-check/lookups.js). A cited page is what lets a recommendation
// be traced; this pins that the read keeps it.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { perplexityCitations, fetchPerplexityResearch } from '../../src/services/recon-company.js';

const LONG = 'Acme builds payroll software for Australian SMBs. '.repeat(12); // > MIN_CHARS

function sonar(extra = {}) {
  return {
    choices: [{ message: { content: LONG } }],
    usage: { prompt_tokens: 40, completion_tokens: 300 },
    ...extra,
  };
}

describe('perplexityCitations — what the engine said it read', () => {
  it('prefers search_results, keeping title and date with the url', () => {
    const out = perplexityCitations({
      search_results: [{ url: 'https://acme.com/about', title: 'About Acme', date: '2026-05-01' }],
    });
    expect(out).toEqual([{ url: 'https://acme.com/about', title: 'About Acme', date: '2026-05-01' }]);
  });

  it('merges bare citation urls, deduped against search_results', () => {
    const out = perplexityCitations({
      search_results: [{ url: 'https://acme.com/about', title: 'About Acme' }],
      citations: ['https://acme.com/about', 'https://news.example.com/acme-raises'],
    });
    expect(out.map((c) => c.url)).toEqual(['https://acme.com/about', 'https://news.example.com/acme-raises']);
    expect(out[1]).toEqual({ url: 'https://news.example.com/acme-raises', title: null, date: null });
  });

  it('keeps only http(s) urls and never invents one', () => {
    const out = perplexityCitations({ citations: ['javascript:alert(1)', 'not a url', '', null, 'http://ok.example.com/'] });
    expect(out.map((c) => c.url)).toEqual(['http://ok.example.com/']);
  });

  it('an answer with no sources is an empty list, not an error', () => {
    expect(perplexityCitations({})).toEqual([]);
    expect(perplexityCitations(null)).toEqual([]);
  });

  it('caps the list at ten', () => {
    const citations = Array.from({ length: 15 }, (_, i) => `https://s${i}.example.com/`);
    expect(perplexityCitations({ citations })).toHaveLength(10);
  });
});

describe('fetchPerplexityResearch — the citations travel with the answer', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('returns the cited pages and the time they were fetched alongside the content', async () => {
    vi.stubEnv('PERPLEXITY_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => sonar({ citations: ['https://acme.com/', 'https://news.example.com/acme'] }),
    })));
    const r = await fetchPerplexityResearch('acme.com');
    expect(r.content).toBeTruthy();
    expect(r.citations.map((c) => c.url)).toEqual(['https://acme.com/', 'https://news.example.com/acme']);
    expect(Number.isNaN(Date.parse(r.fetched_at))).toBe(false);
  });

  it('an answer that cites nothing still answers, with an empty citation list', async () => {
    vi.stubEnv('PERPLEXITY_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => sonar() })));
    const r = await fetchPerplexityResearch('acme.com');
    expect(r.content).toBeTruthy();
    expect(r.citations).toEqual([]);
  });
});
