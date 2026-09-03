// The founder's end of the introduction. Consent at both ends means the founder must have a
// surface where the ask lands and a working answer — the lab's prototype had the partner's
// own second click standing in for this, and a Withdraw button with no handler.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntroductionAsk } from '../../src/components/chat/IntroductionAsk.jsx';

const tk = { plum: '#6b4ea8', hairline: '#e5e7eb', surface: '#fff', inkSoft: '#8c8499', inkMid: '#5a5267' };

describe('IntroductionAsk', () => {
  it('renders nothing when nobody has asked', () => {
    const { container } = render(<IntroductionAsk introduction={{ state: 'none' }} tk={tk} />);
    expect(container.firstChild).toBeNull();
    expect(render(<IntroductionAsk tk={tk} />).container.firstChild).toBeNull();
  });

  it('an ask offers grant and decline, and each one reaches the handler', () => {
    const onAction = vi.fn();
    render(<IntroductionAsk introduction={{ state: 'asked', partner: 'ingram_micro' }} tk={tk} onAction={onAction} />);
    expect(screen.getByText(/Ingram Micro asked for an introduction/)).toBeInTheDocument();
    expect(screen.getByText(/They see nothing until you answer/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Introduce me'));
    fireEvent.click(screen.getByText('Not now'));
    expect(onAction.mock.calls.map((c) => c[0])).toEqual(['grant', 'decline']);
  });

  it('a granted introduction can be withdrawn by the founder', () => {
    const onAction = vi.fn();
    render(<IntroductionAsk introduction={{ state: 'granted', partner: 'vanta' }} tk={tk} onAction={onAction} />);
    expect(screen.getByText(/Vanta can reach you/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Withdraw the introduction'));
    expect(onAction).toHaveBeenCalledWith('withdraw');
  });

  it('declined and withdrawn read as the founder\'s decision, with no live control', () => {
    const { container, rerender } = render(<IntroductionAsk introduction={{ state: 'declined', partner: 'ingram_micro' }} tk={tk} />);
    expect(container.querySelector('button')).toBeNull();
    expect(screen.getByText(/You declined/)).toBeInTheDocument();
    rerender(<IntroductionAsk introduction={{ state: 'withdrawn', partner: 'ingram_micro', withdrawn_by: 'partner' }} tk={tk} />);
    expect(screen.getByText(/Ingram Micro withdrew their ask/)).toBeInTheDocument();
    expect(container.querySelector('button')).toBeNull();
  });
});
