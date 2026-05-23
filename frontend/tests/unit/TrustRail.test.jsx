import { render, screen } from '@testing-library/react';
import { TrustRail } from '../../src/components/chat/TrustRail.jsx';

const mockData = {
  inferences: [
    { field: 'company_name', value: 'Hive & Co', confidence: 0.9 },
    { field: 'stage', value: 'pre-seed', confidence: 0.75 },
  ],
};

describe('TrustRail', () => {
  it('renders nothing at t0', () => {
    const { container } = render(<TrustRail trustPhase="t0" companyData={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders ghost state at t1', () => {
    render(<TrustRail trustPhase="t1" companyData={null} />);
    expect(screen.getByTestId('trust-rail-ghost')).toBeInTheDocument();
    expect(screen.queryByTestId('trust-rail-solid')).not.toBeInTheDocument();
  });

  it('renders solid state at t2 with company data', () => {
    render(<TrustRail trustPhase="t2" companyData={mockData} />);
    expect(screen.getByTestId('trust-rail-solid')).toBeInTheDocument();
    expect(screen.getByText('Hive & Co')).toBeInTheDocument();
  });

  it('renders error indicator when trustPhase is t1 and inferenceError is true', () => {
    render(<TrustRail trustPhase="t1" companyData={null} inferenceError />);
    expect(screen.getByTestId('trust-rail-error')).toBeInTheDocument();
  });
});
