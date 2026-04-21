import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';

/* ─── Terminal sequence ──────────────────────────────────────────────────── */
const TERMINAL_SEQUENCE = [
  { text: '$ proof360 --url acme-startup.io', type: 'cmd',      delay: 400  },
  { text: '',                                  type: 'blank',    delay: 900  },
  { text: '  Reading public signals...',       type: 'muted',   delay: 1100 },
  { text: '  ✓  Infrastructure resolved',      type: 'ok',      delay: 1700 },
  { text: '  ✓  Identity posture mapped',      type: 'ok',      delay: 2100 },
  { text: '  ✓  Governance signals indexed',   type: 'ok',      delay: 2500 },
  { text: '',                                  type: 'blank',    delay: 2900 },
  { text: '  Querying VERITAS corpus...',      type: 'muted',   delay: 3100 },
  { text: '  ↳  SOC 2 Type II framework',      type: 'query',   delay: 3600 },
  { text: '  ↳  ISO 27001:2022 controls',      type: 'query',   delay: 3950 },
  { text: '  ↳  APRA CPS 234 requirements',    type: 'query',   delay: 4300 },
  { text: '  ↳  CISSP Domain 5 — IAM',         type: 'query',   delay: 4650 },
  { text: '  ↳  NIST CSF 2.0',                 type: 'query',   delay: 5000 },
  { text: '',                                  type: 'blank',    delay: 5300 },
  { text: '  4 gaps identified',               type: 'warn',    delay: 5500 },
  { text: '  ↳  MFA not enforced             [CRITICAL]', type: 'critical', delay: 6000 },
  { text: '  ↳  No ISMS documentation        [HIGH]',     type: 'high',     delay: 6350 },
  { text: '  ↳  Missing incident response    [HIGH]',     type: 'high',     delay: 6700 },
  { text: '  ↳  Vendor risk not assessed     [MEDIUM]',   type: 'med',      delay: 7050 },
  { text: '',                                  type: 'blank',    delay: 7400 },
  { text: '  Trust score   →  58 / 100',       type: 'score',   delay: 7700 },
  { text: '  Deal status   →  BLOCKED',        type: 'blocked', delay: 8200 },
  { text: '',                                  type: 'blank',    delay: 8600 },
  { text: '  Mapping vendor paths...',         type: 'muted',   delay: 8900 },
  { text: '  Generating report...',            type: 'muted',   delay: 9500 },
  { text: '',                                  type: 'blank',    delay: 10000 },
  { text: '  Report ready.',                   type: 'done',    delay: 10300 },
];

const LINE_COLORS = {
  cmd:      '#F7F4F0',
  muted:    '#6B7280',
  ok:       '#4ADE80',
  query:    '#7DD3FC',
  warn:     '#FCD34D',
  critical: '#F87171',
  high:     '#FB923C',
  med:      '#FCD34D',
  score:    '#F7F4F0',
  blocked:  '#F87171',
  done:     '#4ADE80',
  blank:    'transparent',
};

/* ─── Terminal pane ──────────────────────────────────────────────────────── */
function TerminalPane({ runKey }) {
  const [lines, setLines] = useState([]);
  const [blink, setBlink] = useState(true);
  const bodyRef = useRef(null);

  useEffect(() => {
    setLines([]);
    const timers = TERMINAL_SEQUENCE.map(line =>
      setTimeout(() => setLines(prev => [...prev, line]), line.delay)
    );
    const blinker = setInterval(() => setBlink(b => !b), 530);
    return () => { timers.forEach(clearTimeout); clearInterval(blinker); };
  }, [runKey]);

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
    }}>
      {/* Traffic lights */}
      <div style={{
        background: '#111120',
        borderBottom: '1px solid #1A1A2E',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        {['#FF5F57','#FFBD2E','#28C840'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ marginLeft: 14, fontSize: 11, color: '#6B7280', letterSpacing: '0.06em' }}>
          VERITAS — trust intelligence
        </span>
      </div>
      {/* Body */}
      <div
        ref={bodyRef}
        style={{
          padding: '20px',
          height: 340,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          fontSize: 12,
          lineHeight: 1.75,
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{ color: LINE_COLORS[line.type] || '#F7F4F0', minHeight: '1.75em' }}>
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

/* ─── Home ───────────────────────────────────────────────────────────────── */
export default function Home() {
  const [founderAuth, setFounderAuth] = useState(null);
  const [termKey, setTermKey] = useState(0);

  useEffect(() => {
    // Fonts
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=IBM+Plex+Mono:wght@300;400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap';
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    const a = localStorage.getItem('founder_auth');
    if (a) try { setFounderAuth(JSON.parse(a)); } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTermKey(k => k + 1), 14000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: '#09090B', minHeight: '100vh', color: '#F7F4F0', fontFamily: '"DM Sans", sans-serif' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        html { scroll-behavior: smooth; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes grain {
          0%,100%{ transform:translate(0,0) }
          20%    { transform:translate(-1%,1%) }
          40%    { transform:translate(1%,-1%) }
          60%    { transform:translate(-1%,-1%) }
          80%    { transform:translate(1%,1%) }
        }

        .anim-1 { animation: fadeUp 0.65s ease both 0.1s; }
        .anim-2 { animation: fadeUp 0.65s ease both 0.25s; }
        .anim-3 { animation: fadeUp 0.65s ease both 0.4s; }
        .anim-4 { animation: fadeUp 0.65s ease both 0.55s; }
        .anim-5 { animation: fadeIn 0.9s ease both 0.65s; }

        .grain {
          position: fixed; inset: -50%; width: 200%; height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.02; pointer-events: none; z-index: 9999;
          animation: grain 0.4s steps(1) infinite;
        }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 26px; background: #E07B39; color: #09090B;
          font-family: "DM Sans", sans-serif; font-weight: 500; font-size: 14px;
          letter-spacing: 0.02em; border-radius: 5px; text-decoration: none;
          transition: background 0.2s, transform 0.15s;
        }
        .btn-primary:hover { background: #C96D2E; transform: translateY(-1px); }

        .btn-ghost {
          display: inline-flex; align-items: center;
          font-family: "DM Sans", sans-serif; font-size: 13px;
          color: #A8A29E; text-decoration: none;
          transition: color 0.2s;
        }
        .btn-ghost:hover { color: #D1C9BF; }

        .nav-link {
          font-size: 13px; color: #A8A29E; text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #F7F4F0; }

        .portal-pill {
          font-size: 12px; color: #A8A29E; text-decoration: none;
          border: 1px solid #3F3F5A; padding: 5px 13px;
          border-radius: 20px; transition: border-color 0.2s, color 0.2s;
        }
        .portal-pill:hover { border-color: #6B6B8A; color: #F7F4F0; }

        .divider { border: none; border-top: 1px solid #141420; }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 48px;
        }
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 48px;
        }
        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .vendor-chips {
          display: flex; flex-wrap: wrap; gap: 10px;
        }
        .vendor-chip {
          padding: 6px 14px;
          border: 1px solid #374151;
          border-radius: 20px;
          font-size: 12px; color: #D1D5DB;
          letter-spacing: 0.03em;
          transition: border-color 0.2s, color 0.2s;
        }
        .vendor-chip:hover { border-color: #6B7280; color: #F9FAFB; }

        .step-number {
          font-family: "Cormorant Garamond", serif;
          font-size: 52px; font-weight: 300;
          color: #1C1C2A; line-height: 1;
          user-select: none;
        }

        @media (max-width: 860px) {
          .hero-grid  { grid-template-columns: 1fr !important; gap: 40px !important; }
          .stats-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .steps-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .bottom-grid{ grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>

      <div className="grain" />

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid #111118',
        background: 'rgba(9,9,11,0.9)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56,
        }}>
          <span style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 21, fontWeight: 400,
            color: '#F7F4F0', letterSpacing: '-0.01em',
          }}>
            Proof<em>360</em>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {founderAuth
              ? <Link to="/account" className="nav-link">My account</Link>
              : <Link to="/account/login" className="nav-link">Sign in</Link>
            }
            <Link to="/portal" className="portal-pill">Partner portal →</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '88px 24px 96px',
        minHeight: 'calc(100vh - 56px)',
        display: 'flex', alignItems: 'center',
      }}>
        <div className="hero-grid" style={{ width: '100%' }}>
          {/* Left */}
          <div>
            <div className="anim-1" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: '1px solid #1A1A2E', borderRadius: 20,
              padding: '4px 13px', marginBottom: 32,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
              <span style={{
                fontSize: 11, color: '#9CA3AF',
                fontFamily: '"IBM Plex Mono", monospace',
                letterSpacing: '0.07em',
              }}>
                VERITAS — live trust intelligence
              </span>
            </div>

            <h1 className="anim-2" style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: 'clamp(34px, 3.8vw, 52px)',
              fontWeight: 400, lineHeight: 1.13,
              letterSpacing: '-0.025em',
              color: '#F7F4F0',
              marginBottom: 22,
            }}>
              Your next enterprise deal is blocked by trust gaps you haven't found yet.
            </h1>

            <p className="anim-3" style={{
              fontSize: 16, lineHeight: 1.75,
              color: '#A1A1AA',
              marginBottom: 40, maxWidth: 430,
            }}>
              proof360 cold-reads your trust posture from your public signals. No questionnaire. No consultant. 90 seconds to a scored gap report with a clear fix order.
            </p>

            <div className="anim-4" style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
              <Link to="/audit" className="btn-primary">
                Run your trust audit →
              </Link>
              <Link to="/report/demo" className="btn-ghost">
                See an example report
              </Link>
              <Link to="/audit/cold-read?demo=true" style={{ fontSize: 11, color: '#A1A1AA', textDecoration: 'none', fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.04em' }}>
                demo walkthrough
              </Link>
            </div>
          </div>

          {/* Right — terminal */}
          <div className="anim-5">
            <TerminalPane key={termKey} runKey={termKey} />
            <p style={{
              marginTop: 10, textAlign: 'right',
              fontSize: 11, color: '#6B7280',
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: '0.04em',
            }}>
              provenance-backed · not guessed
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
        <div className="stats-grid">
          {[
            { n: '90s',  label: 'From URL to your first score'              },
            { n: '23+',  label: 'Compliance frameworks cross-referenced'    },
            { n: '100%', label: 'Cold read — no login required to start'    },
          ].map(({ n, label }) => (
            <div key={n}>
              <div style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: 58, fontWeight: 300,
                color: '#F7F4F0', lineHeight: 1,
                marginBottom: 10,
              }}>{n}</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.65 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 24px' }}>
        <div style={{ marginBottom: 60 }}>
          <p style={{
            fontSize: 11, color: '#E07B39',
            fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: '0.1em', marginBottom: 18,
          }}>
            HOW IT WORKS
          </p>
          <h2 style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 'clamp(30px, 3vw, 42px)',
            fontWeight: 400, color: '#F7F4F0',
            lineHeight: 1.2, maxWidth: 520,
          }}>
            Three minutes from URL to a board-ready gap report.
          </h2>
        </div>

        <div className="steps-grid">
          {[
            {
              n: '01',
              title: 'Cold read',
              body: 'Enter your website URL. proof360 reads your public trust signals — infrastructure, identity posture, governance indicators — without touching your systems.',
            },
            {
              n: '02',
              title: 'VERITAS queries',
              body: 'Your signals are cross-referenced against 23+ compliance frameworks in the VERITAS corpus. Every gap is sourced and provenance-tracked — not generated.',
            },
            {
              n: '03',
              title: 'Scored report',
              body: 'A trust score, ranked gaps, and a fix order optimised for deal velocity. Layer 2 maps verified vendor paths to your specific posture and budget.',
            },
          ].map(({ n, title, body }) => (
            <div key={n}>
              <div className="step-number">{n}</div>
              <div style={{ height: 1, background: '#1C1C28', margin: '14px 0 18px' }} />
              <h3 style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: 22, fontWeight: 400,
                color: '#F7F4F0', marginBottom: 12,
              }}>{title}</h3>
              <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.75 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* ── Vendor ecosystem ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 24px' }}>
        <div className="bottom-grid">
          <div>
            <p style={{
              fontSize: 11, color: '#E07B39',
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: '0.1em', marginBottom: 18,
            }}>
              WHEN WE FIND A GAP
            </p>
            <h2 style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: 'clamp(28px, 3vw, 40px)',
              fontWeight: 400, color: '#F7F4F0',
              lineHeight: 1.2, marginBottom: 18,
            }}>
              We know exactly what closes it — and how to get it.
            </h2>
            <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.75, marginBottom: 32, maxWidth: 400 }}>
              Every vendor recommendation is matched to a specific gap in your posture, cross-referenced against VERITAS provenance. Not a commission push. A verified path.
            </p>
            <Link to="/audit" className="btn-primary">Start your audit →</Link>
          </div>
          <div>
            <div className="vendor-chips">
              {['Cloudflare', 'Vanta', 'Cisco', 'AWS', 'Apollo Secure', 'Dicker Data', 'Okta', 'Ingram Micro', 'CyberPro'].map(v => (
                <span key={v} className="vendor-chip">{v}</span>
              ))}
            </div>
            <p style={{
              marginTop: 20, fontSize: 11,
              color: '#6B7280',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              + additional vendors matched to your specific gaps
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '100px 24px 120px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: '"Cormorant Garamond", serif',
          fontSize: 'clamp(32px, 4vw, 54px)',
          fontWeight: 300, fontStyle: 'italic',
          color: '#F7F4F0', lineHeight: 1.18,
          marginBottom: 20,
        }}>
          Your trust posture is either an asset<br />or a blocker.
        </h2>
        <p style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 40 }}>
          Find out which. 90 seconds. No account required to start.
        </p>
        <Link to="/audit" className="btn-primary" style={{ fontSize: 15, padding: '16px 36px' }}>
          Run your trust audit →
        </Link>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid #111118',
        padding: '22px 24px',
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <span style={{
          fontFamily: '"Cormorant Garamond", serif',
          fontSize: 17, color: '#6B7280',
        }}>
          Proof<em>360</em>
        </span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/portal" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>Partner portal</Link>
          <Link to="/report/demo" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>Example report</Link>
          <span style={{
            fontSize: 11, color: '#1C1C28',
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            Powered by VERITAS
          </span>
        </div>
      </footer>
    </div>
  );
}
