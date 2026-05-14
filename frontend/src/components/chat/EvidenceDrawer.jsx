export function EvidenceDrawer({ evidence }) {
  return (
    <div>
      {evidence.map(e => (
        <div key={e.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {e.source_type.replace('_', ' ')}
            </span>
            <span style={{ fontSize: 11, color: '#475569' }}>{e.source_name}</span>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{e.summary}</p>
          <p style={{ fontSize: 10, color: '#334155', marginTop: 6 }}>
            {e.visibility === 'shareable' ? '✓ Shareable' : '⊘ Internal only'} · {new Date(e.timestamp).toLocaleDateString('en-AU')}
          </p>
        </div>
      ))}
    </div>
  );
}
