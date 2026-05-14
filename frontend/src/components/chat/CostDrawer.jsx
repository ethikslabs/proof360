export function CostDrawer({ receipts }) {
  const total = receipts.reduce((sum, r) => sum + r.estimated_cost_usd, 0);

  return (
    <div>
      <div style={{ marginBottom: 20, padding: '12px 16px', background: '#131c2e', borderRadius: 8, border: '1px solid #1e293b' }}>
        <p style={{ fontSize: 10, color: '#475569', margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Total inference cost</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>${total.toFixed(4)}</p>
        <p style={{ fontSize: 11, color: '#334155', margin: '4px 0 0', fontStyle: 'italic' }}>Free during beta — transparency only</p>
      </div>
      {receipts.map(r => (
        <div key={r.id} style={{ marginBottom: 12, padding: '10px 14px', background: '#0d1520', border: '1px solid #1e293b', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{r.provider}</span>
            <span style={{ fontSize: 12, color: r.changed_recommendation ? '#22c55e' : '#475569', fontWeight: r.changed_recommendation ? 700 : 400 }}>
              ${r.estimated_cost_usd.toFixed(4)}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px', lineHeight: 1.4 }}>{r.purpose}</p>
          <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>
            {r.tokens_in.toLocaleString()} in · {r.tokens_out.toLocaleString()} out
            {r.changed_recommendation && <span style={{ color: '#22c55e', marginLeft: 8 }}>↑ changed recommendation</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
