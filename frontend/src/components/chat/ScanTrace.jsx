// ScanTrace — renders the real per-probe extraction log streamed from the
// API's session-log SSE during a live cold read ("show the thinking").
// Honest degradation (INVARIANTS.md): renders exactly the lines the API
// sends — failed/skipped probes shown as failed/skipped, never suppressed.
import { useState, useEffect, useRef } from 'react';

const COLORS = {
  ok: '#2f9b69',
  err: '#c84b4b',
  query: '#b0956e',
  muted: '#94a3b8',
};

function lineColor(line, tk) {
  const key = line.color ?? line.type;
  if (key === 'cmd') return tk.ink;
  return COLORS[key] ?? COLORS.muted;
}

function LineBlock({ lines, tk, scrollRef }) {
  return (
    <div
      ref={scrollRef}
      style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 11,
        lineHeight: 1.6,
        maxHeight: 200,
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ color: lineColor(line, tk) }}>
          {line.type === 'blank' ? ' ' : line.text}
        </div>
      ))}
    </div>
  );
}

export function ScanTrace({ lines, done, tk }) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!done && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, done]);

  if (!lines || lines.length === 0) return null;

  const shell = {
    border: `1px solid ${tk.hairline}`,
    borderRadius: 8,
    background: tk.bg,
    padding: '8px 10px',
    margin: '8px 0',
  };

  if (!done) {
    return (
      <div style={shell}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: tk.inkSoft, marginBottom: 6,
        }}>
          SCANNING · live
        </div>
        <LineBlock lines={lines} tk={tk} scrollRef={scrollRef} />
      </div>
    );
  }

  const stepCount = lines.filter(l => l.type !== 'blank' && l.type !== 'cmd').length;

  return (
    <div style={shell}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); }}
        style={{
          fontSize: 11, color: tk.inkSoft, cursor: 'pointer',
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      >
        {open ? '▾' : '▸'} Scan trace · {stepCount} steps
      </div>
      {open && (
        <div style={{ marginTop: 6 }}>
          <LineBlock lines={lines} tk={tk} scrollRef={scrollRef} />
        </div>
      )}
    </div>
  );
}
