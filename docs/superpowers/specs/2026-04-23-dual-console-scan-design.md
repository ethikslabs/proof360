# Dual-Console Scanning Page — Design Spec

## Goal

Replace the single-terminal scanning page (`AuditReading.jsx`) with a full-viewport dual dark terminal layout. Left pane shows live extraction activity; right pane shows recon findings as each source resolves. User can click through to the cold read at any time.

## Architecture

Two terminal panes, one SSE stream, no new endpoints.

The existing SSE stream at `/api/v1/session/:id/log` carries two event types:
- **`log` events** — extraction activity (existing, unchanged) → left pane
- **`recon` events** — one per recon source as it resolves → right pane

Frontend discriminates on `type` field. Same connection, same component, two instances fed different slices.

---

## Backend Changes

### `recon-pipeline.js` — add per-source callback

Add an optional `onSourceComplete(source, line)` param to `runReconPipeline`. Each source promise gets a `.then()` attached before being passed to `Promise.allSettled`, calling the callback immediately when that source resolves. The `.then()` returns the result so `Promise.allSettled` still receives it correctly.

The `jobs` source has two branches (firecrawl present or skipped). Both branches produce a promise assigned to `jobsPromise`. The callback is then attached at the `safe('jobs', jobsPromise).then(...)` level inside `Promise.allSettled` — this single attachment covers both branches because both resolve through the same `safe()` wrapper:

```js
export async function runReconPipeline(websiteUrl, companyName, options = {}) {
  const { firecrawl, hibpKey, abuseIpdbKey, onSourceComplete } = options;
  // ...

  const jobsPromise = firecrawl
    ? reconJobs(domain, firecrawl)
    : Promise.resolve({ source: 'jobs', skipped: true, reason: 'no firecrawl' });

  const [dns, http, certs, ip, github, jobs, hibp, ports, ssllabs, abuseipdb] =
    await Promise.allSettled([
      safe('dns',       reconDns(websiteUrl)).then(r      => { onSourceComplete?.('dns',       formatReconLine('dns',       r)); return r; }),
      safe('http',      reconHttp(websiteUrl)).then(r     => { onSourceComplete?.('http',      formatReconLine('http',      r)); return r; }),
      safe('certs',     reconCerts(domain)).then(r        => { onSourceComplete?.('certs',     formatReconLine('certs',     r)); return r; }),
      safe('ip',        reconIp(domain)).then(r           => { onSourceComplete?.('ip',        formatReconLine('ip',        r)); return r; }),
      safe('github',    reconGithub(domain, companyName)).then(r => { onSourceComplete?.('github',   formatReconLine('github',   r)); return r; }),
      safe('jobs',      jobsPromise).then(r               => { onSourceComplete?.('jobs',      formatReconLine('jobs',      r)); return r; }),
      safe('hibp',      reconHibp(domain, hibpKey)).then(r       => { onSourceComplete?.('hibp',      formatReconLine('hibp',      r)); return r; }),
      safe('ports',     reconPorts(domain)).then(r        => { onSourceComplete?.('ports',     formatReconLine('ports',     r)); return r; }),
      safe('ssllabs',   reconSslLabs(websiteUrl)).then(r  => { onSourceComplete?.('ssllabs',  formatReconLine('ssllabs',  r)); return r; }),
      safe('abuseipdb', reconAbuseIpdb(domain, abuseIpdbKey)).then(r => { onSourceComplete?.('abuseipdb', formatReconLine('abuseipdb', r)); return r; }),
    ]);
  // ...
}
```

### `recon-pipeline.js` — `formatReconLine(source, result)`

New internal function. Receives the output of `safe()` — which may be:
- A normal result object (source resolved successfully)
- `{ source, error: '...' }` — source timed out or threw
- `{ source, skipped: true, reason: '...' }` — source intentionally skipped (no key, no firecrawl)

Returns a pre-formatted SSE line object for the right pane:

```js
{ type: 'recon', source, text: '[dns]      DMARC not enforced · spoofing risk', color: 'err' }
```

Color mapping:
- `err` (red `#F87171`) — risk found, gap likely
- `ok` (green `#4ADE80`) — clean, no issues
- `query` (blue `#7DD3FC`) — informational, not a risk
- `muted` (grey `#3F3F5A`) — skipped, no data, error, or result too sparse to classify

When `result.error` is set: `color: 'muted'`, text: `[source]   error · skipped`.
When `result.skipped` is set: `color: 'muted'`, text: `[source]   skipped · no key`.
When result has no meaningful data (e.g. `subdomain_count: 0`, `found: false`): use `ok` — absence of a finding is a clean signal.

Source line formats (10 sources total):

| Source | Clean (`ok`) | Risk (`err`) | Info (`query`) |
|--------|-------------|-------------|----------------|
| dns | `[dns]      DMARC enforced · SPF strict` | `[dns]      DMARC not enforced · spoofing risk` | — |
| http | `[http]     6/6 headers set` | `[http]     1/6 headers · CSP missing` | — |
| certs | `[certs]    12 subdomains · none exposed` | — | `[certs]    47 subdomains · 3 staging exposed` |
| ip | `[ip]       AWS ap-southeast-2 · clean` | `[ip]       abuse score 82%` | — |
| github | `[github]   org found · security policy set` | `[github]   no security policy` | — |
| jobs | `[jobs]     no security hiring signals` | — | `[jobs]     active security hiring detected` |
| hibp | `[hibp]     no breaches on record` | `[hibp]     2 breaches · 2019 · 2021` | — |
| ports | `[ports]    no risky ports exposed` | `[ports]    3306 · 5432 exposed` | — |
| ssllabs | `[ssllabs]  grade A · TLS 1.3` | `[ssllabs]  grade B · TLS 1.0 enabled` | — |
| abuseipdb | `[abuseipdb] IP clean · 0 reports` | `[abuseipdb] score 82% · 99 reports` | — |

### `signal-extractor.js` — pass callback

Pass `onSourceComplete` to `runReconPipeline`. The callback emits the line to the session's SSE emitter:

```js
runReconPipeline(website_url, null, {
  firecrawl,
  hibpKey: process.env.HIBP_API_KEY || null,
  abuseIpdbKey: process.env.ABUSEIPDB_API_KEY || null,
  onSourceComplete: (source, line) => log(line),
})
```

**Important:** `runReconPipeline` is wrapped in a `Promise.race` with a 20s timeout in `signal-extractor.js`. If the timeout fires before all sources complete, individual source `.then()` callbacks will continue to fire for already-in-flight promises. These late-arriving callbacks call `log()` which has an SSE closed-stream guard (verify in `session-store.js` — the guard checks whether the SSE response is still writable before emitting) — they are harmless. Do not change the race wrapper.

---

## Frontend Changes

### `AuditReading.jsx` — dual pane layout

**Layout:** Full viewport, dark background (`#0C0C12`). Nav bar at top (unchanged). Below nav: two terminal panes side by side, equal width, equal height, filling remaining viewport. Below both panes: the "See your read →" CTA.

**Left pane — Scanner**
- Title bar: traffic lights + `SCANNER — {domain}` label + green pulse dot while active
- Body: existing log line rendering, 150ms drip, blinking amber cursor
- No behaviour change from current implementation
- Dims (`opacity: 0.4`) when extraction complete (same as current `beatVisible` logic — `beatVisible` becomes true when the signal extractor pipeline finishes, which may be before all recon sources have resolved; this is intentional)

**Right pane — Findings**
- Title bar: traffic lights + `FINDINGS` label
- On mount: initialise an ordered array of 10 pending entries, one per source in canonical order:
  ```js
  const SOURCES = ['dns','http','certs','ip','github','jobs','hibp','ports','ssllabs','abuseipdb'];
  // initial state:
  [{ source: 'dns', text: '[dns]      ⏳', color: 'muted' }, ...]
  ```
- Render the array in order — arrival order is irrelevant, display order is always canonical
- As `type: 'recon'` events arrive on the SSE stream, find the entry by `source` field and replace it in-place (immutable array update at that index)
- No drip delay — recon lines update immediately when they arrive
- Height matches left pane. Content fits without scrolling (10 lines at 1.8 line-height). No scroll needed.

**Removal of existing `beatVisible` completion block**

The current `AuditReading.jsx` renders a full completion block when `beatVisible` is true: a check icon, "Here's what we read about {domain}" heading, and "Step 2 of 3 · Is this right?" label. **This entire block is removed.** The persistent amber CTA below the two panes is the only navigation affordance.

**CTA — "See your read →"**
- Rendered below both panes from the moment the page loads — always visible, always clickable
- Before extraction complete: `opacity: 0.35`, full amber background, clickable
- After extraction complete (`beatVisible === true`): `opacity: 1.0`, one gentle pulse animation to draw attention
- Sub-label below button: before complete → `provenance-backed · not guessed`; after complete → `Step 2 of 3 · Is this right?`
- On click: `navigate(/audit/cold-read?session=${sessionId})` — same as current

---

## Data Flow

```
POST /api/session/start
  └─ signal-extractor.js starts
       ├─ Firecrawl scrape → log() → SSE → left pane
       ├─ Claude extraction → log() → SSE → left pane
       └─ runReconPipeline (parallel, inside 20s race)
            ├─ dns resolves  → .then() → log({type:'recon',...}) → SSE → right pane row 1
            ├─ http resolves → .then() → log({type:'recon',...}) → SSE → right pane row 2
            ├─ ip resolves   → .then() → log({type:'recon',...}) → SSE → right pane row 3
            └─ ... (each source resolves independently over ~12s window)
               (callbacks may fire after 20s race timeout — harmless, SSE guard handles it)
```

---

## Error Handling

- Recon source error (`result.error` set): `color: 'muted'`, text: `[source]   error · skipped`
- Recon source skipped (`result.skipped` set): `color: 'muted'`, text: `[source]   skipped · no key`
- SSE connection dropped: existing error handling in `AuditReading.jsx` unchanged — right pane shows whatever landed before the drop

---

## Out of Scope

- No new API endpoints
- No changes to the cold read page (`AuditColdRead.jsx`) or report
- No changes to session polling (`infer-status`)
- No changes to the `Promise.race` 20s timeout wrapper in `signal-extractor.js`
- Recon results are not re-fetched after page transition — whatever landed is in the session
- No scroll behaviour needed in the right pane (10 lines fits)
