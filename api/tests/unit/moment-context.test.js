// Context-at-add (ETHL-WRK-SPEC-012 §3.2; INVARIANTS §3 made mechanical): every
// minted Move carries the conversational moment — pointers + a derived note,
// never raw transcript.
import { describe, it, expect } from 'vitest';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { shortlistAddHandler, momentContext } from '../../src/handlers/shortlist.js';

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
  };
}

function seededSession(chatHistory = []) {
  const session = createSession({ website_url: 'https://acme.example' });
  updateSession(session.id, {
    infer_status: 'complete',
    company_name: 'Acme',
    chat_history: chatHistory,
  });
  return getSession(session.id);
}

async function add(sessionId, body) {
  const reply = replyMock();
  await shortlistAddHandler({ params: { id: sessionId }, body }, reply);
  return reply;
}

describe('momentContext', () => {
  it('captures the conversational moment on a universal add', async () => {
    const session = seededSession([
      { role: 'user', content: 'We need HIPAA for hospitals in Uganda', ts: 1000 },
      { role: 'assistant', content: 'HIPAA applies to US-regulated data …', ts: 2000 },
    ]);
    const reply = await add(session.id, { name: 'Vanta' });
    expect(reply.statusCode).toBe(201);
    const ctx = reply.payload.move.reason.context;
    expect(ctx.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(ctx.turn).toBe(2);
    expect(ctx.spans).toEqual([
      { turn: 0, role: 'user', ts: 1000 },
      { turn: 1, role: 'assistant', ts: 2000 },
    ]);
    expect(ctx.note).toContain('HIPAA for hospitals in Uganda');
    expect(ctx.note_status).toBe('inferred');
  });

  it('derives an honest note when there is no conversation', async () => {
    const session = seededSession([]);
    const reply = await add(session.id, { name: 'SomeTool' });
    const ctx = reply.payload.move.reason.context;
    expect(ctx.turn).toBe(0);
    expect(ctx.spans).toEqual([]);
    expect(ctx.note).toBe('Added outside a conversation');
  });

  it('cross-lane recent: a prior Move appears in the next add\'s context', async () => {
    const session = seededSession([
      { role: 'user', content: 'Compliance first, then insurance', ts: 1000 },
    ]);
    await add(session.id, { name: 'Vanta' });
    const reply = await add(getSession(session.id).id, { name: 'SomeTool' });
    const ctx = reply.payload.move.reason.context;
    expect(ctx.recent.some((r) => r.kind === 'move' && r.name === 'Vanta')).toBe(true);
    expect(ctx.note).toContain('Vanta');
  });

  it('excerpt is bounded — a long message never leaks whole into the note', async () => {
    const long = 'x'.repeat(500);
    const session = seededSession([{ role: 'user', content: long, ts: 1000 }]);
    const reply = await add(session.id, { name: 'SomeTool' });
    expect(reply.payload.move.reason.context.note.length).toBeLessThan(200);
  });
});
