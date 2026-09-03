import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import projection from '../../src/data/capital-register.json';
import { parseRegister, parseYamlBlock, parseValue } from '../../src/utils/capitalRegister.js';
import { validateInstrument, readiness } from '../../src/utils/capitalJoin.js';

const FIXTURE = `## EQUITY

### \`safe-post-money\`
\`\`\`yaml
name:               SAFE (post-money valuation cap)
aliases:            [Simple Agreement for Future Equity, SAFE note]
family:             equity
depth:              D4
repayable:          no
requires:           {IDENT: confirmed, FNDR: probable, PROB: probable, PROD: asserted}
helpful:            {TRAC: asserted, REL: probable, USE: asserted}
irrelevant:         [FIN, CASH, UNIT, OPS]
disqualifiers:      [no legal entity, cap table already broken, prior instrument
                     with anti-dilution that makes conversion unmodellable]
provider_motivation: Optionality. Cheap exposure to asymmetric upside with no governance
                     burden and no pricing argument today.
reversibility:      one_way
jurisdiction_sensitivity: high
variants:
  - jurisdiction:   US (Delaware)
    delta:          Standard-form, well-understood
    depth:          D3
  - jurisdiction:   Australia
    delta:          Used, but convertible notes are the local default; less standard-form
                    consensus, more bespoke drafting
    depth:          D2
last_verified:      2026-08-28
\`\`\`

**Failure modes.** SAFE stacking — four SAFEs at four caps.

**Misconceptions.** *"A SAFE defers the valuation."* It does not.

**Tells.** *"What's your cap?"* asked first means they are shopping terms.

---
`;

describe('the register reader', () => {
  it('parses scalars, lists, maps and multi-line continuations', () => {
    expect(parseValue('{IDENT: confirmed, TRAC: asserted}')).toEqual({ IDENT: 'confirmed', TRAC: 'asserted' });
    expect(parseValue('[FIN, CASH]')).toEqual(['FIN', 'CASH']);
    expect(parseValue('no')).toBe(false);
    expect(parseYamlBlock('a: 1\nb: two words\n   continued here').b).toBe('two words continued here');
  });

  it('reads one record with every block, and the prose disqualifiers become unevaluable conditions', () => {
    const [r] = parseRegister(FIXTURE);
    expect(r.id).toBe('safe-post-money');
    expect(r.family).toBe('equity');
    expect(r.requires).toEqual({ IDENT: 'confirmed', FNDR: 'probable', PROB: 'probable', PROD: 'asserted' });
    expect(r.irrelevant).toEqual(['FIN', 'CASH', 'UNIT', 'OPS']);
    expect(r.disqualifiers.map((d) => d.id)).toEqual(['no-legal-entity', 'cap-table-already-broken', 'prior-instrument-with-anti-dilution-that-makes-conversion-unmodellable']);
    expect(r.disqualifiers[0].test).toBeUndefined();
    expect(r.jurisdiction.variants).toHaveLength(2);
    expect(r.jurisdiction.variants[1].delta).toMatch(/bespoke drafting$/);
    expect(r.provider.motivation).toMatch(/^Optionality\./);
    expect(r.evidence.last_verified).toBe('2026-08-28');
    expect(r.knowledge.misconceptions).toMatch(/defers the valuation/);
    expect(r.knowledge.tells).toMatch(/shopping terms/);
    const v = validateInstrument(r);
    expect(v.errors).toEqual([]);
  });
});

// The real file, when this checkout has the estate beside it. A CI box without _working
// skips honestly rather than pretending the register parsed.
// path.resolve, not new URL(): Vite rewrites URL(x, import.meta.url) into an /@fs/ asset path.
const realPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../_working/2026-08-28-capital-rosetta-register.md');
describe.skipIf(!existsSync(realPath))('the ratified register, all records', () => {
  it('parses every record, every one validates, and the join runs on all of them', () => {
    const records = parseRegister(readFileSync(realPath, 'utf8'));
    expect(records.length).toBeGreaterThanOrEqual(25);
    const bad = records.map((r) => [r.id, validateInstrument(r)]).filter(([, v]) => !v.ok);
    expect(bad).toEqual([]);
    // The two lines the schema has no notation for, carried as notes — a decision for the
    // register's author, not something the reader resolves.
    const notes = Object.fromEntries(records.filter((r) => r.irrelevant_notes.length).map((r) => [r.id, r.irrelevant_notes]));
    expect(notes).toEqual({ 'spv-per-asset': ['parent FIN', 'parent CASH'], 'deferred-salary': ['everything external'] });
    expect(records.find((r) => r.id === 'litigation-finance').requires).toEqual({ IDENT: 'confirmed', GOV: 'confirmed' });
    // "An instrument record without a verification date is a rumour" (schema §4.8). Today
    // 20 of 25 have none. The reader does not invent one; validation warns; the projection
    // script prints the list for the register's author.
    for (const r of records) {
      const v = validateInstrument(r);
      if (!r.evidence.last_verified) expect(v.warnings).toContain('no_last_verified');
      const out = readiness({ held: { IDENT: 'probable' }, facts: {} }, r);
      expect(out.instrument_id).toBe(r.id);
      expect(out.unevaluated.length).toBe(r.disqualifiers.length); // prose disqualifiers, all unevaluated
    }
    expect(records.filter((r) => r.evidence.last_verified).length).toBeGreaterThanOrEqual(5);
  });
});

describe('the committed projection', () => {
  it('validates as a register and carries its source hash', () => {
    expect(projection.record_count).toBe(projection.records.length);
    expect(projection.records.map((r) => validateInstrument(r)).filter((v) => !v.ok)).toEqual([]);
    expect(projection.source_sha256).toMatch(/^[0-9a-f]{64}$/);
  });
  it.skipIf(!existsSync(realPath))('is not stale — the hash matches the register on disk (re-run scripts/project-register.mjs if this fails)', () => {
    const sha = createHash('sha256').update(readFileSync(realPath, 'utf8')).digest('hex');
    expect(projection.source_sha256).toBe(sha);
  });
});
