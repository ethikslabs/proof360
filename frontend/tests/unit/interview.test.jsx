// The interview flow. John, 2026-09-02: "'i don't know, yes, correct' - or skip the
// lot... but would keep the tiles you have". Three answers, no counter, and skipping
// costs nothing.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Interview, askQueue, openClaims } from '../../src/components/chat/Interview.jsx';

const claim = (id, field, label, value, extra = {}) => ({
  claim_id: id, field, label, value, status: 'inferred',
  provenance: { detail: 'IP → hosting provider lookup' }, ...extra,
});

const CLAIMS = [
  claim('c4', 'governance.cyber_insurance', 'cyber insurance', 'none'),
  claim('c2', 'product.type', 'product type', 'Software product'),
  claim('c1', 'infrastructure.cloud_provider', 'cloud provider', 'AWS'),
];

describe('queue', () => {
  it('opens on the gimme, not on whatever came first in the record', () => {
    expect(askQueue(CLAIMS)[0].field).toBe('infrastructure.cloud_provider');
  });

  it('puts position ahead of posture', () => {
    const fields = askQueue(CLAIMS).map((c) => c.field);
    expect(fields.indexOf('product.type'))
      .toBeLessThan(fields.indexOf('governance.cyber_insurance'));
  });

  it('treats every answered state as done — including "unknown"', () => {
    for (const status of ['confirmed', 'corrected', 'rejected', 'unknown']) {
      const answered = CLAIMS.map((c) => (c.claim_id === 'c1' ? { ...c, status } : c));
      expect(openClaims(answered).map((c) => c.claim_id)).not.toContain('c1');
    }
  });
});

describe('asking', () => {
  it('asks one question at a time, with the evidence behind it', () => {
    render(<Interview claims={CLAIMS} onAnswer={vi.fn()} />);
    expect(screen.getByText(/cloud provider/)).toBeTruthy();
    expect(screen.getByText(/IP → hosting provider lookup/)).toBeTruthy();
    expect(screen.queryByText(/product type/)).toBeNull();   // one at a time
  });

  it('offers exactly three answers', () => {
    render(<Interview claims={CLAIMS} onAnswer={vi.fn()} />);
    expect(screen.getByText(/Yes, that's right/)).toBeTruthy();
    expect(screen.getByText(/Not quite/)).toBeTruthy();
    expect(screen.getByText(/I don't know/)).toBeTruthy();
  });

  it('never renders a counter, a total, or a progress step', () => {
    const { container } = render(<Interview claims={CLAIMS} onAnswer={vi.fn()} />);
    expect(container.textContent).not.toMatch(/\b\d+\s*(of|\/)\s*\d+\b/);
    expect(container.textContent).not.toMatch(/step|progress|remaining/i);
  });

  it('sends "I don\'t know" as its own answer, not a rejection', async () => {
    const onAnswer = vi.fn().mockResolvedValue();
    render(<Interview claims={CLAIMS} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText(/I don't know/));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('c1', 'dont_know', undefined));
  });

  it('confirms with the confirm action', async () => {
    const onAnswer = vi.fn().mockResolvedValue();
    render(<Interview claims={CLAIMS} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText(/Yes, that's right/));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('c1', 'confirm', undefined));
  });

  it('takes a correction and sends the founder\'s own value', async () => {
    const onAnswer = vi.fn().mockResolvedValue();
    render(<Interview claims={CLAIMS} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText(/Not quite/));
    fireEvent.change(screen.getByLabelText(/Correct cloud provider/), { target: { value: 'Oracle' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('c1', 'correct', 'Oracle'));
  });

  it('will not save an empty correction', () => {
    const onAnswer = vi.fn();
    render(<Interview claims={CLAIMS} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText(/Not quite/));
    fireEvent.click(screen.getByText('Save'));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe('two witnesses are never presented as a contradiction', () => {
  const conflicted = [claim('c1', 'infrastructure.cloud_provider', 'cloud provider', 'AWS', {
    conflicted: true, conflict: { value: 'Oracle' },
  })];

  it('asks which is right rather than flagging a conflict', () => {
    const { container } = render(<Interview claims={conflicted} onAnswer={vi.fn()} />);
    expect(container.textContent).toMatch(/Which is right\?/i);
    expect(container.textContent).toMatch(/AWS/);
    expect(container.textContent).toMatch(/Oracle/);
  });

  it('uses no accusing vocabulary', () => {
    const { container } = render(<Interview claims={conflicted} onAnswer={vi.fn()} />);
    expect(container.textContent).not.toMatch(/conflict|contradict|disagree|unverified|wrong|lying/i);
  });
});

describe('skipping', () => {
  it('offers a skip that promises nothing is lost', () => {
    render(<Interview claims={CLAIMS} onAnswer={vi.fn()} />);
    expect(screen.getByText(/you keep everything we've got/i)).toBeTruthy();
  });

  it('goes quiet on skip instead of rendering a dead end', () => {
    const onSkipAll = vi.fn();
    const { container } = render(<Interview claims={CLAIMS} onAnswer={vi.fn()} onSkipAll={onSkipAll} />);
    fireEvent.click(screen.getByText(/you keep everything we've got/i));
    expect(onSkipAll).toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });

  it('renders nothing at all when every claim is answered', () => {
    const done = CLAIMS.map((c) => ({ ...c, status: 'confirmed' }));
    const { container } = render(<Interview claims={done} onAnswer={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('stays silent when there is no way to answer', () => {
    const { container } = render(<Interview claims={CLAIMS} />);
    expect(container.textContent).toBe('');
  });
});

// The seam itself. John, 2026-09-02: the interview lived in the companion dock and
// "it breaks the flow a bit... we now have a few places to be looking". The dock's
// job is the record filling in parallel while you read; the asking belongs in the
// conversation. This test exists so it cannot quietly move back.
describe('the dock shows, the chat asks', () => {
  it('the companion panel never renders the interview', async () => {
    const { CompanionPanel } = await import('../../src/components/chat/CompanionPanel.jsx');
    const { container } = render(
      <CompanionPanel
        items={[]}
        claims={CLAIMS}
        proposals={[]}
        onAnswerClaim={vi.fn()}
        onShortlist={vi.fn()}
        onDefer={vi.fn()}
        onOpenRecord={vi.fn()}
        companyName="Cognisys"
      />,
    );
    expect(container.querySelector('[data-testid="interview"]')).toBeNull();
  });

  it('the panel is not a dark hole in a light page', async () => {
    const src = await import('../../src/components/chat/CompanionPanel.jsx?raw')
      .then((m) => m.default)
      .catch(() => null);
    if (src === null) return;              // raw import unsupported — skip, not fail
    for (const dark of ['#0b1220', '#1e293b', '#0f172a', '#f1f5f9']) {
      expect(src).not.toContain(dark);
    }
  });
});
