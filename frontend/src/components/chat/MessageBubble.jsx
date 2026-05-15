const PERSONA_META = {
  sofia: { label: 'Sofia', color: '#d97706' },
  leonardo: { label: 'Leonardo', color: '#7c3aed' },
  edison: { label: 'Edison', color: '#0891b2' },
  john_ai: { label: 'John', color: '#4f46e5', disclaimer: 'AI assistant — John can step in personally.' },
};

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const meta = message.persona ? PERSONA_META[message.persona] : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      {meta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: meta.color,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            {meta.label}
          </span>
          {meta.disclaimer && (
            <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
              {meta.disclaimer}
            </span>
          )}
        </div>
      )}
      <div style={{
        maxWidth: '72%',
        padding: '12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? '#4f46e5' : '#ffffff',
        border: isUser ? 'none' : `1px solid ${meta ? meta.color + '30' : '#e5e7eb'}`,
        color: isUser ? '#ffffff' : '#111827',
        fontSize: 14,
        lineHeight: 1.6,
        boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {message.content}
      </div>
    </div>
  );
}
