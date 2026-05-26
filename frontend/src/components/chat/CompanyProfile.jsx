import { useState, useEffect } from 'react';
import awsUrl from '../OperationalField/logos/aws.svg';
import microsoftUrl from '../OperationalField/logos/microsoft.svg';
import cloudflareUrl from '../OperationalField/logos/cloudflare.svg';
import vantaUrl from '../OperationalField/logos/vanta.svg';
import ciscoUrl from '../OperationalField/logos/cisco.svg';
import austbrokersUrl from '../OperationalField/logos/austbrokers-cyberpro.svg';
import wholesaleInvestorUrl from '../OperationalField/logos/wholesale-investor.svg';
import eoSydneyUrl from '../OperationalField/logos/eo-sydney.svg';
import austradeUrl from '../OperationalField/logos/austrade.svg';
import rimonUrl from '../OperationalField/logos/rimon.svg';
import prescientSecurityUrl from '../OperationalField/logos/prescient-security.svg';
import arcticWolfUrl from '../OperationalField/logos/arctic-wolf.svg';

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
    chatQ: 'Help me figure out which AWS programs I qualify for and how to apply.',
    programs: [
      { label: 'Activate (credits)',  ask: 'What is AWS Activate and how much credit could I get for my stage?' },
      { label: 'ISV co-sell',         ask: 'How does the AWS ISV co-sell program work and is it right for me?' },
      { label: 'Marketplace listing', ask: 'What does it take to get listed on the AWS Marketplace?' },
      { label: 'Partner Network',     ask: 'What does the AWS Partner Network give me as a startup?' },
      { label: 'Gen AI track',        ask: 'Tell me about the AWS Generative AI startup track.' },
      { label: 'EdStart',             ask: 'What is AWS EdStart and do I qualify?' },
      { label: 'Energy',              ask: 'What does the AWS Energy program offer?' },
      { label: 'Impact Computing',    ask: 'What is the AWS Impact Computing program?' },
      { label: 'Startup pack',        ask: 'What is included in the AWS Startup pack?' },
      { label: 'Direct credits',      ask: 'How do I apply for direct AWS credits?' },
    ],
  },
  {
    logoUrl: microsoftUrl, logoH: 14, alt: 'Microsoft',
    value: 'Sell into enterprise through Microsoft',
    chatQ: 'Which Microsoft programs should I be in to access enterprise customers and get credits?',
    programs: [
      { label: 'Founders Hub',    ask: 'What does Microsoft Founders Hub give me and how do I join?' },
      { label: 'Azure credits',   ask: 'How much Azure credit can I get as a startup and how do I claim it?' },
      { label: 'Partner Network', ask: 'What does joining the Microsoft Partner Network unlock?' },
      { label: 'ISV co-sell',     ask: 'How does Microsoft ISV co-sell work — can it help me close enterprise deals?' },
      { label: 'AI Cloud Partner', ask: 'What is the Microsoft AI Cloud Partner program?' },
      { label: 'Marketplace',     ask: 'What does getting listed on the Microsoft Marketplace do for my sales?' },
    ],
  },
  { logoUrl: cloudflareUrl, logoH: 16, alt: 'Cloudflare', value: 'Enterprise security posture, zero cost',    sub: 'What DD teams check — free for startups',    chatQ: 'How do I get Cloudflare free as a startup and what does it do for my security posture?' },
  { logoUrl: vantaUrl,      logoH: 16, alt: 'Vanta',      value: 'SOC 2 — the cert that unlocks B2B deals',   sub: '90-day automated path to certified',          chatQ: 'Walk me through the 90-day SOC 2 path with Vanta and what it costs.' },
  { logoUrl: ciscoUrl,      logoH: 14, alt: 'Cisco',       value: 'Security stack enterprise buyers trust',    sub: 'Startup partner access',                     chatQ: 'How does Cisco help startups build a security stack that enterprise buyers trust?' },
  { logoUrl: austbrokersUrl,       logoH: 16, alt: 'AustBrokers',       value: 'Cyber cover enterprise procurement requires', sub: 'AU specialist — fast-track quote',   chatQ: 'What cyber insurance do I need before enterprise procurement will sign off, and how fast can I get it?' },
  { logoUrl: wholesaleInvestorUrl, logoH: 14, alt: 'Wholesale Investor', value: '10,000+ AU accredited investors',              sub: 'When your posture is ready to raise', chatQ: 'How do I connect with AU accredited investors through Wholesale Investor, and what do I need to have in place first?' },
  { logoUrl: eoSydneyUrl,          logoH: 16, alt: 'EO Sydney',          value: 'Peer network that opens doors — globally',      sub: 'Entrepreneurs\' Organisation Sydney',  chatQ: 'What does EO Sydney offer founders and how do I get involved?' },
  { logoUrl: austradeUrl,          logoH: 16, alt: 'Austrade',           value: 'Government grants to take your product global',  sub: 'AU Trade & Investment Commission',    chatQ: 'What Austrade programs are available for AU tech founders looking to export?' },
  { logoUrl: rimonUrl,             logoH: 22, alt: 'Rimon',              value: 'Startup legal without the big-firm overhead',    sub: 'Corporate, IP & investment law',      chatQ: 'How can Rimon Advisory help me with startup legal — term sheets, IP, cap table?' },
  { logoUrl: prescientSecurityUrl, logoH: 22, alt: 'Prescient Security', value: 'Independent audit that unlocks enterprise trust',  sub: 'SOC 2, ISO 27001, pen testing',       chatQ: 'When do I need an independent security audit and what does Prescient Security do?' },
  { logoUrl: arcticWolfUrl,        logoH: 22, alt: 'Arctic Wolf',        value: '24/7 security monitoring — without a SOC team',  sub: 'Managed detection & response',        chatQ: 'What does Arctic Wolf provide and when does a scaling startup need managed security?' },
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

const BOOKING_WHY = {
  AWS: {
    headline: 'You\'re sitting on unclaimed AWS credits.',
    body: 'Most founders apply for one program and miss the other nine. We check your stage against every AWS track, handle the applications, and make sure what you\'re owed actually lands.',
  },
  Microsoft: {
    headline: 'The Microsoft partner track is the enterprise sales shortcut most founders miss.',
    body: 'Co-sell puts you in front of Microsoft\'s enterprise customers — deals you can\'t reach cold. We map which programs fit your product and get you into the motion.',
  },
  Cloudflare: {
    headline: 'Enterprise security posture, set up correctly from the start.',
    body: 'Cloudflare is free for startups, but the configuration is what shows up in due diligence. We get you set up so it actually signals credibility when investors and buyers look.',
  },
  Vanta: {
    headline: 'SOC 2 is blocking deals you don\'t know you\'re losing.',
    body: 'Enterprise buyers check before the first meeting. We scope your 90-day Vanta path, handle the setup, and get you to your first audit — without the consultant fees.',
  },
  Cisco: {
    headline: 'Enterprise buyers see your infrastructure before they see your deck.',
    body: 'Cisco-aligned security signals you play at enterprise level. We identify the right partner program for your stage and get you positioned correctly.',
  },
  AustBrokers: {
    headline: 'Cyber insurance is now a procurement checkbox, not an afterthought.',
    body: 'Enterprise contracts and investor DD both check for it. We connect you to the AU specialist who can get you quoted and covered fast — before it costs you a deal.',
  },
  'Wholesale Investor': {
    headline: 'You don\'t pitch AU investors cold — you get introduced.',
    body: 'Wholesale Investor connects you to 10,000+ accredited investors, but your trust posture needs to be ready first. We help you get there, then make the introduction.',
  },
  'EO Sydney': {
    headline: 'The room where AU founders actually talk to each other.',
    body: 'EO Sydney is peer learning at the founder level — no pitching, no posturing. If you\'re scaling and want access to the network, we can make the introduction.',
  },
  'Austrade': {
    headline: 'The Australian government will fund your expansion — most founders never ask.',
    body: 'Austrade has grant programs, trade missions, and market entry support for AU tech companies going global. We identify what you qualify for and help you navigate the application.',
  },
  'Rimon': {
    headline: 'Startup legal done by people who\'ve actually sat at the cap table.',
    body: 'Rimon Advisory handles the legal work that matters at your stage — term sheets, IP protection, employment agreements, shareholder structure. No partner padding, no unnecessary hours.',
  },
  'Prescient Security': {
    headline: 'An independent audit is the evidence layer investors and buyers actually trust.',
    body: 'Self-reported compliance isn\'t enough anymore. Prescient Security provides the third-party audit — SOC 2, ISO 27001, penetration testing — that converts your claims into verified evidence.',
  },
  'Arctic Wolf': {
    headline: 'Enterprise buyers check whether you have security monitoring before they sign.',
    body: 'Arctic Wolf gives you a 24/7 security operations centre without the headcount. It\'s the signal that tells enterprise procurement you take security seriously — and it shows up in due diligence.',
  },
};

const BOOKING_WHY_GENERIC = {
  headline: 'Most founders leave serious value on the table.',
  body: 'Cloud credits, compliance shortcuts, co-sell programs, investor connections — we map what you actually qualify for, handle the applications, and track what you\'re owed. This call is a working session, not a sales pitch.',
};

function BookingModal({ onClose, context }) {
  const why = context ? (BOOKING_WHY[context] ?? BOOKING_WHY_GENERIC) : BOOKING_WHY_GENERIC;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(24,20,32,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fbf8f1',
          borderRadius: 14,
          width: 'min(700px, 95vw)',
          height: 'min(760px, 92vh)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px', borderBottom: '1px solid #e0d8c9', flexShrink: 0,
        }}>
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#8c8499',
          }}>Book time with John</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: '#8c8499', lineHeight: 1, padding: 0,
          }}>×</button>
        </div>

        {/* Why */}
        <div style={{
          padding: '18px 22px 16px',
          borderBottom: '1px solid #e0d8c9',
          flexShrink: 0, background: '#f4efe6',
        }}>
          <div style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 15.5, color: '#241f31', lineHeight: 1.45, marginBottom: 7,
          }}>{why.headline}</div>
          <div style={{
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            fontSize: 12, color: '#6b5f4e', lineHeight: 1.6,
          }}>{why.body}</div>
        </div>

        {/* Calendar */}
        <iframe
          src="https://meetings.hubspot.com/john3174?embed=true"
          title="Book a meeting with John"
          style={{ flex: 1, border: 'none', width: '100%' }}
        />
      </div>
    </div>
  );
}

function DiscoveryView({ tk, onAsk }) {
  const [openId, setOpenId] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <div style={{ flex: 1 }}>
      {DISCOVERY_VENDORS.map((v, i) => {
        const isOpen = openId === v.alt;
        const isLast = i === DISCOVERY_VENDORS.length - 1;
        const count = v.programs?.length;
        const expandHeight = count ? 16 + count * 28 + 48 : 90;

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
                  color: '#a8651e', background: '#f5e6cc',
                  border: '1px solid #e8c98a', borderRadius: 10,
                  padding: '1px 7px', letterSpacing: '0.04em', flexShrink: 0,
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
              transition: 'max-height 0.28s cubic-bezier(0.32,0.72,0,1)',
            }}>
              <div style={{ padding: '0 16px 13px' }}>
                <div style={{
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                  fontSize: 12, fontWeight: 600, color: tk.ink, marginBottom: count ? 8 : 4,
                }}>{v.value}</div>
                {count ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {v.programs.map(p => (
                      <button
                        key={p.label}
                        onClick={e => { e.stopPropagation(); onAsk?.(p.ask); }}
                        style={{
                          fontFamily: '"IBM Plex Mono", monospace',
                          fontSize: 8.5, color: '#5a4e3a', letterSpacing: '0.04em',
                          background: '#ede5d8', border: `1px solid #cfc4b0`,
                          borderRadius: 4, padding: '3px 7px',
                          cursor: 'pointer',
                        }}
                      >{p.label}</button>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 9, color: tk.inkSoft, letterSpacing: '0.06em', marginBottom: 10,
                  }}>{v.sub}</div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onAsk?.(v.chatQ); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    fontSize: 11, fontWeight: 600,
                    color: '#fff', background: '#241f31',
                    borderRadius: 6, padding: '6px 12px',
                    border: 'none', cursor: 'pointer',
                    letterSpacing: '0.01em',
                  }}
                >Ask about this →</button>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{
        padding: '16px 16px 16px',
        borderTop: `1px solid ${tk.hairline}`,
      }}>
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 11.5, color: tk.inkSoft, lineHeight: 1.55, marginBottom: 12,
        }}>
          Tell us about your company — we'll map what's relevant to where you are.
        </div>
        <button
          onClick={() => setBookingOpen(true)}
          style={{
            width: '100%',
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            fontSize: 11.5, fontWeight: 600,
            color: '#fff', background: '#241f31',
            border: 'none', borderRadius: 8,
            padding: '9px 14px',
            cursor: 'pointer', letterSpacing: '0.01em',
          }}
        >Book time with John →</button>
      </div>

      {bookingOpen && <BookingModal onClose={() => setBookingOpen(false)} context={openId} />}
    </div>
  );
}

export function CompanyProfile({ profile, isBuilding, hasMessages, tk, onAsk }) {
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
        <DiscoveryView tk={tk} onAsk={onAsk} />
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
