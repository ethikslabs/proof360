// One record, one number, one door out.
//
// John's screenshots, 2026-08-26, all from a single screen: the panel header said
// "Cognisys · 12 noted" (claims + shortlist + proposals), the line directly under
// it said "6 things we've noted so far" (claims alone), and the left rail card
// said "COGNISYS 0/6" (a legacy tile count wired to nothing). Three numbers, one
// record. Any of them alone is defensible; together they read as a bug, because
// they are one.
//
// And the panel had outgrown the bubble: "what we need is a pop out to a new page
// with all of that, not just sitting in the bubble". So the panel keeps the
// glance and hands off the reading — it stops narrating a second count of its own
// and carries a door to the record instead.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompanionPanel } from '../../src/components/chat/CompanionPanel.jsx';

const CLAIMS = [
  { claim_id: 'c1', field: 'a', label: 'cloud provider', value: 'Oracle', status: 'confirmed', confirmed: { by: 'founder' } },
  { claim_id: 'c2', field: 'b', label: 'customer type', value: 'Mixed', status: 'inferred' },
];
const PROPOSALS = [
  { id: 'p1', kind: 'program', title: 'AWS Well-Architected Partner Program', reason: 'because Oracle' },
];

const draw = (props = {}) => render(
  <MemoryRouter>
    <CompanionPanel companyName="Cognisys" claims={CLAIMS} proposals={PROPOSALS} items={[]} {...props} />
  </MemoryRouter>
);

describe('CompanionPanel — a glance with a door in it', () => {
  it('carries a way through to the full record', () => {
    const { container } = draw();
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/record');
  });

  it('tells one story about how much there is, not two', () => {
    const { container } = draw();
    // The old second count ("N things we've noted so far") contradicted the
    // header on the same screen. Whatever the panel says, it says once.
    expect(container.textContent).not.toMatch(/things we've noted so far/i);
  });

  it('still names the company and counts the whole record in the header', () => {
    const { container } = draw();
    expect(container.textContent).toContain('Cognisys');
    expect(container.textContent).toMatch(/3 noted/);
  });

  it('renders nothing at all when the record is empty', () => {
    const { container } = render(
      <MemoryRouter><CompanionPanel claims={[]} proposals={[]} items={[]} /></MemoryRouter>
    );
    expect(container.textContent).toBe('');
  });
});
