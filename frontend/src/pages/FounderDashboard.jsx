import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PersonaChat from '../components/PersonaChat';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const NAVY  = '#0B2545';
const AMBER = '#E07B39';
const WHITE = '#FFFFFF';
const OFFWHITE = '#F7F8FA';
const BORDER = '#E4E7EC';
const TEXT   = '#101828';
const MUTED  = '#667085';
const LIGHT  = '#98A2B3';

const PIPELINE_STAGES = [
  { key: 'new',           label: 'New',            color: '#6366F1', bg: '#EEF2FF' },
  { key: 'contacted',     label: 'Contacted',       color: '#0EA5E9', bg: '#E0F2FE' },
  { key: 'meeting_booked',label: 'Meeting Booked',  color: '#E07B39', bg: '#FFF4ED' },
  { key: 'in_progress',   label: 'In Progress',     color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'sold',          label: 'Sold',            color: '#16A34A', bg: '#F0FDF4' },
];

const STAGE_MAP = Object.fromEntries(PIPELINE_STAGES.map(s => [s.key, s]));

/* ─── Demo seed data (shown when proof360_engagements is empty) ──────────── */
const now = Date.now();
const DEMO_ENGAGEMENTS = [
  {
    id: 'demo_e1', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'vanta', vendor_name: 'Vanta',
    gap_id: 'soc2', gap_title: 'SOC 2 certification gap',
    status: 'meeting_booked', engaged_at: new Date(now - 2 * 3600000).toISOString(),
  },
  {
    id: 'demo_e2', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'crowdstrike', vendor_name: 'CrowdStrike',
    gap_id: 'edr', gap_title: 'Endpoint protection gap',
    status: 'contacted', engaged_at: new Date(now - 5 * 3600000).toISOString(),
  },
  {
    id: 'demo_e3', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'cisco_duo', vendor_name: 'Cisco Duo',
    gap_id: 'mfa', gap_title: 'MFA not enforced',
    status: 'new', engaged_at: new Date(now - 45 * 60000).toISOString(),
  },
  {
    id: 'demo_e4', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'cloudflare', vendor_name: 'Cloudflare',
    gap_id: 'network_perimeter', gap_title: 'Network perimeter gap',
    status: 'in_progress', engaged_at: new Date(now - 27 * 3600000).toISOString(),
  },
  {
    id: 'demo_e5', session_id: 'demo',
    company_name: 'Stackfield', vendor_id: 'austbrokers', vendor_name: 'Austbrokers CyberPro',
    gap_id: 'cyber_insurance', gap_title: 'No cyber insurance',
    status: 'sold', engaged_at: new Date(now - 3 * 86400000).toISOString(),
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function VendorInitials({ name, size = 36 }) {
  const initials = (name || '??').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: `hsl(${hue},40%,90%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700,
      color: `hsl(${hue},50%,30%)`,
      fontFamily: '"Outfit", sans-serif',
      border: `1px solid hsl(${hue},30%,82%)`,
    }}>
      {initials}
    </div>
  );
}

function StageBadge({ status }) {
  const s = STAGE_MAP[status] || STAGE_MAP.new;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
      color: s.color, background: s.bg,
      fontFamily: '"Outfit", sans-serif', whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function Proof360Mark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="7" fill="#0B2545" />
      <path d="M16 5L25 8.8V15.5C25 20.5 21 24.8 16 26.5C11 24.8 7 20.5 7 15.5V8.8L16 5Z"
        stroke="#E07B39" strokeWidth="1.4" fill="none" />
      <path d="M11.5 16L14.5 19L20.5 13"
        stroke="#E07B39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── ScoreRing ──────────────────────────────────────────────────────────── */
function ScoreRing({ score, size = 52 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={5}/>
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

/* ─── FounderDashboard ───────────────────────────────────────────────────── */
export default function FounderDashboard() {
  const navigate = useNavigate();
  const [auth, setAuth]             = useState(null);
  const [reports, setReports]       = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [isDemo, setIsDemo]         = useState(false);
  const [activeStage, setActiveStage] = useState('all');

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('founder_auth');
    if (!stored) { navigate('/account/login'); return; }
    setAuth(JSON.parse(stored));

    const savedReports = JSON.parse(localStorage.getItem('founder_reports') || '[]');
    setReports(savedReports);

    // Read founder's own vendor engagements (booked from report page)
    const raw = JSON.parse(localStorage.getItem('proof360_engagements') || '[]');

    if (raw.length === 0) {
      setEngagements(DEMO_ENGAGEMENTS);
      setIsDemo(true);
    } else {
      setEngagements(raw.sort((a, b) => new Date(b.engaged_at) - new Date(a.engaged_at)));
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
    if (!isDemo) {
      localStorage.setItem('proof360_engagements', JSON.stringify(updated));
    }
  }

  if (!auth) return null;

  const filtered = activeStage === 'all'
    ? engagements
    : engagements.filter(e => e.status === activeStage);

  const stageCounts = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.key] = engagements.filter(e => e.status === s.key).length;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: OFFWHITE, fontFamily: '"Outfit", sans-serif' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeUp 0.4s ease both; }
        .eng-row:hover { background: #F0F4FF !important; }
        .stage-btn:hover { opacity: 0.8; }
      `}</style>

      {/* Nav */}
      <nav style={{
        background: WHITE, borderBottom: `1px solid ${BORDER}`,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          maxWidth: 860, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56,
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Proof360Mark size={24} />
            <span style={{ fontSize: 16, fontWeight: 700, color: NAVY, letterSpacing: '-0.01em' }}>
              Proof<span style={{ color: AMBER }}>360</span>
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: LIGHT }}>{auth.user?.email}</span>
            <button onClick={logout} style={{
              fontSize: 12, color: MUTED, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: '"Outfit", sans-serif',
            }}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 100px' }}>

        {/* Header */}
        <div className="fade-in" style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, letterSpacing: '-0.02em', marginBottom: 6 }}>
            {auth.user?.name ? `Welcome back, ${auth.user.name.split(' ')[0]}` : 'Your account'}
          </h1>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            Your trust remediation pipeline — all vendor engagements in one place.
          </p>
          {isDemo && (
            <div style={{
              marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#FFFBEB', border: '1px solid #FCD34D',
              borderRadius: 6, padding: '6px 12px',
            }}>
              <span style={{ fontSize: 11, color: '#B45309', fontFamily: '"Outfit", sans-serif' }}>
                Demo data — book meetings from a report to populate your real pipeline
              </span>
              <Link to="/report/demo" style={{ fontSize: 11, color: AMBER, fontWeight: 600, textDecoration: 'none' }}>
                View demo report →
              </Link>
            </div>
          )}
        </div>

        {/* Pipeline summary */}
        <div className="fade-in" style={{
          display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 28,
          animationDelay: '0.05s',
        }}>
          {PIPELINE_STAGES.map(stage => (
            <button
              key={stage.key}
              className="stage-btn"
              onClick={() => setActiveStage(activeStage === stage.key ? 'all' : stage.key)}
              style={{
                background: activeStage === stage.key ? stage.bg : WHITE,
                border: `1.5px solid ${activeStage === stage.key ? stage.color : BORDER}`,
                borderRadius: 10, padding: '14px 12px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
                fontFamily: '"Outfit", sans-serif',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: stage.color, lineHeight: 1, marginBottom: 4 }}>
                {stageCounts[stage.key]}
              </div>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>{stage.label}</div>
            </button>
          ))}
        </div>

        {/* Engagement list */}
        <div className="fade-in" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: AMBER, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {activeStage === 'all' ? 'All engagements' : STAGE_MAP[activeStage]?.label}
              {' '}· {filtered.length}
            </p>
            <Link to="/audit" style={{ fontSize: 13, color: AMBER, textDecoration: 'none', fontWeight: 600 }}>
              + New audit
            </Link>
          </div>

          {filtered.length === 0 ? (
            <div style={{
              background: WHITE, border: `1.5px dashed ${BORDER}`,
              borderRadius: 12, padding: '48px 24px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 14, color: MUTED, marginBottom: 8 }}>No engagements in this stage</p>
              <button onClick={() => setActiveStage('all')} style={{
                fontSize: 13, color: AMBER, background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: '"Outfit", sans-serif', fontWeight: 600,
              }}>
                Show all →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(eng => {
                const stage = STAGE_MAP[eng.status] || STAGE_MAP.new;
                return (
                  <div
                    key={eng.id}
                    className="eng-row"
                    style={{
                      background: WHITE, border: `1px solid ${BORDER}`,
                      borderLeft: `4px solid ${stage.color}`,
                      borderRadius: 10, padding: '18px 20px',
                      display: 'flex', alignItems: 'center', gap: 16,
                      transition: 'background 0.15s',
                    }}
                  >
                    <VendorInitials name={eng.vendor_name} size={40} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>{eng.vendor_name}</span>
                        <StageBadge status={eng.status} />
                      </div>
                      <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                        {eng.gap_title || 'Trust gap remediation'}
                        {eng.company_name && eng.company_name !== 'Your company' && (
                          <span style={{ color: LIGHT }}> · {eng.company_name}</span>
                        )}
                      </p>
                    </div>

                    {/* Stage mover */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <select
                        value={eng.status}
                        onChange={e => updateStatus(eng.id, e.target.value)}
                        style={{
                          fontSize: 12, color: MUTED, background: OFFWHITE,
                          border: `1px solid ${BORDER}`, borderRadius: 6,
                          padding: '4px 8px', cursor: 'pointer',
                          fontFamily: '"Outfit", sans-serif',
                        }}
                      >
                        {PIPELINE_STAGES.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 11, color: LIGHT, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'nowrap' }}>
                        {timeAgo(eng.engaged_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Saved reports */}
        {reports.length > 0 && (
          <div className="fade-in" style={{ marginTop: 40, animationDelay: '0.15s' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: AMBER, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              Saved reports
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reports.map(r => (
                <div key={r.sessionId} style={{
                  background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10,
                  padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  <ScoreRing score={r.trust_score} size={44} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 3 }}>{r.company_name}</p>
                    <p style={{ fontSize: 12, color: LIGHT }}>{r.gaps_count} gaps · {timeAgo(r.saved_at)}</p>
                  </div>
                  <Link to={`/report/${r.sessionId}`} style={{
                    fontSize: 13, color: NAVY, textDecoration: 'none', fontWeight: 600,
                  }}>
                    View →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: LIGHT }}>
            proof360 · Trust readiness for founders ·{' '}
            <Link to="/portal" style={{ color: LIGHT, textDecoration: 'underline' }}>Partner portal</Link>
          </p>
        </div>

        {/* ── Persona chat ── */}
        {personaContext && <PersonaChat context={personaContext} />}
      </div>
    </div>
  );
}
