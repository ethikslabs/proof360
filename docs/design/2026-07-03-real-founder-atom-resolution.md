# Real founder → atom resolution (D3) — design

**Date:** 2026-07-03 · **Ruling:** John ratified Option A (lazy projection) in-session, on top of
the auth-in-front tentpole ruling (prod journey/CER = requireAuth; see
`CONTROL/working/2026-07-03-tentpole-decision-briefs.md`).
**Charter:** D3 of `docs/plans/2026-07-03-cer-real-founder-loop-charter.md`.

## Problem

`/journey` (and the CER cards that hang off the same identity) resolve a founder via
`entity.ref == authUser.sub` in the atom DB. Only the seeded `demo-founder` entity exists, so
prod runs `DEMO_FOUNDER_MODE=true`: every visitor sees the demo founder, and a real login would
see an empty journey forever — nothing ever creates a real founder's person entity or projects
their existing file-kernel history into atoms.

## Design (Option A — lazy projection on first authenticated touch)

New `resolveOrProjectFounder(authUser)` in `api/src/memory/resolve.js`, used by
`journeyHandler` in place of the bare `resolveFounderEntity`:

1. **Fast path:** entity with `ref = sub` exists → return it (the demo founder keeps working
   under demoAuth in dev; no projection).
2. **First touch:** no entity → read the founder's file-kernel profile
   (`getOrCreateFounder` → `getOrCreateActiveProfile` → `replayProfile`) and project:
   - kernel has a `company_name` claim → `migrateProfile(snapshot, { founderName,
     companyName, founderRef: sub })` — person (+ref) + company + `founded` edge + claims,
     exactly the tested v1→v2 replay.
   - kernel empty / no company claim → create the **person entity only** (`ref = sub`).
     No fabricated company placeholder — the journey renders founder + `company: null`
     honestly until a cold-read or chat supplies one.
3. **Idempotency / race:** the `ref` lookup is the guard, backed by the engine's native
   `entity.ref TEXT UNIQUE` (001_engine.sql:22 — no new migration needed): a concurrent
   first-touch race loses loudly with a unique violation, and the loser re-reads the fast
   path.

`migrateProfile` + `createFounderAndCompany` gain an optional `founderRef` passthrough
(default null — existing callers unchanged).

## The flag flip (same PR)

- `deploy.yml`: `VITE_DEMO_FOUNDER_MODE: 'true'` removed from the frontend build env (the
  workflow comment already promised "remove this flag then").
- SSM `/proof360/DEMO_FOUNDER_MODE` → `false` just before merge (materialises into `api/.env`
  only at deploy, so the cutover is atomic with the deploy).
- Effects: journey + CER go `requireAuth` (tentpole-1 ruling); anonymous `/chat` keeps the
  client-side labelled Hive&Co example (separate mechanism, untouched); the demo founder's
  seeded atoms stay in the DB but become unreachable (no demoAuth); the CER gap-prompt
  (D1/D2) becomes live on prod for real founders.
- Auth0: dev tenant (`dev-ethikslabs.au.auth0.com`) stays for now — production tenant remains
  the separate pre-v3.0 item. Flagged, not built here.

## Acceptance

- Unit (PG-backed, skipIf no Postgres): fast path returns existing without creating; first
  touch with kernel company projects person+company+claims with `ref = sub`; empty kernel
  creates person only (no fabricated company); second call is a no-op (unique-index-backed);
  existing `migrateProfile` callers unaffected.
- Live: John logs into proof360.au with a real Auth0 founder account (login is his action, not
  the agent's); `/journey` renders his founder identity (not the demo founder), and the CER
  flow runs against his identity. Anonymous `/chat` still shows the labelled example.
