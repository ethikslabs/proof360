// The half-fix that would have shipped.
//
// livePanel() returns null when nothing matched, and the panels read
// `livePanel(live, 'aws') ?? panel ?? YOURS_AWS`. For a real company that matched
// ZERO programs that chain lands on YOURS_AWS — the demo fixture — and the
// founder is told "$10k unclaimed · Already granted · expires Q4 · log in to
// redeem" about their own AWS account. Exactly the fabrication the change was
// meant to remove, reached by the failure path instead of the happy one.
//
// Verified against the deployed bundle: "log in to redeem" and "220k" were still
// shipping after the first cut (2026-08-26).
//
// A session that has been matched and found nothing must say so. The fixture is
// only ever for the Hive & Co walkthrough.
import { describe, it, expect } from 'vitest';
import { panelFor } from '../../src/rendering/livePanel.js';

const FIXTURE = { summary: '$220k+ unclaimed', programs: [{ name: 'Startup Credits', status: 'available', value: '$10k unclaimed', detail: 'Already granted · log in to redeem' }] };
const MATCHED = {
  aws: [{ id: 'a', name: 'AWS Activate Founders', benefit: '$1,000 credits',
          url: 'https://aws.amazon.com/activate/', confidence: 'high',
          matched_on: [{ field: 'stage', value: 'Seed' }] }],
};

describe('panelFor — the fixture never reaches a real company', () => {
  it('shows the real matches when there are any', () => {
    const p = panelFor({ live: MATCHED, key: 'aws', fixture: FIXTURE });
    expect(p.programs[0].name).toBe('AWS Activate Founders');
  });

  // The bug.
  it('says nothing matched, rather than falling through to the demo fixture', () => {
    const p = panelFor({ live: { aws: [] }, key: 'aws', fixture: FIXTURE });
    expect(p.programs).toEqual([]);
    expect(JSON.stringify(p)).not.toMatch(/unclaimed|already granted|log in to redeem/i);
    expect(p.emptyNote).toMatch(/nothing matched|tell us more|as we learn/i);
  });

  it('still uses the fixture for the demo walkthrough, which is what it is for', () => {
    const p = panelFor({ live: null, key: 'aws', fixture: FIXTURE, demo: true });
    expect(p).toBe(FIXTURE);
  });

  // Before the fetch returns there is nothing to say yet — and a real company
  // must not be shown the fixture while it waits.
  it('holds an honest empty while the match is still loading', () => {
    const p = panelFor({ live: null, key: 'aws', fixture: FIXTURE });
    expect(JSON.stringify(p)).not.toMatch(/unclaimed|already granted/i);
  });

  it('never returns undefined — the panel always has something to render', () => {
    for (const live of [null, undefined, {}, { aws: 'junk' }]) {
      expect(panelFor({ live, key: 'aws', fixture: FIXTURE })).toBeTruthy();
    }
  });
});
