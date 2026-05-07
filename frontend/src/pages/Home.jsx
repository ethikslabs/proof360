import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

/* ─── VECTOR design tokens ─────────────────────────────────────────────────── */
const BG     = '#0a0d14';
const CARD   = '#131c2e';
const BORDER = '#1e293b';
const TEXT   = '#f1f5f9';
const MUTED  = '#64748b';
const DIM    = '#2a3a50';
const AMBER  = '#E07B39';
const TEAL   = '#5eead4';
const GREEN  = '#22c55e';

export default function Home() {
  const [founderAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem('founder_auth') || 'null'); } catch { return null; }
  });
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  /* Scroll reveal — mirrors VECTOR's IntersectionObserver pattern */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    navigate(`/audit/cold-read?url=${encodeURIComponent(trimmed)}`);
  }

  /* Auth avatar */
  const avatarBlock = (() => {
    if (!founderAuth) return null;
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
          ? <img src={pic} alt={initials} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${BORDER}` }} />
          : <div style={{ width: 28, height: 28, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: BG }}>{initials}</div>
        }
        <span style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{firstName}</span>
      </Link>
    );
  })();

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', overflowX: 'hidden' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { display: none; }

        /* ── Animations ── */
        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.7)} }
        @keyframes barGlow { 0%,100%{opacity:.3} 50%{opacity:.6} }
        @keyframes grain   { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-1%,1%)} 40%{transform:translate(1%,-1%)} 60%{transform:translate(-1%,-1%)} 80%{transform:translate(1%,1%)} }
        @keyframes srcPing { 0%{opacity:0.25;transform:scale(0.9)} 50%{opacity:1;transform:scale(1.08)} 100%{opacity:0.25;transform:scale(0.9)} }
        @keyframes flowDot { 0%{stroke-dashoffset:40;opacity:0} 30%{opacity:1} 100%{stroke-dashoffset:0;opacity:0} }
        @keyframes needleSpin { 0%{transform:rotate(-30deg)} 100%{transform:rotate(330deg)} }

        .anim-1 { animation: fadeUp .7s ease both .1s; }
        .anim-2 { animation: fadeUp .7s ease both .25s; }
        .anim-3 { animation: fadeUp .7s ease both .4s; }
        .anim-4 { animation: fadeUp .7s ease both .55s; }
        .anim-5 { animation: fadeUp .7s ease both .7s; }
        .anim-6 { animation: fadeUp .7s ease both .85s; }

        /* Scroll reveal */
        .reveal { opacity:0; transform:translateY(24px); transition:opacity .7s ease, transform .7s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }
        .reveal-d1 { transition-delay:.1s; }
        .reveal-d2 { transition-delay:.2s; }
        .reveal-d3 { transition-delay:.3s; }

        /* Grain overlay */
        .grain {
          position:fixed; inset:-50%; width:200%; height:200%; pointer-events:none; z-index:9999;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity:.02; animation: grain .4s steps(1) infinite;
        }

        /* Nav */
        nav.p360-nav {
          position:fixed; top:0; left:0; right:0; z-index:90;
          background:rgba(10,13,20,0.88); backdrop-filter:blur(20px);
          border-bottom:1px solid ${BORDER};
          padding:14px 24px;
          display:flex; justify-content:space-between; align-items:center;
        }
        .nav-brand { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .nav-wordmark { font-size:15px; font-weight:800; letter-spacing:.5px; color:${TEXT}; }
        .nav-wordmark span { color:${TEAL}; }
        .nav-right { display:flex; align-items:center; gap:20px; }
        .nav-link { font-size:12px; color:${MUTED}; text-decoration:none; letter-spacing:.5px; transition:color .2s; }
        .nav-link:hover { color:${TEXT}; }

        /* Spectrum divider */
        .spectrum-bar {
          height:1px; width:100%;
          background: linear-gradient(90deg, rgba(94,234,212,0), ${TEAL}, ${AMBER}, rgba(94,234,212,0));
          opacity:.35; animation: barGlow 4s ease infinite;
        }

        /* Hero */
        .hero-eyebrow {
          font-size:10px; letter-spacing:4px; color:${MUTED};
          text-transform:uppercase; margin-bottom:24px;
          animation: fadeIn .6s ease;
        }
        .hero-headline {
          font-size:clamp(36px,8vw,72px);
          font-weight:800; letter-spacing:-2px; line-height:1.05;
          margin-bottom:20px;
        }
        .hero-sub {
          font-size:clamp(16px,3vw,20px); color:${MUTED};
          max-width:520px; margin:0 auto 40px; line-height:1.6;
        }

        /* Source pills */
        .source-pills { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-bottom:48px; }
        .sp { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; letter-spacing:.5px; padding:5px 12px; border-radius:20px; border:1px solid; }
        .sp .dot { width:5px; height:5px; border-radius:50%; animation:pulse 2.5s ease infinite; }
        .sp.web    { color:${TEAL};   border-color:rgba(94,234,212,.25);  background:rgba(94,234,212,.05); }
        .sp.web  .dot { background:${TEAL}; }
        .sp.ssl    { color:${AMBER};  border-color:rgba(224,123,57,.25);  background:rgba(224,123,57,.05); }
        .sp.ssl  .dot { background:${AMBER}; animation-delay:.5s; }
        .sp.threat { color:#ef4444;   border-color:rgba(239,68,68,.25);   background:rgba(239,68,68,.05); }
        .sp.threat .dot { background:#ef4444; animation-delay:1s; }
        .sp.code   { color:#60a5fa;   border-color:rgba(96,165,250,.25);  background:rgba(96,165,250,.05); }
        .sp.code   .dot { background:#60a5fa; animation-delay:1.5s; }
        .sp.breach { color:#a78bfa;   border-color:rgba(167,139,250,.25); background:rgba(167,139,250,.05); }
        .sp.breach .dot { background:#a78bfa; animation-delay:2s; }

        /* CTA button */
        .hero-cta {
          display:inline-flex; align-items:center; gap:8px;
          font-size:14px; font-weight:700;
          color:${BG}; background:${TEAL};
          padding:14px 28px; border-radius:30px;
          border:none; cursor:pointer; font-family:inherit;
          transition:transform .15s, box-shadow .15s;
          box-shadow: 0 4px 24px rgba(94,234,212,.25);
        }
        .hero-cta:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(94,234,212,.35); }

        /* URL input */
        .url-input {
          flex:1 1 300px; padding:13px 18px; font-size:14px; font-family:inherit;
          background:${CARD}; border:1px solid ${BORDER}; border-radius:8px;
          color:${TEXT}; outline:none; transition:border-color .2s;
        }
        .url-input::placeholder { color:${MUTED}; }
        .url-input:focus { border-color:rgba(94,234,212,.4); }

        /* Situation section */
        .situation-story {
          font-size:clamp(18px,3vw,24px); line-height:1.8; color:${MUTED};
          margin-bottom:48px;
        }
        .situation-story strong { color:${TEXT}; font-weight:600; }
        .situation-story em { font-style:italic; color:${TEAL}; font-style:normal; }
        .situation-verdict {
          font-size:clamp(26px,5vw,44px);
          font-weight:800; letter-spacing:-1px; line-height:1.1;
          margin-bottom:16px;
        }
        .situation-pivot {
          font-size:clamp(16px,2.5vw,20px); color:${MUTED}; line-height:1.6;
        }
        .situation-pivot strong { color:${TEAL}; font-weight:700; }

        /* Feature cards */
        .pillar-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; }
        .pillar {
          background:${CARD}; border:1px solid ${BORDER};
          border-radius:20px; padding:28px;
          transition:border-color .2s;
        }
        .pillar:hover { border-color:${DIM}; }
        .pillar-icon { font-size:28px; margin-bottom:16px; }
        .pillar-title { font-size:18px; font-weight:800; margin-bottom:10px; }
        .pillar-body { font-size:14px; color:${MUTED}; line-height:1.7; }

        /* Section label */
        .section-label { font-size:9px; letter-spacing:3px; color:${MUTED}; text-transform:uppercase; margin-bottom:16px; }

        /* CTA section */
        .cta-section { background:${CARD}; border-top:1px solid ${BORDER}; text-align:center; padding:120px 24px; }
        .cta-headline { font-size:clamp(28px,5vw,52px); font-weight:800; letter-spacing:-1px; line-height:1.1; margin-bottom:16px; }
        .cta-sub { font-size:18px; color:${MUTED}; margin-bottom:40px; line-height:1.6; }

        /* Footer */
        footer.p360-footer {
          border-top:1px solid ${BORDER}; padding:24px;
          display:flex; justify-content:space-between; align-items:center;
          flex-wrap:wrap; gap:12px; max-width:1100px; margin:0 auto;
        }
        .footer-brand { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:${MUTED}; }
        .footer-links { display:flex; gap:20px; }
        .footer-links a { font-size:12px; color:${MUTED}; text-decoration:none; transition:color .2s; }
        .footer-links a:hover { color:${TEXT}; }
        .footer-legal { width:100%; font-size:10px; color:${MUTED}; font-family:"SF Mono","Fira Code",monospace; letter-spacing:.5px; }

        @media(max-width:600px) {
          section.p360-section { padding:72px 20px; }
          .hero-content { padding:120px 20px 80px !important; }
          footer.p360-footer { flex-direction:column; text-align:center; }
        }
      `}</style>

      <div className="grain" />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="p360-nav">
        <Link to="/" className="nav-brand">
          <img src="/glyph.svg" width={28} height={28} alt="" />
          <span className="nav-wordmark">Proof<span>360</span></span>
        </Link>
        <div className="nav-right">
          {avatarBlock ?? <Link to="/account/login" className="nav-link">Sign in</Link>}
          <Link to="/portal" className="nav-link">Partner portal</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="hero-content" style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(94,234,212,0.04) 0%, transparent 70%)',
        }} />

        <div className="hero-eyebrow anim-1">Proof360 · Investment Readiness Intelligence</div>

        {/* Process animation — 10 sources converging to a trust score */}
        <div className="anim-2" style={{ marginBottom: 32, position: 'relative', width: 220, height: 120 }}>
          <svg width="220" height="120" viewBox="0 0 220 120" fill="none" style={{ overflow: 'visible' }}>
            {/* Source nodes — left side, staggered */}
            {[
              { y: 10,  label: 'DNS',    color: TEAL,      delay: '0s' },
              { y: 30,  label: 'TLS',    color: '#60a5fa', delay: '0.3s' },
              { y: 50,  label: 'BREACH', color: '#a78bfa', delay: '0.6s' },
              { y: 70,  label: 'PORTS',  color: '#f87171', delay: '0.9s' },
              { y: 90,  label: 'CODE',   color: '#34d399', delay: '1.2s' },
            ].map(({ y, label, color, delay }) => (
              <g key={label}>
                <circle cx="28" cy={y} r="5" fill={color} style={{ animation: `srcPing 2.4s ease ${delay} infinite` }} />
                <text x="36" y={y + 4} fontSize="8" fill={color} fontFamily="monospace" fontWeight="700" opacity="0.8">{label}</text>
                {/* Flow line to center */}
                <line x1="28" y1={y} x2="108" y2="60" stroke={color} strokeWidth="0.8" opacity="0.2" />
                <circle r="2.5" fill={color}>
                  <animateMotion dur="2.4s" begin={delay} repeatCount="indefinite" path={`M28,${y} L108,60`} />
                  <animate attributeName="opacity" values="0;0.9;0" dur="2.4s" begin={delay} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
            {/* Center — compass glyph */}
            <image href="/glyph.svg" x="86" y="38" width="44" height="44" />
            {/* Score output — right side */}
            <line x1="112" y1="60" x2="172" y2="60" stroke={TEAL} strokeWidth="1.5" opacity="0.4" strokeDasharray="4 3" />
            <circle cx="180" cy="60" r="24" fill="none" stroke={TEAL} strokeWidth="1.5" opacity="0.35" />
            <text x="180" y="55" textAnchor="middle" fontSize="14" fontWeight="900" fill={TEAL} fontFamily="monospace">82</text>
            <text x="180" y="68" textAnchor="middle" fontSize="6" fill={TEAL} fontFamily="monospace" opacity="0.7">/100</text>
          </svg>
        </div>

        <h1 className="hero-headline anim-3">
          Term sheets die<br />at due diligence.
        </h1>

        <p className="hero-sub anim-4">
          Investors run a security and trust check on your company before they sign. Most founders never see what they find — until the deal stalls. Proof360 shows you exactly what they see, scored and mapped, in 90 seconds.
        </p>

        {/* Source pills */}
        <div className="source-pills anim-5">
          <div className="sp web"><div className="dot" />Web presence</div>
          <div className="sp ssl"><div className="dot" />SSL / DNS</div>
          <div className="sp threat"><div className="dot" />Threat intel</div>
          <div className="sp code"><div className="dot" />Code signals</div>
          <div className="sp breach"><div className="dot" />Breach history</div>
        </div>

        <form onSubmit={handleSubmit} className="anim-5" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          maxWidth: 540, width: '100%', margin: '0 auto 20px',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <input
            type="text" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="Enter your company URL…" aria-label="Company URL"
            className="url-input"
          />
          <button type="submit" className="hero-cta">Read it →</button>
        </form>

        <div className="anim-6" style={{ fontSize: 10, letterSpacing: '2px', color: MUTED }}>
          scroll ↓
        </div>
      </section>

      <div className="spectrum-bar" />

      {/* ── Situation ───────────────────────────────────────────────────────── */}
      <section className="p360-section" id="situation" style={{ padding: '100px 24px', background: BG }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div className="section-label reveal">The moment</div>

          <div className="situation-story reveal reveal-d1">
            You're deep into a raise.<br /><br />
            The lead investor has done their calls.<br />
            Partners are aligned.<br />
            <strong>The term sheet is close.</strong><br /><br />
            Then the due diligence report comes back.<br /><br />
            <strong>SSL misconfiguration.</strong><br />
            <strong>No evidence of data security controls.</strong><br />
            <strong>An open breach in a public database.</strong><br /><br />
            Things that were always public.<br />
            <em>Things you could have fixed weeks ago.</em>
          </div>

          <div className="situation-verdict reveal reveal-d2">
            That's not bad luck.<br />
            <span style={{ color: MUTED, fontWeight: 400 }}>That's a blind spot with a known fix.</span>
          </div>

          <p className="situation-pivot reveal reveal-d3" style={{ marginTop: 24 }}>
            Proof360 scans your public signals exactly as an investor would — <strong>before the data room does it for you.</strong>
          </p>
        </div>
      </section>

      <div className="spectrum-bar" />

      {/* ── What you get ────────────────────────────────────────────────────── */}
      <section className="p360-section" style={{ padding: '100px 24px', background: CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="section-label reveal">What you get</div>
          <h2 className="reveal reveal-d1" style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 16 }}>
            Clarity in 60 seconds.
          </h2>
          <p className="reveal reveal-d2" style={{ fontSize: 18, color: MUTED, lineHeight: 1.6, marginBottom: 56, maxWidth: 580 }}>
            Public-source intelligence. Structured. Scored. No jargon — just the picture you need to decide.
          </p>

          <div className="pillar-grid">
            <div className="pillar reveal reveal-d1">
              <div className="pillar-icon">🎯</div>
              <div className="pillar-title">A trust score</div>
              <div className="pillar-body">0 to 100 against the frameworks investors and enterprise buyers check during due diligence. Benchmarked. Honest. No fluff.</div>
            </div>
            <div className="pillar reveal reveal-d2">
              <div className="pillar-icon">🗺️</div>
              <div className="pillar-title">A gap map</div>
              <div className="pillar-body">Every missing signal, ranked by severity. Know what to fix before the data room — not after the term sheet stalls.</div>
            </div>
            <div className="pillar reveal reveal-d3">
              <div className="pillar-icon">🔧</div>
              <div className="pillar-title">A fix plan</div>
              <div className="pillar-body">Each gap matched to a specific vendor who closes it. Not a generic list — exact solutions to what investors will find.</div>
            </div>
          </div>
        </div>
      </section>

      <div className="spectrum-bar" />

      {/* ── CTA section ─────────────────────────────────────────────────────── */}
      <section className="cta-section">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="reveal" style={{ marginBottom: 32 }}>
            <img src="/glyph.svg" width={72} height={72} alt="" style={{ display: 'block', margin: '0 auto' }} />
          </div>
          <h2 className="cta-headline reveal reveal-d1">See it before they do.</h2>
          <p className="cta-sub reveal reveal-d2">
            90 seconds. No account. No card.<br />Just your URL and the picture your next investor is already building.
          </p>
          <form onSubmit={handleSubmit} className="reveal reveal-d3" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            maxWidth: 540, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            <input
              type="text" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="Enter your company URL…" aria-label="Company URL"
              className="url-input"
            />
            <button type="submit" className="hero-cta">Read it →</button>
          </form>
          <p className="reveal" style={{ marginTop: 20, fontSize: 12, color: MUTED }}>
            Or try the{' '}
            <Link to="/report/demo" style={{ color: TEAL, textDecoration: 'none' }}>example report</Link>
            {' '}to see what you get.
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="p360-footer">
        <Link to="/" className="footer-brand" style={{ textDecoration: 'none' }}>
          <img src="/glyph.svg" width={20} height={20} alt="" style={{ opacity: 0.5 }} />
          Proof<span style={{ color: TEAL }}>360</span>
        </Link>
        <div className="footer-links">
          <Link to="/portal">Partner portal</Link>
          <Link to="/report/demo">Example report</Link>
          <a href="mailto:ethiks360.jp@gmail.com?subject=Proof360">Contact</a>
        </div>
        <p className="footer-legal">
          Analysis based on public sources only. Not legal or financial advice. · Powered by VERITAS
        </p>
      </footer>
    </div>
  );
}
