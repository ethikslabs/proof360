import { useState, useEffect, useRef } from 'react';
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
import cognitiveViewUrl from '../OperationalField/logos/cognitive-view.svg';
import auAiExpertGroupUrl from '../OperationalField/logos/au-ai-expert-group.svg';
import stripeUrl from '../OperationalField/logos/stripe.svg';
import metronomeUrl from '../OperationalField/logos/metronome.svg';
import unitypacUrl from '../OperationalField/logos/unitypac.svg';
import enterpriseSgUrl from '../OperationalField/logos/enterprise-sg.svg';

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
  { logoUrl: cloudflareUrl, logoH: 22, alt: 'Cloudflare', value: 'Enterprise security posture, zero cost',    sub: 'What DD teams check — free for startups',    chatQ: 'How do I get Cloudflare free as a startup and what does it do for my security posture?' },
  { logoUrl: vantaUrl,      logoH: 22, alt: 'Vanta',      value: 'SOC 2 — the cert that unlocks B2B deals',   sub: '90-day automated path to certified',          chatQ: 'Walk me through the 90-day SOC 2 path with Vanta and what it costs.' },
  { logoUrl: ciscoUrl,      logoH: 20, alt: 'Cisco',       value: 'Security stack enterprise buyers trust',    sub: 'Startup partner access',                     chatQ: 'How does Cisco help startups build a security stack that enterprise buyers trust?' },
  { logoUrl: austbrokersUrl,       logoH: 22, alt: 'AustBrokers',       value: 'Cyber cover enterprise procurement requires', sub: 'AU specialist — fast-track quote',   chatQ: 'What cyber insurance do I need before enterprise procurement will sign off, and how fast can I get it?' },
  { logoUrl: wholesaleInvestorUrl, logoH: 20, alt: 'Wholesale Investor', value: '10,000+ AU accredited investors',              sub: 'When your posture is ready to raise', chatQ: 'How do I connect with AU accredited investors through Wholesale Investor, and what do I need to have in place first?' },
  { logoUrl: eoSydneyUrl,          logoH: 22, alt: 'EO Sydney',          value: 'Peer network that opens doors — globally',      sub: 'Entrepreneurs\' Organisation Sydney',  chatQ: 'What does EO Sydney offer founders and how do I get involved?' },
  { logoUrl: austradeUrl,          logoH: 22, alt: 'Austrade',           value: 'Government grants to take your product global',  sub: 'AU Trade & Investment Commission',    chatQ: 'What Austrade programs are available for AU tech founders looking to export?' },
  { logoUrl: rimonUrl,             logoH: 26, alt: 'Rimon',              value: 'Startup legal without the big-firm overhead',    sub: 'Corporate, IP & investment law',      chatQ: 'How can Rimon Advisory help me with startup legal — term sheets, IP, cap table?' },
  { logoUrl: prescientSecurityUrl, logoH: 26, alt: 'Prescient Security', value: 'Independent audit that unlocks enterprise trust',  sub: 'SOC 2, ISO 27001, pen testing',       chatQ: 'When do I need an independent security audit and what does Prescient Security do?' },
  { logoUrl: arcticWolfUrl,        logoH: 28, alt: 'Arctic Wolf',        value: '24/7 security monitoring — without a SOC team',  sub: 'Managed detection & response',           chatQ: 'What does Arctic Wolf provide and when does a scaling startup need managed security?' },
  { logoUrl: cognitiveViewUrl,     logoH: 24, alt: 'Cognitive View',     value: 'AI governance that satisfies investor DD',        sub: 'AI risk, compliance & monitoring',       chatQ: 'What does Cognitive View do and when do I need AI governance tooling?' },
  { logoUrl: auAiExpertGroupUrl,   logoH: 26, alt: 'AU AI Expert Group', value: 'Stay ahead of AU AI regulation',                  sub: 'Dept. of Industry advisory body',        chatQ: 'What is Australia\'s AI Expert Group and how does its guidance affect my product or fundraising?' },
  { logoUrl: stripeUrl,            logoH: 26, alt: 'Stripe',             value: 'The payments layer investors expect to see',      sub: 'Stripe Atlas, Capital & Revenue Rec',    chatQ: 'What Stripe products matter most for a scaling startup — Atlas, Capital, or Revenue Recognition?' },
  { logoUrl: metronomeUrl,         logoH: 24, alt: 'Metronome',          value: 'Usage-based billing without the eng headcount',  sub: 'Acquired by Stripe',                     chatQ: 'What is Metronome and when does a startup need usage-based billing infrastructure?' },
  { logoUrl: unitypacUrl,          logoH: 26, alt: 'UnityPac',           value: 'Singapore entity, audit and tax — done right',   sub: 'SG launch · audit · corporate services',    chatQ: 'What do I need to set up a legal entity in Singapore and how does Unity Assurance PAC help?' },
  { logoUrl: enterpriseSgUrl,      logoH: 26, alt: 'Enterprise SG',      value: 'SG government grants to scale internationally',  sub: 'Market access · grants · global expansion', chatQ: 'What Enterprise Singapore programs are available for a company looking to use Singapore as a launchpad?' },
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

function DiscoveryView({ tk, onAsk, focusedProgram }) {
  const [openId, setOpenId] = useState(null);
  const itemRefs = useRef({});

  useEffect(() => {
    if (!focusedProgram) return;
    setOpenId(focusedProgram);
    const el = itemRefs.current[focusedProgram];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusedProgram]);

  return (
    <div style={{ flex: 1 }}>
      {DISCOVERY_VENDORS.map((v, i) => {
        const isOpen = openId === v.alt;
        const isLast = i === DISCOVERY_VENDORS.length - 1;
        const count = v.programs?.length;
        const expandHeight = count ? 16 + count * 28 + 48 : 90;

        return (
          <div
            key={v.alt}
            ref={el => { itemRefs.current[v.alt] = el; }}
            style={{ borderBottom: isLast ? 'none' : `1px solid ${tk.hairline}` }}
          >
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
        padding: '16px 16px 20px',
        borderTop: `1px solid ${tk.hairline}`,
      }}>
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 11.5, color: tk.inkSoft, lineHeight: 1.55,
        }}>
          Tell us about your company — we'll map what's relevant to where you are.
        </div>
      </div>
    </div>
  );
}

export function CompanyProfile({ profile, isBuilding, hasMessages, tk, onAsk, focusedProgram }) {
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
        <DiscoveryView tk={tk} onAsk={onAsk} focusedProgram={focusedProgram} />
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
