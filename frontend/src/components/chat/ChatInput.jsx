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
    <div style={{ borderTop: '1px solid #1e293b', padding: '16px 0 0' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            onClick={() => { setValue(ex); textareaRef.current?.focus(); }}
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              border: '1px solid #1e293b',
              background: 'transparent',
              color: '#475569',
              fontSize: 11,
              cursor: 'pointer',
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
            border: `1px solid ${dragOver ? '#4f46e5' : '#1e293b'}`,
            borderRadius: 12,
            background: '#131c2e',
            transition: 'border-color 0.15s',
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
              color: '#f1f5f9',
              fontSize: 14,
              lineHeight: 1.6,
              padding: '12px 14px',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ padding: '6px 14px 10px', color: '#334155', fontSize: 11 }}>
            Drop a file or paste a URL
          </div>
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          style={{
            padding: '12px 20px',
            borderRadius: 10,
            background: disabled || !value.trim() ? '#1e293b' : '#4f46e5',
            color: disabled || !value.trim() ? '#475569' : '#fff',
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
