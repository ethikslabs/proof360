# Signal Source Inventory

**Purpose:** Exhaustive catalogue of signal sources currently feeding the proof360 report, plus planned/available additions. Inputs to the Kiro brief so Track A routing logic and quote pipeline know what context fields exist.

**Pulled:** 2026-04-23 from `api/src/services/` + `recon-pipeline.js`.

---

## How signals reach the report

```
URL submitted
    ↓
┌────────────────────────────────────────────────┐
│  signal-extractor.js                           │
│                                                │
│  ┌─────────────────┐   ┌────────────────────┐  │
│  │ Firecrawl scrape│   │ recon-pipeline.js  │  │
│  │ (5 pages)       │   │ (10 sources)       │  │
│  └─────────────────┘   └────────────────────┘  │
│           ↓                     ↓              │
│   Claude Haiku extract   extractReconContext   │
│   (business signals)     (technical facts)     │
└────────────────────────────────────────────────┘
    ↓
inference-builder.js → cold read + follow-up Qs
    ↓
founder corrections + answers
    ↓
context-normalizer.js → NormalizedContext
    ↓
gap-mapper.js (runs triggerCondition() for every gap)
    ↓
Trust360 parallel confirmation → trust_score + signals_object
    ↓
vendor-selector + vendor-intelligence-builder → report
```

**Every gap `triggerCondition(ctx)` is evaluated against this merged context.** More signals = more gap coverage = more routing = more revenue lines.

---

## Active signal sources

### A. Business signals (Firecrawl → Claude Haiku)

File: `signal-extractor.js`
Pages scraped: `/`, `/pricing`, `/about`, `/security`, `/trust` (3000 chars each, 15s timeout)
Extraction model: `claude-haiku-4-5-20251001` via AI gateway

**Extracted fields:**

| Field | Values | Report use |
|---|---|---|
| `product_type` | B2B SaaS / B2C App / Platform / API / Software product | Framing |
| `customer_type` | Enterprise (B2B) / SMB (B2B) / Consumer / Mixed | Framework selection |
| `data_sensitivity` | PII / Financial / Healthcare / Customer / None | Triggers HIPAA gap |
| `stage` | Pre-seed / Seed / Series A / Series B+ | Urgency weighting |
| `sector` | healthcare / fintech / financial_services / government / legal / ecommerce / education / saas / infrastructure | Sector-specific gap triggers (HIPAA, PCI, APRA) |
| `geo_market` | AU / US / UK / SG / Global | APRA, Essential Eight triggers |
| `handles_payments` | bool | PCI DSS trigger |
| `use_case` | freetext | Framing |
| `competitor_mentions` | array | Context only |
| `enterprise_signals.security_page_detected` | bool | Dataset moat |
| `enterprise_signals.trust_centre_detected` | bool | Dataset moat |
| `enterprise_signals.soc2_mentioned` | bool | SOC 2 gap weighting |
| `enterprise_signals.pricing_enterprise_tier` | bool | Dataset moat |

### B. Technical signals (recon-pipeline.js, 10 parallel sources)

Each source: 12s timeout, fire-and-forget, swallows its own failures.

#### 1. `recon-dns` — DNS / email authentication
- `dmarc_policy` (missing / none / quarantine / reject) — triggers `dmarc` gap
- `spf_policy` (missing / open / soft / hard) — triggers `spf` gap
- `mx_provider`
- `has_caa`

#### 2. `recon-http` — Headers, TLS, tech stack
- `has_hsts`, `has_csp`, `security_headers_score` (0-6) — triggers `security_headers` gap
- `tls_version`, `tls_is_current`, `cert_issuer_type`, `cert_expiry_days` — triggers `tls_configuration` gap
- `cdn_provider`, `waf_detected`, `has_security_txt`
- `tech_stack`, `frontend_framework`, `backend_language`
- `has_admin_exposure`, `robots_sensitive_paths`

#### 3. `recon-certs` — CT log subdomain enumeration (crt.sh)
- `subdomain_count`, `infrastructure_breadth`
- `has_staging_exposure`, `exposed_sensitive_subdomains[]` — triggers `staging_exposure` gap

#### 4. `recon-ip` — IP/ASN/hosting (ipapi.co)
- `hosting_provider`, `cloud_provider`, `is_cloud_hosted`, `hosting_country`
- **Infrastructure signal** — feeds `cloud_migration` gap (planned) and `marketplace_cosell` routing (`is_cloud_hosted + cloud_provider === 'AWS'`)

#### 5. `recon-github` — GitHub org presence
- `github_found`, `github_primary_lang`
- `github_has_security_policy`, `github_days_stale`

#### 6. `recon-jobs` — Careers page hiring signals (Firecrawl)
- `security_hire_signal`, `compliance_hire_signal`, `security_team_gap_signal`
- `job_tech_stack[]`

#### 7. `recon-hibp` — Domain breach history (requires `HIBP_API_KEY`)
- `domain_in_breach`, `breach_count`, `breach_severity`, `breach_is_recent` — triggers `domain_breach` gap

#### 8. `recon-ports` — Port scan
- `open_ports[]`, `risky_port_count`, `critical_port_count`
- `has_exposed_db`, `has_ssh`, `has_telnet`

#### 9. `recon-ssllabs` — Official Qualys TLS grade
- `ssl_grade` (A+ / A / A- / B / …), `ssl_grade_num`
- `has_old_tls`, `hsts_preloaded`, `heartbleed`, `poodle` — triggers `tls_configuration` gap

#### 10. `recon-abuseipdb` — IP abuse score (requires `ABUSEIPDB_API_KEY`)
- `abuse_confidence_score`, `ip_usage_type`, `ip_total_reports`
- `ip_is_abusive` (score ≥ 25) — triggers `ip_reputation` gap

### C. Founder-provided signals (10Q + corrections)

From `submit` handler, merged via `context-normalizer.js`:

- `goal`, `timeline`
- `questionnaire_experience` (inc. `stalled_deal`) — triggers `vendor_questionnaire` gap
- `compliance_status` (none / planning / …) — triggers `soc2`, `incident_response` gaps
- `identity_model` (password_only / mfa_only / …) — triggers `mfa`, `edr`, `sso` gaps
- `infrastructure` (cloud / on_prem / …)
- `insurance_status` — triggers `cyber_insurance` gap
- `blocker_history`
- `founder_profile_completed` — triggers `founder_trust` gap
- `handles_payments` — overrides Firecrawl extraction

---

## Planned / available but not yet wired

### ABN API (Australian Business Register) — user-flagged as added

**Source:** abr.business.gov.au public API
**Not yet in repo.** No `recon-abn.js` service file exists.

**What it can provide:**
- ABN validity (live / cancelled)
- Entity name vs website claim mismatch
- GST registration status
- Business structure (company / trust / sole trader / partnership)
- Trading name history
- Industry classification (ANZSIC)
- Location / state
- Entity age (date of registration)

**New signals it would add:**
- `abn_status` (active / cancelled / not_found)
- `abn_age_years` (entity age — trust signal)
- `abn_entity_type` (pty_ltd / trust / …)
- `abn_gst_registered` (bool)
- `abn_anzsic_code`, `abn_anzsic_description` — sector cross-check against Firecrawl extraction
- `abn_state`
- `abn_name_match_confidence` (entity name vs Firecrawl company_name)

**New gaps it would trigger:**
- `abn_missing` — low severity, AU-only (`geo_market: AU` + no ABN found)
- `entity_mismatch` — medium severity (claimed name doesn't resolve to ABN)
- `gst_mismatch` — low severity (claims AU enterprise revenue but not GST-registered)

**Suggested placement:** `api/src/services/recon-abn.js`, added to `recon-pipeline.js` parallel set. Guarded by `geo_market: AU` OR `hosting_country: AU` to avoid wasted lookups.

### Other signal sources available, not yet wired

10 candidates. Each sized by signal yield, cost, and placement. None blocking Track A.

#### 1. Shodan / Censys — device + service exposure
- **Provides:** exposed services beyond port scan (banners, service versions, vulnerable service detection, exposed admin panels, IoT devices, cert misconfigs, historic exposure)
- **New signals:** `exposed_services[]`, `exposed_admin_panels[]`, `vulnerable_service_versions[]`, `exposure_history_score`
- **New gaps:** `exposed_admin` (high), `outdated_service_version` (medium)
- **Cost:** Shodan paid ($69/mo small business), Censys free tier (generous)
- **Placement:** `api/src/services/recon-shodan.js` — parallel

#### 2. URLscan.io / PhishTank — phishing + malicious domain history
- **Provides:** domain appearance in phishing campaigns, scan history, malicious classification, similar-domain abuse
- **New signals:** `phishing_history`, `malicious_classification`, `lookalike_domains[]`
- **New gaps:** `phishing_risk` (high) if domain has been impersonated or flagged
- **Cost:** URLscan free (rate-limited), PhishTank free
- **Placement:** `api/src/services/recon-urlscan.js` — parallel

#### 3. VirusTotal — malware + IP/domain reputation
- **Provides:** malware detection on domain/IP, passive DNS, file-hash reputation, vendor-consensus threat scoring
- **New signals:** `vt_malicious_count`, `vt_suspicious_count`, `vt_passive_dns[]`
- **New gaps:** `malware_association` (critical) if >2 vendors flag
- **Cost:** Free tier (500 lookups/day), paid for volume
- **Placement:** `api/src/services/recon-virustotal.js` — parallel

#### 4. crt.sh deep parse — weak + misissued certs
- **Provides:** beyond subdomain count — weak signing algs (SHA-1), short-key certs, misissued certs (wrong CA, revoked), wildcard abuse, cert transparency anomalies
- **New signals:** `has_weak_cert_signing`, `has_misissued_cert`, `wildcard_cert_count`, `revoked_cert_count`
- **New gaps:** `weak_certificate` (medium), `misissued_certificate` (high)
- **Cost:** free
- **Placement:** extend existing `recon-certs.js` — no new file

#### 5. LinkedIn org scrape — team size + hiring velocity
- **Provides:** company size bracket, security team size estimate, recent hires in security/compliance roles, leadership profile presence, team velocity
- **New signals:** `employee_count_band`, `security_headcount_estimate`, `recent_security_hires`, `has_security_leader`
- **New gaps:** `security_team_gap` (high) if `employee_count > 50` AND `security_headcount_estimate === 0`
- **Cost:** legal grey area, TOS violation risk, may require paid API (RapidAPI scrapers ~$50/mo) or manual
- **Placement:** `api/src/services/recon-linkedin.js` — parallel, with TOS warning

#### 6. Trustpilot / G2 / Capterra — enterprise-readiness review signals
- **Provides:** B2B review presence, rating, review count, enterprise sentiment, negative review patterns (security complaints, outage complaints)
- **New signals:** `g2_rating`, `g2_review_count`, `trustpilot_rating`, `has_security_complaints_in_reviews`
- **New gaps:** `enterprise_readiness_gap` (low) if zero enterprise reviews AND `customer_type: Enterprise`
- **Cost:** G2 API paid, Trustpilot API paid, scraping possible
- **Placement:** `api/src/services/recon-reviews.js` — parallel, B2B-SaaS guarded

#### 7. BuiltWith / Wappalyzer — deeper tech stack
- **Provides:** richer tech inventory than current HTTP parse — payment processors, analytics, CDN history, CMS, security tools already deployed, e-commerce platform, third-party scripts
- **New signals:** `detected_security_tools[]`, `payment_processors[]`, `third_party_script_count`, `cms_platform`
- **New gaps:** `unmanaged_third_party_scripts` (medium) if >10 scripts and no CSP; informs vendor routing (don't sell EDR if CrowdStrike already detected)
- **Cost:** BuiltWith paid, Wappalyzer free library + paid API
- **Placement:** extend existing `recon-http.js` OR new `recon-tech.js` — parallel

#### 8. DNS CAA content parse — cert issuance control
- **Provides:** currently only `has_caa` bool. Full parse gives: authorised issuers, iodef contact present, issuance policy strictness
- **New signals:** `caa_authorised_issuers[]`, `caa_has_iodef`, `caa_policy_strictness`
- **New gaps:** `caa_overly_permissive` (low) if CAA exists but lists many issuers
- **Cost:** free
- **Placement:** extend existing `recon-dns.js` — no new file

#### 9. Google Safe Browsing API — domain flag check
- **Provides:** Google's current safe-browsing classification (malware / social engineering / unwanted software / harmful apps)
- **New signals:** `gsb_classification`, `gsb_last_flagged`
- **New gaps:** `google_safe_browsing_flagged` (critical) if any flag present
- **Cost:** free (requires Google Cloud API key)
- **Placement:** `api/src/services/recon-gsb.js` — parallel

#### 10. ASIC company lookup (AU) — corporate registry beyond ABN
- **Provides:** director history, insolvency events, address changes, ACN vs ABN cross-check, company age from ASIC registration, strike-off risk
- **New signals:** `asic_status`, `asic_directors[]`, `asic_director_count`, `asic_insolvency_events`, `asic_address_changes_12mo`, `asic_age_years`
- **New gaps:** `director_risk` (medium) if director has prior insolvency; `entity_instability` (medium) if frequent address/director changes
- **Cost:** ASIC Connect paid per-lookup, or CreditorWatch API
- **Placement:** `api/src/services/recon-asic.js` — parallel, AU-guarded (complements ABN)

#### Summary table

| # | Source | New signals | New gaps | Cost | AU only |
|---|---|---|---|---|---|
| 1 | Shodan / Censys | 4 | 2 | Shodan paid / Censys free tier | no |
| 2 | URLscan / PhishTank | 3 | 1 | free | no |
| 3 | VirusTotal | 3 | 1 | free tier | no |
| 4 | crt.sh deep parse | 4 | 2 | free | no |
| 5 | LinkedIn scrape | 4 | 1 | paid / grey | no |
| 6 | G2 / Trustpilot | 4 | 1 | paid | no |
| 7 | BuiltWith / Wappalyzer | 4 | 1 | paid | no |
| 8 | DNS CAA deep parse | 3 | 1 | free | no |
| 9 | Google Safe Browsing | 2 | 1 | free (GCP key) | no |
| 10 | ASIC lookup | 6 | 2 | paid | yes |

**Yield total: 37 new signals, 13 new gaps, most free or low-cost.**

**Status: all 10 committed for Kiro build.** Parallel integration into `recon-pipeline.js`. Kiro proceeds through the list; nothing blocks.

---

## Non-tech risk signals

Proof360 today reads **technical trust posture**. Adding non-tech signals shifts the report toward **enterprise risk posture** — the lens procurement, insurance, and investors actually use.

Organised by risk type. Most are free public registers.

### Entity risk (are they real, solvent, legitimate?)

#### 11. ABN (Australian Business Register)
- **Already documented above.** AU entity validity, age, GST, ANZSIC.

#### 12. ASIC company register
- **Already in tech list #10** — but non-tech in nature. Director history, insolvency, address changes.

#### 13. CreditorWatch / D&B business credit
- **Provides:** payment default history, court actions registered against entity, cross-directorships with failed entities, trade credit risk score, DBT (days beyond terms)
- **New signals:** `credit_risk_score`, `payment_defaults_count`, `court_actions_against_entity`, `dbt_days_beyond_terms`, `cross_director_failures`
- **New gaps:** `counterparty_risk` (critical) if high default history; `solvency_risk` (high) if adverse credit events
- **Cost:** CreditorWatch ~$100/lookup (AU), D&B D-U-N-S paid international
- **Placement:** `api/src/services/recon-credit.js` — parallel, on-demand (paid gate)

### Legal/regulatory risk (are they in trouble?)

#### 14. AUSTRAC reporting entity register (AU)
- **Provides:** AML/CTF reporting entity status for AU financial services / crypto / remitters
- **New signals:** `austrac_registered`, `austrac_entity_type`, `austrac_enrolment_date`
- **New gaps:** `aml_compliance_gap` (critical) if `sector: fintech` AND `handles_payments: true` AND `austrac_registered: false`
- **Cost:** free (public search)
- **Placement:** `api/src/services/recon-austrac.js` — parallel, AU + fintech-guarded

#### 15. ASIC AFSL / Credit License register (AU)
- **Provides:** Australian Financial Services Licence status, Credit Licence status, conditions/restrictions, variations history
- **New signals:** `afsl_status`, `credit_license_status`, `license_conditions[]`, `license_variations_12mo`
- **New gaps:** `afsl_missing` (critical) if AU financial services provider without licence
- **Cost:** free (ASIC Connect)
- **Placement:** extend `recon-asic.js` (tech #10) — no new file

#### 16. OAIC Notifiable Data Breaches register (AU)
- **Provides:** public record of data breaches this entity has reported to OAIC under NDB scheme
- **New signals:** `ndb_reported_count`, `ndb_last_report_date`, `ndb_sector_peer_comparison`
- **New gaps:** `prior_breach_disclosed` (high) if recent NDB; **routing impact** — cyber insurance quote will reflect this
- **Cost:** free
- **Placement:** `api/src/services/recon-oaic.js` — parallel, AU-guarded

#### 17. Court records / litigation (AustLII + Federal Court)
- **Provides:** pending litigation, judgments against entity, class actions, regulatory prosecutions
- **New signals:** `active_litigation_count`, `judgments_against_count`, `class_action_subject`, `regulatory_prosecutions`
- **New gaps:** `active_litigation` (high) if material pending cases; `regulatory_prosecution` (critical) if current
- **Cost:** free (AustLII), some federal court paid
- **Placement:** `api/src/services/recon-litigation.js` — parallel, AU-guarded

#### 18. Regulator enforcement outcomes (ACCC + ASIC + OAIC + APRA)
- **Provides:** public enforcement actions, infringement notices, court-enforceable undertakings, bans, infringements
- **New signals:** `regulator_actions_count`, `regulator_actions_active`, `infringement_notices[]`, `court_undertakings[]`
- **New gaps:** `regulator_active` (critical) if current action; `regulator_history` (medium) if prior
- **Cost:** free (each regulator publishes)
- **Placement:** `api/src/services/recon-regulators.js` — parallel, AU-guarded

#### 19. Sanctions screening (OFAC US + DFAT AU + EU consolidated)
- **Provides:** entity + directors screened against sanctions lists, PEP (politically exposed person) flags
- **New signals:** `sanctions_match_entity`, `sanctions_match_directors[]`, `pep_flag`
- **New gaps:** `sanctions_risk` (critical) if any match; blocker for enterprise procurement
- **Cost:** free (OFAC SDN, DFAT consolidated list), paid for PEP (Dow Jones, World-Check)
- **Placement:** `api/src/services/recon-sanctions.js` — parallel, global

### Reputational risk (what does the market say?)

#### 20. News media scan (Google News API + RSS)
- **Provides:** recent mentions, negative-keyword detection (breach, fraud, lawsuit, investigation, outage), sentiment trend
- **New signals:** `negative_news_mentions_90d`, `negative_keywords_detected[]`, `news_sentiment_trend`
- **New gaps:** `negative_news_risk` (medium) if cluster of negative mentions; informs insurance + procurement routing
- **Cost:** free (Google News RSS), NewsAPI paid for volume
- **Placement:** `api/src/services/recon-news.js` — parallel

#### 21. Glassdoor / SEEK employer reviews
- **Provides:** employee rating, CEO approval, recommend-to-friend, review count, negative review clusters (security practices, compliance shortcuts, high turnover)
- **New signals:** `glassdoor_rating`, `ceo_approval`, `negative_culture_signals[]`, `high_turnover_signal`
- **New gaps:** `cultural_risk` (low) — not a hard gap, but informs founder_trust and governance
- **Cost:** paid API or scrape (grey)
- **Placement:** `api/src/services/recon-employer.js` — parallel, optional

### Counterparty / market proof (do others trust them?)

#### 22. AusTender / government contracts register (AU)
- **Provides:** AU government contracts won, contract values, agencies served, security clearance requirements met
- **New signals:** `gov_contracts_count`, `gov_contracts_value_12mo`, `gov_agencies_served[]`, `has_security_cleared_contracts`
- **New gaps:** **positive signal** (trust-boosting), not a gap — feeds `trust_score` bonus if gov-proven
- **Cost:** free
- **Placement:** `api/src/services/recon-austender.js` — parallel, AU-guarded

#### 23. Crunchbase / Dealroom funding + investor quality
- **Provides:** total raised, last round, lead investors, board composition, employee count estimate, acquisition history
- **New signals:** `total_funding_usd`, `last_round_date`, `lead_investors[]`, `investor_tier_score`, `board_independence_bool`
- **New gaps:** informs `stage` verification (cross-check Firecrawl extraction); `governance_thin` (low) if founder-only board
- **Cost:** Crunchbase free tier + paid, Dealroom paid
- **Placement:** `api/src/services/recon-funding.js` — parallel

#### 24. Modern Slavery Register (AU)
- **Provides:** statement filed? (required for AU entities $100M+ turnover), statement quality, reporting gaps
- **New signals:** `modern_slavery_statement_filed`, `statement_reporting_period`
- **New gaps:** `modern_slavery_noncompliance` (high) if required to file but hasn't; enterprise procurement blocker
- **Cost:** free
- **Placement:** `api/src/services/recon-slavery.js` — parallel, AU + large-entity-guarded

### Governance / human risk (are the people trustworthy?)

#### 25. Founder track record (LinkedIn + ASIC + Crunchbase cross)
- **Provides:** prior companies, prior exits (successful / failed / insolvent), prior director bans, repeat founder signal, industry tenure
- **New signals:** `founder_prior_company_count`, `founder_prior_failures`, `founder_prior_director_bans`, `founder_industry_tenure_years`, `repeat_founder_signal`
- **New gaps:** `founder_risk_history` (high) if prior director ban or multiple insolvencies
- **Cost:** depends on LinkedIn method + ASIC director search
- **Placement:** `api/src/services/recon-founder.js` — parallel, AU + cross-reference heavy

#### 26. Privacy policy deep parse
- **Provides:** already scrape privacy page. Deep parse gives: data retention stated, international transfers disclosed, third-party sharing list, GDPR/CCPA claims, breach notification commitment, contact method
- **New signals:** `privacy_policy_exists`, `privacy_retention_stated`, `privacy_international_transfers_disclosed`, `privacy_gdpr_claim`, `privacy_ccpa_claim`, `privacy_breach_notification_commitment`
- **New gaps:** `privacy_policy_weak` (medium) if exists but missing required elements; `privacy_policy_missing` (high) if none
- **Cost:** free (extends existing scrape)
- **Placement:** extend `signal-extractor.js` — no new file

#### Non-tech summary table

| # | Source | Risk type | New signals | New gaps | Cost | AU only |
|---|---|---|---|---|---|---|
| 11 | ABN | Entity | 7 | 3 | free | yes |
| 12 | ASIC company | Entity | 6 | 2 | paid | yes |
| 13 | CreditorWatch / D&B | Entity | 5 | 2 | paid | partial |
| 14 | AUSTRAC | Legal/Reg | 3 | 1 | free | yes |
| 15 | ASIC AFSL / Credit | Legal/Reg | 4 | 1 | free | yes |
| 16 | OAIC NDB register | Legal/Reg | 3 | 1 | free | yes |
| 17 | Court records | Legal/Reg | 4 | 2 | mostly free | yes |
| 18 | Regulator enforcement | Legal/Reg | 4 | 2 | free | yes |
| 19 | Sanctions (OFAC/DFAT/EU) | Legal/Reg | 3 | 1 | free | no |
| 20 | News media scan | Reputational | 3 | 1 | free tier | no |
| 21 | Glassdoor / SEEK | Reputational | 4 | 1 | paid / grey | no |
| 22 | AusTender | Counterparty+ | 4 | 0 (bonus) | free | yes |
| 23 | Crunchbase / Dealroom | Counterparty | 5 | 1 | free tier | no |
| 24 | Modern Slavery Register | Governance | 2 | 1 | free | yes |
| 25 | Founder track record | Human | 5 | 1 | mixed | partial |
| 26 | Privacy policy deep parse | Governance | 6 | 2 | free | no |

**Non-tech yield: 68 new signals, 22 new gaps across risk types, most free or AU-public.**

### What non-tech signals unlock commercially

For proof360 routing:

- **Austbrokers cyber insurance quote** — materially priced by prior breach history, litigation, regulator actions
- **AWS Marketplace co-sell** — AWS risk team checks sanctions, enforcement, solvency before funding co-sell
- **Ingram MD conversation** — credit risk + governance signals are what distribution credit teams already run
- **Cloudflare MSSP enablement** — they won't enable partners with active regulatory actions
- **Enterprise procurement close rate** — non-tech signals are 40%+ of a standard vendor security questionnaire

This is how proof360 moves from "we found some tech gaps" to **"we surface the full enterprise risk posture and route to the vendors that close each gap."**

### Social / digital presence risk (is the company real, active, respected online?)

Social signals reveal proof-of-life, crisis-response quality, operational velocity, and customer sentiment. Dead or inconsistent social presence is a classic signal of distressed or fraudulent companies.

#### 27. LinkedIn company page
- **Provides:** beyond #5 (employee scrape) — page existence, follower count, post frequency, last post date, employee count claimed vs page-resolved, recent announcements (funding, layoffs, pivots, leadership changes)
- **New signals:** `linkedin_page_exists`, `linkedin_follower_count`, `linkedin_last_post_days`, `linkedin_post_frequency_30d`, `linkedin_claimed_vs_resolved_headcount`, `linkedin_leadership_churn_signal`
- **New gaps:** `company_dormant_signal` (medium) if no posts in 90+ days; `headcount_inflation` (low) if claimed >> resolved
- **Cost:** public page readable, LinkedIn API restricted — reuse #5 infrastructure
- **Placement:** extend `recon-linkedin.js` — no new file

#### 28. Twitter / X presence
- **Provides:** official account existence + verification, follower count, tweet cadence, last tweet, security incident disclosure history (breaches + outages commonly announced here first), customer complaint volume, reply sentiment
- **New signals:** `twitter_account_exists`, `twitter_verified`, `twitter_follower_count`, `twitter_last_post_days`, `twitter_breach_disclosure_history`, `twitter_outage_disclosure_history`, `twitter_complaint_ratio_30d`
- **New gaps:** `crisis_comms_absent` (medium) if prior breach with no public disclosure thread; `dormant_social` (low) if account exists but dead
- **Cost:** X API paid tier (basic ~$100/mo), scraping possible but fragile
- **Placement:** `api/src/services/recon-twitter.js` — parallel

#### 29. Reddit + Hacker News mentions
- **Provides:** community discussion of company, security incident chatter, founder/CEO mentions, r/scams flags, HN launch reception, outage/incident threads
- **New signals:** `reddit_mention_count_90d`, `reddit_negative_sentiment`, `reddit_scam_flag`, `hn_launch_thread_exists`, `hn_incident_threads_count`
- **New gaps:** `community_negative_signal` (medium) if cluster of negative community mentions; `scam_flag` (critical) if r/scams thread
- **Cost:** Reddit API free tier, HN Algolia API free
- **Placement:** `api/src/services/recon-community.js` — parallel

#### 30. ProductHunt / Indie Hackers
- **Provides:** launch history, upvote counts, hunter quality, community reception, makers active
- **New signals:** `ph_launch_count`, `ph_top_launch_upvotes`, `ph_last_launch_date`, `ih_mentions`
- **New gaps:** informs legitimacy (B2B SaaS with no PH presence after 3+ years = unusual); positive signal, not a gap
- **Cost:** ProductHunt API free
- **Placement:** `api/src/services/recon-producthunt.js` — parallel, B2B-SaaS guarded

#### 31. YouTube + conference / podcast appearances
- **Provides:** official channel existence, subscriber count, video freshness, founder/leader speaker appearances (detectable via YouTube search for founder name + company), industry engagement signal
- **New signals:** `youtube_channel_exists`, `youtube_subscriber_count`, `founder_speaker_appearances_12mo`, `podcast_guest_appearances_12mo`
- **New gaps:** no gaps directly — feeds `founder_trust` positively; signals industry legitimacy
- **Cost:** YouTube Data API free tier (10k units/day)
- **Placement:** `api/src/services/recon-media.js` — parallel

#### 32. Company blog + content cadence
- **Provides:** blog existence, post frequency, recency, author variety, technical depth, security / trust / incident content existence
- **New signals:** `blog_exists`, `blog_post_frequency_90d`, `blog_last_post_days`, `blog_author_variety`, `blog_security_content_exists`, `blog_has_incident_postmortems`
- **New gaps:** `content_dormant` (low) if no posts in 180+ days — proxy for team capacity; informs `founder_trust` + `company_dormant_signal`
- **Cost:** free (extends Firecrawl scrape to `/blog`)
- **Placement:** extend `signal-extractor.js` — no new file

#### 33. Facebook page + reviews (B2C-relevant)
- **Provides:** page existence, follower count, rating, review count, response rate to reviews, complaint patterns
- **New signals:** `facebook_page_exists`, `facebook_rating`, `facebook_review_count`, `facebook_response_rate`, `facebook_complaint_signals`
- **New gaps:** `b2c_reputation_risk` (medium) if rating <3.0 with volume; only relevant for `customer_type: Consumer` or `Mixed`
- **Cost:** Graph API restricted, public page scrape possible
- **Placement:** `api/src/services/recon-facebook.js` — parallel, B2C-guarded, optional

#### Social signals summary

| # | Source | Risk type | New signals | New gaps | Cost | Guard |
|---|---|---|---|---|---|---|
| 27 | LinkedIn company page | Reputational + Entity | 6 | 2 | shared with #5 | none |
| 28 | Twitter / X | Reputational + Crisis | 7 | 2 | paid (X API) | none |
| 29 | Reddit + HN | Reputational + Human | 5 | 2 | free | none |
| 30 | ProductHunt / IH | Counterparty | 4 | 0 (bonus) | free | B2B SaaS |
| 31 | YouTube / podcasts | Reputational + Human | 4 | 0 (bonus) | free tier | none |
| 32 | Blog + content cadence | Operational | 6 | 1 | free (Firecrawl) | none |
| 33 | Facebook / reviews | Reputational | 5 | 1 | grey | B2C only |

**Social yield: 37 new signals, 8 new gaps. Most free, reusing existing Firecrawl + LinkedIn infra.**

### Critical trust-signal patterns from social

Social presence surfaces patterns that no tech scan catches:

- **Crisis communication pattern** — how a company handled its last security incident on Twitter/LinkedIn is a strong forward indicator of how they'll handle the next one. Insurance pricing reads this.
- **Proof-of-life** — 6+ month silence across all social surfaces is a classic signal of distressed / zombie companies. Enterprise procurement reads this.
- **Leadership churn** — LinkedIn "X is now open to work" from senior roles = company instability signal.
- **r/scams flag** — one thread here kills enterprise deal conversion entirely. Worth screening.
- **Negative community cluster** — HN + Reddit + Twitter complaints converging on same issue (outages, data handling, billing practices) predicts future enterprise complaints.

### What social signals unlock commercially

- **Austbrokers cyber insurance underwriting** reads crisis comms history + breach disclosure quality.
- **Founder-credibility component of trust score** (existing `founder_trust` gap) gets a real data spine instead of self-reported.
- **Enterprise sales cycle shortening** — procurement already runs these checks manually; surfacing them in proof360 = proof360 owns the conversation.

---

## Deep GitHub crawl (extension to existing #5)

Current `recon-github.js` is shallow — does the org exist, primary language, security policy flag, days-stale. A **deep crawl** through public repos is one of the strongest single signal sources available.

### 34. Deep GitHub crawl

- **Provides:**
  - Secret scanning across all public repos + full git history (leaked AWS keys, API tokens, database credentials, private keys)
  - Dependency CVE analysis (outdated packages with known vulnerabilities via GitHub Advisory Database)
  - Security hygiene signals (Dependabot / Renovate adoption, branch protection inference, CODEOWNERS, SECURITY.md quality)
  - CI/CD posture (workflow files, SAST/secrets-scan steps, deploy patterns)
  - Team composition (contributor list, commit authors, external contributor ratio — cross-ref with LinkedIn for headcount verification)
  - Activity signals (commit frequency, last commit per repo, abandoned-codebase detection)
  - Code quality proxies (test coverage signals, README depth, license presence)
  - Community trust (stars, forks, issue response patterns)
  - Framework inventory (parsed from `package.json`, `requirements.txt`, `Gemfile`, `go.mod`, etc. — richer than Wappalyzer for private-by-default stacks)
  - Historic secret leaks (via full git history scan, even if later deleted)

- **New signals:**
  - `exposed_secrets_found`, `exposed_secret_types[]` (AWS, GCP, Stripe, database, generic high-entropy)
  - `exposed_secrets_history_count` (including deleted/force-pushed history)
  - `known_cve_count_critical`, `known_cve_count_high`, `outdated_dependency_count`
  - `has_dependabot`, `has_renovate`, `dependabot_alert_count`
  - `has_security_md`, `has_codeowners`, `has_code_of_conduct`, `has_license`
  - `has_security_workflow`, `has_secret_scanning_workflow`, `ci_providers[]`
  - `public_repo_count`, `contributor_count_12mo`, `external_contributor_ratio`
  - `avg_commits_per_week`, `last_commit_days_by_repo`, `abandoned_repo_count`
  - `language_breakdown`, `framework_inventory[]`
  - `total_stars`, `total_forks`, `open_issue_count`, `avg_issue_response_days`
  - `commit_author_list[]` (employee headcount proxy)

- **New gaps:**
  - `exposed_secrets` (**critical**) — leaked credentials in public repos or git history
  - `unpatched_critical_cves` (critical) — known-exploited CVEs in dependencies
  - `unpatched_high_cves` (high)
  - `no_security_md` (medium) — deeper than existing github flag
  - `no_dependabot` (medium) — no automated dependency patching
  - `abandoned_codebase` (high) — no commits in 180d on claimed active product
  - `no_codeowners` (low) — no code review governance
  - `no_ci_security` (medium) — no SAST / secrets-scan in CI

- **Tools (all OSS, self-hostable):**
  - **TruffleHog** — secrets scanning with history, MIT (Apache 2.0 for some versions)
  - **Gitleaks** — secrets scanning, MIT
  - **Semgrep** — SAST, LGPL
  - **GitHub Advisory Database** — public CVE data, free
  - **Octokit** (official GitHub SDK) — MIT
  - **gh-cli** — CLI, MIT
  - Optional: **Syft** (SBOM generation), **Grype** (vulnerability scanning from SBOM), **OSV-Scanner** (Google's OSS vuln scanner)

- **Cost:** free for public repos. Rate limits on GitHub API (5000 req/hour authenticated, 60 unauthenticated). No paid service needed.

- **Placement:** extend `recon-github.js` into a two-stage module, OR new `recon-github-deep.js`. Deep stage runs async behind shallow, longer timeout (up to 2 minutes for full history secret scan on larger orgs).

### Why this is strategically load-bearing

**"We found your AWS access keys exposed in this public repo"** is the single highest-converting enterprise security conversation that exists. It bypasses procurement entirely — the CISO picks up the phone.

- **Austbrokers cyber insurance** — exposed secrets in public repos is an automatic coverage denial or premium-loading factor
- **CrowdStrike / Palo Alto / Cloudflare lead quality** — no better qualified lead than "your environment has exposed credentials in the open"
- **Vanta / Drata upsell** — exposed secrets = SOC 2 blocker, immediate SOC 2 motion
- **Direct enterprise conversion** — any CISO shown this finding buys immediately

### Proof360 self-check implication

Proof360 will be running this on other companies. Proof360's own repos (`proof360`, `veritas`, `ops360`, etc.) should pass the same scan in CI. Recommend: TruffleHog + Gitleaks in the repo's own CI as a precondition. Missing this is a gap proof360 should not have.

---

## Funding / financial posture (public)

Fundraising signals are the financial lens on enterprise risk posture. Public sources reveal capital history, investor quality, government validation, filing compliance, and funding-round urgency. Each signal changes sales motion and vendor routing.

### Why funding signals matter commercially

- **Company just raised** → budget live → cyber insurance + compliance automation top priority (Austbrokers + Vanta routing)
- **Company raising now** → DD urgency → SOC 2 fast-track motion (Vanta / Drata)
- **Company bootstrapped** → different motion, SMB tier, price-sensitive
- **Government grant recipient** → compliance-sensitive, AU Essential Eight / sovereign-hosting interest
- **ASX listed** → continuous disclosure obligations, APRA-adjacent
- **R&D Tax Incentive recipient** → tech-heavy, security actually matters, GitHub crawl yields more
- **Investor tier signals:** tier-1 VC portfolio companies have baseline governance expectations — compliance + insurance gaps hit procurement blockers earlier

### 35. Crunchbase / Dealroom (already in #23 — extend)

- **Extended signals:** `total_raised_usd`, `last_round_type` (pre-seed/seed/A/B/C/growth), `last_round_date`, `last_round_size`, `lead_investor`, `lead_investor_tier`, `board_size`, `board_independent_count`, `acquisition_history[]`
- **New gaps:** `funding_urgency` (medium) if last round >18 months ago AND stage < Series B (raising imminent); `investor_tier_gap` (low) if stage claims Series B+ but no tier-1 lead
- **Cost:** Crunchbase free tier, paid for depth
- **Placement:** extend `recon-funding.js` from #23

### 36. ASIC annual returns + director register (AU Pty Ltd)

- **Provides:** AU Pty Ltd companies file annual reviews to ASIC — registered address confirmed yearly, directors current, beneficial owners disclosed. Share issuances reported.
- **New signals:** `asic_annual_return_filed`, `asic_last_filing_days`, `asic_share_issuances_12mo`, `asic_beneficial_owners[]`, `asic_share_class_complexity`
- **New gaps:** `filing_non_compliance` (high) if annual return overdue; informs `governance_thin` and `entity_instability`
- **Cost:** paid per lookup (part of ASIC from tech #10)
- **Placement:** extend `recon-asic.js`

### 37. ATO R&D Tax Incentive recipients register (AU)

- **Provides:** public register of AU entities claiming R&D Tax Incentive. Reveals tech-intensive spend, reported R&D amounts, registered R&D activities classification.
- **New signals:** `rdti_registered`, `rdti_registered_years[]`, `rdti_industry_classification`
- **New gaps:** positive signal (tech legitimacy); feeds `product_type` + `sector` verification
- **Cost:** free (AusIndustry public register)
- **Placement:** `api/src/services/recon-rdti.js` — parallel, AU-guarded

### 38. AusIndustry grants + programs register (AU)

- **Provides:** public list of AU government grant recipients — Accelerating Commercialisation, CRC-P, Industry Growth Program, Export Market Development, Biomedical Translation Fund etc.
- **New signals:** `ausindustry_grants[]` (program, amount, year), `total_gov_grants_awarded_aud`, `most_recent_grant_year`
- **New gaps:** positive signal — gov validation; cross-check against sector claim
- **Cost:** free (data.gov.au + business.gov.au)
- **Placement:** `api/src/services/recon-grants.js` — parallel, AU-guarded

### 39. Equity crowdfunding platforms (AU)

- **Provides:** Birchal, Equitise, OnMarket — public offer documents contain financials, cap table, use of funds, risk disclosure. Retail investors = continuous disclosure obligations.
- **New signals:** `ecf_raise_history[]`, `ecf_total_raised`, `ecf_most_recent_offer`, `ecf_disclosed_financials_public`
- **New gaps:** `retail_shareholder_governance` (medium) if ECF-raised — higher governance bar, more scrutiny; informs `governance_thin`
- **Cost:** free (public offer docs)
- **Placement:** `api/src/services/recon-ecf.js` — parallel, AU-guarded

### 40. VC firm portfolio pages

- **Provides:** Australian + regional VC firms publish portfolios publicly — Blackbird, Square Peg, Airtree, Skip Capital, AfterWork Ventures, Tidal, Our Innovation Fund, etc. US tier-1s same (Sequoia, a16z, etc. via Crunchbase-mirror pages).
- **New signals:** `vc_portfolio_of[]` (firm names listing this company), `earliest_vc_portfolio_listing_year`, `vc_tier_max` (tier-1 / tier-2 / regional / angel)
- **New gaps:** positive signal — investor tier validation
- **Cost:** free (scrape public pages)
- **Placement:** `api/src/services/recon-vc-portfolios.js` — parallel

### 41. Accelerator + incubator alumni registers

- **Provides:** Y Combinator batch lists (public), Techstars, 500 Startups, Startmate, Antler, Entrepreneur First, Plug and Play, Endeavor. AU: Cicada Innovations, UniSydney INCUBATE, UTS Startups, BlueChilli, Launch Factory.
- **New signals:** `accelerator_alumni_of[]`, `accelerator_batch`, `accelerator_completed_year`
- **New gaps:** positive signal — programmatic validation; tier-1 accelerator = higher investor network access
- **Cost:** free
- **Placement:** `api/src/services/recon-accelerators.js` — parallel

### 42. ASX announcements (if listed)

- **Provides:** continuous disclosure regime — material announcements, placements, SPPs, rights issues, trading halts, ASIC queries, substantial shareholder movements. ASX releases are structured XML.
- **New signals:** `is_asx_listed`, `asx_ticker`, `asx_market_cap`, `asx_recent_placements`, `asx_trading_halts_12mo`, `asx_price_query_letters`
- **New gaps:** `disclosure_stress_signal` (high) if multiple ASX price query letters or trading halts in 12mo; positive signal if clean disclosure history
- **Cost:** free (asx.com.au RSS + announcement API)
- **Placement:** `api/src/services/recon-asx.js` — parallel, AU-guarded

### 43. SEC EDGAR (US entities)

- **Provides:** Form D filings (private placements disclosed), S-1s (IPO prep), 8-Ks (material events), 10-Ks (annual). Reveals US capital raising, board composition, auditor, legal counsel, executive compensation.
- **New signals:** `sec_edgar_filings[]`, `last_form_d_date`, `last_form_d_amount`, `is_sec_reporting_issuer`
- **New gaps:** positive signal — US regulated disclosure; informs legal/regulatory posture
- **Cost:** free (SEC EDGAR public API)
- **Placement:** `api/src/services/recon-edgar.js` — parallel, US-guarded

### 44. Techboard AU startup tracker

- **Provides:** AU-specific startup ecosystem tracker — funding events, employee count, sector classification, cross-linked to founder LinkedIn profiles.
- **New signals:** `techboard_listed`, `techboard_last_funding_event`, `techboard_employee_bracket`
- **New gaps:** positive signal; cross-validates `stage` + `sector`
- **Cost:** free tier + paid
- **Placement:** `api/src/services/recon-techboard.js` — parallel, AU-guarded

### 45. Startup competition winners + pitch showcases

- **Provides:** Slingshot Startups, Startmate demo days, Antler showcases, SXSW Sydney winners, various vertical competitions (cyber: AWS re:Invent, AFR BOSS Young Executives)
- **New signals:** `competition_wins[]` (name, year, placement)
- **New gaps:** positive signal — traction proxy
- **Cost:** free (public announcements)
- **Placement:** extend `recon-news.js` or `api/src/services/recon-competitions.js`

#### Funding signals summary

| # | Source | Risk type | New signals | New gaps | Cost | Guard |
|---|---|---|---|---|---|---|
| 35 | Crunchbase extended | Financial | 9 | 2 | free tier | none |
| 36 | ASIC annual returns | Financial + Governance | 5 | 1 | paid (part of #10) | AU Pty Ltd |
| 37 | ATO R&D Tax Incentive | Financial + Tech validation | 3 | 0 (bonus) | free | AU |
| 38 | AusIndustry grants | Financial + Gov validation | 3 | 0 (bonus) | free | AU |
| 39 | Equity crowdfunding | Financial + Governance | 4 | 1 | free | AU |
| 40 | VC portfolios | Financial + Counterparty | 3 | 0 (bonus) | free | none |
| 41 | Accelerator alumni | Counterparty | 3 | 0 (bonus) | free | none |
| 42 | ASX announcements | Financial + Regulatory | 6 | 1 | free | AU listed |
| 43 | SEC EDGAR | Financial + Regulatory | 4 | 0 (bonus) | free | US |
| 44 | Techboard | Financial | 3 | 0 (bonus) | free tier | AU |
| 45 | Competitions | Counterparty | 1 | 0 (bonus) | free | none |

**Funding signals yield: 44 new signals, 5 new gaps, mostly free.**

### Cross-domain routing insight

Funding signals change the commercial motion before any gap triggers:

- Recently-raised entity + `soc2` gap → **Vanta fast-track** (budget + urgency both present)
- Raising-now entity (last round stale + growing team signals) → **Austbrokers cyber insurance + Vanta SOC 2 bundle** (DD prep package)
- ECF-funded entity → **governance review motion** (retail shareholder scrutiny) → ReachLX founder trust deep profile
- Government-funded entity + AU → **Essential Eight + IRAP motion** (gov compliance bar already in play)
- ASX-listed entity → **APRA-adjacent + continuous disclosure motion** (higher insurance + governance spend)
- US SEC-reporting entity → **SOC 2 + SOX readiness + ISO 27001 motion**
- Pre-funded / bootstrapped + growth stage → **cost-sensitive, Apollo Secure or AWS-native path**

This is the **cross-domain read** productised — financial posture changes trust posture routing.

---

## Signal → gap coverage map

Gaps currently defined in `api/src/config/gaps.js` and the signals that drive them:

| Gap ID | Severity | Driven by |
|---|---|---|
| `soc2` | critical | `compliance_status` |
| `mfa` | critical | `identity_model` |
| `cyber_insurance` | critical | `insurance_status` |
| `incident_response` | high | `compliance_status` |
| `vendor_questionnaire` | high | `questionnaire_experience` |
| `edr` | high | `identity_model`, `infrastructure` |
| `sso` | medium | `identity_model`, `customer_type` |
| `founder_trust` | high | `founder_profile_completed` |
| `dmarc` | high | recon-dns.`dmarc_policy` |
| `spf` | medium | recon-dns.`spf_policy` |
| `hipaa_security` | critical | `sector`, `data_sensitivity` |
| `pci_dss` | critical | `handles_payments`, `sector` |
| `apra_prudential` | critical | `sector`, `geo_market` |
| `essential_eight` | high | `sector`, `geo_market` |
| `security_headers` | medium | recon-http.`has_hsts`, `has_csp` |
| `staging_exposure` | high | recon-certs.`has_staging_exposure` |
| `domain_breach` | critical | recon-hibp.`domain_in_breach` |
| `tls_configuration` | medium | recon-http + recon-ssllabs |
| `ip_reputation` | high | recon-abuseipdb.`ip_is_abusive` |

**Gaps with no current signal driver (wired in vendors.js but not in gaps.js triggerCondition):**
- `cloud_migration`, `legacy_on_prem`, `multi_cloud_fragmentation` — Track A adds these; `infrastructure` signal drives them

---

## Use in Track A routing

Track A quote endpoint and `lead_type` determination read this context. Key fields:

| Context field | Track A routing impact |
|---|---|
| `hosting_provider`, `cloud_provider`, `is_cloud_hosted` | AWS-hosted → `marketplace_cosell` priority |
| `infrastructure` (founder-answered) | Triggers `cloud_migration` gap → `migration_to_aws` / `migration_to_azure` lead type |
| `geo_market` | AU → Austbrokers, AU-distributed vendors prioritised; APRA/E8 gap weighting |
| `sector`, `data_sensitivity` | Vendor filter (CognitiveView for AI risk, Austbrokers for insurance, etc.) |
| `stage`, `customer_type` | Quote tier selection (starter / growth / enterprise pricing band) |
| `compliance_status` | Vanta vs Drata vs Secureframe selection |
| ABN fields (when wired) | AU-entity verification before AU-specific lead types fire |

---

## Next actions

1. Confirm ABN API integration scope — full recon-abn.js module or lightweight enrichment call?
2. Decide whether ABN lookup runs in parallel (adds latency) or on demand (report-time, lazy)
3. Add `infrastructure` signal → `cloud_migration` / `legacy_on_prem` gap wiring (Track A)
4. Track A quote endpoint consumes this context for tier + routing (not a new signal source — a consumer)

---

*Signal inventory is the substrate. Every gap and every vendor routing decision reads from this merged context. New signals = new gap coverage = new lead lines.*
