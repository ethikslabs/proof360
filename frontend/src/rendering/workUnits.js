// The work the read actually did — and nothing else.
//
// This replaces a panel whose four rows were: a hardcoded 18,420, a hardcoded 2,
// a boolean dressed as a count, and a count of inferences wearing the label
// "sources". John, logged in and reading it: "what is this telling me?" Nothing.
// The numbers even disagreed with each other — 18,420 tokens processed across
// zero passes over zero sources.
//
// Standing rule: no invented number, live or illustrative. Under a heading that
// says "operational work units", in a product whose pitch is provenance, a
// plausible constant is worse than a blank.
//
// Rules here: a row exists only if the read measured it. A measured zero SHOWS
// (reading nothing is a real answer); an absent value HIDES. Nothing is inferred,
// nothing is filled in, nothing is rounded up.
//
// Token counts are deliberately absent: inference.js emits real usage to the
// meter server-side, but it never reaches the browser. Rather than approximate
// it, the row is gone until the usage is genuinely carried through.
function count(v) {
  return Array.isArray(v) ? v.length : null;
}

export function deriveWorkUnits(data) {
  if (!data || typeof data !== 'object') return [];
  const rows = [];

  const push = (label, value) => {
    if (value === null || value === undefined) return;
    rows.push({ label, value });
  };

  push('Pages read', Number.isFinite(data.pages_read_count) ? data.pages_read_count : null);
  push('Sources read', count(data.sources_read));
  push('Signals found', count(data.inferences));
  push('Corpus holdings cited', count(data.corpus_citations?.hits));

  // Which engines did the reading — the market, made visible. Named, not counted:
  // "2 engines" tells a founder nothing, "perplexity · gemini" tells them who read
  // their site.
  const engines = Array.isArray(data.research_engines)
    ? data.research_engines.filter((e) => typeof e === 'string' && e.trim())
    : [];
  if (engines.length) push('Engines', engines.join(' · '));

  return rows;
}

export default deriveWorkUnits;
