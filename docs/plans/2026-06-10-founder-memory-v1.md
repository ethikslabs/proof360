# Founder Memory V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** proof360 becomes a private, server-durable founder **memory kernel** — the Company Profile is reconstructed from events → evidence → observations → claims → projections, never hand-edited. The profile is the kernel's *first* projection; future views (investor, vendor, insurance, enterprise DD, SPV, Ethiks360) are later projections of the same substrate. Three invariants govern everything: **promotion** (nothing becomes founder truth accidentally), **durability** (fail loud, transactional), **reconstruction** (views are disposable, memory is canonical). Every memory row carries origin `source` metadata (sixth primitive) so provenance groups by origin when external feeds (AWS, Microsoft, HubSpot, CORPUS) arrive.

**Architecture:** Five new Postgres tables behind Auth0-verified routes (`jose` JWKS verification, Auth0 `sub` = founder identity). Session truth (existing `signals`) promotes into durable founder truth (`claims`) only through one explicit route — the promotion invariant. Projections are never stored: `GET .../projections` computes them deterministically from current claims, mirroring the pure-kernel idiom of `recompute.js`. Frontend replaces the frozen lit-tile object at `Chat.jsx:1268` with projection-derived state.

**Tech Stack:** Fastify 5 (existing), pg (existing), `jose` (new, only new dependency), vitest with `vi.mock` of `../../src/db/pool.js` (established pattern — see `api/tests/unit/override-stack.test.js`), React 19 + hand-rolled PKCE (existing).

**Spec:** `docs/specs/2026-06-10-founder-memory-v1-spec.md` (ratified 2026-06-10, includes the two added invariants).

---

## Pre-flight (blocking, human)

- [ ] **John: create the Auth0 API** — Auth0 dashboard → Applications → APIs → Create API. Name `proof360 API`, identifier `https://api.proof360.au` (the identifier is the `audience` string; it is not fetched, any URI works), signing RS256. Enable **Allow Offline Access** (refresh tokens) on the API, and in the SPA application settings ensure grant types include Refresh Token and rotation is ON.
- [ ] **John: SSM params** (Terminal):
  `aws ssm put-parameter --name /proof360/AUTH0_DOMAIN --type String --value dev-ethikslabs.au.auth0.com`
  `aws ssm put-parameter --name /proof360/AUTH0_AUDIENCE --type String --value https://api.proof360.au`
  Not secrets, plain String is fine.
- [ ] Local dev: add `AUTH0_DOMAIN=dev-ethikslabs.au.auth0.com` and `AUTH0_AUDIENCE=https://api.proof360.au` to `api/.env`.

Tasks 1–7 are testable without the tenant (tests inject a local keypair). The tenant is needed for Task 9 onward (live frontend login).

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `api/db/migrations/002_founder_memory.sql` | create | 7 tables + indexes + one-active-profile constraint |
| `api/scripts/run-migrations.js` | modify (MIGRATIONS array) | register 002 |
| `api/src/lib/auth.js` | create | JWT verify (jose), `requireAuth` preHandler, founder upsert |
| `api/src/services/profile-store.js` | create | founders/profiles/events/evidence CRUD — synchronous PG, fail loud |
| `api/src/services/memory-derive.js` | create | observation derivation + claim promotion (founder beats system) |
| `api/src/services/profile-projections.js` | create | pure deterministic projection engine (6 tile projections) |
| `api/src/handlers/profile.js` | create | GET current, GET projections, POST events |
| `api/src/handlers/session-attach.js` | create | POST /sessions/:id/profile — the explicit promotion path |
| `api/src/server.js` | modify | route registration with preHandler + global error hooks |
| `scripts/deploy.sh` | modify (~line 65) | PG + AUTH0 env injection (closes the TODO) |
| `.github/workflows/deploy.yml` | modify | AUTH0 SSM params |
| `frontend/src/api/auth.js` | create | PKCE with audience+offline_access, token store, refresh |
| `frontend/src/api/client.js` | modify | `authRequest` + 4 new endpoints |
| `frontend/src/utils/projectionTiles.js` | create | pure projection→tile mapping |
| `frontend/src/pages/Chat.jsx` | modify (line 1268 + auth + cold-read hook + chat persist) | lit tiles from projections; attach session; persist authed chat |
| `frontend/src/pages/FounderAuth.jsx` | modify (`buildAuth0Url`) | audience + offline_access in PKCE |
| `frontend/src/pages/Portal.jsx` | modify (callback) | founder-intent exchange stores tokens |
| `api/tests/unit/*.test.js`, `api/tests/property/*.test.js` | create | per-task TDD below |

Out of scope (V1, per spec): Ethiks360 sharing/export UI, uploads/integrations as evidence sources, tone/hesitation observations.

**Accepted spec deviation (recorded):** the spec permits "AI synthesis only for explanation"; V1 ships deterministic template explanations instead (no model call inside the memory path). Explanations remain grounded in the linked claims. Upgrading to AI synthesis is a later, isolated change.

**Session ownership (V1 ruling):** a session binds to at most ONE profile, ever — `UNIQUE (session_id)` on `profile_sessions`, first-claimer-wins. Cold-read sessions are anonymous, so possession of the session id is the claim; the unique constraint makes cross-founder import impossible after first attach, and the handler 409s any second founder. Re-attach by the OWNING founder re-runs promotion (this is how post-attach corrections reach the profile).

---

### Task 1: Migration 002 — founder memory schema

**Files:**
- Create: `api/db/migrations/002_founder_memory.sql`
- Modify: `api/scripts/run-migrations.js:8-13`
- Test: `api/tests/unit/migration-002.test.js`

- [ ] **Step 1: Write the failing test** (shape test — parses SQL for required tables/constraints; the established suite mocks PG, so we assert the migration file itself):

```js
// api/tests/unit/migration-002.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sql = readFileSync(join(dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'db', 'migrations', '002_founder_memory.sql'), 'utf8');

describe('002_founder_memory migration', () => {
  it.each(['founders', 'company_profiles', 'profile_sessions', 'profile_events',
           'profile_evidence', 'observations', 'claims'])
    ('creates table %s', (t) => expect(sql).toMatch(new RegExp(`CREATE TABLE ${t}`)));

  it('enforces one active profile per founder', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX one_active_profile ON company_profiles\s*\(founder_id\)\s*WHERE status = 'active'/);
  });

  it('a session binds to at most one profile ever (cross-founder import impossible)', () => {
    expect(sql).toMatch(/session_id UUID NOT NULL UNIQUE REFERENCES sessions\(id\)/);
  });

  it('founders keyed by auth0_sub', () => {
    expect(sql).toMatch(/auth0_sub TEXT UNIQUE NOT NULL/);
  });

  it('events and evidence both carry origin source metadata (sixth primitive)', () => {
    const sourceCols = sql.match(/source TEXT NOT NULL/g) ?? [];
    expect(sourceCols.length).toBe(2);   // profile_events + profile_evidence
    expect(sql).not.toMatch(/source TEXT NOT NULL CHECK/);   // open vocabulary — no enum
  });

  it('is registered in run-migrations', () => {
    const runner = readFileSync(join(dirname(fileURLToPath(import.meta.url)),
      '..', '..', 'scripts', 'run-migrations.js'), 'utf8');
    expect(runner).toContain('002_founder_memory');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `cd api && npx vitest --run tests/unit/migration-002.test.js` → FAIL (ENOENT).

- [ ] **Step 3: Write the migration** (conventions copied from `001_v3_schema.sql` — BEGIN/COMMIT, `gen_random_uuid()`, CHECK enums):

```sql
-- proof360 Founder Memory V1 — events → evidence → observations → claims
-- Spec: docs/specs/2026-06-10-founder-memory-v1-spec.md
-- Projections are NOT stored — computed at read time. Profile is reconstructed, never edited.

BEGIN;

CREATE TABLE founders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_sub TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id),
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_profile ON company_profiles (founder_id) WHERE status = 'active';

-- A session binds to at most one profile EVER (first-claimer-wins; cross-founder
-- import is structurally impossible after first attach). Re-attach by the owner
-- is allowed at the handler level and re-runs promotion.
CREATE TABLE profile_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES company_profiles(id),
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id),
  attached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- append-only: no UPDATE path exists in code; memory fragments are immutable.
-- `source` = ORIGIN metadata (sixth primitive, spec): 'founder'|'cold_read'|'chat'|
-- later 'aws'|'microsoft'|'hubspot'|'linkedin'|'document'|'corpus'|...
-- Deliberately NO CHECK constraint — the vocabulary grows as feeds arrive.
-- Pointers (session id etc.) live in content, not in source.
CREATE TABLE profile_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES company_profiles(id),
  kind TEXT NOT NULL CHECK (kind IN ('chat', 'cold_read', 'correction', 'session_activity')),
  source TEXT NOT NULL,             -- origin vocabulary, open (see header comment)
  content JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- V1 kinds are statements + signals; schema deliberately leaves room (spec):
CREATE TABLE profile_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES company_profiles(id),
  event_id UUID REFERENCES profile_events(id),
  kind TEXT NOT NULL CHECK (kind IN ('founder_statement', 'session_signal', 'cold_read_signal',
                                     'document', 'filing', 'integration', 'corpus_ref')),
  source TEXT NOT NULL,             -- origin vocabulary, open (same as profile_events.source)
  ref TEXT,                         -- external pointer (CORPUS id, document key) — V1 unused
  content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- explicit/content-based only in V1 (basis enum has no 'tone'/'inferred-affect' on purpose)
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES company_profiles(id),
  field TEXT NOT NULL,
  value JSONB,
  basis TEXT NOT NULL CHECK (basis IN ('explicit', 'content')),
  event_ids UUID[] NOT NULL DEFAULT '{}',
  evidence_ids UUID[] NOT NULL DEFAULT '{}',
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES company_profiles(id),
  field TEXT NOT NULL,
  value JSONB,
  actor TEXT NOT NULL CHECK (actor IN ('founder', 'system')),
  state TEXT NOT NULL DEFAULT 'believed' CHECK (state IN ('believed', 'superseded', 'retracted')),
  promoted_from UUID[] NOT NULL DEFAULT '{}',   -- observation ids
  superseded_by UUID REFERENCES claims(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_events_profile ON profile_events (profile_id);
CREATE INDEX idx_profile_evidence_profile ON profile_evidence (profile_id);
CREATE INDEX idx_profile_evidence_source ON profile_evidence (profile_id, source);
CREATE INDEX idx_observations_profile_field ON observations (profile_id, field);
CREATE INDEX idx_claims_profile_field ON claims (profile_id, field) WHERE state = 'believed';
CREATE INDEX idx_profile_sessions_profile ON profile_sessions (profile_id);

COMMIT;
```

- [ ] **Step 4: Register in `run-migrations.js`** — extend the array:

```js
const MIGRATIONS = [
  { id: '001_v3_schema', file: join(__dirname, '..', 'db', 'migrations', '001_v3_schema.sql') },
  { id: '002_founder_memory', file: join(__dirname, '..', 'db', 'migrations', '002_founder_memory.sql') },
];
```

- [ ] **Step 5: Run test → PASS**, then apply locally: `cd api && npm run migrate` → `applying migration 002_founder_memory` (001 reports `already applied`).
- [ ] **Step 6: Commit** — `git add api/db/migrations/002_founder_memory.sql api/scripts/run-migrations.js api/tests/unit/migration-002.test.js && git commit -m "feat(memory): migration 002 — founder memory schema (events/evidence/observations/claims)"`

---

### Task 2: Auth0 verification — `requireAuth` + founder upsert

**Files:**
- Create: `api/src/lib/auth.js`
- Modify: `api/package.json` (add `jose`)
- Test: `api/tests/unit/auth.test.js`

- [ ] **Step 1:** `cd api && npm install jose` (pure-JS, no native deps).

- [ ] **Step 2: Write the failing test.** `jose` lets us generate a local RSA pair and a `createLocalJWKSet`; `auth.js` exposes a test seam `_setKeySet()` so tests never hit the network:

```js
// api/tests/unit/auth.test.js
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';

vi.mock('../../src/db/pool.js', () => ({
  default: {},
  query: vi.fn(),
}));
import { query } from '../../src/db/pool.js';
import { requireAuth, _setKeySet } from '../../src/lib/auth.js';

const ISSUER = 'https://dev-ethikslabs.au.auth0.com/';
const AUDIENCE = 'https://api.proof360.au';
let privateKey;

beforeAll(async () => {
  process.env.AUTH0_DOMAIN = 'dev-ethikslabs.au.auth0.com';
  process.env.AUTH0_AUDIENCE = AUDIENCE;
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  _setKeySet(createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'RS256' }] }));
});

const mint = (claims = {}) => new SignJWT({ ...claims })
  .setProtectedHeader({ alg: 'RS256' })
  .setIssuer(ISSUER).setAudience(AUDIENCE)
  .setSubject(claims.sub ?? 'auth0|founder-1')
  .setIssuedAt().setExpirationTime('5m')
  .sign(privateKey);

function mockReply() {
  const r = { statusCode: 200, body: null };
  r.code = (c) => { r.statusCode = c; return r; };
  r.send = (b) => { r.body = b; return r; };
  return r;
}

beforeEach(() => vi.clearAllMocks());

describe('requireAuth', () => {
  it('401s when no Authorization header', async () => {
    const reply = mockReply();
    await requireAuth({ headers: {} }, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('401s on a garbage token', async () => {
    const reply = mockReply();
    await requireAuth({ headers: { authorization: 'Bearer nope' } }, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('verifies a valid token, upserts the founder, attaches req.founder', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'f-uuid', auth0_sub: 'auth0|founder-1' }] });
    const req = { headers: { authorization: `Bearer ${await mint()}` } };
    const reply = mockReply();
    await requireAuth(req, reply);
    expect(reply.statusCode).toBe(200);          // untouched
    expect(req.founder).toEqual({ id: 'f-uuid', auth0_sub: 'auth0|founder-1' });
    expect(query.mock.calls[0][0]).toMatch(/INSERT INTO founders/);
    expect(query.mock.calls[0][0]).toMatch(/ON CONFLICT \(auth0_sub\)/);
  });

  it('401s on wrong audience', async () => {
    const bad = await new SignJWT({}).setProtectedHeader({ alg: 'RS256' })
      .setIssuer(ISSUER).setAudience('https://other.api')
      .setSubject('auth0|x').setIssuedAt().setExpirationTime('5m').sign(privateKey);
    const reply = mockReply();
    await requireAuth({ headers: { authorization: `Bearer ${bad}` } }, reply);
    expect(reply.statusCode).toBe(401);
  });
});
```

- [ ] **Step 3: Run → FAIL** (`auth.js` missing).

- [ ] **Step 4: Implement `api/src/lib/auth.js`:**

```js
// Auth0 JWT verification for founder-memory routes.
// Identity contract: Auth0 `sub` is the founder identity (spec §Implementation Changes).
// Durability contract: this path is synchronous PG and fail-loud — no silent catch.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { query } from '../db/pool.js';

let keySet = null;
export function _setKeySet(ks) { keySet = ks; }   // test seam — production uses remote JWKS

function getKeySet() {
  if (!keySet) {
    keySet = createRemoteJWKSet(
      new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
    );
  }
  return keySet;
}

export async function requireAuth(req, reply) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return reply.code(401).send({ error: 'authentication required', code: 'NO_TOKEN' });

  let payload;
  try {
    ({ payload } = await jwtVerify(token, getKeySet(), {
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      audience: process.env.AUTH0_AUDIENCE,
    }));
  } catch {
    return reply.code(401).send({ error: 'invalid token', code: 'BAD_TOKEN' });
  }

  const { rows } = await query(
    `INSERT INTO founders (auth0_sub, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (auth0_sub) DO UPDATE SET last_seen_at = now()
     RETURNING id, auth0_sub`,
    [payload.sub, payload.email ?? null, payload.name ?? null]
  );
  req.founder = rows[0];
}
```

- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit** — `git commit -m "feat(memory): Auth0 JWKS verification + founder upsert (requireAuth)"`

---

### Task 3: Profile store — active profile, events, evidence

**Files:**
- Create: `api/src/services/profile-store.js`
- Test: `api/tests/unit/profile-store.test.js`

- [ ] **Step 1: Failing test** (mock pool, same idiom as Task 2):

```js
// api/tests/unit/profile-store.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/db/pool.js', () => ({ default: {}, query: vi.fn() }));
import { query } from '../../src/db/pool.js';
import { getOrCreateActiveProfile, appendEvent, addEvidence } from '../../src/services/profile-store.js';

beforeEach(() => vi.clearAllMocks());

describe('profile-store', () => {
  it('returns the existing active profile without creating', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'p1', founder_id: 'f1', status: 'active' }] });
    const p = await getOrCreateActiveProfile('f1');
    expect(p.id).toBe('p1');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('creates the profile when none is active (one per founder)', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 'p-new', founder_id: 'f1', status: 'active' }] });
    const p = await getOrCreateActiveProfile('f1');
    expect(p.id).toBe('p-new');
    expect(query.mock.calls[1][0]).toMatch(/INSERT INTO company_profiles/);
  });

  it('appendEvent rejects unknown kinds before touching PG', async () => {
    await expect(appendEvent('p1', { kind: 'vibes', content: {} })).rejects.toThrow(/kind/);
    expect(query).not.toHaveBeenCalled();
  });

  it('appendEvent never swallows PG errors (fail-loud durability contract)', async () => {
    query.mockRejectedValueOnce(new Error('connection refused'));
    await expect(appendEvent('p1', { kind: 'chat', source: 'chat', content: { text: 'hi' } }))
      .rejects.toThrow('connection refused');
  });

  it('addEvidence links to an event and returns the row', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'ev1', kind: 'founder_statement' }] });
    const ev = await addEvidence('p1', { kind: 'founder_statement', source: 'founder', event_id: 'e1', content: { text: 'we use AWS' } });
    expect(ev.id).toBe('ev1');
    expect(query.mock.calls[0][0]).toMatch(/INSERT INTO profile_evidence/);
  });

  it('every memory write requires an origin source (sixth primitive)', async () => {
    await expect(appendEvent('p1', { kind: 'chat', content: { text: 'hi' } })).rejects.toThrow(/source/);
    await expect(addEvidence('p1', { kind: 'founder_statement', content: {} })).rejects.toThrow(/source/);
    expect(query).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement:**

```js
// api/src/services/profile-store.js
// Durable founder memory writes. SYNCHRONOUS Postgres, fail-loud — the opposite posture
// to the cold-read pipeline's async fire-and-forget (ratified invariant 2, spec 2026-06-10).
// Every write accepts an optional `exec` so the session-attach handler can run the whole
// promotion inside one transaction (same class of problem signal-store.js solves).
import { query } from '../db/pool.js';

export const EVENT_KINDS = ['chat', 'cold_read', 'correction', 'session_activity'];
const EVIDENCE_KINDS = ['founder_statement', 'session_signal', 'cold_read_signal',
                        'document', 'filing', 'integration', 'corpus_ref'];

export async function getOrCreateActiveProfile(founderId, exec = query) {
  const existing = await exec(
    `SELECT * FROM company_profiles WHERE founder_id = $1 AND status = 'active'`, [founderId]);
  if (existing.rows.length) return existing.rows[0];
  const created = await exec(
    `INSERT INTO company_profiles (founder_id) VALUES ($1) RETURNING *`, [founderId]);
  return created.rows[0];
}

// `source` is the ORIGIN (sixth primitive): 'founder'|'cold_read'|'chat'|later feed names.
// Open vocabulary by design — validate presence, never membership.
function assertSource(source) {
  if (!source || typeof source !== 'string') throw new Error('source (origin) is required on all memory writes');
}

export async function appendEvent(profileId, { kind, source, content }, exec = query) {
  if (!EVENT_KINDS.includes(kind)) throw new Error(`invalid event kind: ${kind}`);
  assertSource(source);
  if (!content || typeof content !== 'object') throw new Error('event content must be an object');
  const { rows } = await exec(
    `INSERT INTO profile_events (profile_id, kind, source, content)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [profileId, kind, source, JSON.stringify(content)]);
  return rows[0];
}

export async function addEvidence(profileId, { kind, source, event_id = null, ref = null, content = null }, exec = query) {
  if (!EVIDENCE_KINDS.includes(kind)) throw new Error(`invalid evidence kind: ${kind}`);
  assertSource(source);
  const { rows } = await exec(
    `INSERT INTO profile_evidence (profile_id, event_id, kind, source, ref, content)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [profileId, event_id, kind, source, ref, content ? JSON.stringify(content) : null]);
  return rows[0];
}

// First-claimer-wins (UNIQUE on session_id). Returns ownership truth:
//   { owned: true,  fresh: true  } — newly attached to this profile
//   { owned: true,  fresh: false } — already attached to THIS profile (re-promotion allowed)
//   { owned: false }               — attached to ANOTHER profile (handler 409s)
export async function attachSession(profileId, sessionId, exec = query) {
  const inserted = await exec(
    `INSERT INTO profile_sessions (profile_id, session_id) VALUES ($1, $2)
     ON CONFLICT (session_id) DO NOTHING RETURNING *`,
    [profileId, sessionId]);
  if (inserted.rows.length) return { owned: true, fresh: true };
  const existing = await exec(
    `SELECT profile_id FROM profile_sessions WHERE session_id = $1`, [sessionId]);
  return { owned: existing.rows[0]?.profile_id === profileId, fresh: false };
}
```

- [ ] **Step 4: Run → PASS. Commit** — `git commit -m "feat(memory): profile store — active profile, append-only events, evidence"`

---

### Task 4: Derivation + promotion — observations and claims

**Files:**
- Create: `api/src/services/memory-derive.js`
- Test: `api/tests/unit/memory-derive.test.js`

The promotion invariant lives here. Rules (deterministic, no model calls):

1. An observation is recorded only from **explicit content** (`basis: 'explicit'` when the founder stated/corrected it; `basis: 'content'` when a cold-read signal carried it). No tone, no inference.
2. `promoteClaim` supersedes an existing believed claim **only if**: new actor is `founder`, OR existing actor is `system`. A `system` claim never beats a `founder` claim — same law as the v3 override stack (`signal-store.js`).
3. Unknown stays unknown: `value: null` observations are recordable but never promoted.

- [ ] **Step 1: Failing test:**

```js
// api/tests/unit/memory-derive.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/db/pool.js', () => ({ default: {}, query: vi.fn() }));
import { query } from '../../src/db/pool.js';
import { recordObservation, promoteClaim } from '../../src/services/memory-derive.js';

beforeEach(() => vi.clearAllMocks());

describe('memory-derive', () => {
  it('records an explicit observation linked to its event', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'o1', field: 'cloud_provider' }] });
    const o = await recordObservation('p1', {
      field: 'cloud_provider', value: 'aws', basis: 'explicit', event_ids: ['e1'],
    });
    expect(o.id).toBe('o1');
    expect(query.mock.calls[0][0]).toMatch(/INSERT INTO observations/);
  });

  it('rejects non-V1 bases (tone) before PG', async () => {
    await expect(recordObservation('p1', { field: 'x', value: 1, basis: 'tone', event_ids: [] }))
      .rejects.toThrow(/basis/);
    expect(query).not.toHaveBeenCalled();
  });

  it('founder claim supersedes system claim', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'c-old', actor: 'system' }] });   // existing believed
    query.mockResolvedValueOnce({ rows: [{ id: 'c-new', actor: 'founder' }] });  // insert new
    query.mockResolvedValueOnce({ rows: [] });                                   // supersede old
    const c = await promoteClaim('p1', { field: 'cloud_provider', value: 'aws', actor: 'founder', promoted_from: ['o1'] });
    expect(c.id).toBe('c-new');
    expect(query.mock.calls[2][0]).toMatch(/UPDATE claims SET state = 'superseded'/);
  });

  it('system claim NEVER supersedes founder claim — returns the standing claim', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'c-founder', actor: 'founder' }] });
    const c = await promoteClaim('p1', { field: 'cloud_provider', value: 'gcp', actor: 'system', promoted_from: ['o2'] });
    expect(c.id).toBe('c-founder');               // unchanged
    expect(query).toHaveBeenCalledTimes(1);       // read only — no write happened
  });

  it('null values are never promoted (unknown stays unknown)', async () => {
    await expect(promoteClaim('p1', { field: 'x', value: null, actor: 'system', promoted_from: [] }))
      .rejects.toThrow(/unknown/);
    expect(query).not.toHaveBeenCalled();
  });

  it('re-promoting the same value is a no-op (no claim churn on re-attach)', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'c1', actor: 'founder', value: 'aws' }] });
    const c = await promoteClaim('p1', { field: 'cloud_provider', value: 'aws', actor: 'founder', promoted_from: ['o9'] });
    expect(c.id).toBe('c1');
    expect(query).toHaveBeenCalledTimes(1);   // read only
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement:**

```js
// api/src/services/memory-derive.js
// Deterministic derivation + promotion. THE PROMOTION INVARIANT LIVES HERE:
// signals/observations never silently become claims; founder beats system, always
// (ratified invariant 1, spec 2026-06-10 — same law as v3 signal-store override stack).
import { query } from '../db/pool.js';

const V1_BASES = ['explicit', 'content'];

export async function recordObservation(profileId, { field, value, basis, event_ids = [], evidence_ids = [] }, exec = query) {
  if (!V1_BASES.includes(basis)) throw new Error(`invalid observation basis for V1: ${basis}`);
  if (!field) throw new Error('observation requires a field');
  const { rows } = await exec(
    `INSERT INTO observations (profile_id, field, value, basis, event_ids, evidence_ids)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [profileId, field, JSON.stringify(value), basis, event_ids, evidence_ids]);
  return rows[0];
}

export async function promoteClaim(profileId, { field, value, actor, promoted_from = [] }, exec = query) {
  if (value === null || value === undefined) throw new Error('unknown values are not promoted — unknown stays unknown');
  if (!['founder', 'system'].includes(actor)) throw new Error(`invalid claim actor: ${actor}`);

  const existing = await exec(
    `SELECT id, actor, value FROM claims WHERE profile_id = $1 AND field = $2 AND state = 'believed'
     ORDER BY created_at DESC LIMIT 1`, [profileId, field]);

  const standing = existing.rows[0] ?? null;
  if (standing && standing.actor === 'founder' && actor === 'system') {
    return standing;   // founder truth holds; system proposal is not promoted
  }
  if (standing && JSON.stringify(standing.value) === JSON.stringify(value)
      && (standing.actor === actor || actor === 'system')) {
    return standing;   // same value, no actor upgrade — no churn (re-attach safe)
  }

  const inserted = await exec(
    `INSERT INTO claims (profile_id, field, value, actor, promoted_from)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [profileId, field, JSON.stringify(value), actor, promoted_from]);
  const claim = inserted.rows[0];

  if (standing) {
    await exec(
      `UPDATE claims SET state = 'superseded', superseded_by = $1 WHERE id = $2`,
      [claim.id, standing.id]);
  }
  return claim;
}

export async function currentClaims(profileId, exec = query) {
  const { rows } = await exec(
    `SELECT DISTINCT ON (field) * FROM claims
     WHERE profile_id = $1 AND state = 'believed'
     ORDER BY field, created_at DESC`, [profileId]);
  return rows;
}
```

- [ ] **Step 4: Run → PASS. Commit** — `git commit -m "feat(memory): observation derivation + claim promotion (founder beats system)"`

---

### Task 5: Projection engine — deterministic, never stored

**Files:**
- Create: `api/src/services/profile-projections.js`
- Test: `api/tests/property/projection-contract.property.test.js`

The V1 projection set **is the six lit tiles** (`Chat.jsx:1268`): `posture`, `vendors`, `aws`, `microsoft`, `investor`, `spv`. Pure function of current claims + observations — same idiom as `recompute.js`. Explanation strings are deterministic templates in V1 (no model call inside the memory path).

- [ ] **Step 1: Failing property test** (fast-check is already a dev dep — see `api/tests/property/`):

```js
// api/tests/property/projection-contract.property.test.js
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeProjections, PROJECTION_IDS } from '../../src/services/profile-projections.js';

const claimArb = fc.record({
  id: fc.uuid(),
  field: fc.constantFrom('cloud_provider', 'soc2', 'mfa', 'raise_stage', 'entity_type', 'team_size'),
  value: fc.jsonValue().filter(v => v !== null),
  actor: fc.constantFrom('founder', 'system'),
});
const obsArb = fc.record({ id: fc.uuid(), field: fc.string({ minLength: 1 }), basis: fc.constantFrom('explicit', 'content') });

describe('projection contract (spec §Projection Contract)', () => {
  it('every projection always returns the full contract, for any input', () => {
    fc.assert(fc.property(fc.array(claimArb, { maxLength: 12 }), fc.array(obsArb, { maxLength: 12 }),
      (claims, observations) => {
        const out = computeProjections(claims, observations);
        expect(Object.keys(out).sort()).toEqual([...PROJECTION_IDS].sort());
        for (const p of Object.values(out)) {
          expect(['likely', 'partial', 'blocked', 'unknown', 'ready']).toContain(p.state);
          expect(['low', 'medium', 'high']).toContain(p.confidence);
          expect(Array.isArray(p.contributing_claims)).toBe(true);
          expect(Array.isArray(p.contributing_observations)).toBe(true);
          expect(Array.isArray(p.missing_inputs)).toBe(true);
          expect(typeof p.explanation).toBe('string');
        }
      }));
  });

  it('no claims → every projection is unknown with missing_inputs named', () => {
    const out = computeProjections([], []);
    for (const p of Object.values(out)) {
      expect(p.state).toBe('unknown');
      expect(p.missing_inputs.length).toBeGreaterThan(0);
      expect(p.contributing_claims).toEqual([]);
    }
  });

  it('is deterministic — same inputs, same output', () => {
    const claims = [{ id: 'c1', field: 'cloud_provider', value: 'aws', actor: 'founder' }];
    expect(computeProjections(claims, [])).toEqual(computeProjections(claims, []));
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement:**

```js
// api/src/services/profile-projections.js
// PURE deterministic projection engine. Projections are never stored — computed at read
// time from current claims+observations. "Based on what we currently know", every time.
// V1 projection ids = the six chat lit tiles (frontend/src/pages/Chat.jsx).

export const PROJECTION_IDS = ['posture', 'vendors', 'aws', 'microsoft', 'investor', 'spv'];

const POSTURE_FIELDS = ['soc2', 'mfa', 'sso', 'edr', 'backup_dr', 'incident_response'];

// Each def: which claim fields feed it, and a rule from found-claims → state.
const DEFS = {
  posture: {
    inputs: POSTURE_FIELDS,
    rule: (found) => found.length === 0 ? 'unknown'
      : found.length >= 4 ? 'ready' : 'partial',
    explain: (found) => found.length === 0
      ? 'No security posture is known yet.'
      : `Posture view built from ${found.length} known control${found.length === 1 ? '' : 's'}.`,
  },
  vendors: {
    inputs: [...POSTURE_FIELDS, 'cloud_provider'],
    rule: (found) => found.length === 0 ? 'unknown' : 'likely',
    explain: (found) => found.length === 0
      ? 'Vendor matching needs at least one known control or platform fact.'
      : 'Enough is known to match vendors to gaps.',
  },
  aws: {
    inputs: ['cloud_provider'],
    rule: (found) => {
      const cp = found.find(c => c.field === 'cloud_provider');
      if (!cp) return 'unknown';
      return String(cp.value).toLowerCase().includes('aws') ? 'likely' : 'blocked';
    },
    explain: (found) => found.length ? 'Cloud provider is known — AWS program eligibility is assessable.'
      : 'Cloud provider is not known yet.',
  },
  microsoft: {
    inputs: ['cloud_provider'],
    rule: (found) => {
      const cp = found.find(c => c.field === 'cloud_provider');
      if (!cp) return 'unknown';
      const v = String(cp.value).toLowerCase();
      return (v.includes('azure') || v.includes('microsoft')) ? 'likely' : 'blocked';
    },
    explain: (found) => found.length ? 'Cloud provider is known — Microsoft program eligibility is assessable.'
      : 'Cloud provider is not known yet.',
  },
  investor: {
    inputs: ['raise_stage', 'entity_type'],
    rule: (found) => found.length === 0 ? 'unknown' : found.length === 2 ? 'likely' : 'partial',
    explain: (found) => found.length === 0
      ? 'Raise stage and entity type are not known yet.'
      : 'Investor view forms from raise stage and entity facts.',
  },
  spv: {
    inputs: ['entity_type'],
    rule: (found) => found.length === 0 ? 'unknown' : 'partial',
    explain: (found) => found.length === 0
      ? 'Entity structure is not known yet.' : 'Entity structure is known; SPV view is forming.',
  },
};

function confidenceOf(found) {
  if (found.length === 0) return 'low';
  return found.some(c => c.actor === 'founder') ? 'high' : 'medium';
}

export function computeProjections(claims, observations) {
  const out = {};
  for (const id of PROJECTION_IDS) {
    const def = DEFS[id];
    const found = claims.filter(c => def.inputs.includes(c.field));
    const foundFields = new Set(found.map(c => c.field));
    const contributingObs = observations.filter(o => foundFields.has(o.field));
    out[id] = {
      state: def.rule(found),
      confidence: confidenceOf(found),
      contributing_claims: found.map(c => c.id),
      contributing_observations: contributingObs.map(o => o.id),
      missing_inputs: def.inputs.filter(f => !foundFields.has(f)),
      explanation: def.explain(found),
    };
  }
  return out;
}
```

- [ ] **Step 4: Run → PASS. Commit** — `git commit -m "feat(memory): deterministic projection engine — six tile projections, full contract"`

---

### Task 6: Routes — profile current / projections / events

**Files:**
- Create: `api/src/handlers/profile.js`
- Modify: `api/src/server.js` (imports + 3 registrations)
- Test: `api/tests/unit/profile-routes.test.js`

- [ ] **Step 1: Failing test** (handler-level, mock the services — route registration is asserted in Task 8's integration check):

```js
// api/tests/unit/profile-routes.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/services/profile-store.js', () => ({
  getOrCreateActiveProfile: vi.fn(), appendEvent: vi.fn(), addEvidence: vi.fn(),
}));
vi.mock('../../src/services/memory-derive.js', () => ({
  currentClaims: vi.fn(), recordObservation: vi.fn(), promoteClaim: vi.fn(),
}));
vi.mock('../../src/db/pool.js', () => ({ default: {}, query: vi.fn() }));
import { query } from '../../src/db/pool.js';
import { getOrCreateActiveProfile, appendEvent, addEvidence } from '../../src/services/profile-store.js';
import { currentClaims, recordObservation, promoteClaim } from '../../src/services/memory-derive.js';
import { profileCurrentHandler, profileProjectionsHandler, profileEventsHandler } from '../../src/handlers/profile.js';

const founderReq = (extra = {}) => ({ founder: { id: 'f1', auth0_sub: 'auth0|1' }, ...extra });
function mockReply() {
  const r = { statusCode: 200 };
  r.code = (c) => { r.statusCode = c; return r; };
  r.send = (b) => { r.body = b; return r; };
  return r;
}
beforeEach(() => vi.clearAllMocks());

describe('profile routes', () => {
  it('GET current reconstructs: claims become fields, unmapped fields are explicit unknown', async () => {
    getOrCreateActiveProfile.mockResolvedValue({ id: 'p1', name: null, created_at: 't' });
    currentClaims.mockResolvedValue([
      { id: 'c1', field: 'cloud_provider', value: 'aws', actor: 'founder' },
    ]);
    const reply = mockReply();
    await profileCurrentHandler(founderReq(), reply);
    expect(reply.body.profile.fields.cloud_provider.value).toBe('aws');
    expect(reply.body.profile.fields.soc2).toEqual({ value: null, state: 'unknown' });
    expect(reply.body.profile.reconstructed).toBe(true);
  });

  it('GET projections returns the six-projection contract', async () => {
    getOrCreateActiveProfile.mockResolvedValue({ id: 'p1' });
    currentClaims.mockResolvedValue([]);
    query.mockResolvedValue({ rows: [] });   // observations read
    const reply = mockReply();
    await profileProjectionsHandler(founderReq(), reply);
    expect(Object.keys(reply.body.projections)).toHaveLength(6);
    expect(reply.body.projections.posture.state).toBe('unknown');
  });

  it('POST events appends, records explicit observation, promotes founder claim', async () => {
    getOrCreateActiveProfile.mockResolvedValue({ id: 'p1' });
    appendEvent.mockResolvedValue({ id: 'e1' });
    addEvidence.mockResolvedValue({ id: 'ev1' });
    recordObservation.mockResolvedValue({ id: 'o1' });
    promoteClaim.mockResolvedValue({ id: 'c1' });
    const reply = mockReply();
    await profileEventsHandler(founderReq({
      body: { kind: 'correction', content: { field: 'cloud_provider', value: 'aws', text: 'we are on AWS' } },
    }), reply);
    expect(appendEvent).toHaveBeenCalled();
    expect(promoteClaim).toHaveBeenCalledWith('p1', expect.objectContaining({ actor: 'founder' }));
    expect(reply.statusCode).toBe(201);
  });

  it('POST events without field/value appends memory but promotes nothing', async () => {
    getOrCreateActiveProfile.mockResolvedValue({ id: 'p1' });
    appendEvent.mockResolvedValue({ id: 'e1' });
    addEvidence.mockResolvedValue({ id: 'ev1' });
    const reply = mockReply();
    await profileEventsHandler(founderReq({ body: { kind: 'chat', content: { text: 'hello' } } }), reply);
    expect(promoteClaim).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(201);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `api/src/handlers/profile.js`:**

```js
// Founder memory routes — all behind requireAuth. The visible profile is RECONSTRUCTED
// from claims at read time; there is no profile-edit endpoint by design (spec §Summary).
import { getOrCreateActiveProfile, appendEvent, addEvidence, EVENT_KINDS } from '../services/profile-store.js';
import { currentClaims, recordObservation, promoteClaim } from '../services/memory-derive.js';
import { computeProjections } from '../services/profile-projections.js';
import { query } from '../db/pool.js';

// The reconstructable field set: everything a projection can consume.
export const PROFILE_FIELDS = ['cloud_provider', 'soc2', 'mfa', 'sso', 'edr', 'backup_dr',
  'incident_response', 'raise_stage', 'entity_type', 'team_size'];

export async function profileCurrentHandler(req, reply) {
  const profile = await getOrCreateActiveProfile(req.founder.id);
  const claims = await currentClaims(profile.id);
  const byField = Object.fromEntries(claims.map(c => [c.field, c]));
  const fields = {};
  for (const f of PROFILE_FIELDS) {
    fields[f] = byField[f]
      ? { value: byField[f].value, state: 'believed', actor: byField[f].actor, claim_id: byField[f].id }
      : { value: null, state: 'unknown' };            // unknown stays explicit, never guessed
  }
  return reply.send({
    profile: { id: profile.id, name: profile.name, created_at: profile.created_at, fields, reconstructed: true },
  });
}

export async function profileProjectionsHandler(req, reply) {
  const profile = await getOrCreateActiveProfile(req.founder.id);
  const claims = await currentClaims(profile.id);
  const { rows: observations } = await query(
    `SELECT id, field, basis FROM observations WHERE profile_id = $1`, [profile.id]);
  return reply.send({ profile_id: profile.id, projections: computeProjections(claims, observations) });
}

export async function profileEventsHandler(req, reply) {
  const { kind, content } = req.body ?? {};
  if (!kind || !content) return reply.code(400).send({ error: 'kind and content required' });
  if (!EVENT_KINDS.includes(kind)) return reply.code(400).send({ error: `invalid kind: ${kind}` });

  const profile = await getOrCreateActiveProfile(req.founder.id);
  const event = await appendEvent(profile.id, { kind, source: 'founder', content });
  const evidence = await addEvidence(profile.id, { kind: 'founder_statement', source: 'founder', event_id: event.id, content });

  // Explicit promotion only: a founder statement that names a field+value becomes
  // an explicit observation and a founder claim. Free text stays memory, nothing more.
  let claim = null;
  if (content.field && content.value !== undefined && content.value !== null) {
    const obs = await recordObservation(profile.id, {
      field: content.field, value: content.value, basis: 'explicit',
      event_ids: [event.id], evidence_ids: [evidence.id],
    });
    claim = await promoteClaim(profile.id, {
      field: content.field, value: content.value, actor: 'founder', promoted_from: [obs.id],
    });
  }
  return reply.code(201).send({ event_id: event.id, evidence_id: evidence.id, claim_id: claim?.id ?? null });
}
```

- [ ] **Step 4: Register in `server.js`** (after the engagement block, before persona chat):

```js
import { requireAuth } from './lib/auth.js';
import { profileCurrentHandler, profileProjectionsHandler, profileEventsHandler } from './handlers/profile.js';

// --- Founder memory (V1) — Auth0-verified, synchronous PG, fail-loud ---
app.get('/api/v1/profile/current', { preHandler: requireAuth }, profileCurrentHandler);
app.get('/api/v1/profile/current/projections', { preHandler: requireAuth }, profileProjectionsHandler);
app.post('/api/v1/profile/current/events', { preHandler: requireAuth }, profileEventsHandler);
```

- [ ] **Step 5: Run full api suite → all PASS** (`cd api && npx vitest --run`). **Commit** — `git commit -m "feat(memory): founder memory routes — current/projections/events behind requireAuth"`

---

### Task 7: Session attachment — the explicit promotion path

**Files:**
- Create: `api/src/handlers/session-attach.js`
- Modify: `api/src/server.js` (1 registration)
- Test: `api/tests/unit/session-attach.test.js`

`POST /api/v1/sessions/:sessionId/profile` — reads the session's PG `signals` rows, writes one `cold_read` event, evidence per signal, observations, and promotes claims: `overridden` signals (founder corrected in-session) promote as `actor: 'founder'`; `inferred` signals as `actor: 'system'` (which can never displace founder claims — Task 4).

Three contracts enforced here:
1. **Cross-user denial:** `UNIQUE (session_id)` + ownership check → a second founder gets 409 and writes nothing.
2. **Owner re-attach re-promotes:** post-attach corrections in the session reach the profile by re-POSTing (Task 4's same-value short-circuit prevents claim churn).
3. **Transactional promotion (durability contract):** attach row + event + evidence + observations + claims commit or roll back as one unit — `pool.connect()` + BEGIN/COMMIT/ROLLBACK, the `signal-store.js` idiom. A mid-loop DB fault leaves nothing half-written and the route 500s loudly.

- [ ] **Step 1: Failing test:**

```js
// api/tests/unit/session-attach.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Transaction-aware pool mock — the override-stack idiom (pool.connect → client)
vi.mock('../../src/db/pool.js', () => {
  const mockClient = { query: vi.fn(), release: vi.fn() };
  return {
    default: { connect: vi.fn(async () => mockClient), __mockClient: mockClient },
    query: vi.fn(),
  };
});
vi.mock('../../src/services/profile-store.js', () => ({
  getOrCreateActiveProfile: vi.fn(), appendEvent: vi.fn(), addEvidence: vi.fn(), attachSession: vi.fn(),
}));
vi.mock('../../src/services/memory-derive.js', () => ({
  recordObservation: vi.fn(), promoteClaim: vi.fn(),
}));
import pool, { query } from '../../src/db/pool.js';
import { getOrCreateActiveProfile, appendEvent, addEvidence, attachSession } from '../../src/services/profile-store.js';
import { recordObservation, promoteClaim } from '../../src/services/memory-derive.js';
import { sessionAttachHandler } from '../../src/handlers/session-attach.js';

const mockClient = pool.__mockClient;

function mockReply() {
  const r = { statusCode: 200 };
  r.code = (c) => { r.statusCode = c; return r; };
  r.send = (b) => { r.body = b; return r; };
  return r;
}
const req = (sessionId = 's1') => ({ founder: { id: 'f1' }, params: { sessionId } });

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.query.mockResolvedValue({ rows: [] });   // BEGIN/COMMIT/ROLLBACK default
});

describe('session attach (explicit promotion)', () => {
  it('404s when the session does not exist', async () => {
    query.mockResolvedValueOnce({ rows: [] });   // session lookup (outside txn)
    const reply = mockReply();
    await sessionAttachHandler(req(), reply);
    expect(reply.statusCode).toBe(404);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('fresh attach: promotes overridden as founder, inferred as system, inside a transaction', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 's1' }] });            // session exists
    getOrCreateActiveProfile.mockResolvedValue({ id: 'p1' });
    attachSession.mockResolvedValue({ owned: true, fresh: true });
    // signals SELECT runs on the txn client:
    mockClient.query.mockImplementation(async (text) =>
      /FROM signals/.test(text)
        ? { rows: [
            { field: 'cloud_provider', current_value: 'aws', status: 'overridden' },
            { field: 'team_size', current_value: '12', status: 'inferred' },
          ] }
        : { rows: [] });
    appendEvent.mockResolvedValue({ id: 'e1' });
    addEvidence.mockResolvedValue({ id: 'ev1' });
    recordObservation.mockResolvedValue({ id: 'o1' });
    promoteClaim.mockResolvedValue({ id: 'c1' });

    const reply = mockReply();
    await sessionAttachHandler(req(), reply);

    expect(promoteClaim).toHaveBeenCalledWith('p1',
      expect.objectContaining({ field: 'cloud_provider', actor: 'founder' }), expect.any(Function));
    expect(promoteClaim).toHaveBeenCalledWith('p1',
      expect.objectContaining({ field: 'team_size', actor: 'system' }), expect.any(Function));
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(reply.statusCode).toBe(201);
    expect(reply.body.promoted).toBe(2);
  });

  it("CROSS-USER DENIAL: another founder's session → 409, rollback, zero writes", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 's1' }] });
    getOrCreateActiveProfile.mockResolvedValue({ id: 'p-other-founder' });
    attachSession.mockResolvedValue({ owned: false });
    const reply = mockReply();
    await sessionAttachHandler(req(), reply);
    expect(reply.statusCode).toBe(409);
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(appendEvent).not.toHaveBeenCalled();
    expect(promoteClaim).not.toHaveBeenCalled();
  });

  it('owner re-attach RE-PROMOTES (post-attach corrections reach the profile)', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 's1' }] });
    getOrCreateActiveProfile.mockResolvedValue({ id: 'p1' });
    attachSession.mockResolvedValue({ owned: true, fresh: false });
    mockClient.query.mockImplementation(async (text) =>
      /FROM signals/.test(text)
        ? { rows: [{ field: 'cloud_provider', current_value: 'gcp', status: 'overridden' }] }
        : { rows: [] });
    appendEvent.mockResolvedValue({ id: 'e2' });
    addEvidence.mockResolvedValue({ id: 'ev2' });
    recordObservation.mockResolvedValue({ id: 'o2' });
    promoteClaim.mockResolvedValue({ id: 'c2' });

    const reply = mockReply();
    await sessionAttachHandler(req(), reply);
    expect(reply.statusCode).toBe(200);
    expect(reply.body.reattached).toBe(true);
    expect(promoteClaim).toHaveBeenCalledTimes(1);
  });

  it('mid-loop DB fault → ROLLBACK, client released, error propagates (fail loud, nothing half-written)', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 's1' }] });
    getOrCreateActiveProfile.mockResolvedValue({ id: 'p1' });
    attachSession.mockResolvedValue({ owned: true, fresh: true });
    mockClient.query.mockImplementation(async (text) =>
      /FROM signals/.test(text)
        ? { rows: [{ field: 'mfa', current_value: 'true', status: 'inferred' }] }
        : { rows: [] });
    appendEvent.mockResolvedValue({ id: 'e1' });
    addEvidence.mockRejectedValue(new Error('connection lost'));

    await expect(sessionAttachHandler(req(), mockReply())).rejects.toThrow('connection lost');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `api/src/handlers/session-attach.js`:**

```js
// THE explicit promotion path (ratified invariant 1): session signals become founder
// memory only here, never as a side effect. First-claimer-wins ownership; owner
// re-attach re-promotes; the whole promotion is ONE transaction (invariant 2).
import pool, { query } from '../db/pool.js';
import { getOrCreateActiveProfile, appendEvent, addEvidence, attachSession } from '../services/profile-store.js';
import { recordObservation, promoteClaim } from '../services/memory-derive.js';

export async function sessionAttachHandler(req, reply) {
  const { sessionId } = req.params;

  const session = await query(`SELECT id FROM sessions WHERE id = $1`, [sessionId]);
  if (!session.rows.length) return reply.code(404).send({ error: 'session not found' });

  const profile = await getOrCreateActiveProfile(req.founder.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exec = (text, params) => client.query(text, params);

    const attach = await attachSession(profile.id, sessionId, exec);
    if (!attach.owned) {
      await client.query('ROLLBACK');
      return reply.code(409).send({ error: 'session is attached to another profile', code: 'SESSION_OWNED' });
    }

    const { rows: signals } = await exec(
      `SELECT field, current_value, status FROM signals WHERE session_id = $1`, [sessionId]);

    // source = ORIGIN ('cold_read'), never a pointer — the session id rides in content.
    const event = await appendEvent(profile.id, {
      kind: 'cold_read', source: 'cold_read',
      content: { session_id: sessionId, signal_count: signals.length, reattach: !attach.fresh },
    }, exec);

    let promoted = 0;
    for (const s of signals) {
      if (s.current_value === null || s.current_value === undefined) continue;  // unknown stays unknown
      if (s.status === 'conflicted') continue;  // unresolved conflicts never become durable claims
      const evidence = await addEvidence(profile.id, {
        kind: s.status === 'overridden' ? 'session_signal' : 'cold_read_signal',
        source: s.status === 'overridden' ? 'founder' : 'cold_read',
        event_id: event.id, content: { field: s.field, value: s.current_value, status: s.status },
      }, exec);
      const obs = await recordObservation(profile.id, {
        field: s.field, value: s.current_value,
        basis: s.status === 'overridden' ? 'explicit' : 'content',
        event_ids: [event.id], evidence_ids: [evidence.id],
      }, exec);
      await promoteClaim(profile.id, {
        field: s.field, value: s.current_value,
        actor: s.status === 'overridden' ? 'founder' : 'system',
        promoted_from: [obs.id],
      }, exec);
      promoted += 1;
    }

    await client.query('COMMIT');
    return reply.code(attach.fresh ? 201 : 200).send({
      profile_id: profile.id, event_id: event.id, promoted, reattached: !attach.fresh,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;   // fail loud — Fastify 500s; the transaction left nothing half-written
  } finally {
    client.release();
  }
}
```

- [ ] **Step 4: Register** — `app.post('/api/v1/sessions/:sessionId/profile', { preHandler: requireAuth }, sessionAttachHandler);`
- [ ] **Step 5: Run full suite → PASS. Commit** — `git commit -m "feat(memory): explicit session→profile promotion route (idempotent)"`

---

### Task 8: Hardening + deploy wiring (durability contract)

**Files:**
- Modify: `api/src/server.js` (top-level, after imports)
- Modify: `scripts/deploy.sh:65-67` (the standing TODO)
- Modify: `.github/workflows/deploy.yml` (param fetch block, ~line 81-111)
- Test: `api/tests/unit/server-hardening.test.js`

- [ ] **Step 1: Failing test** (asserts the hooks are installed in source — process-level hooks aren't unit-invokable cleanly):

```js
// api/tests/unit/server-hardening.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'src', 'server.js'), 'utf8');

describe('server hardening (durability contract)', () => {
  it('installs an unhandledRejection hook', () => expect(src).toMatch(/process\.on\('unhandledRejection'/));
  it('installs an uncaughtException hook', () => expect(src).toMatch(/process\.on\('uncaughtException'/));
  it('memory routes are auth-gated', () => {
    expect(src).toMatch(/app\.get\('\/api\/v1\/profile\/current', \{ preHandler: requireAuth \}/);
    expect(src).toMatch(/app\.post\('\/api\/v1\/sessions\/:sessionId\/profile', \{ preHandler: requireAuth \}/);
  });
});
```

- [ ] **Step 2: Add to `server.js`** (above the listen block):

```js
// Durability contract (founder memory V1): faults must be VISIBLE. Rejections are
// logged loudly (not exited — in-flight cold reads survive); uncaught exceptions exit.
process.on('unhandledRejection', (err) => {
  app.log.error({ err }, 'unhandledRejection');
});
process.on('uncaughtException', (err) => {
  app.log.fatal({ err }, 'uncaughtException — exiting');
  process.exit(1);
});
```

- [ ] **Step 3: `scripts/deploy.sh`** — replace the TODO at lines 65-67. **Read `deploy.sh:40-90` first** and match its actual helper names. Two requirements:

  1. The canonical SSM leaf names are **lowercase, no PG_ prefix** — exactly what `.github/workflows/deploy.yml:82-86` already fetches: `/proof360/postgres/host`, `/proof360/postgres/port`, `/proof360/postgres/database`, `/proof360/postgres/user`, `/proof360/postgres/password`.
  2. The TODO itself asks for `require_ssm` — use the fail-loud fetch for all 7 params (PG + AUTH0), NOT the warn-and-continue `get_ssm`. Silent blank PG creds in `.env` is exactly the failure class the durability contract bans.

```bash
PG_HOST=$(require_ssm "/proof360/postgres/host")
PG_PORT=$(require_ssm "/proof360/postgres/port")
PG_DATABASE=$(require_ssm "/proof360/postgres/database")
PG_USER=$(require_ssm "/proof360/postgres/user")
PG_PASSWORD=$(require_ssm "/proof360/postgres/password")
AUTH0_DOMAIN=$(require_ssm "/proof360/AUTH0_DOMAIN")
AUTH0_AUDIENCE=$(require_ssm "/proof360/AUTH0_AUDIENCE")
```

  Then **append all 7 variables to the `.env` heredoc** the script writes (the `cat > "$API_DIR/.env"` block at ~lines 70-85) — fetching without writing them to `.env` deploys nothing.

- [ ] **Step 4: `.github/workflows/deploy.yml`** — add to the param fetch block (PG params already exist at lines 82-86):

```bash
AUTH0_DOMAIN=$(get_ssm "/proof360/AUTH0_DOMAIN")
AUTH0_AUDIENCE=$(get_ssm "/proof360/AUTH0_AUDIENCE")
```

and append both to the .env it writes.

- [ ] **Step 5: Run full suite → PASS. Commit** — `git commit -m "feat(memory): global error hooks + PG/Auth0 env in both deploy paths"`

---

### Task 9: Frontend — tokens (PKCE with audience + rotating refresh)

**Files:**
- Create: `frontend/src/api/auth.js`
- Modify: `frontend/src/pages/Chat.jsx:184-199` (loginAuth0 — add audience + offline_access)
- Modify: `frontend/src/pages/FounderAuth.jsx` (same for its `buildAuth0Url`)
- Modify: `frontend/src/pages/Portal.jsx` (callback: founder intent → store tokens via auth.js)
- Test: `frontend/tests/unit/auth-tokens.test.js`

Ratified: rotating refresh tokens, stored in localStorage (`founder_tokens`), acceptable V1 risk. `founder_auth` (display user) stays as-is — demo login writes only `founder_auth`, never `founder_tokens`, so demo can never reach the API (the server requires a verified JWT regardless).

- [ ] **Step 1: Failing test:**

```js
// frontend/tests/unit/auth-tokens.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storeTokens, getAccessToken } from '../../src/api/auth.js';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('founder token store', () => {
  it('returns null when no tokens stored (demo login path)', async () => {
    expect(await getAccessToken()).toBeNull();
  });

  it('returns the stored access token while fresh', async () => {
    storeTokens({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600 });
    expect(await getAccessToken()).toBe('tok');
  });

  it('refreshes via rotation when expired and stores the new pair', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'ref1', expires_in: -10 });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new', refresh_token: 'ref2', expires_in: 3600 }),
    });
    expect(await getAccessToken()).toBe('new');
    expect(JSON.parse(localStorage.getItem('founder_tokens')).refresh_token).toBe('ref2');
    // body is URLSearchParams — stringify before matching
    expect(String(global.fetch.mock.calls[0][1].body)).toContain('grant_type=refresh_token');
  });

  it('clears tokens when refresh is rejected (rotation reuse / revocation)', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'ref1', expires_in: -10 });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    expect(await getAccessToken()).toBeNull();
    expect(localStorage.getItem('founder_tokens')).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL** (`cd frontend && npx vitest --run tests/unit/auth-tokens.test.js`).
- [ ] **Step 3: Implement `frontend/src/api/auth.js`:**

```js
// Founder token store — rotating refresh tokens (ratified 2026-06-10).
// Demo login NEVER writes founder_tokens: no token → no API access → demo/localStorage
// data structurally cannot become server truth (spec §Test Plan).
const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN ?? 'dev-ethikslabs.au.auth0.com';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID ?? 'bh2RJb3CO25HFF6rqOVzd9uk2WUKiCGM';
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE ?? 'https://api.proof360.au';

const KEY = 'founder_tokens';
export const _now = () => Date.now();

export function storeTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem(KEY, JSON.stringify({
    access_token, refresh_token, expires_at: _now() + expires_in * 1000,
  }));
}

export function clearTokens() { localStorage.removeItem(KEY); }

export async function getAccessToken() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const t = JSON.parse(raw);
  if (t.expires_at - 30_000 > _now()) return t.access_token;

  // Expired — rotate.
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: AUTH0_CLIENT_ID,
      refresh_token: t.refresh_token,
    }),
  });
  if (!res.ok) { clearTokens(); return null; }
  const next = await res.json();
  storeTokens({ ...next, refresh_token: next.refresh_token ?? t.refresh_token });
  return next.access_token;
}
```

- [ ] **Step 4: Wire the login flows.** In `Chat.jsx` `loginAuth0()` (lines ~189-197) and `FounderAuth.jsx` `buildAuth0Url`, add to the authorize params:

```js
      audience: AUTH0_AUDIENCE,
      scope: 'openid email profile offline_access',
```

In `Portal.jsx`'s `handleAuth0Callback`: when `sessionStorage.getItem('auth0_intent')` is `'founder'` or `'chat'`, pass the full token response to `storeTokens(...)` before the existing userinfo fetch, and keep writing `founder_auth` for display.

- [ ] **Step 5: Run frontend suite → PASS. Commit** — `git commit -m "feat(memory): founder tokens — audience PKCE + rotating refresh store"`

---

### Task 10: Frontend — lit tiles from projections + session attach

**Files:**
- Modify: `frontend/src/api/client.js` (auth header + 4 endpoints)
- Modify: `frontend/src/pages/Chat.jsx:1268` (the hardcoded tile object) and the cold-read completion path (~line 1583 after `analyze`)
- Test: `frontend/tests/unit/projection-tiles.test.js`

- [ ] **Step 1: `client.js`** — `request()` already accepts `extraHeaders` (client.js:3-6); no changes to it. Only add:

```js
import { getAccessToken } from './auth.js';

async function authRequest(method, path, body) {
  const token = await getAccessToken();
  if (!token) { const e = new Error('not authenticated'); e.status = 401; throw e; }
  return request(method, path, body, { Authorization: `Bearer ${token}` });
}

// Founder memory V1
export const getProfile = () => authRequest('GET', '/api/v1/profile/current');
export const getProjections = () => authRequest('GET', '/api/v1/profile/current/projections');
export const postProfileEvent = (body) => authRequest('POST', '/api/v1/profile/current/events', body);
export const attachSessionToProfile = (sessionId) => authRequest('POST', `/api/v1/sessions/${sessionId}/profile`);
```

- [ ] **Step 2: Failing test** for the tile mapping (pure function — extract it so it's testable):

```js
// frontend/tests/unit/projection-tiles.test.js
import { describe, it, expect } from 'vitest';
import { tilesFromProjections, EMPTY_TILES } from '../../src/utils/projectionTiles.js';

describe('tilesFromProjections', () => {
  it('unknown projections stay unlit (no token / no data = old behaviour)', () => {
    expect(tilesFromProjections(null)).toEqual(EMPTY_TILES);
    const allUnknown = Object.fromEntries(Object.keys(EMPTY_TILES).map(k => [k, { state: 'unknown' }]));
    expect(tilesFromProjections(allUnknown)).toEqual(EMPTY_TILES);
  });

  it('any non-unknown, non-blocked state lights the tile', () => {
    const p = { ...Object.fromEntries(Object.keys(EMPTY_TILES).map(k => [k, { state: 'unknown' }])),
      posture: { state: 'partial' }, aws: { state: 'likely' }, microsoft: { state: 'blocked' } };
    const tiles = tilesFromProjections(p);
    expect(tiles.posture).toBe(true);
    expect(tiles.aws).toBe(true);
    expect(tiles.microsoft).toBe(false);   // blocked = known-not-applicable, stays dark
    expect(tiles.investor).toBe(false);
  });
});
```

- [ ] **Step 3: Implement `frontend/src/utils/projectionTiles.js`:**

```js
// Lit tiles are projections, not flags: lit = the machine currently knows enough
// to say something ("based on what we currently know"). blocked/unknown stay dark.
export const EMPTY_TILES = { investor: false, vendors: false, aws: false, microsoft: false, posture: false, spv: false };

export function tilesFromProjections(projections) {
  if (!projections) return EMPTY_TILES;
  const tiles = { ...EMPTY_TILES };
  for (const k of Object.keys(tiles)) {
    const s = projections[k]?.state;
    tiles[k] = s !== undefined && s !== 'unknown' && s !== 'blocked';
  }
  return tiles;
}
```

- [ ] **Step 4: Wire `Chat.jsx`.** Replace line 1268:

```js
  // before:
  const litTiles = useMemo(() => ({ investor: false, vendors: false, aws: false, microsoft: false, posture: false, spv: false }), []);
  // after:
  const [litTiles, setLitTiles] = useState(EMPTY_TILES);
  useEffect(() => {
    getProjections()
      .then(r => setLitTiles(tilesFromProjections(r.projections)))
      .catch(() => setLitTiles(EMPTY_TILES));   // 401/no token → demo-identical dark tiles
  }, [currentUser]);   // Chat.jsx's auth state variable (line ~1254) — there is no `user` in scope
```

And in the cold-read flow, after the `analyze` call resolves (~line 1583), attach when authenticated:

```js
  attachSessionToProfile(session_id)
    .then(() => getProjections())
    .then(r => setLitTiles(tilesFromProjections(r.projections)))
    .catch(() => {});   // unauthenticated cold read: attach is simply skipped
```

Hive & Co demo: untouched — demo stages render from `HIVE_STAGES` (client-side) and demo login has no tokens, so `getProjections()` 401s and tiles stay dark. The INVARIANT #4 amber demo label continues to apply.

- [ ] **Step 5: Persist authenticated chat (spec: "Persist authenticated chat … into the active Company Profile").** In `Chat.jsx`'s user-message send path (the function that POSTs to `/api/v1/session/:id/chat`, ~line 1629 — read the surrounding function first), add a fire-and-forget memory append after the send succeeds:

```js
  // Authenticated chat becomes founder memory. Fire-and-forget: a memory write
  // failure must never break the chat experience (memory routes 401 silently
  // for unauthenticated/demo users — that IS the demo boundary).
  // NB: the send function's message variable is `text` (Chat.jsx ~1633 `message: text`).
  postProfileEvent({ kind: 'chat', content: { text, session_id: sessionId ?? null } })
    .catch(() => {});
```

Free chat text appends as memory events only — no field/value, so nothing promotes (Task 6 contract). The founder's words are remembered; claims still only move through explicit statements or session promotion.

- [ ] **Step 6: Post-attach corrections reach the profile — through the SHIPPING surface.** Reality check (2026-06-10 audit): `OverridePanel.jsx` is exported but **mounted nowhere** — no live UI calls `/api/v1/session/:id/override` from chat. So V1's shipping correction path is the memory route itself. Wire the chat signal-correction action (`correctSignal` in `frontend/src/hooks/useSignals.js` — find its call site in Chat.jsx and read it first) to also persist when authenticated:

```js
  // correctSignal(signalId) is a REJECTION — the founder says "this is wrong" and
  // supplies NO replacement value. So it persists as event-only memory: no field/value
  // keys → Task 6 appends event + evidence and promotes NOTHING. Promoting the rejected
  // value as a founder claim would invert founder truth.
  postProfileEvent({ kind: 'correction', content: { domain: sig.domain, rejected_value: sig.value } })
    .catch(() => {});   // unauthenticated/demo: local-only, exactly as today
```

(`sig` is the signal object resolved from the `signalId` at the `correctSignal` call site — signals carry `domain` + `value` per `frontend/src/rendering/protocol.js`; there is no `field` property in scope.) No projection refresh here — rejections promote no claims, so projections cannot change.

Claim-level corrections WITH a replacement value enter through `POST /profile/current/events` with explicit `content.field`/`content.value` (Task 6 contract) — in V1 that means the founder states the fact in chat or a future input surface posts it; the chat free-text path deliberately does not guess field mappings. The session re-attach path (`attachSessionToProfile`, owner re-promotion) remains built and tested (Task 7) for when an override surface mounts; record it as latent, not shipped. Do NOT wire OverridePanel — it stays unmounted dead code per the audit, to be dispositioned separately.

- [ ] **Step 7: Run frontend suite + lint + build → PASS** (`npx vitest --run && npm run lint && npm run build`). **Commit** — `git commit -m "feat(memory): lit tiles from projections; chat + corrections persist to profile"`

---

### Task 11: Regression + cross-user denial sweep

**Files:**
- Create: `api/tests/unit/memory-regression.test.js`

- [ ] **Step 1: Write the tests:**

```js
// api/tests/unit/memory-regression.test.js
// Spec §Test Plan: unauthenticated cold read still works; cross-user access denied.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'server.js'), 'utf8');

describe('regression: public surface unchanged', () => {
  it.each(['/api/v1/session/start', '/api/v1/session/:id/inferences', '/api/v1/session/:id/analyze',
           '/api/v1/session/:id/chat', '/health'])
    ('public route %s carries NO auth preHandler', (route) => {
      const line = src.split('\n').find(l => l.includes(`'${route}'`));
      expect(line).toBeDefined();
      expect(line).not.toContain('requireAuth');
    });

  it.each(['/api/v1/profile/current', '/api/v1/profile/current/projections',
           '/api/v1/profile/current/events', '/api/v1/sessions/:sessionId/profile'])
    ('memory route %s REQUIRES auth', (route) => {
      const line = src.split('\n').find(l => l.includes(`'${route}'`));
      expect(line).toBeDefined();
      expect(line).toContain('requireAuth');
    });
});
```

Cross-user denial is covered twice: behaviourally in Task 7 (second founder → 409 + rollback + zero writes — an executable test) and structurally (every memory handler resolves the profile exclusively via `getOrCreateActiveProfile(req.founder.id)`; no handler accepts a founder/profile id from `req.body` or `req.params` — the only client-supplied id is `sessionId`, and ownership of it is enforced by the `UNIQUE (session_id)` constraint). Add one explicit assertion to `profile-routes.test.js`: each handler test verifies `getOrCreateActiveProfile` was called with exactly `req.founder.id`.

- [ ] **Step 2: Run ENTIRE api + frontend suites → all green.** All pre-existing api tests (the full `npx vitest --run` suite, green at plan time) + the new memory tests; frontend suite + 2 new files. Zero pre-existing tests may break.
- [ ] **Step 3: Commit** — `git commit -m "test(memory): regression sweep — public surface open, memory surface gated"`

---

### Task 12: Live verification on EC2 (after John's Auth0 step)

- [ ] Push `main`, let deploy.yml run. **Caution:** `deploy.yml:115` swallows migration failures (`|| echo "Migrations skipped..."`) — a green deploy does NOT prove 002 applied.
- [ ] **Verify 002 actually applied** (via SSM, before any route checks):
  `psql -d proof360 -c "SELECT id FROM schema_migrations ORDER BY id;"` → must list `002_founder_memory`. If absent, run `npm run migrate` on the box as ec2-user and read the error — do not proceed on a missing migration.
- [ ] `curl -s https://proof360.au/api/v1/profile/current` → expect `401 {"error":"authentication required"}` (gate live).
- [ ] `curl -s -X POST https://proof360.au/api/v1/session/start -d '{"website_url":"https://example.com"}' -H 'content-type: application/json'` → expect a session id (public cold read intact; the field is `website_url` — `session-start.js` 400s on anything else).
- [ ] Browser: founder login → run a cold read → confirm tiles light from `/profile/current/projections` (network tab), refresh page → tiles persist (token refresh path).
- [ ] Verify in PG via SSM: `SELECT count(*) FROM claims;` > 0 after one attach.
- [ ] `pm2 logs proof360 --lines 50` — no unhandledRejection entries.

---

## Execution notes

- Tasks 1–8 are pure backend and independently shippable (routes 401 until the tenant exists — correct behaviour).
- Tasks 9–10 need John's Auth0 dashboard step done first to test live, but their unit tests run without it.
- Worktree recommended (`superpowers:using-git-worktrees`) — `main` is clean as of `1d3e9b0`.
- Every task ends in a commit; push after each merge to main per standing rule 1.
