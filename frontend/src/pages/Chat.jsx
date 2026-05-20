import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { tokens } from '../tokens.js';
import { Sidebar }       from '../components/chat/Sidebar.jsx';
import { FloatQ }        from '../components/chat/FloatQ.jsx';
import { Bubble }        from '../components/chat/Bubble.jsx';
import { ThinkingStream } from '../components/chat/ThinkingStream.jsx';
import { MorningBrief }  from '../components/chat/MorningBrief.jsx';
import { Projection }    from '../components/chat/Projections.jsx';
import { TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect, TweakToggle, TweakButton }
  from '../components/chat/TweaksPanel.jsx';
import { getPersonaResponses, getPersonaResponse } from '../data/mock/personas.js';
import { getThinkingSteps } from '../data/mock/thinking.js';

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
    { id: 'th-0', persona: 'sofia',
      content: `Just saw this — "${feed.headline}." ${feed.angle}`,
      feedUrl: feed.url, feedSource: feed.source },
    { id: 'th-1', persona: 'leonardo',
      content: "Still reactive, almost universally. Founders know the story they want to tell — but the evidence layer underneath it isn't there. Buyers are forming impressions before the first meeting. The posture is the pitch before the pitch starts." },
    { id: 'th-2', persona: 'edison', isHandoff: true,
      content: "And it shows up in the data room every time. SSL misconfigurations, no access control evidence, breach exposure that's been public for months. All fixable. All avoidable.\n\nYou're here for a reason. What are you trying to solve?" },
  ];
}

const SOPHIA_INTRO = "Hey — I'm Sophia. Leonardo and Edison are here with me. We exist because founders, investors, and enterprise buyers don't always speak the same language — and that gap costs deals. We're not going to assume you know any of this world. Quick question first —";

const DEMO_CO = {
  name: 'Hive & Co',
  url: 'hiveandco.proof360.au',
  type: 'specialty honey brand',
  story: 'Two years at Sydney markets, genuine traction, now eyeing UK retail and a seed round. The product is exceptional. The trust posture is invisible.',
};

const BROWSE_OPENING = [
  { id: 'br-0', persona: 'sofia',
    content: `Meet ${DEMO_CO.name} — a ${DEMO_CO.type}. ${DEMO_CO.story} The founders know everything about honey. They know nothing about what investors and enterprise buyers need to see before they say yes. Sound like anyone?` },
  { id: 'br-1', persona: 'leonardo',
    content: "This is the most common moment we see. Real product, real customers — but the language of investors and procurement is completely foreign. The question isn't whether they're ready. It's whether they can show it." },
  { id: 'br-2', persona: 'edison', isHandoff: true,
    content: `I'd start with what's publicly visible. Want to run ${DEMO_CO.name} through, or try your own company?` },
];

const QUESTION_OPENING = [
  { id: 'q-0', persona: 'sofia', isHandoff: true,
    content: "Good — just ask. We'll work from there." },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function PreviewPanel({ demoUrl, userUrl, onSetUserUrl, onClose, tk }) {
  const [activeTab, setActiveTab] = useState('demo');
  const [urlDraft, setUrlDraft]   = useState('');

  function Tab({ id, label, url }) {
    const active = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        style={{
          background: active ? tk.surface : 'transparent',
          border: 'none', borderBottom: active ? `2px solid ${tk.plum}` : '2px solid transparent',
          cursor: 'pointer', padding: '8px 14px',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: active ? tk.ink : tk.inkSoft,
          transition: 'color 0.15s, border-color 0.15s',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >
        {label}
        {url && (
          <span style={{ marginLeft: 6, opacity: 0.5, fontWeight: 400 }}>
            {url.replace(/^https?:\/\//, '').split('/')[0]}
          </span>
        )}
      </button>
    );
  }

  function submitUserUrl() {
    let u = urlDraft.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) u = `https://${u}`;
    onSetUserUrl(u);
    setActiveTab('user');
    setUrlDraft('');
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      borderLeft: `1px solid ${tk.hairline}`,
      animation: 'fadeSlideUp 0.35s ease both',
      minWidth: 0,
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        borderBottom: `1px solid ${tk.hairline}`,
        background: `${tk.surfaceLo}ee`,
        flexShrink: 0,
      }}>
        <Tab id="demo" label="Demo" url={demoUrl} />
        <Tab id="user" label="Yours" url={userUrl} />
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: tk.inkSoft, fontSize: 18, padding: '0 14px',
          lineHeight: 1, flexShrink: 0,
        }}>×</button>
      </div>

      {/* Demo iframe */}
      <iframe
        src={demoUrl}
        title="Demo company"
        style={{ flex: 1, border: 'none', width: '100%', display: activeTab === 'demo' ? 'block' : 'none' }}
      />

      {/* Your company — URL entry or iframe */}
      {activeTab === 'user' && (
        userUrl
          ? <iframe
              src={userUrl}
              title="Your company"
              style={{ flex: 1, border: 'none', width: '100%', display: 'block' }}
            />
          : <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 20, padding: 40,
            }}>
              <div style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontStyle: 'italic', fontSize: 22, color: tk.inkMid,
                textAlign: 'center', maxWidth: 280, lineHeight: 1.4,
              }}>Now try yours.</div>
              <p style={{
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontSize: 13, color: tk.inkSoft, textAlign: 'center',
                maxWidth: 300, lineHeight: 1.6, margin: 0,
              }}>
                Drop your website URL. We'll pull it up next to Hive & Co so you can see what the room sees.
              </p>
              <div style={{
                display: 'flex', gap: 8, width: '100%', maxWidth: 360,
              }}>
                <input
                  autoFocus
                  value={urlDraft}
                  onChange={e => setUrlDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitUserUrl()}
                  placeholder="yourcompany.com"
                  style={{
                    flex: 1, background: tk.surface, border: `1px solid ${tk.hairline}`,
                    borderRadius: 8, padding: '10px 14px',
                    fontFamily: '"IBM Plex Mono", monospace', fontSize: 12,
                    color: tk.ink, outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = `${tk.plum}60`; }}
                  onBlur={e  => { e.target.style.borderColor = tk.hairline; }}
                />
                <button
                  onClick={submitUserUrl}
                  style={{
                    background: tk.plum, color: tk.surface,
                    border: 'none', borderRadius: 8,
                    padding: '10px 18px', cursor: 'pointer',
                    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    fontSize: 12, fontWeight: 500,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >Open</button>
              </div>
            </div>
      )}
    </div>
  );
}

function TriageCards({ onSelect, tk }) {
  const opts = [
    { id: 'browse',   label: 'Just looking around',            sub: 'Show me what this is about' },
    { id: 'raise',    label: 'Raising money or landing deals', sub: 'I want investment or enterprise sales' },
    { id: 'question', label: 'I have a specific question',     sub: "Let's just get into it" },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      {opts.map((o, i) => (
        <button
          key={o.id}
          onClick={() => onSelect(o.id)}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${tk.plum}60`; e.currentTarget.style.background = `${tk.plum}08`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = tk.hairline; e.currentTarget.style.background = tk.surface; }}
          style={{
            background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 10,
            padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
            transition: 'border-color 0.2s, background 0.2s',
            animation: `fadeSlideUp 0.45s ease ${i * 0.1}s both`,
          }}
        >
          <div style={{
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            fontSize: 14, fontWeight: 500, color: tk.ink, marginBottom: 3,
          }}>{o.label}</div>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10, color: tk.inkSoft, letterSpacing: '0.06em',
          }}>{o.sub}</div>
        </button>
      ))}
    </div>
  );
}

export default function Chat() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const tk = tokens(t.theme);

  const [activeSpace, setActiveSpace]     = useState('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(!!t.sidebarCollapsed);
  const [runId, setRunId]                 = useState(0);
  const [feed]                            = useState(() => LIVE_FEED[Math.floor(Math.random() * LIVE_FEED.length)]);
  const [messages, setMessages]           = useState([]);
  const [surfaced, setSurfaced]           = useState(0);
  const [inputReady, setInputReady]       = useState(false);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [inputValue, setInputValue]       = useState('');
  const [pulsingQ, setPulsingQ]           = useState(null);
  const [litTiles, setLitTiles]           = useState({ investor: false, vendors: false, aws: false, posture: false, spv: false });
  const [thinkingSteps, setThinkingSteps] = useState([]);
  const [briefShown, setBriefShown]       = useState(false);
  const [phase, setPhase]                 = useState('intro');   // 'intro' | 'triage' | 'active'
  const [intent, setIntent]               = useState(null);      // 'browse' | 'raise' | 'question'
  const [previewUrl, setPreviewUrl]       = useState(null);
  const [previewOpen, setPreviewOpen]     = useState(false);
  const [userPreviewUrl, setUserPreviewUrl] = useState(null);

  const hasUserMsg  = messages.some(m => m.role === 'user');
  const hasMessages = messages.length > 0;
  const inChatSpace = activeSpace === 'chat';

  const inputRef  = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!inChatSpace) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, thinkingSteps, inChatSpace]);

  useEffect(() => {
    if (!inChatSpace || hasUserMsg) return;
    const id = setInterval(() => setSurfaced(p => (p + 1) % FLOATS.length), 4500);
    return () => clearInterval(id);
  }, [hasUserMsg, inChatSpace]);

  const seedQuery = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('q');
  }, []);

  const seedReturning = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('returning');
  }, []);

  useEffect(() => {
    if (seedQuery) {
      setMessages([]);
      setInputReady(true);
      setBriefShown(false);
      setLitTiles({ investor: false, vendors: false, aws: false, posture: false, spv: false });
      setInputValue(seedQuery);
      setTimeout(() => inputRef.current?.focus(), 200);
      return;
    }
    if (t.returningUser || seedReturning) {
      setMessages([]);
      setInputReady(true);
      setBriefShown(true);
      setLitTiles({ investor: true, vendors: true, aws: false, posture: true, spv: true });
      return;
    }
    let cancelled = false;
    const speedMs = t.typeSpeed === 'fast' ? 8 : t.typeSpeed === 'instant' ? 0 : 18;

    async function run() {
      setMessages([]);
      setInputReady(false);
      setBriefShown(false);
      setPulsingQ(null);
      setPhase('intro');
      setIntent(null);
      setPreviewUrl(null);
      setPreviewOpen(false);
      setUserPreviewUrl(null);
      setLitTiles({ investor: false, vendors: false, aws: false, posture: false, spv: false });
      setThinkingSteps([]);
      await sleep(900);
      const introMsg = { id: 'sophia-intro', persona: 'sofia', content: SOPHIA_INTRO };
      setMessages([{ ...introMsg, content: '' }]);
      if (speedMs === 0) {
        setMessages(prev => prev.map(m => m.id === 'sophia-intro' ? { ...m, content: SOPHIA_INTRO } : m));
      } else {
        for (let i = 1; i <= SOPHIA_INTRO.length; i++) {
          if (cancelled) return;
          await sleep(speedMs);
          setMessages(prev => prev.map(m => m.id === 'sophia-intro' ? { ...m, content: SOPHIA_INTRO.slice(0, i) } : m));
        }
      }
      setLitTiles(p => ({ ...p, investor: true, spv: true }));
      await sleep(400);
      if (!cancelled) setPhase('triage');
    }
    run();
    return () => { cancelled = true; };
  }, [runId, t.returningUser, seedQuery, seedReturning]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(async (input) => {
    const text = input.trim();
    if (!text || !inputReady || isProcessing) return;
    setInputValue('');
    setPulsingQ(null);
    setBriefShown(false);
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    setIsProcessing(true);
    const steps = getThinkingSteps();
    setThinkingSteps(steps.map(s => ({ ...s, status: 'running' })));
    for (let i = 0; i < steps.length; i++) {
      await sleep(360 + Math.random() * 380);
      setThinkingSteps(prev => prev.map((s, idx) => idx <= i ? { ...s, status: 'complete' } : s));
    }
    const personaMatch = text.match(/^(Sophia|Leonardo|Edison|John)[,\s]/i);
    const responses = personaMatch
      ? getPersonaResponse(personaMatch[1], text)
      : getPersonaResponses(text);

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
    setLitTiles({ investor: true, vendors: true, aws: true, posture: true, spv: true });
    setIsProcessing(false);
  }, [inputReady, isProcessing, messages, t.returningUser]);

  const selectIntent = useCallback(async (chosen) => {
    const speedMs = t.typeSpeed === 'fast' ? 8 : t.typeSpeed === 'instant' ? 0 : 18;
    setIntent(chosen);
    setPhase('active');
    const msgs = chosen === 'browse' ? BROWSE_OPENING
               : chosen === 'question' ? QUESTION_OPENING
               : buildOpening(feed);
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
      if (msg.persona === 'sofia')    setLitTiles(p => ({ ...p, investor: true, spv: true }));
      if (msg.persona === 'leonardo') setLitTiles(p => ({ ...p, vendors: true }));
      if (msg.persona === 'edison')   setLitTiles(p => ({ ...p, aws: true, posture: true }));
      if (msg.isHandoff) {
        await sleep(450);
        if (chosen === 'browse') {
          setPreviewUrl(`https://${DEMO_CO.url}`);
          setPreviewOpen(true);
          setInputValue(DEMO_CO.url);
        }
        setInputReady(true);
        setPulsingQ(Math.floor(Math.random() * FLOATS.length));
        if (inChatSpace) inputRef.current?.focus();
      } else {
        await sleep(620);
      }
    }
  }, [t.typeSpeed, feed, inChatSpace]); // eslint-disable-line react-hooks/exhaustive-deps

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
      position: 'relative', height: '100vh', display: 'flex', overflow: 'hidden',
      background: `radial-gradient(ellipse at 100% 100%, ${tk.bgTint} 0%, ${tk.bg} 60%)`,
      color: tk.ink,
      fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    }}>

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => {
          const next = !sidebarCollapsed;
          setSidebarCollapsed(next);
          setTweak('sidebarCollapsed', next);
        }}
        activeSpace={activeSpace}
        onSwitch={setActiveSpace}
        litTiles={litTiles}
        t={t}
      />

      <main style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>

        {/* Chat pane — shrinks to make room for preview */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          flex: previewOpen ? '0 0 460px' : '1',
          transition: 'flex-basis 0.38s cubic-bezier(0.32,0.72,0,1)',
        }}>

        {/* Chat space — kept mounted so theatrical doesn't reset on tab-switch */}
        <div style={{
          position: 'absolute', inset: 0,
          display: inChatSpace ? 'flex' : 'none',
          flexDirection: 'column',
        }}>
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

          {/* Chat header */}
          <div style={{
            padding: '20px 36px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', zIndex: 2,
            borderBottom: hasUserMsg ? `1px solid ${tk.hairline}` : 'none',
            transition: 'border-color 0.6s ease',
          }}>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10, color: tk.inkSoft,
              letterSpacing: '0.22em', textTransform: 'uppercase',
            }}>The strategy room</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10, color: tk.inkSoft, letterSpacing: '0.1em',
              }}>{t.returningUser ? 'session resumed' : 'live'}</span>
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2 }}>
            <div style={{ maxWidth: 660, margin: '0 auto', padding: '0 36px 44px' }}>

              {briefShown ? (
                <MorningBrief onPullSignal={pullSignal} t={t} />
              ) : (
                <div style={{
                  maxHeight: phase !== 'intro' ? 0 : 320,
                  opacity: phase !== 'intro' ? 0 : 1, overflow: 'hidden',
                  transition: 'opacity 0.7s ease, max-height 0.9s ease',
                  marginBottom: phase !== 'intro' ? 0 : 44, paddingTop: 28,
                }}>
                  <div style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10, fontWeight: 500, color: tk.inkSoft,
                    letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16,
                  }}>The question on the table</div>
                  <h1 style={{
                    fontFamily: headingFamily, fontWeight: headingWeight,
                    fontSize: 'clamp(30px, 4.2vw, 50px)',
                    color: tk.ink, letterSpacing: '-0.018em', lineHeight: 1.12,
                    margin: '0 0 18px',
                    animation: 'fadeSlideUp 0.7s ease both',
                  }}>
                    How do I build and maintain trust with{' '}
                    <span style={{ fontStyle: t.headingFamily === 'sans' ? 'normal' : 'italic', color: tk.plum }}>investors</span>{' '}
                    and{' '}
                    <span style={{ fontStyle: t.headingFamily === 'sans' ? 'normal' : 'italic', color: tk.teal }}>enterprise buyers</span>?
                  </h1>
                  <p style={{
                    fontFamily: '"Instrument Serif", Georgia, serif',
                    fontStyle: 'italic', fontSize: 17, color: tk.inkMid, lineHeight: 1.55,
                    margin: 0, maxWidth: 520,
                    animation: 'fadeSlideUp 0.7s ease 0.15s both',
                  }}>
                    You&apos;re being evaluated before you meet. Here&apos;s what they see — and what to do about it.
                  </p>
                </div>
              )}

              {messages.map((m, i) => {
                const isLatest = i === messages.length - 1 && m.role !== 'user';
                return <Bubble key={m.id} msg={m} t={t} isLatest={isLatest} />;
              })}
              {phase === 'triage' && <TriageCards onSelect={selectIntent} tk={tk} />}
              {thinkingSteps.length > 0 && <ThinkingStream steps={thinkingSteps} visible t={t} />}

              {/* Input */}
              <div style={{
                marginTop: hasMessages || briefShown ? 18 : 4,
                background: tk.surface, borderRadius: 14,
                border: `1px solid ${inputReady ? `${tk.plum}40` : tk.hairline}`,
                boxShadow: inputReady
                  ? `0 0 0 5px ${tk.plum}0d, 0 6px 22px ${tk.ink}0a`
                  : `0 2px 10px ${tk.ink}06`,
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
                  placeholder={inputReady ? (intent === 'question' ? 'Ask anything…' : t.returningUser ? 'Ask the room…' : "Tell us about your company…") : ''}
                  style={{
                    width: '100%', border: 'none', outline: 'none',
                    background: 'transparent',
                    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    fontSize: 15, lineHeight: 1.6,
                    color: tk.ink, padding: '18px 20px 6px',
                    resize: 'none', boxSizing: 'border-box',
                    letterSpacing: '0.003em',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 12px' }}>
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 9.5, color: tk.inkSoft, letterSpacing: '0.16em',
                    textTransform: 'uppercase', paddingLeft: 6,
                  }}>
                    {!inputReady ? 'listening…' : isProcessing ? 'thinking' : 'press ↵ to send'}
                  </span>
                  <button
                    onClick={() => submit(inputValue)}
                    disabled={!inputReady || isProcessing || !inputValue.trim()}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', border: 'none',
                      background: (!inputReady || isProcessing || !inputValue.trim()) ? tk.hairline : tk.plum,
                      color:      (!inputReady || isProcessing || !inputValue.trim()) ? tk.inkSoft  : tk.surface,
                      fontSize: 16, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                  >↑</button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Projection canvases */}
        {!inChatSpace && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
            <Projection id={activeSpace} t={t} />
          </div>
        )}

        </div>{/* end chat pane */}

        {/* Preview pane */}
        {previewUrl && previewOpen && (
          <PreviewPanel
            demoUrl={previewUrl}
            userUrl={userPreviewUrl}
            onSetUserUrl={url => {
              setUserPreviewUrl(url);
              const domain = url.replace(/^https?:\/\//, '').split('/')[0];
              setInputValue(domain);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            onClose={() => setPreviewOpen(false)}
            tk={tk}
          />
        )}

      </main>

      <TweaksPanel>
        <TweakSection label="Register" />
        <TweakRadio label="Theme" value={t.theme}
          options={[
            { value: 'pearl', label: 'Pearl' },
            { value: 'paper', label: 'Paper' },
            { value: 'study', label: 'Study' },
          ]}
          onChange={v => setTweak('theme', v)} />

        <TweakSection label="Typography" />
        <TweakRadio label="Heading" value={t.headingFamily}
          options={[{ value: 'serif', label: 'Serif' }, { value: 'sans', label: 'Sans' }]}
          onChange={v => setTweak('headingFamily', v)} />

        <TweakSection label="Foyer" />
        <TweakRadio label="Floats" value={t.floats}
          options={[
            { value: 'marks',     label: 'Marks'   },
            { value: 'plain',     label: 'Plain'   },
            { value: 'editorial', label: 'Margins' },
          ]}
          onChange={v => setTweak('floats', v)} />
        <TweakSelect label="Bubble style" value={t.bubble}
          options={[
            { value: 'transcript', label: 'Transcript (rule + indent)' },
            { value: 'card',       label: 'Card (tinted bubble)'       },
            { value: 'wash',       label: 'Wash (latest only)'         },
          ]}
          onChange={v => setTweak('bubble', v)} />

        <TweakSection label="Theatre" />
        <TweakSelect label="Typing pace" value={t.typeSpeed}
          options={[
            { value: 'natural', label: 'Natural (18ms)' },
            { value: 'fast',    label: 'Fast (8ms)'     },
            { value: 'instant', label: 'Instant'        },
          ]}
          onChange={v => setTweak('typeSpeed', v)} />
        <TweakToggle label="Returning user" value={t.returningUser}
          onChange={v => setTweak('returningUser', v)} />
        <TweakButton label="Replay opening" onClick={() => setRunId(r => r + 1)} />
      </TweaksPanel>

    </div>
  );
}
