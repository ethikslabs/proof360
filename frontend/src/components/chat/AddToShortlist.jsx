// AddToShortlist — discovery's ONE uniform action (John CTA-staging ruling 2026-08-23).
// One tap, no commitment: the item lands on the shortlist WITH its reason. The real
// per-vendor engage actions (apply / book / quote) live on the shortlist page, never
// here — discovery stays frictionless and one-thumbed.
import { createContext, useContext, useState } from 'react';

// Provided by Chat.jsx: { sessionId, shortlistedNames: Set<lowercase>, add(item) }
// Absent provider (isolated render) degrades to a no-op local ✓ so nothing breaks.
export const ShortlistContext = createContext(null);

export function AddToShortlist({ item, accent = '#0f766e', style = {} }) {
  const ctx = useContext(ShortlistContext);
  const [state, setState] = useState('idle'); // idle | busy | done
  const already = state === 'done'
    || ctx?.shortlistedNames?.has(item.name?.toLowerCase());

  const onClick = async (e) => {
    e.stopPropagation();
    if (already || state === 'busy') return;
    setState('busy');
    try {
      await ctx?.add?.(item);
      setState('done');
    } catch {
      setState('idle'); // add failed — button stays live, nothing pretended
    }
  };

  const base = {
    alignSelf: 'center',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 11,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    background: 'transparent',
    border: 'none',
    padding: '0 0 1px',
    cursor: already ? 'default' : 'pointer',
  };

  if (already) {
    // Caller style wins (a filled hero keeps its chip look; the label reads in its ink).
    return (
      <span style={{ ...base, color: '#22c55e', ...style }}>
        ✓ Shortlisted
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={state === 'busy'}
      style={{
        ...base,
        color: accent,
        borderBottom: `1px solid ${accent}66`,
        opacity: state === 'busy' ? 0.55 : 1,
        ...style,
      }}
    >
      {state === 'busy' ? 'Adding…' : '+ Add to shortlist'}
    </button>
  );
}
