// The Capital Rosetta join algebra — §5 of _working/2026-08-28-capital-rosetta-schema.md,
// ratified 2026-09-03. Pure functions over an entity claim set and an instrument record.
//
//   readiness(E, I):
//     for each class C in I.requires:     held ≥ needed → SATISFIED(C) else GAP(C, distance)
//     for each class C held by E, C ∉ I.requires ∪ I.helpful → UNPRICED(C)
//     for each condition D in I.disqualifiers: E satisfies D → BLOCKED(D)   # terminates; no score
//
// Four cells: held×required = SATISFIED, held×not-required = UNPRICED (the routing
// primitive — the only cell that points outward), not-held×required = GAP,
// not-held×not-required = NOISE. BLOCKED is not a gap: no evidence fixes it.
//
// Rule 10 of the register: nothing is ranked inside it. Nothing here emits a score, a
// weight or an order other than the register's own. The readiness vector is one result
// per instrument; the disagreement between them is the information.

export const CLASSES = Object.freeze([
  'IDENT', 'FNDR', 'PROB', 'PROD', 'TRAC', 'UNIT', 'FIN', 'CASH', 'GOV', 'USE', 'EXIT', 'REL', 'IMPACT', 'OPS',
]);

// Ordinal. An instrument requires a class AT a threshold; "held ≥ needed" is index order.
export const CONFIDENCE = Object.freeze(['absent', 'asserted', 'probable', 'confirmed']);

export const FAMILIES = Object.freeze([
  'equity', 'debt', 'non-dilutive', 'customer', 'strategic', 'structured', 'digital', 'human', 'exotic',
]);

const level = (c) => {
  const i = CONFIDENCE.indexOf(c);
  return i === -1 ? 0 : i; // unknown reads as absent — fail closed
};
const isHeld = (c) => level(c) > 0;

// A disqualifier is a data condition over the entity's facts. An absent fact does not
// pass: a condition we cannot evaluate blocks, it does not wave through.
function satisfies(facts, test) {
  if (!test || typeof test !== 'object') return false;
  const has = facts && Object.prototype.hasOwnProperty.call(facts, test.field);
  const v = has ? facts[test.field] : undefined;
  switch (test.op) {
    case 'eq':     return has && v === test.value;
    case 'neq':    return !has || v !== test.value;
    case 'in':     return has && Array.isArray(test.value) && test.value.includes(v);
    case 'nin':    return !has || !Array.isArray(test.value) || !test.value.includes(v);
    case 'gte':    return has && typeof v === 'number' && v >= test.value;
    case 'lte':    return has && typeof v === 'number' && v <= test.value;
    case 'truthy': return has && Boolean(v);
    case 'falsy':  return !has || !v;
    default:       return false;
  }
}

export function readiness(entity, instrument) {
  const held = entity?.held || {};
  const facts = entity?.facts || {};
  const requires = instrument?.requires || {};
  const helpful = instrument?.helpful || {};
  const priced = new Set([...Object.keys(requires), ...Object.keys(helpful)]);

  const satisfied = [], gaps = [];
  for (const [cls, needed] of Object.entries(requires)) {
    const h = held[cls] || 'absent';
    const distance = level(needed) - level(h);
    if (distance <= 0) satisfied.push({ class: cls, held: h, needed });
    else gaps.push({ class: cls, held: h, needed, distance });
  }

  const unpriced = [], noise = [];
  for (const cls of CLASSES) {
    if (priced.has(cls)) continue;
    (isHeld(held[cls]) ? unpriced : noise).push(cls);
  }

  const helpfulOut = { satisfied: [], missing: [] };
  for (const [cls, needed] of Object.entries(helpful)) {
    (level(held[cls]) >= level(needed) ? helpfulOut.satisfied : helpfulOut.missing).push(cls);
  }

  // A disqualifier with a structured `test` is evaluated. One that is prose only (the
  // register's own records are written that way today) is UNEVALUATED — listed, never
  // silently passed. Could-not-look is not the same as looked-and-found-nothing.
  const blocked = [], unevaluated = [];
  for (const d of instrument?.disqualifiers || []) {
    if (!d?.test) unevaluated.push({ id: d.id, description: d.description });
    else if (satisfies(facts, d.test)) blocked.push({ id: d.id, description: d.description });
  }

  return {
    instrument_id: instrument?.id ?? null,
    satisfied,
    gaps,
    unpriced,
    noise,
    helpful: helpfulOut,
    blocked,
    unevaluated,
    reachable: blocked.length === 0 && gaps.length === 0,
  };
}

// One result per instrument, register order. Never a scalar.
export function readinessVector(entity, register) {
  return (register || []).map((i) => readiness(entity, i));
}

// The UNPRICED set inverted: for each class the entity holds that a given instrument does
// not price, which instruments in the register do. Route candidates, unranked.
export function unpricedInversion(entity, register) {
  const out = {};
  const vec = readinessVector(entity, register);
  const holds = new Set(vec.flatMap((r) => r.unpriced));
  for (const cls of CLASSES) {
    if (!holds.has(cls)) continue;
    const takers = (register || [])
      .filter((i) => cls in (i.requires || {}) || cls in (i.helpful || {}))
      .map((i) => i.id);
    if (takers.length) out[cls] = takers;
  }
  return out;
}

// The register's own rules, applied to one record. Errors reject; warnings carry.
export function validateInstrument(record) {
  const errors = [], warnings = [];
  if (!record || typeof record !== 'object') return { ok: false, errors: ['not_an_object'], warnings };
  if (!FAMILIES.includes(record.family)) errors.push(`family_not_in_enum:${record.family}`);
  for (const key of ['requires', 'helpful']) {
    for (const [cls, conf] of Object.entries(record[key] || {})) {
      if (!CLASSES.includes(cls)) errors.push(`unknown_class:${cls}`);
      if (!CONFIDENCE.includes(conf)) errors.push(`unknown_confidence:${cls}=${conf}`);
    }
  }
  for (const cls of record.irrelevant || []) if (!CLASSES.includes(cls)) errors.push(`unknown_class:${cls}`);
  if (record.disqualifiers && !Array.isArray(record.disqualifiers)) errors.push('disqualifiers_not_array');
  for (const d of record.disqualifiers || []) {
    if (!d?.id || !d?.description) errors.push(`disqualifier_incomplete:${d?.id ?? '?'}`);
    else if (!d.test) warnings.push(`disqualifier_unevaluable:${d.id}`); // prose only — the join lists it as unevaluated
  }
  if (!record.evidence?.last_verified) warnings.push('no_last_verified'); // "a record without a verification date is a rumour"
  return { ok: errors.length === 0, errors, warnings };
}
