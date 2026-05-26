import { useState } from 'react';

import vantaSvg            from '../OperationalField/logos/vanta.svg';
import perplexitySvg       from '../OperationalField/logos/perplexity.svg';
import ciscoSvg            from '../OperationalField/logos/cisco.svg';
import microsoftSvg        from '../OperationalField/logos/microsoft.svg';
import nvidiaSvg           from '../OperationalField/logos/nvidia.svg';
import anthropicSvg        from '../OperationalField/logos/anthropic.svg';
import awsSvg              from '../OperationalField/logos/aws.svg';
import geminiSvg           from '../OperationalField/logos/gemini.svg';
import cloudflareSvg       from '../OperationalField/logos/cloudflare.svg';
import paloAltoSvg         from '../OperationalField/logos/palo-alto.svg';
import openaiSvg           from '../OperationalField/logos/openai.svg';
import apolloSecureSvg     from '../OperationalField/logos/apollo-secure.svg';
import wholesaleInvestorSvg from '../OperationalField/logos/wholesale-investor.svg';
import cognitiveViewSvg      from '../OperationalField/logos/cognitive-view.svg';
import eoSydneySvg           from '../OperationalField/logos/eo-sydney.svg';
import austbrokersCyberProSvg from '../OperationalField/logos/austbrokers-cyberpro.svg';
import capitalHqSvg           from '../OperationalField/logos/capital-hq.svg';
import prescientSolutionsSvg  from '../OperationalField/logos/prescient-solutions.svg';

const LOGOS = {
  vanta: vantaSvg, perplexity: perplexitySvg, cisco: ciscoSvg,
  microsoft: microsoftSvg, nvidia: nvidiaSvg, anthropic: anthropicSvg,
  aws: awsSvg, gemini: geminiSvg, cloudflare: cloudflareSvg,
  paloalto: paloAltoSvg, openai: openaiSvg,
  apollosecure: apolloSecureSvg,
  wholesaleinvestor: wholesaleInvestorSvg,
  cognitiveview: cognitiveViewSvg,
  eosydney: eoSydneySvg,
  austbrokerscyberpro: austbrokersCyberProSvg,
  capitalhq: capitalHqSvg,
  prescient: prescientSolutionsSvg,
};

const PROFILES = [
  {
    id: 'technical', label: 'Technical',
    icon: 'aws',
    vendors: ['aws', 'vanta', 'cisco', 'cloudflare'],
    items: ['Security architecture review', 'Integration & API risk', 'Infrastructure posture'],
  },
  {
    id: 'compliance', label: 'Compliance',
    icon: 'vanta',
    vendors: ['vanta', 'apollosecure', 'prescient', 'austbrokerscyberpro', 'cognitiveview'],
    items: ['SOC 2, ISO 27001 & APRA readiness', 'Cyber insurance gaps (ACP)', 'Regulatory & audit exposure'],
  },
  {
    id: 'market', label: 'Market',
    icon: 'perplexity',
    vendors: ['perplexity', 'gemini'],
    items: ['Competitive trust positioning', 'Customer-facing trust signals', 'Market entry risk gaps'],
  },
  {
    id: 'investor', label: 'Investors',
    icon: 'vanta',
    vendors: ['vanta', 'wholesaleinvestor', 'capitalhq', 'aws'],
    items: ['Due diligence readiness', 'Trust narrative for capital', 'Term sheet evidence gaps'],
  },
  {
    id: 'deep', label: 'Deep',
    icon: 'openai',
    vendors: ['openai', 'anthropic', 'nvidia'],
    items: ['Full multi-model analysis', 'Field intelligence + public signals', 'Complete evidence trail'],
  },
  {
    id: 'fast', label: 'Fast',
    icon: 'nvidia',
    vendors: ['nvidia', 'anthropic'],
    items: ['Hardware-accelerated inference', 'Top 3 critical gaps', 'Quick trust score'],
  },
];

function VendorLogo({ id, height = 16 }) {
  const src = LOGOS[id];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={id}
      style={{ height, maxWidth: height * 4, objectFit: 'contain', opacity: 0.75 }}
    />
  );
}

export function ProfileSelector({ value = 'investor', onChange }) {
  const [expanded, setExpanded] = useState(null);

  function handlePillClick(id) {
    setExpanded(prev => prev === id ? null : id);
    onChange?.(id);
  }

  function handleItemClick(profileId, item) {
    onChange?.(profileId, item);
    setExpanded(null);
  }

  const expandedProfile = PROFILES.find(p => p.id === expanded);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PROFILES.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePillClick(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px 5px 9px', borderRadius: 20,
              fontSize: 12, fontWeight: 500, letterSpacing: '0.005em',
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              border: '1px solid',
              borderColor: value === p.id ? '#d1d5db' : '#e5e7eb',
              background:  value === p.id ? '#f9fafb' : '#ffffff',
              color: '#374151',
              cursor: 'pointer', transition: 'all 0.12s',
              boxShadow: value === p.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.background = '#f9fafb';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = value === p.id ? '#d1d5db' : '#e5e7eb';
              e.currentTarget.style.background = value === p.id ? '#f9fafb' : '#ffffff';
            }}
          >
            <VendorLogo id={p.icon} height={14} />
            {p.label}
          </button>
        ))}
      </div>

      {expandedProfile && (
        <div style={{
          marginTop: 8,
          background: '#fafafa',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          overflow: 'hidden',
          animation: 'fadeSlideUp 0.18s ease both',
        }}>
          <div style={{
            padding: '10px 14px 8px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {expandedProfile.vendors.map(vid => (
                <VendorLogo key={vid} id={vid} height={18} />
              ))}
              {expandedProfile.vendorTags?.map(tag => (
                <span key={tag} style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#6b7280',
                  border: '1px solid #e5e7eb', borderRadius: 4,
                  padding: '2px 6px',
                }}>{tag}</span>
              ))}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: '#9ca3af', marginLeft: 2,
            }}>
              {expandedProfile.label} lens
            </span>
          </div>

          {expandedProfile.items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleItemClick(expandedProfile.id, item)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px',
                background: 'transparent', border: 'none',
                borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                fontSize: 13, color: '#374151',
                cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
