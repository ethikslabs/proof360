import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { demoReport } from '../data/demo-report';
import { getReport } from '../api/client';
import PersonaChat from '../components/PersonaChat';
import { Proof360Mark } from '../components/Proof360Mark';
import ConfidenceRibbon from '../components/report/ConfidenceRibbon.jsx';
import ProgramMatchCard from '../components/ProgramMatchCard.jsx';
import { useFeatureFlags } from '../contexts/FeatureFlagContext.jsx';

/* ─── Engagement store (localStorage) ───────────────────────────────────── */
function useEngagements(sessionId) {
  const key = 'proof360_engagements';

  function getAll() {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }

  function add(engagement) {
    const all = getAll();
    const updated = [...all.filter(e => !(e.session_id === engagement.session_id && e.vendor_id === engagement.vendor_id)), engagement];
    localStorage.setItem(key, JSON.stringify(updated));
  }

  function forSession() {
    return getAll().filter(e => e.session_id === sessionId);
  }

  return { add, forSession, getAll };
}

/* ─── HubSpot booking modal ──────────────────────────────────────────────── */
function BookingModal({ vendor, gap, report, sessionId, onClose, onBooked }) {
  const [booked, setBooked] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Load HubSpot embed script once
    if (!document.querySelector('script[src*="MeetingsEmbedCode"]')) {
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
      document.body.appendChild(s);
    } else if (window.HubSpotMeetings) {
      window.HubSpotMeetings.refresh?.();
    }

    function handleMessage(e) {
      if (e.data?.meetingBookSucceeded) {
        setBooked(true);
        onBooked({ vendor, gap, status: 'meeting_booked' });
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Block body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(11,37,69,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{
        background: WHITE, borderRadius: 14,
        width: '100%', maxWidth: 680,
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{ padding: '28px 32px 0', borderBottom: `1px solid ${BORDER}`, paddingBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: AMBER, fontFamily: '"Outfit", sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                {gap?.title || 'Vendor engagement'}
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: NAVY, fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.01em' }}>
                Book a call with {vendor.display_name}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: LIGHT, fontSize: 20, padding: 4, flexShrink: 0, marginTop: 2 }}>×</button>
          </div>

          {/* Why this vendor */}
          <div style={{ marginTop: 16, padding: '14px 16px', background: OFFWHITE, borderRadius: 8, border: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.75, fontFamily: '"Outfit", sans-serif' }}>
              <strong style={{ color: NAVY }}>Why {vendor.display_name} for {report.company_name}:</strong>{' '}
              {vendor.summary} Best for {vendor.best_for}.
            </p>
            {vendor.referral_url && (
              <a href={vendor.referral_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: AMBER, fontFamily: '"Outfit", sans-serif', fontWeight: 600, marginTop: 8, display: 'inline-block', textDecoration: 'none' }}>
                Product overview →
              </a>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px' }}>
          {booked ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>✓</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: NAVY, fontFamily: '"Outfit", sans-serif', marginBottom: 10 }}>
                Meeting booked
              </h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, fontFamily: '"Outfit", sans-serif' }}>
                Your call with {vendor.display_name} is confirmed. Check your account to track this engagement and all your other vendor conversations.
              </p>
              <button onClick={onClose} style={{
                marginTop: 24, padding: '10px 24px', background: NAVY, color: WHITE,
                border: 'none', borderRadius: 6, fontFamily: '"Outfit", sans-serif',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                Back to report
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: MUTED, fontFamily: '"Outfit", sans-serif', marginBottom: 20, lineHeight: 1.6 }}>
                Pick a time that works. The context from your trust assessment will be shared with the {vendor.display_name} team before the call.
              </p>
              <div
                ref={containerRef}
                className="meetings-iframe-container"
                data-src="https://meetings.hubspot.com/john3174?embed=true"
                style={{ minHeight: 600 }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Login gate modal ───────────────────────────────────────────────────── */
function LoginGate({ vendor, onDemoLogin, onClose }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(11,37,69,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{
        background: WHITE, borderRadius: 14,
        width: '100%', maxWidth: 420, padding: '40px 36px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 11, color: AMBER, fontFamily: '"Outfit", sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          One more step
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: NAVY, fontFamily: '"Outfit", sans-serif', marginBottom: 12 }}>
          Sign in to book with {vendor.display_name}
        </h2>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, fontFamily: '"Outfit", sans-serif', marginBottom: 28 }}>
          Create a free account to book the meeting and track all your vendor engagements in one place.
        </p>
        <Link to="/account/login" style={{
          display: 'block', padding: '12px 24px', background: NAVY, color: WHITE,
          borderRadius: 7, fontFamily: '"Outfit", sans-serif', fontSize: 14,
          fontWeight: 600, textDecoration: 'none', marginBottom: 12,
        }}>
          Sign in →
        </Link>
        <button onClick={onDemoLogin} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: LIGHT, fontFamily: '"Outfit", sans-serif',
          textDecoration: 'underline',
        }}>
          Continue in demo mode
        </button>
      </div>
    </div>
  );
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const NAVY  = '#0B2545';
const AMBER = '#E07B39';
const WHITE = '#FFFFFF';
const OFFWHITE = '#F7F8FA';
const BORDER = '#E4E7EC';
const TEXT   = '#101828';
const MUTED  = '#667085';
const LIGHT  = '#98A2B3';

const SOURCE_LABELS = {
  dns_scan:         'Passive DNS scan',
  http_scan:        'Passive HTTP/TLS scan',
  cert_scan:        'Certificate Transparency logs',
  breach_db:        'Have I Been Pwned',
  assessment:       'Assessment response',
  sector_inference: 'Sector inference',
  signal_inference: 'Signal inference',
};

const SEVERITY_ORDER = { critical: 0, high: 0, moderate: 1, low: 2 };

const SEV = {
  critical: { border: '#DC2626', bg: '#FEF2F2', color: '#B91C1C', label: 'Critical' },
  high:     { border: '#EA580C', bg: '#FFF7ED', color: '#C2410C', label: 'High'     },
  moderate: { border: '#CA8A04', bg: '#FEFCE8', color: '#A16207', label: 'Moderate' },
  low:      { border: '#16A34A', bg: '#F0FDF4', color: '#15803D', label: 'Low'      },
};

function scoreLabel(s) {
  if (s >= 80) return 'Strong public trust signal';
  if (s >= 60) return 'Room to strengthen — details below';
  if (s >= 40) return 'Some gaps in your public story';
  return 'Gaps in what\'s publicly visible';
}

/* ─── Proof360 mark ──────────────────────────────────────────────────────── */
/* ─── Company avatar ──────────────────────────────────────────────────────── */
// Demo company gets a real-looking logo mark; all others get initials.
const DEMO_LOGOS = {
  Stackfield: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 10, flexShrink: 0 }}>
      <rect width="52" height="52" rx="10" fill="#0F172A" />
      {/* Three stacked bars — decreasing width — the "stack" */}
      <rect x="9" y="12" width="34" height="8" rx="2.5" fill="#3B82F6" />
      <rect x="9" y="23" width="24" height="8" rx="2.5" fill="#60A5FA" />
      <rect x="9" y="34" width="14" height="8" rx="2.5" fill="#93C5FD" />
    </svg>
  ),
};

function CompanyLogo({ domain, name, size = 52 }) {
  const [err, setErr] = useState(false);
  const DemoLogo = DEMO_LOGOS[name];
  if (DemoLogo) return <DemoLogo size={size} />;
  const initials = (name || '??').split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  if (!domain || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.18,
        background: 'rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.15)',
      }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: size * 0.35, fontWeight: 700,
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: '-0.02em', userSelect: 'none',
        }}>{initials}</span>
      </div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      onError={() => setErr(true)}
      style={{
        width: size, height: size, borderRadius: size * 0.18,
        objectFit: 'contain', background: '#ffffff',
        flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.1)',
      }}
    />
  );
}

/* ─── Signal panel ───────────────────────────────────────────────────────── */
const SIGNAL_OPTIONS = {
  sector:           ['saas', 'healthcare', 'fintech', 'financial_services', 'government', 'legal', 'ecommerce', 'education', 'other'],
  stage:            ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Growth', 'Public'],
  customer_type:    ['Enterprise (B2B)', 'SMB (B2B)', 'Consumer (B2C)', 'Mixed'],
  infrastructure:   ['Cloud (AWS)', 'Cloud (GCP)', 'Cloud (Azure)', 'Hybrid', 'On-premise'],
  compliance_status:['none', 'planning', 'soc2_type1', 'soc2_type2', 'iso27001'],
  identity_model:   ['password_only', 'mfa_only', 'sso_mfa'],
  insurance_status: ['none', 'unknown', 'active'],
  data_sensitivity: ['Public data', 'Business data', 'Customer PII', 'Healthcare data', 'Financial data'],
  geo_market:       ['AU', 'US', 'UK', 'SG', 'EU', 'Global'],
};

// Confidence % for each signal key — how reliably we can read this from public data
const SIGNAL_CONFIDENCE = {
  sector:           88,
  stage:            82,
  customer_type:    79,
  infrastructure:   85,
  geo_market:       76,
  compliance_status:63,
  identity_model:   71,
  insurance_status: 58,
  data_sensitivity: 74,
  handles_payments: 81,
  dmarc_policy:     100,
  spf_policy:       100,
  mx_provider:      100,
};

// Signal status colour based on value — red = bad for score, amber = watch, green = good
function signalStatus(key, value) {
  const bad = {
    compliance_status: ['none'],
    insurance_status:  ['none'],
    identity_model:    ['password_only'],
    dmarc_policy:      ['none'],
    spf_policy:        ['none', 'softfail'],
  };
  const good = {
    compliance_status: ['soc2_type2', 'iso27001'],
    insurance_status:  ['active'],
    identity_model:    ['sso_mfa'],
    dmarc_policy:      ['quarantine', 'reject'],
    spf_policy:        ['pass'],
  };
  if (bad[key]?.includes(value))  return 'red';
  if (good[key]?.includes(value)) return 'green';
  return 'amber';
}

const STATUS_COLOURS = {
  red:   { dot: '#ef4444', bg: '#fef2f2' },
  amber: { dot: '#f59e0b', bg: '#fffbeb' },
  green: { dot: '#22c55e', bg: '#f0fdf4' },
};

const SIGNAL_IMPACT = {
  sector:           'Determines which compliance frameworks apply to your business.',
  stage:            'Sets the bar — enterprise buyers expect more from Series A+.',
  customer_type:    'Enterprise B2B triggers the strictest trust requirements.',
  infrastructure:   'Cloud providers affect which controls are your responsibility.',
  geo_market:       'Cross-border markets add regulatory frameworks (GDPR, APRA).',
  compliance_status:'Direct score driver — the single biggest gap to close.',
  identity_model:   'Password-only is a critical red flag for any enterprise buyer.',
  insurance_status: 'Cyber insurance signals you\'ve been underwritten for breach risk.',
  data_sensitivity: 'Higher sensitivity = higher scrutiny from buyers and auditors.',
  handles_payments: 'Payment handling triggers PCI-DSS requirements.',
  dmarc_policy:     'Controls whether attackers can spoof your domain in email.',
  spf_policy:       'Validates which servers can send email on your behalf.',
  mx_provider:      'Your email provider affects phishing and spoofing risk profile.',
};

function SignalPanel({ signals = [], isDemo }) {
  const [open, setOpen] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [editing, setEditing] = useState(null); // key of signal being edited
  const [saved, setSaved] = useState(false);

  const editableSignals = signals.filter(s => s.type !== 'dns');
  const dnsSignals      = signals.filter(s => s.type === 'dns');

  function handleChange(key, value) {
    setOverrides(prev => ({ ...prev, [key]: value }));
    setEditing(null);
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
  }

  const hasChanges = Object.keys(overrides).length > 0;

  function displayValue(sig) {
    const val = overrides[sig.key] !== undefined ? overrides[sig.key] : sig.value;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  return (
    <>
      {/* Pull tab */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', right: open ? 320 : 0, top: 'calc(50% - 40px)',
          transform: 'translateY(-50%)',
          background: '#1e3a5f', color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)', borderRight: 'none', cursor: 'pointer',
          borderRadius: '6px 0 0 6px',
          padding: '12px 10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          zIndex: 300,
          boxShadow: '-3px 0 16px rgba(0,0,0,0.4)',
          transition: 'right 0.25s ease',
          fontFamily: '"IBM Plex Mono", monospace',
        }}
        title={open ? 'Close signal panel' : 'View & correct extracted signals'}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <ellipse cx="10" cy="5" rx="7" ry="3" />
          <path d="M3 5v5c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
          <path d="M3 10v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
        </svg>
        <span style={{
          writingMode: 'vertical-lr', textOrientation: 'mixed',
          fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.9)',
        }}>Signals</span>
      </button>

      {/* Panel */}
      <div style={{
        position: 'fixed', right: open ? 0 : -320, top: 56, bottom: 0,
        width: 320,
        background: '#fff',
        borderLeft: '1px solid #e5e7eb',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        zIndex: 299,
        transition: 'right 0.25s ease',
        fontFamily: '"DM Sans", sans-serif',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: '"IBM Plex Mono", monospace' }}>
              What we read
            </span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>
            {isDemo ? 'Demo data. Tap ✎ to see correction options.' : 'Tap ✎ on anything we got wrong.'}
          </p>
        </div>

        <div style={{ padding: '14px 18px' }}>
          {/* Editable signals */}
          {editableSignals.map(sig => {
            const changed = overrides[sig.key] !== undefined && overrides[sig.key] !== sig.value;
            const isEditingThis = editing === sig.key;
            const opts = SIGNAL_OPTIONS[sig.key];
            const impact = SIGNAL_IMPACT[sig.key];

            const status = signalStatus(sig.key, displayValue(sig).toLowerCase());
            const sc = STATUS_COLOURS[status];
            const confidence = SIGNAL_CONFIDENCE[sig.key];

            return (
              <div key={sig.key} style={{
                marginBottom: 4,
                borderRadius: 8,
                background: isEditingThis ? '#f9fafb' : '#fff',
                border: `1px solid ${isEditingThis ? '#e5e7eb' : '#f3f4f6'}`,
                padding: '10px 12px',
                transition: 'all 0.15s ease',
              }}>
                {/* Read row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{sig.label}</span>
                      {confidence && <span style={{ fontSize: 11, color: '#d1d5db', marginLeft: 'auto' }}>{confidence}%</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: changed ? '#d97706' : '#111827', paddingLeft: 15, marginBottom: 4 }}>
                      {displayValue(sig)}{changed && <span style={{ fontSize: 11, color: '#d97706', marginLeft: 8, fontWeight: 500 }}>corrected</span>}
                    </div>
                    {impact && <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.45, paddingLeft: 15 }}>{impact}</div>}
                  </div>
                  <button
                    onClick={() => setEditing(isEditingThis ? null : sig.key)}
                    style={{
                      background: isEditingThis ? '#f3f4f6' : '#fff',
                      border: '1px solid #e5e7eb', borderRadius: 5,
                      cursor: 'pointer', color: '#374151',
                      fontSize: 11, fontWeight: 600, padding: '4px 10px',
                      flexShrink: 0, alignSelf: 'flex-start',
                      fontFamily: '"DM Sans", sans-serif',
                    }}
                  >{isEditingThis ? 'Done' : 'Correct'}</button>
                </div>

                {/* Inline editor */}
                {isEditingThis && (
                  <div style={{ marginTop: 10 }}>
                    {sig.type === 'boolean' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['Yes', 'No'].map(opt => {
                          const boolVal = opt === 'Yes';
                          const active = displayValue(sig) === opt;
                          return (
                            <button key={opt} onClick={() => handleChange(sig.key, boolVal)} style={{
                              flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600,
                              border: `1px solid ${active ? '#111827' : '#e5e7eb'}`,
                              borderRadius: 5, cursor: 'pointer',
                              background: active ? '#111827' : '#fff',
                              color: active ? '#fff' : '#6b7280',
                              fontFamily: '"DM Sans", sans-serif',
                            }}>{opt}</button>
                          );
                        })}
                      </div>
                    ) : opts ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {opts.map(o => {
                          const active = displayValue(sig) === o;
                          return (
                            <button key={o} onClick={() => handleChange(sig.key, o)} style={{
                              padding: '4px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                              border: `1px solid ${active ? '#111827' : '#e5e7eb'}`,
                              background: active ? '#111827' : '#fff',
                              color: active ? '#fff' : '#6b7280',
                              fontFamily: '"IBM Plex Mono", monospace',
                            }}>{o}</button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

          {/* DNS signals */}
          {dnsSignals.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid #f3f4f6', margin: '12px 0 10px', paddingTop: 12 }}>
                <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  DNS scan · read only
                </span>
              </div>
              {dnsSignals.map(sig => {
                const impact = SIGNAL_IMPACT[sig.key];
                return (
                  <div key={sig.key} style={{ padding: '8px 12px', marginBottom: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: impact ? 3 : 0 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{sig.label}</span>
                      <span style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', color: '#374151', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>
                        {String(sig.value)}
                      </span>
                    </div>
                    {impact && <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{impact}</div>}
                  </div>
                );
              })}
            </>
          )}

          {/* Save */}
          {!isDemo && hasChanges && (
            <button onClick={handleSave} style={{
              width: '100%', marginTop: 16, padding: '10px 0',
              background: saved ? '#f0fdf4' : '#111827',
              color: saved ? '#16a34a' : '#fff',
              border: `1px solid ${saved ? '#bbf7d0' : '#111827'}`,
              borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
            }}>
              {saved ? '✓ Corrections saved' : 'Re-run with corrections'}
            </button>
          )}
          {isDemo && hasChanges && (
            <p style={{ fontSize: 11, color: '#d97706', marginTop: 14, lineHeight: 1.6, padding: '0 12px' }}>
              Run a live audit at your URL to apply corrections.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Score bar ──────────────────────────────────────────────────────────── */
function ScoreBlock({ score, gaps }) {
  const barRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = `${score}%`;
    }, 300);
    return () => clearTimeout(t);
  }, [score]);

  const topGaps = (gaps || []).slice(0, 2);
  const rangeHigh = Math.min(score + 15, 100);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
      <div>
        {/* Score range — both numbers same size, reads as a range */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 72, fontWeight: 800, lineHeight: 1,
            color: WHITE, letterSpacing: '-0.04em',
          }}>
            {score}
          </span>
          <span style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 72, fontWeight: 800, lineHeight: 1,
            color: 'rgba(255,255,255,0.28)', letterSpacing: '-0.04em',
          }}>
            –{rangeHigh}
          </span>
          <span style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 20, fontWeight: 400,
            color: 'rgba(255,255,255,0.28)', marginLeft: 4,
          }}>
            /100
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: 10, width: 220, height: 4,
          background: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden',
        }}>
          <div ref={barRef} style={{
            height: '100%', width: '0%', background: AMBER,
            transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)', borderRadius: 4,
          }} />
        </div>

        {/* Why the range — gap signals surfaced immediately */}
        {topGaps.length > 0 ? (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topGaps.map(g => (
              <div key={g.gap_id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FCA5A5', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: '"Outfit", sans-serif' }}>
                  {g.title}
                </span>
              </div>
            ))}
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: '"IBM Plex Mono", monospace', marginTop: 2 }}>
              from public signals · {score}–{rangeHigh} estimated range
            </p>
          </div>
        ) : (
          <p style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: '"IBM Plex Mono", monospace' }}>
            from public signals only · {score}–{rangeHigh} estimated range
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Sector plain-english descriptions ──────────────────────────────────── */
const SECTOR_BUYER = {
  healthcare:          'hospitals, health systems, and clinical teams',
  fintech:             'banks, payment processors, and financial institutions',
  financial_services:  'financial institutions and regulated funds',
  government:          'government departments and agencies',
  legal:               'law firms and legal teams',
  ecommerce:           'online retailers and marketplace operators',
  education:           'schools, universities, and education providers',
  saas:                'enterprise software buyers and procurement teams',
  infrastructure:      'enterprise IT and infrastructure teams',
};

const SECTOR_CHECK = {
  healthcare:         'a legal requirement — your buyers must verify your security before signing any contract that touches patient data',
  fintech:            'mandatory — payment networks and financial regulators require it before you can operate',
  financial_services: 'a regulatory obligation — APRA and banking partners require it before onboarding you as a vendor',
  government:         'non-negotiable — government procurement panels require security baseline evidence before considering any vendor',
  legal:              'a professional obligation — law firms must verify vendor data handling before any engagement',
  ecommerce:          'required — payment processors and enterprise retailers check this before granting integration access',
  saas:               'standard — any enterprise buyer above a certain contract size will run a security check as part of procurement',
  default:            'increasingly standard — enterprise buyers and investors check this as part of vendor due diligence',
};

function buildColdRead(report) {
  const { company_name, sector, use_case, stage, customer_type, gaps = [], trust_score, recon_summary } = report;

  const criticalGaps = gaps.filter(g => g.severity === 'critical');
  const totalGaps = gaps.length;
  const buyerType = SECTOR_BUYER[sector] || 'enterprise buyers and procurement teams';
  const securityCheck = SECTOR_CHECK[sector] || SECTOR_CHECK.default;

  // Stage in plain english
  const stageMap = {
    'Pre-seed': 'early-stage', 'Seed': 'seed-stage',
    'Series A': 'Series A', 'Series B+': 'later-stage',
  };
  const stageLabel = stageMap[stage] || stage || 'early-stage';

  // What they do in plain English — use use_case if available, else infer from sector
  const whatTheyDo = use_case
    ? `building ${use_case}`
    : sector === 'healthcare' ? 'building healthcare software'
    : sector === 'fintech' ? 'building financial technology'
    : sector === 'government' ? 'building software for government'
    : 'building software';

  // The core finding in plain English
  let finding;
  const hasSOC2Gap = gaps.some(g => g.gap_id === 'soc2');
  const hasHIPAA   = gaps.some(g => g.gap_id === 'hipaa_security');
  const hasPCI     = gaps.some(g => g.gap_id === 'pci_dss');

  if (hasHIPAA) {
    finding = `US health data law (HIPAA) requires any company touching patient records to meet specific security standards before a hospital or health system can legally work with them. Right now, ${company_name} would not pass that check.`;
  } else if (hasPCI) {
    finding = `Payment card networks require any company handling card data to meet PCI DSS standards — it's not optional. Without it, your payment processor or acquiring bank can terminate your account. Right now, ${company_name} has gaps that would fail that assessment.`;
  } else if (hasSOC2Gap && customer_type?.includes('Enterprise')) {
    finding = `Enterprise companies above a certain size are required by their own security teams to verify their vendors before signing contracts. The document they ask for first is called a SOC 2 report — a third-party audit of your security controls. ${company_name} doesn't have one yet, which means deals stall at procurement.`;
  } else if (criticalGaps.length > 0) {
    finding = `When ${company_name} goes through a security check — whether from a buyer, an investor, or a cyber insurer — ${criticalGaps.length} issue${criticalGaps.length > 1 ? 's' : ''} will surface immediately. These aren't edge cases — they're the first things any security reviewer looks for.`;
  } else {
    finding = `${company_name} has a reasonable security foundation. The gaps below are real but not urgent blockers — worth addressing before your next enterprise deal or fundraise.`;
  }

  // Build recon observation lines — what we actually detected, framed as findings
  const reconObservations = [];
  if (recon_summary) {
    if (recon_summary.waf_detected && recon_summary.waf_detected !== 'none') {
      reconObservations.push(`Your traffic sits behind ${recon_summary.waf_detected} — edge protection is active.`);
    } else if (recon_summary.cdn_provider) {
      reconObservations.push(`Your traffic sits behind ${recon_summary.cdn_provider}.`);
    }
    if (recon_summary.tls_version) {
      reconObservations.push(`${recon_summary.tls_version} is in use — encryption is current.`);
    }
    if (recon_summary.spf_policy === 'strict') {
      reconObservations.push(`SPF is enforced on your domain.`);
    }
    if (recon_summary.cloud_provider) {
      reconObservations.push(`Hosted on ${recon_summary.cloud_provider}.`);
    }
    if (recon_summary.open_ports?.length > 0) {
      const risky = recon_summary.open_ports.filter(p => p.risk !== 'none');
      const critical = risky.filter(p => p.risk === 'critical');
      if (critical.length > 0) {
        reconObservations.push(`${critical.length} critical port${critical.length > 1 ? 's' : ''} exposed: ${critical.map(p => p.label).join(', ')}.`);
      } else if (risky.length > 0) {
        reconObservations.push(`${risky.length} port${risky.length > 1 ? 's' : ''} open worth reviewing: ${risky.map(p => p.label).join(', ')}.`);
      }
    }
  }
  const infraLine = reconObservations.length > 0 ? reconObservations.join(' ') : null;

  return { stageLabel, whatTheyDo, buyerType, securityCheck, finding, criticalGaps, totalGaps, infraLine };
}

const DOGFOOD_DOMAINS = ['ethiks360.com', 'proof360.au', 'ethikslabs.com'];

function isDogfood(website) {
  if (!website) return false;
  try {
    const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(/^www\./, '');
    return DOGFOOD_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
  } catch { return false; }
}

/* ─── About you ─────────────────────────────────────────────────────────── */
function AboutYou({ report }) {
  const { company_name, website } = report;
  const { stageLabel, whatTheyDo, buyerType, securityCheck, finding, criticalGaps, totalGaps, infraLine } = buildColdRead(report);
  const dogfood = isDogfood(website);

  return (
    <section style={{ padding: '36px 0', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <SectionLabel>What we read about {company_name}</SectionLabel>
        {dogfood && (
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: NAVY,
            background: '#EAF1FB', border: `1px solid #C5D8F5`,
            borderRadius: 4, padding: '3px 8px',
            fontFamily: '"Outfit", sans-serif',
          }}>
            We assessed ourselves
          </span>
        )}
      </div>

      {/* Cold read */}
      <p style={{
        marginTop: 14, fontSize: 16, color: TEXT,
        lineHeight: 1.85, fontFamily: '"Outfit", sans-serif', fontWeight: 400,
        maxWidth: 680, marginBottom: infraLine ? 12 : 18,
      }}>
        Based on what's publicly visible, {company_name} appears to be a {stageLabel} company {whatTheyDo},
        selling into {buyerType}.
        {' '}Security verification from those buyers is {securityCheck}.
      </p>
      {infraLine && (
        <p style={{
          fontSize: 14, color: MUTED,
          lineHeight: 1.8, fontFamily: '"Outfit", sans-serif', fontWeight: 400,
          maxWidth: 680, marginBottom: 18,
          paddingLeft: 14, borderLeft: `2px solid ${BORDER}`,
        }}>
          {infraLine}
        </p>
      )}

      {/* The finding */}
      <p style={{
        fontSize: 16, color: TEXT,
        lineHeight: 1.85, fontFamily: '"Outfit", sans-serif', fontWeight: 400,
        maxWidth: 680, marginBottom: 20,
      }}>
        {finding}
      </p>

      {/* Is this right? */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        background: OFFWHITE,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        fontSize: 13, color: MUTED,
        fontFamily: '"Outfit", sans-serif',
      }}>
        <span>Does this match your situation?</span>
        <a href={`/audit`} style={{
          color: NAVY, fontWeight: 600, textDecoration: 'none',
          borderBottom: `1px solid ${BORDER}`, paddingBottom: 1,
        }}>
          Run a fresh assessment →
        </a>
      </div>
    </section>
  );
}

/* ─── Strengths ──────────────────────────────────────────────────────────── */
function Strengths({ strengths }) {
  if (!strengths?.length) return null;
  return (
    <section style={{ padding: '40px 0', borderBottom: `1px solid ${BORDER}` }}>
      <SectionLabel>What you have working</SectionLabel>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
        {strengths.map(s => (
          <div key={s.category} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: '#DCFCE7', flexShrink: 0, marginTop: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 10, color: '#16A34A' }}>✓</span>
            </div>
            <span style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Section label ──────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, color: AMBER,
      fontFamily: '"Outfit", sans-serif',
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {children}
    </p>
  );
}

/* ─── Vendor logos ───────────────────────────────────────────────────────── */
const VENDOR_DOMAINS = {
  vanta:       'vanta.com',
  drata:       'drata.com',
  secureframe: 'secureframe.com',
  crowdstrike: 'crowdstrike.com',
  trellix:     'trellix.com',
  trendmicro:  'trendmicro.com',
  sophos:      'sophos.com',
  okta:        'okta.com',
  microsoft:   'microsoft.com',
  cisco_duo:   'duo.com',
  rsa:         'rsa.com',
  palo_alto:      'paloaltonetworks.com',
  cisco_umbrella: 'umbrella.cisco.com',
  fortinet:    'fortinet.com',
  cloudflare:  'cloudflare.com',
  sonicwall:   'sonicwall.com',
  veeam:       'veeam.com',
  cohesity:    'cohesity.com',
  veritas:     'veritas.com',
  nutanix:     'nutanix.com',
  trustwave:   'trustwave.com',
};

function VendorLogo({ vendorId, initials, size = 20 }) {
  const domain = VENDOR_DOMAINS[vendorId];
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    return <span style={{ fontSize: 10, fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>{initials}</span>;
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt={initials}
      width={size}
      height={size}
      style={{ objectFit: 'contain', borderRadius: 3 }}
      onError={() => setFailed(true)}
    />
  );
}

/* ─── Vendor section ─────────────────────────────────────────────────────── */
function VendorSection({ vi, gap, report, sessionId, onEngage, engagedVendorIds = [] }) {
  const { category_name, quadrant_axes, vendors, pick, disclosure } = vi;
  const [selected, setSelected] = useState(null);

  const pickVendor   = vendors.find(v => v.vendor_id === pick?.vendor_id);
  const activeVendor = selected || pickVendor;
  const activePick   = selected ? {
    ...pick,
    recommendation_headline: selected.display_name,
    recommendation_body:     selected.summary,
    cta_label:               `Start with ${selected.display_name}`,
    deal_label:              selected.deal_label,
    referral_url:            selected.referral_url,
    meta: { ...pick?.meta, best_for: selected.best_for },
  } : pick;

  // If the pick vendor is already detected in use, skip the vendor selection UI entirely
  if (pick?.already_using) {
    return (
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${BORDER}` }}>
        <SectionLabel>How to fix this</SectionLabel>
        <div style={{
          marginTop: 16, background: OFFWHITE, border: `1px solid ${BORDER}`,
          borderRadius: 10, padding: 20,
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: WHITE,
            border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            <VendorLogo vendorId={pick.vendor_id} initials={pickVendor?.initials} size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: NAVY, fontFamily: '"Outfit", sans-serif', marginBottom: 6 }}>
              You already have {pick.recommendation_headline}
            </p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, marginBottom: 14 }}>
              {pick.recommendation_body}
            </p>
            <a
              href={`https://${pick.vendor_id === 'cloudflare' ? 'dash.cloudflare.com' : pick.vendor_id + '.com'}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '8px 16px',
                background: NAVY, color: WHITE,
                fontSize: 13, fontWeight: 600,
                borderRadius: 6, textDecoration: 'none',
                fontFamily: '"Outfit", sans-serif',
              }}
            >
              {pick.cta_label} →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${BORDER}` }}>
      <SectionLabel>Supported paths — {category_name}</SectionLabel>

      {/* Quadrant */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: LIGHT, marginBottom: 4, fontFamily: '"Outfit", sans-serif' }}>
          <span>{quadrant_axes.x_left}</span>
          <span>{quadrant_axes.x_right}</span>
        </div>
        <div style={{
          position: 'relative', height: 148,
          background: OFFWHITE, border: `1px solid ${BORDER}`, borderRadius: 8,
        }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', width: '100%', borderTop: `1px dashed ${BORDER}` }} />
            <div style={{ position: 'absolute', height: '100%', borderLeft: `1px dashed ${BORDER}` }} />
          </div>
          <span style={{ position: 'absolute', left: 6, top: 4, fontSize: 9, color: LIGHT, fontFamily: '"Outfit", sans-serif' }}>{quadrant_axes.y_top}</span>
          <span style={{ position: 'absolute', left: 6, bottom: 4, fontSize: 9, color: LIGHT, fontFamily: '"Outfit", sans-serif' }}>{quadrant_axes.y_bottom}</span>
          {vendors.map(v => (
            <button
              key={v.vendor_id}
              onClick={() => setSelected(selected?.vendor_id === v.vendor_id ? null : v)}
              style={{
                position: 'absolute',
                left: `${v.x * 100}%`, top: `${v.y * 100}%`,
                transform: 'translate(-50%,-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {v.is_pick && (
                <span style={{
                  position: 'absolute', top: -18, left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 9, color: MUTED, whiteSpace: 'nowrap',
                  fontFamily: '"Outfit", sans-serif', fontWeight: 500,
                }}>our pick</span>
              )}
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: v.is_pick ? NAVY : selected?.vendor_id === v.vendor_id ? NAVY : WHITE,
                border: v.is_pick ? 'none' : `2px solid ${BORDER}`,
                color: v.is_pick || selected?.vendor_id === v.vendor_id ? WHITE : MUTED,
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Outfit", sans-serif',
                transition: 'all 0.15s',
                boxShadow: v.is_pick ? '0 2px 8px rgba(11,37,69,0.25)' : 'none',
              }}>
                <VendorLogo vendorId={v.vendor_id} initials={v.initials} size={18} />
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 12 }}>
          {vendors.map(v => (
            <button
              key={v.vendor_id}
              onClick={() => setSelected(selected?.vendor_id === v.vendor_id ? null : v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 7,
                opacity: selected && selected.vendor_id !== v.vendor_id ? 0.3 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: 4, background: WHITE, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                <VendorLogo vendorId={v.vendor_id} initials={v.initials} size={16} />
              </div>
              <span style={{ fontSize: 12, color: TEXT, fontFamily: '"Outfit", sans-serif' }}>{v.display_name}</span>
              {v.distributor === 'dicker' && <Tag color="#7C3AED" bg="#F5F3FF" border="#EDE9FE">Dicker Data</Tag>}
              {v.distributor === 'ingram' && <Tag color="#1D4ED8" bg="#EFF6FF" border="#DBEAFE">Ingram</Tag>}
            </button>
          ))}
        </div>
      </div>

      {/* Pick card */}
      {activePick && activeVendor && (
        <div style={{
          background: OFFWHITE, border: `1px solid ${BORDER}`,
          borderRadius: 10, padding: 24, marginTop: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 11, color: MUTED, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 4 }}>
                {activePick.stage_context}
              </p>
              <p style={{ fontSize: 18, color: NAVY, fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
                {activePick.recommendation_headline}
              </p>
            </div>
            {activeVendor.deal_label && (
              <span style={{
                fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                color: '#15803D', background: '#F0FDF4',
                padding: '4px 10px', borderRadius: 20, border: '1px solid #BBF7D0',
                fontFamily: '"Outfit", sans-serif',
              }}>
                {activeVendor.deal_label}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.75, marginBottom: 18 }}>
            {activePick.recommendation_body}
          </p>
          {activePick.activate_note && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 12, color: '#1D4ED8',
              background: '#EFF6FF', border: '1px solid #DBEAFE',
              borderRadius: 6, padding: '5px 10px', marginBottom: 16,
              fontFamily: '"Outfit", sans-serif',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{activePick.activate_note}</span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 13, marginBottom: 20 }}>
            {[['Time to close', activePick.meta?.time_to_close], ['Covers', activePick.meta?.covers], ['Best for', activePick.meta?.best_for]].map(([label, val]) => val && (
              <div key={label} style={{ gridColumn: label === 'Best for' ? 'span 2' : undefined }}>
                <span style={{ color: LIGHT }}>{label}: </span>
                <span style={{ color: TEXT }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {engagedVendorIds.includes(activeVendor?.vendor_id) ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#F0FDF4', color: '#15803D',
                fontSize: 13, fontWeight: 600,
                padding: '9px 20px', borderRadius: 6,
                border: '1px solid #BBF7D0',
                fontFamily: '"Outfit", sans-serif',
              }}>
                ✓ Engaged
              </span>
            ) : (
              <button
                onClick={() => onEngage(activeVendor, gap)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: AMBER, color: WHITE,
                  fontSize: 13, fontWeight: 600,
                  padding: '9px 20px', borderRadius: 6,
                  border: 'none', cursor: 'pointer',
                  fontFamily: '"Outfit", sans-serif',
                  transition: 'background 0.15s',
                }}
              >
                Book a meeting →
              </button>
            )}
            {activePick.referral_url && (
              <a
                href={activePick.referral_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13, color: NAVY, fontFamily: '"Outfit", sans-serif',
                  fontWeight: 500, textDecoration: 'none',
                  borderBottom: `1px solid ${BORDER}`, paddingBottom: 1,
                }}
              >
                Product info →
              </a>
            )}
          </div>
        </div>
      )}

      {disclosure && (
        <p style={{ fontSize: 11, color: LIGHT, marginTop: 14, lineHeight: 1.65, fontFamily: '"Outfit", sans-serif' }}>{disclosure}</p>
      )}
    </div>
  );
}

function AwsActivateBlock({ activate }) {
  if (!activate) return null;
  return (
    <div style={{
      margin: '40px 0 0',
      background: '#F0F7FF',
      border: '1px solid #BFDBFE',
      borderRadius: 12,
      padding: '24px 28px',
      display: 'flex', alignItems: 'flex-start', gap: 20,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', fontFamily: '"Outfit", sans-serif', marginBottom: 6 }}>
          {activate.headline}
        </p>
        <p style={{ fontSize: 13, color: '#3B5A8A', lineHeight: 1.7, fontFamily: '"Outfit", sans-serif', marginBottom: 16 }}>
          {activate.body}
        </p>
        <a
          href="mailto:hello@proof360.au?subject=AWS Activate credits"
          style={{
            display: 'inline-block', padding: '8px 18px',
            background: '#1D4ED8', color: '#fff',
            fontSize: 13, fontWeight: 600,
            borderRadius: 6, textDecoration: 'none',
            fontFamily: '"Outfit", sans-serif',
          }}
        >
          {activate.cta_label} →
        </a>
      </div>
    </div>
  );
}

function Tag({ color, bg, border, children }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, color, background: bg,
      padding: '1px 6px', borderRadius: 8, border: `1px solid ${border}`,
      fontFamily: '"Outfit", sans-serif',
    }}>{children}</span>
  );
}

/* ─── Category icons ─────────────────────────────────────────────────────── */
// governance → shield+check (compliance authority)
// identity   → key (access control)
// infrastructure → server stack (technical controls)
// human      → person (founder/leadership trust)
function CategoryIcon({ category, color, size = 22 }) {
  const props = { width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (category === 'identity') return (
    <svg {...props}>
      <circle cx="8" cy="9" r="3.5" />
      <path d="M11.5 9H17M15 9V12M17 9V11" />
    </svg>
  );
  if (category === 'infrastructure') return (
    <svg {...props}>
      <rect x="3" y="3" width="14" height="4" rx="1" />
      <rect x="3" y="9" width="14" height="4" rx="1" />
      <rect x="3" y="15" width="14" height="3" rx="1" />
      <circle cx="15" cy="5" r="0.9" fill={color} stroke="none" />
      <circle cx="15" cy="11" r="0.9" fill={color} stroke="none" />
    </svg>
  );
  if (category === 'human') return (
    <svg {...props}>
      <circle cx="10" cy="6" r="3" />
      <path d="M3 19C3 15 6.5 12.5 10 12.5C13.5 12.5 17 15 17 19" />
    </svg>
  );
  // governance (default)
  return (
    <svg {...props}>
      <path d="M10 2L17 5V10C17 14.5 14 17.5 10 18.5C6 17.5 3 14.5 3 10V5L10 2Z" />
      <path d="M7 10L9 12L13 8" />
    </svg>
  );
}

/* ─── Gap section ────────────────────────────────────────────────────────── */
function GapSection({ gap, index, isOpen, onToggle, trustScore, report, sessionId, onEngage, engagedVendorIds }) {
  const open = isOpen;
  const sev = SEV[gap.severity] || SEV.low;

  return (
    <div id={`gap-${index}`} style={{
      border: `1px solid ${sev.border}26`, borderRadius: 10,
      overflow: 'hidden', marginBottom: 12,
      borderLeft: `4px solid ${sev.border}`,
      background: sev.bg,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: open ? WHITE : sev.bg,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '18px 20px', textAlign: 'left',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: 13, fontWeight: 700, color: LIGHT,
          flexShrink: 0, width: 28,
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <CategoryIcon category={gap.category} color={sev.border} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: sev.color, background: sev.bg,
              padding: '2px 8px', borderRadius: 20,
              fontFamily: '"Outfit", sans-serif',
            }}>
              {sev.label}
            </span>
            {(gap.framework_impact || []).filter(fi => fi.blocker).slice(0, 3).map((fi, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600,
                color: '#B91C1C', background: '#FEF2F2',
                padding: '2px 7px', borderRadius: 20,
                border: '1px solid #FECACA',
                fontFamily: '"Outfit", sans-serif',
                letterSpacing: '0.01em',
              }}>
                {fi.framework}
              </span>
            ))}
          </div>
          <p style={{
            fontSize: 15, fontWeight: 600, color: TEXT,
            fontFamily: '"Outfit", sans-serif', margin: 0,
          }}>
            {gap.title}
          </p>
        </div>
        <span style={{
          color: LIGHT, fontSize: 14, flexShrink: 0,
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'none',
          fontFamily: '"Outfit", sans-serif',
        }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: '0 20px 24px 86px', background: WHITE, borderTop: `1px solid ${sev.border}26` }}>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.8, marginBottom: 20, paddingTop: 16 }}>
            {gap.why}
          </p>

          {/* Score impact */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: OFFWHITE, border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: '8px 16px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 12, color: MUTED, fontFamily: '"Outfit", sans-serif' }}>Trust score</span>
            <span style={{ fontSize: 13, fontFamily: '"IBM Plex Mono", monospace', color: TEXT, fontWeight: 500 }}>
              {trustScore}/100 → {trustScore + gap.score_impact}/100
            </span>
            <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
              +{gap.score_impact} pts
            </span>
          </div>

          {/* Framework impact */}
          {gap.framework_impact?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: LIGHT, letterSpacing: '0.06em', fontFamily: '"IBM Plex Mono", monospace', marginBottom: 10, textTransform: 'uppercase' }}>
                Compliance impact
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {gap.framework_impact.map((fi, i) => (
                  <div key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px',
                    borderRadius: 5,
                    border: `1px solid ${fi.blocker ? '#FECACA' : BORDER}`,
                    background: fi.blocker ? '#FEF2F2' : OFFWHITE,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: fi.blocker ? '#B91C1C' : MUTED,
                      fontFamily: '"Outfit", sans-serif',
                    }}>
                      {fi.framework}
                    </span>
                    <span style={{ fontSize: 10, color: fi.blocker ? '#DC2626' : LIGHT, fontFamily: '"IBM Plex Mono", monospace' }}>
                      {fi.control}
                    </span>
                    {fi.blocker && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                        color: '#B91C1C', textTransform: 'uppercase',
                        fontFamily: '"Outfit", sans-serif',
                      }}>
                        · blocker
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 11, color: LIGHT, letterSpacing: '0.06em', fontFamily: '"IBM Plex Mono", monospace', marginBottom: 8, textTransform: 'uppercase' }}>Risk</p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>{gap.risk}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: LIGHT, letterSpacing: '0.06em', fontFamily: '"IBM Plex Mono", monospace', marginBottom: 8, textTransform: 'uppercase' }}>Closes with</p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>{gap.control}</p>
            </div>
          </div>

          {/* Remediation steps */}
          {gap.remediation?.length > 0 && (
            <div style={{
              marginBottom: 20,
              background: '#F8FBF8',
              border: '1px solid #D1FAE5',
              borderRadius: 8,
              padding: '16px 18px',
            }}>
              <p style={{ fontSize: 11, color: '#15803D', letterSpacing: '0.06em', fontFamily: '"IBM Plex Mono", monospace', marginBottom: 12, textTransform: 'uppercase', fontWeight: 600 }}>
                How to fix this
              </p>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {gap.remediation.map((step, i) => (
                  <li key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    marginBottom: i < gap.remediation.length - 1 ? 10 : 0,
                  }}>
                    <span style={{
                      flexShrink: 0, width: 18, height: 18,
                      borderRadius: '50%',
                      background: '#D1FAE5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#15803D',
                      fontFamily: '"Outfit", sans-serif',
                      marginTop: 1,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, color: TEXT, lineHeight: 1.7, fontFamily: '"Outfit", sans-serif' }}>
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {gap.time_estimate && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginBottom: 20,
            }}>
              <span style={{ fontSize: 12, color: MUTED, fontFamily: '"Outfit", sans-serif', fontWeight: 500 }}>
                Time to close:
              </span>
              <span style={{ fontSize: 12, color: '#16A34A', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 500 }}>
                {gap.time_estimate}
              </span>
            </div>
          )}

          {gap.evidence?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: LIGHT, letterSpacing: '0.06em', fontFamily: '"IBM Plex Mono", monospace', marginBottom: 10, textTransform: 'uppercase' }}>
                Sourced from
              </p>
              {gap.evidence.map((e, i) => (
                <div key={i} style={{
                  marginBottom: 10, paddingLeft: 12,
                  borderLeft: `2px solid ${BORDER}`,
                }}>
                  <p style={{ fontSize: 12, color: TEXT, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 2, fontWeight: 500 }}>{SOURCE_LABELS[e.source] || e.source}</p>
                  <p style={{ fontSize: 12, color: LIGHT, lineHeight: 1.6 }}>{e.citation}</p>
                </div>
              ))}
            </div>
          )}

          {gap.vendor_intelligence ? (
            <VendorSection
              vi={gap.vendor_intelligence}
              gap={gap}
              report={report}
              sessionId={sessionId}
              onEngage={onEngage}
              engagedVendorIds={engagedVendorIds}
            />
          ) : (
            <button
              onClick={() => {
                const gate = document.getElementById('email-gate');
                if (gate) gate.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              style={{
                marginTop: 20, width: '100%',
                border: `1px dashed ${BORDER}`, borderRadius: 8,
                padding: '14px 20px',
                background: OFFWHITE, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                fontFamily: '"Outfit", sans-serif',
              }}
            >
              <span style={{ fontSize: 16 }}>🔒</span>
              <span style={{ fontSize: 13, color: MUTED }}>
                Vendor recommendations locked — enter your email below to unlock
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Path forward ───────────────────────────────────────────────────────── */
function PathForward({ steps }) {
  return (
    <section style={{ padding: '40px 0', borderBottom: `1px solid ${BORDER}` }}>
      <SectionLabel>Your path forward</SectionLabel>
      <p style={{ fontSize: 14, color: MUTED, marginTop: 6, marginBottom: 24, lineHeight: 1.6, fontFamily: '"Outfit", sans-serif' }}>
        Close these gaps in order. Each one strengthens what investors and buyers can see.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {steps.map((step, i) => (
          <div key={step.step_number} style={{
            display: 'flex', alignItems: 'flex-start', gap: 18,
            padding: '16px 0',
            borderTop: i > 0 ? `1px solid ${BORDER}` : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: NAVY, color: WHITE,
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontFamily: '"Outfit", sans-serif',
              marginTop: 1,
            }}>
              {step.step_number}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 14, color: TEXT, fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
                  {step.title.replace('Fix: ', '')}
                </p>
                <span style={{
                  fontSize: 11, color: '#16A34A',
                  background: '#F0FDF4', padding: '2px 10px',
                  borderRadius: 20, border: '1px solid #BBF7D0',
                  fontFamily: '"Outfit", sans-serif', fontWeight: 600,
                }}>
                  {step.score_trajectory}
                </span>
              </div>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, fontFamily: '"Outfit", sans-serif' }}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Email gate ─────────────────────────────────────────────────────────── */
function EmailGate({ sessionId, onUnlock }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  async function submit() {
    if (!email.includes('@')) { setErr('Enter a valid email.'); return; }
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/v1/session/${sessionId}/capture-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const b = await res.json(); msg = b.error || msg; } catch {}
        // Session expired server-side but report data is already loaded — unlock
        // anyway. Lead is lost but the user experience must not be blocked.
        if (res.status === 404) { onUnlock(); return; }
        throw new Error(msg);
      }
      onUnlock();
    } catch (err) {
      if (err.name === 'TypeError') {
        // Network failure — unlock locally, lead is lost
        onUnlock();
        return;
      }
      setErr(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: '36px 32px', textAlign: 'center',
      background: OFFWHITE, marginTop: 8,
    }}>
      <SectionLabel>Layer 2 — Vendor intelligence</SectionLabel>
      <h3 style={{
        fontFamily: '"Outfit", sans-serif',
        fontSize: 22, fontWeight: 700, color: NAVY,
        marginTop: 12, marginBottom: 10,
      }}>
        See exactly what closes each gap
      </h3>
      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, marginBottom: 28, maxWidth: 360, margin: '0 auto 28px', fontFamily: '"Outfit", sans-serif' }}>
        Unlock vendor paths, the comparison matrix, and your recommended fix order.
      </p>
      <div style={{ display: 'flex', gap: 8, maxWidth: 380, margin: '0 auto' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="you@yourcompany.com"
          style={{
            flex: 1, padding: '10px 14px', fontSize: 14,
            border: `1px solid ${BORDER}`, borderRadius: 6,
            fontFamily: '"Outfit", sans-serif',
            background: WHITE, color: TEXT, outline: 'none',
          }}
        />
        <button
          onClick={submit}
          disabled={loading}
          style={{
            padding: '10px 20px', background: NAVY, color: WHITE,
            fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: '"Outfit", sans-serif',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '...' : 'Unlock →'}
        </button>
      </div>
      {err && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 10 }}>{err}</p>}
    </div>
  );
}

/* ─── Report ─────────────────────────────────────────────────────────────── */
export default function Report() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const flags         = useFeatureFlags();
  const isDemo        = sessionId === 'demo';
  const bypassUnlock  = isDemo || searchParams.get('unlock') === 'true';

  const [report,  setReport]  = useState(isDemo ? demoReport : null);
  const [locked,  setLocked]  = useState(bypassUnlock ? false : true);
  const [error,   setError]   = useState('');
  const [openGapIndex, setOpenGapIndex] = useState(null);
  const [showUnlockBar, setShowUnlockBar] = useState(false);

  // Engagement state
  const engagements       = useEngagements(sessionId);
  const [sessionEngaged, setSessionEngaged] = useState(() => engagements.forSession());
  const engagedVendorIds  = sessionEngaged.map(e => e.vendor_id);

  // Modal state
  const [bookingTarget, setBookingTarget] = useState(null); // { vendor, gap }
  const [showLoginGate, setShowLoginGate] = useState(false);
  const founderAuth = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem('founder_auth')); } catch { return null; } })()
    : null;

  function handleEngage(vendor, gap) {
    if (!vendor) return;
    setBookingTarget({ vendor, gap });
    if (!founderAuth) {
      setShowLoginGate(true);
    }
  }

  function handleBooked({ vendor, gap, status }) {
    const record = {
      id:           `eng_${Date.now()}`,
      session_id:   sessionId,
      company_name: report?.company_name || 'Your company',
      vendor_id:    vendor.vendor_id,
      vendor_name:  vendor.display_name,
      gap_id:       gap?.gap_id,
      gap_title:    gap?.title,
      status:       status || 'meeting_booked',
      engaged_at:   new Date().toISOString(),
    };
    engagements.add(record);
    setSessionEngaged(engagements.forSession());
  }

  function handleDemoLogin() {
    // Demo bypass — write a fake founder auth and proceed
    localStorage.setItem('founder_auth', JSON.stringify({ user: { name: 'Demo User', email: 'demo@proof360.au' }, demo: true }));
    setShowLoginGate(false);
    // bookingTarget stays set, modal opens
  }

  useEffect(() => {
    const link = document.createElement('link');
    link.rel   = 'stylesheet';
    link.href  = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    if (isDemo) return;
    getReport(sessionId)
      .then(r => {
        setReport(r);
        const isLocked = bypassUnlock ? false : r.layer2_locked;
        setLocked(isLocked);
        if (isLocked) setShowUnlockBar(true);
      })
      .catch(() => setError('We couldn\'t load your report. Please try again.'));
  }, [sessionId, isDemo]);

  function handleUnlock() {
    setLocked(false);
    setShowUnlockBar(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveAndTrack() {
    const summary = {
      sessionId,
      company_name: report.company_name || 'Your company',
      website:      report.website || null,
      trust_score:  report.trust_score,
      gaps_count:   (report.gaps || []).length,
      saved_at:     new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('founder_reports') || '[]');
    localStorage.setItem('founder_reports', JSON.stringify(
      [...existing.filter(r => r.sessionId !== sessionId), summary]
    ));
    if (localStorage.getItem('founder_auth')) navigate('/account');
    else {
      sessionStorage.setItem('pending_founder_report', JSON.stringify(summary));
      navigate('/account/login');
    }
  }

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Outfit", sans-serif', background: OFFWHITE }}>
      <p style={{ color: MUTED }}>{error}</p>
    </div>
  );

  if (!report) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Outfit", sans-serif', background: OFFWHITE }}>
      <p style={{ color: LIGHT, fontSize: 14 }}>Loading your report...</p>
    </div>
  );

  const sortedGaps = [...(report.gaps || [])].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  );
  const topGap = sortedGaps[0];
  const date   = new Date(report.assessed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ background: WHITE, minHeight: '100vh', fontFamily: '"Outfit", sans-serif', paddingBottom: 70 }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .report-in { animation: fadeUp 0.5s ease both; }
        input:focus { border-color: #0B2545 !important; outline: none; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: NAVY,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          maxWidth: 800, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52,
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Proof360Mark size={26} />
            <span style={{
              fontFamily: '"Outfit", sans-serif',
              fontSize: 17, fontWeight: 700,
              color: WHITE, letterSpacing: '-0.01em',
            }}>
              Proof<span style={{ color: AMBER }}>360</span>
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isDemo && (
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '3px 10px', borderRadius: 20,
                fontFamily: '"Outfit", sans-serif',
              }}>
                Example report
              </span>
            )}
            <button
              onClick={saveAndTrack}
              style={{
                fontSize: 13, fontWeight: 600,
                color: NAVY, background: AMBER,
                border: 'none', padding: '7px 16px',
                borderRadius: 6, cursor: 'pointer',
                fontFamily: '"Outfit", sans-serif',
                transition: 'opacity 0.15s',
              }}
            >
              Save & track →
            </button>
          </div>
        </div>
      </nav>

      {/* ── Layer 2 unlock bar ── */}
      {showUnlockBar && locked && (
        <div style={{
          position: 'sticky', top: 52, zIndex: 90,
          background: AMBER,
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: WHITE, fontFamily: '"Outfit", sans-serif' }}>
            🔒 Vendor recommendations are ready — enter your email to unlock
          </span>
          <button
            onClick={() => {
              document.getElementById('email-gate')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            style={{
              padding: '5px 14px', background: WHITE, color: AMBER,
              border: 'none', borderRadius: 5, cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: '"Outfit", sans-serif',
            }}
          >
            Unlock Layer 2 ↓
          </button>
          <button
            onClick={() => setShowUnlockBar(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 16 }}
          >×</button>
        </div>
      )}

      {/* ── Hero band ── */}
      <div style={{ background: NAVY, paddingBottom: 40 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 0' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: '"IBM Plex Mono", monospace', marginBottom: 10 }}>
            {date} · Trust Readiness Assessment
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <CompanyLogo domain={report.website} name={report.company_name} size={52} />
                <h1 style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: 40, fontWeight: 700, lineHeight: 1.1,
                  color: WHITE, letterSpacing: '-0.02em',
                }}>
                  {report.company_name}
                </h1>
              </div>
              <p style={{
                fontSize: 17, color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.6, maxWidth: 460,
                fontFamily: '"Outfit", sans-serif', fontWeight: 400,
              }}>
                {report.headline.summary_line}
              </p>
            </div>
            <ScoreBlock score={report.trust_score} gaps={report.gaps} />
          </div>

          {/* Stats strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 1, background: 'rgba(255,255,255,0.08)',
            borderRadius: 8, overflow: 'hidden', marginTop: 36,
          }}>
            {[
              { n: report.snapshot?.deal_blockers,     label: 'Gaps in your story',    color: '#FCA5A5' },
              { n: report.snapshot?.fundraising_risk,  label: 'Investor questions',    color: '#FCD34D' },
              { n: report.snapshot?.strengths,         label: 'What\'s working',       color: '#86EFAC' },
            ].map(({ n, label, color }) => (
              <div key={label} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 28, fontWeight: 700, color, fontFamily: '"Outfit", sans-serif', lineHeight: 1 }}>{n}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4, fontFamily: '"Outfit", sans-serif' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Confidence ribbon ── */}
      {report.confidence?.overall && report.confidence.overall !== 'high' && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <ConfidenceRibbon confidence={report.confidence} />
        </div>
      )}

      {/* ── Body ── */}
      <main className="report-in" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 100px' }}>

        <AboutYou report={report} />

        <Strengths strengths={report.strengths} />

        <section style={{ paddingTop: 40 }}>
          <SectionLabel>Where your story has gaps</SectionLabel>
          <div style={{ marginTop: 20 }}>
            {sortedGaps.map((gap, i) => (
              <GapSection
                key={gap.gap_id}
                gap={locked ? { ...gap, vendor_intelligence: null } : gap}
                index={i}
                isOpen={openGapIndex === i}
                onToggle={() => {
                  const closing = openGapIndex === i;
                  setOpenGapIndex(closing ? null : i);
                  if (!closing) {
                    setTimeout(() => {
                      const el = document.getElementById(`gap-${i}`);
                      if (el) {
                        const top = el.getBoundingClientRect().top + window.scrollY - 108;
                        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                      }
                    }, 20);
                  }
                }}
                trustScore={report.trust_score}
                report={report}
                sessionId={sessionId}
                onEngage={handleEngage}
                engagedVendorIds={engagedVendorIds}
                overallConfidence={report.confidence?.overall}
              />
            ))}
          </div>
          {locked && (
            <div id="email-gate">
              <EmailGate sessionId={sessionId} onUnlock={handleUnlock} />
            </div>
          )}
        </section>

        <AwsActivateBlock activate={report.aws_activate} />

        {/* ── Program match (Layer 2, feature-flagged) ── */}
        {!locked && flags?.layer2_cards?.program_match && (
          <div style={{ marginTop: 40 }}>
            <ProgramMatchCard sessionId={sessionId} />
          </div>
        )}

        {report.next_steps?.length > 0 && <PathForward steps={report.next_steps} />}

        {/* CTA */}
        <section style={{
          marginTop: 48, padding: 40,
          background: NAVY, borderRadius: 12,
          textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 28, fontWeight: 700,
            color: WHITE, marginBottom: 12, letterSpacing: '-0.01em',
          }}>
            Ready to close these gaps?
          </h2>
          {topGap && (
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px', fontFamily: '"Outfit", sans-serif' }}>
              Start with {topGap.title}. Fix it and your score moves from {report.trust_score} to {report.trust_score + topGap.score_impact}.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <button
              onClick={saveAndTrack}
              style={{
                padding: '13px 28px', background: AMBER, color: WHITE,
                fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 6,
                cursor: 'pointer', fontFamily: '"Outfit", sans-serif',
                letterSpacing: '0.01em',
              }}
            >
              Save this report →
            </button>
            <Link to="/audit" style={{
              fontSize: 13, color: 'rgba(255,255,255,0.45)',
              textDecoration: 'none', fontFamily: '"Outfit", sans-serif',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              paddingBottom: 1,
            }}>
              Run another audit
            </Link>
          </div>
        </section>

      </main>

      {/* ── Login gate ── */}
      {showLoginGate && bookingTarget && (
        <LoginGate
          vendor={bookingTarget.vendor}
          onDemoLogin={handleDemoLogin}
          onClose={() => { setShowLoginGate(false); setBookingTarget(null); }}
        />
      )}

      {/* ── Signal panel ── */}
      <SignalPanel signals={report.signals || []} isDemo={isDemo} />

      {/* ── Booking modal ── */}
      {bookingTarget && !showLoginGate && (
        <BookingModal
          vendor={bookingTarget.vendor}
          gap={bookingTarget.gap}
          report={report}
          sessionId={sessionId}
          onClose={() => setBookingTarget(null)}
          onBooked={handleBooked}
        />
      )}

      {/* ── Persona chat ── */}
      <PersonaChat context={{
        company_name: report.company_name,
        score: report.trust_score,
        website: report.website || null,
        gaps: (report.gaps || []).map(g => ({
          id: g.gap_id,
          label: g.label,
          severity: g.severity,
          why: g.why,
          remediation: g.remediation || [],
        })),
        strengths: (report.strengths || []).map(s => s.label || s.category),
        recon: report.recon_summary || null,
        active_gap: openGapIndex !== null ? (() => {
          const g = sortedGaps[openGapIndex];
          return g ? { label: g.label, severity: g.severity, why: g.why, remediation: g.remediation || [] } : null;
        })() : null,
      }} />
    </div>
  );
}
