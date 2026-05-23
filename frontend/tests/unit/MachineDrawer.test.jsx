import { render, screen, fireEvent } from '@testing-library/react';
import { MachineDrawer } from '../../src/components/chat/MachineDrawer.jsx';

const mockStats = { nodes: 4, edges: 6, models: 2, sources: 3 };

describe('MachineDrawer', () => {
  it('renders nothing at t0', () => {
    const { container } = render(
      <MachineDrawer trustPhase="t0" stats={mockStats}>{null}</MachineDrawer>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders handle at t1 with building state', () => {
    render(<MachineDrawer trustPhase="t1" stats={null}>{null}</MachineDrawer>);
    expect(screen.getByTestId('drawer-handle')).toBeInTheDocument();
    expect(screen.getByText(/building/i)).toBeInTheDocument();
  });

  it('renders live counts in handle at t2', () => {
    render(<MachineDrawer trustPhase="t2" stats={mockStats}>{null}</MachineDrawer>);
    expect(screen.getByText(/4 nodes/)).toBeInTheDocument();
    expect(screen.getByText(/6 edges/)).toBeInTheDocument();
  });

  it('drawer body is hidden by default', () => {
    render(<MachineDrawer trustPhase="t2" stats={mockStats}>{null}</MachineDrawer>);
    expect(screen.queryByTestId('drawer-body')).not.toBeInTheDocument();
  });

  it('opens drawer body on handle click', () => {
    render(<MachineDrawer trustPhase="t2" stats={mockStats}><div>content</div></MachineDrawer>);
    fireEvent.click(screen.getByTestId('drawer-handle'));
    expect(screen.getByTestId('drawer-body')).toBeInTheDocument();
  });

  it('closes drawer body on second handle click', () => {
    render(<MachineDrawer trustPhase="t2" stats={mockStats}><div>content</div></MachineDrawer>);
    fireEvent.click(screen.getByTestId('drawer-handle'));
    expect(screen.getByTestId('drawer-body')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('drawer-handle'));
    expect(screen.queryByTestId('drawer-body')).not.toBeInTheDocument();
  });
});
