// Contract test: honest-zero-plus-shopping-list (workspace standing contract for ANY
// advisory/register surface). Fixture: the soil-in-Africa walkthrough — an agritech
// founder asks for models/data; the model register honestly zeroes, the data register
// answers with named free datasets, and the paid lane stays below in the customer's
// own billing frame. If this test fails, the surface is bluffing or upselling.
import { describe, it, expect } from 'vitest';
import {
  registerAdvisory,
  adviseModels,
  adviseData,
  extractTerms,
} from '../../src/services/register-advisory.js';

const SOIL_QUERY = 'soil chemistry data for smallholder farms in Africa';

describe('advisory law 2 — the honest zero is an answer, not an apology', () => {
  it('domain query zeroes on models WITH full provenance (total/sources/derived_at)', () => {
    const m = adviseModels(SOIL_QUERY);
    expect(m.match_count).toBe(0);
    expect(m.matches).toEqual([]);
    // The zero must still say what was searched — that is what makes it honest.
    expect(m.total).toBeGreaterThan(600);
    expect(m.sources).toBeGreaterThanOrEqual(9);
    expect(m.derived_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('never bluffs: a nonsense query zeroes on both registers with provenance intact', () => {
    const a = registerAdvisory('xyzzy plugh frobnicate');
    expect(a.models.match_count).toBe(0);
    expect(a.data.match_count).toBe(0);
    expect(a.models.total).toBeGreaterThan(0);
    expect(a.data.total).toBeGreaterThan(1000);
    expect(a.data.derived_at).toBeTruthy();
  });
});

describe('the shopping list — named free data follows the zero', () => {
  it('finds AfSIS Soil Chemistry for the soil-in-Africa fixture, provenance-linked', () => {
    const d = adviseData(SOIL_QUERY);
    expect(d.match_count).toBeGreaterThan(0);
    const afsis = d.matches.find((x) => x.dataset_id === 'afsis');
    expect(afsis).toBeTruthy();
    expect(afsis.commercial).toBe('free');
    expect(afsis.name).toMatch(/AfSIS.*Soil Chemistry/);
    expect(afsis.link).toBe('https://registry.opendata.aws/afsis/');
    expect(afsis.license).toBeTruthy();
  });
});

describe('advisory law 3 — free sorts first, from the register field', () => {
  it('every free match precedes every paid match', () => {
    const d = adviseData('satellite imagery agriculture');
    const kinds = d.matches.map((x) => x.commercial);
    const firstPaid = kinds.indexOf('paid');
    const lastFree = kinds.lastIndexOf('free');
    if (firstPaid !== -1 && lastFree !== -1) expect(lastFree).toBeLessThan(firstPaid);
    // aws-open-data is a free register — matches must never invent a paid flag.
    expect(kinds.every((k) => k === 'free' || k === 'paid')).toBe(true);
  });
});

describe('advisory law 4 — paid lane below the answer, customer billing frame, margin disclosed', () => {
  it('paid_rail is a separate field framed to the CUSTOMER account with margin disclosed', () => {
    const d = adviseData(SOIL_QUERY);
    expect(d.paid_rail).toBeTruthy();
    expect(d.paid_rail.commercial).toBe('paid');
    expect(d.paid_rail.billing_frame).toMatch(/customer's AWS account/i);
    expect(d.paid_rail.billing_frame).toMatch(/FORUM/);
    expect(d.paid_rail.margin).toMatch(/disclosed/i);
    // The rail must NOT be inside matches — it renders BELOW the free answer.
    expect(d.matches.find((x) => x.name === 'AWS Data Exchange')).toBeUndefined();
  });
});

describe('mechanics', () => {
  it('extractTerms drops stopwords and generic ask-words', () => {
    expect(extractTerms('what models do we have for soil data in Africa?'))
      .toEqual(expect.arrayContaining(['soil', 'africa']));
    expect(extractTerms('do we have any datasets')).toEqual([]);
  });

  it('a provider query DOES match models (the zero is honest, not hardcoded)', () => {
    const m = adviseModels('anthropic claude');
    expect(m.match_count).toBeGreaterThan(0);
    expect(m.matches[0]).toHaveProperty('model_id');
    expect(m.matches[0]).toHaveProperty('source');
  });

  // The honest-zero law forbids FALSE zeros too: capability words live in the
  // register's input/output modalities and must match (Codex P2, PR #18).
  it('a capability query matches modalities — never a false zero', () => {
    const m = adviseModels('which models can process images');
    expect(m.match_count).toBeGreaterThan(0);
    for (const match of m.matches) {
      const mods = [...(match.input || []), ...(match.output || [])].map((x) => String(x).toUpperCase());
      expect(mods).toContain('IMAGE');
    }
    expect(adviseModels('models for audio transcription').match_count).toBeGreaterThan(0);
  });

  // Sparse rows (openai-direct tts-1 / whisper-1) carry only an id — the response
  // must never surface undefined name/provider (Codex P2, PR #18).
  it('id-only register rows get name/provider fallbacks', () => {
    const m = adviseModels('whisper');
    expect(m.match_count).toBeGreaterThan(0);
    for (const match of m.matches) {
      expect(match.name).toBeTruthy();
      expect(match.provider).toBeTruthy();
    }
  });

  it('empty query returns zeros with provenance, no throw', () => {
    const a = registerAdvisory('');
    expect(a.models.match_count).toBe(0);
    expect(a.data.match_count).toBe(0);
    expect(a.data.paid_rail).toBeTruthy();
  });

  // Ask-shape words describe the ASK, not the domain — "find open data" must not
  // match OpenAI/OpenOrca on "open" (Codex P2, PR #18 round 3).
  it('ask-only queries zero instead of matching on ask words', () => {
    expect(extractTerms('find open data available for use')).toEqual([]);
    const m = adviseModels('find open data');
    expect(m.match_count).toBe(0);
  });

  // match_count is TOTAL hits, never the display page size (Codex P2, PR #18 round 3).
  it('match_count reports total hits while matches carries the top page', () => {
    const d = adviseData('agriculture');
    expect(d.matches.length).toBeLessThanOrEqual(5);
    expect(d.match_count).toBeGreaterThan(d.matches.length);
  });
});
