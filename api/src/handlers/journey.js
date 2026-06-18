import memPool from '../memory/db.js';
import { journey, companyForFounder } from '../memory/journey.js';

// Map an authenticated user to a person entity via entity.ref (ref == Auth0 sub).
export async function resolveFounderEntity(authUser, client = memPool) {
  if (!authUser?.sub) return null;
  const { rows } = await client.query(
    `SELECT entity_id, corpus_id, name FROM entity WHERE ref = $1 AND type = 'person' LIMIT 1`,
    [authUser.sub]);
  return rows[0] || null;
}

export async function journeyHandler(request, reply) {
  const founder = await resolveFounderEntity(request.authUser);
  if (!founder) return reply.send({ founder: null, company: null, entries: [] });

  const company = await companyForFounder(founder.entity_id);
  if (!company) return reply.send({ founder: { name: founder.name }, company: null, entries: [] });

  const { entries } = await journey(founder.entity_id, company.entity_id);
  return reply.send({
    founder: { name: founder.name },
    company: { name: company.name },
    entries,
  });
}

// Demo preHandler: stand in for requireAuth when DEMO_FOUNDER_MODE is set, so the seeded
// demo founder renders locally without a real Auth0 token. Never used when the flag is off.
export async function demoAuth(request) {
  request.authUser = { sub: 'demo-founder' };
}
