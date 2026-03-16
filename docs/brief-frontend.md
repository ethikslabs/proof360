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

```
/                   Homepage
/audit              Assessment flow (questions)
/processing         Analysis in progress
/report/:sessionId  Report (Layer 1 + gate + Layer 2)
/saved              Confirmation after email capture
```

---

## Page: Homepage `/`

### Purpose

Land a founder who is raising, selling to enterprise, or got sent a security questionnaire. They are confused and need clarity fast. Reduce threat perception immediately.

### Hero section

Headline (h1): Can you prove your startup is trusted?

Sub-line: Run a 90-second trust audit. See what's blocking enterprise deals — and how to fix it.

Primary CTA: Run the trust audit → (links to /audit)

Secondary CTA (text link): See an example report (links to /report/demo — hardcoded, no API)

### Outcome strip (3 columns, below hero)

Column 1: Label: 90-second audit / Body: Understand your security and compliance posture instantly.
Column 2: Label: Trust score / Body: See exactly what enterprise buyers and investors will ask about.
Column 3: Label: Fix the blockers / Body: Get the fastest path to enterprise-ready, with time estimates.

### Report preview teaser

Show a partial mockup of the report output. Static, visual only. Establishes the credit-score-for-trust mental model.

Show: headline format (Enterprise-ready in 3 areas. 2 gaps blocking deals now.), the trust score ring (static, score=70), one sample gap card (collapsed header only), caption: Example report — your results will reflect your actual company.

### How it works (3 steps)

1. Upload your website or answer a few questions
2. We analyse your trust posture against enterprise standards
3. You get a clear path to enterprise-ready

### CTA repeat

Run the trust audit →
Takes about 90 seconds. No technical knowledge required.

---

## Page: Assessment `/audit`

### Purpose

Collect the signals needed for gap analysis. Must feel like a guided conversation, not a form. Founders must never feel they are being tested.

### Layout

Single question at a time. Full screen. Progress indicator at top (e.g. 3 of 10).

Each question has: a context line above (explains why we're asking), the question itself, answer options as large tiles, always include Not sure as a valid option.

### Transition

After each answer, 300ms pause then slide to next question. No page reload.

### The 10 questions

Render from API: GET /api/v1/questions

Question object shape: { question_id, context, question, options (array), include_not_sure: true }

Render exactly as returned. Do not hardcode questions in the frontend.

### Artefact input (Question 0, before questions start)

Optional upload step before question 1:

Before we ask you anything, let us look at what you've already built.
[ Enter your website URL ]
or
[ Upload your pitch deck ] (PDF, max 10MB)
Both optional — skip if you prefer to answer questions only.

On submit: POST /api/v1/session/start with { website_url, deck_file }. Returns { session_id }. Store in component state. Pass session_id through all subsequent calls.

### Early signal (after question 4)

After question 4, call: GET /api/v1/session/:sessionId/early-signal
Response: { estimated_score: integer, message: string }

Show briefly (2 seconds) before question 5:
Early signal
Companies like yours typically score around [estimated_score].
Let's see how you compare.

This builds anticipation. Not a commitment — final score will differ.

### Final submission

After question 10: POST /api/v1/session/:sessionId/submit
Response: { status: "processing" }
Navigate to /processing?session=:sessionId

---

## Page: Processing `/processing`

### Purpose

Build credibility while the API runs analysis. Not a spinner. A trust-building moment.

### Layout

Centred. Minimal. Cycle through status messages (2 seconds each, fade transition):

Analysing your website security signals...
Reviewing documentation indicators...
Checking vendor risk posture...
Cross-referencing enterprise trust frameworks...
Mapping gaps to business outcomes...
Preparing your trust report...

Poll: GET /api/v1/session/:sessionId/status every 2 seconds.
When status === complete: navigate to /report/:sessionId
If status === failed after 60 seconds: show error state with retry option.

---

## Page: Report `/report/:sessionId`

This is the most important page. Read carefully.

Call: GET /api/v1/session/:sessionId/report

### Response shape

session_id, company_name, assessed_at (ISO datetime), trust_score (integer), deal_readiness_label, deal_readiness_score, headline { ready_count, blocking_count, summary_line }, snapshot { deal_blockers, fundraising_risk, strengths }, gaps (array), strengths (array), next_steps (array), layer2_locked (boolean)

Gap object: gap_id, severity (critical|moderate|low), title, confidence (high|medium|low), why, risk, control, score_impact (integer), time_estimate, evidence (array of { source, citation }), vendor_implementations (array of { vendor_name, notes })

Next step object: step_number, title, score_trajectory (e.g. 70 → 81), description

### Report structure (render in this exact order)

#### 1. Header bar
Left: wordmark Proof360 (DM Serif Display, italic on 360)
Right: Trust readiness report (11px uppercase, muted)

#### 2. Hero section
Two-column layout:
- Left: company name, assessed date, headline, summary line, enterprise deal readiness badge
- Right: trust score ring (SVG, animated on load)

Headline: Enterprise-ready in [ready_count] areas. [blocking_count] gaps blocking deals now.

Enterprise deal readiness badge (green pill): ● Enterprise deal readiness: [deal_readiness_score] / 100

Trust score ring: SVG circle, score centred, /100 below, green stroke, animated dashoffset on mount.

#### 3. Snapshot three-up
Three equal columns, 1px dividers.
Column 1: Deal blockers / value red / Fix before next procurement
Column 2: Fundraising risk / value amber / sub-label
Column 3: Strengths / value green / Already enterprise-grade

#### 4. Gap cards section
Label: Trust gaps · click to understand (10px uppercase, muted)

Render one card per gap, sorted critical first then moderate then low.
First critical gap open by default. All others closed.

Collapsed state: severity pill, gap title, confidence label (right, muted), chevron (rotates when open)

Expanded state (render in this order):
1. why text (13px, secondary, 1.6 line-height)
2. Score preview row: Fix this gap: [score] → [score + score_impact] (+[score_impact] trust score) — green text, subtle bg pill
3. Two-column meta grid: Risk | Closes with
4. Time estimate (green, 11px, bold)
5. Evidence collapsible (collapsed by default): header Evidence ›, body one line per item showing source bold + citation
6. Supported paths label
7. Vendor chips: one per vendor_implementations entry

Vendor chips: clickable, clicking logs interaction and shows tooltip Learn more about [vendor] — full details coming soon. Do not route to external URLs in MVP.

#### 5. Locked layer 2 preview + email gate

Always render this section.

Preview panel (always visible):
Label: Full trust breakdown — save to unlock
3 horizontal progress bars: Security posture / Vendor risk management / Policy documentation
Values from report layer2_preview if present, otherwise placeholder lengths 78% / 32% / 55%
Below bars: Top blocker to closing enterprise deals: [top gap title]

Email gate (renders if layer2_locked === true):
Title: Save your trust report
Body: Get your full action plan, track improvements, and share your readiness with your team. No password needed.
Input: email
Button: Save report
Note: Saving unlocks the full breakdown and score trajectory

On submit: POST /api/v1/session/:sessionId/capture-email with { email }
On success: set layer2_locked = false in state, fade in layer 2 content.
Do NOT navigate away. Reveal feels like report continuing to load, not software signup.
Gate collapses to Report saved ✓ confirmation line.

#### 6. Next steps
Label: Recommended next steps
One row per next_steps entry:
- Step number (DM Serif Display, large, muted)
- Title (14px, medium weight)
- Score trajectory line (11px, green)
- Description (12px, secondary)
- Chevron right
Rows clickable. MVP: logs interaction. Full routing in Phase 2.

---

## Demo mode

Route /report/demo loads hardcoded demo session. No API call. Data in src/data/demo-report.js.

Values: Company: Acme Corp, Score: 70, Gaps: 3 (2 critical, 1 moderate), Strengths: 3

Indistinguishable from real report except small Example report badge in header.

---

## Component structure

src/
  components/
    report/
      ReportHeader.jsx
      ReportHero.jsx
      TrustScoreRing.jsx
      SnapshotThreeUp.jsx
      GapCard.jsx
      GapCardEvidence.jsx
      VendorChip.jsx
      ScorePreviewRow.jsx
      LayerTwoPreview.jsx
      EmailGate.jsx
      NextSteps.jsx
    audit/
      QuestionStep.jsx
      ArtifactInput.jsx
      EarlySignal.jsx
      ProgressBar.jsx
    processing/
      ProcessingStatus.jsx
    homepage/
      Hero.jsx
      OutcomeStrip.jsx
      ReportTeaser.jsx
      HowItWorks.jsx
  pages/
    Home.jsx
    Audit.jsx
    Processing.jsx
    Report.jsx
  data/
    demo-report.js
  api/
    client.js  (all fetch calls, base URL from env)

---

## API base URL

Read from env: VITE_API_BASE_URL
Default local dev: http://localhost:3000
All API calls through src/api/client.js only. No inline fetch in components.

---

## Environment variables

VITE_API_BASE_URL=http://localhost:3000

---

## Design tokens

Tailwind utility classes only. Custom CSS only for: trust score ring SVG (inline styles), font imports (Google Fonts in index.html).

Fonts:
- Display/serif headings: DM Serif Display
- All other text: DM Sans

Extend tailwind.config.js:
fontFamily: { serif: ['DM Serif Display', 'serif'], sans: ['DM Sans', 'sans-serif'] }

Colours:
- Critical red text: #C2432A
- Moderate amber text: #B87314
- Positive green text: #3A7A3A
- Critical pill bg: #FAECE7
- Moderate pill bg: #FAEEDA
- Positive pill bg: #EAF3DE

---

## Build order

Build in this sequence. Do not skip ahead. Stop and verify each step before proceeding.

1. src/api/client.js — all API calls, base URL from env, error handling
2. src/data/demo-report.js — hardcoded demo data matching report response shape exactly
3. src/pages/Report.jsx + all report components — build against demo data, no API needed
4. Verify: demo report renders at /report/demo
5. src/pages/Home.jsx — homepage, static, no API
6. src/pages/Audit.jsx + audit components — wire to API
7. src/pages/Processing.jsx — polling loop
8. Wire Report page to real API (swap demo for live GET /report/:sessionId)
9. Test full flow: homepage → audit → processing → report → email gate → reveal

---

## Rules

- Zero business logic in the frontend. No gap analysis, scoring, or vendor matching. That belongs in the API.
- All API calls through src/api/client.js only.
- Report page must work in demo mode without any API connection.
- Email gate reveal must feel like continuation, not signup.
- Never show raw error objects to the user. All errors get a clean human message.
- The signals object is assembled by the API, not the frontend. The frontend just submits answers.
