# Brief — Signal Pipeline Expansion

**Status:** Committed. Runs parallel to Track A, not gated by it.
**Scope:** Add signal sources catalogued in `signal-source-inventory.md` and `self-hosted-signal-stack.md` to the existing `recon-pipeline.js` parallel set.
**Executor:** Kiro (Builder). Overnight grind. Self-contained per source.
**Operator:** Claude.ai
**Authority:** John Coates

---

## What this brief does NOT do

- Does not change `recon-pipeline.js` execution model (Promise.allSettled, 12s timeout per source, swallow failures — all preserved)
- Does not block Track A revenue build
- Does not invent commercial terms, API keys, paid subscriptions — any paid-source integration deferred until John provisions credentials
- Does not change the report UI (new signals appear in existing gap cards)

---

## Deliverables

Each source = one service file in `api/src/services/`, one import line in `recon-pipeline.js`, one context extraction block in `extractReconContext()`, gap additions in `gaps.js`. Self-contained. Independent.

### Phase 1 — Free, fast, low-risk (Kiro overnight)

Pure extensions to existing files or new parallel services. No external dependencies beyond what's already in the repo.

| # | Source | File | Type |
|---|---|---|---|
| A1 | DNS CAA deep parse | extend `recon-dns.js` | parse existing |
| A2 | crt.sh deep parse (weak/misissued certs) | extend `recon-certs.js` | parse existing |
| A3 | Privacy policy deep parse | extend `signal-extractor.js` | Firecrawl extension |
| A4 | Blog + content cadence | extend `signal-extractor.js` | Firecrawl extension |
| A5 | HackerNews mentions | `recon-hn.js` | free Firebase API |
| A6 | Reddit mentions | `recon-reddit.js` | free via PRAW / snoowrap |
| A7 | ProductHunt presence | `recon-producthunt.js` | free API |
| A8 | YouTube channel + founder videos | `recon-media.js` | YouTube Data API free tier |
| A9 | ABN Business Register (AU) | `recon-abn.js` | free public API |
| A10 | AusTender contracts (AU) | `recon-austender.js` | data.gov.au free |
| A11 | OAIC Notifiable Data Breaches (AU) | `recon-oaic.js` | scrape, free |
| A12 | AUSTRAC reporting entity (AU) | `recon-austrac.js` | scrape, free |
| A13 | ASIC AFSL / Credit License (AU) | `recon-afsl.js` | scrape, free |
| A14 | Modern Slavery Register (AU) | `recon-slavery.js` | scrape, free |
| A15 | AustLII court records (AU) | `recon-litigation.js` | scrape, free |
| A16 | Regulator enforcement outcomes (ACCC+ASIC+OAIC+APRA) | `recon-regulators.js` | scrape, free |
| A17 | News media scan | `recon-news.js` | Google News RSS free |

### Phase 2 — OSS libraries / self-hosted tools (Kiro grinds through)

These need the self-hosted tool standing up but are free once deployed.

| # | Source | File | Tool |
|---|---|---|---|
| B1 | Wappalyzer tech stack | `recon-tech.js` | Wappalyzer OSS library |
| B2 | Deep GitHub crawl (secrets, CVEs, hygiene) | new two-stage `recon-github.js` | TruffleHog, Gitleaks, Octokit, GitHub Advisory DB |
| B3 | Sanctions screening | `recon-sanctions.js` | OpenSanctions bulk data (self-hosted) |
| B4 | IP reputation aggregate | extend `recon-ip.js` | Spamhaus + FireHOL + Abuse.ch feeds (local DB) |
| B5 | URL reputation | `recon-url-reputation.js` | URL Haus + PhishTank + OpenPhish (local DB) |
| B6 | Google Safe Browsing local | extend `recon-url-reputation.js` | GSB v4 Update API (downloadable hashes) |
| B7 | TLS deep inspection | extend `recon-ssllabs.js` | testssl.sh self-hosted |
| B8 | IP geolocation | replace ipapi.co dependency in `recon-ip.js` | MaxMind GeoLite2 local DB |

### Phase 3 — Paid, or grey-area, or deferred

Not in Kiro overnight scope. Gated on explicit John go-ahead.

| # | Source | Deferral reason |
|---|---|---|
| C1 | Shodan / Censys | Shodan paid, Censys fine on free tier — Kiro can wire Censys |
| C2 | VirusTotal | free tier only — Kiro can wire |
| C3 | URLscan.io | free tier — Kiro can wire |
| C4 | LinkedIn scrape | TOS grey area, defer |
| C5 | G2 / Trustpilot / Capterra | paid |
| C6 | BuiltWith | replaced by Wappalyzer (B1) |
| C7 | Glassdoor / SEEK | paid/grey |
| C8 | Twitter / X | API paid, deferred |
| C9 | Facebook page | Graph API restricted, defer |
| C10 | Crunchbase | free tier very limited, defer |
| C11 | ASIC company deep | paid |
| C12 | CreditorWatch / D&B | paid |
| C13 | Founder track record cross-source | needs LinkedIn + ASIC deep, defer |

**Phase 3 additions once decisions made:** Censys, VirusTotal free tier, URLscan free tier can promote to Phase 2.

---

## Per-source build template

Each Kiro-built recon module follows this pattern (matches existing `recon-dns.js` / `recon-http.js` etc.):

```javascript
// api/src/services/recon-SOURCE.js
export async function reconSource(input, options = {}) {
  // 1. Execute the signal fetch
  // 2. Return structured object with { source: 'SOURCE', ...fields }
  // 3. Catch internally — return { source, error: '...' } on failure
  // 4. Respect 12s timeout via parent Promise.race
}
```

Wired into `recon-pipeline.js`:
```javascript
// Add to Promise.allSettled array
safe('sourceName', reconSource(input, opts))
  .then(r => { onSourceComplete?.('sourceName', formatReconLine('sourceName', r)); return r; })

// Add to pipeline object return
sourceName: unwrap(sourceName, 'sourceName'),

// Add extraction to extractReconContext
if (pipeline.sourceName && !pipeline.sourceName.error) {
  const s = pipeline.sourceName;
  ctx.field_1 = s.field_1 ?? null;
  // ...
}

// Add formatReconLine case for SSE display
case 'sourceName': { /* return { type, source, text, color } */ }
```

Gap additions to `api/src/config/gaps.js` use the same shape as existing gaps. Reference `signal-source-inventory.md` for exact signal names and gap definitions per source.

---

## Guard conditions (respect these)

Several sources are only relevant under certain context. Kiro gates calls on guards to avoid wasted requests:

| Source | Guard |
|---|---|
| ABN, AusTender, OAIC, AUSTRAC, AFSL, Modern Slavery, AustLII, AU regulators | `geo_market: AU` OR `hosting_country: AU` |
| HIPAA checks (existing) | `sector: healthcare` OR `data_sensitivity: Healthcare data` |
| PCI, fintech recon | `handles_payments: true` OR `sector: fintech` |
| Facebook (future) | `customer_type: Consumer` OR `Mixed` |
| ProductHunt | `product_type: B2B SaaS` OR `Platform` OR `API` |

Guard evaluation happens after initial business-signal extraction; guarded sources run in a second parallel wave if guards match.

---

## Self-hosted tool deployment (see `self-hosted-signal-stack.md`)

All of Phase 2 runs on self-hosted tools. Infrastructure decisions (see architecture section below) determine placement. Kiro can scaffold the integration code assuming each tool is reachable on a known endpoint:

- **SpiderFoot:** REST API, Kiro wires as fallback/complement to individual modules
- **TruffleHog / Gitleaks:** CLI or library, run against cloned repos
- **testssl.sh:** CLI invocation
- **OpenSanctions:** bulk data in Postgres table `sanctions_entities`, queried via SQL
- **MaxMind GeoLite2:** `.mmdb` file, `maxmind/geoip2-node` library
- **Spamhaus / FireHOL / URL Haus feeds:** ingested to Postgres tables, refreshed nightly

---

## Non-negotiable constraints

1. **Recon-pipeline.js execution model stays the same.** Promise.allSettled, 12s per-source timeout, silent failure, fire-and-forget.
2. **All failures swallowed.** One source failing never blocks the report.
3. **Guards respected.** No AU-specific calls on non-AU leads.
4. **VERITAS doctrine preserved.** Signals feed claims; claims are governed. No claim asserted without source attribution in signals_object.
5. **AWS-aligned.** All self-hosted tools deploy on AWS substrate (see architecture below).
6. **Rate limits respected per source.** GitHub auth'd (5000/hr), YouTube (10k units/day), Reddit (60/min), etc. Kiro implements per-source throttling.

---

## Signals yield (total if all Phase 1 + Phase 2 complete)

| Phase | New signals | New gaps |
|---|---|---|
| Phase 1 (17 sources) | ~70 | ~20 |
| Phase 2 (8 sources) | ~40 | ~15 |
| **Total** | **~110 new signals** | **~35 new gaps** |

Existing pipeline produces ~55 signals. Post-expansion: ~165 signals feeding the report.

---

## Handoff notes

- Git: John runs commits.
- Env: each module lists required env vars; Kiro adds to `api/.env.example` and flags for SSM.
- Testing: extend manual test matrix in CLAUDE.md with per-source mock responses.
- Claude Code verifies each module after Kiro completes (runs tests, flags issues, does not fix).
- Deploy: existing `scripts/deploy.sh`, extended with feed-refresh cron jobs once self-hosted tools are up.

---

*Signal pipeline expansion is the input surface for proof360's trust score. More signals = more gap coverage = more vendor routing = more lead types = more revenue. Runs parallel to Track A, not sequential.*
