// The interview — the read's questions, asked one at a time.
//
// John, 2026-09-02, remembering the earliest flow: "here is the read, we think you
// are on aws/azure/gcp/behind cloudflare", "we think b2b blah" — a flow of questions
// to fill out the CER, "and then you have the ability to say 'i don't know, yes,
// correct' - or skip the lot - that way you can see the interview ish thing, but you
// can or can not do what you want, but would keep the tiles you have... Those small
// things compound quickly."
//
// ClaimStrip already puts buttons on every tile. The difference here is that a strip
// WAITS to be noticed and a flow ASKS. Same claims, same single mutation surface,
// same append-only events — this only changes who moves first.
//
// Three rules this component exists to keep:
//   1. THREE ANSWERS, NOT TWO. "I don't know" is a real answer, not a decline. A
//      founder who cannot say whether they are on AWS or behind Cloudflare has told
//      us something true about the company. It records, and it is never asked again.
//   2. NO COUNTER. No "3 of 12", no progress bar, no total. A counter turns a
//      conversation into a form and manufactures the feeling of abandoning something
//      (standing beat-count ruling: entries accumulate, uncapped).
//   3. SKIPPING LOSES NOTHING. Every tile the founder already has survives. Skip is
//      not a dead end either — the strip still answers anything, any time.
import { useState } from 'react';

const MONO = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';

// Mirrors CONFIRM_PRIORITY in api/src/services/claims-projection.js. Cloud provider
// opens because it is a gimme — concrete, quick, and it earns the first yes, which
// is what starts the ratchet. Position follows; posture trails, because those are
// instruments rather than the product.
// NOTE: duplicated across the API boundary on purpose for now. It collapses the day
// the API returns the ordered queue rather than record-ordered claims.
export const ASK_ORDER = [
  'infrastructure.cloud_provider',
  'product.type',
  'market.customer_type',
  'company.stage',
  'compliance.soc2_status',
  'data.sensitivity',
  'identity.model',
  'governance.cyber_insurance',
];

const INK = {
  dark:  { label: '#e2e8f0', value: '#94a3b8', meta: '#94a3b8', good: '#5eead4', quiet: '#94a3b8', rule: 'rgba(148,163,184,0.15)', field: '#0f172a' },
  light: { label: '#1f2430', value: '#4b5563', meta: '#6b7280', good: '#0f766e', quiet: '#6b7280', rule: 'rgba(31,36,48,0.12)', field: '#ffffff' },
};

/** Open = never answered. Confirmed, corrected, rejected AND unknown are all done. */
export function openClaims(claims) {
  return (claims ?? []).filter((c) => c && c.claim_id && c.label && c.status === 'inferred');
}

/** Ask order. Unranked fields keep their given order, below the ranked ones. */
export function askQueue(claims) {
  const open = openClaims(claims);
  const rank = (c) => {
    const i = ASK_ORDER.indexOf(c.field);
    return i === -1 ? ASK_ORDER.length : i;
  };
  return [...open].sort((a, b) => {
    const d = rank(a) - rank(b);
    return d !== 0 ? d : open.indexOf(a) - open.indexOf(b);
  });
}

function describeProvenance(p) {
  if (!p) return null;
  if (typeof p === 'string') return p;
  if (typeof p === 'object') return p.detail || p.method || null;
  return null;
}

export function Interview({ claims, onAnswer, light = false, onSkipAll }) {
  const ink = light ? INK.light : INK.dark;
  const [skipped, setSkipped] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const queue = askQueue(claims);
  const claim = queue[0];

  // Nothing to ask, or the founder stepped out. Either way the tiles stay put —
  // this component simply stops speaking. It never renders a dead end.
  if (!claim || skipped || !onAnswer) return null;

  async function answer(action, value) {
    if (busy) return;
    setBusy(true);
    try {
      await onAnswer(claim.claim_id, action, value);
      setCorrecting(false);
      setDraft('');
    } finally {
      setBusy(false);
    }
  }

  function skipAll() {
    setSkipped(true);
    onSkipAll?.();
  }

  const source = describeProvenance(claim.provenance);
  // A second witness saw something different. Never rendered as a contradiction —
  // "we've seen these two, which is right?" (John: we do not adjudicate a record).
  const other = claim.conflicted ? (claim.conflict?.value ?? null) : null;

  const btn = (color) => ({
    fontFamily: MONO, fontSize: 10, padding: '4px 10px', borderRadius: 4,
    cursor: busy ? 'default' : 'pointer', background: 'transparent',
    color, border: `1px solid ${color}55`, opacity: busy ? 0.5 : 1,
  });

  return (
    <div data-testid="interview" style={{
      padding: '12px 0', borderTop: `1px solid ${ink.rule}`, borderBottom: `1px solid ${ink.rule}`,
    }}>
      <div style={{ fontFamily: SANS, fontSize: 12.5, color: ink.label, lineHeight: 1.5 }}>
        {other
          ? <>We&apos;ve seen two answers for <b>{claim.label}</b> — <b>{claim.value}</b> and <b>{other}</b>. Which is right?</>
          : <>We think your <b>{claim.label}</b> is <b>{claim.value}</b>. Does that land?</>}
      </div>

      {source && (
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em', color: ink.meta, marginTop: 4 }}>
          {source}
        </div>
      )}

      {!correcting ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button onClick={() => answer('confirm')} disabled={busy} style={btn(ink.good)}>
            Yes, that&apos;s right
          </button>
          <button onClick={() => { setCorrecting(true); setDraft(''); }} disabled={busy} style={btn(ink.quiet)}>
            Not quite
          </button>
          <button onClick={() => answer('dont_know')} disabled={busy} style={btn(ink.quiet)}>
            I don&apos;t know
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            autoFocus
            aria-label={`Correct ${claim.label}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) answer('correct', draft.trim()); }}
            placeholder="What is it?"
            style={{
              fontFamily: SANS, fontSize: 12, padding: '5px 8px', borderRadius: 4,
              border: `1px solid ${ink.rule}`, background: ink.field, color: ink.label, minWidth: 180,
            }}
          />
          <button onClick={() => answer('correct', draft.trim())} disabled={busy || !draft.trim()} style={btn(ink.good)}>
            Save
          </button>
          <button onClick={() => setCorrecting(false)} disabled={busy} style={btn(ink.quiet)}>
            Cancel
          </button>
        </div>
      )}

      {/* Deliberately quiet, deliberately present, and deliberately not a dead end. */}
      <button
        onClick={skipAll}
        disabled={busy}
        style={{
          fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em', marginTop: 10,
          background: 'none', border: 'none', padding: 0, color: ink.meta,
          cursor: busy ? 'default' : 'pointer', textDecoration: 'underline',
        }}
      >
        Skip the rest — you keep everything we&apos;ve got
      </button>
    </div>
  );
}

export default Interview;
