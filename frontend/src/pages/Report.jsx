import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { demoReport } from '../data/demo-report';
import { getReport } from '../api/client';

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

const SEVERITY_ORDER = { critical: 0, high: 0, moderate: 1, low: 2 };

const SEV = {
  critical: { border: '#DC2626', bg: '#FEF2F2', color: '#B91C1C', label: 'Critical' },
  high:     { border: '#D97706', bg: '#FFFBEB', color: '#B45309', label: 'High'     },
  moderate: { border: '#D97706', bg: '#FFFBEB', color: '#B45309', label: 'Moderate' },
  low:      { border: '#16A34A', bg: '#F0FDF4', color: '#15803D', label: 'Low'      },
};

function scoreLabel(s) {
  if (s >= 80) return 'Strong trust posture';
  if (s >= 60) return 'Gaps present — fix order below';
  if (s >= 40) return 'Significant gaps';
  return 'Needs immediate attention';
}

/* ─── Proof360 mark ──────────────────────────────────────────────────────── */
function Proof360Mark({ size = 26 }) {
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

/* ─── Company avatar ──────────────────────────────────────────────────────── */
function CompanyAvatar({ name, size = 52 }) {
  const initials = (name || '??').split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  // derive a consistent hue from name
  const hue = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: `hsl(${hue},35%,22%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      border: '1.5px solid rgba(255,255,255,0.1)',
    }}>
      <span style={{
        fontFamily: '"Outfit", sans-serif',
        fontSize: size * 0.38, fontWeight: 700,
        color: `hsl(${hue},70%,75%)`,
        letterSpacing: '-0.02em',
        userSelect: 'none',
      }}>
        {initials}
      </span>
    </div>
  );
}

/* ─── Score bar ──────────────────────────────────────────────────────────── */
function ScoreBlock({ score }) {
  const barRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = `${score}%`;
    }, 300);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div>
        <div style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: 64, fontWeight: 700, lineHeight: 1,
          color: WHITE, letterSpacing: '-0.03em',
        }}>
          {score}
          <span style={{ fontSize: 24, fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>/100</span>
        </div>
        <div style={{
          marginTop: 10, width: 200, height: 4,
          background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden',
        }}>
          <div ref={barRef} style={{
            height: '100%', width: '0%', background: AMBER,
            transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)', borderRadius: 4,
          }} />
        </div>
        <p style={{
          marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)',
          fontFamily: '"Outfit", sans-serif', fontWeight: 500,
          letterSpacing: '0.02em',
        }}>
          {scoreLabel(score)}
        </p>
      </div>
    </div>
  );
}

/* ─── About you ─────────────────────────────────────────────────────────── */
function AboutYou({ report }) {
  const { company_name, strengths = [], trust_score, headline } = report;
  const topStrength = strengths[0]?.label?.toLowerCase() || 'existing infrastructure';
  const strengthCount = strengths.length;
  const gapCount = (report.gaps || []).length;
  const score = trust_score;

  const tone = score >= 70
    ? `You're in solid shape for most conversations, but there are gaps that will surface under scrutiny.`
    : score >= 50
    ? `You have a working foundation, but three or more gaps will block enterprise deals right now.`
    : `The gaps we've found are significant — but they're fixable, and the path forward is clear.`;

  return (
    <section style={{ padding: '36px 0', borderBottom: `1px solid ${BORDER}` }}>
      <SectionLabel>About {company_name}</SectionLabel>
      <p style={{
        marginTop: 14, fontSize: 16, color: TEXT,
        lineHeight: 1.85, fontFamily: '"Outfit", sans-serif', fontWeight: 400,
        maxWidth: 680,
      }}>
        From what we can see publicly, {company_name} has {strengthCount > 0 ? `${strengthCount} things working well — including ${topStrength}` : 'some foundations in place'}.{' '}
        {headline?.summary_line || `We identified ${gapCount} gaps worth addressing.`}{' '}
        {tone}
      </p>
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
  palo_alto:   'paloaltonetworks.com',
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

function Tag({ color, bg, border, children }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, color, background: bg,
      padding: '1px 6px', borderRadius: 8, border: `1px solid ${border}`,
      fontFamily: '"Outfit", sans-serif',
    }}>{children}</span>
  );
}

/* ─── Gap section ────────────────────────────────────────────────────────── */
function GapSection({ gap, index, trustScore, report, sessionId, onEngage, engagedVendorIds }) {
  const [open, setOpen] = useState(index === 0);
  const sev = SEV[gap.severity] || SEV.low;

  return (
    <div style={{
      border: `1px solid ${BORDER}`, borderRadius: 10,
      overflow: 'hidden', marginBottom: 12,
      borderLeft: `4px solid ${sev.border}`,
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', background: open ? OFFWHITE : WHITE,
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
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: sev.color, background: sev.bg,
              padding: '2px 8px', borderRadius: 20,
              fontFamily: '"Outfit", sans-serif',
            }}>
              {sev.label}
            </span>
            <span style={{ fontSize: 11, color: LIGHT, fontFamily: '"IBM Plex Mono", monospace' }}>
              {gap.confidence} confidence
            </span>
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
        <div style={{ padding: '0 20px 24px 64px', background: WHITE }}>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.8, marginBottom: 20, paddingTop: 16 }}>
            {gap.why}
          </p>

          {/* Score impact */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: OFFWHITE, border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: '8px 16px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 12, color: MUTED, fontFamily: '"Outfit", sans-serif' }}>Fix this gap</span>
            <span style={{ fontSize: 13, fontFamily: '"IBM Plex Mono", monospace', color: TEXT, fontWeight: 500 }}>
              {trustScore} → {trustScore + gap.score_impact}
            </span>
            <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
              +{gap.score_impact} pts
            </span>
          </div>

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

          {gap.time_estimate && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginBottom: 20,
            }}>
              <span style={{ fontSize: 12, color: '#16A34A', fontFamily: '"Outfit", sans-serif', fontWeight: 500 }}>
                ⏱ {gap.time_estimate}
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
                  <p style={{ fontSize: 12, color: TEXT, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 2, fontWeight: 500 }}>{e.source}</p>
                  <p style={{ fontSize: 12, color: LIGHT, lineHeight: 1.6 }}>{e.citation}</p>
                </div>
              ))}
            </div>
          )}

          {gap.vendor_intelligence && (
            <VendorSection
              vi={gap.vendor_intelligence}
              gap={gap}
              report={report}
              sessionId={sessionId}
              onEngage={onEngage}
              engagedVendorIds={engagedVendorIds}
            />
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
        Fix these in order. Each one removes a deal blocker and improves your score.
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
      const res = await fetch(`/api/session/${sessionId}/capture-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      onUnlock();
    } catch {
      setErr('Something went wrong. Try again.');
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
  const isDemo        = sessionId === 'demo';
  const bypassUnlock  = isDemo || searchParams.get('unlock') === 'true';

  const [report,  setReport]  = useState(isDemo ? demoReport : null);
  const [locked,  setLocked]  = useState(bypassUnlock ? false : true);
  const [error,   setError]   = useState('');
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
    if (!isDemo) getReport(sessionId).then(r => setReport(r)).catch(() => {});
  }

  function saveAndTrack() {
    const summary = {
      sessionId,
      company_name: report.company_name || 'Your company',
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
    <div style={{ background: WHITE, minHeight: '100vh', fontFamily: '"Outfit", sans-serif' }}>
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
                <CompanyAvatar name={report.company_name} size={52} />
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
            <ScoreBlock score={report.trust_score} />
          </div>

          {/* Stats strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 1, background: 'rgba(255,255,255,0.08)',
            borderRadius: 8, overflow: 'hidden', marginTop: 36,
          }}>
            {[
              { n: report.snapshot?.deal_blockers,     label: 'Deal blockers',      color: '#FCA5A5' },
              { n: report.snapshot?.fundraising_risk,  label: 'Fundraising risks',  color: '#FCD34D' },
              { n: report.snapshot?.strengths,         label: 'Strengths',          color: '#86EFAC' },
            ].map(({ n, label, color }) => (
              <div key={label} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 28, fontWeight: 700, color, fontFamily: '"Outfit", sans-serif', lineHeight: 1 }}>{n}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4, fontFamily: '"Outfit", sans-serif' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <main className="report-in" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 100px' }}>

        <AboutYou report={report} />

        <Strengths strengths={report.strengths} />

        <section style={{ paddingTop: 40 }}>
          <SectionLabel>What needs attention</SectionLabel>
          <div style={{ marginTop: 20 }}>
            {sortedGaps.map((gap, i) => (
              <GapSection
                key={gap.gap_id}
                gap={locked ? { ...gap, vendor_intelligence: null } : gap}
                index={i}
                trustScore={report.trust_score}
                report={report}
                sessionId={sessionId}
                onEngage={handleEngage}
                engagedVendorIds={engagedVendorIds}
              />
            ))}
          </div>
          {locked && (
            <div id="email-gate">
              <EmailGate sessionId={sessionId} onUnlock={handleUnlock} />
            </div>
          )}
        </section>

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
              Start with {topGap.title.toLowerCase()}. Fix it and your score moves from {report.trust_score} to {report.trust_score + topGap.score_impact}.
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
    </div>
  );
}
