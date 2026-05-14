const TIMING_STYLE = {
  now: { label: 'Now', color: '#22c55e', bg: '#052e1640' },
  soon: { label: 'Soon', color: '#f59e0b', bg: '#451a0340' },
  later: { label: 'Later', color: '#64748b', bg: '#0f172a' },
};

export function VendorShortlist({ vendors, onShortlist, onDefer }) {
  const byTiming = {
    now: vendors.filter(v => v.timing === 'now'),
    soon: vendors.filter(v => v.timing === 'soon'),
    later: vendors.filter(v => v.timing === 'later'),
  };

  return (
    <div>
      {['now', 'soon', 'later'].map(timing => (
        byTiming[timing].length > 0 && (
          <div key={timing} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: TIMING_STYLE[timing].color, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
              {TIMING_STYLE[timing].label}
            </p>
            {byTiming[timing].map(v => (
              <div key={v.id} style={{
                marginBottom: 10,
                padding: '12px 14px',
                background: TIMING_STYLE[timing].bg,
                border: `1px solid ${TIMING_STYLE[timing].color}22`,
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{v.name}</span>
                  <span style={{ fontSize: 10, color: '#475569', background: '#1e293b', padding: '2px 6px', borderRadius: 10 }}>
                    {v.category.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: '0 0 8px' }}>{v.reason}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {v.status === 'suggested' && (
                    <>
                      <button onClick={() => onShortlist(v.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${TIMING_STYLE[timing].color}`, background: 'transparent', color: TIMING_STYLE[timing].color, cursor: 'pointer' }}>
                        + Add to shortlist
                      </button>
                      <button onClick={() => onDefer(v.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer' }}>
                        Defer
                      </button>
                    </>
                  )}
                  {v.status === 'shortlisted' && (
                    <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Shortlisted</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ))}
    </div>
  );
}
