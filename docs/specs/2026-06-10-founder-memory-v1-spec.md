# proof360 Founder Memory V1 — Spec

**Authored:** John Coates (workshopped), 2026-06-10
**Ratified:** 2026-06-10 — with two additions from the Claude Code challenge (promotion invariant, fail-loud durability contract). Token strategy: rotating refresh tokens. Auth0 API audience: John creates in dashboard.
**Status:** ratified — plan at `docs/plans/2026-06-10-founder-memory-v1.md`

## Summary

Build proof360 as a private, server-durable founder memory system — **the memory kernel**. The Company Profile is the *first projection* of that kernel, not the product: once memory is canonical and reconstruction is deterministic, every future view (investor, vendor, insurance, enterprise DD, SPV, Ethiks360) is another disposable projection of the same substrate. Build the smallest possible kernel: durable memory, deterministic reconstruction, explainable projections. Not a CRM, not a profile editor, not sharing, not SPV Passport.

**The Company Profile is not a form. It is reconstructed, not edited.** Founders contribute memory through conversations, corrections, and activity. The system derives observations, maintains claims, and generates projections, but the visible profile is always rebuilt from underlying memory and evidence rather than manually authored.

## Core Model

- Add five primitives:
  - `event`: append-only memory fragment from chat, cold read, founder correction, or session activity.
  - `evidence`: support material for memory, initially founder statements and session/cold-read signals; schema leaves room for filings, documents, integrations, and CORPUS refs later.
  - `observation`: first-class derived signal linked to events and evidence. V1 stores explicit/content-based observations only, not tone or hesitation inference.
  - `claim`: current believed profile state promoted from observations or evidence.
  - `projection`: future-facing interpretation generated from current claims and observations.
- Sixth primitive (added at ratification review, 2026-06-10): `source` — origin **metadata, not a table**. Every event and evidence row carries `source`: `founder` | `cold_read` | `chat` | later `aws` | `microsoft` | `hubspot` | `linkedin` | `document` | `corpus` | … Open vocabulary (no CHECK constraint — it grows as feeds arrive). Provenance groups by **origin** as well as evidence kind, so when external systems start feeding evidence, "what did AWS tell us" is a query, not a migration.
- Keep unknowns explicit. Missing data remains `unknown`, not guessed.
- Projections are not facts; they always mean "based on what we currently know."

## Ratified invariants (added at challenge, 2026-06-10)

1. **Promotion invariant:** session signals never silently become claims. Explicit promotion (`POST /api/v1/sessions/:sessionId/profile`) is the only path from session truth to durable founder truth. Founder-actor claims are never superseded by system-actor claims.
2. **Durability contract:** founder-memory routes are synchronous-Postgres and fail loud (5xx). The cold-read pipeline's in-memory-first / async-PG posture does not apply to memory routes.

## Implementation Changes

- Add backend Auth0 verification for durable memory routes; Auth0 `sub` is the founder identity.
- Add Postgres tables for founders, one active Company Profile per founder, profile sessions, events, evidence, observations, and claims.
- Persist authenticated chat and cold-read signals into the active Company Profile.
- Add API routes:
  - `GET /api/v1/profile/current`
  - `GET /api/v1/profile/current/projections`
  - `POST /api/v1/profile/current/events`
  - `POST /api/v1/sessions/:sessionId/profile`
- Replace hardcoded "Your Company" lit-tile state with backend-derived projections.
- Hide Ethiks360 sharing in V1. No external publish/export action until the founder-approved Ethiks360 projection exists.

## Projection Contract

Each projection must return:

- `state`: the current result, such as likely, partial, blocked, unknown, or ready.
- `confidence`: low, medium, or high.
- `contributing_claims`: claim IDs used to produce the projection.
- `contributing_observations`: observation IDs used to explain the projection.
- `missing_inputs`: what would improve or change the result.

Use deterministic scoring rules for projection state, with AI synthesis only for explanation grounded in linked observations and claims.

## Test Plan

- API tests: Auth0-required memory routes, active profile creation, session attachment, event append, evidence linking, observation derivation, claim promotion, projection contract, and cross-user access denial.
- Regression tests: unauthenticated cold read still works; existing analyze/chat flow remains intact.
- Frontend checks: login restores private memory, refresh preserves profile state, lit tiles update from projections, demo Hive & Co remains distinct, and demo/localStorage data does not become server truth.

## Assumptions

- V1 sources are chat plus cold-read/session signals only.
- V1 supports one active Company Profile per login.
- Observations are explicit/content-based only.
- Evidence exists in V1 as a schema primitive, even before uploads or external integrations.
- Ethiks360 handoff is intentionally absent from V1 UI.
