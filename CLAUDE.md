# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**No test suite** — manual testing via API endpoints and frontend pages. Demo mode: visit `/report/demo` (uses `frontend/src/data/demo-report.js` without API).

## Local environment

`api/.env` is not committed. Required vars:
```
ANTHROPIC_API_KEY=...      # Claude Haiku for signal extraction
FIRECRAWL_API_KEY=...      # Web scraping
TRUST360_URL=...           # Defaults to http://localhost:3000 if omitted
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

## Architecture

Proof360 is a trust readiness diagnostic for founders. A user submits a company URL, the system cold-reads their trust posture, asks follow-up questions, then delivers a scored gap report with vendor recommendations.

### Request pipeline (all async, session-keyed)

```
POST /api/session/start
  → signal-extractor.js  (Firecrawl scrape + Claude extraction)

GET  /api/session/infer-status   (poll until complete)
GET  /api/session/inferences     (cold read: inferences + corrections + follow-ups)

POST /api/session/submit         (founder corrections + follow-up answers)
  → gap-mapper.js               (triggers gaps, calls Trust360 in parallel, writes signals_object)

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
| `api/src/services/gap-mapper.js` | Gap trigger evaluation → Trust360 calls (parallel) → trust_score → signals_object |
| `api/src/services/context-normalizer.js` | Merges founder corrections + followup_answers → NormalizedContext for gap evaluation |
| `api/src/services/trust-client.js` | POST /trust adapter for Trust360 (parallel, 20s timeout); fallback confirms all triggered gaps if unavailable |
| `api/src/services/vendor-selector.js` | Matches vendors to confirmed gaps via closes_gaps[]; assigns priority (start_here / recommended / optional) |
| `api/src/services/vendor-intelligence-builder.js` | Builds per-gap quadrant matrix, picks best vendor by context, adds partner disclosure |
| `api/src/config/gaps.js` | Gap definitions: id, severity, triggerCondition fn, claimTemplate fn. Severity weights: critical=20, high=10, medium=5, low=2 |
| `api/src/config/vendors.js` | Vendor catalog (partners and non-partners, category-keyed) with quadrant x/y positions |
| `api/src/config/frameworks.js` | Compliance framework mapping per customer type (SOC 2, ISO 27001, APRA CPS 234, etc.) |
| `api/src/services/pulse-emitter.js` | Fire-and-forget pulse emission to dashboard API on pipeline events; no-ops if `DASHBOARD_API_URL` unset |
| `frontend/src/App.jsx` | React Router: 10 routes — audit flow, report, partner portal, founder account |
| `frontend/src/api/client.js` | All API calls funnel through this single wrapper |
| `frontend/src/data/demo-report.js` | Hardcoded demo report — used for /report/demo without API |
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

`trust_score = 100 − Σ(severity weights of triggered gaps)`. Computed in `gap-mapper.js` after Trust360 confirms each gap.

### Reporting layers

- **Layer 1** — score, gaps, evidence. Always visible.
- **Layer 2** — vendor intelligence (quadrant matrix, picks per gap). Unlocked after email capture via `POST /api/session/capture-email`.

### No database

Sessions live in-memory only. There is no persistence between restarts. The `signals_object` written at analysis completion is the dataset moat — it accumulates per-session structured data about real companies.

Lead capture writes to `api/leads.ndjson` (appended per email submission). Non-fatal: file write failures are swallowed.

### Async pipeline patterns

- **Fire-and-forget:** `session-start` handler kicks off extraction without awaiting — returns `session_id` immediately
- **Polling:** Frontend polls `infer-status` then `status` until complete
- **Parallel execution:** Firecrawl scrapes 5 pages via `Promise.allSettled`; Trust360 claims via `Promise.all`
- **Stale timeout:** 90s per pipeline stage, checked on a 30s interval; 24h session TTL

## Deployment

**Secrets** stored in AWS SSM under `/proof360/*` (FIRECRAWL_API_KEY, ANTHROPIC_API_KEY, PORT).

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

Architecture decisions and acceptance criteria live in `docs/` and `.kiro/specs/`. Read before changing pipeline behaviour:

- `docs/architecture.md` — cold read model, no auth, email gate rationale
- `docs/brief-api.md` — 9 endpoint contracts, signals object spec (non-negotiable)
- `docs/brief-frontend.md` — 6 routes, UX flow, Layer 1/2 gating
- `.kiro/specs/proof360-api-cold-read/` — 21 acceptance criteria
- `.kiro/specs/firecrawl-signal-extraction/` — scraping + extraction requirements
