// "How we read this" — the working behind the reading, revealed by choice.
//
// John's ruling 2026-08-26: no numbers. A founder handed 15/100 feels marked,
// and the landing emotional contract has forbidden the grading rubric since
// 2026-05-18. But the arithmetic is not worthless — it is how the machine
// actually reasons, and in a lab that is the interesting part. So the number is
// not deleted. It is demoted to the bottom rung of a ladder somebody chooses to
// climb: "that is all progressive decision based reveal".
//
// Rung 0  closed          nothing. A founder who never opens this is never graded.
// Rung 1  what counted    the gaps that carried weight, named.
// Rung 2  why it counted  one gap's reasoning at a time.
// Rung 3  the arithmetic  the subtractions and what is left, labelled as method.
//
// Deliberately the same affordance as OurWorking (the corpus curtain) — one
// gesture, two ledgers. This one collapses REASONING; that one collapses
// RETRIEVAL. Neither invents: every line here is derived from the gaps the
// engine actually triggered, and a gap with no weight is not listed as though
// it had one.
import { useState } from 'react';

const STARTING_POINT = 100;

// Neutral throughout. Nothing here may be coloured by how much was subtracted —
// red for a low number is the report card wearing a different hat.
function tone(tk) {
  return {
    soft: tk?.inkSoft ?? '#94a3b8',
    ink: tk?.ink ?? '#1f2430',
    rule: tk?.hairline ?? 'rgba(127,127,127,0.22)',
    accent: tk?.teal ?? '#0f766e',
  };
}

const MONO = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';

function weightOf(gap) {
  return Number.isFinite(gap?.score_impact) ? gap.score_impact : 0;
}

export function HowWeReadThis({ gaps, trustScore, tk }) {
  const [open, setOpen] = useState(false);
  const [openGap, setOpenGap] = useState(null);
  const [showMethod, setShowMethod] = useState(false);

  const c = tone(tk);
  const counted = (gaps || []).filter((g) => weightOf(g) > 0);

  // Derived, never taken on trust from the caller — the ledger has to add up on
  // screen or it is not working, it is decoration.
  const subtracted = counted.reduce((sum, g) => sum + weightOf(g), 0);
  const remainder = Number.isFinite(trustScore)
    ? trustScore
    : Math.max(0, STARTING_POINT - subtracted);

  return (
    <div style={{ margin: '2px 0 10px 44px', maxWidth: 560 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: c.soft,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{
          display: 'inline-block',
          transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s ease',
          fontSize: 8,
        }}>▸</span>
        How we read this
      </button>

      {open && (
        <div style={{ marginTop: 8 }}>
          {counted.length === 0 ? (
            <div style={{
              fontFamily: SANS, fontSize: 11.5, color: c.soft,
              fontStyle: 'italic', paddingLeft: 14,
            }}>
              Nothing counted against you in this read. That is what we found, not
              a verdict on what is there.
            </div>
          ) : (
            <>
              <div style={{
                fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em',
                color: c.soft, textTransform: 'uppercase', paddingLeft: 14,
                marginBottom: 6,
              }}>
                What counted
              </div>

              {counted.map((gap) => {
                const id = gap.gap_id ?? gap.id ?? gap.title;
                const isOpen = openGap === id;
                return (
                  <div key={id}>
                    <button
                      onClick={() => setOpenGap(isOpen ? null : id)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', gap: 8, alignItems: 'baseline',
                        padding: '3px 0 3px 14px', textAlign: 'left', width: '100%',
                        fontFamily: SANS, fontSize: 12, color: c.ink,
                      }}
                    >
                      <span style={{
                        fontFamily: MONO, fontSize: 8, color: c.soft,
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        display: 'inline-block', transition: 'transform 0.15s ease',
                      }}>▸</span>
                      {gap.title || gap.label || id}
                    </button>

                    {isOpen && gap.why && (
                      <div style={{
                        margin: '4px 0 8px 34px', padding: '8px 12px',
                        borderLeft: `2px solid ${c.accent}`,
                        background: 'rgba(127,127,127,0.06)',
                        borderRadius: '0 6px 6px 0',
                        fontFamily: SANS, fontSize: 12, lineHeight: 1.55, color: c.ink,
                      }}>
                        {gap.why}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => setShowMethod((m) => !m)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '8px 0 0 14px', fontFamily: MONO, fontSize: 10,
                  letterSpacing: '0.08em', color: c.soft,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{
                  display: 'inline-block', fontSize: 8,
                  transform: showMethod ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}>▸</span>
                Show the arithmetic
              </button>

              {showMethod && (
                <div style={{
                  margin: '8px 0 0 14px', padding: '10px 12px',
                  border: `1px solid ${c.rule}`, borderRadius: 6,
                  fontFamily: MONO, fontSize: 11, lineHeight: 1.8, color: c.ink,
                }}>
                  <div style={{ color: c.soft }}>starting point&nbsp;&nbsp;{STARTING_POINT}</div>
                  {counted.map((gap) => (
                    <div key={`sum-${gap.gap_id ?? gap.id ?? gap.title}`}>
                      &minus;&nbsp;{weightOf(gap)}&nbsp;&nbsp;
                      <span style={{ color: c.soft }}>{gap.title || gap.label}</span>
                    </div>
                  ))}
                  <div style={{
                    borderTop: `1px solid ${c.rule}`, marginTop: 6, paddingTop: 6,
                  }}>
                    {remainder}
                  </div>
                  <div style={{
                    fontFamily: SANS, fontSize: 11.5, lineHeight: 1.55,
                    color: c.soft, marginTop: 8, fontStyle: 'italic',
                  }}>
                    This is how the arithmetic works, not a measurement of your
                    company. It starts at {STARTING_POINT} and subtracts what we
                    found — so it can only ever describe what is visible from
                    outside, on the day we looked.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default HowWeReadThis;
