import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Proof360Mark } from '../components/Proof360Mark';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

/* ─── Home ───────────────────────────────────────────────────────────────── */
export default function Home() {
  const [founderAuth, setFounderAuth] = useState(null);
  const [url, setUrl] = useState('');
  const navigate = useNavigate();
  const features = useFeatureFlags();

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

  /* Check if any surfaces.* flag beyond founder+admin is true */
  const hasExtraPersonas = features?.surfaces
    ? Object.entries(features.surfaces).some(
        ([key, val]) => key !== 'founder' && key !== 'admin' && val === true
      )
    : false;

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    navigate(`/audit/cold-read?url=${encodeURIComponent(trimmed)}`);
  }

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
          border: none; cursor: pointer;
        }
        .btn-primary:hover { background: #C96D2E; transform: translateY(-1px); }

        .nav-link {
          font-size: 13px; color: rgba(255,255,255,0.6); text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #FFFFFF; }

        .divider { border: none; border-top: 1px solid #E2DFD8; }

        @media (max-width: 860px) {
          .hero-content { padding: 48px 24px 56px !important; }
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
        <section className="hero-content" style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '80px 24px 88px',
          textAlign: 'center',
        }}>
          <div className="anim-1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            marginBottom: 36,
          }}>
            <Proof360Mark variant="hero" size={52} />
          </div>

          <h1 className="anim-2" style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 'clamp(30px, 3.5vw, 48px)',
            fontWeight: 700, lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            marginBottom: 16,
          }}>
            See what we see about any company
          </h1>

          <p className="anim-3" style={{
            fontSize: 16, lineHeight: 1.75,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: 40, maxWidth: 480,
            marginLeft: 'auto', marginRight: 'auto',
          }}>
            Public-source trust posture analysis. 60 seconds. No login.
          </p>

          <form className="anim-4" onSubmit={handleSubmit} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            maxWidth: 540, margin: '0 auto',
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Enter a company URL…"
              aria-label="Company URL"
              style={{
                flex: '1 1 300px',
                padding: '13px 18px',
                fontSize: 14,
                fontFamily: '"DM Sans", sans-serif',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 5,
                color: '#FFFFFF',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(224,123,57,0.6)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            />
            <button type="submit" className="btn-primary">
              Run cold read →
            </button>
          </form>
        </section>
      </div>

      <hr className="divider" />

      {/* ── Persona hint (below fold) ─────────────────────────────────────── */}
      {hasExtraPersonas && (
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
          <p style={{
            fontSize: 15, lineHeight: 1.85,
            color: '#52525B',
            maxWidth: 640,
          }}>
            Proof360 isn't only for founders. Buyers use cold reads to vet vendors before procurement.
            Investors run them pre-term-sheet to surface hidden risk. Brokers and channel partners
            use batch reads to prep for meetings with a full trust picture already in hand. Whatever
            your angle, the same public-source analysis applies — no login, no questionnaire, just
            the signals that are already out there.
          </p>
        </section>
      )}

      {hasExtraPersonas && <hr className="divider" />}

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
        <p style={{
          width: '100%',
          fontSize: 11, color: '#9CA3AF',
          fontFamily: '"IBM Plex Mono", monospace',
          letterSpacing: '0.02em',
          marginTop: 4,
        }}>
          Analysis based on public sources. Not legal or financial advice.
        </p>
      </footer>
    </div>
  );
}
