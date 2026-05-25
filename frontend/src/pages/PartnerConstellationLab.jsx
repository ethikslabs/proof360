import { tokens } from '../tokens.js';

const PARTNERS = [
  {
    name: 'AWS Partner',
    phrase: 'Credits unlock runway',
    logo: '/logos/aws-partner.png',
    className: 'p360-constellation-logo-tall',
    x: '10%',
    y: '21%',
    size: 126,
    delay: '-2s',
    duration: '13s',
    accent: '#f59e0b',
  },
  {
    name: 'Vanta',
    phrase: 'Compliance closes deals',
    logo: '/logos/vanta-partner.svg',
    x: '88%',
    y: '18%',
    size: 118,
    delay: '-8.5s',
    duration: '14s',
    accent: '#38bdf8',
  },
  {
    name: 'Cloudflare',
    phrase: 'Edge protects trust',
    logo: '/logos/cloudflare.png',
    x: '92%',
    y: '48%',
    size: 132,
    delay: '-5.5s',
    duration: '15s',
    accent: '#f97316',
  },
  {
    name: 'Ingram',
    phrase: 'Distribution creates margin',
    wordmark: 'Ingram',
    x: '8%',
    y: '56%',
    size: 114,
    delay: '-11s',
    duration: '13.5s',
    accent: '#2563eb',
  },
  {
    name: 'Dicker Data',
    phrase: 'Second route ready',
    wordmark: 'Dicker',
    x: '26%',
    y: '86%',
    size: 104,
    delay: '-7s',
    duration: '14.5s',
    accent: '#0f766e',
  },
  {
    name: 'Cisco',
    phrase: 'Security earns confidence',
    logo: '/logos/cisco.svg',
    x: '62%',
    y: '86%',
    size: 110,
    delay: '-3.8s',
    duration: '13.8s',
    accent: '#0891b2',
  },
  {
    name: 'Okta',
    phrase: 'Identity proves control',
    logo: '/logos/okta.svg',
    x: '23%',
    y: '34%',
    size: 98,
    delay: '-9.8s',
    duration: '14.8s',
    accent: '#3b82f6',
  },
  {
    name: 'Palo Alto',
    phrase: 'Risk gets contained',
    logo: '/logos/paloalto.svg',
    x: '82%',
    y: '32%',
    size: 108,
    delay: '-1.2s',
    duration: '13.2s',
    accent: '#dc2626',
  },
  {
    name: 'CyberPro',
    phrase: 'Insurance needs evidence',
    logo: '/logos/cyberpro.png',
    x: '47%',
    y: '11%',
    size: 100,
    delay: '-6.2s',
    duration: '14.2s',
    accent: '#16a34a',
  },
  {
    name: 'Wholesale Investor',
    phrase: 'Capital needs trust',
    logo: '/logos/wholesale-investor.webp',
    x: '89%',
    y: '74%',
    size: 118,
    delay: '-12.4s',
    duration: '15.2s',
    accent: '#7c3aed',
  },
  {
    name: 'Arctic Wolf',
    phrase: 'Detection buys time',
    logo: '/logos/arcticwolf.png',
    x: '11%',
    y: '81%',
    size: 108,
    delay: '-4.6s',
    duration: '13.7s',
    accent: '#475569',
  },
];

function PartnerBubble({ partner, index }) {
  return (
    <div
      className="p360-partner-bubble"
      style={{
        '--bubble-x': partner.x,
        '--bubble-y': partner.y,
        '--bubble-size': `${partner.size}px`,
        '--bubble-delay': partner.delay,
        '--bubble-duration': partner.duration,
        '--bubble-accent': partner.accent,
        '--bubble-drift': index % 2 === 0 ? '-10px' : '10px',
      }}
    >
      <div className="p360-partner-bubble-shell">
        <div className="p360-partner-logo-wrap">
          {partner.logo ? (
            <img
              className={`p360-partner-logo ${partner.className ?? ''}`}
              src={partner.logo}
              alt={partner.name}
              draggable="false"
            />
          ) : (
            <span className="p360-partner-wordmark">{partner.wordmark}</span>
          )}
        </div>
        <div className="p360-partner-phrase">{partner.phrase}</div>
      </div>
    </div>
  );
}

function PartnerConstellation() {
  return (
    <div className="p360-partner-field" aria-label="Partner ecosystem field">
      {PARTNERS.map((partner, index) => (
        <PartnerBubble key={partner.name} partner={partner} index={index} />
      ))}
    </div>
  );
}

export default function PartnerConstellationLab() {
  const tk = tokens('pearl');

  return (
    <main
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 50%, ${tk.surface} 0%, ${tk.bg} 48%, ${tk.bgTint} 100%)`,
        color: tk.ink,
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}
    >
      <style>{`
        .p360-partner-field {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }

        .p360-partner-bubble {
          position: absolute;
          left: var(--bubble-x);
          top: var(--bubble-y);
          width: var(--bubble-size);
          min-height: calc(var(--bubble-size) + 34px);
          transform: translate(-50%, -50%);
          animation: p360-bubble-presence var(--bubble-duration) ease-in-out var(--bubble-delay) infinite both;
          will-change: opacity, transform, filter;
        }

        .p360-partner-bubble-shell {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          animation: p360-bubble-drift 7.5s ease-in-out var(--bubble-delay) infinite;
        }

        .p360-partner-logo-wrap {
          width: var(--bubble-size);
          height: var(--bubble-size);
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(251, 248, 241, 0.72);
          border: 1px solid rgba(107, 78, 168, 0.16);
          box-shadow:
            0 20px 55px rgba(36, 31, 49, 0.10),
            inset 0 0 0 1px rgba(255, 255, 255, 0.58),
            0 0 0 7px color-mix(in srgb, var(--bubble-accent) 8%, transparent);
          backdrop-filter: blur(12px);
        }

        .p360-partner-logo {
          max-width: 66%;
          max-height: 48%;
          object-fit: contain;
          filter: saturate(0.9) contrast(0.95);
          user-select: none;
        }

        .p360-constellation-logo-tall {
          max-width: 54%;
          max-height: 68%;
        }

        .p360-partner-wordmark {
          font-family: "IBM Plex Mono", ui-monospace, monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #241f31;
          text-transform: uppercase;
        }

        .p360-partner-phrase {
          font-family: "IBM Plex Mono", ui-monospace, monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #5a5267;
          text-align: center;
          line-height: 1.35;
          max-width: 156px;
          opacity: 0;
          transform: translateY(6px);
          animation: p360-phrase-presence var(--bubble-duration) ease-in-out var(--bubble-delay) infinite both;
        }

        .p360-center-field {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(520px, calc(100vw - 48px));
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          z-index: 2;
        }

        .p360-center-mark {
          width: 112px;
          height: 112px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          background: rgba(251, 248, 241, 0.76);
          border: 1px solid rgba(107, 78, 168, 0.20);
          box-shadow:
            0 26px 70px rgba(36, 31, 49, 0.14),
            inset 0 0 0 1px rgba(255, 255, 255, 0.70);
          backdrop-filter: blur(16px);
        }

        .p360-center-kicker {
          font-family: "IBM Plex Mono", ui-monospace, monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #8c8499;
          margin-bottom: 13px;
        }

        .p360-center-title {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 72px;
          font-weight: 400;
          line-height: 0.96;
          letter-spacing: 0;
          color: #241f31;
          margin: 0;
        }

        .p360-center-subtitle {
          margin: 20px 0 0;
          max-width: 430px;
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 22px;
          font-style: italic;
          line-height: 1.38;
          color: #5a5267;
        }

        .p360-center-routes {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 28px;
        }

        .p360-route-chip {
          border: 1px solid rgba(107, 78, 168, 0.18);
          border-radius: 999px;
          padding: 7px 11px;
          background: rgba(251, 248, 241, 0.56);
          color: #5a5267;
          font-family: "IBM Plex Mono", ui-monospace, monospace;
          font-size: 9.5px;
          font-weight: 650;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          backdrop-filter: blur(10px);
        }

        @keyframes p360-bubble-presence {
          0%, 7% {
            opacity: 0;
            transform: translate(-50%, -44%) scale(0.88);
            filter: blur(8px);
          }
          17%, 56% {
            opacity: 0.92;
            transform: translate(-50%, -50%) scale(1);
            filter: blur(0);
          }
          73%, 100% {
            opacity: 0;
            transform: translate(-50%, -56%) scale(0.9);
            filter: blur(10px);
          }
        }

        @keyframes p360-phrase-presence {
          0%, 22% {
            opacity: 0;
            transform: translateY(8px);
          }
          34%, 55% {
            opacity: 0.86;
            transform: translateY(0);
          }
          70%, 100% {
            opacity: 0;
            transform: translateY(-6px);
          }
        }

        @keyframes p360-bubble-drift {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(var(--bubble-drift)) translateX(calc(var(--bubble-drift) * -0.45)); }
        }

        @media (max-width: 900px) {
          .p360-partner-phrase {
            font-size: 8.5px;
            max-width: 118px;
          }

          .p360-partner-bubble:nth-child(n + 8) {
            display: none;
          }

          .p360-center-title {
            font-size: 58px;
          }

          .p360-center-subtitle {
            font-size: 20px;
          }
        }

        @media (max-width: 640px) {
          .p360-partner-bubble {
            width: 86px;
            min-height: 118px;
          }

          .p360-partner-logo-wrap {
            width: 86px;
            height: 86px;
          }

          .p360-partner-bubble:nth-child(1) {
            left: 14% !important;
            top: 17% !important;
          }

          .p360-partner-bubble:nth-child(2) {
            left: 84% !important;
            top: 17% !important;
          }

          .p360-partner-bubble:nth-child(3),
          .p360-partner-bubble:nth-child(4),
          .p360-partner-bubble:nth-child(n + 6) {
            display: none;
          }

          .p360-partner-bubble:nth-child(5) {
            left: 22% !important;
            top: 82% !important;
          }

          .p360-center-mark {
            width: 92px;
            height: 92px;
          }

          .p360-center-title {
            font-size: 44px;
          }

          .p360-center-subtitle {
            font-size: 18px;
          }
        }
      `}</style>

      <PartnerConstellation />

      <section className="p360-center-field" aria-label="proof360 partner constellation">
        <div className="p360-center-mark">
          <span
            style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 29,
              color: tk.ink,
              letterSpacing: 0,
            }}
          >
            proof<span style={{ color: tk.plum, fontStyle: 'italic' }}>360</span>
          </span>
        </div>
        <div className="p360-center-kicker">ecosystem field</div>
        <h1 className="p360-center-title">The right door, first.</h1>
        <p className="p360-center-subtitle">
          Credits, compliance, distribution, identity, security, insurance, and capital orbit the same founder question.
        </p>
        <div className="p360-center-routes" aria-label="Partner route categories">
          <span className="p360-route-chip">funding</span>
          <span className="p360-route-chip">trust</span>
          <span className="p360-route-chip">distribution</span>
          <span className="p360-route-chip">security</span>
          <span className="p360-route-chip">capital</span>
        </div>
      </section>
    </main>
  );
}
