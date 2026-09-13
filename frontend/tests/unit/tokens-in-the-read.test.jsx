// Tokens in the read (John ruling 2026-09-13, R7): the count shows on the act's done line while the
// read runs, collapses with the act, and the read's total stays on the header. The receipt header
// carries the turn's tokens. Tokens only — never a price, never a number about the company.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActTrace, partitionLines, fmtTok } from '../../src/components/chat/ActTrace.jsx';
import { OurWorking } from '../../src/components/chat/OurWorking.jsx';

const tk = { ink: '#111', inkSoft: '#94a3b8', hairline: '#e5e5e5', bg: '#fff' };

describe('tokens on the trace', () => {
  it('partitionLines carries tokens from a done line and ignores garbage', () => {
    const { acts } = partitionLines([
      { type: 'act', act: 'correlate', phase: 'start', title: 'Correlating' },
      { type: 'act', act: 'correlate', phase: 'done', note: '13 signals', tokens: { in: 900, out: 304 } },
      { type: 'act', act: 'site', phase: 'start', title: 'Reading your site' },
      { type: 'act', act: 'site', phase: 'done', note: '5 pages', tokens: 'nope' },
    ]);
    const correlate = acts.find((a) => a.id === 'correlate');
    const site = acts.find((a) => a.id === 'site');
    expect(correlate.tokens).toEqual({ in: 900, out: 304 });
    expect(site.tokens).toBeNull();
  });

  it('a done act shows its tokens beside its note; the header shows the total once done', () => {
    const lines = [
      { type: 'act', act: 'correlate', phase: 'start', title: 'Correlating' },
      { type: 'act', act: 'correlate', phase: 'done', note: '13 signals', tokens: { in: 900, out: 304 } },
      { type: 'act', act: 'reading', phase: 'start', title: 'Writing your read' },
      { type: 'act', act: 'reading', phase: 'done', tokens: { in: 1500, out: 200 } },
    ];
    render(<ActTrace lines={lines} done={true} tk={tk} />);
    expect(screen.getByText(/1,204 tok/)).toBeInTheDocument();
    expect(screen.getByText(/1,700 tok/)).toBeInTheDocument();
    expect(screen.getByText(/2,904 tok this read/)).toBeInTheDocument();
  });

  it('no total line while the read is live, and none when nothing carried tokens', () => {
    const live = [
      { type: 'act', act: 'correlate', phase: 'start', title: 'Correlating' },
      { type: 'act', act: 'correlate', phase: 'done', note: '13 signals', tokens: { in: 10, out: 5 } },
    ];
    render(<ActTrace lines={live} done={false} tk={tk} />);
    expect(screen.queryByText(/tok this read/)).toBeNull();
    const none = [{ type: 'act', act: 'site', phase: 'start', title: 'Reading' }, { type: 'act', act: 'site', phase: 'done', note: '5 pages' }];
    render(<ActTrace lines={none} done={true} tk={tk} />);
    expect(screen.queryByText(/tok this read/)).toBeNull();
  });

  it('fmtTok formats a count and never invents one', () => {
    expect(fmtTok(1204)).toBe('1,204');
    expect(fmtTok(undefined)).toBe('0');
  });
});

describe('tokens on the receipt', () => {
  it('the header carries the turn\'s tokens beside its sources, and nothing else about money', () => {
    const receipt = { ts: 't', query: 'q', hits: [], tokens: { in: 1200, out: 140, model: 'claude-haiku-4-5-20251001' } };
    const { container } = render(<OurWorking receipt={receipt} tk={tk} />);
    expect(screen.getByText(/no sources retrieved · 1,340 tok/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\$|usd|cost/i);
  });
  it('a receipt without tokens reads as before', () => {
    render(<OurWorking receipt={{ ts: 't', query: 'q', hits: null }} tk={tk} />);
    expect(screen.getByText(/could not look/)).toBeInTheDocument();
    expect(screen.queryByText(/tok/)).toBeNull();
  });
});
