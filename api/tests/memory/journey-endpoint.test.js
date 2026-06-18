import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';
import { createEntity } from '../../src/memory/nodes.js';
import { resolveFounderEntity } from '../../src/handlers/journey.js';

afterAll(async () => { await pool.end(); });

describe.skipIf(!reachable)('journey handler resolution', () => {
  it('resolves an authUser.sub to the person entity by ref', async () => {
    await createEntity({ type: 'person', name: 'Ref Founder', ref: 'ref-sub-123' });
    const entity = await resolveFounderEntity({ sub: 'ref-sub-123' }, pool);
    expect(entity?.name).toBe('Ref Founder');
  });

  it('returns null for an unprovisioned sub', async () => {
    const entity = await resolveFounderEntity({ sub: 'nobody-here' }, pool);
    expect(entity).toBeNull();
  });
});
