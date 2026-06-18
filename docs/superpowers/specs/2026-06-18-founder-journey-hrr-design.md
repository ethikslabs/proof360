# proof360 Founder Journey (HRR v1) — Design

**Date:** 2026-06-18
**Status:** Design — approved for spec review
**Surface:** proof360 (`api/` + `frontend/`)
**Builds on:** memory-v2 atom-spine (`api/src/memory/*`, `proof360_memory` DB), branch lineage `feat/proof360-memory-v2`

---

## Why this exists

A founder using proof360 should be able to **return** to a legible record of their trust journey — where they were, what was found, what they did. This is the North Star "Monday-morning coffee" moment (`DOCTRINE/PRINCIPLES.md`, HX First) made concrete for the founder persona.

It is the deliberately-chosen *legible* counterpart to HRR (Holographic Reduced Representation) in Alfred — which was deferred precisely because it is opaque ("opaque/unfed — fastest-car trap"). This design delivers what HRR was *meant* to give — a journey you return to — without the opaque vector.

It sits directly on the memory-v2 atom-spine already built (evidence → claim → recommendation → outcome, with `project(viewer, target)` permission filtering).

## Decisions locked (brainstorm)

1. **Whose journey:** the founder's trust journey (a proof360 user across sessions).
2. **Form:** a timeline/story of **per-session entries** — each visit is one expandable entry.
3. **Return path:** **founder login** (Auth0 PKCE, already wired) → `project(viewer=self)` → full access to own atoms.
4. **v1 data source:** **seed a labelled demo founder** so the surface renders now; real live data (session-attach → atom cutover) comes later.
5. **Approach:** **A — Session-as-Evidence.** The immutable `evidence` table is the timeline backbone. This requires **one small additive migration** (see below) — *not* "zero schema change". The change is purely additive (one nullable column) with no data migration.

## Out of scope (v1)

- Posture-delta entries ("your score moved A→B" between visits).
- The live session-attach → atom-store cutover (a separately-planned task; v1 reads atoms, seeded for now).
- **Live (non-demo) founder → atom-entity resolution.** v1 resolves only the seeded demo founder by a known `entity.ref` (see §5/§6). Mapping arbitrary live founders' Auth0 identities into atom entities depends on the session-attach cutover and is explicitly deferred.
- Shareable no-login journey links.
- Operator/other-persona journeys (a future generic primitive).

---

## Schema reality check (grounding)

Verified against `db/memory-migrations/001_engine.sql` + `002_*.sql`:

- `evidence` columns: `evidence_id, corpus_id, entity_id, hash, type (TEXT NOT NULL, no CHECK), uri, source_type, source_url, collected_at TIMESTAMPTZ, access_layer, output_permission, domain, dep_level, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()`. **No `valid_from`. No `extensions`.** `type='session'` is allowed (free text).
- `entity` HAS `ref TEXT UNIQUE` and `extensions JSONB`. `entity.type` is CHECK-constrained to `('vendor','program','product','person','region','deal_condition','customer_segment')` — so a session can **not** be an entity; it must be `evidence`.
- `claim_evidence (claim_id, evidence_id)` join table exists — the walk-back link.
- `recordEvidence()` (`nodes.js`) currently inserts no `collected_at`, no `extensions`, and does **not** write `claim_evidence`. It must be extended (see §1/§5).
- Backend auth is Fastify `{ preHandler: requireAuth }` (`server.js:78-81`, `lib/auth.js:50`), which sets `request.authUser` from the verified token. (`authRequest` is the *frontend* `api/client.js` wrapper — a separate layer.)
- `getOrCreateFounder(authUser)` resolves into the **file** kernel (`memory-store-file.js`), **not** the atom store. There is no existing Auth0-`sub` → atom-`entity` mapping; v1 supplies one for the demo founder only (§5).

---

## Architecture

```
Founder (Auth0 login)
  → GET /api/v1/profile/current/journey   ({ preHandler: requireAuth } → request.authUser)
    → resolve authUser → atom entity via entity.ref   (§5; demo founder only in v1)
    → journey(founderEntityId)            (src/memory/journey.js, reads proof360_memory)
      → founded edge → company            (NEW traversal; not present in project.js)
      → company live claims  ⋈ claim_evidence ⋈ evidence(type='session')
      → group by evidence.extensions->>'session_id', order by evidence.collected_at ASC
      → permission-filter (same rule as project()) BEFORE return
  → Journey.jsx  (/journey route, vertical timeline of expandable session cards)
```

The journey **is** the evidence stream, grouped per session and projected for the viewer. `evidence` is immutable; ordering uses its `collected_at` timestamp. Session grouping uses a new additive `evidence.extensions` column.

---

## Components

### 1. Session anchor (data shape) — requires migration 003

Each visit is one immutable `evidence` row:

- `type: 'session'`
- `collected_at`: the visit timestamp (**the ordering key**)
- `content` → `uri`/`hash` per existing `recordEvidence` behaviour
- `source_type`: `'operator_entry'` (seed) / live source later
- `extensions`: `{ session_id, label }` (new column)

**Migration `003_journey.sql`** (additive, no data migration, no breakage):
```sql
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS extensions JSONB;
```
`evidence.collected_at` already exists and is used as the timeline timestamp.

`recordEvidence()` in `nodes.js` is extended to accept and insert `collected_at` and `extensions` (both optional; existing callers unaffected).

Claims asserted during a visit link to that session-evidence via the existing `claim_evidence` table. `assertClaim()` writes `claim_evidence` for any `evidence_ids` it is passed (it does not infer links on its own), so the seed (and, later, live writes) must pass the session `evidence_id` explicitly when asserting each claim.

A journey entry returned to the client:

```jsonc
{
  "session_id": "string",         // evidence.extensions->>'session_id'
  "occurred_at": "ISO-8601",      // evidence.collected_at
  "label": "string",              // evidence.extensions->>'label'
  "claims": [
    { "statement": "...", "authority": "founder|cto|legal|provider|reality|system|operator",
      "subject": "...", "confidence": 0.0, "output_permission": "..." }
  ]
}
```

### 2. Read function — `journey(founderEntityId, client)` in `src/memory/journey.js`

- Resolve founder `corpus_id`, then follow the `founded` edge to the company entity. **This founded-edge traversal is NEW** — `project.js` resolves only the *direct* viewer↔target edge and has no "walk to the company" helper. `corpusIdOf`/`liveEdge` in `project.js` are private; either export them for reuse or reimplement the small lookups in `journey.js`.
- Self-view (founder viewing own company) is unfiltered, matching `project()`'s `selfView` semantics.
- Query: the company's live claims (`superseded_by IS NULL`) joined through `claim_evidence` to `evidence WHERE type='session'`.
- Group rows by `evidence.extensions->>'session_id'`; order groups by `evidence.collected_at` **ascending** (oldest → newest = the story).
- Apply the same output-permission filter as `project()` (the `allowed`/`output_permission` rule) **before** returning — never redact after.
- Return `{ founder: {id, name}, company: {id, name}, entries: [ ... ] }`.

Claims **not** linked to any session-evidence are excluded from v1 (journey is per-session by decision).

### 3. Endpoint — `GET /api/v1/profile/current/journey`

- New handler `src/handlers/journey.js`, registered beside the existing `/api/v1/profile/current/*` routes in `server.js` with `{ preHandler: requireAuth }` (the **backend** gate; not `authRequest`).
- `requireAuth` populates `request.authUser`; the handler resolves it to an atom entity (§5) then calls `journey(founderEntityId)`.
- 401 `{ error: 'auth_required' }` when unauthenticated (handled by `requireAuth`).
- 200 → `journey()` payload.
- Reads `proof360_memory` (the atom DB), independent of the legacy file kernel.

### 4. Frontend — `/journey` route, `Journey.jsx`

- New route in `App.jsx`, behind founder Auth0 (mirror `FounderAuth.jsx` / `FounderDashboard.jsx` gating; unauthenticated → founder login).
- `getJourney()` added to `api/client.js` via the existing `authRequest` wrapper (frontend auth layer).
- Vertical timeline, **oldest at top → newest at bottom** (story reads top-down); each session = one expandable card:
  - Collapsed: label + date + one-line summary (e.g. "3 gaps, 1 vendor match").
  - Expanded: the session's claims as plain-English beats, each with a "traces to evidence" affordance (the walk-back made visible).
- Reuse `ConfidenceChip` + existing design tokens (`tokens.js`); **no new design system**.
- Empty state: founder with zero sessions → "Your journey starts at your first read."
- Honour the landing emotional contract + `INVARIANTS.md`: no canned text on the live surface; all content derives from real atoms (demo founder is a labelled sandbox, not canned live content).

### 5. Auth → atom-entity resolution (the linchpin, demo-scoped in v1)

`journey(founderEntityId)` needs an atom-store `entity_id` for the caller. No such mapping exists today. v1 introduces a minimal, explicit one:

- The demo founder (person entity) is seeded with a **fixed sentinel** `entity.ref = 'demo-founder'` (chosen over a real Auth0 `sub` so v1 has no dependency on live identity provisioning; `entity.ref` is `UNIQUE`).
- In demo mode the handler maps the demo login's `request.authUser` to that sentinel ref, then resolves `SELECT entity_id FROM entity WHERE ref = $1 AND type='person'`.
- If no entity matches (any non-demo live founder in v1), return 200 with `entries: []` and the empty state — **not** a 500. Live founder provisioning is out of scope (deferred to the session-attach cutover).

### 6. Demo seed — `scripts/seed-demo-journey.js`

- Seeds one clearly-labelled demo founder ("Demo Founder", person) + company ("Acme") into `proof360_memory`, joined by a `founded` edge. Founder entity carries the known `entity.ref` from §5.
- ~3 session-evidence rows (`type='session'`, ascending `collected_at`, `extensions={session_id,label}`); each with a few claims forming the arc: cold-read gaps → a vendor match → an outcome (`authority='reality'`). Each claim is linked to its session-evidence via `claim_evidence`.
- **Idempotent** — safe to re-run (guard on the stable demo `ref`/`session_id`; no duplicate founder, company, or sessions on re-run).
- npm script `seed:demo-journey`.

---

## Data flow (read path)

1. Founder authenticates (Auth0) → frontend holds founder identity/token.
2. `Journey.jsx` calls `getJourney()` → `GET /api/v1/profile/current/journey` with auth.
3. `requireAuth` verifies the token → `request.authUser`; handler resolves it to an atom `entity_id` via `entity.ref` (§5).
4. `journey(founderEntityId)` walks founded-edge → company → session-grouped claims, permission-filtered, ordered by `collected_at`.
5. Frontend renders the timeline; expanding a card reveals that session's claims + evidence walk-back.

## Error handling

- Unauthenticated → 401 `auth_required` (via `requireAuth`; frontend redirects to founder login).
- Authenticated but no matching atom entity (non-demo founder in v1) → 200 `entries: []` (empty state), not an error.
- Founder entity with no `founded` edge / no company → 200 with `entries: []`.
- DB unreachable → 500; the API already fails loud on PG config (no silent fallback).

## Testing

`tests/memory/journey.test.js` (real PG16, follows existing `tests/memory/*` globalSetup that resets once to avoid the parallel DROP-SCHEMA race):

1. **Order:** entries returned oldest → newest by `evidence.collected_at`.
2. **Self-view unfiltered:** founder self-view returns all of the company's session-linked claims.
3. **Permission filtering:** a partial-scope member (`member_of` edge) sees only the output-permission-gated subset — separation holds (mirrors the memory-v2 separation acceptance test).
4. **Empty:** founder with no sessions → `entries: []`.
5. **Migration:** `003_journey.sql` applies cleanly and is idempotent (`ADD COLUMN IF NOT EXISTS`).

Endpoint smoke: 401 without auth; 200 + documented shape when authed as the demo founder.

No-PG CI mirror: journey suite skips cleanly when Postgres is unreachable (match existing memory-suite skip behaviour).

---

## File inventory

| File | Change |
|------|--------|
| `api/db/memory-migrations/003_journey.sql` | NEW — additive `ALTER TABLE evidence ADD COLUMN IF NOT EXISTS extensions JSONB` |
| `api/src/memory/nodes.js` | EDIT — `recordEvidence()` accepts/inserts `collected_at` + `extensions` |
| `api/src/memory/journey.js` | NEW — `journey(founderEntityId)` read fn (incl. NEW founded-edge traversal) |
| `api/src/memory/project.js` | OPTIONAL EDIT — export `corpusIdOf`/`liveEdge` only if cleanly shareable; else reimplement in `journey.js` |
| `api/src/handlers/journey.js` | NEW — `GET /api/v1/profile/current/journey` handler + auth→entity resolution (§5) |
| `api/src/server.js` | EDIT — register journey route with `requireAuth` |
| `api/scripts/seed-demo-journey.js` | NEW — idempotent demo founder + company + sessions + claim_evidence links |
| `api/package.json` | EDIT — `seed:demo-journey` script |
| `api/tests/memory/journey.test.js` | NEW — order, self-view, permission, empty, migration tests |
| `frontend/src/pages/Journey.jsx` | NEW — timeline page |
| `frontend/src/App.jsx` | EDIT — `/journey` route, Auth0-gated |
| `frontend/src/api/client.js` | EDIT — `getJourney()` via `authRequest` |

One additive migration (003). No change to the legacy file kernel. `project.js` reused (permission rule + optional helper export), not rewritten.

---

## Acceptance (v1 demo)

1. `npm run migrate:memory` applies `003_journey.sql`; `npm run seed:demo-journey` populates the demo founder, company, and ~3 linked sessions in `proof360_memory`.
2. API boots; `GET /api/v1/profile/current/journey` returns 401 unauth, 200 + ordered entries when authed as the demo founder, and 200 `entries: []` for an unprovisioned founder.
3. Frontend `/journey` (after founder login) shows the demo founder's ~3 sessions as a top-down timeline; expanding a card reveals that visit's claims with evidence walk-back.
4. All journey tests green on real PG16; skip cleanly with no PG.
