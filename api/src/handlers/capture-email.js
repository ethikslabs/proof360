import { getSession, updateSession } from '../services/session-store.js';
import { appendFileSync } from 'fs';
import { emitPulse } from '../services/pulse-emitter.js';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ses = new SESClient({ region: process.env.SES_REGION || 'ap-southeast-2' });
const SES_FROM = process.env.SES_FROM_ADDRESS || 'noreply@proof360.au';
const REPORT_BASE_URL = process.env.REPORT_BASE_URL || 'https://proof360.au';

/**
 * Send Layer 2 report URL via SES. Fire-and-forget — failures logged, not thrown.
 */
async function sendReportEmail(email, sessionId) {
  const reportUrl = `${REPORT_BASE_URL}/report/${sessionId}`;
  try {
    await ses.send(new SendEmailCommand({
      Source: SES_FROM,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'Your Proof360 Report' },
        Body: {
          Text: { Data: reportUrl },
        },
      },
    }));
  } catch (err) {
    console.error(JSON.stringify({ event: 'ses_send_failed', session_id: sessionId, error: err.message }));
  }
}

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

  emitPulse({
    type: 'event',
    severity: 'info',
    tags: ['lead', 'email'],
    payload: { action: 'lead_captured', session_id: id },
  });

  // Log lead to file (NDJSON write retained as safety net)
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

  // Send report email via SES — fire-and-forget
  sendReportEmail(email, id);

  return reply.send({ success: true });
}
