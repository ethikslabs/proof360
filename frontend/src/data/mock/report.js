export function getMockReport() {
  return {
    generated_at: new Date().toISOString(),
    company: "King's Cross Honey",
    sections: [
      { id: 's1', title: 'Company context', content: "Local honey producer at King's Cross markets. Interest from cafés, hospitals, and export channels. Possible investment path." },
      { id: 's2', title: 'What we think you are', content: 'Early-stage founder-led product business with a trusted local brand and emerging B2B demand.' },
      { id: 's3', title: 'What you are becoming', content: 'A regulated supply chain participant. The moment hospitals or export enters the picture, trust becomes infrastructure.' },
      { id: 's4', title: 'Current trust signals', content: 'Strong: local market presence, word-of-mouth, product quality. Weak: formal provenance trail, digital identity, supplier documentation.' },
      { id: 's5', title: 'Missing proof and gaps', content: 'No formal origin certification. No supplier risk documentation. No digital identity or access controls. No insurance coverage mapped to supply chain risk.' },
      { id: 's6', title: 'Investor lens', content: "You've burned capital on a real opportunity. Investors will accept that — if you can prove it was intentional and teachable. They'll ask: where did the money go, and what did it prove? Is the supply chain defensible at scale? What evidence exists beyond the founder's word? The capital story needs provenance the same way the product does. These gaps are fixable — but they must be addressed before the data room opens, not inside it." },
      { id: 's7', title: 'Enterprise buyer lens', content: 'Hospitals and large cafés need: traceability to origin, supplier controls, data handling evidence if ordering is digital, and a contact person with documented authority.' },
      { id: 's8', title: 'Technical and DD lens', content: 'When digital orders begin: identity (who can access the system), data handling (supplier and customer records), and audit trail (what changed, when, by whom) all become material.' },
      { id: 's9', title: 'Recommended next conversations', content: '1. Food Standards Australia New Zealand (FSANZ) on labelling and origin claims. 2. A supply chain insurance broker. 3. A digital identity starter (MFA, basic access controls). 4. An investor with food/agri experience.' },
      { id: 's10', title: 'Vendor shortlist', content: 'See vendor shortlist panel.' },
      { id: 's11', title: 'Maturity timeline', content: 'Now: basic identity controls, supplier documentation template. Soon: formal provenance trail, insurance review. Later: enterprise compliance readiness, export certification.' },
      { id: 's12', title: 'Evidence and provenance', content: 'This report draws on: public Manuka honey fraud cases (Perplexity), FSANZ food labelling standards (Gemini), hospital procurement requirements (internal model). No private data was used.' },
      { id: 's13', title: 'Report metadata', content: 'Generated: ' + new Date().toLocaleDateString('en-AU') + '. Models used: Perplexity (market signals), Gemini (regulatory context), Claude Sonnet (synthesis). Status: draft — refine via conversation.' },
    ],
  };
}
