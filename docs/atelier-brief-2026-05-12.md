# proof360 — Atelier Brief
**Date:** 2026-05-12  
**For:** Atelier  
**From:** John / EthiksLabs  
**Status:** ~2 weeks of drift — this document supersedes all prior briefs

---

## What proof360 is now

proof360 cold-reads any company and produces a trust posture report — gaps, evidence, vendor routes, AWS program eligibility. No login. No form. A URL in, a report out.

The product philosophy is: **guide not grade.** There is no score out of 100 on the surface. A score causes anxiety the way sleep trackers do — it reduces a complex picture to a number that triggers defensiveness rather than action. The report is a receipt: here is what we looked at, here is what we found, here is what you might do about it. "Not selling, sharing."

The trust signal is **multi-model exhaustiveness** — we ran everything, we showed you every source and every model and why we used it, and we still don't claim to know everything. That transparency is the product.

---

## Architecture — what actually runs

**The product is `proof360/cli.mjs`.** There is no frontend, no HTTP API, no database. The CLI is the contract.

```
node proof360/cli.mjs <url>          # fresh scan
node proof360/cli.mjs --rerender <session.json>   # re-render saved run
node proof360/cli.mjs --edit <session.json>        # re-run founder loop on saved run
```

Everything else (the graph companion, the report) is output from that one command.

**All AI inference routes through VECTOR** at `localhost:3003/v1` (OpenAI-compatible). VECTOR routes `claude-*` to Bedrock, everything else to NVIDIA NIM. proof360 uses:
- `amazon.nova-lite-v1:0` — signal extraction (cheap, fast, structured JSON, Bedrock-sovereign)
- `sonar` (Perplexity via VECTOR) — indexed web intelligence with live citations

No direct OpenAI, Anthropic, or NIM calls in proof360. Everything goes through VECTOR.

**CORPUS** is the knowledge substrate — an open credit report for enterprise trust, seeded with 8 domains of compliance knowledge. proof360 loads CORPUS at runtime and uses it for gap evidence and benchmark matching.

---

## The scan pipeline

### Phase 1 — Quick (~30s)

Simultaneous live recon. No inference here — direct observation only.

| Source | What it reads |
|--------|--------------|
| Firecrawl | 5 pages: homepage, /pricing, /about, /security, /trust |
| DNS | DMARC policy (p=none/quarantine/reject), SPF, MX provider |
| HTTP headers | HSTS, CSP, security header score |
| SSL / crt.sh | TLS grade (A/B/C/F), certificate transparency, subdomain count |
| HIBP | Domain breach history — breach count, dates, data types exposed |
| AbuseIPDB | IP reputation — abuse confidence score, report count |
| GitHub | Public repos, recent activity |
| Port scan | Common ports — staging exposure risk |
| IP/ASN | Cloud provider, geo, ASN |

### Phase 2 — Standard (~20s)

Signal extraction from the pages and web intelligence from Perplexity. This is where inference starts.

- **VECTOR (Nova Lite)** reads all scraped page content and extracts structured signals: stage, sector, geo market, ARR estimate, headcount, cloud provider, PII handling, compliance mentions.
- **Perplexity (Sonar via VECTOR)** provides indexed web intelligence: recent funding news, security incidents, third-party coverage. Returns citations.

The ledger records both calls with `why:` annotations — the reasons the model was chosen are stored and surface in the output.

### Phase 3 — Interactive (founder loop)

The system surfaces its inferences and asks the founder to confirm or correct them. Fields include: stage, sector, geo market, ARR, headcount, PII handling, cloud provider, institutional backing.

Each field is shown with the inferred value and confidence. The founder can:
- Confirm (accept inference)
- Override (correct the value)
- Mark "not sure"

"Not sure" answers appear in the output as **unverified items** — not as negative evidence. This distinction matters: unverified ≠ bad.

The confirmed context is saved to `proof360/runs/<domain>-<timestamp>.json` for rerender/edit.

### Phase 4 — Deep (~30s)

Evidence-backed gap analysis, vendor routing, AWS program eligibility.

| Node | What it does |
|------|-------------|
| CORPUS | Loads knowledge base — SOC 2, ISO 27001, APRA CPS 234 benchmarks, gap definitions, vendor graph |
| Gap Analysis | Evaluates ~20 gap triggers against confirmed context + live recon. Each gap is HIGH / PROBABLE / UNVERIFIED with severity: critical / high / medium / low |
| Vendor Matrix | Maps triggered gaps to vendor catalog (Dicker Data 461654, Ingram AU, Vanta/Drata, Cisco, Cloudflare, Cyberpro, AWS direct). Shows route rank, category, disclosure label |
| AWS Programs | Evaluates eligibility against program criteria (Activate, ISV Accelerate, MAP, Marketplace, etc.) using confirmed stage + cloud signals |
| SPV Context | Surfaces inferred SPV profile: stage, geography, ARR band, sector, PII flag — used for vendor routing and program matching |

---

## The output — three layers

The CLI report has three sections in sequence:

### Layer 1 — Surface (`What we found`)

Plain English. No score headline. Company read (summary, stage, sector, market), direct observations (DMARC grade, TLS grade, breach flag), gap list with severity bullets, unverified items with explanation.

### Layer 2 — Evidence (`Full evidence record`)

Full document transcript from Firecrawl, web intelligence detail (model, why, citation list), evidence quality dashboard (sources called vs skipped, VECTOR calls, founder input count), gap dossier (each gap with trigger condition, evidence basis, severity penalty), vendor matrix (gaps → vendors → route priority), cyber insurance implication, AWS programs.

### Layer 3 — Methodology (`How this was built`)

Every source that ran and why. Every model called with its `MODEL_REASONS` annotation. Token counts in/out. Founder input summary (confirmed vs not-sure). Score footnote (internal calibration signal — not the headline). Timestamp in AEST.

The purpose of Layer 3 is: a reader should be able to reconstruct how every claim was made. No black box. "We tried everything and still don't claim to know."

---

## The live companion (browser)

When a fresh scan runs, proof360 starts a local SSE server and opens the browser automatically. The companion runs at `http://localhost:4360/graph`.

**Two panels:**

**Left — provenance graph:** D3 force-directed graph. Nodes appear as each source executes. Node types:
- `entity` — the target domain (grid icon, slate)
- `api` — external data APIs: DNS, SSL, HIBP, AbuseIPDB, GitHub, Firecrawl (plug icon, cyan)
- `model` — AI inference: VECTOR, Perplexity, Gap Analysis, AWS Programs (star icon, indigo)
- `mcp` — CORPUS knowledge substrate (hexagon icon, amber)
- `document` — corpus docs (page icon, orange)
- `spv` — SPV Context node (institution/pillars icon, emerald)

Brand logos (Firecrawl, Perplexity, AWS) pulled live from Clearbit, clipped to circle, shown inside the node ring.

Edges are directional — they show data flow (Firecrawl → VECTOR, VECTOR → Gap Analysis, etc.).

**Right — report panel:** Sections fill in real-time as each phase completes. Section cards are inactive (faded, dashed border) until the corresponding event fires, then they flip active (solid teal left-border, full opacity, content populates).

Sections: Company Snapshot, Email Security, TLS / Certificate, Data Breach History, Web Intelligence, Signal Extraction, Evidence Sources, Trust Gaps, AWS Programs, SPV Context.

The user can hit **Stop here** at the end of quick or standard phase — the scan aborts cleanly and `buildComplete(stoppedAt)` records where it stopped.

**Export SVG receipt:** Downloads a self-contained SVG — background rasterised, logos embedded as base64, provenance JSON in `<desc>`. The exported file is the proof artifact.

---

## Design language

The companion uses the same aesthetic direction as the report:

- **Background:** warm cream (`#f2ede4`) — not dark, not hacker, not terminal
- **Typography:** Spectral (serif) for headers and section titles / IBM Plex Mono for data
- **Accent:** muted teal (`#2d7f6e`) — the proof360 brand colour
- **Wordmark:** `proof/360` — "proof" in Spectral bold, "/360" in Spectral italic teal
- **Cards:** white on cream, left teal border when active
- **Graph:** white node circles with coloured rings on off-white panel

The design metaphor is a **receipt** — something issued after the fact, showing what happened. Not a dashboard, not a score card. A record.

---

## Session persistence

Every fresh scan saves to `proof360/runs/<domain>-<timestamp>.json`. Saved fields:

- Raw pages (Firecrawl transcripts)
- Full recon pipeline output
- VECTOR extraction result
- Web intelligence (Perplexity) result
- Confirmed context (founder answers)
- Field states (HIGH / PROBABLE / UNVERIFIED per field)
- Founder answers array
- Source status map

`--rerender` re-runs the deep phase (CORPUS, gaps, vendors, AWS) against saved data without re-running live recon or the founder loop.  
`--edit` re-runs the founder loop on saved data then re-runs deep.

---

## Commercial routing

proof360 is not just a report — it's a reseller catalog entry point.

Triggered gaps → vendor matches. Each vendor in the catalog has:
- `closes_gaps[]` — which gaps it addresses
- `category` — security / compliance / insurance / cloud
- `route` — partner / direct / distributor
- `quadrant_x/y` — for scatter plot positioning (stage-relevant, not Gartner)

Distribution channels:
- **Dicker Data** (account 461654) — hardware, networking, endpoint
- **Ingram AU** — Cisco, broader catalog
- **Vanta / Drata** — direct API integration
- **Cyberpro** — direct
- **AWS Programs** — evaluated separately against program criteria

The commercial output shows vendors ranked by route priority (start_here / recommended / optional) with disclosure labels for partner relationships.

---

## What hasn't changed

- Authorized defensive due diligence only (stated in CLI header on every run)
- No score on the surface — score is in the methodology layer for internal calibration
- CORPUS is the moat — private seeded knowledge + overnight refresh loop
- VECTOR is the inference gateway — no direct model calls anywhere in proof360

---

## What is next

1. **cli.mjs → companion wiring** — SPV Context node not yet emitting from cli.mjs (only in test harness). Needs `buildNodeStart/Complete('spv')` + `buildReportSection('spv_context')` in the deep phase alongside the confirmed context.
2. **Atelier surface** — the companion design and receipt aesthetic needs to be carried into whatever Atelier renders.
3. **Live scan verification** — run `node proof360/cli.mjs <live-url>` end-to-end to confirm companion + CLI output are consistent.

---

*Built by John Coates / EthiksLabs — 2026-05-12*
