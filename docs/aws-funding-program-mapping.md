# AWS Funding Program Mapping

**Purpose:** catalogue of AWS's publicly-announced funding programs, matched to the signals proof360 already extracts. When AWS sees the report, they see a qualified funnel — which solves AWS's biggest problem (program eligibility qualification) and directly adds a commercial surface to proof360.

**Two parallel uses:**
1. **For the customer** — proof360 surfaces AWS programs the customer qualifies for. Customer sees concrete funding next to their gaps. Higher close rate.
2. **For proof360 itself** — John maps proof360 against the same programs. Multiple fits identified.

---

## Verification standard (best practice — read before citing anything here)

This catalogue feeds product output (the A18 program-eligibility evaluator and Layer 2 of the report). A wrong program name, tier, or dollar figure in front of a distributor (Ingram) or an AWS AM is a credibility hit, not a typo. Therefore:

- **Every program fact carries a `last_verified` date.** Facts are confirmed against the AWS program page or Partner Central, not memory.
- **Two confidence classes only.** A fact is either **confirmed** (in the tables below) or **`⚠ UNVERIFIED`** (quarantined in the appendix at the end). There is no middle tier.
- **Product-output gate:** the A18 evaluator and Layer 2 report may surface a program **only** if it is confirmed and `last_verified` is within 90 days. `⚠ UNVERIFIED` rows are internal planning notes and are never shown to a customer or partner.
- **Dollar figures are the highest-risk field.** Where a figure could not be confirmed, the program is kept but the figure is removed and marked, rather than guessed.

`last_verified` baseline for this pass: **2026-07-04** (facts held to the Jan 2026 knowledge cutoff; re-confirm the starred items on Partner Central before any external use).

---

## AWS program inventory (confirmed programs)

### A. Startup credits + programs (stage-based)

| Program | Target | Amount | Qualification signals |
|---|---|---|---|
| **AWS Activate Founders** | self-funded, pre-Series B | $1k credits + Developer Support | `stage < Series B` AND `has_raised_institutional: false` |
| **AWS Activate Portfolio** | VC / accelerator / incubator-backed | up to $100k credits + Business Support | `vc_portfolio_of[]` non-empty OR `accelerator_alumni_of[]` non-empty |
| **AWS Global Startup Program** | invite-only, PMF achieved, institutional funding | PDM + PSA + MDF + co-sell | `stage >= Series A` AND `has_raised_institutional: true` AND enterprise-ready signals |
| **AWS Generative AI Accelerator** | late-seed to Series A, genAI-focused | up to $1M credits/company, 8-week program, 40 startups (2025 cohort) | `sector` includes AI OR `product_type` genAI AND `stage: seed` / `Series A` |
| **AWS Generative AI Spotlight** (APJ) | pre-seed / seed with MVP, APJ | 4-week program, mentorship | `geo_market: AU` / `SG` / `Global` AND early stage |
| **AWS SaaS Spotlight** (APJ) | early-stage SaaS | 4-week program | `product_type: B2B SaaS` AND `stage: pre-seed` / `seed` |

> `last_verified: 2026-07-04` against AWS primary sources (see Sources appendix). Cohort **size** is per-intake (40 = 2025 GenAI Accelerator) — re-confirm the headcount for a new cohort; program **lengths** are stable. The prior "3-week" GenAI Spotlight figure was wrong and is corrected to 4-week.

### B. Partner programs (proof360's own path)

Terminology note: AWS **retired "Consulting Partner"** in the 2022 APN restructure. The two paths are **Software Path** (ISV — proof360's path) and **Services Path** (tiers Select / Advanced / Premier). This doc uses current terminology throughout.

| Program | Target | Value | Qualification for proof360 |
|---|---|---|---|
| **APN (Partner Network)** | foundational | free registration, tier progression | register on the **Software Path** (ISV) |
| **ISV Accelerate** | ISV partners meeting eligibility | co-sell incentives, AWS seller credit | eligibility-gated: **Software Path + FTR + a Marketplace listing (or committed) + co-sell readiness**. Not open to all. |
| **Foundational Technical Review (FTR)** | unlocks co-sell + Marketplace | validation | prerequisite for Marketplace + ISV Accelerate |
| **Marketplace Seller (Software Path)** | Marketplace listing | CPPO, private offers | **see the CPPO channel rule below — Ingram is seller-of-record for the estate's default path** |
| **APN Customer Engagements (ACE)** | co-sell pipeline management | lead flow + tracking | required for specialisation renewals |
| **AWS Specializations** (Competency / Service Ready / Qualified Software) | validated expertise | buyer trust signal | Security Competency target |
| **Well-Architected Partner Program** | WAFR delivery | see the corrected benefit note below | proof360 delivers productised Well-Architected Framework Reviews |
| **Service Delivery Program** (Security specialisation) | service expertise | deeper co-sell | target once ACE pipeline established |
| **Solution Provider Program** | reseller tier | resale margin structure | proof360 resells vendors → direct fit |
| **MDF (Marketing Development Funds)** | co-marketing funds | per-partner, unlocked by tier/specialisation | apply once tier/specialisation reached |

**Well-Architected benefit — corrected.** The Well-Architected Framework Review remediation credit (historically up to ~$5k) is a **credit to the *customer* for remediation**, administered through the partner-delivered review. It is **not** a $5k payment to proof360. proof360's benefit from delivering WAFRs is the engagement itself, the co-sell pull it creates, and progress toward Security specialisation — not review-fee revenue. Every prior "$5k funded per review to proof360" claim was wrong and is struck.

### C. Customer-funding programs (proof360 routes customers to)

| Program | Target customer | Amount | proof360 signal trigger |
|---|---|---|---|
| **Migration Acceleration Program (MAP)** | Assess / Migrate / Modernize phases | $50k – $1M+ per migration | `infrastructure: on_prem` OR `legacy_hosted` OR `multi_cloud_fragmented` |
| **POC Funding** | proof-of-concept compute | credits, AM-administered | any qualified customer with specific AWS-native path identified |
| **Enterprise Discount Program (EDP)** | high-volume AWS customers | volume discount | `aws_hosted: true` AND enterprise-tier signals |
| **Private Pricing Agreement (PPA)** | negotiated custom pricing | custom | enterprise + multi-year commitment signals |
| **Amazon Q Developer** (free tier) | all AWS customers | dev productivity | `has_github_org: true` AND active commits |

> **MAP is partner-applied and Ingram already runs MAP-qualified motions.** Route MAP through Ingram rather than standing up a solo proof360 MAP practice (see CPPO channel rule).

### D. Nonprofit / mission-driven

| Program | Target | Amount | Signal trigger |
|---|---|---|---|
| **AWS IMAGINE Grant** (US/UK/Canada/AU/NZ/Ireland) | registered nonprofits using cloud for mission | Momentum to Modernize: up to $50k unrestricted + up to $20k AWS credit; Go Further, Faster: up to $150k + up to $100k credit | `abn_entity_type: not_for_profit` (AU ACNC) OR equivalent registered charity |
| **AWS IMAGINE Children's Health Innovation Award** | pediatric healthcare nonprofits | grant + credits | `sector: healthcare` AND nonprofit status |
| **AWS Nonprofit Credit Program** | any registered nonprofit | up to $5k/year (via TechSoup; any-size eligible) | nonprofit status |
| **AWS Health Equity Initiative** | healthcare nonprofits/orgs | part of AWS's committed fund | `sector: healthcare` AND underserved population focus |
| **AWS Education Equity Initiative** | nonprofits / gov / EdTech for underrepresented learners | digital learning support | `sector: education` |
| **AWS Disaster Response** | nonprofit disaster aid | credits + support | disaster response orgs |

### E. Sector / vertical accelerators

| Program | Target | Signal trigger |
|---|---|---|
| **AWS Clean Energy Accelerator** | clean energy startups | `sector: energy` OR clean-tech keywords |
| **AWS Space Accelerator** | space industry startups | `sector: aerospace` OR space-keywords |
| **AWS Public Sector programs** | gov customers | `sector: government` OR AusTender wins |
| **AWS for Financial Services programs** | fintech / banking | `sector: fintech` OR `financial_services` |
| **AWS for Healthcare programs** | healthcare companies | `sector: healthcare` |
| **AWS for Automotive** | automotive | `sector: automotive` |
| **AWS for Manufacturing** | manufacturing | `sector: manufacturing` |
| **AWS Supply Chain** | logistics / supply chain | `sector: logistics` |
| **AWS for Media & Entertainment** | media / content | `sector: media` |
| **CrowdStrike + AWS + NVIDIA Cybersecurity Startup Accelerator** | cyber-focused startups | funding + mentorship, 8-week, 35 startups (2026 cohort) | `sector: cyber` OR security-focused startup |

### F. Data / open / sustainability

| Program | Target | Amount |
|---|---|---|
| **AWS Open Data Sponsorship** | datasets of public interest | free hosting + $ |
| **AWS Sustainability Data Initiative** | sustainability-focused data sharing | credits |

### G. Workforce

| Program | Target |
|---|---|
| **AWS re/Start** | workforce reskilling |
| **AWS Educate / AWS Academy** | education institutions |

---

## Signal → program eligibility matrix

The signals proof360 already extracts (or plans to) directly infer program eligibility. This is the cross-domain read made concrete.

| Customer signal | Programs triggered |
|---|---|
| `stage: pre-seed`, `has_raised_institutional: false` | Activate Founders ($1k) |
| `stage: pre-seed/seed`, `vc_portfolio_of[]` or `accelerator_alumni_of[]` non-empty | Activate Portfolio (up to $100k) |
| `stage: seed / Series A`, genAI/AI product | GenAI Accelerator (up to $1M credits) |
| `stage: Series A+`, `has_raised_institutional: true`, enterprise signals | Global Startup Program (invite-only) |
| `product_type: B2B SaaS`, early stage | SaaS Spotlight |
| `geo_market: AU/SG/Global`, early stage, genAI-adjacent | GenAI Spotlight (APAC) |
| `sector: healthcare`, nonprofit status | IMAGINE Children's Health Innovation, Health Equity Initiative |
| `sector: education`, nonprofit / EdTech | Education Equity Initiative |
| `abn_entity_type: not_for_profit` OR equivalent | IMAGINE Grant (up to $50k + credits, Momentum tier), Nonprofit Credit Program |
| `sector: energy` / clean-tech | Clean Energy Accelerator |
| `sector: aerospace` / space | Space Accelerator |
| `sector: government`, AusTender wins | Public Sector partner programs |
| `sector: fintech` / `financial_services` | AWS for Financial Services programs |
| `sector: cyber` / security-focused startup | CrowdStrike+AWS+NVIDIA Cybersecurity Startup Accelerator |
| `infrastructure: on_prem` / `legacy_hosted` / `multi_cloud_fragmented` | MAP Assess → Migrate (partner-led $50k-$1M+, routed via Ingram) |
| `aws_hosted: true`, enterprise-tier signals | POC Funding, EDP, PPA |
| `has_github_org: true`, active commits | Q Developer free tier |

**This matrix is a first-class routing output.** Each qualified assessment surfaces the applicable programs alongside the gap findings — subject to the product-output gate in the Verification standard above.

---

## CPPO channel rule (proposed best practice — Ingram is seller-of-record)

The estate had no written rule for who transacts AWS Marketplace, and the prior draft had proof360 registering as a direct Marketplace Seller running its own CPPO private offers for Vanta/Drata/Cloudflare/CrowdStrike/Okta. Ingram is a distributor with its own live AWS Marketplace motion (Cloud Account `1200158131`, active Marketplace API entitlement — see `ingram-micro-xvantage-field-intel-2026-05.md`). Selling CPPO directly reads to Ingram as **routing AWS Marketplace around them**, which contradicts the estate's vendor-routing doctrine (CPPO = Phase 2; vendors split direct vs Ingram).

**Proposed rule:**

1. **proof360 authors the offer** — negotiates reseller margin and the customer-facing price, and produces the private-offer economics from a confirmed gap → vendor route.
2. **Ingram is seller-of-record** — holds the AWS Marketplace seller entitlement and transacts on the customer's AWS commit. AWS co-sell attribution flows through the Ingram entitlement.
3. **Explicit per-vendor flag** — every vendor in `vendors.js` carries `aws_channel: 'ingram' | 'direct'`, defaulting to **`ingram`**. A vendor is only `direct` when proof360 holds a direct reseller/CPPO contract with that vendor (rare; contract-evidenced, not assumed).
4. **proof360-solo Marketplace Seller registration is deferred** to the point where a direct-channel vendor genuinely requires it — it is not a Phase 1 action.

This keeps proof360 additive to Ingram (author + qualify) rather than competitive (transact), which is the whole basis of the Ingram ISV gate.

---

## What this solves for AWS

AWS's biggest ongoing problem is **qualified funnel for their funding programs**. AWS sellers and partner teams spend substantial time qualifying customers for MAP, POC credits, Activate Portfolio, IMAGINE Grant etc. Each program has eligibility criteria that have to be manually assessed.

Proof360 does this qualification upstream:

- **Per assessment:** programs are inferred from structured signals, not asked of the customer
- **Pre-qualified leads fed to AWS:** customer walks into an AWS conversation with "you qualify for X and Y" already established
- **Partner attribution:** AWS attributes the pipeline to the transacting channel (ACE / Ingram entitlement)
- **Sales velocity:** AWS conversion shortens materially

If AWS sees proof360's report showing this qualification logic, the conversation stops being "why should we co-sell with you" and becomes "how fast can we plug you into ACE pipeline."

---

## What this surfaces for proof360's own funding

Proof360 = AU-headquartered, AWS-hosted, security-focused ISV, currently pre-institutional-round, self-funded, founder-led. Against the confirmed program list:

| Program | proof360 qualification status |
|---|---|
| **AWS Activate Founders ($1k)** | **✓ immediate eligibility** (self-funded, pre-Series B) |
| **AWS Activate Portfolio ($100k)** | conditional — requires VC / accelerator / incubator affiliation. Path: apply to Cicada Innovations, UTS Startups, Launch Factory, or secure an AWS-partner VC intro |
| **AWS Global Startup Program** | future — post-institutional round + enterprise-ready validation |
| **AWS Generative AI Accelerator** | strong fit — genAI substrate; application warranted |
| **AWS Generative AI Spotlight (APAC)** | immediate fit — AU-based, genAI-adjacent, MVP exists |
| **AWS SaaS Spotlight** | immediate fit — B2B SaaS, early-stage |
| **APN Partner Network (Software Path)** | **✓ register immediately** (free) |
| **ISV Accelerate** | conditional — requires FTR + a Marketplace listing (or committed) first. Not immediate. |
| **Foundational Technical Review** | required step after APN registration; unlocks Marketplace + ISV Accelerate |
| **APN Customer Engagements (ACE)** | **✓ register** (required for specialisation) |
| **Well-Architected Partner Program** | strong fit — proof360 delivers productised WAFRs (benefit = co-sell pull + specialisation progress, not review-fee revenue) |
| **Service Delivery Program (Security)** | target — requires ACE pipeline + customer references |
| **Solution Provider Program** | direct fit — proof360 resells vendors |
| **MAP** | not applicable to proof360 itself (born-on-AWS); applies via customers, routed through Ingram |
| **CrowdStrike+AWS+NVIDIA Cybersecurity Startup Accelerator** | fit — cybersecurity + AI-driven; confirm current cohort application window |

**Immediate applications (zero-cost, this week):**
1. AWS Activate Founders ($1k credits, trivial form)
2. APN Partner Network — Software Path (free)
3. ACE Program registration
4. Begin FTR preparation (gates ISV Accelerate + Marketplace)

**Near-term applications (30–90 days):**
5. GenAI Spotlight (APAC) application
6. SaaS Spotlight application
7. Well-Architected Partner Program application
8. Complete FTR → then ISV Accelerate
9. CrowdStrike+AWS+NVIDIA Cybersecurity Startup Accelerator (confirm next cohort)

**Conditional (requires events to unlock):**
10. AWS Activate Portfolio — requires accelerator/VC affiliation (apply to Cicada)
11. GenAI Accelerator — requires late-seed / Series A
12. Global Startup Program — requires institutional round
13. Service Delivery Program (Security) — requires ACE pipeline + references

---

## Proof360 report integration

Add to Layer 2 of the report a new section: **"AWS funding programs you may qualify for"**

Each program listed with:
- Name + link
- Eligibility condition matched (plain English)
- Benefit description (accurate — no invented dollar figures)
- Application CTA

Positive surface — not a gap, a funded path. Insurance-style value: customer sees their gaps + the AWS programs that fund fixing them.

**Product-output gate applies:** only confirmed rows with `last_verified` within 90 days may render here.

**Commercial kicker:** any program application John makes on behalf of a customer (POC Funding, MAP, EDP negotiation) is attributed in AWS's systems through the transacting channel (ACE / Ingram entitlement). Lead flow the other direction — AWS sellers see proof360 driving funded pipeline.

---

## Build implication

Add to `signal-source-inventory.md` signal-to-routing logic:

```
signals extracted → programs inferred → surfaced in Layer 2 report (confirmed rows only)
  ↓
  program applications submitted (channel-attributed)
  ↓
  AWS seller sees proof360 as qualified funnel source
  ↓
  reciprocal lead flow
  ↓
  partner tier progression
```

- **A18 — AWS program eligibility evaluator** — pure signal logic, no external API. Reads the context and outputs `eligible_programs[]`. Fed by all existing signals plus ABN entity type (nonprofit) and funding signals. **Must consume only confirmed rows and respect the product-output gate.**
- New `lead_type: aws_program_application` — proof360 shepherds the application through ACE / Ingram.

---

## Why this is cross-domain

The matrix reads:
- **Financial lens** (funding signals) → Activate Portfolio eligibility
- **Legal lens** (entity type) → nonprofit grants
- **Sector lens** → vertical accelerators
- **Geographic lens** → regional programs (APAC Spotlight, IMAGINE ANZ)
- **Technical lens** (infrastructure, AWS-hosted) → MAP, EDP, POC
- **Governance lens** (enterprise-ready signals) → Global Startup Program
- **Operational lens** (GitHub activity) → Q Developer, Accelerator

Every AWS program is gated on a cross-section of these lenses. Proof360 reads all of them simultaneously and resolves against the program catalogue. **That is the cross-domain superpower made a product.**

---

## Appendix — ⚠ UNVERIFIED (do not cite; confirm on Partner Central first)

Only **program names** remain quarantined — I could not confirm these against a known AWS program page, so they are not part of the confirmed catalogue and are never surfaced as product output until verified on Partner Central. (The figures that were previously here — GenAI Accelerator cohort, Spotlight durations, nonprofit credit, CrowdStrike cohort — were **verified 2026-07-04 and promoted back into the tables above**; see Sources.)

| Claimed program | Claimed benefit | Why quarantined |
|---|---|---|
| **Partner Greenfield Program (PGP)** | "multi-year co-investment + funding" | Program name not confirmed against Partner Central. |
| **Agentic AI Specialization** | "$75k MDF ($50k + $25k)" | Program + exact MDF figures unconfirmed; dollar figures struck. |
| **Marketplace Private Offer Promotion Program (MPOPP)** | "funded acceleration" | Program name not confirmed. |
| **MDF Wallets** (as a distinct named program) | "pre-loaded per-partner budget" | Fold into general MDF unless a distinct program is confirmed. |

---

## Sources — figures verified 2026-07-04 (primary AWS)

| Fact | Confirmed value | Source |
|---|---|---|
| GenAI Accelerator | 40 startups, 8-week, up to $1M credits/company (2025 cohort) | press.aboutamazon.com/aws/2025/10 — "AWS selects 40 … 2025 Generative AI Accelerator" |
| CrowdStrike+AWS+NVIDIA accel | 35 startups, 8-week (2026 cohort) | press.aboutamazon.com/aws/2026/1 — "…select 35 startups for the 2026 Cybersecurity Startup Accelerator" |
| GenAI Spotlight (APJ) | 4-week (prior "3-week" was wrong) | startups.aws.com/programs/genai-spotlight-apj |
| SaaS Spotlight (APJ) | 4-week | startups.aws.com/programs/saas-spotlight-apj |
| Nonprofit Credit Program | up to $5,000/yr, any-size eligible, via TechSoup | aws.amazon.com/government-education/nonprofits/nonprofit-credit-program/ |
| IMAGINE Grant | Momentum: $50k + up to $20k credit · Go Further Faster: $150k + up to $100k credit | aws.amazon.com/government-education/nonprofits/aws-imagine-grant-program/ |

Cohort **sizes** are per-intake — re-confirm headcount for a new cohort year. Program **lengths** and credit ceilings are stable. `last_verified: 2026-07-04`.

---

*AWS publishes these programs. Proof360's job is to surface the right ones per customer and route the application — with Ingram as seller-of-record for Marketplace/CPPO. For AWS: qualified pipeline. For the customer: funded path. For proof360: attribution + reciprocal leads. Facts before figures; confirmed before shown.*
