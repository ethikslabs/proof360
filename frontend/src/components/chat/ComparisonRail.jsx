// The rail, doing the job John says it was always for.
//
// John, 2026-09-02: "this side panel was always about how to see a comparison."
//
// What it was: two accordions stacked, the worked example open with six sub-items and
// a stage timeline, the live company collapsed underneath to a single line. Two
// containers, no comparison — you could not see the two things at once, which is the
// only way a comparison exists.
//
// What it is now: ONE set of rows, both companies on each row. The example's column is
// the reference; yours fills in beside it.
//
// THE REGISTER, and it is the whole design (docs/design/landing-emotional-contract.md):
// this compares WHAT IS PRESENT, never a score. Two scores side by side is a grade, and
// "the founder never feels evaluated" is the contract's hardest line. Two states of
// fullness side by side is a lamp — the contract's own bottom-shelf pattern, where
// greyed tiles say "this will fill in as we learn about you". The reference is what a
// filled record looks like. Nothing here says you are behind; it says there is a room
// you have not walked into yet, which is the thing a founder can act on.
//
// Consequence, stated so nobody re-adds it later: no numbers are compared, no deltas
// are computed, nothing is coloured red, and there is no word for "worse".

// Keys are the estate's own SPACES ids, so this is a drop-in for the rail it replaces
// and a row cannot silently stop matching its data.
export const ROWS = [
  { key: 'investor',  label: 'Investor readiness' },
  { key: 'vendors',   label: 'Vendors' },
  { key: 'aws',       label: 'AWS programs' },
  { key: 'microsoft', label: 'Microsoft programs' },
  { key: 'posture',   label: 'Posture' },
  { key: 'spv',       label: 'SPV' },
];

// Three states only. Deliberately not a percentage: a percentage invites comparison of
// magnitude, which is the grading move this component exists to avoid.
const FULLNESS = { empty: 0, partial: 1, filled: 2 };

function fullnessOf(entry) {
  if (!entry) return 'empty';
  if (entry.filled) return 'filled';
  if (entry.present) return 'partial';
  return 'empty';
}

function Pip({ state, tone, tk }) {
  const size = 6;
  const filled = state === 'filled';
  const partial = state === 'partial';
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: filled ? tone : partial ? `${tone}66` : 'transparent',
        border: filled ? 'none' : `1px solid ${partial ? tone : tk.hairStrong}`,
        display: 'inline-block',
      }}
    />
  );
}

/**
 * @param subject  { name, entries } — whose record is the subject (follows the switch)
 * @param peer     { name, entries } — the other one, shown as reference
 * @param subjectIsExample  which side carries the §4 example treatment
 */
export function ComparisonRail({ subject, peer, subjectIsExample = false, onOpenRow, tk }) {
  // Amber is the example's colour everywhere (INVARIANTS §4); the live record takes the
  // house accent. The two are never the same hue, at any width, in either arrangement.
  const EXAMPLE = '#b0742a';
  const subjectTone = subjectIsExample ? EXAMPLE : tk.plum;
  const peerTone    = subjectIsExample ? tk.plum : EXAMPLE;

  const head = (label, tone, isExample) => (
    <div style={{ minWidth: 0 }}>
      {isExample && (
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace', fontSize: 7.5,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: EXAMPLE, marginBottom: 2,
        }}>Example</div>
      )}
      <div style={{
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 9,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: tone, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</div>
    </div>
  );

  return (
    <div style={{ padding: '10px 12px 14px' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto',
        gap: '0 10px', alignItems: 'end', marginBottom: 8,
        paddingBottom: 6, borderBottom: `1px solid ${tk.hairline}`,
      }}>
        <span />
        {head(subject?.name ?? 'You', subjectTone, subjectIsExample)}
        {head(peer?.name ?? '—', peerTone, !subjectIsExample)}
      </div>

      {ROWS.map((row) => {
        const mine   = fullnessOf(subject?.entries?.[row.key]);
        const theirs = fullnessOf(peer?.entries?.[row.key]);
        // The only thing we ever "light": a row where the reference has something and
        // the subject does not yet. Not a failure — an unopened room.
        const unopened = FULLNESS[mine] < FULLNESS[theirs];
        return (
          <button
            key={row.key}
            type="button"
            onClick={() => onOpenRow?.(row.key)}
            style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto',
              gap: '0 10px', alignItems: 'center', width: '100%',
              background: 'none', border: 'none', cursor: onOpenRow ? 'pointer' : 'default',
              padding: '6px 0', textAlign: 'left',
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            }}
          >
            <span style={{
              fontSize: 11.5,
              color: unopened ? tk.ink : tk.inkMid,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{row.label}</span>
            <span style={{ display: 'flex', justifyContent: 'center', width: 18 }}>
              <Pip state={mine} tone={subjectTone} tk={tk} />
            </span>
            <span style={{ display: 'flex', justifyContent: 'center', width: 18 }}>
              <Pip state={theirs} tone={peerTone} tk={tk} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ComparisonRail;
