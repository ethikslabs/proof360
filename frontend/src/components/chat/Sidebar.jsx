import { useState } from 'react';
import { tokens } from '../../tokens.js';
import { SPACE_GLYPHS } from '../../glyphs.jsx';
import { HIVE_STAGES } from '../../data/mock/hive.js';
import { AccountButton } from './AccountPanel.jsx';

const SPACES = [
  { id: 'investor',  label: 'Investor Readiness',   glyphKey: 'investor',  token: 'plum'  },
  { id: 'vendors',   label: 'Vendors',              glyphKey: 'vendors',   token: 'umber' },
  { id: 'aws',       label: 'AWS Programs',         glyphKey: 'aws',       token: 'teal'  },
  { id: 'microsoft', label: 'Microsoft Programs',   glyphKey: 'microsoft', token: 'teal'  },
  { id: 'posture',   label: 'Posture',              glyphKey: 'posture',   token: 'teal'  },
  { id: 'spv',       label: 'SPV Status',           glyphKey: 'spv',       token: 'plum'  },
];


const YOURS_SUBS = {
  investor:  'Score 72', vendors: '4 matched',
  aws:       '10 programs', microsoft: '6 programs',
  posture:   '7 checks',  spv: 'Draft',
};

function ProjectionItem({ glyphKey, label, sublabel, lit, active, color, collapsed, onClick, forceClickable }) {
  const [hover, setHover] = useState(false);
  const isClickable = !!(forceClickable ? onClick : (lit && onClick));
  return (
    <div
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        margin: '1px 8px', borderRadius: 8,
        padding: collapsed ? '9px 0' : '8px 11px 9px 14px',
        background: active ? `${color}12` : hover && isClickable ? `${color}08` : 'transparent',
        cursor: isClickable ? 'pointer' : 'default',
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

function StageRail({ stages, activeIdx, onSelect, accent }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 0' }}
    >
      {stages.map((s, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && (
            <span style={{ display: 'inline-block', width: 8, height: 1, background: `${accent}50`, margin: '0 1px' }} />
          )}
          <button
            onClick={e => { e.stopPropagation(); onSelect(i); }}
            title={s.label}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0,
              background: activeIdx === i ? accent : `${accent}35`,
              transition: 'background 0.2s, transform 0.15s',
              transform: activeIdx === i ? 'scale(1.3)' : 'scale(1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.transform = 'scale(1.3)'; }}
            onMouseLeave={e => {
              e.currentTarget.style.background = activeIdx === i ? accent : `${accent}35`;
              e.currentTarget.style.transform = activeIdx === i ? 'scale(1.3)' : 'scale(1)';
            }}
          />
        </span>
      ))}
    </div>
  );
}

function AccordionSection({ title, accent, count, total, open, onToggle, collapsed, stageRail, tag, avatar, children }) {
  return (
    <div style={{ padding: '10px 0 4px' }}>
      {!collapsed && (
        <button
          onClick={onToggle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 14px 0 12px', marginBottom: open ? 6 : 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {avatar}
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, fontWeight: 600, color: accent ?? '#8c8499',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: stageRail ? 76 : 130,
            }}>{title}</span>
            {tag && (
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: accent,
                background: `${accent}18`, borderRadius: 4,
                padding: '1px 5px', flexShrink: 0,
                fontFamily: '"IBM Plex Mono", monospace',
              }}>{tag}</span>
            )}
            {stageRail}
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
        maxHeight: open ? 600 : 0,
        transition: 'max-height 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {children}
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse, activeSpace, onSwitch, litTiles, browserTabs = [], onInject, sessionTok, sessionModels, hiveStage: hiveStageFromParent, onHiveStageChange, noLogo, yourCompanyName, t }) {
  const tk = tokens(t.theme);
  const [demoOpen, setDemoOpen]           = useState(true);
  const [hiveStageInternal, setHiveStageInternal] = useState(1);
  const [openSections, setOpenSections]   = useState({});

  const hiveStage = hiveStageFromParent ?? hiveStageInternal;

  const userTabs = browserTabs.filter(tab => !tab.pinned);

  function isSectionOpen(id) { return openSections[id] !== false; }
  function toggleSection(id) { setOpenSections(prev => ({ ...prev, [id]: !isSectionOpen(id) })); }

  function handleStageSelect(idx) {
    if (idx === hiveStage) return;
    setHiveStageInternal(idx);
    onHiveStageChange?.(idx);
    const stage = HIVE_STAGES[idx];
    onInject?.({
      persona: stage.stageMsg.persona,
      content: stage.stageMsg.content,
    });
  }

  const hiveSnap  = HIVE_STAGES[hiveStage].spaces;
  const hiveCount = Object.values(hiveSnap).filter(v => v.lit).length;
  const litCount  = Object.values(litTiles).filter(Boolean).length;

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

      {/* Collapse toggle (logo hidden when noLogo) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: collapsed ? '20px 0' : '20px 18px 18px',
        borderBottom: `1px solid ${tk.hairline}`,
      }}>
        {!collapsed && !noLogo && (
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
            width: (collapsed || noLogo) ? '100%' : 'auto',
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

        {/* ── Hive & Co — amber card, clearly the reference company ── */}
        <div style={{
          margin: '8px 8px 4px',
          border: `1.5px solid #c8965a`,
          borderRadius: 10,
          background: '#f5e6cc',
          overflow: 'hidden',
        }}>
        <AccordionSection
          title="Hive & Co"
          accent={tk.umber}
          count={hiveCount} total={6}
          open={demoOpen} onToggle={() => setDemoOpen(o => !o)}
          collapsed={collapsed}
          avatar={!collapsed && (
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: tk.umber,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.04em',
            }}>HC</div>
          )}
        >
          {!collapsed && (
            <div style={{ padding: '0 14px 10px 22px' }}>
              {/* Reference label */}
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 8.5, color: '#b0956e', letterSpacing: '0.12em',
                textTransform: 'uppercase', marginBottom: 8,
              }}>reference founder — funded, attested</div>

              {/* Stage timeline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 8.5, color: tk.inkSoft, letterSpacing: '0.08em',
                  flexShrink: 0,
                }}>stage</span>
                <StageRail
                  stages={HIVE_STAGES}
                  activeIdx={hiveStage}
                  onSelect={handleStageSelect}
                  accent={tk.umber}
                />
                <span style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 8.5, color: tk.umber, letterSpacing: '0.1em',
                  textTransform: 'uppercase', flexShrink: 0,
                }}>{HIVE_STAGES[hiveStage].label}</span>
              </div>

              {/* Stage description */}
              <div style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontStyle: 'italic', fontSize: 11.5, color: tk.inkSoft,
                lineHeight: 1.5,
              }}>
                {HIVE_STAGES[hiveStage].desc}
              </div>
            </div>
          )}

          {SPACES.map(s => (
            <ProjectionItem
              key={`demo-${s.id}`}
              glyphKey={s.glyphKey} label={s.label}
              sublabel={hiveSnap[s.id].sub}
              lit={hiveSnap[s.id].lit}
              active={activeSpace === s.id}
              color={tk.umber} collapsed={collapsed}
              forceClickable
              onClick={() => onSwitch(s.id, { company: 'hive', stage: hiveStage })}
            />
          ))}
        </AccordionSection>
        </div>{/* end Hive & Co box */}

        {/* ── Your company section ── */}
        {userTabs.length === 0 ? (
          <div style={{
            margin: '4px 8px 8px',
            border: `1.5px dashed ${litCount > 0 ? tk.plum + '60' : '#c4b8d0'}`,
            borderRadius: 10,
            background: litCount > 0 ? `${tk.plum}06` : '#f5f3f9',
            overflow: 'hidden',
          }}>
          <AccordionSection
            title={yourCompanyName ?? 'Your company'}
            accent={litCount > 0 ? tk.plum : '#8e7caa'}
            count={litCount} total={6}
            open={isSectionOpen('__yours')} onToggle={() => toggleSection('__yours')}
            collapsed={collapsed}
            avatar={!collapsed && (
              <div style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: litCount > 0 ? tk.plum : '#c4b8d0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.04em',
              }}>YC</div>
            )}
          >
            {litCount === 0 && !collapsed && (
              <div style={{
                padding: '2px 16px 12px',
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontStyle: 'italic', fontSize: 11.5, color: '#8e7caa',
                lineHeight: 1.5,
              }}>
                Chat to fill this in — it builds as we learn about you.
              </div>
            )}
            {/* Ghost icons in collapsed mode even when empty — signals parallel structure */}
            {(litCount > 0 || collapsed) && SPACES.map(s => (
              <ProjectionItem
                key={s.id}
                glyphKey={s.glyphKey} label={s.label} sublabel={YOURS_SUBS[s.id]}
                lit={litTiles[s.id]} active={activeSpace === s.id}
                color={tk[s.token]} collapsed={collapsed}
                onClick={() => onSwitch(s.id, { company: 'yours' })}
              />
            ))}
          </AccordionSection>
          </div>
        ) : (
          userTabs.map(tab => (
            <AccordionSection
              key={tab.id}
              title={tab.label}
              accent={tk.plum}
              count={0} total={5}
              open={isSectionOpen(tab.id)} onToggle={() => toggleSection(tab.id)}
              collapsed={collapsed}
            >
              {SPACES.map(s => (
                <ProjectionItem
                  key={`${tab.id}-${s.id}`}
                  glyphKey={s.glyphKey} label={s.label} sublabel={YOURS_SUBS[s.id]}
                  lit={false} active={false}
                  color={tk[s.token]} collapsed={collapsed}
                  onClick={() => {}}
                />
              ))}
            </AccordionSection>
          ))
        )}

      </div>

      {/* Account button — login/save + portal access */}
      <AccountButton collapsed={collapsed} />

    </aside>
  );
}
