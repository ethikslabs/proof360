// api/tests/unit/cold-reading.test.js
// "The reading" (John ruling 2026-08-25 — Mentalist/Sherlock register, not a smart-ass;
// mid-build amendment: mandatory clues→connection→invite structure, deterministic
// reading_anchors, and a live corpus lookup). The whole feature lives or dies on hedge
// words being BOUND to evidence grade, so these tests assert the prompt actually says
// so and actually carries only the facts the session has grades for — never a fact the
// session doesn't have, never a fabricated grade. Anchors are asserted to be derived
// deterministically from the same inputs, not from the model's output. Honest
// degradation: Bedrock failure or empty output → { reading: null, anchors: [] },
// never a canned substitute.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/inference.js', () => ({
  chatComplete: vi.fn(),
}));

vi.mock('../../src/services/corpus-retrieve.js', () => ({
  retrieveCorpusEvidence: vi.fn(),
}));

import { chatComplete } from '../../src/lib/inference.js';
import { retrieveCorpusEvidence } from '../../src/services/corpus-retrieve.js';
import { generateReading, buildReadingContext } from '../../src/services/cold-reading.js';

function baseSession(overrides = {}) {
  return {
    id: 'sess_1',
    company_name: 'Acme',
    website_url: 'https://acme.example',
    pages_read_count: 3,
    inferences: [
      { inference_id: 'inf_product_type', label: 'B2B SaaS product', confidence: 'confident' },
      { inference_id: 'inf_customer_type', label: 'Targeting enterprise (b2b) buyers', confidence: 'likely' },
      { inference_id: 'inf_stage', label: 'Seed stage', confidence: 'probable' },
    ],
    raw_signals: [
      { type: 'product_type', value: 'B2B SaaS', confidence: 'confident' },
      { type: 'customer_type', value: 'Enterprise (B2B)', confidence: 'confident' },
    ],
    company_summary: 'Acme builds compliance tooling for enterprise SaaS buyers in AU/NZ.',
    used_web_research: true,
    research_engines: ['perplexity', 'gemini'],
    recon_context: {
      dns: { dmarc_policy: 'reject' },
      ip: { cloud_provider: 'aws', hosting_provider: 'AWS' },
      ssllabs: { ssl_grade: 'A' },
      jobs: { found: true, security_hire_signal: true },
      hibp: { domain_in_breach: true, breach_count: 2 },
    },
    ...overrides,
  };
}

function mockChatOnce(text) {
  chatComplete.mockResolvedValueOnce({ choices: [{ message: { content: text } }] });
}

beforeEach(() => {
  vi.clearAllMocks();
  retrieveCorpusEvidence.mockResolvedValue(null); // honest absence by default
});

describe('buildReadingContext — prompt', () => {
  it('contains the hedge-binding instruction and every supplied fact with its grade', async () => {
    const { prompt } = await buildReadingContext(baseSession());

    // The binding rule itself
    expect(prompt).toMatch(/HEDGE-BINDING RULE/);
    expect(prompt).toMatch(/we can see' \/ 'we did see/);
    expect(prompt).toMatch(/it looks like' \/ 'probably' \/ 'we think/);

    // Mandatory structure (mid-build amendment)
    expect(prompt).toMatch(/STRUCTURE/);
    expect(prompt).toMatch(/CLUES/);
    expect(prompt).toMatch(/CONNECTION/);
    expect(prompt).toMatch(/INVITE/);

    // STRONG recon facts (direct-probe)
    expect(prompt).toMatch(/\[STRONG\].*Hosting \/ cloud provider: aws/);
    expect(prompt).toMatch(/\[STRONG\].*DMARC enforced \(p=reject\)/);
    expect(prompt).toMatch(/\[STRONG\].*Breach history: 2 known breach\(es\)/);
    expect(prompt).toMatch(/\[STRONG\].*Security hiring signal: actively hiring/);
    expect(prompt).toMatch(/\[STRONG\].*SSL Labs grade: A/);

    // Inference facts, hedge bound to their own confidence
    expect(prompt).toMatch(/\[STRONG\].*confidence: confident.*B2B SaaS product/);
    expect(prompt).toMatch(/\[HEDGE\].*confidence: likely.*Targeting enterprise \(b2b\) buyers/);
    expect(prompt).toMatch(/\[HEDGE\].*confidence: probable.*Seed stage/);

    // Company summary — always HEDGE register
    expect(prompt).toMatch(/\[HEDGE\].*Company summary \(market read\).*Acme builds compliance tooling/);

    // Forbidden vocabulary instruction present
    expect(prompt).toMatch(/obviously/);
    expect(prompt).toMatch(/elementary/);
    expect(prompt).toMatch(/numeric score/);

    // R-2: commentary-on-signals and generic category wisdom are forbidden too
    expect(prompt).toMatch(/interesting/);
    expect(prompt).toMatch(/notably/);
    expect(prompt).toMatch(/fascinating/);
    expect(prompt).toMatch(/mixed signals here/);
    expect(prompt).toMatch(/common for X companies/);
    expect(prompt).toMatch(/typical of the\s+industry/);
    expect(prompt).toMatch(/never about their\s+category/);

    // Frameworks resolved from customer_type = Enterprise (B2B)
    expect(prompt).toMatch(/SOC 2/);
    expect(prompt).toMatch(/ISO 27001/);
  });

  it('does not mention facts absent from the session', async () => {
    const session = baseSession({
      inferences: [],
      raw_signals: [],
      company_summary: null,
      recon_context: {},
    });
    const { prompt } = await buildReadingContext(session);

    expect(prompt).not.toMatch(/DMARC/);
    expect(prompt).not.toMatch(/SSL Labs grade/);
    expect(prompt).not.toMatch(/Breach history/);
    expect(prompt).not.toMatch(/Security hiring signal/);
    expect(prompt).not.toMatch(/Hosting \/ cloud provider/);
    expect(prompt).not.toMatch(/Company summary/);
    expect(prompt).not.toMatch(/SOC 2/);
  });

  it('omits a specific fact when its source field is absent, leaving the rest intact', async () => {
    const session = baseSession();
    delete session.recon_context.ssllabs;
    const { prompt } = await buildReadingContext(session);

    expect(prompt).not.toMatch(/SSL Labs grade/);
    expect(prompt).toMatch(/DMARC enforced \(p=reject\)/);
  });

  it('includes corpus hits as CORPUS-graded material with an anti-quoting instruction, and never fabricates hits', async () => {
    retrieveCorpusEvidence.mockResolvedValue([
      { n: 1, slug: 'acme-raise', layer: 'evidence', text: 'Acme raised a Series A in 2025.', score: 0.9 },
    ]);
    const { prompt, anchors } = await buildReadingContext(baseSession());

    expect(prompt).toMatch(/\[CORPUS\].*our research suggests/);
    expect(prompt).toMatch(/Acme raised a Series A in 2025/);
    expect(prompt).toMatch(/never quote them/);
    expect(anchors).toContainEqual({ label: '1 corpus holding', source: 'corpus' });
  });

  it('corpus anchor counts DOCUMENTS, not chunks — two chunks of one document are one holding (round 3: anchor must agree with the citation cards)', async () => {
    retrieveCorpusEvidence.mockResolvedValue([
      { n: 1, slug: 'acme-raise', layer: 'evidence', text: 'Acme raised a Series A in 2025.', score: 0.9 },
      { n: 2, slug: 'acme-raise', layer: 'evidence', text: 'The round was led by Example Ventures.', score: 0.8 },
      { n: 3, slug: 'acme-team', layer: 'evidence', text: 'Acme has 12 employees.', score: 0.7 },
    ]);
    const { anchors } = await buildReadingContext(baseSession());

    expect(anchors).toContainEqual({ label: '2 corpus holdings', source: 'corpus' });
  });

  it('corpus unreachable (null) → no corpus material, no corpus anchor', async () => {
    retrieveCorpusEvidence.mockResolvedValue(null);
    const { prompt, anchors } = await buildReadingContext(baseSession());

    // The static hedge-binding rule always names the [CORPUS] tag (it's part of the
    // fixed instruction table); what must NOT appear is an actual [CORPUS] evidence
    // LINE — that only exists when corpus hits were returned.
    expect(prompt).not.toMatch(/^- \[CORPUS\]/m);
    expect(anchors.find((a) => a.source === 'corpus')).toBeUndefined();
  });

  // Finding 1 (live rehearsal): retrieveCorpusEvidence's three-state contract
  // (corpus-retrieve.js) distinguishes "could not look" (null) from "looked, reached
  // fine, nothing scored" ([]) — but for the READING prompt both are honest absence:
  // neither state gives the model any corpus material to reason from.
  it('corpus reached, zero hits ([]) → same honest absence as null, no corpus material, no corpus anchor', async () => {
    retrieveCorpusEvidence.mockResolvedValue([]);
    const { prompt, anchors } = await buildReadingContext(baseSession());

    expect(prompt).not.toMatch(/^- \[CORPUS\]/m);
    expect(anchors.find((a) => a.source === 'corpus')).toBeUndefined();
  });

  // The session-level cache (session-start.js's corpus act) short-circuits the live
  // retrieveCorpusEvidence call entirely — corpusEvidence() must treat a cached []
  // exactly the same as a cached null, never re-attempt, never fabricate material.
  it('cached session.corpus_hits === [] (attempted at scan time, zero hits) → same honest absence, retrieveCorpusEvidence never called', async () => {
    const session = baseSession({ corpus_hits: [] });
    const { prompt, anchors } = await buildReadingContext(session);

    expect(prompt).not.toMatch(/^- \[CORPUS\]/m);
    expect(anchors.find((a) => a.source === 'corpus')).toBeUndefined();
    expect(retrieveCorpusEvidence).not.toHaveBeenCalled();
  });

  it('cached session.corpus_hits with real hits → uses the cache, retrieveCorpusEvidence never called', async () => {
    const session = baseSession({
      corpus_hits: [{ n: 1, slug: 'acme-raise', layer: 'evidence', text: 'Acme raised a Series A in 2025.', score: 0.9 }],
    });
    const { prompt, anchors } = await buildReadingContext(session);

    expect(prompt).toMatch(/\[CORPUS\].*our research suggests/);
    expect(prompt).toMatch(/Acme raised a Series A in 2025/);
    expect(anchors).toContainEqual({ label: '1 corpus holding', source: 'corpus' });
    expect(retrieveCorpusEvidence).not.toHaveBeenCalled();
  });
});

// Finding 2 (live rehearsal): recon-dns.js emits dmarc_policy:'unknown' when the
// _dmarc TXT lookup FAILED (SERVFAIL/timeout/refused) — see recon-dns.js's
// ABSENCE_CODES / guardedLookup and tests/unit/recon-dns-honesty.test.js. The old
// `if (ctx.dmarc_policy)` truthy check let a failed lookup anchor as a STRONG "we
// can see" fact. ABSENCE RULE: could-not-look ≠ looked-and-absent.
describe('reconEvidence — ABSENCE RULE: a failed DNS lookup must never anchor as "we can see"', () => {
  it('dmarc_policy "unknown" is excluded from both the prompt and the anchors', async () => {
    const session = baseSession({ recon_context: { dns: { dmarc_policy: 'unknown' } } });
    const { prompt, anchors } = await buildReadingContext(session);

    expect(prompt).not.toMatch(/DMARC posture/);
    expect(anchors.find((a) => a.label?.startsWith('DMARC'))).toBeUndefined();
  });

  // Finding 1 (live rehearsal, ground-truthed against `dig TXT _dmarc.cognisys.co.uk`
  // → v=DMARC1; p=none; a record EXISTS, monitoring-only): 'none' must never read as
  // "no DMARC record" — that is the factual overclaim that dies in front of a
  // pentest firm. Each policy value gets its own honest factline + anchor.
  it('missing → "no DMARC record published" factline, "DMARC: missing" anchor', async () => {
    const session = baseSession({ recon_context: { dns: { dmarc_policy: 'missing' } } });
    const { prompt, anchors } = await buildReadingContext(session);
    expect(prompt).toMatch(/\[STRONG\] no DMARC record published on the domain/);
    expect(prompt).not.toMatch(/DMARC posture/);
    expect(anchors).toContainEqual({ label: 'DMARC: missing', source: 'dns scan' });
  });

  it('none → "published but not enforcing (p=none)" factline, "DMARC: not enforcing" anchor — never "no record"', async () => {
    const session = baseSession({ recon_context: { dns: { dmarc_policy: 'none' } } });
    const { prompt, anchors } = await buildReadingContext(session);
    expect(prompt).toMatch(/\[STRONG\] a DMARC record is published but not enforcing \(p=none, monitoring only\)/);
    expect(prompt).not.toMatch(/no DMARC record/);
    expect(anchors).toContainEqual({ label: 'DMARC: not enforcing', source: 'dns scan' });
  });

  it('quarantine/reject → "DMARC enforced (p=<value>)" factline, "DMARC: enforced" anchor', async () => {
    for (const policy of ['quarantine', 'reject']) {
      const session = baseSession({ recon_context: { dns: { dmarc_policy: policy } } });
      const { prompt, anchors } = await buildReadingContext(session);
      expect(prompt, policy).toMatch(new RegExp(`\\[STRONG\\] DMARC enforced \\(p=${policy}\\)`));
      expect(anchors, policy).toContainEqual({ label: 'DMARC: enforced', source: 'dns scan' });
    }
  });
});

describe('buildReadingContext — anchors (deterministic, never from model output)', () => {
  it('emits one anchor per fact-group actually included in the prompt', async () => {
    const { anchors } = await buildReadingContext(baseSession());

    expect(anchors).toContainEqual({ label: 'aws hosting', source: 'ip probe' });
    expect(anchors).toContainEqual({ label: 'DMARC: enforced', source: 'dns scan' });
    expect(anchors).toContainEqual({ label: '2 known breach(es)', source: 'breach scan' });
    expect(anchors).toContainEqual({ label: 'Security hiring signal', source: 'jobs scan' });
    expect(anchors).toContainEqual({ label: 'SSL grade: A', source: 'ssl scan' });
    expect(anchors).toContainEqual({ label: 'Site narrative signals', source: 'site scrape' });
    expect(anchors).toContainEqual({ label: 'Company research · perplexity + gemini', source: 'perplexity+gemini' });
  });

  it('degraded read (0 pages) anchors "No pages readable" instead of site narrative signals', async () => {
    const session = baseSession({ pages_read_count: 0 });
    const { anchors } = await buildReadingContext(session);

    expect(anchors).toContainEqual({ label: 'No pages readable', source: 'scrape' });
    expect(anchors.find((a) => a.label === 'Site narrative signals')).toBeUndefined();
  });

  it('produces no anchors at all for an evidence-free session', async () => {
    const session = baseSession({
      inferences: [], raw_signals: [], company_summary: null, recon_context: {}, pages_read_count: 0,
    });
    const { anchors } = await buildReadingContext(session);

    // Only "No pages readable" survives — every other anchor requires a present fact.
    expect(anchors).toEqual([{ label: 'No pages readable', source: 'scrape' }]);
  });

  // I-1 (review ruling), truthful list (John ruling 2026-08-25): the anchor must
  // name exactly the engines that ran and answered — signal-extractor.js sets
  // research_engines to the real list, never a boolean.
  it('research_engines: [perplexity, gemini] → summary anchors names both engines', async () => {
    const { anchors } = await buildReadingContext(baseSession({ research_engines: ['perplexity', 'gemini'] }));
    expect(anchors).toContainEqual({ label: 'Company research · perplexity + gemini', source: 'perplexity+gemini' });
    expect(anchors.find((a) => a.label === 'Company summary')).toBeUndefined();
  });

  it('research_engines: [perplexity] only → summary anchors names just that engine', async () => {
    const { anchors } = await buildReadingContext(baseSession({ research_engines: ['perplexity'] }));
    expect(anchors).toContainEqual({ label: 'Company research · perplexity', source: 'perplexity' });
  });

  it('summary present but research_engines empty/absent → anchors as "Company summary" (site synthesis only, engines never ran)', async () => {
    const session = baseSession({ research_engines: [] });
    const { anchors } = await buildReadingContext(session);

    expect(anchors).toContainEqual({ label: 'Company summary', source: 'site synthesis' });
    expect(anchors.find((a) => a.label?.startsWith('Company research'))).toBeUndefined();
  });
});

describe('generateReading', () => {
  it('returns the trimmed model text with its anchors on success', async () => {
    mockChatOnce("  Your site talks enterprise procurement. We can see you're on AWS. So you're probably moving upmarket. That's what we see — anything to correct?  ");
    const { reading, anchors } = await generateReading(baseSession());

    expect(reading).toBe("Your site talks enterprise procurement. We can see you're on AWS. So you're probably moving upmarket. That's what we see — anything to correct?");
    expect(anchors.length).toBeGreaterThan(0);
  });

  it('chatComplete throwing → { reading: null, anchors: [] }, never throws', async () => {
    chatComplete.mockRejectedValueOnce(new Error('bedrock unreachable'));
    const result = await generateReading(baseSession());
    expect(result).toEqual({ reading: null, anchors: [] });
  });

  it('empty model output → { reading: null, anchors: [] }', async () => {
    mockChatOnce('');
    const result = await generateReading(baseSession());
    expect(result).toEqual({ reading: null, anchors: [] });
  });

  it('whitespace-only model output → { reading: null, anchors: [] }', async () => {
    mockChatOnce('   \n\t  ');
    const result = await generateReading(baseSession());
    expect(result).toEqual({ reading: null, anchors: [] });
  });
});

// ABSENCE RULE (John ruling 2026-08-25): no-evidence-of-cert must never become
// "they likely lack it" — the prompt carries the rule explicitly.
describe('absence rule in prompt', () => {
  it('prompt instructs never concluding lack from absent evidence', async () => {
    const { prompt } = await buildReadingContext(baseSession());
    expect(prompt).toMatch(/absence of evidence is never evidence of absence/i);
    expect(prompt).toMatch(/no public evidence of X/);
    expect(prompt).toMatch(/hold it without it being visible/);
  });
});
