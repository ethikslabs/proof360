// Register-advisory detection + formatting for the chat flow — pure functions, no
// React, no network. Mirrors cerPathways.js: a founder message that ASKS about
// models/datasets triggers the register read; the answer renders in-stream
// (advisory law 1 — the advisory speaks only inside the conversation).

// A register noun alone must not fire ("our customer data is encrypted" is a trust
// statement, not an ask). Fire only when an ask-shape meets a register noun — and the
// ask-shape must be a REAL question or request: a '?', an interrogative opening, or a
// request verb. Bare 'any'/'available' are NOT ask-shapes ("we do not use any training
// data" / "our training data is available in S3" are statements the personas should
// answer, not register lookups).
const REGISTER_NOUN = /\b(model|models|llm|llms|foundation models?|dataset|datasets|data ?sets?|open data|public data|training data|data (?:source|sources|we could use))\b/i;
const ASK_SHAPE = /\?|\b(is there|are there|do we have|what|which|find|recommend|suggest|look(?:ing)? for|could (?:we|i) use|should (?:we|i) use|help (?:us|me) (?:with|find))\b/i;

export function advisoryFromText(text) {
  const s = String(text || '');
  return REGISTER_NOUN.test(s) && ASK_SHAPE.test(s);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtRegisterDate(iso) {
  if (!iso) return 'date unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'date unknown';
  // Manual format — host ICU locales disagree on short-month names.
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// The watchable retrieval lines (law 1): completed thinking steps cite the register
// totals + derivation date — the customer sees exactly what was searched.
export function advisoryThinkingSteps(advisory) {
  const m = advisory?.models || {};
  const d = advisory?.data || {};
  return [
    {
      id: 'reg-models', provider: 'internal', model: 'model register', status: 'complete',
      label: 'Checked the model register',
      reference: `${m.total ?? '—'} models · ${m.sources ?? '—'} sources · derived ${fmtRegisterDate(m.derived_at)}`,
    },
    {
      id: 'reg-data', provider: 'internal', model: 'data register', status: 'complete',
      label: 'Checked the data register',
      reference: `${d.total ?? '—'} free public datasets · derived ${fmtRegisterDate(d.derived_at)}`,
    },
  ];
}

// The honest zero rendered as an ANSWER (law 2): a confident sentence that says what
// was searched and what that means — never an apology, never a bluffed match.
// match_count is TOTAL hits; matches carries only the top page — when they differ,
// the copy says so ("top 5 of 150"), because a count that silently means "page size"
// would be its own quiet bluff.
export function modelAnswerLine(models) {
  if (!models) return '';
  if (models.match_count === 0) {
    return `No specialised model claims this domain — checked all ${models.total} models across ${models.sources} sources. That's the register talking, not a guess: your general reasoning stack already covers it, and nothing on the market would do it better today.`;
  }
  const shown = models.matches?.length ?? 0;
  const head = shown < models.match_count ? `top ${shown} of ${models.match_count} matches` : `${models.match_count} match${models.match_count === 1 ? '' : 'es'}`;
  return `${head} from ${models.total} models across ${models.sources} sources:`;
}

export function dataAnswerLine(data) {
  if (!data) return '';
  if (data.match_count === 0) {
    return `Nothing in the ${data.total} free public datasets matches this — an honest zero from the register.`;
  }
  const shown = data.matches?.length ?? 0;
  const head = shown < data.match_count ? `${data.match_count} of ${data.total} free public datasets fit — the top ${shown}` : `${data.match_count} of ${data.total} free public datasets fit`;
  return `${head}, free first, straight from the register:`;
}
