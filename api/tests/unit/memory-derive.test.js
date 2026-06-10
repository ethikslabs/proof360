import { describe, it, expect } from 'vitest';
import { buildProfileEventRecords, buildSessionAttachRecords } from '../../src/services/memory-derive.js';

const profile = { id: 'profile-1' };

describe('memory derivation', () => {
  it('stores chat as an event and promotes only explicit facts', () => {
    const records = buildProfileEventRecords(profile, {
      source: 'chat',
      message: 'We are seed stage.',
      facts: [
        { field: 'stage', value: 'Seed', source: 'founder' },
        { field: 'mood', value: 'hesitant', source: 'chat' },
      ],
    });

    expect(records.filter((record) => record.primitive === 'event')).toHaveLength(1);
    expect(records.filter((record) => record.primitive === 'claim')).toHaveLength(1);
    expect(records.find((record) => record.primitive === 'claim')).toMatchObject({
      field: 'stage',
      actor: 'founder',
      source: 'founder',
    });
    expect(records.some((record) => record.field === 'mood')).toBe(false);
  });

  it('promotes cold-read session signals only through attach records', () => {
    const records = buildSessionAttachRecords(profile, {
      id: 'session-1',
      website_url: 'https://example.com',
      company_name: 'Example Co',
      infer_status: 'complete',
      raw_signals: [
        { type: 'stage', value: 'Seed', confidence: 'probable' },
        { type: 'data_sensitivity', value: 'Customer data', confidence: 'probable' },
      ],
    });

    const claims = records.filter((record) => record.primitive === 'claim');
    expect(claims.map((claim) => claim.field)).toEqual(expect.arrayContaining([
      'company_name',
      'website',
      'stage',
      'data_sensitivity',
    ]));
    expect(claims.every((claim) => claim.source === 'cold_read')).toBe(true);
    expect(records.find((record) => record.primitive === 'event')).toMatchObject({
      kind: 'session_activity',
      source: 'cold_read',
    });
  });
});
