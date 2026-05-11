# Brief — Overnight v1 (Kiro)

**Status:** Committed post-convergence (Round 5, Claude.ai + ChatGPT + John locked).
**Scope:** GTM-lever slice. Not architecture. Not full v2 foundation. Not auth refactor.
**Principle:** ship GTM lever, not architecture.
**Executor:** Kiro (Builder). Overnight grind.
**Operator:** Claude.ai.
**Verifier:** Claude Code (runs tests, flags issues, does not fix).
**Authority:** John Coates.

**Supersedes for overnight:** overlapping items in `brief-track-a.md` §§ 6-8, `brief-frontend-v2.md` phases F1–F2. Those briefs remain valid for post-overnight work.

**Authoritative spec for Kiro:** formal EARS requirements document produced by Kiro from this brief — 20 requirements across 4 deliverables + 3 primitives + non-regression + graceful failure + additive-only constraints. Requirements doc is the single source of truth for implementation acceptance. This brief remains the strategic context.

---

## 1. Four deliverables

1. **Shareable cold read URL** — `?url=X` parameter on `/audit/cold-read` + share CTA
2. **`/admin/preread`** — batch URL input, run cold read per URL, output shareable links
3. **Landing page swap** — cold read front and centre, minimal marketing
4. **ProgramMatchCard** — Layer 2 founder report card showing AWS programs customer qualifies for

Plus three architectural primitives that unblock the above:

5. **Feature flag config** — `api/src/config/features.js`
6. **Report confidence surfacing** — whole-report ribbon + per-gap chip
7. **Signal weighting table skeleton** — `api/src/config/signal-weights.js`

**Nothing else ships tonight.** F1 foundation (shadcn/ui, tanstack-query, zustand, substrate components), auth refactor, RiskHeatmap, other persona surfaces — all deferred to post-validation briefs.

---

## 2. Backend

### 2.1 New handler — `GET /api/program-match/:session_id`

**Purpose:** read session's `signals_object` + context, evaluate against AWS program catalogue, return eligible programs.

**Route:** `api/src/routes/program-match.js` (new file)

**Request:**
```
GET /api/program-match/:session_id
Headers: none required (public — same access model as Layer 2 report)
```

**Response (200):**
```json
{
  "session_id": "sess_abc123",
  "evaluated_at": "2026-04-24T02:15:00Z",
  "context_snapshot": {
    "stage": "seed",
    "sector": "cyber",
    "geo_market": "AU",
    "is_cloud_hosted": true,
    "cloud_provider": "AWS",
    "has_raised_institutional": false,
    "abn_entity_type": null,
    "accelerator_alumni_of": [],
    "vc_portfolio_of": []
  },
  "eligible_programs": [
    {
      "program_id": "aws_activate_founders",
      "name": "AWS Activate Founders",
      "benefit": "$1,000 credits + Developer Support",
      "eligibility_reason": "Self-funded, pre-Series B",
      "application_url": "https://aws.amazon.com/activate/",
      "category": "startup_credits",
      "confidence": "high"
    },
    {
      "program_id": "aws_genai_spotlight_apac",
      "name": "AWS Generative AI Spotlight (APAC)",
      "benefit": "3-week program, mentorship, AWS expert access",
      "eligibility_reason": "AU-based early-stage with MVP",
      "application_url": "https://aws.amazon.com/startups/programs",
      "category": "accelerator",
      "confidence": "medium"
    },
    {
      "program_id": "crowdstrike_aws_nvidia_cyber_accelerator",
      "name": "CrowdStrike + AWS + NVIDIA Cybersecurity Startup Accelerator",
      "benefit": "8-week program, mentorship, funding, RSAC pitch day",
      "eligibility_reason": "Cybersecurity + AI-driven product",
      "application_url": "https://www.crowdstrike.com/falcon-fund/",
      "category": "accelerator",
      "confidence": "high"
    }
  ],
  "confidence": "medium"
}
```

**Response (404):** `{ "error": "session_not_found" }` if session doesn't exist.

**Response (202):** `{ "status": "assessment_incomplete", "message": "Assessment still running" }` if signals_object not yet populated.

**Implementation:**
- Read session from Postgres `sessions` table (once Track A ships persistence) OR from in-memory store (current state)
- Load `aws-funding-program-mapping.md` matrix as structured JSON at `api/src/config/aws-programs.js`
- Evaluate each program's trigger conditions against `signals_object`
- Return eligible programs, deduped, sorted by relevance (static order for now)

**Confidence rules:**
- `high` — all required signals present and match strongly
- `medium` — partial signal match, some inference required
- `low` — weak match, shown only when no higher-confidence matches exist

### 2.2 `api/src/config/aws-programs.js` (new file)

Structured catalogue derived from `docs/aws-funding-program-mapping.md`. Static JSON-like module. Each program:

```js
{
  program_id: "aws_activate_founders",
  name: "AWS Activate Founders",
  benefit: "$1,000 credits + Developer Support",
  application_url: "https://aws.amazon.com/activate/",
  category: "startup_credits",
  triggers: [
    {
      all: [
        { field: "stage", op: "in", value: ["pre_seed", "seed"] },
        { field: "has_raised_institutional", op: "eq", value: false }
      ]
    }
  ],
  confidence_when_matched: "high"
}
```

Seed the catalogue with the full Tier 1 + Tier 2 program list from `aws-funding-program-mapping.md`. Minimum 15 programs. Kiro writes the full seeding pass.

### 2.3 `api/src/config/features.js` (new file)

```js
export const FEATURES = {
  surfaces: {
    founder: true,
    buyer: false,
    investor: false,
    broker: false,
    aws_seller: false,
    distributor: false,
    admin: true
  },
  layer2_cards: {
    program_match: true,
    risk_heatmap: false,
    vendor_route: true,
    quote: false
  },
  cold_read: {
    shareable_url: true,
    preread_tool: true
  }
};
```

John edits to turn things on. No DB table, no persistence. Simple module import at bootstrap.

### 2.4 `api/src/config/signal-weights.js` (new file, skeleton only)

```js
// Signal weighting skeleton. Tier-based static weights.
// Refined later from close-rate data when Track A attribution lands.

export const SIGNAL_WEIGHTS = {
  // Critical signals — always surface, heavy weight
  critical: {
    weight: 1.0,
    signals: [
      "exposed_secrets_found",
      "scam_flag",
      "sanctions_match",
      "unpatched_critical_cves"
    ]
  },
  // High-impact signals
  high: {
    weight: 0.7,
    signals: [
      "no_mfa",
      "no_dmarc",
      "no_soc2",
      "abandoned_codebase",
      "disclosure_stress_signal",
      "filing_non_compliance"
    ]
  },
  // Medium signals
  medium: {
    weight: 0.4,
    signals: [
      "no_security_md",
      "no_dependabot",
      "crisis_comms_absent",
      "retail_shareholder_governance",
      "company_dormant_signal"
    ]
  },
  // Low / informational
  low: {
    weight: 0.2,
    signals: [
      "no_codeowners",
      "dormant_social",
      "headcount_inflation"
    ]
  },
  // Positive / bonus signals — increase trust score
  positive: {
    weight: 0.3,
    signals: [
      "rdti_registered",
      "ausindustry_grants",
      "vc_portfolio_of",
      "accelerator_alumni_of",
      "competition_wins",
      "founder_speaker_appearances_12mo"
    ]
  }
};
```

Kiro creates the file with the skeleton. Does **not** wire it into scoring yet — this is preparation for signal credibility work, not an activation. Leaves the existing score unchanged.

### 2.5 Cold read handler — add confidence surfacing

Existing `api/src/routes/audit.js` `POST /api/audit/cold-read` returns a structured cold read. Add:

```json
{
  "...existing fields...",
  "confidence": {
    "overall": "high" | "medium" | "low" | "partial",
    "sources_attempted": 10,
    "sources_succeeded": 8,
    "missing_sources": ["github", "hibp"]
  }
}
```

Rules:
- `high` — 90%+ sources succeeded, all required fields populated
- `medium` — 70–90% sources succeeded
- `low` — 50–70% sources succeeded
- `partial` — <50% sources succeeded, return with explicit fallback messaging

No change to existing source logic. Pure addition — count attempted vs succeeded in the existing `Promise.allSettled` result set.

### 2.6 `/admin/preread` API — `POST /api/admin/preread`

**Request:**
```json
{
  "urls": [
    "https://target1.com",
    "https://target2.com",
    "https://target3.com"
  ]
}
```

**Response:**
```json
{
  "batch_id": "batch_xyz789",
  "submitted": 3,
  "reads": [
    { "url": "https://target1.com", "session_id": "sess_aaa", "status": "queued" },
    { "url": "https://target2.com", "session_id": "sess_bbb", "status": "queued" },
    { "url": "https://target3.com", "session_id": "sess_ccc", "status": "queued" }
  ]
}
```

**Auth:** admin-only. Gate on Auth0 role claim or (fallback for overnight) env-based shared-secret header `x-admin-key` matching `PROOF360_ADMIN_KEY` in SSM.

**Implementation:**
- Iterate URLs, trigger cold read pipeline for each (existing flow reused)
- Return array with session IDs immediately; reads happen async
- No queue system needed — direct invocation, capped at 20 URLs per batch to prevent accidental flood

**Output access:** each `session_id` maps to a shareable URL `https://proof360.au/audit/cold-read?session=SESSION_ID&url=URL` that John can share to prep partner rooms.

### 2.7 Status endpoint — `GET /api/admin/preread/:batch_id`

Returns status of all reads in a batch. Used by `/admin/preread` UI to poll completion.

```json
{
  "batch_id": "batch_xyz789",
  "reads": [
    {
      "url": "...",
      "session_id": "...",
      "status": "complete" | "running" | "failed",
      "shareable_url": "https://proof360.au/audit/cold-read?session=...&url=...",
      "confidence": "high" | "medium" | "low" | "partial"
    }
  ]
}
```

---

## 3. Frontend

### 3.1 Landing page swap — `frontend/src/pages/Home.jsx`

**Remove:**
- Any existing marketing copy / "how it works" sections above the cold read CTA
- Any persona selection UI (not in scope — Landing α, single door)

**Keep / add:**
- Hero: single URL input, "See what we see about any company" (or similar copy John signs off)
- Sub-hero: one line naming the substrate ("public-source analysis, no login required")
- Cold read CTA — primary button, fills width on mobile
- Below fold: one persona-hint section — short prose referencing "also used by enterprise buyers, investors, insurance brokers, and AWS partners" without links or CTAs
- Footer: privacy + disclaimer line "Analysis based on public sources. Not legal or financial advice."

**Design tokens:** existing warm editorial tone preserved. No shadcn/ui install tonight. Use existing Tailwind classes and components.

**Copy direction (for John to approve):**
> Heading: "See what the world sees about any company"
> Subhead: "Live trust posture read from public sources. 60 seconds. No login."
> CTA: "Run cold read →"

### 3.2 Share URL parameter — `/audit/cold-read?url=X`

**Existing file:** `frontend/src/pages/AuditColdRead.jsx`

**Changes:**
- Read `url` query parameter on mount
- If present and valid URL, auto-submit cold read without showing input form
- Show input form only if no URL parameter or URL invalid
- After cold read completes, expose a "Share this read" CTA:
  - Copies `https://proof360.au/audit/cold-read?url=X` to clipboard
  - Also offers "Send via email" (opens `mailto:` with pre-filled body)
  - Also offers "Post to LinkedIn" (opens LinkedIn share URL)
- Add confidence ribbon at top of result if confidence is `medium`, `low`, or `partial`:
  - medium: "Strong read — some sources unavailable"
  - low: "Partial read — multiple sources unavailable"
  - partial: "Limited read — unable to confirm key signals. Treat as directional."

### 3.3 `/admin/preread` UI — `frontend/src/pages/AdminPreread.jsx` (new file)

**Access:** gated on admin role. For overnight, check env-based admin key passed via header — simple form with admin key input until Auth0 role refactor ships.

**UI:**
- Textarea for URL list (one per line or comma-separated)
- "Run batch" button
- Calls `POST /api/admin/preread`
- Shows batch status table: URL, status, shareable link (copy button), confidence chip
- Polls `GET /api/admin/preread/:batch_id` every 3s until all reads complete
- After completion, offer "Download all as markdown" — generates a `.md` file with URL, session, shareable link, and one-line confidence per read

**Route registration:** add to `frontend/src/App.jsx` routes — `<Route path="/admin/preread" element={<AdminPreread />} />`.

### 3.4 ProgramMatchCard — `frontend/src/components/ProgramMatchCard.jsx` (new file)

**Placement:** Layer 2 of the founder report, between existing `GapCard` stack and the `VendorRouteCard` stack.

**Props:**
```ts
{
  session_id: string;
  show_confidence?: boolean; // default true
}
```

**Behavior:**
- Calls `GET /api/program-match/:session_id` on mount
- Renders heading: "AWS funding programs you may qualify for"
- For each eligible program:
  - Program name + benefit (e.g. "AWS Activate Founders — $1,000 credits")
  - Eligibility reason (plain English, from API)
  - Confidence chip (high/medium/low) — only if `show_confidence` true
  - "Learn more" CTA linking to `application_url` (external)
- Empty state: if no programs match, render nothing (card self-hides — not a gap)
- Loading state: skeleton shimmer
- Error state: silent fail — card self-hides on API error (no user-facing error)

**Visual style:** existing design tokens, card shape matches `GapCard`, positive-signal colour (green/neutral — not the gap red/amber palette). Programs are good news, not gaps.

### 3.5 Confidence surfacing in report — `frontend/src/pages/Report.jsx`

**Add:**
- Whole-report confidence ribbon at top — reads from assessment response confidence field (wire through existing `sessions` API)
- Per-gap confidence chip on each `GapCard` — read from gap's source-count field

**Rules:**
- `high` confidence: no ribbon (default assumption is good read)
- `medium` / `low` / `partial`: ribbon shown with explicit copy
- Chip on individual gaps: only shown when gap's confidence ≠ overall confidence (to avoid noise)

### 3.6 Feature flag integration

**Frontend:** read flags from `GET /api/features` (new simple handler returning the `FEATURES` config) once per app mount. Cache in zustand store (OR — to avoid adding zustand tonight — React Context with initial fetch on App mount).

**Gates to add:**
- `Home.jsx` — persona hint section below fold only renders if any `surfaces.*` flag is true beyond `founder`
- `ProgramMatchCard` — only renders if `layer2_cards.program_match === true`
- `AuditColdRead.jsx` share CTA — only renders if `cold_read.shareable_url === true`
- `AdminPreread.jsx` route — only renders if `cold_read.preread_tool === true`

---

## 4. Non-negotiables

1. **No framework change.** React 19 + Vite 8 + Tailwind 3 stays.
2. **No new frontend dependencies tonight.** No shadcn/ui, no tanstack-query, no zustand.
3. **Existing founder UX preserved.** Zero regressions on `/audit`, `/audit/reading`, `/audit/cold-read`, `/processing`, `/report/:id`, `/account`.
4. **No auth refactor tonight.** Existing FounderAuth + Portal flows untouched. Admin key via env for `/admin/preread` overnight only; Auth0 role-claim refactor is a separate brief.
5. **No destructive DB changes.** Additive only. If Track A Postgres work hasn't shipped yet, all new endpoints read from existing in-memory store.
6. **All failures silent / graceful.** ProgramMatchCard hides on error. Confidence ribbon never breaks the page. Pre-read tool reports failed reads individually without aborting the batch.
7. **AWS-aligned.** All new endpoints CloudWatch-logged with existing structured logging. No new AWS service enabled tonight (account footprint expansion is a separate operator task for John).
8. **HX First.** No dark patterns. Share CTAs are optional. Confidence surfacing is honest not alarming.
9. **Show don't tell.** Landing page copy is minimal. Persona hint below fold is prose, not bulleted feature list.
10. **Track attribution.** Every cold read (including pre-reads) logs to existing session store with `source: "preread"` for batch reads and `source: "share_link"` when `?url=` param used.

---

## 5. Acceptance criteria

Claude Code verifies each. Kiro does not ship until all pass.

### Backend
- [ ] `GET /api/program-match/:session_id` returns structured response per schema
- [ ] `api/src/config/aws-programs.js` contains minimum 15 programs with valid triggers
- [ ] `api/src/config/features.js` imported at bootstrap
- [ ] `api/src/config/signal-weights.js` created with skeleton (not wired into scoring)
- [ ] Cold read handler returns `confidence` field with `overall`, `sources_attempted`, `sources_succeeded`, `missing_sources`
- [ ] `POST /api/admin/preread` accepts batch, returns session IDs
- [ ] `GET /api/admin/preread/:batch_id` polls status
- [ ] `GET /api/features` returns FEATURES config

### Frontend
- [ ] Landing page shows only cold read hero + CTA + below-fold prose
- [ ] `/audit/cold-read?url=X` auto-submits without form when valid URL passed
- [ ] Cold read result page shows share CTA + confidence ribbon (when applicable)
- [ ] `/admin/preread` renders, accepts URLs, shows batch status, offers markdown export
- [ ] `ProgramMatchCard` renders in Layer 2 report, hides cleanly when empty or errored
- [ ] Confidence ribbon shows on report when confidence != high
- [ ] Feature flags gate all new surfaces

### Regression
- [ ] Existing `/audit` flow works unchanged
- [ ] Existing `/report/:id` renders without errors
- [ ] Existing `/portal` flow works unchanged
- [ ] Existing `/account` flow works unchanged
- [ ] Mobile view preserved

### Deploy
- [ ] `scripts/deploy.sh` ships both API + frontend
- [ ] CloudFront invalidation runs
- [ ] Smoke test on `proof360.au` post-deploy: landing → cold read → result → share link → copy

---

## 6. Handoff notes

- Git: John runs commits after each phase. Kiro reports diffs inline for review.
- Env: add `PROOF360_ADMIN_KEY` to SSM before deploy (John does this).
- Testing: at minimum, manual smoke test matrix in `CLAUDE.md` extended with new endpoints.
- Claude Code verifies each acceptance criterion before flagging ready.
- Deploy: existing flow, no infra change.

---

## 7. Out of scope (explicitly deferred)

- shadcn/ui / tanstack-query / zustand installs
- Auth0 single-tenant refactor
- Multi-persona route scaffolding (`/buyer/*`, `/investor/*`, etc.)
- RiskHeatmap component
- Full substrate component extraction (`AssessmentEngine`, `ReportRenderer`, `GapCard` refactor, `SignalDisclosure`, `QuoteCard`)
- Signal weighting wired into trust score (skeleton only)
- Multi-tenant DB model
- Subscription billing
- Metronome integration
- Marketplace CPPO setup
- AWS account footprint expansion (GuardDuty, Security Hub, Inspector, etc.)
- WA Review self-run
- New signal sources (Phase 1 parallel grind handled by `brief-signal-pipeline.md`)

All defer to post-validation briefs written after this overnight ships and operator feedback lands.

---

## 8. What ships (plain English)

After tonight, John can:
1. Paste a URL into proof360.au landing → cold read runs, result shows confidence honestly, Layer 2 shows AWS programs the company qualifies for
2. Share a cold read link for any company via `?url=X` — recipient sees the same read without logging in
3. Paste 10-20 target URLs into `/admin/preread` before a partner meeting → walk in with every target already read → drop shareable links in the room

That's the commercial lever.

---

*Brief for Kiro. Overnight grind. Post-convergence scope. GTM lever, not architecture.*
