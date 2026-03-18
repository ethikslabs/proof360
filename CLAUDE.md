# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**No test suite** — manual testing via API endpoints and frontend pages. Demo mode: visit `/report/demo` (uses `frontend/src/data/demo-report.js` without API).

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
| `api/src/config/gaps.js` | Gap definitions: id, severity, triggerCondition fn, claimTemplate fn |
| `api/src/config/vendors.js` | Vendor catalog (partners and non-partners, category-keyed) |
| `frontend/src/App.jsx` | React Router: 6 routes (/, /audit, /audit/reading, /audit/cold-read, /processing, /report/:sessionId) |
| `frontend/src/api/client.js` | All API calls funnel through this single wrapper |
| `frontend/src/data/demo-report.js` | Hardcoded demo report — used for /report/demo without API |

### Trust score

`trust_score = 100 − Σ(severity weights of triggered gaps)`. Computed in `gap-mapper.js` after Trust360 confirms each gap.

### Reporting layers

- **Layer 1** — score, gaps, evidence. Always visible.
- **Layer 2** — vendor intelligence (quadrant matrix, picks per gap). Unlocked after email capture via `POST /api/session/capture-email`.

### No database

Sessions live in-memory only. There is no persistence between restarts. The `signals_object` written at analysis completion is the dataset moat — it accumulates per-session structured data about real companies.

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
