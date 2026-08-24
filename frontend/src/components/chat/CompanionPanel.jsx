// CompanionPanel — the floating living-record surface (ETHL-WRK-SPEC-012 §3;
// canon 2026-08-24 "the companion panel", working name). A PROJECTION, not a
// destination: it owns nothing but open/closed; every visible fact derives from
// props on each render. Renders null when the record is empty (INVARIANTS §5 —
// nothing to show, no pressure to fill it).
import { useState } from 'react';
import { VendorShortlist } from './VendorShortlist.jsx';

export function CompanionPanel({ items, claims, isDemoMode, onShortlist, onDefer }) {
  const [open, setOpen] = useState(true);
  const count = (items?.length ?? 0) + (claims?.length ?? 0);
  if (count === 0) return null;

  const shell = {
    position: 'fixed', right: 16, bottom: 16, zIndex: 40,
    fontFamily: '"IBM Plex Mono", monospace',
  };

  if (!open) {
    return (
      <div style={shell}>
        <button
          aria-label="Open record panel"
          onClick={() => setOpen(true)}
          style={{
            padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
            background: '#0f172a', color: '#94a3b8', border: '1px solid #1e293b',
            fontSize: 12,
          }}
        >
          Your record · {count}
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
          Your record · {count} entries
        </span>
        {isDemoMode && (
          <span style={{
            fontSize: 9, letterSpacing: '0.06em', color: '#f59e0b',
            border: '1px solid #f59e0b55', borderRadius: 4, padding: '1px 5px',
          }}>Example company</span>
        )}
        <button
          aria-label="Collapse record panel"
          onClick={() => setOpen(false)}
          style={{
            marginLeft: 'auto', background: 'transparent', border: 'none',
            color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: 1,
          }}
        >—</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '12px 14px 4px' }}>
        {claims?.length > 0 && (
          <div style={{ fontSize: 11, color: '#94a3b8', padding: '0 0 10px' }}>
            {claims.length} facts on your record
          </div>
        )}
        <VendorShortlist
          vendors={items}
          shortlistedIds={items}
          onShortlist={onShortlist}
          onDefer={onDefer}
        />
      </div>
    </div>
  );
}
