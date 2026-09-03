// /journey is the one score-bearing page the 2026-08-26 no-scores ruling never reached:
// commit 86d2f82 converted FounderDashboard, PortalDashboard and Projections and skipped
// Journey.jsx (last touched 75b7524, 3 Jul), and no-scores.render.test.jsx has no case for it.
// deriveArc() — BASE 52, gap −9, match +5, outcome +13 — is a score by another name, and every
// chapter carries a "posture ↑ 13" chip. Ruled again in the Sarvesh Lab workshop, 2026-09-03:
// the curve goes; presence by chapter replaces it. A count of rooms open is allowed (John,
// by design, 2026-09-03) — a weighted number is not.
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const ENTRIES = [
  { id: 'j1', occurred_at: '2026-07-19T00:00:00Z', label: 'First read', claims: [
    { subject: 'read:cold', statement: 'Cold read from the public front door.', authority: 'reality' },
    { subject: 'match:aws_activate', statement: 'AWS Activate matched.', authority: 'system' },
  ] },
  { id: 'j2', occurred_at: '2026-07-26T00:00:00Z', label: 'Orders grow', claims: [
    { subject: 'gap:backup_dr', statement: 'backup_dr OPEN (high).', authority: 'system' },
  ] },
];

vi.mock('../../src/api/client', () => ({
  getJourney: vi.fn(async () => ({ company: { name: 'Hive & Co' }, entries: ENTRIES })),
}));

describe('/journey renders presence, never a posture score', () => {
  it('shows no posture delta, no momentum number and no derived curve', async () => {
    const { default: Journey } = await import('../../src/pages/Journey.jsx');
    const { container } = render(<MemoryRouter><Journey /></MemoryRouter>);
    await waitFor(() => expect(container.textContent).toMatch(/Hive/));
    const text = container.textContent || '';
    expect(text).not.toMatch(/posture\s*[↑↓]\s*\d+/i);
    expect(text).not.toMatch(/trust momentum/i);
    expect(text).not.toMatch(/[↑↓]\s*\d+/);
    expect(text).not.toContain('/100');
    expect(container.querySelector('[data-posture-curve]')).toBeNull();
    expect(container.querySelector('svg path[d^="M"]')).toBeNull();
  });
});
