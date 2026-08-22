// The ratified acceptance walk (ETHL-WRK-SPEC-011, John 2026-08-22):
//   URL in → "looks like you're on AWS — right?" → yes → AWS Activate surfaces with
//   its trigger cited → yes → the Move sits in the shortlist with its reason.
// Runs through the REAL session-chat handler; only Bedrock streaming is mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The mock persona "reads the script perfectly": it echoes the system prompt, so any
// injected confirm/proposal question counts as voiced (the voiced gate requires the
// reply to actually contain the ask). Individual tests override it to play rogue.
const personaReply = { value: null }; // null = echo system prompt
vi.mock('../../src/lib/inference.js', () => ({
  chatStream: vi.fn(async function* ({ messages }) {
    yield personaReply.value ?? messages.find((m) => m.role === 'system').content;
  }),
}));

import { chatStream } from '../../src/lib/inference.js';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { sessionChatHandler } from '../../src/handlers/session-chat.js';
import { buildInferredClaims } from '../../src/services/claims-projection.js';

function replyMock() {
  const raw = { headers: null, chunks: [], writeHead(c, h) { this.headers = h; }, write(d) { this.chunks.push(d); }, end() {} };
  return {
    raw,
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
    type() { return this; },
  };
}

function lastSystemPrompt() {
  const call = chatStream.mock.calls.at(-1)[0];
  return call.messages.find((m) => m.role === 'system').content;
}

async function say(sessionId, message) {
  const reply = replyMock();
  await sessionChatHandler({ params: { id: sessionId }, body: { message, persona_override: 'edison' }, log: { error() {} } }, reply);
  return reply;
}

describe('the acceptance walk', () => {
  let session;

  beforeEach(() => {
    vi.clearAllMocks();
    personaReply.value = null;
    session = createSession({ website_url: 'https://acme.example' });
    // Cold read done: AWS inferred from recon; stage + raise inferred from extraction.
    updateSession(session.id, {
      infer_status: 'complete',
      company_name: 'Acme',
      trust_score: 62,
      gaps: [{ id: 'soc2', status: 'open' }],
      merged_context: { recon: { cloud_provider: 'aws' } },
      claim_records: buildInferredClaims({
        recon: { cloud_provider: 'aws' },
        signals: [{ type: 'stage', value: 'Seed', confidence: 'probable' }],
      }),
      claim_events: [],
    });
    // The walk needs the raise question answered too — pre-confirm it via the UI verb
    // shape (stage + raise below get confirmed through chat/one-by-one in the test).
  });

  it('walks: confirm AWS in chat → proposal with trigger cited → yes → Move with reason', async () => {
    // Exchange 1: the persona is handed ONE confirm question — the AWS moment.
    await say(session.id, 'hello, what did you find?');
    expect(lastSystemPrompt()).toContain("Looks like you're on AWS — right?");
    expect(getSession(session.id).pending_confirm).toBeTruthy();

    // Exchange 2: "yes" — first-party testimony lands, event-logged.
    await say(session.id, 'yes');
    const s = getSession(session.id);
    expect(s.claim_events).toHaveLength(1);
    expect(s.claim_events[0].type).toBe('confirmed');
    expect(lastSystemPrompt()).toContain('CEREMONY RESULT');

    // Vanta's gap trigger (soc2 open) now proposes — reason spoken, consent asked.
    expect(lastSystemPrompt()).toContain('SHORTLIST PROPOSAL');
    expect(getSession(session.id).pending_proposal).toBeTruthy();

    // Exchange 3: "yes" to the proposal — the Move exists, reason on its face.
    const accepted = getSession(session.id).pending_proposal;
    await say(session.id, 'yes');
    const after = getSession(session.id);
    // the accepted proposal is closed; the engine may queue the NEXT one (one ask per exchange)
    expect(after.pending_proposal).not.toBe(accepted);
    const decision = (after.shortlist_records || []).find((r) => r.primitive === 'decision');
    expect(decision).toBeTruthy();
    expect(decision.status).toBe('Submitted');
    expect(decision.reason.trigger_id).toBeTruthy();
    expect(decision.reason.text).toContain('proposed because');
    expect(decision.reason.discussed_in).toBe(session.id);
    expect(lastSystemPrompt()).toContain('SHORTLIST RESULT');
  });

  it('declining a proposal is remembered — never re-pitched', async () => {
    await say(session.id, 'hi');           // asks AWS confirm
    await say(session.id, 'yes');          // confirms AWS; proposes (soc2 gap → Vanta lane)
    const proposed = getSession(session.id).pending_proposal;
    expect(proposed).toBeTruthy();
    await say(session.id, 'no');           // decline
    const s = getSession(session.id);
    expect(s.declined_proposals).toContain(proposed);
    expect(s.pending_proposal).not.toBe(proposed);
    expect(s.shortlist_records || []).toHaveLength(0);
  });

  it('an ambiguous reply writes nothing — the question simply stands', async () => {
    await say(session.id, 'hi');
    await say(session.id, 'what does SOC 2 actually involve?');
    expect(getSession(session.id).claim_events).toHaveLength(0);
  });

  it('the voiced gate: a "yes" to the persona\'s OWN question never flips the unasked claim', async () => {
    // Rogue persona: ignores the injected confirm block entirely (the live 2026-08-22 case).
    personaReply.value = 'Which is hitting you harder right now: SOC 2 asks or internal uncertainty?';
    await say(session.id, 'hi');
    expect(getSession(session.id).pending_confirm).toBeTruthy(); // ask stands…
    await say(session.id, 'yes');
    // …but the "yes" answered the persona's own question — no testimony forged.
    expect(getSession(session.id).claim_events).toHaveLength(0);

    // Persona behaves next exchange → the same claim is re-asked and NOW a yes lands.
    personaReply.value = null;
    await say(session.id, 'ok go on');
    await say(session.id, 'yes');
    expect(getSession(session.id).claim_events).toHaveLength(1);
    expect(getSession(session.id).claim_events[0].type).toBe('confirmed');
  });
});
