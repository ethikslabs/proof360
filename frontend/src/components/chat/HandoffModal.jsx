export function HandoffModal({ sessionSummary, onSubmit, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 16, padding: 32, width: 480, maxWidth: '90vw' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>Talk to John</p>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px' }}>
          No repeated backstory. No generic pitch. Here's what John will see before he speaks with you.
        </p>
        <div style={{ background: '#0d1520', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
            {sessionSummary}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onSubmit}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Send this to John
          </button>
          <button
            onClick={onDismiss}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, background: 'transparent', color: '#64748b', border: '1px solid #1e293b', fontSize: 13, cursor: 'pointer' }}
          >
            Not yet
          </button>
        </div>
        <p style={{ fontSize: 10, color: '#334155', textAlign: 'center', marginTop: 12 }}>
          You're speaking with John's AI assistant. John can step in personally.
        </p>
      </div>
    </div>
  );
}
