export function getThinkingSteps() {
  return [
    {
      id: 't1', label: 'Understanding your stage and intent',
      provider: 'internal', model: 'proof360 classifier',
      reference: 'Stage signals: capital raised, team size, first customers',
      status: 'complete', durationMs: 320,
    },
    {
      id: 't2', label: 'Checking public market signals',
      provider: 'perplexity', model: 'pplx-70b-online',
      reference: 'Live web search: industry trust requirements, recent enforcement actions',
      status: 'complete', durationMs: 1800,
    },
    {
      id: 't3', label: 'Mapping buyer expectations at this stage',
      provider: 'gemini', model: 'gemini-1.5-flash',
      reference: 'FSANZ food standards, hospital procurement rules, enterprise DD checklists',
      status: 'complete', durationMs: 1200,
    },
    {
      id: 't4', label: 'Identifying trust gaps and missing proof',
      provider: 'internal', model: 'proof360 gap engine',
      reference: '24-gap catalog matched against extracted signals',
      status: 'complete', durationMs: 450,
    },
    {
      id: 't5', label: 'Building investor narrative',
      provider: 'anthropic/claude', model: 'claude-sonnet-4-6',
      reference: 'Perplexity signals + gap map → investor framing',
      status: 'complete', durationMs: 2400,
    },
    {
      id: 't6', label: 'Preparing enterprise DD view',
      provider: 'anthropic/claude', model: 'claude-sonnet-4-6',
      reference: 'Gemini regulatory context + gap map → DD readiness',
      status: 'complete', durationMs: 1900,
    },
    {
      id: 't7', label: 'Selecting vendor shortlist',
      provider: 'internal', model: 'proof360 vendor router',
      reference: 'Confirmed gaps × stage × region → timing buckets',
      status: 'complete', durationMs: 280,
    },
  ];
}
