# AWS Motion Inventory — What AWS Wants to Sell

**Purpose:** catalogue of AWS services + programs AWS actively pushes through partners. Proof360 routing and vendor catalogue map against these for maximum co-sell leverage.

**Operating law (Round 4):** every decision strengthens AWS alignment or is neutral. AWS hard-code.

**Verification standard:** this doc shares the fact-discipline of `aws-funding-program-mapping.md` — confirmed facts only in the tables; unverified program names/figures are struck, not guessed. AI routing is **Bedrock-direct** (no VECTOR — retired 2026-07-03). Sector/signal detection is the estate recon pipeline (readability + jsdom), **not** Firecrawl (banned).

---

## Services AWS actively pushes (in priority order for proof360)

### A. AWS-native security services

AWS wants partners selling these because every gap closed with AWS-native = customer AWS bill grows, zero vendor competition.

| Service | What it closes | proof360 mapping | Current state in `vendors.js` |
|---|---|---|---|
| GuardDuty | threat detection | `edr`, `threat_detection` | not in catalog |
| Security Hub | compliance aggregator | `soc2`, `compliance`, `essential_eight`, `incident_response` | ✓ `aws_security_hub` |
| Inspector | vulnerability scanning | `unpatched_critical_cves` (new), `endpoint_protection` | not in catalog |
| Macie | data discovery + classification | `data_sensitivity`, PII detection | not in catalog |
| WAF | web app firewall | `waf`, `network_perimeter`, `security_headers`, `dmarc` | ✓ `aws_waf` |
| Shield / Shield Advanced | DDoS protection | `ddos` | not in catalog |
| IAM Identity Center | SSO + MFA | `mfa`, `sso`, `identity` | ✓ `aws_iam_identity_center` |
| Config | compliance state + drift | `compliance` | not in catalog |
| Audit Manager | compliance automation | `soc2`, `hipaa_security`, `pci_dss`, `apra_prudential` | not in catalog (overlaps Vanta) |
| Detective | investigation | `incident_response` | not in catalog |
| Network Firewall | VPC perimeter | `network_perimeter`, `firewall` | not in catalog |
| Verified Access | zero-trust app access | `zero_trust`, `sso` | not in catalog |
| Verified Permissions | authorization | `identity` | not in catalog |
| Certificate Manager (ACM) | TLS | `tls_configuration` | not in catalog |
| Secrets Manager / Parameter Store | secrets | `exposed_secrets` | not in catalog |
| KMS | encryption | — | not in catalog |
| Backup | data resilience | `backup`, `recovery` | ✓ `aws_backup` |
| CloudTrail | audit | `audit_trail`, `compliance` | not in catalog |

**Action:** add the missing AWS-native entries to `vendors.js` with `aws_native: true`, `aws_channel: 'direct'` (AWS-native = billed on AWS commit, no separate Marketplace CPPO listing). Each gap's routing picks AWS-native FIRST when customer is AWS-hosted.

### B. AWS AI stack (generative AI is AWS's #1 push right now)

Highest funding, most AM attention, easiest POC credits.

| Service | Purpose | proof360 use |
|---|---|---|
| Bedrock | foundation model API (Claude, Titan, Llama, Mistral) | **proof360's primary inference route (Bedrock-direct) when customer is AWS-hosted** |
| Bedrock Knowledge Bases | RAG | sovereign customer VERITAS backing |
| Bedrock Guardrails | safety rails | AI governance gap vendor |
| Bedrock Agents | agentic workflows | pentad-in-customer-VPC play |
| SageMaker | ML platform | data-sensitive customer training |
| Amazon Q | enterprise assistant | customer-facing trust assistant |
| Amazon Q Developer | dev productivity | internal / not routing-relevant |

**Action:** new vendor entry `aws_bedrock` with `closes: ['ai_governance', 'ai_risk']` as the AWS-native alternative to CognitiveView for AWS customers. Inference is already Bedrock-direct across the estate; the vendor catalog catches up.

### C. Migration Acceleration Program (MAP)

Massive $$. AWS funds migrations at scale. Partner-led MAP deals receive funding ranging from $50k (small workloads) to $1M+ (large enterprise migrations).

| Motion | proof360 mapping |
|---|---|
| MAP Assess (discovery) | proof360 assessment itself counts as MAP Assess input |
| MAP Migrate (execution) | `migration_to_aws` lead type → routed to a MAP-qualified partner |
| MAP Modernize (post-migration) | follow-on motion, re-assess post-migration |

**Action:** in the partner register, flag `aws_migration` with MAP qualification status. **Ingram already runs MAP-qualified motions — route MAP through Ingram rather than building a proof360-solo MAP practice.** MAP funding is partner-applied, not customer-applied.

**Qualification path:** driving MAP deals requires a partner on the **Services Path** with MAP qualification (the old "Consulting Partner" tier naming was retired by AWS in 2022). For proof360's own path, APN Software Path registration is free; ISV co-sell requires FTR + Marketplace listing first.

### D. AWS Marketplace CPPO — Ingram is seller-of-record (see channel rule)

CPPO (Channel Partner Private Offers) is high-leverage, but **Ingram is a distributor with its own live AWS Marketplace entitlement** (Cloud Account `1200158131`, active Marketplace API — see `ingram-micro-xvantage-field-intel-2026-05.md`). proof360 running CPPO directly reads as routing Marketplace *around* Ingram, which breaks the Ingram ISV gate. The estate rule (also written in `aws-funding-program-mapping.md`):

| CPPO capability | proof360 use (through Ingram) |
|---|---|
| Private offers with custom pricing | **proof360 authors** the offer + reseller margin; customer sees their negotiated price |
| Seller-of-record + AWS commit billing | **Ingram transacts** on the customer's AWS commit; AWS attribution flows through Ingram's entitlement |
| Flexible payment schedules | annual/multi-year, AWS-committed spend |
| Metered billing via MMS | proof360 + Metronome emit usage events |

**Channel rule:** every vendor carries `aws_channel: 'ingram' | 'direct'`, defaulting to **`ingram`**. `direct` only when proof360 holds a direct reseller/CPPO contract with that vendor (contract-evidenced). Candidate CPPO vendors (all default `ingram` unless a direct contract exists):

1. Vanta (listed, 20% off deal)
2. Drata (listed, 15% off)
3. Cloudflare (listed)
4. CrowdStrike (listed)
5. Okta (listed)

**proof360-solo Marketplace Seller registration is deferred** — not a Phase 1 action. Phase 1 is: author offers, qualify leads, route the transaction to Ingram.

### E. Well-Architected Review Partner Program

AWS Well-Architected Framework Review (WAFR) = AWS's formal trust/quality assessment. Six pillars: Operational Excellence, Security, Reliability, Performance, Cost Optimisation, Sustainability.

**Proof360 is already a productised Well-Architected Review for trust posture.** Formalising this lets proof360 deliver partner WAFRs.

| WA pillar | proof360 coverage |
|---|---|
| Security | ✓ core of proof360 |
| Cost Optimisation | ✓ via PULSUS/Metronome instrumentation |
| Reliability | partial — recon covers TLS, DNS, infra breadth |
| Operational Excellence | partial — GitHub crawl, content cadence |
| Performance | not covered |
| Sustainability | not covered |

**Benefit — stated correctly:** the WAFR remediation credit (historically up to ~$5k) is a **credit to the *customer* for remediation**, delivered through the partner review — **not** a fee paid to proof360. proof360's benefit is the engagement, the co-sell pull, and progress toward Security specialisation.

**Action:**
- Apply for Well-Architected Partner status
- Each proof360 full report maps to a partner-delivered WAFR (Security + Cost pillars)
- Use WAFRs to pull customers into AWS-native remediation (customer gets the remediation credit)
- Complements proof360 revenue via the underlying engagement, not review fees

### F. Industry vertical services

| Vertical | AWS service | Trigger condition | proof360 routing |
|---|---|---|---|
| Healthcare | HealthLake, Comprehend Medical, HealthOmics | `sector: healthcare` OR `data_sensitivity: Healthcare data` | new gap `healthcare_data_platform` |
| Financial | FinSpace, Payment Cryptography, Clean Rooms for FSI | `sector: fintech` OR `financial_services` | new gap `fsi_data_platform` |
| Public Sector | GovCloud | `sector: government` OR `geo_market: AU` gov-adjacent | sovereign deploy path |
| Retail / CPG | Personalize, Forecast, Location Service | `sector: ecommerce` OR retail signals | future |
| Manufacturing | IoT TwinMaker, Lookout for Equipment | not proof360-aligned yet | future |
| Media | MediaLive, MediaConvert | not proof360-aligned | future |

**Action:** vertical gaps trigger industry-specific AWS service routing. Healthcare and financial are the strongest proof360 fits (sector detected via the recon pipeline).

### G. Multi-account governance

| Service | What it closes |
|---|---|
| Organizations | account structure gaps |
| Control Tower | account governance |
| IAM Identity Center (cross-account) | `sso`, `mfa` at scale |
| Config Aggregator | compliance across accounts |
| CloudTrail (Organization trail) | audit across accounts |
| Resource Access Manager | cross-account resource sharing |

**Action:** new gap `aws_multi_account_governance` (triggered by AWS-hosted + enterprise customer_type + stage ≥ Series A). Routes to Control Tower setup as an AWS-native consulting motion.

### H. Data / analytics

| Service | Proof360 relevance |
|---|---|
| Redshift | large-data customer analytics — not core |
| Glue / Lake Formation | data catalog — not core |
| Athena | already implicit (CUR queries) |
| **Clean Rooms** | **data collaboration — aligns with VERITAS tenant corpus model** |
| Data Exchange | third-party data marketplace — future for selling signal feeds |

**Action:** Data Exchange is a future lever — proof360's aggregated signals corpus could be listed for sale to insurance / risk platforms. Deferred.

---

## Programs AWS funds partners through

| Program | Funding shape | Proof360 applicability |
|---|---|---|
| **MAP** (Migration Acceleration Program) | $50k-$1M+ per migration deal | direct — `migration_to_aws`, routed via Ingram |
| **POC Funding** | AWS credits for customer proof-of-concepts | immediate — every proof360 assessment that leads to AWS-native fix |
| **MDF** (Marketing Development Funds) | co-marketing dollars | apply once tier/specialisation reached |
| **ISV Accelerate** | co-sell for ISV solutions | conditional — requires FTR + Marketplace listing first |
| **Solution Provider Program** | reseller tier | direct — proof360 resells vendors |
| **Service Delivery Program** | specialisation (Security, Migration, etc.) | target Security specialisation |
| **Well-Architected Partner** | customer remediation credit per WAFR (not partner fee) | direct — proof360 delivers productised WAFRs |
| **Public Sector Partner** | GovCloud + public sector | sovereign deploy story |
| **Marketplace Seller** | zero funding, access to CPPO | deferred — Ingram is seller-of-record |
| **Co-sell program** | AWS seller brings partner into deals | available once in co-sell-ready state (post-FTR) |

---

## Ranking by proof360 commercial fit

**Tier 1 — Activate immediately (zero cost, immediate leverage):**
1. Add missing AWS-native security services to `vendors.js` (GuardDuty, Macie, Shield, Config, Audit Manager, Detective, Network Firewall, ACM, Secrets Manager, CloudTrail) — `aws_native: true`, `aws_channel: 'direct'`
2. APN Partner registration (Software Path)
3. ACE registration; begin FTR preparation (gates ISV Accelerate + Marketplace)

**Tier 2 — Activate within 90 days:**
4. MAP Assess qualification via Ingram → `migration_to_aws` converts to MAP-funded deals
5. Well-Architected Partner application
6. `aws_bedrock` vendor entry for AWS-hosted customers (inference already Bedrock-direct)
7. POC funding applications for first 3-5 qualified customer proof-of-concepts
8. Complete FTR → CPPO offers authored by proof360, transacted through Ingram

**Tier 3 — Longer horizon:**
9. Service Delivery Program — Security specialisation
10. Industry vertical routing (healthcare → HealthLake, financial → FinSpace)
11. Control Tower multi-account routing
12. Data Exchange listing for aggregated signals corpus (Track C territory)

---

## What this changes in `vendors.js`

Expansion list once the partner register confirms:

```
aws_guardduty, aws_macie, aws_shield, aws_config, aws_audit_manager,
aws_detective, aws_network_firewall, aws_verified_access,
aws_acm, aws_secrets_manager, aws_kms, aws_cloudtrail,
aws_bedrock, aws_control_tower, aws_healthlake, aws_finspace
```

All tagged `aws_native: true`, `aws_channel: 'direct'` (AWS-native = AWS bill, no separate Marketplace CPPO listing). Third-party CPPO vendors carry `aws_channel: 'ingram'` by default.

---

## Strategic implication

Every gap proof360 detects should have **AWS-native as the first routing consideration** when customer is AWS-hosted. This does three things:

1. **Maximises AWS account visibility** — customer's AWS bill grows through proof360 attribution
2. **Unlocks co-sell** — AWS sellers fund deals when partner routes into AWS-native
3. **Justifies premium margin** — AWS-native routing = AWS-funded = customer sees no additional cost + partner keeps margin

Current vendor catalog has 4 AWS-native entries. This expansion adds ~15 more. Every major gap gets an AWS-native path + a vendor path. Customer chooses. Partner margin logic handles either. Third-party transactions route through Ingram per the CPPO channel rule.

---

## Plug points

- `signal-source-inventory.md` → signals drive gaps → gaps route to vendors (AWS-native first when `is_cloud_hosted + cloud_provider === 'AWS'`)
- `brief-track-a.md` → `marketplace_cosell` lead type is first-class routing; this doc explains why
- `partner-register.md` → AWS-native services: distributor `[direct]`, `aws_channel: 'direct'`; third-party CPPO: `aws_channel: 'ingram'`
- `aws-funding-program-mapping.md` → the CPPO channel rule + verification standard are shared with this doc

---

*AWS wants to sell: its security services, its AI stack (Bedrock), migrations (MAP), Marketplace CPPO, Well-Architected Reviews, vertical services, multi-account governance. Proof360 aligns against all of them — Bedrock-direct for AI, Ingram as seller-of-record for Marketplace.*

---

## Account footprint maximisation (perception play)

Spin up every AWS service that's free or sub-$10/mo and relevant. AWS internal reports track service breadth per account. Breadth = "mature AWS customer" = different conversation with AM, Solutions Architect, co-sell team, WA reviewer.

### Target: 25+ AWS services active in account for ~$50/mo incremental.

### Security pillar (feeds WA Review Security pillar directly)

| Service | Purpose | Cost |
|---|---|---|
| GuardDuty | threat detection | $4-10/mo |
| Security Hub | compliance aggregator | $2-5/mo |
| Inspector | vuln scanning (EC2 + ECR + Lambda) | tiny at this volume |
| Macie | data classification | tiny, can pause |
| IAM Access Analyzer | over-permissioned role detection | free |
| Config | resource config history + rules | $2-5/mo |
| CloudTrail | audit events | free (mgmt events) |
| Certificate Manager (ACM) | TLS certs | free |
| Secrets Manager (or Parameter Store) | credentials | $0.40/secret or free |
| KMS | encryption keys | <$1 per key/mo |
| Audit Manager | compliance automation | free tier adequate |
| Detective | investigation | free tier |
| Trusted Advisor | cost + security + performance checks | free basic |

### Operational Excellence pillar

| Service | Purpose | Cost |
|---|---|---|
| CloudWatch Logs + Metrics + Alarms | already planned | free tier |
| CloudWatch Synthetics canary | multi-region proof360.au uptime | ~$1.50/mo |
| CloudWatch Application Signals | auto service map + SLOs | free tier |
| CloudWatch Container Insights | ECS Fargate observability | ~$1.50/container |
| X-Ray | distributed tracing | ~$5 per million traces |
| AWS Systems Manager | patch + run command + session manager | free |
| AWS Chatbot | Slack integration for alerts | free |
| AWS Health Dashboard | AWS outage awareness | free |
| AWS Well-Architected Tool | formal WA reviews | free |

### Cost Optimisation pillar

| Service | Purpose | Cost |
|---|---|---|
| Cost Explorer | visualisation | free |
| Cost & Usage Report (CUR) to S3 + Athena | hourly billing detail | S3 cost only |
| Budgets | threshold alerts | free |
| Cost Anomaly Detection | ML spend alerts | free |
| Compute Optimizer | right-sizing recs | free |
| Cost Categories | business-dimension grouping | free |

### Reliability pillar

| Service | Purpose | Cost |
|---|---|---|
| AWS Backup | centralised backup | minimal |
| Route 53 (health checks) | DNS + failover | per-zone cost |
| Systems Manager (automation) | runbooks | free |
| RDS Multi-AZ (planned) | DB HA | adds to RDS cost |

### Sustainability pillar

| Service | Purpose | Cost |
|---|---|---|
| Customer Carbon Footprint Tool | sustainability report in Billing console | free |
| Graviton-based instances (where available) | lower-carbon compute | neutral or cheaper |

### Performance pillar

| Service | Purpose | Cost |
|---|---|---|
| CloudFront (already front of proof360.au) | CDN | per-GB |
| Application Signals | performance SLOs | free tier |
| X-Ray | latency traces | as above |

### Governance / multi-account (future, but cheap to enable)

| Service | Purpose | Cost |
|---|---|---|
| AWS Organizations | multi-account structure | free |
| IAM Identity Center | SSO across accounts | free |
| Control Tower | account governance | free to enable |

### AI / future surface

| Service | Purpose | Cost |
|---|---|---|
| Bedrock | primary inference route (Bedrock-direct) for AWS customers | per-token |
| Bedrock Knowledge Bases | RAG for VERITAS sovereign deploy | storage + embeddings |
| Bedrock Guardrails | AI safety rails | minimal |
| Amazon Q Developer | dev productivity | free tier |

### What this does to the AWS account report

- **Services in use:** jumps from ~3 to ~30+
- **AWS billing dashboard:** shows diversified workload signal
- **AM / SA tooling:** auto-flags you as candidate for:
  - Well-Architected Review (partner-delivered)
  - Enterprise Support upgrade conversation
  - Solutions Architect engagement
  - Partner tier progression
  - POC credits eligibility
  - MDF / co-sell funding pre-qualification
- **Security posture in the account:** CISO-visible services (GuardDuty, Security Hub, Inspector, Macie) = passes internal "is this partner production-grade" check

### WA Review feed

AWS Well-Architected Reviews read directly from the services enabled in the account. Enabling the Security pillar services populates a WA Review with real data. The WA Tool itself is free.

Running a self-WA Review on proof360's own account, documented in the tool, becomes:
1. Proof of security posture for customer conversations
2. A reference artefact for the partner tier application
3. Dogfood for the product (proof360 is a productised trust review — pass the equivalent first)

---

## Execution (additional to Tier 1 in prior section)

Immediate (this week, ~$30-50/mo incremental):
- Enable: GuardDuty, Security Hub, Inspector, Config, Macie, IAM Access Analyzer, Audit Manager, Detective
- Enable: CloudWatch Synthetics canary on proof360.au
- Enable: Cost Explorer, CUR to S3, Budgets, Cost Anomaly Detection, Cost Categories
- Enable: AWS Organizations (single account initially)
- Enable: Trusted Advisor, Well-Architected Tool
- Enable: Customer Carbon Footprint Tool

Within 30 days:
- Run a self-WA Review against proof360 in the WA Tool
- Apply for APN Partner Network registration (Software Path)
- Begin FTR preparation
- Tag every resource with the taxonomy from the cost section

Within 90 days:
- Apply for Well-Architected Partner status
- Apply for Service Delivery Program (Security specialisation)
- First POC funding application
- Complete FTR → first CPPO private offer authored by proof360, transacted through Ingram (Vanta or Drata)
