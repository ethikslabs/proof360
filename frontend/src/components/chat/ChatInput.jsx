import { useState, useRef } from 'react';

const PLUS_ITEMS = [
  { id: 'deck',        label: 'Upload deck / pitch',      icon: '📎' },
  { id: 'website',     label: 'Add website',               icon: '🌐' },
  { id: 'aws-bill',    label: 'Add AWS bill',              icon: '☁️' },
  { id: 'linkedin',    label: 'Add LinkedIn',              icon: '🔗' },
  { id: 'deep-scan',   label: 'Deep market scan',          icon: '🔍' },
  { id: 'regional',    label: 'Enable regional analysis',  icon: '🌏' },
  { id: 'competitors', label: 'Compare competitors',       icon: '🔄' },
  { id: 'investors',   label: 'Run investor readiness',    icon: '💼' },
  { id: 'procurement', label: 'Run procurement readiness', icon: '🏢' },
];

function PlusMenu({ onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Add context"
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '1.5px solid #d1d5db',
          background: open ? '#f3f4f6' : '#ffffff',
          color: '#6b7280', fontSize: 18, lineHeight: 1,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        +
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 40, left: 0,
          background: '#ffffff', border: '1px solid #e5e7eb',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          padding: '8px 0', minWidth: 220, zIndex: 100,
        }}>
          {PLUS_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelect(item.label); setOpen(false); }}
              style={{
                display: 'flex', gap: 10, alignItems: 'center',
                width: '100%', padding: '9px 16px',
                background: 'none', border: 'none',
                fontSize: 13, color: '#111827', cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STARTER_CHIPS = [
  "Imagine you're selling Manuka honey at a stall in King's Cross on a Saturday morning. Fast forward: sales, a global opportunity, burned cash, and now you need investors. What do you do?",
  "We're raising pre-seed",
  "We want to sell to enterprise",
  "We need to understand our trust gaps",
];

const FOLLOWUP_CHIPS = [
  "Tell me more about the supply chain risks",
  "What does my investor timeline look like?",
  "Walk me through the enterprise DD checklist",
  "What should I fix first?",
];

export function ChatInput({ onSubmit, disabled, messages = [], onContextInject }) {
  const hasExchange = messages.length >= 2;
  const chips = hasExchange ? FOLLOWUP_CHIPS : STARTER_CHIPS;
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
        {chips.map(ex => (
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
        <PlusMenu onSelect={onContextInject ?? (() => {})} />
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
          {hasExchange ? 'Send' : 'Start'}
        </button>
      </form>
    </div>
  );
}
