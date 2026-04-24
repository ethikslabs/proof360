# Brief — Frontend v2 (Stakeholder Surfaces)

**Status:** Committed. Follows the v2 rethink (Option B locked).
**Scope:** Frontend architecture + routing + entitlement + design system to carry six stakeholder surfaces on one substrate.
**Executor:** Kiro (Builder).
**Operator:** Claude.ai.
**Authority:** John Coates.
**Not in scope:** backend rework (covered by `brief-track-a.md` + `brief-signal-pipeline.md`). Pentad-native rewrite (Track C, deferred).

---

## The frame (what changes)

Current frontend = one persona (founder), one report format, 10 routes.

v2 frontend = six personas, six report surfaces on one substrate, unified auth + entitlement, design system that works across audiences.

**One substrate, six lenses** — same signals_object, same gap analysis, same vendor + program matching, rendered with persona-appropriate templates, language, CTAs, and commercial paths.

---

## Architectural decisions (locked)

1. **Stay on React 19 + Vite 8 + Tailwind 3** — no framework change
2. **Add `shadcn/ui`** — component library for speed across six surfaces. Approved in Anthropic component set, Tailwind-native.
3. **Add `@tanstack/react-query`** — cached fetching + mutations + retries at v2 scale (N tenants, persistent sessions now in Postgres)
4. **Add `zustand`** — light per-persona state stores, avoids context-provider sprawl
5. **Unify auth into single Auth0 tenant** — custom claims carry role (founder / buyer / investor / broker / aws_seller / distributor / admin). Existing founder + portal flows collapse into one
6. **React Router 7 nested routes per persona** — already on 7.x
7. **Keep direct `fetch` client wrapper** — wrap inside react-query; no axios/other
8. **Design language splits by persona** — shared design-token base, persona-specific density + navigation

---

## Route architecture

```
/                        → landing, persona selector OR auto-detect
/login                   → unified Auth0 entry
/callback                → Auth0 callback (reads role claim, routes)
/logout                  → clear + redirect

/founder/*               → founder surface (existing, refine)
  /founder/audit            → URL intake (existing)
  /founder/processing       → pipeline run
  /founder/report/:id       → founder trust readiness report
  /founder/dashboard        → saved reports (existing)

/buyer/*                 → enterprise buyer surface (new)
  /buyer/vendors            → monitored vendor list
  /buyer/vendors/new        → add a vendor to monitor
  /buyer/vendors/:id        → vendor trust profile
  /buyer/reports/:id        → vendor trust profile report
  /buyer/alerts             → changes + red-flag stream

/investor/*              → investor DD surface (new)
  /investor/portfolio       → tracked companies
  /investor/portfolio/new   → add a company to DD
  /investor/reports/:id     → investment diligence read
  /investor/export/:id      → export to data room format

/broker/*                → insurance broker surface (new)
  /broker/queue             → underwriting queue
  /broker/quote/new         → new quote intake
  /broker/quote/:id         → underwriting pack
  /broker/integrations      → Austbrokers API hookup

/aws/*                   → AWS seller surface (new)
  /aws/customers            → customer list (APN attribution)
  /aws/customers/:id        → customer program qualification
  /aws/programs             → program catalog view
  /aws/ace                  → ACE pipeline mirror

/distributor/*           → distributor surface (expand partner portal)
  /distributor/applicants   → reseller applicants
  /distributor/applicants/:id → reseller scorecard
  /distributor/catalog      → vendor catalog fit
  /distributor/leads        → per-vendor lead stream (existing partner portal content)

/account/*               → multi-role account management
  /account/profile          → user profile
  /account/billing          → subscriptions + usage
  /account/team             → seats + roles (tenant admin)
  /account/api              → API keys + integrations

/admin/*                 → John's operator dashboard (founder revenue console from Track A lives here)
  /admin/revenue            → pipeline + closes + margin (from Track A)
  /admin/tenants            → all tenants across all personas
  /admin/assessments        → all assessments (audit trail)
  /admin/partners           → partner register editor
  /admin/signals            → signal pipeline health
```

---

## Entitlement model

Single Auth0 tenant with `app_metadata.roles: string[]`. Roles can stack (e.g. admin can switch personas; a broker can also be a buyer).

| Role | Routes accessible | Data scope |
|---|---|---|
| `founder` | `/founder/*`, `/account/*` | own assessments |
| `buyer` | `/buyer/*`, `/account/*` | own monitored vendors |
| `investor` | `/investor/*`, `/account/*` | own portfolio |
| `broker` | `/broker/*`, `/account/*` | own quote queue |
| `aws_seller` | `/aws/*`, `/account/*` | own customer list |
| `distributor` | `/distributor/*`, `/account/*` | own applicants + leads |
| `admin` | all | all (John + operators) |

**Persona switcher** in header when multiple roles present. Default persona = most recently used.

---

## Shared substrate (components that render across all personas)

Built once, used across all six surfaces:

| Component | Purpose | Persona variation |
|---|---|---|
| `AssessmentEngine` | URL input → session start → signals → gaps | intake form copy differs per persona |
| `ReportRenderer` | takes `{ signals_object, gaps, persona, entitlement }` → renders | template per persona |
| `GapCard` | one gap finding | language + CTA per persona |
| `VendorRouteCard` | matched vendor + routing | per-persona CTA (quote / monitor / flag) |
| `ProgramMatchCard` | AWS program eligibility | shown for founder + aws_seller; hidden for others |
| `SignalDisclosure` | how deep to show each signal | entitlement-gated |
| `QuoteCard` | quote + procurement path | founder + distributor surfaces |
| `RiskHeatmap` | cross-domain risk view | buyer + investor + broker surfaces |
| `AssessmentTimeline` | pipeline progress + SSE | all personas during processing |

---

## Design language by persona

Shared design tokens (Tailwind config): same color system, typography, spacing, motion. Persona-specific density + navigation + copy tone.

| Persona | Tone | Density | Navigation model |
|---|---|---|---|
| Founder | warm editorial, reassuring (existing, keep) | low — one thing at a time | linear flow |
| Buyer | enterprise dashboard, information-dense | high — tables, filters, trends | dashboard + drill-down |
| Investor | data-first, exportable | highest — data grids, download | portfolio grid |
| Broker | underwriter workflow, industry norms | medium — quote-card layout | queue + case detail |
| AWS Seller | console-aware, AWS design adjacency | medium — customer list + programs | account-rep dashboard |
| Distributor | channel-program scorecard | medium | applicant queue |
| Admin | operator dashboard | highest | full platform view |

Shared base: `shadcn/ui` primitives (Button, Card, Table, Dialog, Form, Tabs, Sheet). Persona-specific wrappers extend these with tone + density adjustments.

---

## Phases (Kiro build order)

### Phase F1 — Foundation (no new functionality)

Scaffolding that supports everything after. Existing founder flow keeps working throughout.

1. Install `shadcn/ui`, `@tanstack/react-query`, `zustand`
2. Set up `QueryClientProvider` at root, migrate existing `api/client.js` calls to queries
3. Replace two auth flows (FounderAuth + Portal) with single Auth0 client, role-claim reading
4. Set up route guards (persona + entitlement)
5. Persona switcher component in header
6. Set up design-token base in Tailwind config + `shadcn/ui` theme
7. Build shared substrate components (`AssessmentEngine`, `ReportRenderer`, `GapCard`, `VendorRouteCard`, `ProgramMatchCard`, `SignalDisclosure`, `QuoteCard`, `RiskHeatmap`, `AssessmentTimeline`) as persona-agnostic base versions

**Acceptance:** existing founder flow works unchanged on the new scaffold. No regressions on `proof360.au`.

### Phase F2 — Founder surface refactor (functionality preserved + enhancements)

Migrate existing flow into the v2 scaffold. Add v2 enhancements.

1. Founder routes moved to `/founder/*` (301 redirects from legacy `/audit`, `/report/:id`, etc.)
2. Founder report uses new `ReportRenderer` with `persona: founder`
3. Add `ProgramMatchCard` to Layer 2 (AWS programs customer qualifies for)
4. Add `RiskHeatmap` cross-domain risk view to Layer 2
5. Add quote flow (`POST /session/quote` from Track A) via `QuoteCard`
6. Refine copy + editorial language (existing strategy preserved)

**Acceptance:** existing founder UX preserved, Layer 2 carries more richness, no dead links.

### Phase F3 — Admin surface (Track A's founder revenue console)

John's operator dashboard.

1. `/admin/revenue` — pipeline, closes, margin (from Track A attribution)
2. `/admin/tenants` — all tenants across all personas
3. `/admin/assessments` — full audit trail
4. `/admin/partners` — partner register editor (markdown + form)
5. `/admin/signals` — signal pipeline health (uses CloudWatch custom metrics)

**Acceptance:** John runs the business from this surface.

### Phase F4 — Buyer surface (first new persona)

First new stakeholder. Subscription model.

1. `/buyer/vendors/new` — add vendor to monitor (URL intake)
2. `/buyer/vendors` — dashboard list
3. `/buyer/vendors/:id` — vendor trust profile detail
4. `/buyer/reports/:id` — full vendor trust profile report
5. `/buyer/alerts` — change + red-flag stream
6. Subscription billing integration (Stripe or AWS Marketplace CPPO)

**Acceptance:** first enterprise buyer can sign up, monitor a vendor, see changes over time, export.

### Phase F5 — Broker surface (high commercial value)

Insurance underwriting pack. Austbrokers pipeline first.

1. `/broker/quote/new` — risk intake
2. `/broker/quote/:id` — underwriting pack (quantified risk factors)
3. `/broker/queue` — underwriting queue
4. Metronome integration for per-quote metering
5. Export to Austbrokers submission format

**Acceptance:** first Austbrokers-routed quote produces a complete underwriting pack; metered event lands in Metronome.

### Phase F6 — AWS seller surface (partner attribution)

No direct revenue. Compounds via co-sell credit + partner tier.

1. `/aws/customers/:id` — customer program qualification view
2. `/aws/programs` — AWS program catalogue (from `aws-funding-program-mapping.md`)
3. `/aws/ace` — ACE pipeline mirror (AWS Customer Engagements)
4. APN partner attribution wired (ACE integration where available)

**Acceptance:** AWS seller logs in, sees qualified pipeline, initiates program application with proof360 attribution.

### Phase F7 — Investor surface

DD workflow.

1. `/investor/portfolio/new` — add company to DD
2. `/investor/reports/:id` — investment diligence read
3. `/investor/export/:id` — data room export (PDF + structured JSON)
4. Subscription billing

**Acceptance:** first investor closes a DD workflow end-to-end; export lands in their data room.

### Phase F8 — Distributor surface (expand partner portal)

Existing partner portal expands into full distributor surface.

1. `/distributor/applicants` — reseller applicant queue
2. `/distributor/applicants/:id` — reseller scorecard (trust + financial + governance posture)
3. `/distributor/catalog` — vendor catalog fit for this reseller
4. Migrate existing partner portal leads into `/distributor/leads`

**Acceptance:** Ingram or Dicker uses the surface to evaluate one reseller application end-to-end.

---

## Non-negotiables

1. **No new framework.** React 19 + Vite 8 + Tailwind 3 stays.
2. **Existing founder UX preserved through F2.** Copy + tone + warmth retained where relevant.
3. **No persona surface ships without entitlement + route guard.** One leaky route = data exposure.
4. **Single Auth0 tenant.** Role claims, not multiple Auth0 apps.
5. **Shared substrate components are persona-agnostic.** Persona variation lives in wrappers + templates, not in the base.
6. **Design tokens consistent across personas.** One proof360 brand, expressed differently per audience.
7. **Report content is template-driven.** New persona surface = new template, not new API.
8. **AWS-aligned.** Auth0 + CloudFront + S3 static hosting (existing pattern). ECS Fargate for SSR if ever needed (not in this brief).
9. **Accessibility baseline.** WCAG AA across all personas. Enterprise buyers will audit this.
10. **HX First (John's doctrine).** Every surface returns a human to agency. No engagement-maximising patterns.

---

## Dependencies on backend (what Track A + Signal Pipeline must deliver)

| Frontend need | Backend source |
|---|---|
| Persistent assessments | Postgres (Track A §4) |
| Quote generation | `POST /session/quote` (Track A §6) |
| Attribution log | `leads`, `engagements` tables (Track A §5) |
| Revenue console data | founder console handlers (Track A §8) |
| Multi-tenant leads | portal reads from Postgres (Track A §7) |
| New signal fields in reports | signal pipeline (brief-signal-pipeline.md) |
| AWS program eligibility | new handler `GET /api/program-match/:session_id` (new requirement from v2 rethink) |
| Risk posture synthesis | new handler `GET /api/risk-posture/:session_id` (new requirement) |
| Vendor monitoring (buyer surface) | new handler `POST /api/monitor/vendor` + polling job (new requirement) |
| Entitlement resolution | new handler `GET /api/me/entitlements` (new requirement) |

New backend handlers are required for buyer + investor + broker surfaces. Add to Track A v2 scope (to be written).

---

## What's NOT in this brief

- Marketing site revamp (static landing pages outside the app — separate project)
- Native mobile apps (responsive web covers mobile needs)
- Email / notification templating (separate concern)
- Tier 1 narrative decks / sales collateral (Track B, handled by John + May)
- Pentad-native IMPERIUM surface (Track C, deferred)

---

## Handoff notes

- Git: John runs commits.
- Env: new vars for Auth0 single-tenant config, Stripe (if used for subscriptions), Metronome API key (for broker surface only).
- Testing: Playwright for E2E per persona. Start with founder flow regression before F2 ships.
- Claude Code verifies each phase before next starts.
- Deploy: existing `scripts/deploy.sh` with `frontend/dist/` output. CloudFront invalidation on deploy.

---

*Frontend v2 is the UX expression of the product rethink. One substrate, six surfaces, shared design system, unified auth, entitlement-gated routing. Kiro builds in phases; founder UX stays live throughout.*
