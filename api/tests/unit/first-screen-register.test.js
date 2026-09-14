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
// The two research engines, answering with the skip reasons that used to pass straight
// through to the screen ("quota exhausted", "engine error (503)").
vi.mock('../../src/services/recon-company.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    fetchPerplexityResearch: vi.fn(async () => ({ content: null, skip: 'engine error (503)' })),
    fetchGeminiResearch: vi.fn(async () => ({ content: null, skip: 'quota exhausted' })),
  };
});

import { chatComplete } from '../../src/lib/inference.js';
import { extractSignals, plainScrapeReason } from '../../src/services/signal-extractor.js';
import { formatReconLine } from '../../src/services/recon-pipeline.js';
import { buildInferences } from '../../src/services/inference-builder.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Our machinery, by name. None of these may reach a founder's screen as text.
export const MACHINERY = /\b(perplexity|sonar|gemini|flash|haiku|claude|bedrock|anthropic|firecrawl|hibp|abuseipdb|ssllabs|veritas|corpus|dns|dmarc|spf|csp|hsts|tls|ssl|recon|engine|quota|scan|probe|json|sse)\b/i;
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


// ── Review round 1 (14 Sept, fresh Opus reviewer): the same screen has more emitters ──

describe('a skipped engine is explained without naming engines or quotas', () => {
  it('skip notes are plain', async () => {
    const log = [];
    await extractSignals({ website_url: 'https://acme.example', session_id: null }, (l) => log.push(l));
    const skips = log.filter((l) => l.type === 'act' && l.phase === 'skip');
    expect(skips.length).toBeGreaterThanOrEqual(2);
    for (const s of skips) {
      expect(s.note, `${s.act}: ${s.note}`).not.toMatch(MACHINERY);
      expect(s.note).not.toMatch(/\(\d{3}\)/);
    }
  });
});

describe('the outside look reaches the perimeter act as plain lines', () => {
  it('a blocked (non-public) address is narrated as an object line with plain words', async () => {
    const real = await vi.importActual('../../src/services/recon-pipeline.js');
    const seen = [];
    await real.runReconPipeline('http://127.0.0.1', 'local', { onSourceComplete: (src, line) => seen.push([src, line]) });
    expect(seen.length).toBe(1);
    const [, line] = seen[0];
    expect(typeof line).toBe('object');
    expect(typeof line.text).toBe('string');
    expect(line.text).not.toMatch(MACHINERY);
    expect(line.text).toMatch(/not a public address|skipped/i);
  });
  it('the connection line never restates a vendor letter grade', () => {
    for (const r of [{ ssl_grade: 'B', protocols: ['TLS1.2'] }, { ssl_grade: 'A+', protocols: ['TLS1.3'] }, { ssl_grade: 'C', has_old_tls: true }]) {
      expect(formatReconLine('ssllabs', r).text).not.toMatch(/grade|graded|\b[A-F][+-]?\b/);
    }
  });
});

// Every string a handler or service can put on the founder's screen, read from the source:
// act titles and notes, body text, err lines, cmd lines, and the reading's anchor labels.
// Static parts only (template holes are stripped), plus a rule that no hole is a raw error.
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}
describe('no emitter under api/src puts machinery or a raw error on the screen', () => {
  const files = [...walk(join(process.cwd(), 'src/handlers')), ...walk(join(process.cwd(), 'src/services'))];
  const emitLine = /(appendLog|\blog|anchors\.push|anchor =)\s*\(?\s*\{[^\n]*\b(title|note|text|label)\s*:/;
  const literal = /\b(title|note|text|label)\s*:\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
  it('scans at least the files this build touched', () => {
    expect(files.some((f) => f.endsWith('signal-extractor.js'))).toBe(true);
    expect(files.some((f) => f.endsWith('cold-reading.js'))).toBe(true);
  });
  for (const file of files) {
    const src = readFileSync(file, 'utf8').split('\n');
    const offenders = [];
    src.forEach((line, i) => {
      if (line.trim().startsWith('//') || !emitLine.test(line)) return;
      if (/\$\{\s*err\??\.(message|status|name)/.test(line)) offenders.push(`${i + 1}: raw error in a screen line`);
      let m;
      while ((m = literal.exec(line))) {
        const words = m[3].replace(/\$\{[^}]*\}/g, ' ');
        if (MACHINERY.test(words) || VERDICT.test(words)) offenders.push(`${i + 1}: ${m[3]}`);
      }
    });
    it(`${file.split('/src/')[1]}`, () => { expect(offenders).toEqual([]); });
  }
});
