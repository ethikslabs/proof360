import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Proof360Mark } from '../components/Proof360Mark';

const AUTH0_DOMAIN    = import.meta.env.VITE_AUTH0_DOMAIN    || 'dev-nfpt3dibp2qzchiq.au.auth0.com';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || 'bh2RJb3CO25HFF6rqOVzd9uk2WUKiCGM';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/portal/callback` : '';

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

export default function FounderAuth() {
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('founder_auth')) navigate('/account');
  }, []);

  async function login() {
    setRedirecting(true);
    sessionStorage.setItem('auth0_intent', 'founder');
    const { verifier, challenge } = await generatePKCE();
    sessionStorage.setItem('auth0_pkce_verifier', verifier);
    window.location.href = buildAuth0Url(challenge);
  }

  function demoLogin() {
    localStorage.setItem('founder_auth', JSON.stringify({
      user: { name: 'Demo Founder', email: 'demo@startup.com' },
    }));
    navigate('/account');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Left panel — dark brand */}
      <div style={{
        width: '44%', background: '#0A1628', display: 'flex', flexDirection: 'column',
        padding: '48px 52px', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle arc decoration */}
        <svg style={{ position: 'absolute', top: -80, right: -80, opacity: 0.06 }} width={400} height={400} viewBox="-64 -64 128 128">
          <path d="M 27.4 -27.4 A 38.7 38.7 0 1 1 -27.4 -27.4" fill="none" stroke="#A64640" strokeWidth="12" strokeLinecap="round"/>
          <path d="M 28.7 -7.7 A 29.7 29.7 0 1 1 -7.7 -28.7" fill="none" stroke="#C7922E" strokeWidth="12" strokeLinecap="round"/>
          <path d="M 19.8 5.3 A 20.5 20.5 0 1 1 5.3 -19.8" fill="none" stroke="#3D9B5A" strokeWidth="12" strokeLinecap="round"/>
        </svg>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Proof360Mark size={28} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Proof<span style={{ color: '#E07B39' }}>360</span>
          </span>
        </Link>

        {/* Main message */}
        <div style={{ animation: 'fadeUp 0.5s ease 0.1s both' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16 }}>
            Your trust score.<br/>Your pipeline.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, maxWidth: 280 }}>
            Save your audit. Track remediation. See the moment a partner engages with your security profile.
          </p>

          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '◎', label: 'Persistent trust score across all sessions' },
              { icon: '◈', label: 'Partner engagement notifications' },
              { icon: '◉', label: 'Remediation pipeline tracker' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14, color: '#E07B39', marginTop: 1, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          PROOF360.AU · TRUST READINESS FOR FOUNDERS
        </p>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, background: '#f7f9fc', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 360, animation: 'fadeUp 0.5s ease 0.15s both' }}>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.025em', marginBottom: 8 }}>
            Sign in to your account
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 36, lineHeight: 1.6 }}>
            Access your saved reports and remediation pipeline.
          </p>

          {/* Auth0 button */}
          <button
            onClick={login}
            disabled={redirecting}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '12px 20px', background: '#0A1628', color: '#ffffff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: redirecting ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em',
              opacity: redirecting ? 0.7 : 1, transition: 'opacity 0.15s',
              marginBottom: 12,
            }}
            onMouseEnter={e => !redirecting && (e.currentTarget.style.background = '#142035')}
            onMouseLeave={e => e.currentTarget.style.background = '#0A1628'}
          >
            {redirecting ? (
              <>
                <span style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#ffffff', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0,
                }} />
                Redirecting…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="11" fill="#00297a"/>
                  <circle cx="12" cy="12" r="4.5" fill="white"/>
                </svg>
                Continue with Auth0
              </>
            )}
          </button>

          <div style={{ position: 'relative', margin: '20px 0' }}>
            <div style={{ height: 1, background: '#e5e7eb' }}/>
            <span style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: '#f7f9fc', padding: '0 10px',
              fontSize: 11, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace",
            }}>or</span>
          </div>

          <button
            onClick={demoLogin}
            style={{
              width: '100%', padding: '11px 20px',
              background: '#ffffff', color: '#374151',
              border: '1px solid #d1d5db', borderRadius: 10,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#9ca3af'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#d1d5db'}
          >
            Skip — explore with demo account
          </button>

          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 24, lineHeight: 1.6, textAlign: 'center' }}>
            By signing in you agree to proof360's terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
