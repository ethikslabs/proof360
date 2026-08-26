// The inference market, as this product argues it: four providers on one seam,
// because "which model answered you" is a question a trust product has to be able
// to answer out loud. The breadth is the point — NIM, Gemini and Perplexity are in
// the frame on purpose.
//
// `served` is the honesty flag, and it must track the API's SERVED_MODELS
// whitelist (api/src/handlers/session-chat.js). Until 2026-08-26 there was no such
// flag: the chip read "● Claude Sonnet 4.6 · Bedrock" over answers signed
// claude-haiku-4-5-20251001, because the handler hardcoded Haiku and never read
// the override the picker had been sending all along. Anything unserved is shown
// and marked, never silently answered as something else.
export const VECTOR_MODELS = [
  { id: 'claude-sonnet-4-6',  label: 'Claude Sonnet 4.6', desc: 'Balanced · everyday work',    provider: 'Bedrock',  providerColor: '#c07a00', served: true },
  { id: 'claude-haiku-4-5',   label: 'Claude Haiku 4.5',  desc: 'Fast · low latency',           provider: 'Bedrock',  providerColor: '#c07a00', served: true },
  { id: 'claude-opus-4-7',    label: 'Claude Opus 4.7',   desc: 'Most capable · deep analysis', provider: 'Bedrock',  providerColor: '#c07a00', served: false },
  { id: 'llama-nemotron',     label: 'Llama Nemotron',    desc: '253B · open weights',          provider: 'NVIDIA',   providerColor: '#527a00', served: false },
  { id: 'gemini-flash',       label: 'Gemini 2.0 Flash',  desc: 'Fast · multimodal',            provider: 'Google',   providerColor: '#1a56c2', served: false },
  { id: 'perplexity-sonar',   label: 'Perplexity Sonar',  desc: 'Real-time · cited sources',    provider: 'Live',     providerColor: '#7c3aed', served: false },
  { id: 'gpt-4o',             label: 'GPT-4o',            desc: 'OpenAI · via Azure',           provider: 'Foundry',  providerColor: '#0063a8', served: false },
];
