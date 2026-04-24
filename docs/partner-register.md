# Partner Register

**Source of truth for proof360 commercial relationships.**

This file is the canonical record. `api/src/config/vendors.js` entries must reflect rows here.

**Owner:** John Coates. No other agent modifies commercial terms.

**Update rule:** When a relationship status changes, update this file first. `vendors.js` updates follow.

**Distributor model:** `distributors` is an **ordered array**. First entry = preferred channel. **Ingram-first default** for any vendor carried by both.

---

## Schema

| Field | Values |
|---|---|
| `agreement_status` | `signed` / `warm` / `cold` / `declined` |
| `agreement_type` | `reseller` / `msp` / `mssp` / `referral` / `partner` / `distributor` |
| `margin_band` | `high` / `mid` / `low` / `tbd` (exact % private) |
| `distributors` | ordered array of `direct` / `ingram` / `dicker` |
| `marketplace_aws_listed` | vendor has AWS Marketplace listing |
| `marketplace_aws_cosell` | active co-sell relationship (stronger than listing) |

**Pre-populated from:** public Ingram AU + Dicker AU catalogues (2026-04-23), existing `vendors.js` flags, stated facts. Blank cells = John to fill (private data: margin, contacts, dates, co-sell active status).

---

## Active register

| vendor_id | agreement_status | agreement_type | margin_band | distributors | mkt_listed | mkt_cosell | human_contact | last_touch | notes |
|---|---|---|---|---|---|---|---|---|---|
| vanta | signed | reseller | | [direct] | ✓ | | | | 20% off first year deal live |
| vanta_msp | signed | msp | | [direct] | ✓ | | | | MSP program active |
| drata | | reseller | | [direct] | ✓ | | | | 15% off deal in vendors.js |
| cloudflare | signed | partner | | [ingram, dicker] | ✓ | | | | Dicker Cloudflare live today. Ingram preferred. |
| cloudflare_mssp | warm | mssp | | [direct] | ✓ | | | | Invited to present to Cloudflare MSSP team |
| cisco_duo | signed | msp | | [ingram, dicker] | ✓ | | | | Cisco MSP covers Duo + Umbrella |
| cisco_umbrella | signed | msp | | [ingram, dicker] | | | | | Cisco MSP |
| palo_alto | signed | partner | | [ingram] | | | | | Palo Alto partner confirmed |
| fortinet | | reseller | | [ingram] | | | | | |
| sonicwall | | reseller | | [ingram, dicker] | | | | | |
| crowdstrike | | reseller | | [dicker] | ✓ | | | | |
| trellix | | reseller | | [ingram] | | | | | |
| trendmicro | | reseller | | [ingram, dicker] | | | | | |
| sophos | | reseller | | [ingram] | | | | | |
| microsoft | | reseller | | [ingram, dicker] | | | | | |
| okta | | reseller | | [direct] | ✓ | | | | |
| rsa | | reseller | | [dicker] | | | | | |
| keeper | | reseller | | [ingram] | | | | | |
| jamf | | reseller | | [ingram] | | | | | |
| nutanix | | reseller | | [ingram, dicker] | | | | | |
| veeam | | reseller | | [ingram] | | | | | |
| cohesity | | reseller | | [ingram] | | | | | |
| netapp | | reseller | | [dicker] | | | | | |
| veritas | | reseller | | [dicker] | | | | | |
| proofpoint | | reseller | | [ingram] | | | | | |
| opentext | | reseller | | [dicker] | | | | | |
| trustwave | | reseller | | [dicker] | | | | | |
| blancco | | reseller | | [ingram] | | | | | |
| austbrokers | signed | referral | | [direct] | | | | | HubSpot booking live |
| reachlx | signed | referral | | [direct] | | | | | Founder trust, 10Q free in report |
| cognitiveview | | referral | | [direct] | | | | | AI governance |
| aws_migration | signed | partner | | [ingram] | | | | | Senior Ingram AM relationship. AWS Partner status active. |
| azure_migration | warm | partner | | [dicker] | | | | | |

---

## Enable-ready — Dicker catalogue, not active today

| vendor_id | agreement_status | distributors | notes |
|---|---|---|---|
| armis | cold | [dicker] | OT/IoT/cyber asset management |
| blackberry | cold | [dicker] | Critical infra, AtHoc |
| checkpoint | cold | [dicker] | Firewall / endpoint / cloud |
| citrix | cold | [dicker] | Endpoint mgmt, secure access |
| commvault | cold | [dicker] | Backup + data protection |
| purestorage | cold | [dicker] | Storage |
| watchguard | cold | [dicker] | MSP-focused firewall / endpoint |
| cyber_aware | cold | [dicker] | White-label security awareness training, MSP play |

## Enable-ready — Ingram catalogue, not active today

| vendor_id | agreement_status | distributors | notes |
|---|---|---|---|
| acronis | cold | [ingram] | Backup / ransomware / cyber protection |
| avepoint | cold | [ingram] | M365 data governance + backup |
| gfi_software | cold | [ingram] | Email + network security |
| skyhigh | cold | [ingram] | SASE / CASB / DLP |

## Distributors as routes (not products)

| vendor_id | agreement_status | agreement_type |
|---|---|---|
| ingram | signed | distributor |
| dicker | signed | distributor |

---

## John to fill

These cells cannot be derived from public data:

1. **`margin_band`** for every active row — private commercial terms
2. **`human_contact`** — partner-side named contacts
3. **`last_touch`** — last meaningful engagement date
4. **`marketplace_aws_cosell`** — which vendors are in active co-sell (vs just listed)
5. **`agreement_status`** for blank rows — which are `signed` / `warm` / `cold`
6. **`agreement_type`** corrections where defaults don't match reality

---

## How `vendors.js` reflects this

Current `distributor: 'x'` single field → migrate to `distributors: ['x']` array.

- `distributors[0]` = preferred channel for quote + referral
- `distributors[1]`+ = fallback
- `direct` = vendor handles sale directly (no distributor)

Per `agreement_status`:
- `signed` → `is_partner: true`, `deal_label` from notes
- `warm` → `is_partner: false`, remains in catalog for routing
- `cold` → excluded from `vendors.js` catalog until progressed
- `declined` → removed or flagged with reason

---

*Last updated: 2026-04-23. Pre-populated from public catalogues + stated facts. John fills private data.*
