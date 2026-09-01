// Inline [n] citations — the join between synthesis and its evidence.
//
// INVARIANTS.md §2: every text surface is context + evidence + synthesis + provenance.
// The chat bubble rendered the synthesis and orphaned the evidence: the model cites
// inline as [1], [2] (api/src/services/corpus-retrieve.js instructs it to), the receipt
// holds the source, and the two only met inside a collapsed "Our working" drawer. A
// founder read a bare "[1]" with nothing behind it.
//
// This is display-only. msg.content is never mutated — same rule as stripEmphasis.
//
// The honest constraint: a marker becomes a citation ONLY when a hit in this answer's
// own receipt carries that number. An unmatched [n] stays literal text. A dead link, or
// a link to a source that did not actually ground the sentence, is worse than a bare
// bracket — it is the invented-provenance failure this product exists to refuse.

// Citation markers only: [1], [12]. Digits and nothing else, so "[see below]" and
// "[SOC 2]" are prose and stay prose.
const MARKER = /\[(\d{1,3})\]/g;

// Publisher is DERIVED from the source url, never stored or guessed. No url → null,
// and the card shows the corpus holding instead of a publisher it cannot name.
function publisherOf(sourceUrl) {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Split `content` into an array of strings and resolved citation objects, in order.
 *
 * A citation object is:
 *   { n, slug, layer, excerpt, source_url, publisher, fetched_at }
 *
 * Strings are rendered as text; objects are rendered as an inline reference. Text with
 * no resolvable markers comes back as a single string, so the common path costs nothing.
 *
 * @param {string} content            the persona's reply, verbatim
 * @param {{hits?: object[]}} receipt  this answer's retrieval receipt (msg.working)
 * @returns {(string|object)[]}
 */
export function resolveCitations(content, receipt) {
  if (!content) return [];

  const hits = receipt?.hits;
  if (!hits?.length) return [content];

  const byNumber = new Map(hits.map((h) => [Number(h.n), h]));

  const parts = [];
  let last = 0;
  for (const match of content.matchAll(MARKER)) {
    const hit = byNumber.get(Number(match[1]));
    if (!hit) continue;   // unmatched marker — falls through as literal text

    if (match.index > last) parts.push(content.slice(last, match.index));
    parts.push({
      n: Number(match[1]),
      slug: hit.slug ?? null,
      layer: hit.layer ?? null,
      excerpt: hit.excerpt ?? null,       // verbatim — windowing belongs to tidyExcerpt
      source_url: hit.source_url ?? null,
      publisher: publisherOf(hit.source_url),
      fetched_at: hit.fetched_at ?? null,
    });
    last = match.index + match[0].length;
  }

  if (!parts.length) return [content];
  if (last < content.length) parts.push(content.slice(last));
  return parts;
}
