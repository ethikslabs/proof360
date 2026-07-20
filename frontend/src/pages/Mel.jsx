import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tokens, FONT, PERSONA } from '../tokens.js';
import { Proof360Mark } from '../components/Proof360Mark.jsx';
import { CerBuildCard } from '../components/chat/CerBuildCard.jsx';
import { MEL_BEATS, MEL_DEFAULT_BEAT, MEL_ORGANIC_BEAT } from '../data/melJourney.js';

// proof360.au/mel — Mel's record, a public read-only projection of one founder's
// journey. No sign-in. Renders mel-journey (data/melJourney.js, promoted from the
// one-writer file per canon's MEL RAIL ruling). Boarded: PROOF360-MEL-RAIL-001.
// Design: ETHL-WRK-BRIEF-005 (Claude Design, 2026-07-20), verified against canon
// by Cowork/Alfred before this file was written.
//
// Three persistent layers (ruled): the rail (jump-anywhere, no beat framed as a
// ceiling) · the conversation (the beat's story + an invited-only plain-English
// escape hatch) · TWO separate objects — Mel's living record (uncapped, the
// VEHICLE) and a per-route CER-forming card (CerBuildCard.jsx reused as-is, per
// the 2026-07-20 EXTERNAL REVIEW FOLDED ruling — never merged into one meter).
//
// Entry mode is derived from routing, not a demo toggle: /mel/:beatId = invited
// (arrived via a specific link — deck, hiveandco.au strip); bare /mel = organic
// (uninvited visitor, lands mid-journey per the BEACH DUMP ORGANIC ENTRY ruling).

function markerColor(tk, m) {
  return { '◆': tk.sevHigh, '◈': tk.plum, '●': tk.ink, '○': tk.inkSoft, '✓': tk.sevOk }[m] || tk.ink;
}

function toCerFields(cer) {
  const spec = [
    ['company', 'Company', 'Hive & Co Pty Ltd'],
    ['contact', 'Contact', 'Mel Rivers · mel@hiveandco.au'],
    ['need', 'Need / gap', cer.need],
    ['evidence', 'Evidence', cer.evidence],
    ['route', 'Route', cer.route],
    ['consent', 'Consent', cer.consent],
    ['visibility', 'Visibility', cer.visibility],
  ];
  const pending = cer.pending || [];
  return spec.map(([key, label, value]) => {
    const isPending = pending.includes(key);
    return { key, label, value: isPending ? '—' : value, state: isPending ? 'wait' : 'done' };
  });
}

function PersonaTag({ persona, theme }) {
  const tk = tokens(theme);
  const meta = PERSONA[persona] || PERSONA.sophia;
  const color = tk[meta.token] || tk.plum;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 12, color: tk.inkSoft }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontWeight: 600, color }}>{meta.label}</span>
      <span>leads this moment</span>
    </span>
  );
}

export default function Mel() {
  const { beatId } = useParams();
  const navigate = useNavigate();
  const theme = 'paper';
  const tk = tokens(theme);

  const invited = Boolean(beatId);
  const [idx, setIdx] = useState(() => {
    if (beatId) {
      const found = MEL_BEATS.findIndex((b) => b.id === beatId);
      if (found >= 0) return found;
    }
    return MEL_BEATS.findIndex((b) => b.id === MEL_ORGANIC_BEAT);
  });
  const [calloutDismissed, setCalloutDismissed] = useState(false);
  const [escapeOpen, setEscapeOpen] = useState(false);

  // If someone lands on an unrecognised beatId, fall back to organic rather than
  // rendering a blank state — never strand the visitor.
  useEffect(() => {
    if (beatId && MEL_BEATS.findIndex((b) => b.id === beatId) < 0) {
      navigate('/mel', { replace: true });
    }
  }, [beatId, navigate]);

  const goTo = (i) => {
    const clamped = Math.max(0, Math.min(i, MEL_BEATS.length - 1));
    setIdx(clamped);
    setEscapeOpen(false);
    navigate(`/mel/${MEL_BEATS[clamped].id}`, { replace: false });
  };

  const cur = MEL_BEATS[idx] || MEL_BEATS[0];
  const showCallout = !invited && !calloutDismissed;

  const record = useMemo(() => {
    const entries = [];
    for (let i = 0; i <= idx; i++) (MEL_BEATS[i].entries || []).forEach((e) => entries.push(e));
    return {
      count: entries.length,
      countLabel: entries.length === 0 ? 'THE RECORD BEGINS' : `${entries.length} ${entries.length === 1 ? 'ENTRY' : 'ENTRIES'}`,
      entries,
    };
  }, [idx]);

  const cerFields = cur.cer ? toCerFields(cur.cer) : null;
  const cerMeter = cerFields ? cerFields.filter((f) => f.state === 'done').length : 0;
  const cerTitle = cur.cer ? (cerMeter === 7 ? `${cur.cer.status} — complete` : `${cur.cer.status} — forming`) : '';

  const noCerText = cur.id === 'm4'
    ? 'Advisory only — this mints a record entry, never an order. A model and a dataset were matched to her question; nothing is bought.'
    : cur.id === 'm1'
    ? 'The rail hasn’t met the read yet — no route, no record. This is the trestle table.'
    : 'No route forming at this beat — but the record still stands, complete.';

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(120% 80% at 82% -12%, #fff, ${tk.bg}, ${tk.bgTint})`, color: tk.ink, fontFamily: FONT.sans, padding: '0 0 64px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: `1px solid ${tk.hairline}` }}>
          <Proof360Mark variant="ambient" size={34} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 21, color: tk.ink }}>proof</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 600, color: tk.ink }}>360</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 14, color: tk.inkSoft, marginLeft: 2 }}>.au/mel</span>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.inkSoft }}>Public read-only · no sign-in</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', padding: '14px 0 4px' }}>
          <h1 style={{ fontFamily: FONT.serif, fontWeight: 400, fontSize: 26, lineHeight: 1.1, margin: 0, color: tk.ink }}>
            Mel's record — a public projection of <span style={{ fontStyle: 'italic', color: tk.plum }}>one founder's journey</span>
          </h1>
        </div>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: tk.inkMid, maxWidth: '70ch' }}>
          Mel Rivers founded Hive &amp; Co, selling raw honey at the Kings Cross markets. Follow her rail beat by beat, jump anywhere, and watch the record accumulate.{' '}
          <span style={{ color: tk.inkSoft }}>Passport is the outward name for the record; "vehicle" is the word the spec uses.</span>
        </p>
      </div>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '22px 28px 0', display: 'grid', gridTemplateColumns: '220px minmax(480px,1fr) 356px', gap: 26, alignItems: 'start' }}>
        {/* LAYER 1 — THE RAIL */}
        <aside style={{ position: 'sticky', top: 18 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tk.inkSoft, marginBottom: 10 }}>The journey</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '4px 0 14px' }}>
            {MEL_BEATS.map((b, i) => {
              const st = i < idx ? 'past' : i === idx ? 'current' : 'future';
              const dot = st === 'current' ? tk.plum : st === 'past' ? tk.ink : 'transparent';
              const ring = st === 'current' ? tk.plum : st === 'past' ? tk.ink : tk.inkGhost;
              const color = st === 'current' ? tk.ink : st === 'future' ? tk.inkSoft : tk.inkMid;
              return (
                <button key={b.id} type="button" onClick={() => goTo(i)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 11, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '7px 8px', borderRadius: 6 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: dot, border: `2px solid ${ring}`, boxSizing: 'border-box', flexShrink: 0 }} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.14em', color: tk.inkGhost }}>{b.id.toUpperCase()}</span>
                    <span style={{ fontSize: 12.5, lineHeight: 1.35, fontWeight: st === 'current' ? 600 : 400, color }}>{b.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, paddingTop: 12, borderTop: `1px solid ${tk.hairline}` }}>
            <button type="button" onClick={() => goTo(idx - 1)} disabled={idx === 0}
              style={{ flex: 1, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: tk.inkMid, background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 8, padding: '7px 10px', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>
              ← Prev
            </button>
            <button type="button" onClick={() => goTo(idx + 1)} disabled={idx === MEL_BEATS.length - 1}
              style={{ flex: 1, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: tk.inkMid, background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 8, padding: '7px 10px', cursor: idx === MEL_BEATS.length - 1 ? 'default' : 'pointer', opacity: idx === MEL_BEATS.length - 1 ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
          <button type="button" onClick={() => goTo(MEL_BEATS.length - 1)}
            style={{ marginTop: 8, width: '100%', background: 'transparent', border: `1px dashed ${tk.hairStrong}`, borderRadius: 8, padding: 8, cursor: 'pointer', fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: tk.inkSoft }}>
            Jump to the ending →
          </button>
        </aside>

        {/* LAYER 2 — THE CONVERSATION */}
        <main style={{ minWidth: 0 }}>
          {showCallout && (
            <div style={{ background: `color-mix(in srgb, ${tk.plum} 8%, ${tk.surface})`, border: `1px solid color-mix(in srgb, ${tk.plum} 30%, transparent)`, borderRadius: 14, padding: '16px 18px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.14em', color: tk.plum, paddingTop: 2 }}>◈</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT.serif, fontSize: 17, color: tk.ink, marginBottom: 3 }}>You've landed in the middle of Mel's journey.</div>
                <div style={{ fontSize: 13, color: tk.inkMid }}>This is where you are — have a look around. Jump forward, back, or straight to the ending. Nothing here needs a sign-in.</div>
              </div>
              <button type="button" onClick={() => setCalloutDismissed(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT.mono, fontSize: 11, color: tk.inkSoft }}>Dismiss ✕</button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tk.plum }}>You are here</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.12em', color: tk.inkGhost, border: `1px solid ${tk.hairline}`, borderRadius: 4, padding: '2px 7px' }}>{cur.id.toUpperCase()} · jump anywhere</span>
          </div>
          <h2 style={{ fontFamily: FONT.serif, fontWeight: 400, fontSize: 30, lineHeight: 1.08, margin: '0 0 14px', color: tk.ink }}>{cur.label}</h2>

          {cur.lead && (
            <div style={{ marginBottom: 16 }}>
              <PersonaTag persona={cur.lead} theme={theme} />
            </div>
          )}

          <p style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 1.5, color: tk.inkMid, margin: '0 0 22px', maxWidth: '60ch' }}>{cur.story}</p>

          {cur.suggestion && (
            <div style={{ background: tk.surface, border: `1px solid ${tk.hairline}`, borderLeft: `3px solid ${tk.plum}`, borderRadius: 8, padding: '15px 18px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tk.inkSoft, marginBottom: 6 }}>Suggested — routed to a CER, not a checkout</div>
              <div style={{ fontSize: 16, color: tk.ink, fontWeight: 500 }}>{cur.suggestion}</div>
              {cur.returns && <div style={{ fontSize: 12, color: tk.plum, marginTop: 7 }}>→ returns to the record</div>}
            </div>
          )}

          {cur.note && (
            <div style={{ borderLeft: `2px solid ${tk.hairStrong}`, padding: '2px 0 2px 14px', margin: '0 0 20px' }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: tk.sevMed, marginBottom: 3 }}>{cur.note.k}</div>
              <div style={{ fontSize: 13, color: tk.inkMid, maxWidth: '58ch' }}>{cur.note.v}</div>
            </div>
          )}

          {cur.teachQ && (
            <div style={{ margin: '0 0 20px' }}>
              <button type="button" onClick={() => setEscapeOpen((v) => !v)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: tk.surfaceLo, border: `1px solid ${tk.hairline}`, borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13, color: tk.inkMid }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 11, color: tk.plum }}>ask</span>{cur.teachQ}
              </button>
              {escapeOpen && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'inline-block', background: tk.surfaceLo, border: `1px solid ${tk.hairline}`, borderRadius: 12, padding: '9px 14px', fontSize: 13, color: tk.inkMid, marginBottom: 10 }}>{cur.teachQ}</div>
                  <div style={{ borderLeft: `2px solid ${tk.umber}`, paddingLeft: 16, marginTop: 2 }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tk.inkSoft, marginBottom: 8 }}>Plain english</div>
                    <div style={{ fontSize: 15, lineHeight: 1.72, color: tk.ink, maxWidth: '60ch' }}>{cur.teachA}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {cur.teachQ && (
            <div style={{ border: `1px dashed ${tk.hairStrong}`, borderRadius: 10, padding: '16px 18px', margin: '0 0 22px', background: `repeating-linear-gradient(135deg, transparent, transparent 9px, color-mix(in srgb, ${tk.ink} 2%, transparent) 9px, color-mix(in srgb, ${tk.ink} 2%, transparent) 10px)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: tk.inkSoft }}>Day-stamped replay</span>
              </div>
              <div style={{ fontSize: 13, color: tk.inkMid, maxWidth: '62ch' }}>
                The pre-populated persona exchange renders here once <span style={{ fontFamily: FONT.mono, fontSize: 12 }}>conversation[]</span> + <span style={{ fontFamily: FONT.mono, fontSize: 12 }}>teach_point</span> are authored into <span style={{ fontFamily: FONT.mono, fontSize: 12 }}>mel-journey</span> (v2). Not fabricated — the one-writer file owns these words.{' '}
                <span style={{ color: tk.inkSoft }}>(PROPOSED RULING pending John — see CANON-ingram-play.md 2026-07-20.)</span>
              </div>
            </div>
          )}
        </main>

        {/* LAYER 3 — TWO DISTINCT OBJECTS */}
        <aside style={{ position: 'sticky', top: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Object A — the living record (the VEHICLE) */}
          <div style={{ background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '18px 18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
              <span style={{ fontFamily: FONT.serif, fontSize: 17, color: tk.ink }}>Mel's Passport</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 10, fontWeight: 600, color: tk.plum, background: `color-mix(in srgb, ${tk.plum} 12%, transparent)`, borderRadius: 999, padding: '3px 9px' }}>{record.countLabel}</span>
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: tk.inkGhost, marginBottom: 14 }}>One living record · uncapped · always visible</div>
            {record.entries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {record.entries.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 11, borderBottom: `1px solid ${tk.hairline}` }}>
                    <span style={{ fontSize: 13, lineHeight: 1.4, color: markerColor(tk, e.m), flexShrink: 0, width: 12, textAlign: 'center' }}>{e.m}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: tk.ink }}>{e.t}</div>
                      <span style={{ display: 'inline-block', marginTop: 4, fontFamily: FONT.mono, fontSize: 8.5, fontWeight: 600, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 4, background: e.l === 'live' ? `color-mix(in srgb, ${tk.sevOk} 14%, transparent)` : `color-mix(in srgb, ${tk.sevMed} 16%, transparent)`, color: e.l === 'live' ? tk.sevOk : tk.sevMed }}>
                        {e.l === 'live' ? 'LIVE' : 'ILLUSTRATIVE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: tk.inkSoft, fontStyle: 'italic', padding: '6px 0' }}>The record begins at the first read — no login, from the public front door.</div>
            )}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${tk.hairline}`, fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: '0.06em', color: tk.inkSoft }}>We hold the record — never the deal.</div>
          </div>

          {/* Object B — the per-route CER card (CerBuildCard.jsx, reused as-is) */}
          {cur.cer ? (
            <CerBuildCard title={cerTitle} meter={cerMeter} total={7} fields={cerFields} sub={cur.cer.route} tk={tk} />
          ) : (
            <div style={{ border: `1px dashed ${tk.hairline}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: tk.inkGhost, marginBottom: 6 }}>No CER forming</div>
              <div style={{ fontSize: 12.5, color: tk.inkMid, lineHeight: 1.5 }}>{noCerText}</div>
            </div>
          )}
        </aside>
      </div>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '34px 28px 0' }}>
        <div style={{ borderTop: `1px solid ${tk.hairline}`, paddingTop: 16, display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center', fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.06em', color: tk.inkSoft }}>
          <span><span style={{ color: tk.sevOk }}>LIVE</span> = read of hiveandco.au</span>
          <span><span style={{ color: tk.sevMed }}>ILLUSTRATIVE</span> = seeded, never a live read</span>
          <span>Beats m1–m10 append-only · never renumbered</span>
          <span style={{ color: tk.inkGhost }}>VERITAS countersignature — end state (ethiks360)</span>
        </div>
      </div>
    </div>
  );
}
