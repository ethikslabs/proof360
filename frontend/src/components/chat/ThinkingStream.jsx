import { useState, useEffect } from 'react';

const PROVIDER_META = {
  perplexity:         { icon: 'P', label: 'Perplexity',  color: '#20808d', why: 'Live web search — recency and real-world signals' },
  gemini:             { icon: 'G', label: 'Gemini',      color: '#4285f4', why: 'Large document synthesis — regulatory and standards context' },
  'anthropic/claude': { icon: 'A', label: 'Claude',      color: '#7c3aed', why: 'Reasoning and narrative — investor and DD framing' },
  internal:           { icon: '⬡', label: 'proof360',   color: '#0891b2', why: 'Internal gap catalog and vendor routing engine' },
};

function approxTokens(ms) {
  return Math.round((ms || 400) * 0.22);
}

// ── Collapsed pill — clickable handle to open receipt ─────────────────────
function CollapsedPill({ steps, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '7px 14px 7px 10px', borderRadius: 20,
        background: hover ? '#f3f0ff' : '#fafaff',
        border: `1px solid ${hover ? '#c4b5fd' : '#ede9fe'}`,
        margin: '4px 0 14px', cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}>
      {/* Layered source icons */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((step, i) => {
          const meta = PROVIDER_META[step.provider] || { icon: '·', color: '#94a3b8' };
          return (
            <div key={step.id} style={{
              width: 22, height: 22, borderRadius: '50%',
              background: '#f0fdf4', border: '1.5px solid #16a34a40',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: '#16a34a',
              marginLeft: i > 0 ? -7 : 0, zIndex: steps.length - i,
              position: 'relative', boxShadow: '0 0 0 1.5px #fff',
            }}>✓</div>
          );
        })}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#16a34a' }}>
        Checked {steps.length} source{steps.length !== 1 ? 's' : ''}
      </span>
      <span style={{ fontSize: 11, color: '#c4b5fd', marginLeft: 2 }}>↗</span>
    </div>
  );
}

// ── Receipt — full work log, shown when pill is clicked ────────────────────
function Receipt({ steps, onClose }) {
  const totalTokens = steps.reduce((s, t) => s + approxTokens(t.durationMs), 0);
  return (
    <div style={{
      margin: '4px 0 16px', borderRadius: 12,
      background: '#fafaff', border: '1px solid #ede9fe',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #f3f0ff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Layered icons */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {steps.map((step, i) => {
              const meta = PROVIDER_META[step.provider] || { icon: '·', color: '#94a3b8' };
              return (
                <div key={step.id} style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#f0fdf4', border: '1.5px solid #16a34a40',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: '#16a34a',
                  marginLeft: i > 0 ? -7 : 0, zIndex: steps.length - i,
                  position: 'relative', boxShadow: '0 0 0 1.5px #fff',
                }}>✓</div>
              );
            })}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
            {steps.length} sources · ~{totalTokens.toLocaleString()} tokens
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#94a3b8',
          cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px',
        }}>×</button>
      </div>

      {/* Step receipts */}
      <div style={{ padding: '10px 16px' }}>
        {steps.map((step, i) => {
          const meta = PROVIDER_META[step.provider] || { icon: '·', label: step.provider, color: '#94a3b8', why: '' };
          return (
            <div key={step.id} style={{
              padding: '10px 0',
              borderBottom: i < steps.length - 1 ? '1px solid #f5f3ff' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: meta.color + '10', border: `1.5px solid ${meta.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: meta.color,
                }}>{meta.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{step.label}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>~{approxTokens(step.durationMs)} tok</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 500, marginTop: 2 }}>
                    {meta.label} {step.model ? `· ${step.model}` : ''}
                  </div>
                  {step.reference && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, fontStyle: 'italic' }}>
                      {step.reference}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {meta.why}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Expanded list — live during run ───────────────────────────────────────
function ExpandedList({ steps }) {
  return (
    <div style={{
      margin: '8px 0 16px', padding: '12px 16px',
      background: '#fafaff', border: '1px solid #ede9fe', borderRadius: 12,
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, color: '#7c3aed',
        letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10,
      }}>Checking sources</p>
      {steps.map(step => {
        const meta = PROVIDER_META[step.provider] || { icon: '·', label: step.provider, color: '#94a3b8' };
        const done = step.status === 'complete';
        return (
          <div key={step.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: done ? '#f0fdf4' : meta.color + '12',
                border: `1.5px solid ${done ? '#16a34a40' : meta.color + '30'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 800,
                color: done ? '#16a34a' : meta.color,
                transition: 'all 0.3s ease',
              }}>{done ? '✓' : meta.icon}</div>
              <span style={{
                fontSize: 13, flex: 1,
                color: done ? '#94a3b8' : '#1e293b',
                fontWeight: done ? 400 : 500,
                transition: 'color 0.3s ease',
              }}>{step.label}</span>
              <span style={{ fontSize: 10, color: '#c4b5fd', fontWeight: 500 }}>{meta.label}</span>
            </div>
            {step.reference && !done && (
              <div style={{ marginLeft: 28, marginTop: 3, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                {step.reference}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export function ThinkingStream({ steps, visible }) {
  const [phase, setPhase] = useState('running'); // 'running' | 'pill' | 'receipt'
  const allDone = steps.length > 0 && steps.every(s => s.status === 'complete');

  useEffect(() => {
    if (!allDone) { setPhase('running'); return; }
    const id = setTimeout(() => setPhase('pill'), 1400);
    return () => clearTimeout(id);
  }, [allDone]);

  if (!visible || steps.length === 0) return null;
  if (phase === 'running') return <ExpandedList steps={steps} />;
  if (phase === 'receipt') return <Receipt steps={steps} onClose={() => setPhase('pill')} />;
  return <CollapsedPill steps={steps} onClick={() => setPhase('receipt')} />;
}
