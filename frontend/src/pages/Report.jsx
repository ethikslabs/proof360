import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { demoReport } from '../data/demo-report';
import { getReport } from '../api/client';
import PersonaChat from '../components/PersonaChat';

/* ─── VECTOR design tokens ───────────────────────────────────────────────── */
const BG      = '#0a0d14';
const CARD    = '#131c2e';
const CARD2   = '#111827';
const BORDER  = '#1e293b';
const BORDER2 = '#243044';
const TEXT    = '#f1f5f9';
const MUTED   = '#64748b';
const SUBTLE  = '#94a3b8';
const AMBER   = '#E07B39';
const TEAL    = '#5eead4';

const SEV = {
  critical: { color: '#ef4444', glow: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  label: 'CRITICAL' },
  high:     { color: '#f97316', glow: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)',  label: 'HIGH'     },
  moderate: { color: '#eab308', glow: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',   label: 'MODERATE' },
  medium:   { color: '#eab308', glow: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',   label: 'MEDIUM'   },
  low:      { color: '#22c55e', glow: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',  label: 'LOW'      },
};

function scoreColor(s) {
  if (!s && s !== 0) return MUTED;
  if (s >= 80) return '#22c55e';
  if (s >= 50) return TEAL;
  return '#f87171';
}

const KNOWN_LOGOS = {
  vanta:       '/logos/vanta-partner.svg',
  aws:         '/logos/aws-partner.png',
  cloudflare:  '/logos/cloudflare.png',
  cisco_duo:   '/logos/cisco.svg',
  cisco:       '/logos/cisco.svg',
  palo_alto:   '/logos/paloalto.svg',
  okta:        '/logos/okta.svg',
  austbrokers: '/logos/cyberpro.png',
  crowdstrike: '/logos/crowdstrike.svg',
};

function VendorLogo({ vendorId, domain, name, size = 28 }) {
  const [src, setSrc] = useState(
    KNOWN_LOGOS[vendorId]
    || (domain ? `https://logo.clearbit.com/${domain}` : null)
  );
  const initials = (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (!src) return (
    <div style={{ width: size, height: size, borderRadius: 6, background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: MUTED, fontFamily: 'monospace', flexShrink: 0 }}>
      {initials}
    </div>
  );
  return (
    <img
      src={src}
      alt={name}
      onError={() => setSrc(null)}
      style={{ width: size, height: size, borderRadius: 6, objectFit: 'contain', background: '#ffffff', padding: 3, flexShrink: 0 }}
    />
  );
}

function Label({ children, color }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '2.5px',
      color: color || MUTED, textTransform: 'uppercase',
      fontFamily: 'ui-monospace, "IBM Plex Mono", monospace',
      marginBottom: 10, marginTop: 20,
    }}>
      {children}
    </p>
  );
}

/* ─── Transparency panel ─────────────────────────────────────────────────── */
const STAGE_OPTIONS = ['Pre-seed', 'Seed', 'Series A', 'Series B+', 'Enterprise / Public'];

function TransparencyPanel({ open, onClose, signals, confidence, assessedAt, sessionId, stageOverride, onStageChange }) {
  const KNOWN = ['dns','http','certs','ip','github','jobs','hibp','ports','ssllabs','abuseipdb'];
  const score = confidence?.sources_succeeded || 0;
  const total = confidence?.sources_attempted || KNOWN.length;
  const pct   = Math.round((score / total) * 100);

  const displaySignals = (signals || []).filter(s =>
    !['trust_score'].includes(s.field) && s.current_value && s.current_value !== 'unknown'
  );

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}
      <div style={{
        position: 'fixed', top: 0, right: open ? 0 : -360,
        width: 320, height: '100vh',
        background: '#080c14',
        borderLeft: `1px solid ${BORDER}`,
        zIndex: 200,
        overflowY: 'auto',
        transition: 'right 0.28s cubic-bezier(0.4,0,0.2,1)',
        padding: '24px 20px',
        scrollbarWidth: 'none',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '3px', color: TEAL, fontFamily: 'monospace' }}>
            HOW WE ASSESSED
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <Label>Data confidence</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ flex: 1, height: 4, background: BORDER, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: scoreColor(pct), borderRadius: 2, transition: 'width 0.6s ease' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(pct), fontFamily: 'monospace', minWidth: 36 }}>
            {pct}%
          </span>
        </div>
        <p style={{ fontSize: 11, color: MUTED, marginBottom: 20 }}>
          {score} of {total} signal sources returned data
        </p>

        <Label>Sources scanned</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {KNOWN.map(src => (
            <span key={src} style={{
              fontSize: 9, fontFamily: 'monospace', letterSpacing: '1px',
              color: MUTED, background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 4, padding: '3px 8px',
            }}>
              [{src}]
            </span>
          ))}
        </div>

        <Label>Company stage</Label>
        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.6, marginBottom: 10 }}>
          We inferred this from public signals. Change it to reframe the assessment.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 20 }}>
          {STAGE_OPTIONS.map(s => {
            const active = stageOverride === s;
            return (
              <button
                key={s}
                onClick={() => onStageChange(active ? null : s)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '8px 12px', borderRadius: 7,
                  background: active ? 'rgba(94,234,212,0.1)' : CARD,
                  border: `1px solid ${active ? 'rgba(94,234,212,0.4)' : BORDER}`,
                  color: active ? TEAL : MUTED,
                  fontSize: 12, fontWeight: active ? 700 : 400,
                  cursor: 'pointer', fontFamily: 'monospace',
                  transition: 'all 0.15s',
                }}
              >
                {active ? '◉' : '◎'} {s}
              </button>
            );
          })}
        </div>

        <Label>Refine your read</Label>
        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.6, marginBottom: 12 }}>
          Correct any signals we got wrong — it updates your score and recommendations instantly.
        </p>
        <a
          href={`/audit/cold-read?session=${sessionId || ''}`}
          style={{
            display: 'block', textAlign: 'center',
            padding: '10px 0',
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 8, fontSize: 12,
            color: TEAL, fontWeight: 600,
            textDecoration: 'none', fontFamily: 'monospace',
          }}
        >
          Correct signals →
        </a>

        {displaySignals.length > 0 && (
          <>
            <Label>Signals extracted</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displaySignals.map(s => (
                <div key={s.field} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '8px 10px',
                  background: CARD, borderRadius: 6, border: `1px solid ${BORDER}`,
                }}>
                  <span style={{ fontSize: 10, color: MUTED, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {s.field.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 11, color: TEXT, fontWeight: 500, textAlign: 'right', maxWidth: 140 }}>
                    {String(s.current_value)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {assessedAt && (
          <p style={{ fontSize: 10, color: MUTED, marginTop: 24, fontFamily: 'monospace' }}>
            Assessed {new Date(assessedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
    </>
  );
}

/* ─── What's working ────────────────────────────────────────────────────── */
function PositiveSummary({ score, gaps, confidence }) {
  const sourcesOk    = confidence?.sources_succeeded || 0;
  const sourcesTotal = confidence?.sources_attempted || 10;

  const positives = [];
  if (!gaps.some(g => g.severity === 'critical'))
    positives.push('No critical vulnerabilities detected');
  if (!gaps.some(g => /breach|hibp/i.test(g.id || '') || /breach/i.test(g.title || '')))
    positives.push('No known data breaches found');
  if (!gaps.some(g => /ssl|tls|cert/i.test(g.id || '') || /ssl|tls|cert/i.test(g.title || '')))
    positives.push('TLS / SSL looks strong');
  if (!gaps.some(g => /dns/i.test(g.id || '') || /dns/i.test(g.title || '')))
    positives.push('Domain configuration clean');
  if (score >= 80)       positives.push('Top-quartile public trust posture');
  else if (score >= 65)  positives.push('Above average for this company type');

  return (
    <div style={{
      background: 'rgba(34,197,94,0.05)',
      border: '1px solid rgba(34,197,94,0.18)',
      borderRadius: 14, padding: '20px 24px',
      marginBottom: 24,
      animation: 'rise 0.5s ease 0.12s both',
    }}>
      <p style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '2.5px',
        color: '#22c55e', fontFamily: 'monospace', marginBottom: 14,
      }}>
        WHAT'S WORKING
      </p>
      {sourcesOk > 0 && (
        <p style={{ fontSize: 12, color: MUTED, fontFamily: 'monospace', marginBottom: positives.length ? 14 : 0 }}>
          {sourcesOk} of {sourcesTotal} intelligence sources returned clean signals
        </p>
      )}
      {positives.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {positives.map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#22c55e', fontSize: 14, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 14, color: SUBTLE }}>{p}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Gap card ───────────────────────────────────────────────────────────── */
function GapCard({ gap, index, vendors, vendorIntelligence, open, onToggle }) {
  const sev = SEV[gap.severity] || SEV.low;

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${sev.color}`,
      background: CARD,
      marginBottom: 8,
      overflow: 'hidden',
      animation: `rise 0.4s ease both`,
      animationDelay: `${index * 0.06}s`,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '18px 20px', textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 11, fontWeight: 700, color: MUTED,
          fontFamily: 'monospace', flexShrink: 0, width: 22,
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'inline-block',
            fontSize: 8, fontWeight: 800, letterSpacing: '2px',
            color: sev.color,
            background: sev.glow,
            border: `1px solid ${sev.border}`,
            borderRadius: 4, padding: '2px 7px',
            fontFamily: 'monospace',
            marginBottom: 6,
          }}>
            {sev.label}
          </span>
          <p style={{ fontSize: 15, fontWeight: 600, color: TEXT, margin: 0, lineHeight: 1.3 }}>
            {gap.title}
          </p>
        </div>
        <span style={{ color: MUTED, fontSize: 11, flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          ▼
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 20px 22px', borderTop: `1px solid ${BORDER}` }}>
          {gap.why && (
            <>
              <Label>Why this matters</Label>
              <p style={{ fontSize: 14, color: SUBTLE, lineHeight: 1.75, margin: 0 }}>{gap.why}</p>
            </>
          )}

          {gap.risk && (
            <>
              <Label color={MUTED}>The impact</Label>
              <p style={{ fontSize: 14, color: SUBTLE, lineHeight: 1.75, margin: 0 }}>{gap.risk}</p>
            </>
          )}

          {gap.time_estimate && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(96,165,250,0.07)',
              border: '1px solid rgba(96,165,250,0.18)',
              borderRadius: 8, padding: '8px 14px',
              marginTop: 16, marginBottom: 4,
            }}>
              <span style={{ fontSize: 10, color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px' }}>
                ⏱ TIME TO FIX
              </span>
              <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{gap.time_estimate}</span>
            </div>
          )}

          {gap.remediation?.length > 0 && (
            <>
              <Label>How to fix it</Label>
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                {gap.remediation.map((r, i) => (
                  <li key={i} style={{
                    fontSize: 13, color: SUBTLE, lineHeight: 1.8,
                    marginBottom: 6, paddingLeft: 4,
                  }}>
                    {r}
                  </li>
                ))}
              </ol>
            </>
          )}

          {gap.framework_impact?.length > 0 && (
            <>
              <Label>Compliance impact</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {gap.framework_impact.map((fi, i) => (
                  <span key={i} style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '1px',
                    fontFamily: 'monospace',
                    color: fi.blocker ? '#fca5a5' : MUTED,
                    background: fi.blocker ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.08)',
                    border: `1px solid ${fi.blocker ? 'rgba(239,68,68,0.2)' : BORDER}`,
                    borderRadius: 4, padding: '3px 8px',
                  }}>
                    {fi.blocker ? '⬛ ' : ''}{fi.framework}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Rich vendor intelligence — demo / future v2 data shape */}
          {vendorIntelligence?.vendors?.length > 0 && (
            <>
              <Label color={TEAL}>Close this gap — {vendorIntelligence.category_name}</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {vendorIntelligence.vendors.map(v => (
                  <div key={v.vendor_id} style={{
                    background: v.is_pick ? 'rgba(94,234,212,0.06)' : CARD2,
                    border: `1px solid ${v.is_pick ? 'rgba(94,234,212,0.28)' : BORDER}`,
                    borderRadius: 10, padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <VendorLogo vendorId={v.vendor_id} domain={v.domain} name={v.display_name} size={28} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{v.display_name}</span>
                      {v.is_pick && (
                        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '1.5px', color: TEAL, background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.28)', borderRadius: 4, padding: '2px 7px', fontFamily: 'monospace' }}>
                          OUR PICK
                        </span>
                      )}
                      {v.is_partner && !v.is_pick && (
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1px', color: MUTED, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '2px 7px', fontFamily: 'monospace' }}>
                          PARTNER
                        </span>
                      )}
                      {v.deal_label && (
                        <span style={{ fontSize: 9, color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4, padding: '2px 8px', fontFamily: 'monospace', marginLeft: 'auto' }}>
                          {v.deal_label}
                        </span>
                      )}
                    </div>
                    {v.best_for && (
                      <p style={{ fontSize: 10, color: MUTED, fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                        Best for: {v.best_for}
                      </p>
                    )}
                    {v.summary && (
                      <p style={{ fontSize: 12, color: SUBTLE, lineHeight: 1.6 }}>{v.summary}</p>
                    )}
                    {v.referral_url && (
                      <a
                        href={v.referral_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          alignSelf: 'flex-start',
                          fontSize: 11, fontWeight: 600,
                          color: v.is_pick ? TEAL : MUTED,
                          textDecoration: 'none',
                          borderBottom: `1px solid ${v.is_pick ? 'rgba(94,234,212,0.35)' : BORDER}`,
                          paddingBottom: 1,
                        }}
                      >
                        Get started →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Simple vendor list — real API data shape */}
          {!vendorIntelligence?.vendors?.length && vendors.length > 0 && (
            <>
              <Label color={TEAL}>Close this gap</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {vendors.map(v => (
                  <div key={v.vendor_id} style={{
                    fontSize: 12, fontWeight: 600,
                    color: v.priority === 'start_here' ? TEAL : SUBTLE,
                    background: v.priority === 'start_here' ? 'rgba(94,234,212,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${v.priority === 'start_here' ? 'rgba(94,234,212,0.25)' : BORDER}`,
                    borderRadius: 8, padding: '7px 14px',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <VendorLogo vendorId={v.vendor_id} domain={v.domain} name={v.display_name} size={20} />
                    {v.display_name}
                    {v.priority === 'start_here' && (
                      <span style={{ fontSize: 9, color: TEAL, fontFamily: 'monospace' }}>★ START HERE</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {gap.evidence_summary && (
            <p style={{
              fontSize: 11, color: MUTED, lineHeight: 1.6,
              marginTop: 16, padding: '10px 12px',
              background: 'rgba(100,116,139,0.06)',
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              fontFamily: 'monospace',
            }}>
              {gap.evidence_summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Report ─────────────────────────────────────────────────────────────── */
export default function Report() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const isDemo        = sessionId === 'demo';

  const [report,        setReport]       = useState(isDemo ? demoReport : null);
  const [error,         setError]        = useState('');
  const [panelOpen,     setPanelOpen]    = useState(false);
  const [openGapIdx,    setOpenGapIdx]   = useState(null);
  const [contextOpen,   setContextOpen]  = useState(true);
  const [stageOverride, setStageOverride] = useState(null);

  const derivedState       = report?.derived_state || null;
  const gaps               = derivedState?.gaps || report?.gaps || [];
  const trustScore         = derivedState?.trust_score ?? report?.trust_score ?? null;
  const vendorRecs         = derivedState?.vendor_recommendations || report?.vendor_recommendations || [];
  const confidence         = derivedState?.confidence_ribbon || null;
  const signals            = derivedState?.signals || [];
  const directionalHints   = derivedState?.directional_hints || report?.headline;
  const summaryLine        = directionalHints?.summary_line || directionalHints?.items?.[0] || '';
  const companyName        = report?.company_name || 'Your company';

  // Infer company stage from signals; override wins if set in TransparencyPanel
  const stageSignal   = signals.find(s => s.type === 'stage')?.value || '';
  const effectiveStage = stageOverride || stageSignal;
  const isEstablished = /Series B\+|Series C|Series D|Growth|Public|Enterprise/i.test(effectiveStage)
    || (!stageOverride && trustScore !== null && trustScore >= 80 && gaps.length <= 2);
  const isEarlyStage = /Pre-seed|Seed|Series A/i.test(effectiveStage);
  const audienceLine = isEstablished
    ? `what enterprise buyers and security teams check before signing a contract with ${companyName}`
    : isEarlyStage
    ? `what investors and enterprise buyers check during due diligence on ${companyName}`
    : `what investors and enterprise buyers check before they say yes to ${companyName}`;


  useEffect(() => {
    if (isDemo) return;
    getReport(sessionId)
      .then(r => setReport(r))
      .catch(() => setError("We couldn't load your report. Please try again."));
  }, [sessionId, isDemo]);

  function saveAndTrack() {
    const summary = {
      sessionId,
      company_name: companyName,
      trust_score: trustScore,
      gaps_count: gaps.length,
      saved_at: new Date().toISOString(),
    };
    // If already logged in as founder, persist and go to account
    if (localStorage.getItem('founder_auth')) {
      const existing = JSON.parse(localStorage.getItem('founder_reports') || '[]');
      localStorage.setItem('founder_reports', JSON.stringify(
        [...existing.filter(r => r.sessionId !== sessionId), summary]
      ));
      navigate('/account');
      return;
    }
    // If already logged in as partner, go to portal
    if (localStorage.getItem('portal_auth')) {
      navigate('/portal/dashboard');
      return;
    }
    // Not logged in — stash report, go to unified login with auto-detect intent
    sessionStorage.setItem('pending_founder_report', JSON.stringify(summary));
    sessionStorage.setItem('auth0_intent', 'auto');
    navigate('/portal');
  }

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
      <p style={{ color: MUTED, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>{error}</p>
    </div>
  );

  if (!report) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: `3px solid ${BORDER}`, borderTopColor: TEAL,
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: MUTED, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', fontSize: 14 }}>Building your report...</p>
      </div>
    </div>
  );

  const sc = scoreColor(trustScore);
  const criticalCount = gaps.filter(g => g.severity === 'critical').length;
  const highCount     = gaps.filter(g => g.severity === 'high').length;

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', color: TEXT }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        @keyframes rise  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes glow  { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .gap-hover:hover { background: #111827 !important; }
      `}</style>

      {/* ── Floating "How we read this" tab ── */}
      <button
        onClick={() => setPanelOpen(true)}
        style={{
          position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
          zIndex: 90, background: CARD, border: `1px solid ${BORDER}`,
          borderRight: 'none', borderRadius: '8px 0 0 8px',
          padding: '14px 10px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          boxShadow: '-2px 0 12px rgba(0,0,0,0.3)',
        }}
      >
        <span style={{
          fontSize: 9, fontWeight: 700, color: TEAL, fontFamily: 'monospace',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          writingMode: 'vertical-rl', textOrientation: 'mixed',
        }}>How we read this</span>
        <span style={{ fontSize: 14, color: MUTED }}>◎</span>
      </button>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(6,8,15,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{
          maxWidth: 860, margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52,
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/glyph.svg" width={24} height={24} alt="" />
            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em' }}>
              Proof<span style={{ color: TEAL }}>360</span>
            </span>
          </Link>
          <button
            onClick={saveAndTrack}
            style={{
              background: TEAL, border: 'none',
              color: '#0a0d14', fontSize: 13, fontWeight: 600,
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Save & track →
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px 80px' }}>

        {/* ── Context card — what is proof360, collapsible ── */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 14, marginTop: 24, marginBottom: 20,
          overflow: 'hidden', animation: 'rise 0.4s ease both',
        }}>
          <button
            onClick={() => setContextOpen(o => !o)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px', textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                PROOF360 TRUST ASSESSMENT · {companyName.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: 12, color: MUTED, transition: 'transform 0.2s', transform: contextOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
          </button>
          {contextOpen && (
            <div style={{ padding: '0 22px 20px', borderTop: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 15, color: TEXT, fontWeight: 500, lineHeight: 1.65, marginTop: 16, marginBottom: 10 }}>
                Proof360 scanned {companyName}'s publicly available signals — DNS records, TLS configuration, breach databases, open ports, code exposure, and more — and scored the result against {audienceLine}.
              </p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 14 }}>
                This is not a penetration test. It is a read of what anyone with the right tools can already see about {companyName} from the outside — exactly what a security team or technical advisor will run before they commit.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>10 SOURCES SCANNED</span>
                <span style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>·</span>
                <Link to="/audit" style={{ fontSize: 12, color: TEAL, fontWeight: 600, textDecoration: 'none', borderBottom: `1px solid rgba(94,234,212,0.3)`, paddingBottom: 1 }}>
                  Not quite right? Run a fresh assessment →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Score strip — compact, not hero ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          padding: '18px 22px',
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 14, marginBottom: 20,
          animation: 'rise 0.4s ease 0.05s both',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 56, fontWeight: 900, color: sc,
              letterSpacing: '-3px', lineHeight: 1,
              textShadow: `0 0 30px ${sc}30`,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {trustScore ?? '—'}
            </span>
            <span style={{ fontSize: 13, color: MUTED, fontFamily: 'monospace', letterSpacing: '1px' }}>/100</span>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <p style={{ fontSize: 10, color: MUTED, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 4 }}>TRUST READINESS SCORE</p>
            {summaryLine && <p style={{ fontSize: 13, color: SUBTLE, lineHeight: 1.5 }}>{summaryLine}</p>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {criticalCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, padding: '3px 10px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                {criticalCount} CRITICAL
              </span>
            )}
            {highCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 20, padding: '3px 10px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                {highCount} HIGH
              </span>
            )}
            {gaps.length - criticalCount - highCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, background: 'rgba(100,116,139,0.08)', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '3px 10px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                {gaps.length - criticalCount - highCount} OTHER
              </span>
            )}
          </div>
        </div>


        {/* ── What's working ── */}
        {trustScore !== null && (
          <PositiveSummary score={trustScore} gaps={gaps} confidence={confidence} />
        )}

        {/* ── High score banner ── */}
        {trustScore >= 85 && criticalCount === 0 && gaps.length > 0 && (
          <div style={{
            background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 14, padding: '20px 24px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 16,
            animation: 'rise 0.5s ease 0.12s both',
          }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>
                You're doing great — this is a strong result.
              </p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                A few things to tighten up below, but nothing blocking. Most companies in this category score lower.
              </p>
            </div>
          </div>
        )}

        {/* ── Gaps ── */}
        {gaps.length > 0 && (
          <div style={{ animation: 'rise 0.5s ease 0.15s both' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2.5px', color: MUTED, fontFamily: 'monospace', marginBottom: 14 }}>
              WHAT COULD BE STRONGER
            </p>
            {gaps.map((gap, i) => {
              const gapVendors = vendorRecs.filter(v => v.closes_gaps?.includes(gap.id));
              return <GapCard key={gap.id || gap.gap_id || i} gap={gap} index={i} vendors={gapVendors} vendorIntelligence={gap.vendor_intelligence} open={openGapIdx === i} onToggle={() => setOpenGapIdx(openGapIdx === i ? null : i)} />;
            })}
          </div>
        )}

        {gaps.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 32px',
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 20, animation: 'rise 0.5s ease 0.15s both',
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <p style={{
              fontSize: 28, fontWeight: 800, color: '#22c55e',
              letterSpacing: '-0.5px', marginBottom: 12,
            }}>
              Perfect score. Every signal clear.
            </p>
            <p style={{ fontSize: 16, color: SUBTLE, lineHeight: 1.7, maxWidth: 480, margin: '0 auto 28px' }}>
              We couldn't find a single gap in {companyName}'s public trust posture.
              That puts you ahead of the vast majority of companies we read.
            </p>
            <div style={{
              display: 'inline-flex', flexDirection: 'column', gap: 10,
              alignItems: 'center',
            }}>
              <p style={{ fontSize: 13, color: MUTED }}>This result is worth sharing.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                  }}
                  style={{
                    padding: '10px 20px', background: '#22c55e', color: '#0a0d14',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Copy report link
                </button>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: '10px 20px', background: CARD, color: TEXT,
                    border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Share on LinkedIn
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div style={{
          marginTop: 32, padding: '36px 28px', textAlign: 'center',
          background: `linear-gradient(135deg, #0d1117, #111827)`,
          border: `1px solid ${BORDER}`, borderRadius: 16,
          animation: 'rise 0.5s ease 0.25s both',
        }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 8, letterSpacing: '-0.02em' }}>
            {gaps.length === 0
              ? 'Keep it this way.'
              : trustScore >= 85
                ? 'You\'re close. Let\'s get you there.'
                : 'Want to walk through this together?'}
          </p>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 24 }}>
            {gaps.length === 0
              ? 'Save your result and come back after your next product update to re-check.'
              : 'Save your report, then ask the team below to walk you through it.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={saveAndTrack}
              style={{
                background: TEAL, border: 'none', color: '#0a0d14',
                fontSize: 14, fontWeight: 600, padding: '12px 24px',
                borderRadius: 10, cursor: 'pointer',
              }}
            >
              Save this report →
            </button>
            <Link
              to="/audit"
              style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: 14, color: MUTED, textDecoration: 'none',
                padding: '12px 24px',
              }}
            >
              Run another audit
            </Link>
          </div>
        </div>
      </div>

      {/* ── Persona chat ── */}
      <PersonaChat
        sessionId={sessionId}
        context={{ company_name: companyName, score: trustScore, gaps, session_id: sessionId }}
      />

      {/* ── Transparency panel ── */}
      <TransparencyPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        signals={signals}
        confidence={confidence}
        assessedAt={report?.assessed_at}
        sessionId={sessionId}
        stageOverride={stageOverride}
        onStageChange={setStageOverride}
      />
    </div>
  );
}
