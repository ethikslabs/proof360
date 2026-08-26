// The record, shown — not counted.
//
// The companion panel displayed "6 things we've noted so far" and stopped there,
// with a comment conceding why: "No per-claim tap-to-correct handler exists on
// this strip today". But the API has had confirm / correct / reject since
// SPEC-011, and each projected claim already carries label, value, status and
// provenance. The record was accumulating in full and rendering as an integer.
//
// John's three questions on seeing the panel finally populate (2026-08-26):
// what 6 signals · how do you look and change if needed · where's the vendor
// shortlist. This answers the first two. The shortlist was already directly
// below, empty until something is added.
//
// A claim the founder answers becomes first-party testimony — the highest grade
// of evidence the record holds, event-logged, with the inference preserved
// underneath rather than overwritten.
import { useState } from 'react';

const MONO = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';

// Grade words, never a percentage and never a score (the honesty wave, and
// John's no-numbers ruling). "confirmed" outranks "inferred" because a human
// said so, not because a model was more sure.
function gradeOf(claim) {
  if (claim.status === 'confirmed' || claim.status === 'corrected') return 'confirmed';
  if (claim.status === 'rejected') return 'rejected';
  return 'inferred';
}

// A claim that a probe observed AND the founder confirmed has TWO witnesses.
// Showing only "your word" would drop the probe that saw it first; showing only
// the probe would drop the testimony that outranks it. Both, in that order.
function provenanceOf(claim) {
  const parts = [];
  if (claim.confirmed) parts.push('your word');
  if (claim.provenance) parts.push(claim.provenance);
  return parts.length ? parts.join(' · ') : 'inferred';
}

export function ClaimStrip({ claims, onAnswer }) {
  const [busy, setBusy] = useState(null);
  const shown = (claims ?? []).filter((c) => c && c.claim_id && c.label);
  if (shown.length === 0) return null;

  async function answer(claimId, action) {
    if (!onAnswer || busy) return;
    setBusy(claimId);
    try { await onAnswer(claimId, action); } finally { setBusy(null); }
  }

  return (
    <div style={{ paddingBottom: 10 }}>
      {shown.map((claim) => {
        const grade = gradeOf(claim);
        const answerable = grade === 'inferred' && !!onAnswer;
        return (
          <div key={claim.claim_id} style={{
            padding: '8px 0', borderBottom: '1px solid rgba(148,163,184,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: SANS, fontSize: 12, color: '#e2e8f0' }}>
                {claim.label}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 12, color: '#94a3b8' }}>
                {claim.value}
              </span>
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em',
              color: grade === 'confirmed' ? '#5eead4' : '#94a3b8', marginTop: 3,
            }}>
              {grade} · {provenanceOf(claim)}
            </div>

            {answerable && (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  onClick={() => answer(claim.claim_id, 'confirm')}
                  disabled={busy === claim.claim_id}
                  style={{
                    fontFamily: MONO, fontSize: 10, padding: '3px 9px',
                    borderRadius: 4, cursor: 'pointer',
                    background: 'transparent', color: '#5eead4',
                    border: '1px solid rgba(94,234,212,0.4)',
                  }}
                >
                  That&apos;s right
                </button>
                <button
                  onClick={() => answer(claim.claim_id, 'reject')}
                  disabled={busy === claim.claim_id}
                  style={{
                    fontFamily: MONO, fontSize: 10, padding: '3px 9px',
                    borderRadius: 4, cursor: 'pointer',
                    background: 'transparent', color: '#94a3b8',
                    border: '1px solid rgba(148,163,184,0.3)',
                  }}
                >
                  Not quite
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ClaimStrip;
