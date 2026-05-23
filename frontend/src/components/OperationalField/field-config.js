// Cluster centre: x≈690, y≈500 — dead space below the chat input box
export const fieldConfig = [
  // commercial vendors — orbit (inner ring)
  { id: 'aws',        tier: 'orbit',       x: 610,  y: 470, scale: 0.85 },
  { id: 'cisco',      tier: 'orbit',       x: 660,  y: 530, scale: 0.85 },
  { id: 'paloalto',   tier: 'orbit',       x: 730,  y: 465, scale: 0.85 },
  { id: 'microsoft',  tier: 'orbit',       x: 760,  y: 525, scale: 0.85 },
  // independent (middle ring)
  { id: 'cloudflare', tier: 'independent', x: 690,  y: 495, scale: 0.85 },
  // inference layer (outer ring)
  { id: 'anthropic',  tier: 'inference',   x: 570,  y: 510, scale: 0.85 },
  { id: 'openai',     tier: 'inference',   x: 625,  y: 555, scale: 0.85 },
  { id: 'nvidia',     tier: 'inference',   x: 700,  y: 560, scale: 0.85 },
  { id: 'gemini',     tier: 'inference',   x: 770,  y: 490, scale: 0.85 },
  { id: 'perplexity', tier: 'inference',   x: 800,  y: 545, scale: 0.85 },
];
