// Even the demo shouldn't teach the wrong pattern.
//
// The Hive & Co fixture is defensible on its own terms — Hive & Co is fictional
// and carries the "Example company" marker, so it is illustrative rather than a
// false claim about a real account. But it is also the path John demos, and the
// copy it modelled was entitlement-shaped: "$10k unclaimed · Already granted ·
// expires Q4 · log in to redeem", "$220k+ sitting unclaimed at your stage".
//
// That is the exact grammar removed from the live product tonight. Left in the
// demo, it travels: it is the panel Sarvesh sees first and the one he would copy.
//
// The fixture keeps its teaching value — real programs, real amounts, real URLs —
// and loses the claim that any of it is already sitting in someone's account.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Relative to the vitest root (frontend/). Deliberately no process.cwd() — the
// test lint config has no node globals, and CI runs `npm run lint` across tests
// as well as src, which is how this file failed the deploy on its first push.
const src = readFileSync('src/components/chat/Projections.jsx', 'utf8');
const fixtures = src.slice(src.indexOf('const YOURS_AWS'), src.indexOf('function AwsProjection'));

// The first cut of this test read only Projections.jsx — and missed the demo data
// that is ACTUALLY on screen during the walkthrough. hive.js supplies the Hive &
// Co stage panels, and it still said "Founders Hub is unclaimed — $150k in Azure
// credits... Most of this is just sitting there." The panel John demos was the one
// place the grammar survived, because the test looked everywhere except there.
// Caught by grepping the deployed bundle, not by the suite.
const hive = readFileSync('src/data/mock/hive.js', 'utf8');
const allDemoCopy = fixtures + hive;

describe('the demo fixtures model the grammar we want copied', () => {
  it('claims nothing is already granted or waiting to be redeemed', () => {
    expect(allDemoCopy).not.toMatch(/already granted/i);
    expect(allDemoCopy).not.toMatch(/log in to redeem/i);
    expect(allDemoCopy).not.toMatch(/unclaimed/i);
  });

  it('does not assert a total sitting in the founder’s accounts', () => {
    expect(allDemoCopy).not.toMatch(/sitting there/i);
    expect(allDemoCopy).not.toMatch(/just sitting/i);
    expect(allDemoCopy).not.toMatch(/\$220k\+/);
  });

  // It must still be worth demoing — real programs, real value, real links.
  it('keeps the substance: named programs with what they are worth', () => {
    expect(fixtures).toMatch(/AWS Activate/);
    expect(fixtures).toMatch(/Founders Hub/);
    expect(fixtures).toMatch(/\$\d/);
    expect(fixtures).toMatch(/https:\/\/aws\.amazon\.com/);
  });

  it('speaks in eligibility, which is what a match actually is', () => {
    expect(fixtures).toMatch(/qualif|eligib|apply|typical/i);
  });
});
