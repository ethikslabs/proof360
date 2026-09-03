// /raise is a projection: register order, four cells in words, no rank, no score, and the
// conditions the register states in prose are shown as "could not check", never passed.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import register from '../../src/data/capital-register.json';

const ENTRIES = [
  { session_id: 's1', occurred_at: '2026-07-19T00:00:00Z', label: 'First read', claims: [
    { subject: 'entity_type', statement: 'Pty Ltd', authority: 'legal' },
    { subject: 'soc2_status', statement: 'Type I filed', authority: 'provider' },
    { subject: 'match:aws_activate', statement: 'AWS Activate matched.', authority: 'system' },
  ] },
];
vi.mock('../../src/api/client', () => ({ getJourney: vi.fn(async () => ({ company: { name: 'Hive & Co' }, entries: ENTRIES })) }));

describe('/raise', () => {
  it('renders every register record in register order, each with a state in words', async () => {
    const { default: Raise } = await import('../../src/pages/Raise.jsx');
    const { container } = render(<MemoryRouter><Raise /></MemoryRouter>);
    await waitFor(() => expect(container.textContent).toMatch(/Hive & Co/));
    const cards = [...container.querySelectorAll('.rx-card')];
    expect(cards).toHaveLength(register.record_count);
    expect(cards.map((c) => c.querySelector('.rx-card-name').textContent)).toEqual(register.records.map((r) => r.name || r.id));
    for (const c of cards) expect(c.querySelector('.rx-state').textContent).toMatch(/^(reachable|gap|blocked)$/);
  });

  it('never ranks and never scores; unverified records and unevaluable conditions say so', async () => {
    const { default: Raise } = await import('../../src/pages/Raise.jsx');
    const { container } = render(<MemoryRouter><Raise /></MemoryRouter>);
    await waitFor(() => expect(container.textContent).toMatch(/Hive & Co/));
    const text = container.textContent;
    // "multiple" is the register's own English (multiple SAFEs, revenue multiple) — the words
    // that mark a returns engine are these.
    expect(text).not.toMatch(/\bscore\b|\brank(ed|ing)?\b|\bIRR\b|\d+(\.\d+)?×\s*multiple/i);
    expect(text).toMatch(/could not check/);
    // pick a record the register has not verified — it says so, it does not pretend
    const rumour = register.records.find((r) => !r.evidence.last_verified);
    fireEvent.click(screen.getByText(rumour.name));
    expect(container.textContent).toMatch(/unverified — a rumour/);
    const verified = register.records.find((r) => r.evidence.last_verified);
    fireEvent.click(screen.getByText(verified.name));
    expect(container.textContent).toMatch(/verified \d+ \w+ \d{4}/);
  });

  it('the join reacts to the founder\'s own facts — jurisdiction is an input, not a special case', async () => {
    const { default: Raise } = await import('../../src/pages/Raise.jsx');
    const { container } = render(<MemoryRouter><Raise /></MemoryRouter>);
    await waitFor(() => expect(container.textContent).toMatch(/Hive & Co/));
    fireEvent.click(screen.getByRole('radio', { name: 'SG' }));
    expect(screen.getByRole('radio', { name: 'SG' })).toHaveAttribute('aria-checked', 'true');
    expect(container.textContent).toMatch(/Implied valuation cap/);
  });
});
