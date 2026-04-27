import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TENANTS } from '../data/portal-leads';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const MS_CLIENT_ID    = import.meta.env.VITE_MS_CLIENT_ID || '';
const AUTH0_DOMAIN    = import.meta.env.VITE_AUTH0_DOMAIN    || '';
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

const EXTRA_DOMAINS = { 'ethikslabs.com': 'ethikslabs' };
const ADMIN_EMAILS  = new Set(['ethiks360.jp@gmail.com']);

function tenantFromEmail(email) {
  if (!email) return null;
  if (ADMIN_EMAILS.has(email.toLowerCase())) return 'ethikslabs';
  const domain = email.split('@')[1]?.toLowerCase();
  return EXTRA_DOMAINS[domain]
    || Object.entries(TENANTS).find(([, t]) => t.domain === domain)?.[0]
    || null;
}

const DEMO_TENANTS = ['vanta','cisco','austbrokers','aws','cloudflare','okta','crowdstrike','palo_alto','dicker','ingram'];

const DEMO_LOGOS = {
  vanta:       { src: '/logos/vanta-partner.svg', style: { height: 22, width: 22, borderRadius: '50%' } },
  aws:         { src: '/logos/aws-partner.png',   style: { height: 16, width: 'auto' } },
  cloudflare:  { src: '/logos/cloudflare.png',    style: { height: 13, width: 'auto' } },
  cisco:       { src: '/logos/cisco.svg',         style: { height: 13, width: 'auto' } },
  palo_alto:   { src: '/logos/paloalto.svg',      style: { height: 13, width: 'auto' } },
  okta:        { src: '/logos/okta.svg',          style: { height: 13, width: 'auto' } },
  austbrokers: { src: '/logos/cyberpro.png',      style: { height: 20, width: 'auto' } },
};

export default function Portal() {
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(null);

  useEffect(() => {
    // Handle callbacks first — before checking existing auth
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (code && searchParams.get('state') === 'auth0') {
      const verifier = sessionStorage.getItem('auth0_pkce_verifier');
      sessionStorage.removeItem('auth0_pkce_verifier');
      if (verifier) handleAuth0Callback(code, verifier);
      return;
    }

    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      fetchUserFromToken(params.get('access_token'), params.get('state'));
      return;
    }

    const stored = localStorage.getItem('portal_auth');
    if (stored) { navigate('/portal/dashboard'); return; }
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
      setRedirecting(null);
    }
  }

  async function loginWithAuth0(intent = 'portal') {
    if (!AUTH0_DOMAIN) { setRedirecting(null); return; }
    sessionStorage.setItem('auth0_intent', intent);
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

      const intent = sessionStorage.getItem('auth0_intent') || 'portal';
      sessionStorage.removeItem('auth0_intent');

      const tenantKey = tenantFromEmail(email);

      // Merge any pending founder report regardless of routing outcome
      function mergePendingReport() {
        const pending = sessionStorage.getItem('pending_founder_report');
        if (pending) {
          sessionStorage.removeItem('pending_founder_report');
          const existing = JSON.parse(localStorage.getItem('founder_reports') || '[]');
          const parsed = JSON.parse(pending);
          localStorage.setItem('founder_reports', JSON.stringify(
            [...existing.filter(r => r.sessionId !== parsed.sessionId), parsed]
          ));
        }
      }

      // 'auto' = came from "Save & track" — detect by domain
      if (intent === 'auto') {
        if (tenantKey) {
          localStorage.setItem('portal_auth', JSON.stringify({ user: { name: data.name, email, avatar: null }, tenant: tenantKey }));
          navigate('/portal/dashboard');
        } else {
          localStorage.setItem('founder_auth', JSON.stringify({ user: { name: data.name, email, picture: data.picture || null } }));
          mergePendingReport();
          navigate('/account');
        }
        return;
      }

      if (intent === 'founder') {
        localStorage.setItem('founder_auth', JSON.stringify({
          user: { name: data.name, email, picture: data.picture || null },
        }));
        mergePendingReport();
        navigate('/account');
        return;
      }

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
      setRedirecting(null);
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

  const spin = { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 };

  return (
    <div style={{ minHeight: '100vh', background: '#07090f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", position: 'relative', overflow: 'hidden', padding: '40px 16px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .auth-btn:not(:disabled):hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.22) !important; }
        .demo-tile:hover { filter: brightness(1.2); transform: translateY(-1px); }
      `}</style>

      {/* bg grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,217,184,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '36px 36px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: '#00d9b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#07090f' }}>P</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '-0.01em' }}>proof360</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00d9b8', boxShadow: '0 0 6px #00d9b8', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 10, color: '#00d9b8', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.05em', textTransform: 'uppercase' }}>Live</span>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.025em', marginBottom: 6 }}>Partner Portal</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24, lineHeight: 1.55 }}>
          Sign in with your company account to access qualified leads matched to your catalog.
        </p>

        {/* Real auth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="auth-btn" disabled={!!redirecting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500, cursor: GOOGLE_CLIENT_ID ? 'pointer' : 'default', opacity: (!GOOGLE_CLIENT_ID || (redirecting && redirecting !== 'google')) ? 0.35 : 1, transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" }}
            onClick={() => { if (!GOOGLE_CLIENT_ID) return; setRedirecting('google'); window.location.href = buildGoogleUrl(); }}>
            {redirecting === 'google' ? <span style={spin}/> : <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>}
            {redirecting === 'google' ? 'Redirecting…' : 'Sign in with Google'}
          </button>

          <button className="auth-btn" disabled={!!redirecting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500, cursor: MS_CLIENT_ID ? 'pointer' : 'default', opacity: (!MS_CLIENT_ID || (redirecting && redirecting !== 'microsoft')) ? 0.35 : 1, transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" }}
            onClick={() => { if (!MS_CLIENT_ID) return; setRedirecting('microsoft'); window.location.href = buildMicrosoftUrl(); }}>
            {redirecting === 'microsoft' ? <span style={spin}/> : <svg width="16" height="16" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>}
            {redirecting === 'microsoft' ? 'Redirecting…' : 'Sign in with Microsoft'}
          </button>

          <button className="auth-btn" disabled={!!redirecting || !AUTH0_DOMAIN} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500, cursor: AUTH0_DOMAIN ? 'pointer' : 'default', opacity: (!AUTH0_DOMAIN || (redirecting && redirecting !== 'auth0')) ? 0.35 : 1, transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" }}
            onClick={() => { if (!AUTH0_DOMAIN) return; setRedirecting('auth0'); loginWithAuth0(); }}>
            {redirecting === 'auth0' ? <span style={{ ...spin, borderTopColor: '#00d9b8' }}/> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#00297a"/><circle cx="12" cy="12" r="4.5" fill="white"/></svg>}
            {redirecting === 'auth0' ? 'Redirecting…' : 'Sign in with Auth0'}
          </button>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '24px 0 20px' }} />

        {/* Demo section */}
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Explore the demo as a partner
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {DEMO_TENANTS.map(key => {
            const t = TENANTS[key];
            const logo = DEMO_LOGOS[key];
            const initials = t.short || t.name.slice(0, 2).toUpperCase();
            return (
              <button
                key={key}
                className="demo-tile"
                onClick={() => loginDemo(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 11px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${t.color}28`,
                  background: t.bg,
                  transition: 'all 0.15s', textAlign: 'left',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {/* Logo */}
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', padding: logo ? 4 : 0 }}>
                  {logo ? (
                    <img src={logo.src} alt={t.name} style={{ ...logo.style, objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }} />
                  ) : (
                    <span style={{ fontSize: 9, fontWeight: 700, color: t.color, letterSpacing: '-0.01em' }}>{initials}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.tagline}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, marginTop: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link to="/" style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>← Back to proof360</Link>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)', fontFamily: "'IBM Plex Mono', monospace" }}>Partner Intelligence Platform</span>
      </div>
    </div>
  );
}
