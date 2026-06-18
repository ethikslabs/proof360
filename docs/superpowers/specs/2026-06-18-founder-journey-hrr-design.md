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
5. **Approach:** **A — Session-as-Evidence.** The immutable `evidence` table is the timeline backbone; no schema change.

## Out of scope (v1)

- Posture-delta entries ("your score moved A→B" between visits).
- The live session-attach → atom-store cutover (a separately-planned task; v1 reads atoms, seeded for now).
- Shareable no-login journey links.
- Operator/other-persona journeys (a future generic primitive).

---

## Architecture

```
Founder (Auth0 login)
  → GET /api/v1/profile/current/journey   (authRequest — resolves logged-in founder)
    → journey(founderEntityId)            (src/memory/journey.js, reads proof360_memory)
      → founded edge → company
      → company live claims  ⋈ claim_evidence ⋈ evidence(type='session')
      → group by session, order by evidence.valid_from ASC
      → permission-filter (reuse project() rules) BEFORE return
  → Journey.jsx  (/journey route, vertical timeline of expandable session cards)
```

The journey **is** the evidence stream, grouped per session and projected for the viewer. `evidence` is already immutable and time-ordered, so it is the natural, canonical timeline backbone — no new table, no duplicated truth.

---

## Components

### 1. Session anchor (data shape)

Each visit is represented by one immutable `evidence` row:

- `type: 'session'`
- `content`: short human description of the visit
- `source_type`: `'operator_entry'` (seed) / live source later
- `extensions`: `{ session_id, label, started_at }`

Claims asserted during a visit link to that session-evidence via the existing `claim_evidence` join. **No schema migration** — uses the existing `evidence`, `claim`, `claim_evidence` tables from `db/memory-migrations/001_engine.sql` + `002_*.sql`.

A journey entry returned to the client:

```jsonc
{
  "session_id": "string",
  "occurred_at": "ISO-8601",      // evidence.valid_from
  "label": "string",              // extensions.label
  "claims": [
    { "statement": "...", "authority": "founder|cto|legal|provider|reality|system|operator",
      "subject": "...", "confidence": 0.0, "output_permission": "..." }
  ]
}
```

### 2. Read function — `src/memory/journey.js`

`export async function journey(founderEntityId, client = pool)`

- Resolve founder `corpus_id` and the `founded` edge → company entity (reuse the resolution pattern in `project.js`).
- Self-view is unfiltered (`viewer === founder`), matching `project()`'s `selfView` branch.
- Query: company's live claims (`superseded_by IS NULL`) joined through `claim_evidence` to `evidence WHERE type='session'`.
- Group rows by `evidence.extensions->>'session_id'`; order groups by `evidence.valid_from` **ascending** (oldest → newest = the story).
- Apply the same output-permission filter as `project()` **before** returning (never redact after).
- Return `{ founder: {id, name}, company: {id, name}, entries: [ ... ] }`.

Claims **not** linked to any session-evidence are excluded from v1 (journey is per-session by decision).

### 3. Endpoint — `GET /api/v1/profile/current/journey`

- New handler `src/handlers/journey.js`, registered beside the existing `/api/v1/profile/current/*` routes in `server.js`.
- Auth-gated via the same `authRequest`/auth mechanism as `/profile/current/projections` (resolves the authenticated founder entity).
- 401 `{ error: 'auth_required' }` when unauthenticated.
- 200 → `journey()` payload.
- Reads `proof360_memory` (the atom DB), independent of the legacy file kernel.

### 4. Frontend — `/journey` route, `Journey.jsx`

- New route in `App.jsx`, behind founder Auth0 (mirror `FounderAuth.jsx` / `FounderDashboard.jsx` auth gating; unauthenticated → founder login).
- `getJourney()` added to `api/client.js` (via `authRequest`).
- Vertical timeline, **oldest at top → newest at bottom** (story reads top-down); each session = one expandable card:
  - Collapsed: label + date + one-line summary (e.g. "3 gaps, 1 vendor match").
  - Expanded: the session's claims as plain-English beats, each with a "traces to evidence" affordance (the walk-back made visible).
- Reuse `ConfidenceChip` + existing design tokens (`tokens.js`); **no new design system**.
- Empty state: founder with zero sessions → "Your journey starts at your first read."
- Honour the landing emotional contract + `INVARIANTS.md`: no canned text on the live surface; all content derives from real atoms (demo founder is a labelled sandbox, not canned live content).

### 5. Demo seed — `scripts/seed-demo-journey.js`

- Seeds one clearly-labelled demo founder ("Demo Founder" / "Acme") into `proof360_memory`.
- ~3 session-evidence rows with ascending timestamps; each with a few claims forming the arc: cold-read gaps → a vendor match → an outcome (`authority='reality'`).
- **Idempotent** — safe to re-run (upsert/guard on a stable demo ref; no duplicate sessions on re-run).
- npm script `seed:demo-journey`.

---

## Data flow (read path)

1. Founder authenticates (Auth0) → frontend holds founder identity/token.
2. `Journey.jsx` calls `getJourney()` → `GET /api/v1/profile/current/journey` with auth.
3. Handler resolves the founder entity → `journey(founderEntityId)`.
4. `journey()` walks founded-edge → company → session-grouped claims, permission-filtered, ordered.
5. Frontend renders the timeline; expanding a card reveals that session's claims + evidence walk-back.

## Error handling

- Unauthenticated → 401 `auth_required` (frontend redirects to founder login).
- Founder entity with no `founded` edge / no company → 200 with `entries: []` (empty state), not an error.
- Unknown viewer entity → reuse `project()`'s `throw new Error('project(): unknown viewer or target entity')` semantics; handler maps to 404 `{ error: 'founder_not_found' }`.
- DB unreachable → 500; the API already fails loud on PG config (no silent fallback).

## Testing

`tests/memory/journey.test.js` (real PG16, follows existing `tests/memory/*` globalSetup that resets once to avoid the parallel DROP-SCHEMA race):

1. **Order:** entries returned oldest → newest by `evidence.valid_from`.
2. **Self-view unfiltered:** founder self-view returns all of the company's session-linked claims.
3. **Permission filtering:** a partial-scope member (`member_of` edge) sees only the output-permission-gated subset — separation holds (mirrors the memory-v2 separation acceptance test).
4. **Empty:** founder with no sessions → `entries: []`.

Endpoint smoke: 401 without auth; 200 + documented shape with auth.

No-PG CI mirror: journey suite skips cleanly when Postgres is unreachable (match existing memory-suite skip behaviour).

---

## File inventory

| File | Change |
|------|--------|
| `api/src/memory/journey.js` | NEW — `journey(founderEntityId)` read fn |
| `api/src/handlers/journey.js` | NEW — `GET /api/v1/profile/current/journey` handler |
| `api/src/server.js` | EDIT — register journey route |
| `api/scripts/seed-demo-journey.js` | NEW — idempotent demo founder seed |
| `api/package.json` | EDIT — `seed:demo-journey` script |
| `api/tests/memory/journey.test.js` | NEW — read-fn + permission tests |
| `frontend/src/pages/Journey.jsx` | NEW — timeline page |
| `frontend/src/App.jsx` | EDIT — `/journey` route, Auth0-gated |
| `frontend/src/api/client.js` | EDIT — `getJourney()` |

No schema migration. No change to the legacy file kernel. No change to `project.js` (reused, not modified — extract its resolution helpers only if cleanly shareable).

---

## Acceptance (v1 demo)

1. `npm run seed:demo-journey` populates the demo founder in `proof360_memory`.
2. API boots; `GET /api/v1/profile/current/journey` returns 401 unauth, 200 + ordered entries when authed as the demo founder.
3. Frontend `/journey` (after founder login) shows the demo founder's ~3 sessions as a top-down timeline; expanding a card reveals that visit's claims with evidence walk-back.
4. All journey tests green on real PG16; skip cleanly with no PG.
