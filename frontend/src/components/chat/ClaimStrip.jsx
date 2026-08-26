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
// claimsProjection emits provenance as {method, detail, at} — the human phrase
// lives in `detail` ("IP → hosting provider lookup", "MX records", "DMARC TXT
// record"). Joining the object itself renders "[object Object]", which is what
// this shipped as until the live record shape was actually looked at.
function describeProvenance(p) {
  if (!p) return null;
  if (typeof p === 'string') return p;
  if (typeof p === 'object') return p.detail || p.method || null;
  return null;
}

function provenanceOf(claim) {
  const parts = [];
  if (claim.confirmed) parts.push('your word');
  const src = describeProvenance(claim.provenance);
  if (src) parts.push(src);
  return parts.length ? parts.join(' · ') : 'inferred';
}

// Born in the dark companion panel, now reused inside the light Record
// projection. Baked-for-dark ink (#e2e8f0) on a light ground renders every claim
// near-white on near-white: present in the DOM, invisible to a person — a worse
// failure than a missing section, because nothing looks broken. Secondary text
// stays at or above #94a3b8 on dark per the standing contrast rule.
const INK = {
  dark:  { label: '#e2e8f0', value: '#94a3b8', meta: '#94a3b8', good: '#5eead4', quiet: '#94a3b8', rule: 'rgba(148,163,184,0.15)' },
  light: { label: '#1f2430', value: '#4b5563', meta: '#6b7280', good: '#0f766e', quiet: '#6b7280', rule: 'rgba(31,36,48,0.12)' },
};

export function ClaimStrip({ claims, onAnswer, light = false }) {
  const ink = light ? INK.light : INK.dark;
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
            padding: '8px 0', borderBottom: `1px solid ${ink.rule}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: SANS, fontSize: 12, color: ink.label }}>
                {claim.label}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 12, color: ink.value }}>
                {claim.value}
              </span>
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em',
              color: grade === 'confirmed' ? ink.good : ink.meta, marginTop: 3,
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
                    background: 'transparent', color: ink.good,
                    border: `1px solid ${ink.good}66`,
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
                    background: 'transparent', color: ink.quiet,
                    border: `1px solid ${ink.quiet}55`,
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
