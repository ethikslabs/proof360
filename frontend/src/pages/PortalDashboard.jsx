import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TENANTS, PORTAL_LEADS, filterLeadsForTenant, getMatchedVendors, timeAgo } from '../data/portal-leads';

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

function ScoreRing({ score, size = 44 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
      <text x={size/2} y={size/2} dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={size < 40 ? 9 : 11} fontWeight={600}
        fontFamily="'IBM Plex Mono', monospace" style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.new;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
      color: s.color, background: s.bg, letterSpacing: '0.04em', textTransform: 'uppercase',
      border: `1px solid ${s.color}30`,
    }}>
      {s.label}
    </span>
  );
}

function LeadCard({ lead, tenant, engagement, onEngage, onClick }) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const matchedVendors = getMatchedVendors(lead, tenant);
  const status = engagement?.status || 'new';
  const isNew = status === 'new';

  return (
    <div style={{
      background: isNew ? 'rgba(0,217,184,0.03)' : 'rgba(255,255,255,0.02)',
      border: isNew ? '1px solid rgba(0,217,184,0.15)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      {/* Main row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
        onClick={() => onClick ? onClick(lead.id) : setExpanded(!expanded)}
      >
        <ScoreRing score={lead.trust_score} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {isNew && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#00d9b8', background: 'rgba(0,217,184,0.1)',
                padding: '1px 5px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase',
                flexShrink: 0,
              }}>NEW</span>
            )}
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              {lead.company_name}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              {lead.industry} · {lead.location}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {lead.gaps.map(g => {
              const sc = SEV_COLORS[g.severity] || SEV_COLORS.low;
              return (
                <span key={g.gap_id} style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 4,
                  color: sc.color, background: sc.bg,
                }}>{g.title}</span>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {timeAgo(lead.submitted_at)}
          </span>
          <StatusBadge status={status} />
        </div>

        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, flexShrink: 0, marginLeft: 4 }}>
          {expanded ? '▴' : '▾'}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Matched vendors */}
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Your matched vendors
              </p>
              {matchedVendors.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No catalog matches</p>
              ) : (
                matchedVendors.map(v => (
                  <div key={v.vendor_id} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '8px 10px', marginBottom: 6,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>{v.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      Closes: {v.gaps.join(', ')}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Lead detail */}
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Contact
              </p>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                {lead.email_hint}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                {lead.website}
              </div>

              {engagement?.engaged_at && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                  Engaged {timeAgo(engagement.engaged_at)}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {status === 'new' && (
              <button
                onClick={(e) => { e.stopPropagation(); onEngage(lead.id, 'engaged'); }}
                style={{
                  padding: '8px 16px', background: '#00d9b8', color: '#07090f',
                  border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em',
                }}
              >
                Engage lead →
              </button>
            )}

            {status !== 'new' && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
                  style={{
                    padding: '7px 14px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                    fontSize: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Update status ▾
                </button>
                {showStatusMenu && (
                  <div style={{
                    position: 'absolute', bottom: '110%', left: 0, background: '#1a2133',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    overflow: 'hidden', zIndex: 10, minWidth: 140, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}>
                    {Object.entries(STATUSES).filter(([k]) => k !== 'new').map(([key, val]) => (
                      <button
                        key={key}
                        onClick={(e) => { e.stopPropagation(); onEngage(lead.id, key); setShowStatusMenu(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px',
                          background: status === key ? 'rgba(255,255,255,0.06)' : 'transparent',
                          border: 'none', color: val.color, fontSize: 12, cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                        }}
                      >
                        {val.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <a
              href={`https://${lead.website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}
            >
              {lead.website} ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [auth, setAuth] = useState(null);
  const [engagements, setEngagements] = useState({});
  const [filter, setFilter] = useState('all');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('portal_auth');
    if (!stored) { navigate('/portal'); return; }
    setAuth(JSON.parse(stored));
    const eng = localStorage.getItem('portal_engagements');
    if (eng) setEngagements(JSON.parse(eng));
    // Simulate live feed — new leads tick in
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  function engage(leadId, status) {
    const prev = engagements[leadId] || {};
    const updated = {
      ...engagements,
      [leadId]: { ...prev, status, tenant: auth.tenant, engaged_at: prev.engaged_at || new Date().toISOString() },
    };
    setEngagements(updated);
    localStorage.setItem('portal_engagements', JSON.stringify(updated));
  }

  function logout() {
    localStorage.removeItem('portal_auth');
    localStorage.removeItem('portal_engagements');
    navigate('/portal');
  }

  if (!auth) return null;

  const tenant = TENANTS[auth.tenant];
  const allLeads = filterLeadsForTenant(PORTAL_LEADS, tenant);

  const counts = {
    all: allLeads.length,
    new: allLeads.filter(l => !engagements[l.id]).length,
    active: allLeads.filter(l => ['engaged','quoted'].includes(engagements[l.id]?.status)).length,
    won: allLeads.filter(l => engagements[l.id]?.status === 'won').length,
  };

  const filtered = filter === 'new'    ? allLeads.filter(l => !engagements[l.id])
    : filter === 'active' ? allLeads.filter(l => ['engaged','quoted'].includes(engagements[l.id]?.status))
    : filter === 'won'    ? allLeads.filter(l => engagements[l.id]?.status === 'won')
    : allLeads;

  const totalOpportunity = allLeads
    .filter(l => !['won','lost'].includes(engagements[l.id]?.status))
    .reduce((sum, l) => sum + l.gaps.reduce((s, g) => s + (g.score_impact || 0) * 200, 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#07090f', fontFamily: "'DM Sans', sans-serif", display: 'flex' }}>
      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.2)} }
        .lead-card:hover { border-color: rgba(255,255,255,0.1) !important; }
        .filter-tab:hover { background: rgba(255,255,255,0.06) !important; }
        .stat-card:hover { border-color: rgba(255,255,255,0.1) !important; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Sidebar */}
      <div style={{
        width: 220, background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', padding: '24px 16px', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, background: '#00d9b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#07090f',
          }}>P</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>proof360</span>
        </div>

        {/* Tenant badge */}
        <div style={{
          padding: '10px 12px', borderRadius: 9, background: tenant.bg,
          border: `1px solid ${tenant.color}30`, marginBottom: 28,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: tenant.color, marginBottom: 2 }}>{tenant.name}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{tenant.tagline}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {[
            { id: 'all',    label: 'All Leads',   count: counts.all },
            { id: 'new',    label: 'New',          count: counts.new, pulse: counts.new > 0 },
            { id: 'active', label: 'In Pipeline',  count: counts.active },
            { id: 'won',    label: 'Won',           count: counts.won },
          ].map(item => (
            <button
              key={item.id}
              className="filter-tab"
              onClick={() => setFilter(item.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
                borderLeft: filter === item.id ? '2px solid #00d9b8' : '2px solid transparent',
                background: filter === item.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: filter === item.id ? '#f1f5f9' : 'rgba(255,255,255,0.4)',
                fontSize: 13, cursor: 'pointer', marginBottom: 2, textAlign: 'left',
                fontFamily: "'DM Sans', sans-serif", fontWeight: filter === item.id ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.label}
                {item.pulse && (
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#00d9b8',
                    animation: 'pulseDot 2s infinite', flexShrink: 0,
                  }}/>
                )}
              </span>
              {item.count > 0 && (
                <span style={{
                  fontSize: 10, background: filter === item.id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                  color: filter === item.id ? '#f1f5f9' : 'rgba(255,255,255,0.3)',
                  padding: '1px 7px', borderRadius: 20, fontFamily: "'IBM Plex Mono', monospace",
                }}>{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {auth.user.email}
          </div>
          <button onClick={logout} style={{
            fontSize: 11, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif",
          }}>Sign out</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#f1f5f9',
              marginBottom: 4, letterSpacing: '-0.01em',
            }}>
              Partner Intelligence
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: '#00d9b8',
                boxShadow: '0 0 8px #00d9b8',
                animation: 'pulseDot 2s infinite',
              }}/>
              <span style={{ fontSize: 11, color: '#00d9b8', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.05em' }}>
                LIVE · {allLeads.length} QUALIFIED LEADS
              </span>
            </div>
          </div>
          <Link
            to="/"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', paddingTop: 4 }}
          >
            ← proof360
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'New leads', value: counts.new, color: '#00d9b8', note: 'unengaged' },
            { label: 'In pipeline', value: counts.active, color: '#3b82f6', note: 'engaged + quoted' },
            { label: 'Won', value: counts.won, color: '#10b981', note: 'this session' },
            { label: 'Opportunity', value: `$${(totalOpportunity/1000).toFixed(0)}k`, color: '#f59e0b', note: 'est. pipeline' },
          ].map(stat => (
            <div key={stat.label} className="stat-card" style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '14px 16px', transition: 'border-color 0.15s',
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: stat.color, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.02em', lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>{stat.note}</div>
            </div>
          ))}
        </div>

        {/* Lead feed */}
        <div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '72px 32px' }}>
              <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>
                {filter === 'won' ? '🏆' : filter === 'active' ? '📋' : '📭'}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 500 }}>
                {filter === 'new' ? 'No new leads right now'
                  : filter === 'active' ? 'Nothing in pipeline yet'
                  : filter === 'won' ? 'No won deals yet'
                  : allLeads.length === 0
                    ? 'No leads match your catalog'
                    : 'No leads in this view'}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                {filter === 'new' || allLeads.length === 0
                  ? 'Leads appear here as founders complete audits and their gaps match your product catalog.'
                  : 'Engage leads from the All Leads view to move them into your pipeline.'}
              </p>
            </div>
          ) : (
            filtered.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                tenant={tenant}
                engagement={engagements[lead.id]}
                onEngage={engage}
                onClick={(id) => navigate(`/portal/leads/${id}`)}
              />
            ))
          )}
        </div>

        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)', marginTop: 32, textAlign: 'center' }}>
          Leads are real-time submissions from proof360.au · Email revealed after engagement
        </p>
      </div>
    </div>
  );
}
