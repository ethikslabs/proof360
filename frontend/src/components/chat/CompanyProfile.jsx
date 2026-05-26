import { useState, useEffect } from 'react';
import awsUrl from '../OperationalField/logos/aws.svg';
import microsoftUrl from '../OperationalField/logos/microsoft.svg';
import cloudflareUrl from '../OperationalField/logos/cloudflare.svg';
import vantaUrl from '../OperationalField/logos/vanta.svg';
import ciscoUrl from '../OperationalField/logos/cisco.svg';
import austbrokersUrl from '../OperationalField/logos/austbrokers-cyberpro.svg';
import wholesaleInvestorUrl from '../OperationalField/logos/wholesale-investor.svg';

const HIVE_SCORES = {
  identity:   85,
  compliance: 90,
  security:   82,
  financial:  78,
  legal:      88,
  team:       80,
};

const DOMAIN_META = [
  { id: 'identity',   label: 'Identity & Auth' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'security',   label: 'Security' },
  { id: 'financial',  label: 'Financial' },
  { id: 'legal',      label: 'Legal' },
  { id: 'team',       label: 'Team & Ops' },
];

const DISCOVERY_VENDORS = [
  {
    logoUrl: awsUrl, logoH: 18, alt: 'AWS',
    value: '$220k+ to build without burning cash',
    programs: ['Activate (credits)', 'ISV co-sell', 'Marketplace listing', 'Partner Network', 'Gen AI track', 'EdStart', 'Energy', 'Impact Computing', 'Startup pack', 'Direct credits'],
  },
  {
    logoUrl: microsoftUrl, logoH: 14, alt: 'Microsoft',
    value: 'Sell into enterprise through Microsoft',
    programs: ['Startups (M365 free)', 'Azure credits', 'Partner Network', 'ISV co-sell', 'AI Cloud Partner', 'Marketplace listing'],
  },
  { logoUrl: cloudflareUrl, logoH: 16, alt: 'Cloudflare', value: 'Enterprise security posture, zero cost',    sub: 'What DD teams check — free for startups' },
  { logoUrl: vantaUrl,      logoH: 16, alt: 'Vanta',      value: 'SOC 2 — the cert that unlocks B2B deals',   sub: '90-day automated path to certified' },
  { logoUrl: ciscoUrl,      logoH: 14, alt: 'Cisco',       value: 'Security stack enterprise buyers trust',    sub: 'Startup partner access' },
  { logoUrl: austbrokersUrl,       logoH: 16, alt: 'AustBrokers',       value: 'Cyber cover enterprise procurement requires', sub: 'AU specialist — fast-track quote' },
  { logoUrl: wholesaleInvestorUrl, logoH: 14, alt: 'Wholesale Investor', value: '10,000+ AU accredited investors',              sub: 'When your posture is ready to raise' },
];

function DomainRow({ id, label, userScore, tk }) {
  const hive = HIVE_SCORES[id];
  const known = userScore !== null && userScore !== undefined;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          fontSize: 10.5, color: tk.inkSoft,
        }}>{label}</span>
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9, color: known ? tk.inkMid : tk.inkGhost,
        }}>{known ? `${userScore}` : '—'}<span style={{ opacity: 0.5 }}>/{hive}</span></span>
      </div>

      {/* Hive&Co bar */}
      <div style={{ height: 3, background: tk.hairline, borderRadius: 2, marginBottom: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${hive}%`,
          background: '#c4b8a8', borderRadius: 2, opacity: 0.7,
        }} />
      </div>

      {/* Your bar */}
      <div style={{ height: 3, background: tk.hairline, borderRadius: 2, overflow: 'hidden' }}>
        {known ? (
          <div style={{
            height: '100%',
            width: `${userScore}%`,
            background: '#b0956e', borderRadius: 2,
            transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        ) : (
          <div style={{
            height: '100%', width: '100%',
            background: 'repeating-linear-gradient(90deg, #e0d8c9 0px, #e0d8c9 3px, transparent 3px, transparent 7px)',
            opacity: 0.6,
          }} />
        )}
      </div>
    </div>
  );
}

function DiscoveryView({ tk }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div style={{ flex: 1 }}>
      {DISCOVERY_VENDORS.map((v, i) => {
        const isOpen = openId === v.alt;
        const isLast = i === DISCOVERY_VENDORS.length - 1;
        const count = v.programs?.length;
        const expandHeight = count ? 16 + count * 24 + 16 : 58;

        return (
          <div key={v.alt} style={{ borderBottom: isLast ? 'none' : `1px solid ${tk.hairline}` }}>
            <button
              onClick={() => setOpenId(isOpen ? null : v.alt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '13px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <img
                src={v.logoUrl} alt={v.alt}
                style={{ height: v.logoH, objectFit: 'contain', objectPosition: 'left', maxWidth: 110, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }} />
              {count && !isOpen && (
                <span style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 9, fontWeight: 700,
                  color: '#a8651e',
                  background: '#f5e6cc',
                  border: '1px solid #e8c98a',
                  borderRadius: 10,
                  padding: '1px 7px',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}>{count}</span>
              )}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0, opacity: 0.4 }}>
                <path d="M2 3.5 L5 6.5 L8 3.5" stroke="#8c8499" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div style={{
              overflow: 'hidden',
              maxHeight: isOpen ? expandHeight : 0,
              transition: 'max-height 0.25s cubic-bezier(0.32,0.72,0,1)',
            }}>
              <div style={{ padding: '0 16px 13px' }}>
                <div style={{
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                  fontSize: 12, fontWeight: 600, color: tk.ink, marginBottom: count ? 8 : 2,
                }}>{v.value}</div>
                {count ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {v.programs.map(p => (
                      <span key={p} style={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 8.5, color: '#7c6f5a', letterSpacing: '0.04em',
                        background: '#f0ebe3', border: `1px solid ${tk.hairline}`,
                        borderRadius: 4, padding: '2px 6px',
                      }}>{p}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 9, color: tk.inkSoft, letterSpacing: '0.06em',
                  }}>{v.sub}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{
        padding: '16px 16px 14px',
        fontFamily: '"Instrument Serif", Georgia, serif',
        fontStyle: 'italic',
        fontSize: 11.5, color: tk.inkSoft, lineHeight: 1.55,
        borderTop: `1px solid ${tk.hairline}`,
      }}>
        Tell us about your company — we'll map what's relevant to where you are.
      </div>
    </div>
  );
}

export function CompanyProfile({ profile, isBuilding, hasMessages, tk }) {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (!isBuilding) return;
    const id = setInterval(() => setBlink(b => !b), 850);
    return () => clearInterval(id);
  }, [isBuilding]);

  const anyDomain = Object.values(profile.domains).some(v => v !== null);

  return (
    <div style={{
      width: 252, flexShrink: 0,
      borderLeft: `1px solid ${tk.hairline}`,
      background: tk.bg,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '13px 16px 10px',
        borderBottom: `1px solid ${tk.hairline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: tk.inkSoft,
        }}>{hasMessages ? 'Your Profile' : 'Programs'}</span>
        {isBuilding && (
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 8.5, letterSpacing: '0.1em',
            color: '#b0956e',
            opacity: blink ? 1 : 0.35,
            transition: 'opacity 0.4s ease',
          }}>● reading</span>
        )}
      </div>

      {!hasMessages ? (
        <DiscoveryView tk={tk} />
      ) : (
        <div style={{ padding: '14px 16px', flex: 1 }}>
          {/* Company info */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 15, fontStyle: 'italic', color: tk.ink, marginBottom: 5,
              minHeight: 22,
            }}>
              {profile.name || <span style={{ color: tk.inkGhost }}>Your company</span>}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {profile.stage ? (
                <span style={{
                  fontSize: 9, fontFamily: '"IBM Plex Mono", monospace',
                  padding: '2px 6px', borderRadius: 3,
                  background: '#f0ebe3', border: `1px solid ${tk.hairline}`,
                  color: '#7c6f5a', letterSpacing: '0.07em',
                }}>{profile.stage}</span>
              ) : (
                <span style={{
                  fontSize: 9, fontFamily: '"IBM Plex Mono", monospace',
                  padding: '2px 6px', borderRadius: 3,
                  background: 'transparent', border: `1px dashed ${tk.hairline}`,
                  color: tk.inkGhost, letterSpacing: '0.07em',
                }}>stage unknown</span>
              )}
              {profile.industry && (
                <span style={{
                  fontSize: 9, fontFamily: '"IBM Plex Mono", monospace',
                  padding: '2px 6px', borderRadius: 3,
                  background: '#f0ebe3', border: `1px solid ${tk.hairline}`,
                  color: '#7c6f5a', letterSpacing: '0.07em',
                }}>{profile.industry}</span>
              )}
            </div>
          </div>

          {/* vs Hive&Co */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 8.5, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: tk.inkSoft,
              }}>vs Hive&amp;Co</span>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 2, background: '#c4b8a8', borderRadius: 1, opacity: 0.8 }} />
                <span style={{ fontSize: 8.5, fontFamily: '"IBM Plex Mono", monospace', color: tk.inkGhost }}>Hive&amp;Co</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 2, background: '#b0956e', borderRadius: 1 }} />
                <span style={{ fontSize: 8.5, fontFamily: '"IBM Plex Mono", monospace', color: tk.inkGhost }}>You</span>
              </div>
            </div>

            {DOMAIN_META.map(d => (
              <DomainRow
                key={d.id}
                id={d.id}
                label={d.label}
                userScore={profile.domains[d.id]}
                tk={tk}
              />
            ))}
          </div>

          {/* Signals */}
          {profile.signals.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${tk.hairline}` }}>
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 8.5, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: tk.inkSoft, marginBottom: 8,
              }}>Signals read</div>
              {profile.signals.slice(-5).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                  <span style={{ color: '#b0956e', fontSize: 9, marginTop: 2, flexShrink: 0 }}>◆</span>
                  <span style={{
                    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    fontSize: 10.5, color: tk.inkSoft, lineHeight: 1.4,
                  }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {!anyDomain && !profile.name && !isBuilding && (
            <div style={{
              marginTop: 8,
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: 11, color: tk.inkGhost, lineHeight: 1.55,
            }}>
              Ask about your investors, compliance, team, or security — your profile builds as we talk.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
