import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PersonaChat from '../components/PersonaChat';
const VENDOR_LOGOS = {
  vanta:       { src: '/logos/vanta-partner.svg', style: { height: 22, width: 22, borderRadius: '50%' } },
  aws:         { src: '/logos/aws-partner.png',   style: { height: 22, width: 'auto' } },
  cloudflare:  { src: '/logos/cloudflare.png',    style: { height: 14, width: 'auto', filter: 'invert(1) brightness(0.2)' } },
  cisco_duo:   { src: '/logos/cisco.svg',         style: { height: 14, width: 'auto', filter: 'invert(1) brightness(0.2)' } },
  palo_alto:   { src: '/logos/paloalto.svg',      style: { height: 14, width: 'auto', filter: 'invert(1) brightness(0.2)' } },
  okta:        { src: '/logos/okta.svg',          style: { height: 14, width: 'auto', filter: 'invert(1) brightness(0.2)' } },
  austbrokers: { src: '/logos/cyberpro.png',      style: { height: 22, width: 'auto' } },
};

const PIPELINE_STAGES = [
  { key: 'new',            label: 'New',           color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
  { key: 'contacted',      label: 'Contacted',     color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  { key: 'meeting_booked', label: 'Meeting Booked',color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  { key: 'in_progress',    label: 'In Progress',   color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'sold',           label: 'Sold',          color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
];

const STAGE_MAP = Object.fromEntries(PIPELINE_STAGES.map(s => [s.key, s]));

const now = Date.now();
const DEMO_ENGAGEMENTS = [
  {
    id: 'demo_e1', lead_id: 'lead_stackfield', tenant_id: 'vanta', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'vanta', vendor_name: 'Vanta',
    gap_id: 'soc2', gap_title: 'SOC 2 certification gap',
    gap_why: 'Your public signals show no SOC 2 report referenced anywhere. Enterprise buyers — especially in financial services and SaaS — require this before contracts above $50k. Without it, deals stall at legal review.',
    vendor_why: 'Vanta automates evidence collection and maps your existing controls to SOC 2 requirements. Median time to Type I is 8 weeks. Their platform stays live after the audit, so you stay compliant as you grow.',
    defaultStatus: 'meeting_booked', engaged_at: new Date(now - 2 * 3600000).toISOString(),
  },
  {
    id: 'demo_e2', lead_id: 'lead_stackfield', tenant_id: 'crowdstrike', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'crowdstrike', vendor_name: 'CrowdStrike',
    gap_id: 'edr', gap_title: 'No endpoint detection & response',
    gap_why: 'We found no endpoint protection signals in your public tech stack — no job listings for endpoint security, no security-tooling references in public repos. Regulated buyers run vendor risk assessments that check for EDR coverage.',
    vendor_why: 'CrowdStrike Falcon is the enterprise-standard EDR. It deploys in under an hour and shows up on vendor risk questionnaires as a recognisable signal. Insurance providers also discount premiums when you can show EDR coverage.',
    defaultStatus: 'contacted', engaged_at: new Date(now - 5 * 3600000).toISOString(),
  },
  {
    id: 'demo_e3', lead_id: 'lead_stackfield', tenant_id: 'cisco', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'cisco_duo', vendor_name: 'Cisco Duo',
    gap_id: 'mfa', gap_title: 'MFA not enforced',
    gap_why: 'Your DNS and HTTP signals indicate no MFA enforcement on your public-facing login. This is now a baseline requirement for cyber insurance and a pass/fail question on most enterprise vendor risk forms.',
    vendor_why: 'Cisco Duo is the most widely-accepted MFA solution in enterprise vendor questionnaires. Rolling it out across your team takes less than a day and immediately closes this gap on your next audit.',
    defaultStatus: 'new', engaged_at: new Date(now - 45 * 60000).toISOString(),
  },
  {
    id: 'demo_e4', lead_id: 'lead_stackfield', tenant_id: 'cloudflare', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'cloudflare', vendor_name: 'Cloudflare',
    gap_id: 'network_perimeter', gap_title: 'Network perimeter exposure',
    gap_why: 'Port scans found services exposed directly to the internet that should be behind a gateway or WAF. This is a common finding that enterprise security teams flag as a blocker during procurement.',
    vendor_why: 'Cloudflare Zero Trust puts a proxy in front of your exposed services in minutes — no code changes, no downtime. Their free tier covers the basics; enterprise adds DLP and device posture.',
    defaultStatus: 'in_progress', engaged_at: new Date(now - 27 * 3600000).toISOString(),
  },
  {
    id: 'demo_e5', lead_id: 'lead_stackfield', tenant_id: 'austbrokers', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'austbrokers', vendor_name: 'Austbrokers CyberPro',
    gap_id: 'cyber_insurance', gap_title: 'No cyber insurance',
    gap_why: 'No cyber insurance policy was detected. Large enterprise buyers increasingly require proof of coverage before signing — and breaches happen regardless of how strong your controls are. Insurance is the backstop.',
    vendor_why: 'Austbrokers CyberPro specialise in tech company cyber insurance and understand startup balance sheets. They can bind a policy in 48 hours and provide the certificate of currency that buyers ask for.',
    defaultStatus: 'sold', engaged_at: new Date(now - 3 * 86400000).toISOString(),
  },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function VendorAvatar({ vendorId, name, size = 38 }) {
  const logo = VENDOR_LOGOS[vendorId];
  if (logo) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 9, background: '#f3f4f6',
        border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, padding: 6,
      }}>
        <img src={logo.src} alt={name} style={{ ...logo.style, objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }} />
      </div>
    );
  }
  const initials = (name || '??').split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase();
  const hue = (name || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: 9, flexShrink: 0,
      background: `hsl(${hue},45%,92%)`, border: `1px solid hsl(${hue},35%,82%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: `hsl(${hue},50%,30%)`,
      fontFamily: "'DM Sans', sans-serif",
    }}>{initials}</div>
  );
}

function CompanyLogo({ domain, name, size = 44 }) {
  const [err, setErr] = useState(false);
  const initials = (name || '??').split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  if (!domain || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.2,
        background: '#f3f4f6', border: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
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

function ScoreRing({ score, size = 52 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#15803d' : score >= 50 ? '#b45309' : '#b91c1c';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
      <text x={size/2} y={size/2} dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={size < 40 ? 9 : 13} fontWeight={700}
        fontFamily="'IBM Plex Mono', monospace"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

export default function FounderDashboard() {
  const navigate = useNavigate();
  const [auth, setAuth]               = useState(null);
  const [reports, setReports]         = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [isDemo, setIsDemo]           = useState(false);
  const [activeStage, setActiveStage] = useState('all');
  const [openThread, setOpenThread]   = useState(null);
  const [threads, setThreads]         = useState({});
  const [drafts, setDrafts]           = useState({});
  const [openDetail, setOpenDetail]   = useState(new Set());

  useEffect(() => {
    const stored = localStorage.getItem('founder_auth');
    if (!stored) { navigate('/account/login'); return; }
    setAuth(JSON.parse(stored)); // eslint-disable-line react-hooks/set-state-in-effect

    const savedReports = JSON.parse(localStorage.getItem('founder_reports') || '[]');
    setReports(savedReports); // eslint-disable-line react-hooks/set-state-in-effect

    const raw = JSON.parse(localStorage.getItem('proof360_engagements') || '[]');
    if (raw.length === 0) {
      // Seed portal_engagements with demo defaults if not already set
      const portalEngs = JSON.parse(localStorage.getItem('portal_engagements') || '{}');
      const seeded = { ...portalEngs };
      for (const e of DEMO_ENGAGEMENTS) {
        const k = `${e.lead_id}_${e.tenant_id}`;
        if (!seeded[k]) seeded[k] = { status: e.defaultStatus, engaged_at: e.engaged_at, tenant: e.tenant_id };
      }
      localStorage.setItem('portal_engagements', JSON.stringify(seeded));
      // Seed demo thread for Vanta if empty
      const vantaThreadKey = 'p360_thread_lead_stackfield_vanta';
      if (!localStorage.getItem(vantaThreadKey)) {
        localStorage.setItem(vantaThreadKey, JSON.stringify([
          { from: 'vendor', sender_name: 'Vanta', text: "Hi — we noticed your SOC 2 gap. We can get you audit-ready in 8 weeks. Want to scope it out?", sent_at: new Date(now - 2 * 3600000).toISOString() },
        ]));
      }
      // Load all threads
      const loadedThreads = {};
      for (const e of DEMO_ENGAGEMENTS) {
        const k = `${e.lead_id}_${e.tenant_id}`;
        loadedThreads[k] = JSON.parse(localStorage.getItem(`p360_thread_${k}`) || '[]');
      }
      setThreads(loadedThreads);
      // Build display list with live status from portal_engagements
      const display = DEMO_ENGAGEMENTS.map(e => ({
        ...e,
        status: seeded[`${e.lead_id}_${e.tenant_id}`]?.status || e.defaultStatus,
      }));
      setEngagements(display);
      setIsDemo(true);
    } else {
      setEngagements(raw.sort((a,b) => new Date(b.engaged_at) - new Date(a.engaged_at)));
    }
  }, []);

  const mostRecentReport = reports.length > 0
    ? reports.slice().sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))[0]
    : null;

  const personaContext = mostRecentReport ? {
    company_name: mostRecentReport.company_name,
    score: mostRecentReport.trust_score,
    website: mostRecentReport.website || null,
    gaps: (mostRecentReport.gaps || []).map(g => ({ id: g.gap_id || g.id, severity: g.severity })),
  } : null;

  function logout() {
    localStorage.removeItem('founder_auth');
    navigate('/account/login');
  }

  function updateStatus(id, newStatus) {
    const updated = engagements.map(e => e.id === id ? { ...e, status: newStatus } : e);
    setEngagements(updated);
    const eng = engagements.find(e => e.id === id);
    if (eng?.lead_id && eng?.tenant_id) {
      const portalEngs = JSON.parse(localStorage.getItem('portal_engagements') || '{}');
      const k = `${eng.lead_id}_${eng.tenant_id}`;
      portalEngs[k] = { ...portalEngs[k], status: newStatus };
      localStorage.setItem('portal_engagements', JSON.stringify(portalEngs));
    } else {
      localStorage.setItem('proof360_engagements', JSON.stringify(updated));
    }
  }

  function sendFounderMessage(engKey) {
    const text = (drafts[engKey] || '').trim();
    if (!text) return;
    const msg = { from: 'founder', sender_name: auth.user?.name || 'Founder', text, sent_at: new Date().toISOString() };
    const updated = [...(threads[engKey] || []), msg];
    localStorage.setItem(`p360_thread_${engKey}`, JSON.stringify(updated));
    setThreads(t => ({ ...t, [engKey]: updated }));
    setDrafts(d => ({ ...d, [engKey]: '' }));
  }

  if (!auth) return null;

  const filtered = activeStage === 'all' ? engagements : engagements.filter(e => e.status === activeStage);
  const stageCounts = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.key] = engagements.filter(e => e.status === s.key).length;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "'DM Sans', sans-serif", paddingBottom: 70 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .fade-in{animation:fadeUp 0.35s ease both}
      `}</style>

      {/* Nav */}
      <nav style={{ background: '#0A1628', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/glyph.svg" width={22} height={22} alt="" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Proof<span style={{ color: '#5eead4' }}>360</span>
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: '#5eead4', color: '#0A1628',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {(auth.user?.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 1 }}>FOUNDER ACCOUNT</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: "'IBM Plex Mono', monospace" }}>{auth.user?.email}</p>
              </div>
            </div>
            <button onClick={logout} style={{
              fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >Sign out</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* Header */}
        <div className="fade-in" style={{ marginBottom: 28 }}>

          {/* HX context block — answers: what is this / why am I here / what do I do */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
            {/* What is Proof360 — always first, always visible */}
            <p style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 7 }}>
              PROOF360 — TRUST READINESS PLATFORM
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.55, marginBottom: 6, letterSpacing: '-0.01em' }}>
              Proof360 scans your company's public signals and scores your security posture — the same checks enterprise partners run before they say yes to a deal.
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: mostRecentReport ? 16 : 12 }}>
              When gaps are found, Proof360 matches you directly with the vendors who close them. This page is your remediation pipeline — track every conversation in one place.
            </p>

            {mostRecentReport ? (
              <>
                <div style={{ height: 1, background: '#f1f5f9', margin: '0 -2px 16px' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                    padding: '10px 14px', flex: 1,
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#15803d', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 5, textTransform: 'uppercase' }}>
                      Your last scan · {(mostRecentReport.company_name || '').toUpperCase()} · Score {mostRecentReport.trust_score}/100 · {timeAgo(mostRecentReport.saved_at)}
                    </p>
                    <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 8 }}>
                      Found <strong>{mostRecentReport.gaps_count} {mostRecentReport.gaps_count === 1 ? 'gap' : 'gaps'}</strong>. Every vendor in the list below was matched to close one — that's the only reason they're here.
                    </p>
                    <Link to={`/report/${mostRecentReport.sessionId}`} style={{ fontSize: 12, color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid #86efac', paddingBottom: 1 }}>
                      View full report →
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <Link to="/audit" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5eead4', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid #5eead4', paddingBottom: 1 }}>
                Run your first scan — takes 90 seconds →
              </Link>
            )}
          </div>
          {isDemo && (
            <div style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#fffbeb', border: '1px solid #fcd34d',
              borderRadius: 7, padding: '7px 12px',
            }}>
              <span style={{ fontSize: 11, color: '#92400e' }}>
                Demo data — book meetings from a report to populate your real pipeline
              </span>
              <Link to="/report/demo" style={{ fontSize: 11, color: '#5eead4', fontWeight: 700, textDecoration: 'none' }}>
                View demo →
              </Link>
            </div>
          )}
        </div>

        {/* Pipeline summary cards */}
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 24, animationDelay: '0.05s' }}>
          {PIPELINE_STAGES.map(stage => (
            <button
              key={stage.key}
              onClick={() => setActiveStage(activeStage === stage.key ? 'all' : stage.key)}
              style={{
                background: activeStage === stage.key ? stage.bg : '#ffffff',
                border: `1.5px solid ${activeStage === stage.key ? stage.color : '#e5e7eb'}`,
                borderRadius: 10, padding: '14px 12px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: stage.color, lineHeight: 1, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                {stageCounts[stage.key]}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {stage.label}
              </div>
            </button>
          ))}
        </div>

        {/* Engagements */}
        <div className="fade-in" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#5eead4', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {activeStage === 'all' ? 'All engagements' : STAGE_MAP[activeStage]?.label} · {filtered.length}
            </p>
            <Link to="/audit" style={{ fontSize: 13, color: '#0A1628', textDecoration: 'none', fontWeight: 600 }}>
              + New audit
            </Link>
          </div>

          {filtered.length === 0 ? (
            <div style={{
              background: '#ffffff', border: '1.5px dashed #e5e7eb',
              borderRadius: 12, padding: '48px 24px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 10 }}>No engagements in this stage</p>
              <button onClick={() => setActiveStage('all')} style={{
                fontSize: 13, color: '#5eead4', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
              }}>Show all →</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(eng => {
                const stage = STAGE_MAP[eng.status] || STAGE_MAP.new;
                const engKey = eng.lead_id ? `${eng.lead_id}_${eng.tenant_id}` : eng.id;
                const engThread = threads[engKey] || [];
                const isThreadOpen = openThread === engKey;
                const unread = engThread.filter(m => m.from === 'vendor').length;
                return (
                  <div key={eng.id} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderLeft: `3px solid ${stage.color}`, borderRadius: 10, overflow: 'hidden', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div
                      onClick={() => setOpenDetail(prev => { const next = new Set(prev); if (next.has(engKey)) next.delete(engKey); else next.add(engKey); return next; })}
                      style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                    >
                      <VendorAvatar vendorId={eng.vendor_id} name={eng.vendor_name} size={40} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{eng.vendor_name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: stage.color, background: stage.bg, border: `1px solid ${stage.border}`, letterSpacing: '0.03em' }}>{stage.label}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{eng.gap_title || 'Trust gap remediation'}</p>
                        <p style={{ fontSize: 10, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.02em' }}>
                          {openDetail.has(engKey) ? '▲ hide context' : '▼ why this vendor'}
                        </p>
                      </div>

                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => setOpenThread(isThreadOpen ? null : engKey)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: isThreadOpen ? '#0A1628' : '#f3f4f6', border: '1px solid', borderColor: isThreadOpen ? '#0A1628' : '#e5e7eb', borderRadius: 6, fontSize: 11, fontWeight: 600, color: isThreadOpen ? '#fff' : '#6b7280', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {unread > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5eead4', flexShrink: 0 }} />}
                          {engThread.length > 0 ? `${engThread.length} msg` : 'Message'}
                        </button>
                        <select value={eng.status} onChange={e => updateStatus(eng.id, e.target.value)} style={{ fontSize: 12, color: '#374151', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                          {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' }}>{timeAgo(eng.engaged_at)}</span>
                      </div>
                    </div>

                    {/* Why this vendor — context panel */}
                    {openDetail.has(engKey) && eng.gap_why && (
                      <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 18px 20px', background: '#f9fafb' }}>
                        <div style={{ marginBottom: 14 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 7, textTransform: 'uppercase' }}>
                            Why this gap matters
                          </p>
                          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{eng.gap_why}</p>
                        </div>
                        <div style={{ paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
                          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 7, textTransform: 'uppercase' }}>
                            Why {eng.vendor_name}
                          </p>
                          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{eng.vendor_why}</p>
                        </div>
                      </div>
                    )}

                    {/* Thread panel */}
                    {isThreadOpen && (
                      <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 18px', background: '#fafafa' }}>
                        {engThread.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            {engThread.map((m, i) => {
                              const isVendor = m.from === 'vendor';
                              return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isVendor ? 'flex-start' : 'flex-end' }}>
                                  <div style={{ maxWidth: '80%', background: isVendor ? '#ffffff' : '#0A1628', border: `1px solid ${isVendor ? '#e5e7eb' : '#0A1628'}`, borderRadius: 8, padding: '7px 11px' }}>
                                    <p style={{ fontSize: 13, color: isVendor ? '#111827' : '#ffffff', lineHeight: 1.5 }}>{m.text}</p>
                                  </div>
                                  <span style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>{m.sender_name} · {timeAgo(m.sent_at)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={drafts[engKey] || ''}
                            onChange={e => setDrafts(d => ({ ...d, [engKey]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendFounderMessage(engKey)}
                            placeholder="Reply…"
                            style={{ flex: 1, padding: '8px 11px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', color: '#111827' }}
                          />
                          <button onClick={() => sendFounderMessage(engKey)} disabled={!(drafts[engKey] || '').trim()} style={{ padding: '8px 14px', background: '#0A1628', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: (drafts[engKey] || '').trim() ? 'pointer' : 'default', opacity: (drafts[engKey] || '').trim() ? 1 : 0.35, fontFamily: "'DM Sans', sans-serif" }}>Reply</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Saved reports */}
        {reports.length > 0 && (
          <div className="fade-in" style={{ marginTop: 36, animationDelay: '0.15s' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#5eead4', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Saved reports
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reports.map(r => (
                <div key={r.sessionId} style={{
                  background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10,
                  padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <CompanyLogo domain={r.website} name={r.company_name} size={44} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{r.company_name}</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}>
                      Score {r.trust_score} · {r.gaps_count} gaps · {timeAgo(r.saved_at)}
                    </p>
                  </div>
                  <Link to={`/report/${r.sessionId}`} style={{
                    fontSize: 13, color: '#0A1628', textDecoration: 'none', fontWeight: 700,
                  }}>View →</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#d1d5db', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.04em' }}>
            PROOF360.AU · TRUST READINESS FOR FOUNDERS ·{' '}
            <Link to="/portal" style={{ color: '#d1d5db', textDecoration: 'underline' }}>PARTNER PORTAL</Link>
          </p>
        </div>

        {/* ── Persona chat ── */}
        {personaContext && <PersonaChat context={personaContext} />}
      </div>
    </div>
  );
}
