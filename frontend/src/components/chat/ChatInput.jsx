import { useState, forwardRef } from 'react';

// ── SVG icons for plus menu ──────────────────────────────────────────────────
const IconPaperclip = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const IconLink = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IconCloud = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>
);
const IconUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);
const IconGlobe = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Plus menu groups ──────────────────────────────────────────────────────────
const PLUS_GROUPS = [
  [
    { id: 'files',    label: 'Add files or deck',  Icon: IconPaperclip },
    { id: 'url',      label: 'Paste a URL',         Icon: IconLink },
  ],
  [
    { id: 'aws-bill', label: 'Add AWS bill',         Icon: IconCloud },
    { id: 'linkedin', label: 'Add LinkedIn profile', Icon: IconUser },
  ],
  [
    { id: 'deep-scan',   label: 'Deep market scan',   Icon: IconSearch },
    { id: 'web-search',  label: 'Web search',          Icon: IconGlobe, toggle: true },
  ],
];

const MENTION_COLORS = {
  sophia: '#a8651e', leonardo: '#6b4ea8', edison: '#176577',
  vanta: '#2563a8', perplexity: '#2563a8', cisco: '#2563a8',
  microsoft: '#2563a8', nvidia: '#2563a8', anthropic: '#2563a8', aws: '#2563a8',
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

const INPUT_STYLE = {
  fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.6,
  padding: '14px 16px 4px',
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
  const [webSearchOn, setWebSearchOn] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Add context"
        style={{
          width: 30, height: 30, borderRadius: 8,
          border: '1px solid #e5e7eb',
          background: open ? '#f3f4f6' : 'transparent',
          color: '#6b7280', fontSize: 18, lineHeight: 1,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 0.12s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="7" y1="1" x2="7" y2="13"/>
          <line x1="1" y1="7" x2="13" y2="7"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', bottom: 38, left: 0,
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            padding: '6px 0', minWidth: 230, zIndex: 100,
          }}>
            {PLUS_GROUPS.map((group, gi) => (
              <div key={gi}>
                {gi > 0 && (
                  <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
                )}
                {group.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.toggle) {
                        setWebSearchOn(v => !v);
                      } else {
                        onSelect(item.label);
                        setOpen(false);
                      }
                    }}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'center',
                      width: '100%', padding: '8px 14px',
                      background: 'none', border: 'none',
                      fontSize: 13, color: item.toggle && webSearchOn ? '#2563eb' : '#111827',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ color: item.toggle && webSearchOn ? '#2563eb' : '#6b7280', flexShrink: 0 }}>
                      <item.Icon />
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.toggle && webSearchOn && (
                      <span style={{ color: '#2563eb' }}><IconCheck /></span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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

  const hasMentions = MENTION_RE.test(currentValue);
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
      onSubmit?.(chip);
      if (!isControlled) setInputValue('');
    } else {
      if (isControlled) onChangeProp?.(chip);
      else setInputValue(chip);
      ref?.current?.focus();
    }
  }

  const canSend = !disabled && !!currentValue.trim();

  return (
    <div>
      {/* Input box — Claude aesthetic: + inside bottom-left, send inside bottom-right */}
      <form onSubmit={handleSubmit}>
        <div style={{
          border: `1px solid ${dragOver ? '#6366f1' : '#e5e7eb'}`,
          borderRadius: 16,
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          transition: 'border-color 0.15s',
          overflow: 'hidden',
        }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); }}
        >
          {/* Text area */}
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
                color: hasMentions ? 'transparent' : '#111827',
                caretColor: '#111827',
                position: 'relative', zIndex: 1,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Bottom bar inside the box */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '4px 10px 10px',
            gap: 8,
          }}>
            <PlusMenu onSelect={onContextInject ?? (() => {})} />
            <div style={{ flex: 1 }} />
            <button
              type="submit"
              disabled={!canSend}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: canSend ? '#111827' : '#f3f4f6',
                border: 'none', cursor: canSend ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s', flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={canSend ? '#ffffff' : '#9ca3af'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </form>

      {/* Chips below the box — scenario starters or follow-ups */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {chips.map(ex => (
          <button
            key={ex}
            onClick={() => handleChipClick(ex)}
            style={{
              padding: '5px 12px', borderRadius: 14,
              border: '1px solid #e5e7eb', background: '#ffffff',
              color: '#374151', fontSize: 12, cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              transition: 'border-color 0.12s, box-shadow 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
            }}
          >{ex}</button>
        ))}
      </div>
    </div>
  );
});
