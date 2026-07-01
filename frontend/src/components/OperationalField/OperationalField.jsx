import { useState, useEffect } from 'react';
import { fieldConfig } from './field-config.js';
import styles from './field.module.css';

import Aws                from './logos/Aws.jsx';
import Cisco              from './logos/Cisco.jsx';
import PaloAlto           from './logos/PaloAlto.jsx';
import Microsoft          from './logos/Microsoft.jsx';
import Cloudflare         from './logos/Cloudflare.jsx';
import Anthropic          from './logos/Anthropic.jsx';
import OpenAI             from './logos/OpenAI.jsx';
import Nvidia             from './logos/Nvidia.jsx';
import Gemini             from './logos/Gemini.jsx';
import Perplexity         from './logos/Perplexity.jsx';
import Vanta              from './logos/Vanta.jsx';
import ApolloSecure       from './logos/ApolloSecure.jsx';
import AustbrokersCyberpro from './logos/AustbrokersCyberpro.jsx';
import Ingram             from './logos/Ingram.jsx';

const logoMap = {
  aws: Aws, cisco: Cisco, paloalto: PaloAlto, microsoft: Microsoft,
  cloudflare: Cloudflare, anthropic: Anthropic, openai: OpenAI,
  nvidia: Nvidia, gemini: Gemini, perplexity: Perplexity,
  vanta: Vanta, apollosecure: ApolloSecure,
  austbrokerscyberpro: AustbrokersCyberpro, ingram: Ingram,
};

const DURATIONS = { entering: 1200, holding: 3500, exiting: 800 };
const SCALE = 1.4;

export function OperationalField({ onLogoClick, active = true }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [spotPhase, setSpotPhase] = useState('entering');

  // Reset to AWS (index 0) whenever we become active
  useEffect(() => {
    if (active) {
      setActiveIdx(0);
      setSpotPhase('entering');
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      if (spotPhase === 'exiting') {
        setActiveIdx(i => (i + 1) % fieldConfig.length);
        setSpotPhase('entering');
      } else {
        setSpotPhase(spotPhase === 'entering' ? 'holding' : 'exiting');
      }
    }, DURATIONS[spotPhase]);
    return () => clearTimeout(t);
  }, [spotPhase, active]);

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 4,
      overflow: 'hidden', pointerEvents: 'none',
    }}>
      {fieldConfig.map((entry, idx) => {
        const Logo = logoMap[entry.id];
        if (!Logo) return null;
        const isActive = idx === activeIdx;
        const cls = isActive
          ? spotPhase === 'entering' ? styles.entering
          : spotPhase === 'holding'  ? styles.holding
          : styles.exiting
          : styles.idle;

        return (
          <div
            key={entry.id}
            className={cls}
            style={{
              position: 'absolute',
              right: '7%',
              bottom: '14%',
              pointerEvents: isActive ? 'all' : 'none',
              cursor: isActive && onLogoClick ? 'pointer' : 'default',
            }}
            onClick={isActive && onLogoClick ? () => onLogoClick(entry) : undefined}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={entry.w * SCALE}
              height={entry.h * SCALE}
              viewBox={`${-entry.w / 2} ${-entry.h / 2} ${entry.w} ${entry.h}`}
              style={{ display: 'block' }}
            >
              <Logo />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
