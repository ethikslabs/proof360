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

Headline (h1):
```
Can you prove your startup is trusted?
```

Sub-line:
```
Run a 90-second trust audit. See what's blocking enterprise deals — and how to fix it.
```

Primary CTA button:
```
Run the trust audit →
```
Links to `/audit`

Secondary CTA (text link):
```
See an example report
```
Links to `/report/demo` — a static demo session (hardcoded, no API call needed for MVP)

### Outcome strip (3 columns, below hero)

No icons needed. Text only.

```
Column 1:
Label: 90-second audit
Body: Understand your security and compliance posture instantly.

Column 2:
Label: Trust score
Body: See exactly what enterprise buyers and investors will ask about.

Column 3:
Label: Fix the blockers
Body: Get the fastest path to enterprise-ready, with time estimates.
```

### Report preview teaser

Show a partial mockup of the report output. Static, visual only. Purpose is to establish the "credit score for trust" mental model.

Show:
- The headline format: "Enterprise-ready in 3 areas. 2 gaps blocking deals now."
- The trust score ring (static, score = 70)
- One sample gap card (collapsed, just the header)
- Caption: "Example report — your results will reflect your actual company."

### How it works (3 steps)

```
1. Upload your website or answer a few questions
2. We analyse your trust posture against enterprise standards
3. You get a clear path to enterprise-ready
```

### CTA repeat

```
Run the trust audit →
Takes about 90 seconds. No technical knowledge required.
```

---

## Page: Assessment `/audit`

### Purpose

Collect the signals needed for gap analysis. Must feel like a guided conversation, not a form. Founders must never feel they are being tested.

### Layout

Single question at a time. Full screen. Progress indicator at top (e.g. "3 of 10").

Each question has:
- A context line above the question (explains why we're asking)
- The question itself
- Answer options (radio buttons styled as large tiles)
- Always include "Not sure" as a valid option — never let a founder feel embarrassed

### Transition

After each answer, brief pause (300ms), then slide to next question. No page reload.

### The 10 questions

Render questions from API: `GET /api/v1/questions`

Each question object from the API will have:
```json
{
  "question_id": "string",
  "context": "string",
  "question": "string",
  "options": ["array of strings"],
  "include_not_sure": true
}
```

Render them exactly as returned. Do not hardcode questions in the frontend.

### Artefact input (Question 0 — before questions start)

Before question 1, show an optional upload step:

```
Before we ask you anything, let us look at what you've already built.

[ Enter your website URL ]

or

[ Upload your pitch deck ] (PDF, max 10MB)

Both optional — skip if you prefer to answer questions only.
```

On submit, call: `POST /api/v1/session/start` with `{ website_url, deck_file }`.
Returns: `{ session_id }`. Store in component state. Pass session_id through all subsequent calls.

### Early signal (after question 4)

After question 4 is answered, call: `GET /api/v1/session/:sessionId/early-signal`

Response: `{ estimated_score: integer, message: string }`

Show briefly (2 seconds) before question 5:

```
Early signal

Companies like yours typically score around [estimated_score].

Let's see how you compare.
```

This builds anticipation. It is not a commitment — the final score will differ.

### Final submission

After question 10, call: `POST /api/v1/session/:sessionId/submit`

Response: `{ status: "processing" }`

Navigate to `/processing?session=:sessionId`

---

## Page: Processing `/processing`

### Purpose

Build credibility while the API runs the analysis. This is not a spinner. It is a trust-building moment.

### Layout

Centred. Minimal. Show what the system is doing.

Cycle through these status messages (2 seconds each, fade transition):

```
Analysing your website security signals...
Reviewing documentation indicators...
Checking vendor risk posture...
Cross-referencing enterprise trust frameworks...
Mapping gaps to business outcomes...
Preparing your trust report...
```

Poll: `GET /api/v1/session/:sessionId/status` every 2 seconds.

When status === "complete", navigate to `/report/:sessionId`

If status === "failed" after 60 seconds, show error state with retry option.

---

## Page: Report `/report/:sessionId`

This is the most important page. Read the design spec carefully.

Call: `GET /api/v1/session/:sessionId/report`

### Response shape

```json
{
  "session_id": "string",
  "company_name": "string",
  "assessed_at": "ISO datetime",
  "trust_score": 70,
  "deal_readiness_label": "Medium",
  "deal_readiness_score": 70,
  "headline": {
    "ready_count": 3,
    "blocking_count": 2,
    "summary_line": "Two gaps will surface in enterprise procurement — and both are fixable in under a week."
  },
  "snapshot": {
    "deal_blockers": 2,
    "fundraising_risk": "Medium",
    "strengths": 3
  },
  "gaps": [
    {
      "gap_id": "string",
      "severity": "critical | moderate | low",
      "title": "string",
      "confidence": "high | medium | low",
      "why": "string",
      "risk": "string",
      "control": "string",
      "score_impact": 11,
      "time_estimate": "1–2 days with a template",
      "evidence": [
        { "source": "SOC 2 Trust Services CC2.1", "citation": "string" }
      ],
      "vendor_implementations": [
        { "vendor_name": "Vanta", "notes": "string" }
      ]
    }
  ],
  "strengths": ["array of strength strings"],
  "next_steps": [
    {
      "step_number": 1,
      "title": "string",
      "score_trajectory": "70 → 81",
      "description": "string"
    }
  ],
  "layer2_locked": true
}
```

### Report structure (render in this exact order)

#### 1. Header bar

Left: wordmark "Proof360" (DM Serif Display, italic on "360")
Right: "Trust readiness report" (11px uppercase, muted)

#### 2. Hero section

Two-column layout:
- Left: company name, assessed date, headline, summary line, enterprise deal readiness badge
- Right: trust score ring (SVG, animated on load)

Headline format (generate from `headline` object):
```
Enterprise-ready in [ready_count] areas.
[blocking_count] gaps blocking deals now.
```

Enterprise deal readiness badge (green pill):
```
● Enterprise deal readiness: [deal_readiness_score] / 100
```

Trust score ring: SVG circle, score number centred, "/100" below, green stroke.

#### 3. Snapshot three-up

Three equal columns, 1px dividers between.

Column 1: "Deal blockers" / value in red / "Fix before next procurement"
Column 2: "Fundraising risk" / value in amber / sub-label
Column 3: "Strengths" / value in green / "Already enterprise-grade"

Each column is clickable. On click, call `sendPrompt()` with a relevant follow-up question — or if not in the Claude widget context, open a mailto with pre-filled subject. For MVP in standalone web app, make them non-functional but visually interactive (hover state).

#### 4. Gap cards section

Label: "Trust gaps · click to understand" (10px uppercase, muted)

Render one card per gap from `gaps` array, sorted: critical first, then moderate, then low.

First critical gap opens by default. All others closed.

**Gap card — collapsed state:**
- Severity pill (red = critical, amber = moderate, green = low)
- Gap title
- Confidence label (right-aligned, muted)
- Chevron (rotates when open)

**Gap card — expanded state (below collapsed header, same card):**

Render in this order:
1. `why` text (13px, secondary colour, 1.6 line height)
2. Score preview row: "Fix this gap: [current_score] → [current_score + score_impact] (+[score_impact] trust score)" — green text, subtle background pill
3. Two-column meta grid: Risk | Closes with
4. Time estimate line (green, 11px, bold)
5. Evidence collapsible section (collapsed by default):
   - Header: "Evidence ›"
   - Body: one line per evidence item, showing source name bold + citation text
6. "Supported paths" label
7. Vendor chips: one per `vendor_implementations` entry

All vendor chips are clickable. For MVP, clicking a vendor chip logs the interaction and shows a tooltip: "Learn more about [vendor] — full details coming soon." Do not route to external URLs in MVP without a confirmed URL from the API.

#### 5. Locked layer 2 preview + email gate

This section always renders, regardless of whether layer 2 is locked.

**Preview panel (always visible):**
Label: "Full trust breakdown — save to unlock"

Show 3 horizontal progress bars:
- Security posture
- Vendor risk management
- Policy documentation

Values come from the report's `layer2_preview` object if present. If not, render bars at placeholder lengths (78%, 32%, 55%) — these are indicative, not precise.

Below bars: "Top blocker to closing enterprise deals: [top_gap_title]"

**Email gate (renders below preview if `layer2_locked === true`):**

```
Title: Save your trust report
Body: Get your full action plan, track improvements, and share your readiness with your team. No password needed.
Input: email address
Button: Save report
Note: Saving unlocks the full breakdown and score trajectory
```

On submit: `POST /api/v1/session/:sessionId/capture-email` with `{ email }`

On success: set `layer2_locked = false` in component state, smoothly reveal layer 2.

Do NOT navigate away. The reveal should feel like the report continuing to load, not like signing up for software.

**Reveal animation:** fade in the layer 2 content below the gate. The gate itself collapses to a small "Report saved ✓" confirmation line.

#### 6. Next steps

Label: "Recommended next steps"

Render one row per `next_steps` entry.

Each row:
- Step number (DM Serif Display, large, muted)
- Title (14px, medium weight)
- Score trajectory line (11px, green: e.g. "Fixes biggest deal blocker · score 70 → 81")
- Description (12px, secondary)
- Chevron right

Rows are clickable. For MVP, clicking logs the interaction. Full workflow routing comes in Phase 2.

---

## Demo mode

Route `/report/demo` loads a hardcoded demo session. No API call. The demo data is defined in `src/data/demo-report.js`.

Use the following values:
- Company: Acme Corp
- Score: 70
- Gaps: 3 (2 critical, 1 moderate) — see above for the full gap content
- Strengths: 3

The demo mode should be indistinguishable from a real report except for a small "Example report" badge in the header.

---

## Component structure

```
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
    client.js        ← all fetch calls go here, base URL from env
```

---

## API base URL

Read from environment variable: `VITE_API_BASE_URL`

Default for local dev: `http://localhost:3000`

All API calls go through `src/api/client.js`. No inline fetch calls in components.

---

## Environment variables

```
VITE_API_BASE_URL=http://localhost:3000
```

---

## Design tokens

Use Tailwind utility classes. Do not write custom CSS except for:
- The trust score ring SVG (inline styles only)
- Font imports (Google Fonts in index.html)

Font stack:
- Display/serif headings: `font-family: 'DM Serif Display', serif`
- All other text: `font-family: 'DM Sans', sans-serif`

Apply via Tailwind `font-serif` / `font-sans` after extending the config:

```js
// tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      serif: ['"DM Serif Display"', 'serif'],
      sans: ['"DM Sans"', 'sans-serif'],
    }
  }
}
```

Colour usage:
- Critical / red text: `#C2432A`
- Moderate / amber text: `#B87314`
- Positive / green text: `#3A7A3A`
- Critical pill background: `#FAECE7`
- Moderate pill background: `#FAEEDA`
- Positive pill background: `#EAF3DE`

---

## Build order

Build in this sequence. Do not skip ahead.

1. `src/api/client.js` — all API calls, base URL from env, error handling
2. `src/data/demo-report.js` — hardcoded demo data matching the report response shape exactly
3. `src/pages/Report.jsx` + all report components — build against demo data, no API needed
4. Verify: demo report renders correctly at `/report/demo`
5. `src/pages/Home.jsx` — homepage, static, no API
6. `src/pages/Audit.jsx` + audit components — wire to API for questions and session
7. `src/pages/Processing.jsx` — polling loop
8. Wire Report page to real API (swap demo data for live `GET /report/:sessionId`)
9. Test full flow: homepage → audit → processing → report → email gate → reveal

**Stop and verify each step before proceeding.**

---

## Rules

- Zero business logic in the frontend. If you find yourself writing gap analysis code, vendor matching logic, or scoring calculations — stop. That belongs in the API.
- All API calls through `src/api/client.js` only.
- The report page must work in demo mode without any API connection.
- The email gate reveal must feel like continuation, not signup.
- Never show raw error objects to the user. All errors get a clean, human message.
- The `signals` object is assembled by the API, not the frontend. The frontend just submits answers.
