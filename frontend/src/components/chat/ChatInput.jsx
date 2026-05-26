import { useState, forwardRef } from 'react';

import awsSvg        from '../OperationalField/logos/aws.svg';
import vantaSvg      from '../OperationalField/logos/vanta.svg';
import perplexitySvg from '../OperationalField/logos/perplexity.svg';
import openaiSvg     from '../OperationalField/logos/openai.svg';
import nvidiaSvg     from '../OperationalField/logos/nvidia.svg';

// ── Modes — our equivalent of Claude's model selector ────────────────────────
const MODES = [
  { id: 'investor',   label: 'Investors',  logo: vantaSvg,      desc: 'Due diligence & trust narrative' },
  { id: 'technical',  label: 'Technical',  logo: awsSvg,         desc: 'Security architecture & posture' },
  { id: 'compliance', label: 'Compliance', logo: vantaSvg,       desc: 'SOC 2, ISO 27001, regulatory' },
  { id: 'market',     label: 'Market',     logo: perplexitySvg,  desc: 'Competitive trust positioning' },
  { id: 'deep',       label: 'Deep',       logo: openaiSvg,      desc: 'Full multi-model analysis' },
  { id: 'fast',       label: 'Fast',       logo: nvidiaSvg,      desc: 'Quick scan — top 3 critical gaps' },
];

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/>
  </svg>
);
const IconSend = ({ color = 'currentColor' }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 3.5 L5 6.5 L8 3.5"/>
  </svg>
);
const IconPaperclip = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IconCloud = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>
);
const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Plus menu ─────────────────────────────────────────────────────────────────
const PLUS_GROUPS = [
  [
    { id: 'files', label: 'Add files or deck',  Icon: IconPaperclip },
    { id: 'url',   label: 'Paste a URL',         Icon: IconLink },
  ],
  [
    { id: 'aws-bill', label: 'Add AWS bill',         Icon: IconCloud },
    { id: 'web',      label: 'Web search',            Icon: IconGlobe, toggle: true },
  ],
];

function PlusMenu({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [webOn, setWebOn] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Add context"
        style={{
          width: 28, height: 28, borderRadius: 7,
          border: '1px solid #e5e7eb',
          background: open ? '#f3f4f6' : 'transparent',
          color: '#9ca3af', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 0.12s, color 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = '#f9fafb'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = open ? '#f3f4f6' : 'transparent'; }}
      >
        <IconPlus />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', bottom: 36, left: 0,
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            padding: '6px 0', minWidth: 210, zIndex: 100,
          }}>
            {PLUS_GROUPS.map((group, gi) => (
              <div key={gi}>
                {gi > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />}
                {group.map(item => (
                  <button
                    key={item.id} type="button"
                    onClick={() => {
                      if (item.toggle) { setWebOn(v => !v); }
                      else { onSelect(item.label); setOpen(false); }
                    }}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'center',
                      width: '100%', padding: '8px 14px',
                      background: 'none', border: 'none',
                      fontSize: 13, color: item.toggle && webOn ? '#2563eb' : '#111827',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ color: item.toggle && webOn ? '#2563eb' : '#9ca3af', flexShrink: 0 }}>
                      <item.Icon />
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.toggle && webOn && <span style={{ color: '#2563eb' }}><IconCheck /></span>}
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

// ── Mode selector — like Claude's model picker ────────────────────────────────
function ModeSelector({ mode, onModeChange }) {
  const [open, setOpen] = useState(false);
  const current = MODES.find(m => m.id === mode) ?? MODES[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 8px 4px 6px', borderRadius: 7,
          border: '1px solid #e5e7eb',
          background: open ? '#f9fafb' : 'transparent',
          color: '#6b7280', cursor: 'pointer',
          fontSize: 12, fontWeight: 500,
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          transition: 'background 0.12s',
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
        onMouseLeave={e => e.currentTarget.style.background = open ? '#f9fafb' : 'transparent'}
      >
        <img src={current.logo} alt={current.label} style={{ height: 13, maxWidth: 40, objectFit: 'contain', opacity: 0.8 }} />
        <span>{current.label}</span>
        <IconChevronDown />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', bottom: 36, left: 0,
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            padding: '6px 0', minWidth: 240, zIndex: 100,
          }}>
            {MODES.map(m => (
              <button
                key={m.id} type="button"
                onClick={() => { onModeChange?.(m.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 14px',
                  background: m.id === mode ? '#f9fafb' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = m.id === mode ? '#f9fafb' : 'none'}
              >
                <img src={m.logo} alt={m.label} style={{ height: 16, maxWidth: 50, objectFit: 'contain', opacity: 0.8, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
                    {m.label}
                    {m.id === mode && <span style={{ marginLeft: 6, color: '#9ca3af', fontSize: 11 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', marginTop: 1 }}>
                    {m.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Mention support ───────────────────────────────────────────────────────────
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
  padding: '14px 16px 6px',
};

function MentionMirror({ value }) {
  const parts = parseMentions(value);
  return (
    <div style={{
      ...INPUT_STYLE,
      position: 'absolute', top: 0, left: 0, right: 0,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      pointerEvents: 'none', overflow: 'hidden', color: '#111827', zIndex: 0,
    }}>
      {parts.map((p, i) =>
        p.type === 'mention' ? (
          <span key={i} style={{ color: p.color, fontWeight: 600, background: p.color + '18', borderRadius: 3, padding: '1px 3px' }}>
            {p.content}
          </span>
        ) : p.content
      )}
    </div>
  );
}

// ── Chips shown inside the box when it's empty ────────────────────────────────
const STARTER_CHIPS = [
  "Manuka honey brand, King's Cross market stall → global opportunity → burned cash → need investors. What do I do?",
  "Enterprise deal died when they sent a security questionnaire. Help me prevent that.",
  "20 minutes with a VC next Tuesday. They'll ask about security posture. I don't know what to say.",
];

const FOLLOWUP_CHIPS = [
  "Tell me more about the supply chain risks",
  "What does my investor timeline look like?",
  "Walk me through the enterprise DD checklist",
  "What should I fix first?",
];

// ── Main component ────────────────────────────────────────────────────────────
export const ChatInput = forwardRef(function ChatInput(
  { onSubmit, disabled, messages = [], onContextInject, value: valueProp, onChange: onChangeProp, mode = 'investor', onModeChange },
  ref
) {
  const hasExchange = messages.length >= 2;
  const chips = hasExchange ? FOLLOWUP_CHIPS : STARTER_CHIPS;

  const [inputValue, setInputValue] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const isControlled = valueProp !== undefined;
  const currentValue = isControlled ? valueProp : inputValue;
  const isEmpty = !currentValue.trim();

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

  const canSend = !disabled && !isEmpty;

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        border: `1.5px solid ${dragOver ? '#6366f1' : '#e5e7eb'}`,
        borderRadius: 16,
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        overflow: 'hidden',
      }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); }}
        onFocus={() => {}}
      >
        {/* Textarea */}
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

        {/* Suggested chips — inside the box, fade when typing */}
        <div style={{
          padding: '0 12px 8px',
          display: 'flex', gap: 6, flexWrap: 'wrap',
          maxHeight: isEmpty ? 80 : 0,
          overflow: 'hidden',
          opacity: isEmpty ? 1 : 0,
          transition: 'opacity 0.18s ease, max-height 0.2s ease',
        }}>
          {chips.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              style={{
                padding: '4px 10px', borderRadius: 12,
                border: '1px solid #f0f0f0', background: '#fafafa',
                color: '#9ca3af', fontSize: 11.5, cursor: 'pointer',
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 260,
                transition: 'border-color 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.color = '#9ca3af'; }}
            >{chip}</button>
          ))}
        </div>

        {/* Bottom bar — + | mode selector | space | send */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 10px 10px',
          gap: 6,
          borderTop: '1px solid #f3f4f6',
          paddingTop: 8,
        }}>
          <PlusMenu onSelect={onContextInject ?? (() => {})} />
          <ModeSelector mode={mode} onModeChange={onModeChange} />
          <div style={{ flex: 1 }} />
          <button
            type="submit"
            disabled={!canSend}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: canSend ? '#111827' : '#f3f4f6',
              border: 'none', cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s', flexShrink: 0,
            }}
          >
            <IconSend color={canSend ? '#ffffff' : '#d1d5db'} />
          </button>
        </div>
      </div>
    </form>
  );
});
