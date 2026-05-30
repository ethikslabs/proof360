// proof360.au/live — verification agent handler.
// Generous in-memory IP rate limit (demo mode: no email gate).
import { runAgent } from '../services/bedrock-agent.js';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map(); // ip -> { count, resetAt }

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) { hits.set(ip, { count: 1, resetAt: now + WINDOW_MS }); return false; }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

export async function liveAgentHandler(request, reply) {
  const ip = request.ip || 'unknown';
  if (rateLimited(ip)) return reply.code(429).send({ error: 'rate_limited', message: 'Easy — one moment.' });

  const { history, session_id } = request.body || {};
  if (!Array.isArray(history) || history.length === 0) return reply.code(400).send({ error: 'missing_history' });

  try {
    return await runAgent({ history, session_id });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'agent_failed', message: err.message });
  }
}
