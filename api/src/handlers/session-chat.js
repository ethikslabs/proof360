import { getSession, updateSession, persistSession } from '../services/session-store.js';
import { buildSystemPrompt } from '../services/persona-prompts.js';
import { notifyJohn } from '../services/john-relay.js';
import { normalizeContext } from '../services/context-normalizer.js';
import { runGapAnalysis } from '../services/gap-mapper.js';
import { chatStream } from '../lib/inference.js';
import { buildClaimEvent, claimsProjection, nextConfirmable } from '../services/claims-projection.js';
import {
  confirmPromptBlock, interpretConfirmReply, ceremonyResultNote, proposalPromptBlock,
  questionWasVoiced, proposalWasVoiced,
} from '../services/confirm-ceremony.js';
import { sessionRecordSnapshot, appendChatReceipt } from './record.js';
import { liveProposals, acceptProposal } from './shortlist.js';
import { retrieveCorpusEvidence, evidenceBlock } from '../services/corpus-retrieve.js';

const MODEL = 'claude-haiku-4-5-20251001';

// What this seam can ACTUALLY serve — i.e. what inference.js MODEL_MAP resolves to
// a real Bedrock inference profile. The picker offers seven models across four
// providers (Bedrock, NVIDIA, Google, Foundry) because the breadth is the point:
// this is a market, not a monolith. But breadth in the chrome is a promise, and
// until the other lanes are wired, picking one of them answered as Haiku wearing
// its name — which is how "● Claude Sonnet 4.6 · Bedrock" came to sit above a
// Haiku answer on John's screen (2026-08-26).
//
// Azure stays off this list on standing estate ruling regardless of wiring
// (inference priority: Bedrock → NIM → paid; Azure banned).
export const SERVED_MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'];

// Default-deny: an unrecognised model_override is a request we cannot honour, not
// a hint to interpret. We fall back — but we SAY that we fell back, so the surface
// can report what answered instead of what was asked for. A silent substitution is
// the bug; a declared one is just an honest limit.
export function resolveChatModel(requested) {
  if (requested && SERVED_MODELS.includes(requested)) {
    return { model: requested, requested, substituted: false };
  }
  return { model: MODEL, requested: requested ?? null, substituted: !!requested };
}

// persona_override whitelist — accepts both 'sofia' (frontend persona id) and
// 'sophia' (canonical persona name), normalized to 'sophia' internally.
const PERSONA_OVERRIDE_MAP = { sofia: 'sophia', sophia: 'sophia', leonardo: 'leonardo', edison: 'edison' };

const INTENT_RULES = [
  {
    persona: 'leonardo',
    keywords: ['investor', 'funding', 'raise', 'term sheet', 'valuation', 'due diligence',
               'board', 'vc', 'lp', 'fundraise', 'capital', 'pitch', 'round', 'dilution'],
  },
  {
    persona: 'edison',
    keywords: ['technical', 'security', 'architecture', 'infrastructure', 'api', 'code',
               'fix', 'ssl', 'tls', 'dns', 'firewall', 'dmarc', 'spf', 'certificate',
               'deploy', 'implementation', 'configuration', 'vulnerability', 'patch'],
  },
  {
    persona: 'sophia',
    keywords: ['story', 'narrative', 'customer', 'brand', 'message', 'communicate',
               'explain', 'perception', 'tell', 'describe', 'position', 'trust'],
  },
];

function classifyIntent(message) {
  const lower = message.toLowerCase();

  // @mention override — strip it and route
  const mention = lower.match(/@(sophia|leonardo|edison)\b/);
  if (mention) {
    return {
      persona: mention[1],
      cleanMessage: message.replace(/@(sophia|leonardo|edison)\b/gi, '').trim(),
    };
  }

  // Keyword classifier
  const scores = { sophia: 0, leonardo: 0, edison: 0 };
  for (const { persona, keywords } of INTENT_RULES) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[persona]++;
    }
  }
  const [best] = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return {
    persona: best[1] > 0 ? best[0] : 'sophia',
    cleanMessage: message,
  };
}

export async function sessionChatHandler(request, reply) {
  const { id } = request.params;
  const { message, persona_override, model_override } = request.body ?? {};
  // Honour the picker. It has been sending model_override since the chrome
  // redesign; nothing read it, so every answer was Haiku regardless.
  const { model: servedModel, substituted } = resolveChatModel(model_override);

  if (!message?.trim()) {
    return reply.status(400).send({ error: 'message_required' });
  }

  const session = getSession(id);
  if (!session) {
    return reply.status(404).send({ error: 'session_not_found' });
  }

  // Auto-analyze if inference is done but gap analysis hasn't run yet
  if (session.trust_score == null) {
    if (session.infer_status !== 'complete') {
      return reply.status(425).send({ error: 'analysis_not_ready', infer_status: session.infer_status });
    }
    const context = normalizeContext(session);
    const { gaps, trust_score, readiness, vendors } = await runGapAnalysis(context, { session_id: id });
    updateSession(id, { trust_score, gaps, deal_readiness: readiness, vendors, merged_context: context, analysis_status: 'complete' });
    session.trust_score = trust_score;
    session.gaps = gaps;
    session.merged_context = context;
  }

  // Persona selection: explicit override → @mention → keyword classifier
  // 'sofia' is accepted alongside 'sophia' (frontend chip/hero-pill persona ids use
  // 'sofia') and normalized to 'sophia' internally — see PERSONA_OVERRIDE_MAP.
  let persona, cleanMessage;
  if (persona_override && PERSONA_OVERRIDE_MAP[persona_override]) {
    persona = PERSONA_OVERRIDE_MAP[persona_override];
    cleanMessage = message;
  } else {
    ({ persona, cleanMessage } = classifyIntent(message));
  }

  // Maintain chat history on the session
  if (!session.chat_history) session.chat_history = [];
  session.chat_history.push({ role: 'user', content: cleanMessage, ts: Date.now() });

  // Build context from session data
  const context = {
    company_name: session.company_name,
    website: session.website_url,
    score: session.trust_score,
    gaps: session.gaps,
    recon: session.merged_context?.recon,
    session_id: session.id,
  };

  // --- The confirm ceremony (ETHL-WRK-SPEC-011 D3) -------------------------------
  // 1) If a confirm question is pending and this message answers it deterministically,
  //    write the claim_event (append-only; the base claim is never mutated).
  // 2) Then pick at most ONE claim to confirm this exchange and hand the persona the
  //    question to weave in naturally. Ambiguous replies write nothing — never a guess.
  let ceremonyNote = '';
  const preClaims = claimsProjection(sessionRecordSnapshot(session));
  const pendingClaim = session.pending_confirm
    ? preClaims.find((c) => c.claim_id === session.pending_confirm && c.status === 'inferred')
    : null;
  // Voiced gate (live finding 2026-08-22): capture ONLY if last exchange's reply
  // actually voiced the question — the model can ignore the injected block, and a
  // "yes" to the model's own question must never flip the unasked claim.
  if (pendingClaim && session.pending_confirm_voiced) {
    const answer = interpretConfirmReply(cleanMessage, pendingClaim);
    if (answer) {
      const event = buildClaimEvent(pendingClaim.claim_id, {
        type: answer.type, value: answer.value, actor: 'founder', via: 'chat',
      });
      session.claim_events = [...(session.claim_events || []), event];
      session.pending_confirm = null;
      ceremonyNote = ceremonyResultNote(pendingClaim, answer);
    }
  } else if (session.pending_confirm) {
    session.pending_confirm = null; // pending claim no longer open (answered via UI) — drop it
  }

  // --- The shortlist moment (ETHL-WRK-SPEC-011 D5) -------------------------------
  // Capture a pending proposal's answer, then choose at most ONE ask for this
  // exchange: an open proposal outranks the next confirm question (a proposal only
  // exists because testimony already landed). Declines are remembered — never re-pitch.
  let proposalNote = '';
  if (session.pending_proposal) {
    const pendingProp = liveProposals(session).find((p) => p.id === session.pending_proposal);
    if (!pendingProp) {
      session.pending_proposal = null; // accepted via UI or trigger no longer fires
    } else if (session.pending_proposal_voiced) {
      // Same deterministic capture as the confirm ceremony (stub claim = yes/no reuse);
      // same voiced gate — an unvoiced proposal just re-arms next exchange.
      const answer = interpretConfirmReply(cleanMessage, { field: 'proposal' });
      if (answer?.type === 'confirmed') {
        const res = acceptProposal(session, pendingProp.id);
        session.pending_proposal = null;
        if (res.move) {
          proposalNote = [
            '',
            `--- SHORTLIST RESULT: ${pendingProp.title} is now on the shortlist. ---`,
            `Recorded reason: "${res.move.reason.text}"`,
            'Acknowledge briefly and mention they can edit the reason if they want it in their own words.',
          ].join('\n');
        }
      } else if (answer?.type === 'rejected' || answer?.type === 'corrected') {
        session.declined_proposals = [...(session.declined_proposals || []), pendingProp.id];
        session.pending_proposal = null;
        proposalNote = `\n--- SHORTLIST RESULT: the user declined ${pendingProp.title}. Never propose it again. ---`;
      }
    }
  }

  let askBlock = '';
  let askedProposal = null;
  let askedClaim = null;
  if (!session.pending_proposal) {
    const [nextProposal] = liveProposals(session);
    if (nextProposal) {
      session.pending_proposal = nextProposal.id;
      askedProposal = nextProposal;
      askBlock = proposalPromptBlock(nextProposal);
    }
  } else {
    askedProposal = liveProposals(session).find((p) => p.id === session.pending_proposal) || null;
    askBlock = proposalPromptBlock(askedProposal);
  }
  // Only ONE pending question may stand — a "yes" next turn must be unambiguous.
  if (askBlock) session.pending_confirm = null;
  if (!askBlock) {
    const claims = claimsProjection(sessionRecordSnapshot(session));
    // Count how often each claim has been put to the founder, so a question they
    // keep not answering is eventually dropped instead of closing every reply
    // forever. Without this the ceremony re-picks the same inferred claim every
    // exchange — the "Looks like you're on Oracle — right?" tic.
    const asked = session.confirm_asks || {};
    const toConfirm = session.pending_confirm
      ? claims.find((c) => c.claim_id === session.pending_confirm)
      : nextConfirmable(claims, asked);
    if (toConfirm) {
      session.pending_confirm = toConfirm.claim_id;
      // NOT counted here. Arming a question is not asking it — the persona can
      // ignore the injected block entirely (the live 2026-08-22 rogue-reply case
      // the voiced gate exists for). Counting armings would retire a question the
      // founder never saw. The count is taken below, against the reply itself.
    } else {
      session.pending_confirm = null; // nothing worth asking — the reply just answers
    }
    askedClaim = toConfirm || null;
    askBlock = confirmPromptBlock(toConfirm);
  }
  // Until the reply proves otherwise, nothing is voiced this exchange (fail-closed —
  // also covers the @john path and stream failures).
  session.pending_confirm_voiced = false;
  session.pending_proposal_voiced = false;
  // -------------------------------------------------------------------------------

  // Live corpus grounding — same engine as /api/v1/chat: evidence joins the prompt,
  // and the exchange leaves a receipt ("Our working"). Honest by construction: a
  // corpus failure grounds nothing and the receipt records zero hits, never invention.
  const corpusHits = await retrieveCorpusEvidence(cleanMessage, {
    company_name: context.company_name,
  });
  appendChatReceipt(session, { query: cleanMessage, hits: corpusHits ?? [] });

  const systemPrompt = buildSystemPrompt(persona, context) + ceremonyNote + proposalNote + askBlock
    + evidenceBlock(corpusHits);

  // Last 20 turns (10 pairs) to keep context cost bounded
  const apiMessages = session.chat_history
    .slice(-20)
    .map(({ role, content }) => ({ role, content }));

  // @john passthrough — notify, skip inference
  if (/@john\b/i.test(cleanMessage)) {
    notifyJohn({
      sessionId: id,
      companyName: context.company_name,
      score: context.score,
      message: cleanMessage.replace(/@john\b/i, '').trim(),
    });
    const johnReply = "📨 John's been notified — he'll reply here shortly.";
    session.chat_history.push({ role: 'assistant', content: johnReply, persona, ts: Date.now() });
    persistSession(id); // direct mutations above — write the twin through
    return reply.type('text/plain').send(johnReply);
  }

  let headersWritten = false;
  let fullResponse = '';

  try {
    const stream = chatStream({
      model: servedModel,
      max_tokens: 300,
      messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
      correlation_id: id,
    });

    for await (const delta of stream) {
      if (!delta) continue;
      if (!headersWritten) {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
          'X-Persona': persona,
          // The model that ANSWERED, never the one that was asked for — the
          // surface badges what this header says.
          'X-Model': servedModel,
          'X-Model-Substituted': substituted ? 'true' : 'false',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'X-Persona, X-Model, X-Model-Substituted',
        });
        headersWritten = true;
      }
      fullResponse += delta;
      reply.raw.write(delta);
    }

    if (fullResponse) {
      session.chat_history.push({ role: 'assistant', content: fullResponse, persona, ts: Date.now() });
      // The reply is the evidence: mark the pending ask voiced only if it was
      // actually asked, so next exchange's capture is legitimate testimony.
      const voiced = questionWasVoiced(fullResponse, askedClaim);
      session.pending_confirm_voiced = voiced;
      // The reply is the evidence for the ask-count too: a question the founder
      // actually saw and did not answer is what earns fatigue. One unanswered
      // ask and the ceremony moves on (claims-projection MAX_ASKS_PER_CLAIM).
      if (voiced && askedClaim) {
        const prior = session.confirm_asks || {};
        session.confirm_asks = {
          ...prior,
          [askedClaim.claim_id]: (prior[askedClaim.claim_id] ?? 0) + 1,
        };
      }
      session.pending_proposal_voiced = proposalWasVoiced(fullResponse, askedProposal);
    }
    persistSession(id); // direct mutations this exchange — write the twin through

    if (headersWritten) {
      reply.raw.end();
    } else {
      return reply.status(500).send({ error: 'chat_failed' });
    }
  } catch (err) {
    request.log.error(err, 'session chat stream error');
    persistSession(id); // pre-stream mutations (history, ceremony events) still count
    if (!headersWritten) {
      return reply.status(500).send({ error: 'chat_failed' });
    }
    try {
      reply.raw.write('\n\n[error]');
      reply.raw.end();
    } catch {
      // stream already closed
    }
  }
}

export function sessionChatHistoryHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });
  return reply.send({ history: session.chat_history || [] });
}
