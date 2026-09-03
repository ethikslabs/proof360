// The founder's record → a Capital Rosetta claim set: { held: {CLASS: confidence}, facts }.
// Derived from the same journey claims /journey renders (subject + authority), never
// authored. A class no claim touches is absent — which is exactly what the join needs
// to say GAP honestly. Confidence is the strongest authority seen for that class.

import { CLASSES } from './capitalJoin.js';

// subject → class. First match wins; posture fields fall to GOV (governance & compliance
// holds "filings, licences, insurance, certifications, eligibility determinations").
const ROOM = [
  ['IDENT',  /identity|entity|abn|acn|jurisdiction|incorporat|cap_table|share_class|ownership|control|hq_/],
  ['FNDR',   /founder|team|key_person|track_record/],
  ['PROB',   /problem|market|urgency|why_now|segment/],
  ['PROD',   /product|tech|ip\b|patent|build|api|platform|defensib|architecture|hosting|stack/],
  ['TRAC',   /^match:|^outcome:|customer|revenue|pipeline|loi|traction|usage|retention|partner_status|contract/],
  ['UNIT',   /margin|cac|payback|contribution|cohort|unit_/],
  ['FIN',    /runway|burn|historical|financial|audit_state|xero|statutory/],
  ['CASH',   /recurring|receivable|collateral|covenant|cash|asset/],
  ['GOV',    /^gap:|soc2|iso|dmarc|posture|insurance|board|licen|governance|compliance|filing|eligib|security|backup|perimeter|mfa|cert/],
  ['USE',    /use_of_funds|allocation|milestone/],
  ['EXIT',   /exit|comparable|liquidity/],
  ['REL',    /investor|referral|warm|relationship|network/],
  ['IMPACT', /impact|mandate|sovereign|esg|environment/],
  ['OPS',    /ops|headcount|supply|delivery|capacity|systems/],
];

export function classFor(claim) {
  const s = String(claim?.subject || '').toLowerCase();
  for (const [cls, re] of ROOM) if (re.test(s)) return cls;
  return null; // untyped — contributes to no class rather than to the wrong one
}

const CONF_FOR_AUTHORITY = {
  reality: 'confirmed', provider: 'confirmed',
  legal: 'probable', cto: 'probable', system: 'probable',
  founder: 'asserted', operator: 'asserted',
};
const RANK = { absent: 0, asserted: 1, probable: 2, confirmed: 3 };

export function confidenceFor(claim) {
  if (claim?.confidence && RANK[claim.confidence] !== undefined) return claim.confidence;
  return CONF_FOR_AUTHORITY[claim?.authority] || 'asserted';
}

// entries: [{ claims: [{ subject, authority, statement, confidence? }] }]
export function claimSetFrom(entries, facts = {}) {
  const held = Object.fromEntries(CLASSES.map((c) => [c, 'absent']));
  const witnesses = Object.fromEntries(CLASSES.map((c) => [c, []]));
  for (const e of entries || []) {
    for (const c of e?.claims || []) {
      const cls = classFor(c);
      if (!cls) continue;
      const conf = confidenceFor(c);
      if (RANK[conf] > RANK[held[cls]]) held[cls] = conf;
      witnesses[cls].push({ subject: c.subject, authority: c.authority ?? null, statement: c.statement ?? null });
    }
  }
  // Facts the record states outright become join facts (jurisdiction, for instance).
  const derivedFacts = {};
  for (const e of entries || []) for (const c of e?.claims || []) {
    const s = String(c?.subject || '').toLowerCase();
    if (/^(jurisdiction|hq_country|country)$/.test(s) && c.statement) derivedFacts.jurisdiction = String(c.statement).trim().toUpperCase().slice(0, 2);
  }
  return { held, witnesses, facts: { ...derivedFacts, ...facts } };
}
