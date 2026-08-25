// Honest excerpt windowing (Round 2, PROOF360-CORPUS-CITATION-CARDS-001).
// The excerpt is VERBATIM corpus text (excerpt-not-voice) — this may only choose
// the window, never the words: collapse whitespace, drop a leading breadcrumb
// run, cut a mid-sentence tail at a sentence boundary. Every trim is marked
// with an ellipsis so the reader knows the window was cut, not the source.
export function tidyExcerpt(raw) {
  if (!raw) return raw;
  let text = raw.replace(/\s+/g, ' ').trim();

  // Leading navigation-breadcrumb run: 2+ short slash-terminated segments
  // ("Home/ Service Firms/ Readiness Firms/ ") before the prose starts.
  let ledTrim = false;
  const crumb = text.match(/^(?:[A-Za-z][\w&' .,-]{0,30}\/\s*){2,}/);
  if (crumb) {
    text = text.slice(crumb[0].length).trim();
    ledTrim = true;
  }

  // Mid-sentence tail: chunking cut the source arbitrarily. If the window
  // doesn't end at sentence punctuation, retreat to the last sentence end —
  // but only when enough text survives (verbatim over polish otherwise).
  let tailTrim = false;
  if (!/[.!?…”"')\]]$/.test(text)) {
    const lastEnd = Math.max(text.lastIndexOf('. '), text.lastIndexOf('? '), text.lastIndexOf('! '));
    if (lastEnd > 40) {
      text = text.slice(0, lastEnd + 1);
      tailTrim = true;
    }
  }

  return `${ledTrim ? '… ' : ''}${text}${tailTrim ? ' …' : ''}`;
}
