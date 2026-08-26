// The work the read actually did.
//
// This component used to take four numbers from the caller, two of which were
// hardcoded literals (18,420 tokens, 2 model correlations), one a boolean dressed
// as a count, and one counting inferences under a label saying "sources". John,
// logged in and reading it (2026-08-26): "what is this telling me?" Nothing —
// and the rows contradicted each other on their face.
//
// It now renders whatever deriveWorkUnits could vouch for, and nothing else. A
// row with no measurement behind it does not exist; if none can be vouched for,
// the whole panel stays away rather than showing a frame with zeros in it.
import { deriveWorkUnits } from '../../rendering/workUnits.js';

export function DrawerStats({ data }) {
  const rows = deriveWorkUnits(data);
  if (rows.length === 0) return null;

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>
        What we read
      </div>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, padding: '3px 0', color: '#374151' }}>
          <span>{r.label}</span>
          <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>
            {typeof r.value === 'number' ? r.value.toLocaleString() : r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default DrawerStats;
