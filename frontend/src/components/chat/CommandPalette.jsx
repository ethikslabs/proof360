// ⌘K — the reason a dense product can have a calm surface.
//
// The research answer to "how do Linear/Stripe/Vercel stay legible while carrying that
// much": not a layout. A command palette. It flattens the hierarchy for the expert while
// the VISUAL hierarchy stays shallow for the novice — so nothing has to be permanently
// on screen in order to be reachable, which is what lets level 1 hold only the reading.
//
// It is also the right call for this product specifically, for a reason no research
// could know: John is CLI-native — "commands not click paths". A founder gets the quiet
// surface; an operator types. One component serves both, and neither is compromised for
// the other.
//
// ACCESSIBILITY CONTRACT (W3C APG, Modal Dialog pattern) — a palette is a dialog, not a
// disclosure, and the difference is enforceable: aria-modal, focus moves inside on open,
// Tab and Shift+Tab are trapped, Escape closes, and focus RETURNS to whatever invoked
// it. The last one is the one everybody forgets and the one a keyboard user notices.
import { useEffect, useMemo, useRef, useState } from 'react';
import { rankCommands } from '../../rendering/commandMatch.js';

// The palette is a mount, not a visibility toggle. Fresh query and cursor come from a
// fresh mount rather than an effect that resets them — which is the idiomatic React
// answer AND avoids the cascading-render class of bug that resetting-in-effect causes.
export function CommandPalette({ open, onClose, commands = [], tk }) {
  if (!open) return null;
  return <PaletteBody onClose={onClose} commands={commands} tk={tk} />;
}

function PaletteBody({ onClose, commands, tk }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const invokerRef = useRef(null);

  const results = useMemo(() => rankCommands(commands, query), [commands, query]);
  // Clamp rather than reset-on-change: the cursor stays valid as results shrink,
  // without a second state write per keystroke.
  const active = Math.min(cursor, Math.max(results.length - 1, 0));

  useEffect(() => {
    // Remember who had focus, so it can be handed back on close (APG: focus return).
    invokerRef.current = document.activeElement;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      // Guarded: the invoker may have unmounted while the palette was up.
      const el = invokerRef.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    };
  }, []);

  const run = (cmd) => { onClose?.(); cmd?.run?.(); };

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(Math.min(active + 1, results.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(Math.max(active - 1, 0)); return; }
    if (e.key === 'Enter')     { e.preventDefault(); run(results[active]); return; }
    // Focus trap. One input and one list, so the trap is: keep focus on the input.
    if (e.key === 'Tab') { e.preventDefault(); inputRef.current?.focus(); }
  }

  const groups = [];
  for (const cmd of results) {
    const name = cmd.group ?? '';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(cmd);
    else groups.push({ name, items: [cmd] });
  }

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(28,28,30,0.32)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Commands"
        onKeyDown={onKeyDown}
        style={{
          width: 'min(560px, 92vw)', maxHeight: '62vh',
          display: 'flex', flexDirection: 'column',
          background: tk.surface, border: `1px solid ${tk.hairStrong}`,
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 18px 60px rgba(0,0,0,0.22)',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command…"
          aria-label="Type a command"
          // Sans, not the display serif: this is the machine listening, not something
          // being read. The serif stays in the reading lane.
          style={{
            border: 'none', borderBottom: `1px solid ${tk.hairline}`,
            padding: '14px 16px', fontSize: 15, outline: 'none',
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            color: tk.ink, background: 'transparent',
          }}
        />

        <div role="listbox" aria-label="Commands" style={{ overflowY: 'auto', padding: '6px 0' }}>
          {results.length === 0 && (
            // Honest empty state: says what happened, offers no consolation prize.
            <div style={{
              padding: '18px 16px', fontSize: 12.5, color: tk.inkSoft,
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            }}>Nothing matches “{query}”.</div>
          )}

          {groups.map((g) => (
            <div key={g.name || 'ungrouped'}>
              {g.name && (
                <div style={{
                  padding: '8px 16px 4px',
                  fontFamily: '"IBM Plex Mono", monospace', fontSize: 9,
                  letterSpacing: '0.14em', textTransform: 'uppercase', color: tk.inkSoft,
                }}>{g.name}</div>
              )}
              {g.items.map((cmd) => {
                const i = results.indexOf(cmd);
                const isActive = i === active;
                return (
                  <div
                    key={cmd.id}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setCursor(i)}
                    onMouseDown={(e) => { e.preventDefault(); run(cmd); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px', cursor: 'pointer',
                      background: isActive ? tk.bgTint : 'transparent',
                      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                      fontSize: 13, color: tk.ink,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>{cmd.label}</span>
                    {cmd.hint && (
                      <span style={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 10, color: tk.inkSoft, flexShrink: 0,
                      }}>{cmd.hint}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
