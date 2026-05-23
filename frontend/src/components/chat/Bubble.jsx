import { tokens, PERSONA, personaColor } from '../../tokens.js';

// Persona names that can appear in body text
const INLINE_PERSONAS = [
  { pattern: /\bSophia\b/g,   persona: 'sofia'    },
  { pattern: /\bLeonardo\b/g, persona: 'leonardo' },
  { pattern: /\bEdison\b/g,   persona: 'edison'   },
];

// Split content into text segments and persona-name spans
function parseContent(content, theme) {
  if (!content) return [content];

  // Build a single combined regex with named groups
  const combined = new RegExp(
    INLINE_PERSONAS.map(p => `(${p.pattern.source})`).join('|'),
    'g'
  );

  const parts = [];
  let last = 0;
  let match;

  while ((match = combined.exec(content)) !== null) {
    if (match.index > last) parts.push(content.slice(last, match.index));

    const matchedName = match[0];
    const persona = INLINE_PERSONAS.find(p =>
      new RegExp(p.pattern.source).test(matchedName)
    );
    parts.push({ name: matchedName, persona: persona?.persona });
    last = match.index + matchedName.length;
  }

  if (last < content.length) parts.push(content.slice(last));
  return parts;
}

function RichContent({ content, theme, tk }) {
  const parts = parseContent(content, theme);
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === 'string') return part;
        const c = personaColor(part.persona, theme);
        return (
          <span key={i} style={{
            color: c, fontWeight: 650,
            borderBottom: `1.5px solid ${c}60`,
            paddingBottom: 1,
          }}>{part.name}</span>
        );
      })}
    </>
  );
}

export function Bubble({ msg, t, isLatest }) {
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
    }}>
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
      <RichContent content={msg.content} theme={t.theme} tk={tk} />
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
          <RichContent content={msg.content} theme={t.theme} tk={tk} />
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
