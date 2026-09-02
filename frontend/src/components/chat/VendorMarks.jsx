// The stack, shown. For the Sarvesh demo (John, 2026-09-02): "can we have the name and
// logo for stuff, like perplexity, gemini, bedrock can be anthropic and/or aws eg: haiku
// ... so that there is some tech brand weight behind it".
//
// The trace currently reads as though proof360 does all of this itself. It does not — it
// orchestrates four external services, and naming them is both more impressive and more
// honest than hiding them.
//
// TWO RULES THIS FILE EXISTS TO KEEP
//
// 1. A MARK IS BOUND TO WHAT ACTUALLY RAN. Never decoration. This extends the standing
//    truthful-engines ruling (only claim the engines that really answered) to the logo
//    layer: a brand shown for a service that did not fire is the same defect wearing a
//    better suit. An attempted-but-failed engine renders DIMMED and labelled, never
//    hidden and never as a success — the second read 404s regularly and pretending
//    otherwise would be inventing a witness.
//
// 2. THESE MARKS ARE PLACEHOLDERS, NOT THE OFFICIAL LOGOS. They are simple geometric
//    stand-ins drawn from memory so the layout, spacing and weight are real. Before this
//    ships to anyone outside the demo, replace `mark` with the official SVG from each
//    vendor's brand kit and check their trademark guidelines — attribution use is
//    normally fine, but each vendor sets its own rules on colour, spacing and lockup, and
//    an approximated logo looks worse than none. The registry below is the single place
//    to swap them.
//
// Off by default. `showVendorMarks` is opt-in so this is a demo choice, not a product
// decision — Sarvesh turns it on if he wants it.

const S = 11;

const Spark = () => (                       /* Gemini — four-pointed spark */
  <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 2c.6 5.2 4.2 8.8 9.4 9.4v1.2C16.2 13.2 12.6 16.8 12 22c-.6-5.2-4.2-8.8-9.4-9.4v-1.2C7.8 10.8 11.4 7.2 12 2z" fill="currentColor" />
  </svg>
);

const Smile = () => (                       /* AWS — the arc */
  <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M2.5 15.5c5.4 3.6 13.6 3.6 19-.4" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M18.5 15.6l3.6-.7-.9 3.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7" cy="8" r="2.1" fill="currentColor" />
    <circle cx="12.5" cy="8" r="2.1" fill="currentColor" />
    <circle cx="18" cy="8" r="2.1" fill="currentColor" />
  </svg>
);

const Burst = () => (                       /* Anthropic — radial glyph */
  <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

const Weave = () => (                       /* Perplexity — interlocking strokes */
  <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 3v18M4 7h6a4 4 0 010 8H4M20 7h-6a4 4 0 000 8h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Flame = () => (                       /* Firecrawl */
  <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 2c3.4 4 5.6 6.6 5.6 10a5.6 5.6 0 11-11.2 0c0-1.7.7-3.2 1.9-4.7.4 1.4 1.2 2.3 2.3 2.6C10.2 7.6 10.7 4.8 12 2z" fill="currentColor" />
  </svg>
);

const Stack = () => (                       /* CORPUS — ours, not a vendor */
  <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Swap `mark` for the official SVG from each vendor's brand kit before any live use. */
export const VENDORS = {
  gemini:     { name: 'Gemini',     color: '#4285f4', mark: Spark },
  perplexity: { name: 'Perplexity', color: '#20808d', mark: Weave },
  anthropic:  { name: 'Anthropic',  color: '#d97757', mark: Burst },
  aws:        { name: 'AWS',        color: '#ff9900', mark: Smile },
  firecrawl:  { name: 'Firecrawl',  color: '#e2562a', mark: Flame },
  corpus:     { name: 'CORPUS',     color: '#176577', mark: Stack, own: true },
};

/**
 * Which vendors an act ACTUALLY used. Derived from the act id and the note the backend
 * already writes, never from a hardcoded per-step guess — if the backend stops using an
 * engine, the mark stops appearing on its own.
 *
 * `attempted` means the call was made and did not succeed. It still shows, dimmed: the
 * second read 404s often, and hiding that would misrepresent what the machine did.
 */
export function vendorsForAct(act) {
  if (!act?.id) return [];
  const note = String(act.note ?? '').toLowerCase();
  const attempted = act.phase === 'fail' || act.phase === 'skip';
  const of = (keys) => keys.map((k) => ({ ...VENDORS[k], key: k, attempted }));

  switch (act.id) {
    case 'corpus':     return of(['corpus']);
    case 'site':       return of(['firecrawl']);
    case 'perplexity': return of(['perplexity']);
    case 'gemini':     return of(['gemini']);
    case 'correlate':
    case 'reading': {
      // The note is the source of truth here — "claude haiku · bedrock".
      const keys = [];
      if (note.includes('claude') || note.includes('haiku') || note.includes('sonnet')) keys.push('anthropic');
      if (note.includes('bedrock')) keys.push('aws');
      return of(keys);
    }
    default: return [];
  }
}

/** A row of small marks. Renders nothing when the act used no named service. */
export function VendorRow({ act, tk }) {
  const vendors = vendorsForAct(act);
  if (!vendors.length) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 2 }}>
      {vendors.map((v) => (
        <span
          key={v.key}
          title={v.attempted ? `${v.name} — attempted, did not answer` : v.name}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            color: v.attempted ? (tk?.inkGhost ?? '#b4b9c4') : v.color,
            opacity: v.attempted ? 0.65 : 1,
            fontSize: 10, letterSpacing: '0.02em', whiteSpace: 'nowrap',
          }}
        >
          <v.mark />
          <span>{v.name}</span>
        </span>
      ))}
    </span>
  );
}

export default VendorRow;
