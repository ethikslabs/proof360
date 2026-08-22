import { describe, it, expect } from 'vitest';
import {
  parseTrigger,
  evaluateTrigger,
  evaluateRegister,
} from '../../src/services/trigger-evaluator.js';

// Projected claims as claimsProjection() emits them (only status matters here).
const confirmed = (field, value) => ({
  claim_id: `clm-${field}`, field, value, status: 'confirmed',
  provenance: { method: 'recon-ip', detail: 'test' },
});
const inferred = (field, value) => ({ ...confirmed(field, value), status: 'inferred' });

describe('parseTrigger', () => {
  it('parses the four expression forms and AND conjunction', () => {
    const t = parseTrigger('stage in [Pre-seed, Seed, Series A] AND has_raised_institutional = false');
    expect(t.kind).toBe('expr');
    expect(t.conditions).toEqual([
      { field: 'stage', op: 'in', values: ['Pre-seed', 'Seed', 'Series A'] },
      { field: 'has_raised_institutional', op: 'eq', value: 'false' },
    ]);
    expect(parseTrigger('infrastructure present').conditions).toEqual([
      { field: 'infrastructure', op: 'present' },
    ]);
    expect(parseTrigger('stage != Pre-seed').conditions).toEqual([
      { field: 'stage', op: 'ne', value: 'Pre-seed' },
    ]);
  });

  it('parses the gap-driven vendor form', () => {
    const t = parseTrigger('Surfaces when CER shows open gaps: soc2, compliance, penetration_testing');
    expect(t.kind).toBe('gaps');
    expect(t.gaps).toEqual(['soc2', 'compliance', 'penetration_testing']);
  });

  it('anything it cannot parse becomes unparsed and NEVER fires (fail-closed)', () => {
    const t = parseTrigger('some future grammar we have not built');
    expect(t.kind).toBe('unparsed');
    expect(evaluateTrigger(t, { claims: [confirmed('company.stage', 'Seed')], openGaps: ['soc2'] }).fired)
      .toBe(false);
  });
});

describe('evaluateTrigger — confirmed claims only (D4)', () => {
  const activateTrigger = parseTrigger('stage in [Pre-seed, Seed, Series A] AND has_raised_institutional = false');

  it('fires when every condition holds on confirmed claims, citing them', () => {
    const claims = [
      confirmed('company.stage', 'Seed'),
      confirmed('company.has_raised_institutional', 'false'),
    ];
    const r = evaluateTrigger(activateTrigger, { claims, openGaps: [] });
    expect(r.fired).toBe(true);
    expect(r.claims_cited.map((c) => c.field).sort()).toEqual([
      'company.has_raised_institutional', 'company.stage',
    ]);
  });

  it('NEVER fires off an inferred claim — we never pitch off a guess', () => {
    const claims = [
      inferred('company.stage', 'Seed'),
      confirmed('company.has_raised_institutional', 'false'),
    ];
    expect(evaluateTrigger(activateTrigger, { claims, openGaps: [] }).fired).toBe(false);
  });

  it('a corrected claim counts as first-party testimony and can fire', () => {
    const claims = [
      { ...confirmed('company.stage', 'Seed'), status: 'corrected' },
      confirmed('company.has_raised_institutional', 'false'),
    ];
    expect(evaluateTrigger(activateTrigger, { claims, openGaps: [] }).fired).toBe(true);
  });

  it('matches values case- and separator-insensitively (aws == AWS, B2B SaaS == b2b_saas)', () => {
    const t = parseTrigger('product_type in [B2B SaaS, Platform]');
    const claims = [confirmed('product.type', 'b2b saas')];
    expect(evaluateTrigger(t, { claims, openGaps: [] }).fired).toBe(true);
  });

  it('present requires a confirmed claim; != requires the claim to EXIST and differ', () => {
    const present = parseTrigger('infrastructure present');
    expect(evaluateTrigger(present, { claims: [confirmed('infrastructure.cloud_provider', 'aws')], openGaps: [] }).fired).toBe(true);
    expect(evaluateTrigger(present, { claims: [inferred('infrastructure.cloud_provider', 'aws')], openGaps: [] }).fired).toBe(false);

    const ne = parseTrigger('stage != Pre-seed');
    expect(evaluateTrigger(ne, { claims: [confirmed('company.stage', 'Seed')], openGaps: [] }).fired).toBe(true);
    // absent claim: never fires off absence
    expect(evaluateTrigger(ne, { claims: [], openGaps: [] }).fired).toBe(false);
  });

  it('gap triggers fire on any open gap and cite the overlap', () => {
    const t = parseTrigger('Surfaces when CER shows open gaps: soc2, compliance');
    const r = evaluateTrigger(t, { claims: [], openGaps: ['soc2', 'mfa'] });
    expect(r.fired).toBe(true);
    expect(r.gaps_cited).toEqual(['soc2']);
    expect(evaluateTrigger(t, { claims: [], openGaps: ['mfa'] }).fired).toBe(false);
  });
});

describe('evaluateRegister — the shortlist proposal set', () => {
  const register = [
    {
      id: 'aws-activate-founders', kind: 'program', title: 'AWS Activate Founders',
      description: '$1,000 AWS credits + Developer Support',
      trigger: 'stage in [Pre-seed, Seed, Series A] AND has_raised_institutional = false',
      cer_route: 'ingram_micro_aws',
    },
    {
      id: 'vanta', kind: 'vendor', title: 'Vanta',
      description: 'Compliance automation',
      trigger: 'Surfaces when CER shows open gaps: soc2, compliance',
      cer_route: 'vanta',
    },
    {
      id: 'never-fires', kind: 'program', title: 'Nope',
      description: 'x', trigger: 'sector = energy', cer_route: 'shortlist_general',
    },
  ];

  it('returns one proposal per fired trigger, each carrying its cited evidence and reason', () => {
    const claims = [
      confirmed('company.stage', 'Seed'),
      confirmed('company.has_raised_institutional', 'false'),
    ];
    const proposals = evaluateRegister(register, { claims, openGaps: ['soc2'] });
    expect(proposals.map((p) => p.id).sort()).toEqual(['aws-activate-founders', 'vanta']);

    const activate = proposals.find((p) => p.id === 'aws-activate-founders');
    expect(activate.trigger).toContain('has_raised_institutional');
    expect(activate.claims_cited).toHaveLength(2);
    expect(activate.reason).toContain('confirmed');
    expect(activate.cer_route).toBe('ingram_micro_aws');
    // human field labels, never raw path tails ("your stage", not "your stage" from company.stage is
    // fine — but market.customer_type must read "customer type", product.type "product type")
    expect(activate.reason).toContain('your stage is confirmed as Seed');

    const vanta = proposals.find((p) => p.id === 'vanta');
    expect(vanta.gaps_cited).toEqual(['soc2']);
    expect(vanta.reason.toLowerCase()).toContain('soc2');
  });

  it('reasons use human field labels — "product type", never the raw path tail "type"', () => {
    const reg = [{
      id: 'x', kind: 'program', title: 'X', description: 'x',
      trigger: 'product_type in [B2B SaaS, Platform, API, Software product]',
      cer_route: 'shortlist_general',
    }];
    const [p] = evaluateRegister(reg, {
      claims: [confirmed('product.type', 'Software product')], openGaps: [],
    });
    expect(p.reason).toContain('your product type is confirmed as Software product');
    expect(p.reason).not.toMatch(/your type is/);
  });

  it('proposes nothing when nothing is confirmed and no gaps are open', () => {
    expect(evaluateRegister(register, { claims: [inferred('company.stage', 'Seed')], openGaps: [] }))
      .toEqual([]);
  });
});
