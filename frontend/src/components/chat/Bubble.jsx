import { useState } from 'react';
import { tokens, PERSONA, personaColor } from '../../tokens.js';

const VENDOR_KEYWORDS = [
  { pattern: /\b(AWS|Amazon Web Services|AWS Activate|AWS Marketplace)\b/i, alt: 'AWS' },
  { pattern: /\b(Microsoft|Azure|Microsoft 365|Founders Hub)\b/i,           alt: 'Microsoft' },
  { pattern: /\bCloudflare\b/i,                                              alt: 'Cloudflare' },
  { pattern: /\bVanta\b/i,                                                   alt: 'Vanta' },
  { pattern: /\bCisco\b/i,                                                   alt: 'Cisco' },
  { pattern: /\b(Austbrokers|AustBrokers|Cyberpro)\b/i,                      alt: 'AustBrokers' },
  { pattern: /\bWholesale Investor\b/i,                                      alt: 'Wholesale Investor' },
  { pattern: /\b(EO Sydney|Entrepreneurs' Organisation)\b/i,                 alt: 'EO Sydney' },
  { pattern: /\bAustrade\b/i,                                                alt: 'Austrade' },
  { pattern: /\bRimon\b/i,                                                   alt: 'Rimon' },
  { pattern: /\bPrescient Security\b/i,                                      alt: 'Prescient Security' },
  { pattern: /\bArctic Wolf\b/i,                                             alt: 'Arctic Wolf' },
  { pattern: /\bCognitive View\b/i,                                          alt: 'Cognitive View' },
  { pattern: /\bAI Expert Group\b/i,                                         alt: 'AU AI Expert Group' },
  { pattern: /\bStripe\b/i,                                                  alt: 'Stripe' },
  { pattern: /\bMetronome\b/i,                                               alt: 'Metronome' },
  { pattern: /\b(UnityPac|Unity Assurance)\b/i,                             alt: 'UnityPac' },
  { pattern: /\bEnterprise S[Gg]\b/i,                                        alt: 'Enterprise SG' },
];

function detectVendors(content) {
  if (!content) return [];
  const found = new Set();
  for (const { pattern, alt } of VENDOR_KEYWORDS) {
    if (pattern.test(content)) found.add(alt);
  }
  return [...found];
}

function VendorChips({ content, onProgramFocus }) {
  const vendors = detectVendors(content);
  if (!vendors.length || !onProgramFocus) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
      {vendors.map(alt => (
        <button
          key={alt}
          onClick={() => onProgramFocus(alt)}
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
            color: '#a8651e', background: '#fdf3e3',
            border: '1px solid #e8c98a', borderRadius: 10,
            padding: '2px 8px', cursor: 'pointer',
          }}
        >↗ {alt}</button>
      ))}
    </div>
  );
}

const MODEL_PROVIDER = {
  'claude-sonnet-4-6': { label: 'Bedrock', color: '#c07a00' },
  'claude-opus-4-7':   { label: 'Bedrock', color: '#c07a00' },
  'claude-haiku-4-5':  { label: 'Bedrock', color: '#c07a00' },
  'llama-nemotron':               { label: 'NVIDIA',  color: '#527a00' },
  'nvidia/nemotron-ultra-253b':   { label: 'NVIDIA',  color: '#527a00' },
  'gemini-flash':      { label: 'Google',  color: '#1a56c2' },
  'perplexity-sonar':  { label: 'Live',    color: '#7c3aed' },
  'gpt-4o':            { label: 'Foundry', color: '#0063a8' },
};

const INLINE_PERSONAS = [
  { pattern: /\bSophia\b/g,   persona: 'sofia'    },
  { pattern: /\bLeonardo\b/g, persona: 'leonardo' },
  { pattern: /\bEdison\b/g,   persona: 'edison'   },
];

function parseContent(content) {
  if (!content) return [content];
  const combined = new RegExp(
    INLINE_PERSONAS.map(p => `(${p.pattern.source})`).join('|'), 'g'
  );
  const parts = [];
  let last = 0;
  let match;
  while ((match = combined.exec(content)) !== null) {
    if (match.index > last) parts.push(content.slice(last, match.index));
    const entry = INLINE_PERSONAS.find(p => new RegExp(p.pattern.source).test(match[0]));
    parts.push({ name: match[0], persona: entry?.persona });
    last = match.index + match[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return parts;
}

function PersonaTag({ name, persona, theme, tk, onPersonaRef }) {
  const [hovered, setHovered] = useState(false);
  const color = personaColor(persona, theme);
  const meta = PERSONA[persona];

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onPersonaRef?.(meta?.label || name)}
        style={{
          color, fontWeight: 650,
          borderBottom: `1.5px solid ${color}60`,
          paddingBottom: 1,
          cursor: 'pointer',
          transition: 'opacity 0.15s',
          opacity: hovered ? 0.75 : 1,
        }}
      >{name}</span>

      {hovered && meta && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          pointerEvents: 'none',
          minWidth: 200,
        }}>
          {/* Arrow */}
          <span style={{
            position: 'absolute', bottom: -5, left: '50%',
            transform: 'translateX(-50%)',
            width: 10, height: 10,
            background: tk.surface,
            border: `1px solid ${color}30`,
            borderTop: 'none', borderLeft: 'none',
            rotate: '45deg',
          }} />
          <span style={{
            display: 'block',
            background: tk.surface,
            border: `1px solid ${color}30`,
            borderRadius: 8,
            padding: '10px 13px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <span style={{
                background: color, borderRadius: 4, padding: '2px 8px',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: tk.surface,
              }}>{meta.label}</span>
              <span style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontStyle: 'italic', fontSize: 12, color: tk.inkSoft,
              }}>{meta.note}</span>
            </span>
            <span style={{
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: 12, color: tk.inkMid, lineHeight: 1.5,
              display: 'block',
            }}>{meta.bio}</span>
            <span style={{
              display: 'block', marginTop: 7,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: `${color}99`,
            }}>click to address {meta.label}</span>
          </span>
        </span>
      )}
    </span>
  );
}

function RichContent({ content, theme, tk, onPersonaRef }) {
  const parts = parseContent(content);
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === 'string') return part;
        return (
          <PersonaTag
            key={i}
            name={part.name}
            persona={part.persona}
            theme={theme}
            tk={tk}
            onPersonaRef={onPersonaRef}
          />
        );
      })}
    </>
  );
}

export function Bubble({ msg, t, isLatest, onPersonaRef, onProgramFocus }) {
  const tk = tokens(t.theme);

  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0 22px' }}>
        <div style={{
          maxWidth: 480, padding: '12px 18px',
          borderRadius: '14px 14px 3px 14px',
          background: tk.ink, color: tk.surface,
          fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
          fontSize: 14, lineHeight: 1.65, letterSpacing: '0.005em',
        }}>{msg.content}</div>
      </div>
    );
  }

  const meta = PERSONA[msg.persona];
  if (!meta) return null;
  const color = personaColor(msg.persona, t.theme);

  const labelEl = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        background: color, borderRadius: 5, padding: '3px 10px',
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: tk.surface,
      }}>{meta.label}</span>
      <span style={{
        fontFamily: '"Instrument Serif", Georgia, serif',
        fontStyle: 'italic', fontSize: 13,
        color: tk.inkSoft, opacity: 0.75,
      }}>{meta.note}</span>
    </div>
  );

  const bodyStyle = {
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    fontSize: 15, lineHeight: 1.72, color: tk.ink, whiteSpace: 'pre-wrap',
    letterSpacing: '0.003em',
  };

  const thinkingBody = !msg.content && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color, opacity: 0.5,
          display: 'inline-block',
          animation: `thinkpulse 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
      <style>{`@keyframes thinkpulse{0%,80%,100%{transform:scale(0.7);opacity:0.3}40%{transform:scale(1);opacity:0.8}}`}</style>
    </div>
  );

  const body = (
    <div style={bodyStyle}>
      {thinkingBody || <RichContent content={msg.content} theme={t.theme} tk={tk} onPersonaRef={onPersonaRef} />}
    </div>
  );

  const provider = MODEL_PROVIDER[msg.model];

  const crumbEl = msg.model && (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>
        {msg.model}
      </span>
      {provider && (
        <span style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: '"IBM Plex Mono", monospace',
          padding: '1px 6px', borderRadius: 4,
          color: provider.color,
          background: `${provider.color}18`,
          border: `1px solid ${provider.color}30`,
        }}>
          {provider.label}
        </span>
      )}
      {msg.tok && <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>{msg.tok?.toLocaleString()} tok</span>}
      {msg.ms && <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>{(msg.ms / 1000).toFixed(1)}s</span>}
    </div>
  );

  const sourcesEl = msg.sources?.length > 0 && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 9.5, color: '#c4b8a8', fontFamily: '"IBM Plex Mono", monospace' }}>from</span>
      {msg.sources.map(s => (
        <span key={s} style={{
          fontSize: 9, fontFamily: '"IBM Plex Mono", monospace',
          padding: '2px 6px', borderRadius: 4,
          background: '#f4f0e8', border: '1px solid #ddd6c8', color: '#7c6f5a',
        }}>{s}</span>
      ))}
    </div>
  );

  const sourceEl = msg.feedUrl && (
    <a href={msg.feedUrl} target="_blank" rel="noopener noreferrer" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
      color: tk.inkSoft, textDecoration: 'none',
      paddingBottom: 2, borderBottom: `1px solid ${tk.hairline}`,
    }}>
      <span style={{ width: 14, height: 1, background: color, display: 'inline-block' }} />
      {msg.feedSource}
    </a>
  );

  const vendorChips = <VendorChips content={msg.content} onProgramFocus={onProgramFocus} />;

  if (t.bubble === 'card') {
    return (
      <div style={{ marginBottom: 22 }}>
        {labelEl}
        <div style={{
          padding: '14px 18px', borderRadius: '2px 14px 14px 14px',
          background: `${color}11`, border: `1px solid ${color}26`, ...bodyStyle,
        }}>
          <RichContent content={msg.content} theme={t.theme} tk={tk} onPersonaRef={onPersonaRef} />
        </div>
        {sourceEl}
        {vendorChips}
        {crumbEl}
        {sourcesEl}
      </div>
    );
  }

  if (t.bubble === 'wash') {
    return (
      <div style={{
        marginBottom: 24,
        background: isLatest ? `${color}0c` : 'transparent',
        borderLeft: `2px solid ${isLatest ? color : 'transparent'}`,
        padding: isLatest ? '14px 18px 14px 16px' : '0',
        marginLeft: isLatest ? -18 : 0, marginRight: isLatest ? -18 : 0,
        borderRadius: 6,
        transition: 'background 0.6s ease, border-color 0.6s ease, padding 0.4s ease',
      }}>
        {labelEl}
        {body}
        {sourceEl}
        {vendorChips}
        {crumbEl}
        {sourcesEl}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 26, paddingLeft: 16, borderLeft: `2px solid ${color}` }}>
      {labelEl}
      {body}
      {sourceEl}
      {vendorChips}
      {crumbEl}
      {sourcesEl}
    </div>
  );
}
