import { useState } from 'react';

function SourceRow({ label, url }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12, color: '#374151' }}>
      <span style={{ color: '#9ca3af', flexShrink: 0 }}>↳</span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>{label}</a>
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}

// trail: { conclusion, sources: [{label, url?}], models: [{name, why?}], confidence: 0-1 }
export function ProvenanceAccordion({ trails = [] }) {
  const [openIdx, setOpenIdx] = useState(null);

  if (trails.length === 0) {
    return (
      <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
        Analysis provenance will appear here.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>
        Analysis Provenance
      </div>
      {trails.map((trail, idx) => (
        <div key={idx} style={{ borderBottom: '1px solid #f3f4f6', marginBottom: 2 }}>
          <div
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{trail.conclusion}</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{openIdx === idx ? '↑' : '↓'} open trail</span>
          </div>
          {openIdx === idx && (
            <div style={{ paddingBottom: 12, paddingLeft: 8 }}>
              {trail.sources?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Sources</div>
                  {trail.sources.map((s, i) => <SourceRow key={i} {...s} />)}
                </div>
              )}
              {trail.models?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Models used</div>
                  {trail.models.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#374151', padding: '2px 0' }}>
                      {m.name}{m.why && <span style={{ color: '#9ca3af' }}> — {m.why}</span>}
                    </div>
                  ))}
                </div>
              )}
              {trail.confidence != null && (
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Confidence: {Math.round(trail.confidence * 100)}%
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
