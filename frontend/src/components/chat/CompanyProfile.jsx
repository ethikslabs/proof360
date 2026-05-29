import { useState, useEffect } from 'react';
import awsUrl from '../OperationalField/logos/aws.svg';
import vantaUrl from '../OperationalField/logos/vanta.svg';
import ciscoUrl from '../OperationalField/logos/cisco.svg';
import ingramUrl from '../OperationalField/logos/ingram.svg';
import stripeUrl from '../OperationalField/logos/stripe.svg';
import microsoftUrl from '../OperationalField/logos/microsoft.svg';
import nvidiaUrl from '../OperationalField/logos/nvidia.svg';
import perplexityUrl from '../OperationalField/logos/perplexity.svg';
import geminiUrl from '../OperationalField/logos/gemini.svg';
import anthropicUrl from '../OperationalField/logos/anthropic.svg';
import xeroUrl from '../OperationalField/logos/xero.svg';
import hubspotUrl from '../OperationalField/logos/hubspot.svg';

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
    logoUrl: awsUrl, logoH: 22, alt: 'AWS',
    value: '$220k+ in credits — most founders claim a fraction',
    chatQ: 'Which AWS programs do I qualify for right now and how do I apply?',
    programs: [
      { label: 'Activate',          ask: 'What is AWS Activate and how much credit could I get for my stage?' },
      { label: 'ISV co-sell',       ask: 'How does the AWS ISV co-sell program work and is it right for me?' },
      { label: 'Marketplace',       ask: 'What does it take to get listed on the AWS Marketplace?' },
      { label: 'Partner Network',   ask: 'What does the AWS Partner Network give me as a startup?' },
      { label: 'Gen AI track',      ask: 'Tell me about the AWS Generative AI startup track.' },
      { label: 'Startup pack',      ask: 'What is included in the AWS Startup pack?' },
      { label: 'Direct credits',    ask: 'How do I apply for direct AWS credits outside of Activate?' },
    ],
  },
  { logoUrl: vantaUrl,      logoH: 22, alt: 'Vanta',
    value: 'SOC 2 — the cert that unlocks B2B deals',
    sub: '90-day automated path to certified',
    chatQ: 'Walk me through the 90-day SOC 2 path with Vanta — what it costs and what it unblocks.' },
  { logoUrl: ciscoUrl,      logoH: 20, alt: 'Cisco',
    value: 'Security stack enterprise buyers recognise on sight',
    sub: 'Startup partner access via Ingram',
    chatQ: 'How does Cisco help startups build a security posture that enterprise procurement trusts?' },
  {
    logoUrl: ingramUrl, logoH: 18, alt: 'Ingram Micro',
    value: 'The distribution layer behind every major vendor',
    sub: '23,000+ products · AU reseller channel',
    chatQ: 'How does Ingram Micro work and what can I access through the reseller channel?',
    programs: [
      { label: 'Cisco via Ingram',      ask: 'How do I access Cisco products and partner pricing through Ingram Micro?' },
      { label: 'Microsoft licensing',   ask: 'How does Ingram handle Microsoft licensing and what does that mean for my business?' },
      { label: 'Cloud marketplace',     ask: 'What is the Ingram Micro Cloud marketplace and which SaaS products are available?' },
      { label: 'Reseller onboarding',   ask: 'How do I become an Ingram Micro reseller and what does that unlock?' },
    ],
  },
  { logoUrl: stripeUrl,     logoH: 26, alt: 'Stripe',
    value: 'Payments infrastructure investors expect to see',
    sub: 'Stripe Atlas · Capital · Revenue Recognition',
    chatQ: 'What Stripe products matter most for a scaling startup — Atlas, Capital, or Revenue Recognition?' },
  {
    logoUrl: microsoftUrl, logoH: 20, alt: 'Microsoft',
    value: 'Sell into enterprise through the Microsoft channel',
    chatQ: 'Which Microsoft programs should I be in to access enterprise customers and get credits?',
    programs: [
      { label: 'Founders Hub',     ask: 'What does Microsoft Founders Hub give me and how do I join?' },
      { label: 'Azure credits',    ask: 'How much Azure credit can I get as a startup and how do I claim it?' },
      { label: 'Partner Network',  ask: 'What does joining the Microsoft Partner Network unlock?' },
      { label: 'ISV co-sell',      ask: 'How does Microsoft ISV co-sell work — can it help me close enterprise deals?' },
      { label: 'AI Cloud Partner', ask: 'What is the Microsoft AI Cloud Partner program?' },
      { label: 'Marketplace',      ask: 'What does getting listed on the Microsoft Marketplace do for my sales?' },
    ],
  },
  { logoUrl: nvidiaUrl,     logoH: 20, alt: 'NVIDIA',
    value: 'GPU compute and AI inference at scale',
    sub: 'NIM · DGX Cloud · Inception program',
    chatQ: 'What NVIDIA programs exist for AI startups — NIM API, Inception, or DGX Cloud?' },
  { logoUrl: perplexityUrl, logoH: 22, alt: 'Perplexity',
    value: 'Live web intelligence — not cached knowledge',
    sub: 'Real-time retrieval for research and diligence',
    chatQ: 'How does Perplexity compare to standard LLMs for due diligence research and live market signals?' },
  { logoUrl: geminiUrl,     logoH: 20, alt: 'Gemini',
    value: 'Google\'s frontier model — long context, multimodal',
    sub: 'Document synthesis · 1M token context',
    chatQ: 'Where does Gemini fit in an AI stack — what does it do that other models don\'t?' },
  { logoUrl: anthropicUrl,  logoH: 22, alt: 'Anthropic',
    value: 'Claude — enterprise reasoning and trust',
    sub: 'Constitutional AI · safety-first deployment',
    chatQ: 'What makes Anthropic Claude different for enterprise deployments compared to other frontier models?' },
  { logoUrl: xeroUrl,       logoH: 22, alt: 'Xero',
    value: 'Financial truth that investor DD actually trusts',
    sub: 'Clean accounts signal fundraise-readiness',
    chatQ: 'What does a founder need to have clean in Xero before investor due diligence starts?' },
  { logoUrl: hubspotUrl,    logoH: 22, alt: 'HubSpot',
    value: 'CRM that tells the revenue story to investors',
    sub: 'Pipeline · MRR evidence · growth metrics',
    chatQ: 'What HubSpot data do investors ask for in due diligence and how do I get it ready?' },
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

const ALT_TO_SPACE = {
  'AWS': 'aws', 'Vanta': 'vanta', 'Cisco': 'cisco', 'Ingram Micro': 'ingram',
  'Stripe': 'stripe', 'Microsoft': 'microsoft', 'NVIDIA': 'nvidia',
  'Perplexity': 'perplexity', 'Gemini': 'gemini', 'Anthropic': 'anthropic',
  'Xero': 'xero', 'HubSpot': 'hubspot',
};

function DiscoveryView({ tk, onVendorSelect, isDemoMode, rankedVendors }) {
  const useNewSchema = !!rankedVendors;
  const vendors = rankedVendors || DISCOVERY_VENDORS;

  return (
    <div style={{ flex: 1 }}>
      {vendors.map((v, i) => {
        const isLast = i === vendors.length - 1;
        const vendorKey = useNewSchema ? v.id : v.alt;
        const vendorName = useNewSchema ? v.name : v.alt;
        const description = useNewSchema ? v.synthesis : v.value;

        return (
          <div
            key={vendorKey}
            style={{
              padding: '11px 16px',
              borderBottom: isLast ? 'none' : `1px solid ${tk.hairline}`,
            }}
          >
            {/* Name + CTA row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {useNewSchema ? (
                <span style={{
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                  fontSize: 11, fontWeight: 700, color: tk.inkSoft,
                }}>{vendorName}</span>
              ) : (
                <img src={v.logoUrl} alt={v.alt} style={{ height: v.logoH, objectFit: 'contain', objectPosition: 'left', maxWidth: 110, flexShrink: 0 }} />
              )}
              {isDemoMode ? (
                <span style={{
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                  fontSize: 9.5, color: '#b0956e', cursor: 'default',
                }}>See how this applies →</span>
              ) : (
                <button
                  onClick={() => onVendorSelect?.(useNewSchema ? v.name.toLowerCase() : ALT_TO_SPACE[v.alt])}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M3 2 L7 5 L3 8" stroke="#8c8499" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Description */}
            <div style={{
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: 10.5, color: tk.inkSoft, lineHeight: 1.4, marginTop: 3,
            }}>
              {description}
            </div>

            {/* Reason line — new schema only, always visible when present */}
            {useNewSchema && v.reasonLine && (
              <div style={{
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontSize: 9.5, color: '#8c8499', fontStyle: 'italic',
                lineHeight: 1.4, marginTop: 3,
              }}>
                {v.reasonLine}
              </div>
            )}

            {/* Programs count badge — old schema only */}
            {!useNewSchema && v.programs?.length > 0 && (
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, fontWeight: 700, color: '#a8651e', background: '#f5e6cc', border: '1px solid #e8c98a', borderRadius: 10, padding: '1px 7px', letterSpacing: '0.04em' }}>
                {v.programs.length}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CompanyProfile({ profile, isBuilding, hasMessages, tk, onAsk, focusedProgram, onVendorSelect, isDemoMode, activeSignals, rankedVendors, ctaEarned }) {
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

      {hasMessages && (
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${tk.hairline}` }}>
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
          {(activeSignals?.length > 0 || profile.signals.length > 0) && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${tk.hairline}` }}>
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 8.5, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: tk.inkSoft, marginBottom: 8,
              }}>Signals read</div>
              {activeSignals?.length > 0
                ? activeSignals.slice(-5).map(sig => {
                    const isGap = sig.polarity === 'gap';
                    return (
                      <div key={sig.id} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                        <span style={{ color: isGap ? '#15803d' : '#92400e', fontSize: 9, marginTop: 2, flexShrink: 0 }}>◆</span>
                        <span style={{
                          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                          fontSize: 10.5, color: tk.inkSoft, lineHeight: 1.4,
                        }}>{sig.value}</span>
                      </div>
                    );
                  })
                : profile.signals.slice(-5).map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                      <span style={{ color: '#b0956e', fontSize: 9, marginTop: 2, flexShrink: 0 }}>◆</span>
                      <span style={{
                        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                        fontSize: 10.5, color: tk.inkSoft, lineHeight: 1.4,
                      }}>{s}</span>
                    </div>
                  ))
              }
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
      <DiscoveryView tk={tk} onVendorSelect={onVendorSelect} isDemoMode={isDemoMode} rankedVendors={rankedVendors} />
    </div>
  );
}
