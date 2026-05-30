// proof360.au/live — verification console handlers.
// Thin Fastify wrappers over the ephemeral attestation sandbox.
import { randomUUID } from 'node:crypto';
import { mint, tamper, attest, status } from '../lab/sandbox.js';

export async function liveMintHandler(request, reply) {
  const session_id = request.body?.session_id || randomUUID();
  try {
    const result = await mint(session_id);
    return { session_id, ...result };
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'mint_failed', message: err.message });
  }
}

export async function liveTamperHandler(request, reply) {
  const session_id = request.body?.session_id;
  if (!session_id) return reply.code(400).send({ error: 'missing_session', message: 'session_id required — mint first.' });
  return tamper(session_id);
}

export async function liveAttestHandler(request, reply) {
  const claim = request.body?.claim;
  try {
    return await attest(claim);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'attest_failed', message: err.message });
  }
}

export async function liveStatusHandler() {
  return status();
}
