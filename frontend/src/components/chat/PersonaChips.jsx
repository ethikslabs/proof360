const PERSONAS = [
  { id: 'sofia', label: 'Sofia', role: 'Market & investor lens', color: '#d97706' },
  { id: 'leonardo', label: 'Leonardo', role: 'Narrative & positioning', color: '#7c3aed' },
  { id: 'edison', label: 'Edison', role: 'Technical & enterprise DD', color: '#0891b2' },
  { id: 'john_ai', label: 'John', role: 'Commercial judgment', color: '#4f46e5' },
];

export function PersonaChips({ activePersona, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 0 8px' }}>
      {PERSONAS.map(p => (
        <button
          key={p.id}
          aria-pressed={activePersona === p.id}
          onClick={() => onSelect(p.id)}
          title={p.role}
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            border: `1px solid ${activePersona === p.id ? p.color : '#d1d5db'}`,
            background: activePersona === p.id ? p.color + '12' : '#ffffff',
            color: activePersona === p.id ? p.color : '#374151',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.3px',
            transition: 'all 0.15s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
