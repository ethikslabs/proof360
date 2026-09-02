// The demo/workspace boundary, made a control instead of a caption.
//
// INVARIANTS.md §4 has always required it: "These two states must be visually distinct
// at all times. The user never confuses which one they are looking at." What shipped was
// a caption — and captions stop being seen by the third session. Worse, the caption read
// "reference founder — funded, attested": our two strongest truth words, on a record
// canon itself describes as "domain purchased, product fictional".
//
// A switch is different in kind. It is always visible, it says which state you are in
// without being read, and it can be flipped — so the boundary is something the viewer
// operates rather than something they are told about and forget.
//
// It never silently lies about a live session: once real work exists the switch is
// disabled and reads LIVE, because at that point the state is a fact, not a preference.

export function SimulationSwitch({ on, onToggle, locked = false, tk }) {
  const label = locked ? 'Live' : on ? 'Simulation' : 'Live';
  // Amber is the demo colour throughout (INVARIANTS §4). Live borrows nothing from it.
  const accent = on && !locked ? '#b0742a' : tk.inkSoft;
  const track  = on && !locked ? '#f0dcb8' : tk.bgTint;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on && !locked}
      aria-label={locked
        ? 'Simulation mode off — a live read is in progress'
        : on
          ? 'Simulation mode on — showing an example company. Switch to your own workspace.'
          : 'Simulation mode off — this is your workspace. Switch to the example company.'}
      disabled={locked}
      onClick={locked ? undefined : onToggle}
      title={locked ? 'A live read is running — this is your own record' : 'Show the worked example, or your own record'}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '3px 10px 3px 5px',
        borderRadius: 14,
        border: `1px solid ${on && !locked ? '#dcbe8e' : tk.hairline}`,
        background: 'transparent',
        cursor: locked ? 'default' : 'pointer',
        opacity: locked ? 0.55 : 1,
      }}
    >
      <span style={{
        width: 26, height: 14, borderRadius: 8, background: track,
        border: `1px solid ${on && !locked ? '#dcbe8e' : tk.hairline}`,
        display: 'inline-flex', alignItems: 'center',
        justifyContent: on && !locked ? 'flex-end' : 'flex-start',
        padding: 1, flexShrink: 0, transition: 'justify-content 0.15s',
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%', background: accent, display: 'block',
        }} />
      </span>
      <span style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: accent, whiteSpace: 'nowrap',
      }}>{label}</span>
    </button>
  );
}

export default SimulationSwitch;
