// Corpus retrieval for the persona chat (John go 2026-08-22: "test the query using
// the proof360 interface with the personas and see what we can get from the corpus").
//
// Same door gap-mapper already uses (:3009 corpus-search). The caller arrives as
// clearance "public" at the corpus side — access control is enforced THERE, per
// document, fail-closed; nothing here elevates or filters. Retrieval is an
// enhancement: any failure returns null and the chat proceeds unretrieved — the
// persona must then say what the corpus doesn't hold, never invent (show-the-work).
//
// Contract (John ruling — the ABSENCE RULE: could-not-look ≠ looked-and-found-nothing):
//   array (non-empty)  — reached the corpus, hits scored ≥ MIN_SCORE
//   []                 — reached the corpus fine, nothing scored (a real, honest zero)
//   null               — could NOT look: unreachable, timed out, or !ok. ONLY this case.
// Every consumer must keep these three states distinct — collapsing [] into null turns
// "we looked and found nothing" into a lie about "we couldn't look".
const CORPUS_SEARCH_URL = process.env.CORPUS_SEARCH_URL || 'http://localhost:3009/search';

const MIN_SCORE = 0.35;
const MAX_CHUNKS = 4;
const CHUNK_CHARS = 500;

// Default timeout suits the latency-sensitive chat path. The full corpus on the box
// takes 4-6s for a cold embedding search (caught live 2026-08-25: the scan-time corpus
// act read "unreachable" against a healthy corpus purely because 3.5s aborted first) —
// scan-time callers pass a longer timeout_ms; the long-hand read optimises for witness,
// not speed, so waiting for a real answer is the point.
export async function retrieveCorpusEvidence(userMessage, context = {}) {
  const query = [userMessage, context.company_name].filter(Boolean).join(' — ');
  try {
    const resp = await fetch(CORPUS_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: [query], topK: MAX_CHUNKS + 2 }),
      signal: AbortSignal.timeout(context.timeout_ms ?? 3500),
    });
    if (!resp.ok) return null; // could not look — !ok is an infrastructure/response failure
    const [results] = await resp.json();
    const hits = (results ?? []).filter((r) => r.score >= MIN_SCORE).slice(0, MAX_CHUNKS);
    if (!hits.length) return []; // reached fine, nothing scored — a real, honest zero
    return hits.map((r, i) => ({
      n: i + 1,
      slug: r.object_slug,
      layer: r.layer,
      evidence_id: r.evidence_id,
      score: r.score,
      text: (r.text ?? '').slice(0, CHUNK_CHARS),
      // Citation-card fields ("Our working" UX): publisher original + when we fetched it.
      source_url: r.source_url ?? null,
      fetched_at: r.fetched_at ?? null,
    }));
  } catch {
    return null; // corpus unreachable — chat degrades gracefully, never breaks
  }
}

export function evidenceBlock(hits) {
  if (!hits?.length) return '';
  const lines = hits.map((h) => `[${h.n}] (${h.slug} · ${h.layer}) "${h.text}"`);
  return [
    '',
    '--- CORPUS EVIDENCE (retrieved for this question from the live knowledge substrate) ---',
    ...lines,
    '--- END CORPUS EVIDENCE ---',
    'Ground your answer in this evidence where it is relevant, and cite inline as [1], [2] with the source name.',
    'Media-quote rule: you may quote AT MOST one short passage (a sentence or less) per answer, in quotation marks, always attributed by publication or source name — like a journalist. Everything else is paraphrase-with-citation. Never reproduce source text at length.',
    'If the evidence does not cover the question, say plainly that the corpus does not yet hold that — never invent facts or numbers.',
  ].join('\n');
}
