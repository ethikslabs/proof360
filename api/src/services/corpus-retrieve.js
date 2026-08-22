// Corpus retrieval for the persona chat (John go 2026-08-22: "test the query using
// the proof360 interface with the personas and see what we can get from the corpus").
//
// Same door gap-mapper already uses (:3009 corpus-search). The caller arrives as
// clearance "public" at the corpus side — access control is enforced THERE, per
// document, fail-closed; nothing here elevates or filters. Retrieval is an
// enhancement: any failure returns null and the chat proceeds unretrieved — the
// persona must then say what the corpus doesn't hold, never invent (show-the-work).
const CORPUS_SEARCH_URL = process.env.CORPUS_SEARCH_URL || 'http://localhost:3009/search';

const MIN_SCORE = 0.35;
const MAX_CHUNKS = 4;
const CHUNK_CHARS = 500;

export async function retrieveCorpusEvidence(userMessage, context = {}) {
  const query = [userMessage, context.company_name].filter(Boolean).join(' — ');
  try {
    const resp = await fetch(CORPUS_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: [query], topK: MAX_CHUNKS + 2 }),
      signal: AbortSignal.timeout(3500),
    });
    if (!resp.ok) return null;
    const [results] = await resp.json();
    const hits = (results ?? []).filter((r) => r.score >= MIN_SCORE).slice(0, MAX_CHUNKS);
    if (!hits.length) return null;
    return hits.map((r, i) => ({
      n: i + 1,
      slug: r.object_slug,
      layer: r.layer,
      evidence_id: r.evidence_id,
      score: r.score,
      text: (r.text ?? '').slice(0, CHUNK_CHARS),
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
    'If the evidence does not cover the question, say plainly that the corpus does not yet hold that — never invent facts or numbers.',
  ].join('\n');
}
