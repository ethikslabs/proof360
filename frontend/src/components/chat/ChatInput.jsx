import { useState, useRef, forwardRef } from 'react';


// ── Icons ─────────────────────────────────────────────────────────────────────
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
const IconMic = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
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
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
);
function IconConnector() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

// ── Fixed-position dropdown helper ────────────────────────────────────────────
// Measures the trigger button and positions the menu in viewport space,
// so it floats freely above overflow:hidden parents.
function useDropdownPos(open) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);

  function openMenu() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - r.top + 6, left: r.left });
    }
  }
  return { btnRef, pos: open ? pos : null, openMenu };
}

// ── Plus menu ─────────────────────────────────────────────────────────────────
const PLUS_GROUPS = [
  [
    { id: 'files', label: 'Add files or deck',  Icon: IconPaperclip },
    { id: 'url',   label: 'Paste a URL',         Icon: IconLink },
  ],
  [
    { id: 'aws-bill', label: 'Add AWS bill',    Icon: IconCloud },
    { id: 'web',      label: 'Web search',       Icon: IconGlobe, toggle: true },
  ],
];

function PlusMenu({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [webOn, setWebOn] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [integrationEnabled, setIntegrationEnabled] = useState({ xero: true, aws: true, github: true });
  const { btnRef, pos, openMenu } = useDropdownPos(open);

  function toggle() {
    if (!open) openMenu();
    setOpen(o => !o);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
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

      {open && pos && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => { setOpen(false); setIntegrationsOpen(false); }} />
          <div style={{
            position: 'fixed',
            bottom: pos.bottom, left: pos.left,
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            padding: '6px 0', minWidth: 220, zIndex: 200,
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
                      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
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
            <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
            <button
              type="button"
              onClick={() => setIntegrationsOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 14px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center' }}><IconConnector /></span>
              <span style={{ flex: 1, fontSize: 12.5, color: '#111827' }}>Integrations</span>
              <span style={{ color: '#9ca3af', fontSize: 11 }}>›</span>
            </button>
          </div>
        </>
      )}
      {integrationsOpen && pos && (
        <IntegrationsFlyout
          pos={pos}
          onClose={() => { setIntegrationsOpen(false); setOpen(false); }}
          enabled={integrationEnabled}
          onToggle={(id) => setIntegrationEnabled(p => ({ ...p, [id]: !p[id] }))}
        />
      )}
    </>
  );
}

const INTEGRATIONS_CONNECTED = [
  { id: 'xero',   label: 'Xero',    icon: '📊', desc: 'Financial signals' },
  { id: 'aws',    label: 'AWS',     icon: '☁️', desc: 'Infrastructure · billing' },
  { id: 'github', label: 'GitHub',  icon: '🐙', desc: 'Codebase signals' },
];
const INTEGRATIONS_AVAILABLE = [
  { id: 'm365',    label: 'Microsoft 365', icon: '📧' },
  { id: 'hubspot', label: 'HubSpot',       icon: '🟠' },
];

const VECTOR_MODELS = [
  { id: 'claude-sonnet-4-6',  label: 'Claude Sonnet 4.6', desc: 'Balanced · everyday work',    provider: 'Bedrock',  providerColor: '#c07a00' },
  { id: 'claude-opus-4-7',    label: 'Claude Opus 4.7',   desc: 'Most capable · deep analysis', provider: 'Bedrock',  providerColor: '#c07a00' },
  { id: 'claude-haiku-4-5',   label: 'Claude Haiku 4.5',  desc: 'Fast · low latency',           provider: 'Bedrock',  providerColor: '#c07a00' },
  { id: 'llama-nemotron',     label: 'Llama Nemotron',    desc: '253B · open weights',          provider: 'NVIDIA',   providerColor: '#527a00' },
  { id: 'gemini-flash',       label: 'Gemini 2.0 Flash',  desc: 'Fast · multimodal',            provider: 'Google',   providerColor: '#1a56c2' },
  { id: 'perplexity-sonar',   label: 'Perplexity Sonar',  desc: 'Real-time · cited sources',    provider: 'Live',     providerColor: '#7c3aed' },
  { id: 'gpt-4o',             label: 'GPT-4o',            desc: 'OpenAI · via Azure',           provider: 'Foundry',  providerColor: '#0063a8' },
];

function ModelPicker({ model, onModelChange }) {
  const [open, setOpen] = useState(false);
  const [adaptive, setAdaptive] = useState(false);
  const { btnRef, pos, openMenu } = useDropdownPos(open);
  const current = VECTOR_MODELS.find(m => m.id === model) ?? VECTOR_MODELS[0];

  function toggle() {
    if (!open) openMenu();
    setOpen(o => !o);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 8px', borderRadius: 7,
          border: '1px solid #e5e7eb',
          background: open ? '#f3f4f6' : 'transparent',
          cursor: 'pointer', fontSize: 11, fontWeight: 600,
          color: '#374151', fontFamily: '"IBM Plex Mono", monospace',
          whiteSpace: 'nowrap', flexShrink: 0,
          transition: 'background 0.12s',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: current.providerColor, flexShrink: 0, display: 'inline-block' }} />
        {current.label}
        <span style={{ color: '#9ca3af', fontSize: 9 }}>▾</span>
      </button>

      {open && pos && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed',
            bottom: pos.bottom, left: pos.left,
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            padding: '6px 0', minWidth: 260, zIndex: 200,
          }}>
            {['Bedrock', 'NVIDIA', 'Google', 'Live', 'Foundry'].map((provider, pi) => {
              const group = VECTOR_MODELS.filter(m => m.provider === provider);
              if (!group.length) return null;
              return (
                <div key={provider}>
                  {pi > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />}
                  <div style={{ padding: '4px 14px 2px', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>
                    {provider}
                  </div>
                  {group.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { onModelChange(m.id); setOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '8px 14px',
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {m.label}
                          {m.id === model && <span style={{ color: '#b0956e' }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
            <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fafafa' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827' }}>Adaptive thinking</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Extended reasoning for complex questions</div>
              </div>
              <div
                onClick={() => setAdaptive(a => !a)}
                style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: adaptive ? '#b0956e' : '#e5e7eb',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: adaptive ? 19 : 3,
                  width: 14, height: 14, borderRadius: 7, background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function IntegrationsFlyout({ pos, onClose, enabled, onToggle }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={onClose} />
      <div style={{
        position: 'fixed',
        bottom: pos.bottom, left: (pos.left ?? 0) + 230,
        background: '#ffffff', border: '1px solid #e5e7eb',
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        padding: '6px 0', minWidth: 240, zIndex: 201,
      }}>
        <div style={{ padding: '4px 14px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>Connected</div>
        {INTEGRATIONS_CONNECTED.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827' }}>{item.label}</div>
              <div style={{ fontSize: 10.5, color: '#9ca3af' }}>{item.desc}</div>
            </div>
            <div
              onClick={() => onToggle(item.id)}
              style={{
                width: 34, height: 18, borderRadius: 9,
                background: enabled[item.id] ? '#b0956e' : '#e5e7eb',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 2,
                left: enabled[item.id] ? 18 : 2,
                width: 14, height: 14, borderRadius: 7, background: '#fff',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
        ))}
        <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
        <div style={{ padding: '4px 14px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4b8a8', fontFamily: '"IBM Plex Mono", monospace' }}>Not connected</div>
        {INTEGRATIONS_AVAILABLE.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', opacity: 0.7 }}>
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#111827' }}>{item.label}</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#b0956e', cursor: 'pointer' }}>Connect →</span>
          </div>
        ))}
        <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
        <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', fontSize: 12.5, color: '#b0956e', cursor: 'pointer', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
          <span>+</span> Add connector
        </button>
      </div>
    </>
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
  fontSize: 14, lineHeight: 1.6,
  padding: '12px 16px 4px',
};

function MentionMirror({ value }) {
  const parts = parseMentions(value);
  return (
    <div style={{
      ...INPUT_STYLE, position: 'absolute', top: 0, left: 0, right: 0,
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

// ── Chips ─────────────────────────────────────────────────────────────────────
const STARTER_CHIPS = [
  "Manuka honey brand, King's Cross → global opportunity → burned cash → need investors. What do I do?",
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
  { onSubmit, disabled, messages = [], onContextInject, value: valueProp, onChange: onChangeProp, mode = 'investor', onModeChange, hideChips, model, onModelChange },
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
      }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); }}
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
            rows={2}
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

        {/* Suggested chips — visible when box is empty, slide away when typing */}
        {!hideChips && <div style={{
          padding: '0 12px 8px',
          display: 'flex', gap: 6, flexWrap: 'wrap',
          maxHeight: isEmpty ? 60 : 0,
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
                maxWidth: 260, transition: 'border-color 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.color = '#9ca3af'; }}
            >{chip}</button>
          ))}
        </div>}

        {/* Bottom bar: + | mode | space | mic | send */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 10px 10px', paddingTop: 8,
          gap: 6,
          borderTop: '1px solid #f3f4f6',
        }}>
          <PlusMenu onSelect={onContextInject ?? (() => {})} />
          <ModelPicker model={model ?? 'claude-sonnet-4-6'} onModelChange={onModelChange ?? (() => {})} />
          <div style={{ flex: 1 }} />
          {/* Mic — press to hold STT (subtle, wired later) */}
          <button
            type="button"
            title="Hold to speak"
            style={{
              width: 28, height: 28, borderRadius: 7,
              border: 'none', background: 'transparent',
              color: '#d1d5db', cursor: 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconMic />
          </button>
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
