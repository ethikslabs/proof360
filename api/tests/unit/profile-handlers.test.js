import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let root;
let profileHandlers;
let attachHandler;
let sessionStore;

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return payload;
    },
  };
}

async function loadModules() {
  vi.resetModules();
  process.env.MEMORY_STORE_DIR = root;
  profileHandlers = await import('../../src/handlers/profile.js');
  attachHandler = await import('../../src/handlers/session-attach.js');
  sessionStore = await import('../../src/services/session-store.js');
}

describe('profile route handlers', () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'proof360-profile-handlers-'));
    await loadModules();
  });

  afterEach(async () => {
    delete process.env.MEMORY_STORE_DIR;
    await rm(root, { recursive: true, force: true });
  });

  it('creates the current private profile for an authenticated founder', async () => {
    const reply = replyMock();
    await profileHandlers.profileCurrentHandler({
      authUser: { sub: 'auth0|founder', email: 'founder@example.com' },
    }, reply);

    expect(reply.payload.profile.status).toBe('active');
    expect(reply.payload.snapshot.current_claims).toEqual({});
  });

  it('appends explicit founder facts through the profile events route', async () => {
    const reply = replyMock();
    await profileHandlers.profileEventsHandler({
      authUser: { sub: 'auth0|founder' },
      body: {
        source: 'chat',
        message: 'We are seed stage.',
        facts: [{ field: 'stage', value: 'Seed', source: 'founder' }],
      },
    }, reply);

    expect(reply.statusCode).toBe(201);
    expect(reply.payload.snapshot.current_claims.stage.value).toBe('Seed');
    expect(reply.payload.snapshot.current_claims.stage.actor).toBe('founder');
  });

  it('attaches a completed session and returns projections', async () => {
    const session = sessionStore.createSession({
      id: '11111111-1111-4111-8111-111111111111',
      website_url: 'https://example.com',
    });
    sessionStore.updateSession(session.id, {
      infer_status: 'complete',
      company_name: 'Example Co',
      raw_signals: [{ type: 'stage', value: 'Seed', confidence: 'probable' }],
    });

    const reply = replyMock();
    await attachHandler.sessionAttachHandler({
      authUser: { sub: 'auth0|founder' },
      params: { sessionId: session.id },
    }, reply);

    expect(reply.statusCode).toBe(201);
    expect(reply.payload.attached_session_id).toBe(session.id);
    expect(reply.payload.projections.lit_tiles.investor).toBe(true);
  });
});
