# Founder Memory V1 Implementation Plan

> **For agentic workers:** implement task-by-task. The active storage decision is JSON-first file storage, not Postgres.

**Goal:** proof360 becomes a private, server-durable founder **memory kernel**. The Company Profile is reconstructed from events -> evidence -> observations -> claims -> projections, never hand-edited. The profile is the kernel's first projection; future views (investor, vendor, insurance, enterprise DD, SPV, Ethiks360) are later projections of the same substrate.

**Three invariants:** **promotion** (nothing becomes founder truth accidentally), **durability** (fail loud, atomic file writes), **reconstruction** (views are disposable, memory is canonical).

**Storage:** V1 is file-backed under `MEMORY_STORE_DIR`, defaulting locally to `~/.ethikslabs/proof360/memory` and in production to `/home/ec2-user/.ethikslabs/proof360/memory`. Do not create `002_founder_memory.sql`; Postgres is a later adapter once concurrency, analytics, or multi-server pressure justifies it.

---

## JSON-First Shape

```text
memory/
  founders/
    <founder_hash>/
      founder.json
      active-profile.json
      profiles/
        <profile_id>/
          manifest.json
          transactions/
            000001-<tx_id>.json
            000002-<tx_id>.json
          snapshots/
            current.json
          locks/
            profile.lock
  session-bindings/
    <session_id>.json
```

Each transaction file is immutable and contains one complete write:

```json
{
  "tx_id": "uuid",
  "profile_id": "uuid",
  "created_at": "iso timestamp",
  "source": "founder",
  "records": [
    { "primitive": "event", "source": "chat" },
    { "primitive": "evidence", "source": "founder" },
    { "primitive": "observation", "source": "founder" },
    { "primitive": "claim", "source": "founder" }
  ]
}
```

`source` is origin metadata with open vocabulary. It is not a table and not an enum.

## Implementation Tasks

- [x] Replace Postgres-first plan/spec language with JSON-first memory kernel language.
- [x] Add file-backed memory store with temp file -> fsync -> atomic rename writes, per-profile locks, replay, snapshots, and first-claimer session binding.
- [x] Add explicit derivation layer for events, evidence, observations, and claims. V1 stores explicit/content observations only; no tone or hesitation inference.
- [x] Add deterministic projection engine for investor, vendor, AWS, Microsoft, posture, and Company Profile tiles.
- [x] Add Auth0 JWT verification middleware using JWKS (`jose`).
- [x] Add profile API routes:
  - `GET /api/v1/profile/current`
  - `GET /api/v1/profile/current/projections`
  - `POST /api/v1/profile/current/events`
  - `POST /api/v1/sessions/:sessionId/profile`
- [ ] Wire frontend login/session attach, bearer-token API calls, chat memory events, and projection-derived lit tiles.
- [ ] Add deployment env for `MEMORY_STORE_DIR`, `AUTH0_DOMAIN`, and `AUTH0_AUDIENCE`.
- [ ] Run regression, frontend build, and browser checks.

## Rules

- Cold read remains public.
- Founder memory routes are Auth0-verified.
- Session/cold-read signals promote to durable founder memory only through `POST /api/v1/sessions/:sessionId/profile`.
- Founder chat may append memory events immediately, but claims are promoted only from explicit founder-provided facts or corrections.
- Projections are never canonical facts; they are computed on read from replayed memory.
- `snapshots/current.json` is a rebuildable cache. Transaction files are canonical.
- Memory files must never be stored under deployed `api/` or `frontend/` directories and must never be repo-tracked.
- Ethiks360 handoff remains hidden in V1.

## Test Plan

- File-store tests: transaction ordering, replay, snapshot rebuild, lock serialization, temp-file cleanup behavior, and session first-claimer binding.
- API/handler tests: authenticated profile creation, event append, session attach, claim promotion, projections, and cross-user session denial.
- Frontend checks: refresh persistence, tile lighting, demo separation, cold-read still works without login, and no accidental Ethiks360 sharing.
