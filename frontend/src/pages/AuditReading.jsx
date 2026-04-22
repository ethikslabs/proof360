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

/* ─── Terminal pane — renders real SSE lines ─────────────────────────────── */
function TerminalPane({ domain, lines, active }) {
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
    <div style={{
      background: '#0C0C12',
      border: '1px solid #1A1A2E',
      borderRadius: 10,
      overflow: 'hidden',
      fontFamily: '"IBM Plex Mono", monospace',
      width: '100%',
      maxWidth: 560,
    }}>
      {/* Traffic lights */}
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
          VERITAS — trust intelligence
        </span>
        {active && (
          <span style={{
            marginLeft: 'auto',
            width: 7, height: 7, borderRadius: '50%',
            background: '#4ADE80',
            boxShadow: '0 0 6px #4ADE80',
          }} />
        )}
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        style={{
          padding: '20px',
          height: 360,
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

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

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
      minHeight: '100vh', background: '#FFFFFF',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Outfit", sans-serif',
    }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .fade-in  { animation: fadeUp 0.6s ease both; }
        .fade-in-2 { animation: fadeUp 0.6s ease both 0.15s; }
        .grain {
          position: fixed; inset: -50%; width: 200%; height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.025; pointer-events: none; z-index: 9999;
        }
      `}</style>

      <div className="grain" />

      {/* Nav */}
      <nav style={{
        padding: '0 32px', height: 52,
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid #E4E7EC',
      }}>
        <div
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <Proof360Mark size={24} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0B2545', letterSpacing: '-0.01em' }}>
            Proof<span style={{ color: '#E07B39' }}>360</span>
          </span>
        </div>
      </nav>

      {/* Main */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
        gap: 36,
      }}>

        {/* Status badge */}
        <div className="fade-in" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid #E4E7EC', borderRadius: 20,
          padding: '5px 14px',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: beatVisible ? '#4ADE80' : '#E07B39',
            display: 'inline-block',
            animation: beatVisible ? 'none' : 'pulse 1.2s ease-in-out infinite',
            transition: 'background 0.4s',
          }} />
          <span style={{
            fontSize: 11, color: '#52525B',
            fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: '0.07em',
          }}>
            {beatVisible ? 'Read complete' : 'Reading public signals'}
          </span>
        </div>

        {/* Terminal — shows real SSE lines */}
        <div className="fade-in-2" style={{ opacity: beatVisible ? 0.4 : 1, transition: 'opacity 0.6s' }}>
          <TerminalPane domain={domain} lines={lines} active={!beatVisible} />
        </div>

        {/* Sub-label while reading */}
        {!beatVisible && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#3F3F5A', fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.04em' }}>
              provenance-backed · not guessed
            </p>
          </div>
        )}

        {/* Human beat — appears when real extraction is done */}
        {beatVisible && (
          <div style={{
            animation: 'fadeUp 0.7s ease both',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(224,123,57,0.12)',
              border: '1px solid rgba(224,123,57,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>✓</div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#0B2545', letterSpacing: '-0.02em', marginBottom: 6 }}>
                Here's what we read about <span style={{ color: '#E07B39' }}>{domain}</span>.
              </p>
              <p style={{ fontSize: 13, color: '#52525B', fontFamily: '"IBM Plex Mono", monospace' }}>
                Step 2 of 3 · Is this right?
              </p>
            </div>
            <button
              onClick={() => navigate(`/audit/cold-read?session=${sessionId}`)}
              style={{
                marginTop: 4,
                padding: '12px 32px',
                background: '#E07B39', color: '#fff',
                fontSize: 15, fontWeight: 700,
                border: 'none', borderRadius: 8,
                cursor: 'pointer',
                fontFamily: '"Outfit", sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              See your read →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
