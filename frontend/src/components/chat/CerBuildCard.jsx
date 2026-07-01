import { FONT } from '../../tokens.js';

// FRAME 2 — the right-rail "forming N/7" card. A CER assembling itself out of the
// conversation. Purely presentational: the caller derives `fields` (the seven CER
// slots) from the profile snapshot + partial CER as facts arrive; each tick is a real
// fact append upstream. Same seven-field shape for EVERY pathway — that sameness is
// the product thesis.
//
// fields: [{ key, label, value, state }]  where state ∈ 'done' | 'live' | 'wait'
// The seven, in order: Company, Contact, Need / gap, Evidence, Route, Consent, Visibility.

function Tick({ state, tk }) {
  const base = { width: 16, height: 16, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, lineHeight: 1 };
  if (state === 'done') {
    return <span style={{ ...base, background: tk.plum, color: '#fff' }}>✓</span>;
  }
  if (state === 'live') {
    return <span style={{ ...base, background: tk.surface, border: `1.5px dashed ${tk.plum}`, color: tk.plum }}>…</span>;
  }
  return <span style={{ ...base, background: tk.surface, border: `1.5px solid ${tk.inkGhost}` }} />;
}

export function CerBuildCard({ title, meter, total = 7, fields = [], sub, onConfirmRoute, confirmLabel, tk }) {
  return (
    <div style={{ width: 280, flexShrink: 0, border: `1.5px solid ${tk.plum}`, borderRadius: 14, background: tk.surfaceLo, padding: 15 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 16, height: 16, borderRadius: 6, background: tk.plum, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>◆</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em', color: tk.plum, textTransform: 'uppercase' }}>{title}</span>
        <span style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 10, color: tk.plum }}>{meter}/{total}</span>
      </div>

      {sub && (
        <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13, color: tk.plum, opacity: 0.85, marginBottom: 10 }}>{sub}</div>
      )}

      {/* progress */}
      <div style={{ height: 5, background: tk.hairline, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${Math.round((meter / total) * 100)}%`, background: tk.plum, borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>

      {/* the seven fields */}
      <div>
        {fields.map((f, i) => (
          <div
            key={f.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 0',
              borderBottom: i === fields.length - 1 ? 'none' : `1px dotted ${tk.hairline}`,
            }}
          >
            <Tick state={f.state} tk={tk} />
            <span style={{ fontFamily: FONT.sans, fontSize: 11, color: f.state === 'wait' ? tk.inkGhost : tk.inkSoft }}>{f.label}</span>
            <span style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 10, color: f.state === 'wait' ? tk.inkGhost : tk.inkMid }}>{f.value}</span>
          </div>
        ))}
      </div>

      {/* commit-the-proposed-route affordance (the "click" half of the hybrid trigger) */}
      {onConfirmRoute && (
        <button
          type="button"
          onClick={onConfirmRoute}
          style={{ marginTop: 12, width: '100%', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: '#fff', background: tk.plum, border: 'none', borderRadius: 9, padding: '8px 12px', cursor: 'pointer' }}
        >
          {confirmLabel || 'Use this pathway →'}
        </button>
      )}
    </div>
  );
}
