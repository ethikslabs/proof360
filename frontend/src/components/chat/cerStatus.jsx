import { FONT } from '../../tokens.js';

// Status → colour, resolved against the active theme tokens (no raw hex). The CER
// accent is the master-template purple (tk.plum); the wireframe's --purple maps to it.
export function cerStatusColors(status, tk) {
  const map = {
    Submitted: { fg: tk.plum, dot: tk.plum },
    'Under review': { fg: tk.umber, dot: tk.umber },
    'Needs info': { fg: tk.umber, dot: tk.sevMed },
    Booked: { fg: tk.sevOk, dot: tk.sevOk },
    Closed: { fg: tk.inkSoft, dot: tk.inkGhost },
    // forming pseudo-states used by the build card / in-progress facet
    forming: { fg: tk.umber, dot: tk.umber },
    'not created yet': { fg: tk.plum, dot: tk.plum },
  };
  return map[status] || map.Submitted;
}

// Pill status badge — mono, uppercase, small led dot. Matches the wireframe's .b-* pills.
export function CerBadge({ status, label, tk }) {
  const c = cerStatusColors(status, tk);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: FONT.mono,
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: c.fg,
        background: tk.surface,
        border: `1px solid ${c.fg}`,
        borderRadius: 20,
        padding: '2px 8px',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {label || status}
    </span>
  );
}
