import { createSession, updateSession, appendLog } from '../services/session-store.js';
import { extractSignals } from '../services/signal-extractor.js';
import { buildInferences } from '../services/inference-builder.js';
import { buildInferredClaims } from '../services/claims-projection.js';
import { emitPulse } from '../services/pulse-emitter.js';
import { extractReconContext } from '../services/recon-pipeline.js';
import { retrieveCorpusEvidence } from '../services/corpus-retrieve.js';
import { corpusQueryFor } from '../services/cold-reading.js';
import { extractPositionSignals } from '../services/position-signals.js';
import { resolveSessionIdentity } from '../services/holding-identity.js';
import { preflight } from '../services/domain-preflight.js';
import { query } from '../db/pool.js';

const RECON_SOURCES = ['dns', 'http', 'certs', 'ip', 'github', 'jobs', 'hibp', 'ports', 'ssllabs', 'abuseipdb'];

export async function sessionStartHandler(request, reply) {
  const { website_url, deck_file, source } = request.body || {};

  if (!website_url && !deck_file) {
    return reply.status(400).send({
      error: 'Provide a website_url or deck_file',
      code: 'INVALID_INPUT',
    });
  }

  // Create session in Postgres — canonical UUID source
  const pgRes = await query(
    `INSERT INTO sessions (url, status) VALUES ($1, 'active') RETURNING id`,
    [website_url || null]
  );
  const sessionId = pgRes.rows[0].id;

  // Mirror into in-memory store with the Postgres UUID (pipeline state adapters read from here)
  const session = createSession({ id: sessionId, website_url, deck_file, source: source || 'user' });

  emitPulse({
    type: 'event',
    severity: 'info',
    tags: ['assessment', 'started'],
    payload: { action: 'assessment_started', session_id: session.id, website_url: session.website_url },
  });

  extractAndInfer(session.id, { website_url, deck_file, session_id: session.id }, (line) => appendLog(session.id, line));

  return reply.status(201).send({ session_id: session.id });
}

/** "congisys.co.uk" → "congisys.co.uk"; tolerant of a bare host or a full URL. */
function hostOf(website_url) {
  if (!website_url) return null;
  try {
    const u = String(website_url).startsWith('http') ? website_url : `https://${website_url}`;
    return new URL(u).hostname;
  } catch {
    return String(website_url).trim() || null;
  }
}

async function extractAndInfer(sessionId, { website_url, deck_file, session_id }, log) {
  try {
    // ── THE DOOR CHECK, BEFORE ANYTHING ELSE ───────────────────────────────────
    // John, 2026-09-02: "it should be before anything... we read it, check the site,
    // and go 'that does not exist, did you mean something else, here is what could be
    // close' — no reads, no searches, nothing."
    //
    // A typo'd domain used to run the whole pipeline against a door that was not there:
    // four corpus retrievals, a BILLED live-web search, a second research engine, an
    // eleven-signal correlation, an infrastructure probe and an LLM write — and then it
    // asked the founder to confirm a product type for a company that does not exist.
    // One DNS lookup answers it, costs nothing, and gives a better reply.
    //
    // Only when a domain is being read. A deck upload has no door to knock on.
    const host = hostOf(website_url);
    if (host && !deck_file) {
      const door = await preflight(host);
      if (!door.exists) {
        log({ text: `$ proof360 --url ${host}`, type: 'cmd' });
        log({ type: 'act', act: 'preflight', phase: 'start', title: 'Checking the address', note: 'dns' });
        log({ act: 'preflight', type: 'act_body', text: `${host} does not resolve — no address record, no mail`, color: 'muted' });
        for (const s of door.suggestions) {
          log({ act: 'preflight', type: 'act_body', text: `↳  ${s} does exist`, color: 'query' });
        }
        log({ type: 'act', act: 'preflight', phase: 'done', note: door.suggestions.length ? 'suggestion found' : 'no near match' });
        updateSession(sessionId, {
          infer_status: 'address_not_found',
          address_not_found: true,
          address_suggestions: door.suggestions,
          pages_read_count: 0,
        });
        log({ type: 'done' });
        return;   // nothing else runs. No corpus, no research, no model, no bill.
      }
    }

    const { signals, sources_read, enterprise_signals, competitor_mentions, recon_context, company_summary, pages_read_count, used_web_research, research_engines } =
      await extractSignals({ website_url, deck_file, session_id }, log);

    const reconFlat = extractReconContext(recon_context);
    const inferenceResult = buildInferences(signals, sources_read, website_url, reconFlat);

    // Seed the Record (ETHL-WRK-SPEC-011): every probe/extraction output becomes an
    // inferred claim with named provenance — inferred until the founder confirms.
    // `origin` is what actually ran. Without it every inferred claim carried the
    // hardcoded provenance "website extraction", including on sessions that read
    // zero pages — a claim asserting a source it never had.
    const claimRecords = buildInferredClaims({
      recon: reconFlat,
      signals,
      origin: { pages_read_count: pages_read_count ?? 0, research_engines: research_engines || [] },
    });

    // Act 8 — corpus (John ruling 2026-08-25): scan-time retrieval feeding read-time
    // use, one call, one bill. Same query construction as cold-reading.js's
    // corpusEvidence() (corpusQueryFor) so the cached hits ARE the same retrieval the
    // reading would otherwise do. Cache contract on session.corpus_hits (retrieveCorpusEvidence's
    // three-state contract, corpus-retrieve.js): absent = never attempted (field predates
    // this cache); null = attempted, could NOT look — unreachable/timeout/!ok, or no
    // company to query with (no retry either way); [] = attempted, reached fine, nothing
    // scored (a real, honest zero — distinct from null, ABSENCE RULE); array = hits.
    log({ type: 'act', act: 'corpus', phase: 'start', title: 'Checking our research holdings', note: 'corpus · veritas' });
    const corpusQuery = corpusQueryFor({ company_name: inferenceResult.company_name, website_url });
    let corpus_hits = null;
    if (corpusQuery) {
      log({ act: 'corpus', type: 'act_body', text: corpusQuery, color: 'query' });
      corpus_hits = await retrieveCorpusEvidence(corpusQuery, { company_name: inferenceResult.company_name, timeout_ms: 12_000 }).catch(() => null);
    }
    if (corpus_hits?.length) {
      for (const hit of corpus_hits) {
        // Name the publisher in the trace — the reference is the point (gate ruling).
        let domain = null;
        if (hit.source_url) {
          try { domain = new URL(hit.source_url).hostname.replace(/^www\./, ''); } catch { /* malformed URL — show without it */ }
        }
        log({ act: 'corpus', type: 'act_body', text: `↳  ${hit.slug} · ${hit.layer} · score ${Number(hit.score).toFixed(2)}${domain ? ` · ${domain}` : ''}` });
      }
      log({ type: 'act', act: 'corpus', phase: 'done', note: `${corpus_hits.length} holding${corpus_hits.length === 1 ? '' : 's'}` });
    } else if (corpus_hits !== null) {
      // Reached the corpus fine, nothing scored — an honest zero we DID look for,
      // never confused with the could-not-look case below (ABSENCE RULE).
      log({ act: 'corpus', type: 'act_body', text: 'no holdings touch this company yet', color: 'muted' });
      log({ type: 'act', act: 'corpus', phase: 'done', note: '0 holdings' });
    } else {
      // Could not look at all — unreachable/timeout/!ok, or no company identified to
      // query with. No absence body line: we never looked, so we cannot honestly say
      // what we found (ABSENCE RULE — could-not-look ≠ looked-and-found-nothing).
      log({ type: 'act', act: 'corpus', phase: 'skip', note: corpusQuery ? 'corpus unreachable' : 'no company identified' });
    }

    // IDENTITY, RESOLVED ONCE (John, 2026-09-02, second pass). Every consumer below
    // — position signals, the reading, the prior-knowledge panel, the advisors — used
    // to make this call for itself or not at all, and the ones that did not published
    // a profile of a similarly-named company off a typo'd domain. Resolved here,
    // stamped onto each holding, read everywhere else.
    const identity = resolveSessionIdentity({
      company_name: inferenceResult.company_name,
      website_url,
      hits: corpus_hits,
      pages_read_count,
      company_summary,
    });
    if (corpus_hits?.length && !identity.any_confirmed) {
      // Visible in the trace, because a founder watching the thinking should see the
      // machine decline to use something as readily as they see it use something.
      log({
        act: 'corpus', color: 'query', type: 'act_body',
        text: `↳  none of these can be tied to ${identity.domain || 'this domain'} — held as unconfirmed, not spoken as fact`,
      });
    }

    // Position signals — read the holdings for where this company STANDS (size,
    // reach, age, market position), which the website extractor cannot see. Kept in
    // its own session field rather than merged into raw_signals: these carry
    // observations[] + confirmation instead of a flat confidence, and the gap engine
    // reads raw_signals. Passes corpus_hits through untouched, so the corpus
    // three-state absence contract survives — null stays null.
    const position_signals = await extractPositionSignals(corpus_hits, {
      company_name: inferenceResult.company_name,
      correlation_id: sessionId,
    }).catch(() => null);
    if (position_signals?.length) {
      log({ act: 'corpus', type: 'act_body', text: `↳  ${position_signals.length} position signal${position_signals.length === 1 ? '' : 's'} from holdings`, color: 'muted' });
    }

    // Success path: no __done__ here — the stream stays open through analyze.js's
    // "reading" act (John ruling 2026-08-25). The extraction-FAILURE catch below keeps
    // its __done__ unchanged — a failed scan must still close the stream.
    updateSession(sessionId, {
      infer_status: 'complete',
      claim_records: claimRecords,
      claim_events: [],
      raw_signals: signals,
      position_signals,
      inferences: inferenceResult.inferences,
      correctable_fields: inferenceResult.correctable_fields,
      followup_questions: inferenceResult.followup_questions,
      company_name: inferenceResult.company_name,
      source_summary: inferenceResult.source_summary,
      sources_read: inferenceResult.sources_read,
      pages_read_count: pages_read_count ?? 0,
      signals_detected: inferenceResult.signals_detected,
      enterprise_signals,
      competitor_mentions,
      recon_context: recon_context || null,
      company_summary: company_summary || null,
      used_web_research: !!used_web_research,
      research_engines: research_engines || [],
      corpus_hits,
      identity,
    });

    // Persist signals and recon to Postgres — non-blocking, failures don't affect in-memory pipeline
    persistExtractionResults(sessionId, { signals, recon_context }).catch((err) => {
      console.error(JSON.stringify({ event: 'pg_persist_failed', session_id: sessionId, error: err.message }));
    });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'extraction_failed', session_id: sessionId, error: err.message,
    }));
    emitPulse({
      type: 'alert',
      severity: 'warning',
      tags: ['pipeline', 'error'],
      payload: { action: 'extraction_failed', session_id: sessionId, error: err.message },
    });
    log({ text: `  ✗  Extraction failed: ${err.message}`, type: 'err' });
    log({ type: '__done__' });
    updateSession(sessionId, { infer_status: 'failed' });
  }
}

async function persistExtractionResults(sessionId, { signals, recon_context }) {
  const now = new Date().toISOString();

  for (const signal of signals) {
    await query(
      `INSERT INTO signals (session_id, field, inferred_value, inferred_source, inferred_at, status)
       VALUES ($1, $2, $3, $4, $5, 'inferred')
       ON CONFLICT (session_id, field) DO NOTHING`,
      [sessionId, signal.type, String(signal.value), 'extractor', now]
    );
  }

  if (recon_context) {
    for (const source of RECON_SOURCES) {
      const payload = recon_context[source];
      if (payload && !payload.error) {
        await query(
          `INSERT INTO recon_outputs (session_id, source, payload, fetched_at, ttl_seconds)
           VALUES ($1, $2, $3, now(), 3600)
           ON CONFLICT (session_id, source) DO NOTHING`,
          [sessionId, source, JSON.stringify(payload)]
        );
      }
    }
  }
}
