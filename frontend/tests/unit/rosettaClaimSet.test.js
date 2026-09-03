import { describe, it, expect } from 'vitest';
import { claimSetFrom, classFor, confidenceFor } from '../../src/utils/rosettaClaimSet.js';

describe('rosettaClaimSet — the record as the join sees it', () => {
  it('routes subjects to classes and leaves untyped ones out', () => {
    expect(classFor({ subject: 'soc2_status' })).toBe('GOV');
    expect(classFor({ subject: 'gap:backup_dr' })).toBe('GOV');
    expect(classFor({ subject: 'match:aws_activate' })).toBe('TRAC');
    expect(classFor({ subject: 'outcome:rec-1' })).toBe('TRAC');
    expect(classFor({ subject: 'runway_months' })).toBe('FIN');
    expect(classFor({ subject: 'entity_type' })).toBe('IDENT');
    expect(classFor({ subject: 'founder_track_record' })).toBe('FNDR');
    expect(classFor({ subject: 'zzz' })).toBeNull();
  });

  it('confidence is the strongest authority seen for the class; absent where nothing was said', () => {
    expect(confidenceFor({ authority: 'reality' })).toBe('confirmed');
    expect(confidenceFor({ authority: 'founder' })).toBe('asserted');
    expect(confidenceFor({ confidence: 'probable', authority: 'founder' })).toBe('probable');
    const { held, witnesses } = claimSetFrom([
      { claims: [
        { subject: 'soc2_status', authority: 'founder', statement: 'Type I filed' },
        { subject: 'cyber_insurance', authority: 'provider', statement: 'bound' },
        { subject: 'match:aws_activate', authority: 'system' },
      ] },
    ]);
    expect(held.GOV).toBe('confirmed');
    expect(held.TRAC).toBe('probable');
    expect(held.FIN).toBe('absent');
    expect(held.EXIT).toBe('absent');
    expect(witnesses.GOV).toHaveLength(2);
  });

  it('a stated jurisdiction becomes a join fact; explicit facts win', () => {
    const entries = [{ claims: [{ subject: 'jurisdiction', authority: 'founder', statement: 'Australia' }] }];
    expect(claimSetFrom(entries).facts).toEqual({ jurisdiction: 'AU' });
    expect(claimSetFrom(entries, { jurisdiction: 'SG' }).facts).toEqual({ jurisdiction: 'SG' });
    expect(claimSetFrom([]).facts).toEqual({});
  });
});
