# proof360 — DOSSIER

**Identity:** Entity onramp — trust readiness diagnostic for founders
**Version:** v1.0
**Status:** `live` — running at proof360.au on EC2
**Authority:** John Coates
**Repo:** ethikslabs/proof360
**URL:** proof360.au

---

## Visual Identity

| Field | Value |
|-------|-------|
| Glyph | 🔍 |
| Color | `#4f46e5` |

---

## What This Repo Owns

proof360 cold-reads a company's trust posture from their public URL, asks targeted follow-up questions, and delivers a scored gap report with vendor recommendations. It is the front door to the 360 stack — the first thing a founder or enterprise prospect encounters.

**The boundary:**
- proof360 owns the assessment UX and gap scoring.
- trust360 confirms whether each triggered gap is real (called in parallel).
- VERITAS will eventually be the trust credential layer (not yet integrated — trust360 is the current path).

---

## Role in the 360 Stack

```
IMPERIUM (control plane)
└── proof360 (entity onramp — live)
    ├── calls trust360 (parallel, gap confirmation)
    ├── pulse-emitter.js (fire-and-forget — no-ops if DASHBOARD_API_URL unset)
    └── → VERITAS (future — trust credential query, not yet built)
```

---

## Architecture

### Request pipeline (async, session-keyed)

```
POST /api/session/start
  → signal-extractor.js  (Firecrawl scrape + Claude Haiku extraction)

GET  /api/session/infer-status   (poll until complete)
GET  /api/session/inferences     (cold read: inferences + corrections + follow-ups)

POST /api/session/submit         (founder corrections + follow-up answers)
  → gap-mapper.js               (triggers gaps, calls trust360 in parallel, writes signals_object)

GET  /api/session/status         (poll until analysis complete)
GET  /api/session/report         (full report: Layer 1 always, Layer 2 after email)

POST /api/session/capture-email  (gates Layer 2 — vendor intelligence)
GET  /api/session/early-signal   (estimated score pre-report)
```

### Trust score

`trust_score = 100 − Σ(severity weights of triggered gaps)`
Severity weights: `critical=20, high=10, medium=5, low=2`

### Reporting layers

- **Layer 1** — score, gaps, evidence. Always visible.
- **Layer 2** — vendor intelligence (quadrant matrix, picks per gap). Unlocked after email capture.

### No database

Sessions are in-memory only (24h TTL, 90s stale timeout per stage). `signals_object` written at analysis completion is the data moat — structured data about real companies accumulating per session. Leads appended to `api/leads.ndjson`.

---

## Stack

- **API:** Node.js + Express, port 3002
- **Frontend:** React + Vite
- **Auth:** Client-side only — Auth0 PKCE (founder) and Google/Microsoft OAuth implicit (partner portal). No backend auth endpoints.
- **External:** Firecrawl (scraping), Claude Haiku (signal extraction), Trust360 (gap confirmation)
- **Dashboard integration:** `pulse-emitter.js` fires fire-and-forget pulses to `DASHBOARD_API_URL` on pipeline events

---

## Deployment

- **EC2:** `i-010dc648d4676168e`, ap-southeast-2
- **PM2 + Nginx:** API on :3002, Nginx serves `frontend/dist/` static and proxies `/api/`
- **Secrets:** AWS SSM under `/proof360/*`
- **Deploy:** `cd /home/ec2-user/proof360 && bash scripts/deploy.sh`
- **Domain:** proof360.au (Cloudflare DNS)

---

## Key Files

| File | Purpose |
|------|---------|
| `api/src/services/signal-extractor.js` | Firecrawl → Claude → raw signals |
| `api/src/services/gap-mapper.js` | Gap triggers → trust360 → trust_score → signals_object |
| `api/src/services/trust-client.js` | POST /trust adapter for trust360 (20s timeout, fallback confirms all gaps) |
| `api/src/config/gaps.js` | Gap definitions with severity and trigger conditions |
| `api/src/config/vendors.js` | Vendor catalog with quadrant positions |
| `api/src/services/pulse-emitter.js` | Fire-and-forget dashboard pulse emission |
| `frontend/src/data/demo-report.js` | Hardcoded demo report — /report/demo works without API |

---

## Open Items

- No test suite — manual testing via endpoints and frontend
- VERITAS integration not built (trust360 is the current trust confirmation path)
- `signals_object` persistence — currently in-memory only; no cross-session analysis yet

---

## Related

- `trust360/` — trust evaluation engine (called by proof360 for gap confirmation)
- `VERITAS/` — future trust credential layer
- `WHY.md` — origin story and the Ethiks360 context — why any of this exists

---

## MCP Surface (planned)

```
mcp://proof360/
└── tools/
    ├── start_assessment      — POST /api/session/start; returns session_id
    ├── get_inferences        — GET /api/session/inferences for a session
    ├── submit_corrections    — POST /api/session/submit with founder corrections
    ├── get_report            — GET /api/session/report (Layer 1; Layer 2 after email)
    └── get_early_signal      — GET /api/session/early-signal; estimated score pre-report
```

---

## A2A Agent Card

```json
{
  "agent_id": "proof360",
  "display_name": "proof360 — Entity trust onramp and gap diagnostics",
  "owner": "john-coates",
  "version": "1.0.0",
  "port": 3002,
  "capabilities": [
    "trust_assessment",
    "gap_scoring",
    "vendor_recommendation",
    "pulse_emission"
  ],
  "authority_level": "product",
  "contact_protocol": "http",
  "human_principal": "john-coates"
}
```

---

## Commercial

| Field | Value |
|-------|-------|
| Status | active |
| Founder | john-coates |
| ABN / UEN | pending |
| Capital path | revenue |
| Revenue model | Reseller embed fees + vendor partner lead routing commission |
| IP boundary | Assessment UX, gap scoring engine, vendor matching algorithm, signals_object dataset moat |
| Stack dependency | VECTOR (inference), VERITAS (future attestation), ARGUS (monitoring), trust360 (gap confirmation) |
| First customer | external: proof360.au (live, public) |

### Traction
| Metric | Value | Source |
|--------|-------|--------|
| Uptime | live | ARGUS |
| Sessions run | live | manual (leads.ndjson) |
| Leads captured | live | manual (leads.ndjson) |
| Partner tenants | pending wiring | manual |

---

*Last updated: 2026-04-25*
*Authority: john-coates*
