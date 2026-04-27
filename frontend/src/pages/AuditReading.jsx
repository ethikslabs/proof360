import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resumeSession } from '../api/client';

/* ─── VECTOR tokens ──────────────────────────────────────────────────────── */
const V_BG      = '#0a0d14';
const V_SURFACE = '#111827';
const V_BORDER  = '#1e293b';
const V_MUTED   = '#64748b';
const V_TEAL    = '#5eead4';

const LINE_COLORS = {
  cmd:   '#f1f5f9',
  muted: V_MUTED,
  ok:    '#22c55e',
  query: '#7DD3FC',
  err:   '#ef4444',
  blank: 'transparent',
};

const RECON_COLORS = {
  err:   '#ef4444',
  ok:    '#22c55e',
  query: '#7DD3FC',
  muted: V_MUTED,
};

const SOURCES = ['dns','http','certs','ip','github','jobs','hibp','ports','ssllabs','abuseipdb'];

const SOURCE_META = {
  dns:       { label: 'DNS',            url: null,                          favicon: null },
  http:      { label: 'HTTP Probe',     url: null,                          favicon: null },
  certs:     { label: 'Cert Chain',     url: null,                          favicon: null },
  ip:        { label: 'IPInfo',         url: 'https://ipinfo.io',           favicon: 'https://ipinfo.io/favicon.ico' },
  github:    { label: 'GitHub',         url: 'https://github.com',          favicon: 'https://github.com/favicon.ico' },
  jobs:      { label: 'Firecrawl',      url: 'https://firecrawl.dev',       favicon: 'https://firecrawl.dev/favicon.ico' },
  hibp:      { label: 'HaveIBeenPwned', url: 'https://haveibeenpwned.com',  favicon: 'https://haveibeenpwned.com/favicon.ico' },
  ports:     { label: 'Shodan',         url: 'https://shodan.io',           favicon: 'https://shodan.io/favicon.ico' },
  ssllabs:   { label: 'SSL Labs',       url: 'https://www.ssllabs.com',     favicon: 'https://www.ssllabs.com/favicon.ico' },
  abuseipdb: { label: 'AbuseIPDB',      url: 'https://www.abuseipdb.com',   favicon: 'https://www.abuseipdb.com/favicon.ico' },
};

const SOURCE_NAME = {
  dns:       'DNS Records',
  http:      'HTTP Security Headers',
  certs:     'TLS Certificate',
  ip:        'IP Reputation',
  github:    'GitHub Exposure',
  jobs:      'Security Hiring',
  hibp:      'HaveIBeenPwned',
  ports:     'Shodan Port Scan',
  ssllabs:   'SSL Labs',
  abuseipdb: 'AbuseIPDB',
};

const SOURCE_DESC = {
  dns:       'DMARC · SPF · DKIM · MX',
  http:      'CSP · HSTS · X-Frame · Headers',
  certs:     'Chain · Expiry · Issuer',
  ip:        'Reputation · Geolocation · Hosting',
  github:    'Org visibility · Code exposure',
  jobs:      'Security hiring signals',
  hibp:      'Known breach databases',
  ports:     'Exposed services · Open ports',
  ssllabs:   'TLS grade · Protocol version',
  abuseipdb: 'IP abuse reports',
};

const SOURCE_DETAIL = {
  dns:       { why: 'Investors and enterprise buyers check DMARC, SPF, and DKIM. Missing email security controls are a fast-fail on most vendor questionnaires.', provider: 'Public DNS resolvers' },
  http:      { why: 'We check 6 critical HTTP security headers — CSP, HSTS, X-Frame-Options, and others. Each missing header is a point deducted by automated security scanners buyers run before signing.', provider: 'Direct HTTP probe' },
  certs:     { why: 'An expired or misconfigured TLS certificate kills trust immediately. We check the full certificate chain, expiry, and issuer.', provider: 'Direct TLS handshake' },
  ip:        { why: 'Your IP reputation signals operational maturity. Shared hosting, flagged IPs, or unexpected geolocations raise flags in investor due diligence.', provider: 'IPInfo + AbuseIPDB' },
  github:    { why: 'Public repositories can expose secrets, internal tooling, and security practices — or their absence. We check your org visibility and any public code signals.', provider: 'GitHub public API' },
  jobs:      { why: "If you're not hiring for security, investors notice. Job listings are one of the few public signals of whether a company takes security seriously as it scales.", provider: 'Public job boards' },
  hibp:      { why: "Have I Been Pwned checks your domain against every known breach database. An open breach is an immediate red flag in any due diligence process.", provider: 'HaveIBeenPwned API' },
  ports:     { why: 'Internet-exposed services that should be behind a gateway. Open ports are the most common finding in enterprise security reviews and the easiest to fix.', provider: 'Shodan / port scan' },
  ssllabs:   { why: 'SSL Labs grades your TLS configuration A through F. Anything below A- triggers automated flags from security teams and enterprise procurement tools.', provider: 'SSL Labs API' },
  abuseipdb: { why: 'Checks whether your IP address has been reported for malicious activity. A flagged IP can block email deliverability and fail automated threat intelligence screens.', provider: 'AbuseIPDB API' },
};

function reconTag(source) {
  return `[${source}]`.padEnd(12);
}

const INITIAL_RECON = SOURCES.map(source => ({
  source,
  text: SOURCE_DESC[source] || source,
  color: 'muted',
}));

/* ─── Source logo strip ──────────────────────────────────────────────────── */
function SourceLogoStrip({ entries }) {
  const [flashing, setFlashing] = useState(new Set());
  const prevColors = useRef({});

  useEffect(() => {
    const justDone = entries
      .filter(e => e.color !== 'muted' && prevColors.current[e.source] === 'muted')
      .map(e => e.source);
    if (justDone.length > 0) {
      setFlashing(prev => new Set([...prev, ...justDone]));
      const t = setTimeout(() => {
        setFlashing(prev => {
          const next = new Set(prev);
          justDone.forEach(s => next.delete(s));
          return next;
        });
      }, 900);
      entries.forEach(e => { prevColors.current[e.source] = e.color; });
      return () => clearTimeout(t);
    }
    entries.forEach(e => { prevColors.current[e.source] = e.color; });
  }, [entries]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexWrap: 'wrap', gap: 6, padding: '14px 0 4px',
    }}>
      {entries.map(entry => {
        const meta = SOURCE_META[entry.source] || {};
        const done = entry.color !== 'muted';
        const flash = flashing.has(entry.source);
        const inner = (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 8,
            border: `1px solid ${flash ? 'rgba(94,234,212,0.5)' : done ? 'rgba(94,234,212,0.15)' : 'rgba(255,255,255,0.05)'}`,
            background: flash ? 'rgba(94,234,212,0.1)' : done ? 'rgba(94,234,212,0.04)' : 'transparent',
            transition: 'all 0.3s ease',
            boxShadow: flash ? '0 0 12px rgba(94,234,212,0.25)' : 'none',
            cursor: meta.url ? 'pointer' : 'default',
            minWidth: 60,
          }}>
            {meta.favicon ? (
              <img
                src={meta.favicon}
                alt={meta.label}
                width={16} height={16}
                style={{
                  opacity: done ? 1 : 0.25,
                  filter: flash ? 'brightness(1.3)' : 'none',
                  transition: 'opacity 0.3s',
                  borderRadius: 3,
                }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div style={{
                width: 16, height: 16, borderRadius: 3,
                background: done ? 'rgba(94,234,212,0.3)' : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 800, color: done ? V_TEAL : V_MUTED,
                fontFamily: 'monospace', transition: 'all 0.3s',
              }}>
                {meta.label.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span style={{
              fontSize: 8, fontFamily: 'monospace', letterSpacing: '0.05em',
              color: flash ? V_TEAL : done ? 'rgba(94,234,212,0.7)' : V_MUTED,
              transition: 'color 0.3s', whiteSpace: 'nowrap',
            }}>
              {meta.label}
            </span>
          </div>
        );
        return meta.url ? (
          <a key={entry.source} href={meta.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            {inner}
          </a>
        ) : (
          <div key={entry.source}>{inner}</div>
        );
      })}
    </div>
  );
}

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
        <div style={{ color: V_MUTED }}>
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
          background: blink ? V_TEAL : 'transparent',
          verticalAlign: 'text-bottom', marginLeft: 2,
        }} />
      )}
    </div>
  );
}

/* ─── Findings pane — right terminal, recon sources ─────────────────────── */
function FindingsPane({ entries }) {
  const [expanded, setExpanded] = useState(null);
  const doneCount = entries.filter(e => e.color !== 'muted').length;
  return (
    <div style={{
      background: V_BG,
      border: `1px solid ${V_BORDER}`,
      borderRadius: 10,
      overflow: 'hidden',
      fontFamily: '"IBM Plex Mono", monospace',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Title bar */}
      <div style={{
        background: V_SURFACE,
        borderBottom: `1px solid ${V_BORDER}`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 7,
        flexShrink: 0,
      }}>
        {['#FF5F57', '#FFBD2E', '#28C840'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ marginLeft: 14, fontSize: 11, color: V_MUTED, letterSpacing: '0.06em' }}>
          INTELLIGENCE SOURCES
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: doneCount === entries.length ? V_TEAL : V_MUTED, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
          {doneCount} / {entries.length} COMPLETE
        </span>
      </div>
      {/* Body — one row per source, click to expand */}
      <div style={{ padding: '16px 20px', fontSize: 12, lineHeight: 1.8, flex: 1, overflowY: 'auto' }}>
        <div style={{ color: V_MUTED, marginBottom: 10, fontSize: 11 }}>
          $ scanning {entries.length} public intelligence sources — click any to learn why
        </div>
        {entries.map(entry => {
          const detail = SOURCE_DETAIL[entry.source];
          const isOpen = expanded === entry.source;
          const resultColor = RECON_COLORS[entry.color] || V_MUTED;
          const isDone = entry.color !== 'muted';
          const resultText = entry.text.replace(/^\S+\s+/, ''); // strip the [tag] prefix
          return (
            <div key={entry.source} style={{ marginBottom: 4 }}>
              <button
                onClick={() => setExpanded(isOpen ? null : entry.source)}
                style={{
                  width: '100%', background: isOpen ? 'rgba(94,234,212,0.06)' : 'transparent',
                  border: `1px solid ${isOpen ? 'rgba(94,234,212,0.2)' : 'transparent'}`,
                  borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                  padding: '8px 10px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.15s, border-color 0.15s',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Status dot */}
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? resultColor : V_MUTED,
                  opacity: isDone ? 1 : 0.4,
                }} />
                {/* Source name — real name, always visible */}
                <span style={{ fontSize: 11, fontWeight: 700, color: isDone ? resultColor : V_MUTED, minWidth: 130, flexShrink: 0 }}>
                  {SOURCE_NAME[entry.source] || entry.source.toUpperCase()}
                </span>
                {/* Result text */}
                <span style={{ fontSize: 11, color: isDone ? resultColor : V_MUTED, flex: 1, opacity: isDone ? 0.85 : 0.45 }}>
                  {isDone ? resultText : SOURCE_DESC[entry.source]}
                </span>
                {/* Click affordance */}
                <span style={{
                  fontSize: 9, color: V_TEAL, fontWeight: 700, letterSpacing: '0.05em',
                  flexShrink: 0, opacity: 0.7,
                }}>
                  {isOpen ? 'HIDE ▴' : 'WHY ▾'}
                </span>
              </button>
              {isOpen && detail && (
                <div style={{
                  background: 'rgba(94,234,212,0.04)',
                  border: `1px solid rgba(94,234,212,0.15)`,
                  borderTop: 'none',
                  borderRadius: '0 0 6px 6px',
                  padding: '12px 14px',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}>
                  <p style={{ fontSize: 11, color: '#f1f5f9', lineHeight: 1.7, marginBottom: 8 }}>{detail.why}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, color: V_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Provider</span>
                    <span style={{
                      fontSize: 10, color: V_TEAL, fontWeight: 700,
                      background: 'rgba(94,234,212,0.08)', border: '1px solid rgba(94,234,212,0.2)',
                      borderRadius: 4, padding: '2px 8px',
                    }}>{detail.provider}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Suggest a source */}
      <div style={{
        borderTop: `1px solid ${V_BORDER}`,
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 10, color: V_MUTED }}>Know a source we should add?</span>
        <a
          href="mailto:ethiks360.jp@gmail.com?subject=Proof360 source suggestion"
          style={{ fontSize: 10, color: V_TEAL, textDecoration: 'none', borderBottom: `1px solid rgba(94,234,212,0.3)`, paddingBottom: 1 }}
        >
          Tell us →
        </a>
      </div>
    </div>
  );
}

/* ─── AuditReading ───────────────────────────────────────────────────────── */
export default function AuditReading() {
  const [params]  = useSearchParams();
  const sessionId = params.get('session');
  const rawUrl    = params.get('url') || '';
  const navigate  = useNavigate();

  const [lines,       setLines]       = useState([]);
  const [beatVisible, setBeatVisible] = useState(false);
  const [reconLines, setReconLines] = useState(INITIAL_RECON);
  const [canResume,  setCanResume]  = useState(false);
  const [resuming,   setResuming]   = useState(false);

  // Throttle queue — lines drip at 150ms each regardless of burst rate
  const queueRef        = useRef([]);
  const timerRef        = useRef(null);
  const sseCompleteRef  = useRef(false);
  const linesReceivedRef = useRef(0);

  let domain = rawUrl;
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    domain = parsed.hostname.replace('www.', '');
  } catch { /* ignore parse error */ }

  function drainQueue() {
    if (queueRef.current.length === 0) {
      timerRef.current = null;
      if (sseCompleteRef.current) setBeatVisible(true);
      return;
    }
    const next = queueRef.current.shift();
    if (next.type === 'recon') {
      setReconLines(prev => prev.map(entry =>
        entry.source === next.source
          ? { source: next.source, text: next.text, color: next.color }
          : entry
      ));
    } else {
      setLines(prev => [...prev, next]);
    }
    timerRef.current = setTimeout(drainQueue, 150);
  }

  function enqueueLine(line) {
    queueRef.current.push(line);
    if (!timerRef.current) {
      timerRef.current = setTimeout(drainQueue, 0);
    }
  }

  useEffect(() => {
    if (!sessionId) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const evtSource = new EventSource(`${apiBase}/api/v1/session/${sessionId}/log`);

    evtSource.onmessage = (e) => {
      const line = JSON.parse(e.data);
      if (line.type === '__done__') {
        evtSource.close();
        sseCompleteRef.current = true;
        // If queue already drained, show beat immediately
        if (!timerRef.current && queueRef.current.length === 0) {
          setBeatVisible(true);
        }
      } else {
        if (line.type !== 'recon') linesReceivedRef.current++;
        enqueueLine(line);
      }
    };

    evtSource.onerror = () => {
      // EventSource fires onerror on ANY close, including clean server-initiated ones.
      // Delay to let onmessage(__done__) process first, then check real session status.
      setTimeout(async () => {
        if (sseCompleteRef.current) return; // __done__ already received — not an error
        evtSource.close();
        sseCompleteRef.current = true;

        if (linesReceivedRef.current === 0) {
          // Never received a single line — genuine connection failure
          enqueueLine({ text: '  ✗  Could not connect to VERITAS', type: 'err' });
          enqueueLine({ text: '  ↳  Is the API running?', type: 'muted' });
          return;
        }

        // Got real data but no __done__ — check what actually happened
        try {
          const apiBase = import.meta.env.VITE_API_BASE_URL || '';
          const res = await fetch(`${apiBase}/api/v1/session/${sessionId}/infer-status`);
          if (res.ok) {
            const { status } = await res.json();
            if (status === 'complete') {
              // Extraction finished fine — SSE just dropped the closing frame
              // Drain the queue then show the beat
              if (!timerRef.current && queueRef.current.length === 0) {
                setBeatVisible(true);
              } else {
                // Mark done so drainQueue triggers beat on next empty drain
                sseCompleteRef.current = true;
              }
              return;
            }
            if (status === 'failed') {
              enqueueLine({ text: '  ✗  Extraction failed — check API logs', type: 'err' });
              setCanResume(true);
              return;
            }
            // Still processing — stream dropped while live
            enqueueLine({ text: `  ✗  Connection lost (session: ${status})`, type: 'err' });
            enqueueLine({ text: '  ↳  Refresh to retry', type: 'muted' });
          } else {
            enqueueLine({ text: `  ✗  Connection lost · status check ${res.status}`, type: 'err' });
          }
        } catch (fetchErr) {
          enqueueLine({ text: `  ✗  Connection lost · ${fetchErr.message}`, type: 'err' });
        }
      }, 600);
    };

    return () => {
      evtSource.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId]);

  return (
    <div style={{
      minHeight: '100vh',
      background: V_BG,
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
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(94,234,212,0.4); }
          50%       { opacity: 0.85; box-shadow: 0 0 0 8px rgba(94,234,212,0); }
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
        borderBottom: `1px solid ${V_BORDER}`,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/glyph.svg" width={24} height={24} alt="" />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F7F4F0', letterSpacing: '-0.01em' }}>
            Proof<span style={{ color: V_TEAL }}>360</span>
          </span>
        </Link>
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

          {/* Left pane — Scanner */}
          <div style={{
            flex: 1,
            background: V_BG,
            border: `1px solid ${V_BORDER}`,
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
              background: V_SURFACE,
              borderBottom: `1px solid ${V_BORDER}`,
              padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 7,
              flexShrink: 0,
            }}>
              {['#FF5F57', '#FFBD2E', '#28C840'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
              <span style={{ marginLeft: 14, fontSize: 11, color: V_MUTED, letterSpacing: '0.06em' }}>
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
            {/* Drip body */}
            <ScannerBody domain={domain} lines={lines} active={!beatVisible} />
          </div>

          {/* Right pane — Findings */}
          <FindingsPane entries={reconLines} />
        </div>

        {/* Source logo strip — services being queried */}
        <SourceLogoStrip entries={reconLines} />

        {/* CTA — always visible, always clickable */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 8, padding: '16px 0 24px',
        }}>
          {canResume && !resuming && (
            <button
              onClick={async () => {
                setResuming(true);
                setCanResume(false);
                try {
                  await resumeSession(sessionId);
                  // Reset SSE state and reconnect
                  sseCompleteRef.current = false;
                  linesReceivedRef.current = 0;
                  enqueueLine({ text: '', type: 'blank' });
                  enqueueLine({ text: '  ↻  Resuming extraction...', type: 'muted' });

                  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
                  const evtSource = new EventSource(`${apiBase}/api/v1/session/${sessionId}/log`);
                  evtSource.onmessage = (e) => {
                    const line = JSON.parse(e.data);
                    if (line.type === '__done__') {
                      evtSource.close();
                      sseCompleteRef.current = true;
                      if (!timerRef.current && queueRef.current.length === 0) setBeatVisible(true);
                    } else if (line.type === 'recon') {
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
                  evtSource.onerror = () => { evtSource.close(); };
                } catch (err) {
                  enqueueLine({ text: `  ✗  Resume failed: ${err.message}`, type: 'err' });
                  setCanResume(true);
                } finally {
                  setResuming(false);
                }
              }}
              style={{
                padding: '10px 28px',
                background: 'transparent', color: V_TEAL,
                fontSize: 13, fontWeight: 600,
                border: `1px solid ${V_TEAL}`, borderRadius: 8,
                cursor: 'pointer',
                fontFamily: '"Outfit", sans-serif',
                marginBottom: 4,
              }}
            >
              ↻ Resume scan
            </button>
          )}
          {resuming && (
            <span style={{ fontSize: 12, color: V_MUTED, fontFamily: '"IBM Plex Mono", monospace' }}>
              Resuming...
            </span>
          )}
          <button
            onClick={() => navigate(`/audit/cold-read?session=${sessionId}`)}
            style={{
              padding: '12px 36px',
              background: V_TEAL, color: '#0a0d14',
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
            color: V_MUTED,
            fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: '0.04em',
          }}>
            {beatVisible ? 'Step 2 of 3 · Is this right?' : 'provenance-backed · not guessed'}
          </span>
        </div>
      </div>
    </div>
  );
}
