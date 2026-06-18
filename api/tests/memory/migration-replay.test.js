// Slice 4 verification: the JSON-kernel migration replays a founder's claims into atoms and
// project(founder, company) reproduces today's lit tiles (continuity proof for the cutover).
import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';
import { project } from '../../src/memory/project.js';
import { migrateProfile, tilesFromClaims } from '../../src/memory/migrate.js';
import { buildProfileProjections } from '../../src/services/profile-projections.js';

// A representative v1 reconstructed snapshot (the shape the file kernel replays today).
function v1Snapshot() {
  const claim = (value, actor = 'founder') => ({ id: `old-${value}`, value, actor });
  return {
    profile: { id: 'profile-v1' },
    reconstructed_at: '2026-06-18T00:00:00Z',
    observations: [],
    current_claims: {
      company_name: claim('Acme'), website: claim('acme.com'), stage: claim('seed'),
      sector: claim('fintech'), revenue: claim('0'), team_size: claim('3'),
      cloud_provider: claim('aws'), uses_ai: claim('true'),
      data_sensitivity: claim('high'), handles_personal_data: claim('true'),
    },
  };
}

afterAll(async () => { await pool.end(); });

describe.skipIf(!reachable)('JSON-kernel -> atoms migration reproduces today tiles', () => {
  it('lit tiles after migration match the file-kernel tiles tile-for-tile', async () => {
    const snap = v1Snapshot();
    const expected = buildProfileProjections(snap).lit_tiles; // the file-kernel result

    const { person, company } = await migrateProfile(snap, { founderName: 'Acme Founder', companyName: 'Acme' });
    const view = await project(person.entity_id, company.entity_id);
    const after = tilesFromClaims(view.claims, company.entity_id).lit_tiles;

    expect(after).toEqual(expected);
    // sanity: at least one tile actually lit (otherwise parity is trivially true)
    expect(Object.values(after).some(Boolean)).toBe(true);
  });

  it('every migrated field is a believed atom on the company', async () => {
    if (!reachable) return;
    const snap = v1Snapshot();
    const { company } = await migrateProfile(snap, { founderName: 'B Founder', companyName: 'Beta' });
    const { rows } = await pool.query(
      `SELECT subject FROM claim WHERE entity_id=$1 AND superseded_by IS NULL`, [company.entity_id]);
    expect(rows.map((r) => r.subject).sort()).toEqual(Object.keys(snap.current_claims).sort());
  });
});
