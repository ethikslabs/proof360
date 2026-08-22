// GET /api/v1/advisory/registers?q=<query> — the register-advisory read.
// Conversation-only surface (advisory law 1): the frontend calls this mid-chat and
// renders the result as an in-stream card + thinking lines. No page, no banner.
import { registerAdvisory } from '../services/register-advisory.js';

export async function advisoryRegistersHandler(request, reply) {
  const q = String(request.query?.q || '').trim();
  if (!q) return reply.status(400).send({ error: 'query_required' });
  if (q.length > 500) return reply.status(400).send({ error: 'query_too_long' });
  return reply.send(registerAdvisory(q));
}
