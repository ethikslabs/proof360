# Requirements Document

## Introduction

Proof360 is a founder-facing trust readiness diagnostic frontend application. It guides startup founders through a 90-second trust audit, displays a layered report with trust score, gap analysis, and recommended next steps, and captures email to unlock the full breakdown. The frontend contains zero business logic — it calls the Proof360 API, renders the result, and provides a warm editorial experience (not a dashboard). Built with React (Vite), TailwindCSS, and vanilla Fetch. The mental model is a "credit score for trust."

## Glossary

- **Frontend**: The Proof360 React single-page application built with Vite and TailwindCSS
- **API_Client**: The centralised fetch wrapper module at `src/api/client.js` that handles all HTTP requests to the Proof360 API
- **Homepage**: The landing page at route `/` that introduces the product and links to the audit flow
- **Assessment_Page**: The full-screen guided question flow at route `/audit` that collects founder signals
- **Processing_Page**: The analysis-in-progress page at route `/processing` that polls for completion
- **Report_Page**: The layered trust report at route `/report/:sessionId` that renders gap analysis and next steps
- **Saved_Page**: The confirmation page at route `/saved` shown after email capture
- **Demo_Mode**: A special report view at `/report/demo` that renders hardcoded data without any API call
- **Trust_Score_Ring**: An animated SVG circle component that displays the trust score out of 100
- **Gap_Card**: An expandable card component that displays a single trust gap with severity, explanation, evidence, and vendor paths
- **Email_Gate**: The email capture form that unlocks Layer 2 of the report without navigation
- **Layer_1**: The ungated portion of the report visible to all users (score, headline, snapshot, gaps, next steps)
- **Layer_2**: The gated portion of the report (full trust breakdown) revealed after email capture
- **Early_Signal**: A brief interstitial shown after question 4 displaying an estimated score
- **Artifact_Input**: The optional pre-question step where founders can provide a website URL or pitch deck
- **Session_ID**: A unique identifier returned by the API when a session starts, used to track the assessment through all subsequent API calls
- **Vendor_Chip**: A clickable UI element displaying a vendor name from a gap's supported paths

## Requirements

### Requirement 1: Project Setup and Routing

**User Story:** As a developer, I want the application scaffolded with correct routing and design tokens, so that all pages are reachable and visually consistent.

#### Acceptance Criteria

1. THE Frontend SHALL use React with Vite as the build tool and TailwindCSS for styling
2. THE Frontend SHALL define routes for `/`, `/audit`, `/processing`, `/report/:sessionId`, and `/saved` using React Router
3. THE Frontend SHALL load Google Fonts "DM Serif Display" and "DM Sans" in the HTML entry point
4. THE Frontend SHALL extend the Tailwind configuration to map `font-serif` to "DM Serif Display" and `font-sans` to "DM Sans"
5. THE Frontend SHALL read the API base URL from the `VITE_API_BASE_URL` environment variable, defaulting to `http://localhost:3000` when not set

### Requirement 2: API Client Module

**User Story:** As a developer, I want all API calls centralised in a single module, so that fetch logic is consistent and maintainable.

#### Acceptance Criteria

1. THE API_Client SHALL export functions for each API endpoint: session start, questions fetch, answer submission, early signal fetch, session submit, status polling, report fetch, and email capture
2. THE API_Client SHALL prepend the base URL from `VITE_API_BASE_URL` to all request paths
3. IF an API call returns a non-2xx HTTP status, THEN THE API_Client SHALL throw an error containing a human-readable message rather than exposing raw error objects
4. THE API_Client SHALL set `Content-Type: application/json` on all POST requests and parse all responses as JSON
5. THE Frontend SHALL make zero inline fetch calls in any component or page — all HTTP requests SHALL route through the API_Client

### Requirement 3: Homepage

**User Story:** As a founder, I want a clear landing page that explains what Proof360 does and invites me to start the audit, so that I understand the value before committing.

#### Acceptance Criteria

1. THE Homepage SHALL display a hero section with the headline "Can you prove your startup is trusted?", a sub-line describing the 90-second audit, and a primary CTA button labelled "Run the trust audit →" that navigates to `/audit`
2. THE Homepage SHALL display a secondary text link labelled "See an example report" that navigates to `/report/demo`
3. THE Homepage SHALL display an outcome strip with three text-only columns: "90-second audit", "Trust score", and "Fix the blockers", each with a descriptive body line
4. THE Homepage SHALL display a report preview teaser section showing a static trust score ring with score 70, a sample headline format, one collapsed gap card header, and a caption stating it is an example
5. THE Homepage SHALL display a "How it works" section with three numbered steps describing the assessment flow
6. THE Homepage SHALL display a repeated CTA at the bottom with the "Run the trust audit →" button and a reassurance line about duration and no technical knowledge required

### Requirement 4: Assessment Flow — Artifact Input

**User Story:** As a founder, I want to optionally provide my website URL or pitch deck before answering questions, so that the analysis can incorporate existing signals.

#### Acceptance Criteria

1. WHEN the Assessment_Page loads, THE Assessment_Page SHALL display the Artifact_Input step before any questions, with a website URL text field and a pitch deck file upload accepting PDF up to 10MB
2. THE Artifact_Input SHALL label both inputs as optional and provide a skip action to proceed directly to question 1
3. WHEN the founder submits a website URL or pitch deck, THE Assessment_Page SHALL call `POST /api/v1/session/start` with the provided data and store the returned Session_ID in component state
4. WHEN the founder skips the Artifact_Input without providing data, THE Assessment_Page SHALL call `POST /api/v1/session/start` with empty fields and store the returned Session_ID in component state
5. IF the session start API call fails, THEN THE Assessment_Page SHALL display a human-readable error message and allow the founder to retry

### Requirement 5: Assessment Flow — Question Rendering

**User Story:** As a founder, I want to answer questions one at a time in a guided conversational format, so that the experience feels approachable rather than like a form.

#### Acceptance Criteria

1. THE Assessment_Page SHALL fetch questions from `GET /api/v1/questions` and render them one at a time in a full-screen layout
2. THE Assessment_Page SHALL display a progress indicator showing the current question number out of the total (e.g. "3 of 10")
3. WHEN rendering a question, THE Assessment_Page SHALL display the context line above the question text, the question itself, and answer options as large tile-styled radio buttons
4. WHEN a question object has `include_not_sure` set to true, THE Assessment_Page SHALL include a "Not sure" option among the answer choices
5. WHEN the founder selects an answer, THE Assessment_Page SHALL pause for 300 milliseconds and then transition to the next question with a slide animation without a page reload
6. IF the questions fetch API call fails, THEN THE Assessment_Page SHALL display a human-readable error message and allow the founder to retry

### Requirement 6: Assessment Flow — Early Signal

**User Story:** As a founder, I want to see an early indication of my score after question 4, so that I feel engaged and motivated to complete the assessment.

#### Acceptance Criteria

1. WHEN the founder answers question 4, THE Assessment_Page SHALL call `GET /api/v1/session/:sessionId/early-signal`
2. WHEN the early signal response is received, THE Assessment_Page SHALL display an interstitial showing "Early signal", the estimated score, and the message from the API for 2 seconds before transitioning to question 5
3. IF the early signal API call fails, THEN THE Assessment_Page SHALL skip the interstitial and proceed directly to question 5 without displaying an error

### Requirement 7: Assessment Flow — Submission and Navigation

**User Story:** As a founder, I want my completed assessment submitted and to be taken to the processing page, so that I can see my results being prepared.

#### Acceptance Criteria

1. WHEN the founder answers the final question, THE Assessment_Page SHALL call `POST /api/v1/session/:sessionId/submit` with the collected answers
2. WHEN the submit call returns `{ status: "processing" }`, THE Assessment_Page SHALL navigate to `/processing?session=:sessionId`
3. IF the submit API call fails, THEN THE Assessment_Page SHALL display a human-readable error message and allow the founder to retry submission

### Requirement 8: Processing Page

**User Story:** As a founder, I want to see what the system is doing while my report is being generated, so that I trust the analysis is thorough.

#### Acceptance Criteria

1. THE Processing_Page SHALL display a centred, minimal layout that cycles through six status messages with a 2-second interval and fade transitions: "Analysing your website security signals...", "Reviewing documentation indicators...", "Checking vendor risk posture...", "Cross-referencing enterprise trust frameworks...", "Mapping gaps to business outcomes...", "Preparing your trust report..."
2. THE Processing_Page SHALL poll `GET /api/v1/session/:sessionId/status` every 2 seconds using the session ID from the URL query parameter
3. WHEN the status response returns "complete", THE Processing_Page SHALL navigate to `/report/:sessionId`
4. IF the status response has not returned "complete" after 60 seconds, THEN THE Processing_Page SHALL display an error state with a human-readable message and a retry button
5. IF a polling request fails, THEN THE Processing_Page SHALL continue polling without displaying an error, up to the 60-second timeout

### Requirement 9: Report Page — Data Loading and Demo Mode

**User Story:** As a founder, I want to view my trust report, and as a prospect, I want to see a demo report, so that I understand the value of the product.

#### Acceptance Criteria

1. WHEN the Report_Page loads with a session ID other than "demo", THE Report_Page SHALL call `GET /api/v1/session/:sessionId/report` and render the response
2. WHEN the Report_Page loads at `/report/demo`, THE Report_Page SHALL render hardcoded demo data from `src/data/demo-report.js` without making any API call
3. THE Demo_Mode data SHALL use company name "Acme Corp", trust score 70, 3 gaps (2 critical, 1 moderate), and 3 strengths, matching the full report response shape
4. WHEN in Demo_Mode, THE Report_Page SHALL display a small "Example report" badge in the header bar
5. IF the report API call fails, THEN THE Report_Page SHALL display a human-readable error message with an option to retry

### Requirement 10: Report Page — Header and Hero Section

**User Story:** As a founder, I want to see my company name, trust score, and headline summary at the top of the report, so that I immediately understand my trust posture.

#### Acceptance Criteria

1. THE Report_Page SHALL display a header bar with the "Proof360" wordmark in DM Serif Display (with "360" in italic) on the left and "Trust readiness report" in 11px uppercase muted text on the right
2. THE Report_Page SHALL display a two-column hero section with company name, assessed date, headline, summary line, and enterprise deal readiness badge on the left, and the Trust_Score_Ring on the right
3. THE Trust_Score_Ring SHALL render as an SVG circle with the score number centred, "/100" below, a green stroke, and an animation on initial load
4. THE Report_Page SHALL generate the headline from the report data in the format "Enterprise-ready in [ready_count] areas. [blocking_count] gaps blocking deals now."
5. THE Report_Page SHALL display the enterprise deal readiness badge as a green pill showing "● Enterprise deal readiness: [deal_readiness_score] / 100"

### Requirement 11: Report Page — Snapshot Three-Up

**User Story:** As a founder, I want to see a quick snapshot of deal blockers, fundraising risk, and strengths, so that I can grasp the key metrics at a glance.

#### Acceptance Criteria

1. THE Report_Page SHALL display a snapshot section with three equal columns separated by 1px dividers
2. THE Report_Page SHALL render column 1 as "Deal blockers" with the value in red and sub-label "Fix before next procurement"
3. THE Report_Page SHALL render column 2 as "Fundraising risk" with the value in amber and a contextual sub-label
4. THE Report_Page SHALL render column 3 as "Strengths" with the value in green and sub-label "Already enterprise-grade"
5. THE Report_Page SHALL apply a hover state to each snapshot column to indicate interactivity, though click actions are deferred to Phase 2

### Requirement 12: Report Page — Gap Cards

**User Story:** As a founder, I want to explore each trust gap in detail, so that I understand what is blocking my deals and how to fix each gap.

#### Acceptance Criteria

1. THE Report_Page SHALL display a gap cards section with the label "Trust gaps · click to understand" in 10px uppercase muted text
2. THE Report_Page SHALL render one Gap_Card per entry in the gaps array, sorted by severity: critical first, then moderate, then low
3. WHEN the report loads, THE Report_Page SHALL expand the first critical gap card by default and collapse all others
4. WHEN a Gap_Card is collapsed, THE Gap_Card SHALL display the severity pill (red for critical, amber for moderate, green for low), gap title, confidence label right-aligned and muted, and a chevron icon
5. WHEN a Gap_Card is expanded, THE Gap_Card SHALL display in order: the "why" explanation text, a score preview row showing "Fix this gap: [current_score] → [current_score + score_impact] (+[score_impact] trust score)" in green, a two-column meta grid with Risk and Closes-with fields, the time estimate in green bold 11px text, a collapsible evidence section (collapsed by default), a "Supported paths" label, and Vendor_Chips for each vendor implementation
6. WHEN the chevron on a Gap_Card is clicked, THE Gap_Card SHALL toggle between collapsed and expanded states with the chevron rotating to indicate state

### Requirement 13: Report Page — Gap Card Evidence and Vendor Chips

**User Story:** As a founder, I want to see the evidence backing each gap and the vendor options to fix it, so that I trust the analysis and can take action.

#### Acceptance Criteria

1. WHEN the evidence section header "Evidence ›" is clicked within an expanded Gap_Card, THE Gap_Card SHALL expand the evidence section showing one line per evidence item with the source name in bold and the citation text
2. THE Vendor_Chip SHALL display the vendor name as a clickable chip element
3. WHEN a Vendor_Chip is clicked, THE Vendor_Chip SHALL display a tooltip reading "Learn more about [vendor_name] — full details coming soon" and log the interaction to the console
4. THE Vendor_Chip SHALL NOT navigate to any external URL in the MVP

### Requirement 14: Report Page — Layer 2 Preview and Email Gate

**User Story:** As a founder, I want to see a preview of the full trust breakdown and unlock it by providing my email, so that I get the complete picture without creating an account.

#### Acceptance Criteria

1. THE Report_Page SHALL display a Layer 2 preview panel labelled "Full trust breakdown — save to unlock" with three horizontal progress bars for Security posture, Vendor risk management, and Policy documentation
2. WHEN the report data includes a `layer2_preview` object, THE Report_Page SHALL use its values for the progress bars; WHEN the object is absent, THE Report_Page SHALL render placeholder bar lengths of 78%, 32%, and 55%
3. THE Report_Page SHALL display "Top blocker to closing enterprise deals: [top_gap_title]" below the progress bars, where top_gap_title is the title of the first critical gap
4. WHILE `layer2_locked` is true, THE Email_Gate SHALL display below the preview with the title "Save your trust report", explanatory body text, an email input field, a "Save report" button, and a note that saving unlocks the full breakdown
5. WHEN the founder submits an email address, THE Email_Gate SHALL call `POST /api/v1/session/:sessionId/capture-email` with the email
6. WHEN the email capture call succeeds, THE Report_Page SHALL set `layer2_locked` to false in component state, collapse the Email_Gate to a "Report saved ✓" confirmation line, and fade in the Layer 2 content below without navigating away from the page
7. IF the email capture API call fails, THEN THE Email_Gate SHALL display a human-readable error message and allow the founder to retry
8. THE Email_Gate reveal animation SHALL feel like the report continuing to load, not like a signup confirmation

### Requirement 15: Report Page — Next Steps

**User Story:** As a founder, I want to see recommended next steps with score trajectory, so that I have a clear path forward.

#### Acceptance Criteria

1. THE Report_Page SHALL display a "Recommended next steps" section below the gap cards and Layer 2 content
2. THE Report_Page SHALL render one row per entry in the `next_steps` array, each showing: the step number in DM Serif Display large muted text, the title in 14px medium weight, the score trajectory line in 11px green text (e.g. "Fixes biggest deal blocker · score 70 → 81"), the description in 12px secondary text, and a right-pointing chevron
3. WHEN a next step row is clicked, THE Report_Page SHALL log the interaction to the console (full workflow routing is deferred to Phase 2)
4. THE next step rows SHALL display a hover state to indicate interactivity

### Requirement 16: Saved Page

**User Story:** As a founder who provided my email, I want a confirmation that my report is saved, so that I know I can return to it.

#### Acceptance Criteria

1. WHEN the Saved_Page loads at `/saved`, THE Saved_Page SHALL display a confirmation message indicating the report has been saved and the founder can return via the link sent to their email
2. THE Saved_Page SHALL provide a link back to the homepage

### Requirement 17: Design Token Compliance

**User Story:** As a designer, I want the application to use consistent colours and typography, so that the product feels like a warm editorial experience.

#### Acceptance Criteria

1. THE Frontend SHALL use `#C2432A` for critical/red text, `#B87314` for moderate/amber text, and `#3A7A3A` for positive/green text
2. THE Frontend SHALL use `#FAECE7` for critical pill backgrounds, `#FAEEDA` for moderate pill backgrounds, and `#EAF3DE` for positive pill backgrounds
3. THE Frontend SHALL apply DM Serif Display for display headings and the Proof360 wordmark, and DM Sans for all other text
4. THE Frontend SHALL use Tailwind utility classes for all styling except the Trust_Score_Ring SVG (inline styles) and font imports (in index.html)
5. THE Frontend SHALL NOT include any custom CSS files beyond what is required for Tailwind base setup

### Requirement 18: Error Handling and User Messaging

**User Story:** As a founder, I want to see clear, friendly error messages when something goes wrong, so that I am not confused by technical failures.

#### Acceptance Criteria

1. IF any API call fails, THEN THE Frontend SHALL display a human-readable error message appropriate to the context rather than exposing raw error objects, status codes, or stack traces
2. THE Frontend SHALL provide a retry action on all error states where the failed operation can be repeated
3. THE Frontend SHALL NOT render blank screens or broken layouts when API data is unavailable — a loading state or error state SHALL always be shown

### Requirement 19: Demo Report Data Module

**User Story:** As a developer, I want a hardcoded demo report data file that matches the full API response shape, so that the report page can be built and tested without an API connection.

#### Acceptance Criteria

1. THE Demo_Mode data module at `src/data/demo-report.js` SHALL export an object matching the exact shape of the `GET /api/v1/session/:sessionId/report` response
2. THE Demo_Mode data SHALL include company name "Acme Corp", trust score 70, deal readiness label "Medium", deal readiness score 70, 3 gaps (2 critical and 1 moderate) with complete gap objects including why, risk, control, score_impact, time_estimate, evidence array, and vendor_implementations array, 3 strengths, and at least 2 next steps with score trajectories
3. THE Demo_Mode data SHALL set `layer2_locked` to true so the email gate is testable in demo mode

### Requirement 20: Component Architecture

**User Story:** As a developer, I want a clear component structure that separates concerns by page and feature, so that the codebase is maintainable and each component is independently testable.

#### Acceptance Criteria

1. THE Frontend SHALL organise components into `src/components/report/`, `src/components/audit/`, `src/components/processing/`, and `src/components/homepage/` directories matching the page structure
2. THE Frontend SHALL organise page-level components into `src/pages/` with one file per route: Home.jsx, Audit.jsx, Processing.jsx, and Report.jsx
3. THE Frontend SHALL place the API client module at `src/api/client.js` and the demo data at `src/data/demo-report.js`
4. THE Frontend SHALL NOT contain any business logic such as gap analysis, scoring calculations, or vendor matching — all such logic SHALL reside in the API layer
