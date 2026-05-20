import { useState } from 'react';
import { tokens } from '../../tokens.js';
import { SPACE_GLYPHS } from '../../glyphs.jsx';

const SPACES = [
  { id: 'investor', label: 'Investor Readiness', glyphKey: 'investor', token: 'plum',  yoursSub: 'Score 72',   demoSub: 'Score 38'   },
  { id: 'vendors',  label: 'Vendors',            glyphKey: 'vendors',  token: 'umber', yoursSub: '4 matched',  demoSub: '6 matched'  },
  { id: 'aws',      label: 'AWS Programs',       glyphKey: 'aws',      token: 'teal',  yoursSub: '3 eligible', demoSub: '0 eligible' },
  { id: 'posture',  label: 'Posture',            glyphKey: 'posture',  token: 'teal',  yoursSub: '7 checks',   demoSub: '2 checks'   },
  { id: 'spv',      label: 'SPV Status',         glyphKey: 'spv',      token: 'plum',  yoursSub: 'Draft',      demoSub: 'None'       },
];

// All Hive & Co tiles are always "lit" — it's the reference
const DEMO_LIT = { investor: true, vendors: true, aws: true, posture: true, spv: true };

function ProjectionItem({ glyphKey, label, sublabel, lit, active, color, collapsed, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={lit ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        margin: '1px 8px', borderRadius: 8,
        padding: collapsed ? '9px 0' : '8px 11px 9px 14px',
        background: active ? `${color}12` : hover && lit ? `${color}08` : 'transparent',
        cursor: lit ? 'pointer' : 'default',
        transition: 'background 0.25s ease',
        animation: lit ? 'none' : 'tileBreathe 5.5s ease-in-out infinite',
      }}>
      {active && (
        <span style={{
          position: 'absolute', left: 4, top: 8, bottom: 8, width: 2,
          background: color, borderRadius: 2,
        }} />
      )}
      <div style={{
        display: 'flex', alignItems: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 11, justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <span style={{
          flexShrink: 0, width: 16, height: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: lit ? 1 : 0.45, marginTop: collapsed ? 0 : 1,
        }}>{SPACE_GLYPHS[glyphKey]?.(lit ? color : '#94a3b8')}</span>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: 12.5, fontWeight: active ? 600 : 500,
              color: lit ? '#241f31' : '#8c8499',
              letterSpacing: '0.005em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{label}</div>
            <div style={{
              fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              fontSize: 9.5, color: lit ? '#8c8499' : '#b8b1c0',
              letterSpacing: '0.08em', marginTop: 2,
              fontStyle: lit ? 'normal' : 'italic',
            }}>{lit ? sublabel : 'not yet'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AccordionSection({ title, accent, count, total, open, onToggle, collapsed, children }) {
  return (
    <div style={{ padding: '10px 0 4px' }}>
      {!collapsed && (
        <button
          onClick={onToggle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 22px', marginBottom: open ? 6 : 2,
          }}
        >
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 9.5, fontWeight: 600, color: accent ?? '#8c8499',
            letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>{title}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, color: '#b8b1c0', letterSpacing: '0.1em',
            }}>{count}/{total}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
              style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
              <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.2"
                strokeLinecap="round" strokeLinejoin="round" color="#94a3b8"/>
            </svg>
          </span>
        </button>
      )}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? 400 : 0,
        transition: 'max-height 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {children}
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse, activeSpace, onSwitch, litTiles, compareMode, sessionTok, sessionModels, t }) {
  const tk = tokens(t.theme);
  const [demoOpen,  setDemoOpen]  = useState(false); // collapsed by default — reference panel
  const [yoursOpen, setYoursOpen] = useState(true);

  const litCount  = Object.values(litTiles).filter(Boolean).length;
  const demoCount = Object.values(DEMO_LIT).filter(Boolean).length;

  return (
    <aside style={{
      width: collapsed ? 56 : 240,
      flexShrink: 0,
      borderRight: `1px solid ${tk.hairline}`,
      background: `${tk.surfaceLo}90`,
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
      overflow: 'hidden',
    }}>

      {/* Logo + collapse */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: collapsed ? '20px 0' : '20px 18px 18px',
        borderBottom: `1px solid ${tk.hairline}`,
      }}>
        {!collapsed && (
          <span style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 21, color: tk.ink, letterSpacing: '-0.015em',
          }}>
            proof<span style={{ color: tk.plum, fontStyle: 'italic' }}>360</span>
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: tk.inkSoft, padding: 4, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: collapsed ? '100%' : 'auto',
          }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d={collapsed ? 'M5 3 L10 7 L5 11' : 'M9 3 L4 7 L9 11'}
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Foyer */}
      <div style={{ padding: '12px 0 6px' }}>
        {!collapsed && (
          <div style={{
            padding: '0 22px', marginBottom: 8,
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 9.5, fontWeight: 600, color: tk.inkSoft,
            letterSpacing: '0.24em', textTransform: 'uppercase',
          }}>Foyer</div>
        )}
        <ProjectionItem
          glyphKey="chat" label="Chat" sublabel="The strategy room"
          lit active={activeSpace === 'chat'}
          color={tk.indigo} collapsed={collapsed}
          onClick={() => onSwitch('chat')}
        />
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* ── Hive & Co (reference / Contoso) ── */}
        {compareMode && (
          <AccordionSection
            title="Hive & Co"
            accent={tk.umber}
            count={demoCount} total={5}
            open={demoOpen} onToggle={() => setDemoOpen(o => !o)}
            collapsed={collapsed}
          >
            {SPACES.map(s => (
              <ProjectionItem
                key={`demo-${s.id}`}
                glyphKey={s.glyphKey} label={s.label} sublabel={s.demoSub}
                lit={DEMO_LIT[s.id]} active={false}
                color={tk.umber} collapsed={collapsed}
                onClick={() => {}}
              />
            ))}
          </AccordionSection>
        )}

        {/* ── Yours ── */}
        <AccordionSection
          title="Yours"
          accent={tk.plum}
          count={litCount} total={5}
          open={yoursOpen} onToggle={() => setYoursOpen(o => !o)}
          collapsed={collapsed}
        >
          {SPACES.map(s => (
            <ProjectionItem
              key={s.id}
              glyphKey={s.glyphKey} label={s.label} sublabel={s.yoursSub}
              lit={litTiles[s.id]} active={activeSpace === s.id}
              color={tk[s.token]} collapsed={collapsed}
              onClick={() => onSwitch(s.id)}
            />
          ))}
        </AccordionSection>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div style={{
          padding: '12px 22px 16px',
          borderTop: `1px solid ${tk.hairline}`,
        }}>
          <div style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.5,
            color: tk.inkSoft, marginBottom: sessionTok ? 8 : 0,
          }}>
            The room fills in as it learns about you.
          </div>
          {sessionTok > 0 && (
            <div style={{
              fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              fontSize: 9, letterSpacing: '0.1em', color: tk.inkGhost,
              opacity: 0.6, lineHeight: 1.6,
            }}>
              <div>{sessionTok.toLocaleString()} tok this session</div>
              {sessionModels?.length > 0 && (
                <div style={{ marginTop: 2 }}>{sessionModels.join(' · ')}</div>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
