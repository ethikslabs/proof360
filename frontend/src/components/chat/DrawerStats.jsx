// stats: { tokensProcessed, analysisPasses, sourcesReviewed, modelCorrelations }
export function DrawerStats({ stats }) {
  if (!stats) return null;
  const rows = [
    { label: 'Tokens processed',   value: stats.tokensProcessed?.toLocaleString() },
    { label: 'Analysis passes',    value: stats.analysisPasses },
    { label: 'Sources reviewed',   value: stats.sourcesReviewed },
    { label: 'Model correlations', value: stats.modelCorrelations },
  ].filter(r => r.value != null);

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>
        Operational work units
      </div>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#374151' }}>
          <span>{r.label}</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
