import {
  appendTransaction,
  getOrCreateActiveProfile,
  getOrCreateFounder,
  replayProfile,
} from '../services/memory-store.js';
import { buildProfileEventRecords } from '../services/memory-derive.js';
import { buildProfileProjections } from '../services/profile-projections.js';
import { getSession } from '../services/session-store.js';
import { sumUsage } from '../services/session-usage.js';

// The account's token count (R7, step 4): the sum over every session attached to this profile
// that the box still holds (sessions persist 30 days). Tokens only; `sessions_held` says how many
// of the attached sessions were countable, so an old session is an honest gap, not a zero.
function accountUsage(snapshot) {
  const ids = new Set();
  for (const tx of snapshot?.transactions || []) {
    const sid = tx?.session_id || tx?.meta?.session_id || tx?.metadata?.session_id;
    if (sid) ids.add(sid);
  }
  const held = [...ids].map((id) => getSession(id)).filter(Boolean);
  const total = sumUsage(held);
  return { sessions_attached: ids.size, sessions_held: held.length, calls: total.calls, tokens: total.tokens };
}

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
    usage: accountUsage(snapshot),
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
