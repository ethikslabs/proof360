const PROFILES = [
  { id: 'investor',   label: 'Investor' },
  { id: 'market',     label: 'Market' },
  { id: 'technical',  label: 'Technical' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'deep',       label: 'Deep' },
  { id: 'fast',       label: 'Fast' },
];

export function ProfileSelector({ value = 'investor', onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      {PROFILES.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange?.(p.id)}
          style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            border: '1.5px solid',
            borderColor: value === p.id ? '#4f46e5' : '#e5e7eb',
            background:  value === p.id ? '#ede9fe' : '#ffffff',
            color:       value === p.id ? '#4f46e5' : '#6b7280',
            cursor: 'pointer', transition: 'all 0.1s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
