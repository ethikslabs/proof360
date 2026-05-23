import { useState } from 'react';

// Handle is always closed by default.
// Opens 45vh as a position:fixed overlay — does NOT push/reflow the chat above.
// Closes on second handle click (outside-click close is post-MVP).

function HandleDots({ count }) {
  return Array.from({ length: Math.min(count, 6) }, (_, i) => (
    <span key={i} style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: i < 2 ? '#6366f1' : i < 4 ? '#0891b2' : '#f59e0b',
      margin: '0 2px',
    }} />
  ));
}

export function MachineDrawer({ trustPhase, stats, children }) {
  const [open, setOpen] = useState(false);

  if (trustPhase === 't0') return null;

  const hasStats = stats && stats.nodes > 0;
  const isBuilding = !hasStats;

  const handleLabel = isBuilding ? '↑ Graph · building…' : '↑ Graph';
  const handleStats = hasStats
    ? `${stats.nodes} nodes · ${stats.edges} edges · ${stats.models} models · ${stats.sources} sources`
    : '';

  return (
    <>
      <div
        data-testid="drawer-handle"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: '#f9fafb',
          borderTop: '1.5px solid #e5e7eb',
          padding: '8px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6366f1' }}>
          {handleLabel}
        </span>
        {hasStats && <HandleDots count={stats.nodes} />}
        {hasStats && (
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
            {handleStats}
          </span>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          {open ? '↓' : '↑'}
        </span>
      </div>

      {open && (
        <div
          data-testid="drawer-body"
          style={{
            position: 'fixed', bottom: 37, left: 0, right: 0, zIndex: 49,
            height: '45vh',
            background: '#ffffff',
            borderTop: '1.5px solid #e5e7eb',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
            overflowY: 'auto',
            padding: '20px 24px 24px',
          }}
        >
          {children}
        </div>
      )}
    </>
  );
}
