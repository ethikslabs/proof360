// Honest degradation on the two places the reading can quietly lie: a reply that failed
// must not wear a persona, and a citation the model made up must not look like one.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Bubble } from '../../src/components/chat/Bubble.jsx';

const t = { theme: 'paper' };

describe('a failed turn is a failure, not an answer', () => {
  it('renders no persona label and an alert, with the message', () => {
    const msg = { id: 'x', role: 'assistant', persona: 'sofia', failed: true, content: 'Something went wrong. Try again.' };
    const { container } = render(<Bubble msg={msg} t={t} />);
    expect(container.querySelector('[data-failed-turn]')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain('Something went wrong');
    expect(container.textContent).not.toMatch(/soph?ia/i);
  });
  it('an ordinary persona turn still carries its label', () => {
    const msg = { id: 'y', role: 'assistant', persona: 'sofia', content: 'Here is what we hold.' };
    const { container } = render(<Bubble msg={msg} t={t} />);
    expect(container.querySelector('[data-failed-turn]')).toBeNull();
    expect(container.textContent).toMatch(/soph?ia/i);
  });
});

describe('a citation with nothing behind it', () => {
  it('renders as an unsourced mark, not as a bracket that passes for a source', () => {
    const msg = { id: 'z', role: 'assistant', persona: 'sofia', content: 'Operating in 19 countries [3].', working: { hits: [{ n: 1, slug: 'x', excerpt: 'e' }] } };
    const { container } = render(<Bubble msg={msg} t={t} />);
    const mark = container.querySelector('[data-unsourced-citation="3"]');
    expect(mark).not.toBeNull();
    expect(mark.textContent).toBe('[3 · no source]');
    expect(container.querySelector('a[aria-label^="Source 3"]')).toBeNull();
  });
});
