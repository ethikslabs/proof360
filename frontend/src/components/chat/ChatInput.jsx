import { useState, useRef, forwardRef } from 'react';
import { useStt } from '../../hooks/useStt.js';


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
const IconDeepResearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7"/>
    <line x1="15.5" y1="15.5" x2="21" y2="21"/>
    <circle cx="10" cy="10" r="3" strokeWidth="1.3"/>
  </svg>
);
function IconConnector() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

// ── Brand logos ───────────────────────────────────────────────────────────────
const BrandLogo = ({ id, size = 18 }) => {
  const s = size;
  if (id === 'xero') return (
    <svg width={s} height={s} viewBox="0 0 18 18"><rect width="18" height="18" rx="3.5" fill="#1AB4D7"/><line x1="5.5" y1="5.5" x2="12.5" y2="12.5" stroke="white" strokeWidth="2.3" strokeLinecap="round"/><line x1="12.5" y1="5.5" x2="5.5" y2="12.5" stroke="white" strokeWidth="2.3" strokeLinecap="round"/></svg>
  );
  if (id === 'aws') return (
    <svg width={s} height={s} viewBox="0 0 18 18"><path d="M3.5 11.5 Q9 15 14.5 11.5" stroke="#FF9900" strokeWidth="2" fill="none" strokeLinecap="round"/><path d="M13 9.5 L14.5 11.5 L12.5 12" fill="#FF9900"/><path d="M4 8.5 Q9 4 14 8.5" stroke="#232F3E" strokeWidth="1.6" fill="none" strokeLinecap="round"/><path d="M6 5.5 L7.5 4 M11.5 5.5 L10 4" stroke="#232F3E" strokeWidth="1.4" strokeLinecap="round"/></svg>
  );
  if (id === 'github') return (
    <svg width={s} height={s} viewBox="0 0 18 18"><path d="M9 1a8 8 0 0 0-2.53 15.6c.4.07.55-.17.55-.38l-.01-1.33c-2.22.48-2.69-1.07-2.69-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.51.28-.87.51-1.07-1.77-.2-3.63-.89-3.63-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27 7.6 7.6 0 0 1 2 .27c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8 8 0 0 0 9 1z" fill="#24292e"/></svg>
  );
  if (id === 'm365') return (
    <svg width={s} height={s} viewBox="0 0 18 18"><rect x="1" y="1" width="7" height="7" rx="1" fill="#F25022"/><rect x="10" y="1" width="7" height="7" rx="1" fill="#7FBA00"/><rect x="1" y="10" width="7" height="7" rx="1" fill="#00A4EF"/><rect x="10" y="10" width="7" height="7" rx="1" fill="#FFB900"/></svg>
  );
  if (id === 'hubspot') return (
    <svg width={s} height={s} viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#FF7A59"/><circle cx="9" cy="4.5" r="1.5" fill="white"/><circle cx="9" cy="13.5" r="1.5" fill="white"/><circle cx="4.5" cy="9" r="1.5" fill="white"/><circle cx="13.5" cy="9" r="1.5" fill="white"/><circle cx="9" cy="9" r="2.5" fill="white"/></svg>
  );
  // Provider logos for model picker
  if (id === 'Bedrock') return (
    <svg width="14" height="10" viewBox="0 0 28 18"><path d="M2 14 Q14 18 26 14" stroke="#FF9900" strokeWidth="2.2" fill="none" strokeLinecap="round"/><path d="M24 11 L26 14 L23 15" fill="#FF9900"/><path d="M5 8 Q14 3 23 8" stroke="#232F3E" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
  );
  if (id === 'NVIDIA') return (
    <svg width="14" height="10" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#76B900"/><text x="14" y="13" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Arial,sans-serif">N</text></svg>
  );
  if (id === 'Google') return (
    <svg width="12" height="12" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
  );
  if (id === 'Live') return (
    <svg width="12" height="12" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#20808D"/><path d="M8 12 L10.5 7 L13 14 L15.5 10 L17 12" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (id === 'Foundry') return (
    <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2 L22 8 L22 16 L12 22 L2 16 L2 8 Z" fill="#0078D4"/><path d="M12 6 L18 9.5 L18 14.5 L12 18 L6 14.5 L6 9.5 Z" fill="#50E6FF" opacity="0.7"/></svg>
  );
  return null;
};

// ── Fixed-position dropdown helper ────────────────────────────────────────────
// Measures the trigger button and positions the menu in viewport space,
// so it floats freely above overflow:hidden parents.
function useDropdownPos(open) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);

  function openMenu() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - r.top + 6, left: r.left, spaceAbove: r.top - 8 });
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
    { id: 'aws-bill',      label: 'Add AWS bill',    Icon: IconCloud },
    { id: 'web-search',    label: 'Web search',       Icon: IconGlobe,        toggle: true, color: '#2563eb' },
    { id: 'deep-research', label: 'Deep research',    Icon: IconDeepResearch, toggle: true, color: '#7c3aed' },
  ],
];

function PlusMenu({ onSelect, activeModes = [], onToggleMode }) {
  const [open, setOpen] = useState(false);
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
                      if (item.toggle) { onToggleMode?.(item.id); }
                      else { onSelect(item.label); setOpen(false); }
                    }}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'center',
                      width: '100%', padding: '8px 14px',
                      background: 'none', border: 'none',
                      fontSize: 13, color: item.toggle && activeModes.includes(item.id) ? item.color : '#111827',
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ color: item.toggle && activeModes.includes(item.id) ? item.color : '#9ca3af', flexShrink: 0 }}>
                      <item.Icon />
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.toggle && activeModes.includes(item.id) && <span style={{ color: item.color }}><IconCheck /></span>}
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
            maxHeight: Math.max(200, pos.spaceAbove), overflowY: 'auto',
          }}>
            {['Bedrock', 'NVIDIA', 'Google', 'Live', 'Foundry'].map((provider, pi) => {
              const group = VECTOR_MODELS.filter(m => m.provider === provider);
              if (!group.length) return null;
              return (
                <div key={provider}>
                  {pi > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />}
                  <div style={{ padding: '4px 14px 2px', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BrandLogo id={provider} size={12} />
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
            <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BrandLogo id={item.id} size={18} /></span>
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
            <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BrandLogo id={item.id} size={18} /></span>
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
  { onSubmit, disabled, messages = [], onContextInject, value: valueProp, onChange: onChangeProp, mode = 'investor', onModeChange, hideChips, model, onModelChange, activeModes = [], onToggleMode },
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

  const { listening, toggle: toggleStt, supported: sttSupported } = useStt({
    onTranscript: (text) => {
      if (isControlled) onChangeProp?.(text);
      else setInputValue(text);
    },
  });

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
            placeholder={listening ? 'Listening…' : (messages?.length > 0 ? 'Ask a follow-up…' : "Paste your website, upload a deck, or describe what you’re building…")}
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

        {/* Active mode pills */}
        {activeModes.length > 0 && (
          <div style={{ display: 'flex', gap: 6, padding: '0 12px 6px', flexWrap: 'wrap' }}>
            {activeModes.map(id => {
              const item = PLUS_GROUPS.flat().find(i => i.id === id);
              if (!item) return null;
              return (
                <span key={id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '2px 8px 2px 7px', borderRadius: 12,
                  background: `${item.color}12`, border: `1px solid ${item.color}40`,
                  fontSize: 11, fontWeight: 600, color: item.color,
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                }}>
                  <item.Icon />
                  {item.label}
                  <button type="button" onClick={() => onToggleMode?.(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.color, padding: 0, lineHeight: 1, fontSize: 13, marginLeft: 1 }}>×</button>
                </span>
              );
            })}
          </div>
        )}

        {/* Bottom bar: + | mode | space | mic | send */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 10px 10px', paddingTop: 8,
          gap: 6,
          borderTop: '1px solid #f3f4f6',
        }}>
          <PlusMenu onSelect={onContextInject ?? (() => {})} activeModes={activeModes} onToggleMode={onToggleMode} />
          <ModelPicker model={model ?? 'claude-sonnet-4-6'} onModelChange={onModelChange ?? (() => {})} />
          <div style={{ flex: 1 }} />
          {/* Mic — STT */}
          <button
            type="button"
            title={sttSupported ? (listening ? 'Stop listening' : 'Speak your question') : 'Speech not supported'}
            onClick={sttSupported ? toggleStt : undefined}
            style={{
              width: 28, height: 28, borderRadius: 7,
              border: listening ? '1px solid #b0956e' : 'none',
              background: listening ? '#fff8f4' : 'transparent',
              color: listening ? '#b0956e' : '#d1d5db',
              cursor: sttSupported ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              animation: listening ? 'liveping 1.5s ease-in-out infinite' : 'none',
            }}
          >
            <IconMic />
          </button>
          <button
            type="submit"
            title="Send"
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
