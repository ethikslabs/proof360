// CER pathway logic for the chat flow — pure functions, no React, no network.
// Frontend-side mirror of the four routes (display + detection). The backend
// (api/src/config/cer-routes.js) remains the source of truth for storage/visibility;
// this is the conversation-facing projection of the same four pathways.

export const PATHWAYS = {
  ingram_micro_aws: {
    pathway_type: 'cloud_program',
    label: 'AWS via Ingram',
    cta: 'Start AWS pathway',
    short: 'AWS',
    partner: 'Ingram Micro',
    title: 'AWS PATHWAY',
  },
  austbrokers_cyberpro: {
    pathway_type: 'cyber_insurance_referral',
    label: 'Cyber insurance',
    cta: 'Check cyber insurance pathway',
    short: 'cyber insurance',
    partner: 'Austbrokers CyberPro',
    title: 'CYBER INSURANCE',
  },
  vanta: {
    pathway_type: 'compliance_security',
    label: 'Compliance via Vanta',
    cta: 'Review compliance pathway',
    short: 'compliance',
    partner: 'Vanta',
    title: 'COMPLIANCE',
  },
  ingram_micro_cisco: {
    pathway_type: 'distributor_product',
    label: 'Cisco via Ingram',
    cta: 'Request Cisco pathway',
    short: 'Cisco',
    partner: 'Ingram Micro',
    title: 'CISCO PATHWAY',
  },
};

// Ordered by specificity — first match wins. Heuristic pathway-intent detection from
// a founder message; result is a PROPOSED route (the founder still confirms).
const DETECT = [
  { route: 'austbrokers_cyberpro', re: /\bcyber\s*(insur|cover|risk|liab)|\binsurance\b/i },
  { route: 'vanta', re: /\bsoc\s?-?2\b|\biso\s?27001\b|complian|security questionnaire|pen[\s-]?test|audit\b|certif|procurement blocker/i },
  { route: 'ingram_micro_cisco', re: /\bcisco\b|\bmeraki\b|networking|firewall|\bswitch(es|ing)?\b|collaboration hardware/i },
  { route: 'ingram_micro_aws', re: /\baws\b|amazon web|\bec2\b|cloud (spend|bill|cost|credit|provider)|cloud infra|burning .*cloud/i },
];

export function routeFromText(text) {
  const s = String(text || '');
  for (const { route, re } of DETECT) {
    if (re.test(s)) return route;
  }
  return null;
}

// The default "need" phrasing per route, used when the founder's own phrasing isn't
// captured. Kept short and neutral.
const DEFAULT_NEED = {
  ingram_micro_aws: 'growing cloud spend, no committed program',
  austbrokers_cyberpro: 'cyber insurance cover not in place',
  vanta: 'compliance / security readiness for buyers',
  ingram_micro_cisco: 'distributor product / networking need',
};

// The seven CER fields, in wireframe order, with tick state derived from what's known.
// route state: 'done' once confirmed, 'live' while merely proposed (renders with a "?").
export function cerBuildFields({ route, companyName, contactName, need, evidenceRefs = [], routeConfirmed = false, consented = false }) {
  const evCount = evidenceRefs.length;
  return [
    { key: 'company', label: 'Company', value: companyName || '—', state: companyName ? 'done' : 'wait' },
    { key: 'contact', label: 'Contact', value: contactName || '—', state: contactName ? 'done' : 'wait' },
    { key: 'need', label: 'Need / gap', value: need || (route ? DEFAULT_NEED[route] : '—'), state: need || route ? 'done' : 'wait' },
    { key: 'evidence', label: 'Evidence', value: evCount ? `${evCount} ref${evCount === 1 ? '' : 's'}` : '—', state: evCount ? 'done' : 'wait' },
    { key: 'route', label: 'Route', value: route ? (routeConfirmed ? route : `${route}?`) : '—', state: route ? (routeConfirmed ? 'done' : 'live') : 'wait' },
    { key: 'consent', label: 'Consent', value: consented ? 'granted' : 'pending', state: consented ? 'done' : 'wait' },
    { key: 'visibility', label: 'Visibility', value: route ? PATHWAYS[route].partner : '—', state: route ? 'done' : 'wait' },
  ];
}

export function cerMeter(fields) {
  return fields.filter((f) => f.state === 'done').length;
}

// Ready for the agency (consent) card when everything except consent is settled and the
// route is confirmed. Consent is the last gate — the founder makes it in the agency card.
export function agencyReady(fields) {
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  // Evidence is "referenced only" (may be empty in v1) and Contact is implicit context —
  // the logged-in founder IS the contact — so neither is a hard gate. Consent is the final
  // gate (made in the agency card), so it must still be pending.
  const settled = ['company', 'need', 'route', 'visibility'].every((k) => byKey[k]?.state === 'done');
  return settled && byKey.consent?.state !== 'done';
}

// The who-sees / who-never rows for a route's visibility summary.
export function visibilityRows(route) {
  const cfg = PATHWAYS[route];
  if (!cfg) return [];
  const others = [...new Set(Object.values(PATHWAYS).map((p) => p.partner).filter((p) => p !== cfg.partner))];
  return [
    { who: 'You + Ethiks360 admin', verdict: '✓ full', tone: 'full' },
    { who: cfg.partner, verdict: 'later · if permissioned', tone: 'later' },
    { who: others.join(' · '), verdict: '✕ never', tone: 'never' },
  ];
}

// The proposal object consumed by CerAgencyCard.
export function buildProposal({ route, need, evidenceRefs = [] }) {
  const cfg = PATHWAYS[route];
  return {
    pathwayLabel: cfg?.label || route,
    route,
    need: need || DEFAULT_NEED[route] || '—',
    evidence: evidenceRefs,
    visibility: visibilityRows(route),
  };
}

// Which lens owns each promptable gate field, the ask it makes, and how a captured
// reply maps onto the founder entity. Extensible: add entries to prompt more fields.
export const FIELD_LENS = {
  company: {
    persona: 'sofia',
    prompt: "Before I set this up — what's the company called? A name, a website, or a deck all work.",
    factField: 'company_name',
    profileKey: 'name',
  },
  contact: {
    persona: 'sofia',
    prompt: 'And who should I put as the contact on this?',
    factField: null,
    profileKey: null,
  },
  need: {
    persona: 'edison',
    prompt: "What's the gap you're trying to close here?",
    factField: null,
    profileKey: null,
  },
};

// Promptable gates: ONLY fields we can actually capture (a factField/profileKey in
// FIELD_LENS). `company` is the one MVP gate. contact/need stay in FIELD_LENS for the future
// but are NOT prompted until they're capturable — otherwise we'd ask for something whose
// reply can't persist and strand the founder. route/visibility are never prompted (system).
const GATE_PROMPT_PRIORITY = ['company'];

export function firstMissingGate(fields) {
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  for (const key of GATE_PROMPT_PRIORITY) {
    if (byKey[key] && byKey[key].state !== 'done') {
      return { field: key, ...FIELD_LENS[key] };
    }
  }
  return null;
}

// Resolve a founder's reply to an awaited-field prompt. `url` is extracted by the caller
// (extractAwaitedUrl) and carried through verbatim, so classification and consumption share
// the SAME value by construction — a reply can never strand the founder at the forming card.
export function awaitedCapture(field, text, url = null) {
  if (url) return { kind: 'url', url };
  const lens = FIELD_LENS[field] || {};
  return { kind: 'value', field, value: String(text).trim(), factField: lens.factField || null, profileKey: lens.profileKey || null };
}

// Session-aware wrapper (AWAITED-URL-DROP-001). A URL in an awaited reply should launch a
// cold-read ONLY before a company is loaded. Once a session exists, re-scanning would clobber
// loaded state and the URL was historically dropped — the wait stayed armed forever and the
// founder was stranded. With a session, suppress the URL so the reply captures as the field's
// value and the wait clears.
export function awaitedReplyCapture(field, text, url, hasSession) {
  return awaitedCapture(field, text, hasSession ? null : url);
}

// What to do when a cold-read that was serving an awaited field finishes. Pure decision,
// executed by Chat.jsx. The founder must never be stranded: success guarantees a company
// value (analysis name, else the scanned domain); failure re-prompts via the owning lens
// and the wait stays armed. `success` is gated `=== true` — an absent flag fails closed
// to the re-prompt path, never to a silent capture.
export function awaitedColdReadOutcome({ awaitedField, success, companyName, domain }) {
  if (!awaitedField) return { action: 'none' };
  if (success === true) return { action: 'capture', company: companyName || domain };
  return {
    action: 'reprompt',
    persona: FIELD_LENS[awaitedField]?.persona || 'sofia',
    prompt: "That site didn't read — give me another link, or just tell me the company name and we'll keep moving.",
  };
}
