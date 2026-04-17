import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TENANTS, PORTAL_LEADS } from '../data/portal-leads';

const SEV_COLORS = {
  critical: { color: '#ef4444', bg: '#fef2f2' },
  high:     { color: '#f97316', bg: '#fff7ed' },
  moderate: { color: '#f59e0b', bg: '#fffbeb' },
  low:      { color: '#6b7280', bg: '#f9fafb' },
};

const STATUS_LABELS = {
  engaged: { label: 'Engaged',   color: '#3b82f6' },
  quoted:  { label: 'Quoted',    color: '#f59e0b' },
  won:     { label: 'Won',       color: '#10b981' },
  lost:    { label: 'Lost',      color: '#9ca3af' },
};

function ScoreRing({ score, size = 56 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={5}/>
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

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FounderDashboard() {
  const navigate = useNavigate();
  const [auth, setAuth] = useState(null);
  const [reports, setReports] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('founder_auth');
    if (!stored) { navigate('/account/login'); return; }
    setAuth(JSON.parse(stored));

    const savedReports = JSON.parse(localStorage.getItem('founder_reports') || '[]');
    setReports(savedReports);

    // Cross-reference portal engagements with saved companies
    const engagements = JSON.parse(localStorage.getItem('portal_engagements') || '{}');
    const companyNames = new Set(savedReports.map(r => r.company_name?.toLowerCase()));

    const items = Object.entries(engagements)
      .map(([leadId, eng]) => {
        const lead = PORTAL_LEADS.find(l => l.id === leadId);
        const tenant = TENANTS[eng.tenant];
        if (!lead || !tenant) return null;
        // Show activity if company name matches OR if user has no saved reports (demo mode)
        const isMatch = companyNames.size === 0 || companyNames.has(lead.company_name?.toLowerCase());
        return isMatch ? { leadId, lead, tenant, engagement: eng } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.engagement.engaged_at) - new Date(a.engagement.engaged_at));

    // If no matches and there are engagements, show all as demo activity
    if (items.length === 0 && Object.keys(engagements).length > 0) {
      const all = Object.entries(engagements)
        .map(([leadId, eng]) => {
          const lead = PORTAL_LEADS.find(l => l.id === leadId);
          const tenant = TENANTS[eng.tenant];
          return lead && tenant ? { leadId, lead, tenant, engagement: eng, isDemo: true } : null;
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.engagement.engaged_at) - new Date(a.engagement.engaged_at));
      setActivity(all);
    } else {
      setActivity(items);
    }
  }, []);

  function logout() {
    localStorage.removeItem('founder_auth');
    navigate('/account/login');
  }

  if (!auth) return null;

  const hasActivity = activity.length > 0;
  const hasReports = reports.length > 0;

  return (
    <div className="min-h-screen bg-white font-sans">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .acct-card { animation: fadeUp 0.3s ease both; }
        .activity-row:hover { background: #f9fafb !important; }
      `}</style>

      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#00d9b8] flex items-center justify-center text-[#07090f] font-bold text-xs">P</div>
            <span className="text-sm font-semibold text-gray-800 tracking-tight">proof360</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{auth.user?.email}</span>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10">

        {/* Greeting */}
        <div className="mb-10 acct-card">
          <h1 className="text-2xl font-serif text-gray-900 mb-1">
            {auth.user?.name ? `Welcome, ${auth.user.name.split(' ')[0]}` : 'Your account'}
          </h1>
          <p className="text-sm text-gray-400">
            Track your trust posture and see how partners engage with your profile.
          </p>
        </div>

        {/* Saved reports */}
        <section className="mb-10 acct-card" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-400">Audit reports</h2>
            <button
              onClick={() => navigate('/audit')}
              className="text-xs text-[#00d9b8] hover:opacity-75 transition-opacity bg-transparent border-none cursor-pointer font-medium"
            >
              + New audit
            </button>
          </div>

          {!hasReports ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm text-gray-500 mb-1">No reports saved yet</p>
              <p className="text-xs text-gray-400 mb-4">
                Complete a trust audit and save your report to track partner interest.
              </p>
              <button
                onClick={() => navigate('/audit')}
                className="text-xs font-medium text-[#00d9b8] hover:opacity-75 transition-opacity bg-transparent border-none cursor-pointer"
              >
                Start your audit →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.sessionId} className="border border-gray-100 rounded-xl p-5 flex items-center gap-4 hover:border-gray-200 transition-colors">
                  <ScoreRing score={r.trust_score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">{r.company_name}</span>
                      {r.industry && (
                        <span className="text-xs text-gray-400">{r.industry}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{r.gaps_count} gaps identified</span>
                      <span>·</span>
                      <span>{timeAgo(r.saved_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/report/${r.sessionId}`)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer flex-shrink-0"
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Partner activity */}
        <section className="acct-card" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-400">Partner activity</h2>
            {hasActivity && (
              <span className="text-xs font-medium text-[#00d9b8]">{activity.length} active</span>
            )}
          </div>

          {!hasActivity ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <div className="text-2xl mb-2">👀</div>
              <p className="text-sm text-gray-500 mb-1">No partner activity yet</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                When vendors engage with your trust profile, their activity will appear here.
                Partners see your gaps and whether their products can close them.
              </p>
            </div>
          ) : (
            <>
              {activity[0]?.isDemo && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-600">
                    Demo: showing partner activity from your portal session
                  </p>
                </div>
              )}
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {activity.map(({ leadId, lead, tenant, engagement }, i) => {
                  const statusInfo = STATUS_LABELS[engagement.status] || STATUS_LABELS.engaged;
                  const gap = lead.gaps[0];
                  const sev = gap ? SEV_COLORS[gap.severity] : null;
                  return (
                    <div
                      key={leadId}
                      className="activity-row flex items-center gap-4 px-5 py-4 transition-colors"
                      style={{ animationDelay: `${0.1 + i * 0.03}s` }}
                    >
                      {/* Tenant badge */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, background: tenant.bg,
                        border: `1px solid ${tenant.color}30`, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: tenant.color,
                      }}>
                        {tenant.short}
                      </div>

                      {/* Detail */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-800">{tenant.name}</span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{lead.company_name}</span>
                          {gap && sev && (
                            <>
                              <span>·</span>
                              <span style={{ color: sev.color }}>{gap.title}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-gray-300 flex-shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {timeAgo(engagement.engaged_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Footer nudge */}
        <div className="mt-12 pt-8 border-t border-gray-50 text-center acct-card" style={{ animationDelay: '0.15s' }}>
          <p className="text-xs text-gray-300">
            proof360 · Trust readiness for founders ·{' '}
            <button
              onClick={() => navigate('/portal')}
              className="text-gray-300 hover:text-gray-400 transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
            >
              Partner portal
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
