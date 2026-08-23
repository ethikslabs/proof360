# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current authority override (2026-07-03)

This file still contains useful route and command notes, but several older
architecture claims below are stale. Before changing behaviour, verify against
`repo.json`, `api/src/server.js`, and the live source files.

- Do not reintroduce VECTOR, `VECTOR_URL`, or `localhost:3003`. Inference and
  supporting calls are direct provider/service integrations in `api/`.
- Treat CORPUS (`CORPUS_SEARCH_URL`, default local `:3009`) as the evidence and
  citation dependency. CORPUS failures must be honest degradation, not silent
  invented evidence.
- Treat PULSUS as downstream of `usage-event.v1` meter emission. If a provider
  call is not metered, PULSUS cannot see it.
- Treat FORUM as the future catalog/price dependency for distributor/vendor
  routing. Do not hardcode live SKU or price truth inside proof360.
- The auth sections below describe demo/client-side history. Do not extend
  localStorage demo auth as production security.
- The open work is already named in `repo.json`: signal extraction gaps,
  CORPUS citation surfacing, inference-direct guardrails, and dead frontend
  branch cleanup.

## Current direction (2026-05-15) — supersedes all previous direction blocks

**Surface:** `frontend/` — chat-first conversational trust layer. This is the active build surface.  
**Entry point:** `/chat` route — `frontend/src/pages/Chat.jsx`. `/` redirects to `/chat`. Live routes: `/chat`, `/portal/*`, `/account`, `/admin/preread`.  
**CLI:** `proof360/cli.mjs` is preserved as the signal/retrieval layer. Not the product surface.  
**Old cold-read flow (URL in → audit → report):** DELETED 2026-05-29 (John ruling: strip all legacy, super fresh). The `/audit`, `/audit/reading`, `/audit/cold-read`, `/processing`, `/report/:id`, `/home` routes and their pages/components/handlers are gone. `/chat` is the only entry. Do not reintroduce.  
**Atelier:** deferred — chat UI is built in the existing React/Vite frontend first.

**Active plan:** `docs/plans/2026-05-15-conversational-trust-layer-mvp.md`  
Historical Phase 0 described a mock shell. That is no longer the whole repo
truth: the API has real Fastify routes, Postgres-backed modules, direct Bedrock
inference, Turnstile, CER, CORPUS evidence hooks, and memory/engagement paths.
Read the plan for UX intent, but verify implementation against code and
`repo.json`.

**Design constraint (frontend/):** Before touching any file in `frontend/`, read `docs/design/landing-emotional-contract.md`. The landing emotional contract governs every surface decision. The plan describes mechanics; the contract describes intent. If they conflict, the contract wins.

**Rendering invariants (frontend/):** Before touching any file in `frontend/`, also read `INVARIANTS.md`. The rendering invariants are the frozen architectural contract — rendering protocol, shortlist provenance model, demo/workspace trust boundary, persona-as-lens rule, no-canned-text rule. If the landing emotional contract and INVARIANTS.md conflict, surface it — do not resolve silently. Both are constitutional.

## Universal init

On `/init`, follow `../CONTROL/INIT_PROTOCOL.md`. This repo file adds local rules only; it does not own the workspace init protocol.

## Commands

**API (development)**
```bash
cd api && node --env-file=.env --watch src/server.js
```

**Frontend (development)**
```bash
cd frontend && npm run dev
```

**Frontend (build)**
```bash
cd frontend && npm run build
```

**Frontend (lint)**
```bash
cd frontend && npm run lint
```

**API (production preview)**
```bash
cd api && node --env-file=.env src/server.js
```

**Frontend (preview built output)**
```bash
cd frontend && npm run preview
```

**Tests** — `api/` has vitest unit + property + preservation suites (`cd api && npm test`); `frontend/` has vitest (`cd frontend && npm test`). Manual smoke via the `/chat` surface and the honey demo.

## Local environment

`api/.env` is not committed. Required vars:
```
FIRECRAWL_API_KEY=...      # Web scraping
AWS_REGION=ap-southeast-2  # Direct Bedrock inference default
BEDROCK_REGION=...         # Optional override for Bedrock
CORPUS_SEARCH_URL=...      # Optional; defaults to http://localhost:3009/search
PERPLEXITY_API_KEY=...     # Optional recon-company enrichment
GEMINI_API_KEY=...         # Optional recon-company enrichment
PORT=3002                  # Optional (default: 3002)
```

Frontend reads `VITE_API_BASE_URL` at build time (empty string in production = same-origin). In dev, Vite proxies `/api` via `vite.config.js`.

Optional frontend env vars for auth (defaults are hardcoded dev credentials):
```
VITE_AUTH0_DOMAIN=...       # Auth0 tenant domain
VITE_AUTH0_CLIENT_ID=...    # Auth0 app client ID
VITE_GOOGLE_CLIENT_ID=...   # Google OAuth (omit → falls back to demo mode)
VITE_MS_CLIENT_ID=...       # Microsoft OAuth (omit → falls back to demo mode)
```

Optional API env var for dashboard pulse emission:
```
DASHBOARD_API_URL=http://localhost:3001   # If omitted, pulse-emitter silently no-ops
```

Turnstile in local dev: the frontend falls back to Cloudflare's public always-pass TEST
sitekey when `VITE_CF_TURNSTILE_SITEKEY` is unset (dev builds only — prod shows a config
fault instead). For the server-side gate, set the matching public TEST secret in `api/.env`:
```
TURNSTILE_SECRET=1x0000000000000000000000000000000AA   # CF documented always-pass test secret
```
Production resolves the real pair from SSM (`/proof360/TURNSTILE_SITEKEY` + `/proof360/TURNSTILE_SECRET`).

## Architecture

Proof360 is a trust readiness diagnostic for founders. A user submits a company URL, the system cold-reads their trust posture, asks follow-up questions, then delivers a scored gap report with vendor recommendations.

### Request pipeline (all async, session-keyed)

```
POST /api/session/start
  → signal-extractor.js  (Firecrawl scrape + Claude extraction)

GET  /api/session/infer-status   (poll until complete)
GET  /api/session/inferences     (cold read: inferences + corrections + follow-ups)

POST /api/session/submit         (founder corrections + follow-up answers)
  → gap-mapper.js               (triggers gaps, computes score, enriches from CORPUS when available)

GET  /api/session/status         (poll until analysis complete)
GET  /api/session/report         (full report: Layer 1 always, Layer 2 after email)

POST /api/session/capture-email  (gates Layer 2 — vendor intelligence)
GET  /api/session/early-signal   (estimated score pre-report)
```

### Key files

| File | Purpose |
|------|---------|
| `api/src/services/session-store.js` | In-memory Map, 24h TTL, 90s stale timeout per pipeline stage |
| `api/src/services/signal-extractor.js` | Firecrawl → Claude → raw signals (product_type, data_sensitivity, compliance_status, etc.) |
| `api/src/services/inference-builder.js` | Raw signals → cold read object (inferences[], correctable_fields[], followup_questions[]) |
| `api/src/services/gap-mapper.js` | Gap trigger evaluation → trust_score → CORPUS evidence/vendor hints → signals_object |
| `api/src/services/context-normalizer.js` | Merges founder corrections + followup_answers → NormalizedContext for gap evaluation |
| `api/src/lib/inference.js` | Direct Bedrock wrapper; emits meter usage events |
| `api/src/services/trust-client.js` | Legacy Trust360 adapter. Do not expand without a current task; prefer deterministic/VERITAS-backed paths. |
| `api/src/services/vendor-selector.js` | Matches vendors to confirmed gaps via closes_gaps[]; assigns priority (start_here / recommended / optional) |
| `api/src/services/vendor-intelligence-builder.js` | Builds per-gap quadrant matrix, picks best vendor by context, adds partner disclosure |
| `api/src/config/gaps.js` | Gap definitions: id, severity, triggerCondition fn, claimTemplate fn. Severity weights: critical=20, high=10, medium=5, low=2 |
| `api/src/config/vendors.js` | Vendor catalog (partners and non-partners, category-keyed) with quadrant x/y positions |
| `api/src/config/frameworks.js` | Compliance framework mapping per customer type (SOC 2, ISO 27001, APRA CPS 234, etc.) |
| `api/src/services/pulse-emitter.js` | Fire-and-forget pulse emission to dashboard API on pipeline events; no-ops if `DASHBOARD_API_URL` unset |
| `frontend/src/App.jsx` | React Router: `/chat` (entry), partner portal, founder account, admin pre-read |
| `frontend/src/api/client.js` | All API calls funnel through this single wrapper |
| `frontend/src/data/portal-leads.js` | Static data: `TENANTS` (partner orgs + their vendor catalogs) and `PORTAL_LEADS` (sample leads); source of truth for portal demo |
| `frontend/src/pages/Portal.jsx` | Partner portal login — Google/Microsoft OAuth (implicit) + Auth0 PKCE; handles `/portal/callback` for both portal and founder intents |
| `frontend/src/pages/PortalDashboard.jsx` | Lead list filtered to tenant's vendor catalog; lead status managed in localStorage |
| `frontend/src/pages/PortalLeadDetail.jsx` | Single lead detail, gap breakdown, engage flow — writes to `portal_engagements` in localStorage |
| `frontend/src/pages/FounderAuth.jsx` | Founder login — Auth0 PKCE only; sets `auth0_intent=founder` in sessionStorage before redirect |
| `frontend/src/pages/FounderDashboard.jsx` | Founder account — saved reports from localStorage + partner activity cross-referenced against `portal_engagements` |

### Auth architecture (client-side only — no backend auth endpoints)

Two independent auth flows, both storing state in localStorage:

**Partner portal** (`portal_auth` key):
- Google OAuth (implicit flow) or Microsoft OAuth (implicit flow) → `/portal/callback` (hash fragment)
- Auth0 PKCE → `/portal/callback` (query param `?code=&state=auth0`)
- Tenant resolved by email domain against `TENANTS` in `portal-leads.js`; admin emails hardcoded in `Portal.jsx`
- On success: `portal_auth = { user, tenant }` → redirect to `/portal/dashboard`

**Founder account** (`founder_auth` key):
- Auth0 PKCE only; sets `sessionStorage.auth0_intent = 'founder'` before redirecting
- Callback handled by `Portal.jsx` (`/portal/callback`) — intent key differentiates the two flows
- On success: `founder_auth = { user }` → redirect to `/account`
- Any `sessionStorage.pending_founder_report` is merged into `founder_reports` on successful login

**Demo mode**: both flows expose bypass buttons that write mock auth state directly to localStorage.

### Trust score

`trust_score = 100 − Σ(severity weights of triggered gaps)`. Computed in `gap-mapper.js` from triggered gaps and deterministic severity weights.

### Reporting layers

- **Layer 1** — score, gaps, evidence. Always visible.
- **Layer 2** — vendor intelligence (quadrant matrix, picks per gap). Unlocked after email capture via `POST /api/session/capture-email`.

### Persistence note

Older cold-read sessions lived in-memory only. Current code also has Postgres
modules for proof360 data and memory paths. Do not make a storage claim without
checking the specific route/module being changed.

Lead capture writes to `api/leads.ndjson` (appended per email submission). Non-fatal: file write failures are swallowed.

### Async pipeline patterns

- **Fire-and-forget:** `session-start` handler kicks off extraction without awaiting — returns `session_id` immediately
- **Polling:** Frontend polls `infer-status` then `status` until complete
- **Parallel execution:** Firecrawl scrapes 5 pages via `Promise.allSettled`; CORPUS evidence lookup is bounded by timeout and degrades if unavailable
- **Stale timeout:** 90s per pipeline stage, checked on a 30s interval; 24h session TTL

## Deployment

**Secrets** stored in AWS SSM under `/proof360/*` (Firecrawl, Bedrock/AWS env,
Postgres, Turnstile, SES, auth, and provider-specific optional keys as needed).

**Deploy:**
```bash
# On EC2 (ethikslabs-platform, i-010dc648d4676168e)
cd /home/ec2-user/proof360 && bash scripts/deploy.sh
```

- Pulls SSM secrets → writes `api/.env`
- Installs deps, builds frontend → `frontend/dist/`
- PM2 restarts API with `--update-env`
- Nginx reloaded (serves `frontend/dist/` static, proxies `/api/` → `:3002`)

Nginx config: `scripts/nginx-proof360.conf`. Domain: `proof360.au`.

## Spec documents

The v3-era specs formerly listed here (architecture.md, brief-api.md, brief-frontend.md, .kiro v3 dirs) described the dead VECTOR/trust360 architecture and were archived to `docs/archive/fossils-2026-07-18/` (John audit ruling 2026-07-18). Live truth:

- `repo.json` — the work board (tasks, boundaries, rulings)
- `docs/plans/` — dated implementation plans (newest wins)
- `docs/specs/` + `docs/design/` — current specs and design docs
- `CONTROL/state.json` — per-SPV operating state (written by /makethebed only)
- Inference is Bedrock-direct (EC2 instance role) — never VECTOR, never localhost:3003
