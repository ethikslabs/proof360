// api/src/services/cold-reading.js — "the reading": a synthesized, human, hedged
// cold-read paragraph (John ruling 2026-08-25 — "like the Mentalist or Sherlock Holmes
// but not a smart ass": the warmth of being accurately seen, zero performance of
// cleverness). One Bedrock call over evidence already sitting on the session, plus a
// live corpus lookup for additional graded material.
//
// Hard rule this feature lives or dies on (John ruling, verbatim): hedge words are
// BOUND to evidence grade. A direct-probe/technical-scan fact or a 'confident'-grade
// inference reads as "we can see / we did see"; a 'likely' or 'probable' inference —
// still a guess read off marketing copy — reads as "it looks like / probably / we
// think"; a corpus holding reads as "our research suggests"; anything without a
// recognised grade is left out of the evidence list entirely (NOT MENTIONED), never
// spoken as if it were known.
//
// Structure (John ruling, mid-build amendment): the reading is a reveal, not a
// verdict — clues named plainly, then the natural connection drawn from them, then a
// handover invite. See buildReadingPrompt's STRUCTURE block.
//
// INVARIANTS.md's honest-degradation + no-canned-text rules and the EXCERPT-NOT-VOICE
// canon ruling (docs/plans/2026-08-25-persona-chips-and-proposal-cards.md) both apply:
// the model synthesizes in its own words, never quotes evidence (corpus text included)
// verbatim, and is forbidden from adding any fact from its own knowledge of the company.
//
// reading_anchors are derived DETERMINISTICALLY from the same inputs fed into the
// prompt — never parsed from the model's output — so the anchor trail is trustworthy
// even though the paragraph above it is generated prose.
//
// Bedrock failure or empty/whitespace output → { reading: null, anchors: [] }. No
// retry, no canned substitute — the caller (analyze.js) falls back to the existing
// bullet opener silently, and the anchor chips disappear with it (the two are atomic).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chatComplete } from '../lib/inference.js';
import { extractReconContext } from './recon-pipeline.js';
import { retrieveCorpusEvidence } from './corpus-retrieve.js';
import { FRAMEWORK_MAP } from '../config/frameworks.js';
import { resolve as resolveModel } from '../lib/model-resolver.mjs';

// Model resolution mirrors signal-extractor.js: ask the vendored registry for the
// role's model instead of hardcoding an id that can silently deprecate. The registry
// has no 'cold-reading' role yet — resolveModel throws ModelResolutionError for an
// unknown role, which we catch and fall back to the pre-registry hardcoded id, so
// behavior is IDENTICAL until the role is actually registered (same fallback
// discipline signal-extractor.js relies on, just with an explicit last-resort here
// rather than a registry-declared fallback chain).
const _registry = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../config/models.registry.json'), 'utf8'));
const FALLBACK_MODEL = 'claude-haiku-4-5-20251001';

function resolveReadingModel() {
  try {
    return resolveModel('cold-reading', { registry: _registry, onLedger: () => {} }).model;
  } catch {
    return FALLBACK_MODEL;
  }
}

const MAX_TOKENS = 300;

const STRONG = { tag: 'STRONG', instruction: "say 'we can see' / 'we did see' — plain, not boastful" };
const HEDGE = { tag: 'HEDGE', instruction: "say 'it looks like' / 'probably' / 'we think' — never state it as certain" };
const CORPUS = { tag: 'CORPUS', instruction: "say 'our research suggests' — a third-party holding, not our own probe" };

// Inference confidence collapses three grades to two hedge registers: 'confident' is
// close enough to a direct-probe fact to read STRONG; 'likely' and 'probable' are both
// still a guess read off marketing copy, so both read HEDGE. Anything else (missing or
// unrecognised) is NOT MENTIONED — excluded from the evidence list entirely.
function inferenceHedge(confidence) {
  if (confidence === 'confident') return STRONG;
  if (confidence === 'likely' || confidence === 'probable') return HEDGE;
  return null;
}

// customer_type inference value → frameworks.js key. Only the two values that map
// cleanly onto a FRAMEWORK_MAP key are wired; 'Consumer (B2C)' / 'Mixed' / 'Unknown'
// have no defensible mapping and are left unresolved on purpose — frameworks are
// omitted rather than guessed.
const CUSTOMER_TYPE_TO_FRAMEWORK_KEY = {
  'Enterprise (B2B)': 'enterprise',
  'SMB (B2B)': 'smb',
};

const FRAMEWORK_LABELS = {
  soc2: 'SOC 2',
  iso27001: 'ISO 27001',
  apra_cps234: 'APRA CPS 234',
  pci_dss: 'PCI DSS',
  irap: 'IRAP',
  essential_eight: 'Essential Eight',
  basic_controls: 'basic security controls',
};

function factLine(hedge, label, value, confidence) {
  const detail = confidence ? ` (confidence: ${confidence})` : '';
  const text = value != null ? `${label}: ${value}` : label;
  return `- [${hedge.tag}]${detail} ${text}`;
}

// Direct-probe / technical-scan facts (DNS, HTTP, IP, SSL Labs, HIBP, jobs) — never an
// LLM narrative read, always STRONG. Only the fields named in the task are surfaced:
// hosting/cloud provider, DMARC posture, breach count, security-hiring signal, SSL
// grade. Each fact carries its own anchor (one recon source = one anchor group), and
// is included only when the recon pipeline actually captured it — absence is silence,
// not a fact.
function reconEvidence(session) {
  const ctx = extractReconContext(session?.recon_context);
  const lines = [];
  const anchors = [];

  const cloud = ctx.cloud_provider || ctx.hosting_provider;
  if (cloud) {
    lines.push(factLine(STRONG, 'Hosting / cloud provider', cloud));
    anchors.push({ label: `${cloud} hosting`, source: 'ip probe' });
  }

  // 'unknown' is recon-dns.js's sentinel for a FAILED _dmarc TXT lookup (SERVFAIL /
  // timeout / refused) — not a real observation. A failed look must never anchor as
  // "we can see" (ABSENCE RULE: could-not-look ≠ looked-and-absent). 'missing' /
  // 'none' / 'quarantine' / 'reject' are genuine, legitimate observations.
  //
  // 'none' is NOT "no DMARC record" — a record IS published, just in monitoring-only
  // mode (p=none). Collapsing 'none' into "no record" is the exact factual overclaim
  // that dies in front of a pentest firm (live rehearsal finding, ground-truthed
  // against `dig TXT _dmarc.cognisys.co.uk` → v=DMARC1; p=none; a record exists).
  // Each policy value gets its own honest factline/anchor pair.
  if (ctx.dmarc_policy === 'missing') {
    lines.push(factLine(STRONG, 'no DMARC record published on the domain'));
    anchors.push({ label: 'DMARC: missing', source: 'dns scan' });
  } else if (ctx.dmarc_policy === 'none') {
    lines.push(factLine(STRONG, 'a DMARC record is published but not enforcing (p=none, monitoring only)'));
    anchors.push({ label: 'DMARC: not enforcing', source: 'dns scan' });
  } else if (ctx.dmarc_policy === 'quarantine' || ctx.dmarc_policy === 'reject') {
    lines.push(factLine(STRONG, `DMARC enforced (p=${ctx.dmarc_policy})`));
    anchors.push({ label: 'DMARC: enforced', source: 'dns scan' });
  }

  if (ctx.domain_in_breach && ctx.breach_count) {
    lines.push(factLine(STRONG, 'Breach history', `${ctx.breach_count} known breach(es) on record`));
    anchors.push({ label: `${ctx.breach_count} known breach(es)`, source: 'breach scan' });
  }

  if (ctx.security_hire_signal === true) {
    lines.push(factLine(STRONG, 'Security hiring signal', 'actively hiring for a security role'));
    anchors.push({ label: 'Security hiring signal', source: 'jobs scan' });
  }

  if (ctx.ssl_grade) {
    lines.push(factLine(STRONG, 'SSL Labs grade', ctx.ssl_grade));
    anchors.push({ label: `SSL grade: ${ctx.ssl_grade}`, source: 'ssl scan' });
  }

  return { lines, anchors };
}

// session.inferences — the LLM's narrative read of the marketing pages. Each carries
// its own confidence grade; hedge is bound to that grade per inferenceHedge() above.
// Collapsed to a single anchor group (site narrative signals) rather than one anchor
// per inference — these all share one source (the same page scrape + extraction call).
function inferenceEvidence(session) {
  const list = Array.isArray(session?.inferences) ? session.inferences : [];
  const lines = [];
  for (const inf of list) {
    if (!inf?.label) continue;
    const hedge = inferenceHedge(inf.confidence);
    if (!hedge) continue; // unrecognised/missing grade → NOT MENTIONED
    lines.push(factLine(hedge, inf.label, null, inf.confidence));
  }
  return lines;
}

// session.company_summary — a holistic market read (industry, buyer, geography), fed
// by the scraped pages plus recon-company.js's live perplexity/gemini research where
// available. Always HEDGE register ("we think you're in…") — never promoted to
// STRONG, because it is a synthesis, not a direct probe.
function companySummaryEvidence(session) {
  const summary = typeof session?.company_summary === 'string' ? session.company_summary.trim() : '';
  if (!summary) return null;
  return factLine(HEDGE, 'Company summary (market read)', summary);
}

// Applicable compliance frameworks, resolved from the customer_type inference only
// (never invented, never sourced from the model's own knowledge). Returns display
// labels — never asserted as required, only offered to the prompt as a possible
// question to raise.
function resolveFrameworks(session) {
  const list = Array.isArray(session?.raw_signals) ? session.raw_signals : [];
  const customerType = list.find((s) => s?.type === 'customer_type')?.value;
  const key = CUSTOMER_TYPE_TO_FRAMEWORK_KEY[customerType];
  const ids = key ? FRAMEWORK_MAP[key] : null;
  if (!ids || !ids.length) return [];
  return ids.map((id) => FRAMEWORK_LABELS[id] || id);
}

function domainOf(session) {
  const url = session?.website_url;
  if (!url) return null;
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname;
  } catch {
    return url;
  }
}

// Shared with the corpus act (session-start.js step 8) so the scan-time cache
// lookup and this read-time lookup are provably the SAME retrieval — same
// query construction, one call, one bill.
export function corpusQueryFor(session) {
  return session?.company_name || domainOf(session);
}

// Corpus evidence — cache-first (John ruling 2026-08-25: retrieval moved to
// scan time, the corpus act in session-start.js, so the reading never re-bills
// it). Cache contract on session.corpus_hits (retrieveCorpusEvidence's three-state
// contract, corpus-retrieve.js): field ABSENT = never attempted (fall back to a
// live retrieval here, e.g. an older session from before this cache existed);
// `null` = attempted, could NOT look — unreachable/timeout/!ok (no retry); `[]` =
// attempted, reached fine, nothing scored (also honest absence, also no retry —
// distinct reasons, same treatment here); a non-empty array = the hits. Either
// null or [] → no corpus material in the prompt, no corpus anchor — the model
// reasons from this material in its own words, never quoting it (EXCERPT-NOT-VOICE).
async function corpusEvidence(session) {
  let hits;
  if (Object.prototype.hasOwnProperty.call(session || {}, 'corpus_hits')) {
    hits = session.corpus_hits; // null (could not look) or an array, possibly empty (looked) — no retry either way
  } else {
    const query = corpusQueryFor(session);
    hits = query ? await retrieveCorpusEvidence(query, { company_name: session?.company_name }).catch(() => null) : null;
  }
  if (!hits?.length) return { lines: [], anchor: null };

  const lines = hits.map((h) => factLine(CORPUS, 'Corpus holding', (h.text || '').replace(/\s+/g, ' ').trim()));
  // The anchor counts DOCUMENTS (distinct slugs), not chunks — it sits directly
  // above the citation cards, which group chunks by document; "4 corpus holdings"
  // over "3 sources" read as a contradiction (round-3 walkthrough finding).
  const docCount = new Set(hits.map((h) => h.slug ?? h.evidence_id ?? h.n)).size;
  const anchor = { label: `${docCount} corpus holding${docCount === 1 ? '' : 's'}`, source: 'corpus' };
  return { lines, anchor };
}

export async function buildReadingContext(session) {
  const recon = reconEvidence(session);
  const inferenceLines = inferenceEvidence(session);
  const summaryLine = companySummaryEvidence(session);
  const frameworks = resolveFrameworks(session);
  const pagesRead = Number(session?.pages_read_count) || 0;
  const corpus = await corpusEvidence(session);

  const anchors = [...recon.anchors];
  if (pagesRead === 0) {
    anchors.push({ label: 'No pages readable', source: 'scrape' });
  } else if (inferenceLines.length) {
    anchors.push({ label: 'Site narrative signals', source: 'site scrape' });
  }
  // I-1 (review ruling), truthful list (John ruling 2026-08-25): only claim the
  // engines that actually ran and answered. signal-extractor.js threads
  // research_engines — the real list ('perplexity', 'gemini', both, or neither)
  // — onto the session; a summary can exist purely from site-page synthesis (no
  // engines contributed), and that must never be presented as "company research".
  const engines = Array.isArray(session?.research_engines) ? session.research_engines : [];
  if (summaryLine) {
    anchors.push(engines.length
      ? { label: `Company research · ${engines.join(' + ')}`, source: engines.join('+') }
      : { label: 'Company summary', source: 'site synthesis' });
  }
  if (corpus.anchor) anchors.push(corpus.anchor);

  const evidenceLines = [...recon.lines, ...inferenceLines];
  if (summaryLine) evidenceLines.push(summaryLine);
  evidenceLines.push(...corpus.lines);

  const lines = [
    'You are writing "the reading" — a short, warm, deductive opening paragraph a',
    'founder sees right after we read their public record.',
    '',
    'Register: like the Mentalist or Sherlock Holmes, but NOT a smart-ass — the warmth',
    'of being accurately seen, with zero performance of cleverness.',
    '',
    `Company: ${session?.company_name || 'unknown'}`,
    `Pages actually read from their site: ${pagesRead}.`,
    '',
    'EVIDENCE — the ONLY facts you may use. Do not add anything about this company, or',
    'companies like it, from your own knowledge:',
    evidenceLines.length ? evidenceLines.join('\n') : '(no graded evidence available)',
    '',
    'HEDGE-BINDING RULE — follow exactly, this is the rule the whole feature lives or',
    'dies on:',
    `- Facts marked [STRONG]: ${STRONG.instruction}.`,
    `- Facts marked [HEDGE]: ${HEDGE.instruction}.`,
    `- Facts marked [CORPUS]: ${CORPUS.instruction}.`,
    '- Never upgrade a HEDGE or CORPUS fact into confident language, and never hedge a',
    '  STRONG fact.',
    '- Never mention any fact not listed above.',
  ];

  if (frameworks.length) {
    lines.push(
      '',
      'Possible compliance angle(s) worth raising AS A QUESTION, never as an assertion',
      `or a prescription: ${frameworks.join(', ')}. Only raise one of these if it`,
      'plausibly follows from the evidence above — never invent a framework not listed here.',
    );
  }

  lines.push(
    '',
    'STRUCTURE — follow this exact three-beat shape (a reveal, not a verdict; the',
    'reader should feel "all the clues were sitting there"):',
    '  WHICH CLUES — the read is about WHERE THIS COMPANY STANDS, not how it is wired.',
    '  Open on the business: what they sell, how big they are, where they operate, how',
    '  long they have been at it, what position they claim and who confers it. Those are',
    '  the clues a founder recognises as being about them.',
    '  Infrastructure and email/certificate posture facts, where any appear above, are',
    '  admissible ONLY when beat 2 genuinely turns on them — never as an opener, and never',
    '  as filler because they are the most concrete facts available. They usually ARE the',
    '  most concrete, and that is exactly the trap: concreteness is not relevance. Naming',
    '  a technical detail first tells the founder we were inspecting them rather than',
    '  reading them; it is like opening with a chef by naming the brand of their oven.',
    '  Every word can be true and still none of it be about their business.',
    '  So: open on the shape of the business — its size, its reach, how long it has been',
    '  going, what it sells, and the position the record credits it with. Only then, and',
    '  only if it carries the argument, anything technical.',
    '  1. CLUES — 2-3 SHORT sentences, each stating ONE observation PLAINLY, hedged per',
    '     its own grade above. Zero interpretation in this beat — no adjectives that',
    '     characterize what the observation MEANS, no framing, no editorializing. State',
    '     the fact and stop. Interpretation belongs ONLY in beat 2 (CONNECTION), never',
    '     folded into a clue.',
    '     Right (clue, flat): "Your jobs are in Sydney and Singapore."',
    '     Wrong (clue with interpretation smuggled in — do NOT write like this):',
    '     "Your APAC-focused hiring shows you\'re scaling regionally." — that is a',
    '     conclusion wearing a clue\'s clothing; the interpretation ("APAC-focused",',
    '     "scaling regionally") belongs in beat 2, not beat 1.',
    '  2. CONNECTION — one sentence drawing the natural conclusion from those clues,',
    "     framed as a conclusion (\"So …\"), never asserted harder than the underlying",
    '     grades allow.',
    '  3. INVITE — a short, genuine handover for the founder to correct anything wrong.',
    'Worked example of the shape (do not copy the wording, this is illustrative only):',
    '  "Your site talks enterprise procurement. You\'re hiring in Sydney and Singapore.',
    '  Your security page mentions AWS but no certification. So you\'re probably moving',
    '  upmarket into APAC — and compliance may be about to become a sales constraint.',
    '  That\'s what we see. Are we reading it correctly?"',
    '',
    'ABSENCE RULE — absence of evidence is never evidence of absence: if no public',
    'evidence of a certification/credential/control appears above, NEVER conclude the',
    'company likely lacks it. Say what is true — "we found no public evidence of X" —',
    'and, where it matters, offer both branches: they may not hold it yet, or they may',
    'hold it without it being visible where buyers and AI engines look. Either branch',
    'points the same way: the evidence is not yet legible to the people asking. This',
    'rule binds ABSOLUTELY when their own site could not be read (no pages readable):',
    'you have not seen the one place a badge would be.',
    'TRAIL-AS-SUBJECT — the reading describes their PUBLIC TRAIL, never their reality.',
    'Your industry inference itself comes from that same trail, so keep the grammar',
    'self-consistent: "the public record places you in healthcare; that same record',
    'shows no HIPAA evidence" — both clauses about what the internet says. Frame every',
    'absence as the record\'s silence ("the internet doesn\'t yet say…"), because that',
    'silence is exactly what buyers and AI engines will find when they look.',
    '',
    'NEVER EVALUATE THEM. Say what the record shows; never what it says about them. No',
    'shortcoming, no inconsistency, no gap between what they sell and what they do, no',
    'observation that something "catches the eye" or "raises a question" or is "the kind',
    'of thing" anyone would notice. Those are verdicts wearing an observation\'s clothes,',
    'and the reader feels graded rather than read.',
    'The shape to avoid: taking a posture observation and appending a clause about how it',
    'looks given what they do. That tells a company it is a hypocrite, from a stranger, in',
    'the first thirty seconds — and it is unfalsifiable commentary rather than a fact they',
    'can correct.',
    'This binds hardest where the company works in the same field as the observation: a',
    'security firm, an accountant, a compliance consultancy. Never hold what they sell up',
    'against what the record shows about them. State the fact, let them draw the line.',
    'Forbidden words/phrases: "obviously", "clearly", "elementary", "of course", any',
    'self-congratulation, any numeric score. Also forbidden: commentary ON the signals',
    'themselves — "interesting", "notably", "fascinating", "the mixed signals here…" —',
    'and generic category wisdom — "that\'s common for X companies", "typical of the',
    'industry". Every sentence must be about THEIR specific trail, never about their',
    'category — you are reading THIS company\'s evidence, not narrating what companies',
    'like it usually do.',
    '',
    'Write in your own words, synthesizing the evidence into a natural read — do not',
    'copy the evidence lines above verbatim into the paragraph, including any [CORPUS]',
    'lines (paraphrase corpus holdings, never quote them).',
    'FORMAT for a human eye — the three beats breathe as separate blocks:',
    '  - Beat 1 (CLUES): 2-3 short sentences, each on its OWN line.',
    '  - Blank line, then beat 2 (CONNECTION) as its own short paragraph.',
    '  - Blank line, then beat 3 (INVITE) alone on the final line.',
    'About 120 words or fewer in total. Plain prose only — no bullet points, no',
    'headers, no markdown, no numbering; the line breaks ARE the formatting.',
    '',
    'Reply with ONLY the paragraph — no preamble, no quotes around it, no labels.',
  );

  return { prompt: lines.join('\n'), anchors };
}

export async function generateReading(session) {
  try {
    const { prompt, anchors } = await buildReadingContext(session);
    const response = await chatComplete({
      model: resolveReadingModel(),
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      correlation_id: session?.id,
    });
    const text = response?.choices?.[0]?.message?.content;
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) return { reading: null, anchors: [] };
    return { reading: trimmed, anchors };
  } catch {
    return { reading: null, anchors: [] };
  }
}
