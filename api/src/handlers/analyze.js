// POST /api/v1/session/:id/analyze
// Runs gap analysis on the in-memory session and writes trust_score + gaps back.
// Called by the chat UI immediately after infer-status reaches 'complete'.
// Idempotent: if trust_score is already set, returns cached result immediately.

import { getSession, updateSession, appendLog } from '../services/session-store.js';
import { normalizeContext } from '../services/context-normalizer.js';
import { runGapAnalysis } from '../services/gap-mapper.js';
import { generateReading, corpusQueryFor } from '../services/cold-reading.js';
import { toReceiptHits } from './record.js';

export async function analyzeHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'session_not_found' });
  }
  if (session.infer_status !== 'complete') {
    return reply.status(425).send({ error: 'inference_not_complete', status: session.infer_status });
  }

  // Already analyzed — return cached result. `reading`/`reading_anchors` were
  // generated (or honestly attempted and came back null/[]) the first time this
  // session hit the fresh path below — never re-generated here, so a re-analyze never
  // re-bills Bedrock (or the corpus lookup).
  if (session.trust_score != null) {
    return reply.send({
      session_id: session.id,
      company_name: session.company_name,
      trust_score: session.trust_score,
      gaps: session.gaps,
      deal_readiness: session.deal_readiness,
      inferences: session.inferences,
      sources_read: session.sources_read,
      pages_read_count: session.pages_read_count ?? 0,
      reading: session.reading ?? null,
      reading_anchors: session.reading_anchors ?? [],
      corpus_citations: session.corpus_citations ?? null,
    });
  }

  // Act "reading" (John ruling 2026-08-25) — the final narrated act, closing the
  // whole-thinking stream. Fresh path only; the cached early-return above appends
  // nothing. Any throw below still closes the act + the stream before propagating —
  // never strand the frontend's accordion mid-open.
  appendLog(id, { type: 'act', act: 'reading', phase: 'start', title: 'Writing your read', note: 'claude haiku · bedrock' });

  let context, gaps, trust_score, readiness, vendors, reading, reading_anchors;
  try {
    context = normalizeContext(session);
    ({ gaps, trust_score, readiness, vendors } = await runGapAnalysis(context, { session_id: id }));
    appendLog(id, { act: 'reading', type: 'act_body', text: `weighed ${gaps.length} gaps against your trail` });

    // "The reading": a synthesized, hedged cold-read paragraph, with a deterministic
    // evidence-anchor trail alongside it. Honest degradation is built into
    // generateReading() — Bedrock failure or empty output resolves to
    // { reading: null, anchors: [] } here, and the frontend opener falls back to the
    // existing bullet list silently (chips disappear with it — the two are atomic).
    // Cached on the session (below) so re-analyze never regenerates either.
    appendLog(id, { act: 'reading', type: 'act_body', text: 'asking haiku to write — hedge-bound, three beats' });
    ({ reading, anchors: reading_anchors } = await generateReading(session));

    if (reading) {
      for (const anchor of reading_anchors || []) {
        // When the label already names the source (e.g. "Company research ·
        // perplexity" with source "perplexity"), printing "label · source" doubles
        // it up ("perplexity · perplexity" — live rehearsal finding 4). Print the
        // label alone in that case; otherwise keep the "label · source" form.
        const label = anchor.label || '';
        const source = anchor.source || '';
        const text = source && label.toLowerCase().includes(source.toLowerCase())
          ? `↳  ${label}`
          : `↳  ${label} · ${source}`;
        appendLog(id, { act: 'reading', type: 'act_body', text });
      }
    } else {
      appendLog(id, { act: 'reading', type: 'act_body', text: "the read didn't come together — falling back to plain signals", color: 'muted' });
    }
  } catch (err) {
    appendLog(id, { type: 'act', act: 'reading', phase: 'fail', note: 'failed' });
    appendLog(id, { type: '__done__' });
    request.log?.error?.(err, 'analyze failed');
    return reply.status(500).send({ error: 'analyze_failed' });
  }

  appendLog(id, { type: 'act', act: 'reading', phase: 'done' });
  appendLog(id, { type: '__done__' });

  // Citation cards (PROOF360-CORPUS-CITATION-CARDS-001): the scan-time corpus hits,
  // receipt-shaped, so the frontend renders them with the same OurWorking cards the
  // chat already uses. Attached ONLY when hits exist — [] (looked, nothing) and null
  // (could not look) both surface in the scan trace's corpus act instead; rendering
  // a chat-tuned zero-state under the reading would misstate what happened (ABSENCE RULE).
  const corpus_citations = Array.isArray(session.corpus_hits) && session.corpus_hits.length
    ? { query: corpusQueryFor(session) ?? null, hits: toReceiptHits(session.corpus_hits) }
    : null;

  updateSession(id, {
    trust_score,
    gaps,
    deal_readiness: readiness,
    vendors,
    merged_context: context,
    analysis_status: 'complete',
    reading,
    reading_anchors,
    corpus_citations,
  });

  return reply.send({
    session_id: session.id,
    company_name: session.company_name,
    trust_score,
    gaps,
    deal_readiness: readiness,
    inferences: session.inferences,
    sources_read: session.sources_read,
    pages_read_count: session.pages_read_count ?? 0,
    reading,
    reading_anchors,
    corpus_citations,
  });
}
