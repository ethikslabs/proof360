// frontend/tests/unit/PersonaFollowUps.test.jsx
// Live persona follow-up chips (docs/plans/2026-08-25-persona-chips-and-proposal-cards.md,
// Task 2). No canned text in live: this component only ever renders what the
// /followups endpoint actually returned — empty/null in, nothing out.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonaFollowUps } from '../../src/components/chat/PersonaFollowUps.jsx';

const tk = { ink: '#111', inkSoft: '#94a3b8', hairline: '#e5e5e5', bg: '#fff' };

const THREE = [
  { persona: 'sofia', question: 'What does investors actually check first?' },
  { persona: 'edison', question: 'What kills a technical DD most often?' },
  { persona: 'leonardo', question: 'What red flags should I watch for in a term sheet?' },
];

describe('PersonaFollowUps', () => {
  it('renders nothing when followups is empty', () => {
    const { container } = render(<PersonaFollowUps followups={[]} onAsk={() => {}} tk={tk} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when followups is null', () => {
    const { container } = render(<PersonaFollowUps followups={null} onAsk={() => {}} tk={tk} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders three chips with persona display names and questions', () => {
    render(<PersonaFollowUps followups={THREE} onAsk={() => {}} tk={tk} />);
    expect(screen.getByText('Sophia')).toBeTruthy();
    expect(screen.getByText('Edison')).toBeTruthy();
    expect(screen.getByText('Leonardo')).toBeTruthy();
    expect(screen.getByText(/What does investors actually check first\?/)).toBeTruthy();
    expect(screen.getByText(/What kills a technical DD most often\?/)).toBeTruthy();
    expect(screen.getByText(/What red flags should I watch for in a term sheet\?/)).toBeTruthy();
  });

  it('clicking a chip fires onAsk with (persona, question)', () => {
    const onAsk = vi.fn();
    render(<PersonaFollowUps followups={THREE} onAsk={onAsk} tk={tk} />);
    fireEvent.click(screen.getByText(/What kills a technical DD most often\?/).closest('button'));
    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(onAsk).toHaveBeenCalledWith('edison', 'What kills a technical DD most often?');
  });
});
