import { getSession } from '../services/session-store.js';
import {
  appendTransaction,
  claimSessionForProfile,
  getOrCreateActiveProfile,
  getOrCreateFounder,
  replayProfile,
} from '../services/memory-store-file.js';
import { buildSessionAttachRecords } from '../services/memory-derive.js';
import { buildProfileProjections } from '../services/profile-projections.js';

export async function sessionAttachHandler(request, reply) {
  const { sessionId } = request.params;
  const session = getSession(sessionId);
  if (!session) {
    return reply.status(404).send({ error: 'session_not_found' });
  }
  if (session.infer_status !== 'complete') {
    return reply.status(425).send({ error: 'session_not_ready', infer_status: session.infer_status });
  }

  const founder = await getOrCreateFounder(request.authUser);
  const profile = await getOrCreateActiveProfile(founder);

  try {
    await claimSessionForProfile(profile, sessionId);
  } catch (err) {
    if (err.code === 'SESSION_ALREADY_ATTACHED') {
      return reply.status(409).send({ error: 'session_already_attached' });
    }
    throw err;
  }

  const records = buildSessionAttachRecords(profile, session);
  const tx = await appendTransaction(profile.id, records, {
    route: 'POST /api/v1/sessions/:sessionId/profile',
    source: 'cold_read',
    session_id: sessionId,
  });
  const snapshot = await replayProfile(profile.id);

  return reply.status(201).send({
    tx_id: tx.tx_id,
    profile_id: profile.id,
    attached_session_id: sessionId,
    projections: buildProfileProjections(snapshot),
  });
}
