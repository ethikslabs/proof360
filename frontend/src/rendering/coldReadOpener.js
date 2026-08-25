// frontend/src/rendering/coldReadOpener.js
//
// Cold-read opening message — lamp register (INVARIANTS §6 personas-as-lenses; the
// product lights ground and offers choices, it never grades or pushes). Extracted out
// of Chat.jsx so the copy is testable without rendering the whole chat surface.
//
// Two honest reads, never a score, never "Ask me anything":
//   - full read:     real pages were fetched — "read complete", then the inferred
//                     narrative, then an invitation to correct it.
//   - degraded read: no pages could be fetched (the site wouldn't open) — perimeter-
//                     read framing (DNS/certs/wider record only), first guesses, same
//                     invitation to correct.
//
// `sourcesRead` must be the count of pages genuinely scraped (the API's
// pages_read_count) — not sources_read.length, which still carries a placeholder
// label ("homepage") even when the real scrape failed and fallback signals were used.
// Passing the wrong one silently re-introduces the dishonesty this module exists to kill.
//
// `reading` (John ruling 2026-08-25 — "the reading"): when the API hands back a
// non-empty synthesized paragraph, it REPLACES the bullet list entirely — the honest
// degraded/full headline stays (it's the one thing the reading itself never restates),
// then the reading, and nothing else; the reading already ends with its own correction
// invite, so the old "Does this sound right?" tail is dropped too, never doubled up.
// `reading === null` (Bedrock failure, empty output, or simply not fetched yet) is
// exactly the pre-existing behavior — bullets, unchanged.

function inferenceLine(inf) {
  const label = inf?.label;
  if (!label) return null;
  return inf.confidence ? `- ${label} (${inf.confidence})` : `- ${label}`;
}

export function coldReadOpener({ name, sourcesRead, inferences, reading }) {
  const displayName = name || 'This company';
  const pagesRead = Number(sourcesRead) || 0;

  const headline = pagesRead > 0
    ? `${displayName} — read complete. Here's what the public record suggests — tell me what's right and what's off.`
    : `${displayName} — their site wouldn't open for us, so this is a perimeter read only: DNS, certificates, and what the wider record holds. Take everything below as first guesses — correct me freely.`;

  const trimmedReading = typeof reading === 'string' ? reading.trim() : '';
  if (trimmedReading) {
    return `${headline}\n\n${trimmedReading}`;
  }

  const lines = (inferences ?? []).map(inferenceLine).filter(Boolean);

  if (lines.length === 0) {
    return `${headline}\n\nWe couldn't infer much from the outside — tell me about the company and we'll build from your words.`;
  }

  return `${headline}\n\nWhat we've inferred so far:\n${lines.join('\n')}\n\nDoes this sound right? Anything to change?`;
}

// Reading anchors — a quiet, non-interactive trace of what fed the reading. Rendered
// as a single row of small chips directly under the reading text (Bubble.jsx). Label
// only — the anchor's `source` field is provenance for engineering/debugging, never
// shown to the founder. Returns [] whenever there is no reading (chips must never
// outlive the text they annotate — the two are atomic) or no anchors were supplied.
export function readingAnchorLabels(reading, anchors) {
  const trimmedReading = typeof reading === 'string' ? reading.trim() : '';
  if (!trimmedReading || !Array.isArray(anchors) || !anchors.length) return [];
  return anchors.map((a) => a?.label).filter(Boolean);
}
