export const HIVE_STAGES = [
  {
    label: 'Markets',
    desc: 'DTC honey brand, Sydney markets. No B2B, no compliance layer, no investor documentation.',
    stageMsg: {
      persona: 'edison',
      content: "This is where Hive & Co started. DTC brand, markets only — no evidence layer at all. The founder could tell you everything about the honey: single-origin, batch-tracked, no blending. Nothing an investor or enterprise buyer could verify. Score 12. Not because the product wasn't real. Because nothing was documented.",
    },
    spaces: {
      investor: { lit: false, sub: 'Score 12',   persona: 'sofia',    msg: "No data room. No cap table documentation. No investor story beyond the founder telling it in person. The product was real — the evidence layer wasn't." },
      vendors:  { lit: false, sub: '0 matched',  persona: 'leonardo', msg: "Nothing in the vendor stack. Everything manual. Supplier relationships existed in WhatsApp conversations and handshake deals — none of which a buyer or investor could audit." },
      aws:       { lit: false, sub: '0 eligible', persona: 'edison',   msg: "No AWS footprint, no cloud infrastructure, no program eligibility. Shopify and spreadsheets." },
      microsoft: { lit: false, sub: '0 eligible', persona: 'edison',   msg: "No digital product, no cloud infrastructure — Microsoft Founders Hub requires at least a SaaS product or hosted service. Shopify-only doesn't qualify." },
      posture:   { lit: false, sub: '1 check',    persona: 'edison',   msg: "One check: SSL on the domain. No access control evidence, no breach monitoring. A single enterprise buyer's security questionnaire would have surfaced every gap in ten minutes." },
      spv:       { lit: false, sub: 'None',       persona: 'sofia',    msg: "No legal structure for raising. A willing investor couldn't have wired money even if they wanted to." },
    },
    panel: {
      investor: {
        score: 12,
        peer: null,
        delta: null,
        summary: "The product is exceptional. The evidence layer doesn't exist yet. A founder who can tell you everything about honey and nothing that an investor can verify.",
        gaps: [
          { label: 'No data room',              severity: 'high',   source: 'manual · not started'   },
          { label: 'No compliance evidence',    severity: 'high',   source: 'cold read · today'       },
          { label: 'No access control record',  severity: 'high',   source: 'manual · not checked'   },
          { label: 'SSL on Shopify domain only', severity: 'medium', source: 'Cloudflare · today'    },
        ],
        evidence: [
          { label: 'Shopify store',    state: 'active',  note: 'DTC retail, no B2B'   },
          { label: 'SSL certificate',  state: 'active',  note: 'Shopify default'       },
          { label: 'ABN registration', state: 'active',  note: 'trading entity'        },
          { label: 'Data room',        state: 'missing', note: 'not started'           },
          { label: 'Compliance',       state: 'missing', note: 'no auditor engaged'    },
          { label: 'Cap table',        state: 'missing', note: 'not formalised'        },
        ],
        questions: [
          'Can you prove the honey is what you say it is at volume?',
          'What happens if a supplier is compromised?',
          'Where does your customer data live and who has access?',
        ],
      },
      vendors: {
        summary: "No vendor stack. Every supplier relationship lives in WhatsApp. Nothing an auditor or buyer can follow.",
        vendors: [],
        emptyNote: "No vendors matched yet. The gaps need to be documented before the right tools can be recommended.",
      },
      aws: {
        summary: "Shopify-hosted. No AWS infrastructure. Zero program eligibility at this stage.",
        programs: [],
        emptyNote: "AWS program eligibility requires an AWS footprint. Moving off Shopify is a precondition.",
      },
      microsoft: {
        summary: "No Microsoft programs matched yet. Founders Hub requires a digital product or hosted service — Shopify alone doesn't qualify.",
        programs: [],
        emptyNote: "Microsoft Founders Hub requires a SaaS or hosted product. Moving off Shopify-only is the precondition.",
      },
      posture: {
        summary: "One check passes. Everything else is invisible or missing.",
        items: [
          { label: 'SSL / TLS',          status: 'Shopify default',  severity: 'ok',     source: 'Shopify · passive'     },
          { label: 'Access Control',     status: 'No evidence',      severity: 'high',   source: 'manual · not checked'  },
          { label: 'Breach Monitor',     status: 'Not configured',   severity: 'high',   source: 'no integration'        },
          { label: 'Supplier Records',   status: 'Manual / WhatsApp', severity: 'high',  source: 'no system'             },
          { label: 'Data Privacy',       status: 'Unknown',          severity: 'unknown', source: 'no integration'       },
        ],
      },
      spv: {
        status: 'None',
        summary: "Trading as Pty Ltd. No raise-ready structure. A willing investor couldn't wire money without two weeks of legal groundwork first.",
        fields: [
          { label: 'Entity status',   value: 'Pty Ltd only',    color: 'umber'   },
          { label: 'Trust score',     value: '12 / 100',        color: 'sevHigh' },
          { label: 'SAFE / docs',     value: 'Not started',     color: 'inkSoft' },
          { label: 'Investor links',  value: '0 sent',          color: 'inkSoft' },
        ],
      },
    },
  },

  {
    label: 'Seed raise',
    desc: 'Preparing for first external round. Trust posture starts to form. Documentation begins.',
    stageMsg: {
      persona: 'sofia',
      content: "The decision to raise forces the question every founder avoids: what can you actually prove? Six weeks into the raise preparation, Hive & Co's score moved from 12 to 38. Not because they changed the product — because they started documenting what was already true.",
    },
    spaces: {
      investor: { lit: true, sub: 'Score 38',   persona: 'sofia',    msg: "Score 38 reflects a company that's started the documentation process but hasn't finished it. Data room is open. Cap table is clean. But the evidence layer underneath is still thin. Enough to start conversations. Not enough to close them." },
      vendors:  { lit: true, sub: '6 matched',  persona: 'leonardo', msg: "Six vendors matched once they started looking: Vanta for compliance, Cloudflare for edge security, two insurance products, two AWS programs. The vendor stack tells investors: this company has started building infrastructure." },
      aws:       { lit: true,  sub: '0 eligible', persona: 'edison',   msg: "Still zero AWS eligibility — the Shopify stack doesn't qualify for programs or credits. That changes when blockchain infrastructure moves onto AWS in Stage 3." },
      microsoft: { lit: true,  sub: '2 programs', persona: 'leonardo', msg: "Two Microsoft programs available now. The Founders Hub application takes 20 minutes and unlocks up to $150k in Azure credits plus GitHub Enterprise. The Ingram Micro Xvantage CSP is the fastest path to Microsoft 365 at startup pricing." },
      posture:   { lit: true,  sub: '2 checks',   persona: 'edison',   msg: "Two checks: SSL plus a basic access control audit. Enough to put something in a security questionnaire. Not enough to satisfy enterprise procurement." },
      spv:      { lit: true, sub: 'None',       persona: 'sofia',    msg: "No SPV yet, but SAFE documentation is in progress. An investor could wire money — it would just take two weeks of legal work first." },
    },
    panel: {
      investor: {
        score: 38,
        peer: 'seed-stage food brands average 28',
        delta: '+26 since markets stage',
        summary: "Above the peer average. The raise documentation is open and clean. The gap is the evidence layer — provenance, supplier verification, audit trail. Enough to start investor conversations. Not enough to close them.",
        gaps: [
          { label: 'No SOC 2 / compliance cert', severity: 'high',   source: 'cold read · today'       },
          { label: 'Supplier verification gap',  severity: 'high',   source: 'manual · not documented' },
          { label: 'No digital audit trail',     severity: 'high',   source: 'manual · not configured' },
          { label: 'MFA not enforced',           severity: 'medium', source: 'Okta · 1h ago'           },
        ],
        evidence: [
          { label: 'Data room',         state: 'active',    note: 'open · Notion'          },
          { label: 'Cap table',         state: 'active',    note: 'Carta · clean'          },
          { label: 'Cyber insurance',   state: 'scheduled', note: 'Coalition · Q2'         },
          { label: 'SSL certificate',   state: 'active',    note: 'Cloudflare · valid'     },
          { label: 'SOC 2',            state: 'missing',   note: 'no auditor engaged'     },
          { label: 'Supplier records',  state: 'missing',   note: 'manual / WhatsApp only' },
        ],
        questions: [
          'How long until provenance evidence is investor-grade?',
          'What happens if a supplier is compromised mid-raise?',
          "What's the runway versus the remediation timeline?",
        ],
      },
      vendors: {
        summary: "Six vendors matched to the gaps. The sequence matters — what you adopt first signals what you're prioritising.",
        vendors: [
          { name: 'Vanta',       category: 'Compliance', priority: 'start_here',  why: 'Fastest path to compliance evidence at seed stage',              addresses: 'No SOC 2 evidence' },
          { name: 'Cloudflare',  category: 'Security',   priority: 'recommended', why: 'Edge security + DDoS in one pass — critical for food retail',    addresses: 'SSL · access control baseline' },
          { name: 'Coalition',   category: 'Insurance',  priority: 'recommended', why: 'Cyber insurance triggered by supply chain exposure profile',      addresses: 'Supply chain risk' },
          { name: 'Drata',       category: 'Compliance', priority: 'considered',  why: 'Alternative to Vanta if auditor flexibility matters',            addresses: 'No SOC 2 evidence' },
        ],
      },
      aws: {
        summary: "Still on Shopify infrastructure — AWS program eligibility requires an AWS footprint. Two programs will unlock when the blockchain layer moves to AWS in Stage 3.",
        programs: [
          { name: 'AWS Activate',     status: 'not_enrolled', value: 'Up to $5k credits', detail: 'Shopify stack not eligible — needs AWS infra first' },
          { name: 'Well-Architected', status: 'not_enrolled', value: 'Free review',        detail: 'Available once on AWS infrastructure'               },
        ],
      },
      microsoft: {
        summary: "Two Microsoft programs available at seed stage. Founders Hub is the single fastest infrastructure decision — $150k in credits, 20-minute application, available now.",
        programs: [
          { name: 'Microsoft for Startups Founders Hub', status: 'available',    value: 'Up to $150k Azure credits + GitHub Enterprise', detail: 'Seed stage qualifies · apply now', url: 'https://www.microsoft.com/en-us/startups'       },
          { name: 'Ingram Micro Xvantage — CSP',         status: 'eligible',     value: 'Microsoft 365 via CSP',                         detail: 'Available through Ingram Micro ANZ channel', url: 'https://xvantage.ingrammicro.com'              },
        ],
      },
      posture: {
        summary: "Two checks. Enough to answer the first line of a security questionnaire. Not enough to satisfy enterprise procurement or a serious investor.",
        items: [
          { label: 'SSL / TLS',         status: 'Valid',            severity: 'ok',     source: 'Cloudflare · live'      },
          { label: 'Access Control',    status: 'Basic audit done', severity: 'ok',     source: 'manual · 2w ago'        },
          { label: 'Breach Monitor',    status: 'Not configured',   severity: 'high',   source: 'no integration'         },
          { label: 'Supplier Records',  status: 'Manual only',      severity: 'high',   source: 'no system'              },
          { label: 'MFA Enforcement',   status: 'Not enforced',     severity: 'medium', source: 'Okta · 1h ago'          },
          { label: 'Data Privacy',      status: 'Unknown',          severity: 'unknown', source: 'no integration'        },
        ],
      },
      spv: {
        status: 'In progress',
        summary: "SAFE documentation being prepared. No SPV structure yet — the protocol IP and the DTC business are still in one entity. Investors are being asked to take on both.",
        fields: [
          { label: 'Entity status',  value: 'Pty Ltd',         color: 'umber'   },
          { label: 'Trust score',    value: '38 / 100',        color: 'umber'   },
          { label: 'SAFE / docs',    value: 'In progress',     color: 'umber'   },
          { label: 'Investor links', value: '0 sent',          color: 'inkSoft' },
        ],
      },
    },
  },

  {
    label: 'Protocol',
    desc: 'Blockchain provenance live. Origin on-chain. B2B enterprise-grade supply chain.',
    stageMsg: {
      persona: 'edison',
      content: "The blockchain play changed the buyer conversation entirely. Any distributor, hospital, or export partner can now verify the honey's origin, batch details, and supplier access trail without calling Hive & Co. That's what took the posture score from 38 to 84 — not fixing a gap, but building a system that makes compliance evidence automatic.",
    },
    spaces: {
      investor: { lit: true, sub: 'Score 84',   persona: 'sofia',    msg: "Score 84 is unusual for a food brand at this stage. Blockchain provenance generates compliance evidence automatically. Investors who've seen food supply chain fraud respond to that very differently than to a manually-assembled data room." },
      vendors:  { lit: true, sub: '8 matched',  persona: 'leonardo', msg: "Eight vendor matches. The two additions over Stage 2 are blockchain infrastructure vendors — one for on-chain attestation, one for the enterprise API connecting provenance to buyer procurement platforms." },
      aws:       { lit: true, sub: '2 eligible', persona: 'edison',   msg: "Two AWS programs now in play. Blockchain infrastructure qualifies for Activate credits; data volume triggers a second program. Roughly $50k in credits." },
      microsoft: { lit: true, sub: '4 programs', persona: 'leonardo', msg: "Four Microsoft programs matched once the B2B platform went live. The Ingram Micro AMP assessment is free and available now — that's the immediate priority. Founders Hub covers the Azure migration. Marketplace listing is the Phase 2 play." },
      posture:  { lit: true, sub: '9 checks',   persona: 'edison',   msg: "Nine checks. The blockchain layer introduced audit-trail-by-default. Every batch record, every access event, logged on-chain. A security questionnaire that took three weeks now takes three minutes." },
      spv:      { lit: true, sub: 'Draft',      persona: 'sofia',    msg: "SPV in draft — the provenance protocol carved out as a separate investable entity from the honey brand. Investors can take the IP without the operational DTC risk." },
    },
    panel: {
      investor: {
        score: 84,
        peer: 'top 8% of food-sector seed raises',
        delta: '+46 since seed raise stage',
        summary: "Top tier for this stage and sector. The blockchain provenance layer generates compliance evidence automatically — which is what institutional investors in food supply chains need to see. Every gap that remains is operational, not structural.",
        gaps: [
          { label: 'SOC 2 Type II not filed',        severity: 'medium', source: 'Vanta · in progress'  },
          { label: 'Enterprise contracts not signed', severity: 'medium', source: 'pipeline · 2 in NDA'  },
        ],
        evidence: [
          { label: 'Blockchain provenance',  state: 'active',    note: 'live · origin on-chain'     },
          { label: 'Data room',             state: 'active',    note: 'full · investor-grade'       },
          { label: 'Cyber insurance',       state: 'active',    note: 'Coalition · renewed'         },
          { label: 'SOC 2 Type I',          state: 'active',    note: 'Vanta · filed'               },
          { label: 'Supplier API',          state: 'active',    note: 'on-chain audit trail'        },
          { label: 'SPV structure',         state: 'scheduled', note: 'draft · legal in progress'   },
        ],
        questions: [
          'What is the cost of running the protocol at scale?',
          'Which enterprise buyers are in the pipeline right now?',
          'What does the protocol licensing model look like?',
        ],
      },
      vendors: {
        summary: "Eight vendors across the stack. Two additions in Stage 3 are blockchain infrastructure — the layer that changed the investor conversation.",
        vendors: [
          { name: 'Vanta',         category: 'Compliance',   priority: 'start_here',  why: 'SOC 2 automated — compliance evidence by default',               addresses: 'Compliance certification'    },
          { name: 'Cloudflare',    category: 'Security',     priority: 'recommended', why: 'Edge + Zero Trust protecting the provenance API',                addresses: 'API security · edge'         },
          { name: 'AWS',           category: 'Infrastructure', priority: 'recommended', why: 'Blockchain infra on AWS — unlocks Activate + ISV programs',    addresses: 'Infrastructure · cost'       },
          { name: 'Polygon / L2',  category: 'Blockchain',   priority: 'recommended', why: 'On-chain provenance attestation layer for origin records',       addresses: 'Provenance verification'    },
          { name: 'Coalition',     category: 'Insurance',    priority: 'recommended', why: 'Cyber insurance scaled for B2B supply chain exposure',           addresses: 'Supply chain risk'           },
          { name: 'ChainPoint',    category: 'Blockchain',   priority: 'considered',  why: 'Enterprise API connecting on-chain records to buyer procurement', addresses: 'B2B integration layer'      },
        ],
      },
      aws: {
        summary: "Two programs active. Blockchain infrastructure moved the eligibility needle from zero to two programs worth approximately $50k in credits.",
        programs: [
          { name: 'AWS Activate',       status: 'available',    value: '$25k credits',  detail: 'Blockchain infra qualifies · active now'              },
          { name: 'AWS ISV Accelerate', status: 'eligible',     value: 'Co-sell motion', detail: 'Marketplace listing in progress'                     },
          { name: 'Well-Architected',   status: 'available',    value: 'Free review',   detail: 'Schedule now — provenance API architecture review'   },
          { name: 'AWS Marketplace',    status: 'not_enrolled', value: 'Protocol listing', detail: 'Phase 2 after ISV Accelerate'                      },
        ],
      },
      microsoft: {
        summary: "Four Microsoft programs matched. The Ingram Micro AMP assessment is free and available now — the fastest path to funded Azure infrastructure. Founders Hub credits cover the migration cost.",
        programs: [
          { name: 'Microsoft for Startups Founders Hub',  status: 'available',    value: 'Up to $150k Azure credits + GitHub Enterprise + M365', detail: 'Series A stage qualifies · apply now',                      url: 'https://www.microsoft.com/en-us/startups'                             },
          { name: 'Ingram Micro AMP — Azure Assessment',  status: 'available',    value: 'Free Azure assessment + migration planning',            detail: 'Free via Ingram channel (ANZ) — no Azure footprint needed', url: 'https://www.ingrammicro.com/en-AU/services/microsoft'                 },
          { name: 'Ingram Micro Xvantage — CSP',          status: 'eligible',     value: 'Microsoft 365 via CSP',                                 detail: 'Bundled with Ingram cloud management tooling',              url: 'https://xvantage.ingrammicro.com'                                     },
          { name: 'Azure Marketplace Seller',             status: 'not_enrolled', value: 'Transact listing + 10% marketplace reward',             detail: 'Phase 2 — after Founders Hub onboarding + Series A',        url: 'https://partner.microsoft.com/en-us/partnership/azure-marketplace'    },
        ],
      },
      posture: {
        summary: "Nine checks. The blockchain layer made audit-trail-by-default a reality across the supply chain. Evidence that previously took weeks to assemble now takes minutes.",
        items: [
          { label: 'SSL / TLS',           status: 'Verified',            severity: 'ok',   source: 'Cloudflare · live'       },
          { label: 'Access Control',      status: 'Role-based enforced', severity: 'ok',   source: 'Okta · live'             },
          { label: 'Breach Monitor',      status: 'Active',              severity: 'ok',   source: 'Cloudflare · live'       },
          { label: 'Supplier Records',    status: 'On-chain',            severity: 'ok',   source: 'Blockchain · live'       },
          { label: 'Batch Traceability',  status: 'Verified',            severity: 'ok',   source: 'Blockchain · live'       },
          { label: 'MFA Enforcement',     status: 'Enforced',            severity: 'ok',   source: 'Okta · live'             },
          { label: 'Data Privacy',        status: 'Documented',          severity: 'ok',   source: 'Vanta · live'            },
          { label: 'SOC 2 Type I',        status: 'Filed',               severity: 'ok',   source: 'Vanta · filed'           },
          { label: 'Backup Recovery',     status: 'Verified',            severity: 'ok',   source: 'AWS · 4h ago'            },
        ],
      },
      spv: {
        status: 'Draft',
        summary: "Protocol IP being carved into a separate SPV — the blockchain provenance layer as a standalone investable entity. DTC honey brand stays as the operating company. Investors can take the IP without the retail risk.",
        fields: [
          { label: 'Entity status',   value: 'SPV in draft',     color: 'plum'    },
          { label: 'Trust score',     value: '84 / 100',         color: 'plum'    },
          { label: 'Protocol IP',     value: 'Being carved out', color: 'umber'   },
          { label: 'Investor links',  value: '3 in NDA',         color: 'umber'   },
        ],
      },
    },
  },
];
