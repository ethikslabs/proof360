// 39 real programs, and a founder could reach none of them.
//
// The API holds 18 AWS programs (AWS_PROGRAMS + evaluateTrigger) and 12 Microsoft
// programs (MICROSOFT_PROGRAMS + filterMicrosoftPrograms), each with real trigger
// conditions evaluated against a company's actual signals. The matching logic has
// existed and been tested since the recompute pipeline was written.
//
// The AWS and Microsoft panels in the UI used none of it. They rendered hardcoded
// constants that made specific financial claims about the founder's OWN accounts:
// "Startup Credits — $10k unclaimed — already granted · expires Q4 · log in to
// redeem", "$220k+ in credits sitting unclaimed at your stage", "Founders Hub is
// unclaimed — that's $150k in Azure credits sitting there."
//
// That is worse than an invented number — it is an invented ENTITLEMENT, asserted
// about an account nobody has looked at. And the real thing was one import away.
//
// John's ruling, 2026-08-26: "add them in if we have the data."
import { describe, it, expect } from 'vitest';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { sessionSignals, matchedPrograms } from '../../src/services/programs-matcher.js';

function seeded(extra = {}) {
  const session = createSession({ website_url: 'https://acme.example' });
  updateSession(session.id, {
    infer_status: 'complete',
    company_name: 'Acme',
    raw_signals: [
      { type: 'stage', value: 'Seed', confidence: 'confident' },
      { type: 'product_type', value: 'Software product', confidence: 'confident' },
      { type: 'infrastructure', value: 'aws', confidence: 'confident' },
    ],
    claim_records: [],
    claim_events: [],
    ...extra,
  });
  return getSession(session.id);
}

describe('sessionSignals — the company, in the shape the triggers speak', () => {
  it('reads the signals a real read produced', () => {
    const s = sessionSignals(seeded());
    expect(s.stage).toBe('Seed');
    expect(s.product_type).toBe('Software product');
    expect(s.infrastructure).toBe('aws');
  });

  // A claim the founder CONFIRMED outranks the probe that guessed it — that is
  // the whole point of the confirm ceremony, and it must reach the matcher too.
  it('prefers first-party testimony over the inferred signal', () => {
    const session = seeded({
      claim_records: [{
        claim_id: 'c1', field: 'company.stage', label: 'stage', value: 'Series A',
        status: 'inferred', provenance: { method: 'x' },
      }],
      claim_events: [{ claim_id: 'c1', type: 'confirmed', actor: 'founder', at: '2026-08-26T00:00:00Z' }],
    });
    expect(sessionSignals(session).stage).toBe('Series A');
  });

  it('ignores a claim the founder rejected rather than treating it as fact', () => {
    const session = seeded({
      claim_records: [{
        claim_id: 'c1', field: 'company.stage', label: 'stage', value: 'Series B',
        status: 'inferred', provenance: { method: 'x' },
      }],
      claim_events: [{ claim_id: 'c1', type: 'rejected', actor: 'founder', at: '2026-08-26T00:00:00Z' }],
    });
    expect(sessionSignals(session).stage).toBe('Seed'); // falls back to the read
  });

  it('returns an empty map for a session that has read nothing', () => {
    expect(sessionSignals(createSession({ website_url: 'https://x.example' }))).toEqual({});
    expect(sessionSignals(null)).toEqual({});
  });
});

describe('matchedPrograms — real programs, or none', () => {
  it('matches AWS programs against the real signals', () => {
    const { aws } = matchedPrograms(seeded());
    expect(aws.length).toBeGreaterThan(0);
    expect(aws[0]).toHaveProperty('name');
    expect(aws[0]).toHaveProperty('benefit');
    expect(aws[0]).toHaveProperty('url');
  });

  it('matches Microsoft programs too', () => {
    const { microsoft } = matchedPrograms(seeded());
    expect(Array.isArray(microsoft)).toBe(true);
  });

  // The rule that makes this different from what it replaces.
  it('claims no entitlement — nothing is "already granted" or "unclaimed"', () => {
    const blob = JSON.stringify(matchedPrograms(seeded()));
    expect(blob).not.toMatch(/already granted/i);
    expect(blob).not.toMatch(/unclaimed/i);
    expect(blob).not.toMatch(/log in to redeem/i);
  });

  it('every match carries the trigger that earned it, so the offer is never free-floating', () => {
    const { aws } = matchedPrograms(seeded());
    expect(aws[0].matched_on.length).toBeGreaterThan(0);
    expect(aws[0].matched_on[0]).toHaveProperty('field');
    expect(aws[0].matched_on[0]).toHaveProperty('value');
  });

  it('every match is openable at source', () => {
    const { aws, microsoft } = matchedPrograms(seeded());
    for (const p of [...aws, ...microsoft]) expect(p.url).toMatch(/^https:\/\//);
  });

  // Absence over invention: a company we know nothing about gets nothing, not a
  // catalogue dump dressed as personalised matches.
  it('matches nothing when nothing is known about the company', () => {
    const empty = createSession({ website_url: 'https://y.example' });
    const { aws, microsoft } = matchedPrograms(empty);
    expect(aws).toEqual([]);
    expect(microsoft).toEqual([]);
  });

  it('survives a junk session without throwing', () => {
    expect(() => matchedPrograms(null)).not.toThrow();
    expect(matchedPrograms(null)).toEqual({ aws: [], microsoft: [], signals: {} });
  });
});
