# Self-Hosted Signal Stack

**Purpose:** catalogue of open-source / self-hostable equivalents for the signal sources in `signal-source-inventory.md`. Same principle as Firecrawl (self-hosted instead of paid API).

**Status:** inventory only. Deployment decisions per source left to John.

---

## The big one

### SpiderFoot — full OSINT framework, self-hosted

Covers 60–70% of the signal inventory in a single deployable container. Open-source, Python, MIT-licensed. 200+ modules.

Covers from our inventory:
- Shodan (via module) — tech #1
- VirusTotal, AbuseIPDB (modules) — tech #3
- HIBP (module)
- crt.sh, CertStream — tech #4
- BuiltWith / Wappalyzer equivalents — tech #7
- Google Safe Browsing — tech #9
- Sanctions screening — risk #19
- News media scraping — risk #20
- Social media modules (limited) — social #27–31
- Founder track record (via cross-ref modules) — risk #25
- DNS, ports, IP reputation — existing recon

Deployment: Docker container, REST API. One scan returns structured results matching proof360's context shape with an adapter.

Limitation: some modules wrap paid APIs (Shodan, VirusTotal full). Free-only modules still cover most ground.

**Single biggest lever if the goal is "put this on my infra."**

---

## By deployment shape

### Libraries (drop-in packages, no service)

| Source covered | Library | Replaces | License |
|---|---|---|---|
| Tech stack detection | `wappalyzer` (open-source core) | BuiltWith | MIT |
| Reddit | `PRAW` (Python), `snoowrap` (Node) | Reddit API direct | BSD |
| Hacker News | native Firebase API (free) + `hn-api` libs | n/a | free |
| YouTube | `yt-dlp` | YouTube Data API for richer pulls | Unlicense |
| Domain WHOIS | `whois` native + `node-whois` | paid WHOIS providers | free |
| DNS CAA deep parse | `dns.promises` + `node-caa` | extends existing | free |
| HTML parsing / privacy policy parse | `cheerio`, `jsdom`, `readability` | n/a | MIT |
| Sanctions matching | `@opensanctions/matching` npm package | Dow Jones, World-Check | MIT |

### Services / daemons (self-hosted)

| Source covered | Service | Replaces | Deploy |
|---|---|---|---|
| OSINT aggregation | **SpiderFoot** | many | Docker, REST API |
| Threat intel platform | **OpenCTI** | closed threat intel platforms | Docker Compose |
| Malware info sharing | **MISP** | closed threat intel | Docker |
| Port / service sweep | **nmap** + **masscan** | Shodan (partial) | binary, CLI |
| TLS inspection | **testssl.sh** | SSL Labs (complements) | bash script |
| CT log streaming | **CertStream** server | crt.sh realtime | Docker |
| Web archive | **ArchiveBox** | Wayback Machine lookups | Docker |
| Privacy-preserving IP geo | **MaxMind GeoLite2** server | ipapi.co | DB file + library |
| Headless scrape at scale | **Firecrawl** (existing) | paid scrapers | already deployed |

### Downloadable data feeds (static, refresh on cron)

Mostly free, no API rate limits, live in your own DB / Postgres / Elastic.

| Source covered | Feed | Replaces | License |
|---|---|---|---|
| Sanctions + PEP + enforcement | **OpenSanctions** bulk data | Dow Jones, World-Check, manual OFAC | CC-BY 4.0 |
| Breach corpus | **HIBP password hash + domain dumps** | HIBP API lookups | free (bandwidth cost) |
| URL blocklists | **URL Haus**, **PhishTank**, **OpenPhish** | paid phishing feeds | free |
| Malware URLs | **Abuse.ch ThreatFox** | paid IoC feeds | free |
| IP reputation | **Spamhaus DROP / EDROP / SBL**, **FireHOL IP lists**, **AlienVault OTX** | AbuseIPDB (partial) | free |
| Safe Browsing local | **Google Safe Browsing v4 Update API** | GSB live API | free |
| Cert transparency mirror | **CT log downloader** (Google, Cloudflare logs) | crt.sh | free |
| AU sanctions | **DFAT Consolidated List** (XML download) | manual lookups | free |
| US sanctions | **OFAC SDN + Consolidated list** (XML/CSV) | manual lookups | free |
| EU sanctions | **EU Consolidated List** (XML download) | manual lookups | free |

### Open data endpoints (free, public, just hit them)

| Source | Endpoint | Notes |
|---|---|---|
| ABN (AU business) | abr.business.gov.au JSON API | free, auth key required, no rate limit stated |
| AusTender | data.gov.au CSV / API | free, bulk available |
| AustLII court records | austlii.edu.au | scrape-friendly, free |
| OAIC NDB register | oaic.gov.au notifications page | scrape, free |
| AUSTRAC reporting entity | austrac.gov.au register search | scrape, free |
| ASIC Connect (limited) | asic.gov.au — some free searches | limited, most paid |
| Modern Slavery Register | modernslaveryregister.gov.au | scrape, free |

---

## What stays paid / commercial (no viable OSS replacement)

These remain unavoidable paid if used:

- **ASIC company register (deep)** — closed commercial
- **CreditorWatch / D&B** — proprietary credit scoring
- **Crunchbase** — proprietary funding data (partial free tier)
- **LinkedIn** — TOS restricts, scrapers fragile
- **G2 / Trustpilot / Glassdoor** — proprietary review data
- **X (Twitter)** — API paid, scrapers heavily restricted post-2023
- **Facebook Graph** — restricted API

Strategy: budget these as Tier 2 / paid-per-lookup gate. Trigger only on qualified leads, not every assessment.

---

## Recommended self-hosted stack (if goal = minimise per-lookup cost)

**Core (one Docker host):**
- **Firecrawl** — already running
- **SpiderFoot** — new, covers the broadest surface
- **OpenSanctions** — new, bulk sanctions + PEP
- **MaxMind GeoLite2** — replace ipapi.co
- **testssl.sh** — replace/complement SSL Labs
- **nmap / masscan** — replace Shodan for port/service sweep

**Data pipelines (refresh via cron, load into Postgres):**
- OpenSanctions bulk
- Spamhaus DROP / EDROP
- FireHOL IP lists
- URL Haus / PhishTank
- HIBP domain corpus (if scale justifies)
- OFAC / DFAT / EU sanctions XML

**Kept as external (free) APIs:**
- ABN Business Register
- AusTender
- HackerNews Firebase
- Reddit (free tier via PRAW)
- ProductHunt
- YouTube Data API free tier
- Google Safe Browsing v4 Update API (local lookup)

**Kept paid (budget-gated):**
- ASIC deep (per-lookup)
- CreditorWatch (on qualified leads only)
- X / LinkedIn / Glassdoor (if actually needed — many proxies exist)

---

## What this unlocks

- Per-assessment cost drops toward zero infrastructure-wise (compute only)
- Scales without API rate limits
- Data sovereignty on the stack matches Ethiks360 + VERITAS sovereignty doctrine
- Offline / air-gapped deployments become possible (sovereign customer installs)
- Marketplace co-sell story strengthens (AWS Marketplace customers run on their own infra, not on third-party hosted APIs)

---

## Next actions

1. Decide SpiderFoot deployment target (same EC2 box as proof360, separate instance, ECS)
2. Decide which paid APIs stay and which get replaced first
3. Kiro integrates self-hosted sources into `recon-pipeline.js` parallel set
4. Data feed refresh jobs (cron / EventBridge rule) for OpenSanctions, FireHOL, etc.
5. Partner register `marketplace_aws_listed` flag cross-check against self-hosted capability (sovereign customers need self-hosted stack)

---

*Companion to `signal-source-inventory.md`. Same sources, different axis: what can run on John's infrastructure vs what stays external.*
