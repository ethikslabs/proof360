const PERSONAS = [
  { id: 'sofia', label: 'Sofia', role: 'Market & investor lens', color: '#f59e0b' },
  { id: 'leonardo', label: 'Leonardo', role: 'Narrative & positioning', color: '#8b5cf6' },
  { id: 'edison', label: 'Edison', role: 'Technical & enterprise DD', color: '#22d3ee' },
  { id: 'john_ai', label: 'John', role: 'Commercial judgment', color: '#4f46e5' },
];

export function PersonaChips({ activePersona, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
      {PERSONAS.map(p => (
        <button
          key={p.id}
          aria-pressed={activePersona === p.id}
          onClick={() => onSelect(p.id)}
          title={p.role}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: `1px solid ${activePersona === p.id ? p.color : '#334155'}`,
            background: activePersona === p.id ? p.color + '22' : 'transparent',
            color: activePersona === p.id ? p.color : '#94a3b8',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.3px',
            transition: 'all 0.15s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
