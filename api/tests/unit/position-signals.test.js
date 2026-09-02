// Position signals read out of the research holdings — the material that was being
// retrieved and thrown away. The governing rule (John, 2026-09-02): never adjudicate
// a company's record. Two witnesses saying different things is a point-in-time record
// with two observations, not a contradiction and not a flag.
import { describe, it, expect } from 'vitest';
import {
  witnessOf, groupObservations, extractPositionSignals,
  POSITION_TYPES, CONFIRMATION, PARTNER_FRAME,
} from '../../src/services/position-signals.js';

// The two holdings from the live Cognisys read that disagreed on headcount.
const YAHOO = {
  slug: 'cognisys-yahoo', evidence_id: 'ev1',
  source_url: 'https://finance.yahoo.com/news/cognisys', fetched_at: '2026-08-21',
  text: 'Team of 120 specialists operating across 19 countries.',
};
const LEADIQ = {
  slug: 'cognisys-leadiq', evidence_id: 'ev2',
  source_url: 'https://www.leadiq.com/c/cognisys', fetched_at: '2026-08-21',
  text: 'Cognisys is an IT services company with 51 to 200 employees.',
};

describe('witnessOf', () => {
  it('names the publisher and when we fetched it', () => {
    expect(witnessOf(YAHOO)).toMatchObject({
      source: 'finance.yahoo.com', observed_at: '2026-08-21', evidence_id: 'ev1',
    });
  });

  it('strips www so the same publisher is one witness', () => {
    expect(witnessOf(LEADIQ).source).toBe('leadiq.com');
  });

  it('falls back to the slug when there is no usable URL', () => {
    expect(witnessOf({ slug: 'internal-note' }).source).toBe('internal-note');
    expect(witnessOf({ slug: 'bad', source_url: 'not a url' }).source).toBe('bad');
  });

  it('returns null for no hit rather than inventing a witness', () => {
    expect(witnessOf(null)).toBeNull();
  });
});

describe('two witnesses, one signal', () => {
  const signals = groupObservations([
    { type: 'headcount', value: '120 specialists', hit: YAHOO },
    { type: 'headcount', value: '51-200 employees', hit: LEADIQ },
  ]);

  it('produces ONE signal, not two, and not a disagreement flag', () => {
    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('headcount');
  });

  it('keeps both observations, each with its own witness and date', () => {
    const [s] = signals;
    expect(s.observation_count).toBe(2);
    expect(s.observations.map((o) => o.value))
      .toEqual(['120 specialists', '51-200 employees']);
    expect(s.observations.map((o) => o.source))
      .toEqual(['finance.yahoo.com', 'leadiq.com']);
    for (const o of s.observations) expect(o.observed_at).toBe('2026-08-21');
  });

  it('does not resolve which is true — value is a representative, not a verdict', () => {
    const [s] = signals;
    expect(s.value).toBe('120 specialists');
    expect(s).not.toHaveProperty('resolved');
    expect(s).not.toHaveProperty('conflict');
    expect(s).not.toHaveProperty('disagreement');
  });

  it('starts unconfirmed, because the founder has not spoken', () => {
    expect(signals[0].confirmation).toBe(CONFIRMATION.UNCONFIRMED);
  });

  it('classes as position so it leads the read', () => {
    expect(signals[0].signal_class).toBe('position');
  });
});

describe('grouping discipline', () => {
  it('collapses the same value from the same witness', () => {
    const [s] = groupObservations([
      { type: 'headcount', value: '120 specialists', hit: YAHOO },
      { type: 'headcount', value: '120 specialists', hit: YAHOO },
    ]);
    expect(s.observation_count).toBe(1);
  });

  it('keeps the same value from different witnesses — corroboration is a fact', () => {
    const [s] = groupObservations([
      { type: 'headcount', value: '120 specialists', hit: YAHOO },
      { type: 'headcount', value: '120 specialists', hit: LEADIQ },
    ]);
    expect(s.observation_count).toBe(2);
  });

  it('drops unknown types and empty values instead of guessing', () => {
    expect(groupObservations([
      { type: 'security_posture', value: 'weak', hit: YAHOO },
      { type: 'headcount', value: '', hit: YAHOO },
      { type: 'headcount', value: null, hit: YAHOO },
      { type: null, value: 'x', hit: YAHOO },
    ])).toEqual([]);
  });

  it('survives empty and missing input', () => {
    expect(groupObservations([])).toEqual([]);
    expect(groupObservations(undefined)).toEqual([]);
  });

  it('only emits the agreed position types', () => {
    expect(POSITION_TYPES).toEqual([
      'headcount', 'footprint', 'years_operating',
      'category_position', 'accreditation', 'named_customers',
    ]);
  });
});

describe('the partner frame never accuses', () => {
  it('says observed and unconfirmed, never unverified or contradictory', () => {
    expect(PARTNER_FRAME).toMatch(/not confirmed this yet/i);
    expect(PARTNER_FRAME).not.toMatch(/unverified|disagree|contradict|conflict|lying/i);
  });
});

describe('absence contract — honours the corpus three states', () => {
  it('null stays null: we could not look, so we cannot say we found nothing', async () => {
    expect(await extractPositionSignals(null)).toBeNull();
  });

  it('empty is an honest zero: we looked and nothing qualified', async () => {
    expect(await extractPositionSignals([])).toEqual([]);
  });

  it('a non-array is treated as nothing to read, never as a failure to look', async () => {
    expect(await extractPositionSignals('holdings')).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// The identity gate (John, 2026-09-02, second pass). This producer was the loudest
// of the ungated consumers: on a typo'd domain it published twelve position signals
// under "OBSERVED THIS SESSION" — headcount, footprint, accreditations, a category
// claim — all extracted from holdings the reading had already refused to speak from.
// -----------------------------------------------------------------------------
describe('identity gate', () => {
  it('returns an honest zero, not a guess, when no holding is about this company', async () => {
    const hits = [
      { ...YAHOO, identity: 'unconfirmed' },
      { ...LEADIQ, identity: 'unconfirmed' },
    ];
    // [] means "we looked and nothing here qualifies". null would mean "we could not
    // look" — and would also be what a model call returns without credentials, so
    // this assertion doubles as proof the extractor short-circuited before spending.
    await expect(extractPositionSignals(hits, { company_name: 'Congisys' })).resolves.toEqual([]);
  });

  it('keeps the three-state absence contract intact', async () => {
    await expect(extractPositionSignals(null, {})).resolves.toBeNull();
    await expect(extractPositionSignals([], {})).resolves.toEqual([]);
  });
});
