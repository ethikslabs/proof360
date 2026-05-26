// frontend/src/components/chat/SignalEvidenceDrawer.jsx
import { useState } from 'react';
import { freshnessLabel, signalFreshness } from '../../rendering/protocol.js';

const SOURCE_LABELS = {
  github_scan: 'GitHub public repo scan',
  conversation: 'Conversation — what you told us',
  url_scrape:   'Website scan',
  self_disclosed: 'You told us directly',
};

export function SignalEvidenceDrawer({ signal, onClose, onCorrect, onIgnore, onAddContext }) {
  const [addingContext, setAddingContext] = useState(false);
  const [contextText, setContextText] = useState('');
  const isStale = signalFreshness(signal) === 'stale';
  const isGap = signal.polarity === 'gap';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(20,16,28,0.5)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fbf8f1',
          borderRadius: '14px 14px 0 0',
          width: 'min(560px, 100vw)',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '22px 24px 28px',
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 3, background: '#e0d8c9', borderRadius: 2, margin: '0 auto 18px' }} />

        {/* Signal label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: isGap ? '#dcfce7' : '#fef3c7',
            border: `1px solid ${isGap ? '#86efac' : '#fcd34d'}`,
            borderRadius: 4, padding: '3px 10px',
            fontSize: 11, fontWeight: 700,
            color: isGap ? '#15803d' : '#92400e',
          }}>
            <span style={{ fontSize: 8 }}>◆</span>
            {signal.value}
          </span>
          {isStale && (
            <span style={{ fontSize: 10, color: '#b0956e', fontStyle: 'italic' }}>stale</span>
          )}
        </div>

        {/* Provenance fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px 12px', marginBottom: 16 }}>
          {[
            ['Source', SOURCE_LABELS[signal.source] || signal.source],
            ['Confidence', `${Math.round(signal.confidence * 100)}% (observation confidence — how certain we are this is true)`],
            ['Freshness', freshnessLabel(signal)],
            ['Domain', signal.domain],
            ['Observed', `Turn ${signal.conversation_turn}`],
          ].map(([label, value]) => (
            <>
              <span key={`lbl-${label}`} style={{ fontSize: 9.5, fontFamily: '"IBM Plex Mono", monospace', color: '#8c8499', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'start', paddingTop: 2 }}>
                {label}
              </span>
              <span key={`val-${label}`} style={{ fontSize: 12, color: '#241f31', lineHeight: 1.5 }}>{value}</span>
            </>
          ))}
        </div>

        {/* What would disprove this */}
        {signal.disprovable_by && (
          <div style={{ marginBottom: 16, padding: '10px 13px', background: '#f7f1e6', borderRadius: 8, border: '1px solid #e0d8c9' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8c8499', marginBottom: 5 }}>
              What would update this
            </div>
            <div style={{ fontSize: 12, color: '#5a5267', lineHeight: 1.55 }}>{signal.disprovable_by}</div>
          </div>
        )}

        {/* Add context input */}
        {addingContext ? (
          <div style={{ marginBottom: 14 }}>
            <textarea
              autoFocus
              value={contextText}
              onChange={e => setContextText(e.target.value)}
              placeholder="Tell us more — this becomes a high-confidence signal…"
              style={{
                width: '100%', minHeight: 72, padding: '10px 12px',
                border: '1px solid #e0d8c9', borderRadius: 8, resize: 'vertical',
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontSize: 13, color: '#241f31', background: '#fbf8f1',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => contextText.trim() && onAddContext(signal.id, contextText.trim(), signal.domain)}
                disabled={!contextText.trim()}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 7,
                  background: '#b0956e', border: 'none', color: '#fff',
                  fontSize: 12, fontWeight: 600, cursor: contextText.trim() ? 'pointer' : 'not-allowed',
                  opacity: contextText.trim() ? 1 : 0.5,
                }}
              >
                Save context
              </button>
              <button
                onClick={() => { setAddingContext(false); setContextText(''); }}
                style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e0d8c9', background: 'none', fontSize: 12, color: '#8c8499', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Correction loop */
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onCorrect(signal.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7,
                border: '1px solid #fca5a5', background: '#fff7f7',
                fontSize: 11, fontWeight: 600, color: '#b91c1c', cursor: 'pointer',
              }}
            >
              Wrong?
            </button>
            <button
              onClick={() => onIgnore(signal.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7,
                border: '1px solid #e0d8c9', background: '#f7f1e6',
                fontSize: 11, fontWeight: 600, color: '#8c8499', cursor: 'pointer',
              }}
            >
              Ignore
            </button>
            <button
              onClick={() => setAddingContext(true)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7,
                border: '1px solid #c4b8a8', background: '#fbf8f1',
                fontSize: 11, fontWeight: 600, color: '#5a5267', cursor: 'pointer',
              }}
            >
              Add context
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
