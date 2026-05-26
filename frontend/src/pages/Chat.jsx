import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { ProfileSelector }     from '../components/chat/ProfileSelector.jsx';
import { ChatInput }           from '../components/chat/ChatInput.jsx';
import { useTrustPhase }       from '../hooks/useTrustPhase.js';
import { deriveGraphNodes }    from '../utils/deriveGraphNodes.js';
import { getPersonaResponses, getPersonaResponse } from '../data/mock/personas.js';
import { getThinkingSteps } from '../data/mock/thinking.js';
import { DEMO_STAGES, DEFAULT_STAGE_ID } from '../data/demoCompany.js';
import { OperationalField } from '../components/OperationalField';

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
      content: `Just saw this — "${feed.headline}." ${feed.angle}`,
      feedUrl: feed.url, feedSource: feed.source },
    { id: 'th-1', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b', tok: 162, ms: 1340,
      content: "Still reactive, almost universally. Founders know the story they want to tell — but the evidence layer underneath it isn't there. Buyers are forming impressions before the first meeting. The posture is the pitch before the pitch starts." },
    { id: 'th-2', persona: 'edison',   model: 'claude-sonnet-4-6',         tok: 203, ms: 870, isHandoff: true,
      content: "And it shows up in the data room every time. SSL misconfigurations, no access control evidence, breach exposure that's been public for months. All fixable. All avoidable.\n\nYou're here for a reason. What are you trying to solve?" },
  ];
}

// Ambient exchange — already in progress when the user arrives
const AMBIENT_EXCHANGE = [
  { id: 'amb-0', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b', tok: 61, ms: 380,
    content: "Shadow DD window is narrowing. Buyers form impressions before page one of any deck." },
  { id: 'amb-1', persona: 'edison',   model: 'claude-sonnet-4-6',          tok: 49, ms: 290,
    content: "Public signals confirm it. Most don't know what's visible until they're already in the room." },
];

// Sophia notices the arrival and turns — she was already mid-discussion
const SOPHIA_INTRO = "Oh — you're here. Good. I'm Sophia. Leonardo and Edison are right here with me. We exist because founders and the people who fund or buy from them don't always speak the same language — and that gap costs real deals. Quick question —";

const DEMO_CO = {
  name: 'Hive & Co',
  url: 'hiveandco.proof360.au',
  type: 'specialty honey brand',
  story: 'Two years at Sydney markets, genuine traction, now eyeing UK retail and a seed round. The product is exceptional. The trust posture is invisible.',
};

const BROWSE_OPENING = [
  { id: 'br-0', persona: 'sofia',    model: 'claude-sonnet-4-6',           tok: 214, ms: 840,
    content: `Meet ${DEMO_CO.name} — a ${DEMO_CO.type}. ${DEMO_CO.story} The founders know everything about honey. They know nothing about what investors and enterprise buyers need to see before they say yes. Sound like anyone?` },
  { id: 'br-1', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b',   tok: 178, ms: 1120,
    content: "This is the most common moment we see. Real product, real customers — but the language of investors and procurement is completely foreign. The question isn't whether they're ready. It's whether they can show it." },
  { id: 'br-2', persona: 'edison',   model: 'claude-sonnet-4-6',           tok: 92,  ms: 610, isHandoff: true,
    content: `I'd start with what's publicly visible. Want to run ${DEMO_CO.name} through, or try your own company?` },
];

const QUESTION_OPENING = [
  { id: 'q-0', persona: 'sofia', model: 'claude-sonnet-4-6', tok: 44, ms: 390, isHandoff: true,
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
  const [phase, setPhase]                 = useState('intro');   // 'intro' | 'triage' | 'active'
  const [intent, setIntent]               = useState(null);      // 'browse' | 'raise' | 'question'
  const [previewUrl, setPreviewUrl]       = useState(null);
  const [previewOpen, setPreviewOpen]     = useState(false);
  const [browserTabs, setBrowserTabs] = useState([]);

  const [activeStageId,   setActiveStageId]   = useState(DEFAULT_STAGE_ID);
  const [companyData,     setCompanyData]     = useState(null);
  // setInferenceError wired for post-MVP: call when inference polling times out or errors
  const [inferenceError,  setInferenceError]  = useState(false);
  const [analysisProfile, setAnalysisProfile] = useState('investor');
  const [logoCard,        setLogoCard]        = useState(null);
  const [activeSpace,     setActiveSpace]     = useState('chat');
  const [sidebarCollapsed,setSidebarCollapsed]= useState(true);
  const [hiveStage,       setHiveStage]       = useState(1);
  const litTiles = useMemo(() => ({ investor: false, vendors: false, aws: false, microsoft: false, posture: false, spv: false }), []);
  const [showIntro,       setShowIntro]       = useState(
    () => !new URLSearchParams(window.location.search).has('demo')
  );
  const [cinStats,        setCinStats]        = useState(STATS_FALLBACK);

  const hasUserMsg  = messages.some(m => m.role === 'user');
  const hasMessages = messages.length > 0;

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

  const inputRef    = useRef(null);
  const scrollRef   = useRef(null);
  const browserTabsRef = useRef([]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, thinkingSteps]);

  useEffect(() => {
    if (!logoCard) return;
    const t = setTimeout(() => setLogoCard(null), 6000);
    return () => clearTimeout(t);
  }, [logoCard]);

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
      setBrowserTabs([]);
      setThinkingSteps([]);
      setActiveStageId(DEFAULT_STAGE_ID);
      setCompanyData(null);
      // Ambient exchange — room already in motion before user arrives
      await sleep(500);
      const ambientSpeed = 5; // fast — this was already happening
      for (const msg of AMBIENT_EXCHANGE) {
        if (cancelled) return;
        setMessages(prev => [...prev, { ...msg, content: '' }]);
        if (speedMs === 0) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content } : m));
        } else {
          for (let i = 1; i <= msg.content.length; i++) {
            if (cancelled) return;
            await sleep(ambientSpeed);
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content.slice(0, i) } : m));
          }
        }
        await sleep(320);
      }

      // Sophia notices the arrival — brief pause, then turns
      await sleep(600);
      const introMsg = { id: 'sophia-intro', persona: 'sofia', model: 'claude-sonnet-4-6', tok: 148, ms: 740, content: SOPHIA_INTRO };
      setMessages(prev => [...prev, { ...introMsg, content: '' }]);
      if (speedMs === 0) {
        setMessages(prev => prev.map(m => m.id === 'sophia-intro' ? { ...m, content: SOPHIA_INTRO } : m));
      } else {
        for (let i = 1; i <= SOPHIA_INTRO.length; i++) {
          if (cancelled) return;
          await sleep(speedMs);
          setMessages(prev => prev.map(m => m.id === 'sophia-intro' ? { ...m, content: SOPHIA_INTRO.slice(0, i) } : m));
        }
      }
      await sleep(400);
      if (!cancelled) setPhase('triage');
    }
    run();
    return () => { cancelled = true; };
  }, [runId, t.returningUser, seedQuery, seedReturning, seedDemo]); // eslint-disable-line react-hooks/exhaustive-deps

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
        id: msgId, role: 'assistant', persona: 'sofia', model: '', content: '',
      }]);

      try {
        const personaOverride = PROFILE_PERSONA[analysisProfile] ?? undefined;
        const res = await fetch(`/api/v1/session/${sessionId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            ...(personaOverride ? { persona_override: personaOverride } : {}),
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
    setIsProcessing(false);
  }, [inputReady, isProcessing, messages, t.returningUser, companyData, analysisProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectIntent = useCallback(async (chosen) => {
    const speedMs = t.typeSpeed === 'fast' ? 8 : t.typeSpeed === 'instant' ? 0 : 18;
    setIntent(chosen);
    if (chosen !== 'browse') setPhase('active');

    if (chosen === 'browse') {
      // Sophia explains the journey first — consent before demo starts
      const setupMsg = {
        id: 'br-setup', persona: 'sofia', model: 'claude-sonnet-4-6', tok: 194, ms: 890,
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
      position: 'relative', height: '100vh', display: 'flex', overflow: 'hidden',
      background: `radial-gradient(ellipse at 100% 100%, ${tk.bgTint} 0%, ${tk.bg} 60%)`,
      color: tk.ink,
      fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    }}>

      {showIntro && <CinematicIntro stats={cinStats} onComplete={() => {
        setShowIntro(false);
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' }));
      }} />}

      <OperationalField onLogoClick={setLogoCard} active={!showIntro} />

      <main style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>

        {/* Left icon rail — section spaces, like Claude's left nav */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          activeSpace={activeSpace}
          onSwitch={(id, ctx) => {
            setActiveSpace(prev => prev === id ? 'chat' : id);
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
            }]);
          }}
          hiveStage={hiveStage}
          onHiveStageChange={setHiveStage}
          sessionTok={0}
          sessionModels={[]}
          t={t}
        />

        {/* Chat pane — shrinks to make room for preview */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          flex: previewOpen ? '0 0 400px' : '1',
          transition: 'flex-basis 0.38s cubic-bezier(0.32,0.72,0,1)',
        }}>

        {/* Chat space — kept mounted so theatrical doesn't reset on tab-switch */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          bottom: trustPhase !== 't0' ? 40 : 0,
          display: 'flex',
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
              <style>{`
                @keyframes liveping {
                  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
                  70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
                  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
                }
              `}</style>
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2 }}>
            <div style={{ maxWidth: 660, margin: '0 auto', padding: '0 36px 20px' }}>

              {briefShown ? (
                <MorningBrief onPullSignal={pullSignal} t={t} />
              ) : (
                <>
                  {/* Hero — collapses once a conversation starts */}
                  <div style={{
                    maxHeight: (phase === 'active' || phase === 'journey-setup') ? 0 : 400,
                    opacity: (phase === 'active' || phase === 'journey-setup') ? 0 : 1, overflow: 'hidden',
                    transition: 'opacity 0.7s ease, max-height 0.9s ease',
                    marginBottom: (phase === 'active' || phase === 'journey-setup') ? 0 : 36, paddingTop: 36,
                  }}>
                    <p style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 10, color: tk.inkSoft,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      margin: '0 0 18px',
                      animation: 'fadeSlideUp 0.5s ease both',
                    }}>You&apos;re in the right room.</p>
                    <h1 style={{
                      fontFamily: headingFamily, fontWeight: headingWeight,
                      fontSize: 'clamp(26px, 3.4vw, 42px)',
                      color: tk.ink, letterSpacing: '-0.018em', lineHeight: 1.18,
                      margin: '0 0 16px',
                      animation: 'fadeSlideUp 0.6s ease 0.1s both',
                    }}>
                      Founders, <em>investors</em> and <em>enterprise buyers</em> don&apos;t always speak the same language.
                    </h1>
                    <p style={{
                      fontFamily: '"Instrument Serif", Georgia, serif',
                      fontStyle: 'italic', fontSize: 17, color: tk.inkMid, lineHeight: 1.6,
                      margin: '0 0 10px', maxWidth: 480,
                      animation: 'fadeSlideUp 0.6s ease 0.2s both',
                    }}>
                      That gap costs deals. Sophia, Leonardo, and Edison are here to close it.
                    </p>
                  </div>

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

              {messages.map((m, i) => {
                const isLatest = i === messages.length - 1 && m.role !== 'user';
                return (
                  <Bubble
                    key={m.id} msg={m} t={t} isLatest={isLatest}
                    onPersonaRef={name => {
                      setInputValue(v => (v.trim() ? v.trimEnd() + ' ' : '') + '@' + name + ' ');
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                  />
                );
              })}
              {phase === 'triage' && <TriageCards onSelect={selectIntent} tk={tk} />}
              {phase === 'journey-setup' && <JourneyConsentCards onSelect={selectJourney} stages={DEMO_STAGES} tk={tk} />}
              {thinkingSteps.length > 0 && <ThinkingStream steps={thinkingSteps} visible t={t} />}

            </div>
          </div>

          {/* Pinned input — always visible at the bottom of the chat pane */}
          <div style={{
            borderTop: `1px solid ${tk.hairline}`,
            background: tk.bg,
            flexShrink: 0,
            zIndex: 3,
          }}>
            <div style={{ maxWidth: 660, margin: '0 auto', padding: '0 36px 16px' }}>
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
                    content: `Got it — adding ${label.toLowerCase()} to the analysis context.`,
                  }]);
                }}
                disabled={!inputReady || isProcessing}
                messages={messages}
              />
              <div style={{ marginTop: 10 }}>
                <ProfileSelector
                  value={analysisProfile}
                  onChange={(profileId, subItem) => {
                    setAnalysisProfile(profileId);
                    if (subItem) setInputValue(subItem);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        </div>{/* end chat pane */}

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

        {/* Projection panel — slides in when a space is selected */}
        {activeSpace !== 'chat' && (
          <div style={{
            width: 380, flexShrink: 0,
            borderLeft: `1px solid ${tk.hairline}`,
            overflowY: 'auto',
            background: tk.bg,
          }}>
            <Projection
              id={activeSpace}
              company="hive"
              hiveStage={hiveStage}
              onBack={() => setActiveSpace('chat')}
              t={t}
            />
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
          telegramUrl="https://t.me/ethikslabs"
          email="hello@ethikslabs.com"
        />
      </MachineDrawer>

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
