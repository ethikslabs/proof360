// frontend/tests/unit/ActTrace.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActTrace } from '../../src/components/chat/ActTrace.jsx';

const tk = { ink: '#111', inkSoft: '#94a3b8', hairline: '#e5e5e5', bg: '#fff' };

describe('ActTrace', () => {
  it('renders nothing with no lines', () => {
    const { container } = render(<ActTrace lines={[]} done={false} tk={tk} />);
    expect(container.innerHTML).toBe('');
  });

  it('an active act renders its pulsing title with body auto-expanded', () => {
    const lines = [
      { type: 'act', act: 'site', phase: 'start', title: 'Reading the site', note: '4 pages' },
      { type: 'act_body', act: 'site', text: 'GET /pricing → 200', color: 'ok' },
    ];
    render(<ActTrace lines={lines} done={false} tk={tk} />);
    expect(screen.getByText(/Reading the site/)).toBeInTheDocument();
    expect(screen.getByText(/4 pages/)).toBeInTheDocument();
    expect(screen.getByText(/GET \/pricing → 200/)).toBeInTheDocument();
  });

  it('an act going done shows a check and its done note, collapses, and reopens on click', () => {
    const lines = [
      { type: 'act', act: 'site', phase: 'start', title: 'Reading the site' },
      { type: 'act_body', act: 'site', text: 'GET /pricing → 200', color: 'ok' },
      { type: 'act', act: 'site', phase: 'done', note: '4 pages' },
    ];
    render(<ActTrace lines={lines} done={false} tk={tk} />);
    expect(screen.getByText(/Reading the site/)).toBeInTheDocument();
    expect(screen.getByText(/4 pages/)).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.queryByText(/GET \/pricing → 200/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Reading the site/));
    expect(screen.getByText(/GET \/pricing → 200/)).toBeInTheDocument();
  });

  it('a skipped act renders the ↳ glyph and its note', () => {
    const lines = [
      { type: 'act', act: 'perplexity', phase: 'start', title: 'Checking Perplexity' },
      { type: 'act', act: 'perplexity', phase: 'skip', note: 'no key configured' },
    ];
    render(<ActTrace lines={lines} done={false} tk={tk} />);
    expect(screen.getByText('↳')).toBeInTheDocument();
    expect(screen.getByText(/no key configured/)).toBeInTheDocument();
  });

  it('untagged probe lines land in the perimeter act, which stays collapsed while active and opens on click', () => {
    const lines = [
      { text: '$ proof360 --url acme.com', type: 'cmd' },
      { type: 'act', act: 'perimeter', phase: 'start', title: 'Scanning the perimeter' },
      { text: '[dns]  DMARC enforced · SPF pass', type: 'recon', color: 'ok' },
    ];
    render(<ActTrace lines={lines} done={false} tk={tk} />);
    expect(screen.getByText(/proof360 --url acme.com/)).toBeInTheDocument();
    expect(screen.getByText(/Scanning the perimeter/)).toBeInTheDocument();
    expect(screen.queryByText(/DMARC enforced/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Scanning the perimeter/));
    expect(screen.getByText(/DMARC enforced/)).toBeInTheDocument();
  });

  it('keeps every act row listed once done', () => {
    const lines = [
      { type: 'act', act: 'perimeter', phase: 'start', title: 'Scanning the perimeter' },
      { type: 'act', act: 'perimeter', phase: 'done', note: '39 checks' },
      { type: 'act', act: 'site', phase: 'start', title: 'Reading the site' },
      { type: 'act', act: 'site', phase: 'done', note: '4 pages' },
      { type: '__done__' },
    ];
    render(<ActTrace lines={lines} done={true} tk={tk} />);
    expect(screen.getByText(/Scanning the perimeter/)).toBeInTheDocument();
    expect(screen.getByText(/Reading the site/)).toBeInTheDocument();
    expect(screen.getAllByText('✓')).toHaveLength(2);
  });

  it('shows the composing tail only while composing and no act is active, hides once an act starts', () => {
    const lines = [
      { type: 'act', act: 'perimeter', phase: 'start', title: 'Scanning the perimeter' },
      { type: 'act', act: 'perimeter', phase: 'done', note: '39 checks' },
    ];
    const { rerender } = render(<ActTrace lines={lines} done={false} composing={true} tk={tk} />);
    expect(screen.getByText(/●/)).toBeInTheDocument();

    rerender(<ActTrace lines={lines} done={false} composing={false} tk={tk} />);
    expect(screen.queryByText('● …')).not.toBeInTheDocument();

    const activeLine = [...lines, { type: 'act', act: 'reading', phase: 'start', title: 'Writing the read' }];
    rerender(<ActTrace lines={activeLine} done={false} composing={true} tk={tk} />);
    expect(screen.queryByText('● …')).not.toBeInTheDocument();
  });
});
