export function DrawerPanel({ title, isOpen, onClose, children, badge }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: 420,
      background: '#0d1520',
      border: '1px solid #1e293b',
      borderRight: 'none',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 10, background: '#1e293b', color: '#64748b', padding: '2px 6px', borderRadius: 10 }}>
              {badge}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}
