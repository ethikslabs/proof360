// The stack, shown — for the Sarvesh demo. The governing rule: a mark is bound to what
// ACTUALLY ran. This is the truthful-engines ruling applied to the logo layer — a brand
// shown for a service that did not fire is the same defect in a better suit.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VendorRow, vendorsForAct, VENDORS } from '../../src/components/chat/VendorMarks.jsx';

const act = (id, over = {}) => ({ id, title: 't', phase: 'done', note: '', body: [], ...over });

describe('vendorsForAct — derived from what the backend reported', () => {
  it('names the research engines on their own steps', () => {
    expect(vendorsForAct(act('perplexity')).map((v) => v.name)).toEqual(['Perplexity']);
    expect(vendorsForAct(act('gemini')).map((v) => v.name)).toEqual(['Gemini']);
    expect(vendorsForAct(act('site')).map((v) => v.name)).toEqual(['Firecrawl']);
  });

  it('reads the model and host out of the note, not a hardcoded guess', () => {
    const names = vendorsForAct(act('reading', { note: 'claude haiku · bedrock' })).map((v) => v.name);
    expect(names).toEqual(['Anthropic', 'AWS']);
  });

  it('drops the host when the note does not claim one', () => {
    expect(vendorsForAct(act('correlate', { note: 'claude haiku' })).map((v) => v.name))
      .toEqual(['Anthropic']);
  });

  it('claims nothing when the note names nothing', () => {
    expect(vendorsForAct(act('reading', { note: '' }))).toEqual([]);
  });

  it('shows no vendor for our own steps', () => {
    expect(vendorsForAct(act('perimeter'))).toEqual([]);
    expect(vendorsForAct(act('corpus')).every((v) => v.own)).toBe(true);
  });

  it('survives a malformed act instead of inventing a stack', () => {
    expect(vendorsForAct(null)).toEqual([]);
    expect(vendorsForAct({})).toEqual([]);
  });
});

describe('an engine that did not answer is marked attempted, never hidden', () => {
  // The second read 404s regularly. Hiding it would misrepresent what the machine did;
  // showing it as a success would invent a witness.
  it('flags a failed engine as attempted', () => {
    const [g] = vendorsForAct(act('gemini', { phase: 'skip', note: 'engine error (404)' }));
    expect(g.name).toBe('Gemini');
    expect(g.attempted).toBe(true);
  });

  it('does not flag a successful engine', () => {
    expect(vendorsForAct(act('perplexity', { phase: 'done' }))[0].attempted).toBe(false);
  });

  it('says so in the title text a human can hover', () => {
    render(<VendorRow act={act('gemini', { phase: 'fail' })} tk={{}} />);
    expect(screen.getByTitle(/attempted, did not answer/i)).toBeTruthy();
  });
});

describe('rendering', () => {
  it('renders the vendor name beside its mark', () => {
    render(<VendorRow act={act('perplexity')} tk={{}} />);
    expect(screen.getByText('Perplexity')).toBeTruthy();
  });

  it('renders nothing at all for a step with no named service', () => {
    const { container } = render(<VendorRow act={act('perimeter')} tk={{}} />);
    expect(container.textContent).toBe('');
  });

  it('every registry entry has a name, a colour and a mark to swap out', () => {
    for (const [key, v] of Object.entries(VENDORS)) {
      expect(v.name, key).toBeTruthy();
      expect(v.color, key).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof v.mark, key).toBe('function');
    }
  });
});
