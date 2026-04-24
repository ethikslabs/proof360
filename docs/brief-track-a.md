# Brief — Track A: Revenue Activation

**Status:** LOCKED (convergence complete 2026-04-23, five rounds, both agents declared "feels recursive")
**Scope:** Revenue machine completion on the existing proof360 codebase
**Executor:** Kiro (Builder)
**Operator:** Claude.ai
**Authority:** John Coates (Final Authority)
**Not in scope:** Track B (perception/narrative — handled separately). Track C (pentad-native rewrite — deferred).

---

## Operating laws (apply to every decision in this brief)

1. **AWS-aligned by hard-code.** Every decision strengthens AWS alignment or is at worst neutral. Azure is a revenue line, not a substrate. No multi-cloud abstraction tax.
2. **Compute funded by revenue, partner, or customer — never by default.** Marketplace co-sell is the primary mechanism.
3. **VECTOR is the inference plane. The plane is the commitment; the route is the decision.** No provider-specific binding in narrative or code.
4. **Proof360 sells the decision, not the work.** Migration is a routing class, not a delivery capability.
5. **No Track C work unless it directly closes a Track A gap.**

---

## Deliverables (in dependency order)

| # | Deliverable | Unblocks | Notes |
|---|---|---|---|
| 1 | Partner register (`docs/partner-register.md`) | All config decisions | John fills content; structure defined here |
| 2 | `vendors.js` config sweep | Quote endpoint, routing logic | Reflects partner register |
| 3 | `gaps.js` additions | Migration routing | `cloud_migration` gap |
| 4 | Postgres on RDS (or EC2-local) | Attribution, quote, console | Existing EC2 box `i-010dc648d4676168e` |
| 5 | Attribution layer wiring | Retires `leads.ndjson` + localStorage | Dual-write during cutover |
| 6 | `lead_type` field threading | Quote, console, routing | Six values, see §5 |
| 7 | `POST /session/quote` endpoint | Founder console quote view | Banded pricing, not real-time |
| 8 | Founder revenue console (`/account/revenue`) | Visibility on the machine | Asymmetric — founder sees all, partners see slices |

---

## 1. Partner register

**File:** `docs/partner-register.md`
**Owner:** John (content). Kiro does not populate, only wires `vendors.js` to reflect it.

**Schema (one row per vendor):**

| Field | Type | Values |
|---|---|---|
| `vendor_id` | string | matches `vendors.js` key |
| `vendor_name` | string | display |
| `agreement_status` | enum | `signed` \| `warm` \| `cold` \| `declined` |
| `agreement_type` | enum | `reseller` \| `msp` \| `mssp` \| `referral` \| `partner` \| `distributor` |
| `margin_band` | enum | `high` \| `mid` \| `low` \| `tbd` (exact % stays private) |
| `distributors` | array | ordered `['direct'/'ingram'/'dicker', ...]` — first = preferred. Ingram-first default. |
| `marketplace_aws_listed` | bool | AWS Marketplace listing exists |
| `marketplace_aws_cosell` | bool | Active co-sell relationship (stronger than listing alone) |
| `human_contact` | string | name (no emails in this doc) |
| `last_touch_date` | ISO date | |
| `notes` | string | |

The register is the **source of truth**. `vendors.js` entries must reflect it. No partner flag flips or new entries without a corresponding register row.

---

## 2. `vendors.js` config sweep

**File:** `api/src/config/vendors.js`

**New entries (shape only — content from partner register):**

```js
cloudflare_mssp: {
  id: 'cloudflare_mssp', display_name: 'Cloudflare (MSSP)', initials: 'CM',
  closes: ['network_perimeter', 'waf', 'ddos', 'zero_trust', 'dmarc', 'security_headers'],
  distributors: ['direct'], marketplace_aws: true,
  cost_range: null, timeline: null,
  is_partner: true, deal_label: null, // from register
  best_for: 'MSSPs and multi-tenant edge/zero-trust delivery',
  summary: 'Cloudflare MSSP program — manage edge security across multiple client accounts.',
  referral_url: 'https://www.cloudflare.com/mssp/',
},

aws_migration: {
  id: 'aws_migration', display_name: 'AWS Migration', initials: 'AM',
  closes: ['cloud_migration', 'legacy_on_prem', 'multi_cloud_fragmentation'],
  distributors: ['ingram'], aws_native: true, marketplace_aws: false,
  cost_range: 'project-based', timeline: '3-12 months',
  is_partner: true, deal_label: null, // from register
  best_for: 'Enterprises moving from on-prem or other clouds to AWS',
  summary: 'Managed AWS migration services. Proof360 surfaces the decision; delivery via AWS Partner network.',
  referral_url: null,
  service_entry: true, // NEW flag: this is a service, not a product subscription
},

azure_migration: {
  id: 'azure_migration', display_name: 'Azure Migration', initials: 'ZM',
  closes: ['cloud_migration', 'legacy_on_prem'],
  distributors: ['dicker'],
  cost_range: 'project-based', timeline: '3-12 months',
  is_partner: true, deal_label: null, // from register
  best_for: 'Microsoft-aligned enterprises moving to Azure',
  summary: 'Managed Azure migration services.',
  referral_url: null,
  service_entry: true,
},
```

**Existing entry modifications (pending register confirmation):**

- Migrate all vendors from `distributor: 'x'` (single) to `distributors: ['x', ...]` (ordered array). Ingram-first default where multiple distributors carry a vendor.
- `palo_alto.is_partner`: flip to `true` if register confirms. Add `deal_label`.
- Audit every `is_partner: true` flag against register. Correct mismatches.
- Dual-distributor vendors to update: cloudflare, cisco_duo, cisco_umbrella, sonicwall, trendmicro, microsoft, nutanix (Ingram first where applicable).

**New category in `VENDOR_CATEGORIES`:**

```js
'Cloud migration services': {
  quadrant_axes: {
    x_left: 'Lift and shift', x_right: 'Re-architect',
    y_top: 'Enterprise-focused', y_bottom: 'Mid-market focused',
  },
  vendor_positions: {
    aws_migration:   { x: 0.60, y: 0.30 },
    azure_migration: { x: 0.55, y: 0.35 },
  },
},
```

**New category for MSSP partnerships** — add only if register indicates more than one MSSP variant. Otherwise `cloudflare_mssp` sits in "Network security" with its parent.

---

## 3. `gaps.js` additions

**File:** `api/src/config/gaps.js`

**New gap:**

```js
{
  id: 'cloud_migration',
  severity: 'high',
  label: 'Cloud migration strategy gap',
  category: 'infrastructure',
  triggerCondition: (ctx) =>
    ctx.infrastructure === 'on_prem' ||
    ctx.infrastructure === 'colocation' ||
    ctx.infrastructure === 'multi_cloud_fragmented' ||
    ctx.infrastructure === 'legacy_hosted',
  claimTemplate: (ctx) => ({
    question: 'Does this company have a coherent cloud migration or consolidation strategy?',
    evidence: `Infrastructure: ${ctx.infrastructure}. Stage: ${ctx.stage}. Customer type: ${ctx.customer_type}.`,
  }),
  framework_impact: [
    { framework: 'Enterprise procurement', control: 'Cloud posture — common in security questionnaires', blocker: true },
    { framework: 'SOC 2', control: 'CC6.1 — Logical access controls (harder on legacy infra)', blocker: false },
    { framework: 'APRA CPS 234', control: 'Para 22–25 — Third-party arrangements', blocker: false },
  ],
  remediation: [
    'Map current infrastructure surface: what runs where, what data flows where, what the dependencies are',
    'Choose a target substrate and commit — AWS or Azure. Multi-cloud without a strategy is more expensive and less secure than either alone',
    'Engage a migration partner aligned to your target — proof360 routes to AWS or Azure migration specialists via Ingram or Dicker',
  ],
},
```

**`infrastructure` signal extraction** — `signal-extractor.js` already captures this. Confirm it can return the new values (`on_prem`, `colocation`, `multi_cloud_fragmented`, `legacy_hosted`). If not, extend the Claude Haiku prompt.

---

## 4. Postgres

**Host:** RDS preferred (managed, backups, in-VPC with EC2). Fallback: Postgres on the existing EC2 box `i-010dc648d4676168e`.

**Why RDS preferred:** backups, HA path later, and AWS Marketplace co-sell customers expect managed database posture. Consistent with AWS hard-code.

**Secrets:** Add to SSM under `/proof360/*`:
- `DATABASE_URL` — full connection string
- `DATABASE_SSL_MODE` — `require`

**Schema (v1, minimal):**

```sql
-- Assessments — one per proof360 session that completed
CREATE TABLE assessments (
  assessment_id      UUID PRIMARY KEY,
  session_id         TEXT UNIQUE NOT NULL,  -- matches session-store id
  company_name       TEXT,
  website            TEXT,
  infrastructure     TEXT,                   -- from signal-extractor
  stage              TEXT,
  customer_type      TEXT,
  trust_score        INT,
  aws_hosted         BOOLEAN DEFAULT FALSE,  -- derived from infrastructure signal
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_assessments_created_at ON assessments(created_at DESC);
CREATE INDEX idx_assessments_aws_hosted ON assessments(aws_hosted);

-- Leads — one per vendor routing event on an assessment
CREATE TABLE leads (
  lead_id            UUID PRIMARY KEY,
  assessment_id      UUID NOT NULL REFERENCES assessments(assessment_id),
  gap_id             TEXT NOT NULL,
  vendor_id          TEXT NOT NULL,
  lead_type          TEXT NOT NULL CHECK (lead_type IN (
                       'direct','msp','mssp',
                       'migration_to_aws','migration_to_azure',
                       'marketplace_cosell'
                     )),
  procurement_path   TEXT NOT NULL CHECK (procurement_path IN (
                       'direct','ingram','dicker','marketplace_aws','marketplace_cosell'
                     )),  -- single resolved channel at quote time (from distributors[0] or fallback)
  email_captured     TEXT,
  status             TEXT NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new','contacted','qualified','quoted','closed_won','closed_lost','declined')),
  estimated_value    NUMERIC(12,2),
  actual_value       NUMERIC(12,2),
  margin_band        TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_leads_vendor ON leads(vendor_id, status);
CREATE INDEX idx_leads_type ON leads(lead_type);
CREATE INDEX idx_leads_marketplace_cosell ON leads(lead_type) WHERE lead_type = 'marketplace_cosell';

-- Engagements — append-only log of partner/customer actions
CREATE TABLE engagements (
  engagement_id      UUID PRIMARY KEY,
  lead_id            UUID NOT NULL REFERENCES leads(lead_id),
  event_type         TEXT NOT NULL,        -- 'referral_fired','partner_viewed','partner_engaged',
                                           -- 'quote_generated','quote_sent','close_logged', etc.
  actor              TEXT,                 -- 'system' | partner_tenant_id | 'john' | vendor_id
  payload            JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_engagements_lead ON engagements(lead_id, created_at DESC);
CREATE INDEX idx_engagements_type ON engagements(event_type, created_at DESC);

-- Quotes — generated quote artefacts
CREATE TABLE quotes (
  quote_id           UUID PRIMARY KEY,
  assessment_id      UUID NOT NULL REFERENCES assessments(assessment_id),
  lead_ids           UUID[] NOT NULL,       -- array of leads this quote covers
  lead_type          TEXT NOT NULL,
  procurement_path   TEXT NOT NULL,
  line_items         JSONB NOT NULL,        -- [{vendor_id, description, price_band_low, price_band_high, term, notes}]
  estimated_total_low  NUMERIC(12,2),
  estimated_total_high NUMERIC(12,2),
  marketplace_eligible BOOLEAN DEFAULT FALSE,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','sent','accepted','declined','expired')),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_quotes_assessment ON quotes(assessment_id);

-- Partners — reflects partner register
CREATE TABLE partners (
  vendor_id                TEXT PRIMARY KEY,
  agreement_status         TEXT NOT NULL,
  agreement_type           TEXT NOT NULL,
  margin_band              TEXT,
  distributor              TEXT,
  marketplace_aws_listed   BOOLEAN DEFAULT FALSE,
  marketplace_aws_cosell   BOOLEAN DEFAULT FALSE,
  human_contact            TEXT,
  last_touch_date          DATE,
  notes                    TEXT,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
```

**Migration file:** `api/migrations/001_track_a_initial.sql`
**Runner:** simple node script using `pg` or `postgres` client. No ORM. Kiro's call which client library — stay minimal.
**Dev seed:** populate `partners` from `docs/partner-register.md` parser (Node script).

---

## 5. Lead type expansion

Six values, determined at routing time:

| Value | When | Notes |
|---|---|---|
| `direct` | Default. Vendor-matched by gap, customer not on AWS or non-Marketplace vendor | Referral fires to vendor's own sales |
| `msp` | Vendor has MSP variant (e.g. `vanta_msp`) AND customer matches MSP criteria | Rolled under John's MSP |
| `mssp` | Vendor has MSSP variant (e.g. `cloudflare_mssp`) AND customer matches MSSP criteria | Cloudflare MSSP, future Cisco MSSP etc |
| `migration_to_aws` | Matched vendor is `aws_migration` OR gap is `cloud_migration` with AWS target signal | Service-class lead |
| `migration_to_azure` | Matched vendor is `azure_migration` OR gap is `cloud_migration` with Azure target signal | Service-class lead |
| `marketplace_cosell` | **First-class path.** Customer is AWS-hosted AND vendor has `marketplace_aws_cosell: true` | Takes priority over `direct` when both apply |

**Routing priority** when multiple apply:

```
marketplace_cosell > mssp > msp > migration_to_aws > migration_to_azure > direct
```

Rationale: Marketplace co-sell funds the compute and unblocks the deal via existing AWS commit. MSSP/MSP next because they multiply margin. Migration is service-class. Direct is the fallback.

**Implementation:** new function `determineLeadType(vendor, assessment, gap)` in `api/src/services/vendor-selector.js`. Called once per vendor-gap pair during Layer 2 assembly.

---

## 6. `POST /session/quote` endpoint

**Handler:** `api/src/handlers/quote.js` (new)

**Request:**
```json
{
  "session_id": "string",
  "selections": [
    { "gap_id": "string", "vendor_id": "string" }
  ]
}
```

**Response:**
```json
{
  "quote_id": "uuid",
  "lead_type": "marketplace_cosell | direct | msp | ...",
  "procurement_path": "marketplace_aws | direct | ingram | ...",
  "marketplace_eligible": true,
  "line_items": [
    {
      "vendor_id": "vanta",
      "description": "Vanta Starter (SOC 2 Type I, first year)",
      "price_band_low": 7000,
      "price_band_high": 15000,
      "term": "annual",
      "notes": "20% off first year via proof360 partner program"
    }
  ],
  "estimated_total_low": 12000,
  "estimated_total_high": 28000,
  "status": "draft",
  "created_at": "ISO8601"
}
```

**Pricing resolution — banded, not real-time:**

Source: a new static file `api/src/config/pricing-bands.js` with structure:

```js
export const PRICING_BANDS = {
  vanta: {
    starter:   { low: 7000,  high: 10000, term: 'annual' },
    growth:    { low: 10000, high: 15000, term: 'annual' },
  },
  cloudflare: {
    business:  { low: 2000,  high: 4000,  term: 'annual' },
    enterprise:{ low: 4000,  high: 12000, term: 'annual' },
  },
  aws_migration: {
    small:     { low: 15000, high: 40000, term: 'project' },
    mid:       { low: 40000, high: 120000, term: 'project' },
    large:     { low: 120000, high: 400000, term: 'project' },
  },
  // ... per vendor
};
```

Tier selection heuristic: `assessments.customer_type` + `assessments.stage` → tier. If ambiguous, return the middle tier's band. Low-confidence tiers tagged in `notes`.

**This is not a commitment to pricing.** The response format must make that explicit to any consumer (founder console shows "indicative range, partner quote required to confirm").

**Writes:**
1. Insert row into `quotes`
2. Insert `engagements` row per line_item: `event_type: 'quote_generated'`
3. Update lead status to `quoted` for each referenced `lead_id`

---

## 7. Attribution wiring

**Retire:**
- `api/leads.ndjson` — keep reading for backwards compatibility during cutover, stop writing after week 1
- `portal_engagements` localStorage key — keep reading, dual-write to Postgres, cut reads after week 1

**New write points:**

| Trigger | Writes to | Event type |
|---|---|---|
| `POST /session/capture-email` | `assessments` (upsert), `leads` (insert per matched vendor) | `referral_fired` |
| `PortalLeadDetail.jsx` engage action | `engagements` | `partner_engaged` |
| `PortalDashboard.jsx` status change | `leads.status` update + `engagements` | `status_changed` |
| `POST /session/quote` | `quotes`, `engagements` | `quote_generated` |
| Manual console action by John | `leads`, `engagements` | `close_logged` (or similar) |

**New read points:**
- `PortalDashboard.jsx` — reads `leads` filtered by tenant vendor catalog (replaces `PORTAL_LEADS` static data)
- Founder revenue console (§8) — reads aggregated views
- `/api/portal/leads` and `/api/portal/engagements` — new handlers serving the portal reads

---

## 8. Founder revenue console

**Route:** `/account/revenue`
**Auth:** reuses `founder_auth` localStorage (existing Auth0 PKCE flow via `FounderAuth.jsx`)
**File:** `frontend/src/pages/FounderRevenueConsole.jsx`

**Sections (in order):**

1. **Headline tiles** — last 30d / all-time toggleable
   - Assessments completed
   - Leads generated (count + total estimated value band)
   - Quotes sent
   - Closes logged
   - Marketplace co-sell pipeline value (distinct tile — this is the AWS alignment marker)

2. **Pipeline table** — one row per lead
   - Columns: company, gap, vendor, lead_type, status, est. value, margin band, last engagement, actions
   - Filters: vendor, lead_type, status, date range
   - Row expand: timeline of engagements

3. **Marketplace co-sell cohort** — separate view
   - All leads where `lead_type = marketplace_cosell`
   - Conversion rate, time to close, value distribution

4. **Partner breakdown**
   - Per partner: leads routed, engaged, quoted, closed, close rate
   - Surfaces which partnerships are converting and which are dormant

**API:** new `/api/founder/revenue/*` handlers:
- `GET /summary` — headline tiles
- `GET /pipeline` — paginated lead list with filters
- `GET /marketplace-cosell` — cohort view
- `GET /partners` — partner breakdown
- `POST /leads/:id/close` — log a close (writes `leads.status`, `leads.actual_value`, `engagements`)

**Asymmetric by design:** partners never see this console. Their view stays the existing partner portal.

---

## 9. Migration sequencing (order of ops, no breakage)

| Step | Action | Live risk | Verification |
|---|---|---|---|
| 1 | Provision RDS (or Postgres on EC2), create schema | None | `psql` connect + `\d` |
| 2 | Deploy new API with DB writes dual (old paths still write NDJSON/localStorage) | None | Existing flows unchanged |
| 3 | Seed `partners` from register | None | Row count matches register |
| 4 | Update `vendors.js` + `gaps.js` with new entries | Low — additive | Existing assessments unaffected |
| 5 | Wire `capture-email` to write `leads` + `assessments` (dual-write retained) | Low | New leads appear in DB |
| 6 | Ship portal reads from DB (keep localStorage as fallback) | Low | Portal still renders |
| 7 | Deploy founder revenue console behind `founder_auth` | None | Only John sees it |
| 8 | Ship quote endpoint + UI entry point in report Layer 2 | Medium — new UX | Demo quote generates cleanly |
| 9 | Cut old NDJSON write path | None (reads retained for week 2) | Grep codebase for `leads.ndjson` writes |
| 10 | Cut old localStorage engagement write | None | Grep for `portal_engagements` writes |

---

## 10. Out of scope (explicit non-goals)

- Real-time partner pricing API integration (banded pricing only)
- Migration delivery / orchestration / provisioning (routing only)
- Multi-cloud abstraction (AWS-aligned hard-code)
- NVIDIA integration (narrative only, future Track C)
- VERITAS claim governance on reports (Track C when triggered)
- IMPERIUM absorption of the partner portal (Track C when triggered)
- Persona bar primitive replacing Sophia (Track C when triggered)
- Partner-facing revenue visibility (stays asymmetric)
- SPV, sovereign deployment, Marketplace listing ceremony (post-cashflow)

---

## 11. Verification

No formal test suite exists in this repo. Verification is:

1. **Schema:** `psql` + `\d` on each table; constraint violations on bad data (e.g. invalid `lead_type`).
2. **Dual-write:** for one deploy cycle, every new lead appears in both `leads.ndjson` AND `leads` table. Row counts match.
3. **Quote endpoint:** POST with a seeded session, receive valid response, row lands in `quotes`, engagements fire.
4. **Portal:** load with a seeded tenant, see leads matching that tenant's vendor catalog from DB.
5. **Founder console:** load `/account/revenue` as John, see non-zero headline tiles after seeding.
6. **Marketplace co-sell detection:** seed an assessment with `infrastructure: aws_hosted`, add a vendor with `marketplace_aws_cosell: true`, verify lead is created with `lead_type: marketplace_cosell`.

Claude Code runs these as verification passes. Kiro does not self-verify.

---

## 12. Handoff notes

- **Git:** John runs all git commands. Kiro writes files; does not commit.
- **Env:** new vars for `DATABASE_URL`, `DATABASE_SSL_MODE` — add to `api/.env.example` and SSM.
- **Deploy:** existing `scripts/deploy.sh` — extend with DB migration step (idempotent).
- **Questions:** Kiro flags blockers in Apple Notes session handoff. Does not invent commercial terms, margin numbers, or partner relationship states.

---

*Locked by convergence 2026-04-23. Five-round protocol, Claude.ai ↔ ChatGPT, both declared "feels recursive." Ready for Kiro build.*
