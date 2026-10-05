import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// N3 step 2: AdminPreread redirected to '/' whenever preread_tool === false. On mount that
// is SAFE_DEFAULTS (false), so an admin was bounced off the page before /api/features could
// say the tool is on. The redirect must wait for `loaded`.
const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...await orig(), useNavigate: () => navigate }));

let resolveFeatures;
const getFeatures = vi.fn(() => new Promise((res) => { resolveFeatures = res; }));
vi.mock('../../src/api/client.js', () => ({
  getFeatures: (...a) => getFeatures(...a),
  submitPreread: vi.fn(),
  getPrereadStatus: vi.fn(),
}));

import { FeatureFlagProvider, SAFE_DEFAULTS } from '../../src/contexts/FeatureFlagContext.jsx';
import AdminPreread from '../../src/pages/AdminPreread.jsx';

function renderIt() {
  return render(
    <MemoryRouter>
      <FeatureFlagProvider><AdminPreread /></FeatureFlagProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => { navigate.mockClear(); getFeatures.mockClear(); resolveFeatures = null; });

describe('AdminPreread redirect is gated on flags being loaded', () => {
  it('does NOT redirect before the flags have loaded', async () => {
    renderIt();
    await Promise.resolve(); // let effects run; features still pending
    expect(navigate).not.toHaveBeenCalled();
  });

  it('stays mounted (no redirect) when the API enables the tool', async () => {
    const { container } = renderIt();
    resolveFeatures({ ...SAFE_DEFAULTS, cold_read: { ...SAFE_DEFAULTS.cold_read, preread_tool: true } });
    await waitFor(() => expect(container.textContent.length).toBeGreaterThan(0));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects home once flags load with the tool off', async () => {
    renderIt();
    resolveFeatures({ ...SAFE_DEFAULTS, cold_read: { ...SAFE_DEFAULTS.cold_read, preread_tool: false } });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
  });
});
