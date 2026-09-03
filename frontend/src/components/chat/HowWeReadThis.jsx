// "How we read this" — the working behind the reading, revealed by choice.
//
// John's ruling 2026-08-26: no numbers. A founder handed 15/100 feels marked,
// and the landing emotional contract has forbidden the grading rubric since
// 2026-05-18. But the arithmetic is not worthless — it is how the machine
// actually reasons, and in a lab that is the interesting part. So the number is
// not deleted. It is demoted to something somebody chooses to open, labelled as
// method: "that is all progressive decision based reveal".
//
// Workshop 2026-09-03: this used to be a four-rung ladder of its own (closed →
// what counted → why it counted → the arithmetic), mounted beside the reading —
// a third disclosure level on the branch whose cap is two. It is now ONE gesture
// that opens the Inspector, the single level-2 surface every road opens:
//   Who said so   the gaps that carried weight, each with its reasoning
//   The receipt   the arithmetic, labelled for what it is — method, not a mark
//   Your move     what would change it
// Both rulings hold: the number is still there, still chosen, still labelled;
// and there is no level 3.
//
// Nothing here invents: every line is derived from the gaps the engine actually
// triggered, and a gap with no weight is not listed as though it had one.

const STARTING_POINT = 100;
const MONO = '"IBM Plex Mono", monospace';

function weightOf(gap) {
  return Number.isFinite(gap?.score_impact) ? gap.score_impact : 0;
}

// The reading as an Inspector subject. Pure: derived from the ledger, never stored.
export function readingInspection({ gaps, trustScore }) {
  const counted = (gaps || []).filter((g) => weightOf(g) > 0);
  const subtracted = counted.reduce((sum, g) => sum + weightOf(g), 0);
  const remainder = Number.isFinite(trustScore) ? trustScore : Math.max(0, STARTING_POINT - subtracted);
  const name = (g) => g.title || g.label || g.gap_id || g.id;

  return {
    subject: {
      kind: 'reading',
      label: 'How we read this',
      value: counted.length === 0
        ? 'Nothing counted against you in this reading.'
        : `${counted.length} ${counted.length === 1 ? 'gap' : 'gaps'} carried weight.`,
      confirmation: 'method',
    },
    // Rungs 1 + 2, one surface, two facts per row: what counted, and why.
    observations: counted.map((g) => ({
      source: 'the reading',
      value: name(g),
      excerpt: g.why || null,
    })),
    // Rung 3, where the Inspector already puts method: the receipt. Labelled there as
    // "what ran, not why it's right"; here each line says what was subtracted.
    acts: counted.length === 0 ? [] : [
      { phase: 'ok', title: 'Starting point — how the arithmetic works, not a measurement of your company', note: String(STARTING_POINT) },
      ...counted.map((g) => ({ phase: 'ok', title: name(g), note: `− ${weightOf(g)}` })),
      { phase: 'ok', title: 'What is left — visible from outside, on the day we looked', note: String(remainder) },
    ],
    disconfirmer: counted.length === 0
      ? null
      : 'Close any of these and the arithmetic changes. It can only ever describe what is visible from outside, on the day we looked.',
  };
}

export function HowWeReadThis({ gaps, trustScore, tk, onOpen }) {
  const soft = tk?.inkSoft ?? '#94a3b8';
  return (
    <div style={{ margin: '2px 0 10px 44px', maxWidth: 560 }}>
      <button
        type="button"
        onClick={() => onOpen?.(readingInspection({ gaps, trustScore }))}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '4px 0', fontFamily: MONO, fontSize: 10.5,
          letterSpacing: '0.08em', color: soft, textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        How we read this →
      </button>
    </div>
  );
}

export default HowWeReadThis;
