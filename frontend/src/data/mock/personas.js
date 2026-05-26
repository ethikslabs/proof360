// ── Intent detection ───────────────────────────────────────────────────────
const INTENT_RULES = [
  {
    test: /cyber.insur|insurance|austbrokers|coverage|policy|procurement.sign|enterprise.sign.off/i,
    primary: 'edison', handoff: 'leonardo',
  },
  {
    test: /stripe|atlas|revenue.recogn|billing|payments|metronome|usage.based/i,
    primary: 'leonardo', handoff: 'sofia',
  },
  {
    test: /xero|accounting|financial|accounts|bookkeeping|p&l|balance.sheet/i,
    primary: 'sofia', handoff: 'edison',
  },
  {
    test: /hubspot|crm|pipeline|sales|mrr|churn|customer.success/i,
    primary: 'leonardo', handoff: 'sofia',
  },
  {
    test: /nvidia|gpu|nim|inference|llm|gemini|perplexity|anthropic|openai|claude|model/i,
    primary: 'edison', handoff: 'leonardo',
  },
  {
    test: /ingram|distribution|reseller|channel|dicker|wholesale.partner/i,
    primary: 'leonardo', handoff: null,
  },
  {
    test: /soc.2|iso.27001|certif|audit|pentest|hipaa|pci|gdpr/i,
    primary: 'edison', handoff: 'sofia',
  },
  {
    test: /technical|security|ssl|breach|access.control|infrastructure|qualify|data.room/i,
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
  insurance: {
    edison: "Enterprise procurement now treats cyber insurance the same way it treats SOC 2 — it's a checkbox before contract signature, not an afterthought. The minimum threshold most enterprise procurement teams require: $1M cyber liability cover, covering data breach, ransomware, and business interruption. AustBrokers Cyberpro can turn a quote around in 48–72 hours for AU tech companies — the application is straightforward at your stage. Key things that affect your premium: whether you have MFA enforced across all accounts, whether you have a tested backup process, and whether you're on a recognised cloud provider. All three are fixable fast.\n\nLeonardo — how does this show up from the procurement side?",
    leonardo_handoff: "Enterprise buyers run a pre-qualification before they'll even discuss terms — and cyber insurance now appears on that list alongside SOC 2 evidence and data processing agreements. The companies that move fastest are the ones who get the certificate before the first enterprise conversation, not after the first 'we'll need to see your insurance' email. It changes the dynamic entirely — you're not scrambling, you're already compliant.",
  },
  stripe: {
    leonardo: "Stripe isn't just payments — it's the financial infrastructure layer that investors and acquirers check. Three products matter at different stages: Stripe Atlas if you haven't incorporated cleanly yet (Delaware C-corp, done in a day), Stripe Capital for non-dilutive financing once you have 6+ months of revenue history, and Stripe Revenue Recognition if you're on any kind of subscription model — that's what makes your MRR investor-grade rather than founder-claimed.\n\nSophia — from the investor lens, what does Stripe presence actually signal?",
    sofia_handoff: "Investors see Stripe as a trust proxy. If your revenue data comes from Stripe, it's verifiable in a way that bank statements or exported spreadsheets aren't. The MRR dashboard, the cohort data, the churn numbers — all of it is auditable. That's why the first question in most seed diligence is 'can you share Stripe read access?' rather than 'can you send me your revenue spreadsheet.'",
  },
  xero: {
    sofia: "Clean Xero accounts signal something specific to investors: this founder understands the financial story of their business and has nothing to hide. The things that kill early diligence fastest are inconsistent revenue recognition, unsupported intercompany transactions, and directors' loans that look like cash extraction. Before any investor conversation, you want three things in Xero: clean bank reconciliation to the last statement, revenue recognised on the invoice date (not cash date), and a cap table that matches what's in your incorporation docs.\n\nEdison — from the technical evidence layer, what does Xero integration unlock?",
    edison_handoff: "Xero integration is how you move from self-reported financials to verified financials. When CORPUS pulls your Xero data, it can cross-reference claimed ARR against actual invoiced revenue, check whether growth numbers are consistent, and flag gaps that would surface in due diligence before they become problems. The founders who move fastest through diligence are the ones whose data tells the same story whether you read the deck, the Xero export, or the Stripe dashboard.",
  },
  hubspot: {
    leonardo: "Investors ask for HubSpot access for one reason: they want to verify the pipeline story. The deck says '$2.4M pipeline' — HubSpot either confirms it or doesn't. The things they look at: deal stage distribution (is it all 'proposal sent' with nothing moving?), average sales cycle length, number of active deals per rep, and whether closed-won deals match Stripe revenue. The founders who move through diligence fastest have HubSpot as a single source of truth — not a CRM where old deals rot at proposal stage because nobody closed them out.\n\nSophia — what does pipeline hygiene signal to an investor?",
    sofia_handoff: "Pipeline hygiene is a proxy for operational discipline. A clean HubSpot — stages reflect reality, deals are updated weekly, churned customers are logged — tells an investor this founder manages with data. A messy CRM signals the opposite. It's not about the number of deals. It's about whether the founder understands what they actually have versus what they hope they have.",
  },
  ai_models: {
    edison: "The right model selection is a commercial signal now, not just a technical one. NVIDIA NIM gives you access to the largest open-weight models via API — Nemotron Ultra 253B is what we run for complex reasoning. Perplexity is the right call when you need live web intelligence — it's not replacing your LLM, it's your recency layer. Gemini 1.5 Pro is unmatched on long document synthesis — 1M token context means you can hand it a whole data room. Anthropic Claude is the enterprise safety default — if you're deploying agents that touch customer data, Claude's constitutional AI approach is what enterprise procurement wants to see.\n\nLeonardo — how does model choice show up in commercial conversations?",
    leonardo_handoff: "Model selection has become a procurement question. Enterprise buyers are now asking 'which AI providers are you using and why?' as part of security review. Anthropic and AWS Bedrock both have SOC 2 coverage and the compliance documentation that enterprise procurement needs. OpenAI direct is still valid but raises more questions than Bedrock. The founders who move fastest have a clear answer to 'where does your AI run and who can see the data?'",
  },
  distribution: {
    leonardo: "Ingram Micro is the distribution layer behind most enterprise vendor relationships — Cisco, Microsoft, and a long tail of security vendors all flow through them. For a startup, the relevant question is whether your target enterprise customer already buys through Ingram, because that determines whether you can be attached to an existing procurement relationship rather than opening a new one. The Ingram Cloud marketplace is the SaaS path — it handles contracting, invoicing, and support escalation. The channel relationship also gives you access to pricing that's not publicly available and co-marketing funds from vendors.",
  },
  compliance: {
    edison: "SOC 2 is the baseline now — it's not optional if you're selling to enterprise. The question is Type I vs Type II and timeline. Type I is a point-in-time attestation — you can have it in 60–90 days with Vanta if you start controls now. Type II is a 6-month operating period — it's what buyers actually want, but Type I gets you through the first procurement gate. ISO 27001 matters more in APAC and EU than in the US. APRA CPS 234 matters if you're touching Australian financial services data. Start with SOC 2 Type I, use Prescient Security for the actual audit, and have the Type II in progress by the time you're in serious enterprise conversations.",
    sofia_handoff: "The certification is the story. Investors and enterprise buyers aren't reading your controls documentation — they're looking for the audit report as evidence that someone independent has verified your claims. 'SOC 2 in progress' with a named auditor and a timeline is actually a stronger signal than nothing, because it shows you know what you're doing and have already started.",
  },
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
  if (/cyber.insur|insurance|austbrokers|coverage|procurement.sign|enterprise.sign.off/i.test(text)) return 'insurance';
  if (/stripe|atlas|revenue.recogn|billing|payments|metronome|usage.based/i.test(text)) return 'stripe';
  if (/xero|accounting|financial|accounts|bookkeeping/i.test(text)) return 'xero';
  if (/hubspot|crm|pipeline|sales|mrr/i.test(text)) return 'hubspot';
  if (/nvidia|gpu|nim|gemini|perplexity|anthropic|openai|claude|llm|inference|model/i.test(text)) return 'ai_models';
  if (/ingram|distribution|reseller|channel|dicker/i.test(text)) return 'distribution';
  if (/soc.2|iso.27001|certif|audit|pentest|hipaa|pci|gdpr/i.test(text)) return 'compliance';
  if (/technical|security|ssl|breach|access.control|infrastructure|aws|qualify/i.test(text)) return 'technical';
  if (/investor|raise|capital|wire|term.sheet|round|valuation|fund|vc|angel|runway/i.test(text)) return 'capital';
  if (/vendor|tool|software|partner|vanta|cloudflare|program|credit|marketplace/i.test(text)) return 'vendor';
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
