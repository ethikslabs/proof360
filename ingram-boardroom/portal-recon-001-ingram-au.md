# Portal Recon #001 — Ingram Micro Xvantage (AU)
*Date: 2026-06-23 · Operator: John Coates (account JC, en-au) · Mode: read-only (nothing committed) · Driver: Claude-in-Chrome*
*Access class: CONFIDENTIAL — internal pricing intelligence. Margins/terms here are for John's pricing decisions only. Never expose buy-price/margin/terms to a customer; customer-facing catalog shows SELL price only.*

## Access confirmed
Logged in live at `au.ingrammicro.com/cep/app` (Xvantage AU). Account active: 2 active subscriptions; live orders/backorders visible (PO-001, BO0441035, RN134415, SO015651); credit facility present; cart non-empty. So this is a real, transacting reseller account — the distribution access *is* the moat.

## Navigation / structure map (the recon payload)
**Top bar:** Search (keyword / VPN / IM SKU) · Quick Order (SKU entry) · Start a quote · Business insights · Favorites · Cart.

**Left nav (the spine):** Home · My business · Products · Vendors · Solutions · Services · Resources · Events · Integrations Hub · Storefront Management.

- **My business →** Quotes · Orders · Backorder Report · Subscriptions · Serial No. Search · Invoices · **View Credit** · Returns & Claims · Ingram Micro Ultra · Insights · **Cloud Reports** · **Cloud Services** · **Statement of Account** · Opportunities · End Customers.
- **Products →** full category tree: Audio Visual · Cables · Cameras & Scanners · **Cloud** · Communications · Communities · Components · Computers · Connectivity · Consumer Electronics · Displays · Gaming · Home & Appliances · Keyboard/Mouse/Input · Networking · … (+ View all).
- **Vendors / Solutions / Services / Integrations Hub / Storefront Management** — not yet drilled.

## Where each margin / term type lives (the extraction map)
| What | Where to extract | Status |
|---|---|---|
| Reseller margin (your-price vs RRP) per SKU | Products → any SKU page, or **Quick Order** (SKU box) | NOT yet pulled |
| Cloud / SaaS resale economics (AWS, Vanta, security) | My business → **Cloud Services** / **Cloud Reports**; Products → **Cloud** | NOT yet pulled |
| Credit limit & payment terms | My business → **View Credit** / **Statement of Account** | seen (facility present), values not captured |
| Vendor program tiers / rebates | **Vendors** → [vendor] | NOT yet drilled |
| Co-sell / deal registration | My business → **Opportunities** | NOT yet drilled |
| Customer base | My business → **End Customers** | NOT yet drilled |

## Honest gap (this pass)
No concrete your-price/RRP number captured. The Xvantage SPA's hover-nav intercepts cursor focus on the search box, so keyword search didn't register through the extension. **Cleaner next pass:** navigate directly to a product URL, or use **Quick Order** (accepts SKUs), or click the search input by element-ref rather than coordinate.

## Next extraction (the cup of tea)
1. One physical SKU: your-price vs RRP → first real margin-map entry.
2. **Cloud Services** → AWS / Vanta / security resale rates → grounds the Ingram boardroom economics (currently illustrative).
3. **Vendors** → the tier/rebate structure for the vendors in the ISV-ingestion play.

## Doctrine note
Read-only honoured — no order, quote, accept, or settings change. To ingest into CORPUS: this is a privileged commercial source; set access class = highest, provenance = this recon, never propagate to a customer surface.

## Update — CloudBlue cloud-reseller backend (the margin gold)
Path: Xvantage → My business → **Cloud Services** → opens **CloudBlue Commerce control panel** (`cp.au.oc.cloud.im`), logged in as John Coates, account **1200158131**.
- **AWS Consolidated** billing live (PRD-511-461-372 / TC-914-359-407, status Ready) — AWS resale capability active.
- Left nav: Reseller Authorization · Sales Channels · Marketplace API · My Partnerships · Customers · **Portfolio** · Integrations · Account.
- **Portfolio → Prices = the margin basis.** "Products that account sells… resource rate with specific MPN." **5,423 products**, each with reseller **Cost** (A$). Columns: MPN · Vendor ID · Vendor Name · Service Template/Product Line · Product · Billing Period · Subscription Period · Billing Model (BBP) · Cost. (Sample: WebSan Solutions WBS-Support tiers A$57–1,140.)
- **EXPORT button present** → entire 5,423-line cost catalog → one spreadsheet = the complete supply-side margin map in a single pull. ("Show Search" filters by vendor/product — isolate security/compliance vendors for the DD lane.)
**Recon win:** this is the real, exportable reseller-cost catalog — the supply-side margin basis for FORUM/PULSUS, sourced from privileged distribution access. Read-only honoured; nothing exported, managed, or changed.
**Next:** EXPORT the catalog (full margin map — note: a download, needs John's OK); and/or filter Prices for security/compliance/backup vendors (the trust-DD resale lane).
