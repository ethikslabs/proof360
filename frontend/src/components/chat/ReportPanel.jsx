export function ReportPanel({ report }) {
  if (!report) return <p style={{ color: '#475569', fontSize: 13 }}>No report yet.</p>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 2px' }}>Trust snapshot</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>{report.company}</p>
        <p style={{ fontSize: 10, color: '#334155', fontStyle: 'italic', margin: 0 }}>Draft · refine via chat</p>
      </div>
      {report.sections.map(s => (
        <div key={s.id} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 6px' }}>{s.title}</p>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>{s.content}</p>
        </div>
      ))}
    </div>
  );
}
