// The pathway — what is open to this company, why, and what it is worth.
//
// The capability register holds 70 active entries (32 AWS/Microsoft/Ingram
// programs, 36 vendors, 2 services) and derives live proposals from them against
// confirmed claims and open gaps. Until now the only route to any of it was a
// persona raising ONE in conversation; the companion panel showed only what had
// already been accepted. So the whole supply side was invisible — "where is the
// AWS stuff?" (John, 2026-08-26) had the answer "nowhere you can see it".
//
// Each proposal already arrives carrying everything a founder needs to judge it:
// what it is, what it's worth, the URL, the commercial route, and the exact claim
// or gap that earned it. So this renders the reason as prominently as the offer —
// nothing here is a recommendation floating free of evidence.
//
// Derived, never stored, and never shown before the Record holds first-party
// testimony (the D4 rule in shortlist.js: we do not pitch before the user has
// spoken). An empty pathway renders nothing at all rather than an empty state.
import { useState } from 'react';

const MONO = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';

const KIND_LABEL = {
  program: 'program',
  vendor: 'vendor',
  service: 'service',
  model: 'model',
  dataset: 'dataset',
};

export function PathwaySuggestions({ proposals, onAccept }) {
  const [busy, setBusy] = useState(null);
  const open = (proposals ?? []).filter((p) => p && p.id && p.title);
  if (open.length === 0) return null;

  async function accept(id) {
    if (!onAccept || busy) return;
    setBusy(id);
    try { await onAccept(id); } finally { setBusy(null); }
  }

  return (
    <div style={{ paddingTop: 4, paddingBottom: 8 }}>
      <div style={{
        fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#5eead4', padding: '6px 0 8px',
      }}>
        Open to you now
      </div>

      {open.map((p) => (
        <div key={p.id} style={{
          padding: '8px 0', borderBottom: '1px solid rgba(148,163,184,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#64748b',
              border: '1px solid rgba(100,116,139,0.4)', borderRadius: 3, padding: '1px 5px',
            }}>
              {KIND_LABEL[p.kind] ?? 'option'}
            </span>
            <span style={{ fontFamily: SANS, fontSize: 12.5, color: '#e2e8f0' }}>
              {p.title}
            </span>
          </div>

          {p.description && (
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
              {p.description}
            </div>
          )}

          {/* The reason is not decoration — it is the difference between a
              recommendation and an advertisement. */}
          {p.reason && (
            <div style={{
              fontFamily: SANS, fontSize: 11, lineHeight: 1.45, color: '#64748b',
              marginTop: 4, fontStyle: 'italic',
            }}>
              {p.reason}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
            {onAccept && (
              <button
                onClick={() => accept(p.id)}
                disabled={busy === p.id}
                style={{
                  fontFamily: MONO, fontSize: 10, padding: '3px 9px',
                  borderRadius: 4, cursor: 'pointer',
                  background: 'transparent', color: '#5eead4',
                  border: '1px solid rgba(94,234,212,0.4)',
                }}
              >
                Add to shortlist
              </button>
            )}
            {p.url && (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: MONO, fontSize: 10, color: '#94a3b8',
                  textDecoration: 'none', borderBottom: '1px solid rgba(148,163,184,0.35)',
                }}
              >
                Read the original →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PathwaySuggestions;
