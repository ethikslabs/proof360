// "How we read this" — the answer to John's 2026-08-26 question, "we should have
// a way to 'how do we rate this' something or other... but that is all
// progressive decision based reveal."
//
// The number is not deleted. It is demoted to the bottom rung of a ladder
// somebody chooses to climb. Handed to a founder unasked, 15/100 is a school
// mark and it stings. Reached deliberately, by someone who asked how the machine
// works, the same arithmetic is just the machine's working — and in a lab that is
// the interesting part, not the embarrassing one.
//
// The rungs, and nothing may skip one:
//   0  closed        no number, no verdict, no colour — a founder who never
//                    opens this is never graded
//   1  what counted  the gaps that carried weight, named
//   2  why it counted  one gap's reasoning, opened one at a time
//   3  the arithmetic  100 minus the subtractions — machinery, labelled as such
//
// Sibling of OurWorking (the corpus curtain) by design: same affordance, so a
// founder learns one gesture and both ledgers open to it.
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { HowWeReadThis } from '../../src/components/chat/HowWeReadThis.jsx';

// The real shape gap-mapper emits.
const GAPS = [
  {
    gap_id: 'soc2',
    title: 'SOC 2 certification gap',
    severity: 'critical',
    score_impact: 20,
    why: 'Without SOC 2 certification, enterprise buyers cannot verify your security controls.',
  },
  {
    gap_id: 'dmarc',
    title: 'Email domain protection gap (DMARC)',
    severity: 'moderate',
    score_impact: 5,
    why: 'Your domain has a DMARC record but the policy is set to p=none — monitoring only.',
  },
];

const VERDICTS = [/deal ready/i, /needs work/i, /\bpartial\b/i, /\bpoor\b/i, /\bgood\b/i];

describe('HowWeReadThis — rung 0: closed grades nobody', () => {
  it('shows no number, no total and no verdict before it is opened', () => {
    const { container } = render(<HowWeReadThis gaps={GAPS} trustScore={15} />);
    const text = container.textContent;
    expect(text).not.toContain('15');
    expect(text).not.toContain('/100');
    expect(text).not.toContain('20');
    for (const v of VERDICTS) expect(text).not.toMatch(v);
  });

  it('offers the method, not a result', () => {
    const { getByRole } = render(<HowWeReadThis gaps={GAPS} trustScore={15} />);
    expect(getByRole('button', { name: /how we read this/i })).toBeTruthy();
  });
});

describe('HowWeReadThis — rung 1: what counted', () => {
  it('names the gaps that carried weight, and still shows no total', () => {
    const { getByRole, container } = render(<HowWeReadThis gaps={GAPS} trustScore={15} />);
    fireEvent.click(getByRole('button', { name: /how we read this/i }));

    expect(container.textContent).toContain('SOC 2 certification gap');
    expect(container.textContent).toContain('Email domain protection gap (DMARC)');
    // The arithmetic is a rung further down. Opening "what counted" must not
    // pronounce a result.
    expect(container.textContent).not.toContain('/100');
    expect(container.textContent).not.toMatch(/\b15\b/);
  });

  it('says so honestly when nothing counted, rather than rendering an empty ledger', () => {
    const { getByRole, container } = render(<HowWeReadThis gaps={[]} trustScore={100} />);
    fireEvent.click(getByRole('button', { name: /how we read this/i }));
    expect(container.textContent).toMatch(/nothing counted against/i);
    expect(container.textContent).not.toContain('100');
  });
});

describe('HowWeReadThis — rung 2: why it counted', () => {
  it('opens one gap at a time and gives its reasoning', () => {
    const { getByRole, getByText, container } = render(<HowWeReadThis gaps={GAPS} trustScore={15} />);
    fireEvent.click(getByRole('button', { name: /how we read this/i }));

    expect(container.textContent).not.toContain('enterprise buyers cannot verify');
    fireEvent.click(getByText('SOC 2 certification gap'));
    expect(container.textContent).toContain('enterprise buyers cannot verify');

    // Opening a second closes the first — one thing at a time, like the corpus curtain.
    fireEvent.click(getByText('Email domain protection gap (DMARC)'));
    expect(container.textContent).toContain('monitoring only');
    expect(container.textContent).not.toContain('enterprise buyers cannot verify');
  });
});

describe('HowWeReadThis — rung 3: the arithmetic', () => {
  function descend(api) {
    fireEvent.click(api.getByRole('button', { name: /how we read this/i }));
    fireEvent.click(api.getByRole('button', { name: /show the arithmetic/i }));
  }

  it('reveals the subtractions and the number only on a deliberate third choice', () => {
    const api = render(<HowWeReadThis gaps={GAPS} trustScore={15} />);
    expect(api.container.textContent).not.toContain('15');

    descend(api);

    const text = api.container.textContent;
    expect(text).toContain('20');   // the SOC 2 subtraction
    expect(text).toContain('5');    // the DMARC subtraction
    expect(text).toContain('15');   // what is left
  });

  it('labels the number as method, never as a mark on the company', () => {
    const api = render(<HowWeReadThis gaps={GAPS} trustScore={15} />);
    descend(api);

    const text = api.container.textContent;
    // It must say out loud what it is: an arithmetic starting point minus
    // subtractions, not a measurement of the company.
    expect(text).toMatch(/not a measurement|not a mark|how the arithmetic works/i);
    for (const v of VERDICTS) expect(text).not.toMatch(v);
  });

  it('never colours the number by how low it is', () => {
    const low = render(<HowWeReadThis gaps={GAPS} trustScore={15} />);
    descend(low);
    const html = low.container.innerHTML;
    // The traffic lights that made it a report card.
    expect(html).not.toContain('#dc2626');
    expect(html).not.toContain('#b91c1c');
    expect(html).not.toContain('#059669');
  });
});
