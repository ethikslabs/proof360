# Task: Partner Portal Frontend UX

**For:** Claude Code
**Type:** Frontend build — no API work required
**Brief:** `docs/brief-partner-portal.md` — read this first for context and governing principles
**Status:** In progress — foundation exists, UX needs completing

---

## What already exists

Read these files before touching anything:

| File | What it is |
|------|-----------|
| `frontend/src/pages/Portal.jsx` | Auth landing — Auth0 PKCE + Google/MS buttons + demo bypass |
| `frontend/src/pages/PortalDashboard.jsx` | Lead feed dashboard — sidebar, stats bar, lead cards |
| `frontend/src/data/portal-leads.js` | Static demo data — TENANTS config, PORTAL_LEADS, helper fns |
| `docs/brief-partner-portal.md` | Architecture brief — governs what partners can and cannot see |

Auth0 is live and working. The portal is accessible at `/portal` and `/portal/dashboard`.

---

## What this task covers

**Frontend UX only.** The API backend (tenant resolution, real leads from sessions) is a separate task for later. The frontend must continue working against the static demo data in `portal-leads.js` until the API is ready.

Do not:
- Build any API endpoints
- Move tenant config to the server
- Integrate with real session data

Do:
- Build the UX surfaces described below against the existing static data
- Write clean, composable components
- Keep the dark intelligence aesthetic (`#07090f` background, `#00d9b8` accent, DM Serif Display / IBM Plex Mono / DM Sans)

---

## Surfaces to build

### 1. Lead detail page — `/portal/leads/:leadId`

When a partner clicks a lead card, navigate to a full detail view. Do not use a modal — use a dedicated route.

The detail page shows:

**Header**
- Company name (large, DM Serif Display)
- Trust score ring (large — 80px)
- Industry, location, time since submission
- Deal readiness label
- Back link → dashboard

**Relevant gaps section**
- Only gaps that involve this tenant's vendors (already filtered in `getMatchedVendors`)
- Each gap: severity pill, title, why it matters (use the gap title from `portal-leads.js`)
- No evidence or full gap detail — partners see the surface, not the diagnosis

**Your vendors section**
- Cards for each matched vendor: vendor name, which gap it closes
- Clean, no quadrant graph here — that's the founder's report

**Engage CTA**
- If status is `new` → prominent "Engage this lead" button (teal, full width)
- If already engaged → show current status + "Update status" dropdown
- Status flow: `new → engaged → quoted → won / lost`

**Contact reveal**
- Email is hidden by default (shown as `c***@company.com`)
- After status moves to `engaged`, show a "Reveal contact" button
- On click → reveal the full email hint from demo data (for real: this would call the API)

---

### 2. Engage confirmation flow

When a partner clicks "Engage this lead" on any lead card or detail page:

1. Show a brief inline confirmation (not a modal): *"You're engaging [Company]. This signals intent to Proof360. Contact will be available once engaged."*
2. Confirm button → sets status to `engaged`, updates localStorage, reveals contact hint
3. No redirect — stay on current page, card/status updates in place

---

### 3. Empty states

- **No leads in filter view** — don't show "No leads in this view" text. Show a proper empty state: relevant icon, message, and a nudge (e.g. "New leads appear here as founders complete audits. Check back soon.")
- **New tenant with no catalog matches** — if a vendor tenant has no matched leads, explain why: "No leads currently match your catalog. Leads appear when a founder's audit identifies a gap your products close."

---

### 4. Portal nav — active state + lead count badge

The sidebar nav already exists. Improve it:
- Active filter tab should have a left border accent (teal, 2px) not just background change
- "New" tab should show a pulsing dot indicator if `counts.new > 0`
- Counts should update when status changes (they already recalculate from state — just verify)

---

### 5. Auth page — loading state

After clicking "Sign in with Auth0", there is a redirect pause. Add a loading state:
- After click, disable the button and show a subtle spinner
- Change button text to "Redirecting..."
- Prevents double-click confusion

---

## Aesthetic constraints

Match the existing dark portal aesthetic exactly:

```
Background:   #07090f
Surface:      rgba(255,255,255,0.02–0.05)
Border:       rgba(255,255,255,0.06–0.1)
Text:         #f1f5f9 (primary), rgba(255,255,255,0.35) (muted)
Accent:       #00d9b8 (teal — live/new/CTA)
Fonts:        DM Serif Display (headings), IBM Plex Mono (numbers/data), DM Sans (UI)
Severity:     critical #ef4444, high #f97316, moderate #f59e0b, low #6b7280
```

No light backgrounds. No Tailwind prose classes. Inline styles consistent with existing pattern.

---

## Routing

Add to `App.jsx`:
```
/portal/leads/:leadId  → <PortalLeadDetail />
```

The detail page must check localStorage for auth — redirect to `/portal` if not authenticated (same pattern as `PortalDashboard`).

---

## Out of scope for this task

- API integration (no real session data yet)
- Moving tenant config server-side
- Partner analytics, messaging, deal tracking
- Any changes to the main proof360 audit flow (`/`, `/audit`, `/report`)

---

## Definition of done

- [ ] `/portal/leads/:leadId` route renders full lead detail with matched vendors
- [ ] Engage flow works end-to-end: confirm → status update → contact reveal
- [ ] Empty states exist for both filter views and no-catalog-match case
- [ ] Sidebar nav has teal left-border active state + pulsing dot on New tab
- [ ] Auth button shows loading state after click
- [ ] All status changes persist to localStorage and reflect immediately in UI
- [ ] No regressions on existing auth flow or dashboard

---

*Task created: 2026-03-19*
*Owner: Claude Code*
*Unblocked: yes — no API dependency*
