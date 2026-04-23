import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Proof360Mark } from '../components/Proof360Mark';

const LINE_COLORS = {
  cmd:   '#F7F4F0',
  muted: '#52525B',
  ok:    '#4ADE80',
  query: '#7DD3FC',
  err:   '#F87171',
  blank: 'transparent',
};

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

/* ─── AuditReading ───────────────────────────────────────────────────────── */
export default function AuditReading() {
  const [params]  = useSearchParams();
  const sessionId = params.get('session');
  const rawUrl    = params.get('url') || '';
  const navigate  = useNavigate();

  const [lines,       setLines]       = useState([]);
  const [beatVisible, setBeatVisible] = useState(false);
  const [reconLines, setReconLines] = useState(INITIAL_RECON);

  // Throttle queue — lines drip at 150ms each regardless of burst rate
  const queueRef        = useRef([]);
  const timerRef        = useRef(null);
  const sseCompleteRef  = useRef(false);
  const linesReceivedRef = useRef(0);

  let domain = rawUrl;
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    domain = parsed.hostname.replace('www.', '');
  } catch {}

  function drainQueue() {
    if (queueRef.current.length === 0) {
      timerRef.current = null;
      if (sseCompleteRef.current) setBeatVisible(true);
      return;
    }
    const next = queueRef.current.shift();
    setLines(prev => [...prev, next]);
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
      } else if (line.type === 'recon') {
        // Update right pane in-place — find by source, replace at that index
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

          {/* Left pane — Scanner */}
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
            {/* Drip body */}
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
}
