# Distributor Catalogues — Ingram + Dicker Data (AU, Public)

**Source:** public cybersecurity vendor pages only. No SKUs, no pricing.
**Pulled:** 2026-04-23

- Ingram: https://apacs.ingrammicro.com/en-au/solutions/technologies/security
- Dicker: https://www.dickerdata.com.au/cybersecurity-distributor

**Status today:**
- Ingram — active channel for John across multiple vendors
- Dicker — **only Cloudflare is active today.** The rest of the Dicker catalogue sits here ready to enable when those relationships activate.

---

## Ingram Micro AU — cybersecurity vendors (public)

Acronis, AvePoint, Blancco, Cisco, Fortinet, GFI Software, Microsoft, Palo Alto, Proofpoint, RackmountIT, Skyhigh Security, SonicWall, Trellix, Trend Micro, Veeam

**Categories:** Security Awareness Training, Vulnerability Management, Email Gateway + Endpoint Protection, Managed Security Services, IAM, Cloud Security, SASE, Zero Trust, Data Protection, Ransomware Protection, Security Frameworks, Web Application Security

---

## Dicker Data AU — cybersecurity vendors (public)

Armis, BlackBerry, Check Point, Cisco, Citrix, Cloudflare, Commvault, CrowdStrike, Microsoft, Nutanix, OpenText Cybersecurity, Pure Storage, RSA / SecurID / NetWitness, SonicWall, Trend Micro, Trustwave, Veritas, WatchGuard, Cyber Aware

**Categories:** Endpoint Security, Network Security, Cloud Security, Critical Infrastructure Security, Application Security, Data Security & Backup + Recovery, Cyber Security Asset Management

---

## Dual-distributor vendors (both carry)

These appear on both public pages. Routing is a choice per deal:

| Vendor | Ingram | Dicker |
|---|---|---|
| Cisco | ✓ | ✓ |
| Cloudflare | ✓ (via vendors.js tag) | ✓ (live relationship today) |
| Microsoft | ✓ | ✓ |
| SonicWall | ✓ | ✓ |
| Trend Micro | ✓ | ✓ |

---

## Cross-reference with `api/src/config/vendors.js`

### Correctly tagged

- Ingram: Blancco, Cisco (Duo + Umbrella), Fortinet, Palo Alto, Proofpoint, Trellix, Veeam
- Dicker: CrowdStrike, OpenText, RSA, Trustwave, Veritas

### Tag review required (appears on both distributors)

Currently tagged single-distributor in `vendors.js`. Multiple distributor options now visible:

- **Cloudflare** — tagged `ingram`. Live Dicker relationship. Either: flip to `dicker`, or add `distributors: ['ingram', 'dicker']` field.
- **Microsoft** — tagged `dicker`. Also on Ingram AU public page.
- **SonicWall** — tagged `dicker`. Also on Ingram AU public page.
- **Trend Micro** — tagged `dicker`. Also on Ingram AU public page.
- **Nutanix** — tagged `ingram`. Also on Dicker AU public page.

### Missing from `vendors.js` — Ingram AU, trust-relevant

- Acronis (backup / ransomware / cyber protection)
- AvePoint (M365 data governance + backup)
- GFI Software (email + network security)
- Skyhigh Security (SASE / CASB / DLP)

### Missing from `vendors.js` — Dicker AU, trust-relevant (enable-ready)

Not active today but catalogue-confirmed for when Dicker relationship expands:

- Armis (OT/IoT asset visibility, cyber asset management)
- BlackBerry (critical infrastructure, AtHoc crisis management)
- Check Point (firewall, endpoint, cloud — full Harmony/Quantum/CloudGuard suite)
- Citrix (endpoint management, secure private access, ShareFile)
- Commvault (backup, recovery, data protection)
- Pure Storage (data storage + management)
- WatchGuard (firewall, endpoint, MSP-focused)
- Cyber Aware (white-label security awareness training — MSP play)

---

## Next actions

1. John decides on distributor tag model — single field vs `distributors: []` array
2. John confirms which missing vendors are in-scope (Acronis, AvePoint, GFI, Skyhigh for Ingram; the 8 Dicker additions)
3. Partner register rows get filled for live-today vendors
4. Enable-ready vendors get register rows with `agreement_status: cold` — catalogue confirmed, no agreement yet
5. When Xvantage API key arrives, `scripts/ingram-catalogue-pull.js` runs for SKU + reseller pricing depth

---

*Ingram is the primary active channel. Dicker is Cloudflare-only live, full catalogue enable-ready. Both feed the partner register.*
