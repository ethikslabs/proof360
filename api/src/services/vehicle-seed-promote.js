// Promotes John's hand-authored vehicle seed
// (_working/04_SITES/hiveandco-vehicle-filled.seed.json) into vehicle.v1 facts.
//
// His seed already encodes the product: every field is a [value, badge] pair, so the receipt
// lives in the data structure rather than being bolted on afterwards. This function only
// renames what he already built — it invents nothing.
//
// The badge vocabulary is exactly two values, LIVE and ILLUSTRATIVE:
//   LIVE          -> layer 'inferred'. We observed it ourselves (cold read, headers, DNS).
//                    Not 'attested' — nobody third-party signed it, and over-claiming the
//                    layer would let a scrape outrank a founder's correction.
//   ILLUSTRATIVE  -> carried through with illustrative:true so it renders visibly as demo
//                    content and can never count as evidence (see isEvidenceBacked).
const LAYER_FOR = { LIVE: 'inferred', ILLUSTRATIVE: 'declared' };

function fact({ key, group, value, badge, source, observed_at }) {
  const label = badge?.label ?? 'ILLUSTRATIVE';
  return {
    key,
    group,
    value,
    layer: LAYER_FOR[label] ?? 'declared',
    source,
    observed_at,
    ...(label === 'ILLUSTRATIVE' ? { illustrative: true } : {}),
  };
}

export function promoteSeed(seed, { observed_at = new Date().toISOString() } = {}) {
  const facts = [];

  for (const [key, [value, badge]] of Object.entries(seed.identity ?? {})) {
    facts.push(fact({ key, group: 'identity', value, badge, source: 'cold-read', observed_at }));
  }

  const [contextValue, contextBadge] = seed.context ?? [];
  if (contextValue !== undefined) {
    facts.push(fact({
      key: 'synthesis', group: 'context', value: contextValue, badge: contextBadge,
      source: 'web-synthesis', observed_at,
    }));
  }

  return {
    vehicle_id: seed.vehicle_id,
    passport: seed.passport,
    owner: seed.owner,
    facts,
    // Domains and gaps keep his tuple order — [domain, rating, why, badge] and
    // [id, status, severity, why, badge] — named here so a lens can filter on them.
    trust_posture: {
      domains: (seed.trust_posture?.domains ?? []).map(([domain, rating, why, badge]) => ({
        domain, rating, why, receipt: badge?.label ?? null,
      })),
      gaps: (seed.trust_posture?.gaps ?? []).map(([id, status, severity, why, badge]) => ({
        id, status, severity, why, receipt: badge?.label ?? null,
      })),
    },
    engagements: seed.engagements ?? [],
    usage: (seed.usage ?? []).map(([label, value]) => ({ label, value })),
  };
}
