// frontend/src/components/chat/ModeTiles.jsx
import { useState } from 'react';
import { tokens } from '../../tokens.js';
import awsUrl from '../OperationalField/logos/aws.svg';
import microsoftUrl from '../OperationalField/logos/microsoft.svg';
import cloudflareUrl from '../OperationalField/logos/cloudflare.svg';
import vantaUrl from '../OperationalField/logos/vanta.svg';
import ingramUrl from '../OperationalField/logos/ingram.svg';

const VENDOR_CARDS = [
  {
    id: 'aws',
    logoUrl: awsUrl,
    logoHeight: 22,
    logoAlt: 'AWS',
    headline: '$220k+ unclaimed',
    sub: '10 programs · most founders miss 8',
    chips: ['AWS Activate $100k', 'ISV Accelerate', 'Global Startup $25k'],
    accentHex: '#e07b00',
    cta: 'Show me what I\'m missing →',
    question: 'What AWS programs am I eligible for? Show me the full list — Activate, ISV Accelerate, Global Startup, and anything else I might be leaving on the table.',
  },
  {
    id: 'microsoft',
    logoUrl: microsoftUrl,
    logoHeight: 18,
    logoAlt: 'Microsoft',
    headline: '$150k in credits',
    sub: '6 programs · Founders Hub unclaimed',
    chips: ['Founders Hub $150k', 'GitHub Copilot free', 'Ingram AMP'],
    accentHex: '#0078d4',
    cta: 'Unlock my Microsoft programs →',
    question: 'What Microsoft programs am I eligible for? I want to see Founders Hub, GitHub Copilot, Ingram AMP, and anything else — especially credits I haven\'t claimed yet.',
  },
  {
    id: 'vanta',
    logoUrl: vantaUrl,
    logoHeight: 20,
    logoAlt: 'Vanta',
    headline: 'SOC 2 in 90 days',
    sub: 'Compliance fast track · Ingram discounted',
    chips: ['SOC 2 Type I', 'ISO 27001', 'Pen test ready'],
    accentHex: '#7c3aed',
    cta: 'Start the compliance clock →',
    question: 'What\'s the fastest path to SOC 2 for a seed-stage startup? I want to understand the Vanta route, what Ingram pricing looks like, and what I need to have ready before I start.',
  },
  {
    id: 'cloudflare',
    logoUrl: cloudflareUrl,
    logoHeight: 20,
    logoAlt: 'Cloudflare',
    headline: 'Edge + Zero Trust free',
    sub: 'Startup program · DDoS + Workers included',
    chips: ['Startup program', 'Zero Trust', 'DDoS protection'],
    accentHex: '#e06b00',
    cta: 'Get Cloudflare for free →',
    question: 'What does the Cloudflare startup program include? I want to understand Zero Trust, DDoS protection, and Workers — and what I need to qualify.',
  },
];

const MODES = [
  {
    id: 'investor', label: 'Investor readiness', icon: '📈',
    questions: [
      'What do investors check before wiring money?',
      'What breaks due diligence for a Series A?',
      'Which compliance gaps would a VC flag first?',
      'What evidence of traction matters most right now?',
      'How do I close the investor readiness gap in 90 days?',
    ],
  },
  {
    id: 'diligence', label: 'Due diligence', icon: '🔍',
    questions: [
      'What goes in a Series A data room?',
      'What legal issues do DD teams flag most often?',
      'Am I ready for SOC 2 Type I?',
      'What does a technical due diligence checklist look like?',
      'How do I prepare for an investor security review?',
    ],
  },
  {
    id: 'dealroom', label: 'Deal room', icon: '🏦',
    questions: [
      'How healthy is a typical Series A cap table?',
      'SAFE vs priced round — what do investors prefer right now?',
      'What valuation signals matter at seed stage?',
      'What term sheet clauses should I push back on?',
      'How do I build an investor pipeline from scratch?',
    ],
  },
  {
    id: 'documents', label: 'Documents', icon: '📄',
    questions: [
      'Review my pitch deck structure',
      "What's missing from a standard NDA for a SaaS startup?",
      'How do I structure a data room for DD?',
      'Summarise the key risks in this term sheet',
      'What does a board-ready policy document look like?',
    ],
  },
];

function VendorCard({ card, tk, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onSelect(card.question)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 calc(50% - 6px)',
        minWidth: 220,
        background: hovered ? `${card.accentHex}06` : '#ffffff',
        border: `1px solid ${hovered ? card.accentHex + '40' : '#e8e2d8'}`,
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: hovered ? `0 4px 20px ${card.accentHex}14` : '0 1px 4px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Logo row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img
          src={card.logoUrl}
          alt={card.logoAlt}
          style={{ height: card.logoHeight, objectFit: 'contain', objectPosition: 'left', maxWidth: 120 }}
        />
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontFamily: '"IBM Plex Mono", monospace',
          color: card.accentHex,
          background: `${card.accentHex}14`,
          border: `1px solid ${card.accentHex}28`,
          borderRadius: 4,
          padding: '2px 6px',
        }}>programs</span>
      </div>

      {/* Value headline */}
      <div>
        <div style={{
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          fontSize: 18, fontWeight: 700,
          color: card.accentHex,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}>{card.headline}</div>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9.5, color: '#8c8499',
          letterSpacing: '0.06em',
          marginTop: 3,
        }}>{card.sub}</div>
      </div>

      {/* Program chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {card.chips.map(chip => (
          <span key={chip} style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 9, color: '#6b6278',
            background: '#f4efe6',
            border: '1px solid #e0d8c9',
            borderRadius: 4,
            padding: '2px 7px',
          }}>{chip}</span>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        fontSize: 12, fontWeight: 600,
        color: hovered ? card.accentHex : '#8c8499',
        transition: 'color 0.18s',
        letterSpacing: '0.01em',
      }}>{card.cta}</div>
    </div>
  );
}

export function ModeTiles({ onSelect, t }) {
  const tk = tokens(t?.theme ?? 'pearl');
  const [activeId, setActiveId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredQ, setHoveredQ] = useState(null);

  const activeMode = MODES.find(m => m.id === activeId);

  function handleTileClick(id) {
    setActiveId(prev => prev === id ? null : id);
  }

  function handleQuestionClick(question) {
    setActiveId(null);
    onSelect?.(question);
  }

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>

      {/* Vendor program cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        {VENDOR_CARDS.map(card => (
          <VendorCard key={card.id} card={card} tk={tk} onSelect={q => onSelect?.(q)} />
        ))}
      </div>

      {/* Divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
      }}>
        <div style={{ flex: 1, height: 1, background: tk.hairline }} />
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#b8b1c0',
        }}>or ask about</span>
        <div style={{ flex: 1, height: 1, background: tk.hairline }} />
      </div>

      {/* Mode chips */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center', marginBottom: activeMode ? 10 : 0 }}>
        {MODES.map(m => {
          const isActive = activeId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleTileClick(m.id)}
              onMouseEnter={() => setHoveredId(m.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px',
                border: `1px solid ${isActive ? tk.ink : (hoveredId === m.id ? '#9ca3af' : tk.hairline)}`,
                borderRadius: 20,
                background: isActive ? tk.ink : 'transparent',
                color: isActive ? '#f8f5f0' : (hoveredId === m.id ? tk.ink : tk.inkSoft),
                fontSize: 12.5, fontWeight: 500,
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 11 }}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Question panel */}
      {activeMode && (
        <div style={{
          background: '#ffffff',
          border: `1px solid ${tk.hairline}`,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          marginTop: 6,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            borderBottom: `1px solid ${tk.hairline}`,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: tk.inkSoft,
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            <span>{activeMode.icon} {activeMode.label}</span>
            <button
              type="button"
              onClick={() => setActiveId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: tk.inkSoft, lineHeight: 1, padding: 0 }}
            >×</button>
          </div>
          {activeMode.questions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleQuestionClick(q)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px',
                borderBottom: i < activeMode.questions.length - 1 ? `1px solid ${tk.hairline}` : 'none',
                background: hoveredQ === i ? '#faf8f4' : 'none',
                border: 'none',
                fontSize: 13, color: tk.ink, lineHeight: 1.4,
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredQ(i)}
              onMouseLeave={() => setHoveredQ(null)}
            >{q}</button>
          ))}
        </div>
      )}
    </div>
  );
}
