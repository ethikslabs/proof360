// The first screen (HX loop, findings 15–16, 14 Sept 2026): the working trace is the
// founder's receipt, so it speaks in plain words. Law 11 — show the working, never name
// the machinery. R8 — no verdict words. R10 — a probe fact (where the site is hosted)
// is collected, never led with.
//
// These tests pin the WORDS the trace can print. Engines still ride on the wire as a
// structured `engine` field (the opt-in vendor-mark layer reads it); they never appear
// in a title, a note, or a body line.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@mendable/firecrawl-js', () => ({
  default: vi.fn().mockImplementation(() => ({
    scrapeUrl: vi.fn(async (url) => {
      if (url.endsWith('/security')) {
        throw new Error('Failed to scrape URL. Status code: 500. Error: The URL returned a file type that Firecrawl cannot process: image/svg+xml. Firecrawl supports HTML web pages, PDFs, and common document formats.');
      }
      return { success: true, statusCode: 200, markdown: `# content for ${url}\n\nWe are a B2B SaaS company.` };
    }),
  })),
}));
vi.mock('../../src/services/recon-pipeline.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, runReconPipeline: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(null), 5))) };
});
vi.mock('../../src/lib/inference.js', () => ({ chatComplete: vi.fn() }));
vi.mock('../../src/db/pool.js', () => ({ query: vi.fn() }));

import { chatComplete } from '../../src/lib/inference.js';
import { extractSignals, plainScrapeReason } from '../../src/services/signal-extractor.js';
import { formatReconLine } from '../../src/services/recon-pipeline.js';
import { buildInferences } from '../../src/services/inference-builder.js';

// Our machinery, by name. None of these may reach a founder's screen as text.
export const MACHINERY = /\b(perplexity|sonar|gemini|flash|haiku|claude|bedrock|anthropic|firecrawl|hibp|abuseipdb|ssllabs|veritas|corpus|dns|csp|hsts|json|sse|api)\b/i;
// A verdict or a grade dressed as a finding.
export const VERDICT = /\b(risk|risky|review needed|score \d+%|spoofing)\b/i;
// A tool's own error text, quoted.
export const VENDOR_ERROR = /status code|cannot process|file type|Failed to scrape|Bedrock|invalid JSON|returned no signals/i;

const EXTRACTION = {
  company_summary: 'A B2B SaaS company.',
  product_type: 'B2B SaaS', customer_type: 'Enterprise', data_sensitivity: 'Medium',
  stage: 'Seed', sector: 'Software', confidence: 'probable',
};

beforeEach(() => {
  delete process.env.PERPLEXITY_API_KEY;
  delete process.env.GEMINI_API_KEY;
  process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';
  chatComplete.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(EXTRACTION) } }] });
});

describe('the trace speaks plainly (Law 11, R8)', () => {
  it('no act title, note or body line names an engine, a vendor, a verdict or a tool error', async () => {
    const log = [];
    await extractSignals({ website_url: 'https://acme.example', session_id: null }, (l) => log.push(l));
    expect(log.length).toBeGreaterThan(5);
    for (const line of log) {
      for (const field of ['title', 'note', 'text']) {
        const v = line[field];
        if (typeof v !== 'string') continue;
        expect(v, `${line.type}/${line.act ?? ''} ${field}: ${v}`).not.toMatch(MACHINERY);
        expect(v, `${line.type}/${line.act ?? ''} ${field}: ${v}`).not.toMatch(VERDICT);
        expect(v, `${line.type}/${line.act ?? ''} ${field}: ${v}`).not.toMatch(VENDOR_ERROR);
      }
    }
  });

  it('the header line is a sentence about the company, not a shell command', async () => {
    const log = [];
    await extractSignals({ website_url: 'https://acme.example', session_id: null }, (l) => log.push(l));
    expect(log[0].type).toBe('cmd');
    expect(log[0].text).not.toMatch(/\$|--url|proof360/);
    expect(log[0].text).toContain('acme.example');
  });

  it('the research prompt is never printed; the question is said in one plain line', async () => {
    const log = [];
    await extractSignals({ website_url: 'https://acme.example', session_id: null }, (l) => log.push(l));
    const body = log.filter((l) => l.type === 'act_body' && (l.act === 'perplexity' || l.act === 'gemini')).map((l) => l.text);
    expect(body.join(' ')).not.toMatch(/we asked:|200 words|Be specific|Research the company/);
    expect(body.length).toBeGreaterThan(0);
  });

  it('engines ride as a structured field on the act start, never as note text', async () => {
    const log = [];
    await extractSignals({ website_url: 'https://acme.example', session_id: null }, (l) => log.push(l));
    const starts = Object.fromEntries(log.filter((l) => l.type === 'act' && l.phase === 'start').map((l) => [l.act, l]));
    expect(starts.perplexity.engine).toMatch(/perplexity/i);
    expect(starts.gemini.engine).toMatch(/gemini/i);
    expect(starts.correlate.engine).toMatch(/haiku|bedrock/i);
    for (const s of Object.values(starts)) expect(s.note ?? '').not.toMatch(MACHINERY);
  });

  it('a page that could not be read says why in plain words, never the tool\'s sentence', async () => {
    const log = [];
    await extractSignals({ website_url: 'https://acme.example', session_id: null }, (l) => log.push(l));
    const security = log.find((l) => l.type === 'act_body' && l.act === 'site' && /security page/.test(l.text) && !/^↳/.test(l.text.trim()));
    expect(security, 'the failed page still narrates').toBeTruthy();
    expect(security.text).toMatch(/image, not a page/);
    expect(security.text).not.toMatch(VENDOR_ERROR);
  });
});

describe('plainScrapeReason', () => {
  it('maps a tool error to one of a few plain reasons', () => {
    expect(plainScrapeReason(new Error('Failed to scrape URL. Status code: 500. Error: The URL returned a file type that Firecrawl cannot process: image/svg+xml.'))).toBe('it returned an image, not a page');
    expect(plainScrapeReason(new Error('Request timeout after 15000ms'))).toBe('took too long to answer');
    expect(plainScrapeReason(new Error('Failed to scrape URL. Status code: 404.'))).toBe('no such page');
    expect(plainScrapeReason(new Error('ECONNRESET'))).toBe("couldn't be read");
    expect(plainScrapeReason(new Error('Failed to scrape URL. Status code: 500. Error: The URL returned a file type that Firecrawl cannot process: application/pdf.'))).toBe('it returned a file, not a page');
  });
});

describe('the outside look, line by line (recon)', () => {
  const cases = [
    ['dns', { dmarc_policy: 'none', spf_policy: 'softfail' }],
    ['dns', { dmarc_policy: 'reject', spf_policy: '-all' }],
    ['dns', { dmarc_policy: 'unknown', dns_resolved: false }],
    ['http', { security_headers_score: 0, has_csp: false }],
    ['http', { security_headers_score: 6, has_csp: true }],
    ['certs', { subdomain_count: 14, exposed_sensitive_subdomains: ['staging.acme.example'] }],
    ['certs', { subdomain_count: 3, exposed_sensitive_subdomains: [] }],
    ['ip', { cloud_provider: 'Oracle', hosting_country: 'GB' }],
    ['github', { found: false }],
    ['github', { found: true, has_security_policy: false }],
    ['jobs', { found: true, security_hire_signal: true }],
    ['hibp', { breach_count: 2, domain_in_breach: true }],
    ['hibp', { breach_count: 0 }],
    ['ports', { risky_port_count: 2, open_ports: [{ port: 22, risk: 'high' }, { port: 3389, risk: 'critical' }] }],
    ['ssllabs', { ssl_grade: 'B', protocols: ['TLS1.2'], has_old_tls: true }],
    ['ssllabs', { ssl_grade: 'A+', protocols: ['TLS1.3'] }],
    ['abuseipdb', { abuse_confidence_score: 60, total_reports: 4 }],
    ['abuseipdb', { abuse_confidence_score: 0, total_reports: 0 }],
    ['dns', { error: 'ETIMEDOUT' }],
    ['hibp', { skipped: true }],
  ];
  for (const [source, result] of cases) {
    it(`${source}: ${JSON.stringify(result).slice(0, 60)}`, () => {
      const line = formatReconLine(source, result);
      expect(line.text).not.toMatch(/^\[/);           // no [source] tag
      expect(line.text).not.toMatch(MACHINERY);
      expect(line.text).not.toMatch(VERDICT);
      expect(line.text.length).toBeGreaterThan(8);
      expect(line.source).toBe(source);               // the machine still knows
    });
  }
  it('says what the mail setting means, in words a founder can act on', () => {
    expect(formatReconLine('dns', { dmarc_policy: 'none' }).text).toMatch(/send as you/i);
    expect(formatReconLine('dns', { dmarc_policy: 'reject', spf_policy: '-all' }).text).toMatch(/nobody else can send as you/i);
  });
});

describe('a probe fact is collected, not led with (R10)', () => {
  it('the hosting inference carries probe: true so the first read can leave it for later', () => {
    const r = buildInferences([], ['homepage'], 'https://acme.example', { cloud_provider: 'Oracle' });
    const hosting = r.inferences.find((i) => i.inference_id === 'inf_infrastructure');
    expect(hosting).toBeTruthy();
    expect(hosting.probe).toBe(true);
  });
  it('a text-derived inference is not a probe fact', () => {
    const r = buildInferences([{ type: 'product_type', value: 'B2B SaaS', confidence: 'probable' }], ['homepage'], 'https://acme.example', {});
    for (const i of r.inferences) expect(i.probe).not.toBe(true);
  });
});
