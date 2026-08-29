import { describe, it, expect } from 'vitest';
import {
  foldFacts,
  winningFact,
  disagreements,
  visibleTo,
  projectVehicleForViewer,
} from '../../src/services/vehicle-projection.js';
import { VEHICLE_LENSES, mintLens } from '../../src/config/vehicle-lenses.js';

const fact = (over) => ({
  key: 'stage',
  group: 'identity',
  value: 'Series A',
  layer: 'declared',
  source: 'founder',
  observed_at: '2026-07-01T00:00:00Z',
  ...over,
});

describe('precedence lattice', () => {
  it('ranks attested over corrected over declared over inferred', () => {
    const facts = [
      fact({ layer: 'inferred', value: 'seed' }),
      fact({ layer: 'attested', value: 'pre-seed' }),
      fact({ layer: 'declared', value: 'Series A' }),
    ];
    expect(winningFact(facts).layer).toBe('attested');
    expect(winningFact(facts).value).toBe('pre-seed');
  });

  it('breaks a same-layer tie on recency, not write order', () => {
    const older = fact({ observed_at: '2026-01-01T00:00:00Z', value: 'old' });
    const newer = fact({ observed_at: '2026-08-01T00:00:00Z', value: 'new' });
    expect(winningFact([newer, older]).value).toBe('new');
    expect(winningFact([older, newer]).value).toBe('new');
  });

  it('keeps what it overruled rather than dropping it', () => {
    const folded = foldFacts([fact({ layer: 'declared' }), fact({ layer: 'attested', value: 'pre-seed' })]);
    expect(folded.stage.value).toBe('pre-seed');
    expect(folded.stage.superseded).toHaveLength(1);
    expect(folded.stage.superseded[0].value).toBe('Series A');
  });
});

describe("where the founder's story disagrees with the evidence", () => {
  it('finds a declared value contradicted by an attested one', () => {
    const found = disagreements([
      fact({ value: 'SOC 2 certified', key: 'soc2', layer: 'declared' }),
      fact({ value: 'no SOC 2 report found', key: 'soc2', layer: 'attested', source: 'recon-certs' }),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].key).toBe('soc2');
    expect(found[0].declared.value).toBe('SOC 2 certified');
    expect(found[0].evidence.source).toBe('recon-certs');
    expect(found[0].stands).toBe('attested');
  });

  it('drops the key once the founder has corrected it — the lattice settles it', () => {
    const found = disagreements([
      fact({ key: 'soc2', layer: 'declared', value: 'SOC 2 certified' }),
      fact({ key: 'soc2', layer: 'attested', value: 'none found', source: 'recon-certs' }),
      fact({ key: 'soc2', layer: 'corrected', value: 'in progress', source: 'founder' }),
    ]);
    expect(found).toEqual([]);
  });

  it('does not report agreement as disagreement', () => {
    expect(
      disagreements([
        fact({ key: 'domain', layer: 'declared', value: 'hiveandco.au' }),
        fact({ key: 'domain', layer: 'inferred', value: ' HiveAndCo.AU ' }),
      ]),
    ).toEqual([]);
  });

  it('says the founder still stands when only a bare inference disputes them', () => {
    const [d] = disagreements([
      fact({ key: 'sector', layer: 'declared', value: 'food & beverage' }),
      fact({ key: 'sector', layer: 'inferred', value: 'retail', source: 'cold-read' }),
    ]);
    expect(d.stands).toBe('declared');
  });
});

describe('no-leak at read time', () => {
  it('filters a fact that names its audiences', () => {
    expect(visibleTo(fact({ audiences: ['founder'] }), 'investor')).toBe(false);
    expect(visibleTo(fact({ audiences: ['founder'] }), 'founder')).toBe(true);
    expect(visibleTo(fact({}), 'investor')).toBe(true);
  });

  it('never renders an engagement the audience is not on', () => {
    const vehicle = {
      vehicle_id: 'veh_test',
      facts: [],
      engagements: [
        { cer: 'CER-1', visibility_policy: { allowed_audiences: ['founder'] } },
        { cer: 'CER-2', visibility_policy: { allowed_audiences: ['founder', 'investor'] } },
      ],
    };
    const lens = { id: 'x', audience: 'investor', sections: [{ title: 'E', kind: 'engagements' }] };
    const [section] = projectVehicleForViewer(vehicle, lens).sections;
    expect(section.entries.map((e) => e.cer)).toEqual(['CER-2']);
  });
});

describe('projection honesty', () => {
  it('marks an unsourced section not_yet_sourced rather than empty or invented', () => {
    const lens = { id: 'x', audience: 'investor', sections: [{ title: 'Cap table', kind: 'facts', group: 'cap_table' }] };
    const [section] = projectVehicleForViewer({ vehicle_id: 'v', facts: [] }, lens).sections;
    expect(section.status).toBe('not_yet_sourced');
    expect(section.entries).toBeUndefined();
  });

  it('carries a receipt on every rendered fact', () => {
    const lens = { id: 'x', audience: 'founder', sections: [{ title: 'Identity', kind: 'facts', group: 'identity' }] };
    const out = projectVehicleForViewer({ vehicle_id: 'v', facts: [fact({ layer: 'attested', source: 'ASIC' })] }, lens);
    expect(out.sections[0].entries[0].receipt).toEqual({
      layer: 'attested',
      source: 'ASIC',
      observed_at: '2026-07-01T00:00:00Z',
    });
  });
});

describe('lenses are data', () => {
  it('ships the five John hand-built', () => {
    expect(Object.keys(VEHICLE_LENSES)).toEqual(['filled', 'dd', 'enterprise', 'ciso', 'commercial']);
  });

  it('mints a lens for a named human off a role lens', () => {
    const sunny = mintLens({
      id: 'sunny',
      person: 'Sunny',
      base: 'dd',
      question: 'Does this reconcile to my ACE objects?',
    });
    expect(sunny.label).toBe("Sunny's view");
    expect(sunny.derived_from).toBe('dd');
    expect(sunny.audience).toBe('investor');
    expect(sunny.sections.length).toBe(VEHICLE_LENSES.dd.sections.length);
  });

  it('refuses to mint off a lens that does not exist', () => {
    expect(() => mintLens({ id: 'x', person: 'X', base: 'nope' })).toThrow('unknown_base_lens:nope');
  });
});
