// The Mel Rivers / Hive & Co journey — the one-writer beat data for proof360.au/mel.
//
// Source of truth: _working/04_SITES/mel-journey.v1.json (canon: MEL RAIL ruling
// 2026-07-17). That file's own _meta says: "this file graduates into the proof360
// repo when /mel builds (PROOF360-MEL-RAIL-001); this copy then becomes a
// projection." This module IS that promotion.
//
// teachQ/teachA (the plain-English escape hatch) and cer (per-beat CER-forming
// state) were authored by Claude Design 2026-07-20 against ETHL-WRK-BRIEF-005 and
// verified word-for-word against the ratified NAMED TIMELINE ruling by Cowork/Alfred
// before this file was written. conversation[]/teach_point — the SEPARATE
// day-stamped persona REPLAY named in the BEACH DUMP ruling — are NOT yet authored;
// Design correctly stubbed that as a placeholder rather than fabricate it (see
// Mel.jsx's showReplaySlot). Design flagged that placeholder inline as
// "PROPOSED RULING pending John" — carried into CANON-ingram-play.md by Cowork.
//
// Beat IDs m1–m10 are APPEND-ONLY — never renumber, reorder, add, or drop a beat
// (mel-journey.v1.json _meta.link_law + the 2026-07-17 MEL RAIL ruling).

export const MEL_BEATS = [
  {
    id: 'm1', label: 'Kings Cross markets, Saturday', story: 'Honey on a trestle table.',
    suggestion: null, returns: false, lead: null, note: null, teachQ: null, teachA: null,
    entries: [], cer: null,
  },
  {
    id: 'm2', label: '"You should sell online."',
    story: 'The read finds Hive & Co from its public front door — no login. We suggest AWS Activate: credits fund the build, and Mel gets a developer.',
    suggestion: 'AWS Activate', returns: true, lead: 'edison',
    note: { k: 'AWS is the wedge, not the premise', v: 'The journey stands with or without the credits program — AWS just funds the first build and leaves the richest evidence trail behind it.' },
    teachQ: 'What does "no login" actually mean here?',
    teachA: 'The first read is entirely from the public front door — the live website, its certificates, its headers, what any search can already see. Nothing private, no password, no cooperation from Mel. It is exactly what an enterprise buyer or an investor could find on their own, gathered in one place.',
    entries: [
      { m: '●', t: 'Cold read #4821 — first read, from the public front door, no login', l: 'live' },
      { m: '◈', t: 'AWS Activate matched — credits + developer access', l: 'ill' },
    ],
    cer: {
      id: 'CER-8F3A', route: 'AWS Activate → Ingram Micro', status: 'Booked', tone: 'ok',
      need: 'No cloud cost/scale foundation as online orders grow',
      evidence: 'Cold read #4821 (live) · hosting detected 2026-07-19 · stage: early',
      consent: 'granted 2026-07-19 · revocable', visibility: 'Ingram projection · records, never deals',
      pending: [],
    },
  },
  {
    id: 'm3', label: 'The shop is live, orders grow', story: 'We suggest backup — before the first bad day.',
    suggestion: 'Backup & disaster recovery', returns: true, lead: 'edison', note: null,
    teachQ: 'Why back up before anything has gone wrong?',
    teachA: 'Backup is the one control you can only put in place before you need it. The first bad day — a mistake, a ransomware note, a failed deploy — is too late to start. Recording it now means a buyer down the line sees that continuity was handled from the beginning, not scrambled after a scare.',
    entries: [ { m: '◆', t: 'backup_dr OPEN (high) — no backup / DR posture recorded', l: 'ill' } ],
    cer: {
      id: 'forming', route: 'Backup → distributor product', status: 'Forming', tone: 'neutral',
      need: 'backup_dr OPEN — no continuity posture on record',
      evidence: '—', consent: '—', visibility: '—',
      pending: ['evidence', 'consent', 'visibility'],
    },
  },
  {
    id: 'm4', label: 'She wants to prove her honey’s origin',
    story: 'We suggest Haiku on Amazon Bedrock + the AfSIS soil dataset on AWS Data Exchange — a model and a dataset, matched to her question.',
    suggestion: 'Haiku on Amazon Bedrock + AfSIS on AWS Data Exchange', returns: true, lead: 'edison',
    note: { k: 'Honey is one of the most adulterated foods in the world', v: 'Cut with syrup, mislabelled by origin — provenance is the whole differentiator. Proving where each jar came from is worth answering with a model and a dataset, not a claim printed on a label.' },
    teachQ: 'Why does provenance matter this much for honey?',
    teachA: 'Honey is among the most adulterated foods on the planet — routinely diluted with cheaper syrups or sold under the wrong origin. For a brand built on being the real thing, being able to prove where a jar came from is not a nicety, it is the product. That is why the question is answered with data rather than a marketing line.',
    entries: [ { m: '○', t: 'Provenance question logged — model + dataset advised (a record entry, never an order)', l: 'ill' } ],
    cer: null,
  },
  {
    id: 'm5', label: 'Her beekeepers need to log in', story: 'We suggest Cisco Duo — off the Ingram shelf.',
    suggestion: 'Cisco Duo', returns: true, lead: 'edison', note: null,
    teachQ: 'What is MFA, and why is it the first thing checked?',
    teachA: 'Multi-factor authentication means a login needs more than a password — a second proof, like a tap on your phone. It is the single most common control an enterprise buyer verifies first, because a stolen password on its own should never be enough to open the door.',
    entries: [
      { m: '◆', t: 'mfa OPEN (critical) — no enforced MFA on team / beekeeper logins', l: 'ill' },
      { m: '◈', t: 'Cisco Duo matched — off the Ingram shelf', l: 'ill' },
    ],
    cer: {
      id: 'CER-A17C', route: 'Cisco Duo → Ingram Micro', status: 'Under review', tone: 'med',
      need: 'mfa (critical) — no enforced MFA; beekeeper / team logins',
      evidence: 'Gap mfa OPEN · SOC 2 CC6.1 blocker',
      consent: 'granted 2026-07-19 · revocable', visibility: '—',
      pending: ['visibility'],
    },
  },
  {
    id: 'm6', label: 'The distributor asks for compliance', story: 'We suggest Vanta — attested continuously, evidence straight into her record.',
    suggestion: 'Vanta', returns: true, lead: 'sophia', note: null,
    teachQ: 'What does "compliance" mean when a distributor asks for it?',
    teachA: 'The distributor wants evidence that security is handled continuously — not promised once in a document. Continuous attestation means the checks run and re-run on their own, and the evidence lands straight in the record. So the answer to "are you compliant?" is always current, not a year-old PDF nobody trusts.',
    entries: [
      { m: '◆', t: 'vendor_questionnaire OPEN + attestation GAP — not DD-ready', l: 'ill' },
      { m: '◈', t: 'Vanta matched — continuous attestation flows into the record', l: 'ill' },
    ],
    cer: {
      id: 'CER-C4E2', route: 'Vanta → Vanta', status: 'Needs info', tone: 'med',
      need: 'vendor_questionnaire + attestation — no SOC 2, not DD-ready',
      evidence: 'Attestation GAP · vendor_questionnaire OPEN',
      consent: 'granted 2026-07-19 · revocable', visibility: '—',
      pending: ['evidence', 'visibility'],
    },
  },
  {
    id: 'm7', label: 'Woolworths calls', story: 'Enterprise due diligence — the record answers the questionnaire, and Prescient audits where a human signature is needed.',
    suggestion: null, returns: true, lead: 'sophia', note: null,
    teachQ: 'Why would Woolworths ask all this?',
    teachA: 'Before a large buyer lets a supplier near its systems or its shelves, it runs due diligence — a long questionnaire about security, insurance, and controls. It is routine, and it is where most small suppliers stall for months. Here the record answers it directly, and a human signature is added only where one is genuinely required.',
    entries: [
      { m: '●', t: 'Enterprise DD questionnaire — answered from the record', l: 'ill' },
      { m: '✓', t: 'Prescient audit — human signature where one is required (roadmap)', l: 'ill' },
    ],
    cer: {
      id: 'audit', route: 'Prescient → professional service', status: 'Introduced', tone: 'accent',
      need: 'Human-signature audit where the questionnaire needs one',
      evidence: '—', consent: 'pending', visibility: '—',
      pending: ['evidence', 'consent', 'visibility'],
    },
  },
  {
    id: 'm8', label: 'The contract demands cyber insurance', story: 'Introduced to Austbrokers CyberPro — a licensed broker; the Certificate of Currency lands in the record.',
    suggestion: 'Austbrokers CyberPro (introduced)', returns: true, lead: 'leonardo', note: null,
    teachQ: 'Why does a contract demand cyber insurance?',
    teachA: 'Large contracts increasingly require the supplier to carry cyber cover, so that if there is a breach the cost is insured rather than passed up the chain. The Certificate of Currency is the proof of that cover — and it lands in the record like every other piece of evidence, ready the next time it is asked for.',
    entries: [ { m: '✓', t: 'Certificate of Currency — Austbrokers CyberPro (introduced)', l: 'ill' } ],
    cer: {
      id: 'insurance', route: 'Austbrokers CyberPro → introduced broker', status: 'Introduced', tone: 'accent',
      need: 'cyber_insurance OPEN (critical) — contract insurance gate ahead',
      evidence: 'Certificate of Currency (pending)', consent: 'pending', visibility: '—',
      pending: ['consent', 'visibility'],
    },
  },
  {
    id: 'm9', label: 'Time to raise', story: 'Introduced to Wholesale Investor — the whole record walks into capital. Funded.',
    suggestion: 'Wholesale Investor (introduced)', returns: true, lead: 'leonardo', note: null,
    teachQ: 'What is investor due diligence?',
    teachA: 'When a founder raises money, investors verify the business before they wire it — the same kind of diligence an enterprise buyer runs, aimed at risk and defensibility. A founder who can hand over a complete, evidenced record walks into that room already answered, instead of assembling it under pressure.',
    entries: [ { m: '●', t: 'Introduced to Wholesale Investor — the whole record walks into capital. Funded.', l: 'ill' } ],
    cer: {
      id: 'capital', route: 'Wholesale Investor → capital introduction', status: 'Introduced', tone: 'accent',
      need: 'Time to raise — the whole record walks into capital',
      evidence: 'Complete record · gaps cleared, CERs attached',
      consent: 'pending', visibility: 'Investor projection · records, never deals',
      pending: ['consent'],
    },
  },
  {
    id: 'm10', label: 'Funded, she builds the provenance platform', story: 'Proof of every jar, paddock to shelf — the honey founder now sells trust too.',
    suggestion: null, returns: false, lead: null, note: null, teachQ: null, teachA: null,
    entries: [], cer: null,
  },
];

export const MEL_DEFAULT_BEAT = 'm2';
export const MEL_ORGANIC_BEAT = 'm6';
