// THE INSPECTOR — level 2, and there is no level 3.
//
// Nielsen Norman Group, unambiguous: "designs that go beyond 2 disclosure levels
// typically have low usability because users often get lost when moving between the
// levels." So every road — a claim in the reading, a line in the trace, a row in the
// rail — opens THIS surface. Never a drawer inside a drawer.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS NOT A PRETTIER TOOLTIP, which is what I set out to build
// ─────────────────────────────────────────────────────────────────────────────
// The plan was to make the inline [n] citation beautiful: rest on a sentence, its
// source lights in the margin. The research killed it, and the finding is worth
// keeping in the file because it will be proposed again.
//
//   arXiv 2501.01303 — citations raised trust EVEN WHEN THE CITATIONS WERE RANDOM.
//   Trust FELL when users actually checked them. Hover/click rates run under ~25%.
//
// A prettier citation therefore buys trust that has not been earned, from the ~75% who
// never open it. For this product that is not a cosmetic problem: it is the invented-
// provenance failure — the exact thing the identity gate exists to refuse — relocated
// from the pipeline to the interface. We would be doing by design what we spent the
// morning fixing in code.
//
// The one pattern with published evidence that it improves CALIBRATION rather than
// confidence is Attribution Gradients (UIST '26, arXiv 2510.00361): a single expandable
// surface carrying how much evidence there is, and the supporting AND non-agreeing
// excerpts together.
//
// Which is, exactly, John's ruling of 2026-09-02 arrived at from the other direction:
// "we never adjudicate a company's record... a signal holds MULTIPLE OBSERVATIONS, each
// stamped with who saw it and when." `position-signals.js` already produces that shape.
// The data model was already right; only the surface was missing.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE HONESTY RULE ON SECTION 2
// ─────────────────────────────────────────────────────────────────────────────
// NN/g names reasoning traces as potentially unfaithful post-hoc rationalisation, and
// arXiv 2511.12001 finds chain-of-thought raises appropriate trust AND overreliance
// together. "Watching AI Think" (arXiv 2601.16720, n≈232) measured felt Understanding &
// Trust rising (71.62 vs 61.72, p=0.033) while perceived Competence did not move
// (p=0.14) — the trace moves how trusted the system feels without moving how good it is.
//
// So the trace is labelled for what it actually is: a receipt of what ran. Never
// "here's why this is right".
import { useEffect, useRef } from 'react';

const MONO = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';

function when(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Section({ eyebrow, title, aside, children, tk }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <div style={{
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: tk.inkSoft, marginBottom: 3,
          }}>{eyebrow}</div>
          {/* Serif marks content the reader READS. Controls, labels and numerals stay
              in the sans — that is the rule that keeps the pairing from reading as a
              template rather than a decision. */}
          <h3 style={{
            fontFamily: SERIF, fontSize: 21, fontWeight: 400,
            color: tk.ink, margin: 0, textWrap: 'balance',
          }}>{title}</h3>
        </div>
        {aside && (
          <span style={{ fontFamily: MONO, fontSize: 10, color: tk.inkSoft, whiteSpace: 'nowrap' }}>
            {aside}
          </span>
        )}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

// One observation = one witness, one passage, one date. Rendered identically whether or
// not it agrees with its neighbours: there is deliberately no "conflict" treatment, no
// ⚡, no red. Sources go out of date and contradict each other; that is normal, and
// deciding between them is the founder's job, not ours.
function Observation({ obs, tk }) {
  const date = when(obs.observed_at);
  return (
    <li style={{ listStyle: 'none', marginBottom: 16 }}>
      <div style={{
        fontFamily: MONO, fontSize: 10, color: tk.inkSoft,
        letterSpacing: '0.05em', marginBottom: 5,
      }}>
        {obs.source ?? 'A record we already held'}{date ? ` · ${date}` : ''}
      </div>
      <div style={{
        fontFamily: SANS, fontSize: 13.5, color: tk.ink,
        lineHeight: 1.55, marginBottom: 5,
      }}>{obs.value}</div>
      {/* Passage-level, never document-level. Pointing at a whole file measures ~80%
          precision against ~90% for the passage — and a founder cannot check a claim
          against a 40-page PDF, which makes a document link a decoration again. */}
      {obs.excerpt && (
        <blockquote style={{
          margin: '0 0 5px', paddingLeft: 10,
          borderLeft: `2px solid ${tk.hairStrong}`,
          fontFamily: SERIF, fontStyle: 'italic', fontSize: 13,
          lineHeight: 1.5, color: tk.inkMid,
        }}>“{obs.excerpt}”</blockquote>
      )}
      {obs.source_url && (
        <a
          href={obs.source_url} target="_blank" rel="noopener noreferrer"
          style={{
            fontFamily: MONO, fontSize: 10, color: tk.plum,
            textDecoration: 'none', borderBottom: `1px dotted ${tk.plum}`,
          }}
        >Read it yourself →</a>
      )}
    </li>
  );
}

/**
 * @param subject       { label, value, confirmation } — what is being inspected
 * @param observations  every witness, agreeing or not. [] = looked, found none.
 *                      null/undefined = we never looked. The two are never merged.
 * @param acts          what actually ran, as a receipt
 * @param disconfirmer  what would change this — the founder's lever
 * @param modal         true below the rail breakpoint: dialog contract applies
 */
export function Inspector({
  subject, observations, acts = [], disconfirmer, onClose, modal = false, tk,
}) {
  const panelRef = useRef(null);
  const invokerRef = useRef(null);

  useEffect(() => {
    if (!modal) return undefined;
    invokerRef.current = document.activeElement;
    const id = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      const el = invokerRef.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    };
  }, [modal]);

  if (!subject) return null;

  const looked = Array.isArray(observations);
  const list = looked ? observations : [];

  const body = (
    <div
      ref={panelRef}
      tabIndex={modal ? -1 : undefined}
      role={modal ? 'dialog' : 'complementary'}
      aria-modal={modal ? 'true' : undefined}
      aria-label={`What we have on ${subject.label}`}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } }}
      style={{
        display: 'flex', flexDirection: 'column',
        background: tk.surface,
        borderLeft: modal ? 'none' : `1px solid ${tk.hairline}`,
        height: '100%', outline: 'none',
      }}
    >
      <header style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 12, padding: '18px 22px 14px', borderBottom: `1px solid ${tk.hairline}`,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: tk.inkSoft, marginBottom: 4,
          }}>{subject.label}</div>
          <div style={{ fontFamily: SERIF, fontSize: 25, color: tk.ink, lineHeight: 1.15 }}>
            {subject.value}
          </div>
          {subject.confirmation === 'unconfirmed' && (
            // The accurate description of what we have. Never "unverified", never
            // "sources disagree" — it does not say anything is lying.
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: tk.inkSoft, marginTop: 6 }}>
              Observed publicly and inferred. You haven’t confirmed this yet.
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none', border: `1px solid ${tk.hairline}`, borderRadius: 8,
            width: 26, height: 26, cursor: 'pointer', color: tk.inkSoft,
            flexShrink: 0, lineHeight: 1, fontSize: 13,
          }}
        >✕</button>
      </header>

      <div style={{ overflowY: 'auto', padding: '20px 22px 40px' }}>

        <Section
          eyebrow="Who said so"
          title="What each source actually said"
          aside={looked ? `${list.length} ${list.length === 1 ? 'source' : 'sources'}` : null}
          tk={tk}
        >
          {!looked && (
            // ABSENCE RULE: could-not-look and looked-and-found-nothing are different
            // facts and must never render as the same sentence.
            <p style={{ fontFamily: SANS, fontSize: 13, color: tk.inkSoft, margin: 0 }}>
              We couldn’t check this one. That’s not the same as finding nothing — we
              didn’t get to look.
            </p>
          )}
          {looked && list.length === 0 && (
            <p style={{ fontFamily: SANS, fontSize: 13, color: tk.inkSoft, margin: 0 }}>
              We looked and found nothing on this. It may still be true — nobody has
              written it down anywhere we can reach.
            </p>
          )}
          {list.length > 1 && (
            <p style={{ fontFamily: SANS, fontSize: 12, color: tk.inkSoft, margin: '0 0 14px' }}>
              These don’t all say the same thing. That’s normal — sources go out of date.
              We’re showing you each one rather than picking a winner.
            </p>
          )}
          <ul style={{ margin: 0, padding: 0 }}>
            {list.map((obs, i) => <Observation key={obs.evidence_id ?? i} obs={obs} tk={tk} />)}
          </ul>
        </Section>

        {acts.length > 0 && (
          <Section
            eyebrow="The receipt"
            title="What we ran to get here"
            aside={`${acts.length} ${acts.length === 1 ? 'step' : 'steps'}`}
            tk={tk}
          >
            {/* Labelled for what it IS. A trace is a record of what executed — it is not
                evidence the answer is right, and research shows it raises felt trust
                without moving actual competence. Saying so is the difference between
                showing your working and performing it. */}
            <p style={{ fontFamily: SANS, fontSize: 12, color: tk.inkSoft, margin: '0 0 12px' }}>
              This is what ran, not why it’s right. Use it to see what we did and didn’t
              look at.
            </p>
            <ol style={{ margin: 0, padding: 0 }}>
              {acts.map((a, i) => (
                <li key={i} style={{
                  listStyle: 'none', display: 'flex', gap: 8, alignItems: 'baseline',
                  padding: '5px 0', borderBottom: `1px solid ${tk.hairline}`,
                  fontFamily: SANS, fontSize: 12.5, color: tk.inkMid,
                }}>
                  <span style={{ color: a.phase === 'fail' ? '#c84b4b' : tk.inkGhost, width: 12 }}>
                    {a.phase === 'fail' ? '✗' : a.phase === 'skip' ? '↳' : '✓'}
                  </span>
                  <span style={{ flex: 1 }}>{a.title}</span>
                  {a.note && (
                    <span style={{ fontFamily: MONO, fontSize: 10, color: tk.inkSoft }}>{a.note}</span>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {disconfirmer && (
          <Section eyebrow="Your move" title="What would change this" tk={tk}>
            <p style={{
              fontFamily: SANS, fontSize: 13.5, color: tk.ink, lineHeight: 1.6, margin: 0,
            }}>{disconfirmer}</p>
          </Section>
        )}
      </div>
    </div>
  );

  if (!modal) return body;

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 350,
        background: 'rgba(28,28,30,0.32)',
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div style={{ width: 'min(460px, 94vw)', height: '100%' }}>{body}</div>
    </div>
  );
}

export default Inspector;
