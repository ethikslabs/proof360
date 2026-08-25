// Shared display-only emphasis strip (Round 2, finding 4 — live walkthrough).
// Research-engine output and persona chat answers both carry raw markdown
// markers (`**current and valid**`, `` `p=none` ``) straight into the text —
// verbatim substance, unreadable presentation. This strips paired **, __, *,
// and backtick markers at RENDER time only; the underlying string (act.body,
// stored message content, the streaming accumulator) is never mutated.
// Citation markers like [1] use square brackets and are untouched here.
// Extracted from ActTrace.jsx's stripEmphasisMarkers (Round 1) and extended
// with paired-backtick removal so the chat bubble render path can share it.
export function stripEmphasis(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\s][^*]*)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}
