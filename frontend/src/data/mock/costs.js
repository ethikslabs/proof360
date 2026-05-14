export function getMockCosts() {
  return [
    { id: 'c1', provider: 'perplexity', model: 'pplx-70b-online', purpose: 'Market signals — Manuka honey fraud and trust concerns', tokens_in: 1240, tokens_out: 842, estimated_cost_usd: 0.0032, changed_recommendation: true },
    { id: 'c2', provider: 'google/gemini', model: 'gemini-1.5-flash', purpose: 'Regulatory context — FSANZ, export standards, hospital procurement', tokens_in: 2100, tokens_out: 1450, estimated_cost_usd: 0.0018, changed_recommendation: false },
    { id: 'c3', provider: 'anthropic/claude', model: 'claude-sonnet-4-6', purpose: 'Synthesis — investor narrative, enterprise DD view, vendor timing', tokens_in: 4800, tokens_out: 3200, estimated_cost_usd: 0.041, changed_recommendation: true },
  ];
}
