import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { TENANTS, PORTAL_LEADS, getMatchedVendors, timeAgo } from '../data/portal-leads';
import { Proof360Mark } from '../components/Proof360Mark';

const VENDOR_LOGOS = {
  vanta:       { src: '/logos/vanta-partner.svg', style: { height: 22, width: 22, borderRadius: '50%' } },
  aws:         { src: '/logos/aws-partner.png',   style: { height: 22, width: 'auto' } },
  cloudflare:  { src: '/logos/cloudflare.png',    style: { height: 15, width: 'auto', filter: 'invert(1) brightness(0.3)' } },
  cisco_duo:   { src: '/logos/cisco.svg',         style: { height: 15, width: 'auto', filter: 'invert(1) brightness(0.3)' } },
  palo_alto:   { src: '/logos/paloalto.svg',      style: { height: 15, width: 'auto', filter: 'invert(1) brightness(0.3)' } },
  okta:        { src: '/logos/okta.svg',          style: { height: 15, width: 'auto', filter: 'invert(1) brightness(0.3)' } },
  austbrokers: { src: '/logos/cyberpro.png',      style: { height: 22, width: 'auto' } },
};

const TENANT_LOGOS = {
  vanta:       { src: '/logos/vanta-partner.svg', style: { height: 24, width: 24, borderRadius: '50%' } },
  aws:         { src: '/logos/aws-partner.png',   style: { height: 26, width: 'auto' } },
  cloudflare:  { src: '/logos/cloudflare.png',    style: { height: 18, width: 'auto' } },
  cisco:       { src: '/logos/cisco.svg',         style: { height: 18, width: 'auto' } },
  palo_alto:   { src: '/logos/paloalto.svg',      style: { height: 16, width: 'auto' } },
  okta:        { src: '/logos/okta.svg',          style: { height: 18, width: 'auto' } },
  austbrokers: { src: '/logos/cyberpro.png',      style: { height: 24, width: 'auto' } },
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

function ScoreArc({ score, size = 76 }) {
  const sw = 6;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1, letterSpacing: '-0.02em' }}>{score}</span>
        <span style={{ fontSize: 8, color: '#9ca3af', marginTop: 2, letterSpacing: '0.06em' }}>/100</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
      {children}
    </p>
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
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('portal_auth');
    if (!stored) { navigate('/portal'); return; }
    setAuth(JSON.parse(stored)); // eslint-disable-line react-hooks/set-state-in-effect
    const _auth = JSON.parse(localStorage.getItem('portal_auth') || '{}');
    const engs = JSON.parse(localStorage.getItem('portal_engagements') || '{}');
    const k = `${leadId}_${_auth.tenant}`;
    if (engs[k]) setEngagement(engs[k]);
    setThread(JSON.parse(localStorage.getItem(`p360_thread_${k}`) || '[]'));
    const onStorage = e => {
      if (e.key === `p360_thread_${k}`) setThread(JSON.parse(e.newValue || '[]'));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [leadId]);

  const lead = PORTAL_LEADS.find(l => l.id === leadId);
  const tenant = auth ? TENANTS[auth.tenant] : null;
  if (!lead || !tenant) return null;

  const tc = tenant?.color || '#2563eb';
  const tenantLogo = TENANT_LOGOS[auth.tenant];
  const matchedVendors = getMatchedVendors(lead, tenant);
  const status = engagement?.status || 'new';
  const readinessLabel = lead.trust_score >= 70 ? 'Deal ready' : lead.trust_score >= 50 ? 'Partial' : 'Needs work';
  const readinessColor = lead.trust_score >= 70 ? '#059669' : lead.trust_score >= 50 ? '#d97706' : '#dc2626';
  const readinessBg = lead.trust_score >= 70 ? '#d1fae5' : lead.trust_score >= 50 ? '#fef3c7' : '#fee2e2';
  const st = STATUSES[status];

  const engKey = `${leadId}_${auth?.tenant}`;

  function engage() {
    const updated = { ...JSON.parse(localStorage.getItem('portal_engagements') || '{}') };
    updated[engKey] = { status: 'engaged', engaged_at: new Date().toISOString(), tenant: auth.tenant };
    localStorage.setItem('portal_engagements', JSON.stringify(updated));
    setEngagement(updated[engKey]);
    setShowEngage(false);
  }

  function sendMessage() {
    if (!draft.trim()) return;
    const msg = { from: 'vendor', sender_name: tenant.name, text: draft.trim(), sent_at: new Date().toISOString() };
    const updated = [...thread, msg];
    localStorage.setItem(`p360_thread_${engKey}`, JSON.stringify(updated));
    setThread(updated);
    setDraft('');
  }

  function updateStatus(newStatus) {
    const updated = { ...JSON.parse(localStorage.getItem('portal_engagements') || '{}') };
    updated[engKey] = { ...updated[engKey], status: newStatus };
    localStorage.setItem('portal_engagements', JSON.stringify(updated));
    setEngagement(updated[engKey]);
    setShowStatusMenu(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.3}}
        *{box-sizing:border-box;margin:0;padding:0}
      `}</style>

      {/* Dark nav chrome */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: '#0A1628',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', opacity: 0.4, flexShrink: 0 }}>
            <Proof360Mark size={15} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
              Proof<span style={{ color: '#5eead4' }}>360</span>
            </span>
          </Link>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.18)', margin: '0 10px' }}>›</span>
          <button
            onClick={() => navigate('/portal/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {tenantLogo ? (
              <img src={tenantLogo.src} alt={tenant.name} style={{ ...tenantLogo.style, objectFit: 'contain', opacity: 0.9 }} />
            ) : (
              <div style={{
                width: 22, height: 22, borderRadius: 5, background: `${tc}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: tc,
              }}>{tenant.name.slice(0,2).toUpperCase()}</div>
            )}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: "'DM Sans', sans-serif" }}>← {tenant.name}</span>
          </button>
          <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 8px' }}>·</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'IBM Plex Mono', monospace" }}>{lead.id}</span>
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>PROOF360 INTELLIGENCE</span>
      </div>

      {/* White content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 28px', animation: 'fadeUp 0.3s ease' }}>

        {/* Hero card */}
        <div style={{
          background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: '24px', marginBottom: 16,
          borderLeft: `4px solid ${readinessColor}`,
        }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <ScoreArc score={lead.trust_score} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {lead.company_name}
                </h1>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: readinessColor, background: readinessBg,
                  padding: '3px 8px', borderRadius: 20, letterSpacing: '0.07em', textTransform: 'uppercase',
                }}>{readinessLabel}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280', marginBottom: 12, flexWrap: 'wrap' }}>
                <span>{lead.industry}</span>
                <span>·</span>
                <span>{lead.location}</span>
                <span>·</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{timeAgo(lead.submitted_at)}</span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {lead.gaps.map(g => {
                  const sc = SEV_COLORS[g.severity] || SEV_COLORS.low;
                  return (
                    <span key={g.gap_id} style={{
                      fontSize: 11, padding: '3px 9px', borderRadius: 4,
                      color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                    }}>{g.title}</span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Engage CTA */}
        {status === 'new' && !showEngage && (
          <button
            onClick={() => setShowEngage(true)}
            style={{
              width: '100%', padding: '13px', background: tc, color: '#ffffff',
              border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em',
              marginBottom: 16, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >Engage this lead →</button>
        )}

        {status === 'new' && showEngage && (
          <div style={{
            background: `${tc}08`, border: `1px solid ${tc}30`,
            borderRadius: 10, padding: '18px 20px', marginBottom: 16,
          }}>
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 14, lineHeight: 1.7 }}>
              Engaging <strong style={{ color: '#111827' }}>{lead.company_name}</strong> signals intent to Proof360. Contact details unlock on confirmation.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={engage} style={{
                padding: '9px 18px', background: tc, color: '#ffffff',
                border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>Confirm engagement</button>
              <button onClick={() => setShowEngage(false)} style={{
                padding: '9px 14px', background: 'transparent',
                color: '#6b7280', border: '1px solid #d1d5db',
                borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>Cancel</button>
            </div>
          </div>
        )}

        {status !== 'new' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderLeft: `3px solid ${st.color}`,
            borderRadius: 8, padding: '12px 16px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Status</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                color: st.color, background: st.bg, border: `1px solid ${st.border}`,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>{st.label}</span>
              {engagement?.engaged_at && (
                <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}>
                  · engaged {timeAgo(engagement.engaged_at)}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowStatusMenu(!showStatusMenu)} style={{
                padding: '6px 12px', background: '#f9fafb',
                border: '1px solid #d1d5db', borderRadius: 6,
                fontSize: 11, color: '#374151', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              }}>Update ▾</button>
              {showStatusMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%', background: '#ffffff',
                  border: '1px solid #e5e7eb', borderRadius: 9, overflow: 'hidden',
                  zIndex: 20, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                }}>
                  {Object.entries(STATUSES).filter(([k]) => k !== 'new').map(([key, val]) => (
                    <button key={key} onClick={() => updateStatus(key)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      textAlign: 'left', padding: '9px 14px',
                      background: status === key ? '#f9fafb' : 'transparent',
                      border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: val.color, flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, color: val.color, fontWeight: status === key ? 700 : 400 }}>{val.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gap + Vendor grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px' }}>
            <SectionLabel>Security gaps ({lead.gaps.length})</SectionLabel>
            {lead.gaps.map((g, i) => {
              const sc = SEV_COLORS[g.severity] || SEV_COLORS.low;
              return (
                <div key={g.gap_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  paddingBottom: 10, marginBottom: 10,
                  borderBottom: i < lead.gaps.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <span style={{
                    fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 3,
                    color: sc.color, background: sc.bg, textTransform: 'uppercase',
                    letterSpacing: '0.06em', flexShrink: 0,
                  }}>{g.severity}</span>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{g.title}</span>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px' }}>
            <SectionLabel>Matched vendors ({matchedVendors.length})</SectionLabel>
            {matchedVendors.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>No catalog matches for this lead.</p>
            ) : matchedVendors.map((v, i) => {
              const logo = VENDOR_LOGOS[v.vendor_id];
              return (
                <div key={v.vendor_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  paddingBottom: 10, marginBottom: 10,
                  borderBottom: i < matchedVendors.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  {logo ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, flexShrink: 0 }}>
                      <img src={logo.src} alt={v.name} style={{ ...logo.style, objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 28, height: 22, borderRadius: 4, background: `${tc}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 800, color: tc, flexShrink: 0,
                    }}>{v.name.slice(0,2).toUpperCase()}</div>
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{v.name}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{v.gaps.join(' · ')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px' }}>
          <SectionLabel>Contact</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{
                fontSize: 14, color: contactRevealed ? '#111827' : '#d1d5db',
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 5,
                filter: contactRevealed ? 'none' : 'blur(5px)',
                transition: 'filter 0.4s, color 0.3s',
                userSelect: contactRevealed ? 'text' : 'none',
              }}>{lead.email_hint}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{lead.website}</div>
            </div>
            {status !== 'new' && !contactRevealed && (
              <button
                onClick={() => setContactRevealed(true)}
                style={{
                  padding: '8px 16px', background: `${tc}0d`,
                  border: `1px solid ${tc}35`, borderRadius: 7,
                  fontSize: 12, color: tc, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >Reveal contact</button>
            )}
            {status === 'new' && (
              <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Engage to unlock</span>
            )}
          </div>
        </div>

        {/* Message thread */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px' }}>
          <SectionLabel>Message thread</SectionLabel>
          {thread.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginBottom: 14 }}>No messages yet. Start the conversation.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {thread.map((m, i) => {
                const isVendor = m.from === 'vendor';
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isVendor ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '80%', background: isVendor ? tc + '18' : '#f3f4f6', border: `1px solid ${isVendor ? tc + '30' : '#e5e7eb'}`, borderRadius: 8, padding: '8px 12px' }}>
                      <p style={{ fontSize: 13, color: '#111827', lineHeight: 1.5 }}>{m.text}</p>
                    </div>
                    <span style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {m.sender_name} · {timeAgo(m.sent_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Write a message…"
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', color: '#111827' }}
            />
            <button
              onClick={sendMessage}
              disabled={!draft.trim()}
              style={{ padding: '9px 16px', background: tc, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: draft.trim() ? 'pointer' : 'default', opacity: draft.trim() ? 1 : 0.4, fontFamily: "'DM Sans', sans-serif" }}
            >Send</button>
          </div>
        </div>

      </div>
    </div>
  );
}
