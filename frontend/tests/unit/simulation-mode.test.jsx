// The demo/workspace boundary as a CONTROL, not a caption (John ruling 2026-09-02).
//
// INVARIANTS.md §4 has always required these two states to be visually distinct at all
// times. What shipped was an amber caption reading "reference founder — funded,
// attested" — the two strongest truth words this product owns, on a company canon
// records as "domain purchased, product fictional" — and a rail that expanded the
// worked example while collapsing the live company to one line.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../../src/components/chat/Sidebar.jsx';
import { SimulationSwitch } from '../../src/components/chat/SimulationSwitch.jsx';
import { tokens } from '../../src/tokens.js';

const tk = tokens('parallel');

const base = {
  collapsed: false, onToggleCollapse: () => {}, activeSpace: null, onSwitch: () => {},
  litTiles: {}, browserTabs: [], onInject: () => {}, onHiveStageChange: () => {},
  yourCompanyName: 'Cognisys', cers: [], onSignIn: () => {},
  t: { theme: 'parallel', headingFamily: 'serif' },
};

const draw = (props = {}) => render(
  <MemoryRouter><Sidebar {...base} {...props} /></MemoryRouter>
);

describe('SimulationSwitch', () => {
  it('is a switch, and says which state you are in', () => {
    render(<SimulationSwitch on onToggle={() => {}} tk={tk} />);
    const el = screen.getByRole('switch');
    expect(el).toHaveAttribute('aria-checked', 'true');
    expect(el).toHaveTextContent(/simulation/i);
  });

  it('reads Live when it is off', () => {
    render(<SimulationSwitch on={false} onToggle={() => {}} tk={tk} />);
    expect(screen.getByRole('switch')).toHaveTextContent(/live/i);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('flips', () => {
    const onToggle = vi.fn();
    render(<SimulationSwitch on onToggle={onToggle} tk={tk} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalled();
  });

  // Once a real read is running, which state you are in is a fact, not a preference.
  it('locks to Live and refuses the flip while real work is in flight', () => {
    const onToggle = vi.fn();
    render(<SimulationSwitch on locked onToggle={onToggle} tk={tk} />);
    const el = screen.getByRole('switch');
    expect(el).toBeDisabled();
    expect(el).toHaveTextContent(/live/i);
    expect(el).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(el);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('the rail follows the switch', () => {
  // The accordion collapses by max-height, so children stay in the DOM. Open/closed is
  // read off aria-expanded, which is also what assistive tech goes by.
  const sectionOpen = (name) =>
    screen.getByRole('button', { name: new RegExp(name, 'i') }).getAttribute('aria-expanded');

  // Simulation on: the worked example is the subject, so it is the one that is open.
  it('opens the example when simulation is on', () => {
    const { container } = draw({ simulation: true, record: { confirmed: 3, total: 6 } });
    expect(container.textContent).toMatch(/Example company/i);
    expect(sectionOpen('Hive')).toBe('true');
  });

  // Simulation off: your own record is the subject. The example stays present as a
  // peer you can open for comparison — that comparison is what the rail is for.
  it('gives the space to your own record when simulation is off', () => {
    const { container } = draw({ simulation: false, record: { confirmed: 3, total: 6 } });
    expect(container.textContent).toContain('Cognisys');
    expect(container.textContent).toContain('3/6');
    expect(sectionOpen('Hive')).toBe('false');
    expect(sectionOpen('Cognisys')).toBe('true');
  });

  it('keeps the example reachable in either state', () => {
    const { container } = draw({ simulation: false });
    expect(container.textContent).toMatch(/Hive/i);
  });
});

describe('the example is labelled as an example', () => {
  it('uses the wording INVARIANTS §4 specifies', () => {
    const { container } = draw({ simulation: true });
    expect(container.textContent).toMatch(/Example company · Hive & Co/i);
  });

  // The rule, not the copy. "Attested" is the strongest word the product owns and it
  // must never describe a fictional record, however the label is later reworded.
  it('never dresses a fictional record in verified vocabulary', () => {
    const { container } = draw({ simulation: true });
    expect(container.textContent).not.toMatch(/attested/i);
    expect(container.textContent).not.toMatch(/funded/i);
  });
});
