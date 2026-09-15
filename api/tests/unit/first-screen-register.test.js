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
import { fileURLToPath } from 'node:url';

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

// Every string a handler or service can put on the founder's screen, read from the source.
// Each emitter call — log({…}), appendLog(id, {…}), emit(label, {…}), anchors.push({…}),
// anchor = {…} — is captured with its balanced braces (multi-line included), then every
// title/note/text/label literal inside it is checked. Static parts only (template holes
// are stripped), plus a rule that no hole is a raw error field.
const HERE = fileURLToPath(new URL('.', import.meta.url));
const SRC = join(HERE, '../../src');
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}
export function screenCalls(src) {
  // Returns each emitter call's full argument text (parens balanced, multi-line) with its
  // 1-based line. Only calls whose argument carries a screen-line key (type/act/label) count;
  // a plain string log(...) to the server console is not a screen line.
  const calls = [];
  const opener = /\b(appendLog|log|emit|anchors\.push)\s*\(|\banchor\s*=\s*\{/g;
  let m;
  while ((m = opener.exec(src))) {
    const isBrace = m[0].endsWith('{');
    // Start ON the opener character, so its own closer brings depth back to 0 (round 3 fix:
    // starting one past it never closed, and captures ran to end of file).
    const i = m.index + m[0].length - 1;
    // Punctuation inside a string, template literal or comment never counts (round 4 hole: an
    // unmatched paren in a text value dropped the whole call from the sweep).
    let depth = 0, j = i, quote = null;
    for (; j < src.length; j++) {
      const c = src[j];
      if (quote) {
        if (c === '\\') { j++; continue; }
        if (quote === '//' ? c === '\n' : quote === '/*' ? src.startsWith('*/', j) && (j++, true) : c === quote) quote = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (src.startsWith('//', j)) { quote = '//'; j++; continue; }
      if (src.startsWith('/*', j)) { quote = '/*'; j++; continue; }
      if (isBrace ? c === '{' : c === '(') depth++;
      else if (isBrace ? c === '}' : c === ')') { depth--; if (depth === 0) { j++; break; } }
    }
    if (depth !== 0) continue;   // unbalanced: not a call we can read
    const text = src.slice(i + 1, j - 1);
    if (!/\b(type|act|label)\s*:/.test(text)) continue;
    calls.push({ line: src.slice(0, m.index).split('\n').length, text });
  }
  return calls;
}
describe('no emitter under api/src puts machinery or a raw error on the screen', () => {
  // inbound-check is a different surface (its screen is the mail reply, guarded by its own word test).
  const files = [...walk(join(SRC, 'handlers')), ...walk(join(SRC, 'services'))].filter((f) => !f.includes('/inbound-check/'));
  const literal = /\b(title|note|text|label)\s*:\s*(['"`])((?:\\.|(?!\2)[\s\S])*)\2/g;
  it('actually captures appendLog(id, {…}) and multi-line calls (the round-2 hole)', () => {
    const calls = screenCalls("appendLog(id, {\n  type: 'act', title: 'Asking perplexity sonar',\n});\nlog({ text: `x ${err.message}`, type: 'err' });\nemit(label, { text: 'y', type: 'ok' });\nanchors.push(engines.length\n  ? { label: 'a' }\n  : { label: 'b' });\nlog(`plain console ${err.message}`);");
    expect(calls.map((c) => c.line)).toEqual([1, 4, 5, 6]);
    expect(calls[0].text).toContain('perplexity');
    expect(calls[0].text, 'a capture stops at its own closing paren').not.toContain('err.message');
    expect(calls[1].text).not.toContain('emit(');
    expect(calls[3].text).toContain("label: 'b'");
    expect(calls[3].text).not.toContain('plain console');
    // An inner call before the key does not truncate the capture.
    const inner = screenCalls("log({ text: String(x), type: 'err', note: 'hello' });");
    expect(inner.length).toBe(1);
    expect(inner[0].text).toContain("note: 'hello'");
    // Round 4 hole: a paren or brace inside a string literal must not perturb the depth count.
    // Before the fix, an unmatched "(" or ")" in a text value dropped the whole call from the sweep,
    // so a machinery word or raw error beside it was invisible to both checks.
    const quoted = screenCalls("log({ type: 'err', text: 'unexpected (input from perplexity' });\nlog({ text: 'got a weird value)', type: 'err', note: `${err.message}` });\nlog({ text: \"brace { in a string\", type: 'ok' });");
    expect(quoted.map((c) => c.line), 'calls with unbalanced punctuation inside strings are still captured').toEqual([1, 2, 3]);
    expect(quoted[0].text).toContain('perplexity');
    expect(quoted[1].text).toContain('err.message');
    expect(quoted[1].text, 'the second capture stops at its own closer').not.toContain('brace');
    // Every appendLog in the two handlers is captured, none runs past its own call.
    for (const f of ['handlers/analyze.js', 'handlers/admin-preread.js']) {
      const text = readFileSync(join(SRC, f), 'utf8');
      const n = (text.match(/appendLog\(/g) || []).length;
      const got = screenCalls(text);
      expect(got.length, f).toBeGreaterThanOrEqual(n - 2);   // the __done__ lines carry no title/text
      for (const c of got) expect(c.text.split('\n').length, `${f}:${c.line}`).toBeLessThan(40);
    }
    const analyze = readFileSync(join(SRC, 'handlers/analyze.js'), 'utf8');
    expect(screenCalls(analyze).some((c) => /Writing your read/.test(c.text))).toBe(true);
  });
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const offenders = [];
    for (const call of screenCalls(src)) {
      if (/\$\{\s*err\??\.(message|status|name)/.test(call.text)) offenders.push(`${call.line}: raw error in a screen line`);
      let m;
      while ((m = literal.exec(call.text))) {
        const words = m[3].replace(/\$\{[^}]*\}/g, ' ');
        if (MACHINERY.test(words) || VERDICT.test(words)) offenders.push(`${call.line}: ${m[3].slice(0, 80)}`);
      }
    }
    it(`${file.split('/src/')[1]}`, () => { expect(offenders).toEqual([]); });
  }
});

describe('what the screen says about ports and the meter row keeps the status', () => {
  it('open ports are stated as reachable, never as what "should" be', () => {
    const t = formatReconLine('ports', { risky_port_count: 2, open_ports: [{ port: 22, risk: 'high' }, { port: 3389, risk: 'critical' }] }).text;
    expect(t).not.toMatch(/should/i);
    expect(t).toMatch(/reachable from the internet/);
    expect(formatReconLine('ports', { risky_port_count: 0 }).text).not.toMatch(/should/i);
  });
});
