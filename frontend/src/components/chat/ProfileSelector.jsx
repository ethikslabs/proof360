import { useState } from 'react';

const PROFILES = [
  {
    id: 'investor', label: 'Investor',
    items: [
      'Due diligence readiness',
      'Investor trust narrative',
      'Term sheet evidence gaps',
    ],
  },
  {
    id: 'market', label: 'Market',
    items: [
      'Competitive trust positioning',
      'Customer-facing trust signals',
      'Market entry risk gaps',
    ],
  },
  {
    id: 'technical', label: 'Technical',
    items: [
      'Security architecture review',
      'Integration & API risk',
      'Infrastructure posture',
    ],
  },
  {
    id: 'compliance', label: 'Compliance',
    items: [
      'Framework mapping (SOC 2, ISO 27001)',
      'Audit readiness gaps',
      'Regulatory exposure',
    ],
  },
  {
    id: 'deep', label: 'Deep',
    items: [
      'Full multi-model analysis',
      'All sources reviewed',
      'Complete evidence trail',
    ],
  },
  {
    id: 'fast', label: 'Fast',
    items: [
      '60-second read',
      'Top 3 critical gaps',
      'Quick trust score',
    ],
  },
];

export function ProfileSelector({ value = 'investor', onChange }) {
  const [expanded, setExpanded] = useState(null);

  function handlePillClick(id) {
    setExpanded(prev => prev === id ? null : id);
    onChange?.(id);
  }

  function handleItemClick(profileId, item) {
    onChange?.(profileId, item);
    setExpanded(null);
  }

  const expandedProfile = PROFILES.find(p => p.id === expanded);

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PROFILES.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePillClick(p.id)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: '1.5px solid',
              borderColor: value === p.id ? '#4f46e5' : '#e5e7eb',
              background:  value === p.id ? '#ede9fe' : '#ffffff',
              color:       value === p.id ? '#4f46e5' : '#6b7280',
              cursor: 'pointer', transition: 'all 0.15s',
              outline: expanded === p.id ? '2px solid #c4b5fd' : 'none',
              outlineOffset: 2,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {expandedProfile && (
        <div style={{
          marginTop: 8,
          background: '#fafafa',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          overflow: 'hidden',
          animation: 'fadeSlideUp 0.18s ease both',
        }}>
          <div style={{
            padding: '8px 14px 4px',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: '#9ca3af',
          }}>
            {expandedProfile.label} lens
          </div>
          {expandedProfile.items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleItemClick(expandedProfile.id, item)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px',
                background: 'transparent', border: 'none',
                borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                fontSize: 13, color: '#374151',
                cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
