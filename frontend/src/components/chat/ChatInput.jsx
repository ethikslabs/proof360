import { useState, forwardRef } from 'react';

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

// Persona colors for pearl theme (matches tokens.js)
const MENTION_COLORS = {
  sophia:   '#a8651e',
  leonardo: '#6b4ea8',
  edison:   '#176577',
  // Vendors — steel blue
  vanta:      '#2563a8',
  perplexity: '#2563a8',
  cisco:      '#2563a8',
  microsoft:  '#2563a8',
  nvidia:     '#2563a8',
  anthropic:  '#2563a8',
  aws:        '#2563a8',
};

const MENTION_RE = /@(Sophia|Leonardo|Edison|Vanta|Perplexity|Cisco|Microsoft|NVIDIA|Anthropic|AWS)\b/gi;

function parseMentions(text) {
  const parts = [];
  let last = 0;
  const re = new RegExp(MENTION_RE.source, 'gi');
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) });
    const color = MENTION_COLORS[match[1].toLowerCase()] || '#6b7280';
    parts.push({ type: 'mention', content: match[0], color });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts;
}

// Shared typography so the mirror and textarea lay out identically
const INPUT_STYLE = {
  fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.6,
  padding: '12px 14px',
};

function MentionMirror({ value }) {
  const parts = parseMentions(value);
  return (
    <div style={{
      ...INPUT_STYLE,
      position: 'absolute', top: 0, left: 0, right: 0,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      pointerEvents: 'none', overflow: 'hidden',
      color: '#111827', zIndex: 0,
    }}>
      {parts.map((p, i) =>
        p.type === 'mention' ? (
          <span key={i} style={{
            color: p.color, fontWeight: 600,
            background: p.color + '18',
            borderRadius: 3, padding: '1px 3px',
          }}>{p.content}</span>
        ) : p.content
      )}
    </div>
  );
}

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
      >+</button>
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
            >{item.icon} {item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// Scenario launchers — auto-submit on click, drop the person into a real moment
const STARTER_CHIPS = [
  "Imagine you're selling Manuka honey at a stall in King's Cross on a Saturday morning. Fast forward: sales, a global opportunity, burned cash, and now you need investors. What do you do?",
  "We spent six months closing our biggest enterprise contract. Then they sent a security questionnaire. The deal died in the room.",
  "I've got 20 minutes with a VC partner next Tuesday. They love the product. Then they'll ask about our security posture. I don't know what to say.",
  "Someone told me I need to sort out my trust posture before I raise. I have no idea what that means.",
];

const FOLLOWUP_CHIPS = [
  "Tell me more about the supply chain risks",
  "What does my investor timeline look like?",
  "Walk me through the enterprise DD checklist",
  "What should I fix first?",
];

export const ChatInput = forwardRef(function ChatInput(
  { onSubmit, disabled, messages = [], onContextInject, value: valueProp, onChange: onChangeProp },
  ref
) {
  const hasExchange = messages.length >= 2;
  const chips = hasExchange ? FOLLOWUP_CHIPS : STARTER_CHIPS;

  const [inputValue, setInputValue] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const isControlled = valueProp !== undefined;
  const currentValue = isControlled ? valueProp : inputValue;

  // Only activate the mirror when there's an @mention in the text
  const hasMentions = MENTION_RE.test(currentValue);
  // Reset lastIndex after test() (RegExp with /g is stateful)
  MENTION_RE.lastIndex = 0;

  function handleChange(e) {
    if (isControlled) onChangeProp?.(e.target.value);
    else setInputValue(e.target.value);
  }

  function handleSubmit(e) {
    e?.preventDefault();
    const trimmed = currentValue.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    if (!isControlled) setInputValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleChipClick(chip) {
    if (!hasExchange) {
      // Starter chips: auto-submit, no second click needed — drop into the journey
      onSubmit?.(chip);
      if (!isControlled) setInputValue('');
    } else {
      // Followup chips: pre-fill so they can edit before sending
      if (isControlled) onChangeProp?.(chip);
      else setInputValue(chip);
      ref?.current?.focus();
    }
  }

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px 0 0' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {chips.map(ex => (
          <button
            key={ex}
            onClick={() => handleChipClick(ex)}
            style={{
              padding: '5px 12px', borderRadius: 14,
              border: '1px solid #d1d5db', background: '#ffffff',
              color: '#374151', fontSize: 12, cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >{ex}</button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <PlusMenu onSelect={onContextInject ?? (() => {})} />
        <div style={{
          flex: 1,
          border: `1px solid ${dragOver ? '#4f46e5' : '#d1d5db'}`,
          borderRadius: 12, background: '#ffffff',
          transition: 'border-color 0.15s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); }}
        >
          {/* Mirror + textarea wrapper — must be position:relative so mirror is absolute inside it */}
          <div style={{ position: 'relative' }}>
            {hasMentions && <MentionMirror value={currentValue} />}
            <textarea
              ref={ref}
              value={currentValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Paste your website, upload a deck, or describe what you're building…"
              disabled={disabled}
              rows={3}
              style={{
                ...INPUT_STYLE,
                width: '100%', resize: 'none',
                background: 'transparent', border: 'none', outline: 'none',
                // When mirror is active, hide textarea text but keep the cursor visible
                color: hasMentions ? 'transparent' : '#111827',
                caretColor: '#111827',
                position: 'relative', zIndex: 1, // explicit stacking above the mirror
              }}
            />
          </div>
          <div style={{ padding: '6px 14px 10px', color: '#9ca3af', fontSize: 11 }}>
            Drop a file or paste a URL
          </div>
        </div>
        <button
          type="submit"
          disabled={disabled || !currentValue.trim()}
          style={{
            padding: '12px 20px', borderRadius: 10,
            background: disabled || !currentValue.trim() ? '#e5e7eb' : '#4f46e5',
            color: disabled || !currentValue.trim() ? '#9ca3af' : '#ffffff',
            border: 'none', fontSize: 13, fontWeight: 700,
            cursor: disabled || !currentValue.trim() ? 'default' : 'pointer',
            transition: 'all 0.15s', letterSpacing: '0.3px',
          }}
        >{hasExchange ? 'Send' : 'Start'}</button>
      </form>
    </div>
  );
});
