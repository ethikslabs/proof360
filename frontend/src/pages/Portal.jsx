import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TENANTS } from '../data/portal-leads';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const MS_CLIENT_ID    = import.meta.env.VITE_MS_CLIENT_ID || '';
const AUTH0_DOMAIN    = import.meta.env.VITE_AUTH0_DOMAIN    || 'dev-nfpt3dibp2qzchiq.au.auth0.com';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || 'bh2RJb3CO25HFF6rqOVzd9uk2WUKiCGM';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/portal/callback` : '';

// PKCE helpers
async function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return { verifier, challenge };
}

async function exchangeAuth0Code(code, verifier) {
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: AUTH0_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  });
  return res.json();
}

function buildGoogleUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: 'openid email profile',
    state: 'google',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function buildMicrosoftUrl() {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: 'openid email profile',
    state: 'microsoft',
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

function buildAuth0Url(challenge) {
  const params = new URLSearchParams({
    client_id: AUTH0_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'auth0',
  });
  return `https://${AUTH0_DOMAIN}/authorize?${params}`;
}

function tenantFromEmail(email) {
  if (!email) return null;
  const domain = email.split('@')[1]?.toLowerCase();
  return Object.entries(TENANTS).find(([, t]) => t.domain === domain)?.[0] || null;
}

const DEMO_TENANTS = ['ingram', 'dicker', 'crowdstrike', 'palo_alto', 'cloudflare'];

const s = {
  page: {
    minHeight: '100vh', background: '#07090f', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif",
    position: 'relative', overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
  },
  glow: {
    position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
    width: 600, height: 400, borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(0,217,184,0.07) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1, width: '100%', maxWidth: 420,
    background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '40px 36px',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32,
  },
  logoMark: {
    width: 28, height: 28, borderRadius: 6, background: '#00d9b8',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, color: '#07090f',
  },
  logoText: {
    fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em',
  },
  heading: {
    fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#f1f5f9',
    lineHeight: 1.2, marginBottom: 8,
  },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 32, lineHeight: 1.5,
  },
  divider: {
    borderTop: '1px solid rgba(255,255,255,0.07)', margin: '24px 0',
  },
  authBtn: (provider) => ({
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.85)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 10,
    transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
  }),
  demoToggle: {
    textAlign: 'center', marginTop: 20,
  },
  demoLink: {
    fontSize: 12, color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
    textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.1)',
    background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif",
  },
  demoGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16,
  },
  demoCard: (tenant) => ({
    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
    border: `1px solid ${tenant.color}30`,
    background: tenant.bg,
    transition: 'all 0.15s',
  }),
  demoName: {
    fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2,
  },
  demoTag: {
    fontSize: 10, color: 'rgba(255,255,255,0.35)',
  },
  live: {
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: '50%', background: '#00d9b8',
    boxShadow: '0 0 8px #00d9b8',
    animation: 'pulse 2s infinite',
  },
  liveText: {
    fontSize: 11, color: '#00d9b8', fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.05em', textTransform: 'uppercase',
  },
};

export default function Portal() {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);
  const [hoveredDemo, setHoveredDemo] = useState(null);
  const [hoveredAuth, setHoveredAuth] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('portal_auth');
    if (stored) { navigate('/portal/dashboard'); return; }

    // Okta PKCE callback: ?code=xxx&state=okta
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (code && searchParams.get('state') === 'auth0') {
      const verifier = sessionStorage.getItem('auth0_pkce_verifier');
      sessionStorage.removeItem('auth0_pkce_verifier');
      if (verifier) handleAuth0Callback(code, verifier);
      return;
    }

    // Google / Microsoft implicit callback: #access_token=xxx
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      fetchUserFromToken(params.get('access_token'), params.get('state'));
    }
  }, []);

  async function fetchUserFromToken(token, provider) {
    try {
      let email, name, avatar;
      if (provider === 'google') {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        email = data.email; name = data.name; avatar = data.picture;
      } else {
        const res = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        email = data.mail || data.userPrincipalName; name = data.displayName;
      }
      const tenantKey = tenantFromEmail(email);
      if (!tenantKey) {
        alert(`No partner account found for ${email}. Contact your Proof360 partner manager.`);
        return;
      }
      localStorage.setItem('portal_auth', JSON.stringify({ user: { name, email, avatar }, tenant: tenantKey }));
      navigate('/portal/dashboard');
    } catch {
      setShowDemo(true);
    }
  }

  async function loginWithAuth0() {
    if (!AUTH0_DOMAIN) { setShowDemo(true); return; }
    const { verifier, challenge } = await generatePKCE();
    sessionStorage.setItem('auth0_pkce_verifier', verifier);
    window.location.href = buildAuth0Url(challenge);
  }

  async function handleAuth0Callback(code, verifier) {
    try {
      const tokens = await exchangeAuth0Code(code, verifier);
      if (tokens.error) throw new Error(tokens.error_description);
      const res = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const data = await res.json();
      const email = data.email;
      const tenantKey = tenantFromEmail(email);
      if (!tenantKey) {
        alert(`No partner account registered for ${email}. Contact your Proof360 partner manager.`);
        return;
      }
      localStorage.setItem('portal_auth', JSON.stringify({
        user: { name: data.name, email, avatar: null },
        tenant: tenantKey,
      }));
      navigate('/portal/dashboard');
    } catch (e) {
      console.error('Auth0 error', e);
      setShowDemo(true);
    }
  }

  function loginDemo(tenantKey) {
    const tenant = TENANTS[tenantKey];
    localStorage.setItem('portal_auth', JSON.stringify({
      user: { name: 'Demo User', email: `demo@${tenant.domain}`, avatar: null },
      tenant: tenantKey,
    }));
    navigate('/portal/dashboard');
  }

  return (
    <div style={s.page}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .auth-btn:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.2) !important; transform: translateY(-1px); }
        .demo-card:hover { transform: translateY(-2px); filter: brightness(1.15); }
      `}</style>
      <div style={s.grid} />
      <div style={s.glow} />

      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoMark}>P</div>
          <span style={s.logoText}>proof360</span>
        </div>

        <div style={s.live}>
          <div style={s.liveDot} />
          <span style={s.liveText}>Partner intelligence · live</span>
        </div>

        <h1 style={s.heading}>Partner Portal</h1>
        <p style={s.sub}>
          Sign in with your company account to see qualified leads matched to your product catalog.
        </p>

        {/* Google */}
        <button
          className="auth-btn"
          style={s.authBtn('google')}
          onClick={() => GOOGLE_CLIENT_ID ? window.location.href = buildGoogleUrl() : setShowDemo(true)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>

        {/* Microsoft */}
        <button
          className="auth-btn"
          style={s.authBtn('microsoft')}
          onClick={() => MS_CLIENT_ID ? window.location.href = buildMicrosoftUrl() : setShowDemo(true)}
        >
          <svg width="18" height="18" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>

        {/* Auth0 */}
        <button
          className="auth-btn"
          style={s.authBtn('auth0')}
          onClick={loginWithAuth0}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="#00297a" strokeWidth="1.5" fill="#00297a"/>
            <circle cx="12" cy="12" r="4.5" fill="white"/>
          </svg>
          Sign in with Auth0
        </button>

        <div style={s.divider} />

        {!showDemo ? (
          <div style={s.demoToggle}>
            <button style={s.demoLink} onClick={() => setShowDemo(true)}>
              Access demo portal →
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Demo as
            </p>
            <div style={s.demoGrid}>
              {DEMO_TENANTS.map(key => {
                const t = TENANTS[key];
                return (
                  <button
                    key={key}
                    className="demo-card"
                    style={{ ...s.demoCard(t), textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }}
                    onClick={() => loginDemo(key)}
                  >
                    <div style={s.demoName}>{t.name}</div>
                    <div style={s.demoTag}>{t.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p style={{ position: 'relative', zIndex: 1, marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
        proof360.au · Partner Intelligence Platform
      </p>
    </div>
  );
}
