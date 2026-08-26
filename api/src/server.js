import Fastify from 'fastify';
import cors from '@fastify/cors';
import { checkStaleSessions, flushSessionsNow, reapOrphanedSessions } from './services/session-store.js';
import { sessionStartHandler } from './handlers/session-start.js';
import { firehoseHandler } from './handlers/firehose.js';
import { inferStatusHandler } from './handlers/infer-status.js';
import { inferencesHandler } from './handlers/inferences.js';
import { followupQuestionsHandler } from './handlers/followup-questions.js';
import { captureEmailHandler } from './handlers/capture-email.js';
import { earlySignalHandler } from './handlers/early-signal.js';
import { chatHandler } from './handlers/chat.js';
import { sessionChatHandler, sessionChatHistoryHandler } from './handlers/session-chat.js';
import { analyzeHandler } from './handlers/analyze.js';
import { sessionLogHandler } from './handlers/session-log.js';
import { featuresHandler } from './handlers/features.js';
import { adminPrereadHandler, adminPrereadStatusHandler } from './handlers/admin-preread.js';
import { healthHandler } from './handlers/health.js';
import { overrideHandler } from './handlers/override.js';
import { resolveConflictHandler } from './handlers/resolve-conflict.js';
import { recomputeHandler } from './handlers/recompute.js';
import { publishHandler } from './handlers/publish.js';
import { engageHandler } from './handlers/engage.js';
import { telegramWebhookHandler } from './handlers/telegram-webhook.js';
import { johnMessagesHandler } from './handlers/john-messages.js';
import { corpusStatsHandler } from './handlers/corpus-stats.js';
import { advisoryRegistersHandler } from './handlers/advisory.js';
import { notifyHandler } from './handlers/notify.js';
import { createTurnstileVerifyHandler } from './handlers/turnstile.js';
import { requireAuth } from './lib/auth.js';
import { journeyHandler, selectJourneyGate } from './handlers/journey.js';
import {
  profileCurrentHandler,
  profileEventsHandler,
  profileProjectionsHandler,
} from './handlers/profile.js';
import { sessionAttachHandler } from './handlers/session-attach.js';
import { recordHandler, claimAnswerHandler, chatReceiptsHandler } from './handlers/record.js';
import { proposalsHandler, shortlistHandler, proposalAcceptHandler, proposalDeclineHandler, shortlistAddHandler } from './handlers/shortlist.js';
import { sessionFollowupsHandler } from './handlers/session-followups.js';
import {
  cersListHandler,
  cerCreateHandler,
  cerConsentWithdrawHandler,
  cerStatusHandler,
} from './handlers/cer.js';

const PORT = parseInt(process.env.PORT || '3002', 10);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const app = Fastify({ logger: { level: LOG_LEVEL } });

await app.register(cors, { origin: true });

// --- Phase 1: Cold read ---
app.post('/api/v1/session/start', sessionStartHandler);
// The firehose: cold read from nothing — the founder just talks (ETHL 2026-08-23)
app.post('/api/v1/firehose', firehoseHandler);
app.get('/api/v1/session/:id/log', sessionLogHandler);
app.get('/api/v1/session/:id/infer-status', inferStatusHandler);
app.get('/api/v1/session/:id/inferences', inferencesHandler);

// --- The Record (ETHL-WRK-SPEC-011): claims, truth ladder, confirm/edit verbs ---
app.get('/api/v1/session/:id/record', recordHandler);
app.post('/api/v1/session/:id/claims/:claimId/answer', claimAnswerHandler);
app.get('/api/v1/session/:id/chat/receipts', chatReceiptsHandler);

// --- The shortlist (ETHL-WRK-SPEC-011 P2): register proposals → Moves with reasons ---
app.get('/api/v1/session/:id/proposals', proposalsHandler);
app.get('/api/v1/session/:id/shortlist', shortlistHandler);
app.post('/api/v1/session/:id/proposals/:proposalId/accept', proposalAcceptHandler);
app.post('/api/v1/session/:id/proposals/:proposalId/decline', proposalDeclineHandler);
app.post('/api/v1/session/:id/shortlist', shortlistAddHandler);

// Live persona follow-up chips (2026-08-25): one Bedrock call over the Record snapshot,
// three record-grounded questions, one per persona. Honest empty on failure — never canned.
app.get('/api/v1/session/:id/followups', sessionFollowupsHandler);

// --- Phase 2: Follow-up ---
app.get('/api/v1/session/:id/followup-questions', followupQuestionsHandler);

// --- Phase 3: Override and recompute ---
app.get('/api/v1/session/:id/early-signal', earlySignalHandler);
app.post('/api/v1/session/:id/capture-email', captureEmailHandler);

// --- Phase 3: Override contract ---
app.post('/api/v1/session/:id/override', overrideHandler);
app.post('/api/v1/session/:id/resolve-conflict', resolveConflictHandler);

// --- Phase 4: Recompute kernel ---
app.post('/api/v1/session/:id/recompute', recomputeHandler);

// --- Phase 5: Tier boundary + VERITAS attestation ---
app.post('/api/v1/session/:id/publish', publishHandler);

// --- Phase 6: Engagement system ---
app.post('/api/v1/session/:id/engage', engageHandler);

// --- Persona chat ---
app.post('/api/v1/chat', chatHandler);

// --- Gap analysis (called after infer-status complete) ---
app.post('/api/v1/session/:id/analyze', analyzeHandler);

// --- Session-keyed chat (intent classification, server-side history) ---
app.post('/api/v1/session/:id/chat', sessionChatHandler);
app.get('/api/v1/session/:id/chat/history', sessionChatHistoryHandler);

// --- Founder memory kernel (private, Auth0-verified, file-backed) ---
app.get('/api/v1/profile/current', { preHandler: requireAuth }, profileCurrentHandler);
app.get('/api/v1/profile/current/projections', { preHandler: requireAuth }, profileProjectionsHandler);
const journeyGate = selectJourneyGate();
app.get('/api/v1/profile/current/journey', { preHandler: journeyGate }, journeyHandler);
app.post('/api/v1/profile/current/events', { preHandler: requireAuth }, profileEventsHandler);
app.post('/api/v1/sessions/:sessionId/profile', { preHandler: requireAuth }, sessionAttachHandler);

// --- CER (Customer Engagement Record): typed commercial Decisions on the founder-memory log ---
// Same gate as /journey: requireAuth in prod, demoAuth in DEMO_FOUNDER_MODE so the seeded
// demo founder can drive the CER flow without a token.
app.get('/api/v1/profile/current/cers', { preHandler: journeyGate }, cersListHandler);
app.post('/api/v1/profile/current/cers', { preHandler: journeyGate }, cerCreateHandler);
app.post('/api/v1/profile/current/cers/:cerId/consent-withdraw', { preHandler: journeyGate }, cerConsentWithdrawHandler);
app.post('/api/v1/profile/current/cers/:cerId/status', { preHandler: journeyGate }, cerStatusHandler);

// --- Turnstile siteverify (server is the verifier; widget token alone proves nothing) ---
app.post('/api/v1/turnstile/verify', createTurnstileVerifyHandler());

// --- John relay ---
app.post('/api/telegram/webhook', telegramWebhookHandler);
app.get('/api/v1/session/:id/john-messages', johnMessagesHandler);
app.post('/api/v1/notify', notifyHandler);

// --- CORPUS ---
app.get('/api/v1/corpus/stats', corpusStatsHandler);
app.get('/api/v1/advisory/registers', advisoryRegistersHandler);

// --- Health ---
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// --- overnight-v1 routes ---
app.get('/api/features', featuresHandler);
app.post('/api/admin/preread', adminPrereadHandler);
app.get('/api/admin/preread/:batch_id', adminPrereadStatusHandler);

// Fail anything the last process was still working on when it was replaced.
// checkStaleSessions below cannot do this: it walks the in-memory Map, which a
// fresh process starts empty, so the sessions a restart just orphaned are
// invisible to it. Runs BEFORE listen() — a poll arriving mid-reap would read
// 'processing' and start another 150-second wait for work that no longer exists.
const reaped = reapOrphanedSessions();
if (reaped.reaped || reaped.unreadable) {
  app.log.warn(`reaped ${reaped.reaped} session(s) orphaned by the last restart` +
    (reaped.unreadable ? `, ${reaped.unreadable} unreadable` : ''));
}

// Start stale session cleanup on 30-second interval
const staleInterval = setInterval(checkStaleSessions, 30_000);

app.addHook('onClose', () => {
  clearInterval(staleInterval);
});

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Proof360 API listening on port ${PORT}`);
});

// Graceful shutdown — lets PM2 SIGTERM drain in-flight requests before
// the new process starts, preventing EADDRINUSE on rapid restarts.
process.on('SIGTERM', () => {
  // Flush any coalesced session writes first — a PM2 restart must never lose
  // the last few seconds of a founder's twin (write-through is 250ms-coalesced).
  flushSessionsNow()
    .catch(() => {})
    .then(() => app.close())
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});
