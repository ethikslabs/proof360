import { useState } from 'react';

const PERSONA_META = {
  sofia:    { label: 'Sofia',    color: '#d97706', tint: '#fffbeb' },
  leonardo: { label: 'Leonardo', color: '#7c3aed', tint: '#f5f3ff' },
  edison:   { label: 'Edison',   color: '#0891b2', tint: '#ecfeff' },
  john_ai:  { label: 'John',     color: '#4f46e5', tint: '#eef2ff', disclaimer: 'AI assistant — John can step in personally.' },
};

export function MessageBubble({ message, onReplyToPersona }) {
  const [hovered, setHovered] = useState(false);
  const isUser = message.role === 'user';
  const meta = message.persona ? PERSONA_META[message.persona] : null;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 16 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {meta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {meta.label}
          </span>
          {meta.disclaimer && (
            <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>{meta.disclaimer}</span>
          )}
        </div>
      )}
      <div style={{
        maxWidth: '72%',
        padding: '12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? '#4f46e5' : (meta ? meta.tint : '#ffffff'),
        border: isUser ? 'none' : `1px solid ${meta ? meta.color + '25' : '#e5e7eb'}`,
        color: isUser ? '#ffffff' : '#111827',
        fontSize: 14,
        lineHeight: 1.6,
        boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {message.content}
      </div>
      {meta && hovered && (
        <button
          onClick={() => onReplyToPersona?.(message.persona)}
          style={{
            marginTop: 4,
            fontSize: 11,
            color: meta.color,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 0',
            opacity: 0.8,
          }}
        >
          ↩ Reply to {meta.label}
        </button>
      )}
    </div>
  );
}
