# Proof360 — Frontend Brief (Claude Code)

## Your job

Build the Proof360 frontend. This is a founder-facing trust readiness product. Read `brief-strategy.md` fully before writing any code — the product psychology matters as much as the technical spec.

The frontend contains zero business logic. It calls the API. It renders the result. All gap analysis, scoring, vendor matching, and evidence retrieval happens in the API layer.

---

## Tech stack

- React (Vite)
- TailwindCSS (utility classes only, no custom config needed for MVP)
- No auth library — email capture only, magic link via API
- No state management library — React useState/useContext is sufficient
- Fetch for API calls (no axios needed)
- Google Fonts: DM Serif Display + DM Sans

---

## Routes

/                   Homepage
/audit              Artefact input (URL or deck)
/audit/reading      Per-signal analysis animation
/audit/cold-read    Cold read screen + corrections + follow-ups
/processing         Analysis in progress
/report/:sessionId  Report (Layer 1 + gate + Layer 2)
/saved              Confirmation after email capture

---

## Page: Homepage `/`

### Purpose

Land a founder who is raising, selling to enterprise, or got sent a security questionnaire. They are confused and need clarity fast. Reduce threat perception immediately.

### Hero section

Headline (h1): Can you prove your startup is trusted?

Sub-line: Run a 90-second trust audit. See what's blocking enterprise deals — and how to fix it.

Primary CTA: Have a crack → (links to /audit). Use this phrase exactly — the casual confidence matters.

Secondary CTA (text link): See an example report (links to /report/demo)

### Outcome strip, report teaser, how it works, CTA repeat

Same as previous spec. See brief-strategy.md for product tone.

---

## Page: Assessment — the cold read flow

The assessment follows the cold read model. The system does the thinking first. The founder supervises and corrects second. This is not a questionnaire.

Full flow:
Artefact input (/audit)
  POST /api/v1/session/start
  /audit/reading (per-signal animation)
  /audit/cold-read (cold read screen)
  Founder corrects misreads
  2-4 targeted follow-up questions
  POST /api/v1/session/:id/submit
  /processing

---

### Step 1: Artefact input (/audit)

One input, zero friction.

Single field. No form. No explanation. Just:

  Paste your website URL or drop your pitch deck.
  [ website URL input ]
  [ Drop deck here or click to upload ] (PDF, max 10MB)
  → Have a crack

On submit: POST /api/v1/session/start with { website_url?, deck_file? }
Returns: { session_id }
Navigate to: /audit/reading?session=:sessionId

---

### Step 2: Reading screen (/audit/reading)

Show the system working. Not a spinner. Cycle through status lines one at a time, fade in:

  Reading your homepage...
  Scanning product description...
  Detecting infrastructure signals...
  Checking compliance indicators...
  Identifying customer signals...

Poll: GET /api/v1/session/:id/infer-status every 1.5 seconds.
When status === complete: navigate to /audit/cold-read?session=:sessionId
If status === failed after 60 seconds: show error with retry.

---

### Step 3: Cold read screen (/audit/cold-read)

Call on load: GET /api/v1/session/:id/inferences

Response shape:
  company_name: string
  source_summary: string (e.g. Read from: acmecorp.com · homepage, pricing, about · 3 signals)
  inferences: array of { inference_id, label, confidence (confident|likely|probable), category }
  correctable_fields: array of { key, label, inferred_value }
  followup_questions: array of { question_id, context, question, options[] }

Render in this exact sequence:

1. Eyebrow: company name + source URL
2. Headline: Here's what we found (DM Serif Display)
3. Sub-line: We read your website. Here's our read — correct anything we got wrong.
4. Inference list — animated:
   - Each row starts with a spinner (rotating border, border-top coloured, 0.7s linear)
   - Rows resolve staggered: row 0 at 800ms, row 1 at 1800ms, row 2 at 2900ms, +1000ms each
   - On resolve: spinner → green tick SVG, row bg shifts to secondary, confidence pill fades in
   - Pill colours: Confident = green (#EAF3DE / #2B5210), Likely = blue, Probable = amber
5. Source attribution (fades in after all rows resolve)
6. Corrections panel (500ms after source):
   - One row per entry in correctable_fields: show label + inferred_value + Correct button
   - Correct opens inline field — do not navigate away
   - On submit, pass corrections as { [key]: corrected_value } to POST /submit
7. Follow-up questions (after corrections):
   - Label: Two things we couldn't figure out (or One thing if only one)
   - Each: context line + question + option tiles (single-select, always include Not sure)
8. CTA: Generate my trust report → (full width, dark bg, after questions)

Section appearance: each section fades in + translates up 8px. No section appears before previous is fully visible.

On CTA: POST /api/v1/session/:id/submit with { corrections, followup_answers }
Response: { status: processing }
Navigate to: /processing?session=:sessionId

---

### Audit component structure

src/components/audit/
  ArtifactInput.jsx
  ReadingStatus.jsx
  ColdRead.jsx
  InferenceRow.jsx
  InferenceList.jsx
  ConfidencePill.jsx
  CorrectionPanel.jsx
  CorrectionRow.jsx
  FollowupQuestion.jsx
  FollowupList.jsx

API endpoints for audit flow:
  POST /api/v1/session/start
  GET /api/v1/session/:id/infer-status
  GET /api/v1/session/:id/inferences
  POST /api/v1/session/:id/submit

---

## Page: Processing (/processing)

Cycle through status messages (2s each, fade transition):
  Analysing your website security signals...
  Reviewing documentation indicators...
  Checking vendor risk posture...
  Cross-referencing enterprise trust frameworks...
  Mapping gaps to business outcomes...
  Preparing your trust report...

Poll: GET /api/v1/session/:id/status every 2 seconds.
When complete: navigate to /report/:sessionId
If failed after 60s: error state with retry.

---

## Page: Report (/report/:sessionId)

Call: GET /api/v1/session/:id/report

Response shape:
  session_id, company_name, assessed_at, trust_score (int), deal_readiness_label, deal_readiness_score,
  headline { ready_count, blocking_count, summary_line },
  snapshot { deal_blockers, fundraising_risk, strengths },
  gaps (array), strengths (array of {category, label}), next_steps (array), layer2_locked (boolean)

Gap object (layer2_locked = true): gap_id, severity (critical|moderate|low), title, confidence (high|medium|low), why, risk, control, score_impact (int), time_estimate
Gap object (layer2_locked = false — after email capture): adds evidence (array of {source, citation}) and vendor_intelligence (object — see below)

vendor_intelligence shape: category_name, quadrant_axes {x_left, x_right, y_top, y_bottom}, vendors (array of {vendor_id, display_name, initials, x, y, is_partner, is_pick, deal_label, best_for, summary, referral_url}), pick {vendor_id, stage_context, recommendation_headline, recommendation_body, meta {time_to_close, covers, best_for, what_wed_do_differently}, cta_label, deal_label, referral_url}, disclosure (string)

Vendor chips in the gap card: render from vendor_intelligence.vendors. Highlight is_pick. Show disclosure below chips.

Next step: step_number, title, score_trajectory, description

### Report structure (render in this order)

1. Header bar: Proof360 wordmark (left) / Trust readiness report (right, 11px uppercase muted)

2. Hero: two-column
   Left: company name, date, headline (Enterprise-ready in N areas. N gaps blocking deals now.), summary line, green pill (Enterprise deal readiness: N/100)
   Right: trust score ring SVG (animated on load, green stroke)

3. Snapshot three-up: Deal blockers (red) / Fundraising risk (amber) / Strengths (green). 1px dividers.

4. Gap cards (label: Trust gaps · click to understand)
   Sort: critical, moderate, low. First critical open by default.
   Collapsed: severity pill, title, confidence (right, muted), chevron
   Expanded (in order):
     why text
     Score preview: Fix this gap: N → N+impact (+N trust score) — green, subtle bg
     Two-col meta: Risk | Closes with
     Time estimate (green, 11px, bold)
     Evidence collapsible (collapsed, header: Evidence ›)
     Supported paths label + vendor chips

5. Locked layer 2 preview + email gate
   Preview (always visible): Full trust breakdown — save to unlock
   3 bars: Security posture / Vendor risk management / Policy documentation
   Values from layer2_preview if present, else 78% / 32% / 55%
   Below bars: Top blocker to closing enterprise deals: [top gap]
   Gate (if layer2_locked): Save your trust report / email input / Save report button
   On success: layer2_locked = false, fade reveal layer 2. Gate collapses to Report saved ✓.
   Do NOT navigate away.

6. Next steps: one row each: step number (serif, muted), title, score trajectory (green), description, chevron

---

## Demo mode

/report/demo: hardcoded data from src/data/demo-report.js. No API.
Company: Acme Corp, Score: 70, Gaps: 3 (2 critical, 1 moderate), Strengths: 3
Small Example report badge in header. Otherwise identical to real report.

---

## Component structure

src/
  components/
    report/
      ReportHeader.jsx, ReportHero.jsx, TrustScoreRing.jsx
      SnapshotThreeUp.jsx, GapCard.jsx, GapCardEvidence.jsx
      VendorChip.jsx, ScorePreviewRow.jsx
      LayerTwoPreview.jsx, EmailGate.jsx, NextSteps.jsx
    audit/
      ArtifactInput.jsx, ReadingStatus.jsx, ColdRead.jsx
      InferenceRow.jsx, InferenceList.jsx, ConfidencePill.jsx
      CorrectionPanel.jsx, CorrectionRow.jsx
      FollowupQuestion.jsx, FollowupList.jsx
    processing/
      ProcessingStatus.jsx
    homepage/
      Hero.jsx, OutcomeStrip.jsx, ReportTeaser.jsx, HowItWorks.jsx
  pages/
    Home.jsx, Audit.jsx, AuditReading.jsx, AuditColdRead.jsx
    Processing.jsx, Report.jsx
  data/
    demo-report.js
  api/
    client.js

---

## API base URL

VITE_API_BASE_URL env var. Default: http://localhost:3001
All calls through src/api/client.js. No inline fetch.

---

## Design tokens

Tailwind only. Custom CSS only for score ring SVG and font imports.
Fonts: DM Serif Display (display/serif), DM Sans (everything else)
Extend tailwind.config.js fontFamily accordingly.

Colours:
  Critical red text: #C2432A / bg: #FAECE7
  Amber text: #B87314 / bg: #FAEEDA
  Green text: #3A7A3A / bg: #EAF3DE

---

## Build order (do not skip ahead, verify each step)

1. src/api/client.js
2. src/data/demo-report.js
3. Report page + all report components (against demo data)
4. Verify /report/demo renders
5. Homepage
6. /audit (ArtifactInput)
7. /audit/reading (ReadingStatus, polling)
8. /audit/cold-read (ColdRead, InferenceList, CorrectionPanel, FollowupList)
9. /processing
10. Wire Report to live API
11. Full flow test: / → /audit → /audit/reading → /audit/cold-read → /processing → /report → gate → reveal

---

## Rules

- Zero business logic in the frontend. No gap analysis, scoring, or vendor matching.
- All API calls through src/api/client.js only.
- Report page must work in demo mode without any API connection.
- Email gate reveal feels like continuation, not signup.
- Never show raw errors. All errors get a clean human message.
- Signals assembled by API. Frontend just submits answers and corrections.
- Cold read: never resolve all inference rows simultaneously. Always staggered.
- Cold read: never navigate away when a user clicks Correct. Inline only.
