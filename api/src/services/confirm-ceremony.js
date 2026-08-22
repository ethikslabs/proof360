// The confirm ceremony (ETHL-WRK-SPEC-011 D3) — how an inferred claim earns
// first-party testimony inside the chat. Two halves, both pure:
//
//   confirmPromptBlock(claim)  → system-prompt injection: the persona weaves ONE
//                                natural confirm question into its reply, source cited.
//   interpretConfirmReply(msg) → deterministic capture of the user's answer.
//                                Yes → confirmed. Bare no → rejected. "No, we're on X"
//                                → corrected with the user's words. ANYTHING ambiguous
//                                → null: the ceremony never writes a claim_event on a
//                                guess (no-invented-number doctrine, testimony flavour).

const VALUE_DISPLAY = {
  aws: 'AWS', gcp: 'GCP', azure: 'Azure', cloudflare: 'Cloudflare',
  'on-premise': 'on-premise',
};

function displayValue(value) {
  return VALUE_DISPLAY[String(value).toLowerCase()] || String(value);
}

// Human phrasing per field — the acceptance-walk moment lives here.
const FIELD_QUESTIONS = {
  'infrastructure.cloud_provider': (v) => `Looks like you're on ${v} — right?`,
  'infrastructure.cdn_provider': (v) => `Your site appears to sit behind ${v} — is that right?`,
  'infrastructure.email_provider': (v) => `Your email looks like it runs on ${v} — correct?`,
  'compliance.soc2_status': (v) => `It looks like you're ${v} on SOC 2 — is that where you are?`,
  'company.stage': (v) => `You look to be around ${v} stage — is that right?`,
  'market.customer_type': (v) => `You seem to be selling to ${v.toLowerCase?.() || v} buyers — right?`,
  'data.sensitivity': (v) => `It looks like you handle ${String(v).toLowerCase()} — is that accurate?`,
};

export function fieldQuestion(claim) {
  const v = displayValue(claim.value);
  const phrase = FIELD_QUESTIONS[claim.field];
  return phrase ? phrase(v) : `We've inferred ${claim.field.split('.').pop().replace(/_/g, ' ')} is ${v} — is that right?`;
}

export function confirmPromptBlock(claim) {
  if (!claim) return '';
  return [
    '',
    '--- CONFIRM CEREMONY (one inferred fact to verify this exchange) ---',
    `Inferred: ${claim.field} = ${displayValue(claim.value)} (source: ${claim.provenance?.detail || claim.provenance?.method || 'inference'})`,
    `Ask, woven naturally into your reply as conversation (never a form): "${fieldQuestion(claim)}"`,
    'Ask at most this one confirm question. If the user already answered it in their message, do not ask again.',
    'Never re-ask a fact the user has already confirmed, and never ask what our probes can detect.',
    '--- END CONFIRM CEREMONY ---',
  ].join('\n');
}

// After a capture lands, the persona is told what happened so it acknowledges
// naturally and never re-asks (the event itself is already written by the caller).
export function ceremonyResultNote(claim, answer) {
  if (!claim || !answer) return '';
  const outcome = answer.type === 'corrected'
    ? `corrected to "${answer.value}" (their words — first-party testimony)`
    : answer.type;
  return [
    '',
    `--- CEREMONY RESULT: the user just answered — ${claim.field} is now ${outcome}. ---`,
    'Acknowledge this briefly and naturally in your reply. Never re-ask it.',
  ].join('\n');
}

// The shortlist moment (D5): once testimony unlocks a register trigger, the persona
// proposes ONE Move — reason spoken on its face (disclosed-stake model), consent asked.
export function proposalPromptBlock(proposal) {
  if (!proposal) return '';
  return [
    '',
    '--- SHORTLIST PROPOSAL (one commercial suggestion this exchange) ---',
    `Propose: ${proposal.title} — ask naturally: "Worth considering ${proposal.title} — want me to add it to your shortlist?"`,
    `State the reason with it, plainly: "${proposal.reason}"`,
    'Make at most this one proposal. If they say yes it will be recorded; if they decline, drop it gracefully and never push.',
    '--- END SHORTLIST PROPOSAL ---',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Deterministic reply capture. Conservative on purpose: a missed capture costs
// one re-ask; a wrong capture forges testimony.
// ---------------------------------------------------------------------------
const YES_RE = /^(yes|yep|yeah|yup|correct|right|exactly|confirmed|that's right|that is right|spot on|we are|sure)\b/i;
const BARE_NO_RE = /^(no|nope|nah)[.!\s]*$/i;
const CORRECTION_RES = [
  /^no[,.\s]+(.+)$/is,
  /^actually[,\s]+(.+)$/is,
  /^not quite[,.\s]+(.+)$/is,
];

export function interpretConfirmReply(message, pendingClaim) {
  if (!pendingClaim) return null;
  const msg = String(message || '').trim();
  if (!msg) return null;
  if (msg.includes('?')) return null; // a question is never an answer

  if (BARE_NO_RE.test(msg)) return { type: 'rejected' };

  for (const re of CORRECTION_RES) {
    const m = msg.match(re);
    if (m) {
      const value = m[1].trim();
      if (value && !/\bbut\b/i.test(value)) return { type: 'corrected', value };
      return null;
    }
  }

  if (YES_RE.test(msg)) {
    // A yes hedged with a but / a trailing negation is not clean testimony.
    if (/\b(but|however|although|no)\b/i.test(msg)) return null;
    if (msg.length > 60) return null;
    return { type: 'confirmed' };
  }

  return null;
}
