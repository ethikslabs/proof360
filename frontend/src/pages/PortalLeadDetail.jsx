import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TENANTS, PORTAL_LEADS, getMatchedVendors, timeAgo } from '../data/portal-leads';

const STATUSES = {
  new:      { label: 'New',       color: '#00d9b8', bg: 'rgba(0,217,184,0.12)' },
  engaged:  { label: 'Engaged',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  quoted:   { label: 'Quoted',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  won:      { label: 'Won',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  lost:     { label: 'Lost',      color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

const SEV_COLORS = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  moderate: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

function ScoreRing({ score, size = 80 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
      <text x={size/2} y={size/2} dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={15} fontWeight={700}
        fontFamily="'IBM Plex Mono', monospace"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

export default function PortalLeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [auth, setAuth] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [showEngage, setShowEngage] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [contactRevealed, setContactRevealed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('portal_auth');
    if (!stored) { navigate('/portal'); return; }
    setAuth(JSON.parse(stored));

    const engs = JSON.parse(localStorage.getItem('portal_engagements') || '{}');
    if (engs[leadId]) setEngagement(engs[leadId]);
  }, [leadId]);

  const lead = PORTAL_LEADS.find(l => l.id === leadId);
  const tenant = auth ? TENANTS[auth.tenant] : null;

  if (!lead || !tenant) return null;

  const matchedVendors = getMatchedVendors(lead, tenant);
  const status = engagement?.status || 'new';

  function engage() {
    const updated = { ...JSON.parse(localStorage.getItem('portal_engagements') || '{}') };
    updated[leadId] = { status: 'engaged', engaged_at: new Date().toISOString() };
    localStorage.setItem('portal_engagements', JSON.stringify(updated));
    setEngagement(updated[leadId]);
    setShowEngage(false);
  }

  function updateStatus(newStatus) {
    const updated = { ...JSON.parse(localStorage.getItem('portal_engagements') || '{}') };
    updated[leadId] = { ...updated[leadId], status: newStatus };
    localStorage.setItem('portal_engagements', JSON.stringify(updated));
    setEngagement(updated[leadId]);
    setShowStatusMenu(false);
  }

  const readinessColor = lead.trust_score >= 70 ? '#10b981' : lead.trust_score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ minHeight: '100vh', background: '#07090f', fontFamily: "'DM Sans', sans-serif", color: '#f1f5f9' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        .portal-btn:hover { opacity: 0.85 !important; }
        .status-opt:hover { background: rgba(255,255,255,0.06) !important; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Top nav */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16,
        background: 'rgba(255,255,255,0.01)',
      }}>
        <button
          onClick={() => navigate('/portal/dashboard')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6,
            padding: 0,
          }}
        >
          ← Back to leads
        </button>
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: "'IBM Plex Mono', monospace" }}>
          {lead.id}
        </span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px', animation: 'fadeUp 0.3s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 40 }}>
          <ScoreRing score={lead.trust_score} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{
                fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#f1f5f9',
                letterSpacing: '-0.01em', lineHeight: 1.1, margin: 0,
              }}>
                {lead.company_name}
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 700, color: readinessColor, background: `${readinessColor}15`,
                padding: '3px 8px', borderRadius: 20, border: `1px solid ${readinessColor}30`,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {lead.trust_score >= 70 ? 'Deal ready' : lead.trust_score >= 50 ? 'Partial' : 'Needs work'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
              <span>{lead.industry}</span>
              <span>·</span>
              <span>{lead.location}</span>
              <span>·</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{timeAgo(lead.submitted_at)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {lead.gaps.map(g => {
                const sc = SEV_COLORS[g.severity] || SEV_COLORS.low;
                return (
                  <span key={g.gap_id} style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 5,
                    color: sc.color, background: sc.bg, border: `1px solid ${sc.color}20`,
                  }}>{g.title}</span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Engage flow */}
        {status === 'new' && !showEngage && (
          <button
            className="portal-btn"
            onClick={() => setShowEngage(true)}
            style={{
              width: '100%', padding: '14px', background: '#00d9b8', color: '#07090f',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em', marginBottom: 32,
              transition: 'opacity 0.15s',
            }}
          >
            Engage this lead →
          </button>
        )}

        {status === 'new' && showEngage && (
          <div style={{
            background: 'rgba(0,217,184,0.06)', border: '1px solid rgba(0,217,184,0.2)',
            borderRadius: 10, padding: '18px 20px', marginBottom: 32,
            animation: 'fadeUp 0.2s ease',
          }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14, lineHeight: 1.6 }}>
              You're engaging <strong style={{ color: '#f1f5f9' }}>{lead.company_name}</strong>. This signals intent to Proof360.
              Contact details will be available once engaged.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="portal-btn"
                onClick={engage}
                style={{
                  padding: '9px 18px', background: '#00d9b8', color: '#07090f',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.15s',
                }}
              >
                Confirm engagement
              </button>
              <button
                onClick={() => setShowEngage(false)}
                style={{
                  padding: '9px 14px', background: 'transparent', color: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 13,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status !== 'new' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Status</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                color: STATUSES[status].color, background: STATUSES[status].bg,
                border: `1px solid ${STATUSES[status].color}30`,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                {STATUSES[status].label}
              </span>
              {engagement?.engaged_at && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  · engaged {timeAgo(engagement.engaged_at)}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                style={{
                  padding: '7px 12px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
                  fontSize: 12, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Update status ▾
              </button>
              {showStatusMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%', background: '#141d2e',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden',
                  zIndex: 20, minWidth: 150, boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
                }}>
                  {Object.entries(STATUSES).filter(([k]) => k !== 'new').map(([key, val]) => (
                    <button
                      key={key}
                      className="status-opt"
                      onClick={() => updateStatus(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        textAlign: 'left', padding: '10px 14px',
                        background: status === key ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        transition: 'background 0.12s',
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: val.color, flexShrink: 0 }}/>
                      <span style={{ fontSize: 13, color: val.color, fontWeight: status === key ? 600 : 400 }}>{val.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Relevant gaps */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '20px',
          }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 14 }}>
              Relevant gaps
            </p>
            {lead.gaps.map(g => {
              const sc = SEV_COLORS[g.severity] || SEV_COLORS.low;
              return (
                <div key={g.gap_id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    color: sc.color, background: sc.bg, textTransform: 'uppercase',
                    letterSpacing: '0.04em', flexShrink: 0,
                  }}>
                    {g.severity}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{g.title}</span>
                </div>
              );
            })}
          </div>

          {/* Matched vendors */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '20px',
          }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 14 }}>
              Your vendors
            </p>
            {matchedVendors.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
                No catalog matches for this lead.
              </p>
            ) : (
              matchedVendors.map(v => (
                <div key={v.vendor_id} style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px',
                  marginBottom: 8, border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>{v.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    Closes: {v.gaps.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '20px',
        }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 14 }}>
            Contact
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: contactRevealed ? '#f1f5f9' : 'rgba(255,255,255,0.3)',
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4,
                filter: contactRevealed ? 'none' : 'blur(4px)', transition: 'filter 0.3s',
                userSelect: contactRevealed ? 'text' : 'none',
              }}>
                {lead.email_hint}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{lead.website}</div>
            </div>
            {status !== 'new' && !contactRevealed && (
              <button
                className="portal-btn"
                onClick={() => setContactRevealed(true)}
                style={{
                  padding: '8px 14px', background: 'rgba(0,217,184,0.08)',
                  border: '1px solid rgba(0,217,184,0.25)', borderRadius: 8,
                  fontSize: 12, color: '#00d9b8', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                  transition: 'opacity 0.15s',
                }}
              >
                Reveal contact
              </button>
            )}
            {status === 'new' && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
                Engage to reveal
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
