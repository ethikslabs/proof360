# Convergence Seed — Proof360 v2

**Purpose:** seed document for the Claude.ai ↔ ChatGPT convergence round that precedes Kiro's overnight build. Written by Claude.ai (Operator). ChatGPT (Architect) reviews, challenges, proposes refinements. John (Final Authority) reconciles. Kiro (Builder) executes.

**Date:** 2026-04-23
**Session:** proof360 scope expansion → v2 rethink → show-don't-tell product marketing position
**Status:** pre-convergence. Kiro build paused until ChatGPT input reconciled.

---

## 1. What this session established

### 1a. Backend scope expansion (locked, additive)

- Signal pipeline: 22 → ~67 sources, ~50 → ~215 signals
- Cross-domain read productised: technical + legal + financial + reputational + social + governance + human lenses converge on one trust surface
- AWS program eligibility engine: 30+ programs matched to signals via matrix
- Self-hosted intelligence stack: SpiderFoot, TruffleHog, OpenSanctions, testssl.sh, nmap, MaxMind, abuse feeds (all OSS, sovereign-deployable)
- Account footprint perception play: ~25 AWS services enabled at ~$50/mo incremental, feeds WA Review directly
- Funding signals added: 11 new sources (ASIC annual returns, ATO RDTI, AusIndustry grants, ECF platforms, VC portfolios, accelerator alumni, ASX announcements, SEC EDGAR, Techboard, competitions)
- GitHub deep crawl added: secrets scanning + CVE + hygiene via TruffleHog/Gitleaks/Semgrep
- 6+ lead types: direct / msp / mssp / migration_to_aws / migration_to_azure / marketplace_cosell / aws_program_application
- Multi-distributor routing: `distributors: []` array, Ingram-first default
- Commercial metering path: Metronome → AWS Marketplace Metering Service for CPPO
- Full partner register populated (public facts): Ingram AU 15 cyber vendors, Dicker AU 19 cyber vendors, dual-distributor flags

**Files written:** `brief-signal-pipeline.md`, `self-hosted-signal-stack.md`, `aws-motion-inventory.md`, `aws-funding-program-mapping.md`, `signal-source-inventory.md` (extensive expansions), `partner-register.md`, `ingram-au-public-vendors.md`.

### 1b. Product rethink — Option B locked

Backend reads for 5+ audiences. Frontend serves 1. Structural mismatch.

Three options evaluated:
- A — Track A narrow, v2 later. Rejected (accumulates rework debt).
- B — Expand Track A into v2 foundation. **Locked.**
- C — Track C trigger activated, pentad-native rebuild. Deferred (no investor runway yet).

**Option B:** multi-stakeholder surfaces built on expanded Track A architecture. Six surfaces, one substrate:
1. Founder Trust Readiness (refine existing)
2. Vendor Trust Profile (new — enterprise buyer)
3. Investment Diligence Read (new — investor/acquirer)
4. Insurance Underwriting Pack (new — Austbrokers pipeline)
5. AWS Program Qualification (new — AWS seller/APN)
6. Distributor Channel Fit (new — Ingram/Dicker)

**File written:** `proof360-v2-rethink.md`.

### 1c. Frontend v2 phased build defined

8 phases on React 19 + Vite 8 + Tailwind 3 (no framework change).

- F1 Foundation (shadcn/ui, tanstack-query, zustand, single Auth0 tenant with role claims, shared substrate components, design tokens)
- F2 Founder surface refactored into v2 + Layer 2 enhancements (program match card, risk heatmap)
- F3 Admin surface (Track A revenue console lives here)
- F4 Buyer surface (subscription)
- F5 Broker surface (Austbrokers + Metronome metering)
- F6 AWS seller surface (partner attribution)
- F7 Investor surface (DD export)
- F8 Distributor surface (expand partner portal)

New backend handlers surfaced: `GET /api/program-match/:session_id`, `GET /api/risk-posture/:session_id`, `POST /api/monitor/vendor`, `GET /api/me/entitlements`.

**File written:** `brief-frontend-v2.md`.

---

## 2. The new position (primary convergence subject)

### 2a. No pitch deck

John's position (to challenge or confirm): show don't tell is non-negotiable. The pitch deck contradicts it. A deck is always telling.

### 2b. The cold read is the pitch

Proof360 already has `/audit/cold-read` — URL in, surprise out, before any form fill. This is the strongest artefact the product has.

Claim: anything a deck tries to do, a live or pre-run cold read does better:
- Investor meeting → pre-run cold read on target's portfolio company, or live cold read on a company they name
- AWS partner meeting → pre-run cold read on `aws.com` showing proof360's lens on AWS itself
- Austbrokers → cold read on a client they're currently quoting
- Ingram MD → cold read on a reseller applicant in their queue
- Enterprise buyer → cold read on a vendor they're evaluating
- Conference stage → live cold read on audience-submitted URL

### 2c. Website IS the deck

Public landing → cold read → Layer 1 → email unlock → Layer 2. No "How it works" page. No founder story page. No "Why proof360." All telling.

Minimum marketing, product is the hook. Partner + distributor logos when earned = only social proof surface.

### 2d. Growth loop (not virality)

Cold read on URL X → Layer 2 requires email → email captures lead → proof360 sends a follow-up showing what Layer 2 unlocks → share link `?url=X` forwarded to another person at company X → new cold read session.

Not spammy if the value is real (it is). Structural growth mechanic.

### 2e. Progressive disclosure via feature flags

v2 frontend scaffold is built full (F1-F8), but persona surfaces are flag-gated. Public landing only shows what's turned on. Other surfaces referenced below fold as "coming" without dates. Octalysis mechanic already in the product — curiosity (#7), accomplishment (#2), scarcity (#6), social influence (#5) activated without being designed for.

### 2f. Pre-run cold read tool (new Kiro build item)

Admin-only tool at `/admin/preread` that:
- Accepts a list of URLs (paste or CSV)
- Runs cold read against each
- Produces a folder of shareable cold read links
- Links to admin report view where John can review before sharing
- Export as links / markdown / simple HTML compiled pages

Used to prep partner rooms. Walk into a meeting with every target already pre-read.

### 2g. Shareable cold read URL mechanic

Cold read page accepts `?url=X` parameter. Landing page has clean share CTA. Sharing is one link, one click, one URL field pre-filled. No form, no friction.

---

## 3. Open questions for ChatGPT

ChatGPT to weigh in on these specifically. Respond position + reasoning per question, not consensus hedging.

**Q1 — Is there ANY audience where a deck is genuinely required?**
Regulated procurement (gov, defence, financial services RFP)? Board-level investor presentations where the ask requires slide granularity? Conference sponsorships that require a sponsor deck? Is "no deck" an absolute or a default-with-exceptions?

**Q2 — Privacy / legal surface of running cold reads on non-owned URLs.**
When John shares `proof360.au/audit/cold-read?url=somecompany.com`, what's the legal + reputational exposure? Is it different from any OSINT tool's behaviour? Does AU Privacy Act / APP 11 apply if signals include personal data from public sources? Does this change if the Layer 2 report is then shared externally?

**Q3 — HX First tension with OSINT on third parties.**
Operating doctrine: "does this return a human to agency or take it away?" A cold read performed on a company *by someone else at that company* returns agency. A cold read performed on a company *by a competitor or investor* is OSINT, which is legitimate but different. Is this a tension, and if so how do we frame it without compromising the principle?

**Q4 — Does "no deck" break in specific partner contexts?**
Ingram MD wants to socialise proof360 internally — with what artefact? Austbrokers underwriting committee needs something the broker can circulate. AWS seller needs something to send inside AWS Partner Central. If not a deck, what? A live-demo video? A structured markdown doc? An internal proof360 tenant with their own login?

**Q5 — Pre-run cold read concurrency + cost.**
If John walks into a room with 20 pre-runs done, that's 20 full pipeline executions. At current recon cost (Firecrawl + Anthropic Haiku + API calls) what's the per-read cost? Does the architecture need a "pre-read" mode that skips paid-API sources, or do we eat the cost as GTM spend?

**Q6 — Landing page strategy.**
Option α: single cold read hero, no persona selection visible — one door, narrow funnel.
Option β: cold read hero + persona teaser below fold — one door + hint of depth.
Option γ: persona-first selector — six doors, cold read inside the founder door.
Which reads most honestly against HX First and show-don't-tell?

**Q7 — Founder surface vs other personas — what changes in the cold read itself?**
When a broker cold-reads a prospective insured, do they see the same cold read as the founder would see their own company? Different lens needed? Or does lens only apply in Layer 2 after email unlock?

**Q8 — What's the minimum Kiro can ship overnight that moves the needle commercially THIS WEEK?**
Given everything scoped, what's the smallest slice Kiro can build tonight that produces measurable commercial signal by Friday? Candidate: F2 (founder surface enhancements: program match card + risk heatmap in Layer 2) + pre-run cold read admin tool + share URL mechanic. Is this the minimum? Is it too much? Too little?

**Q9 — Track B (perception) implication of "no deck".**
Track B was about narrative leverage in Tier 1 rooms (AWS Agentic AI / CTO / CISO). If there's no deck, what's the Track B artefact? The live cold read? The website? A structured conversation script? Does Track B need its own brief now?

**Q10 — Does this change anything locked about VECTOR, VERITAS, or the pentad?**
Sanity check: does the show-don't-tell position introduce any contradiction with the deeper architecture doctrine? Or is it purely a GTM / surface layer decision that sits above it?

---

## 4. Locked constraints (not open for challenge)

1. AWS hard-code — every decision strengthens AWS alignment or is neutral
2. VECTOR doctrine — inference is substrate-agnostic, plane is the commitment, route is the decision
3. HX First — every surface returns a human to agency
4. VERITAS as trust substrate — signals feed claims, claims are governed
5. Show don't tell — operating principle, not marketing choice
6. Operating laws (Round 4):
   - No Track C work unless it closes a Track A or Track B gap
   - Every decision strengthens AWS alignment
   - Compute funded by revenue, partner, or customer
   - VECTOR is the inference plane
   - Track B pulls Track A into higher-value rooms
7. John runs all git, no direct commits
8. ops360 is the pipeline name (jp-system archived)
9. Kiro = Builder, Claude Code = Verifier (small tweaks only), ChatGPT = Architect, Claude.ai = Operator, John = Final Authority
10. MCP first, then A2A, fallback to direct API only if no alternative

---

## 5. Proposed Kiro build scope (post-convergence)

Sequenced items for Kiro once ChatGPT's input is reconciled and John approves.

### Immediate (overnight grind eligible)

**Frontend v2 — Phase F1 foundation:**
- Install + configure shadcn/ui, tanstack-query, zustand
- Replace two auth flows with single Auth0 + role claims
- Set up route guards + persona switcher
- Build shared substrate components (`AssessmentEngine`, `ReportRenderer`, `GapCard`, `VendorRouteCard`, `ProgramMatchCard`, `SignalDisclosure`, `QuoteCard`, `RiskHeatmap`, `AssessmentTimeline`) as persona-agnostic base
- Design-token base + shadcn theme

**Frontend v2 — Phase F2 founder surface refactor:**
- Founder routes moved to `/founder/*` with legacy redirects
- `ReportRenderer` with `persona: founder`
- `ProgramMatchCard` added to Layer 2 (AWS programs customer qualifies for)
- `RiskHeatmap` cross-domain risk view added to Layer 2
- Existing editorial tone preserved

**New GTM-layer build items:**
- `/admin/preread` — pre-run cold read tool (paste URLs, batch-run, shareable outputs)
- Cold read page accepts `?url=X` parameter with clean share CTA
- Landing redesign — cold read front and centre, minimal marketing copy
- Feature flag system (simple config file or DB table) — gates persona surfaces

**Backend — new handlers required:**
- `GET /api/program-match/:session_id` — returns eligible AWS programs from signals
- `GET /api/risk-posture/:session_id` — cross-domain risk synthesis
- (Buyer/broker/investor surface handlers deferred until those phases)

**Signal pipeline — Phase 1 parallel grind:**
- A1-A17 from `brief-signal-pipeline.md` (all free, fast, low-risk)
- No blocker, can run entirely overnight

### Post-immediate (next 30-90 days, sequenced)

- Frontend F3 admin surface (Track A revenue console)
- Frontend F5 broker surface (first commercial-revenue surface after founder)
- Signal pipeline Phase 2 (OSS tools standing up — SpiderFoot, TruffleHog, OpenSanctions, etc.)
- AWS account footprint expansion (~25 services enabled)
- Metronome instrumentation (business events)
- Marketplace Seller registration + first CPPO private offer

### Conditional on events

- F4 Buyer surface — after first enterprise buyer pilot confirmed
- F6 AWS seller surface — after APN tier established + ACE pipeline visible
- F7 Investor surface — after first investor pilot conversation
- F8 Distributor surface — after Ingram or Dicker pilot confirmed

---

## 6. What ChatGPT's response should contain

1. **Per-question position** on Q1–Q10 — position + reasoning, not consensus hedging
2. **Architectural challenges** to Option B if any ChatGPT sees that Claude.ai missed
3. **"No deck" position** — confirm, qualify, or dispute
4. **Kiro scope refinement** — what to add, remove, or re-sequence in §5
5. **Any doctrine conflicts** ChatGPT sees that weren't caught
6. **Explicit convergence lock points** — which positions are locked by ChatGPT's input and which are still open

Format: markdown response back to John, who reconciles and finalises. Once reconciled, Kiro executes §5 immediate scope.

---

## 7. Session handoff state

**Claude.ai (Operator) — done this session:**
- Signal inventory expansion
- Self-hosted stack catalogue
- GitHub deep crawl addition
- AWS motion inventory
- AWS funding program mapping
- Funding signals addition
- v2 rethink with three options, Option B recommended + locked by John
- Frontend v2 phased brief
- Position on "no deck" / cold read as pitch
- This convergence seed

**ChatGPT (Architect) — pending this session:**
- Review this seed end-to-end
- Respond to Q1-Q10
- Architectural challenges
- Refinement proposals for §5

**John (Final Authority) — pending this session:**
- Approve or modify Option B lock
- Reconcile Claude.ai vs ChatGPT positions
- Final Kiro scope sign-off
- Run git commits for any work that happens

**Kiro (Builder) — pending this session:**
- Paused until §5 immediate scope is finalised post-convergence
- Then overnight grind on F1 + F2 + pre-read tool + landing + signal pipeline Phase 1

**Claude Code (Verifier) — pending this session:**
- Verifies Kiro's output per phase
- Flags issues, does not fix

---

## 8. Reference files

All in `/Users/johncoates/Library/CloudStorage/Dropbox/Projects/proof360/docs/`:

- `proof360-v2-rethink.md` — product rethink + three options
- `brief-frontend-v2.md` — frontend phased build
- `brief-signal-pipeline.md` — signal expansion Kiro scope
- `brief-track-a.md` — revenue activation (expand to v2 per ChatGPT convergence)
- `signal-source-inventory.md` — all signals across all lenses
- `self-hosted-signal-stack.md` — OSS tools catalogue
- `aws-motion-inventory.md` — AWS services + programs inventory
- `aws-funding-program-mapping.md` — signal → program matrix
- `partner-register.md` — vendor + distributor commercial structure
- `ingram-au-public-vendors.md` — Ingram + Dicker public vendor catalogues

---

*Seed for convergence. Not a build spec. ChatGPT reads, challenges, proposes. John reconciles. Kiro executes.*
