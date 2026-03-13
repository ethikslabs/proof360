# proof360 — Frontend brief
**For:** Claude Code  
**Stack:** SvelteKit, plain JavaScript, no TypeScript, no component libraries  
**The one rule:** No logic in the frontend. Frontend renders. Backend decides.

---

## What you are building

Four routes. Three API calls. No state management library.

---

## Routes

### / (landing page)
Explain the product. Drive to /assess.
CTA: "Start your assessment" -> navigate to /assess
No API calls.

### /assess (Q&A flow)
Ask 10 questions one at a time.
On complete: POST /api/assess with all answers -> store sessionToken + summary in sessionStorage -> navigate to /gate

### /gate (email capture)
Show summary (gap count, trust score, previewGaps first 2 only — rest blurred).
On submit: POST /api/gate with sessionToken + contact fields -> navigate to /report on success

### /report (dashboard)
On load: GET /api/report/:sessionToken
Show: trustScore, readiness, estimatedCost, estimatedTimeline, all gap cards, all vendor cards, book-a-call CTA
If sessionToken missing or gate not passed: redirect to /assess

---

## The 10 questions (ask one at a time, show progress, allow back)

1. What is your primary goal right now?
   Close enterprise deals | Raise funding | Both | Not sure yet

2. What is your timeline?
   Under 3 months | 3-6 months | 6-12 months | No fixed deadline

3. Who do you sell to?
   Banks / financial services | Enterprise (500+ employees) | Mid-market | Government | SMB / startups | Pre-revenue

4. Have you received a security questionnaire from a prospect?
   Yes, and it stalled a deal | Yes, we handled it fine | Expecting one soon | Not applicable yet

5. Do you have any formal compliance certification?
   Yes (SOC 2, ISO 27001, or similar) | In progress | Planning to start | None

6. How is user access managed in your product?
   SSO + MFA enforced | MFA only | Password only | Mixed / not sure

7. Where is your product hosted?
   AWS | Azure | GCP | Multi-cloud | On-premise | Not sure

8. Do you have cyber insurance?
   Yes, active policy | In progress | No | Not sure

9. Do you store or process customer data?
   Personal data | Financial data | Health data | Multiple types | Internal use only

10. Has a deal or funding round ever been delayed by security concerns?
    Yes, a deal stalled | Yes, funding was affected | Both | Not yet, but worried | No

---

## API calls (src/lib/api.js — only file that touches the backend)

export async function submitAssessment(answers) {
  const res = await fetch('/api/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  });
  return res.json();
}

export async function submitGate({ sessionToken, firstName, lastName, email, company }) {
  const res = await fetch('/api/gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken, firstName, lastName, email, company })
  });
  return res.json();
}

export async function getReport(sessionToken) {
  const res = await fetch('/api/report/' + sessionToken);
  return res.json();
}

---

## Session state (sessionStorage only)

After /api/assess returns:
sessionStorage.setItem('proof360_session', sessionToken)
sessionStorage.setItem('proof360_summary', JSON.stringify(summary))

Read on /gate and /report:
const sessionToken = sessionStorage.getItem('proof360_session')
const summary = JSON.parse(sessionStorage.getItem('proof360_summary'))

---

## Components

QAFlow.svelte — one question at a time, progress bar, back/next
GapCard.svelte — severity badge, label, description, linked vendor IDs
VendorCard.svelte — name, description, closesGaps, costRange, timeline, priority badge, CTA button
EmailGate.svelte — summary stats + blurred preview + 4-field form (firstName, lastName, email, company)
TrustScore.svelte — score display, readiness label, colour-coded

---

## Design tokens

Primary: #26215C
Accent: #BA7517
Critical: #E24B4A / bg #FCEBEB
High: #EF9F27 / bg #FAEEDA
Medium: #7F77DD / bg #EEEDFE
Low: #4CAF79 / bg #EAF6EE
Font: system stack, no web fonts
Borders: 0.5px. Radius: 8px cards, 12px buttons. No gradients. No shadows. Flat.

---

## File structure

src/routes/+page.svelte
src/routes/assess/+page.svelte
src/routes/gate/+page.svelte
src/routes/report/+page.svelte
src/lib/api.js — ALL backend calls live here only
src/components/QAFlow.svelte
src/components/GapCard.svelte
src/components/VendorCard.svelte
src/components/EmailGate.svelte
src/components/TrustScore.svelte

---

## Do not

- No logic in the frontend (no gap mapping, no scoring, no vendor selection)
- No TypeScript
- No component library
- No localStorage — sessionStorage only
- No state management library

---

*Last updated: 2026-03-13 · ethikslabs/proof360*
