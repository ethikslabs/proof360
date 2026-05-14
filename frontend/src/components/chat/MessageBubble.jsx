const PERSONA_META = {
  sofia: { label: 'Sofia', color: '#f59e0b' },
  leonardo: { label: 'Leonardo', color: '#8b5cf6' },
  edison: { label: 'Edison', color: '#22d3ee' },
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
            <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>
              {meta.disclaimer}
            </span>
          )}
        </div>
      )}
      <div style={{
        maxWidth: '72%',
        padding: '12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? '#4f46e5' : '#131c2e',
        border: isUser ? 'none' : `1px solid ${meta ? meta.color + '33' : '#1e293b'}`,
        color: '#f1f5f9',
        fontSize: 14,
        lineHeight: 1.6,
      }}>
        {message.content}
      </div>
    </div>
  );
}
