import { describe, it, expect } from 'vitest';
import { derivePresence, roomFor, levelFor, SPACES, PRESENT, PARTIAL, NOT_YET } from '../../src/utils/journeyPresence.js';

describe('journeyPresence — rooms, never a number', () => {
  it('routes subjects to the six rooms the rail knows', () => {
    expect(SPACES.map((s) => s.id)).toEqual(['investor', 'vendors', 'aws', 'microsoft', 'posture', 'spv']);
    expect(roomFor({ subject: 'soc2_status' })).toBe('posture');
    expect(roomFor({ subject: 'dmarc_policy' })).toBe('posture');
    expect(roomFor({ subject: 'match:aws_activate' })).toBe('aws');
    expect(roomFor({ subject: 'microsoft_founders_hub' })).toBe('microsoft');
    expect(roomFor({ subject: 'match:cloudflare' })).toBe('vendors');
    expect(roomFor({ subject: 'outcome:rec-123' })).toBe('vendors');
    expect(roomFor({ subject: 'investor_readiness' })).toBe('investor');
    expect(roomFor({ subject: 'spv_structure' })).toBe('spv');
    expect(roomFor({})).toBe('posture');
  });

  it('attested authorities make a room present; everything else is partial', () => {
    expect(levelFor({ authority: 'reality' })).toBe(PRESENT);
    expect(levelFor({ authority: 'provider' })).toBe(PRESENT);
    expect(levelFor({ authority: 'founder' })).toBe(PARTIAL);
    expect(levelFor({ authority: 'system' })).toBe(PARTIAL);
    expect(levelFor({})).toBe(PARTIAL);
  });

  it('presence accumulates across chapters and never goes backwards', () => {
    const { rows, perChapter, open } = derivePresence([
      { claims: [{ subject: 'soc2_status', authority: 'system' }] },
      { claims: [{ subject: 'match:aws_activate', authority: 'system' }] },
      { claims: [{ subject: 'outcome:rec-1', authority: 'reality' }] },
      { claims: [] },
    ]);
    const row = (id) => rows.find((r) => r.id === id).cells;
    expect(row('posture')).toEqual([PARTIAL, PARTIAL, PARTIAL, PARTIAL]);
    expect(row('aws')).toEqual([NOT_YET, PARTIAL, PARTIAL, PARTIAL]);
    expect(row('vendors')).toEqual([NOT_YET, NOT_YET, PRESENT, PRESENT]);
    expect(perChapter.map((c) => c.open)).toEqual([1, 2, 3, 3]);
    expect(open).toBe(3);
  });

  it('an empty record is zero rooms, not an error', () => {
    expect(derivePresence([])).toEqual({ rows: SPACES.map((s) => ({ ...s, cells: [] })), perChapter: [], open: 0 });
    expect(derivePresence(undefined).open).toBe(0);
  });
});
