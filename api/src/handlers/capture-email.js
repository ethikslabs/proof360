import { getSession, updateSession } from '../services/session-store.js';
import { appendFileSync } from 'fs';
import { emitPulse } from '../services/pulse-emitter.js';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ses = new SESClient({ region: process.env.SES_REGION || 'ap-southeast-2' });
const SES_FROM = process.env.SES_FROM_ADDRESS || 'noreply@proof360.au';
const APP_URL = process.env.REPORT_BASE_URL || 'https://proof360.au';

/**
 * Confirm the capture by email. Fire-and-forget — failures logged, not thrown.
 *
 * It used to email `${REPORT_BASE_URL}/report/${sessionId}`, but /report/:id was removed and
 * the catch-all now sends it to /chat — so the "report" link opened nothing. There is no
 * URL-addressable read today (a session resumes from the browser it ran in, not a link), so
 * the email no longer carries a report link: it confirms the unlock and points at the app.
 */
async function sendCaptureConfirmation(email, sessionId) {
  try {
    await ses.send(new SendEmailCommand({
      Source: SES_FROM,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'Your Proof360 read is saved' },
        Body: {
          Text: { Data: `Thanks — your read is saved and your vendor intelligence is unlocked. Open ${APP_URL} in the browser you ran it in to pick up where you left off.` },
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
    ...(session.signals ? { signals: { ...session.signals, email_captured: true } } : {}),
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

  // Confirm by email via SES — fire-and-forget (no dead /report link)
  sendCaptureConfirmation(email, id);

  return reply.send({ success: true });
}
