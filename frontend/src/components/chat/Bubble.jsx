import { useState } from 'react';
import { tokens, PERSONA, personaColor } from '../../tokens.js';

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

export function Bubble({ msg, t, isLatest, onPersonaRef }) {
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

  const body = (
    <div style={bodyStyle}>
      <RichContent content={msg.content} theme={t.theme} tk={tk} onPersonaRef={onPersonaRef} />
    </div>
  );

  const crumbEl = msg.model && (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      gap: 8, marginTop: 8, opacity: 0.45,
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      fontSize: 9, letterSpacing: '0.1em', color: tk.inkSoft,
    }}>
      <span>{msg.model}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>{msg.tok?.toLocaleString()} tok</span>
      {msg.ms && (
        <>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{(msg.ms / 1000).toFixed(1)}s</span>
        </>
      )}
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
        {crumbEl}
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
        {crumbEl}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 26, paddingLeft: 16, borderLeft: `2px solid ${color}` }}>
      {labelEl}
      {body}
      {sourceEl}
      {crumbEl}
    </div>
  );
}
