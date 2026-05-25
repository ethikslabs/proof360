export const DEMO_STAGES = [
  {
    id: 'market',
    label: "King's Cross",
    sub: 'Saturdays at the market',
    company: {
      name: 'Hive & Co',
      description: 'Artisan Manuka honey, two founders, one product. Selling at Sydney and Melbourne markets. The honey is exceptional. The business infrastructure is invisible.',
    },
    trustScore: 38,
    gaps: [
      { id: 'no_online',   severity: 'high',   title: "You don't exist online",                   description: "If Sainsbury's heard about you today and searched, they'd find nothing. That's the first thing any commercial buyer checks." },
      { id: 'no_insure',   severity: 'high',   title: 'No business insurance',                    description: "If someone gets sick from your honey, you have no cover. One incident at this stage ends the business." },
      { id: 'no_food',     severity: 'medium', title: 'No food safety certification',              description: "HACCP is the baseline for any food business that wants to supply retail. Without it, you can't get in the door." },
      { id: 'sole_trader', severity: 'medium', title: 'Trading as a sole trader',                 description: "No separation between personal and business liability. When something goes wrong, everything is at risk." },
      { id: 'no_data',     severity: 'low',    title: 'No record of your customers',              description: "You sell to people at markets and don't know their names. Fine now. A problem the moment you want to build a brand." },
    ],
    messages: [
      { id: 'demo-s1-0', persona: 'sofia',    model: 'claude-sonnet-4-6',         tok: 188, ms: 740,
        content: "You have something real. People are buying your honey because they trust you — they can see you, ask questions, watch you pour it. That's the most powerful kind of trust there is. The problem is it doesn't travel. The moment you're not there, neither is the trust." },
      { id: 'demo-s1-1', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b', tok: 162, ms: 1120,
        content: "The Saturday market is working. Profitable, people love the product, loyal following. But you're capped — you can only be in one place at a time, and growth means hiring people who aren't you. That changes everything about how trust works in this business." },
      { id: 'demo-s1-2', persona: 'edison',   model: 'claude-sonnet-4-6',         tok: 94,  ms: 580,
        content: "You don't exist online. No website, no email domain, nothing that would survive a Google search by a buyer. That's not a minor gap — it's the first thing any commercial buyer checks before they pick up the phone." },
    ],
  },

  {
    id: 'sainsburys',
    label: "Sainsbury's",
    sub: 'First national retailer contract',
    company: {
      name: 'Hive & Co',
      description: "Registered food business, Sainsbury's supply contract in negotiation, small team of five. The product is proven. Now the paperwork has to match.",
    },
    trustScore: 54,
    gaps: [
      { id: 'haccp',       severity: 'critical', title: 'No food safety certification (HACCP)',      description: "Sainsbury's won't sign until you have this. Hard stop. No exceptions for artisan producers." },
      { id: 'prod_liab',   severity: 'high',     title: 'No product liability insurance',            description: "The Sainsbury's contract will make this mandatory. Budget 6–8 weeks to get it in place." },
      { id: 'fsa_reg',     severity: 'high',     title: 'Not registered as a food business',         description: "Required to supply a national retailer. Straightforward — but don't leave it until the contract is ready to sign." },
      { id: 'web_cred',    severity: 'medium',   title: 'No supplier-facing web presence',           description: "Sainsbury's buyers will Google you. They need to see something credible before the first meeting." },
      { id: 'fin_sep',     severity: 'medium',   title: 'Personal and business finances mixed',      description: "Every investor and every enterprise buyer will ask to see clean accounts. Separation is the baseline." },
    ],
    messages: [
      { id: 'demo-s2-0', persona: 'sofia',    model: 'claude-sonnet-4-6',         tok: 172, ms: 810,
        content: "You've crossed from personal trust to institutional trust. Sainsbury's isn't buying your honey because they met you — they're buying it because the documentation said what it needed to say. That's a different kind of trust. It requires different proof." },
      { id: 'demo-s2-1', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b', tok: 156, ms: 1040,
        content: "The Sainsbury's contract is your proof of concept. A tier-1 UK retailer evaluated you and said yes — that's the most credible signal you have. The risk now: you're dependent on one customer for most of your revenue, and their audit requirements will only get more demanding." },
      { id: 'demo-s2-2', persona: 'edison',   model: 'claude-sonnet-4-6',         tok: 108, ms: 620,
        content: "Four gaps between you and signing. The food safety certification is the blocker — everything else can run in parallel once that's in motion. The FSA registration is straightforward but don't leave it late. I'd start Monday." },
    ],
  },

  {
    id: 'digital',
    label: 'Going digital',
    sub: 'QR provenance for supply chains',
    company: {
      name: 'Hive & Co',
      description: "Honey brand that built its own QR provenance system to fight counterfeit product in Asian markets. Other producers want to use it. The pivot is starting.",
    },
    trustScore: 67,
    gaps: [
      { id: 'privacy',     severity: 'high',   title: 'Collecting scan data with no privacy policy', description: "Every QR scan records location, time, device. You have no privacy policy and no consent mechanism. Legal exposure and a B2B deal-breaker." },
      { id: 'api_auth',    severity: 'high',   title: "Your data API has no security",               description: "Any client's product data can be queried by anyone who knows the endpoint structure. Fix this before you sign a second B2B client." },
      { id: 'data_store',  severity: 'high',   title: 'No documented data storage policy',           description: "Where does the scan data live? For how long? Under what jurisdiction? Enterprise clients will ask this before signing." },
      { id: 'incident',    severity: 'medium', title: 'No incident response plan',                   description: "What happens if your system goes down during a product recall? You need a documented plan before any food safety client goes live." },
      { id: 'b2b_terms',   severity: 'medium', title: 'No terms of service for B2B clients',         description: "Your provenance clients are using your platform under a handshake. One dispute ends the relationship — and potentially the platform." },
    ],
    messages: [
      { id: 'demo-s3-0', persona: 'sofia',    model: 'claude-sonnet-4-6',         tok: 198, ms: 870,
        content: "Something interesting happened here. You started solving a problem with honey, and now you're building something much bigger. The QR provenance story isn't just about your product anymore — it's about restoring trust in supply chains that people have stopped trusting. That's a completely different narrative." },
      { id: 'demo-s3-1', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b', tok: 174, ms: 1180,
        content: "You've crossed a threshold most founders don't notice until they're already over it. You're not a honey company anymore — you're a data company that started with honey. The Series A story is right there. But the governance hasn't caught up to what the product now does." },
      { id: 'demo-s3-2', persona: 'edison',   model: 'claude-sonnet-4-6',         tok: 128, ms: 710,
        content: "The QR system is collecting data at every scan — location, time, device. Valuable. But you don't have a privacy policy, the API has no access control, and there's no incident response plan. For B2B clients in food safety, those aren't nice-to-haves." },
    ],
  },

  {
    id: 'raising',
    label: 'Raising investment',
    sub: 'Platform company, Series A',
    company: {
      name: 'Hive & Co Provenance',
      description: "Blockchain-based provenance platform. Started with honey. Now used by wine producers, art dealers, and fresh produce distributors across Australia, the UK, and Japan. 40 enterprise clients. Raising a Series A.",
    },
    trustScore: 74,
    gaps: [
      { id: 'soc2',        severity: 'critical', title: 'Enterprise clients will ask for your security audit', description: "The standard document for any enterprise procurement process. At 40 clients you should already have it. The wait time is now 12–14 months — if you haven't started, start today." },
      { id: 'sc_audit',    severity: 'critical', title: 'The blockchain layer needs a third-party code review', description: "Any investor doing diligence on a blockchain product will ask for this. One firm finding a vulnerability post-investment destroys your valuation and your client relationships." },
      { id: 'pentest',     severity: 'high',     title: 'No penetration test on record',                      description: "Your investors will ask if you've had one. If they find this gap during diligence, it shakes confidence in everything else. Budget 4–6 weeks for a credible firm." },
      { id: 'data_sov',    severity: 'high',     title: "Your clients span three countries — where does their data live?", description: "Australia, UK, and Japan have different data rules. The UK exposure is the most immediate. Get legal advice before the next enterprise contract." },
      { id: 'board',       severity: 'medium',   title: 'No independent board members',                       description: "Investors want to see governance before they write a cheque. One independent director with relevant experience changes the conversation significantly." },
      { id: 'eo_insure',   severity: 'medium',   title: 'No errors and omissions coverage',                   description: "If your provenance data is wrong and a client suffers a product recall, you are liable. Standard for any data platform. Expected by enterprise buyers." },
    ],
    messages: [
      { id: 'demo-s4-0', persona: 'sofia',    model: 'claude-sonnet-4-6',         tok: 212, ms: 890,
        content: "The origin story is your most valuable investor asset — and most founders don't realise it. You didn't build a provenance platform because someone told you there was a market. You built it because you watched corrupt practices in the markets you sold at, and knew there had to be a better way. That story stops rooms." },
      { id: 'demo-s4-1', persona: 'leonardo', model: 'nvidia/nemotron-ultra-253b', tok: 186, ms: 1240,
        content: "Three million ARR, forty enterprise clients across wine, produce, and art — you're a serious company. The gap between your current trust score and what a Series A investor needs to see is specific and closeable. Security audit, penetration test, board governance. None of it is existential. All of it is work." },
      { id: 'demo-s4-2', persona: 'edison',   model: 'claude-sonnet-4-6',         tok: 138, ms: 760,
        content: "Six gaps, two critical. The blockchain code review is the one that surprises founders — it's not on most checklists, but any investor with a technical background will ask for it. The security audit clock is the other problem: 14-month average wait time means you should have started six months ago. Let's sequence the rest." },
    ],
  },
];

export const DEFAULT_STAGE_ID = 'raising';
