// "How we read this" after the 2026-09-03 workshop: one gesture, and it opens the
// Inspector — the single level-2 surface — rather than a ladder of its own. The two
// rulings this file holds together: John 2026-08-26 (the number is not deleted, it is
// demoted to something chosen and labelled as method) and the branch's cap of two
// disclosure levels (NN/g). Rungs 1–2 are the Inspector's witnesses; rung 3 is its receipt.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { HowWeReadThis, readingInspection } from '../../src/components/chat/HowWeReadThis.jsx';
import { Inspector } from '../../src/components/chat/Inspector.jsx';

const GAPS = [
  { gap_id: 'soc2', title: 'SOC 2 certification gap', severity: 'critical', score_impact: 20,
    why: 'Without SOC 2 certification, enterprise buyers cannot verify your security controls.' },
  { gap_id: 'dmarc', title: 'Email domain protection gap (DMARC)', severity: 'moderate', score_impact: 5,
    why: 'Your domain has a DMARC record but the policy is set to p=none — monitoring only.' },
  { gap_id: 'nothing', title: 'A gap with no weight', score_impact: 0, why: 'should not be listed' },
];
const VERDICTS = [/deal ready/i, /needs work/i, /\bpartial\b/i, /\bpoor\b/i, /\bgood\b/i];
const tk = { ink: '#1f2430', inkMid: '#444', inkSoft: '#94a3b8', inkGhost: '#bbb', hairline: '#eee', hairStrong: '#ccc', plum: '#6b4ea8', surface: '#fff', bgTint: '#f7f5f0' };

describe('closed grades nobody', () => {
  it('renders one affordance and no number, total or verdict', () => {
    const { container, getByRole } = render(<HowWeReadThis gaps={GAPS} trustScore={15} tk={tk} onOpen={() => {}} />);
    const text = container.textContent;
    expect(getByRole('button', { name: /how we read this/i })).toBeTruthy();
    expect(text).not.toMatch(/\b(15|20|100)\b/);
    expect(text).not.toContain('/100');
    for (const v of VERDICTS) expect(text).not.toMatch(v);
    expect(container.querySelectorAll('button')).toHaveLength(1); // no ladder of its own
  });

  it('the gesture opens the Inspector with the reading as its subject', () => {
    const onOpen = vi.fn();
    const { getByRole } = render(<HowWeReadThis gaps={GAPS} trustScore={15} tk={tk} onOpen={onOpen} />);
    fireEvent.click(getByRole('button', { name: /how we read this/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].subject.kind).toBe('reading');
  });
});

describe('readingInspection — the ledger as an Inspector payload', () => {
  it('names only the gaps that carried weight, each with its reasoning (rungs 1 + 2, one surface)', () => {
    const p = readingInspection({ gaps: GAPS, trustScore: 15 });
    expect(p.subject.value).toBe('2 gaps carried weight.');
    expect(p.observations.map((o) => o.value)).toEqual(['SOC 2 certification gap', 'Email domain protection gap (DMARC)']);
    expect(p.observations[0].excerpt).toMatch(/enterprise buyers cannot verify/);
    expect(p.observations[1].excerpt).toMatch(/monitoring only/);
    expect(JSON.stringify(p.observations)).not.toContain('no weight');
  });

  it('keeps the arithmetic in the receipt, labelled as method — subtractions and what is left', () => {
    const p = readingInspection({ gaps: GAPS, trustScore: 15 });
    expect(p.acts.map((a) => a.note)).toEqual(['100', '− 20', '− 5', '15']);
    expect(p.acts[0].title).toMatch(/not a measurement of your company/);
    expect(p.acts.at(-1).title).toMatch(/visible from outside/);
    expect(p.disconfirmer).toMatch(/Close any of these/);
  });

  it('derives the remainder when no score is handed in, and says so honestly when nothing counted', () => {
    expect(readingInspection({ gaps: GAPS }).acts.at(-1).note).toBe('75');
    const empty = readingInspection({ gaps: [], trustScore: 100 });
    expect(empty.subject.value).toMatch(/Nothing counted against you/);
    expect(empty.observations).toEqual([]);
    expect(empty.acts).toEqual([]);
    expect(empty.disconfirmer).toBeNull();
  });

  it('renders inside the real Inspector with the reading copy, not the claim copy', () => {
    const p = readingInspection({ gaps: GAPS, trustScore: 15 });
    const { container } = render(<Inspector {...p} tk={tk} onClose={() => {}} />);
    const text = container.textContent;
    expect(text).toContain('SOC 2 certification gap');
    expect(text).toContain('This is what ran, not why it’s right.');
    expect(text).not.toMatch(/don’t all say the same thing/);
    const empty = render(<Inspector {...readingInspection({ gaps: [], trustScore: 100 })} tk={tk} onClose={() => {}} />);
    expect(empty.container.textContent).toMatch(/Nothing counted against you/);
    expect(empty.container.textContent).not.toMatch(/We looked and found nothing/);
  });
});
