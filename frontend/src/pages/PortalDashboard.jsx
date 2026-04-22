import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TENANTS, PORTAL_LEADS, filterLeadsForTenant, getMatchedVendors, timeAgo } from '../data/portal-leads';
import { Proof360Mark } from '../components/Proof360Mark';

const VENDOR_LOGOS = {
  vanta:       { src: '/logos/vanta-partner.svg', style: { height: 20, width: 20, borderRadius: '50%' } },
  aws:         { src: '/logos/aws-partner.png',   style: { height: 20, width: 'auto' } },
  cloudflare:  { src: '/logos/cloudflare.png',    style: { height: 14, width: 'auto', filter: 'invert(1) brightness(0.3)' } },
  cisco_duo:   { src: '/logos/cisco.svg',         style: { height: 14, width: 'auto', filter: 'invert(1) brightness(0.3)' } },
  palo_alto:   { src: '/logos/paloalto.svg',      style: { height: 14, width: 'auto', filter: 'invert(1) brightness(0.3)' } },
  okta:        { src: '/logos/okta.svg',          style: { height: 14, width: 'auto', filter: 'invert(1) brightness(0.3)' } },
  austbrokers: { src: '/logos/cyberpro.png',      style: { height: 20, width: 'auto' } },
};

const TENANT_LOGOS = {
  vanta:       { src: '/logos/vanta-partner.svg', style: { height: 26, width: 26, borderRadius: '50%' } },
  aws:         { src: '/logos/aws-partner.png',   style: { height: 28, width: 'auto' } },
  cloudflare:  { src: '/logos/cloudflare.png',    style: { height: 20, width: 'auto' } },
  cisco:       { src: '/logos/cisco.svg',         style: { height: 20, width: 'auto' } },
  palo_alto:   { src: '/logos/paloalto.svg',      style: { height: 18, width: 'auto' } },
  okta:        { src: '/logos/okta.svg',          style: { height: 20, width: 'auto' } },
  austbrokers: { src: '/logos/cyberpro.png',      style: { height: 26, width: 'auto' } },
};

const STATUSES = {
  new:      { label: 'New',      color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
  engaged:  { label: 'Engaged',  color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
  quoted:   { label: 'Quoted',   color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  won:      { label: 'Won',      color: '#065f46', bg: '#a7f3d0', border: '#6ee7b7' },
  lost:     { label: 'Lost',     color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
};

const SEV_COLORS = {
  critical: { color: '#dc2626', bg: '#fee2e2', border: '#fecaca' },
  high:     { color: '#c2410c', bg: '#ffedd5', border: '#fed7aa' },
  moderate: { color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  low:      { color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
};

const TENANT_CONTEXT = {
  vanta:       { headline: 'Compliance Pipeline',         insight: n => `${n} ${n===1?'company':'companies'} missing SOC 2 or GRC certification — your core offering` },
  cisco:       { headline: 'Network & Identity Pipeline',  insight: n => `${n} ${n===1?'lead':'leads'} with network perimeter and MFA gaps matching your catalog` },
  okta:        { headline: 'Identity Pipeline',            insight: n => `${n} ${n===1?'company':'companies'} with MFA and identity gaps — direct match for Okta` },
  crowdstrike: { headline: 'Endpoint Security Pipeline',   insight: n => `${n} ${n===1?'company':'companies'} running without endpoint protection` },
  cloudflare:  { headline: 'Edge & Zero Trust Pipeline',   insight: n => `${n} ${n===1?'lead':'leads'} with network perimeter and zero trust gaps` },
  aws:         { headline: 'Cloud Security Pipeline',      insight: n => `${n} ${n===1?'company':'companies'} with cloud security and infrastructure gaps` },
  austbrokers: { headline: 'Cyber Insurance Pipeline',     insight: n => `${n} high-risk ${n===1?'company':'companies'} without cyber insurance coverage` },
  palo_alto:   { headline: 'SASE & Firewall Pipeline',     insight: n => `${n} ${n===1?'lead':'leads'} with firewall and zero trust gaps` },
  dicker:      { headline: 'Distributor Pipeline',         insight: n => `${n} qualified leads across your catalog` },
  ingram:      { headline: 'Distributor Pipeline',         insight: n => `${n} qualified leads across your catalog` },
  ethikslabs:  { headline: 'Platform Admin View',          insight: n => `${n} total leads across the proof360 platform` },
};

function CompanyLogo({ domain, name, size = 40 }) {
  const [err, setErr] = useState(false);
  const initials = (name || '??').split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  if (!domain || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.2,
        background: '#f3f4f6', border: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: size * 0.33, fontWeight: 700, color: '#9ca3af', fontFamily: "'DM Sans', sans-serif" }}>{initials}</span>
      </div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: size * 0.2, objectFit: 'contain', background: '#ffffff', border: '1px solid #e5e7eb', flexShrink: 0 }}
    />
  );
}

function ScoreRing({ score, size = 40 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={4}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
      <text x={size/2} y={size/2} dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={11} fontWeight={700}
        fontFamily="'IBM Plex Mono', monospace"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

function VendorChip({ vendorId, name, tc }) {
  const logo = VENDOR_LOGOS[vendorId];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#ffffff', border: '1px solid #e5e7eb',
      borderRadius: 7, padding: '7px 11px', marginBottom: 5,
    }}>
      {logo ? (
        <img src={logo.src} alt={name} style={{ ...logo.style, objectFit: 'contain', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 20, height: 20, borderRadius: 4, background: `${tc}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 800, color: tc, flexShrink: 0,
        }}>{name.slice(0,2).toUpperCase()}</div>
      )}
      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{name}</span>
    </div>
  );
}

function LeadRow({ lead, tenant, tenantKey, engagement, onEngage, onClick, index }) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const threadKey = `p360_thread_${lead.id}_${tenantKey}`;
  const matchedVendors = getMatchedVendors(lead, tenant);
  const status = engagement?.status || 'new';
  const isNew = status === 'new';
  const isDistributor = tenant?.role === 'distributor';
  const tc = tenant?.color || '#2563eb';
  const matchedGapTitles = new Set(matchedVendors.flatMap(v => v.gaps));
  const st = STATUSES[status];

  useEffect(() => {
    setThread(JSON.parse(localStorage.getItem(threadKey) || '[]'));
    const onStorage = e => { if (e.key === threadKey) setThread(JSON.parse(e.newValue || '[]')); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [threadKey]);

  function sendMessage() {
    if (!draft.trim()) return;
    const msg = { from: 'vendor', sender_name: tenant.name, text: draft.trim(), sent_at: new Date().toISOString() };
    const updated = [...thread, msg];
    localStorage.setItem(threadKey, JSON.stringify(updated));
    setThread(updated);
    setDraft('');
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      marginBottom: 8,
      overflow: 'hidden',
      borderLeft: isNew ? `3px solid ${tc}` : '1px solid #e5e7eb',
      animation: `rowIn 0.25s ease ${index * 35}ms both`,
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', cursor: 'pointer' }}
      >
        <CompanyLogo domain={lead.website} name={lead.company_name} size={40} />
        <ScoreRing score={lead.trust_score} size={34} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
            {isNew && (
              <span style={{
                fontSize: 8, fontWeight: 800, color: tc, background: `${tc}15`,
                padding: '2px 6px', borderRadius: 3, letterSpacing: '0.08em',
                textTransform: 'uppercase', flexShrink: 0,
              }}>NEW</span>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
              {lead.company_name}
            </span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {lead.industry} · {lead.location}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {lead.gaps.map(g => {
              const isMatch = isDistributor || matchedGapTitles.has(g.title);
              const sc = SEV_COLORS[g.severity] || SEV_COLORS.low;
              return (
                <span key={g.gap_id} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  color: isMatch ? tc : '#6b7280',
                  background: isMatch ? `${tc}12` : '#f9fafb',
                  border: isMatch ? `1px solid ${tc}35` : '1px solid #e5e7eb',
                  fontWeight: isMatch ? 600 : 400,
                }}>{g.title}{isMatch && !isDistributor ? ' ✓' : ''}</span>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}>
            {timeAgo(lead.submitted_at)}
          </span>
          {thread.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, color: tc, background: `${tc}15`, border: `1px solid ${tc}30` }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: tc, flexShrink: 0 }} />
              {thread.length} msg
            </span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
            color: st.color, background: st.bg, border: `1px solid ${st.border}`,
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>{st.label}</span>
          <span style={{ color: '#d1d5db', fontSize: 10 }}>{expanded ? '▴' : '▾'}</span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{
          borderTop: '1px solid #f3f4f6',
          padding: '16px 16px 18px',
          background: '#fafafa',
          animation: 'expandIn 0.18s ease',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                Matched vendors
              </p>
              {matchedVendors.length === 0 ? (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>No catalog matches</p>
              ) : matchedVendors.map(v => (
                <VendorChip key={v.vendor_id} vendorId={v.vendor_id} name={v.name} tc={tc} />
              ))}
            </div>
            <div>
              <p style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                Contact
              </p>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 3, fontFamily: "'IBM Plex Mono', monospace" }}>
                {lead.email_hint}
              </div>
              <div style={{ fontSize: 11, color: '#374151', marginBottom: 8 }}>{lead.website}</div>
              {engagement?.engaged_at && (
                <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Engaged {timeAgo(engagement.engaged_at)}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {status === 'new' && (
              <button
                onClick={e => { e.stopPropagation(); onEngage(lead.id, 'engaged'); }}
                style={{
                  padding: '8px 18px', background: tc, color: '#ffffff',
                  border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >Engage lead →</button>
            )}
            {status !== 'new' && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={e => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
                  style={{
                    padding: '7px 13px', background: '#ffffff',
                    border: '1px solid #d1d5db', borderRadius: 7,
                    fontSize: 12, color: '#374151', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                  }}
                >Update status ▾</button>
                {showStatusMenu && (
                  <div style={{
                    position: 'absolute', bottom: '110%', left: 0, background: '#ffffff',
                    border: '1px solid #e5e7eb', borderRadius: 9, overflow: 'hidden',
                    zIndex: 10, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}>
                    {Object.entries(STATUSES).filter(([k]) => k !== 'new').map(([key, val]) => (
                      <button key={key}
                        onClick={e => { e.stopPropagation(); onEngage(lead.id, key); setShowStatusMenu(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px',
                          background: status === key ? '#f9fafb' : 'transparent',
                          border: 'none', color: val.color, fontSize: 12, cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif", fontWeight: status === key ? 700 : 400,
                        }}
                      >{val.label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); window.location.href = `/portal/leads/${lead.id}`; }}
              style={{ padding: '7px 13px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 11, color: '#6b7280', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >Full brief ↗</button>
          </div>

          {/* Message thread */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
              Message thread {thread.length > 0 && `· ${thread.length}`}
            </p>
            {thread.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {thread.map((m, i) => {
                  const isVendor = m.from === 'vendor';
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isVendor ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '80%', background: isVendor ? tc + '15' : '#f3f4f6', border: `1px solid ${isVendor ? tc + '30' : '#e5e7eb'}`, borderRadius: 8, padding: '7px 11px' }}>
                        <p style={{ fontSize: 13, color: '#111827', lineHeight: 1.5 }}>{m.text}</p>
                      </div>
                      <span style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>{m.sender_name} · {timeAgo(m.sent_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Message this founder…"
                style={{ flex: 1, padding: '8px 11px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', color: '#111827' }}
              />
              <button onClick={sendMessage} disabled={!draft.trim()} style={{ padding: '8px 14px', background: tc, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: draft.trim() ? 'pointer' : 'default', opacity: draft.trim() ? 1 : 0.4, fontFamily: "'DM Sans', sans-serif" }}>Send</button>
            </div>
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

  useEffect(() => {
    const stored = localStorage.getItem('portal_auth');
    if (!stored) { navigate('/portal'); return; }
    setAuth(JSON.parse(stored));
    const eng = localStorage.getItem('portal_engagements');
    if (eng) setEngagements(JSON.parse(eng));
    const interval = setInterval(() => {}, 30000);
    return () => clearInterval(interval);
  }, []);

  function engKey(leadId) { return `${leadId}_${auth.tenant}`; }

  function engage(leadId, status) {
    const k = engKey(leadId);
    const prev = engagements[k] || {};
    const updated = {
      ...engagements,
      [k]: { ...prev, status, tenant: auth.tenant, engaged_at: prev.engaged_at || new Date().toISOString() },
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
  const isDistributor = tenant?.role === 'distributor';
  const tc = tenant?.color || '#2563eb';
  const allLeads = filterLeadsForTenant(PORTAL_LEADS, tenant);
  const tenantLogo = TENANT_LOGOS[auth.tenant];

  const counts = {
    all: allLeads.length,
    new: allLeads.filter(l => !engagements[engKey(l.id)]).length,
    active: allLeads.filter(l => ['engaged','quoted'].includes(engagements[engKey(l.id)]?.status)).length,
    won: allLeads.filter(l => engagements[engKey(l.id)]?.status === 'won').length,
  };

  const filtered =
    filter === 'new'    ? allLeads.filter(l => !engagements[engKey(l.id)]) :
    filter === 'active' ? allLeads.filter(l => ['engaged','quoted'].includes(engagements[engKey(l.id)]?.status)) :
    filter === 'won'    ? allLeads.filter(l => engagements[engKey(l.id)]?.status === 'won') :
    allLeads;

  const totalOpportunity = allLeads
    .filter(l => !['won','lost'].includes(engagements[engKey(l.id)]?.status))
    .reduce((sum, l) => sum + l.gaps.reduce((s, g) => s + (g.score_impact || 0) * 200, 0), 0);

  const ctx = TENANT_CONTEXT[auth.tenant] || {};
  const insightText = ctx.insight ? ctx.insight(allLeads.length) : `${allLeads.length} qualified leads`;

  const FILTERS = [
    { id: 'all',    label: 'All',      count: counts.all },
    { id: 'new',    label: 'New',      count: counts.new,    pulse: counts.new > 0 },
    { id: 'active', label: 'Pipeline', count: counts.active },
    { id: 'won',    label: 'Won',      count: counts.won },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
        @keyframes rowIn { from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none} }
        @keyframes expandIn { from{opacity:0}to{opacity:1} }
        *{box-sizing:border-box;margin:0;padding:0}
      `}</style>

      {/* Dark nav — brand chrome */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: '#0A1628',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Main bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {/* Proof360 stamp — quiet */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', opacity: 0.45, flexShrink: 0 }}>
              <Proof360Mark size={16} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
                Proof<span style={{ color: '#E07B39' }}>360</span>
              </span>
            </Link>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', margin: '0 12px' }}>›</span>
            {/* Vendor — dominant */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {tenantLogo ? (
                <img src={tenantLogo.src} alt={tenant.name} style={{ ...tenantLogo.style, objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: 7, background: `${tc}30`,
                  border: `1px solid ${tc}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: tc,
                }}>{tenant?.short || tenant?.name?.slice(0,2).toUpperCase()}</div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {tenant?.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{tenant?.tagline}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: tc, animation: 'pulseDot 3s infinite' }}/>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em' }}>LIVE</span>
              </div>
            </div>
          </div>

          {/* Stats + user */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {[
                { label: 'NEW',         value: counts.new,                                      color: tc },
                { label: 'PIPELINE',    value: counts.active,                                   color: '#60a5fa' },
                { label: 'OPPORTUNITY', value: `$${(totalOpportunity/1000).toFixed(0)}k`,       color: '#fbbf24' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)' }}/>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>
                {auth.tenant === 'ethikslabs' ? 'alfred@ethikslabs.com' : auth.user?.email}
              </div>
              <button onClick={logout} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0, display: 'block' }}>
                Sign out
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Light content area */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 28px' }}>

        {/* Filter tabs — in light area, fully readable */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 16 }}>
          <div style={{
            display: 'inline-flex', background: '#ffffff',
            border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, gap: 2,
          }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '7px 14px',
                background: filter === f.id ? tc : 'transparent',
                border: 'none', borderRadius: 7,
                color: filter === f.id ? '#ffffff' : '#6b7280',
                fontSize: 13, fontWeight: filter === f.id ? 700 : 500,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}>
                {f.label}
                {f.pulse && filter !== f.id && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: tc, animation: 'pulseDot 2s infinite', flexShrink: 0 }}/>
                )}
                {f.count > 0 && (
                  <span style={{
                    fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                    color: filter === f.id ? 'rgba(255,255,255,0.8)' : '#9ca3af',
                    background: filter === f.id ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                    padding: '1px 6px', borderRadius: 20, fontWeight: 600,
                  }}>{f.count}</span>
                )}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: tc, opacity: 0.7, animation: 'pulseDot 3s infinite', display: 'inline-block' }}/>
            <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>LIVE FEED</span>
          </div>
        </div>

        {/* Insight strip */}
        {allLeads.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 0 12px',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <span style={{
              fontSize: 13, color: '#111827', fontWeight: 500,
              background: `${tc}12`, border: `1px solid ${tc}30`,
              padding: '5px 12px', borderRadius: 6,
            }}>{insightText}</span>
            {!isDistributor && allLeads.length > 0 && (
              <span style={{ fontSize: 11, color: '#6b7280', fontFamily: "'IBM Plex Mono', monospace" }}>
                avg trust score {Math.round(allLeads.reduce((s,l) => s + l.trust_score, 0) / allLeads.length)}/100
              </span>
            )}
          </div>
        )}

        {/* Lead feed */}
        <div style={{ paddingTop: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '72px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                {filter === 'new' ? 'No new leads' : filter === 'active' ? 'Pipeline empty' : filter === 'won' ? 'No closed deals' : 'No leads'}
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, maxWidth: 340, margin: '0 auto' }}>
                {filter === 'new' || allLeads.length === 0
                  ? 'Leads appear here as founders complete audits and their gaps match your product catalog.'
                  : 'Engage leads from the All view to move them into your pipeline.'}
              </p>
            </div>
          ) : filtered.map((lead, i) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              tenant={tenant}
              tenantKey={auth.tenant}
              engagement={engagements[engKey(lead.id)]}
              onEngage={engage}
              onClick={id => navigate(`/portal/leads/${id}`)}
              index={i}
            />
          ))}
        </div>

        <p style={{ fontSize: 9, color: '#d1d5db', margin: '24px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.07em' }}>
          REAL-TIME INTENT FEED · EMAIL REVEALED ON ENGAGEMENT · PROOF360.AU
        </p>
      </div>
    </div>
  );
}
