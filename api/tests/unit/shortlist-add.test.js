// Universal "Add to shortlist" (John ruling 2026-08-23, CTA-staging correction):
// discovery has ONE uniform action — add, one tap, no commitment. The item lands as
// a Move with its reason on its face; the real per-VER CTA lives on the shortlist
// page, never in discovery. A register match adopts the entry's cer_route (so the
// route CTA flows); anything else routes shortlist_general.
import { describe, it, expect, beforeEach } from 'vitest';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { shortlistAddHandler, shortlistHandler } from '../../src/handlers/shortlist.js';

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
  };
}

function seededSession() {
  const session = createSession({ website_url: 'https://acme.example' });
  updateSession(session.id, { infer_status: 'complete', company_name: 'Acme' });
  return getSession(session.id);
}

async function add(sessionId, body) {
  const reply = replyMock();
  await shortlistAddHandler({ params: { id: sessionId }, body }, reply);
  return reply;
}

describe('POST /api/v1/session/:id/shortlist', () => {
  it('mints a Move for a register-matched item, adopting the entry route', async () => {
    const session = seededSession();
    const reply = await add(session.id, { name: 'Vanta', category: 'Compliance', why: 'Closes the SOC 2 gap fastest at this stage' });
    expect(reply.statusCode).toBe(201);
    const move = reply.payload.move;
    expect(move.status).toBe('Submitted');
    expect(move.route).toBe('vanta'); // register match: provider vanta → cer_route vanta
    expect(move.item.name).toBe('Vanta');
    expect(move.item.register_id).toBe('cap-vanta');
    expect(move.reason.text).toBe('Closes the SOC 2 gap fastest at this stage');
    expect(move.reason.discussed_in).toBe(session.id);
    expect(move.cta).toBeTruthy(); // vanta route carries an external_action
  });

  it('routes an unknown item to shortlist_general with no CTA', async () => {
    const session = seededSession();
    const reply = await add(session.id, { name: 'SomeTool' });
    expect(reply.statusCode).toBe(201);
    expect(reply.payload.move.route).toBe('shortlist_general');
    expect(reply.payload.move.cta).toBeNull();
    expect(reply.payload.move.item.name).toBe('SomeTool');
  });

  it('is idempotent — re-adding the same name returns the existing Move, mints nothing', async () => {
    const session = seededSession();
    const first = await add(session.id, { name: 'Vanta' });
    const second = await add(session.id, { name: 'vanta' }); // case-insensitive
    expect(second.statusCode).toBe(200);
    expect(second.payload.already_shortlisted).toBe(true);
    expect(second.payload.move.cer_id).toBe(first.payload.move.cer_id);

    const listReply = replyMock();
    await shortlistHandler({ params: { id: session.id } }, listReply);
    expect(listReply.payload.shortlist).toHaveLength(1);
  });

  it('400s a missing name', async () => {
    const session = seededSession();
    const reply = await add(session.id, {});
    expect(reply.statusCode).toBe(400);
  });

  it('404s an unknown session', async () => {
    const reply = await add('nope', { name: 'Vanta' });
    expect(reply.statusCode).toBe(404);
  });

  it('buffers records on the session for graduation at attach', async () => {
    const session = seededSession();
    await add(session.id, { name: 'Vanta' });
    const live = getSession(session.id);
    const decisions = live.shortlist_records.filter((r) => r.primitive === 'decision');
    const events = live.shortlist_records.filter((r) => r.primitive === 'cer_event');
    expect(decisions).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(decisions[0].item.name).toBe('Vanta');
  });
});
