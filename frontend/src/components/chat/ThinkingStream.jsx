import { useState, useEffect } from 'react';
import { tokens } from '../../tokens.js';

const PROVIDER_META = {
  perplexity:         { mark: 'P', label: 'Perplexity', token: 'teal',   why: 'Live web search — recency and real-world signals' },
  gemini:             { mark: 'G', label: 'Gemini',     token: 'indigo', why: 'Large document synthesis — regulatory and standards context' },
  'anthropic/claude': { mark: 'A', label: 'Claude',     token: 'plum',   why: 'Reasoning and narrative — investor and DD framing' },
  internal:           { mark: '◇', label: 'proof360',   token: 'umber',  why: 'Internal gap catalog and vendor routing engine' },
};

function approxTokens(ms) { return Math.round((ms || 400) * 0.22); }

function ProviderMark({ provider, t, size = 22 }) {
  const tk = tokens(t.theme);
  const meta = PROVIDER_META[provider] || { mark: '·', token: 'inkSoft' };
  const color = tk[meta.token] || tk.inkMid;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}10`, border: `1px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      fontSize: size * 0.42, fontWeight: 600, color,
    }}>{meta.mark}</div>
  );
}

function CollapsedPill({ steps, onClick, t }) {
  const tk = tokens(t.theme);
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '6px 12px 6px 8px', borderRadius: 999,
        background: hover ? tk.surface : 'transparent',
        border: `1px solid ${hover ? tk.hairStrong : tk.hairline}`,
        margin: '4px 0 18px', cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{
            marginLeft: i > 0 ? -7 : 0, zIndex: steps.length - i, position: 'relative',
            boxShadow: `0 0 0 1.5px ${tk.surface}`, borderRadius: '50%',
          }}>
            <ProviderMark provider={s.provider} t={t} size={20} done />
          </div>
        ))}
      </div>
      <span style={{
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        fontSize: 11, letterSpacing: '0.06em', color: tk.inkMid,
      }}>{steps.length} sources</span>
      <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: tk.inkSoft, marginLeft: -3 }}>↗</span>
    </div>
  );
}

function Receipt({ steps, onClose, t }) {
  const tk = tokens(t.theme);
  const totalTokens = steps.reduce((s, x) => s + approxTokens(x.durationMs), 0);
  return (
    <div style={{ margin: '6px 0 18px', borderRadius: 12, background: tk.surface, border: `1px solid ${tk.hairline}` }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 16px', borderBottom: `1px solid ${tk.hairline}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex' }}>
            {steps.map((s, i) => (
              <div key={s.id} style={{
                marginLeft: i > 0 ? -7 : 0, zIndex: steps.length - i, position: 'relative',
                boxShadow: `0 0 0 1.5px ${tk.surface}`, borderRadius: '50%',
              }}>
                <ProviderMark provider={s.provider} t={t} size={22} done />
              </div>
            ))}
          </div>
          <span style={{
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontSize: 11, color: tk.ink, letterSpacing: '0.04em',
          }}>{steps.length} sources · ~{totalTokens.toLocaleString()} tok</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: tk.inkSoft, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 4 }}>×</button>
      </div>
      <div style={{ padding: '4px 16px' }}>
        {steps.map((s, i) => {
          const meta = PROVIDER_META[s.provider] || {};
          const color = tk[meta.token] || tk.inkMid;
          return (
            <div key={s.id} style={{
              padding: '12px 0',
              borderBottom: i < steps.length - 1 ? `1px solid ${tk.hairline}` : 'none',
              display: 'flex', gap: 12,
            }}>
              <ProviderMark provider={s.provider} t={t} size={24} done />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 13, fontWeight: 500, color: tk.ink }}>{s.label}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: 10, color: tk.inkSoft, letterSpacing: '0.06em' }}>~{approxTokens(s.durationMs)} tok</span>
                </div>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color, marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{meta.label}</div>
                {s.reference && (
                  <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 13, color: tk.inkMid, marginTop: 4 }}>{s.reference}</div>
                )}
                <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 11.5, color: tk.inkSoft, marginTop: 4, lineHeight: 1.5 }}>{meta.why}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpandedList({ steps, t }) {
  const tk = tokens(t.theme);
  return (
    <div style={{ margin: '8px 0 18px', padding: '14px 16px', background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 12 }}>
      <div style={{
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        fontSize: 10, fontWeight: 600, color: tk.plum,
        letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12,
      }}>Checking sources</div>
      {steps.map(s => {
        const meta = PROVIDER_META[s.provider] || {};
        const color = tk[meta.token] || tk.inkMid;
        const done = s.status === 'complete';
        return (
          <div key={s.id} style={{ marginBottom: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <ProviderMark provider={s.provider} t={t} size={20} done={done} />
                {done && (
                  <span style={{
                    position: 'absolute', right: -3, bottom: -3,
                    width: 9, height: 9, borderRadius: '50%',
                    background: tk.surface, boxShadow: `0 0 0 1px ${color}`, color,
                    fontSize: 7, lineHeight: '9px', textAlign: 'center', fontWeight: 700,
                  }}>✓</span>
                )}
              </div>
              <span style={{
                flex: 1, fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontSize: 13, color: done ? tk.inkSoft : tk.ink,
                fontWeight: done ? 400 : 500, transition: 'color 0.3s ease',
              }}>{s.label}</span>
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10, color: tk.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>{meta.label}</span>
            </div>
            {s.reference && !done && (
              <div style={{
                marginLeft: 30, marginTop: 3,
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontStyle: 'italic', fontSize: 12, color: tk.inkSoft,
              }}>{s.reference}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ThinkingStream({ steps, visible, t }) {
  const [phase, setPhase] = useState('running');
  const allDone = steps.length > 0 && steps.every(s => s.status === 'complete');
  useEffect(() => {
    if (!allDone) { setPhase('running'); return; }
    const id = setTimeout(() => setPhase('pill'), 1400);
    return () => clearTimeout(id);
  }, [allDone]);
  if (!visible || steps.length === 0) return null;
  if (phase === 'running') return <ExpandedList steps={steps} t={t} />;
  if (phase === 'receipt') return <Receipt steps={steps} t={t} onClose={() => setPhase('pill')} />;
  return <CollapsedPill steps={steps} t={t} onClick={() => setPhase('receipt')} />;
}
