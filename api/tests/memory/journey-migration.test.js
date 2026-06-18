import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';
import { recordEvidence } from '../../src/memory/nodes.js';
import { createFounderAndCompany } from '../../src/memory/nodes.js';

afterAll(async () => { await pool.end(); });

describe.skipIf(!reachable)('migration 003 + recordEvidence', () => {
  it('evidence has an extensions JSONB column', async () => {
    const { rows } = await pool.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name='evidence' AND column_name='extensions'`);
    expect(rows[0]?.data_type).toBe('jsonb');
  });

  it('recordEvidence stores collected_at + extensions', async () => {
    const { company } = await createFounderAndCompany({ founderName: 'Mig', companyName: 'Mig Inc' });
    const when = '2026-01-02T03:04:05.000Z';
    const ev = await recordEvidence({
      entity_id: company.entity_id, type: 'session', content: 'visit 1',
      collected_at: when, extensions: { session_id: 's1', label: 'First read' },
    });
    const { rows } = await pool.query(
      `SELECT type, collected_at, extensions FROM evidence WHERE evidence_id=$1`, [ev.evidence_id]);
    expect(rows[0].type).toBe('session');
    expect(new Date(rows[0].collected_at).toISOString()).toBe(when);
    expect(rows[0].extensions).toEqual({ session_id: 's1', label: 'First read' });
  });
});
