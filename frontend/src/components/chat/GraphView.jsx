const TYPE_COLOR = {
  company: '#6366f1',
  claim:   '#0891b2',
  gap:     '#dc2626',
  vendor:  '#059669',
  program: '#d97706',
  risk:    '#ea580c',
};

const TYPE_LABEL = {
  company: 'Company',
  claim:   'Signal',
  gap:     'Gap',
  vendor:  'Vendor',
  program: 'Program',
  risk:    'Risk',
};

function NodeRow({ node }) {
  const color = TYPE_COLOR[node.type] ?? '#9ca3af';
  const typeLabel = TYPE_LABEL[node.type] ?? node.type;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 0', borderBottom: '1px solid #f3f4f6',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0, display: 'inline-block',
      }} />
      <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 48 }}>{typeLabel}</span>
      <span style={{ fontSize: 13, color: '#111827', flex: 1 }}>{node.label}</span>
      {node.confidence != null && (
        <span style={{ fontSize: 10, color: '#9ca3af' }}>{Math.round(node.confidence * 100)}%</span>
      )}
    </div>
  );
}

export function GraphView({ nodes = [] }) {
  if (nodes.length === 0) {
    return (
      <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic', padding: '12px 0' }}>
        Graph building…
      </div>
    );
  }

  const grouped = nodes.reduce((acc, n) => {
    (acc[n.type] = acc[n.type] ?? []).push(n);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>
        Observable Trust Graph — {nodes.length} nodes
      </div>
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: TYPE_COLOR[type] ?? '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            {TYPE_LABEL[type] ?? type}
          </div>
          {items.map(n => <NodeRow key={n.id} node={n} />)}
        </div>
      ))}
    </div>
  );
}
