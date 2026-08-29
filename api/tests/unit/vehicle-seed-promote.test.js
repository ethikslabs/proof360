import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { promoteSeed } from '../../src/services/vehicle-seed-promote.js';
import { disagreements, projectVehicleForViewer, isEvidenceBacked } from '../../src/services/vehicle-projection.js';
import { VEHICLE_LENSES, mintLens } from '../../src/config/vehicle-lenses.js';

// John's real seed, not a fixture I invented — the point is that the model reads what he
// actually built.
const seed = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures/hiveandco-vehicle.seed.json', import.meta.url)), 'utf8'),
);

describe('promoting the hand-authored seed', () => {
  const vehicle = promoteSeed(seed, { observed_at: '2026-08-30T00:00:00Z' });

  it('keeps his identity — vehicle id, passport name, owner', () => {
    expect(vehicle.vehicle_id).toBe('veh_hiveandco_01');
    expect(vehicle.passport).toBe('Hive & Co — Passport');
    expect(vehicle.owner.person).toBe('Mel Rivers');
  });

  it('turns every [value, badge] pair into a fact carrying its receipt', () => {
    const domain = vehicle.facts.find((f) => f.key === 'domain');
    expect(domain.value).toContain('hiveandco.au');
    expect(domain.layer).toBe('inferred');
    expect(domain.source).toBe('cold-read');
  });

  it('carries his 6 domains and 24 gaps across with their receipts', () => {
    expect(vehicle.trust_posture.domains).toHaveLength(6);
    expect(vehicle.trust_posture.gaps).toHaveLength(24);
    expect(vehicle.trust_posture.gaps[0]).toMatchObject({ id: 'security_headers', status: 'CLEARED', receipt: 'LIVE' });
  });

  it('keeps the three CERs as engagements', () => {
    expect(vehicle.engagements.map((e) => e.cer)).toContain('CER-8F3A');
  });
});

describe('illustrative content can never become evidence', () => {
  it('refuses to treat an ILLUSTRATIVE fact as evidence-backed', () => {
    expect(isEvidenceBacked({ layer: 'inferred', illustrative: true })).toBe(false);
    expect(isEvidenceBacked({ layer: 'inferred' })).toBe(true);
  });

  it('never accuses a founder on the strength of demo content', () => {
    const found = disagreements([
      { key: 'stage', layer: 'declared', value: 'pre-seed', source: 'founder' },
      { key: 'stage', layer: 'inferred', value: 'Series A', source: 'seed-fixture', illustrative: true },
    ]);
    expect(found).toEqual([]);
  });
});

describe('his five lenses over his own record', () => {
  const vehicle = promoteSeed(seed, { observed_at: '2026-08-30T00:00:00Z' });

  it('projects every lens without throwing on an unknown section kind', () => {
    for (const [id, lens] of Object.entries(VEHICLE_LENSES)) {
      const out = projectVehicleForViewer(vehicle, { id, ...lens });
      expect(out.vehicle_id).toBe('veh_hiveandco_01');
      expect(out.sections.length).toBe(lens.sections.length);
    }
  });

  it('renders the record lens with his gaps and engagements filled', () => {
    const out = projectVehicleForViewer(vehicle, { id: 'filled', ...VEHICLE_LENSES.filled });
    const gaps = out.sections.find((s) => s.kind === 'gaps');
    expect(gaps.entries).toHaveLength(24);
    expect(out.entry_count).toBeGreaterThan(0);
  });

  it('marks the DD sections he has no data for yet rather than inventing them', () => {
    const out = projectVehicleForViewer(vehicle, { id: 'dd', ...VEHICLE_LENSES.dd });
    const capTable = out.sections.find((s) => s.title === 'Cap table & ownership');
    expect(capTable.status).toBe('not_yet_sourced');
    expect(capTable.entries).toBeUndefined();
  });

  it("mints Sunny's lens off dd and answers his question, not the category's", () => {
    const sunny = mintLens({
      id: 'sunny', person: 'Sunny', base: 'dd',
      question: 'Does this reconcile to my ACE objects?',
    });
    const out = projectVehicleForViewer(vehicle, sunny);
    expect(out.for).toBe('Sunny');
    expect(out.question).toBe('Does this reconcile to my ACE objects?');
  });
});
