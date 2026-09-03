// The join algebra from the Capital Rosetta (ratified 2026-09-03), §5 — as written, not as
// the lab prototyped it. Four cells: SATISFIED / GAP / UNPRICED / NOISE, plus BLOCKED from
// disqualifiers only. No score, no rank: the readiness vector is one result per instrument
// in register order, and the disagreement between instruments is the information.
import { describe, it, expect } from 'vitest';
import {
  CLASSES, CONFIDENCE, FAMILIES,
  readiness, readinessVector, unpricedInversion, validateInstrument,
} from '../../src/utils/capitalJoin.js';

const SAFE = {
  id: 'safe_post', name: 'SAFE · post-money', family: 'equity', depth: 'D3',
  requires: { IDENT: 'probable', TRAC: 'asserted' },
  helpful: { FNDR: 'asserted' },
  irrelevant: ['UNIT'],
  disqualifiers: [
    { id: 'juris', description: 'not offered outside AU · SG · US', test: { field: 'jurisdiction', op: 'nin', value: ['AU', 'SG', 'US'] } },
  ],
  evidence: { last_verified: '2026-08-28' },
};
const RBF = {
  id: 'rbf', name: 'Revenue-based financing', family: 'debt', depth: 'D3',
  requires: { CASH: 'confirmed', TRAC: 'probable' },
  helpful: {},
  irrelevant: ['FNDR', 'PROB'],
  disqualifiers: [{ id: 'no-recurring', description: 'no contracted recurring revenue', test: { field: 'recurring_revenue', op: 'eq', value: false } }],
  evidence: { last_verified: '2026-08-28' },
};
const HIVE = {
  held: { IDENT: 'probable', TRAC: 'asserted', GOV: 'probable', PROD: 'confirmed', FNDR: 'asserted', FIN: 'absent', CASH: 'absent' },
  facts: { jurisdiction: 'AU', recurring_revenue: false },
};

describe('the vocabulary is the schema\'s', () => {
  it('fourteen classes, four confidence levels in order, nine families', () => {
    expect(CLASSES).toHaveLength(14);
    expect(CLASSES).toEqual(expect.arrayContaining(['IDENT', 'REL', 'IMPACT', 'OPS']));
    expect(CONFIDENCE).toEqual(['absent', 'asserted', 'probable', 'confirmed']);
    expect(FAMILIES).toEqual(['equity', 'debt', 'non-dilutive', 'customer', 'strategic', 'structured', 'digital', 'human', 'exotic']);
  });
});

describe('readiness(E, I) — four cells and blocked', () => {
  it('SATISFIED when held ≥ needed, GAP with the distance when not', () => {
    const r = readiness(HIVE, SAFE);
    expect(r.satisfied.map((c) => c.class)).toEqual(['IDENT', 'TRAC']);
    expect(r.gaps).toEqual([]);
    const r2 = readiness(HIVE, RBF);
    expect(r2.satisfied).toEqual([]);
    expect(r2.gaps).toEqual([
      { class: 'CASH', held: 'absent', needed: 'confirmed', distance: 3 },
      { class: 'TRAC', held: 'asserted', needed: 'probable', distance: 1 },
    ]);
  });

  it('UNPRICED is what the entity holds that the instrument neither requires nor finds helpful; NOISE is neither held nor required', () => {
    const r = readiness(HIVE, SAFE);
    // held: IDENT TRAC GOV PROD FNDR (FIN, CASH absent). SAFE requires IDENT TRAC, helpful FNDR.
    expect(r.unpriced).toEqual(['PROD', 'GOV']); // register (schema) order, never re-sorted
    expect(r.noise).toEqual(expect.arrayContaining(['UNIT', 'FIN', 'CASH', 'EXIT', 'REL']));
    expect(r.noise).not.toContain('GOV');
    expect(r.helpful).toEqual({ satisfied: ['FNDR'], missing: [] });
  });

  it('BLOCKED comes from disqualifiers only — jurisdiction is a condition, not a special case', () => {
    const r = readiness(HIVE, RBF);
    expect(r.blocked).toEqual([{ id: 'no-recurring', description: 'no contracted recurring revenue' }]);
    expect(r.reachable).toBe(false);
    const abroad = readiness({ ...HIVE, facts: { ...HIVE.facts, jurisdiction: 'DE' } }, SAFE);
    expect(abroad.blocked.map((b) => b.id)).toEqual(['juris']);
    expect(readiness(HIVE, SAFE).blocked).toEqual([]);
    expect(readiness(HIVE, SAFE).reachable).toBe(true);
  });

  it('an absent fact fails a disqualifier closed: unknown jurisdiction blocks, it does not pass', () => {
    const r = readiness({ held: HIVE.held, facts: {} }, SAFE);
    expect(r.blocked.map((b) => b.id)).toEqual(['juris']);
  });

  it('a prose-only disqualifier is UNEVALUATED — listed, never passed, never blocked', () => {
    const PROSE = { ...SAFE, disqualifiers: [{ id: 'no-legal-entity', description: 'no legal entity' }] };
    const r = readiness(HIVE, PROSE);
    expect(r.blocked).toEqual([]);
    expect(r.unevaluated).toEqual([{ id: 'no-legal-entity', description: 'no legal entity' }]);
    expect(validateInstrument(PROSE).warnings).toContain('disqualifier_unevaluable:no-legal-entity');
  });

  it('never emits a score, weight or rank', () => {
    const r = readiness(HIVE, SAFE);
    const keys = JSON.stringify(r).toLowerCase();
    for (const banned of ['score', 'rank', 'weight', 'percent']) expect(keys).not.toContain(banned);
  });
});

describe('the register-wide outputs', () => {
  it('readinessVector is one result per instrument, in register order, never a scalar', () => {
    const v = readinessVector(HIVE, [RBF, SAFE]);
    expect(v.map((r) => r.instrument_id)).toEqual(['rbf', 'safe_post']);
    expect(Array.isArray(v)).toBe(true);
  });

  it('unpricedInversion turns what nobody priced into who would', () => {
    const GOV_LOVER = { ...RBF, id: 'gov_grant', name: 'Sovereign grant', family: 'non-dilutive', requires: { GOV: 'probable' }, helpful: { PROD: 'asserted' }, disqualifiers: [] };
    const inv = unpricedInversion(HIVE, [SAFE, RBF, GOV_LOVER]);
    expect(inv.GOV).toEqual(['gov_grant']);
    expect(inv.PROD).toEqual(['gov_grant']);
    // IDENT is unpriced by RBF and priced by the SAFE — that is the inversion doing its job.
    expect(inv.IDENT).toEqual(['safe_post']);
    expect(inv).not.toHaveProperty('UNIT'); // not held → NOISE, never a candidate
  });
});

describe('validateInstrument — the register\'s own rules', () => {
  it('rejects a family outside the nine, an unknown class, a bad threshold', () => {
    expect(validateInstrument({ ...SAFE, family: 'equity · deferred' }).errors).toContain('family_not_in_enum:equity · deferred');
    expect(validateInstrument({ ...SAFE, requires: { TRACTION: 'asserted' } }).errors).toContain('unknown_class:TRACTION');
    expect(validateInstrument({ ...SAFE, requires: { TRAC: 'high' } }).errors).toContain('unknown_confidence:TRAC=high');
  });
  it('a record without a verification date is a rumour — warned, not rejected', () => {
    const v = validateInstrument({ ...SAFE, evidence: {} });
    expect(v.errors).toEqual([]);
    expect(v.warnings).toContain('no_last_verified');
    expect(validateInstrument(SAFE)).toEqual({ ok: true, errors: [], warnings: [] });
  });
});
