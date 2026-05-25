// Sequential spotlight — order: AWS → Vanta → Cisco → Cloudflare → rest
export const fieldConfig = [
  {
    id: 'aws', tier: 'orbit', w: 72, h: 43,
    name: 'AWS', label: 'Infrastructure',
    desc: 'Enrolled AWS programs reduce your compliance burden and signal operational maturity to enterprise buyers.',
  },
  {
    id: 'vanta', tier: 'orbit', w: 80, h: 20,
    name: 'Vanta', label: 'Compliance automation',
    desc: 'Continuous compliance monitoring. SOC 2 and ISO 27001 evidence that closes investor and enterprise DD gaps.',
  },
  {
    id: 'cisco', tier: 'orbit', w: 44, h: 44,
    name: 'Cisco', label: 'Network security',
    desc: 'Network security posture. Cisco certifications signal enterprise-grade controls to buyers running shadow DD.',
  },
  {
    id: 'cloudflare', tier: 'independent', w: 110, h: 16,
    name: 'Cloudflare', label: 'Edge & Zero Trust',
    desc: 'Startup-friendly Zero Trust and edge security. Closes perimeter gaps without expensive hardware.',
  },
  {
    id: 'anthropic', tier: 'inference', w: 120, h: 14,
    name: 'Anthropic', label: 'AI analysis',
    desc: 'Claude reads your public signals and surfaces what investors and enterprise buyers will find before you meet.',
  },
  {
    id: 'nvidia', tier: 'inference', w: 110, h: 21,
    name: 'NVIDIA', label: 'AI inference',
    desc: 'NIM specialist models run targeted analysis passes — technical posture, infrastructure risk, compliance gaps.',
  },
  {
    id: 'perplexity', tier: 'inference', w: 96, h: 21,
    name: 'Perplexity', label: 'Live research',
    desc: 'Live web research checks your public trust signals against current market expectations in real time.',
  },
  {
    id: 'apollosecure', tier: 'orbit', w: 80, h: 24,
    name: 'Apollo Secure', label: 'Cyber risk advisory',
    desc: 'Managed cyber risk advisory. Bridges the gap between compliance posture and real-world threat exposure.',
  },
  {
    id: 'microsoft', tier: 'orbit', w: 96, h: 21,
    name: 'Microsoft', label: 'Identity & access',
    desc: 'Entra ID and Azure adoption are common enterprise procurement requirements. Closes IAM trust gaps fast.',
  },
  {
    id: 'openai', tier: 'inference', w: 96, h: 24,
    name: 'OpenAI', label: 'AI analysis',
    desc: 'Cross-model verification layer. Multiple models reduce blind spots that single-model analysis misses.',
  },
  {
    id: 'gemini', tier: 'inference', w: 80, h: 29,
    name: 'Google', label: 'AI analysis',
    desc: 'Large-context document synthesis. Gemini reads across your full trust posture in a single pass.',
  },
  {
    id: 'austbrokerscyberpro', tier: 'orbit', w: 100, h: 24,
    name: 'Austbrokers CyberPro', label: 'Cyber insurance',
    desc: 'Specialist cyber insurance. Closes coverage gaps that enterprise procurement teams and investors now require.',
  },
  {
    id: 'paloalto', tier: 'orbit', w: 44, h: 44,
    name: 'Palo Alto', label: 'Threat prevention',
    desc: 'Closes firewall and endpoint gaps that enterprise procurement teams flag in vendor security assessments.',
  },
  {
    id: 'ingram', tier: 'orbit', w: 80, h: 24,
    name: 'Ingram Micro', label: 'Distribution',
    desc: 'Global technology distribution. Access to enterprise-grade vendor programs and channel pricing.',
  },
];
