// CompanionPanel — the floating living-record surface (ETHL-WRK-SPEC-012 §3;
// canon 2026-08-24 "the companion panel", working name). A PROJECTION, not a
// destination: it owns nothing but open/closed; every visible fact derives from
// props on each render. Renders null when the record is empty (INVARIANTS §5 —
// nothing to show, no pressure to fill it).
import { useState } from 'react';
import { VendorShortlist } from './VendorShortlist.jsx';
import { ClaimStrip } from './ClaimStrip.jsx';
import { Interview } from './Interview.jsx';
import { PathwaySuggestions } from './PathwaySuggestions.jsx';

export function CompanionPanel({ items, claims, proposals, isDemoMode, onShortlist, onDefer, onAnswerClaim, onAcceptProposal, onOpenRecord, companyName }) {
  const [open, setOpen] = useState(true);
  const count = (items?.length ?? 0) + (claims?.length ?? 0) + (proposals?.length ?? 0);
  if (count === 0) return null;

  // Cold-human test: "Your record · N entries" reads as "what record? what entries?"
  // (John live-walk feedback 2026-08-25). companyName isn't always wired through by the
  // caller — fall back to a neutral "your story so far" rather than an empty label.
  // Demo boundary (INVARIANTS §4): the collapsed chip must never show a demo
  // company's name unmarked — in demo mode the label carries "Example ·".
  const baseLabel = companyName ? `${companyName} · ${count} noted` : `Your story so far · ${count} noted`;
  const recordLabel = isDemoMode && companyName ? `Example · ${baseLabel}` : baseLabel;

  const shell = {
    position: 'fixed', right: 16, bottom: 16, zIndex: 40,
    fontFamily: '"IBM Plex Mono", monospace',
  };

  if (!open) {
    return (
      <div style={shell}>
        <button
          aria-label="Open story panel"
          onClick={() => setOpen(true)}
          style={{
            padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
            background: '#0f172a', color: '#94a3b8', border: '1px solid #1e293b',
            fontSize: 12,
          }}
        >
          {recordLabel}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      ...shell, width: 340, maxWidth: 'calc(100vw - 32px)', maxHeight: '60vh',
      display: 'flex', flexDirection: 'column',
      background: '#0b1220', border: '1px solid #1e293b', borderRadius: 12,
      boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderBottom: '1px solid #1e293b',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
          {recordLabel}
        </span>
        {isDemoMode && (
          <span style={{
            fontSize: 9, letterSpacing: '0.06em', color: '#f59e0b',
            border: '1px solid #f59e0b55', borderRadius: 4, padding: '1px 5px',
          }}>Example company</span>
        )}
        <button
          aria-label="Collapse story panel"
          onClick={() => setOpen(false)}
          style={{
            marginLeft: 'auto', background: 'transparent', border: 'none',
            color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: 1,
          }}
        >—</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '12px 14px 4px' }}>
        {/* The record is now SHOWN, not counted (John 2026-08-26: "what 6
            signals? How do you look and change if needed?"). The old comment
            here noted that tapping a claim did nothing — onAnswerClaim wires it
            to the confirm/reject endpoint that has existed since SPEC-011, and
            ClaimStrip offers no buttons at all when that handler is absent, so
            the invite is never emptier than the action behind it.

            A second count used to sit here — "N things we've noted so far" —
            reading 6 while the header three lines above read 12, because one
            counted claims and the other counted the whole record. Both true,
            together a bug. The header keeps the count; this line is now the door
            out to the page that can actually hold it. */}
        {/* The flow asks; the strip below waits to be noticed. Both settle the same
            claims through the same endpoint — this only decides who moves first.
            Goes quiet the moment the queue empties or the founder skips, and the
            strip keeps every tile answerable afterwards, so skipping costs nothing. */}
        <Interview claims={claims} onAnswer={onAnswerClaim} />
        <ClaimStrip claims={claims} onAnswer={onAnswerClaim} />
        {/* The supply side: what the register says is open to them right now,
            each with the claim or gap that earned it. Renders nothing until
            evidence opens the lane (D4). */}
        <PathwaySuggestions proposals={proposals} onAccept={onAcceptProposal} />
        <VendorShortlist
          vendors={items}
          shortlistedIds={items}
          onShortlist={onShortlist}
          onDefer={onDefer}
        />
        {/* The way out. The panel floats over the conversation — at John's window
            width it was clipping Leonardo mid-sentence — so anything that wants
            room to be read belongs on the record page, not in here. */}
        <div style={{ padding: '10px 0 12px', borderTop: '1px solid rgba(148,163,184,0.15)', marginTop: 6 }}>
          {/* Opens the record OVER the conversation, like every other projection.
              A callback rather than an href: navigating away remounted Chat, which
              restores no transcript, so "back to the conversation" booted a fresh
              proof360 (John, 2026-08-26). No handler, no control. */}
          {onOpenRecord ? (
            <button
              onClick={onOpenRecord}
              style={{
                fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, color: '#5eead4',
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                borderBottom: '1px solid rgba(94,234,212,0.35)',
              }}
            >
              Open the full record →
            </button>
          ) : (
            <a
              href="/record"
              style={{
                fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, color: '#5eead4',
                textDecoration: 'none', borderBottom: '1px solid rgba(94,234,212,0.35)',
              }}
            >
              Open the full record →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
