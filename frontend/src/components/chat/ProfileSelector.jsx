import { useState } from 'react';

import vantaSvg      from '../OperationalField/logos/vanta.svg';
import perplexitySvg from '../OperationalField/logos/perplexity.svg';
import ciscoSvg      from '../OperationalField/logos/cisco.svg';
import microsoftSvg  from '../OperationalField/logos/microsoft.svg';
import nvidiaSvg     from '../OperationalField/logos/nvidia.svg';
import anthropicSvg  from '../OperationalField/logos/anthropic.svg';
import awsSvg        from '../OperationalField/logos/aws.svg';
import geminiSvg     from '../OperationalField/logos/gemini.svg';
import cloudflareSvg from '../OperationalField/logos/cloudflare.svg';
import paloAltoSvg   from '../OperationalField/logos/palo-alto.svg';
import openaiSvg     from '../OperationalField/logos/openai.svg';

const LOGOS = {
  vanta: vantaSvg, perplexity: perplexitySvg, cisco: ciscoSvg,
  microsoft: microsoftSvg, nvidia: nvidiaSvg, anthropic: anthropicSvg,
  aws: awsSvg, gemini: geminiSvg, cloudflare: cloudflareSvg,
  paloalto: paloAltoSvg, openai: openaiSvg,
};

const PROFILES = [
  {
    id: 'investor', label: 'Investor',
    icon: 'vanta',
    vendors: ['vanta', 'aws'],
    items: ['Due diligence readiness', 'Investor trust narrative', 'Term sheet evidence gaps'],
  },
  {
    id: 'market', label: 'Market',
    icon: 'perplexity',
    vendors: ['perplexity', 'gemini'],
    items: ['Competitive trust positioning', 'Customer-facing trust signals', 'Market entry risk gaps'],
  },
  {
    id: 'technical', label: 'Technical',
    icon: 'cisco',
    vendors: ['cisco', 'cloudflare', 'paloalto'],
    items: ['Security architecture review', 'Integration & API risk', 'Infrastructure posture'],
  },
  {
    id: 'compliance', label: 'Compliance',
    icon: 'microsoft',
    vendors: ['vanta', 'microsoft'],
    items: ['Framework mapping (SOC 2, ISO 27001)', 'Audit readiness gaps', 'Regulatory exposure'],
  },
  {
    id: 'deep', label: 'Deep',
    icon: 'nvidia',
    vendors: ['anthropic', 'openai', 'nvidia'],
    items: ['Full multi-model analysis', 'All sources reviewed', 'Complete evidence trail'],
  },
  {
    id: 'fast', label: 'Fast',
    icon: 'anthropic',
    vendors: ['anthropic'],
    items: ['60-second read', 'Top 3 critical gaps', 'Quick trust score'],
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
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PROFILES.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePillClick(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px 4px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: '1.5px solid',
              borderColor: value === p.id ? '#4f46e5' : '#e5e7eb',
              background:  value === p.id ? '#ede9fe' : '#ffffff',
              color:       value === p.id ? '#4f46e5' : '#6b7280',
              cursor: 'pointer', transition: 'all 0.15s',
              outline: expanded === p.id ? '2px solid #c4b5fd' : 'none',
              outlineOffset: 2,
            }}
          >
            <VendorLogo id={p.icon} height={12} />
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
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {expandedProfile.vendors.map(vid => (
                <VendorLogo key={vid} id={vid} height={18} />
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
