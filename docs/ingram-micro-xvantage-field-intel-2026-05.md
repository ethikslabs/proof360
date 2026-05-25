# Ingram Micro Xvantage Field Intel - May 2026

**Account:** Ethiks360 Pty Ltd  
**Ingram account number:** `401932`  
**Cloud account ID:** `1200158131`  
**Portal:** Ingram Micro Xvantage (`au.ingrammicro.com`)  
**Primary login:** `john@ethiks360.com` (JOHN COATES)  
**Captured:** May 2026  
**Sensitivity:** Confidential - authenticated Ingram Micro Xvantage account view. Do not publish without review.

## Source Note

This is an operator field-intel document from an authenticated Ingram Micro Xvantage mapping session. It records what was visible in the account and what that implies for proof360, Ethiks360, and the reseller/channel flywheel.

This is not an Ingram Micro policy source of truth. If a program rule, credit term, pricing, or eligibility requirement becomes decision-critical, verify it against current Ingram Micro guidance or the relevant Ingram account manager.

Related proof360 docs:

- `proof360/docs/partner-register.md`
- `proof360/docs/ingram-au-public-vendors.md`
- `proof360/docs/aws-partner-central-field-intel-2026-05.md`

## Quick Glossary

| Term | Plain-English meaning |
|---|---|
| Xvantage | Ingram Micro's unified partner portal for ordering, quoting, subscriptions, credit, and reporting. |
| Reseller PO number | Purchase order number assigned by the reseller, Ethiks360, when placing an order. |
| BO / RN | Order number formats observed in the portal: BO appears on monthly billing/batch orders; RN appears on renewal orders. |
| Cloud Account ID | Separate customer number for cloud subscription billing, distinct from the main reseller account number. |
| Technology solutions credit | Credit line for hardware and software purchases. |
| Cloud credit | Separate credit line for cloud subscription purchases. |
| EOM + 14 days | Payment terms: end of month plus 14 days for technology solutions purchases. |
| AU Net 30 | Payment terms: 30-day net payment for cloud purchases. |
| End Customer | Downstream customer registered in Ingram's system that Ethiks360 resells to. |
| Storefront | Ingram feature allowing resellers to give end customers a branded self-service subscription portal. |
| Integrations Hub | Ingram marketplace for connecting Xvantage to third-party tools such as CRMs, PSAs, and accounting systems. |
| CRM | Customer Relationship Management system: software for contacts, accounts, sales activity, and pipeline. |
| PSA | Professional Services Automation system: software used by service providers to manage tickets, projects, time, and billing. |
| MCP Server | Ingram Micro AI integration that uses natural language to interact with Xvantage data. MCP means Model Context Protocol: a standard way for tools and data sources to be exposed to AI agents. |
| EOFY | End of Financial Year. In Australia, this is 30 June and is relevant for tax-offset purchase windows. |
| ITAD | IT Asset Disposition: services for managing end-of-life IT equipment. |

## Critical Alerts

### Subscription expiry: June 7, 2026

The one active subscription, Marketplace API with 1 license, expires on **June 7, 2026**. Auto-renewal is on, but the renewal date is within 30 days of the capture date.

Confirm renewal will process correctly and review whether the subscription should be expanded, changed, or left as-is.

### Microsoft subscription auto-renew policy change: May 4, 2026

Microsoft subscriptions now offer three auto-renew options after purchase, rather than only on/off. Existing subscriptions will default to the prior auto-renew setting, but partners can now choose:

1. Standard auto-renew.
2. Extended service term.
3. Off.

Review renewal preferences for the active Marketplace API subscription if it is Microsoft-sourced.

### EOFY 2026: June 30 deadline

As of May 2026, Ingram Micro is actively promoting the Australian EOFY window. Eligible small business customers may be able to claim the Instant Asset Write-Off for assets under AUD 20,000 per asset purchased before **June 30, 2026**.

This is a live sales motion opportunity for Ethiks360 and B2B Loop. Verify eligibility with a qualified accountant before making customer-facing tax claims.

### Ingram Micro Experience 2026 - Sydney

| Field | Detail |
|---|---|
| Date | Wednesday, August 5, 2026 |
| Venue | International Convention Centre (ICC), Sydney |
| Action | Track registration / attendance. |

## Account Snapshot

| Area | Status | Notes |
|---|---|---|
| Reseller account | Active | Account number `401932`, Ethiks360 Pty Ltd. |
| Cloud account | Active | Cloud Account ID `1200158131`. |
| Primary contact | Set | John Coates, `john@ethiks360.com`, `0416156833`. |
| Billing address | Set | Unit 14, 1A Elizabeth Bay Road, Elizabeth Bay NSW 2011. |
| Credit - technology solutions | AUD 20,000 available | AUD 0 utilised. Terms: EOM + 14 days. Last reviewed March 24, 2025. Credit manager: Kristine Isabel Faner. |
| Credit - cloud | AUD 7,000 available | AUD 0 utilised. Terms: AU Net 30. Credit manager contact: `credit_controllers@ingrammicro.com`. |
| Total credit line | AUD 27,000 | 0 percent utilised. |
| Invoices | 0 | No open, paid, or overdue invoices. |
| Orders | Approximately 25-30 total | 3 pages x 10, all cloud, all AUD 0.00, all Completed. Pattern: monthly BO + RN renewals. |
| Quotes | 0 | No active, draft, or pending quotes. |
| Subscriptions | 1 active | Marketplace API, 1 license, Monthly/Monthly, started May 8, 2025, renews June 7, 2026, auto-renew on. |
| End customers | 1 | B2B Loop, 31-33 Buttenshaw Drive, Coledale NSW 2515. |
| Opportunities | 0 | No active sales opportunities assigned. |
| Cloud Reports | 0 | No reports created. |
| Payment methods | 0 | No credit/debit cards saved on file. |
| Storefront | Not set up | Setup wizard not started; 3 steps to activate. |
| Integrations - active | 2 | Xero active; Marketplace API active. |
| Users | 5 | See Users section. |

## Users on Account

| Name | Username | Email | Role | Status |
|---|---|---|---|---|
| John Coates | `john@ethiks360.com` | `john@ethiks360.com` | Admin | Active |
| Val Dacasin | `val@ethiks360.com` | `val@ethiks360.com` | Order and/or RMA enabled | Active |
| Sarvesh Mehta | `sarvesh@ethiks360.com` | `sarvesh@ethiks360.com` | Order and/or RMA enabled | Active |
| Kalapi Shah | `kalapi` | `kalapi@thetechnoville.com` | Order and/or RMA enabled | Active |
| IngramMicro SupportTeam | `ZD-20918379` | `dianneelise.lares@ingrammicro.com` | Admin | Active |

Review flags:

- Val Dacasin appears active in Xvantage, but workspace memory records that Val has departed. Confirm whether this account should be disabled.
- Kalapi Shah uses an external domain, `thetechnoville.com`. Confirm whether access is still intended.
- IngramMicro SupportTeam has Admin access. This appears likely to be support access from a Zendesk ticket (`ZD`), but it should be reviewed and removed if no longer needed.

## Navigation Map

### Top-level console

| Section | URL | Notes |
|---|---|---|
| Dashboard | `/cep/app/my/dashboard` | Main landing page. |
| My business | Submenu | Orders, Quotes, Subscriptions, Invoices, Credit, Reports, Opportunities, End Customers. |
| Products | Submenu | Hardware catalog by category. |
| Vendors | Submenu | 30 featured vendors plus View all. |
| Solutions | Submenu | Industry and technology solution categories. |
| Services | Submenu | Automation, Config and Staging, Financial, ITAD, Professional, Shipping, Vendor Configurators, Xvantage Platform Success. |
| Resources | `/cep/app/cms/resources` | 110 pages of resources, blogs, guides, and videos. |
| Events | `/cep/app/cms/events/landing` | No events currently scheduled in account. |
| Integrations Hub | `/cep/app/my/integrationshub` | 22 available integrations; 2 active. |
| Storefront Management | `/cep/app/my/resellermarketplace` | Not set up. |
| Account Settings | `/cep/app/my/account/accountsettings` | Profile, users, credit/debit, notifications. |

### My Business subsections

| Section | URL | Status |
|---|---|---|
| Quotes | `/cep/app/my/quotemgmt/quotelist` | 0 quotes. |
| Orders | `/cep/app/my/ordertracking/v3/ordersearch` | Approximately 25-30 orders, all cloud, all completed. |
| Backorder Report | Submenu item | Not explored. |
| Subscriptions | `/cep/app/my/subscriptions/list` | 1 active subscription. |
| Serial No. Search | Submenu item | Not explored. |
| Invoices | `/cep/app/invoice/invoicessearch` | 0 invoices. |
| View Credit | `/cep/app/my/credit` | AUD 27,000 total, 0 percent used. |
| Returns and Claims | Submenu item | Not explored. |
| Insights | Submenu item | Not explored. |
| Cloud Reports | `/cep/app/my/cloud/reports` | 0 reports created. |
| Cloud Services | External: `cp.au.oc.cloud.im` | Opens separate control panel on a different domain. |
| Statement of Account | Submenu item | Not explored. |
| Opportunities | `/cep/app/xvantage/opportunities` | 0 opportunities. |
| End Customers | `/cep/app/my/account/EndCustomerManagement` | 1 customer: B2B Loop. |
| Price and Stock Files | Submenu item | Not explored. |
| Micro Sites | Expandable submenu | Not explored. |

## Vendors

### Featured vendors visible

| Vendor | Vendor | Vendor |
|---|---|---|
| Acronis | Adesso | Adobe |
| APC by Schneider Electric | Apple | ASUS |
| AWS | Cisco | CyberPower |
| Dell Technologies | DTEN | Eaton |
| EPOS | Ergotron | Fortinet |
| HP | HPE | Incase |
| Jabra | Jamf | Lenovo |
| Logitech | Microsoft | NetApp |
| Omnissa | Palo Alto Networks | Proofpoint |
| Red Hat | TrendAI(TM) | Veeam |

## Solutions

### Industry categories

| Category |
|---|
| Education |
| Healthcare |
| Industry 4.0 |
| Retail |

### Technology categories

| Category |
|---|
| AI |
| Client solutions |
| Cloud |
| Data capture / POS |
| Data centre |
| Extended reality |
| Gaming |
| Hyperscaler Marketplaces |
| Networking / Wi-Fi |
| Pro AV + UCC |
| Security |
| Servers |
| Storage |

## Services

| Service category |
|---|
| Automation |
| Configuration and Staging |
| Financial Solutions |
| ITAD Services |
| Professional Services |
| Shipping |
| Vendor Configurators |
| Xvantage Platform Success |

## Products

Hardware catalog categories visible:

| Category | Category | Category |
|---|---|---|
| Audio Visual | Cables | Cameras and Scanners |
| Communications | Communities | Components |
| Computers | Connectivity | Consumer Electronics |
| Displays | Gaming | Home and Apps |
| Keyboard/Mouse and Input Devices | Networking | View all |

## Integrations Hub

### Active integrations

| Integration | Type | Notes |
|---|---|---|
| Xero | Financial management | Accounting sync is active. |
| Marketplace API | API integration | Active; this is also the subscription product. |

### Available integrations

22 integrations were visible, including:

| Integration | Category |
|---|---|
| MCP Server | AI / native integration |
| Salesforce CRM | CRM |
| Zoho CRM | CRM |
| HubSpot CRM | CRM |
| Microsoft Dynamics 365 CRM | CRM |
| Salesforce CPQ | Configure-price-quote |
| QuickBooks Online | Accounting |
| Dynamics 365 Business Central | Accounting / ERP |
| ConnectWise PSA | PSA |
| Rewst | Automation |
| Autotask PSA | PSA |
| Xvantage API | REST APIs |

## Order Pattern Analysis

All visible orders are cloud orders, AUD 0.00 each, and completed. The observed pattern is two orders per month:

- one BO order; and
- one RN renewal order.

This is consistent with a single monthly cloud subscription and maps directly to the one active Marketplace API subscription. No hardware or perpetual software license orders were visible.

### Sample visible orders

| Date | Order | Amount | Status |
|---|---|---|---|
| May 7, 2026 | `RN131782` | AUD 0.00 | Completed |
| April 26, 2026 | `BO0161917` | AUD 0.00 | Completed |
| April 7, 2026 | `RN130672` | AUD 0.00 | Completed |
| March 26, 2026 | `BO9883730` | AUD 0.00 | Completed |

The pattern appears to continue back approximately 15 months.

## Implications for Ethiks360 and proof360

The account is essentially a clean slate with one active cloud touchpoint. The channel infrastructure exists: credit lines, users, one end customer, active Xero integration, active Marketplace API. Commercial activation has not yet happened beyond that single subscription.

### Key gaps and opportunities

| Area | What is visible | Implication |
|---|---|---|
| Storefront | Not set up | Quick win to create a branded subscription self-service surface for B2B Loop and future customers. |
| Quotes | 0 quotes | Quoting engine exists but is unused; Cisco, Microsoft, and vendor deals can be explored through the portal. |
| Credit utilisation | AUD 27,000 available, 0 percent used | Procurement capacity exists but is idle. |
| End customers | 1 registered customer | Other customers, if any, are not represented in Ingram reporting. |
| Xero integration | Active | Invoice and order data can flow into accounting when orders begin. |
| MCP Server | Available | Potential fit for proof360 / FORUM workflows that query channel data by natural language. |
| EOFY window | Active | June 30, 2026 creates a near-term customer outreach motion for eligible purchases. |
| Subscription renewal | June 7, 2026 | Confirm auto-renewal and whether the Marketplace API subscription is still the right SKU. |

## Recommended Next Actions

### Account hygiene

- [ ] Review and disable departed or unnecessary users.
- [ ] Confirm whether IngramMicro SupportTeam Admin access is still required.
- [ ] Confirm whether Kalapi Shah's external-domain access is still required.
- [ ] Confirm Marketplace API subscription renewal before June 7, 2026.

### Commercial activation

- [ ] Set up Storefront Management for B2B Loop and future customers.
- [ ] Create first quote in Xvantage to test the quote-to-order workflow.
- [ ] Register any additional end customers before quoting or transacting.
- [ ] Use the EOFY window for a B2B Loop outreach motion before June 30, 2026.
- [ ] Attend or track Ingram Micro Experience 2026 in Sydney on August 5, 2026.

### proof360 / FORUM integration

- [ ] Treat Ingram account state as a proof360 vendor-route signal, not as public policy truth.
- [ ] Evaluate Xvantage API and MCP Server for a future FORUM source adapter.
- [ ] Map Ingram vendors to proof360 gap-closing vendors in `partner-register.md`.
- [ ] Keep Xero integration read-only from the agent side; financial systems remain advisory-only unless John explicitly handles the change.

## Strategic Readout

Ingram Xvantage is already structurally ready for the Ethiks360 reseller flywheel. The missing piece is activation:

1. Clean up account access.
2. Confirm the active Marketplace API subscription.
3. Stand up Storefront.
4. Register customers.
5. Start quoting.
6. Use proof360 to identify the customer need, then route the transaction through Ingram where the vendor and margin path fit.

The strongest product insight is that proof360 should not just say "you need Cisco, Microsoft, Veeam, Cloudflare, or Palo Alto." It should know whether Ethiks360 has a live channel route, whether the customer is registered, whether credit capacity exists, whether a quote can be created, and what the next human action is.
