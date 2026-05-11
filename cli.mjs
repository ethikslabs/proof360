#!/usr/bin/env node
// proof360/cli.mjs
// Protocol-analyser CLI: trace first, dossier second.
// Invocation: node proof360/cli.mjs <url>

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import dns from 'node:dns/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = resolve(__dir, 'runs');

loadEnv(resolve(__dir, 'api/.env'));

import { reconHttp } from './api/src/services/recon-http.js';
import { reconCerts } from './api/src/services/recon-certs.js';
import { reconGithub } from './api/src/services/recon-github.js';
import { reconIp } from './api/src/services/recon-ip.js';
import { reconJobs } from './api/src/services/recon-jobs.js';
import { reconHibp } from './api/src/services/recon-hibp.js';
import { reconPorts } from './api/src/services/recon-ports.js';
import { reconAbuseIpdb } from './api/src/services/recon-abuseipdb.js';
import { extractReconContext } from './api/src/services/recon-pipeline.js';
import { GAP_DEFINITIONS, SEVERITY_WEIGHTS } from './api/src/config/gaps.js';
import { VENDORS } from './api/src/config/vendors.js';
import { AWS_PROGRAMS, evaluateTrigger } from './api/src/config/aws-programs.js';
import { createCorpusStore } from '../CORPUS/src/loader/index.mjs';
import { createCorpusQuery } from '../CORPUS/src/query/index.mjs';
import { fetchFullContent } from '../CORPUS/src/ingest/lib/content-fetch.mjs';
import { createGraphServer } from './src/graph-server.mjs';
import { graphBus, emit, buildNodeStart, buildNodeComplete, buildEdge,
         buildDepthChange, buildInteractive, buildComplete, buildReportSection,
         parentFor } from './src/graph-events.mjs';
import { exec } from 'node:child_process';

const PAGE_TARGETS = [
  { path: '/', label: 'homepage' },
  { path: '/pricing', label: 'pricing' },
  { path: '/about', label: 'about' },
  { path: '/security', label: 'security' },
  { path: '/trust', label: 'trust' },
];

const SOURCE_NAMES = [
  'firecrawl',
  'perplexity',
  'dns',
  'http',
  'crtsh',
  'github',
  'ipapi',
  'jobs',
  'hibp',
  'abuseipdb',
  'ssllabs',
  'ports',
  'vector',
  'corpus',
  'abn',
  'asic',
];

const VECTOR_URL = process.env.VECTOR_URL || 'http://localhost:3003/v1';
const VECTOR_EXTRACT_MODEL =
  process.env.PROOF360_VECTOR_EXTRACT_MODEL ||
  process.env.PROOF360_VECTOR_MODEL ||
  'amazon.nova-lite-v1:0';
const VECTOR_WEB_INTEL_MODEL = process.env.PROOF360_VECTOR_WEB_INTEL_MODEL || 'sonar';

const MODEL_REASONS = {
  [VECTOR_EXTRACT_MODEL]: 'signal extraction - cheap, fast, structured output, Bedrock-sovereign',
  [VECTOR_WEB_INTEL_MODEL]: 'indexed web intelligence - live search grounding with citations via VECTOR',
};

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function loadEnv(pathname) {
  if (!existsSync(pathname)) return;
  for (const line of readFileSync(pathname, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function normalizeUrl(input) {
  const withScheme = input.startsWith('http://') || input.startsWith('https://')
    ? input
    : `https://${input}`;
  const parsed = new URL(withScheme);
  return parsed.origin;
}

function domainFromUrl(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

function elapsed(startedAt) {
  return Date.now() - startedAt;
}

function fmtMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function bold(text) {
  return `${C.bold}${text}${C.reset}`;
}

function dim(text) {
  return `${C.dim}${text}${C.reset}`;
}

function line(text = '') {
  process.stdout.write(`${text}\n`);
}

function hr(char = '-') {
  line(dim(char.repeat(78)));
}

function oneLine(value, max = 110) {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function list(value, max = 8) {
  if (!Array.isArray(value)) return value === undefined || value === null ? 'none' : String(value);
  if (value.length === 0) return 'none';
  const shown = value.slice(0, max).join(', ');
  return value.length > max ? `${shown}, +${value.length - max} more` : shown;
}

class Ledger {
  constructor() {
    this.seq = 0;
    this.entries = [];
    this.sourceStatus = new Map(SOURCE_NAMES.map((source) => [source, 'not_called']));
  }

  next() {
    this.seq += 1;
    return this.seq;
  }

  stamp(seq) {
    return `[${String(seq).padStart(4, '0')}]`;
  }

  record(entry) {
    this.entries.push(entry);
    if (entry.source) {
      if (entry.type === 'RX') this.sourceStatus.set(entry.source, 'ok');
      if (entry.type === 'FAIL') this.sourceStatus.set(entry.source, 'failed');
      if (entry.type === 'SKIP') this.sourceStatus.set(entry.source, 'skipped');
    }
    return entry;
  }

  call(source, method, args = '') {
    const seq = this.next();
    const entry = this.record({
      seq,
      type: 'CALL',
      source,
      method,
      args,
      started_at: Date.now(),
    });
    line(`${dim(this.stamp(seq))} CALL  ${source}.${method.padEnd(18)} ${args}`);
    return entry;
  }

  detail(callEntry, label, value) {
    line(`${dim(this.stamp(callEntry.seq))}       ${String(label).padEnd(8)} ${value}`);
  }

  rx(callEntry, summary, result = {}) {
    const duration_ms = elapsed(callEntry.started_at);
    this.record({
      seq: callEntry.seq,
      type: 'RX',
      source: callEntry.source,
      method: callEntry.method,
      args: callEntry.args,
      summary,
      result,
      duration_ms,
    });
    line(`${C.green}${this.stamp(callEntry.seq)} RX    ${String(summary).padEnd(34)} ${dim(fmtMs(duration_ms))}${C.reset}`);
  }

  fail(callEntry, error, result = {}) {
    const duration_ms = elapsed(callEntry.started_at);
    this.record({
      seq: callEntry.seq,
      type: 'FAIL',
      source: callEntry.source,
      method: callEntry.method,
      args: callEntry.args,
      error,
      result,
      duration_ms,
    });
    line(`${C.red}${this.stamp(callEntry.seq)} FAIL  ${String(error).padEnd(34)} ${dim(fmtMs(duration_ms))}${C.reset}`);
  }

  skip(source, method, reason, result = {}) {
    const seq = this.next();
    this.record({ seq, type: 'SKIP', source, method, reason, result });
    line(`${C.yellow}${this.stamp(seq)} SKIP  ${source}.${method.padEnd(18)} ${reason}${C.reset}`);
    return seq;
  }

  event(type, source, summary, details = {}) {
    const seq = this.next();
    this.record({ seq, type, source, summary, details });
    const colour = type === 'GAP' ? C.red : type === 'ROUTE' ? C.cyan : type === 'CONFIRM' ? C.green : C.dim;
    line(`${colour}${this.stamp(seq)} ${type.padEnd(5)} ${String(source).padEnd(22)} ${summary}${C.reset}`);
    return seq;
  }

  refsFor(source) {
    return this.entries
      .filter((entry) => entry.source === source && ['RX', 'FAIL', 'SKIP'].includes(entry.type))
      .map((entry) => entry.seq);
  }

  bySeq(seq) {
    return this.entries.find((entry) => entry.seq === seq);
  }
}

async function withTrace(ledger, source, method, args, fn, summarise) {
  const call = ledger.call(source, method, args);
  try {
    const result = await fn();
    const summary = summarise ? summarise(result) : 'ok';
    if (result && result.error) ledger.fail(call, result.error, result);
    else ledger.rx(call, summary, result);
    return result;
  } catch (err) {
    ledger.fail(call, err.message || String(err), { error: err.message || String(err) });
    return { source, error: err.message || String(err) };
  }
}

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function traceFirecrawl(ledger, baseUrl) {
  const pages = [];

  await Promise.all(PAGE_TARGETS.map(async ({ path, label }) => {
    const target = `${baseUrl}${path}`;
    const call = ledger.call('firecrawl', 'scrapeUrl', target);
    try {
      const { text } = await fetchFullContent(target);
      if (text && text.length > 100) {
        const page = {
          label,
          url: target,
          chars: text.length,
          content: text.slice(0, 4000),
          excerpt: oneLine(text, 170),
        };
        pages.push(page);
        ledger.rx(call, `${page.chars} chars ${JSON.stringify(page.excerpt)}`, {
          label,
          url: target,
          chars: page.chars,
          excerpt: page.excerpt,
        });
      } else {
        ledger.fail(call, 'no content extracted', { label, url: target });
      }
    } catch (err) {
      ledger.fail(call, err.message || 'fetch failed', { label, url: target });
    }
  }));

  return pages.sort((a, b) => PAGE_TARGETS.findIndex((p) => p.label === a.label) - PAGE_TARGETS.findIndex((p) => p.label === b.label));
}

async function traceDns(ledger, domain) {
  const context = { domain };
  const raw = {};

  const dmarc = await withTrace(
    ledger,
    'dns',
    'resolveTxt',
    `_dmarc.${domain}`,
    () => dns.resolveTxt(`_dmarc.${domain}`).catch(() => []),
    (records) => {
      const flat = records.map((record) => record.join(''));
      const policy = parseDmarcPolicy(flat);
      return `dmarc_policy=${policy} ${flat[0] ? JSON.stringify(flat[0]) : 'no TXT'}`;
    }
  );
  raw.dmarc_txt = dmarc.map((record) => record.join(''));
  context.dmarc_policy = parseDmarcPolicy(raw.dmarc_txt);

  const rootTxt = await withTrace(
    ledger,
    'dns',
    'resolveTxt',
    `${domain} TXT`,
    () => dns.resolveTxt(domain).catch(() => []),
    (records) => {
      const flat = records.map((record) => record.join(''));
      const spf = parseSpfPolicy(flat);
      return `spf_policy=${spf} ${flat.find((r) => r.startsWith('v=spf1')) ? JSON.stringify(flat.find((r) => r.startsWith('v=spf1'))) : 'no SPF'}`;
    }
  );
  raw.root_txt = rootTxt.map((record) => record.join(''));
  context.spf_policy = parseSpfPolicy(raw.root_txt);

  const mx = await withTrace(
    ledger,
    'dns',
    'resolveMx',
    domain,
    () => dns.resolveMx(domain).catch(() => []),
    (records) => `mx=${records.length} provider=${inferMxProvider(records)}`
  );
  context.mx_provider = inferMxProvider(mx);
  raw.mx = mx;

  const caa = await withTrace(
    ledger,
    'dns',
    'resolveCaa',
    domain,
    () => dns.resolveCaa(domain).catch(() => []),
    (records) => `caa=${records.length}`
  );
  context.has_caa = caa.length > 0;
  raw.caa = caa;

  return { source: 'dns', ...context, raw };
}

function parseDmarcPolicy(records) {
  const dmarc = records.find((record) => record.startsWith('v=DMARC1'));
  if (!dmarc) return 'missing';
  const match = dmarc.match(/p=(\w+)/i);
  return match ? match[1].toLowerCase() : 'missing';
}

function parseSpfPolicy(records) {
  const spf = records.find((record) => record.startsWith('v=spf1'));
  if (!spf) return 'missing';
  if (spf.includes('-all')) return 'strict';
  if (spf.includes('~all')) return 'soft';
  if (spf.includes('+all') || spf.includes('?all')) return 'open';
  return 'present';
}

function inferMxProvider(mxRecords) {
  if (!mxRecords || mxRecords.length === 0) return 'none';
  const exchange = String(mxRecords[0].exchange || '').toLowerCase();
  if (exchange.includes('google') || exchange.includes('gmail') || exchange.includes('googlemail')) return 'google';
  if (exchange.includes('outlook') || exchange.includes('microsoft') || exchange.includes('hotmail')) return 'microsoft';
  if (exchange.includes('protonmail') || exchange.includes('proton.me')) return 'proton';
  if (exchange.includes('mimecast')) return 'mimecast';
  if (exchange.includes('barracuda')) return 'barracuda';
  return 'custom';
}

async function traceSslLabsCached(ledger, domain) {
  return withTrace(
    ledger,
    'ssllabs',
    'grade',
    domain,
    async () => {
      const params = new URLSearchParams({ host: domain, fromCache: 'on', all: 'done' });
      const response = await fetch(`https://api.ssllabs.com/api/v3/analyze?${params}`, {
        headers: { 'User-Agent': 'proof360-cli/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return { source: 'ssllabs', error: `SSL Labs HTTP ${response.status}` };
      const data = await response.json();
      if (data.status !== 'READY') {
        return { source: 'ssllabs', skipped: true, reason: `cached scan ${data.status || 'unavailable'}` };
      }
      const grades = (data.endpoints || []).map((endpoint) => endpoint.grade).filter(Boolean);
      const grade = worstGrade(grades);
      return {
        source: 'ssllabs',
        domain,
        status: data.status,
        ssl_grade: grade || null,
        ssl_grade_num: gradeToNum(grade),
        endpoint_count: (data.endpoints || []).length,
      };
    },
    (result) => result.skipped
      ? `skipped ${result.reason}`
      : `grade=${result.ssl_grade ?? 'unknown'} endpoints=${result.endpoint_count ?? 0}`
  );
}

const GRADE_ORDER = ['A+', 'A', 'A-', 'B', 'C', 'D', 'E', 'F', 'T', 'M'];
function worstGrade(grades) {
  if (!grades.length) return null;
  return grades.reduce((worst, grade) => {
    const worstIndex = GRADE_ORDER.indexOf(worst);
    const gradeIndex = GRADE_ORDER.indexOf(grade);
    return gradeIndex > worstIndex ? grade : worst;
  });
}

function gradeToNum(grade) {
  const map = { 'A+': 10, A: 9, 'A-': 8, B: 7, C: 5, D: 3, F: 0, T: 0, M: 0 };
  return map[grade] ?? null;
}

async function traceRecon(ledger, url, domain, pages) {
  const pipeline = {
    dns: await traceDns(ledger, domain),
    domain,
    scanned_at: new Date().toISOString(),
  };

  pipeline.http = await withTrace(
    ledger,
    'http',
    'headers',
    url,
    () => reconHttp(url, 'cli'),
    (result) => {
      const missing = [];
      if (!result.has_hsts) missing.push('hsts');
      if (!result.has_csp) missing.push('csp');
      if (!result.has_x_frame_options) missing.push('x-frame-options');
      return `score=${result.security_headers_score}/6 missing=${missing.join(',') || 'none'}`;
    }
  );

  pipeline.certs = await withTrace(
    ledger,
    'crtsh',
    'query',
    domain,
    () => reconCerts(domain, 'cli'),
    (result) => result.error
      ? result.error
      : `subdomains=${result.subdomain_count ?? 0} staging=${result.has_staging_exposure ? 'yes' : 'no'}`
  );

  pipeline.github = await withTrace(
    ledger,
    'github',
    'orgLookup',
    domain.split('.')[0],
    () => reconGithub(domain, null, 'cli'),
    (result) => result.found
      ? `found=true repos=${result.public_repo_count ?? 0} security_policy=${Boolean(result.has_security_policy)}`
      : 'found=false'
  );

  pipeline.ip = await withTrace(
    ledger,
    'ipapi',
    'lookup',
    domain,
    () => reconIp(domain, 'cli'),
    (result) => result.error
      ? result.error
      : `ip=${result.ip ?? 'unknown'} cloud_provider=${result.cloud_provider ?? 'unknown'} org=${oneLine(result.org ?? 'unknown', 48)}`
  );

  pipeline.jobs = await withTrace(
    ledger,
    'jobs',
    'careersScan',
    domain,
    () => reconJobs(domain, 'cli'),
    (result) => result.found
      ? `found=true path=${result.careers_path} security_roles=${result.security_hire_count}`
      : (result.skipped ? `skipped ${result.reason}` : 'found=false')
  );

  if (process.env.HIBP_API_KEY) {
    pipeline.hibp = await withTrace(
      ledger,
      'hibp',
      'breachDomain',
      domain,
      () => reconHibp(domain, process.env.HIBP_API_KEY, 'cli'),
      (result) => `domain_in_breach=${Boolean(result.domain_in_breach)} breaches=${result.breach_count ?? 0}`
    );
  } else {
    ledger.skip('hibp', 'breachDomain', 'no HIBP_API_KEY');
    pipeline.hibp = { source: 'hibp', skipped: true, reason: 'no HIBP_API_KEY' };
  }

  if (process.env.ABUSEIPDB_API_KEY) {
    pipeline.abuseipdb = await withTrace(
      ledger,
      'abuseipdb',
      'check',
      domain,
      () => reconAbuseIpdb(domain, process.env.ABUSEIPDB_API_KEY, 'cli'),
      (result) => `score=${result.abuse_confidence_score ?? 0} reports=${result.total_reports ?? 0}`
    );
  } else {
    ledger.skip('abuseipdb', 'check', 'no ABUSEIPDB_API_KEY');
    pipeline.abuseipdb = { source: 'abuseipdb', skipped: true, reason: 'no ABUSEIPDB_API_KEY' };
  }

  pipeline.ssllabs = await traceSslLabsCached(ledger, domain);

  pipeline.ports = await withTrace(
    ledger,
    'ports',
    'probe',
    `${domain} [21,22,23,25,80,443,3306,5432,6379,8080,8443,9200,27017]`,
    () => reconPorts(domain, 'cli'),
    (result) => `open=${result.open_ports?.map((port) => port.port).join(',') || 'none'} critical=${result.critical_port_count ?? 0}`
  );

  ledger.skip('abn', 'entityLookup', 'future source not wired in CLI yet');
  ledger.skip('asic', 'companyLookup', 'future source not wired in CLI yet');

  return pipeline;
}

async function traceVector(ledger, pages) {
  if (pages.length === 0) {
    ledger.skip('vector', 'extract', 'no pages fetched; sonar web intelligence still runs separately');
    return {
      attempted: false,
      ok: false,
      extracted: fallbackExtraction(),
      model: VECTOR_EXTRACT_MODEL,
      usage: zeroUsage(),
    };
  }

  const model = VECTOR_EXTRACT_MODEL;
  const call = ledger.call('vector', 'extract', `model=${model} via VECTOR pages=${pages.length}`);
  ledger.detail(call, 'why:', MODEL_REASONS[model] || 'configured proof360 signal extraction model');
  ledger.detail(call, 'prompt:', 'extract business/SPV signals as strict JSON from live page content');
  const prompt = buildVectorPrompt(pages);
  try {
    const response = await fetch(`${VECTOR_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': 'proof360-cli',
        'X-Tenant-ID': 'proof360',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
        tenant_id: 'proof360',
        session_id: 'cli',
        correlation_id: 'cli',
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`VECTOR HTTP ${response.status}: ${oneLine(body, 100)}`);
    }
    const json = await response.json();
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = parseJsonResponse(content);
    const usage = extractUsage(json);
    ledger.rx(
      call,
      `tokens_in=${usage.input} tokens_out=${usage.output} signals=${Object.keys(parsed).length} product_type=${parsed.product_type ?? 'unknown'} stage=${parsed.stage ?? 'unknown'} sector=${parsed.sector ?? 'unknown'}`,
      { model, model_reason: MODEL_REASONS[model], prompt_summary: 'page signal extraction', usage, parsed }
    );
    return { attempted: true, ok: true, extracted: parsed, model, usage };
  } catch (err) {
    ledger.fail(call, err.message || 'VECTOR extraction failed');
    return { attempted: true, ok: false, extracted: fallbackExtraction(), model, usage: zeroUsage() };
  }
}

async function traceWebIntelligence(ledger, domain) {
  const model = VECTOR_WEB_INTEL_MODEL;
  const prompt = buildWebIntelPrompt(domain);
  const call = ledger.call('perplexity', 'sonar', `model=${model} via VECTOR domain=${domain}`);
  ledger.detail(call, 'why:', MODEL_REASONS[model] || 'configured proof360 indexed web intelligence model');
  ledger.detail(call, 'prompt:', 'recent news, security incidents, data breaches, funding, CVEs, third-party mentions');

  try {
    const response = await fetch(`${VECTOR_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': 'proof360-cli-web-intel',
        'X-Tenant-ID': 'proof360',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
        tenant_id: 'proof360',
        session_id: 'cli-web-intel',
        correlation_id: 'cli-web-intel',
        sovereignty_override: true,
        sovereignty_justification: 'Proof360 authorized defensive due diligence uses indexed public web intelligence for customer-controlled assessments.',
      }),
      signal: AbortSignal.timeout(70000),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`VECTOR HTTP ${response.status}: ${oneLine(body, 120)}`);
    }

    const json = await response.json();
    const usage = extractUsage(json);
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = parseWebIntelContent(content);
    const citations = extractCitations(json, parsed);
    const coverage = coverageHosts(citations);
    const result = {
      model,
      model_reason: MODEL_REASONS[model],
      prompt_summary: 'indexed web intelligence',
      usage,
      citations,
      citation_count: citations.length,
      coverage,
      parsed,
      raw_summary: content,
    };

    ledger.rx(
      call,
      `tokens_in=${usage.input} tokens_out=${usage.output} citations=${citations.length} breach=${parsed.breach_status ?? 'unknown'} funding=${parsed.funding_status ?? 'unknown'} coverage=${list(coverage, 4)}`,
      result
    );

    return { attempted: true, ok: true, ...result };
  } catch (err) {
    ledger.fail(call, err.message || 'VECTOR sonar failed');
    return {
      attempted: true,
      ok: false,
      model,
      model_reason: MODEL_REASONS[model],
      usage: zeroUsage(),
      citations: [],
      citation_count: 0,
      coverage: [],
      parsed: {},
      raw_summary: '',
      error: err.message || 'VECTOR sonar failed',
    };
  }
}

function buildWebIntelPrompt(domain) {
  return `Search for recent news, security incidents, data breaches, funding announcements, and third-party mentions of the company at ${domain}. Summarise what you find. Be specific about dates and sources.

Return ONLY valid JSON. Do not include markdown.

Schema:
{
  "summary": "short neutral summary",
  "breach_status": "none_found | mentioned | unknown",
  "breach_mentions": ["dated breach/security incident mentions"],
  "funding_status": "confirmed | mentioned | none_found | unknown",
  "funding_mentions": ["dated funding or accelerator mentions"],
  "stage": "Pre-seed | Seed | Series A | Series B+ | Unknown",
  "sector": "healthcare | fintech | financial_services | government | legal | ecommerce | education | saas | infrastructure | energy | cyber | unknown",
  "geo_market": "AU | US | UK | SG | Global | Unknown",
  "cves": ["CVE identifiers or product vulnerability references"],
  "third_party_coverage": ["publisher or source names"],
  "confidence": "confident | likely | probable"
}`;
}

function parseWebIntelContent(content) {
  try {
    return parseJsonResponse(content);
  } catch {
    const lower = content.toLowerCase();
    return {
      summary: oneLine(content, 500),
      breach_status: /\b(breach|data leak|security incident|ransomware|compromise)\b/.test(lower) ? 'mentioned' : 'unknown',
      breach_mentions: [],
      funding_status: /\b(seed|series a|series b|funding|raised|accelerator)\b/.test(lower) ? 'mentioned' : 'unknown',
      funding_mentions: [],
      stage: inferStageFromText(content),
      sector: 'unknown',
      geo_market: 'Unknown',
      cves: [...new Set(content.match(/CVE-\d{4}-\d{4,7}/gi) || [])],
      third_party_coverage: [],
      confidence: 'probable',
    };
  }
}

function inferStageFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('series b')) return 'Series B+';
  if (lower.includes('series a')) return 'Series A';
  if (lower.includes('seed')) return 'Seed';
  if (lower.includes('pre-seed') || lower.includes('preseed')) return 'Pre-seed';
  return 'Unknown';
}

function extractCitations(json, parsed) {
  const candidates = [
    ...(Array.isArray(json.citations) ? json.citations : []),
    ...(Array.isArray(json.search_results) ? json.search_results.map((item) => item.url || item.link || item.source).filter(Boolean) : []),
    ...(Array.isArray(parsed?.citations) ? parsed.citations : []),
  ];
  return [...new Set(candidates.map((item) => String(item)).filter(Boolean))];
}

function coverageHosts(citations) {
  return [...new Set(citations.map((citation) => {
    try {
      return new URL(citation).hostname.replace(/^www\./, '');
    } catch {
      return citation.split('/')[0];
    }
  }).filter(Boolean))];
}

function extractUsage(json) {
  return {
    input: json?.usage?.prompt_tokens ?? json?.usage?.input_tokens ?? 0,
    output: json?.usage?.completion_tokens ?? json?.usage?.output_tokens ?? 0,
    total: json?.usage?.total_tokens ?? 0,
  };
}

function zeroUsage() {
  return { input: 0, output: 0, total: 0 };
}

function buildVectorPrompt(pages) {
  const content = pages.map((page) => `### ${page.label}\nURL: ${page.url}\n${page.content}`).join('\n\n');
  return `Extract proof360 business signals from these public website documents.

Return ONLY valid JSON. Do not include markdown.

Schema:
{
  "product_type": "B2B SaaS | B2C App | Platform | API | Software product | Unknown",
  "customer_type": "Enterprise (B2B) | SMB (B2B) | Consumer (B2C) | Mixed | Unknown",
  "data_sensitivity": "PII | Financial data | Healthcare data | Customer data | None | Unknown",
  "stage": "Pre-seed | Seed | Series A | Series B+ | Unknown",
  "sector": "healthcare | fintech | financial_services | government | legal | ecommerce | education | saas | infrastructure | energy | cyber | unknown",
  "geo_market": "AU | US | UK | SG | Global | Unknown",
  "handles_payments": true,
  "uses_ai": true,
  "handles_personal_data": true,
  "use_case": "plain English one-liner",
  "company_summary": "2-3 sentence read",
  "confidence": "confident | likely | probable"
}

Rules:
- Only infer from page text.
- Technical infrastructure comes from recon, not marketing copy.
- Missing fields may be "Unknown".

Documents:
${content}`;
}

function parseJsonResponse(text) {
  const stripped = text.startsWith('```')
    ? text.replace(/^```\w*\n?/, '').replace(/```$/, '').trim()
    : text;
  return JSON.parse(stripped);
}

function fallbackExtraction() {
  return {
    product_type: 'Software product',
    customer_type: 'Enterprise (B2B)',
    data_sensitivity: 'Unknown',
    stage: 'Unknown',
    sector: 'unknown',
    geo_market: 'Unknown',
    handles_payments: null,
    uses_ai: null,
    handles_personal_data: null,
    use_case: 'Unknown',
    company_summary: null,
    confidence: 'probable',
  };
}

function signalsFromExtraction(extracted, vectorCalled) {
  const confidence = extracted.confidence || (vectorCalled ? 'probable' : 'fallback');
  const keys = [
    'product_type',
    'customer_type',
    'data_sensitivity',
    'stage',
    'sector',
    'geo_market',
    'handles_payments',
    'uses_ai',
    'handles_personal_data',
    'use_case',
  ];
  const signals = [];
  for (const key of keys) {
    const value = extracted[key];
    if (value === undefined || value === null || value === '' || value === 'Unknown' || value === 'unknown') continue;
    signals.push({ type: key, value, confidence, source: vectorCalled ? 'vector' : 'fallback' });
  }
  return signals;
}

function signalsFromWebIntel(webIntel) {
  if (!webIntel?.ok) return [];
  const parsed = webIntel.parsed || {};
  const confidence = parsed.confidence || 'probable';
  const signals = [];
  for (const key of ['stage', 'sector', 'geo_market']) {
    const value = parsed[key];
    if (value === undefined || value === null || value === '' || value === 'Unknown' || value === 'unknown') continue;
    signals.push({
      type: key,
      value,
      confidence,
      source: 'perplexity',
      citations: webIntel.citations,
    });
  }
  if (parsed.breach_status && parsed.breach_status !== 'unknown') {
    signals.push({
      type: 'indexed_breach_status',
      value: parsed.breach_status,
      confidence,
      source: 'perplexity',
      citations: webIntel.citations,
    });
  }
  if (parsed.funding_status && parsed.funding_status !== 'unknown') {
    signals.push({
      type: 'indexed_funding_status',
      value: parsed.funding_status,
      confidence,
      source: 'perplexity',
      citations: webIntel.citations,
    });
  }
  return signals;
}

class Prompts {
  constructor(ledger, previousContext = {}) {
    this.ledger = ledger;
    this.rl = createInterface({ input: process.stdin, output: process.stdout });
    this.prev = previousContext;
  }

  close() {
    this.rl.close();
  }

  ask(question) {
    return new Promise((resolveAnswer) => {
      this.rl.question(question, (answer) => resolveAnswer(answer.trim()));
    });
  }

  async confirmField(field, label, inferred, options = null) {
    const prev = this.prev[field];
    const prevHint = prev !== undefined && prev !== null && String(prev) !== String(inferred)
      ? ` ${dim(`[prev: ${prev}]`)}`
      : '';
    line(`  ${bold(label)}: ${inferred ?? 'unknown'}${prevHint}`);
    if (options?.length) line(`  ${dim(`Options: ${options.join(' / ')}`)}`);
    const keepHint = prev !== undefined ? ' / [Enter] keep previous' : '';
    const answer = (await this.ask(`  ${dim(`[C]onfirm / [M]odify / [?] Not sure${keepHint}`)} > `)).toLowerCase();
    if (answer === '' && prev !== undefined) {
      const seq = this.ledger.event('CONFIRM', field, `founder=kept_previous value=${prev}`, { field, inferred, prev });
      line();
      return { value: prev, state: 'confirmed', seq };
    }
    if (answer === '?' || answer === 'n' || answer === 'not sure') {
      const seq = this.ledger.event('CONFIRM', field, 'founder=not_sure effect=UNVERIFIED', { field, inferred });
      line();
      return { value: null, state: 'not_sure', seq };
    }
    if (answer === 'm') {
      const value = await this.ask('  -> New value: ');
      const seq = this.ledger.event('CONFIRM', field, `founder=changed value=${value}`, { field, inferred, value });
      line();
      return { value: value || null, state: value ? 'changed' : 'not_sure', seq };
    }
    const seq = this.ledger.event('CONFIRM', field, `founder=confirmed value=${inferred ?? 'unknown'}`, { field, inferred });
    line();
    return { value: inferred, state: 'confirmed', seq };
  }

  async choose(field, label, options, valueMap) {
    const prev = this.prev[field];
    line(`  ${bold(label)}`);
    options.forEach((option, index) => {
      const prevMark = prev !== undefined && valueMap[option] === prev ? ` ${dim('← previous')}` : '';
      line(`    ${index + 1}. ${option}${prevMark}`);
    });
    if (prev !== undefined) line(`    ${dim('[Enter] keep previous')}`);
    const answer = await this.ask('  > ');
    if (answer === '' && prev !== undefined) {
      const matched = Object.entries(valueMap).find(([, v]) => v === prev);
      const selectedLabel = matched ? matched[0] : String(prev);
      const seq = this.ledger.event('CONFIRM', field, `founder=kept_previous value=${prev}`, { field, selected: selectedLabel, value: prev });
      line();
      return { value: prev, state: 'confirmed', seq, label: selectedLabel };
    }
    const index = Number.parseInt(answer, 10) - 1;
    const selected = index >= 0 && index < options.length ? options[index] : options[options.length - 1];
    const mapped = valueMap[selected];
    const state = selected === 'Not sure' ? 'not_sure' : 'confirmed';
    const seq = this.ledger.event('CONFIRM', field, `founder=${selected} value=${mapped ?? 'unknown'}`, { field, selected, value: mapped });
    line();
    return { value: mapped, state, seq, label: selected };
  }
}

async function collectFounderContext(ledger, baseContext, extraction, reconContext, previousContext = {}) {
  hr();
  line(bold('Founder/SPV confirmation loop'));
  const editHint = Object.keys(previousContext).length ? dim(' — editing saved session, Enter to keep previous answers') : dim('Not sure becomes UNVERIFIED, not negative evidence.');
  line(editHint);
  line();

  const prompts = new Prompts(ledger, previousContext);
  const context = { ...baseContext };
  const fieldStates = {};
  const founderAnswers = [];

  function record(field, result, source = 'founder') {
    context[field] = result.value;
    fieldStates[field] = result.state;
    founderAnswers.push({ field, state: result.state, value: result.value, seq: result.seq, source });
  }

  const assumptionFields = [
    ['product_type', 'Product type', extraction.product_type || 'Software product'],
    ['customer_type', 'Customer type', extraction.customer_type || 'Enterprise (B2B)'],
    ['stage', 'SPV stage', extraction.stage && extraction.stage !== 'Unknown' ? extraction.stage : 'Unknown'],
    ['sector', 'Sector', extraction.sector && extraction.sector !== 'unknown' ? extraction.sector : 'unknown'],
    ['geo_market', 'Geo market', extraction.geo_market && extraction.geo_market !== 'Unknown' ? extraction.geo_market : 'Unknown'],
    ['infrastructure', 'Infrastructure', reconContext.cloud_provider || context.infrastructure || 'Unknown'],
  ];

  try {
    for (const [field, label, inferred] of assumptionFields) {
      record(field, await prompts.confirmField(field, label, inferred));
    }

    record('has_raised_institutional', await prompts.choose(
      'has_raised_institutional',
      'Has the SPV raised from an institutional investor, VC, accelerator, or incubator?',
      ['Yes', 'No', 'Not sure'],
      { Yes: true, No: false, 'Not sure': null }
    ));

    record('abn_entity_type', await prompts.choose(
      'abn_entity_type',
      'ABN/entity type?',
      ['Pty Ltd', 'Trust', 'Not for profit', 'Other', 'Not sure'],
      { 'Pty Ltd': 'pty_ltd', Trust: 'trust', 'Not for profit': 'not_for_profit', Other: 'other', 'Not sure': null }
    ));

    record('identity_model', await prompts.choose(
      'identity_model',
      'How does the team authenticate?',
      ['Passwords only', 'Passwords + MFA', 'SSO (Google, Okta, etc.)', 'Not sure'],
      { 'Passwords only': 'password_only', 'Passwords + MFA': 'mfa_only', 'SSO (Google, Okta, etc.)': 'sso', 'Not sure': null }
    ));

    record('insurance_status', await prompts.choose(
      'insurance_status',
      'Cyber insurance status?',
      ['Yes', 'No', 'In progress', 'Not sure'],
      { Yes: 'active', No: 'none', 'In progress': 'planning', 'Not sure': null }
    ));

    record('pen_test_completed', await prompts.choose(
      'pen_test_completed',
      'Independent penetration test in the last 12 months?',
      ['Yes', 'No', 'In progress', 'Not sure'],
      { Yes: true, No: false, 'In progress': false, 'Not sure': null }
    ));

    record('has_backup', await prompts.choose(
      'has_backup',
      'Automated backups with tested recovery?',
      ['Yes', 'No', 'Partial', 'Not sure'],
      { Yes: true, No: false, Partial: false, 'Not sure': null }
    ));

    record('aws_program_enrolled', await prompts.choose(
      'aws_program_enrolled',
      'Already enrolled in AWS startup or partner programs?',
      ['Yes', 'No', 'Not sure'],
      { Yes: true, No: false, 'Not sure': null }
    ));
  } finally {
    prompts.close();
  }

  if (!context.compliance_status) {
    context.compliance_status = 'none';
    fieldStates.compliance_status = 'probable';
    ledger.event('INFER', 'compliance_status', 'value=none confidence=probable source=no explicit SOC2/trust-center evidence', {
      field: 'compliance_status',
      value: 'none',
    });
  }

  if (context.infrastructure === 'Unknown') {
    context.infrastructure = null;
    fieldStates.infrastructure = fieldStates.infrastructure || 'not_sure';
  }

  return { context, fieldStates, founderAnswers };
}

function buildBaseContext(signals, reconPipeline) {
  const reconContext = extractReconContext(reconPipeline);
  const context = { ...reconContext };

  for (const signal of signals) {
    if (context[signal.type] === undefined || context[signal.type] === null) {
      context[signal.type] = signal.value;
    }
  }

  if (reconContext.cloud_provider && !context.infrastructure) {
    context.infrastructure = reconContext.cloud_provider;
  }

  return { context, reconContext };
}

const GAP_DEPENDENCIES = {
  soc2: ['compliance_status'],
  mfa: ['identity_model'],
  cyber_insurance: ['insurance_status'],
  incident_response: ['compliance_status'],
  vendor_questionnaire: ['questionnaire_experience'],
  edr: ['identity_model'],
  sso: ['identity_model'],
  founder_trust: ['founder_profile_completed'],
  dmarc: ['dmarc_policy'],
  spf: ['spf_policy'],
  hipaa_security: ['sector', 'data_sensitivity'],
  pci_dss: ['handles_payments', 'sector'],
  apra_prudential: ['sector', 'geo_market'],
  essential_eight: ['sector', 'geo_market'],
  security_headers: ['has_hsts', 'has_csp'],
  staging_exposure: ['has_staging_exposure'],
  domain_breach: ['domain_in_breach'],
  tls_configuration: ['tls_is_current', 'has_old_tls', 'ssl_grade_num', 'cert_expiry_days'],
  ai_governance: ['uses_ai'],
  data_privacy: ['handles_personal_data'],
  penetration_testing: ['pen_test_completed', 'compliance_status'],
  backup_dr: ['has_backup'],
  aws_program_eligibility: ['infrastructure', 'cloud_provider', 'aws_program_enrolled'],
  ip_reputation: ['ip_is_abusive'],
};

const EVIDENCE_SOURCE_BY_GAP = {
  dmarc: 'dns',
  spf: 'dns',
  security_headers: 'http',
  tls_configuration: 'http',
  staging_exposure: 'crtsh',
  domain_breach: 'hibp',
  ip_reputation: 'abuseipdb',
};

const ANSWER_GAPS = new Set([
  'mfa',
  'sso',
  'edr',
  'cyber_insurance',
  'penetration_testing',
  'backup_dr',
  'aws_program_eligibility',
]);

async function loadCorpus(ledger) {
  const call = ledger.call('corpus', 'createCorpusStore', 'CORPUS/seeds');
  try {
    const store = await createCorpusStore();
    const corpus = createCorpusQuery(store);
    ledger.rx(call, `loaded entities=${store.list('Entity').length} claims=${store.list('Claim').length} relationships=${store.list('Relationship').length}`, {
      entities: store.list('Entity').length,
      claims: store.list('Claim').length,
      relationships: store.list('Relationship').length,
    });
    return corpus;
  } catch (err) {
    ledger.fail(call, err.message || 'CORPUS load failed');
    return null;
  }
}

function fieldSnapshot(context, fields) {
  return Object.fromEntries(fields.map((field) => [field, context[field] === undefined ? null : context[field]]));
}

async function analyseGaps(ledger, corpus, context, fieldStates) {
  const gaps = [];

  for (const gapDef of GAP_DEFINITIONS) {
    const dependencies = GAP_DEPENDENCIES[gapDef.id] || [];
    let triggered = false;
    try {
      triggered = Boolean(gapDef.triggerCondition(context));
    } catch (err) {
      ledger.event('GAP', gapDef.id, `trigger error=${err.message}`, { gap_id: gapDef.id, error: err.message });
      continue;
    }

    const unverifiedFields = dependencies.filter((field) =>
      fieldStates[field] === 'not_sure' || context[field] === null || context[field] === undefined
    );
    const shouldShowUnverified = !triggered && unverifiedFields.length > 0 && ANSWER_GAPS.has(gapDef.id);
    if (!triggered && !shouldShowUnverified) continue;

    const corpusData = await queryCorpusForGap(ledger, corpus, gapDef.id);
    const evidenceSource = EVIDENCE_SOURCE_BY_GAP[gapDef.id] || (unverifiedFields.length ? 'founder' : 'inference');
    const evidenceRefs = evidenceSource === 'founder'
      ? []
      : ledger.refsFor(evidenceSource);
    const strength = unverifiedFields.length > 0
      ? 'UNVERIFIED'
      : (['dns', 'http', 'crtsh', 'hibp', 'abuseipdb'].includes(evidenceSource) ? 'HIGH' : 'PROBABLE');
    const basePenalty = SEVERITY_WEIGHTS[gapDef.severity] || 0;
    const penalty = strength === 'UNVERIFIED' ? 0 : basePenalty;
    const triggerValues = fieldSnapshot(context, dependencies);

    const gapState = strength === 'UNVERIFIED' ? 'UNVERIFIED' : 'TRIGGERED';
    const eventSeq = ledger.event('GAP', gapDef.id, `${gapState} penalty=${penalty} inputs=${JSON.stringify(triggerValues)}`, {
      gap_id: gapDef.id,
      triggered,
      strength,
      penalty,
      triggerValues,
      unverifiedFields,
      evidenceRefs,
    });

    gaps.push({
      gap_id: gapDef.id,
      title: gapDef.label,
      category: gapDef.category,
      severity: gapDef.severity,
      strength,
      triggered,
      eventSeq,
      score_impact: penalty,
      full_score_impact: basePenalty,
      dependencies,
      triggerValues,
      unverifiedFields,
      evidenceSource,
      evidenceRefs,
      why: gapDef.why || 'This gap was identified based on the current trust posture.',
      risk: gapDef.risk || 'This gap increases risk to enterprise readiness.',
      time_estimate: gapDef.time_estimate || '',
      remediation: gapDef.remediation || [],
      corpus: corpusData,
    });
  }

  const totalPenalty = gaps.reduce((sum, gap) => sum + gap.score_impact, 0);
  const trustScore = Math.max(0, Math.round(100 - totalPenalty));
  const readiness = trustScore >= 80 ? 'ready' : trustScore >= 50 ? 'partial' : 'not_ready';

  return { gaps, trustScore, readiness };
}

async function queryCorpusForGap(ledger, corpus, gapId) {
  if (!corpus) {
    ledger.event('CORPUS', gapId, 'unavailable - falling back to local gap/vendor config', { gap_id: gapId });
    return { gap: null, frameworks: [], vendors: [] };
  }

  const gapCall = ledger.call('corpus', 'getGap', gapId);
  const gap = corpus.getGap(gapId);
  if (gap) ledger.rx(gapCall, `claims=${gap.claims.length} entity=${gap.entity.name}`, { gap_id: gapId, entity: gap.entity, claims: gap.claims });
  else ledger.fail(gapCall, 'no entry - falling back to gaps.js', { gap_id: gapId });

  const frameworkCall = ledger.call('corpus', 'getFrameworksForGap', gapId);
  const frameworks = corpus.getFrameworksForGap(gapId);
  ledger.rx(frameworkCall, `frameworks=${frameworks.length} ${list(frameworks.map((item) => item.entity.name), 5)}`, {
    gap_id: gapId,
    frameworks,
  });

  const vendorCall = ledger.call('corpus', 'getVendorsForGap', gapId);
  const vendors = corpus.getVendorsForGap(gapId);
  ledger.rx(vendorCall, `vendors=${vendors.length} ${list(vendors.map((item) => item.entity.extensions?.vendor_id || item.entity.name), 6)}`, {
    gap_id: gapId,
    vendors,
  });

  return { gap, frameworks, vendors };
}

function buildVendorMatrix(ledger, gaps) {
  const gapIds = gaps.map((gap) => gap.gap_id);
  const gapSet = new Set(gapIds);
  const candidates = Object.values(VENDORS)
    .map((vendor) => {
      const covers = (vendor.closes || []).filter((gapId) => gapSet.has(gapId));
      return { vendor, covers };
    })
    .filter((entry) => entry.covers.length > 0)
    .sort((a, b) => {
      if (b.covers.length !== a.covers.length) return b.covers.length - a.covers.length;
      const routeScore = routeRank(a.vendor) - routeRank(b.vendor);
      if (routeScore !== 0) return routeScore;
      return String(a.vendor.display_name).localeCompare(String(b.vendor.display_name));
    });

  ledger.event('ROUTE', 'vendor.matrix', `candidates=${candidates.length} gaps=${gapIds.length}`, {
    gaps: gapIds,
    candidates: candidates.map(({ vendor, covers }) => ({ vendor_id: vendor.id, covers })),
  });

  const remaining = new Set(gapIds);
  const selected = [];
  for (const candidate of candidates) {
    const marginal = candidate.covers.filter((gapId) => remaining.has(gapId));
    if (marginal.length === 0) continue;
    selected.push({ ...candidate, marginal });
    marginal.forEach((gapId) => remaining.delete(gapId));
    ledger.event('ROUTE', candidate.vendor.id, `selected marginal=${marginal.length} covers=${marginal.join(',')}`, {
      vendor_id: candidate.vendor.id,
      marginal,
      route: routeLabel(candidate.vendor),
    });
    if (remaining.size === 0) break;
  }

  return { candidates, selected, uncovered: [...remaining] };
}

function routeRank(vendor) {
  if (vendor.distributor === 'ingram') return 0;
  if (vendor.is_partner) return 1;
  if (vendor.distributor === 'direct') return 2;
  if (vendor.distributor === 'dicker') return 3;
  return 4;
}

function routeLabel(vendor) {
  if (vendor.distributor === 'ingram') return 'Ingram Micro AU';
  if (vendor.distributor === 'dicker') return 'Dicker Data AU';
  if (vendor.distributor === 'direct') return vendor.aws_native ? 'AWS direct/native' : 'direct';
  return 'route tbd';
}

function evaluateAwsPrograms(ledger, context, fieldStates) {
  const results = [];
  for (const program of AWS_PROGRAMS) {
    const call = ledger.call('aws', 'evaluateProgram', program.program_id);
    const checks = program.triggers.map((trigger) => ({
      trigger,
      value: context[trigger.field],
      state: fieldStates[trigger.field] || inferFieldState(trigger.field, context),
      pass: evaluateTrigger(trigger, context),
    }));
    const passed = checks.every((check) => check.pass);
    const weakEvidence = checks.some((check) => ['not_sure', 'probable', 'not_asked'].includes(check.state));
    const status = passed ? (weakEvidence ? 'possible' : 'eligible') : 'not_eligible';
    ledger.rx(call, `${status} ${checks.map((check) => `${check.trigger.field}=${check.value ?? 'unknown'}:${check.pass ? 'pass' : 'fail'}`).join(' ')}`, {
      program_id: program.program_id,
      status,
      checks,
    });
    results.push({ program, status, checks });
  }
  return results;
}

function inferFieldState(field, context) {
  if (context[field] === null || context[field] === undefined || context[field] === '') return 'not_asked';
  if (['dmarc_policy', 'spf_policy', 'has_hsts', 'has_csp', 'cloud_provider'].includes(field)) return 'live_recon';
  return 'probable';
}

function printSurface(domain, extraction, webIntel, reconContext, gaps) {
  hr('=');
  line(bold('What we found'));
  line();

  // Company read
  const summary = extraction?.company_summary || webIntel?.parsed?.summary;
  const stage = extraction?.stage && extraction.stage !== 'Unknown' ? extraction.stage : (webIntel?.parsed?.stage || 'Unknown');
  const sector = extraction?.sector && extraction.sector !== 'unknown' ? extraction.sector : (webIntel?.parsed?.sector || 'unknown');
  const geo = extraction?.geo_market && extraction.geo_market !== 'Unknown' ? extraction.geo_market : (webIntel?.parsed?.geo_market || 'Unknown');
  const useCase = extraction?.use_case && extraction.use_case !== 'Unknown' ? extraction.use_case : null;

  if (summary) line(`  ${oneLine(summary, 280)}`);
  if (useCase) line(`  ${dim(useCase)}`);
  line(`  Stage: ${stage}  Sector: ${sector}  Market: ${geo}`);
  line();

  // Direct observations (high confidence — no inference)
  const obs = [];
  if (reconContext.dmarc_policy) obs.push(`DMARC ${reconContext.dmarc_policy}`);
  if (reconContext.spf_policy) obs.push(`SPF ${reconContext.spf_policy}`);
  if (reconContext.has_hsts === false) obs.push('no HSTS');
  if (reconContext.has_csp === false) obs.push('no CSP');
  if (reconContext.ssl_grade) obs.push(`TLS ${reconContext.ssl_grade}`);
  if (reconContext.has_staging_exposure) obs.push('staging exposed');
  if (reconContext.domain_in_breach) obs.push('domain in breach data');
  if (reconContext.ip_is_abusive) obs.push('IP flagged for abuse');
  if (obs.length) line(`  Observed: ${obs.join(' · ')}`);
  if (reconContext.cloud_provider && reconContext.cloud_provider !== 'unknown') {
    line(`  Infrastructure: ${reconContext.cloud_provider}`);
  }
  line();

  // Gap summary — plain English, no penalties
  const triggered = gaps.filter((g) => g.strength !== 'UNVERIFIED');
  const unverified = gaps.filter((g) => g.strength === 'UNVERIFIED');
  const criticalHigh = triggered.filter((g) => ['critical', 'high'].includes(g.severity));

  if (triggered.length === 0 && unverified.length === 0) {
    line(`  ${C.green}No gaps found based on available evidence.${C.reset}`);
  } else {
    if (triggered.length) {
      line(`  ${triggered.length} gap${triggered.length !== 1 ? 's' : ''} found${criticalHigh.length ? ` — ${criticalHigh.length} high-priority` : ''}:`);
      for (const gap of triggered) {
        const bullet = gap.severity === 'critical' ? `${C.red}●${C.reset}` : gap.severity === 'high' ? `${C.yellow}●${C.reset}` : `${C.dim}●${C.reset}`;
        line(`    ${bullet} ${gap.title}`);
      }
    }
    if (unverified.length) {
      line();
      line(`  ${unverified.length} item${unverified.length !== 1 ? 's' : ''} we could not verify (not negative evidence — these need founder input):`);
      for (const gap of unverified) {
        line(`    ${dim('○')} ${gap.title} ${dim(`(unverified: ${gap.unverifiedFields.join(', ')})`)}`);
      }
    }
  }
}

function printDocuments(pages) {
  hr();
  line(bold('Documents'));
  if (pages.length === 0) {
    line(`${C.yellow}  No website documents were read.${C.reset}`);
    return;
  }
  for (const page of pages) {
    line(`  ${page.label.padEnd(10)} ${page.url}`);
    line(`    ${dim(page.excerpt)}`);
  }
}

function printEvidenceQuality({ pages, ledger, vector, webIntel, corpusAvailable, founderAnswers, gaps }) {
  const reconSources = ['dns', 'http', 'crtsh', 'github', 'ipapi', 'jobs', 'hibp', 'abuseipdb', 'ssllabs', 'ports'];
  const okCount = reconSources.filter((source) => ledger.sourceStatus.get(source) === 'ok').length;
  const skipped = reconSources.filter((source) => ledger.sourceStatus.get(source) === 'skipped');
  const notSure = founderAnswers.filter((answer) => answer.state === 'not_sure').length;
  const vectorAttempted = Boolean(vector?.attempted || webIntel?.attempted);
  const vectorUseful = Boolean(vector?.ok || webIntel?.ok);
  const evidencePoor = pages.length === 0 && !vectorUseful;

  hr();
  line(bold('Evidence Quality'));
  line(`  Status: ${evidencePoor ? `${C.red}EVIDENCE-POOR${C.reset}` : `${C.yellow}PARTIAL${C.reset}`}`);
  line(`  Pages read: ${pages.length} of ${PAGE_TARGETS.length}`);
  line(`  Perplexity: ${webIntel?.ok ? `yes - ${webIntel.citation_count} citations (${list(webIntel.coverage, 4)})` : webIntel?.attempted ? `failed - ${webIntel.error || 'see trace'}` : 'not called'}`);
  line(`  Recon sources: ${okCount} of ${reconSources.length}${skipped.length ? ` (${skipped.join(', ')} skipped)` : ''}`);
  line(`  VECTOR called: ${vectorAttempted ? 'yes' : 'no'} - extraction=${vector?.ok ? vector.model : vector?.attempted ? 'failed' : 'skipped'} sonar=${webIntel?.ok ? webIntel.model : webIntel?.attempted ? 'failed' : 'not_called'}`);
  line(`  CORPUS called: ${corpusAvailable ? 'yes' : 'no'}`);
  line(`  Founder input: ${founderAnswers.length} fields, ${notSure} not sure`);
  line(`  Gaps shown: ${gaps.length}`);
  if (evidencePoor) {
    line(`${C.red}  WARNING: no website documents were read and no useful VECTOR intelligence was returned. Scores are provisional.${C.reset}`);
  }
  line(`  ${dim('HIGH = live recon. PROBABLE = inferred. UNVERIFIED = not sure / not asked, not negative evidence.')}`);
}

function printWebIntelligence(webIntel) {
  hr();
  line(bold('Web Intelligence'));
  if (!webIntel?.attempted) {
    line(`${C.yellow}  Sonar was not called.${C.reset}`);
    return;
  }
  if (!webIntel.ok) {
    line(`${C.red}  Sonar via VECTOR failed: ${webIntel.error || 'see trace'}${C.reset}`);
    return;
  }
  const parsed = webIntel.parsed || {};
  line(`  Model: ${webIntel.model} via VECTOR`);
  line(`  Why: ${webIntel.model_reason}`);
  if (parsed.summary) line(`  Summary: ${oneLine(parsed.summary, 220)}`);
  line(`  Breach: ${parsed.breach_status || 'unknown'}  Funding: ${parsed.funding_status || 'unknown'}  Stage: ${parsed.stage || 'Unknown'}`);
  line(`  Citations: ${webIntel.citation_count}${webIntel.coverage.length ? ` (${list(webIntel.coverage, 6)})` : ''}`);
  for (const citation of webIntel.citations.slice(0, 5)) {
    line(`    ${citation}`);
  }
}

function printScoreFootnote(gaps, trustScore) {
  // Internal calibration signal — not the headline. Shown in methodology, not at the top.
  const triggered = gaps.filter((g) => g.strength !== 'UNVERIFIED');
  const bySeverity = {};
  for (const gap of triggered) {
    if (!bySeverity[gap.severity]) bySeverity[gap.severity] = [];
    bySeverity[gap.severity].push(gap);
  }
  line(`  Internal posture signal: ${trustScore}/100 based on ${triggered.length} confirmed gap${triggered.length !== 1 ? 's' : ''} (not a grade — calibration only)`);
  for (const severity of ['critical', 'high', 'medium', 'low']) {
    const items = bySeverity[severity] || [];
    if (items.length === 0) continue;
    const total = items.reduce((sum, item) => sum + item.score_impact, 0);
    line(`    ${dim(`${severity.padEnd(8)} -${String(total).padStart(3)}: ${items.map((item) => item.gap_id).join(', ')}`)}`);
  }
}

function printGapDossier(gaps) {
  const triggered = gaps.filter((g) => g.strength !== 'UNVERIFIED');
  const unverified = gaps.filter((g) => g.strength === 'UNVERIFIED');

  if (triggered.length === 0 && unverified.length === 0) return;

  hr();
  line(bold('What to address'));

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...triggered].sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

  for (const gap of sorted) {
    line();
    const severityLabel = gap.severity === 'critical' ? `${C.red}${gap.severity}${C.reset}` : gap.severity === 'high' ? `${C.yellow}${gap.severity}${C.reset}` : gap.severity;
    line(`${bold(gap.title)}  ${dim(severityLabel + ' · ' + gap.gap_id)}`);
    line(`  ${oneLine(gap.why, 240)}`);
    if (gap.time_estimate) line(`  ${dim('Effort:')} ${gap.time_estimate}`);
    const evidenceTag = gap.strength === 'HIGH' ? `${C.green}direct observation${C.reset}` : 'inferred';
    line(`  ${dim('Evidence:')} ${evidenceTag}${gap.evidenceRefs.length ? ` — refs ${gap.evidenceRefs.map((seq) => `[${String(seq).padStart(4, '0')}]`).join(', ')}` : ''}`);
    const claimText = gap.corpus.gap?.claims?.[0]?.text;
    if (claimText) line(`  ${dim('CORPUS:')} ${oneLine(claimText, 180)}`);
    const frameworks = gap.corpus.frameworks.map((item) => item.entity.name);
    if (frameworks.length) line(`  ${dim('Frameworks:')} ${frameworks.join(' · ')}`);
    const remediation = gap.remediation.slice(0, 3);
    if (remediation.length) {
      line(`  ${dim('Steps:')}`);
      remediation.forEach((item, index) => line(`    ${index + 1}. ${item}`));
    }
  }

  if (unverified.length) {
    line();
    line(bold('Items needing founder input'));
    line(dim('  These could not be determined from a cold read. Not negative evidence — but worth confirming.'));
    for (const gap of unverified) {
      line();
      line(`  ${dim('○')} ${bold(gap.title)}  ${dim(gap.gap_id)}`);
      line(`    ${dim('Missing:')} ${gap.unverifiedFields.join(', ')}`);
      line(`    ${oneLine(gap.why, 200)}`);
    }
  }
}

function printVendorMatrix(matrix) {
  if (matrix.selected.length === 0) return;
  hr();
  line(bold('Vendors we would use'));
  line(dim('  These are the vendors we use or have vetted relationships with. We can make introductions.'));
  for (const { vendor, covers } of matrix.selected) {
    line();
    line(`  ${bold(vendor.display_name)}`);
    if (vendor.summary) line(`    ${oneLine(vendor.summary, 220)}`);
    line(`    ${dim('Addresses:')} ${covers.join(', ')}`);
    if (vendor.cost_range) line(`    ${dim('Typical cost:')} ${vendor.cost_range}`);
    if (vendor.timeline) line(`    ${dim('Timeline:')} ${vendor.timeline}`);
    const routeNote = vendor.is_partner ? 'we have a direct relationship' : vendor.distributor === 'ingram' ? 'available via Ingram Micro AU' : vendor.distributor === 'dicker' ? 'available via Dicker Data AU' : vendor.distributor === 'direct' ? 'direct introduction available' : '';
    if (routeNote) line(`    ${dim('Route:')} ${routeNote}`);
  }
  if (matrix.uncovered.length) {
    line();
    line(`  ${dim(`Gaps without a vendor match: ${matrix.uncovered.join(', ')} — we can still advise`)}`);
  }
}

function printCyberInsurance(gaps) {
  if (!gaps.some((gap) => gap.gap_id === 'cyber_insurance')) return;
  const vendor = VENDORS.austbrokers;
  hr();
  line(bold('Cyber Insurance Lane'));
  line(`  ${bold(vendor.display_name)} ${dim('(partner, AU specialist, direct introduction)')}`);
  line(`  ${vendor.summary}`);
  line(`  ${[vendor.cost_range, 'quoted and bound in 2 weeks'].filter(Boolean).join(' | ')}`);
  line('  Route: https://meetings.hubspot.com/john3174');
}

function printAwsPrograms(results) {
  const surfaced = results.filter((result) => result.status !== 'not_eligible' || ['migration_acceleration', 'well_architected_partner', 'marketplace_seller'].includes(result.program.program_id));
  hr();
  line(bold('AWS Program Eligibility'));
  for (const result of surfaced) {
    const colour = result.status === 'eligible' ? C.green : result.status === 'possible' ? C.yellow : C.dim;
    line();
    line(`  ${colour}${result.program.name}${C.reset}  ${dim(result.status)}`);
    line(`    Benefit: ${result.program.benefit}`);
    line(`    Evidence: ${result.checks.map((check) => `${check.trigger.field}=${check.value ?? 'unknown'} (${check.pass ? 'pass' : 'fail'}, ${check.state})`).join('; ')}`);
    if (result.program.program_id === 'migration_acceleration' && result.status === 'not_eligible') {
      line('    Note: MAP requires on-prem, legacy-hosted, or fragmented multi-cloud signal.');
    }
    if (result.program.program_id === 'marketplace_seller') {
      line('    CPPO note: Channel Partner Private Offers are a future commercial route, not the first demo target.');
    }
  }
}

function printCommercialRoute(matrix) {
  hr();
  line(bold('Commercial Route'));
  for (const { vendor } of matrix.selected) {
    line(`  ${vendor.display_name.padEnd(26)} -> ${routeLabel(vendor)}${vendor.deal_label ? ` -> ${vendor.deal_label}` : ''}`);
  }
  line('  All routes start at: https://meetings.hubspot.com/john3174');
  line('  Future boundary: engagement routing and attribution ledger remain v3 surfaces.');
}

function printProvenanceBlock({ ledger, pages, vector, webIntel, corpusAvailable, founderAnswers, gaps, trustScore }) {
  const reconSources = ['dns', 'http', 'crtsh', 'github', 'ipapi', 'jobs', 'hibp', 'abuseipdb', 'ssllabs', 'ports'];
  const calledRecon = reconSources.filter((source) => ledger.entries.some((entry) => entry.type === 'CALL' && entry.source === source));
  const skippedRecon = reconSources.filter((source) => ledger.sourceStatus.get(source) === 'skipped');
  const llmCalls = ledger.entries.filter((entry) => entry.type === 'CALL' && ['vector', 'perplexity'].includes(entry.source));
  const llmResults = ledger.entries.filter((entry) => entry.type === 'RX' && ['vector', 'perplexity'].includes(entry.source));
  const tokensIn = llmResults.reduce((sum, entry) => sum + (entry.result?.usage?.input || 0), 0);
  const tokensOut = llmResults.reduce((sum, entry) => sum + (entry.result?.usage?.output || 0), 0);
  const notSure = founderAnswers.filter((answer) => answer.state === 'not_sure').length;
  const confirmed = founderAnswers.length - notSure;
  const generated = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date());

  hr();
  line(bold('How this was built'));
  line();
  line(`  ${dim('Direct observation (no inference, highest confidence):')}`);
  line(`    DNS, HTTP headers, certificate transparency logs, SSL Labs grade, port scan`);
  line(`    ${calledRecon.length} sources called${skippedRecon.length ? ` · ${skippedRecon.length} skipped (${skippedRecon.join(', ')})` : ''}`);
  line();
  line(`  ${dim('Web intelligence:')}`);
  if (webIntel?.ok) {
    line(`    ${webIntel.model} via VECTOR — ${webIntel.model_reason}`);
    line(`    ${webIntel.citation_count} citations from indexed web · indexed ${new Date().toISOString().slice(0, 10)}`);
  } else if (webIntel?.attempted) {
    line(`    ${webIntel.model} — failed (${webIntel.error || 'see trace'})`);
  } else {
    line(`    not called`);
  }
  line();
  line(`  ${dim('Page content:')}`);
  line(`    ${pages.length} of ${PAGE_TARGETS.length} pages read via local fetch (no external API)`);
  line();
  line(`  ${dim('Signal extraction:')}`);
  if (vector?.ok) {
    line(`    ${vector.model} via VECTOR — ${MODEL_REASONS[vector.model] || 'signal extraction'}`);
  } else {
    line(`    ${vector?.attempted ? `${vector.model} — failed` : 'skipped (no pages read)'}`);
  }
  line();
  line(`  ${dim('Knowledge base:')}`);
  line(`    CORPUS — ${corpusAvailable ? 'gap claims and vendor graph from seeded knowledge base' : 'not available this run'}`);
  line();
  line(`  ${dim('Founder input:')}`);
  line(`    ${confirmed} fields confirmed · ${notSure} not sure`);
  line(`    Not-sure answers appear as unverified items, not negative evidence`);
  line();
  line(`  ${dim('Model calls:')}`);
  line(`    ${llmCalls.length} LLM calls · ${tokensIn} tokens in / ${tokensOut} out`);
  line();
  printScoreFootnote(gaps, trustScore);
  line();
  line(`  Generated: ${generated}`);
}

function saveSession(domain, payload) {
  if (!existsSync(RUNS_DIR)) mkdirSync(RUNS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${domain}-${ts}.json`;
  const path = resolve(RUNS_DIR, filename);
  writeFileSync(path, JSON.stringify({ version: 1, domain, saved_at: new Date().toISOString(), ...payload }, null, 2));
  return path;
}

function loadSession(sessionFile) {
  const path = resolve(sessionFile);
  if (!existsSync(path)) throw new Error(`Session file not found: ${path}`);
  const session = JSON.parse(readFileSync(path, 'utf8'));
  if (!session.version || !session.domain) throw new Error(`Invalid session file (missing version/domain): ${path}`);
  return session;
}

let __graphStopped = false;

async function main() {
  const argv = process.argv.slice(2);
  let sessionFile = null;
  let editMode = false;
  let urlInput = null;

  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--rerender' || argv[i] === '--edit') && argv[i + 1]) {
      editMode = argv[i] === '--edit';
      sessionFile = argv[++i];
    } else if (!argv[i].startsWith('--')) {
      urlInput = argv[i];
    }
  }

  let url, domain, ledger;
  let pages, reconPipeline, vector, webIntel, reconContext;
  let context, fieldStates, founderAnswers;
  let graphServer = null;

  if (sessionFile) {
    // ── Rerender / edit path ────────────────────────────────────────────────
    const session = loadSession(sessionFile);
    domain = session.domain;
    url = `https://${domain}`;
    ledger = new Ledger();

    const modeLabel = editMode ? 're-edit' : 're-render';
    line(`${bold('proof360')} ${modeLabel}`);
    line(`${dim(`session: ${sessionFile}  saved: ${session.saved_at}`)}`);
    line(`target: ${url}`);
    hr('=');

    pages = session.pages;
    reconPipeline = session.reconPipeline;
    vector = session.vector;
    webIntel = session.webIntel;

    // Restore ledger source status from saved recon (so evidence quality renders correctly)
    for (const src of ['dns', 'http', 'crtsh', 'github', 'ipapi', 'jobs', 'hibp', 'abuseipdb', 'ssllabs', 'ports']) {
      const status = session.reconSourceStatus?.[src] || (reconPipeline?.[src] ? 'ok' : 'skipped');
      ledger.sourceStatus.set(src, status);
    }

    const signals = [
      ...signalsFromExtraction(vector.extracted, vector.ok),
      ...signalsFromWebIntel(webIntel),
    ];
    for (const signal of signals) {
      ledger.event('INFER', signal.type, `value=${signal.value} confidence=${signal.confidence} source=${signal.source}`, signal);
    }

    reconContext = extractReconContext(reconPipeline);
    const { context: baseContext } = buildBaseContext(signals, reconPipeline);
    const promptExtraction = {
      ...vector.extracted,
      stage: baseContext.stage || vector.extracted.stage,
      sector: baseContext.sector || vector.extracted.sector,
      geo_market: baseContext.geo_market || vector.extracted.geo_market,
    };

    if (editMode) {
      // Re-run confirmation loop with saved answers pre-populated
      const result = await collectFounderContext(ledger, baseContext, promptExtraction, reconContext, session.context);
      context = result.context;
      fieldStates = result.fieldStates;
      founderAnswers = result.founderAnswers;
    } else {
      // Rerender: use saved answers verbatim
      context = session.context;
      fieldStates = session.fieldStates;
      founderAnswers = session.founderAnswers;
      line(dim('Using saved founder answers. Run with --edit to change them.'));
    }
  } else {
    // ── Fresh run path ──────────────────────────────────────────────────────
    if (!urlInput) {
      console.error([
        'Usage:',
        '  node proof360/cli.mjs <url>                       fresh run',
        '  node proof360/cli.mjs --rerender <session.json>   re-render saved session',
        '  node proof360/cli.mjs --edit <session.json>       edit answers and re-render',
      ].join('\n'));
      process.exit(1);
    }

    url = normalizeUrl(urlInput);
    domain = domainFromUrl(url);
    ledger = new Ledger();

    line(`${bold('proof360')} protocol trace`);
    line(`${dim('trace first, dossier second')}`);
    line(`${dim('authorized defensive due diligence only: assess systems you own or are explicitly allowed to review')}`);
    line(`target: ${url}`);
    hr('=');

    // ── Start graph server ──────────────────────────────────────────────────
    graphServer = await createGraphServer();
    const graphPort = graphServer.address().port;
    exec(`open "http://localhost:${graphPort}/graph" 2>/dev/null || xdg-open "http://localhost:${graphPort}/graph" 2>/dev/null`);
    console.error(`[graph] companion: http://localhost:${graphPort}/graph`);

    graphBus.once('stop', () => { __graphStopped = true; });

    // ── QUICK PHASE ─────────────────────────────────────────────────────────
    emit(buildDepthChange('quick', 'Loading quick...'));

    emit(buildNodeStart('firecrawl', 'quick'));
    pages = await traceFirecrawl(ledger, url);
    emit(buildNodeComplete('firecrawl', pages.length > 0, `${pages.length} pages`));
    emit(buildEdge(parentFor('firecrawl'), 'firecrawl'));
    emit(buildReportSection('company_snapshot', 'Company Snapshot', { summary: `${pages.length} pages scraped` }));

    emit(buildNodeStart('perplexity', 'quick'));
    webIntel = await traceWebIntelligence(ledger, domain);
    emit(buildNodeComplete('perplexity', Boolean(webIntel && !webIntel.error), webIntel?.summary ?? 'ok'));
    emit(buildEdge(parentFor('perplexity'), 'perplexity'));
    emit(buildReportSection('web_intelligence', 'Web Intelligence', { summary: webIntel?.summary ?? 'No web intelligence' }));

    emit(buildNodeStart('dns', 'quick'));
    reconPipeline = await traceRecon(ledger, url, domain, pages);
    const reconOk = Boolean(reconPipeline && !reconPipeline.error);
    emit(buildNodeComplete('dns', reconOk, 'recon complete'));
    emit(buildEdge(parentFor('dns'), 'dns'));
    emit(buildReportSection('email_security', 'Email Security', { summary: reconPipeline?.dns?.dmarc ?? 'DNS checked' }));
    if (reconPipeline?.ssl) emit(buildReportSection('tls', 'TLS / Certificate', { summary: reconPipeline.ssl.grade ?? 'graded' }));
    if (reconPipeline?.hibp) emit(buildReportSection('breach', 'Data Breach History', { summary: reconPipeline.hibp.breachCount ? `${reconPipeline.hibp.breachCount} breaches` : 'No breaches found' }));

    // ── QUICK STOP CHECK ────────────────────────────────────────────────────
    if (__graphStopped) {
      emit(buildComplete('quick'));
      graphServer.close();
      return;
    }

    // ── STANDARD PHASE ──────────────────────────────────────────────────────
    emit(buildDepthChange('standard', 'Moved to standard'));

    emit(buildNodeStart('vector', 'standard'));
    vector = await traceVector(ledger, pages);
    emit(buildNodeComplete('vector', vector.ok, `signals=${Object.keys(vector.extracted ?? {}).length}`));
    emit(buildEdge(parentFor('vector'), 'vector'));
    emit(buildReportSection('signal_extraction', 'Signal Extraction', { summary: `stage=${vector.extracted?.stage ?? 'unknown'} sector=${vector.extracted?.sector ?? 'unknown'}` }));

    // ── STANDARD STOP CHECK ─────────────────────────────────────────────────
    if (__graphStopped) {
      emit(buildComplete('standard'));
      graphServer.close();
      return;
    }

    // ── INTERACTIVE PHASE (no stop — waiting for user) ───────────────────────
    emit(buildInteractive('Confirm your details in the terminal'));

    const signals = [
      ...signalsFromExtraction(vector.extracted, vector.ok),
      ...signalsFromWebIntel(webIntel),
    ];
    for (const signal of signals) {
      ledger.event('INFER', signal.type, `value=${signal.value} confidence=${signal.confidence} source=${signal.source}`, signal);
    }

    const baseResult = buildBaseContext(signals, reconPipeline);
    reconContext = baseResult.reconContext;
    const promptExtraction = {
      ...vector.extracted,
      stage: baseResult.context.stage || vector.extracted.stage,
      sector: baseResult.context.sector || vector.extracted.sector,
      geo_market: baseResult.context.geo_market || vector.extracted.geo_market,
    };
    const founderResult = await collectFounderContext(ledger, baseResult.context, promptExtraction, reconContext);
    context = founderResult.context;
    fieldStates = founderResult.fieldStates;
    founderAnswers = founderResult.founderAnswers;

    // Save session for future --rerender / --edit
    const reconSourceStatus = Object.fromEntries(ledger.sourceStatus);
    const sessionPath = saveSession(domain, { pages, reconPipeline, vector, webIntel, context, fieldStates, founderAnswers, reconSourceStatus });
    line(dim(`Session saved: ${sessionPath}`));
  }

  // ── DEEP PHASE ──────────────────────────────────────────────────────────
  emit(buildDepthChange('deep', 'Going deep now'));

  emit(buildNodeStart('corpus', 'deep'));
  const corpus = await loadCorpus(ledger);
  emit(buildNodeComplete('corpus', Boolean(corpus), corpus ? 'loaded' : 'unavailable'));
  emit(buildEdge(parentFor('corpus'), 'corpus'));
  if (corpus) emit(buildReportSection('evidence_sources', 'Evidence Sources', { summary: 'CORPUS loaded' }));

  emit(buildNodeStart('gap_analysis', 'deep'));
  const gapResult = await analyseGaps(ledger, corpus, context, fieldStates);
  emit(buildNodeComplete('gap_analysis', true, `${gapResult.gaps.length} gaps`));
  emit(buildEdge(parentFor('gap_analysis'), 'gap_analysis'));
  emit(buildReportSection('trust_gaps', 'Trust Gaps', { summary: `${gapResult.gaps.length} gaps identified` }));

  const vendorMatrix = buildVendorMatrix(ledger, gapResult.gaps);

  emit(buildNodeStart('aws_programs', 'deep'));
  const awsResults = evaluateAwsPrograms(ledger, context, fieldStates);
  emit(buildNodeComplete('aws_programs', true, `${awsResults.eligible?.length ?? 0} programs`));
  emit(buildEdge(parentFor('aws_programs'), 'aws_programs'));
  if (awsResults.eligible?.length) emit(buildReportSection('programs', 'AWS Programs', { summary: `${awsResults.eligible.length} eligible programs` }));

  emit(buildComplete(null));

  printSurface(domain, vector.extracted, webIntel, reconContext, gapResult.gaps);
  printGapDossier(gapResult.gaps);
  printVendorMatrix(vendorMatrix);
  printCyberInsurance(gapResult.gaps);
  printAwsPrograms(awsResults);
  hr('=');
  line(bold('Full evidence record'));
  printDocuments(pages);
  printWebIntelligence(webIntel);
  printEvidenceQuality({
    pages,
    ledger,
    vector,
    webIntel,
    corpusAvailable: Boolean(corpus),
    founderAnswers,
    gaps: gapResult.gaps,
  });
  printProvenanceBlock({ ledger, pages, vector, webIntel, corpusAvailable: Boolean(corpus), founderAnswers, gaps: gapResult.gaps, trustScore: gapResult.trustScore });
  hr('=');
  graphServer?.close();
}

main().catch((err) => {
  console.error(`${C.red}Fatal: ${err.stack || err.message}${C.reset}`);
  process.exit(1);
});
