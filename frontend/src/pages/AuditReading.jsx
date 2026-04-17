import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getInferStatus } from '../api/client';

/* ─── Build terminal sequence from URL ───────────────────────────────────── */
function buildSequence(rawUrl) {
  let domain = 'yourcompany.io';
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    domain = parsed.hostname.replace('www.', '');
  } catch {}

  return [
    { text: `$ proof360 --url ${domain}`,           type: 'cmd',    delay: 300  },
    { text: '',                                      type: 'blank',  delay: 700  },
    { text: '  Fetching public signals...',          type: 'muted',  delay: 1000 },
    { text: `  ✓  ${domain} · HTTP 200`,             type: 'ok',     delay: 1600 },
    { text: '  ✓  TLS certificate valid',            type: 'ok',     delay: 2000 },
    { text: '  ✓  DNS records mapped',               type: 'ok',     delay: 2400 },
    { text: '  ✓  Sitemap indexed (5 pages)',         type: 'ok',     delay: 2900 },
    { text: '  ✓  LinkedIn signals extracted',       type: 'ok',     delay: 3350 },
    { text: '',                                      type: 'blank',  delay: 3700 },
    { text: '  Querying VERITAS corpus...',           type: 'muted',  delay: 4000 },
    { text: '  ↳  SOC 2 Type II — CC6.1',            type: 'query',  delay: 4500 },
    { text: '  ↳  ISO 27001:2022 — A.9 Access',     type: 'query',  delay: 4900 },
    { text: '  ↳  APRA CPS 234 requirements',        type: 'query',  delay: 5300 },
    { text: '  ↳  NIST CSF 2.0 — Identify',          type: 'query',  delay: 5700 },
    { text: '  ↳  CISSP Domain 5 — IAM',             type: 'query',  delay: 6100 },
    { text: '  ↳  GDPR Article 32 — Security',       type: 'query',  delay: 6500 },
    { text: '  ↳  ASD ISM controls — 2024',          type: 'query',  delay: 6900 },
    { text: '',                                      type: 'blank',  delay: 7200 },
    { text: '  Mapping trust posture...',             type: 'muted',  delay: 7500 },
    { text: '  ↳  Identity & access posture',        type: 'query',  delay: 8000 },
    { text: '  ↳  Endpoint coverage signals',        type: 'query',  delay: 8450 },
    { text: '  ↳  Governance indicators',            type: 'query',  delay: 8900 },
    { text: '  ↳  Vendor risk profile',              type: 'query',  delay: 9350 },
    { text: '  ↳  Data handling posture',            type: 'query',  delay: 9800 },
    { text: '',                                      type: 'blank',  delay: 10200 },
    { text: '  Detecting gaps...',                   type: 'muted',  delay: 10600 },
    { text: '  ↳  Checking SOC 2 certification status',  type: 'query', delay: 11100 },
    { text: '  ↳  MFA enforcement signals',          type: 'query',  delay: 11600 },
    { text: '  ↳  Incident response indicators',     type: 'query',  delay: 12100 },
    { text: '  ↳  Penetration test recency',         type: 'query',  delay: 12600 },
    { text: '  ↳  Cyber insurance signals',          type: 'query',  delay: 13100 },
    { text: '',                                      type: 'blank',  delay: 13600 },
    { text: '  Scoring trust posture...',            type: 'muted',  delay: 14000 },
    { text: '  Computing gap weights...',            type: 'muted',  delay: 14800 },
    { text: '  Applying framework coverage...',      type: 'muted',  delay: 15600 },
    { text: '',                                      type: 'blank',  delay: 16400 },
    { text: '  Selecting vendor paths...',           type: 'muted',  delay: 16800 },
    { text: '  ↳  Matching gaps to catalog',         type: 'query',  delay: 17300 },
    { text: '  ↳  Applying distributor routing',     type: 'query',  delay: 17800 },
    { text: '  ↳  Ranking by deal velocity',         type: 'query',  delay: 18300 },
    { text: '',                                      type: 'blank',  delay: 18800 },
    { text: '  Building cold read...',               type: 'muted',  delay: 19200 },
    { text: '  Generating inferences...',            type: 'muted',  delay: 20200 },
    { text: '  Preparing questions...',              type: 'muted',  delay: 21200 },
  ];
}

const LINE_COLORS = {
  cmd:   '#F7F4F0',
  muted: '#52525B',
  ok:    '#4ADE80',
  query: '#7DD3FC',
  blank: 'transparent',
};

/* ─── Terminal pane ──────────────────────────────────────────────────────── */
function TerminalPane({ domain, active }) {
  const [lines, setLines] = useState([]);
  const [blink, setBlink] = useState(true);
  const bodyRef = useRef(null);
  const sequence = buildSequence(domain);

  useEffect(() => {
    setLines([]);
    const timers = sequence.map(line =>
      setTimeout(() => setLines(prev => [...prev, line]), line.delay)
    );
    const blinker = setInterval(() => setBlink(b => !b), 530);
    return () => { timers.forEach(clearTimeout); clearInterval(blinker); };
  }, [domain]);

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
        {lines.map((line, i) => (
          <div key={i} style={{ color: LINE_COLORS[line.type] || '#F7F4F0', minHeight: '1.8em' }}>
            {line.text}
          </div>
        ))}
        <span style={{
          display: 'inline-block', width: 7, height: '1em',
          background: blink ? '#E07B39' : 'transparent',
          verticalAlign: 'text-bottom', marginLeft: 2,
        }} />
      </div>
    </div>
  );
}

/* ─── Proof360 mark ──────────────────────────────────────────────────────── */
function Proof360Mark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="7" fill="#0B2545" />
      <path d="M16 5L25 8.8V15.5C25 20.5 21 24.8 16 26.5C11 24.8 7 20.5 7 15.5V8.8L16 5Z"
        stroke="#E07B39" strokeWidth="1.4" fill="none" />
      <path d="M11.5 16L14.5 19L20.5 13"
        stroke="#E07B39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── AuditReading ───────────────────────────────────────────────────────── */
export default function AuditReading() {
  const [params] = useSearchParams();
  const sessionId = params.get('session');
  const rawUrl    = params.get('url') || '';
  const navigate  = useNavigate();
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('reading'); // reading | building

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPhase('building'), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let elapsed = 0;
    const poll = setInterval(async () => {
      elapsed += 1500;
      try {
        const { status } = await getInferStatus(sessionId);
        if (status === 'complete') {
          clearInterval(poll);
          navigate(`/audit/cold-read?session=${sessionId}`);
        } else if (status === 'failed' || elapsed > 90000) {
          clearInterval(poll);
          setError('We had trouble reading your site. Please try again.');
        }
      } catch {
        // keep polling silently
      }
    }, 1500);
    return () => clearInterval(poll);
  }, [sessionId, navigate]);

  const phaseLabel = phase === 'reading'
    ? 'Reading public signals'
    : 'Building your cold read';

  return (
    <div style={{
      minHeight: '100vh', background: '#09090B',
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
        .fade-in { animation: fadeUp 0.6s ease both; }
        .fade-in-2 { animation: fadeUp 0.6s ease both 0.15s; }
        .fade-in-3 { animation: fadeUp 0.6s ease both 0.3s; }
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
        borderBottom: '1px solid #111118',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Proof360Mark size={24} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F7F4F0', letterSpacing: '-0.01em' }}>
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
          border: '1px solid #1A1A2E', borderRadius: 20,
          padding: '5px 14px',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#E07B39',
            display: 'inline-block',
            animation: 'pulse 1.2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 11, color: '#52525B',
            fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: '0.07em',
          }}>
            {phaseLabel}
          </span>
        </div>

        {/* Terminal */}
        <div className="fade-in-2">
          <TerminalPane domain={rawUrl} active />
        </div>

        {/* Sub-label */}
        <div className="fade-in-3" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#3F3F5A', fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.04em' }}>
            provenance-backed · not guessed
          </p>
          {error && (
            <p style={{ fontSize: 13, color: '#F87171', marginTop: 12, maxWidth: 340, lineHeight: 1.6 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
