# Founder Journey (HRR v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A founder logs in and lands on `/journey` — a top-down timeline of their proof360 visits, each session expandable to that visit's claims (gaps/matches/outcomes), every beat tracing back to evidence.

**Architecture:** Approach A — session-as-evidence. Each visit is one immutable `evidence` row (`type:'session'`) in the `proof360_memory` atom DB; claims link to it via `claim_evidence`. The read fn `journey()` delegates permission filtering to the existing `project()` (DRY), then groups the permitted claims by their session-evidence ordered by `evidence.collected_at`. One additive migration (`evidence.extensions`). A seeded demo founder feeds v1; a `DEMO_FOUNDER_MODE` flag lets the demo render locally without a real Auth0 token (prod stays `requireAuth`-gated).

**Tech Stack:** Node + Fastify (`api/`), PostgreSQL 16 (`proof360_memory`), vitest (real-PG tests under `tests/memory/`), React + Vite + React Router (`frontend/`).

**Spec:** `docs/superpowers/specs/2026-06-18-founder-journey-hrr-design.md`

**Branch:** `feat/proof360-frontend` (current). Run `api/` commands from `proof360/api`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `api/db/memory-migrations/003_journey.sql` | NEW · additive `evidence.extensions` column |
| `api/scripts/run-memory-migrations.js` | MODIFY · register `003_journey` in MIGRATIONS array |
| `api/src/memory/nodes.js` | MODIFY · `recordEvidence()` accepts `collected_at` + `extensions` |
| `api/src/memory/project.js` | MODIFY · export `corpusIdOf` for reuse |
| `api/src/memory/journey.js` | NEW · `journey(viewer, company)` + `companyForFounder(founder)` |
| `api/src/handlers/journey.js` | NEW · endpoint handler + auth→entity resolution |
| `api/src/server.js` | MODIFY · register `/api/v1/profile/current/journey` |
| `api/scripts/seed-demo-journey.js` | NEW · idempotent demo founder/company/sessions |
| `api/package.json` | MODIFY · `seed:demo-journey` script |
| `api/tests/memory/journey.test.js` | NEW · read-fn tests (order, self, member, empty) |
| `frontend/src/api/client.js` | MODIFY · `getJourney()` |
| `frontend/src/pages/Journey.jsx` | NEW · timeline page |
| `frontend/src/App.jsx` | MODIFY · `/journey` route |

**Verified signatures (do not guess):**
- `recordEvidence({ entity_id, type='turn', content, source_type='operator_entry', access_layer, output_permission })` → `{ evidence_id, corpus_id, hash }`. Currently inserts neither `collected_at` nor `extensions`.
- `assertClaim({ entity_id, subject, value, authority, evidence_ids=[], access_layer, output_permission, confidence='probable', valid_from })` → writes `claim_evidence` for each `evidence_ids` entry. Note the param is **`value`** (stored into the `statement` column), not `statement`.
- `createEntity({ type, name, ref=null, access_layer, output_permission, extensions })` → `{ entity_id, corpus_id }`. `type` CHECK (post-002) allows `vendor/program/product/person/region/deal_condition/customer_segment/company/capability/partner/lawyer/investor`. The seed uses only `person` + `company`.
- `createEdge({ from, to, kind, from_type='Entity', to_type='Entity', access_layer, output_permission, extensions, valid_from })` — `from`/`to` are **corpus_id** values.
- `project(viewerEntityId, targetEntityId, client=pool)` → `{ viewer_role, claims:[{claim_id, corpus_id, subject, statement, authority, access_layer, output_permission, confidence, valid_from}] }`. Already permission-filters; self-view unfiltered.
- Test harness `tests/memory/_setup.js` exports `{ pool, reachable }`; suites use `describe.skipIf(!reachable)` and `afterAll(() => pool.end())`. `global-setup.js` resets the schema once per run.

---

## Task 1: Migration 003 + `recordEvidence` extension

**Files:**
- Create: `api/db/memory-migrations/003_journey.sql`
- Modify: `api/scripts/run-memory-migrations.js` (MIGRATIONS array)
- Modify: `api/src/memory/nodes.js` (`recordEvidence`)
- Test: `api/tests/memory/journey-migration.test.js`

- [ ] **Step 1: Write the failing test**

Create `api/tests/memory/journey-migration.test.js`:
```js
import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';
import { recordEvidence } from '../../src/memory/nodes.js';
import { createFounderAndCompany } from '../../src/memory/nodes.js';

afterAll(async () => { await pool.end(); });

describe.skipIf(!reachable)('migration 003 + recordEvidence', () => {
  it('evidence has an extensions JSONB column', async () => {
    const { rows } = await pool.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name='evidence' AND column_name='extensions'`);
    expect(rows[0]?.data_type).toBe('jsonb');
  });

  it('recordEvidence stores collected_at + extensions', async () => {
    const { company } = await createFounderAndCompany({ founderName: 'Mig', companyName: 'Mig Inc' });
    const when = '2026-01-02T03:04:05.000Z';
    const ev = await recordEvidence({
      entity_id: company.entity_id, type: 'session', content: 'visit 1',
      collected_at: when, extensions: { session_id: 's1', label: 'First read' },
    });
    const { rows } = await pool.query(
      `SELECT type, collected_at, extensions FROM evidence WHERE evidence_id=$1`, [ev.evidence_id]);
    expect(rows[0].type).toBe('session');
    expect(new Date(rows[0].collected_at).toISOString()).toBe(when);
    expect(rows[0].extensions).toEqual({ session_id: 's1', label: 'First read' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && PG_MEMORY_HOST=/tmp npm test -- tests/memory/journey-migration.test.js`
Expected: FAIL — `extensions` column absent (`data_type` undefined) and/or recordEvidence ignores the new fields.

- [ ] **Step 3: Create the migration**

Create `api/db/memory-migrations/003_journey.sql`:
```sql
-- Journey (HRR v1): session-as-evidence needs queryable per-session metadata on evidence.
-- Additive only — no data migration. evidence.collected_at already exists (the timeline key).
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS extensions JSONB;
```

- [ ] **Step 4: Register the migration**

In `api/scripts/run-memory-migrations.js`, add to the `MIGRATIONS` array after `002_proof360_atom`:
```js
  { id: '003_journey', file: join(dir, '003_journey.sql') },
```

- [ ] **Step 5: Extend `recordEvidence`**

In `api/src/memory/nodes.js`, replace the `recordEvidence` function with:
```js
export async function recordEvidence({ entity_id, type = 'turn', content, source_type = 'operator_entry', access_layer = null, output_permission = null, collected_at = null, extensions = null }, client = pool) {
  const { id, corpus_id } = nodeId('ev');
  const h = hash({ entity_id, content, source_type, nonce: id });
  await client.query(
    `INSERT INTO evidence (evidence_id, corpus_id, entity_id, hash, type, uri, source_type, access_layer, output_permission, collected_at, extensions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, corpus_id, entity_id, h, type, `content://${h}`, source_type, access_layer, output_permission, collected_at, extensions]);
  return { evidence_id: id, corpus_id, hash: h };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd api && PG_MEMORY_HOST=/tmp npm test -- tests/memory/journey-migration.test.js`
Expected: PASS (both tests). The harness `resetMemoryDb` re-applies all migrations including 003.

- [ ] **Step 7: Commit**

```bash
git add api/db/memory-migrations/003_journey.sql api/scripts/run-memory-migrations.js api/src/memory/nodes.js api/tests/memory/journey-migration.test.js
git commit -m "feat(journey): additive evidence.extensions migration + recordEvidence support"
```

---

## Task 2: `journey()` read function

**Files:**
- Modify: `api/src/memory/project.js` (export `corpusIdOf`)
- Create: `api/src/memory/journey.js`
- Test: `api/tests/memory/journey.test.js`

**Design:** `journey(viewerEntityId, companyEntityId)` calls `project(viewer, company)` to get the **permission-filtered** claims (full reuse — no filter duplication), then joins those claim_ids to their session-evidence and groups by session, ordered by `collected_at` ASC. `companyForFounder(founderEntityId)` resolves the company via the `founded` edge.

- [ ] **Step 1: Write the failing test**

Create `api/tests/memory/journey.test.js`:
```js
import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';
import { createFounderAndCompany, createEntity, createEdge, recordEvidence, assertClaim } from '../../src/memory/nodes.js';
import { journey, companyForFounder } from '../../src/memory/journey.js';

const SAFE = { access_layer: 'authenticated_customer_portal', output_permission: 'customer_safe_summary_ok' };
const INTERNAL = { access_layer: 'internal_operator_note', output_permission: 'internal_only' };

afterAll(async () => { await pool.end(); });

async function seedSession(companyEntityId, { session_id, label, collected_at, claims }) {
  const ev = await recordEvidence({ entity_id: companyEntityId, type: 'session', content: label, collected_at, extensions: { session_id, label }, ...SAFE });
  for (const c of claims) {
    await assertClaim({ entity_id: companyEntityId, subject: c.subject, value: c.value, authority: c.authority || 'founder', evidence_ids: [ev.evidence_id], ...(c.perm || SAFE) });
  }
  return ev;
}

describe.skipIf(!reachable)('journey()', () => {
  it('returns sessions oldest -> newest with their claims (self-view unfiltered)', async () => {
    const { person, company } = await createFounderAndCompany({ founderName: 'Jo', companyName: 'Journey Inc' });
    await seedSession(company.entity_id, { session_id: 's2', label: 'Second', collected_at: '2026-02-01T00:00:00.000Z', claims: [{ subject: 'gap:mfa', value: 'no MFA' }] });
    await seedSession(company.entity_id, { session_id: 's1', label: 'First', collected_at: '2026-01-01T00:00:00.000Z', claims: [{ subject: 'stage', value: 'seed' }] });

    const result = await journey(person.entity_id, company.entity_id);
    expect(result.entries.map((e) => e.session_id)).toEqual(['s1', 's2']); // ascending by collected_at
    expect(result.entries[0].label).toBe('First');
    expect(result.entries[0].claims.map((c) => c.subject)).toContain('stage');
  });

  it('member view is permission-gated: internal_only claims are excluded', async () => {
    const { company } = await createFounderAndCompany({ founderName: 'Ow', companyName: 'Gated Inc' });
    const member = await createEntity({ type: 'person', name: 'Member' });
    await createEdge({ from: member.corpus_id, to: company.corpus_id, kind: 'member_of', extensions: { scope: { allowed: ['customer_safe_summary_ok'] } }, ...SAFE });
    await seedSession(company.entity_id, { session_id: 'm1', label: 'Visit', collected_at: '2026-03-01T00:00:00.000Z', claims: [
      { subject: 'stage', value: 'seed', perm: SAFE },
      { subject: 'secret', value: 'internal note', perm: INTERNAL },
    ] });

    const result = await journey(member.entity_id, company.entity_id);
    const subjects = result.entries.flatMap((e) => e.claims.map((c) => c.subject));
    expect(subjects).toContain('stage');
    expect(subjects).not.toContain('secret');
  });

  it('companyForFounder resolves the founded company; empty founder -> empty entries', async () => {
    const { person, company } = await createFounderAndCompany({ founderName: 'Em', companyName: 'Empty Inc' });
    const resolved = await companyForFounder(person.entity_id);
    expect(resolved.entity_id).toBe(company.entity_id);

    const result = await journey(person.entity_id, company.entity_id);
    expect(result.entries).toEqual([]); // no sessions seeded
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && PG_MEMORY_HOST=/tmp npm test -- tests/memory/journey.test.js`
Expected: FAIL — `journey.js` does not exist (import error).

- [ ] **Step 3: Export `corpusIdOf` from `project.js`**

In `api/src/memory/project.js`, change `async function corpusIdOf(` to `export async function corpusIdOf(`.

- [ ] **Step 4: Implement `journey.js`**

Create `api/src/memory/journey.js`:
```js
// Journey (HRR v1) read side. Delegates permission filtering to project() — no filter duplication —
// then groups the permitted claims by their session-evidence, ordered by evidence.collected_at.
import pool from './db.js';
import { project, corpusIdOf } from './project.js';

// Resolve the company a founder founded (the 'founded' edge). Returns { entity_id, corpus_id, name }.
export async function companyForFounder(founderEntityId, client = pool) {
  const founder = await corpusIdOf(founderEntityId, client);
  if (!founder) throw new Error('companyForFounder(): unknown founder entity');
  const { rows } = await client.query(
    `SELECT e.entity_id, e.corpus_id, e.name
     FROM relationship r JOIN entity e ON e.corpus_id = r.to_id
     WHERE r.from_id = $1 AND r.kind = 'founded' AND r.superseded_by IS NULL
     ORDER BY r.valid_from DESC LIMIT 1`, [founder.corpus_id]);
  return rows[0] || null;
}

// journey(viewer, company): permitted claims (via project) grouped per session-evidence, oldest first.
export async function journey(viewerEntityId, companyEntityId, client = pool) {
  const { viewer_role, claims } = await project(viewerEntityId, companyEntityId, client);
  const byId = new Map(claims.map((c) => [c.claim_id, c]));
  if (claims.length === 0) return { viewer_role, entries: [] };

  const { rows } = await client.query(
    `SELECT ce.claim_id, e.collected_at, e.extensions
     FROM claim_evidence ce JOIN evidence e ON e.evidence_id = ce.evidence_id
     WHERE ce.claim_id = ANY($1::uuid[]) AND e.type = 'session'`,
    [[...byId.keys()]]);

  const sessions = new Map(); // session_id -> { session_id, occurred_at, label, claims: [] }
  for (const row of rows) {
    const sid = row.extensions?.session_id;
    if (!sid) continue;
    if (!sessions.has(sid)) {
      sessions.set(sid, { session_id: sid, occurred_at: row.collected_at, label: row.extensions?.label || null, claims: [] });
    }
    const claim = byId.get(row.claim_id);
    if (claim) sessions.get(sid).claims.push({
      statement: claim.statement, authority: claim.authority, subject: claim.subject,
      confidence: claim.confidence, output_permission: claim.output_permission,
    });
  }

  const entries = [...sessions.values()].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
  return { viewer_role, entries };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd api && PG_MEMORY_HOST=/tmp npm test -- tests/memory/journey.test.js`
Expected: PASS (all three tests).

- [ ] **Step 6: Commit**

```bash
git add api/src/memory/journey.js api/src/memory/project.js api/tests/memory/journey.test.js
git commit -m "feat(journey): journey() read fn + companyForFounder (reuses project() filtering)"
```

---

## Task 3: Endpoint handler + route + auth resolution

**Files:**
- Create: `api/src/handlers/journey.js`
- Modify: `api/src/server.js`
- Test: `api/tests/memory/journey-endpoint.test.js`

**Design:** In `DEMO_FOUNDER_MODE`, a demo preHandler sets `request.authUser = { sub: 'demo-founder' }` (no real token needed — local demo). Otherwise the route uses `requireAuth`. The handler maps `authUser.sub` → `entity.ref` → entity, resolves the company, returns the journey. Unprovisioned founder → 200 `{ entries: [] }` (not 500).

- [ ] **Step 1: Write the failing test**

Create `api/tests/memory/journey-endpoint.test.js`:
```js
import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';
import { createEntity } from '../../src/memory/nodes.js';
import { resolveFounderEntity } from '../../src/handlers/journey.js';

afterAll(async () => { await pool.end(); });

describe.skipIf(!reachable)('journey handler resolution', () => {
  it('resolves an authUser.sub to the person entity by ref', async () => {
    await createEntity({ type: 'person', name: 'Ref Founder', ref: 'ref-sub-123' });
    const entity = await resolveFounderEntity({ sub: 'ref-sub-123' }, pool);
    expect(entity?.name).toBe('Ref Founder');
  });

  it('returns null for an unprovisioned sub', async () => {
    const entity = await resolveFounderEntity({ sub: 'nobody-here' }, pool);
    expect(entity).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && PG_MEMORY_HOST=/tmp npm test -- tests/memory/journey-endpoint.test.js`
Expected: FAIL — `../../src/handlers/journey.js` does not exist.

- [ ] **Step 3: Implement the handler**

Create `api/src/handlers/journey.js`:
```js
import memPool from '../memory/db.js';
import { journey, companyForFounder } from '../memory/journey.js';

// Map an authenticated user to a person entity via entity.ref (ref == Auth0 sub).
export async function resolveFounderEntity(authUser, client = memPool) {
  if (!authUser?.sub) return null;
  const { rows } = await client.query(
    `SELECT entity_id, corpus_id, name FROM entity WHERE ref = $1 AND type = 'person' LIMIT 1`,
    [authUser.sub]);
  return rows[0] || null;
}

export async function journeyHandler(request, reply) {
  const founder = await resolveFounderEntity(request.authUser);
  if (!founder) return reply.send({ founder: null, company: null, entries: [] });

  const company = await companyForFounder(founder.entity_id);
  if (!company) return reply.send({ founder: { name: founder.name }, company: null, entries: [] });

  const { entries } = await journey(founder.entity_id, company.entity_id);
  return reply.send({
    founder: { name: founder.name },
    company: { name: company.name },
    entries,
  });
}

// Demo preHandler: stand in for requireAuth when DEMO_FOUNDER_MODE is set, so the seeded
// demo founder renders locally without a real Auth0 token. Never used when the flag is off.
export async function demoAuth(request) {
  request.authUser = { sub: 'demo-founder' };
}
```

- [ ] **Step 4: Register the route**

In `api/src/server.js`, near the other `/api/v1/profile/current/*` routes, add the import and route. After `import { requireAuth } from './lib/auth.js';` add:
```js
import { journeyHandler, demoAuth } from './handlers/journey.js';
```
Then beside the profile routes:
```js
const journeyGate = process.env.DEMO_FOUNDER_MODE === 'true' ? demoAuth : requireAuth;
app.get('/api/v1/profile/current/journey', { preHandler: journeyGate }, journeyHandler);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd api && PG_MEMORY_HOST=/tmp npm test -- tests/memory/journey-endpoint.test.js`
Expected: PASS (both resolution tests).

- [ ] **Step 6: Commit**

```bash
git add api/src/handlers/journey.js api/src/server.js api/tests/memory/journey-endpoint.test.js
git commit -m "feat(journey): GET /profile/current/journey handler + demo-mode gate"
```

---

## Task 4: Demo founder seed

**Files:**
- Create: `api/scripts/seed-demo-journey.js`
- Modify: `api/package.json` (scripts)

- [ ] **Step 1: Implement the idempotent seed**

Create `api/scripts/seed-demo-journey.js`:
```js
// Seeds one LABELLED demo founder ("Demo Founder" / "Acme") into proof360_memory with 3 sessions.
// Idempotent: keyed on the fixed sentinel entity.ref 'demo-founder' — re-running is a no-op.
import pool from '../src/memory/db.js';
import { createEntity, createEdge, recordEvidence, assertClaim } from '../src/memory/nodes.js';

const SAFE = { access_layer: 'authenticated_customer_portal', output_permission: 'customer_safe_summary_ok' };
const DEMO_REF = 'demo-founder';

const SESSIONS = [
  { session_id: 'demo-s1', label: 'First read — cold read', collected_at: '2026-04-01T09:00:00.000Z',
    claims: [{ subject: 'stage', value: 'seed' }, { subject: 'gap:mfa', value: 'No MFA enforced' }, { subject: 'gap:soc2', value: 'No SOC 2 evidence' }] },
  { session_id: 'demo-s2', label: 'Reviewed gaps — vendor match', collected_at: '2026-04-15T09:00:00.000Z',
    claims: [{ subject: 'match:vanta', value: 'Vanta recommended for SOC 2' }] },
  { session_id: 'demo-s3', label: 'Outcome — closed a gap', collected_at: '2026-05-01T09:00:00.000Z',
    claims: [{ subject: 'gap:mfa', value: 'MFA enforced org-wide', authority: 'reality' }] },
];

async function main() {
  const existing = await pool.query(`SELECT entity_id FROM entity WHERE ref=$1`, [DEMO_REF]);
  if (existing.rows.length) { console.log('demo founder already seeded — no-op'); return; }

  const person = await createEntity({ type: 'person', name: 'Demo Founder', ref: DEMO_REF, ...SAFE });
  const company = await createEntity({ type: 'company', name: 'Acme', ...SAFE });
  await createEdge({ from: person.corpus_id, to: company.corpus_id, kind: 'founded', extensions: { scope: 'full' }, ...SAFE });

  for (const s of SESSIONS) {
    const ev = await recordEvidence({ entity_id: company.entity_id, type: 'session', content: s.label, collected_at: s.collected_at, extensions: { session_id: s.session_id, label: s.label }, ...SAFE });
    for (const c of s.claims) {
      await assertClaim({ entity_id: company.entity_id, subject: c.subject, value: c.value, authority: c.authority || 'founder', evidence_ids: [ev.evidence_id], valid_from: s.collected_at, ...SAFE });
    }
  }
  console.log('seeded demo founder + 3 sessions');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
```

> Note: session demo-s3 supersedes the `gap:mfa` claim (authority `reality` ≥ `founder`), demonstrating walk-back/outcome. The live `gap:mfa` then shows the outcome; the journey still lists it under the session whose evidence it links to.

- [ ] **Step 2: Add the npm script**

In `api/package.json` `scripts`, add:
```json
"seed:demo-journey": "node --env-file=.env scripts/seed-demo-journey.js"
```

- [ ] **Step 3: Run migration + seed against the real dev DB**

Run:
```bash
cd api && npm run migrate:memory && npm run seed:demo-journey
```
Expected: `migration 003_journey applied` (first run) then `seeded demo founder + 3 sessions`. Re-run → `demo founder already seeded — no-op`.

- [ ] **Step 4: Verify the seed via the endpoint**

Run:
```bash
cd api && DEMO_FOUNDER_MODE=true node --env-file=.env src/server.js & sleep 2
curl -s http://localhost:3002/api/v1/profile/current/journey | head -c 800; echo
kill %1
```
Expected: JSON with `company.name == "Acme"` and `entries` length 3, ordered `demo-s1, demo-s2, demo-s3`.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/seed-demo-journey.js api/package.json
git commit -m "feat(journey): idempotent demo founder seed (Acme, 3 sessions)"
```

---

## Task 5: Frontend `/journey` page

**Files:**
- Modify: `frontend/src/api/client.js`
- Create: `frontend/src/pages/Journey.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add the client call**

⚠️ `authRequest` calls `getAccessToken()` which **throws a client-side 401 when `localStorage.founder_tokens` is absent** (`frontend/src/api/auth.js`). The demo bypass writes `founder_auth`, NOT `founder_tokens` — so `authRequest` would fail before any request reaches the backend. In demo mode we must use the plain (non-auth) `request()` instead. `request` already exists in `client.js` (used by `getFeatures` et al.).

In `frontend/src/api/client.js`, near the other profile calls, add:
```js
const DEMO_FOUNDER = import.meta.env.VITE_DEMO_FOUNDER_MODE === 'true';
export const getJourney = () =>
  DEMO_FOUNDER
    ? request('GET', '/api/v1/profile/current/journey')        // demo: no token needed (backend gate is demoAuth)
    : authRequest('GET', '/api/v1/profile/current/journey');   // prod: real Auth0 token
```
> The frontend `VITE_DEMO_FOUNDER_MODE` must match the backend `DEMO_FOUNDER_MODE`. Both are set in Step 4.

- [ ] **Step 2: Create the page**

Create `frontend/src/pages/Journey.jsx` — a vertical timeline, oldest at top, each session an expandable card. v1 uses minimal inline styles (no new design system); polishing with the existing `tokens.js` / `ConfidenceChip` is a follow-up, not required for the demo:
```jsx
import { useEffect, useState } from 'react';
import { getJourney } from '../api/client.js';

export default function Journey() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({});

  useEffect(() => { getJourney().then(setData).catch((e) => setError(String(e))); }, []);

  if (error) return <main style={{ padding: 32 }}>Could not load your journey: {error}</main>;
  if (!data) return <main style={{ padding: 32 }}>Loading your journey…</main>;
  if (!data.entries?.length) {
    return <main style={{ padding: 32 }}><h1>Your journey</h1><p>Your journey starts at your first read.</p></main>;
  }

  return (
    <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <h1>Your trust journey{data.company?.name ? ` — ${data.company.name}` : ''}</h1>
      <ol style={{ listStyle: 'none', padding: 0, borderLeft: '2px solid #ddd' }}>
        {data.entries.map((e) => (
          <li key={e.session_id} style={{ position: 'relative', padding: '12px 0 12px 20px' }}>
            <button
              onClick={() => setOpen((o) => ({ ...o, [e.session_id]: !o[e.session_id] }))}
              style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
              <strong>{e.label || e.session_id}</strong>
              <span style={{ color: '#888', marginLeft: 8 }}>
                {new Date(e.occurred_at).toLocaleDateString()} · {e.claims.length} item{e.claims.length === 1 ? '' : 's'}
              </span>
            </button>
            {open[e.session_id] && (
              <ul style={{ marginTop: 8 }}>
                {e.claims.map((c, i) => (
                  <li key={i}>{c.statement} <em style={{ color: '#aaa' }}>({c.authority})</em></li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
```

- [ ] **Step 3: Register the route**

In `frontend/src/App.jsx`, import and add the route alongside the founder routes:
```jsx
import Journey from './pages/Journey.jsx';
// ...inside <Routes>:
<Route path="/journey" element={<Journey />} />
```
> Auth gating note: `App.jsx` has **no wrapper guard component** — founder routes guard *inside* the page via a `useEffect` that reads `localStorage.founder_auth` and `navigate()`s to login on miss (see `FounderDashboard.jsx`). For **v1 demo, leave `/journey` ungated** (the backend `demoAuth` resolves the demo founder; `VITE_DEMO_FOUNDER_MODE` makes the client skip the token). When real-founder gating is wanted later, replicate `FounderDashboard.jsx`'s in-component `useEffect` localStorage check in `Journey.jsx` — do not look for a wrapper that doesn't exist.

- [ ] **Step 4: Manual verification in the browser**

Run (two terminals or background) — both the backend AND frontend demo flags must be on:
```bash
cd api && DEMO_FOUNDER_MODE=true npm start &
cd frontend && VITE_DEMO_FOUNDER_MODE=true npm run dev
```
Open `http://localhost:5173/journey`. Expected: "Your trust journey — Acme", three cards (First read → vendor match → outcome) oldest-to-newest; clicking a card expands its claims.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/client.js frontend/src/pages/Journey.jsx frontend/src/App.jsx
git commit -m "feat(journey): /journey timeline page + getJourney client"
```

---

## Task 6: Full-suite regression + acceptance

- [ ] **Step 1: Run the full api suite on real PG**

Run: `cd api && PG_MEMORY_HOST=/tmp npm test`
Expected: all suites green (existing 60 + new journey tests). No regressions.

- [ ] **Step 2: Confirm no-PG skip path**

Run: `cd api && PG_MEMORY_HOST=/nonexistent npm test -- tests/memory/journey.test.js`
Expected: journey suite **skips** cleanly (`describe.skipIf(!reachable)`), exit 0.

- [ ] **Step 3: Acceptance checklist (from spec)**

- [ ] `npm run migrate:memory` applies `003_journey.sql`; `npm run seed:demo-journey` is idempotent.
- [ ] `GET /api/v1/profile/current/journey` → 401 unauth (flag off, no token); 200 + 3 ordered entries in `DEMO_FOUNDER_MODE`; 200 `entries:[]` for an unprovisioned founder.
- [ ] `/journey` renders the demo founder's 3 sessions top-down; expanding reveals claims.
- [ ] All journey tests green on real PG16; skip cleanly with no PG.

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git commit -am "test(journey): full-suite green + acceptance verified" --allow-empty
```

---

## Notes / deviations from spec (intentional)

- **`journey()` delegates filtering to `project()`** rather than re-implementing the output-permission filter — strictly DRY, and the member-view permission test passes for free. (Spec said "same rule as project()"; this is the cleanest realization.)
- **`DEMO_FOUNDER_MODE` gate** added because backend Auth0 (`AUTH0_DOMAIN`/`AUTH0_AUDIENCE`) is not configured locally and the frontend demo-bypass issues no real token. Prod path is unchanged (`requireAuth`). This realizes spec §5's "demo mode the handler recognises."
- **`entity.ref = authUser.sub`** is the resolution key. The demo uses the fixed sentinel `'demo-founder'`. Real-founder provisioning (writing entities with `ref = real sub`) remains out of scope (session-attach cutover).
