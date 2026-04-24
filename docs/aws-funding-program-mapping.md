# AWS Funding Program Mapping

**Purpose:** catalogue of AWS's publicly-announced funding programs, matched to the signals proof360 already extracts. When AWS sees the report, they see a qualified funnel — which solves AWS's biggest problem (program eligibility qualification) and directly adds a commercial surface to proof360.

**Two parallel uses:**
1. **For the customer** — proof360 surfaces AWS programs the customer qualifies for. Customer sees concrete funding next to their gaps. Higher close rate.
2. **For proof360 itself** — John maps proof360 against the same programs. Multiple fits identified.

**Source recency:** programs pulled from AWS publications, APN Blog (re:Invent 2025), AWS Startups page, IMAGINE Grant pages, Global Startup Program page — all 2026-current.

---

## AWS program inventory (published programs)

### A. Startup credits + programs (stage-based)

| Program | Target | Amount | Qualification signals |
|---|---|---|---|
| **AWS Activate Founders** | self-funded, pre-Series B | $1k credits + Developer Support | `stage < Series B` AND `has_raised_institutional: false` |
| **AWS Activate Portfolio** | VC / accelerator / incubator-backed | up to $100k credits + Business Support | `vc_portfolio_of[]` non-empty OR `accelerator_alumni_of[]` non-empty |
| **AWS Global Startup Program** | invite-only, PMF achieved, institutional funding | PDM + PSA + MDF + co-sell | `stage >= Series A` AND `has_raised_institutional: true` AND enterprise-ready signals |
| **AWS Generative AI Accelerator** | late-seed to Series A, genAI-focused | up to $1M credits, 8-week program, 40 startups globally | `sector` includes AI OR `product_type` genAI AND `stage: seed` / `Series A` |
| **AWS Generative AI Spotlight** (APAC/Japan) | pre-seed / seed with MVP, APAC | 3-week program, mentorship | `geo_market: AU` / `SG` / `Global` AND early stage |
| **AWS SaaS Spotlight** | early-stage SaaS | 4-week program | `product_type: B2B SaaS` AND `stage: pre-seed` / `seed` |

### B. Partner programs (proof360's own path)

| Program | Target | Value | Qualification for proof360 |
|---|---|---|---|
| **APN (Partner Network)** | foundational | free registration, tier progression | register as ISV + Consulting Partner |
| **Partner Greenfield Program (PGP)** (new 2026) | migration / modernization / genAI / security practice | multi-year co-investment + funding | proof360 = security practice fit |
| **ISV Accelerate** (opened to all in 2024) | ISV partners | co-sell incentives, AWS seller credit | proof360 is an ISV → direct fit |
| **Foundational Technical Review (FTR)** | unlocks co-sell + funding | validation | prerequisite for Marketplace |
| **Marketplace Seller (Software Path)** | Marketplace listing | CPPO, private offers | proof360 lists its vendors via CPPO |
| **APN Customer Engagements (ACE)** | co-sell pipeline management | lead flow + tracking | mandatory for specialisation renewals |
| **AWS Specializations** (Competency / Service Ready / Qualified Software) | validated expertise | buyer trust signal | Security Competency target |
| **Well-Architected Partner Program** | WA Review delivery | **$5k funded per qualified review** | **proof360 is a productised WA Review** |
| **Service Delivery Program** (Security specialisation) | service expertise | deeper co-sell | target once ACE pipeline established |
| **Agentic AI Specialization** (new 2026) | AI agent building | **$75k MDF total** ($50k + $25k) | pentad + VECTOR narrative = fit |
| **Solution Provider Program** | reseller tier | resale margin structure | proof360 resells vendors → direct fit |
| **MDF Wallets** (new 2026) | pre-loaded marketing dev funds | per-partner budget | unlocked via specialisations |
| **Marketplace Private Offer Promotion Program (MPOPP)** (new 2026) | accelerate startup private offer wins | funded acceleration | proof360 + CPPO vendors |

### C. Customer-funding programs (proof360 routes customers to)

| Program | Target customer | Amount | proof360 signal trigger |
|---|---|---|---|
| **Migration Acceleration Program (MAP)** | Assess / Migrate / Modernize phases | $50k – $1M+ per migration | `infrastructure: on_prem` OR `legacy_hosted` OR `multi_cloud_fragmented` |
| **POC Funding** | proof-of-concept compute | credits, AM-administered | any qualified customer with specific AWS-native path identified |
| **Enterprise Discount Program (EDP)** | high-volume AWS customers | volume discount | `aws_hosted: true` AND enterprise-tier signals |
| **Private Pricing Agreement (PPA)** | negotiated custom pricing | custom | enterprise + multi-year commitment signals |
| **Amazon Q Developer** (free tier) | all AWS customers | dev productivity | `has_github_org: true` AND active commits |

### D. Nonprofit / mission-driven

| Program | Target | Amount | Signal trigger |
|---|---|---|---|
| **AWS IMAGINE Grant** (US/UK/Canada/AU/NZ/Ireland) | registered nonprofits using cloud for mission | unrestricted funding + AWS credits + technical support (up to $50k + credits per Momentum to Modernize award) | `abn_entity_type: not_for_profit` (AU ACNC) OR equivalent registered charity |
| **AWS IMAGINE Children's Health Innovation Award** | pediatric healthcare nonprofits | grant + credits | `sector: healthcare` AND nonprofit status |
| **AWS Nonprofit Credit Program** | any registered nonprofit | up to $5k credits/year | nonprofit status |
| **AWS Health Equity Initiative** | healthcare nonprofits/orgs | part of $60M commitment | `sector: healthcare` AND underserved population focus |
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
| **AWS Defense & Space** | defence industry | `sector: defence` (new gap trigger required) |
| **AWS for Automotive** | automotive | `sector: automotive` |
| **AWS for Manufacturing** | manufacturing | `sector: manufacturing` |
| **AWS Supply Chain** | logistics / supply chain | `sector: logistics` |
| **AWS for Media & Entertainment** | media / content | `sector: media` |
| **CrowdStrike + AWS + NVIDIA Cybersecurity Startup Accelerator** | cyber-focused startups | 8-week program, 35 startups, funding + mentorship + pitch day at RSAC |

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
| `stage: seed / Series A`, genAI/AI product | GenAI Accelerator ($1M credits) |
| `stage: Series A+`, `has_raised_institutional: true`, enterprise signals | Global Startup Program (invite-only) |
| `product_type: B2B SaaS`, early stage | SaaS Spotlight |
| `geo_market: AU/SG/Global`, early stage, genAI-adjacent | GenAI Spotlight (APAC) |
| `sector: healthcare`, nonprofit status | IMAGINE Children's Health Innovation, Health Equity Initiative |
| `sector: education`, nonprofit / EdTech | Education Equity Initiative |
| `abn_entity_type: not_for_profit` OR equivalent | IMAGINE Grant (up to $50k + credits), Nonprofit Credit ($5k/yr) |
| `sector: energy` / clean-tech | Clean Energy Accelerator |
| `sector: aerospace` / space | Space Accelerator |
| `sector: government`, AusTender wins | Public Sector partner programs |
| `sector: fintech` / `financial_services` | AWS for Financial Services programs |
| `sector: cyber` / security-focused startup | CrowdStrike+AWS+NVIDIA Cybersecurity Startup Accelerator |
| `infrastructure: on_prem` / `legacy_hosted` / `multi_cloud_fragmented` | MAP Assess → Migrate (partner-led $50k-$1M+) |
| `aws_hosted: true`, enterprise-tier signals | POC Funding, EDP, PPA |
| `has_github_org: true`, active commits | Q Developer free tier |

**This matrix is a first-class routing output.** Each qualified assessment surfaces the applicable programs alongside the gap findings.

---

## What this solves for AWS

AWS's biggest ongoing problem is **qualified funnel for their funding programs**. AWS sellers and partner teams spend substantial time qualifying customers for MAP, POC credits, Activate Portfolio, IMAGINE Grant etc. Each program has eligibility criteria that have to be manually assessed.

Proof360 does this qualification upstream:

- **Per assessment:** programs are inferred from structured signals, not asked of the customer
- **Pre-qualified leads fed to AWS:** customer walks into an AWS conversation with "you qualify for X and Y" already established
- **Partner attribution:** AWS attributes the pipeline to proof360 (APN, ACE)
- **Sales velocity:** AWS conversion shortens materially

If AWS sees proof360's report showing this qualification logic, the conversation stops being "why should we co-sell with you" and becomes "how fast can we plug you into our ACE pipeline and fund your MDF."

---

## What this surfaces for proof360's own funding

Proof360 = AU-headquartered, AWS-hosted, security-focused ISV, currently pre-institutional-round, self-funded, founder-led. Against the program list:

| Program | proof360 qualification status |
|---|---|
| **AWS Activate Founders ($1k)** | **✓ immediate eligibility** (self-funded, pre-Series B) |
| **AWS Activate Portfolio ($100k)** | conditional — requires VC / accelerator / incubator affiliation. Path: apply to Cicada Innovations, UTS Startups, Launch Factory, or secure AWS-partner VC intro |
| **AWS Global Startup Program** | future — post-institutional round + enterprise-ready validation |
| **AWS Generative AI Accelerator** | **strong fit** — VECTOR/pentad is genAI substrate, application warranted |
| **AWS Generative AI Spotlight (APAC)** | **immediate fit** — AU-based, genAI-adjacent, MVP exists |
| **AWS SaaS Spotlight** | immediate fit — B2B SaaS, early-stage |
| **APN Partner Network** | **✓ register immediately** (free) |
| **Partner Greenfield Program** | **strong fit** — security practice |
| **ISV Accelerate** | **✓ register** (opened to all) |
| **Foundational Technical Review** | required step after APN registration |
| **Marketplace Seller** | **✓ register immediately** (free) → unlocks CPPO |
| **APN Customer Engagements (ACE)** | **✓ register** (required for specialisation) |
| **Well-Architected Partner Program** | **load-bearing** — proof360 IS a productised WA Review |
| **Service Delivery Program (Security)** | target — requires ACE pipeline + customer references |
| **Agentic AI Specialization** | **$75k MDF fit** — pentad + VECTOR narrative aligned |
| **Solution Provider Program** | **direct fit** — proof360 resells vendors |
| **MAP** | not applicable to proof360 itself (proof360 is born-on-AWS); applies via customers |
| **CrowdStrike+AWS+NVIDIA Cybersecurity Startup Accelerator** | **exact fit** — 35-startup cohort, cybersecurity, AI-driven, mentorship + funding + RSAC pitch day |

**Immediate applications (zero-cost, this week):**
1. AWS Activate Founders ($1k credits, trivial form)
2. APN Partner Network (free)
3. ISV Accelerate registration
4. Marketplace Seller registration
5. ACE Program registration

**Near-term applications (30–90 days):**
6. GenAI Spotlight (APAC) application
7. SaaS Spotlight application
8. Well-Architected Partner Program application
9. Agentic AI Specialization validation
10. Partner Greenfield Program — Security practice application
11. CrowdStrike+AWS+NVIDIA Cybersecurity Startup Accelerator (next cohort application)

**Conditional (requires events to unlock):**
12. AWS Activate Portfolio — requires accelerator/VC affiliation (apply to Cicada)
13. GenAI Accelerator — requires late-seed / Series A
14. Global Startup Program — requires institutional round
15. Service Delivery Program (Security) — requires ACE pipeline + references

---

## Proof360 report integration

Add to Layer 2 of the report a new section: **"AWS funding programs you may qualify for"**

Each program listed with:
- Name + link
- Eligibility condition matched (plain English)
- Benefit amount
- Application CTA

Positive surface — not a gap, a funded path. Insurance-style value: customer sees their gaps + the AWS programs that fund fixing them.

**Commercial kicker:** any program application John makes on behalf of a customer (POC Funding, MAP, EDP negotiation) is partner-attributed in AWS's systems. Lead flow the other direction — AWS sellers see proof360 driving funded pipeline.

---

## Build implication

Add to `signal-source-inventory.md` signal-to-routing logic:

```
signals extracted → programs inferred → surfaced in Layer 2 report
  ↓
  program applications submitted (partner-attributed)
  ↓
  AWS seller sees proof360 as qualified funnel source
  ↓
  reciprocal lead flow
  ↓
  partner tier progression
```

Add to `brief-signal-pipeline.md` Phase 1:
- **A18 — AWS program eligibility evaluator** — pure signal logic, no external API. Reads the context and outputs `eligible_programs[]` array. Fed by all existing signals plus ABN entity type (for nonprofit) and funding signals (#35–45).

Add to Track A routing outcomes:
- New `lead_type: aws_program_application` — proof360 shepherds the AWS program application through APN/ACE

---

## Why this is cross-domain

The matrix above reads:
- **Financial lens** (funding signals) → Activate Portfolio eligibility
- **Legal lens** (entity type) → nonprofit grants
- **Sector lens** → vertical accelerators
- **Geographic lens** → regional programs (APAC Spotlight, IMAGINE ANZ)
- **Technical lens** (infrastructure, AWS-hosted) → MAP, EDP, POC
- **Governance lens** (enterprise-ready signals) → Global Startup Program
- **Operational lens** (GitHub activity) → Q Developer, Accelerator

Every AWS program is gated on a cross-section of these lenses. Proof360 is the only surface that reads all of them simultaneously and resolves against the program catalogue. **That is the cross-domain superpower made a product.**

---

*AWS publishes these programs. Proof360's job is to surface the right ones per customer and route the application. For AWS: qualified pipeline. For the customer: funded path. For proof360: partner attribution + reciprocal leads + multiple program applications for itself.*
