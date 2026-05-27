import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { tokens } from '../tokens.js';
import { FloatQ }        from '../components/chat/FloatQ.jsx';
import { Bubble }        from '../components/chat/Bubble.jsx';
import { ThinkingStream } from '../components/chat/ThinkingStream.jsx';
import { MorningBrief }  from '../components/chat/MorningBrief.jsx';
import { MachineDrawer }       from '../components/chat/MachineDrawer.jsx';
import { Sidebar }             from '../components/chat/Sidebar.jsx';
import { Projection }          from '../components/chat/Projections.jsx';
import { GraphView }           from '../components/chat/GraphView.jsx';
import { ProvenanceAccordion } from '../components/chat/ProvenanceAccordion.jsx';
import { DrawerStats }         from '../components/chat/DrawerStats.jsx';
import { EscalationCTA }       from '../components/chat/EscalationCTA.jsx';
import { ChatInput }           from '../components/chat/ChatInput.jsx';
import { ModeTiles }          from '../components/chat/ModeTiles.jsx';
import { CompanyProfile }     from '../components/chat/CompanyProfile.jsx';
import { useTrustPhase }       from '../hooks/useTrustPhase.js';
import { deriveGraphNodes }    from '../utils/deriveGraphNodes.js';
import { getPersonaResponses, getPersonaResponse } from '../data/mock/personas.js';
import { getThinkingSteps } from '../data/mock/thinking.js';
import { DEMO_STAGES, DEFAULT_STAGE_ID } from '../data/demoCompany.js';
import { OperationalField } from '../components/OperationalField';
import { useSignals }       from '../hooks/useSignals.js';
import { ObservationStrip } from '../components/chat/ObservationStrip.jsx';
import { GuidanceBlock }      from '../components/chat/GuidanceBlock.jsx';
import { MOCK_GUIDANCE_BLOCK } from '../data/mock/signals.js';
import { VendorShortlist } from '../components/chat/VendorShortlist.jsx';
import { rankVendorsBySignals } from '../data/mock/vendors.js';
import { AuthorityLayer }      from '../components/chat/AuthorityLayer.jsx';
import { useSurfaceAuthority } from '../hooks/useSurfaceAuthority.js';

/* ─── Auth constants ─────────────────────────────────────────────────────── */
const AUTH0_DOMAIN    = import.meta.env.VITE_AUTH0_DOMAIN    || 'dev-ethikslabs.au.auth0.com';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || 'bh2RJb3CO25HFF6rqOVzd9uk2WUKiCGM';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const CF_TURNSTILE_SITEKEY = import.meta.env.VITE_CF_TURNSTILE_SITEKEY || '1x00000000000000000000AA';

async function generatePKCE() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const v = btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  const c = btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  return { verifier: v, challenge: c };
}

/* ─── Telegram preview modal ─────────────────────────────────────────────── */
function TelegramPreviewModal({ initialMessage, currentUser, onClose }) {
  const [msg, setMsg] = useState(initialMessage);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  async function send() {
    setStatus('sending');
    try {
      const res = await fetch('/api/v1/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          name:  currentUser?.name  || null,
          email: currentUser?.email || null,
          context: 'proof360 chat',
        }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(20,16,28,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fbf8f1', borderRadius: 14,
        width: 'min(520px, 95vw)', padding: '28px 28px 24px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}>
        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Sent to John</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>He'll respond on Telegram or email within a day.</div>
            <button onClick={onClose} style={{
              marginTop: 20, padding: '8px 24px', borderRadius: 8,
              background: '#1a1a2e', color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 16 }}>Message to John</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
              This will be sent directly to John on Telegram. Edit before sending.
            </div>
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              style={{
                width: '100%', minHeight: 120, padding: '12px 14px',
                borderRadius: 8, border: '1px solid #e5e7eb',
                background: '#f9fafb', fontSize: 14, color: '#1a1a2e',
                lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box',
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                outline: 'none',
              }}
            />
            {status === 'error' && (
              <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>Something went wrong — try again.</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb',
                background: 'transparent', fontSize: 13, color: '#6b7280', cursor: 'pointer',
              }}>Cancel</button>
              <button
                onClick={send}
                disabled={status === 'sending' || !msg.trim()}
                style={{
                  padding: '8px 22px', borderRadius: 8, border: 'none',
                  background: status === 'sending' ? '#6b7280' : '#1a1a2e',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: status === 'sending' ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >{status === 'sending' ? 'Sending…' : 'Send →'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Login modal ────────────────────────────────────────────────────────── */
function LoginModal({ onClose, onUser }) {
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [tsError, setTsError] = useState(false);
  const tsRef = useRef(null);
  const widgetId = useRef(null);

  useLayoutEffect(() => {
    function mountWidget() {
      if (!window.turnstile || !tsRef.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(tsRef.current, {
        sitekey: CF_TURNSTILE_SITEKEY,
        theme: 'light',
        callback: (token) => { setTurnstileToken(token); setTsError(false); },
        'error-callback': () => setTsError(true),
        'expired-callback': () => setTurnstileToken(null),
      });
    }
    if (window.turnstile) { mountWidget(); return; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.onload = mountWidget;
    document.head.appendChild(s);
    return () => { if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current); };
  }, []);

  async function loginGoogle() {
    if (!turnstileToken) { setTsError(true); return; }
    if (!GOOGLE_CLIENT_ID) return;
    sessionStorage.setItem('auth0_intent', 'chat');
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/portal/callback`,
      response_type: 'token',
      scope: 'openid email profile',
      state: 'google',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async function loginAuth0() {
    if (!turnstileToken) { setTsError(true); return; }
    sessionStorage.setItem('auth0_intent', 'chat');
    const { verifier, challenge } = await generatePKCE();
    sessionStorage.setItem('auth0_pkce_verifier', verifier);
    const params = new URLSearchParams({
      client_id: AUTH0_CLIENT_ID,
      redirect_uri: `${window.location.origin}/portal/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: 'auth0',
    });
    window.location.href = `https://${AUTH0_DOMAIN}/authorize?${params}`;
  }

  function demoLogin() {
    const user = { name: 'Demo Founder', email: 'demo@startup.com' };
    localStorage.setItem('founder_auth', JSON.stringify({ user }));
    onUser(user);
    onClose();
  }

  const ready = !!turnstileToken;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(15,12,22,0.72)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0e1117', borderRadius: 18,
        width: 'min(420px, 95vw)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.55)',
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        overflow: 'hidden',
        border: '1px solid #1e2330',
      }}>

        {/* ── Step 1: Cloudflare ──────────────────────────────────── */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: `1px solid ${ready ? '#1a3a1a' : '#1e2330'}`,
          background: ready ? 'rgba(244,129,32,0.06)' : 'transparent',
          transition: 'background 0.4s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            {/* Cloudflare cloud SVG */}
            <svg width="28" height="18" viewBox="0 0 109 73" fill="none">
              <path d="M96.3 35.5c-1.3-4.8-5.7-8.3-10.9-8.3-1.6 0-3.2.3-4.6.9-2.2-7.2-8.8-12.4-16.7-12.4-9.7 0-17.6 7.9-17.6 17.6v.3c-6.3.7-11.2 6-11.2 12.5 0 7 5.7 12.7 12.7 12.7h47.6c6.1 0 11-4.9 11-11 0-5.7-4.3-10.4-10.3-11.3z" fill="#F48120"/>
              <path d="M68.5 57.7c.2-.7.3-1.4.3-2.1 0-4.8-3.9-8.7-8.7-8.7-.9 0-1.8.1-2.6.4-1.1-3.6-4.4-6.2-8.4-6.2-4.8 0-8.8 3.9-8.8 8.8v.1c-3.2.3-5.6 3-5.6 6.3 0 3.5 2.8 6.3 6.3 6.3h23.8c3 0 5.5-2.5 5.5-5.5-.1-1.6-.7-3-1.8-4z" fill="#FBAD41"/>
            </svg>
            <div>
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#F48120',
              }}>Cloudflare</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Human verification</div>
            </div>
            {ready && (
              <div style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: '#22c55e',
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.5"/>
                  <path d="M4.5 8.5L7 11L11.5 6" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                VERIFIED
              </div>
            )}
          </div>
          <div ref={tsRef} style={{ minHeight: ready ? 0 : 65 }} />
          {tsError && <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>Verification failed — please try again.</div>}
        </div>

        {/* ── Step 2: Okta identity ───────────────────────────────── */}
        <div style={{
          padding: '22px 28px 24px',
          opacity: ready ? 1 : 0.4,
          transition: 'opacity 0.4s ease',
          pointerEvents: ready ? 'auto' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            {/* Okta "O" wordmark — simplified */}
            <svg width="22" height="22" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="30" fill="#007DC1"/>
              <circle cx="30" cy="30" r="14" stroke="#fff" strokeWidth="5" fill="none"/>
            </svg>
            <div>
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#007DC1',
              }}>Okta</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Identity provider</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {GOOGLE_CLIENT_ID && (
              <button onClick={loginGoogle} disabled={!ready} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '11px 0', borderRadius: 10, border: '1px solid #2a2f3d',
                background: '#161b27', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 500, color: '#e2e8f0',
                transition: 'border-color 0.15s',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
            )}
            <button onClick={loginAuth0} disabled={!ready} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '11px 0', borderRadius: 10, border: '1px solid #2a2f3d',
              background: '#161b27', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 500, color: '#e2e8f0',
              transition: 'border-color 0.15s',
            }}>
              {/* Microsoft logo */}
              <svg width="17" height="17" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
              Continue with Microsoft / email
            </button>
          </div>

          <button onClick={demoLogin} style={{
            display: 'block', width: '100%', marginTop: 14,
            padding: '6px 0', border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 11.5, color: '#4b5563',
            fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.06em',
          }}>
            skip → demo mode
          </button>
        </div>
      </div>
    </div>
  );
}

const TWEAK_DEFAULTS = {
  theme:            'pearl',
  headingFamily:    'serif',
  floats:           'marks',
  bubble:           'transcript',
  typeSpeed:        'natural',
  returningUser:    false,
  sidebarCollapsed: false,
};

const FLOATS = [
  { q: 'What do investors need before wiring money?',                       side: 'left',  top: '11%' },
  { q: 'What breaks due diligence?',                                        side: 'right', top: '24%' },
  { q: 'How do enterprise buyers evaluate trust before the first meeting?', side: 'left',  top: '52%' },
  { q: 'What signals create confidence — and what signals destroy it?',     side: 'right', top: '66%' },
  { q: 'How do I move from founder-said-so to evidence?',                   side: 'left',  top: '82%' },
];

const LIVE_FEED = [
  { headline: 'Investors tightened security diligence — 68% now require evidence before term sheet',
    source: 'Crunchbase News', url: 'https://news.crunchbase.com',
    angle: 'are founders actually getting ahead of this, or still treating it as a post-raise checkbox?' },
  { headline: 'Enterprise buyers are running shadow DD on vendors before the first call',
    source: 'Harvard Business Review', url: 'https://hbr.org',
    angle: 'the deal is half-decided before founders even get in the room — what does that change?' },
  { headline: 'SOC 2 Type II wait times hit 14 months on average last quarter',
    source: 'Security Week', url: 'https://www.securityweek.com',
    angle: "startups that started six months ago are closing deals their competitors can't — what do you think Leonardo?" },
];

function buildOpening(feed) {
  return [
    { id: 'th-0', persona: 'sofia',    model: 'claude-sonnet-4-6',         tok: 188, ms: 920,
      sources: ['Market intelligence', 'proof360 signals'],
      content: `Just saw this — "${feed.headline}." ${feed.angle}`,
      feedUrl: feed.url, feedSource: feed.source },
    { id: 'th-1', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b', tok: 162, ms: 1340,
      sources: ['Market intelligence', 'proof360 signals'],
      content: "Still reactive, almost universally. Founders know the story they want to tell — but the evidence layer underneath it isn't there. Buyers are forming impressions before the first meeting. The posture is the pitch before the pitch starts." },
    { id: 'th-2', persona: 'edison',   model: 'claude-sonnet-4-6',         tok: 203, ms: 870, isHandoff: true,
      sources: ['Market intelligence', 'proof360 signals'],
      content: "And it shows up in the data room every time. SSL misconfigurations, no access control evidence, breach exposure that's been public for months. All fixable. All avoidable.\n\nYou're here for a reason. What are you trying to solve?" },
  ];
}

// Ambient exchange — already in progress when the user arrives
const AMBIENT_EXCHANGE = [
  { id: 'amb-0', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b', tok: 61, ms: 380,
    sources: ['Market intelligence', 'proof360 signals'],
    content: "The AWS co-sell window is real — ISV partners who get into the marketplace before diligence starts close faster. Buyers trust what AWS has already vetted." },
  { id: 'amb-1', persona: 'edison',   model: 'claude-sonnet-4-6',          tok: 49, ms: 290,
    sources: ['Market intelligence', 'proof360 signals'],
    content: "Same pattern in security. A Cloudflare footprint or SOC 2 in progress surfaces in a 30-second Google before any deck is opened." },
];

// Sophia notices the arrival and turns — she was already mid-discussion
const SOPHIA_INTRO = "We were just looking at the shadow DD window — buyers are forming impressions before the first meeting, and most founders don't know what's already visible. What's your situation — raising, trying to close an enterprise deal, or somewhere in between?";

const DEMO_CO = {
  name: 'Hive & Co',
  url: 'hiveandco.proof360.au',
  type: 'specialty honey brand',
  story: 'Two years at Sydney markets, genuine traction, now eyeing UK retail and a seed round. The product is exceptional. The trust posture is invisible.',
};

const BROWSE_OPENING = [
  { id: 'br-0', persona: 'sofia',    model: 'claude-sonnet-4-6',           tok: 214, ms: 840,
    sources: ['Company signals', 'Partner pathways'],
    content: `Meet ${DEMO_CO.name} — a ${DEMO_CO.type}. ${DEMO_CO.story} The founders know everything about honey. They know nothing about what investors and enterprise buyers need to see before they say yes. Sound like anyone?` },
  { id: 'br-1', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b',   tok: 178, ms: 1120,
    sources: ['Company signals', 'Partner pathways'],
    content: "This is the most common moment we see. Real product, real customers — but the language of investors and procurement is completely foreign. The question isn't whether they're ready. It's whether they can show it." },
  { id: 'br-2', persona: 'edison',   model: 'claude-sonnet-4-6',           tok: 92,  ms: 610, isHandoff: true,
    sources: ['Company signals', 'Partner pathways'],
    content: `I'd start with what's publicly visible. Want to run ${DEMO_CO.name} through, or try your own company?` },
];

const QUESTION_OPENING = [
  { id: 'q-0', persona: 'sofia', model: 'claude-sonnet-4-6', tok: 44, ms: 390, isHandoff: true,
    sources: ['proof360 signals'],
    content: "Good — just ask. We'll work from there." },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Returns a normalised https:// URL if the message looks like a domain/URL, else null.
// Matches: "example.com", "https://example.com", "go to acme.io", etc.
function extractUrl(text) {
  const t = text.trim();
  // Bare domain or full URL with no spaces
  if (!t.includes(' ')) {
    if (/^https?:\/\//i.test(t)) return t;
    if (/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+/.test(t)) return `https://${t}`;
  }
  // URL embedded in longer text
  const match = t.match(/https?:\/\/[^\s]+/i);
  if (match) return match[0];
  return null;
}

const TAB_SENSE_MSGS = [
  (domain) => `Picked up ${domain}. Before I read it — what's the context? Portfolio company, competitor, or is this yours?`,
  (domain) => `Just saw you open ${domain}. I can pull what's publicly visible now — anything specific you want me to look for?`,
  (domain) => `${domain} is open. Want me to run it through the same lens as Hive & Co, or are you using it as a reference?`,
  (domain) => `Got ${domain}. First impressions from what's public — or do you want to tell me what I should know first?`,
];
let _tabSenseIdx = 0;

/* ─── Mini Atlas Browser ────────────────────────────────────────────── */

let _tabId = 0;
function mkTab(url, pinned = false) {
  const domain = url.replace(/^https?:\/\//, '').split('/')[0];
  return { id: `t${++_tabId}`, url, label: domain, pinned };
}

function BrowserPanel({ seedUrl, onTabsChange, onClose, tk }) {
  const mono = '"IBM Plex Mono", monospace';
  const [tabs,     setTabs]     = useState(() => [mkTab(seedUrl, true)]);
  const [activeId, setActiveId] = useState(() => `t${_tabId}`);
  const [splitId,  setSplitId]  = useState(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [editing,  setEditing]  = useState(false);

  const activeTab = tabs.find(t => t.id === activeId) ?? tabs[0];
  const splitTab  = tabs.find(t => t.id === splitId) ?? null;

  function addTab(raw) {
    let url = raw.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) url = `https://${url}`;
    const tab = mkTab(url);
    setTabs(prev => {
      const next = [...prev, tab];
      onTabsChange?.(next);
      return next;
    });
    setActiveId(tab.id);
    setUrlDraft('');
    setEditing(false);
  }

  function closeTab(id) {
    if (tabs.length === 1) { onClose(); return; }
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      onTabsChange?.(next);
      return next;
    });
    if (activeId === id) setActiveId(tabs.find(t => t.id !== id)?.id);
    if (splitId  === id) setSplitId(null);
  }

  function toggleSplit(id) {
    setSplitId(prev => (prev === id ? null : id));
  }

  const otherTabs = tabs.filter(t => t.id !== activeId);

  // Tab chip
  function TabChip({ tab }) {
    const active = tab.id === activeId;
    const isSplit = tab.id === splitId;
    return (
      <div
        onClick={() => setActiveId(tab.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px 6px 12px', cursor: 'pointer', flexShrink: 0,
          background: active ? tk.surface : 'transparent',
          borderRight: `1px solid ${tk.hairline}`,
          borderBottom: active ? `2px solid ${tk.plum}` : '2px solid transparent',
          transition: 'background 0.15s',
          maxWidth: 160, minWidth: 0,
        }}
      >
        {tab.pinned && (
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: tk.umber, flexShrink: 0 }} />
        )}
        <span style={{
          fontFamily: mono, fontSize: 10.5, color: active ? tk.ink : tk.inkSoft,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
        }}>{tab.label}</span>
        {isSplit && (
          <span style={{
            fontFamily: mono, fontSize: 8, color: tk.plum,
            letterSpacing: '0.1em', flexShrink: 0,
          }}>split</span>
        )}
        {!tab.pinned && (
          <button
            onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: tk.inkSoft, fontSize: 13, padding: 0, lineHeight: 1, flexShrink: 0,
            }}
          >×</button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      borderLeft: `1px solid ${tk.hairline}`,
      animation: 'fadeSlideUp 0.35s ease both', minWidth: 0,
    }}>

      {/* ── Tab strip ── */}
      <div style={{
        display: 'flex', alignItems: 'stretch', flexShrink: 0,
        borderBottom: `1px solid ${tk.hairline}`,
        background: `${tk.surfaceLo}cc`, overflowX: 'auto',
      }}>
        {tabs.map(tab => <TabChip key={tab.id} tab={tab} />)}

        {/* New tab input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', flexShrink: 0 }}>
          {editing ? (
            <input
              autoFocus
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addTab(urlDraft);
                if (e.key === 'Escape') { setEditing(false); setUrlDraft(''); }
              }}
              onBlur={() => { if (!urlDraft.trim()) setEditing(false); }}
              placeholder="open url…"
              style={{
                background: tk.bg, border: `1px solid ${tk.plum}60`,
                borderRadius: 5, padding: '3px 9px',
                fontFamily: mono, fontSize: 10.5, color: tk.ink, outline: 'none', width: 160,
              }}
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              title="Open URL"
              style={{
                background: 'none', border: `1px solid ${tk.hairline}`,
                borderRadius: 5, cursor: 'pointer', color: tk.inkSoft,
                fontFamily: mono, fontSize: 12, padding: '2px 8px',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = tk.plum; e.currentTarget.style.color = tk.plum; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = tk.hairline; e.currentTarget.style.color = tk.inkSoft; }}
            >+</button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Split toggle — pick which other tab to split with */}
        {otherTabs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', flexShrink: 0 }}>
            {otherTabs.map(ot => (
              <button
                key={ot.id}
                onClick={() => toggleSplit(ot.id)}
                title={`Split with ${ot.label}`}
                style={{
                  background: splitId === ot.id ? `${tk.plum}18` : 'none',
                  border: `1px solid ${splitId === ot.id ? tk.plum : tk.hairline}`,
                  borderRadius: 5, cursor: 'pointer',
                  color: splitId === ot.id ? tk.plum : tk.inkSoft,
                  fontFamily: mono, fontSize: 9, letterSpacing: '0.08em',
                  padding: '3px 7px', transition: 'all 0.15s',
                  maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >⊟ {ot.label}</button>
            ))}
          </div>
        )}

        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: tk.inkSoft, fontSize: 17, padding: '0 12px', lineHeight: 1, flexShrink: 0,
        }}>×</button>
      </div>

      {/* ── URL bar of active tab ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', flexShrink: 0,
        borderBottom: `1px solid ${tk.hairline}`,
        background: `${tk.surfaceLo}88`,
      }}>
        <div style={{
          flex: 1, background: tk.bg, border: `1px solid ${tk.hairline}`,
          borderRadius: 6, padding: '5px 12px',
          fontFamily: mono, fontSize: 11, color: tk.inkSoft,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{activeTab?.url?.replace(/^https?:\/\//, '')}</div>
        {splitTab && (
          <>
            <span style={{ color: tk.hairline, fontSize: 14 }}>│</span>
            <div style={{
              flex: 1, background: tk.bg, border: `1px solid ${tk.plum}40`,
              borderRadius: 6, padding: '5px 12px',
              fontFamily: mono, fontSize: 11, color: `${tk.plum}aa`,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{splitTab.url.replace(/^https?:\/\//, '')}</div>
          </>
        )}
      </div>

      {/* ── Viewport ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <iframe
          key={activeTab?.id}
          src={activeTab?.url}
          title={activeTab?.label}
          style={{ flex: 1, border: 'none', minWidth: 0,
            borderRight: (splitTab || tabs.length === 1) ? `1px solid ${tk.hairline}` : 'none' }}
        />

        {/* Split with another tab */}
        {splitTab && (
          <iframe
            key={splitTab.id}
            src={splitTab.url}
            title={splitTab.label}
            style={{ flex: 1, border: 'none', minWidth: 0 }}
          />
        )}

        {/* "Now try yours" — always visible when only the pinned tab is open */}
        {!splitTab && tabs.length === 1 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, padding: '32px 24px', minWidth: 0,
            background: `${tk.surfaceLo}88`,
          }}>
            <div style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontStyle: 'italic', fontSize: 22, color: tk.inkMid,
              textAlign: 'center', lineHeight: 1.35,
            }}>Now try yours.</div>
            <p style={{
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: 13, color: tk.inkSoft, textAlign: 'center',
              lineHeight: 1.65, margin: 0, maxWidth: 230,
            }}>
              Drop your URL here — same conversation, live comparison.
            </p>
            <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 280 }}>
              <input
                autoFocus
                value={urlDraft}
                onChange={e => setUrlDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTab(urlDraft)}
                placeholder="yourcompany.com"
                style={{
                  flex: 1, background: tk.surface, border: `1px solid ${tk.hairline}`,
                  borderRadius: 8, padding: '10px 14px',
                  fontFamily: mono, fontSize: 12,
                  color: tk.ink, outline: 'none', minWidth: 0,
                }}
                onFocus={e => { e.target.style.borderColor = `${tk.plum}60`; }}
                onBlur={e  => { e.target.style.borderColor = tk.hairline; }}
              />
              <button
                onClick={() => addTab(urlDraft)}
                style={{
                  background: tk.plum, color: tk.surface, border: 'none',
                  borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                  fontSize: 12, fontWeight: 500, flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >Open</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TriageCards({ onSelect, tk }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>

      {/* Primary — show me how this works */}
      <button
        onClick={() => onSelect('browse')}
        onMouseEnter={e => { e.currentTarget.style.background = `${tk.plum}12`; e.currentTarget.style.borderColor = `${tk.plum}50`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${tk.plum}07`; e.currentTarget.style.borderColor = `${tk.plum}30`; }}
        style={{
          background: `${tk.plum}07`, border: `1px solid ${tk.plum}30`,
          borderRadius: 12, padding: '18px 22px', cursor: 'pointer', textAlign: 'left',
          transition: 'border-color 0.2s, background 0.2s',
          animation: 'fadeSlideUp 0.45s ease both',
        }}
      >
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 18, color: tk.ink, marginBottom: 5,
        }}>Show me how this works</div>
        <div style={{
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          fontSize: 12, color: tk.inkSoft, lineHeight: 1.5,
        }}>Take me through a real example — a company from first idea to serious capital raise.</div>
      </button>

      {/* Secondary two — side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { id: 'raise',    label: 'I need to raise or close',  sub: 'Investors or enterprise buyers are in the way' },
          { id: 'question', label: 'I just have a question',    sub: "Skip the intro — let's get into it" },
        ].map((o, i) => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${tk.hairStrong}`; e.currentTarget.style.background = `${tk.surfaceLo}`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = tk.hairline; e.currentTarget.style.background = tk.surface; }}
            style={{
              background: tk.surface, border: `1px solid ${tk.hairline}`,
              borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.2s, background 0.2s',
              animation: `fadeSlideUp 0.45s ease ${0.1 + i * 0.08}s both`,
            }}
          >
            <div style={{
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: 13, fontWeight: 500, color: tk.ink, marginBottom: 4,
            }}>{o.label}</div>
            <div style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10, color: tk.inkSoft, letterSpacing: '0.04em', lineHeight: 1.5,
            }}>{o.sub}</div>
          </button>
        ))}
      </div>

    </div>
  );
}

/* ─── Cinematic intro ───────────────────────────────────────────────── */

const INTRO_CARDS = [
  { style: 'logo' },
  { style: 'hero',   text: "Investors and enterprise buyers are evaluating you right now." },
  { style: 'large',  text: "Before the pitch. Before the meeting. Before you even know they're looking." },
  { style: 'stats' },
  { style: 'medium', text: "Most founders never see what investors and enterprise buyers are actually checking." },
  { style: 'team' },
];

const CARD_HOLD = [1800, 2800, 2500, 8200, 2000, 3000];
// stats card (index 3) holds 8.2s — enough for 3 stats × ~2.5s each + transitions

const STATS_FALLBACK = [
  { number: '75%',  text: 'of investors say management track record is the top factor before they agree to take a meeting', source: 'CapitalHQ Investor Survey, 2026' },
  { number: '96%',  text: 'of companies say GRC and compliance is getting more boardroom attention than ever before', source: 'Vanta State of GRC, 2025' },
  { number: '51%',  text: 'are experiencing brand safety and reputation issues due to security or data breaches', source: 'Vanta State of GRC, 2025' },
];
const FADE_DUR  = 650;
const CARD_GAP  = 350;

function StatsCard({ visible, stats = STATS_FALLBACK }) {
  const [idx,     setIdx]     = useState(0);
  const [statVis, setStatVis] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    async function cycle() {
      setIdx(0);
      setStatVis(true);
      for (let i = 0; i < stats.length - 1; i++) {
        await sleep(2400);
        if (cancelled) return;
        setStatVis(false);
        await sleep(450);
        if (cancelled) return;
        setIdx(i + 1);
        setStatVis(true);
      }
    }
    cycle();
    return () => { cancelled = true; };
  }, [visible, stats]);

  const stat = stats[idx];
  return (
    <div style={{
      textAlign: 'center', maxWidth: 580,
      opacity: statVis ? 1 : 0,
      transform: statVis ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>
      <div style={{
        fontFamily: '"Instrument Serif", Georgia, serif',
        fontStyle: 'italic',
        fontSize: 'clamp(72px, 12vw, 128px)',
        fontWeight: 400, color: '#f0ece5',
        letterSpacing: '-0.03em', lineHeight: 1,
        marginBottom: 20,
      }}>{stat.number}</div>
      <div style={{
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        fontSize: 'clamp(15px, 2vw, 22px)',
        fontWeight: 300, color: '#b8b2aa',
        letterSpacing: '-0.005em', lineHeight: 1.5,
        marginBottom: 18,
      }}>{stat.text}</div>
      <div style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 'clamp(9px, 1vw, 11px)',
        color: '#3a3a3c', letterSpacing: '0.16em',
        textTransform: 'uppercase',
      }}>— {stat.source}</div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 28 }}>
        {stats.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 20 : 5, height: 5, borderRadius: 3,
            background: i === idx ? '#6b5de8' : '#2a2a2c',
            transition: 'all 0.4s ease',
          }} />
        ))}
      </div>
    </div>
  );
}

function CinematicIntro({ onComplete, stats = STATS_FALLBACK }) {
  const [cardIdx,       setCardIdx]       = useState(0);
  const [cardVisible,   setCardVisible]   = useState(false);
  const [overlayExit,   setOverlayExit]   = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setOverlayExit(true);
    setTimeout(onComplete, 750);
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      await sleep(300);
      for (let i = 0; i < INTRO_CARDS.length; i++) {
        if (cancelled || doneRef.current) return;
        setCardIdx(i);
        setCardVisible(true);
        await sleep(CARD_HOLD[i]);
        if (cancelled || doneRef.current) return;
        setCardVisible(false);
        await sleep(FADE_DUR + CARD_GAP);
      }
      if (!cancelled) finish();
    }
    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const card = INTRO_CARDS[cardIdx];

  return (
    <div
      onClick={finish}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0c0c0d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: overlayExit ? 0 : 1,
        transition: overlayExit ? 'opacity 0.75s ease' : 'none',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: 28, right: 32,
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: '#666',
        transition: 'color 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.color = '#aaa'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#666'; }}
      >skip →</div>

      <div style={{
        maxWidth: 620, padding: '0 48px', textAlign: 'center',
        opacity: cardVisible ? 1 : 0,
        transform: cardVisible ? 'translateY(0)' : 'translateY(-10px)',
        transition: `opacity ${FADE_DUR}ms ease, transform ${FADE_DUR}ms ease`,
      }}>
        {card.style === 'logo' && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.18em', justifyContent: 'center' }}>
            <span style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontStyle: 'italic', fontWeight: 400,
              fontSize: 'clamp(38px, 5.5vw, 64px)',
              color: '#f0ece5', letterSpacing: '-0.02em',
            }}>proof</span>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 400,
              fontSize: 'clamp(22px, 3.2vw, 38px)',
              color: '#7c6fff', letterSpacing: '-0.02em',
            }}>360</span>
          </div>
        )}
        {card.style === 'hero' && (
          <div style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 'clamp(42px, 6.5vw, 76px)',
            fontWeight: 400, fontStyle: 'italic',
            color: '#f0ece5', letterSpacing: '-0.025em', lineHeight: 1.08,
          }}>{card.text}</div>
        )}
        {card.style === 'large' && (
          <div style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(22px, 3.2vw, 38px)',
            fontWeight: 400, color: '#b8b2aa',
            letterSpacing: '-0.01em', lineHeight: 1.38,
          }}>{card.text}</div>
        )}
        {card.style === 'stat' && (
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 'clamp(11px, 1.3vw, 15px)',
            color: '#555', letterSpacing: '0.12em',
            lineHeight: 1.7, textTransform: 'uppercase',
          }}>{card.text}</div>
        )}
        {card.style === 'stats' && (
          <StatsCard visible={cardVisible} stats={stats} />
        )}
        {card.style === 'medium' && (
          <div style={{
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            fontSize: 'clamp(17px, 2.2vw, 26px)',
            fontWeight: 300, color: '#ccc7bf',
            letterSpacing: '-0.005em', lineHeight: 1.45,
          }}>{card.text}</div>
        )}
        {card.style === 'team' && (
          <div style={{ display: 'flex', gap: 'clamp(32px, 6vw, 72px)', justifyContent: 'center', alignItems: 'flex-start' }}>
            {[
              { name: 'Sophia',   role: 'Narrative & trust',  color: '#c49a52' },
              { name: 'Leonardo', role: 'Market & strategy',  color: '#9b7fd4' },
              { name: 'Edison',   role: 'Technical posture',  color: '#3ba8bf' },
            ].map((p, i) => (
              <div key={p.name} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                animation: `teamReveal 0.6s ease ${i * 0.18}s both`,
              }}>
                <div style={{
                  fontFamily: '"Instrument Serif", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 'clamp(22px, 3vw, 36px)',
                  fontWeight: 400, color: p.color,
                  letterSpacing: '-0.01em',
                }}>{p.name}</div>
                <div style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 'clamp(9px, 1vw, 11px)',
                  color: '#4a4a4c', letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}>{p.role}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom skip affordance */}
      <div style={{
        position: 'absolute', bottom: 36,
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: '#555',
        animation: 'introPulse 2.4s ease-in-out infinite',
      }}>click anywhere to skip</div>

      <style>{`
        @keyframes introPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes teamReveal {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Stage story labels — map demoCompany stage ids to the moment as named in Sophia's message
const STAGE_STORY = {
  market:     { step: 1, moment: "King's Cross market",         hint: 'Saturday stall, two founders, zero infrastructure' },
  sainsburys: { step: 2, moment: "Sainsbury's supply contract", hint: 'First national retailer — the paperwork wall hits' },
  digital:    { step: 3, moment: 'Blockchain provenance play',  hint: 'QR codes, supply chain, global ambition' },
  raising:    { step: 4, moment: 'Serious capital raise',       hint: 'Seed round — investors want proof, not promise' },
};

function JourneyConsentCards({ onSelect, stages, tk }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: tk.inkSoft, marginBottom: 8,
      }}>jump to any stage →</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {stages.map((stage, i) => {
          const story = STAGE_STORY[stage.id] ?? { step: i + 1, moment: stage.label, hint: stage.sub };
          return (
            <button
              key={stage.id}
              onClick={() => onSelect(stage.id)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${tk.plum}60`; e.currentTarget.style.background = `${tk.plum}07`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = tk.hairline; e.currentTarget.style.background = tk.surface; }}
              style={{
                background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 10,
                padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.2s, background 0.2s',
                animation: `fadeSlideUp 0.42s ease ${i * 0.08}s both`,
              }}
            >
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 9, color: tk.plum, letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 5,
              }}>{story.step} ·</div>
              <div style={{
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontSize: 13, fontWeight: 600, color: tk.ink, marginBottom: 3, lineHeight: 1.2,
              }}>{story.moment}</div>
              <div style={{
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontSize: 11, color: tk.inkSoft, lineHeight: 1.45,
              }}>{story.hint}</div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onSelect('question')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          fontSize: 12, color: tk.inkSoft, padding: '2px 0',
          textDecoration: 'underline', textDecorationColor: tk.hairStrong,
          letterSpacing: '0.01em',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = tk.ink; }}
        onMouseLeave={e => { e.currentTarget.style.color = tk.inkSoft; }}
      >What does this mean for my situation? →</button>
    </div>
  );
}

function StageSelector({ stages, activeId, onSelect, tk }) {
  const activeIdx = stages.findIndex(s => s.id === activeId);
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      padding: '18px 0 16px', marginBottom: 4,
      borderBottom: `1px solid ${tk.hairline}`,
      overflowX: 'auto',
    }}>
      {stages.map((stage, i) => {
        const active = stage.id === activeId;
        const past   = i < activeIdx;
        const accentColor = tk.plum;
        return (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'flex-start', flex: i < stages.length - 1 ? 1 : 'none', minWidth: 0 }}>
            <button
              onClick={() => onSelect(stage.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 5, padding: '0 8px', flexShrink: 0,
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: active ? accentColor : past ? `${accentColor}50` : tk.hairStrong,
                border: `2px solid ${active ? accentColor : past ? `${accentColor}40` : tk.hairStrong}`,
                boxShadow: active ? `0 0 0 3px ${accentColor}20` : 'none',
                transition: 'all 0.2s',
              }} />
              <div style={{
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontSize: 12, fontWeight: active ? 600 : 400,
                color: active ? tk.ink : tk.inkSoft,
                whiteSpace: 'nowrap', transition: 'color 0.2s',
              }}>{stage.label}</div>
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 9, letterSpacing: '0.07em',
                color: accentColor,
                whiteSpace: 'nowrap',
                opacity: active ? 1 : 0,
                maxHeight: active ? 16 : 0,
                overflow: 'hidden',
                transition: 'opacity 0.2s, max-height 0.2s',
              }}>{stage.sub}</div>
            </button>
            {i < stages.length - 1 && (
              <div style={{
                flex: 1, height: 1, marginTop: 6, minWidth: 16,
                background: i < activeIdx ? `${accentColor}35` : tk.hairline,
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const FOLLOW_UPS = {
  sofia: [
    "What do investors actually check before the first call?",
    "How did Hive&Co build their investor narrative?",
    "What does a 90-day diligence window look like in practice?",
  ],
  edison: [
    "What kills a technical due diligence most often?",
    "How do I get SOC 2 without a full-time security hire?",
    "What does Hive&Co's security posture actually look like?",
  ],
  leonardo: [
    "What are the red flags in a term sheet I should watch for?",
    "How should I structure my cap table before Series A?",
    "What do investors read before they open the deck?",
  ],
};

function FollowUpChips({ persona, onSelect, tk }) {
  const [hovered, setHovered] = useState(null);
  const questions = FOLLOW_UPS[persona] ?? FOLLOW_UPS.sofia;
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '4px 0 20px' }}>
      {questions.map((q, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(q)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{
            padding: '6px 13px', borderRadius: 20,
            border: `1px solid ${hovered === i ? '#b0956e' : tk.hairline}`,
            background: hovered === i ? '#faf5ef' : 'transparent',
            cursor: 'pointer',
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            fontSize: 12, color: hovered === i ? '#7c5c3a' : tk.inkSoft,
            transition: 'all 0.14s', whiteSpace: 'nowrap',
          }}
        >{q}</button>
      ))}
    </div>
  );
}

export default function Chat() {
  const t = TWEAK_DEFAULTS;
  const tk = tokens(t.theme);

  const [runId, setRunId]                 = useState(0);
  const [feed]                            = useState(() => LIVE_FEED[Math.floor(Math.random() * LIVE_FEED.length)]);
  const [messages, setMessages]           = useState([]);
  const [surfaced, setSurfaced]           = useState(0);
  const [inputReady, setInputReady]       = useState(false);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [inputValue, setInputValue]       = useState('');
  const [pulsingQ, setPulsingQ]           = useState(null);
  const [thinkingSteps, setThinkingSteps] = useState([]);
  const [briefShown, setBriefShown]       = useState(false);
  const [phase, setPhase]                 = useState('triage');  // 'triage' | 'active'
  const [intent, setIntent]               = useState(null);      // 'browse' | 'raise' | 'question'
  const [previewUrl, setPreviewUrl]       = useState(null);
  const [previewOpen, setPreviewOpen]     = useState(false);
  const [browserTabs, setBrowserTabs] = useState([]);

  const [activeStageId,   setActiveStageId]   = useState(DEFAULT_STAGE_ID);
  const [companyData,     setCompanyData]     = useState(null);
  // setInferenceError wired for post-MVP: call when inference polling times out or errors
  const [inferenceError,  setInferenceError]  = useState(false);
  const [analysisProfile, setAnalysisProfile] = useState('investor');
  const [heroPersonas,    setHeroPersonas]    = useState(() => new Set());
  const [heroPersonaHover,setHeroPersonaHover]= useState(null);
  const [activeModes,     setActiveModes]     = useState([]);
  const [companyProfile,  setCompanyProfile]  = useState({
    name: null, stage: null, industry: null, signals: [],
    domains: { identity: null, compliance: null, security: null, financial: null, legal: null, team: null },
  });
  const [logoCard,        setLogoCard]        = useState(null);
  const [activeSpace,     setActiveSpace]     = useState('chat');
  const [mobileActiveTab, setMobileActiveTab] = useState('Chat');
  const [currentUser,     setCurrentUser]     = useState(() => {
    try { const s = localStorage.getItem('founder_auth'); return s ? JSON.parse(s).user : null; } catch { return null; }
  });
  const [loginOpen,       setLoginOpen]       = useState(false);
  const [telegramOpen,    setTelegramOpen]    = useState(false);
  const [focusedProgram,  setFocusedProgram]  = useState(null);
  useEffect(() => {
    const handler = () => setTelegramOpen(true);
    window.addEventListener('proof360:telegram', handler);
    return () => window.removeEventListener('proof360:telegram', handler);
  }, []);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]= useState(true);
  const [hiveStage,       setHiveStage]       = useState(1);
  const litTiles = useMemo(() => ({ investor: false, vendors: false, aws: false, microsoft: false, posture: false, spv: false }), []);
  const [showIntro,       setShowIntro]       = useState(
    () => !new URLSearchParams(window.location.search).has('demo')
  );
  const [cinStats,        setCinStats]        = useState(STATS_FALLBACK);
  const [selectedModel,   setSelectedModel]   = useState('claude-sonnet-4-6');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    activeSignals,
    // gapSignals and capabilitySignals reserved for Task 7+
    regeneratingDomains,
    domainTurns,
    ctaEarned,
    correctSignal,
    ignoreSignal,
    addContextSignal,
  } = useSignals();

  const {
    surfaceAuthority,
    suggestion,
    surfaceFlex,
    recordChatActivity: _recordChatActivity,
    recordProjectionIntent,
    commit: commitAuthority,
    dismiss: dismissAuthority,
    resetTurn: _resetAuthorityTurn,
  } = useSurfaceAuthority();

  const isDemoMode = activeStageId === DEFAULT_STAGE_ID;
  const activeStage = DEMO_STAGES.find(s => s.id === activeStageId);
  const authorityEntity = {
    name:     companyProfile.name ?? activeStage?.company?.name ?? null,
    stage:    companyProfile.stage ?? null,
    vertical: companyProfile.industry ?? null,
  };
  const rankedVendors = rankVendorsBySignals(activeSignals);

  const [shortlist, setShortlist] = useState([]);

  const handleShortlist = useCallback((vendorObj) => {
    setShortlist(prev => {
      const alreadyIn = prev.some(s => (s.id || s) === vendorObj.id);
      return alreadyIn ? prev : [...prev, vendorObj];
    });
  }, []);

  const handleDefer = useCallback((vendorId) => {
    setShortlist(prev => prev.filter(s => s.id !== vendorId));
  }, []);

  const hasUserMsg  = messages.some(m => m.role === 'user');
  const hasMessages = messages.length > 0;
  const isHeroState = !hasMessages;

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const trustPhase = useTrustPhase({ phase, inputReady, userMessageCount, companyData });

  const graphNodes = useMemo(
    () => deriveGraphNodes(companyData?.inferences ?? null, companyData),
    [companyData]
  );

  const drawerStatsDerived = companyData ? {
    nodes: graphNodes.length,
    edges: Math.max(0, graphNodes.length - 1),
    models: 2,
    sources: companyData.inferences?.length ?? 0,
  } : null;

  // Session snapshot — written on close for temporal narrative (AC-11)
  useEffect(() => {
    const writeSnapshot = () => {
      const snapshot = {
        session_id: sessionStorage.getItem('proof360_session_id') || crypto.randomUUID(),
        entity_id:  'hive_and_code_demo',
        timestamp:  new Date().toISOString(),
        signals:    activeSignals,
        domain_scores: Object.fromEntries(
          Object.entries(domainTurns).map(([d, turns]) => [d, Math.min(100, turns * 20)])
        ),
        guidance_blocks_rendered: [],
      };
      try {
        sessionStorage.setItem('proof360_last_snapshot', JSON.stringify(snapshot));
      } catch {
        // sessionStorage unavailable — silent no-op
      }
    };
    window.addEventListener('beforeunload', writeSnapshot);
    return () => window.removeEventListener('beforeunload', writeSnapshot);
  }, [activeSignals, domainTurns]);

  const inputRef    = useRef(null);
  const scrollRef   = useRef(null);
  const browserTabsRef = useRef([]);
  const projectionIntentTimerRef = useRef(0);

  useEffect(() => {
    if (!logoCard) return;
    const t = setTimeout(() => setLogoCard(null), 6000);
    return () => clearTimeout(t);
  }, [logoCard]);

  useEffect(() => {
    if (companyData?.company_name) {
      setCompanyProfile(prev => ({ ...prev, name: companyData.company_name }));
    }
  }, [companyData]);

  // Fetch live stats from CORPUS — fires immediately, resolves before stats card appears (~6s in)
  useEffect(() => {
    fetch('/api/v1/corpus/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.stats?.length === 3) setCinStats(d.stats); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (hasUserMsg) return;
    const id = setInterval(() => setSurfaced(p => (p + 1) % FLOATS.length), 4500);
    return () => clearInterval(id);
  }, [hasUserMsg]);

  const seedQuery = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('q');
  }, []);

  const seedReturning = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('returning');
  }, []);

  const seedDemo = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('demo');
  }, []);

  useEffect(() => {
    if (seedQuery) {
      setMessages([]);
      setInputReady(true);
      setBriefShown(false);
      setInputValue(seedQuery);
      setTimeout(() => inputRef.current?.focus(), 200);
      return;
    }
    if (t.returningUser || seedReturning) {
      setMessages([]);
      setInputReady(true);
      setBriefShown(true);
      return;
    }
    if (seedDemo) {
      setMessages([]);
      setInputReady(true);
      setPhase('active');
      setBriefShown(false);
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }
    // Default: clean landing — input ready immediately, no auto-type
    setMessages([]);
    setInputReady(true);
    setBriefShown(false);
    setPulsingQ(null);
    setPhase('triage');
    setIntent(null);
    setPreviewUrl(null);
    setPreviewOpen(false);
    setBrowserTabs([]);
    setThinkingSteps([]);
    setActiveStageId(DEFAULT_STAGE_ID);
    setCompanyData(null);
  }, [runId, t.returningUser, seedQuery, seedReturning, seedDemo]); // eslint-disable-line react-hooks/exhaustive-deps — t is a module constant, setters are stable

  // Profile inference — keyword matching on user messages
  function inferProfile(text) {
    const signals = [];
    const domains = {};
    const bump = (key, base, step) =>
      (prev) => Math.min(HIVE_SCORES[key] - 2, (prev ?? base) + step);

    if (/soc2?|iso 27001|compliance|certif|vanta|drata|hipaa|gdpr|privacy policy/i.test(text)) {
      signals.push('Compliance awareness'); domains.compliance = bump('compliance', 12, 22);
    }
    if (/security|ssl|breach|pentest|access control|2fa|mfa|encryption|firewall/i.test(text)) {
      signals.push('Security posture'); domains.security = bump('security', 10, 20);
    }
    if (/auth|identity|okta|saml|sso|login|single sign/i.test(text)) {
      signals.push('Identity & auth'); domains.identity = bump('identity', 14, 18);
    }
    if (/investor|raise|capital|runway|valuation|fund|vc|angel|seed|series|round/i.test(text)) {
      signals.push('Fundraising intent'); domains.financial = bump('financial', 18, 16);
    }
    if (/legal|ip|contract|equity|cap table|safe|term sheet|shareholder|founders agreement/i.test(text)) {
      signals.push('Legal & governance'); domains.legal = bump('legal', 8, 22);
    }
    if (/team|hire|employee|founder|staff|cto|engineer|head of/i.test(text)) {
      signals.push('Team signals'); domains.team = bump('team', 20, 14);
    }

    const stageMap = [
      [/pre-seed|pre seed|just started|very early/i, 'Pre-seed'],
      [/seed|bootstrapped|first round/i, 'Seed'],
      [/series a|series-a/i, 'Series A'],
      [/series b|series-b/i, 'Series B+'],
    ];
    const industryMap = [
      [/honey|manuka|food|supply chain|fmcg|provenance/i, 'Food & Supply Chain'],
      [/saas|software|platform|api\b/i, 'SaaS'],
      [/fintech|financial|payment|banking/i, 'Fintech'],
      [/health|hospital|medical|pharma/i, 'Healthcare'],
      [/security|cyber|infosec/i, 'Cybersecurity'],
    ];

    let stage = null, industry = null;
    for (const [re, label] of stageMap) if (re.test(text)) { stage = label; break; }
    for (const [re, label] of industryMap) if (re.test(text)) { industry = label; break; }

    return { signals, domains, stage, industry };
  }

  const HIVE_SCORES = { identity: 85, compliance: 90, security: 82, financial: 78, legal: 88, team: 80 };

  // Maps analysis profile pill → persona hint for the backend classifier
  const PROFILE_PERSONA = {
    investor:   'leonardo',
    market:     'sophia',
    technical:  'edison',
    compliance: 'edison',
    deep:       null,       // no override — let classifier decide
    fast:       'sophia',
  };

  const submit = useCallback(async (input) => {
    const text = input.trim();
    if (!text || !inputReady || isProcessing) return;
    setInputValue('');
    setPulsingQ(null);
    setBriefShown(false);
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    setIsProcessing(true);

    // Update company profile from message signals
    const inf = inferProfile(text);
    if (inf.signals.length > 0 || inf.stage || inf.industry) {
      setCompanyProfile(prev => {
        const newDomains = { ...prev.domains };
        for (const [key, updater] of Object.entries(inf.domains)) {
          newDomains[key] = updater(prev.domains[key]);
        }
        return {
          name: prev.name,
          stage: inf.stage ?? prev.stage,
          industry: inf.industry ?? prev.industry,
          signals: [...prev.signals, ...inf.signals],
          domains: newDomains,
        };
      });
    }

    const sessionId = companyData?.session_id;

    // ── URL detection: start cold-read pipeline if no session yet ──
    if (!sessionId) {
      const detectedUrl = extractUrl(text);
      if (detectedUrl) {
        const statusId = `status-${Date.now()}`;
        const domain = detectedUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
        setMessages(prev => [...prev, {
          id: statusId, role: 'assistant', persona: 'edison',
          model: 'proof360', content: `Reading ${domain}…`,
        }]);

        try {
          // Start session
          const startRes = await fetch('/api/v1/session/start', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ website_url: detectedUrl }),
          });
          if (!startRes.ok) throw new Error('start failed');
          const { session_id } = await startRes.json();

          // Update status label with session context
          setMessages(prev => prev.map(m => m.id === statusId
            ? { ...m, content: `Scanning ${domain} — this takes about 30 seconds…` }
            : m
          ));

          // Poll infer-status
          let inferStatus = 'processing';
          for (let i = 0; i < 60 && inferStatus === 'processing'; i++) {
            await sleep(2500);
            const r = await fetch(`/api/v1/session/${session_id}/infer-status`);
            inferStatus = (await r.json()).status;
          }
          if (inferStatus !== 'complete') throw new Error('inference timeout');

          // Run gap analysis
          const analyzeRes = await fetch(`/api/v1/session/${session_id}/analyze`, { method: 'POST' });
          if (!analyzeRes.ok) throw new Error('analysis failed');
          const analysis = await analyzeRes.json();

          // Unlock real chat
          setCompanyData({
            session_id,
            company_name: analysis.company_name,
            trust_score: analysis.trust_score,
            gaps: analysis.gaps,
            deal_readiness: analysis.deal_readiness,
            inferences: analysis.inferences,
          });

          const gapCount = analysis.gaps?.length ?? 0;
          const score = analysis.trust_score ?? 0;
          setMessages(prev => prev.map(m => m.id === statusId ? {
            ...m,
            content: `${analysis.company_name || domain} — trust score ${score}/100, ${gapCount} gap${gapCount !== 1 ? 's' : ''} found. Ask me anything.`,
          } : m));
        } catch {
          setMessages(prev => prev.map(m => m.id === statusId ? {
            ...m, content: `Couldn't read ${domain}. Check the URL or try a different one.`,
          } : m));
        }

        setThinkingSteps([]);
        setIsProcessing(false);
        return;
      }
    }

    if (sessionId) {
      // ── Real API path: session-keyed chat with intent classification ──
      const msgId = `ai-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: msgId, role: 'assistant', persona: 'sofia', model: '', content: '', sources: [],
      }]);

      try {
        const personaOverride = (heroPersonas.size > 0 ? [...heroPersonas][0] : null) ?? PROFILE_PERSONA[analysisProfile] ?? undefined;
        const modeSnapshot = [...activeModes];
        const effectiveModel = modeSnapshot.includes('web-search') ? 'perplexity-sonar'
          : modeSnapshot.includes('deep-research') ? 'claude-opus-4-7'
          : selectedModel;
        setHeroPersonas(new Set()); setHeroPersonaHover(null); setActiveModes([]);
        const res = await fetch(`/api/v1/session/${sessionId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            ...(personaOverride ? { persona_override: personaOverride } : {}),
            ...(effectiveModel !== selectedModel ? { model_override: effectiveModel } : {}),
            ...(modeSnapshot.includes('deep-research') ? { deep_research: true } : {}),
          }),
        });

        if (!res.ok) {
          setMessages(prev => prev.map(m => m.id === msgId
            ? { ...m, content: 'Something went wrong. Try again.' }
            : m
          ));
          setIsProcessing(false);
          return;
        }

        const persona = res.headers.get('X-Persona') || 'sofia';
        const model   = res.headers.get('X-Model')   || '';
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, persona, model } : m));

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, content: m.content + chunk } : m
          ));
        }
      } catch {
        setMessages(prev => prev.map(m => m.id === msgId
          ? { ...m, content: 'Connection error — check your network and try again.' }
          : m
        ));
      }

      setThinkingSteps([]);
      setIsProcessing(false);
      return;
    }

    // ── Mock path: used until a real session exists ──
    try {
      const steps = getThinkingSteps();
      setThinkingSteps(steps.map(s => ({ ...s, status: 'running' })));
      for (let i = 0; i < steps.length; i++) {
        await sleep(360 + Math.random() * 380);
        setThinkingSteps(prev => prev.map((s, idx) => idx <= i ? { ...s, status: 'complete' } : s));
      }
      const personaMatch = text.match(/^(Sophia|Leonardo|Edison|John)[,\s]/i);
      const selectedLenses = heroPersonas.size > 0 ? [...heroPersonas] : null;
      const responses = personaMatch
        ? getPersonaResponse(personaMatch[1], text)
        : selectedLenses
          ? selectedLenses.flatMap(p => getPersonaResponse(p === 'sofia' ? 'Sophia' : p.charAt(0).toUpperCase() + p.slice(1), text))
          : getPersonaResponses(text);
      setHeroPersonas(new Set());

      const isFirstMsg = !messages.some(m => m.role === 'user');
      const intakeMsg = isFirstMsg && !personaMatch && !t.returningUser ? {
        id: `intake-${Date.now()}`,
        role: 'assistant', persona: 'sofia',
        content: "One thing that would help us go deeper — do you have a website we can look at? A pitch deck, investor update, anything at all. Even rough notes or a one-pager. The more context we have, the more specific we can be.",
      } : null;

      setMessages(prev => [
        ...prev,
        ...responses.map((r, i) => ({
          id: `p-${Date.now()}-${i}`, role: 'assistant',
          persona: r.persona, content: r.response,
        })),
        ...(intakeMsg ? [intakeMsg] : []),
      ]);
    } finally {
      setThinkingSteps([]);
      setIsProcessing(false);
    }
  }, [inputReady, isProcessing, messages, t.returningUser, companyData, analysisProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectIntent = useCallback(async (chosen) => {
    const speedMs = t.typeSpeed === 'fast' ? 8 : t.typeSpeed === 'instant' ? 0 : 18;
    setIntent(chosen);
    if (chosen !== 'browse') setPhase('active');

    if (chosen === 'browse') {
      // Sophia explains the journey first — consent before demo starts
      const setupMsg = {
        id: 'br-setup', persona: 'sofia', model: 'claude-sonnet-4-6', tok: 194, ms: 890,
        sources: ['Company signals', 'Partner pathways'],
        content: "Here's what we'll do. We're going to follow a real company — Hive & Co — from two founders selling Manuka honey at King's Cross market on a Saturday morning, through their first Sainsbury's supply contract, into a blockchain provenance play, and finally a serious capital raise. At each moment we'll show you exactly what investors and enterprise buyers see — the gaps, the signals, the language. Four stages. Real gaps. You can jump between them. Want to see how the story unfolds?",
      };
      setMessages(prev => [...prev, { ...setupMsg, content: '' }]);
      if (speedMs === 0) {
        setMessages(prev => prev.map(m => m.id === setupMsg.id ? { ...m, content: setupMsg.content } : m));
      } else {
        for (let i = 1; i <= setupMsg.content.length; i++) {
          await sleep(speedMs);
          setMessages(prev => prev.map(m => m.id === setupMsg.id ? { ...m, content: setupMsg.content.slice(0, i) } : m));
        }
      }
      await sleep(350);
      setPhase('journey-setup');
      return;
    }

    const msgs = chosen === 'question' ? QUESTION_OPENING : buildOpening(feed);
    for (const msg of msgs) {
      setMessages(prev => [...prev, { ...msg, content: '' }]);
      if (speedMs === 0) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content } : m));
      } else {
        for (let i = 1; i <= msg.content.length; i++) {
          await sleep(speedMs);
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content.slice(0, i) } : m));
        }
      }
      if (msg.isHandoff) {
        await sleep(450);
        setInputReady(true);
        setPulsingQ(Math.floor(Math.random() * FLOATS.length));
        inputRef.current?.focus();
      } else {
        await sleep(620);
      }
    }
  }, [t.typeSpeed, feed]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectJourney = useCallback(async (choice) => {
    if (choice === 'question') {
      setIntent('question');
      setPhase('active');
      const speedMs = t.typeSpeed === 'fast' ? 8 : t.typeSpeed === 'instant' ? 0 : 18;
      const msgs = QUESTION_OPENING;
      for (const msg of msgs) {
        setMessages(prev => [...prev, { ...msg, content: '' }]);
        if (speedMs === 0) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content } : m));
        } else {
          for (let i = 1; i <= msg.content.length; i++) {
            await sleep(speedMs);
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content.slice(0, i) } : m));
          }
        }
        if (msg.isHandoff) {
          await sleep(450);
          setInputReady(true);
          setPulsingQ(Math.floor(Math.random() * FLOATS.length));
          inputRef.current?.focus();
        }
      }
      return;
    }

    // Stage ID — jump directly to the chosen stage
    setPhase('active');
    const speedMs = t.typeSpeed === 'fast' ? 8 : t.typeSpeed === 'instant' ? 0 : 18;
    const stage = DEMO_STAGES.find(s => s.id === choice) ?? DEMO_STAGES[0];
    setActiveStageId(stage.id);
    setCompanyData({
      session_id: null,
      company_name: stage.company.name,
      trust_score: stage.trustScore,
      gaps: stage.gaps,
      deal_readiness: null,
    });
    const msgs = stage.messages.map(m => ({ ...m, role: 'assistant' }));
    for (const msg of msgs) {
      setMessages(prev => [...prev, { ...msg, content: '' }]);
      if (speedMs === 0) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content } : m));
      } else {
        for (let i = 1; i <= msg.content.length; i++) {
          await sleep(speedMs);
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content.slice(0, i) } : m));
        }
      }
      await sleep(msg === msgs[msgs.length - 1] ? 300 : 420);
    }
    setInputReady(true);
    setPulsingQ(Math.floor(Math.random() * FLOATS.length));
    inputRef.current?.focus();
  }, [t.typeSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  const pullSignal = () => {
    setBriefShown(false);
    setInputValue("What's the most important thing I should know about my investor readiness this morning?");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const headingFamily = t.headingFamily === 'sans'
    ? '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    : '"Instrument Serif", "Iowan Old Style", Georgia, serif';
  const headingWeight = t.headingFamily === 'sans' ? 500 : 400;

  return (
    <div style={{
      position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: `radial-gradient(ellipse at 100% 100%, ${tk.bgTint} 0%, ${tk.bg} 60%)`,
      color: tk.ink,
      fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    }}>

      {showIntro && <CinematicIntro stats={cinStats} onComplete={() => {
        setShowIntro(false);
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' }));
      }} />}

      <OperationalField onLogoClick={setLogoCard} active />

      <AuthorityLayer
        isDemoMode={isDemoMode}
        entity={authorityEntity}
        activeLens={analysisProfile}
        surfaceAuthority={surfaceAuthority}
        signals={activeSignals}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        suggestion={suggestion}
        onCommit={commitAuthority}
        onDismiss={dismissAuthority}
        isMobile={isMobile}
        mobileActiveTab={mobileActiveTab}
        onMobileSurfaceSelect={(chipLabel) => {
          // chipLabel is the raw chip label ('Chat' | 'Vendors' | 'Shortlist')
          // Map to canonical surface authority here — keeps the mapping in one place
          const chipToSurface = { Chat: 'Chat', Vendors: 'Vendor Intelligence', Shortlist: 'Chat' };
          setMobileActiveTab(chipLabel);
          const surface = chipToSurface[chipLabel] ?? 'Chat';
          commitAuthority(surface);
          if (surface === 'Vendor Intelligence') setActiveSpace('vendors');
          else setActiveSpace('chat');
        }}
      />

      <main style={{ flex: 1, minHeight: 0, display: 'flex', minWidth: 0, overflow: 'hidden' }}>

        {/* Left icon rail — section spaces, like Claude's left nav */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          activeSpace={activeSpace}
          onSwitch={(id, ctx) => {
            setActiveSpace(prev => prev === id ? 'chat' : id);
            setDrawerCollapsed(false);
            if (ctx?.stage !== undefined) setHiveStage(ctx.stage);
          }}
          litTiles={litTiles}
          browserTabs={browserTabs}
          onInject={({ persona, content }) => {
            setMessages(prev => [...prev, {
              id: `stage-${Date.now()}`,
              persona, content,
              role: 'assistant',
              model: 'claude-sonnet-4-6',
              tok: 0, ms: 0,
              sources: ['Workspace signals', 'proof360 signals'],
            }]);
          }}
          hiveStage={hiveStage}
          onHiveStageChange={setHiveStage}
          sessionTok={0}
          sessionModels={[]}
          onSignIn={() => setLoginOpen(true)}
          t={t}
        />

        {/* Chat pane — elastic width driven by surfaceFlex.chat (AC-8/AC-10) */}
        {/* Mobile: hidden when Vendor Intelligence holds authority (AC-14) */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          flex: previewOpen ? '0 0 400px' : (isMobile ? 1 : surfaceFlex.chat),
          transition: 'flex-grow 250ms ease, flex-shrink 250ms ease, flex-basis 0.38s cubic-bezier(0.32,0.72,0,1)',
          minWidth: isMobile ? 0 : 320,
          display: (isMobile && surfaceAuthority === 'Vendor Intelligence') ? 'none' : undefined,
        }}>

        {/* Chat space — kept mounted so theatrical doesn't reset on tab-switch */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          bottom: trustPhase !== 't0' ? 40 : 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {isHeroState ? (
            /* ── Hero / centered state ── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>
              {/* Hero auth bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 24px 0' }}>
                {currentUser ? (
                  <button
                    onClick={() => { localStorage.removeItem('founder_auth'); setCurrentUser(null); }}
                    title="Sign out"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px',
                      borderRadius: 14, border: `1px solid ${tk.hairline}`,
                      background: 'transparent', cursor: 'pointer',
                      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                      fontSize: 11, color: tk.inkSoft,
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', background: tk.umber,
                      color: '#fff', fontSize: 9, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{(currentUser.name || currentUser.email || '?')[0].toUpperCase()}</span>
                    {currentUser.name?.split(' ')[0] || currentUser.email?.split('@')[0]}
                  </button>
                ) : (
                  <button
                    onClick={() => setLoginOpen(true)}
                    style={{
                      padding: '4px 13px', borderRadius: 14,
                      border: `1px solid ${tk.hairline}`,
                      background: 'transparent', cursor: 'pointer',
                      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                      fontSize: 11, fontWeight: 600, color: tk.inkSoft,
                    }}
                  >Sign in</button>
                )}
              </div>
              <div style={{ width: '100%', maxWidth: 860, padding: '0 24px 48px', margin: 'auto', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: hasMessages ? 24 : 36 }}>
                  <div style={{
                    fontFamily: '"Instrument Serif", Georgia, serif',
                    fontSize: hasMessages ? 'clamp(20px, 2.6vw, 30px)' : 'clamp(26px, 3.6vw, 42px)',
                    letterSpacing: '-0.022em', color: tk.ink, lineHeight: 1.18, marginBottom: 10,
                  }}>
                    Investors are evaluating you<em style={{ fontStyle: 'italic' }}> right now.</em>
                  </div>
                  <div style={{
                    fontFamily: '"Instrument Serif", Georgia, serif',
                    fontStyle: 'italic', fontSize: 14, color: tk.inkSoft,
                  }}>Before the pitch. Before the meeting. Before you know they&apos;re looking.</div>
                  <div style={{
                    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    fontSize: 14, color: tk.inkSoft,
                    marginTop: 10, letterSpacing: '0.01em',
                  }}>Three advisors. Different lenses. Hive&amp;Co is a reference founder — funded, attested. Map your own against it.</div>
                  {!hasMessages && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18 }}>
                      {[
                        { id: 'sofia',    label: 'Sophia',   color: '#a8651e', note: 'Narrative & trust · the human story behind the numbers' },
                        { id: 'edison',   label: 'Edison',   color: '#176577', note: 'Technical & execution · what to fix and in what order' },
                        { id: 'leonardo', label: 'Leonardo', color: '#6b4ea8', note: 'Strategy & market · fundraising and deal consequences' },
                      ].map(p => {
                        const active = heroPersonas.has(p.id);
                        return (
                          <div key={p.id} style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => setHeroPersonas(prev => {
                                const next = new Set(prev);
                                if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                return next;
                              })}
                              onMouseEnter={() => setHeroPersonaHover(p.id)}
                              onMouseLeave={() => setHeroPersonaHover(null)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 13px', borderRadius: 20,
                                border: `1.5px solid ${p.color}`,
                                background: active ? `${p.color}18` : 'transparent',
                                cursor: 'pointer',
                                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                                fontSize: 12, fontWeight: 600, color: p.color,
                                transition: 'background 0.15s',
                              }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                              {p.label}
                            </button>
                            {heroPersonaHover === p.id && (
                              <div style={{
                                position: 'absolute', bottom: 'calc(100% + 7px)', left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#1c1917', color: '#f5f0eb',
                                fontSize: 11, padding: '5px 10px', borderRadius: 6,
                                whiteSpace: 'nowrap', pointerEvents: 'none',
                                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                                zIndex: 10,
                              }}>{p.note}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Sophia's intro + any AI messages before user speaks */}
                {hasMessages && (
                  <div style={{ marginBottom: 20 }}>
                    {messages.map((m, i) => (
                      <Bubble
                        key={m.id} msg={m} t={t}
                        isLatest={i === messages.length - 1 && m.role !== 'user'}
                        onPersonaRef={name => {
                          setInputValue(v => (v.trim() ? v.trimEnd() + ' ' : '') + '@' + name + ' ');
                          setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                        onProgramFocus={setFocusedProgram}
                      />
                    ))}
                    {thinkingSteps.length > 0 && <ThinkingStream steps={thinkingSteps} visible t={t} />}
                  </div>
                )}
                <ChatInput
                  ref={inputRef}
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={val => { submit(val); setInputValue(''); }}
                  onContextInject={label => {
                    const tok = 40 + Math.floor(Math.random() * 20);
                    const ms  = 300 + Math.floor(Math.random() * 200);
                    setMessages(prev => [...prev, {
                      id: `inject-${Date.now()}`, persona: 'edison', model: 'claude-sonnet-4-6', role: 'assistant', tok, ms,
                      sources: ['Analysis context', 'proof360 signals'],
                      content: `Got it — adding ${label.toLowerCase()} to the analysis context.`,
                    }]);
                  }}
                  disabled={!inputReady || isProcessing}
                  messages={messages}
                  mode={analysisProfile}
                  onModeChange={setAnalysisProfile}
                  hideChips
                  hideModelPicker={true}
                  model={selectedModel}
                  onModelChange={setSelectedModel}
                  activeModes={activeModes}
                  onToggleMode={id => setActiveModes(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])}
                />
                {/* Mode tiles — replace intent chips */}
                {(phase === 'triage' || (phase === 'active' && !hasMessages)) && (
                  <div style={{ marginTop: 14 }}>
                    <ModeTiles
                      t={t}
                      onSelect={question => {
                        submit(question);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
          <>
          {/* Floating questions — appear after intent is declared, hidden when preview is open */}
          {!briefShown && intent !== null && !previewOpen && FLOATS.map((fq, i) => {
            const isFront = pulsingQ !== null ? pulsingQ === i : surfaced === i;
            const dist = Math.min(Math.abs(i - surfaced), FLOATS.length - Math.abs(i - surfaced));
            const layer = isFront ? 'front' : dist === 1 ? 'mid' : 'back';
            return (
              <FloatQ key={i} q={fq.q} side={fq.side} top={fq.top}
                layer={layer} pulsing={pulsingQ === i} gone={hasUserMsg}
                treatment={t.floats} t={t} />
            );
          })}

          {/* Status strip — preview toggle, live indicator, sign in/out */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 12, padding: '4px 36px', flexShrink: 0, zIndex: 2,
          }}>
            {previewUrl && (
              <button
                onClick={() => setPreviewOpen(o => !o)}
                style={{
                  background: previewOpen ? `${tk.plum}15` : 'none',
                  border: `1px solid ${previewOpen ? `${tk.plum}40` : tk.hairline}`,
                  borderRadius: 6, cursor: 'pointer',
                  color: previewOpen ? tk.plum : tk.inkSoft,
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase',
                  padding: '4px 10px', transition: 'all 0.2s',
                }}
              >
                {previewOpen ? '◁ hide' : '▷ preview'}
              </button>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: t.returningUser ? tk.inkSoft : '#22c55e',
                boxShadow: t.returningUser ? 'none' : '0 0 0 0 #22c55e',
                animation: t.returningUser ? 'none' : 'liveping 2s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10, color: tk.inkSoft, letterSpacing: '0.1em',
              }}>{t.returningUser ? 'session resumed' : 'live'}</span>
            </span>
            {currentUser ? (
              <button
                onClick={() => { localStorage.removeItem('founder_auth'); setCurrentUser(null); }}
                title="Sign out"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px',
                  borderRadius: 14, border: `1px solid ${tk.hairline}`,
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                  fontSize: 11, color: tk.inkSoft,
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', background: tk.umber,
                  color: '#fff', fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{(currentUser.name || currentUser.email || '?')[0].toUpperCase()}</span>
                {currentUser.name?.split(' ')[0] || currentUser.email?.split('@')[0]}
              </button>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                style={{
                  padding: '4px 13px', borderRadius: 14,
                  border: `1px solid ${tk.hairline}`,
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                  fontSize: 11, fontWeight: 600, color: tk.inkSoft,
                  transition: 'all 0.15s',
                }}
              >Sign in</button>
            )}
          </div>

          <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative', zIndex: 2 }}>
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '100%' }}>

              {/* Headline — visible above messages until user first speaks */}
              {!briefShown && !hasUserMsg && (
                <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
                  <div style={{
                    fontFamily: '"Instrument Serif", Georgia, serif',
                    fontSize: 'clamp(24px, 3vw, 38px)',
                    letterSpacing: '-0.022em', color: tk.ink, lineHeight: 1.18, marginBottom: 10,
                  }}>
                    Investors are evaluating you<em style={{ fontStyle: 'italic' }}> right now.</em>
                  </div>
                  <div style={{
                    fontFamily: '"Instrument Serif", Georgia, serif',
                    fontStyle: 'italic', fontSize: 14, color: tk.inkSoft,
                  }}>Before the pitch. Before the meeting. Before you know they&apos;re looking.</div>
                  <div style={{
                    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    fontSize: 14, color: tk.inkSoft,
                    marginTop: 10, letterSpacing: '0.01em',
                  }}>Three advisors. Different lenses. Hive&amp;Co is a reference founder — funded, attested. Map your own against it.</div>
                  {!hasMessages && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18 }}>
                      {[
                        { id: 'sofia',    label: 'Sophia',   color: '#a8651e', note: 'Narrative & trust · the human story behind the numbers' },
                        { id: 'edison',   label: 'Edison',   color: '#176577', note: 'Technical & execution · what to fix and in what order' },
                        { id: 'leonardo', label: 'Leonardo', color: '#6b4ea8', note: 'Strategy & market · fundraising and deal consequences' },
                      ].map(p => {
                        const active = heroPersonas.has(p.id);
                        return (
                          <div key={p.id} style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => setHeroPersonas(prev => {
                                const next = new Set(prev);
                                if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                return next;
                              })}
                              onMouseEnter={() => setHeroPersonaHover(p.id)}
                              onMouseLeave={() => setHeroPersonaHover(null)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 13px', borderRadius: 20,
                                border: `1.5px solid ${p.color}`,
                                background: active ? `${p.color}18` : 'transparent',
                                cursor: 'pointer',
                                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                                fontSize: 12, fontWeight: 600, color: p.color,
                                transition: 'background 0.15s',
                              }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                              {p.label}
                            </button>
                            {heroPersonaHover === p.id && (
                              <div style={{
                                position: 'absolute', bottom: 'calc(100% + 7px)', left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#1c1917', color: '#f5f0eb',
                                fontSize: 11, padding: '5px 10px', borderRadius: 6,
                                whiteSpace: 'nowrap', pointerEvents: 'none',
                                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                                zIndex: 10,
                              }}>{p.note}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {briefShown ? (
                <MorningBrief onPullSignal={pullSignal} t={t} />
              ) : (
                <>
                  {/* Hive & Co stage selector — shown only once journey is running */}
                  {intent === 'browse' && phase === 'active' && (
                    <div style={{ marginBottom: 24 }}>
                      <StageSelector
                        stages={DEMO_STAGES}
                        activeId={activeStageId}
                        onSelect={id => {
                          setActiveStageId(id);
                          const stage = DEMO_STAGES.find(s => s.id === id);
                          // Keep Sophia/Leonardo/Edison intro messages, swap only the Hive & Co persona messages
                          setMessages(prev => {
                            const nonDemo = prev.filter(m => !m.id.startsWith('demo-'));
                            return [...nonDemo, ...stage.messages.map(m => ({ ...m, role: 'assistant' }))];
                          });
                          setCompanyData({
                            session_id: null,
                            company_name: stage.company.name,
                            trust_score: stage.trustScore,
                            gaps: stage.gaps,
                            deal_readiness: null,
                          });
                        }}
                        tk={tk}
                      />
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        gap: 16, marginTop: 12,
                      }}>
                        <div>
                          <div style={{
                            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                            fontSize: 13, fontWeight: 600, color: tk.ink,
                          }}>{DEMO_STAGES.find(s => s.id === activeStageId)?.company.name}</div>
                          <div style={{
                            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                            fontSize: 12, color: tk.inkSoft, marginTop: 3, lineHeight: 1.55,
                          }}>{DEMO_STAGES.find(s => s.id === activeStageId)?.company.description}</div>
                        </div>
                        <button
                          onClick={() => {
                            setIntent(null);
                            setMessages([]);
                            setCompanyData(null);
                            setInputValue('');
                            setInputReady(true);
                            setPhase('active');
                            setTimeout(() => inputRef.current?.focus(), 100);
                          }}
                          style={{
                            flexShrink: 0,
                            background: 'none', border: `1px solid ${tk.hairline}`,
                            borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
                            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                            fontSize: 11, color: tk.inkSoft,
                            transition: 'border-color 0.15s, color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = tk.plum; e.currentTarget.style.color = tk.plum; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = tk.hairline; e.currentTarget.style.color = tk.inkSoft; }}
                        >Try your company →</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <ObservationStrip
                signals={activeSignals}
                isDemoMode={isDemoMode}
                onCorrect={correctSignal}
                onIgnore={ignoreSignal}
                onAddContext={addContextSignal}
                regeneratingDomains={regeneratingDomains}
              />

              {/* Demo GuidanceBlock — Edison three-beat render (AC-4) */}
              <div style={{ alignSelf: 'flex-start', maxWidth: '72%' }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
                  textTransform: 'uppercase', color: '#176577', marginBottom: 4,
                }}>
                  Edison · operational lens
                </div>
                <GuidanceBlock
                  block={MOCK_GUIDANCE_BLOCK}
                  isRegenerating={regeneratingDomains.size > 0}
                />
              </div>

              {shortlist.length > 0 && (
                // vendors=shortlist intentional: this panel shows only shortlisted items,
                // all marked selected. shortlistedIds drives the "✓ Shortlisted" state per card.
                <VendorShortlist
                  vendors={shortlist}
                  shortlistedIds={shortlist}
                  onShortlist={handleShortlist}
                  onDefer={handleDefer}
                />
              )}

              {messages.map((m, i) => {
                const isLatest = i === messages.length - 1 && m.role !== 'user';
                return (
                  <Bubble
                    key={m.id} msg={m} t={t} isLatest={isLatest}
                    onPersonaRef={name => {
                      setInputValue(v => (v.trim() ? v.trimEnd() + ' ' : '') + '@' + name + ' ');
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    onProgramFocus={setFocusedProgram}
                  />
                );
              })}
              {phase === 'journey-setup' && <JourneyConsentCards onSelect={selectJourney} stages={DEMO_STAGES} tk={tk} />}
              {thinkingSteps.length > 0 && <ThinkingStream steps={thinkingSteps} visible t={t} />}

              {/* Follow-up suggestions — after last AI response, not while processing */}
              {!isProcessing && hasMessages && (() => {
                const lastAi = [...messages].reverse().find(m => m.role === 'assistant' && m.content);
                return lastAi ? (
                  <FollowUpChips
                    persona={lastAi.persona}
                    onSelect={q => { submit(q); }}
                    tk={tk}
                  />
                ) : null;
              })()}

            </div>
          </div>

          {/* Pinned input — always visible at the bottom of the chat pane */}
          <div style={{
            borderTop: `1px solid ${tk.hairline}`,
            background: tk.bg,
            flexShrink: 0,
            zIndex: 3,
          }}>
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 16px' }}>
              <ChatInput
                ref={inputRef}
                value={inputValue}
                onChange={setInputValue}
                onSubmit={val => { submit(val); setInputValue(''); }}
                onContextInject={label => {
                  const tok = 40 + Math.floor(Math.random() * 20);
                  const ms  = 300 + Math.floor(Math.random() * 200);
                  setMessages(prev => [...prev, {
                    id: `inject-${Date.now()}`,
                    persona: 'edison',
                    model: 'claude-sonnet-4-6',
                    role: 'assistant',
                    tok, ms,
                    sources: ['Analysis context', 'proof360 signals'],
                    content: `Got it — adding ${label.toLowerCase()} to the analysis context.`,
                  }]);
                }}
                disabled={!inputReady || isProcessing}
                messages={messages}
                mode={analysisProfile}
                onModeChange={setAnalysisProfile}
                hideModelPicker={true}
                model={selectedModel}
                onModelChange={setSelectedModel}
                activeModes={activeModes}
                onToggleMode={id => setActiveModes(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])}
              />
            </div>
          </div>
          </>)}
        </div>

        </div>{/* end chat pane */}

        {/* Company profile panel — discovery on landing, profile after first message */}
        {!previewOpen && (
          <div style={{ position: 'relative', zIndex: 25, flexShrink: 0, display: 'flex' }}>
            <CompanyProfile
              profile={companyProfile}
              isBuilding={isProcessing}
              hasMessages={hasMessages}
              tk={tk}
              t={t}
              onAsk={q => setInputValue(q)}
              focusedProgram={focusedProgram}
              onVendorSelect={id => { setActiveSpace(id); setDrawerCollapsed(false); if (isMobile) setMobileActiveTab('Vendors'); }}
              isDemoMode={isDemoMode}
              activeSignals={activeSignals}
              rankedVendors={rankedVendors}
              ctaEarned={ctaEarned}
            />
          </div>
        )}

        {/* Browser panel */}
        {previewUrl && previewOpen && (
          <BrowserPanel
            seedUrl={previewUrl}
            onTabsChange={tabs => {
              const prev = browserTabsRef.current;
              const newTabs = tabs.filter(t => !t.pinned && !prev.find(p => p.id === t.id));
              browserTabsRef.current = tabs;
              setBrowserTabs(tabs);

              if (newTabs.length > 0) {
                const newest = newTabs[newTabs.length - 1];
                const domain = newest.url.replace(/^https?:\/\//, '').split('/')[0];

                // Edison senses the tab open and speaks into the thread
                const msgFn = TAB_SENSE_MSGS[_tabSenseIdx % TAB_SENSE_MSGS.length];
                _tabSenseIdx++;
                const senseMsg = {
                  id: `sense-${Date.now()}`,
                  persona: 'edison',
                  model: 'claude-sonnet-4-6',
                  tok: 48 + Math.floor(Math.random() * 20),
                  ms: 310 + Math.floor(Math.random() * 200),
                  sources: ['Live web', 'Domain signals'],
                  content: msgFn(domain),
                };
                setMessages(prev => [...prev, senseMsg]);
                setInputReady(true);
                setTimeout(() => inputRef.current?.focus(), 150);
              }
            }}
            onClose={() => setPreviewOpen(false)}
            tk={tk}
          />
        )}

        {/* Projection pane — elastic in-flow sibling (AC-8 AC-9 AC-10) */}
        {/* Mobile (AC-14): full-width, shown only when surfaceAuthority === 'Vendor Intelligence' */}
        {/* Desktop: always mounted, compresses via surfaceFlex, never unmounts (AC-9) */}
        {(isMobile ? surfaceAuthority === 'Vendor Intelligence' : true) && (
          <div
            onClick={() => {
              if (isMobile) return; // no intent recording on mobile tap
              const now = Date.now();
              if (now - projectionIntentTimerRef.current > 800) {
                projectionIntentTimerRef.current = now;
                recordProjectionIntent();
              }
            }}
            style={{
              flex: isMobile ? 'none' : surfaceFlex.projection,
              width: isMobile ? '100%' : undefined,
              transition: isMobile ? 'none' : 'flex 250ms ease',
              minWidth: isMobile ? 0 : 180,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'row',
              background: tk.bg,
              borderLeft: isMobile ? 'none' : `1px solid ${tk.hairline}`,
              boxShadow: isMobile ? 'none' : '-4px 0 16px rgba(0,0,0,0.06)',
            }}
          >
            {/* Collapse / expand handle — desktop only */}
            {!isMobile && (
              <button
                onClick={e => { e.stopPropagation(); setDrawerCollapsed(c => !c); }}
                title={drawerCollapsed ? 'Expand panel' : 'Collapse panel'}
                style={{
                  flexShrink: 0, width: 28,
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: `1px solid ${tk.hairline}`,
                  color: tk.inkSoft,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = tk.surfaceLo}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d={drawerCollapsed ? 'M3 2 L7 5 L3 8' : 'M7 2 L3 5 L7 8'}
                    stroke="currentColor" strokeWidth="1.4"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}

            {/* Panel content — scrollable, compressed but visible at low flex (AC-9) */}
            <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
              <Projection
                id={activeSpace}
                company="hive"
                hiveStage={hiveStage}
                onBack={() => {
                  setActiveSpace('chat');
                  // On mobile, tapping back returns authority to Chat
                  if (isMobile) {
                    commitAuthority('Chat');
                    setMobileActiveTab('Chat');
                  }
                }}
                t={t}
              />
            </div>
          </div>
        )}


      </main>

      <MachineDrawer
        trustPhase={trustPhase}
        stats={drawerStatsDerived}
      >
        <GraphView nodes={graphNodes} />
        <ProvenanceAccordion trails={[]} />
        <DrawerStats stats={drawerStatsDerived ? {
          tokensProcessed: 18420,
          analysisPasses:  graphNodes.length > 0 ? 2 : 0,
          sourcesReviewed: companyData?.inferences?.length ?? 0,
          modelCorrelations: 2,
        } : null} />
        <EscalationCTA
          message={companyData?.gaps?.length > 2
            ? "There are gaps here that typically benefit from a guided conversation. We can introduce relevant partners."
            : null}
          onTelegram={() => setTelegramOpen(true)}
          email="hello@ethikslabs.com"
        />
      </MachineDrawer>

      {/* Telegram preview modal */}
      {telegramOpen && (
        <TelegramPreviewModal
          currentUser={currentUser}
          initialMessage={
            companyData?.company_name
              ? `Hi John — I'm looking at ${companyData.company_name} on proof360 and have a few questions. Can we connect?`
              : `Hi John — I've been using proof360 and would love to connect. Can we set up a call?`
          }
          onClose={() => setTelegramOpen(false)}
        />
      )}

      {/* Login modal */}
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onUser={user => { setCurrentUser(user); setLoginOpen(false); }}
        />
      )}

      {logoCard && (
        <div
          onClick={() => setLogoCard(null)}
          style={{
            position: 'fixed', right: '7%', bottom: 'calc(14% + 64px)',
            zIndex: 20, maxWidth: 240,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '14px 18px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.11)',
            cursor: 'pointer',
            animation: 'fadeSlideUp 0.2s ease both',
          }}
        >
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: '#6366f1', marginBottom: 4,
          }}>
            {logoCard.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
            {logoCard.name}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55 }}>
            {logoCard.desc}
          </div>
          <div style={{ fontSize: 10, color: '#d1d5db', marginTop: 8, textAlign: 'right' }}>
            tap to dismiss
          </div>
        </div>
      )}

    </div>
  );
}
