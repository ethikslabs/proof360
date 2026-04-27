import { useState } from 'react';

/* ─── Palette (matches Report.jsx) ───────────────────────────────────────── */
const NAVY  = '#0B2545';
const AMBER = '#E07B39';
const WHITE = '#FFFFFF';
const MUTED = '#667085';
const LIGHT = '#98A2B3';
const BORDER = '#E4E7EC';

const STATUS_BADGE = {
  inferred:   { bg: '#EFF6FF', text: '#3B82F6', label: 'Inferred' },
  overridden: { bg: '#FFF7ED', text: '#D97706', label: 'Overridden' },
  conflicted: { bg: '#FEF2F2', text: '#DC2626', label: 'Conflicted' },
};

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/* ─── API helpers (inline until task 13.5 wires client.js) ───────────────── */
async function postOverride(sessionId, body) {
  const res = await fetch(`${BASE}/api/v1/session/${sessionId}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Override failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

async function postResolveConflict(sessionId, body) {
  const res = await fetch(`${BASE}/api/v1/session/${sessionId}/resolve-conflict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Conflict resolution failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ─── Signal row ─────────────────────────────────────────────────────────── */
function SignalRow({ signal, sessionId, onDerivedStateUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Conflict resolution state
  const [resolving, setResolving] = useState(false);
  const [chosenValue, setChosenValue] = useState('');
  const [reason, setReason] = useState('');

  const badge = STATUS_BADGE[signal.status] || STATUS_BADGE.inferred;

  function startEdit() {
    setDraft(signal.current_value || signal.inferred_value || '');
    setEditing(true);
    setError('');
  }

  function cancelEdit() {
    setEditing(false);
    setDraft('');
    setError('');
  }

  async function submitOverride() {
    if (!draft.trim()) return;
    setSaving(true);
    setError('');
    try {
      const result = await postOverride(sessionId, {
        field: signal.field,
        value: draft.trim(),
        actor: 'founder',
        reason: 'user override',
      });
      setEditing(false);
      setDraft('');
      if (result.derived_state) {
        onDerivedStateUpdate(result.derived_state);
      }
    } catch (err) {
      setError(err.message || 'Override failed');
    } finally {
      setSaving(false);
    }
  }

  async function submitResolution() {
    if (!chosenValue) return;
    setResolving(true);
    setError('');
    try {
      const result = await postResolveConflict(sessionId, {
        field: signal.field,
        chosen_value: chosenValue,
        actor: 'founder',
        reason: reason.trim() || 'founder resolved conflict',
      });
      setChosenValue('');
      setReason('');
      if (result.derived_state) {
        onDerivedStateUpdate(result.derived_state);
      }
    } catch (err) {
      setError(err.message || 'Resolution failed');
    } finally {
      setResolving(false);
    }
  }

  const isConflicted = signal.status === 'conflicted';

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: `1px solid ${BORDER}`,
      background: isConflicted ? '#FEF2F2' : WHITE,
    }}>
      {/* Header: field name + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: MUTED,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          fontFamily: '"IBM Plex Mono", monospace',
        }}>
          {signal.field.replace(/_/g, ' ')}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600,
          padding: '2px 8px', borderRadius: 10,
          background: badge.bg, color: badge.text,
          fontFamily: '"Outfit", sans-serif',
        }}>
          {badge.label}
        </span>
      </div>

      {/* Values */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: LIGHT, width: 60, flexShrink: 0, fontFamily: '"Outfit", sans-serif' }}>Current</span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: NAVY,
            fontFamily: '"Outfit", sans-serif',
          }}>
            {signal.current_value || '—'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: LIGHT, width: 60, flexShrink: 0, fontFamily: '"Outfit", sans-serif' }}>Inferred</span>
          <span style={{
            fontSize: 12, color: MUTED,
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            {signal.inferred_value || '—'}
          </span>
        </div>
      </div>

      {/* Conflict UI */}
      {isConflicted && !editing && (
        <div style={{
          background: WHITE, border: '1px solid #FECACA', borderRadius: 6,
          padding: '10px 12px', marginBottom: 8,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', marginBottom: 8, fontFamily: '"Outfit", sans-serif' }}>
            Conflict detected — choose the correct value
          </p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[signal.current_value, signal.inferred_value].filter(Boolean).map((val) => (
              <button
                key={val}
                onClick={() => setChosenValue(val)}
                style={{
                  flex: 1, padding: '6px 10px',
                  fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${chosenValue === val ? NAVY : BORDER}`,
                  borderRadius: 5, cursor: 'pointer',
                  background: chosenValue === val ? NAVY : WHITE,
                  color: chosenValue === val ? WHITE : MUTED,
                  fontFamily: '"Outfit", sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {val}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%', padding: '6px 10px',
              fontSize: 12, border: `1px solid ${BORDER}`,
              borderRadius: 5, marginBottom: 8,
              fontFamily: '"Outfit", sans-serif',
              color: NAVY, outline: 'none',
            }}
          />
          <button
            onClick={submitResolution}
            disabled={!chosenValue || resolving}
            style={{
              width: '100%', padding: '7px 0',
              fontSize: 12, fontWeight: 600,
              background: chosenValue ? AMBER : BORDER,
              color: chosenValue ? WHITE : LIGHT,
              border: 'none', borderRadius: 5,
              cursor: chosenValue ? 'pointer' : 'default',
              fontFamily: '"Outfit", sans-serif',
              opacity: resolving ? 0.6 : 1,
            }}
          >
            {resolving ? 'Resolving…' : 'Resolve conflict'}
          </button>
        </div>
      )}

      {/* Edit affordance */}
      {!isConflicted && !editing && (
        <button
          onClick={startEdit}
          style={{
            fontSize: 11, fontWeight: 600, color: AMBER,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, fontFamily: '"Outfit", sans-serif',
          }}
        >
          ✎ Correct
        </button>
      )}

      {/* Inline editor */}
      {editing && (
        <div style={{ marginTop: 4 }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitOverride(); if (e.key === 'Escape') cancelEdit(); }}
            autoFocus
            style={{
              width: '100%', padding: '7px 10px',
              fontSize: 13, border: `1.5px solid ${NAVY}`,
              borderRadius: 5, fontFamily: '"Outfit", sans-serif',
              color: NAVY, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button
              onClick={submitOverride}
              disabled={saving || !draft.trim()}
              style={{
                flex: 1, padding: '6px 0',
                fontSize: 12, fontWeight: 600,
                background: NAVY, color: WHITE,
                border: 'none', borderRadius: 5,
                cursor: 'pointer', fontFamily: '"Outfit", sans-serif',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              style={{
                flex: 1, padding: '6px 0',
                fontSize: 12, fontWeight: 600,
                background: WHITE, color: MUTED,
                border: `1px solid ${BORDER}`, borderRadius: 5,
                cursor: 'pointer', fontFamily: '"Outfit", sans-serif',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: 11, color: '#DC2626', marginTop: 6, fontFamily: '"Outfit", sans-serif' }}>
          {error}
        </p>
      )}
    </div>
  );
}


/* ─── OverridePanel ──────────────────────────────────────────────────────── */
/**
 * Right-hand pop-out panel for signal correction.
 * Lists every signal field with current_value, inferred_value, status, edit affordance.
 * On edit: POST /api/v1/session/:id/override → re-render report with derived_state.
 * On conflict: surface both values, prompt resolution via /resolve-conflict.
 * No computation — render derived_state only.
 *
 * Props:
 *   sessionId           — session UUID
 *   signals             — array of signal objects from derived_state
 *   onDerivedStateUpdate — callback when override/resolution returns new derived_state
 *   open                — boolean controlling panel visibility
 *   onClose             — callback to close panel
 */
export default function OverridePanel({ sessionId, signals = [], onDerivedStateUpdate, open, onClose }) {
  const conflicted = signals.filter(s => s.status === 'conflicted');
  const overridden = signals.filter(s => s.status === 'overridden');
  const inferred   = signals.filter(s => s.status === 'inferred');

  return (
    <>
      {/* Pull tab */}
      <button
        onClick={onClose}
        aria-label={open ? 'Close override panel' : 'Open override panel'}
        style={{
          position: 'fixed', right: open ? 340 : 0, top: 'calc(50% - 50px)',
          transform: 'translateY(-50%)',
          background: NAVY, color: WHITE,
          border: '1px solid rgba(255,255,255,0.2)', borderRight: 'none',
          cursor: 'pointer',
          borderRadius: '6px 0 0 6px',
          padding: '12px 10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          zIndex: 310,
          boxShadow: '-3px 0 16px rgba(0,0,0,0.4)',
          transition: 'right 0.25s ease',
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M14 3l-4 7 4 7" />
          <path d="M6 3l4 7-4 7" />
        </svg>
        <span style={{
          writingMode: 'vertical-lr', textOrientation: 'mixed',
          fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.9)',
        }}>Override</span>
        {conflicted.length > 0 && (
          <span style={{
            width: 16, height: 16, borderRadius: '50%',
            background: '#DC2626', color: WHITE,
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {conflicted.length}
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        role="complementary"
        aria-label="Signal override panel"
        style={{
          position: 'fixed', right: open ? 0 : -340, top: 52, bottom: 0,
          width: 340,
          background: WHITE,
          borderLeft: `1px solid ${BORDER}`,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          overflowY: 'auto',
          zIndex: 309,
          transition: 'right 0.25s ease',
          fontFamily: '"Outfit", sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: `1px solid ${BORDER}`,
          background: '#FAFBFC',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: LIGHT,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              Signal corrections
            </span>
            <button
              onClick={onClose}
              aria-label="Close panel"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: LIGHT, fontSize: 20, lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>
            Correct any signal below. Changes trigger a full recompute.
          </p>
        </div>

        {/* Signal list */}
        {signals.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: LIGHT }}>No signals available.</p>
          </div>
        )}

        {/* Conflicted signals first */}
        {conflicted.length > 0 && (
          <div>
            <div style={{
              padding: '10px 16px 6px',
              fontSize: 10, fontWeight: 700, color: '#DC2626',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              Conflicts ({conflicted.length})
            </div>
            {conflicted.map(sig => (
              <SignalRow
                key={sig.field}
                signal={sig}
                sessionId={sessionId}
                onDerivedStateUpdate={onDerivedStateUpdate}
              />
            ))}
          </div>
        )}

        {/* Overridden signals */}
        {overridden.length > 0 && (
          <div>
            <div style={{
              padding: '10px 16px 6px',
              fontSize: 10, fontWeight: 700, color: '#D97706',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              Overridden ({overridden.length})
            </div>
            {overridden.map(sig => (
              <SignalRow
                key={sig.field}
                signal={sig}
                sessionId={sessionId}
                onDerivedStateUpdate={onDerivedStateUpdate}
              />
            ))}
          </div>
        )}

        {/* Inferred signals */}
        {inferred.length > 0 && (
          <div>
            <div style={{
              padding: '10px 16px 6px',
              fontSize: 10, fontWeight: 700, color: '#3B82F6',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              Inferred ({inferred.length})
            </div>
            {inferred.map(sig => (
              <SignalRow
                key={sig.field}
                signal={sig}
                sessionId={sessionId}
                onDerivedStateUpdate={onDerivedStateUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
