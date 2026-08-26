// Sensitivity marking for corpus citations.
//
// John's ruling 2026-08-26, after an anonymous read of dnx.solutions returned our
// own partner-strategy notes — verbatim quotes from a private DNX call — rendered
// as a citation card beside a Yahoo Finance article: "That is all privacy - for
// the lab today, let it all out for Sarvesh to see, but if we do can we tag it as
// potentially sensitive - just for the demo?"
//
// So this filters nothing. The card still appears; Sarvesh is being shown the
// whole kit, edges included. What it stops is our own material passing itself off
// as neutral third-party evidence about somebody else — which is a category
// error before it is a privacy one, and would still be one for material we were
// happy to publish.
//
// DEMO-SCOPED. The durable fix is the access-class question left open: what the
// default class is for our own layers (they are all `public` today, alongside QMS
// records and an account application), and whether a customer-facing read should
// reach them at all. This makes the exposure visible. It does not close it.

// Layers that are OURS. Matched on the segment, not a substring, so a partner
// layer that merely contains a word we use (vendor/paloalto) is never caught.
const OUR_LAYER_SEGMENTS = new Set(['ethikslabs', 'ethiks360', 'ethiks']);

export const SENSITIVE_NOTE =
  'Our own record, not a published source — nothing here you can open and check.';

/**
 * @param {object|null} hit a corpus hit: { layer, source_url, ... }
 * @returns {{reasons: string[], note: string}|null} null when the hit is an
 *          ordinary third-party source with somewhere to click.
 */
export function sensitivityOf(hit) {
  if (!hit || typeof hit !== 'object') return null;

  const reasons = [];

  const segments = String(hit.layer ?? '').toLowerCase().split('/').filter(Boolean);
  if (segments.some((s) => OUR_LAYER_SEGMENTS.has(s))) {
    reasons.push('our own material');
  }

  // A citation the reader cannot open is a claim, not a source. This is the same
  // standard the citation card already holds itself to when it decides whether to
  // offer "Read the original →".
  const url = typeof hit.source_url === 'string' ? hit.source_url.trim() : '';
  if (!url) {
    reasons.push('no published source');
  }

  if (reasons.length === 0) return null;
  return { reasons, note: SENSITIVE_NOTE };
}

export default sensitivityOf;
