import Fastify from 'fastify';
import cors from '@fastify/cors';
import { checkStaleSessions } from './services/session-store.js';
import { sessionStartHandler } from './handlers/session-start.js';
import { inferStatusHandler } from './handlers/infer-status.js';
import { inferencesHandler } from './handlers/inferences.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const app = Fastify({ logger: { level: LOG_LEVEL } });

await app.register(cors, { origin: true });

// --- Phase 1: Cold read ---
app.post('/api/v1/session/start', sessionStartHandler);
app.get('/api/v1/session/:id/infer-status', inferStatusHandler);
app.get('/api/v1/session/:id/inferences', inferencesHandler);

// --- Phase 2: Follow-up and submission (wired in Phase 2) ---
// app.get('/api/v1/session/:id/followup-questions', followupQuestionsHandler);
// app.post('/api/v1/session/:id/submit', submitHandler);
// app.get('/api/v1/session/:id/status', statusHandler);

// --- Phase 3: Report ---
// app.get('/api/v1/session/:id/report', reportHandler);

// --- Phase 4: Remaining ---
// app.get('/api/v1/session/:id/early-signal', earlySignalHandler);
// app.post('/api/v1/session/:id/capture-email', captureEmailHandler);

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
