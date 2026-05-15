import { useState, useRef } from 'react';

const EXAMPLES = [
  "Imagine you're selling Manuka honey at a stall in King's Cross on a Saturday morning. Fast forward: sales, a global opportunity, burned cash, and now you need investors. What do you do?",
  "We're raising pre-seed",
  "We want to sell to enterprise",
  "We need to understand our trust gaps",
];

export function ChatInput({ onSubmit, disabled }) {
  const [value, setValue] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px 0 0' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            onClick={() => { setValue(ex); textareaRef.current?.focus(); }}
            style={{
              padding: '5px 12px',
              borderRadius: 14,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              fontSize: 12,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div
          style={{
            flex: 1,
            border: `1px solid ${dragOver ? '#4f46e5' : '#d1d5db'}`,
            borderRadius: 12,
            background: '#ffffff',
            transition: 'border-color 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste your website, upload a deck, or describe what you're building…"
            disabled={disabled}
            rows={3}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#111827',
              fontSize: 14,
              lineHeight: 1.6,
              padding: '12px 14px',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ padding: '6px 14px 10px', color: '#9ca3af', fontSize: 11 }}>
            Drop a file or paste a URL
          </div>
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          style={{
            padding: '12px 20px',
            borderRadius: 10,
            background: disabled || !value.trim() ? '#e5e7eb' : '#4f46e5',
            color: disabled || !value.trim() ? '#9ca3af' : '#ffffff',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: disabled || !value.trim() ? 'default' : 'pointer',
            transition: 'all 0.15s',
            letterSpacing: '0.3px',
          }}
        >
          Start
        </button>
      </form>
    </div>
  );
}
