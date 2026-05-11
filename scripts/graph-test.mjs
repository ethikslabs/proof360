import { createGraphServer } from '../src/graph-server.mjs';
import { emit, buildNodeStart, buildNodeComplete, buildEdge, buildDepthChange,
         buildInteractive, buildComplete, buildReportSection } from '../src/graph-events.mjs';
import { exec } from 'node:child_process';

const server = await createGraphServer();
const { port } = server.address();
const url = `http://localhost:${port}/graph`;

exec(`open "${url}" 2>/dev/null || xdg-open "${url}" 2>/dev/null`);
console.log(`\n  proof360 graph test harness`);
console.log(`  companion: ${url}`);
console.log(`  watch the graph build — Export SVG when done\n`);

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  await delay(1500); // let browser open

  // ── QUICK PHASE ─────────────────────────────────────────────────────────
  emit(buildDepthChange('quick', 'Loading quick...'));
  await delay(800);

  emit(buildNodeStart('firecrawl', 'quick'));
  await delay(1200);
  emit(buildNodeComplete('firecrawl', true, '4 pages scraped'));
  emit(buildEdge('entity', 'firecrawl'));
  emit(buildReportSection('company_snapshot', 'Company Snapshot', { summary: 'B2B SaaS · Series B · 120 employees · AU/US markets' }));
  await delay(600);

  emit(buildNodeStart('perplexity', 'quick'));
  await delay(1800);
  emit(buildNodeComplete('perplexity', true, 'recent news indexed'));
  emit(buildEdge('entity', 'perplexity'));
  emit(buildReportSection('web_intelligence', 'Web Intelligence', { summary: 'No recent security incidents. $12M Series B announced March 2025.' }));
  await delay(500);

  emit(buildNodeStart('dns', 'quick'));
  await delay(1000);
  emit(buildNodeComplete('dns', true, 'DMARC: p=none — spoofing risk'));
  emit(buildEdge('entity', 'dns'));
  emit(buildReportSection('email_security', 'Email Security', { summary: 'DMARC policy p=none — email spoofing possible. SPF configured.' }));
  emit(buildReportSection('tls', 'TLS / Certificate', { summary: 'Grade A. TLS 1.3. 47 subdomains detected.' }));
  emit(buildReportSection('breach', 'Data Breach History', { summary: '1 breach on record (2021, 3,400 accounts). Resolved.' }));
  await delay(800);

  // ── STANDARD PHASE ───────────────────────────────────────────────────────
  emit(buildDepthChange('standard', 'Moved to standard'));
  await delay(600);

  emit(buildNodeStart('vector', 'standard'));
  await delay(2200);
  emit(buildNodeComplete('vector', true, 'signals=14 stage=series-b sector=saas'));
  emit(buildEdge('firecrawl', 'vector'));
  emit(buildReportSection('signal_extraction', 'Signal Extraction', { summary: 'Stage: Series B · Sector: B2B SaaS · Cloud: AWS · Team: 120 · Handles PII: yes' }));
  await delay(600);

  // ── INTERACTIVE PAUSE ────────────────────────────────────────────────────
  emit(buildInteractive('Confirm your details in the terminal'));
  await delay(3000); // simulate user answering questions

  // ── DEEP PHASE ───────────────────────────────────────────────────────────
  emit(buildDepthChange('deep', 'Going deep now'));
  await delay(800);

  emit(buildNodeStart('corpus', 'deep'));
  await delay(1400);
  emit(buildNodeComplete('corpus', true, 'loaded — 847 claims, 23 entities'));
  emit(buildEdge('entity', 'corpus'));
  emit(buildReportSection('evidence_sources', 'Evidence Sources', { summary: '23 CORPUS entities matched. SOC 2 Type II benchmark loaded.' }));
  await delay(600);

  emit(buildNodeStart('gap_analysis', 'deep'));
  await delay(2000);
  emit(buildNodeComplete('gap_analysis', true, '4 gaps identified'));
  emit(buildEdge('vector', 'gap_analysis'));
  emit(buildReportSection('trust_gaps', 'Trust Gaps', { summary: '4 gaps: DMARC enforcement (high), Pen test (high), AI governance (medium), Backup DR (medium)' }));
  await delay(500);

  emit(buildNodeStart('aws_programs', 'deep'));
  await delay(800);
  emit(buildNodeComplete('aws_programs', true, '2 programs eligible'));
  emit(buildEdge('entity', 'aws_programs'));
  emit(buildReportSection('programs', 'AWS Programs', { summary: 'Eligible: AWS Activate (credits), AWS ISV Accelerate (co-sell)' }));
  await delay(600);

  // ── DONE ─────────────────────────────────────────────────────────────────
  emit(buildComplete(null));
  console.log('  scan complete — click "Export SVG receipt" in the browser');
  console.log('  server stays alive — Ctrl+C to stop\n');

  await new Promise(() => {}); // stay alive indefinitely
}

run().catch(err => { console.error(err); server.close(); });
