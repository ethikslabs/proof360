# proof360 — Signal & Scoring Methodology
## Convergence Seed Document

**Purpose:** Convergence brief for the 10-round ChatGPT spec lock on proof360's signal pipeline and scoring model. Also the source of truth for published methodology documentation (what founders see about how they're assessed).

**Status:** Current state documented. Open questions listed. Ready for convergence.

---

## 1. Current state

### 1a. Signal pipeline (live)

Three layers, merged into a single `NormalizedContext` before gap evaluation:

```
Layer A — Business signals (Firecrawl → Claude Haiku)
  Pages scraped: /, /pricing, /about, /security, /trust
  Model: claude-haiku-4-5-20251001 via AI gateway
  Extracts: product_type, customer_type, data_sensitivity, stage, sector,
            geo_market, handles_payments, use_case, enterprise_signals{4}

Layer B — Technical signals (recon-pipeline.js, 10 parallel sources, 12s timeout each)
  1. recon-dns       → dmarc_policy, spf_policy, mx_provider, has_caa
  2. recon-http      → has_hsts, has_csp, tls_version, cdn_provider, tech_stack
  3. recon-certs     → has_staging_exposure, subdomain_count
  4. recon-ip        → hosting_provider, cloud_provider, is_cloud_hosted
  5. recon-github    → github_found, github_has_security_policy, github_days_stale
  6. recon-jobs      → security_hire_signal, compliance_hire_signal (via Firecrawl)
  7. recon-hibp      → domain_in_breach, breach_count, breach_severity (key required)
  8. recon-ports     → open_ports[], risky_port_count, has_exposed_db
  9. recon-ssllabs   → ssl_grade, has_old_tls, cert_expiry_days
  10. recon-abuseipdb → abuse_confidence_score, ip_is_abusive (key required)

Layer C — Founder-provided signals (10 questions + corrections)
  compliance_status, identity_model, insurance_status, questionnaire_experience,
  infrastructure, goal, timeline, handles_payments (override), founder_profile_completed
```

### 1b. Gap definitions (live — 19 gaps)

| ID | Severity | Weight | Trigger source | Category |
|----|----------|--------|----------------|----------|
| soc2 | critical | 20 | Layer C (compliance_status) | governance |
| mfa | critical | 20 | Layer C (identity_model) | identity |
| cyber_insurance | critical | 20 | Layer C (insurance_status) | governance |
| incident_response | high | 10 | Layer C (compliance_status) | governance |
| vendor_questionnaire | high | 10 | Layer C (questionnaire_experience) | governance |
| edr | high | 10 | Layer C (identity_model) | infrastructure |
| sso | medium | 5 | Layer C (identity_model) | identity |
| founder_trust | high | 10 | Layer C (founder_profile_completed) | human |
| dmarc | high | 10 | Layer B (dmarc_policy) | infrastructure |
| spf | medium | 5 | Layer B (spf_policy) | infrastructure |
| hipaa_security | critical | 20 | Layer A (sector / data_sensitivity) | governance |
| pci_dss | critical | 20 | Layer A (handles_payments / sector) | governance |
| apra_prudential | critical | 20 | Layer A (sector + geo_market) | governance |
| essential_eight | high | 10 | Layer A (sector / geo_market) | governance |
| security_headers | medium | 5 | Layer B (has_hsts / has_csp) | infrastructure |
| staging_exposure | high | 10 | Layer B (has_staging_exposure) | infrastructure |
| domain_breach | critical | 20 | Layer B (domain_in_breach) | infrastructure |
| tls_configuration | medium | 5 | Layer B (tls_is_current / ssl_grade) | infrastructure |
| ip_reputation | high | 10 | Layer B (ip_is_abusive) | infrastructure |

**Total penalty capacity:** 240 points (if all 19 triggered)

### 1c. Scoring algorithm (live)

```
trust_score = max(0, 100 − Σ(severity_weight for each triggered gap))

Severity weights:
  critical = 20
  high     = 10
  medium   =  5
  low      =  2 (no live gaps at low severity yet)

Readiness bands:
  80–100 → ready
  50–79  → partial
  0–49   → not_ready
```

**Current floor problem:** A company with 3 critical + 2 high gaps scores 40/100. A company with 5 critical gaps scores -0 (clamped). The score doesn't distinguish between "bad" and "catastrophic" at the low end.

**Open question #1:** Should the score be normalized (percentage of possible penalty given the specific context), or kept as absolute headroom?

---

## 2. Planned expansion — researched and ready to build

Three phases. All 20 sources are researched; signal yields are estimated from the source APIs and prior testing.

### Phase 1 — Free / fast / no new credentials (7 sources, ~26 new signals, ~9 new gaps)

| Source | New signals | New gaps | Build location |
|--------|-------------|----------|----------------|
| ABN API (AU) | abn_status, abn_age_years, abn_entity_type, abn_gst_registered, abn_anzsic_code, abn_name_match_confidence | abn_missing, entity_mismatch, gst_mismatch | recon-abn.js (AU-guarded) |
| crt.sh deep parse | has_weak_cert_signing, has_misissued_cert, wildcard_cert_count, revoked_cert_count | weak_certificate, misissued_certificate | extend recon-certs.js |
| DNS CAA deep parse | caa_authorised_issuers[], caa_has_iodef, caa_policy_strictness | caa_overly_permissive | extend recon-dns.js |
| Google Safe Browsing | gsb_classification, gsb_last_flagged | google_safe_browsing_flagged (critical) | recon-gsb.js |
| URLscan / PhishTank | phishing_history, malicious_classification, lookalike_domains[] | phishing_risk (high) | recon-urlscan.js |
| VirusTotal | vt_malicious_count, vt_suspicious_count, vt_passive_dns[] | malware_association (critical if >2 vendors) | recon-virustotal.js |
| ASIC lookup (AU) | asic_status, asic_directors[], asic_director_count, asic_insolvency_events, asic_age_years | director_risk, entity_instability | recon-asic.js (AU-guarded) |

**Phase 1 credential requirements:** Google Cloud API key (GSB), VirusTotal API key, URLscan API key, ASIC Connect API key (AU). Everything else is free.

### Phase 2 — OSS self-hosted or paid-but-cheap (4 sources, ~15 new signals, ~6 new gaps)

| Source | New signals | New gaps | Notes |
|--------|-------------|----------|-------|
| Shodan / Censys | exposed_services[], exposed_admin_panels[], vulnerable_service_versions[], exposure_history_score | exposed_admin (high), outdated_service_version (medium) | Censys free tier generous; Shodan $69/mo |
| BuiltWith / Wappalyzer | detected_security_tools[], payment_processors[], third_party_script_count, cms_platform | unmanaged_third_party_scripts (medium) | Wappalyzer library free; BuiltWith paid |
| CreditorWatch / D&B | credit_risk_score, payment_defaults_count, court_actions_against_entity, dbt_days_beyond_terms | counterparty_risk (critical), solvency_risk (high) | ~$100/lookup AU; gate behind enterprise tier |
| AUSTRAC / OFAC sanctions | sanctions_hit, sanctions_entity_name, sanctions_database_source | sanctions_match (critical — zero-tolerance flag) | OFAC free; AUSTRAC AU |

### Phase 3 — Legal grey / expensive / on-demand (4 sources)

| Source | Notes | Decision needed |
|--------|-------|----------------|
| LinkedIn org scrape | Team size, security headcount, hiring velocity. TOS violation risk. | Require explicit founder consent or use LinkedIn API (expensive) |
| G2 / Trustpilot | Enterprise review presence, negative security sentiment. APIs paid. | Gate behind enterprise tier or scrape sparingly |
| Court records (Federal Court AU) | Litigation history, IP disputes, regulatory actions. Semi-structured. | Manual for now; automation is complex |
| Dark web monitoring | Leaked credentials, source code, data for sale. Proprietary databases. | Requires vendor (SpyCloud, Flare, Cybersixgill) |

---

## 3. Corpus interrogation — proof360 as its own signal source

Every proof360 session accumulates structured signals in `signals_object`. Over time this becomes a dataset:
- Sector distribution of companies assessed
- Gap prevalence by sector, stage, geo
- Score distribution
- Correlation between specific gaps and company attributes

**The corpus angle:** proof360 can use its own historical data to contextualise a new assessment. "Companies at your stage in your sector typically have 4–6 gaps. You have 3. You're in the top quartile." This is a signal no external API provides.

**Open question #2:** Should corpus be:
a) A benchmarking overlay (percentile bands shown on the score) — no new gaps, adds context
b) A signal source itself (historical gap prevalence informs confidence of new gap triggers)
c) Both, phased — (a) first as UX, (b) later as ML feature

**Technical shape if (a):** `corpus-stats.js` runs nightly over the `leads.ndjson` / future DB → produces `sector_benchmarks.json` → loaded by `gap-mapper.js` → adds `peer_percentile` field to report.

**Technical shape if (b):** Requires moving sessions to a real DB (currently in-memory only). `signals_object` schema becomes the table schema. Gap prevalence by sector/stage/geo feeds a Bayesian prior that adjusts trigger confidence.

**Dependency:** Corpus (b) requires persistent storage. Persistent storage is a v2 architectural decision. Don't let it block Phase 1 recon expansion.

---

## 4. Scoring model — open questions for convergence

### Q1: Absolute vs normalised score

**Current:** `100 − Σ(weights)` — absolute headroom
**Problem:** A healthcare SaaS in AU has 4 critical gaps available to trigger (hipaa, pci, apra, domain_breach) before any generics. Their theoretical minimum is 0 even with good general controls.
**Alternative:** `score = 100 − (triggered_weight / max_applicable_weight × 100)` — normalised to the applicable gap universe

Normalised is fairer to sector-specific companies but harder to explain. Absolute is simpler to communicate but penalises regulated sectors unfairly.

**Recommendation to test:** Show both — an absolute score (raw 40/100) and a context-adjusted percentile (top 30% for your sector). Surface both to founders; use the percentile for external benchmarking.

### Q2: Confidence tiers on gap triggers

Some gaps are hard (DNS record is missing — 100% certainty). Some are soft (founder says "planning" for compliance — high uncertainty). The current model treats all triggered gaps equally.

**Option:** Add a `trigger_confidence` field (0.0–1.0) per gap and weight the score impact: `adjusted_weight = weight × trigger_confidence`. Hard evidence gaps stay at 1.0; founder-declared gaps with hedging answers get 0.7.

### Q3: Score decay

A score should decay if not refreshed. DNS is checked live; founder answers are from the last submission. If a company submits then 6 months pass, their recon signals are stale.

**Option:** Surface a `last_assessed` date prominently. Let companies re-scan for free (recon only, no founder Q&A) to refresh technical signals. Charge for a full re-assessment.

### Q4: Remediation weighting

Gaps with easy remediations (DMARC — 30 minutes) are weighted the same as gaps with hard remediations (SOC 2 — 6 months). This may over-penalise easily-fixable issues.

**Option:** Add `remediation_effort` (hours / days / weeks / months) as a display field but do NOT change score weighting — the score reflects risk, not effort. Communicate both separately.

---

## 5. Published methodology — what founders see

proof360 should publish how the score is calculated. Founders who understand the model trust the score more. This also makes the assessment defensible to enterprise buyers and investors who ask "how did you get that number?"

### Proposed methodology page content

**What we measure:**
- Technical posture (live scans — DNS, HTTP, TLS, certificates, breach databases, port exposure)
- Business context (website signals — product type, sector, customer type, market)
- Compliance posture (founder-provided — your honest answers to 10 questions)

**How the score works:**
- We start at 100. Every confirmed gap reduces your score by its severity weight.
- Critical gaps (20 pts): SOC 2 absence, no MFA, no cyber insurance, sector-specific regulatory exposure, breach data
- High gaps (10 pts): Email authentication, incident response, endpoint protection, staging exposure
- Medium gaps (5 pts): Security headers, SSO, SPF, TLS configuration
- The score reflects trust readiness — your enterprise deal-closing probability, not just technical hygiene

**What we don't do:**
- We don't guess. Every gap we surface has a specific trigger condition with cited evidence.
- We don't penalise you for being in a regulated sector — we flag what's required and why.
- We don't share your data. Your assessment is private to you.

**How evidence is cited:**
- DNS scans: live record at time of assessment, cited as such
- HTTP/TLS scans: live headers at time of assessment
- Certificate scans: crt.sh log at time of assessment
- Breach data: HIBP domain check at time of assessment
- Founder answers: your own submission, shown back to you

---

## 6. Open questions summary

| # | Question | Options | Blocking? |
|---|----------|---------|-----------|
| 1 | Absolute vs normalised score | Absolute now, percentile overlay | No — show both |
| 2 | Confidence tiers on triggers | Hard/soft trigger weights | Phase 2 |
| 3 | Score decay / freshness | Display last_assessed, offer re-scan | Phase 2 |
| 4 | Remediation weighting | Don't change score; communicate separately | Design only |
| 5 | Corpus as signal source | Benchmarking overlay vs ML prior | After persistent DB |
| 6 | Phase 1 build order | Suggest: GSB → URLscan → VirusTotal → ABN → ASIC → crt.sh deep → CAA deep | For Kiro brief |
| 7 | LinkedIn consent model | Founder opt-in vs TOS workaround | Legal decision |
| 8 | Methodology publication | Public page at proof360.au/methodology | Design + legal |

---

## 7. Build brief (for Kiro after convergence)

Each Phase 1 source follows the same pattern:

```
1. Create api/src/services/recon-<source>.js
2. Export: async function run<Source>Recon(domain, { session_id }) → { ...signals }
3. Add to recon-pipeline.js parallel set with 12s timeout
4. Add context fields to context-normalizer.js merge
5. Add gap triggerCondition in gaps.js referencing new context fields
6. Add gap to gap-mapper.js evidence source/citation maps
7. Add recon line to AuditReading.jsx RECON_SOURCES array
```

Guard conditions:
- AU-only sources: `if (ctx.geo_market !== 'AU' && ctx.hosting_country !== 'AU') return {}`
- API-key-gated sources: `if (!process.env.VIRUSTOTAL_API_KEY) return {}`
- All sources: 12s timeout, swallow failures, return partial results not exceptions

---

*Authored: 2026-04-27*
*Status: Seed — ready for 10-round convergence*
*Next: Take to Claude.ai or ChatGPT for spec lock. Lock this before briefing Kiro.*
