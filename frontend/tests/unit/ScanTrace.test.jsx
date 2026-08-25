// frontend/tests/unit/ScanTrace.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScanTrace } from '../../src/components/chat/ScanTrace.jsx';

const tk = { ink: '#111', inkSoft: '#94a3b8', hairline: '#e5e5e5', bg: '#fff' };
const LINES = [
  { text: '$ proof360 --url acme.com', type: 'cmd' },
  { text: '[dns]       DMARC enforced · SPF pass', type: 'recon', color: 'ok' },
  { text: '[ssllabs]   error · skipped', type: 'recon', color: 'muted' },
];

describe('ScanTrace', () => {
  it('renders nothing with no lines', () => {
    const { container } = render(<ScanTrace lines={[]} done={false} tk={tk} />);
    expect(container.innerHTML).toBe('');
  });

  it('streams all lines while not done', () => {
    render(<ScanTrace lines={LINES} done={false} tk={tk} />);
    expect(screen.getByText(/DMARC enforced/)).toBeInTheDocument();
    expect(screen.getByText(/error · skipped/)).toBeInTheDocument();
  });

  it('collapses to an accordion when done, expands on click', () => {
    render(<ScanTrace lines={LINES} done={true} tk={tk} />);
    expect(screen.queryByText(/DMARC enforced/)).not.toBeInTheDocument();
    const summary = screen.getByText(/Scan trace/);
    fireEvent.click(summary);
    expect(screen.getByText(/DMARC enforced/)).toBeInTheDocument();
  });
});
