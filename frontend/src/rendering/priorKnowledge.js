// What the record already held about a company before this conversation began.
//
// The claim "we knew this before you told us" is only worth making if it is
// literally true, so the filter is strict and every rule here exists to keep one
// sentence honest:
//
//   1. fetched STRICTLY BEFORE the session started — anything gathered during
//      the read is not prior knowledge, it is this read
//   2. third-party only — our own notes about a company (vendor/ethiks360,
//      company/ethikslabs) are what WE wrote, not what the world held
//   3. a real fetch date, or it is dropped — never assume a holding is old
//   4. one row per publisher — three chunks of one article is one thing known,
//      not three
import { sensitivityOf } from './sensitivity.js';

export function publisherOf(hit) {
  const url = typeof hit?.source_url === 'string' ? hit.source_url.trim() : '';
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function priorHoldings(hits, sessionStartedAt) {
  if (!Array.isArray(hits)) return [];
  const start = Number.isFinite(sessionStartedAt) ? sessionStartedAt : Date.now();

  const byPublisher = new Map();

  for (const hit of hits) {
    if (!hit || typeof hit !== 'object') continue;

    // (2) ours is not the world's. sensitivityOf flags our own layers, and also
    // anything with no source_url — which (3) would drop anyway.
    const mark = sensitivityOf(hit);
    if (mark?.reasons?.includes('our own material')) continue;

    const publisher = publisherOf(hit);
    if (!publisher) continue;

    // (3) no date, no claim.
    const fetched = hit.fetched_at ? Date.parse(hit.fetched_at) : NaN;
    if (!Number.isFinite(fetched)) continue;

    // (1) strictly before — a holding gathered mid-read is not prior knowledge.
    if (fetched >= start) continue;

    // (4) one row per publisher, keeping the earliest fetch and the longest
    // excerpt, which is the one most likely to carry the substance.
    const existing = byPublisher.get(publisher);
    if (!existing) {
      byPublisher.set(publisher, { ...hit, publisher, fetchedMs: fetched });
      continue;
    }
    if (fetched < existing.fetchedMs) existing.fetchedMs = fetched;
    if ((hit.excerpt?.length ?? 0) > (existing.excerpt?.length ?? 0)) {
      existing.excerpt = hit.excerpt;
      existing.source_url = hit.source_url;
    }
  }

  return [...byPublisher.values()];
}

export default priorHoldings;
