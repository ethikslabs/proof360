# Proof360 — Partner Portal Brief

**Status:** Ready for build
**Assigned:** Kiro (API), Claude Code (frontend reconciliation)
**Depends on:** `brief-api.md`, `vendors.js`, Auth0 tenant config
**Version:** 1.0 — 2026-03-19

---

## Governing principles (non-negotiable)

This brief derives from `proof360-principle.md` (v1.1) and `proof360-founder-experience.md` (v1.0).
All decisions below are consequences of these principles. They cannot be overridden by partner requests.

```
1. Founder is the only persona the product serves
2. Neutrality is enforced by architecture, not policy
3. Demand flows one way: Founder → Proof360 → Partners
4. A vendor sees only what the founder's gaps produce
5. Truth is fixed. Routing is flexible.
```

---

## What the partner portal is

```
Partner Portal = lead consumption layer
```

Partners log in, see leads relevant to them, act on them.

Not:
- A CRM
- A pipeline management tool
- A collaboration surface
- A place partners influence what founders see

---

## Current state (what exists)

The portal frontend exists (`Portal.jsx`, `PortalDashboard.jsx`) with:
- Auth0 PKCE login
- Google SSO + Microsoft SSO
- Email → domain → tenant resolution
- Static vendor visibility per tenant in `frontend/src/data/portal-leads.js`

**The problem:** Tenant configuration and vendor visibility are hardcoded in the frontend.
Adding a partner or changing a vendor list requires a frontend redeploy.
This must move to the API.

---

## Architecture

### Domain mapping (moves to API)

Tenant resolution must be server-side. The frontend authenticates the user, extracts their email domain, and calls the API to resolve their tenant profile. It never holds tenant configuration itself.

```
Frontend:
  Auth0 login → extract email → POST /api/v1/portal/resolve-tenant { email }
  ← { tenant_id, name, role, vendors[], color, tagline }

Frontend renders what the API returns.
Frontend never decides what a partner can see.
```

### Tenant roles

```
admin       — full catalog visibility (ethikslabs only)
distributor — sees leads for vendors in their distribution catalog
vendor      — sees leads where their vendor_id appears in recommended gaps
```

### Lead visibility rule (the neutrality constraint)

A lead is visible to a tenant if and only if:
- At least one confirmed gap in the lead maps to a vendor in the tenant's `vendors[]` list

This is evaluated server-side on every leads request. The frontend receives only the leads it is allowed to see. It never receives the full lead set and filters client-side.

```
GET /api/v1/portal/leads
Authorization: Bearer {auth0_token}

Server:
  1. Verify token → extract email
  2. Resolve tenant from email domain
  3. Filter sessions: gaps ∩ tenant.vendors ≠ ∅
  4. Return filtered lead set — never the full set
```

### What a lead contains (portal view)

A partner receives a lead object with:
- `session_id`
- `company_name`
- `assessed_at`
- `trust_score`
- `deal_readiness`
- `relevant_gaps[]` — only the gaps that involve this tenant's vendors
- `relevant_vendors[]` — only this tenant's vendors recommended in this lead
- `stage` (seed / series_a / series_b / growth)
- `sector`

A partner does NOT receive:
- The full gap list (gaps outside their catalog are invisible)
- The founder's email
- Any signal data beyond what serves the lead activation decision
- Any information about other partners viewing the same lead

---

## Routing vs diagnosis separation (the human relationship override)

From `proof360-principle.md` v1.6 addition:

```
Step 1: Identify gaps       (objective — never influenced by preferences)
Step 2: Map correct vendors (objective — never influenced by preferences)
Step 3: Apply routing       (optional — founder preference applied here only)
```

### What this means for the portal

If a founder has expressed a preferred distributor (e.g. "I have an existing relationship with Ingram"), the lead is routed to that distributor's portal view — IF that distributor carries a vendor that closes the relevant gap.

If the preferred distributor does not carry a relevant vendor, the routing preference is ignored. The correct vendor is still shown to the correct partner. The preference cannot suppress a recommendation.

This preference is captured as an optional field in the session:
```json
"founder_preferences": {
  "preferred_distributor": "ingram" | "dicker" | null
}
```

It affects portal lead surfacing order only. It does not affect gap diagnosis, vendor selection, or report content.

---

## API endpoints (new — Kiro to build)

### POST /api/v1/portal/resolve-tenant

Resolves tenant profile from authenticated user's email.

Request:
```json
{ "email": "user@ingrammicro.com" }
```

Response:
```json
{
  "tenant_id": "ingram",
  "name": "Ingram Micro",
  "role": "distributor",
  "vendors": ["trellix","sophos","fortinet","palo_alto","cohesity","nutanix","proofpoint","blancco","keeper","jamf"],
  "color": "#3b82f6",
  "tagline": "AU Distributor · Full catalog view"
}
```

Error: 404 if domain not registered. 403 if domain is blocked.

---

### GET /api/v1/portal/leads

Returns leads visible to the authenticated tenant.

Auth: Bearer token (Auth0 JWT). Server validates and extracts email → tenant.

Response:
```json
{
  "tenant_id": "ingram",
  "leads": [
    {
      "session_id": "uuid",
      "company_name": "string",
      "assessed_at": "ISO datetime",
      "trust_score": 62,
      "deal_readiness": "partial",
      "relevant_gaps": ["edr", "soc2"],
      "relevant_vendors": ["trellix", "sophos"],
      "stage": "series_a",
      "sector": "fintech"
    }
  ],
  "total": 1
}
```

---

### GET /api/v1/portal/leads/:session_id

Returns single lead detail for authenticated tenant. Same visibility rules apply — 404 if this lead has no gaps matching tenant's vendors.

---

## Tenant config (moves to API)

Tenant definitions move from `portal-leads.js` to server-side config at:
`api/src/config/tenants.js`

Structure:
```javascript
export const TENANTS = {
  ingram: {
    name: 'Ingram Micro',
    domains: ['ingrammicro.com'],
    role: 'distributor',
    vendors: ['trellix','sophos','fortinet','palo_alto','cohesity','nutanix','proofpoint','blancco','keeper','jamf'],
    color: '#3b82f6',
    tagline: 'AU Distributor · Full catalog view',
  },
  // ...
};

export const ADMIN_EMAILS = new Set(['ethiks360.jp@gmail.com']);
export const EXTRA_DOMAINS = { 'ethikslabs.com': 'ethikslabs' };
```

Frontend `portal-leads.js` is deprecated once API is live. Frontend reads from API only.

---

## Auth model

Auth0 handles authentication. The API handles authorisation.

- Auth0 issues JWT on login
- Frontend passes JWT as Bearer token on all portal API calls
- API validates JWT signature using Auth0 JWKS endpoint
- API resolves tenant from `email` claim in JWT
- API never trusts tenant identity from frontend payload

---

## Invariants (these must never be violated)

These are enforced in API logic, not frontend convention:

```
1. A tenant never receives leads outside their vendor catalog
2. A tenant never receives another tenant's leads
3. The founder's email is never exposed to a partner
4. Founder preferences affect routing order only — never diagnosis
5. If preferred distributor cannot service a gap — the correct partner sees it anyway
6. The full session dataset is never returned to a portal user
```

---

## What Kiro builds

1. `api/src/config/tenants.js` — tenant definitions (moved from frontend)
2. `api/src/handlers/portal-resolve-tenant.js` — POST /api/v1/portal/resolve-tenant
3. `api/src/handlers/portal-leads.js` — GET /api/v1/portal/leads
4. `api/src/handlers/portal-lead-detail.js` — GET /api/v1/portal/leads/:session_id
5. `api/src/services/portal-auth.js` — Auth0 JWT validation + tenant resolution
6. `api/src/services/lead-filter.js` — gap ∩ vendor visibility logic
7. Register portal routes in `server.js` under `/api/v1/portal/`

## What Claude Code reconciles

1. Remove tenant config from `frontend/src/data/portal-leads.js`
2. Replace static TENANTS lookup with `POST /api/v1/portal/resolve-tenant` call on login
3. Replace static lead data with `GET /api/v1/portal/leads` call on dashboard load
4. Frontend never holds tenant config — it renders what the API returns

---

## Out of scope (do not build)

- Partner-to-founder messaging
- Partner deal stage tracking
- Lead claiming / locking
- Partner-influenced vendor ranking
- Partner analytics / reporting

These are explicitly deferred. If a partner requests them, the answer is no.

---

*Brief locked: 2026-03-19*
*Principles: proof360-principle.md v1.1, proof360-founder-experience.md v1.0*
*Author: JP Coates / ethikslabs*
