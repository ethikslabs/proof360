# Brief Overnight v1 — Patches (Post Stress-Test)

**Status:** Post-convergence patches from ChatGPT stress-test. Accepted by John, reconciled by Claude.ai.
**Base:** `brief-overnight-v1.md` + Kiro's EARS requirements document.
**Change shape:** no scope expansion. Guardrails + UX framing + one share-model decision.
**Authoritative for Kiro:** patches below override same-numbered requirements. Other requirements unchanged.

---

## Patch 1 — Pre-read concurrency cap

**Affects:** Requirement 4 (Admin Pre-Read — Batch Cold Read Tool)

**Add criterion:**
> WHEN the Preread_Endpoint processes a batch, THE Preread_Endpoint SHALL execute cold reads with a maximum parallelism of 4 concurrent reads, queuing the remainder until capacity frees.

**Implementation note:** simple `Promise.all` over chunks of 4. No queue system. No new dependency.

**Rationale:** 20 URLs parallel → Firecrawl + LLM cost spike + rate-limit risk.

---

## Patch 2 — Session store memory guard

**Affects:** Requirement 4 (Admin Pre-Read — Batch Cold Read Tool)

**Add criteria:**
> WHEN the total number of preread-sourced sessions in the Session_Store exceeds 100, THE Preread_Endpoint SHALL drop the oldest preread-sourced sessions to bring the count to 99 before adding new sessions.
>
> THE session-drop behaviour SHALL only affect sessions with source "preread". Sessions with source "user", "share_link", or other sources SHALL NOT be dropped by this guard.

**Rationale:** preread batches can flood the in-memory Map; memory growth + GC churn. Drop-oldest-preread preferred over reject-batch to keep admin UX frictionless.

---

## Patch 3 — Auto-submit loading state

**Affects:** Requirement 1 (Shareable Cold Read URL — Auto-Submit)

**Add criterion:**
> WHEN the AuditColdRead_Page auto-submits a cold read via the url query parameter, THE AuditColdRead_Page SHALL immediately display a loading state with text "Running cold read for <url>..." before the API response returns.

**Rationale:** user lands via shared link, sees blank page during API call. Loading state closes the feedback gap.

---

## Patch 4 — Share URL scheme (DECISION: Option B)

**Affects:** Requirement 1 (Shareable Cold Read URL — Auto-Submit), Requirement 2 (Share CTA)

**Replace current scheme (`?url=X` only) with:**
> THE Shareable_URL format SHALL be `/audit/cold-read?session=<session_id>&url=<encoded_url>`.
>
> WHEN the AuditColdRead_Page mounts with both a session parameter and a url parameter, THE AuditColdRead_Page SHALL first attempt to load the existing session by ID from the Session_Store.
>
> WHEN the session exists in the Session_Store, THE AuditColdRead_Page SHALL render the existing cold read result without running a new assessment.
>
> WHEN the session does not exist or has expired, THE AuditColdRead_Page SHALL fall back to running a fresh cold read using the url parameter.
>
> WHEN the AuditColdRead_Page mounts with only a url parameter (no session), THE AuditColdRead_Page SHALL run a fresh cold read per existing Requirement 1 behaviour.

**Share CTA update:** copy/email/LinkedIn actions SHALL include both session and url parameters in the generated share link. `/admin/preread` markdown export SHALL use the full session+url format.

**Rationale:** pre-read → share-in-meeting workflow requires read consistency. Site can change between pre-run and meeting; session-first locks the exact assessment. URL fallback preserves the simple-share case.

---

## Patch 5 — Layer 2 card ordering

**Affects:** Requirement 7 (ProgramMatchCard — AWS Program Eligibility in Report)

**Replace placement rule:**
> THE ProgramMatchCard SHALL be placed in Layer_2 of the Report_Page **after the VendorRouteCard stack** (not between gaps and vendors).

**Final Layer 2 order:**
1. GapCard stack (problems)
2. VendorRouteCard stack (solutions)
3. ProgramMatchCard (funding to enable the solutions)

**Rationale:** funding supports action, not diagnosis. Interrupting gaps → vendors with funding breaks the reading flow.

---

## Patch 6 — Confidence ribbon copy

**Affects:** Requirement 3 (Cold Read Confidence Ribbon on Result), Requirement 12 (Report Confidence Surfacing — Whole-Report Ribbon)

**Replace ribbon text:**

| Confidence | Old copy | New copy |
|---|---|---|
| medium | "Strong read — some sources unavailable" | "High-confidence read with some gaps" |
| low | "Partial read — multiple sources unavailable" | "Directional read — additional signals recommended" |
| partial | "Limited read — unable to confirm key signals. Treat as directional." | "Limited data — treat as early signal" |

**Rationale:** old copy reads as system weakness. New copy preserves honesty, frames as read quality rather than tool limitation.

---

## Patch 7 — Feature flag fallback (asymmetric defaults)

**Affects:** Requirement 11 (Feature Flag Frontend Integration), Requirement 17 (Graceful Failure)

**Replace fallback rule:**
> IF the Features_Endpoint is unreachable, THEN THE Feature_Flag_Context SHALL fall back to a safe default configuration where:
> - existing features (pre-overnight-v1) remain enabled as they require no flag gating
> - new features (`layer2_cards.program_match`, `cold_read.shareable_url`, `cold_read.preread_tool`, all non-founder surfaces) default to false
>
> THE fallback configuration SHALL preserve full existing application functionality while silently disabling new features.

**Rationale:** Kiro's original Req 11 "all flags false" is too aggressive — it disables share, preread, program match on any features endpoint hiccup, losing the GTM lever. Asymmetric defaults preserve existing UX while keeping new features safely gated.

---

## Patch 8 — Admin rate limit

**Affects:** Requirement 4 (Admin Pre-Read — Batch Cold Read Tool)

**Add criterion:**
> WHEN the Preread_Endpoint receives more than 2 batch submissions within a rolling 60-second window from the same admin key, THE Preread_Endpoint SHALL return HTTP 429 with `{ "error": "rate_limit", "retry_after_seconds": <N> }`.

**Implementation note:** simple in-memory timestamp tracker per admin key. No Redis, no rate-limit library.

**Rationale:** `x-admin-key` auth is fine for overnight, but accidental double-click or script typo can flood the pipeline. 2/min is generous for real use, tight enough to prevent spam.

---

## Patches summary

| # | Affects | Change type |
|---|---|---|
| 1 | Req 4 | new criterion (concurrency) |
| 2 | Req 4 | new criterion (session cap) |
| 3 | Req 1 | new criterion (loading state) |
| 4 | Req 1, Req 2 | schema change (share URL format) |
| 5 | Req 7 | placement change (card order) |
| 6 | Req 3, Req 12 | copy change (ribbon text) |
| 7 | Req 11, Req 17 | logic change (fallback asymmetry) |
| 8 | Req 4 | new criterion (rate limit) |

---

## Unchanged

All other requirements (5, 6, 8, 9, 10, 13, 14, 15, 16, 18, 19, 20) remain as originally specified. The stress-test did not identify issues with these.

---

## John actions before Kiro starts

Unchanged from pre-patch list:
1. Approve or edit landing copy (Req 6 — placeholder strings pending sign-off)
2. Set `PROOF360_ADMIN_KEY` in SSM Parameter Store before deploy
3. Confirm `POST /api/v1/session/start` path Kiro referenced is current (vs brief's stale `/api/audit/cold-read`)

---

*Patches locked. Kiro grinds tonight with these applied on top of the EARS requirements doc.*
