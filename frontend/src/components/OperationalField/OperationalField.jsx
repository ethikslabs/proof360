import { fieldConfig } from './field-config.js';
import styles from './field.module.css';

import Aws from './logos/Aws.jsx';
import Cisco from './logos/Cisco.jsx';
import PaloAlto from './logos/PaloAlto.jsx';
import Microsoft from './logos/Microsoft.jsx';
import Cloudflare from './logos/Cloudflare.jsx';
import Anthropic from './logos/Anthropic.jsx';
import OpenAI from './logos/OpenAI.jsx';
import Nvidia from './logos/Nvidia.jsx';
import Gemini from './logos/Gemini.jsx';
import Perplexity from './logos/Perplexity.jsx';

const logoMap = {
  'aws':        Aws,
  'cisco':      Cisco,
  'paloalto':   PaloAlto,
  'microsoft':  Microsoft,
  'cloudflare': Cloudflare,
  'anthropic':  Anthropic,
  'openai':     OpenAI,
  'nvidia':     Nvidia,
  'gemini':     Gemini,
  'perplexity': Perplexity,
};

export function OperationalField() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
        focusable="false"
      >
        {fieldConfig.map((entry) => {
          const Logo = logoMap[entry.id];
          if (!Logo) return null;
          return (
            <g
              key={entry.id}
              transform={`translate(${entry.x}, ${entry.y}) scale(${entry.scale})`}
            >
              <g className={[
                styles.logo,
                styles[entry.tier],
                styles[`logo-${entry.id}`],
              ].join(' ')}>
                <Logo />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
