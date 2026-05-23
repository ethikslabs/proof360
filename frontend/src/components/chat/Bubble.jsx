import { tokens, PERSONA, personaColor } from '../../tokens.js';

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
      display: 'flex', alignItems: 'baseline', gap: 10,
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
      textTransform: 'uppercase', color, marginBottom: 8,
    }}>
      <span>{meta.label}</span>
      <span style={{
        fontWeight: 400, letterSpacing: '0.08em', textTransform: 'none',
        color: tk.inkSoft, fontStyle: 'italic',
        fontFamily: '"Instrument Serif", Georgia, serif',
        fontSize: 12, opacity: 0.8,
      }}>{meta.note}</span>
    </div>
  );

  const bodyStyle = {
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    fontSize: 15, lineHeight: 1.72, color: tk.ink, whiteSpace: 'pre-wrap',
    letterSpacing: '0.003em',
  };

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
        }}>{msg.content}</div>
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
        <div style={bodyStyle}>{msg.content}</div>
        {sourceEl}
        {crumbEl}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 26, paddingLeft: 16, borderLeft: `2px solid ${color}` }}>
      {labelEl}
      <div style={bodyStyle}>{msg.content}</div>
      {sourceEl}
      {crumbEl}
    </div>
  );
}
