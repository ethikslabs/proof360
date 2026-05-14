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
  sofia: "You've burned capital chasing a real opportunity — that's not a failure, it's a data point. But investors won't wire money based on your belief in the opportunity. They'll wire it based on evidence: provenance of the product, provenance of the spend, and proof that you know what you're scaling into. The investor question is: can you prove the honey is what you say it is, at volume, with a supply chain that doesn't collapse under scrutiny?",
  leonardo: "The narrative can't be \"we ran out of money.\" It needs to be \"we invested to prove the market, here's what we learned, here's the evidence, here's what the next dollar buys.\" Buyers — cafés, hospitals, export distributors — and investors both need the same thing: a story that holds up under questions. Provenance is your story. Origin, traceability, verified supply chain. That's what makes the pitch defensible.",
  edison: "Investor due diligence on a global food business will surface your gaps this week, not in six months. They'll ask: who has access to your supplier records? What happens if a supplier is compromised? Can you prove origin claims? Is there a digital audit trail? Right now those gaps are survivable. Inside a data room, they become blockers. The good news: they're fixable — but the fixes need to start before the investor conversation, not after.",
  john_ai: "You've reached the point where a human conversation changes more than another analysis. I'm John's AI assistant — I can help you understand what's needed, but John can route you to the right investor, broker, or distributor conversation directly. He's seen this arc before. Want me to set that up?",
};

export function getPersonaResponses(input = '') {
  const isHoney = /honey|manuka|market|king.s cross|burned.*money|burned.*cash/i.test(input);
  return ['sofia', 'leonardo', 'edison', 'john_ai'].map(key => ({
    ...PERSONA_MAP[key],
    response: isHoney
      ? HONEY_RESPONSES[key]
      : `[${key}] Here is what I understand from your description. Let me ask a few questions to sharpen the picture.`,
  }));
}
