// Lenses are data, not files.
//
// John hand-built five HTML projections of one vehicle — filled, dd, enterprise, ciso,
// commercial (_working/04_SITES/hiveandco-vehicle-*.html). Five files is the symptom; one
// projector with N lenses is the thing. A sixth audience should cost a config entry, not
// a sixth page.
//
// Section titles are kept verbatim from his pages. They are the ratified words and the
// lens is the only place they should live.
//
// `question` is what that viewer actually came to find out. It is the lens's reason to
// exist, and it is what makes a per-person lens (mintLens below) meaningful rather than
// cosmetic.

export const LENS_SECTION_KINDS = ['facts', 'domains', 'gaps', 'disagreements', 'engagements', 'usage'];

export const VEHICLE_LENSES = {
  filled: {
    label: 'The record',
    audience: 'founder',
    question: 'What do you hold on me?',
    sections: [
      { title: 'Identity', kind: 'facts', group: 'identity' },
      { title: 'Context — who they are (web synthesis)', kind: 'facts', group: 'context' },
      { title: 'Trust posture — six domains', kind: 'domains' },
      { title: 'Gap catalog — all evaluated', kind: 'gaps' },
      { title: 'Engagements — the CERs, each an executive summary', kind: 'engagements' },
      { title: 'Usage & ledger', kind: 'usage' },
    ],
  },

  dd: {
    label: 'Due diligence',
    audience: 'investor',
    question: 'Should I fund this, and what is the founder wrong about?',
    sections: [
      { title: 'DD readiness — the questionnaire, pre-answered', kind: 'gaps', filter: { lane: 'dd' } },
      { title: 'The raise', kind: 'facts', group: 'raise' },
      { title: 'Financials — live, not a snapshot', kind: 'facts', group: 'financials' },
      { title: "⚑ Where the founder's story disagrees with the evidence", kind: 'disagreements' },
      { title: 'Traction', kind: 'facts', group: 'traction' },
      { title: 'Cap table & ownership', kind: 'facts', group: 'cap_table' },
      { title: 'Team', kind: 'facts', group: 'team' },
      { title: 'Market', kind: 'facts', group: 'market' },
      { title: 'Legal & IP', kind: 'facts', group: 'legal' },
      { title: 'Security & compliance — independently read (already done)', kind: 'domains' },
      { title: 'Risk register', kind: 'gaps', filter: { severity: 'high' } },
      { title: 'The capital engagement', kind: 'engagements', filter: { family: 'capital_introduction' } },
    ],
  },

  enterprise: {
    label: 'Vendor risk',
    audience: 'enterprise_buyer',
    question: 'Can I onboard this supplier without wearing the risk?',
    sections: [
      { title: 'Vendor-risk scorecard — the DD, at a glance', kind: 'domains' },
      { title: 'Security questionnaire — pre-answered & graded', kind: 'gaps', filter: { lane: 'security' } },
      { title: 'Certifications & evidence locker', kind: 'facts', group: 'certifications' },
      { title: 'Data processing & privacy', kind: 'facts', group: 'privacy' },
      { title: 'Business continuity & insurance', kind: 'facts', group: 'continuity' },
      { title: 'References', kind: 'facts', group: 'references' },
      { title: 'Where a human must sign — routed, not faked', kind: 'gaps', filter: { requires_human: true } },
      { title: 'The enterprise engagement', kind: 'engagements' },
    ],
  },

  ciso: {
    label: 'Inherited posture',
    audience: 'ciso',
    question: 'What am I inheriting, and what do I report up?',
    sections: [
      { title: 'Framework coverage — what I inherited', kind: 'domains' },
      { title: 'Multicloud posture (CSPM)', kind: 'facts', group: 'cloud_posture' },
      { title: 'Emerging — AI governance', kind: 'gaps', filter: { lane: 'ai_governance' } },
      { title: 'Provenance & evidence integrity', kind: 'facts', group: 'provenance' },
      { title: 'Remediation roadmap — my plan is a list of CERs', kind: 'engagements' },
    ],
  },

  commercial: {
    label: 'Unit economics',
    audience: 'ethiks360_admin',
    question: 'Does this pay, and can I show the spine from gap to margin?',
    sections: [
      { title: 'Cost side — metered → PULSUS', kind: 'usage' },
      { title: 'Revenue side — every CER is a commercial event', kind: 'engagements' },
      { title: 'The attribution spine — gap to margin', kind: 'gaps' },
    ],
  },
};

// John's upgrade, 2026-08-29, by voice: "an interface which is very specific to this
// particular human being." A lens for a named person, not a category — Sunny's view, not
// "the partner view". Minting one costs a sentence, which was the whole point.
//
// It derives from a base role lens so a person always inherits a lane that has already
// been thought about; `question` is what makes it theirs.
export function mintLens({ id, person, base, question, audience, drop = [] }) {
  const parent = VEHICLE_LENSES[base];
  if (!parent) throw new Error(`unknown_base_lens:${base}`);
  return {
    id,
    person,
    label: `${person}'s view`,
    derived_from: base,
    audience: audience ?? parent.audience,
    question: question ?? parent.question,
    sections: parent.sections.filter((s) => !drop.includes(s.title)),
  };
}
