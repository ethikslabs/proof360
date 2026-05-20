import { useState } from 'react';
import { tokens } from '../../tokens.js';
import { SPACE_GLYPHS } from '../../glyphs.jsx';

const SPACES = [
  { id: 'investor', label: 'Investor Readiness', glyphKey: 'investor', token: 'plum',  sublabel: 'Score 72',   demoSublabel: 'Score 38'   },
  { id: 'vendors',  label: 'Vendors',            glyphKey: 'vendors',  token: 'umber', sublabel: '4 matched',  demoSublabel: '6 matched'  },
  { id: 'aws',      label: 'AWS Programs',       glyphKey: 'aws',      token: 'teal',  sublabel: '3 eligible', demoSublabel: '0 eligible' },
  { id: 'posture',  label: 'Posture',            glyphKey: 'posture',  token: 'teal',  sublabel: '7 checks',   demoSublabel: '2 checks'   },
  { id: 'spv',      label: 'SPV Status',         glyphKey: 'spv',      token: 'plum',  sublabel: 'Draft',      demoSublabel: 'None'       },
];

function SidebarItem({ glyphKey, label, sublabel, demoSublabel, lit, active, color, collapsed, compareMode, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={lit ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        margin: '1px 8px', borderRadius: 8,
        padding: collapsed ? '9px 0' : '9px 11px 10px 14px',
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
          opacity: lit ? 1 : 0.55, marginTop: collapsed ? 0 : 1,
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
            {compareMode && lit ? (
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace', fontSize: 8,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: '#b8730e', opacity: 0.8, flexShrink: 0,
                  }}>demo</span>
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5,
                    color: '#8c8499', letterSpacing: '0.06em',
                  }}>{demoSublabel}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace', fontSize: 8,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: color, opacity: 0.8, flexShrink: 0,
                  }}>yours</span>
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5,
                    color: '#8c8499', letterSpacing: '0.06em',
                  }}>{sublabel}</span>
                </div>
              </div>
            ) : (
              <div style={{
                fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
                fontSize: 9.5, color: lit ? '#8c8499' : '#b8b1c0',
                letterSpacing: '0.08em', marginTop: 2,
                fontStyle: lit ? 'normal' : 'italic',
              }}>{lit ? sublabel : 'not yet'}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse, activeSpace, onSwitch, litTiles, compareMode, sessionTok, sessionModels, t }) {
  const tk = tokens(t.theme);
  const litCount = Object.values(litTiles).filter(Boolean).length;

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

      <div style={{ padding: '12px 0 6px' }}>
        {!collapsed && (
          <div style={{
            padding: '0 22px', marginBottom: 8,
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 9.5, fontWeight: 600, color: tk.inkSoft,
            letterSpacing: '0.24em', textTransform: 'uppercase',
          }}>Foyer</div>
        )}
        <SidebarItem
          glyphKey="chat" label="Chat" sublabel="The strategy room"
          lit active={activeSpace === 'chat'}
          color={tk.indigo} collapsed={collapsed}
          onClick={() => onSwitch('chat')}
        />
      </div>

      <div style={{ padding: '14px 0 6px' }}>
        {!collapsed && (
          <div style={{
            padding: '0 22px', marginBottom: 8,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          }}>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, fontWeight: 600, color: tk.inkSoft,
              letterSpacing: '0.24em', textTransform: 'uppercase',
            }}>{compareMode ? 'Compare' : 'Projections'}</span>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, color: tk.inkGhost, letterSpacing: '0.1em',
            }}>{litCount}/5</span>
          </div>
        )}
        {SPACES.map(s => (
          <SidebarItem
            key={s.id}
            glyphKey={s.glyphKey} label={s.label} sublabel={s.sublabel} demoSublabel={s.demoSublabel}
            lit={litTiles[s.id]} active={activeSpace === s.id}
            color={tk[s.token]} collapsed={collapsed} compareMode={compareMode}
            onClick={() => onSwitch(s.id)}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />

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
