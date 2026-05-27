// frontend/src/components/chat/AuthorityLayer.jsx
import { useState, useRef, useEffect } from 'react';
import { VECTOR_MODELS } from '../../data/vectorModels.js';

const LENS_LABELS = {
  investor:    'Sophia · investor/trust',
  commercial:  'Leonardo · commercial/narrative',
  operational: 'Edison · operational/technical',
};

function hasEvidenceMix(signals) {
  return signals.some(s => s._corrected || s.type === 'self_disclosed');
}

function InferenceChip({ selectedModel, onModelChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = VECTOR_MODELS.find(m => m.id === selectedModel) ?? VECTOR_MODELS[0];
  // Derive providers from catalog — do NOT hardcode
  const providers = [...new Set(VECTOR_MODELS.map(m => m.provider))];

  useEffect(() => {
    if (!open) return;
    function close(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 10,
          border: '1px solid #e0d8c9',
          background: open ? '#f0ebe0' : 'transparent',
          cursor: 'pointer', fontSize: 10, fontWeight: 600,
          color: '#5a5267', fontFamily: '"IBM Plex Mono", monospace',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: current.providerColor, display: 'inline-block', flexShrink: 0,
        }} />
        {current.label} · {current.provider}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            background: '#fff', border: '1px solid #e0d8c9',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '6px 0', minWidth: 220, zIndex: 200,
          }}>
            {providers.map((provider, pi) => {
              const group = VECTOR_MODELS.filter(m => m.provider === provider);
              return (
                <div key={provider}>
                  {pi > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />}
                  <div style={{
                    padding: '3px 12px 2px', fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace',
                  }}>
                    {provider}
                  </div>
                  {group.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { onModelChange(m.id); setOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '7px 12px',
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: m.providerColor, flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                          {m.label}{m.id === selectedModel ? ' ✓' : ''}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Maps display chip label → surface authority name (as used by useSurfaceAuthority)
const CHIP_TO_SURFACE = {
  Chat: 'Chat',
  Vendors: 'Vendor Intelligence',
  Shortlist: 'Chat', // Shortlist expands in place within Chat surface per spec
};

// Returns true when a chip's logical surface matches the current surfaceAuthority
function chipIsActive(chipLabel, surfaceAuthority) {
  return CHIP_TO_SURFACE[chipLabel] === surfaceAuthority;
}

function MobileAuthorityLayer({
  isDemoMode, entity, activeLens, surfaceAuthority, onMobileSurfaceSelect,
}) {
  const lensLabel = LENS_LABELS[activeLens];
  return (
    <div style={{
      padding: '8px 14px', background: '#fbf8f1',
      borderBottom: '1px solid #e0d8c9',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isDemoMode && (
            <span style={{
              background: '#fef3c7', border: '1px solid #fcd34d',
              padding: '1px 6px', borderRadius: 3,
              fontSize: 8, fontWeight: 700, letterSpacing: '.1em',
              textTransform: 'uppercase', color: '#92400e',
            }}>Example{entity?.name ? ` · ${entity.name}` : ''}</span>
          )}
          {entity?.name && (
            <span style={{ color: '#241f31', fontWeight: 600, fontSize: 12 }}>{entity.name}</span>
          )}
        </div>
        {(lensLabel || surfaceAuthority) && (
          <div style={{ color: '#8c8499', fontSize: 10 }}>
            {[lensLabel, surfaceAuthority].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {['Chat', 'Vendors', 'Shortlist'].map(s => {
          const active = chipIsActive(s, surfaceAuthority);
          return (
            <button
              key={s}
              onClick={() => onMobileSurfaceSelect?.(CHIP_TO_SURFACE[s])}
              style={{
                background: active ? '#241f31' : '#f7f1e6',
                border: active ? 'none' : '1px solid #e0d8c9',
                padding: '4px 8px', borderRadius: 10,
                fontSize: 9, fontWeight: 600,
                color: active ? '#fbf8f1' : '#5a5267',
                cursor: 'pointer',
              }}
            >{s}</button>
          );
        })}
      </div>
    </div>
  );
}

export function AuthorityLayer({
  isDemoMode = false,
  entity = {},
  activeLens,
  surfaceAuthority = 'Chat',
  signals = [],
  selectedModel,
  onModelChange,
  suggestion = null,
  onCommit,
  onDismiss,
  isMobile = false,
  onMobileSurfaceSelect,
}) {
  if (isMobile) {
    return (
      <MobileAuthorityLayer
        isDemoMode={isDemoMode}
        entity={entity}
        activeLens={activeLens}
        surfaceAuthority={surfaceAuthority}
        onMobileSurfaceSelect={onMobileSurfaceSelect}
      />
    );
  }

  const lensLabel = LENS_LABELS[activeLens];
  const entityMeta = [entity?.stage, entity?.vertical].filter(Boolean).join(' · ');
  const showEvidence = hasEvidenceMix(signals);
  const correctedCount = signals.filter(s => s._corrected).length;
  const selfDisclosedCount = signals.filter(s => s.type === 'self_disclosed').length;

  return (
    <div style={{
      width: '100%', background: '#fbf8f1',
      borderBottom: '1px solid #e0d8c9',
      padding: '9px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      fontSize: 11, flexShrink: 0, minHeight: 40,
      boxSizing: 'border-box',
    }}>

      {/* BOUNDARY — demo mode amber chip (AC-1) */}
      {isDemoMode && (
        <span style={{
          background: '#fef3c7', border: '1px solid #fcd34d',
          padding: '1px 7px', borderRadius: 3,
          fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: '#92400e', flexShrink: 0,
        }}>Example{entity?.name ? ` · ${entity.name}` : ''}</span>
      )}

      {/* ENTITY — name · stage · vertical (AC-2) */}
      {entity?.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontWeight: 600, color: '#241f31' }}>{entity.name}</span>
          {entityMeta && <span style={{ color: '#8c8499' }}>· {entityMeta}</span>}
        </div>
      )}

      {(entity?.name || isDemoMode) && (
        <span style={{ color: '#e0d8c9', flexShrink: 0 }}>|</span>
      )}

      {/* LENS — active persona per INVARIANTS.md §6 (AC-3) */}
      {lensLabel && (
        <span style={{
          color: '#8c8499', fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10, flexShrink: 0,
        }}>
          {lensLabel}
        </span>
      )}

      {/* SURFACE AUTHORITY — current surface + inline suggestion (AC-4, AC-5) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{
          color: '#8c8499', fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase',
        }}>Surface</span>
        <span style={{ fontWeight: 600, color: '#241f31' }}>{surfaceAuthority}</span>

        {suggestion && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#ecfeff', border: '1px solid #9dccd6',
            borderRadius: 10, padding: '2px 8px',
            color: '#176577', fontSize: 10,
          }}>
            → {suggestion.to}
            <button
              onClick={() => onCommit?.(suggestion.to)}
              title="Transfer authority"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#176577', fontSize: 11, fontWeight: 700,
                padding: '0 2px', lineHeight: 1,
              }}
            >✓</button>
            <button
              onClick={() => onDismiss?.(suggestion.direction ?? suggestion.to)}
              title="Dismiss"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#176577', fontSize: 11, padding: '0 2px', lineHeight: 1,
              }}
            >✕</button>
          </span>
        )}
      </div>

      {/* EVIDENCE / TRUST STATE — conditional on mixed provenance (AC-6) */}
      {showEvidence && (
        <>
          <span style={{ color: '#e0d8c9', flexShrink: 0 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {correctedCount > 0 && (
              <span style={{
                background: '#fef3c7', border: '1px solid #fcd34d44',
                borderRadius: 10, padding: '1px 6px',
                fontSize: 9, color: '#92400e',
              }}>◌ Corrected</span>
            )}
            {selfDisclosedCount > 0 && (
              <span style={{
                background: '#f0fdf4', border: '1px solid #86efac44',
                borderRadius: 10, padding: '1px 6px',
                fontSize: 9, color: '#15803d',
              }}>● Self-disclosed</span>
            )}
          </div>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* INFERENCE — model chip, collapsed by default (AC-7) */}
      <InferenceChip selectedModel={selectedModel} onModelChange={onModelChange} />
    </div>
  );
}
