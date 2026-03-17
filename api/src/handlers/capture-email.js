import { getSession, updateSession } from '../services/session-store.js';
import { appendFileSync } from 'fs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function captureEmailHandler(request, reply) {
  const { id } = request.params;
  const { email } = request.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    return reply.status(400).send({ error: 'Valid email required', code: 'INVALID_EMAIL' });
  }

  const session = getSession(id);
  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  updateSession(id, {
    email,
    layer2_locked: false,
    signals: session.signals ? { ...session.signals, email_captured: true } : null,
  });

  // Log lead to file (MVP — no email sending)
  const lead = {
    session_id: id,
    email,
    company_name: session.company_name,
    trust_score: session.trust_score,
    timestamp: new Date().toISOString(),
  };
  try {
    appendFileSync('leads.ndjson', JSON.stringify(lead) + '\n');
  } catch (err) {
    // Non-fatal — log but don't fail the request
    console.error(JSON.stringify({ event: 'lead_log_failed', session_id: id, error: err.message }));
  }

  return reply.send({ success: true });
}
