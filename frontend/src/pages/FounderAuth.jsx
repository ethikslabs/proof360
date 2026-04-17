import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen bg-white flex items-center justify-center font-sans">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="w-full max-w-sm px-8 py-12">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-md bg-[#00d9b8] flex items-center justify-center text-[#07090f] font-bold text-sm">P</div>
          <span className="text-sm font-semibold text-gray-800 tracking-tight">proof360</span>
        </div>

        <h1 className="text-2xl font-serif text-gray-900 mb-2 leading-snug">
          Track your trust score
        </h1>
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          Save your audit report and see when partners engage with your profile.
        </p>

        <button
          onClick={login}
          disabled={redirecting}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
          style={{ cursor: redirecting ? 'not-allowed' : 'pointer' }}
        >
          {redirecting ? (
            <>
              <span style={{
                width: 16, height: 16, border: '2px solid #e5e7eb', borderTopColor: '#00d9b8',
                borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block',
              }} />
              Redirecting…
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#00297a"/>
                <circle cx="12" cy="12" r="4.5" fill="white"/>
              </svg>
              Continue with Auth0
            </>
          )}
        </button>

        <div className="my-6 border-t border-gray-100" />

        <button
          onClick={demoLogin}
          className="w-full text-xs text-gray-300 hover:text-gray-400 transition-colors bg-transparent border-none cursor-pointer"
        >
          Skip — use demo account →
        </button>
      </div>
    </div>
  );
}
