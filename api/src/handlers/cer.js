// cer.js — the founder-side CER (Commercial Engagement Record) endpoints.
// All operate on the caller's OWN profile ("current"); CERs are appended to the same
// founder-memory transaction log as facts, and read back through cerProjection(). No
// mutation-in-place: create, consent-withdraw, and status changes are all appends.
import {
  appendTransaction,
  getOrCreateActiveProfile,
  getOrCreateFounder,
  replayProfile,
} from '../services/memory-store.js';
import {
  buildCerRecords,
  buildConsentWithdrawnRecord,
  buildStatusUpdatedRecord,
  cerProjection,
} from '../services/cer-projection.js';
import { CER_ROUTES } from '../config/cer-routes.js';

async function currentProfileFor(request) {
  const founder = await getOrCreateFounder(request.authUser);
  const profile = await getOrCreateActiveProfile(founder);
  return { founder, profile };
}

async function currentCers(profileId) {
  return cerProjection(await replayProfile(profileId));
}

function findCer(cers, cerId) {
  return cers.find((c) => c.cer_id === cerId) || null;
}

// GET /api/v1/profile/current/cers
export async function cersListHandler(request, reply) {
  const { profile } = await currentProfileFor(request);
  return reply.send({ cers: await currentCers(profile.id) });
}

// POST /api/v1/profile/current/cers  — create a CER (decision + consent-granted)
export async function cerCreateHandler(request, reply) {
  const { profile } = await currentProfileFor(request);
  const body = request.body || {};
  if (!body.route || !CER_ROUTES[body.route]) {
    return reply.status(400).send({ error: 'unknown_or_missing_route' });
  }

  let built;
  try {
    built = buildCerRecords({
      route: body.route,
      pathway_type: body.pathway_type,
      recommendation_id: body.recommendation_id || null,
      evidence_refs: Array.isArray(body.evidence_refs) ? body.evidence_refs : [],
      person_id: body.person_id || null,
      company_id: body.company_id || null,
      actor: 'founder',
    });
  } catch (err) {
    return reply.status(400).send({ error: err.message });
  }

  await appendTransaction(profile.id, built.records, {
    route: 'POST /api/v1/profile/current/cers',
    source: 'founder',
  });
  const cer = findCer(await currentCers(profile.id), built.cerId);
  return reply.status(201).send({ cer });
}

// POST /api/v1/profile/current/cers/:cerId/consent-withdraw
export async function cerConsentWithdrawHandler(request, reply) {
  const { profile } = await currentProfileFor(request);
  const { cerId } = request.params;
  if (!findCer(await currentCers(profile.id), cerId)) {
    return reply.status(404).send({ error: 'cer_not_found' });
  }

  const record = buildConsentWithdrawnRecord(cerId, {
    actor: 'founder',
    reason: request.body?.reason || null,
  });
  await appendTransaction(profile.id, [record], {
    route: 'POST /api/v1/profile/current/cers/:cerId/consent-withdraw',
    source: 'founder',
  });
  return reply.send({ cer: findCer(await currentCers(profile.id), cerId) });
}

// POST /api/v1/profile/current/cers/:cerId/status  — admin status set (§6 transitions)
export async function cerStatusHandler(request, reply) {
  const { profile } = await currentProfileFor(request);
  const { cerId } = request.params;
  const to = request.body?.status;
  if (!to) return reply.status(400).send({ error: 'status_required' });

  const existing = findCer(await currentCers(profile.id), cerId);
  if (!existing) return reply.status(404).send({ error: 'cer_not_found' });

  // Default-deny on consent: once the founder withdraws consent the CER is terminal for admin
  // transitions — no Booking/updating an engagement the founder pulled out of. Require an
  // explicit granted state; withdrawn (or any non-granted) fails closed (CER-CONSENT-GATES-001).
  if (existing.consent_state !== 'granted') {
    return reply.status(409).send({ error: 'consent_withdrawn' });
  }

  let record;
  try {
    // Transition is validated against admin_status (the stored status), not the
    // consent-overridden display status.
    record = buildStatusUpdatedRecord(cerId, {
      from: existing.admin_status,
      to,
      actor: 'ethiks360_admin',
    });
  } catch (err) {
    return reply.status(409).send({ error: err.message });
  }

  await appendTransaction(profile.id, [record], {
    route: 'POST /api/v1/profile/current/cers/:cerId/status',
    source: 'ethiks360_admin',
  });
  return reply.send({ cer: findCer(await currentCers(profile.id), cerId) });
}
