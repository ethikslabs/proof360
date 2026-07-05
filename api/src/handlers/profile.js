import {
  appendTransaction,
  getOrCreateActiveProfile,
  getOrCreateFounder,
  replayProfile,
} from '../services/memory-store.js';
import { buildProfileEventRecords } from '../services/memory-derive.js';
import { buildProfileProjections } from '../services/profile-projections.js';

async function currentProfileFor(request) {
  const founder = await getOrCreateFounder(request.authUser);
  const profile = await getOrCreateActiveProfile(founder);
  return { founder, profile };
}

function publicSnapshot(snapshot) {
  return {
    profile: snapshot.profile,
    reconstructed_at: snapshot.reconstructed_at,
    current_claims: snapshot.current_claims,
    observations: snapshot.observations,
    evidence_count: snapshot.evidence.length,
    event_count: snapshot.events.length,
    claim_count: snapshot.claims.length,
    transaction_count: snapshot.transactions.length,
  };
}

export async function profileCurrentHandler(request, reply) {
  const { founder, profile } = await currentProfileFor(request);
  const snapshot = await replayProfile(profile.id);
  return reply.send({
    founder: {
      id: founder.id,
      email: founder.email,
      name: founder.name,
    },
    profile,
    snapshot: publicSnapshot(snapshot),
  });
}

export async function profileProjectionsHandler(request, reply) {
  const { profile } = await currentProfileFor(request);
  const snapshot = await replayProfile(profile.id);
  return reply.send(buildProfileProjections(snapshot));
}

export async function profileEventsHandler(request, reply) {
  const { profile } = await currentProfileFor(request);
  const records = buildProfileEventRecords(profile, request.body || {});
  const tx = await appendTransaction(profile.id, records, {
    route: 'POST /api/v1/profile/current/events',
    source: request.body?.source || 'chat',
  });
  const snapshot = await replayProfile(profile.id);
  return reply.status(201).send({
    tx_id: tx.tx_id,
    profile_id: profile.id,
    record_count: tx.records.length,
    snapshot: publicSnapshot(snapshot),
  });
}
