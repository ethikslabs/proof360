// The bridge between 30 real matched programs and a panel that was rendering
// invented entitlements.
//
// YOURS_AWS and YOURS_MICROSOFT asserted things about a founder's own accounts —
// "$10k unclaimed · already granted · expires Q4 · log in to redeem", "Founders
// Hub is unclaimed — that's $150k in Azure credits sitting there" — for any
// company that wasn't the Hive & Co demo. Meanwhile 18 AWS and 12 Microsoft
// programs with real trigger evaluation sat one import away (John, 2026-08-26:
// "add them in if we have the data").
import { describe, it, expect } from 'vitest';
import { livePanel } from '../../src/rendering/livePanel.js';

const LIVE = {
  aws: [
    { id: 'activate_founders', name: 'AWS Activate Founders',
      benefit: '$1,000 AWS credits + Developer Support',
      url: 'https://aws.amazon.com/activate/', confidence: 'high',
      matched_on: [{ field: 'stage', value: 'Seed' }] },
    { id: 'well_architected', name: 'AWS Well-Architected Partner Program',
      benefit: '$5,000 funded per qualified review',
      url: 'https://aws.amazon.com/architecture/well-architected/', confidence: 'medium',
      matched_on: [{ field: 'infrastructure', value: 'aws' }] },
  ],
  microsoft: [],
  signals: { stage: 'Seed', infrastructure: 'aws' },
};

describe('livePanel — real matches, or step aside', () => {
  it('renders the matched programs when there are any', () => {
    const p = livePanel(LIVE, 'aws');
    expect(p.programs).toHaveLength(2);
    expect(p.programs[0].name).toBe('AWS Activate Founders');
    expect(p.programs[0].value).toBe('$1,000 AWS credits + Developer Support');
  });

  it('says why each one matched, in the founder’s own confirmed terms', () => {
    const p = livePanel(LIVE, 'aws');
    expect(p.programs[0].detail).toMatch(/stage/i);
    expect(p.programs[0].detail).toMatch(/Seed/);
  });

  it('claims no entitlement anywhere', () => {
    const blob = JSON.stringify(livePanel(LIVE, 'aws'));
    expect(blob).not.toMatch(/unclaimed|already granted|log in to redeem/i);
  });

  it('counts what it actually has rather than announcing a total', () => {
    const p = livePanel(LIVE, 'aws');
    expect(p.summary).toMatch(/2 /);
    expect(p.summary).not.toMatch(/\$220k|\$150k/);
  });

  // The important half: when there is nothing real to show, this yields null so
  // the caller falls through — it never renders an empty panel claiming a match.
  it('steps aside when nothing matched, rather than showing an empty promise', () => {
    expect(livePanel(LIVE, 'microsoft')).toBeNull();
    expect(livePanel({ aws: [] }, 'aws')).toBeNull();
    expect(livePanel(null, 'aws')).toBeNull();
    expect(livePanel(undefined, 'aws')).toBeNull();
  });

  it('every program is openable at source, and none without a link is offered', () => {
    const p = livePanel({ ...LIVE, aws: [...LIVE.aws, { id: 'x', name: 'No link' }] }, 'aws');
    expect(p.programs).toHaveLength(2);
    for (const one of p.programs) expect(one.url).toMatch(/^https:\/\//);
  });

  it('survives junk without throwing', () => {
    expect(() => livePanel({ aws: 'nope' }, 'aws')).not.toThrow();
    expect(livePanel({ aws: 'nope' }, 'aws')).toBeNull();
  });
});
