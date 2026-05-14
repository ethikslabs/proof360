export function getMockEvidence() {
  return [
    { id: 'e1', source_type: 'public_source', source_name: 'Perplexity AI', summary: 'Manuka honey fraud has led to several enforcement actions in NZ and AU — origin certification is material to buyer trust.', timestamp: new Date().toISOString(), visibility: 'shareable' },
    { id: 'e2', source_type: 'public_source', source_name: 'Gemini / FSANZ', summary: 'Food Standards Australia requires origin labelling. Export markets have stricter requirements — NZ has specific Manuka grading.', timestamp: new Date().toISOString(), visibility: 'shareable' },
    { id: 'e3', source_type: 'model_output', source_name: 'Claude Sonnet (synthesis)', summary: 'Combined market signals and regulatory context into trust gap assessment and vendor timing recommendations.', timestamp: new Date().toISOString(), visibility: 'internal' },
  ];
}
