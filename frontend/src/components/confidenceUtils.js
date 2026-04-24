/**
 * Pure logic: show the confidence chip iff the gap-level confidence
 * differs from the overall report confidence.
 *
 * Used by GapCard to decide whether to render a ConfidenceChip.
 */
export function shouldShowConfidenceChip(gapConfidence, overallConfidence) {
  return gapConfidence !== overallConfidence;
}
