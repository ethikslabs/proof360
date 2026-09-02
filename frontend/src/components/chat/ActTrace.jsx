// ActTrace — renders the cold read's narrated sequential acts, streamed from
// the API's session-log SSE ("the thinking"): each act a plain-speech header
// with its full working folded underneath, in the Claude Code accordion idiom.
// Honest degradation (INVARIANTS.md): renders exactly the lines the API
// sends — never an invented line, never a suppressed failure.
import { useState, useMemo, useRef, useEffect } from 'react';
import { VendorRow } from './VendorMarks.jsx';
import { stripEmphasis } from '../../rendering/stripEmphasis.js';

const COLORS = {
  ok: '#2f9b69',
  err: '#c84b4b',
  query: '#b0956e',
  muted: '#94a3b8',
};

const MONO = '"IBM Plex Mono", monospace';

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
        fontFamily: MONO,
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
          {line.type === 'blank' ? ' ' : stripEmphasis(line.text)}
        </div>
      ))}
    </div>
  );
}

// Act ids arrive in order of first appearance: perimeter, site, perplexity,
// gemini, correlate, corpus, reading. Any untagged line that isn't 'cmd' is a
// legacy/safety-net line and routes to the perimeter act's body.
export function partitionLines(lines) {
  let cmdLine = null;
  const order = [];
  const map = {};

  function getOrCreate(id, fallbackTitle) {
    if (!map[id]) {
      map[id] = { id, title: fallbackTitle ?? id, note: undefined, phase: undefined, body: [] };
      order.push(id);
    }
    return map[id];
  }

  for (const line of lines) {
    if (line.type === 'cmd') { cmdLine = line; continue; }

    if (line.type === 'act') {
      const act = getOrCreate(line.act, line.title);
      if (line.phase === 'start') {
        if (line.title !== undefined) act.title = line.title;
        act.note = line.note;
        act.phase = 'start';
      } else if (line.phase === 'done' || line.phase === 'skip' || line.phase === 'fail') {
        act.phase = line.phase;
        // note on done/skip/fail REPLACES the start note only when the event carries one.
        if (line.note !== undefined) act.note = line.note;
      }
      continue;
    }

    if (line.type === 'act_body') {
      const act = getOrCreate(line.act);
      act.body.push({ text: line.text, color: line.color });
      continue;
    }

    // Any other untagged line (legacy/safety) — perimeter's body is the catch-all.
    const act = getOrCreate('perimeter');
    act.body.push({ text: line.text, color: line.color ?? line.type });
  }

  // Display order is NOT arrival order (John, 2026-09-02). The perimeter scan is
  // fired first on purpose — its probes stream in the background while everything
  // else runs — but arriving first put "Perimeter scan" at the top of the founder's
  // screen, which announced a security tool before a word of the read was visible.
  //
  // What the founder sees FIRST is the product's claim about what it is. So:
  // holdings lead (the only step nobody else can run, and honestly framed — that
  // material predates the conversation), posture trails, synthesis closes.
  // Execution order stays untouched; only the rendering is reordered.
  const ranked = [...order].sort((a, b) => {
    const ra = DISPLAY_RANK[a] ?? DEFAULT_RANK;
    const rb = DISPLAY_RANK[b] ?? DEFAULT_RANK;
    if (ra !== rb) return ra - rb;
    return order.indexOf(a) - order.indexOf(b);   // stable within a rank
  });

  return { cmdLine, acts: ranked.map(id => map[id]) };
}

// Lower renders higher. Unlisted acts fall to DEFAULT_RANK, keeping arrival order
// among themselves and sitting above the posture/synthesis tail.
export const DISPLAY_RANK = {
  corpus:     10,   // what we already held — the differentiated step, leads
  site:       20,   // reading their public trail
  perplexity: 30,   // asking the live web
  gemini:     40,   // the second, independent read
  correlate:  50,   // correlating what every witness saw
  perimeter:  80,   // infrastructure and posture — last of the gathering steps
  reading:    90,   // writing your read — genuinely last, it is the output
};
const DEFAULT_RANK = 60;

export function ActTrace({ lines, done, composing = false, tk, showVendorMarks = false }) {
  const [userToggled, setUserToggled] = useState({});
  const scrollRefs = useRef({});

  const { cmdLine, acts } = useMemo(() => partitionLines(lines ?? []), [lines]);

  function isOpen(act) {
    if (Object.prototype.hasOwnProperty.call(userToggled, act.id)) return userToggled[act.id];
    // The perimeter act is the demoted background lane — collapsed by default
    // even while it is the active act; every other act auto-opens while active.
    if (act.id === 'perimeter') return false;
    // Finding 1 (whole-wave review): a dead stream (done=true) never demotes an
    // in-flight act out of 'start' — the stream just stopped updating it. Once
    // done, an orphaned act collapses like any other closed act (still
    // user-openable via the toggle below) instead of staying pinned open.
    if (done && act.phase === 'start') return false;
    return act.phase === 'start';
  }

  useEffect(() => {
    for (const act of acts) {
      if (act.phase === 'start' && isOpen(act)) {
        const el = scrollRefs.current[act.id];
        if (el) el.scrollTop = el.scrollHeight;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acts, userToggled]);

  if (!lines || lines.length === 0) return null;

  const shell = {
    border: `1px solid ${tk.hairline}`,
    borderRadius: 8,
    background: tk.bg,
    padding: '8px 10px',
    margin: '8px 0',
  };

  const hasActiveAct = acts.some(a => a.phase === 'start');
  const showComposingTail = composing && !hasActiveAct;

  function toggle(act) {
    setUserToggled(prev => ({ ...prev, [act.id]: !isOpen(act) }));
  }

  return (
    <div style={shell}>
      {cmdLine && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: tk.ink, marginBottom: 6 }}>
          {cmdLine.text}
        </div>
      )}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: tk.inkSoft, marginBottom: 6,
      }}>
        {done ? 'THE THINKING' : 'THE THINKING · live'}
      </div>
      {acts.map(act => {
        const open = isOpen(act);
        const hasBody = act.body.length > 0;
        // Finding 1: a dead stream leaves this act pulsing forever unless we
        // render it as orphaned — static and muted, never an invented failure
        // (ABSENCE RULE: the stream ended, that's all we know).
        const orphaned = done && act.phase === 'start';
        const glyph = orphaned ? '·'
          : act.phase === 'done' ? '✓'
          : act.phase === 'fail' ? '✗'
          : act.phase === 'skip' ? '↳'
          : '●';
        const glyphColor = orphaned ? COLORS.muted
          : act.phase === 'done' ? COLORS.ok
          : act.phase === 'fail' ? COLORS.err
          : act.phase === 'skip' ? COLORS.muted
          : COLORS.query;
        return (
          <div key={act.id} style={{ marginBottom: 4 }}>
            <div
              role={hasBody ? 'button' : undefined}
              tabIndex={hasBody ? 0 : undefined}
              onClick={hasBody ? () => toggle(act) : undefined}
              onKeyDown={hasBody ? (e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (e.key === ' ') e.preventDefault(); // Space must toggle the act, not scroll the page
                  toggle(act);
                }
              }) : undefined}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12,
                cursor: hasBody ? 'pointer' : 'default',
              }}
            >
              <span style={{
                width: 12, flexShrink: 0, color: glyphColor,
                animation: !orphaned && act.phase === 'start' ? 'fqPulse 1.6s ease-in-out infinite' : 'none',
              }}>
                {glyph}
              </span>
              <span style={{ color: tk.ink }}>
                {act.title}
                {act.note && <span style={{ color: tk.inkSoft }}> · {act.note}</span>}
                {/* Opt-in for the demo: name the services this step actually used.
                    Bound to what ran — an attempted engine shows dimmed, never hidden
                    and never as a success (truthful-engines ruling, logo layer). */}
                {showVendorMarks && <VendorRow act={act} tk={tk} />}
              </span>
              {hasBody && (
                <span style={{ color: tk.inkSoft, fontFamily: MONO, fontSize: 10 }}>
                  {open ? '▾' : '▸'}
                </span>
              )}
            </div>
            {open && hasBody && (
              <div style={{ marginTop: 4, marginLeft: 18 }}>
                <LineBlock
                  lines={act.body}
                  tk={tk}
                  scrollRef={el => { scrollRefs.current[act.id] = el; }}
                />
              </div>
            )}
          </div>
        );
      })}
      {showComposingTail && (
        <div style={{
          marginTop: 6,
          fontSize: 11,
          fontFamily: MONO,
          color: COLORS.query,
          animation: 'fqPulse 1.6s ease-in-out infinite',
        }}>
          {'● …'}
        </div>
      )}
    </div>
  );
}
