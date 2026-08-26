// Sensitivity marking on corpus citations — John's ruling 2026-08-26.
//
// The find: an anonymous read of dnx.solutions retrieves
// `ethiks360-ethiks360-ramble-source-pack` — our own partner strategy notes,
// including verbatim quotes from a private DNX call — and renders it as a
// citation card in the same frame as a Yahoo Finance article. It also fires on
// Unity PAC, "Ethiks360 partners", and proof360 reading itself. Same sweep found
// QMS records, an account application and a Palo Alto LOA all carrying
// access_layer: public.
//
// John's ruling, verbatim intent: "That is all privacy - for the lab today, let
// it all out for Sarvesh to see, but if we do can we tag it as potentially
// sensitive - just for the demo?"
//
// So: no filtering. The card still appears — Sarvesh is being shown the whole
// kit, edges included. What changes is that it stops passing itself off as
// neutral third-party evidence. Two independent signals earn the mark:
//
//   1. it comes from one of OUR layers (ethikslabs / ethiks360) — our opinion
//      about someone, not evidence about them
//   2. it has no source_url — nothing the reader can open and check
//
// DEMO-SCOPED. The durable fix is the access-class question John parked: what
// the default class is for our own layers, and whether a customer-facing read
// should reach them at all. This marker makes the exposure visible; it does not
// close it.
import { describe, it, expect } from 'vitest';
import { sensitivityOf, SENSITIVE_NOTE } from '../../src/rendering/sensitivity.js';

const THIRD_PARTY_HIT = {
  slug: 'disc-finance-yahoo-com-leeds-australia-cognisys',
  layer: 'vendor/cognisys',
  source_url: 'https://finance.yahoo.com/sectors/technology/articles/leeds-australia-beyond-cognisys-takes-100000023.html',
  excerpt: 'Team of 120 specialists operating across 19 countries.',
};

const OUR_OWN_HIT = {
  slug: 'ethiks360-ethiks360-ramble-source-pack',
  layer: 'vendor/ethiks360',
  access_layer: 'public',
  source_url: null,
  excerpt: 'DNX\'s response: "Yeah, I do. This is amazing."',
};

const UNCHECKABLE_HIT = {
  slug: '2026-07-09--arnnet--blackbird-it-appoints-kelly-griffin-as-ceo',
  layer: 'commercial/channel/arnnet',
  source_url: null,
  excerpt: 'In addition to his time at DNX, he also worked…',
};

describe('sensitivityOf — marks what should not read as neutral evidence', () => {
  it('leaves a genuine third-party source with a live URL unmarked', () => {
    expect(sensitivityOf(THIRD_PARTY_HIT)).toBeNull();
  });

  it('marks our own material, whatever its access class says', () => {
    const mark = sensitivityOf(OUR_OWN_HIT);
    expect(mark).not.toBeNull();
    expect(mark.reasons).toContain('our own material');
  });

  it('marks a hit with nothing the reader can open and check', () => {
    const mark = sensitivityOf(UNCHECKABLE_HIT);
    expect(mark).not.toBeNull();
    expect(mark.reasons).toContain('no published source');
  });

  it('names both reasons when both apply — the DNX pack is the worked example', () => {
    const mark = sensitivityOf(OUR_OWN_HIT);
    expect(mark.reasons).toEqual(
      expect.arrayContaining(['our own material', 'no published source'])
    );
  });

  it('catches the company/ethikslabs layer as well as vendor/ethiks360', () => {
    expect(sensitivityOf({ layer: 'company/ethikslabs', source_url: 'https://example.com/x' })).not.toBeNull();
  });

  it('does not mark a partner\'s own layer just because it shares a word', () => {
    expect(sensitivityOf({ layer: 'vendor/paloalto', source_url: 'https://paloalto.example/loa' })).toBeNull();
  });

  it('survives a malformed hit rather than throwing inside a render', () => {
    expect(() => sensitivityOf(null)).not.toThrow();
    expect(() => sensitivityOf({})).not.toThrow();
    expect(sensitivityOf(null)).toBeNull();
    // No layer and no URL is still uncheckable, and says so.
    expect(sensitivityOf({}).reasons).toContain('no published source');
  });

  it('the note names what it is without alarming — lamp, not siren', () => {
    expect(SENSITIVE_NOTE).toMatch(/check/i);
    expect(SENSITIVE_NOTE).not.toMatch(/warning|danger|breach|leak/i);
  });
});
