import { useState } from 'react';
import { SignalEvidenceDrawer } from './SignalEvidenceDrawer.jsx';

function Chip({ signal, isDemoMode, onActivate }) {
  const isGap = signal.polarity === 'gap';
  return (
    <button
      onClick={() => !isDemoMode && onActivate(signal)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: isGap ? '#dcfce7' : '#fef3c7',
        border: `1px solid ${isGap ? '#86efac' : '#fcd34d'}`,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 10.5,
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        color: isGap ? '#15803d' : '#92400e',
        fontWeight: 600,
        cursor: isDemoMode ? 'default' : 'pointer',
        opacity: isDemoMode ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <span style={{ fontSize: 7 }}>◆</span>
      {signal.value}
    </button>
  );
}

export function ObservationStrip({ signals, isDemoMode, onCorrect, onIgnore, onAddContext, regeneratingDomains }) {
  const [activeSignal, setActiveSignal] = useState(null);

  if (!signals || signals.length === 0) return null;

  const gap  = signals.filter(s => s.polarity === 'gap');
  const caps = signals.filter(s => s.polarity === 'capability');

  return (
    <>
      <div style={{
        margin: '0 0 14px',
        padding: '10px 14px',
        background: '#f0fdf4',
        border: '1px solid #86efac44',
        borderRadius: 8,
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 8.5, fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#15803d',
          marginBottom: 7,
        }}>
          Observed this session
          {isDemoMode && (
            <span style={{ marginLeft: 8, color: '#a8651e', fontWeight: 400, fontStyle: 'italic', textTransform: 'none' }}>
              · example company
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {gap.map(s => <Chip key={s.id} signal={s} isDemoMode={isDemoMode} onActivate={setActiveSignal} />)}
          {caps.map(s => <Chip key={s.id} signal={s} isDemoMode={isDemoMode} onActivate={setActiveSignal} />)}
        </div>
        {regeneratingDomains?.size > 0 && (
          <div style={{
            marginTop: 8, fontSize: 10, color: '#8c8499', fontStyle: 'italic',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span>
            Updating based on your correction…
          </div>
        )}
        {!isDemoMode && (
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 6 }}>
            Click any signal to see evidence and reasoning
          </div>
        )}
      </div>

      {activeSignal && (
        <SignalEvidenceDrawer
          signal={activeSignal}
          onClose={() => setActiveSignal(null)}
          onCorrect={(id) => { onCorrect(id); setActiveSignal(null); }}
          onIgnore={(id) => { onIgnore(id); setActiveSignal(null); }}
          onAddContext={(id, text, domain) => { onAddContext(id, text, domain); setActiveSignal(null); }}
        />
      )}
    </>
  );
}
