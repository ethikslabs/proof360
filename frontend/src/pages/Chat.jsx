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
    { id: 'th-0', persona: 'sofia',    model: 'claude-sonnet-4-6',         tok: 188, ms: 920,
      content: `Just saw this — "${feed.headline}." ${feed.angle}`,
      feedUrl: feed.url, feedSource: feed.source },
    { id: 'th-1', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b', tok: 162, ms: 1340,
      content: "Still reactive, almost universally. Founders know the story they want to tell — but the evidence layer underneath it isn't there. Buyers are forming impressions before the first meeting. The posture is the pitch before the pitch starts." },
    { id: 'th-2', persona: 'edison',   model: 'claude-sonnet-4-6',         tok: 203, ms: 870, isHandoff: true,
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

/* kept for compatibility — unused after BrowserPanel */
function PreviewPanel({ demoUrl, userUrl, onSetUserUrl, onClose, tk }) {
  const [demoOpen,  setDemoOpen]  = useState(true);
  const [yoursOpen, setYoursOpen] = useState(true);
  const [urlDraft,  setUrlDraft]  = useState('');

  const STRIP = 30;
  const mono  = '"IBM Plex Mono", monospace';

  function PaneHeader({ label, url, accent, onCollapse, side }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', flexShrink: 0,
        borderBottom: `1px solid ${tk.hairline}`,
        background: `${tk.surfaceLo}ee`,
      }}>
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: accent, flexShrink: 0 }}>{label}</span>
        {url && (
          <div style={{
            flex: 1, background: tk.bg, border: `1px solid ${tk.hairline}`,
            borderRadius: 5, padding: '3px 9px',
            fontFamily: mono, fontSize: 10.5, color: tk.inkSoft,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{url.replace(/^https?:\/\//, '')}</div>
        )}
        <button onClick={onCollapse} title="Collapse" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: tk.inkSoft, fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0,
        }}>{side === 'left' ? '‹' : '›'}</button>
      </div>
    );
  }

  function CollapseStrip({ label, accent, side, onExpand }) {
    return (
      <div onClick={onExpand} title="Expand" style={{
        width: STRIP, flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
        cursor: 'pointer', background: `${accent}06`,
        borderRight: side === 'left' ? `1px solid ${tk.hairline}` : 'none',
        borderLeft:  side === 'right' ? `1px solid ${tk.hairline}` : 'none',
        transition: 'background 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = `${accent}12`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${accent}06`; }}
      >
        <span style={{
          fontFamily: mono, fontSize: 8.5, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: accent,
          writingMode: 'vertical-rl',
          transform: side === 'left' ? 'rotate(180deg)' : 'none',
        }}>{label}</span>
        <span style={{ color: accent, fontSize: 12, opacity: 0.6 }}>
          {side === 'left' ? '›' : '‹'}
        </span>
      </div>
    );
  }

  function submitUserUrl() {
    let u = urlDraft.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) u = `https://${u}`;
    onSetUserUrl(u);
    setUrlDraft('');
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      borderLeft: `1px solid ${tk.hairline}`,
      animation: 'fadeSlideUp 0.35s ease both', minWidth: 0,
    }}>
      {/* Global close */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        padding: '4px 8px', flexShrink: 0,
        borderBottom: `1px solid ${tk.hairline}`,
        background: `${tk.surfaceLo}cc`,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: tk.inkSoft, fontSize: 17, padding: '0 4px', lineHeight: 1,
        }}>×</button>
      </div>

      {/* Split body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Demo pane */}
        {demoOpen ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: `1px solid ${tk.hairline}` }}>
            <PaneHeader label="demo" url={demoUrl} accent={tk.umber} onCollapse={() => setDemoOpen(false)} side="left" />
            <iframe src={demoUrl} title="Demo company" style={{ flex: 1, border: 'none', minWidth: 0 }} />
          </div>
        ) : (
          <CollapseStrip label="demo" accent={tk.umber} side="left" onExpand={() => setDemoOpen(true)} />
        )}

        {/* Yours pane */}
        {yoursOpen ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {userUrl ? (
              <>
                <PaneHeader label="yours" url={userUrl} accent={tk.plum} onCollapse={() => setYoursOpen(false)} side="right" />
                <iframe src={userUrl} title="Your company" style={{ flex: 1, border: 'none', minWidth: 0 }} />
              </>
            ) : (
              <>
                <PaneHeader label="yours" url={null} accent={tk.plum} onCollapse={() => setYoursOpen(false)} side="right" />
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 16, padding: '28px 20px',
                  background: `${tk.surfaceLo}88`,
                }}>
                  <div style={{
                    fontFamily: '"Instrument Serif", Georgia, serif',
                    fontStyle: 'italic', fontSize: 19, color: tk.inkMid,
                    textAlign: 'center', lineHeight: 1.4,
                  }}>Now try yours.</div>
                  <p style={{
                    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    fontSize: 12.5, color: tk.inkSoft, textAlign: 'center',
                    lineHeight: 1.6, margin: 0, maxWidth: 220,
                  }}>
                    Drop your URL here — same conversation, live comparison.
                  </p>
                  <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 260 }}>
                    <input
                      autoFocus
                      value={urlDraft}
                      onChange={e => setUrlDraft(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitUserUrl()}
                      placeholder="yourcompany.com"
                      style={{
                        flex: 1, background: tk.surface, border: `1px solid ${tk.hairline}`,
                        borderRadius: 7, padding: '8px 11px',
                        fontFamily: mono, fontSize: 11.5,
                        color: tk.ink, outline: 'none', minWidth: 0,
                      }}
                      onFocus={e => { e.target.style.borderColor = `${tk.plum}60`; }}
                      onBlur={e  => { e.target.style.borderColor = tk.hairline; }}
                    />
                    <button onClick={submitUserUrl} style={{
                      background: tk.plum, color: tk.surface, border: 'none',
                      borderRadius: 7, padding: '8px 13px', cursor: 'pointer',
                      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                      fontSize: 12, fontWeight: 500, flexShrink: 0,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >Open</button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <CollapseStrip label="yours" accent={tk.plum} side="right" onExpand={() => setYoursOpen(true)} />
        )}

      </div>
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
  const [activeCompany, setActiveCompany] = useState('yours');
  const [activeHiveStage, setActiveHiveStage] = useState(1);
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
  const [browserTabs, setBrowserTabs] = useState([]);

  const hasUserMsg  = messages.some(m => m.role === 'user');
  const hasMessages = messages.length > 0;
  const inChatSpace = activeSpace === 'chat';

  const sessionTok    = messages.reduce((s, m) => s + (m.tok ?? 0), 0);
  const sessionModels = [...new Set(messages.filter(m => m.model).map(m => m.model))];

  const inputRef    = useRef(null);
  const scrollRef   = useRef(null);
  const browserTabsRef = useRef([]);

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
      setBrowserTabs([]);
      setLitTiles({ investor: false, vendors: false, aws: false, posture: false, spv: false });
      setThinkingSteps([]);
      await sleep(900);
      const introMsg = { id: 'sophia-intro', persona: 'sofia', model: 'claude-sonnet-4-6', tok: 148, ms: 740, content: SOPHIA_INTRO };
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
        onSwitch={(spaceId, ctx) => {
          setActiveSpace(spaceId);
          if (ctx?.company) setActiveCompany(ctx.company);
          if (ctx?.stage !== undefined) setActiveHiveStage(ctx.stage);
        }}
        litTiles={litTiles}
        browserTabs={browserTabs}
        onInject={msg => {
          const tok = Math.floor((msg.content?.length ?? 0) / 3.8) + 60 + Math.floor(Math.random() * 40);
          const ms  = 400 + Math.floor(Math.random() * 900);
          setMessages(prev => [...prev, {
            id: `inject-${Date.now()}`,
            role: 'assistant',
            model: 'claude-sonnet-4-6',
            tok, ms, ...msg,
          }]);
          setInputReady(true);
          setTimeout(() => inputRef.current?.focus(), 150);
        }}
        sessionTok={sessionTok}
        sessionModels={sessionModels}
        t={t}
      />

      <main style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>

        {/* Chat pane — shrinks to make room for preview */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          flex: previewOpen ? '0 0 400px' : '1',
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
            <Projection id={activeSpace} company={activeCompany} hiveStage={activeHiveStage} onBack={() => setActiveSpace('chat')} t={t} />
          </div>
        )}

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
