// The site reader replaced the self-hosted Firecrawl for the five-page site read
// (its API container died 2026-09-14 and every read since got zero pages). These
// tests pin what the replacement must do that a bare fetch() would not: re-check
// every redirect hop against the SSRF guard, cap the body, read only pages, and
// say plainly when a page needs a browser rather than returning an empty read.
import { describe, it, expect, vi } from 'vitest';
import { createSiteReader, htmlToText, MIN_TEXT_CHARS } from '../../src/services/site-reader.js';
import { SsrfBlockedError } from '../../src/services/ssrf-guard.js';

const LONG = 'We build compliance software for Australian fintechs. '.repeat(10);

function html(body, { title = 'Acme', desc = 'Acme does trust.' } = {}) {
  return `<!doctype html><html><head><title>${title}</title><meta name="description" content="${desc}"><style>.x{}</style></head><body>${body}</body></html>`;
}

function res(status, body = '', headers = {}) {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...headers } });
}

const passGuard = vi.fn(async () => ['203.0.113.10']);

describe('htmlToText', () => {
  it('keeps title, description, headings and list items; drops scripts, nav and footer', () => {
    const out = htmlToText(html(`
      <nav><a href="/">Home</a><a href="/x">Pricing</a></nav>
      <script>window.track = 1</script>
      <h1>Trust, &amp; proof</h1>
      <p>${LONG}</p>
      <ul><li>SOC 2 Type II</li><li>ISO 27001</li></ul>
      <footer>© Acme 2026</footer>`));
    expect(out).toMatch(/^# Acme/);
    expect(out).toContain('Acme does trust.');
    expect(out).toContain('# Trust, & proof');
    expect(out).toContain('- SOC 2 Type II');
    expect(out).not.toContain('window.track');
    expect(out).not.toContain('Pricing');
    expect(out).not.toContain('© Acme 2026');
  });

  it('prefers <main> when it carries the content', () => {
    const out = htmlToText(html(`<div>Cookie banner text</div><main><p>${LONG}</p></main>`));
    expect(out).toContain('compliance software');
    expect(out).not.toContain('Cookie banner');
  });

  it('decodes numeric and named entities', () => {
    expect(htmlToText('<body><p>Caf&eacute; &#8212; R&amp;D &#x2713;</p></body>')).toContain('— R&D ✓');
  });
});

describe('createSiteReader().scrapeUrl', () => {
  it('reads a public page and returns text with a sha256 of the bytes', async () => {
    const fetchImpl = vi.fn(async () => res(200, html(`<p>${LONG}</p>`)));
    const r = await createSiteReader({ fetchImpl, guard: passGuard, env: {} }).scrapeUrl('https://acme.example/');
    expect(r.success).toBe(true);
    expect(r.via).toBe('fetch');
    expect(r.markdown).toContain('compliance software');
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('re-checks every redirect hop and refuses one that lands on a private address', async () => {
    const guard = vi.fn(async (url) => {
      if (url.includes('169.254.169.254')) throw new SsrfBlockedError('blocked literal IP');
      return ['203.0.113.10'];
    });
    const fetchImpl = vi.fn(async () => res(302, '', { location: 'http://169.254.169.254/latest/meta-data/' }));
    await expect(
      createSiteReader({ fetchImpl, guard, env: {} }).scrapeUrl('https://acme.example/careers'),
    ).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(guard).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1); // the private hop was never fetched
    expect(fetchImpl.mock.calls[0][1].redirect).toBe('manual');
  });

  it('follows a public redirect to the page', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(res(301, '', { location: '/en/' }))
      .mockResolvedValueOnce(res(200, html(`<p>${LONG}</p>`)));
    const r = await createSiteReader({ fetchImpl, guard: passGuard, env: {} }).scrapeUrl('https://acme.example/');
    expect(r.success).toBe(true);
    expect(r.finalUrl).toBe('https://acme.example/en/');
  });

  it('gives up after too many redirects', async () => {
    const fetchImpl = vi.fn(async () => res(302, '', { location: '/loop' }));
    const r = await createSiteReader({ fetchImpl, guard: passGuard, env: {} }).scrapeUrl('https://acme.example/');
    expect(r.success).toBe(false);
    expect(r.reason).toBe('too many redirects');
  });

  it('reports a 404 as its status, not as content', async () => {
    const fetchImpl = vi.fn(async () => res(404, 'Not found'));
    const r = await createSiteReader({ fetchImpl, guard: passGuard, env: {} }).scrapeUrl('https://acme.example/trust');
    expect(r).toMatchObject({ success: false, statusCode: 404 });
  });

  it('does not read a non-page (an SVG served at /security)', async () => {
    const fetchImpl = vi.fn(async () => res(200, '<svg/>', { 'content-type': 'image/svg+xml' }));
    const r = await createSiteReader({ fetchImpl, guard: passGuard, env: {} }).scrapeUrl('https://acme.example/security');
    expect(r.success).toBe(false);
    expect(r.reason).toMatch(/not a page/);
  });

  it('caps the body it reads', async () => {
    const big = html(`<p>${'x'.repeat(5000)} ${LONG}</p>`);
    const fetchImpl = vi.fn(async () => res(200, big));
    const r = await createSiteReader({ fetchImpl, guard: passGuard, env: {}, maxBytes: 1024 }).scrapeUrl('https://acme.example/');
    expect(r.truncated).toBe(true);
  });

  it('says a JS-only page needs a browser when Cloudflare rendering is not configured', async () => {
    const fetchImpl = vi.fn(async () => res(200, html('<div id="root"></div>')));
    const r = await createSiteReader({ fetchImpl, guard: passGuard, env: {} }).scrapeUrl('https://acme.example/');
    expect(r.success).toBe(false);
    expect(r.reason).toMatch(/needs a browser/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falls back to Cloudflare Browser Rendering for a JS-only page when configured', async () => {
    const rendered = `# Acme\n\n${LONG}`;
    const fetchImpl = vi.fn(async (url) => (String(url).startsWith('https://api.cloudflare.com/')
      ? new Response(JSON.stringify({ success: true, result: rendered }), { status: 200 })
      : res(200, html('<div id="root"></div>'))));
    const env = { CF_BROWSER_ACCOUNT_ID: 'acct', CF_BROWSER_API_TOKEN: 'tok' };
    const r = await createSiteReader({ fetchImpl, guard: passGuard, env }).scrapeUrl('https://acme.example/');
    expect(r.success).toBe(true);
    expect(r.via).toBe('cf-browser');
    expect(r.markdown.length).toBeGreaterThanOrEqual(MIN_TEXT_CHARS);
    const [cfUrl, cfInit] = fetchImpl.mock.calls[1];
    expect(cfUrl).toBe('https://api.cloudflare.com/client/v4/accounts/acct/browser-rendering/markdown');
    expect(JSON.parse(cfInit.body)).toEqual({ url: 'https://acme.example/' });
  });
});
