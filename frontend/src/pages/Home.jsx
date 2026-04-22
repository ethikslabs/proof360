import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Proof360Mark } from '../components/Proof360Mark';

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
    <div style={{ background: '#FFFFFF', minHeight: '100vh', color: '#0D0D0F', fontFamily: '"DM Sans", sans-serif' }}>
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
          color: rgba(255,255,255,0.55); text-decoration: none;
          transition: color 0.2s;
        }
        .btn-ghost:hover { color: rgba(255,255,255,0.9); }

        .nav-link {
          font-size: 13px; color: rgba(255,255,255,0.6); text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #FFFFFF; }

        .portal-pill {
          font-size: 12px; color: rgba(255,255,255,0.65); text-decoration: none;
          border: 1px solid rgba(255,255,255,0.2); padding: 5px 13px;
          border-radius: 20px; transition: border-color 0.2s, color 0.2s;
        }
        .portal-pill:hover { border-color: rgba(255,255,255,0.45); color: #FFFFFF; }

        .divider { border: none; border-top: 1px solid #E2DFD8; }

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
          border: 1px solid #D5D2C8;
          border-radius: 20px;
          font-size: 12px; color: #52525B;
          letter-spacing: 0.03em;
          transition: border-color 0.2s, color 0.2s;
        }
        .vendor-chip:hover { border-color: #9CA3AF; color: #0D0D0F; }

        /* serif alt: .step-number { font-family: "Cormorant Garamond", serif; font-size: 52px; font-weight: 300; } */
        .step-number {
          font-family: "IBM Plex Mono", monospace;
          font-size: 36px; font-weight: 300;
          color: #D0CCC4; line-height: 1;
          user-select: none; letter-spacing: -0.02em;
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
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,22,40,0.97)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56,
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Proof360Mark size={28} />
            <span style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 19, fontWeight: 700,
              color: '#FFFFFF', letterSpacing: '-0.02em',
            }}>
              Proof<span style={{ color: '#E07B39' }}>360</span>
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {founderAuth ? (() => {
              const name = founderAuth.user?.name || '';
              const email = founderAuth.user?.email || '';
              const parts = name.trim().split(/\s+/);
              const initials = parts.length >= 2
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : (parts[0]?.[0] || email[0] || '?').toUpperCase();
              const firstName = parts[0] || email.split('@')[0] || 'Account';
              const pic = founderAuth.user?.picture;
              return (
                <Link to="/account" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {pic
                    ? <img src={pic} alt={initials} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }} />
                    : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E07B39', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }}>{initials}</div>
                  }
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>{firstName}</span>
                </Link>
              );
            })() : (
              <Link to="/account/login" style={{
                fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.2)', padding: '5px 14px',
                borderRadius: 6, transition: 'border-color 0.2s, color 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              >Sign in</Link>
            )}
            <Link to="/portal" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', letterSpacing: '0.02em' }}>Partner portal</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0A1628' }}>
        <section style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '64px 24px 72px',
          display: 'flex', alignItems: 'center',
        }}>
          <div className="hero-grid" style={{ width: '100%' }}>
            {/* Left */}
            <div>
              <div className="anim-1" style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                marginBottom: 32,
              }}>
                <Proof360Mark variant="hero" size={52} />
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20,
                  padding: '5px 14px',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
                  <span style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.45)',
                    fontFamily: '"IBM Plex Mono", monospace',
                    letterSpacing: '0.07em',
                  }}>
                    VERITAS — live trust intelligence
                  </span>
                </div>
              </div>

              <h1 className="anim-2" style={{
                /* serif alt: fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, letterSpacing: '-0.025em' */
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 'clamp(30px, 3.5vw, 48px)',
                fontWeight: 700, lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: '#FFFFFF',
                marginBottom: 22,
              }}>
                Your next enterprise deal is blocked by trust gaps you haven't found yet.
              </h1>

              <p className="anim-3" style={{
                fontSize: 16, lineHeight: 1.75,
                color: 'rgba(255,255,255,0.6)',
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
              </div>
            </div>

            {/* Right — terminal */}
            <div className="anim-5">
              <TerminalPane key={termKey} runKey={termKey} />
              <p style={{
                marginTop: 10, textAlign: 'right',
                fontSize: 11, color: 'rgba(255,255,255,0.3)',
                fontFamily: '"IBM Plex Mono", monospace',
                letterSpacing: '0.04em',
              }}>
                provenance-backed · not guessed
              </p>
            </div>
          </div>
        </section>
      </div>

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
              {/* serif alt: fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 58 */}
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 48, fontWeight: 400,
                color: '#0C0C10', lineHeight: 1,
                marginBottom: 10,
              }}>{n}</div>
              <div style={{ fontSize: 13, color: '#52525B', lineHeight: 1.65 }}>{label}</div>
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
          {/* serif alt: fontFamily: '"Cormorant Garamond", serif', fontWeight: 400 */}
          <h2 style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 'clamp(26px, 2.8vw, 38px)',
            fontWeight: 700, color: '#0C0C10',
            lineHeight: 1.15, letterSpacing: '-0.025em', maxWidth: 520,
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
              <div style={{ height: 1, background: '#E0DDD7', margin: '14px 0 18px' }} />
              {/* serif alt: fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, fontSize: 22 */}
              <h3 style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 17, fontWeight: 600,
                color: '#0C0C10', marginBottom: 12,
                letterSpacing: '-0.01em',
              }}>{title}</h3>
              <p style={{ fontSize: 14, color: '#52525B', lineHeight: 1.75 }}>{body}</p>
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
            {/* serif alt: fontFamily: '"Cormorant Garamond", serif', fontWeight: 400 */}
            <h2 style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 'clamp(24px, 2.8vw, 36px)',
              fontWeight: 700, color: '#0C0C10',
              lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 18,
            }}>
              We know exactly what closes it — and how to get it.
            </h2>
            <p style={{ fontSize: 14, color: '#52525B', lineHeight: 1.75, marginBottom: 32, maxWidth: 400 }}>
              Every vendor recommendation is matched to a specific gap in your posture, cross-referenced against VERITAS provenance. Not a commission push. A verified path.
            </p>
            <Link to="/audit" className="btn-primary">Start your audit →</Link>
          </div>
          <div>
            {/* Certified partner badges — real marks, not name-drops */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center', marginBottom: 28 }}>
              {[
                { href: 'https://www.vanta.com', alt: 'Vanta Partner', src: '/logos/vanta-partner.svg', style: { height: 80, width: 80, borderRadius: '50%' } },
                { href: 'https://aws.amazon.com/partners/', alt: 'AWS Partner', src: '/logos/aws-partner.png', style: { height: 80, width: 'auto' } },
                { href: 'https://www.cloudflare.com', alt: 'Cloudflare', src: '/logos/cloudflare.png', style: { height: 44, width: 'auto' } },
                { href: 'https://www.cisco.com', alt: 'Cisco', src: '/logos/cisco.svg', style: { height: 44, width: 'auto' } },
                { href: 'https://abcyberpro.com.au', alt: 'Austbrokers Cyber Pro', src: '/logos/cyberpro.png', style: { height: 44, width: 'auto' } },
                { href: 'https://www.paloaltonetworks.com', alt: 'Palo Alto Networks', src: '/logos/paloalto.svg', style: { height: 36, width: 'auto' } },
                { href: 'https://www.okta.com', alt: 'Okta', src: '/logos/okta.svg', style: { height: 36, width: 'auto' } },
                { href: 'https://www.wholesaleinvestor.com', alt: 'Wholesale Investor', src: '/logos/wholesale-investor.webp', style: { height: 40, width: 'auto' } },
              ].map(({ href, alt, src, style }) => (
                <a key={alt} href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', opacity: 0.9, transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.9}
                >
                  <img src={src} alt={alt} style={style} />
                </a>
              ))}
              <a href="https://arcticwolf.com" target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', opacity: 0.9, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.9}
              >
                <div style={{ background: '#1a2b3c', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center' }}>
                  <img src="/logos/arcticwolf.png" alt="Arctic Wolf" style={{ height: 32, width: 'auto' }} />
                </div>
              </a>
            </div>

            {/* Vendors without certified badge yet — chips until mark is available */}
            <div className="vendor-chips">
            </div>
            <p style={{
              marginTop: 16, fontSize: 11,
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
        {/* serif alt: fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(32px, 4vw, 54px)' */}
        <h2 style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 'clamp(28px, 3.5vw, 48px)',
          fontWeight: 700,
          color: '#0C0C10', lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: 20,
        }}>
          Your trust posture is either an asset<br />or a blocker.
        </h2>
        <p style={{ fontSize: 15, color: '#52525B', marginBottom: 40 }}>
          Find out which. 90 seconds. No account required to start.
        </p>
        <Link to="/audit" className="btn-primary" style={{ fontSize: 15, padding: '16px 36px' }}>
          Run your trust audit →
        </Link>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid #E2DFD8',
        padding: '22px 24px',
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <Proof360Mark size={20} style={{ opacity: 0.5 }} />
          <span style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 15, fontWeight: 700,
            color: '#9CA3AF', letterSpacing: '-0.02em',
          }}>
            Proof<span style={{ color: '#C47030' }}>360</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/portal" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}>Partner portal</Link>
          <Link to="/report/demo" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}>Example report</Link>
          <span style={{
            fontSize: 11, color: '#D5D2C8',
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            Powered by VERITAS
          </span>
        </div>
      </footer>
    </div>
  );
}
