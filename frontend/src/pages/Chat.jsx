import { useState, useEffect, useCallback, useRef } from 'react';
import { DrawerPanel }     from '../components/chat/DrawerPanel.jsx';
import { ReportPanel }     from '../components/chat/ReportPanel.jsx';
import { VendorShortlist } from '../components/chat/VendorShortlist.jsx';
import { EvidenceDrawer }  from '../components/chat/EvidenceDrawer.jsx';
import { ThinkingStream }  from '../components/chat/ThinkingStream.jsx';
import { SaveModal }       from '../components/chat/SaveModal.jsx';
import { getPersonaResponses, getPersonaResponse } from '../data/mock/personas.js';
import { getThinkingSteps }    from '../data/mock/thinking.js';
import { getMockReport }       from '../data/mock/report.js';
import { getMockVendors }      from '../data/mock/vendors.js';
import { getMockEvidence }     from '../data/mock/evidence.js';
import { getMockCosts }        from '../data/mock/costs.js';

const PERSONA = {
  sofia:    { label: 'Sophia',   color: '#d97706', bg: 'rgba(217,119,6,0.07)',  border: 'rgba(217,119,6,0.18)'  },
  leonardo: { label: 'Leonardo', color: '#7c3aed', bg: 'rgba(124,58,237,0.07)', border: 'rgba(124,58,237,0.18)' },
  edison:   { label: 'Edison',   color: '#0891b2', bg: 'rgba(8,145,178,0.07)',  border: 'rgba(8,145,178,0.18)'  },
  john_ai:  { label: 'John',     color: '#4f46e5', bg: 'rgba(79,70,229,0.07)',  border: 'rgba(79,70,229,0.18)',  note: 'AI assistant' },
};

const TILES = [
  { id: 'investor', label: 'Investor Readiness', color: '#7c3aed' },
  { id: 'vendors',  label: 'Vendors',            color: '#059669' },
  { id: 'aws',      label: 'AWS Programs',       color: '#d97706' },
  { id: 'posture',  label: 'Posture',            color: '#0891b2' },
  { id: 'spv',      label: 'SPV Status',         color: '#db2777' },
];

// Floating questions — depth-of-field thought layer.
// One surfaces at a time (foreground: sharp, readable). The rest sink to background (tiny, blurred, barely there).
// Slow cycle — like a thought rising to consciousness, then receding.
const FLOATS = [
  { q: 'What do investors need before wiring money?',                        top: '10%', left: '2%',  right: 'auto' },
  { q: 'What breaks due diligence?',                                        top: '26%', left: 'auto', right: '2%'  },
  { q: 'How do enterprise buyers evaluate trust before the first meeting?',  top: '50%', left: '2%',  right: 'auto' },
  { q: 'What signals create confidence — and what signals destroy it?',     top: '67%', left: 'auto', right: '2%'  },
  { q: 'How do I move from founder-said-so to evidence?',                   top: '83%', left: '2%',  right: 'auto' },
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
    { id: 'th-0', persona: 'sofia',
      content: `Just saw this — "${feed.headline}." ${feed.angle}`,
      feedUrl: feed.url, feedSource: feed.source },
    { id: 'th-1', persona: 'leonardo',
      content: "Still reactive, almost universally. Founders know the story they want to tell — but the evidence layer underneath it isn't there. Buyers are forming impressions before the first meeting. The posture is the pitch before the pitch starts." },
    { id: 'th-2', persona: 'edison', isHandoff: true,
      content: "And it shows up in the data room every time. SSL misconfigurations, no access control evidence, breach exposure that's been public for months. All fixable. All avoidable.\n\nYou're here for a reason. What are you trying to solve?" },
  ];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Floating question — depth plane ───────────────────────────────────────
// Surfaced: big as a heading, like the thought filling your mind.
// Background: tiny ghost, barely there.
function FloatQ({ q, top, left, right, isFront, pulsing, gone }) {
  return (
    <div style={{
      position: 'absolute',
      top, left, right,
      maxWidth: isFront ? 280 : 160,
      fontSize: isFront ? '28px' : '9px',
      fontWeight: isFront ? 700 : 400,
      lineHeight: isFront ? 1.2 : 1.5,
      fontStyle: 'italic',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 0,
      color: pulsing ? '#7c3aed' : isFront ? '#1e293b' : '#94a3b8',
      opacity: gone ? 0 : isFront ? 0.78 : 0.07,
      filter: isFront ? 'blur(0px)' : 'blur(1.5px)',
      transform: isFront ? 'translateY(0px)' : 'translateY(18px)',
      transition: 'font-size 2.2s ease, opacity 2.2s ease, filter 2.2s ease, transform 2.2s ease, color 0.8s ease, max-width 2.2s ease',
      animation: pulsing ? 'fqPulse 2s ease infinite' : 'none',
    }}>
      &ldquo;{q}&rdquo;
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const meta = PERSONA[msg.persona];
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ maxWidth: 520, padding: '13px 18px',
                      borderRadius: '16px 16px 4px 16px',
                      background: '#4f46e5', color: '#fff',
                      fontSize: 14, lineHeight: 1.7 }}>
          {msg.content}
        </div>
      </div>
    );
  }
  if (!meta) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
                    textTransform: 'uppercase', color: meta.color, marginBottom: 6 }}>
        {meta.label}
        {meta.note && <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none',
                                     color: '#94a3b8', marginLeft: 8 }}>{meta.note}</span>}
      </div>
      <div style={{ padding: '14px 18px', borderRadius: '2px 14px 14px 14px',
                    background: meta.bg, border: `1px solid ${meta.border}`,
                    fontSize: 14, lineHeight: 1.75, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
        {msg.content}
      </div>
      {msg.feedUrl && msg.content.length > 10 && (
        <a href={msg.feedUrl} target="_blank" rel="noopener noreferrer"
           style={{ display: 'inline-block', marginTop: 7, fontSize: 11,
                    color: meta.color, textDecoration: 'none', opacity: 0.7 }}>
          → {msg.feedSource}
        </a>
      )}
    </div>
  );
}

// ── Shelf tile ─────────────────────────────────────────────────────────────
function ShelfTile({ tile, lit, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={lit ? onClick : undefined}
      style={{
        padding: '10px 14px', borderRadius: 8, marginBottom: 6,
        border: `1px solid ${active ? tile.color + '80' : lit ? tile.color + '35' : '#f1f5f9'}`,
        background: active ? tile.color + '14' : lit ? tile.color + '08' : 'transparent',
        opacity: lit ? 1 : 0.3,
        transition: 'all 0.4s ease',
        position: 'relative', overflow: 'hidden',
        cursor: lit ? 'pointer' : 'default',
        boxShadow: active ? `0 0 0 1px ${tile.color}30` : 'none',
      }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px',
                    textTransform: 'uppercase', color: lit ? tile.color : '#94a3b8',
                    display: 'flex', alignItems: 'center', gap: 6 }}>
        {active && <span style={{ fontSize: 7, lineHeight: 1 }}>●</span>}
        {tile.label}
      </div>
      {hover && !lit && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                      padding: '0 14px', background: 'rgba(255,255,255,0.97)',
                      fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          This will fill in as we learn about you.
        </div>
      )}
    </div>
  );
}

// ── Tile drawer content ─────────────────────────────────────────────────────
const AWS_PROGRAMS = [
  { name: 'AWS Activate',         status: 'not_enrolled', label: 'Not enrolled',   action: 'Apply →',  eligible: false },
  { name: 'AWS ISV Accelerate',   status: 'eligible',     label: 'Eligible',       action: 'Apply →',  eligible: true  },
  { name: 'Startup Credits',      status: 'available',    label: '$10k available', action: 'Claim →',  eligible: true  },
];

function TileDrawerContent({ id, reportData, vendorList, evidenceList, onAsk }) {
  const ask = (msg) => onAsk(msg);
  const row = (label, value, color) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #f8f8f8', fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || '#1e293b' }}>{value}</span>
    </div>
  );
  const cta = (label, color, onClick) => (
    <button onClick={onClick} style={{
      width: '100%', padding: '11px', borderRadius: 8, border: `1px solid ${color}30`,
      background: `${color}08`, color, fontSize: 12, fontWeight: 600,
      cursor: 'pointer', marginBottom: 8, textAlign: 'left',
    }}>{label}</button>
  );

  if (id === 'investor') return (
    <div>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>72</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Trust score out of 100</div>
      <div style={{ marginBottom: 20 }}>
        {[['No SOC 2 evidence', '#ef4444'], ['Breach exposure public', '#f97316'], ['SSL misconfiguration', '#f59e0b']].map(([g, c]) => (
          <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
                                borderBottom: '1px solid #fafafa', fontSize: 13, color: '#334155' }}>
            <span style={{ color: c, fontSize: 8 }}>●</span>{g}
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#94a3b8',
                      textTransform: 'uppercase', marginBottom: 8 }}>Recommended</div>
        <div style={{ fontSize: 13, color: '#475569' }}>Vanta · Drata · Cloudflare</div>
      </div>
      {cta('Send investor link', '#7c3aed', () => {})}
      {cta('Ask Sophia — what does this mean for my raise?', '#d97706', () => ask("Sophia, what does a trust score of 72 mean for my raise?"))}
    </div>
  );

  if (id === 'vendors') return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Matched to your gaps</div>
      {(vendorList?.length ? vendorList : [
        { id: 'v1', name: 'Vanta',       category: 'Compliance',  priority: 'start_here'  },
        { id: 'v2', name: 'Cloudflare',  category: 'Security',    priority: 'recommended' },
        { id: 'v3', name: 'Drata',       category: 'Compliance',  priority: 'recommended' },
      ]).map(v => (
        <div key={v.id} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{v.name}</span>
            <span style={{ fontSize: 10, color: v.priority === 'start_here' ? '#7c3aed' : '#94a3b8',
                           fontWeight: 600, textTransform: 'uppercase' }}>
              {v.priority === 'start_here' ? 'Start here' : v.priority}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{v.category}</div>
        </div>
      ))}
      {cta('Ask Leonardo — which one first?', '#7c3aed', () => ask("Leonardo, which vendor should I start with given my current gaps?"))}
    </div>
  );

  if (id === 'aws') return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Programs matched to your stage</div>
      {AWS_PROGRAMS.map(p => (
        <div key={p.name} style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{p.name}</span>
            <span style={{ fontSize: 11, color: p.eligible ? '#059669' : '#94a3b8' }}>{p.label}</span>
          </div>
          {p.eligible && (
            <button style={{ marginTop: 6, fontSize: 11, color: '#d97706', background: 'none',
                             border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}>
              {p.action}
            </button>
          )}
        </div>
      ))}
      {cta('Ask Edison — how do I qualify?', '#0891b2', () => ask("Edison, how do I qualify for AWS ISV Accelerate and claim the startup credits?"))}
    </div>
  );

  if (id === 'posture') return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Live security posture</div>
      {[['SSL / TLS',       'Issues found',       '#ef4444'],
        ['Access Control',  'No evidence',         '#f97316'],
        ['Breach Monitor',  'Exposure detected',   '#ef4444'],
        ['Data Privacy',    'Unknown',             '#94a3b8'],
        ['MFA Enforcement', 'Not configured',      '#f59e0b']].map(([label, status, color]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                                  padding: '9px 0', borderBottom: '1px solid #f8f8f8', fontSize: 13 }}>
          <span style={{ color: '#334155' }}>{label}</span>
          <span style={{ color, fontSize: 11, fontWeight: 600 }}>{status}</span>
        </div>
      ))}
      {cta('Ask Edison — what do I fix first?', '#0891b2', () => ask("Edison, what's the highest priority security fix given my current posture?"))}
    </div>
  );

  if (id === 'spv') return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Your operational passport</div>
      {row('Entity status',   'Not registered', '#f97316')}
      {row('Trust score',     '72 / 100',       '#7c3aed')}
      {row('Attestations',    '0 filed')}
      {row('Last updated',    'Just now')}
      {row('Investor links',  '0 sent')}
      <div style={{ marginTop: 20 }}>
        {cta('Start SPV setup', '#db2777', () => {})}
        {cta('Ask Leonardo — what does an investor need to see?', '#7c3aed', () => ask("Leonardo, what does an investor need to see in my SPV passport before they'll wire money?"))}
      </div>
    </div>
  );

  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Chat() {
  const [feed]        = useState(() => LIVE_FEED[Math.floor(Math.random() * LIVE_FEED.length)]);
  const [messages, setMessages]         = useState([]);
  const [surfaced, setSurfaced]         = useState(0);   // which thought is foreground
  const [inputReady, setInputReady]     = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputValue, setInputValue]     = useState('');
  const [pulsingQ, setPulsingQ]         = useState(null); // index into combined float array
  const [litTiles, setLitTiles]         = useState({ investor: false, vendors: false, aws: false, posture: false, spv: false });
  const [thinkingSteps, setThinkingSteps] = useState([]);
  const [reportData, setReportData]     = useState(null);
  const [vendorList, setVendorList]     = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [showSave, setShowSave]         = useState(false);

  const hasMessages = messages.length > 0;
  const hasUserMsg  = messages.some(m => m.role === 'user');
  const allLit      = Object.values(litTiles).every(Boolean);

  const inputRef  = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingSteps]);

  // Cycle thoughts to foreground — one surfaces every 4.5s, the rest sink back
  useEffect(() => {
    if (hasUserMsg) return;
    const id = setInterval(() => setSurfaced(p => (p + 1) % FLOATS.length), 4500);
    return () => clearInterval(id);
  }, [hasUserMsg]);

  // ── Theatrical opening ────────────────────────────────────────────────
  useEffect(() => {
    const opening = buildOpening(feed);
    let cancelled = false;
    async function run() {
      await sleep(1000);
      for (const msg of opening) {
        if (cancelled) return;
        setMessages(prev => [...prev, { ...msg, content: '' }]);
        for (let i = 1; i <= msg.content.length; i++) {
          if (cancelled) return;
          await sleep(20);
          setMessages(prev => prev.map(m => m.id === msg.id
            ? { ...m, content: msg.content.slice(0, i) } : m));
        }
        if (msg.persona === 'sofia')    setLitTiles(p => ({ ...p, investor: true, spv: true }));
        if (msg.persona === 'leonardo') setLitTiles(p => ({ ...p, vendors: true }));
        if (msg.persona === 'edison')   setLitTiles(p => ({ ...p, aws: true, posture: true }));
        if (msg.isHandoff) {
          await sleep(400);
          if (!cancelled) {
            setInputReady(true);
            setPulsingQ(Math.floor(Math.random() * FLOATS.length));
            inputRef.current?.focus();
          }
        } else {
          await sleep(650);
        }
      }
    }
    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ────────────────────────────────────────────────────────────
  const submit = useCallback(async (input) => {
    const text = input.trim();
    if (!text || !inputReady || isProcessing) return;
    setInputValue('');
    setPulsingQ(null);
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    setIsProcessing(true);
    const steps = getThinkingSteps();
    setThinkingSteps(steps.map(s => ({ ...s, status: 'running' })));
    for (let i = 0; i < steps.length; i++) {
      await sleep(340 + Math.random() * 380);
      setThinkingSteps(prev => prev.map((s, idx) => idx <= i ? { ...s, status: 'complete' } : s));
    }
    // Direct address ("Edison, ...") → solo response. Otherwise → intent routing.
    const personaMatch = text.match(/^(Sophia|Leonardo|Edison|John)[,\s]/i);
    const responses = personaMatch
      ? getPersonaResponse(personaMatch[1], text)
      : getPersonaResponses(text);

    // First user message → Sophia follows up asking for materials to work with
    const isFirstMsg = !messages.some(m => m.role === 'user');
    const intakeMsg = isFirstMsg && !personaMatch ? {
      id: `intake-${Date.now()}`,
      role: 'assistant',
      persona: 'sofia',
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
    setLitTiles({ investor: true, vendors: true, aws: true, posture: true, spv: true });
    setReportData(getMockReport());
    setVendorList(getMockVendors());
    setEvidenceList(getMockEvidence());
    getMockCosts();
    setIsProcessing(false);
    setTimeout(() => setShowSave(true), 2500);
  }, [inputReady, isProcessing]);

  function toggleDrawer(id) { setActiveDrawer(p => p === id ? null : id); }

  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
      background: 'linear-gradient(160deg, #ffffff 0%, #fcfaff 45%, #f7f3ff 100%)',
    }}>

      <style>{`
        @keyframes fqPulse {
          0%,100% { opacity:0.9; filter:brightness(1.15); }
          50%     { opacity:1;   filter:brightness(1.5); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── MAIN CANVAS ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    position: 'relative', overflow: 'hidden', minWidth: 0 }}>

        {/* Floating questions — depth plane. One surfaces at a time. Fade when founder speaks. */}
        {FLOATS.map((fq, i) => (
          <FloatQ key={i} {...fq}
            isFront={pulsingQ !== null ? pulsingQ === i : surfaced === i}
            pulsing={pulsingQ === i}
            gone={hasUserMsg} />
        ))}

        {/* Wordmark */}
        <div style={{ flexShrink: 0, padding: '22px 32px', position: 'relative', zIndex: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#334155', letterSpacing: '-0.2px' }}>
            proof<span style={{ color: '#7c3aed' }}>360</span>
          </span>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 24px 40px' }}>

            {/* Problem statement — the mirror. Stays through theatrical. Fades only when founder speaks. */}
            <div style={{
              textAlign: 'center',
              maxHeight: hasUserMsg ? 0 : 260,
              opacity: hasUserMsg ? 0 : 1,
              overflow: 'hidden',
              transition: 'opacity 0.7s ease, max-height 0.9s ease',
              marginBottom: hasUserMsg ? 0 : 40,
            }}>
              <h1 style={{
                fontSize: 'clamp(26px, 3.6vw, 44px)', fontWeight: 700,
                color: '#1e293b', letterSpacing: '-1px', lineHeight: 1.2,
                margin: '32px 0 16px',
                animation: 'fadeSlideUp 0.7s ease both',
              }}>
                How do I build and maintain trust with investors and enterprise buyers?
              </h1>
              <p style={{
                fontSize: 15, color: '#94a3b8', lineHeight: 1.65, margin: 0,
                animation: 'fadeSlideUp 0.7s ease 0.15s both',
              }}>
                Investors and enterprise buyers evaluate you before you meet.<br />
                Here's what they see — and what to do about it.
              </p>
            </div>

            {/* Messages */}
            {messages.map(m => <Bubble key={m.id} msg={m} />)}
            {thinkingSteps.length > 0 && <ThinkingStream steps={thinkingSteps} visible />}
            <div ref={bottomRef} />

            {/* Input card */}
            <div style={{
              marginTop: hasMessages ? 16 : 0,
              background: '#fff', borderRadius: 16,
              border: `1px solid ${inputReady ? 'rgba(124,58,237,0.3)' : '#e8ecf0'}`,
              boxShadow: inputReady
                ? '0 0 0 4px rgba(124,58,237,0.07), 0 4px 24px rgba(0,0,0,0.09)'
                : '0 2px 12px rgba(0,0,0,0.07)',
              transition: 'border-color 0.6s, box-shadow 0.6s',
              opacity: inputReady ? 1 : 0.55,
            }}>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit(inputValue);
                  }
                }}
                disabled={!inputReady || isProcessing}
                rows={3}
                placeholder={inputReady ? "Tell us what's going on…" : ''}
                style={{
                  width: '100%', border: 'none', outline: 'none',
                  background: 'transparent', fontSize: 15, lineHeight: 1.6,
                  color: '#1e293b', padding: '18px 20px 8px',
                  resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end',
                            padding: '8px 14px 14px' }}>
                <button
                  onClick={() => submit(inputValue)}
                  disabled={!inputReady || isProcessing || !inputValue.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: (!inputReady || isProcessing || !inputValue.trim())
                      ? '#e2e8f0' : '#7c3aed',
                    color: (!inputReady || isProcessing || !inputValue.trim())
                      ? '#94a3b8' : '#fff',
                    fontSize: 18, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                >↑</button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── SHELF ─────────────────────────────────────────────────────────── */}
      <div style={{
        width: 210, flexShrink: 0, borderLeft: '1px solid #ede9fe',
        background: 'rgba(255,255,255,0.8)', padding: '72px 14px 24px',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 9, letterSpacing: '2.5px', color: '#c4b5fd',
                      textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>
          Intelligence
        </div>
        {TILES.map(t => (
          <ShelfTile key={t.id} tile={t} lit={litTiles[t.id]}
            active={activeDrawer === t.id}
            onClick={() => toggleDrawer(t.id)} />
        ))}
      </div>

      {/* Tile drawer — slides in over chat, never leaves the room */}
      <DrawerPanel
        title={TILES.find(t => t.id === activeDrawer)?.label || ''}
        isOpen={!!activeDrawer}
        onClose={() => setActiveDrawer(null)}
      >
        <TileDrawerContent
          id={activeDrawer}
          reportData={reportData}
          vendorList={vendorList}
          evidenceList={evidenceList}
          onAsk={(msg) => {
            setActiveDrawer(null);
            setInputValue(msg);
            setTimeout(() => inputRef.current?.focus(), 150);
          }}
        />
      </DrawerPanel>
      {showSave && <SaveModal onSave={() => setShowSave(false)} onDismiss={() => setShowSave(false)} />}
    </div>
  );
}
