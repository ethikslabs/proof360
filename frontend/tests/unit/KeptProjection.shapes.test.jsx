// RENDER ERROR — Minified React error #31, the whole chat replaced by a black
// screen, after John did the reads and kept the AWS suggestions (2026-08-26).
//
// args[]=object with keys {at, turn, spans, recent, note, note_status}
//
// That is momentContext(). I rendered `reason.context` as if it were a string
// because that is what I put in my own fixture — the exact mistake that produced
// "[object Object]" in ClaimStrip, except an object child throws instead of
// stringifying, so it took the entire application down rather than one line.
//
// Two lessons, both encoded below. First: build fixtures from the shape the
// server actually emits. Second, and the one that matters more — a projection
// must never be able to blank the app. Anything unexpected renders as nothing.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KeptProjection } from '../../src/components/chat/Projections.jsx';

const T = { theme: 'pearl' };

// The REAL shape, copied from momentContext() in api/src/handlers/shortlist.js.
const LIVE_CONTEXT = {
  at: '2026-08-26T10:11:20.418Z',
  turn: 4,
  spans: [{ turn: 2, role: 'user', ts: 1 }, { turn: 3, role: 'assistant', ts: 2 }],
  recent: [
    { kind: 'claim', field: 'market.customer_type', status: 'confirmed' },
    { kind: 'move', name: 'AWS Well-Architected Partner Program', at: '2026-08-26T10:10:00.000Z' },
  ],
  note: 'Added while discussing "We are looking at launching in Australia"; recently confirmed: customer type',
  note_status: 'inferred',
};

const LIVE_RECORD = {
  company_name: 'Cognisys',
  shortlist: [{
    cer_id: 'cer_1',
    route: 'ingram_micro_aws',
    label: 'AWS pathway via Ingram Micro',
    item: { title: 'AWS Well-Architected Partner Program', category: 'program' },
    reason: {
      trigger_id: 'aws-well-architected-partner',
      text: 'proposed because your cloud provider is confirmed as Oracle.',
      context: LIVE_CONTEXT,
      claims_cited: [{ claim_id: 'c1', field: 'infrastructure.cloud_provider', value: 'Oracle' }],
    },
    cta: { label: 'Book a conversation', url: 'https://example.com/book' },
    consent_state: 'granted',
  }],
  proposals: [],
  claims: [],
  confirmed_count: 0,
  total_count: 0,
};

describe('KeptProjection survives the shapes the server actually sends', () => {
  it('renders the live move shape without throwing', () => {
    expect(() => render(<KeptProjection record={LIVE_RECORD} t={T} />)).not.toThrow();
  });

  it('reads the human line out of the context object', () => {
    const { container } = render(<KeptProjection record={LIVE_RECORD} t={T} />);
    expect(container.textContent).toMatch(/while discussing "We are looking at launching in Australia"/);
    expect(container.textContent).not.toContain('[object Object]');
  });

  // context.note already begins with "Added" — prefixing it produced "Kept Added
  // while discussing…" the moment the crash was fixed naively.
  it('does not stutter a prefix onto a line that already has one', () => {
    const { container } = render(<KeptProjection record={LIVE_RECORD} t={T} />);
    expect(container.textContent).not.toMatch(/Kept Added/);
  });

  // The real defence. Whatever arrives in a text slot, the app stays up.
  it('renders nothing rather than throwing when any text slot holds an object', () => {
    const hostile = {
      ...LIVE_RECORD,
      shortlist: [{
        cer_id: 'cer_x',
        label: { nope: true },
        item: { title: { nope: true }, category: { nope: true } },
        reason: { text: { nope: true }, context: { nope: true } },
        cta: { label: { nope: true }, url: 'https://example.com' },
      }],
      proposals: [{ id: 'p', title: 'Fine', kind: { nope: true }, description: { nope: true }, reason: { nope: true } }],
    };
    expect(() => render(<KeptProjection record={hostile} t={T} />)).not.toThrow();
  });

  it('survives a record that is missing entirely', () => {
    expect(() => render(<KeptProjection t={T} />)).not.toThrow();
    expect(() => render(<KeptProjection record={null} t={T} />)).not.toThrow();
  });
});
