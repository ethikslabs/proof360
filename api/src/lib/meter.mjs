// proof360 usage meter — binds this repo's identity (actor/spv) and delegates to the vendored
// @ethikslabs/meter (usage-meter.mjs). Identity mirrors the AWS tags: Owner=ethikslabs,
// EthiksLabs:SPV=proof360. Call sites just pass provider/model/tokens.
//
// Captures LLM token usage at the call site (the only place that knows WHO). Complementary to
// services/consumption-emitter.js, which records non-LLM external data-API units (firecrawl/hibp/…).
import * as base from './usage-meter.mjs';

const SPV = process.env.ETHIKS_SPV || 'proof360';
const ACTOR = process.env.ETHIKS_ACTOR || 'ethikslabs';

export const emit = (fields = {}) => base.emit({ spv: SPV, actor: ACTOR, ...fields });
export const extractUsage = base.extractUsage;
export const providerForModel = base.providerForModel;
export default { emit, extractUsage, providerForModel };
