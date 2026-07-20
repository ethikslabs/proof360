import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Mel from '../../src/pages/Mel.jsx';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/mel/:beatId" element={<Mel />} />
        <Route path="/mel" element={<Mel />} />
      </Routes>
    </MemoryRouter>
  );
}

function heading(name) {
  return screen.getByRole('heading', { level: 2, name });
}

describe('Mel — proof360.au/mel', () => {
  it('invited entry (/mel/m2) lands on the linked beat, no organic callout', () => {
    renderAt('/mel/m2');
    expect(heading('"You should sell online."')).toBeInTheDocument();
    expect(screen.queryByText(/landed in the middle of Mel's journey/i)).not.toBeInTheDocument();
    // CER card for m2 (Booked, complete 7/7)
    expect(screen.getAllByText(/AWS Activate → Ingram Micro/).length).toBeGreaterThan(0);
    expect(screen.getByText('7/7')).toBeInTheDocument();
  });

  it('organic entry (bare /mel) lands mid-journey with the callout, never a click-next tutorial', () => {
    renderAt('/mel');
    expect(screen.getByText(/landed in the middle of Mel's journey/i)).toBeInTheDocument();
    expect(heading('The distributor asks for compliance')).toBeInTheDocument(); // m6
  });

  it('the record accumulates only up to the current beat (no future-beat leakage)', () => {
    renderAt('/mel/m2');
    // m2 contributes 2 entries; nothing from m3+ should be visible yet.
    expect(screen.getByText('2 ENTRIES')).toBeInTheDocument();
    expect(screen.queryByText(/backup_dr OPEN/)).not.toBeInTheDocument();
  });

  it('m1 has no CER forming — the trestle table, no route yet', () => {
    renderAt('/mel/m1');
    expect(screen.getByText(/hasn.t met the read yet/)).toBeInTheDocument();
  });

  it('m4 is advisory-only — a record entry, never an order, no CER', () => {
    renderAt('/mel/m4');
    expect(screen.getAllByText(/never an order/).length).toBeGreaterThan(0);
  });

  it('Next / Prev navigate the rail and update the URL beat', () => {
    renderAt('/mel/m1');
    expect(heading('Kings Cross markets, Saturday')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next →'));
    expect(heading('"You should sell online."')).toBeInTheDocument();
  });

  it('the plain-English escape hatch is invited-only — closed until asked', () => {
    renderAt('/mel/m2');
    expect(screen.queryByText(/The first read is entirely from the public front door/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/What does "no login" actually mean here\?/));
    expect(screen.getByText(/The first read is entirely from the public front door/)).toBeInTheDocument();
  });

  it('an unrecognised beatId falls back to /mel rather than stranding the visitor', () => {
    renderAt('/mel/m99');
    // falls through to organic default (m6) rather than a blank/crash state
    expect(heading('The distributor asks for compliance')).toBeInTheDocument();
  });
});
