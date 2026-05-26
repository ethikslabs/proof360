// ── Intent detection ───────────────────────────────────────────────────────
// Maps message intent to primary persona + optional handoff.
// Direct questions ("Edison, ...") bypass this entirely.
const INTENT_RULES = [
  {
    test: /technical|security|ssl|breach|access.control|compliance|soc|infrastructure|aws|qualify|data.room|pentest|certif/i,
    primary: 'edison', handoff: 'sofia',
  },
  {
    test: /investor|raise|capital|wire|term.sheet|round|valuation|fund|vc|angel|runway|money/i,
    primary: 'sofia', handoff: 'leonardo',
  },
  {
    test: /vendor|tool|software|partner|vanta|cloudflare|drata|program|credit|marketplace/i,
    primary: 'leonardo', handoff: 'edison',
  },
  {
    test: /narrative|story|position|brand|pitch|market|explain|describe|communicate|message/i,
    primary: 'leonardo', handoff: null,
  },
  {
    test: /honey|manuka|supply.chain|food|product|provenance|origin/i,
    primary: 'sofia', handoff: 'edison',
  },
];

export function detectIntent(input) {
  for (const rule of INTENT_RULES) {
    if (rule.test.test(input)) return { primary: rule.primary, handoff: rule.handoff };
  }
  return { primary: 'sofia', handoff: null }; // default: Sophia opens
}

// ── Intent-aware responses with handoff lines ──────────────────────────────
const INTENT_RESPONSES = {
  technical: {
    edison: "Three things kill enterprise deals in the data room: SSL misconfigurations, no access control evidence, and breach exposure that's been public for months. All fixable — Cloudflare in front of everything, Vanta for SOC 2 evidence, HaveIBeenPwned for breach baseline. The window is shorter than founders think. Most start fixing when they're already in the room. That's too late.\n\nSophia — investor side, what does the timing look like from where you sit?",
    sofia_handoff: "From the investor side, the fix timeline is a signal in itself. A founder who surfaces these gaps proactively and is already closing them — SOC 2 in progress, Cloudflare deployed, breach exposure acknowledged — reads as operational. One who discovers them under diligence reads as a risk. The question I always want answered: what's the runway relative to the remediation timeline?",
  },
  capital: {
    sofia: "Investors don't wire money based on belief in the opportunity. They wire it based on evidence — provenance of the product, provenance of the spend, and proof that you know what you're scaling into. The gap most founders underestimate is between what they know and what they can demonstrate. Wholesale Investor, for example, sees hundreds of AU founders — the ones who close have a provenance story before the first call.\n\nLeonardo — how does that translate into the narrative layer?",
    leonardo_handoff: "The narrative has to do the work before the evidence is even opened. If an investor doesn't believe the story before they open the data room, nothing in the data room saves you. The co-sell angle helps here — AWS Marketplace presence or a Cloudflare for Teams deployment tells a buyer that someone already vetted this. The story needs to answer one question: why will this be true at scale, not just now?",
  },
  vendor: {
    leonardo: "The vendor selection is a commercial signal. The sequence matters — what you adopt first tells buyers and investors something about where you're prioritising. Vanta first says compliance-led. Cloudflare first says security-led. AWS Activate first says growth-led. None are wrong, but they read differently depending on who's looking.\n\nEdison — what's the implementation reality at this stage?",
    edison_handoff: "At this stage the implementation ceiling is usually people, not tools. Vanta and Cloudflare both have setup time that founders underestimate — not because they're hard, but because they surface things that need fixing first. Vanta will surface your access control gaps in the first week. Cloudflare will surface your DNS in the first day. Budget 3 weeks minimum before either is evidence-grade.",
  },
  narrative: {
    leonardo: "The narrative isn't what you say about your product. It's the answer to the question a buyer or investor is asking before they've said it out loud. Usually that question is: why should I believe this holds up under pressure? The founders who answer it best in 2025 have something concrete — an AWS co-sell listing, a Prescient Security audit, a Vanta SOC 2 in progress. Evidence does narrative work your words can't.",
  },
  honey: {
    sofia: "You've burned capital chasing a real opportunity — that's not a failure, it's a data point. But investors won't wire money based on your belief in the opportunity. They'll wire it based on evidence: provenance of the product, provenance of the spend, and proof that you know what you're scaling into. Enterprise SG runs their own Manuka honey program — if you're eyeing Asian expansion, that's the fastest institutional door into Singapore distribution.\n\nEdison — what does the evidence layer actually look like for a supply chain business at this stage?",
    edison_handoff: "For a food supply chain, the evidence layer is origin documentation, batch traceability, and supplier access controls. Investors in this space have seen fraud — they'll want digital audit trails, not PDFs. The question is: does your current system produce evidence, or does someone manually assemble it before each diligence request? Cognitive View can automate the AI governance layer if you're using any LLMs in the supply chain.",
  },
};

function getIntentKey(input) {
  const text = input.toLowerCase();
  if (/honey|manuka|supply.chain|food|product|provenance|origin/i.test(text)) return 'honey';
  if (/technical|security|ssl|breach|access.control|compliance|soc|infrastructure|aws|qualify/i.test(text)) return 'technical';
  if (/investor|raise|capital|wire|term.sheet|round|valuation|fund|vc|angel|runway/i.test(text)) return 'capital';
  if (/vendor|tool|software|partner|vanta|cloudflare|program|credit/i.test(text)) return 'vendor';
  if (/narrative|story|position|brand|pitch|market|explain/i.test(text)) return 'narrative';
  return null;
}

const PERSONA_MAP = {
  sofia: {
    persona: 'sofia',
    role: 'market_investor_lens',
    questions: [
      'Have you raised capital or are you exploring it?',
      'Who are your first five customers?',
      'What does growth beyond the founder look like?',
    ],
  },
  leonardo: {
    persona: 'leonardo',
    role: 'narrative_positioning_lens',
    questions: [
      'How do you explain what you do in one sentence?',
      'What does a buyer need to believe before they trust the product?',
    ],
  },
  edison: {
    persona: 'edison',
    role: 'technical_enterprise_dd_lens',
    questions: [
      'Where does your data live?',
      'What happens if a supplier is compromised?',
      'What evidence would a hospital or enterprise buyer ask for?',
    ],
  },
  john_ai: {
    persona: 'john_ai',
    role: 'commercial_judgment_handoff',
    questions: [
      'What conversation do you need to have next?',
      'What is the one blocker you keep running into?',
    ],
  },
};

const HONEY_RESPONSES = {
  sofia: "You've burned capital chasing a real opportunity — that's not a failure, it's a data point. But investors won't wire money based on your belief in the opportunity. They'll wire it based on evidence: provenance of the product, provenance of the spend, and proof that you know what you're scaling into. The Wholesale Investor network in AU has seen this arc before — the ones who close have the provenance story assembled before the first call. Can you prove the honey is what you say it is, at volume, with a supply chain that doesn't collapse under scrutiny?",
  leonardo: "The narrative can't be \"we ran out of money.\" It needs to be \"we invested to prove the market, here's what we learned, here's the evidence, here's what the next dollar buys.\" Buyers — cafés, hospitals, Sainsbury's supply chains — and investors both need the same thing: a story that holds up under questions. Enterprise SG has a specific Manuka pathway for AU producers entering Singapore. Provenance is your story. Origin, traceability, verified supply chain. That's what makes the pitch defensible.",
  edison: "Investor due diligence on a global food business will surface your gaps this week, not in six months. They'll ask: who has access to your supplier records? What happens if a supplier is compromised? Can you prove origin claims? Is there a digital audit trail? Right now those gaps are survivable. Inside a data room, they become blockers. The good news: they're fixable — Cognitive View can automate the AI governance layer, and a Prescient Security audit gives you the third-party attestation. Fixes need to start before the investor conversation, not after.",
  john_ai: "You've reached the point where a human conversation changes more than another analysis. I'm John's AI assistant — I can help you understand what's needed, but John can route you to the right investor, broker, or distributor conversation directly. He has direct contact with the Enterprise SG team and the Wholesale Investor network in AU. He's seen this arc before. Want me to set that up?",
};

const GENERIC_RESPONSES = {
  sofia: "The capital conversation is shorter when the evidence is already assembled. Have you raised before, or is this your first external round? And who are your first two or three reference customers — the ones who'd take a call from a Wholesale Investor or Series A lead?",
  leonardo: "Your narrative needs to hold up to a single hard question: why you, why now, why this market? The founders who close fastest in 2025 have a co-sell story — AWS Marketplace, Cloudflare for Teams, something that proves enterprise buyers already trust the stack. How do you currently explain what you do to someone who doesn't know your industry?",
  edison: "Technical due diligence starts with what's already public. SSL posture, breach exposure on HaveIBeenPwned, DNS hygiene. I can read these in under a minute. The fixes — Cloudflare in front of everything, Vanta for SOC 2 evidence — take weeks, not months. Where does your customer data live, and who has access to it?",
  john_ai: "I've seen this stage before. The founders who close fastest know exactly what they need next — whether that's an AWS Activate credit to extend runway, a Vanta attestation to unblock a procurement cycle, or an intro to the right investor at the right moment. What's the one thing that, if resolved, changes your next 90 days?",
};

// Model routing: mirrors VECTOR — claude-* → Anthropic, others → NIM
const PERSONA_MODEL = {
  sofia:    'claude-sonnet-4-6',
  leonardo: 'nvidia/nemotron-ultra-253b',
  edison:   'claude-sonnet-4-6',
  john_ai:  'claude-sonnet-4-6',
};

function mockMeta(persona, text) {
  const tok = Math.floor(text.length / 3.8) + 60 + Math.floor(Math.random() * 40);
  const ms  = 600 + Math.floor(Math.random() * 1400);
  return { model: PERSONA_MODEL[persona] ?? 'claude-sonnet-4-6', tok, ms };
}

export function getPersonaResponses(input = '') {
  const intentKey = getIntentKey(input);
  const { primary, handoff } = detectIntent(input);
  const bucket = intentKey ? INTENT_RESPONSES[intentKey] : null;

  if (bucket) {
    const results = [];
    const primaryResponse = bucket[primary] || bucket[primary + '_handoff'] || GENERIC_RESPONSES[primary];
    results.push({ ...PERSONA_MAP[primary], response: primaryResponse, ...mockMeta(primary, primaryResponse) });
    if (handoff) {
      const handoffResponse = bucket[handoff + '_handoff'];
      if (handoffResponse) {
        results.push({ ...PERSONA_MAP[handoff], response: handoffResponse, ...mockMeta(handoff, handoffResponse) });
      }
    }
    return results;
  }

  const resp = GENERIC_RESPONSES[primary];
  return [{ ...PERSONA_MAP[primary], response: resp, ...mockMeta(primary, resp) }];
}

export function getPersonaResponse(persona, input = '') {
  const key = persona.toLowerCase() === 'sophia' ? 'sofia' : persona.toLowerCase();
  if (!PERSONA_MAP[key]) return getPersonaResponses(input);
  const isHoney = /honey|manuka|market|king.s cross|burned.*money|burned.*cash/i.test(input);
  const resp = isHoney ? HONEY_RESPONSES[key] : GENERIC_RESPONSES[key];
  return [{ ...PERSONA_MAP[key], response: resp, ...mockMeta(key, resp) }];
}
