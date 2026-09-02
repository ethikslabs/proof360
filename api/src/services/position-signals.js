// Position signals — typed facts about where a company STANDS, read out of the
// research holdings rather than off their own website.
//
// Why this exists (John, 2026-09-02): a live read on a 120-person consultancy came
// back as a security posture report. The holdings had already retrieved headcount,
// footprint, founding year and a conferred category position — and none of it could
// reach the output, because the website extractor was the only producer of signals.
// The retrieval was right; the material had nowhere to go.
//
// THE RULE THAT SHAPES THIS FILE (John, 2026-09-02): we never adjudicate a company's
// record. When two witnesses say different things, that is not a contradiction and
// never renders as one — "every human knows that the internet is full of falsehoods,
// out of date information... we just have a point in time record." So a signal holds
// MULTIPLE OBSERVATIONS, each stamped with who saw it and when, and a confirmation
// state that starts unconfirmed. One primitive, two affordances: the founder is asked
// which is right; a partner is told it is observed and not yet confirmed.
// There is deliberately no `disagreement` type and no contradiction vocabulary.

import { chatComplete } from '../lib/inference.js';
import { resolve as resolveModel } from '../lib/model-resolver.mjs';

export const POSITION_TYPES = [
  'headcount', 'footprint', 'years_operating',
  'category_position', 'accreditation', 'named_customers',
];

export const CONFIRMATION = {
  UNCONFIRMED: 'unconfirmed',   // observed publicly, founder has not spoken
  CONFIRMED:   'confirmed',     // founder said yes
  CORRECTED:   'corrected',     // founder gave a different value
};

// What a partner is shown above unconfirmed material. Not a hedge — the accurate
// description of what we have. Never "unverified", never "sources disagree".
export const PARTNER_FRAME =
  'Observed publicly and inferred. The founder has not confirmed this yet.';

/** Who saw it, and when. A holding with no URL is still a witness — name it by slug. */
export function witnessOf(hit) {
  if (!hit) return null;
  let source = hit.slug ?? null;
  if (hit.source_url) {
    try { source = new URL(hit.source_url).hostname.replace(/^www\./, ''); }
    catch { /* malformed URL — fall back to the slug */ }
  }
  return {
    source,
    source_url: hit.source_url ?? null,
    observed_at: hit.fetched_at ?? null,
    evidence_id: hit.evidence_id ?? null,
  };
}

/**
 * Fold raw {type, value, hit} facts into one signal per type carrying every
 * observation. Two witnesses giving different values produce ONE signal with TWO
 * observations — not two signals, and not a flag.
 */
export function groupObservations(facts) {
  const byType = new Map();
  for (const fact of facts ?? []) {
    if (!fact?.type || fact.value == null || fact.value === '') continue;
    if (!POSITION_TYPES.includes(fact.type)) continue;
    const value = String(fact.value).trim();
    if (!value) continue;

    if (!byType.has(fact.type)) {
      byType.set(fact.type, {
        type: fact.type,
        signal_class: 'position',
        confirmation: CONFIRMATION.UNCONFIRMED,
        observations: [],
      });
    }
    const signal = byType.get(fact.type);
    const witness = witnessOf(fact.hit);
    // Same value from the same witness twice is one observation, not two.
    const dup = signal.observations.some(
      (o) => o.value === value && o.source === witness?.source,
    );
    if (!dup) signal.observations.push({ value, ...witness });
  }

  for (const signal of byType.values()) {
    // `value` is the first observation, for consumers that want one string.
    // It is a representative, never a resolution — nothing is being picked as true.
    signal.value = signal.observations[0]?.value ?? null;
    signal.observation_count = signal.observations.length;
  }
  return [...byType.values()];
}

const PROMPT_TYPES = `
- headcount: how many people work there. Keep the source's own words ("120 specialists", "51-200 employees") — never normalise to a number, because the phrasing is part of what was said.
- footprint: countries, regions or offices. Keep their phrasing.
- years_operating: the founding year, or an explicit age.
- category_position: a claim about where they stand in their market — a ranking, a "#1", a named partner status, a leadership claim. Verbatim.
- accreditation: a formal scheme they hold (CREST, ISO, SOC 2, a certification body).
- named_customers: named client or customer organisations.`;

/**
 * Extract position facts from research holdings.
 *
 * Honours the corpus three-state absence contract exactly as retrieveCorpusEvidence
 * defines it: null = could not look (stays null — we must never claim we found
 * nothing when we never looked); [] = looked and found nothing (an honest zero);
 * array = holdings to read.
 */
export async function extractPositionSignals(hits, opts = {}) {
  if (hits == null) return null;
  if (!Array.isArray(hits) || hits.length === 0) return [];

  const numbered = hits
    .map((h, i) => `[${i + 1}] (${h.slug ?? 'holding'}) "${(h.text ?? '').slice(0, 1200)}"`)
    .join('\n\n');

  const prompt = `Below are research holdings about ${opts.company_name ?? 'a company'}, gathered independently before this conversation. Extract only facts about WHERE THIS COMPANY STANDS — its size, reach, age, market position, accreditations and named customers.

Extract what each holding ACTUALLY SAYS. If two holdings say different things, report BOTH — do not reconcile them, do not pick a winner, and do not comment on the difference. Sources go out of date and disagree; that is normal and it is not your job to judge it.

Do NOT extract security posture, compliance status, or infrastructure.

${PROMPT_TYPES}

${numbered}

Respond with ONLY a JSON array, no markdown:
[{ "type": "headcount", "value": "120 specialists", "from": 1 }]

"from" is the [n] of the holding the fact came from. Omit any type you cannot support from the text. Return [] if nothing qualifies. Never invent a value to fill a type.`;

  let response;
  try {
    response = await chatComplete({
      model: resolveModel('classify', { registry: opts.registry, onLedger: () => {} }).model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      correlation_id: opts.correlation_id,
    });
  } catch {
    return null;   // could not look — same contract as the retrieval above
  }

  const text = response?.choices?.[0]?.message?.content?.trim() ?? '';
  const json = text.startsWith('```')
    ? text.replace(/^```\w*\n?/, '').replace(/```$/, '').trim()
    : text;

  let parsed;
  try { parsed = JSON.parse(json); } catch { return []; }
  if (!Array.isArray(parsed)) return [];

  return groupObservations(
    parsed.map((f) => ({ type: f?.type, value: f?.value, hit: hits[Number(f?.from) - 1] })),
  );
}
