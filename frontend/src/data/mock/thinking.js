export function getThinkingSteps() {
  return [
    { id: 't1', label: 'Understanding your stage and intent', provider: 'internal', status: 'complete', durationMs: 320 },
    { id: 't2', label: 'Checking public market signals for this category', provider: 'perplexity', status: 'complete', durationMs: 1800 },
    { id: 't3', label: 'Mapping buyer expectations at this stage', provider: 'gemini', status: 'complete', durationMs: 1200 },
    { id: 't4', label: 'Identifying trust gaps and missing proof', provider: 'internal', status: 'complete', durationMs: 450 },
    { id: 't5', label: 'Building investor narrative', provider: 'anthropic/claude', status: 'complete', durationMs: 2400 },
    { id: 't6', label: 'Preparing enterprise DD view', provider: 'anthropic/claude', status: 'complete', durationMs: 1900 },
    { id: 't7', label: 'Estimating vendor categories', provider: 'internal', status: 'complete', durationMs: 280 },
  ];
}
