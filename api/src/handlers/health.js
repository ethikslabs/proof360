import { _getSessionsMap } from '../services/session-store.js';

const startTime = Date.now();

export async function healthHandler(_request, reply) {
  const sessions = _getSessionsMap();
  return reply.send({
    status: 'ok',
    sessions_active: sessions.size,
    uptime_ms: Date.now() - startTime,
    version: '1.0',
  });
}
