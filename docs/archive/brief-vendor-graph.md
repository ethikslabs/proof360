# Proof360 — Vendor Graph Brief

**Status:** Ready for build  
**Assigned:** Kiro (vendor resolution + distributor wiring), Claude Code (frontend rendering)  
**Depends on:** `brief-vendors.md`, `vendors.js`, `vendor-intelligence-builder.js`, `brief-ingram.md` (commit pending)

---

## What this brief covers

The vendor layer is evolving from a flat catalog (`vendors.js`) to a capability-first graph model. This brief defines:

1. Capability tile definitions (what a gap needs — not which vendor)
2. Vendor-to-capability mappings (which vendors deliver which capabilities)
3. Distributor routing rules (Dicker AU vs Ingram global)
4. Vendor selection algorithm (stage + geography + margin)
5. Explainability layer schema (per-gap reasoning output)

This is the coordination layer. Kiro wires the resolution logic and distributor routing. Claude Code renders the capability tiles and explainability output. Neither touches vendor names in hardcoded logic.

---

## Core design principle

**Decouple gap closure from vendor identity.**

A gap is closed by a capability. A capability is delivered by one or more vendors. The selection algorithm resolves capability → vendor at runtime based on context. The frontend never hardcodes a vendor name; it renders whatever the resolution layer returns.

This means:
- New vendors can be added to `vendors.js` without touching selection logic
- The algorithm can evolve (margin weighting, distributor preference) without touching the frontend
- Capability tiles are stable UI primitives — vendor assignments behind them change as the catalog grows

---

## 1. Capability tiles

Five capabilities for MVP. Each maps to one or more `gap_id` values in the pipeline.

| Capability ID | Display label | Closes gap(s) | Description |
|---|---|---|---|
| `compliance_automation` | Compliance Automation | `soc2`, `incident_response` | Continuous control monitoring, evidence collection, audit readiness |
| `identity_management` | Identity & Access | `mfa`, `sso` | MFA enforcement, SSO, directory integration, SCIM provisioning |
| `network_security` | Network Security | `network_perimeter` | Perimeter protection, zero trust access, DDoS mitigation |
| `endpoint_protection` | Endpoint Protection | `edr` | Endpoint detection and response, threat hunting |
| `cyber_insurance` | Cyber Insurance | `cyber_insurance` | Policy placement, risk assessment, claims support |

### Tile schema (API output per gap)

```json
{
  "capability_id": "compliance_automation",
  "display_label": "Compliance Automation",
  "closes_gaps": ["soc2", "incident_response"],
  "vendor_count": 3,
  "has_partner": true,
  "distributor": "ingram" | "dicker" | "direct" | null
}
```

The tile is a summary primitive. The full vendor resolution object (quadrant, pick card, vendor grid) is built by `vendor-intelligence-builder.js` as defined in `brief-vendors.md`. Capability tiles sit above that — they are the entry point before the founder drills into vendor detail.

---

## 2. Vendor-to-capability mappings

Capability assignments live in `vendors.js` alongside existing `closes` arrays. The `closes` field is already the source of truth for gap-level mapping. Capability mapping is derived from it at runtime — no second source of truth.

Derivation logic (in `vendor-intelligence-builder.js` or a new `capability-resolver.js`):

```js
// Map gap_id → capability_id
const GAP_TO_CAPABILITY = {
  soc2: 'compliance_automation',
  incident_response: 'compliance_automation',
  mfa: 'identity_management',
  sso: 'identity_management',
  network_perimeter: 'network_security',
  edr: 'endpoint_protection',
  cyber_insurance: 'cyber_insurance',
};

// Derive capability for a vendor from its closes array
function vendorCapabilities(vendor) {
  return [...new Set(vendor.closes.map((gapId) => GAP_TO_CAPABILITY[gapId]).filter(Boolean))];
}
```

Current vendor-to-capability mapping (derived):

| Vendor | Capabilities |
|---|---|
| Vanta | `compliance_automation` |
| Drata | `compliance_automation` |
| Secureframe | `compliance_automation` |
| Okta | `identity_management` |
| Cisco Duo | `identity_management` |
| Cloudflare | `network_security` |
| CrowdStrike | `endpoint_protection` |
| Palo Alto | `endpoint_protection` |
| AustBrokers CyberPro | `cyber_insurance` |

Two to three vendors per capability is the target for MVP. Thin spots (cyber_insurance has one vendor) are acceptable — add vendors as partners are signed.

---

## 3. Distributor routing rules

Distributor routing determines whether a vendor recommendation is fulfilled via Dicker Data (AU), Ingram Micro (global), or directly (SaaS / no distributor).

### Routing decision tree

```
For each selected vendor:
  1. Is the vendor SaaS-direct (no distributor channel)?
     → route = 'direct'
  2. Is the session geography AU or NZ?
     → route = 'dicker'
  3. Is the vendor in the Ingram catalog?
     → route = 'ingram'
  4. Fallback:
     → route = 'direct'
```

### Distributor field in vendors.js

Add `distributor` field to each vendor entry:

```js
vanta: {
  // ...existing fields...
  distributor: 'direct',        // SaaS, sold direct
},
cisco_duo: {
  // ...existing fields...
  distributor: 'dicker',        // Cisco channel — Dicker for AU
},
cloudflare: {
  // ...existing fields...
  distributor: 'direct',        // Cloudflare sells direct
},
crowdstrike: {
  // ...existing fields...
  distributor: 'ingram',        // CrowdStrike Ingram channel
},
palo_alto: {
  // ...existing fields...
  distributor: 'ingram',        // Palo Alto Ingram channel
},
okta: {
  // ...existing fields...
  distributor: 'direct',        // Okta sells direct
},
austbrokers: {
  // ...existing fields...
  distributor: 'direct',        // Broker, no distributor
},
drata: {
  // ...existing fields...
  distributor: 'direct',
},
secureframe: {
  // ...existing fields...
  distributor: 'direct',
},
```

### Geography detection

Session context already passes through `context-normalizer.js`. Add a `geography` field to the normalised context object:

```js
{
  stage: 'seed',
  infrastructure: 'aws',
  geography: 'AU' | 'NZ' | 'SG' | 'US' | 'GB' | null
}
```

Geography is inferred from the company URL (TLD) or the IP of the scraping request via Firecrawl. If undetectable, default to null and skip Dicker preference — fall through to Ingram or direct.

### Dicker-preferred capabilities (AU/NZ)

When `geography` is AU or NZ and the vendor's `distributor` is `dicker` or `ingram`:
- Prefer `dicker` first if Dicker carries the vendor
- Fall back to `ingram` if not in Dicker catalog
- If neither, route `direct`

Dicker AU catalog coverage (current):
- Cisco Duo ✓
- CrowdStrike ✓
- Palo Alto ✓
- Vanta ✗ (direct only)
- Drata ✗ (direct only)
- Cloudflare ✗ (direct only)

This list is maintained in `vendors.js` via the `distributor` field — not hardcoded in routing logic.

---

## 4. Vendor selection algorithm

Current `selectPick()` in `vendor-intelligence-builder.js` is placeholder logic (prefer partner → return first). Replace with the following multi-factor algorithm.

### Selection inputs

```js
{
  vendors: VendorObject[],         // candidates for this capability
  gap: { gap_id, severity },       // gap being resolved
  context: {
    stage: string,                 // seed | series_a | series_b | growth
    infrastructure: string,        // aws | azure | gcp | hybrid | null
    geography: string,             // AU | NZ | SG | US | GB | null
    team_size: number | null,
  }
}
```

### Scoring factors

Each vendor is scored 0–100. Highest score wins.

| Factor | Weight | Logic |
|---|---|---|
| Partner status | 30 | `is_partner` → +30 |
| Stage fit | 25 | Parse `best_for` against `context.stage` — exact match +25, adjacent +10 |
| Infrastructure fit | 20 | Parse `best_for` against `context.infrastructure` — match +20 |
| Geography / distributor | 15 | AU/NZ + Dicker-available → +15; Ingram-available → +8; direct → +5 |
| Margin signal | 10 | Partner with `deal_label` → +10 (proxy for margin — refine when Ingram data available) |

Ties broken by: partner > higher deal value > alphabetical (deterministic).

### Implementation location

New function `scoreVendors(vendors, gap, context)` in `vendor-intelligence-builder.js`, replacing current `selectPick()`. Returns scored and ranked vendor array. `selectPick()` becomes a one-liner: `return scoreVendors(...)[0]`.

### Stage parsing

Simple keyword match against `best_for` field — no NLP required at MVP:

```js
const STAGE_KEYWORDS = {
  seed: ['seed', 'early', 'startup'],
  series_a: ['series a', 'series-a', 'growth'],
  series_b: ['series b', 'series-b', 'larger', 'complex'],
};
```

If `best_for` contains a keyword matching `context.stage`, score +25. If it contains a keyword for an adjacent stage (±1), score +10.

---

## 5. Explainability layer schema

Each gap's vendor resolution produces a `resolution_trace` object alongside the standard `vendor_intelligence` output. This is consumed by the frontend for the "why this vendor" UI and by the long-term dataset flywheel (logged per session).

### Schema

```json
{
  "gap_id": "soc2",
  "capability_id": "compliance_automation",
  "selected_vendor_id": "vanta",
  "distributor_route": "direct",
  "rules_triggered": [
    {
      "rule": "partner_status",
      "weight": 30,
      "value": true,
      "contribution": 30,
      "label": "Proof360 partner"
    },
    {
      "rule": "stage_fit",
      "weight": 25,
      "value": "exact",
      "contribution": 25,
      "label": "Seed stage match"
    },
    {
      "rule": "infrastructure_fit",
      "weight": 20,
      "value": "exact",
      "contribution": 20,
      "label": "AWS stack match"
    },
    {
      "rule": "geography_distributor",
      "weight": 15,
      "value": "direct",
      "contribution": 5,
      "label": "Direct — no distributor"
    },
    {
      "rule": "margin_signal",
      "weight": 10,
      "value": true,
      "contribution": 10,
      "label": "Deal available"
    }
  ],
  "total_score": 90,
  "evidence_links": [
    {
      "type": "partner_disclosure",
      "label": "Proof360 partner arrangement",
      "url": null
    },
    {
      "type": "vendor_data",
      "label": "Vanta G2 rating",
      "url": "https://www.g2.com/products/vanta/reviews"
    }
  ],
  "runner_up": {
    "vendor_id": "drata",
    "score": 72
  }
}
```

### Frontend rendering

The explainability output surfaces in the pick card as a collapsible "Why this pick?" section:

- Collapsed state: "Why Vanta? 5 factors matched your profile."
- Expanded state: rules_triggered rendered as labelled score bars, runner_up shown as "Drata was close — see comparison"
- Evidence links rendered as small inline citation chips below the rules

The frontend renders `resolution_trace` if present. If absent (legacy sessions), the section is hidden — no fallback copy required.

### Logging

`resolution_trace` is written to the session store alongside the existing signals object (see `session-store.js`). This becomes the long-term dataset for calibrating scoring weights. Do not log PII. Log: `session_id`, `gap_id`, `capability_id`, `selected_vendor_id`, `total_score`, `rules_triggered[]`, `distributor_route`, timestamp.

---

## What Kiro builds from this brief

1. Add `distributor` field to all entries in `vendors.js`
2. Add `geography` field to context normalisation in `context-normalizer.js`
3. Add `GAP_TO_CAPABILITY` map to `vendor-intelligence-builder.js` (or new `capability-resolver.js`)
4. Replace `selectPick()` with `scoreVendors()` implementing the 5-factor algorithm
5. Add `resolution_trace` to the vendor intelligence API response (per gap)
6. Log `resolution_trace` to session store
7. Wire `ingram-mcp-mock.js` into vendor resolution using `brief-ingram.md` (pending commit)

## What Claude Code builds from this brief

1. Capability tile component — renders `capability_id`, `display_label`, `vendor_count`, `has_partner`, `distributor` chip
2. "Why this pick?" collapsible section in the pick card — renders `rules_triggered` as score bars + `evidence_links` as citation chips
3. Runner-up comparison link ("Drata was close") — calls `sendPrompt` with vendor comparison query
4. No vendor names hardcoded. All data from API response.

---

## Compatibility notes

- `vendors.js` — additive change only. Add `distributor` field. No existing fields modified.
- `vendor-intelligence-builder.js` — `selectPick()` replaced, `buildVendorIntelligence()` gains `resolution_trace` in output. Shape of `vendor_intelligence` object is backward-compatible (additive).
- `vendor-selector.js` — no changes required from this brief.
- Frontend — new tile component and pick card section. No existing components modified.

---

## Out of scope for this brief

- Real Ingram API token (mock stays in place until token arrives)
- Distributor margin data (will feed into scoring weight refinement — Phase 2)
- Vendor review data ingestion pipeline (G2/Capterra — Phase 2)
- Capability tile animations / loading states (Claude Code to decide based on existing patterns)
