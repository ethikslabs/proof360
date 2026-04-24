# Dual-Console Scanning Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-terminal `AuditReading.jsx` with a full-viewport dual dark terminal layout — left pane shows live extraction activity, right pane shows recon findings as each source resolves.

**Architecture:** One SSE stream carries two event types: existing `log` events feed the left pane; new `recon` events (one per source) feed the right pane. Backend change: each recon source gets a `.then()` callback that calls a new `formatReconLine()` function and emits the formatted line immediately. Frontend change: the right pane renders an ordered 10-entry array, replacing entries in-place as `recon` events arrive. No new endpoints.

**Tech Stack:** Node.js (backend), React + Vite (frontend), IBM Plex Mono (monospace terminal font), SSE (`EventSource`)

**Spec:** `docs/superpowers/specs/2026-04-23-dual-console-scan-design.md`

---

## File Map

| File | Change |
|------|--------|
| `api/src/services/recon-pipeline.js` | Add `formatReconLine()` function; wire `onSourceComplete` callback to all 10 sources |
| `api/src/services/signal-extractor.js` | Pass `onSourceComplete: (source, line) => log(line)` to `runReconPipeline` |
| `frontend/src/pages/AuditReading.jsx` | Add `FindingsPane` component; rewrite main component for dual-pane layout, persistent CTA |

---

## Task 1: `formatReconLine` — pure formatting function

Adds a new internal function to `recon-pipeline.js`. Receives a `safe()` result (which may be a normal result object, `{ source, error }`, or `{ source, skipped }`) and returns a formatted SSE line object for the right pane.

**Files:**
- Modify: `api/src/services/recon-pipeline.js` (append after the `logSummary` function at the bottom of the file)

---

- [ ] **Step 1: Open `api/src/services/recon-pipeline.js` and find the end of the file**

The file currently ends after `function logSummary(p)` at line ~216. Append the two new functions below.

---

- [ ] **Step 2: Add `tag()` helper and `formatReconLine()` after the `logSummary` function**

```js
// ── Recon SSE line formatter ────────────────────────────────────────────────
// Used by onSourceComplete callback to format each source result into
// a right-pane terminal line before emitting over SSE.

function tag(source) {
  // Right-pad the [source] label to column 12 so text aligns across all sources.
  // [abuseipdb] is exactly 11 chars — gets 1 space. Shorter sources get more.
  return `[${source}]`.padEnd(12);
}

export function formatReconLine(source, result) {
  // Error / skipped guards — applies to all sources
  if (!result || result.error) {
    return { type: 'recon', source, text: `${tag(source)}error · skipped`,   color: 'muted' };
  }
  if (result.skipped) {
    return { type: 'recon', source, text: `${tag(source)}skipped · no key`,  color: 'muted' };
  }

  switch (source) {
    case 'dns': {
      const p = result.dmarc_policy;
      if (!p || p === 'missing' || p === 'none') {
        return { type: 'recon', source, text: `${tag(source)}DMARC not enforced · spoofing risk`, color: 'err' };
      }
      return { type: 'recon', source, text: `${tag(source)}DMARC enforced · SPF ${result.spf_policy || 'present'}`, color: 'ok' };
    }

    case 'http': {
      const score = result.security_headers_score ?? 0;
      if (score >= 5) {
        return { type: 'recon', source, text: `${tag(source)}${score}/6 headers set`, color: 'ok' };
      }
      const missing = !result.has_csp ? 'CSP missing' : 'HSTS missing';
      return { type: 'recon', source, text: `${tag(source)}${score}/6 headers · ${missing}`, color: 'err' };
    }

    case 'certs': {
      const count   = result.subdomain_count ?? 0;
      const exposed = result.exposed_sensitive_subdomains?.length ?? 0;
      if (exposed > 0) {
        return { type: 'recon', source, text: `${tag(source)}${count} subdomains · ${exposed} staging exposed`, color: 'query' };
      }
      return { type: 'recon', source, text: `${tag(source)}${count} subdomains · none exposed`, color: 'ok' };
    }

    case 'ip': {
      const provider = result.cloud_provider || result.hosting_provider || 'unknown';
      const country  = result.hosting_country ? ` · ${result.hosting_country}` : '';
      return { type: 'recon', source, text: `${tag(source)}${provider}${country} · clean`, color: 'ok' };
    }

    case 'github': {
      if (!result.found) {
        return { type: 'recon', source, text: `${tag(source)}no org found`, color: 'muted' };
      }
      if (!result.has_security_policy) {
        return { type: 'recon', source, text: `${tag(source)}no security policy`, color: 'err' };
      }
      return { type: 'recon', source, text: `${tag(source)}org found · security policy set`, color: 'ok' };
    }

    case 'jobs': {
      if (!result.found) {
        return { type: 'recon', source, text: `${tag(source)}no careers page found`, color: 'muted' };
      }
      if (result.security_hire_signal || result.compliance_hire_signal) {
        return { type: 'recon', source, text: `${tag(source)}active security hiring detected`, color: 'query' };
      }
      return { type: 'recon', source, text: `${tag(source)}no security hiring signals`, color: 'ok' };
    }

    case 'hibp': {
      const count = result.breach_count ?? 0;
      if (count === 0 && !result.domain_in_breach) {
        return { type: 'recon', source, text: `${tag(source)}no breaches on record`, color: 'ok' };
      }
      return { type: 'recon', source, text: `${tag(source)}${count} breach${count !== 1 ? 'es' : ''} on record`, color: 'err' };
    }

    case 'ports': {
      const risky = result.risky_port_count ?? 0;
      if (risky === 0) {
        return { type: 'recon', source, text: `${tag(source)}no risky ports exposed`, color: 'ok' };
      }
      const notable = (result.open_ports || [])
        .filter(p => p.risk === 'critical' || p.risk === 'high')
        .map(p => p.port)
        .slice(0, 2)
        .join(' · ');
      return { type: 'recon', source, text: `${tag(source)}${notable || `${risky} risky`} exposed`, color: 'err' };
    }

    case 'ssllabs': {
      const grade = result.ssl_grade || '?';
      const proto = (result.protocols || []).includes('TLS1.3') ? 'TLS 1.3' : 'TLS 1.2';
      if (result.has_old_tls) {
        return { type: 'recon', source, text: `${tag(source)}grade ${grade} · TLS 1.0 enabled`, color: 'err' };
      }
      if (['A+', 'A', 'A-'].includes(grade)) {
        return { type: 'recon', source, text: `${tag(source)}grade ${grade} · ${proto}`, color: 'ok' };
      }
      return { type: 'recon', source, text: `${tag(source)}grade ${grade} · review needed`, color: 'err' };
    }

    case 'abuseipdb': {
      const score   = result.abuse_confidence_score ?? 0;
      const reports = result.total_reports ?? 0;
      if (score >= 25) {
        return { type: 'recon', source, text: `${tag(source)}score ${score}% · ${reports} reports`, color: 'err' };
      }
      return { type: 'recon', source, text: `${tag(source)}IP clean · ${reports} reports`, color: 'ok' };
    }

    default:
      return { type: 'recon', source, text: `${tag(source)}done`, color: 'ok' };
  }
}
```

---

- [ ] **Step 3: Verify the function is syntactically correct**

```bash
cd /path/to/proof360/api && node --input-type=module <<'EOF'
import { formatReconLine } from './src/services/recon-pipeline.js';

// Test all 10 sources with mocked results
console.log(formatReconLine('dns',       { dmarc_policy: 'none', spf_policy: 'strict' }));
console.log(formatReconLine('dns',       { dmarc_policy: 'reject', spf_policy: 'strict' }));
console.log(formatReconLine('http',      { security_headers_score: 2, has_csp: false, has_hsts: false }));
console.log(formatReconLine('http',      { security_headers_score: 6 }));
console.log(formatReconLine('certs',     { subdomain_count: 47, exposed_sensitive_subdomains: ['staging.x.com'] }));
console.log(formatReconLine('ip',        { cloud_provider: 'AWS', hosting_country: 'AU' }));
console.log(formatReconLine('github',    { found: true, has_security_policy: false }));
console.log(formatReconLine('jobs',      { found: true, security_hire_signal: true, compliance_hire_signal: false }));
console.log(formatReconLine('hibp',      { domain_in_breach: true, breach_count: 2 }));
console.log(formatReconLine('ports',     { risky_port_count: 0, open_ports: [] }));
console.log(formatReconLine('ssllabs',   { ssl_grade: 'A', protocols: ['TLS1.2','TLS1.3'], has_old_tls: false }));
console.log(formatReconLine('abuseipdb', { abuse_confidence_score: 0, total_reports: 0 }));
console.log(formatReconLine('dns',       { source: 'dns', error: 'timed out' }));
console.log(formatReconLine('hibp',      { source: 'hibp', skipped: true, reason: 'no API key' }));
EOF
```

Expected: 14 lines printed, no exceptions. Every line has `type: 'recon'`, a `source`, a `text` starting with `[`, and a `color` from `{ok, err, query, muted}`.

---

- [ ] **Step 4: Commit**

```bash
git add api/src/services/recon-pipeline.js
git commit -m "feat: add formatReconLine — formats each recon source result into SSE line"
```

---

## Task 2: Wire `onSourceComplete` callback

Threads the callback from `signal-extractor.js` → `runReconPipeline` → each source's `.then()`.

**Files:**
- Modify: `api/src/services/recon-pipeline.js` (lines 28–48 — `runReconPipeline` function)
- Modify: `api/src/services/signal-extractor.js` (line 201 — `runReconPipeline` call)

---

- [ ] **Step 1: In `recon-pipeline.js`, update `runReconPipeline` to accept and wire `onSourceComplete`**

Replace lines 27–50 (the function signature + `Promise.allSettled` block) with:

```js
export async function runReconPipeline(websiteUrl, companyName, options = {}) {
  const {
    firecrawl        = null,
    hibpKey          = process.env.HIBP_API_KEY       || null,
    abuseIpdbKey     = process.env.ABUSEIPDB_API_KEY  || null,
    onSourceComplete = null,
  } = options;
  const domain = extractDomain(websiteUrl);

  console.log(`[recon] Starting pipeline for ${domain}`);

  // Jobs has two branches (firecrawl present or skipped); both resolve through
  // safe() then the shared .then() below — no special handling needed.
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
```

The rest of the function body (building `pipeline`, calling `logSummary`, `return pipeline`) is unchanged.

**Note on late callbacks:** `runReconPipeline` is wrapped in a `Promise.race` 20s timeout inside `signal-extractor.js`. After the race fires, in-flight `.then()` callbacks continue to fire. They call `onSourceComplete → log → appendLog`. The session still exists (24h TTL) so `appendLog` succeeds. The SSE stream's `closed` flag prevents those lines from being sent. This is safe — no changes needed to the race wrapper.

---

- [ ] **Step 2: In `signal-extractor.js`, pass `onSourceComplete` to `runReconPipeline`**

Find line 200–209 (the `Promise.race` block wrapping `runReconPipeline`). The current call is:

```js
runReconPipeline(website_url, null, { firecrawl, abuseIpdbKey: process.env.ABUSEIPDB_API_KEY || null }),
```

Replace with:

```js
runReconPipeline(website_url, null, {
  firecrawl,
  abuseIpdbKey: process.env.ABUSEIPDB_API_KEY || null,
  onSourceComplete: (source, line) => log(line),
}),
```

`log` here is the `log` parameter passed into `extractSignals` — which in production is `(line) => appendLog(session.id, line)` wired in `session-start.js`. The SSE handler in `session-log.js` polls `getLogs(sessionId)` every 200ms and emits new lines including `type: 'recon'` lines.

---

- [ ] **Step 3: Manual verification — confirm `recon` events appear on the SSE stream**

Start the API:
```bash
cd api && node --env-file=.env --watch src/server.js
```

Submit a session:
```bash
curl -s -X POST http://localhost:3002/api/v1/session/start \
  -H 'Content-Type: application/json' \
  -d '{"website_url":"https://ethiks360.com"}' | jq .
```

Note the `session_id`, then stream the log:
```bash
curl -s -N http://localhost:3002/api/v1/session/<session_id>/log
```

Expected: SSE lines stream. After a few seconds, lines with `"type":"recon"` appear — one per source as it resolves. Example:
```
data: {"type":"recon","source":"dns","text":"[dns]        DMARC not enforced · spoofing risk","color":"err"}
data: {"type":"recon","source":"http","text":"[http]       2/6 headers · CSP missing","color":"err"}
```

The recon lines may arrive out of canonical order — that's expected. All 10 sources should eventually produce a recon line (some may be `muted` if skipped/errored).

---

- [ ] **Step 4: Commit**

```bash
git add api/src/services/recon-pipeline.js api/src/services/signal-extractor.js
git commit -m "feat: stream recon findings over SSE as each source resolves"
```

---

## Task 3: `FindingsPane` component

A new React component rendering the right pane: 10-entry ordered array, updated in-place as `recon` events arrive.

**Files:**
- Modify: `frontend/src/pages/AuditReading.jsx` (add before the `AuditReading` export)

---

- [ ] **Step 1: Add constants and `FindingsPane` component to `AuditReading.jsx`**

Add after the existing `LINE_COLORS` constant at the top of the file (after line 12):

```js
const RECON_COLORS = {
  err:   '#F87171',
  ok:    '#4ADE80',
  query: '#7DD3FC',
  muted: '#3F3F5A',
};

const SOURCES = ['dns','http','certs','ip','github','jobs','hibp','ports','ssllabs','abuseipdb'];

function reconTag(source) {
  return `[${source}]`.padEnd(12);
}

const INITIAL_RECON = SOURCES.map(source => ({
  source,
  text:  `${reconTag(source)}⏳`,
  color: 'muted',
}));
```

Then add the `FindingsPane` component after the `TerminalPane` component (after line 93):

```jsx
/* ─── Findings pane — right terminal, recon sources ─────────────────────── */
function FindingsPane({ entries }) {
  return (
    <div style={{
      background: '#0C0C12',
      border: '1px solid #1A1A2E',
      borderRadius: 10,
      overflow: 'hidden',
      fontFamily: '"IBM Plex Mono", monospace',
      flex: 1,
    }}>
      {/* Title bar */}
      <div style={{
        background: '#111120',
        borderBottom: '1px solid #1A1A2E',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        {['#FF5F57', '#FFBD2E', '#28C840'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ marginLeft: 14, fontSize: 11, color: '#3F3F5A', letterSpacing: '0.06em' }}>
          FINDINGS
        </span>
      </div>
      {/* Body — fixed 10 rows, no scroll */}
      <div style={{
        padding: '20px',
        fontSize: 12,
        lineHeight: 1.8,
      }}>
        <div style={{ color: '#3F3F5A', marginBottom: 8, fontSize: 11 }}>
          $ awaiting intelligence...
        </div>
        {entries.map(entry => (
          <div
            key={entry.source}
            style={{ color: RECON_COLORS[entry.color] || '#3F3F5A', minHeight: '1.8em' }}
          >
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

- [ ] **Step 2: Verify the file parses without error**

```bash
cd frontend && npm run lint 2>&1 | head -30
```

Expected: no errors related to `FindingsPane`, `RECON_COLORS`, `SOURCES`, or `INITIAL_RECON`. (The component isn't rendered yet — lint just checks syntax.)

---

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AuditReading.jsx
git commit -m "feat: add FindingsPane component — right pane showing recon results"
```

---

## Task 4: Dual-pane `AuditReading` layout

Rewrites the main `AuditReading` component: full dark background, dual panes side by side, `recon` events routed to right pane, `beatVisible` completion block removed, persistent amber CTA always visible.

**Files:**
- Modify: `frontend/src/pages/AuditReading.jsx` (the `AuditReading` export, lines 96–349)

---

- [ ] **Step 1: Add `reconLines` state and update SSE handler**

In the `AuditReading` function body, after the existing `useState` declarations (after line 109), add:

```js
const [reconLines, setReconLines] = useState(INITIAL_RECON);
```

In the SSE `onmessage` handler (currently at line 149), update to route `recon` events separately. Replace the existing `onmessage` handler:

```js
evtSource.onmessage = (e) => {
  const line = JSON.parse(e.data);
  if (line.type === '__done__') {
    evtSource.close();
    sseCompleteRef.current = true;
    if (!timerRef.current && queueRef.current.length === 0) {
      setBeatVisible(true);
    }
  } else if (line.type === 'recon') {
    // Update the right pane in-place — find by source, replace at that index
    setReconLines(prev => prev.map(entry =>
      entry.source === line.source
        ? { source: line.source, text: line.text, color: line.color }
        : entry
    ));
  } else {
    linesReceivedRef.current++;
    enqueueLine(line);
  }
};
```

---

- [ ] **Step 2: Replace the JSX return with the dual-pane layout**

Replace the entire `return (...)` block (currently lines 218–348) with:

```jsx
return (
  <div style={{
    minHeight: '100vh',
    background: '#0C0C12',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Outfit", sans-serif',
  }}>
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      ::-webkit-scrollbar { display: none; }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes ctaPulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(224,123,57,0.4); }
        50%       { opacity: 0.85; box-shadow: 0 0 0 8px rgba(224,123,57,0); }
      }
      .grain {
        position: fixed; inset: -50%; width: 200%; height: 200%;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        opacity: 0.025; pointer-events: none; z-index: 9999;
      }
    `}</style>

    <div className="grain" />

    {/* Nav — white logo on dark */}
    <nav style={{
      padding: '0 32px', height: 52,
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid #1A1A2E',
    }}>
      <div
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <Proof360Mark size={24} />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#F7F4F0', letterSpacing: '-0.01em' }}>
          Proof<span style={{ color: '#E07B39' }}>360</span>
        </span>
      </div>
    </nav>

    {/* Dual-pane area — fills remaining viewport height */}
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 32px 0',
      gap: 20,
      minHeight: 0,
    }}>

      {/* Two terminal panes */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 16,
        minHeight: 0,
      }}>

        {/* Left pane — Scanner (existing terminal) */}
        <div style={{
          flex: 1,
          background: '#0C0C12',
          border: '1px solid #1A1A2E',
          borderRadius: 10,
          overflow: 'hidden',
          fontFamily: '"IBM Plex Mono", monospace',
          display: 'flex',
          flexDirection: 'column',
          opacity: beatVisible ? 0.4 : 1,
          transition: 'opacity 0.6s',
        }}>
          {/* Title bar */}
          <div style={{
            background: '#111120',
            borderBottom: '1px solid #1A1A2E',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 7,
            flexShrink: 0,
          }}>
            {['#FF5F57', '#FFBD2E', '#28C840'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
            <span style={{ marginLeft: 14, fontSize: 11, color: '#3F3F5A', letterSpacing: '0.06em' }}>
              SCANNER — {domain || '...'}
            </span>
            {!beatVisible && (
              <span style={{
                marginLeft: 'auto',
                width: 7, height: 7, borderRadius: '50%',
                background: '#4ADE80',
                boxShadow: '0 0 6px #4ADE80',
              }} />
            )}
          </div>
          {/* Body with drip lines */}
          <ScannerBody domain={domain} lines={lines} active={!beatVisible} />
        </div>

        {/* Right pane — Findings */}
        <FindingsPane entries={reconLines} />
      </div>

      {/* CTA — always visible, always clickable */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, padding: '16px 0 24px',
      }}>
        <button
          onClick={() => navigate(`/audit/cold-read?session=${sessionId}`)}
          style={{
            padding: '12px 36px',
            background: '#E07B39', color: '#fff',
            fontSize: 15, fontWeight: 700,
            border: 'none', borderRadius: 8,
            cursor: 'pointer',
            fontFamily: '"Outfit", sans-serif',
            letterSpacing: '-0.01em',
            opacity: beatVisible ? 1.0 : 0.35,
            animation: beatVisible ? 'ctaPulse 1.8s ease-in-out 3' : 'none',
            transition: 'opacity 0.5s',
          }}
        >
          See your read →
        </button>
        <span style={{
          fontSize: 11,
          color: '#3F3F5A',
          fontFamily: '"IBM Plex Mono", monospace',
          letterSpacing: '0.04em',
        }}>
          {beatVisible ? 'Step 2 of 3 · Is this right?' : 'provenance-backed · not guessed'}
        </span>
      </div>
    </div>
  </div>
);
```

---

- [ ] **Step 3: Extract scanner body into a `ScannerBody` sub-component (inline)**

The left pane body (scroll area + drip lines + cursor) was previously the body section of `TerminalPane`. Since `TerminalPane` is no longer used as-is, extract its scrolling body section into a `ScannerBody` component. Add this **before** `FindingsPane` in the file:

```jsx
/* ─── Scanner body — scrolling drip lines for left pane ─────────────────── */
function ScannerBody({ domain, lines, active }) {
  const [blink, setBlink] = useState(true);
  const bodyRef = useRef(null);

  useEffect(() => {
    const blinker = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(blinker);
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={bodyRef}
      style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        fontSize: 12,
        lineHeight: 1.8,
      }}
    >
      {lines.length === 0 && (
        <div style={{ color: '#3F3F5A' }}>
          $ proof360 --url {domain || '...'}
        </div>
      )}
      {lines.map((line, i) => (
        <div key={i} style={{ color: LINE_COLORS[line.type] || '#F7F4F0', minHeight: '1.8em' }}>
          {line.text}
        </div>
      ))}
      {active && (
        <span style={{
          display: 'inline-block', width: 7, height: '1em',
          background: blink ? '#E07B39' : 'transparent',
          verticalAlign: 'text-bottom', marginLeft: 2,
        }} />
      )}
    </div>
  );
}
```

The existing `TerminalPane` component can be removed — it is now replaced by the inline left pane div + `ScannerBody`.

---

- [ ] **Step 4: Remove unused code from the file**

- Delete the old `TerminalPane` component (lines 14–93 in the original file — the whole `function TerminalPane(...)` block)
- The status badge (lines 272–291 in the original file) is removed — replaced by the green pulse dot in the scanner title bar
- The `!beatVisible` sub-label block (lines 299–305) is removed — replaced by the CTA sub-label
- The `beatVisible &&` completion block (lines 308–345 — check icon, heading, "Step 2 of 3" label, original button) is removed — the spec says this entire block is removed

---

- [ ] **Step 5: Lint the file**

```bash
cd frontend && npm run lint 2>&1 | head -30
```

Expected: no errors.

---

- [ ] **Step 6: Visual verification in browser**

Start frontend and API:
```bash
# Terminal 1
cd api && node --env-file=.env --watch src/server.js
# Terminal 2
cd frontend && npm run dev
```

Navigate to `http://localhost:5173` (or the Vite dev port). Submit a URL. Verify:

1. The scan page background is `#0C0C12` (near-black) end-to-end
2. Two terminal panes side by side, equal width
3. Left pane title bar shows `SCANNER — {domain}` + green pulse dot
4. Left pane streams extraction log lines with 150ms drip
5. Right pane title bar shows `FINDINGS`
6. Right pane shows 10 `⏳` pending entries on mount
7. As each recon source resolves, the right pane entry updates in-place (no flicker, keeps canonical order)
8. The amber "See your read →" button is always visible at the bottom, `opacity: 0.35` while scanning
9. Sub-label below button reads `provenance-backed · not guessed` while scanning
10. When extraction completes (`beatVisible`): left pane dims to `opacity: 0.4`, button goes to `opacity: 1.0` with pulse animation, sub-label changes to `Step 2 of 3 · Is this right?`
11. Clicking "See your read →" navigates to `/audit/cold-read?session=...` at any time

---

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/AuditReading.jsx
git commit -m "feat: dual-console scanning page — live extraction + findings panes"
```

---

## Deployment note

After all 4 tasks are complete and verified locally, deploy to EC2:

```bash
# On EC2 (ethikslabs-platform, i-010dc648d4676168e)
cd /home/ec2-user/proof360 && bash scripts/deploy.sh
```

Deploy pulls SSM secrets, builds frontend, restarts PM2 with the API. The `ABUSEIPDB_API_KEY` is already in SSM from a previous session.
