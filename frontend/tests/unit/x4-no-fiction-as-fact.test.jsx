import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// X4 (fix/next-4-no-fiction-as-fact): nothing on screen claims a live state, a score, or a fact
// that didn't come from this session.

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k), clear: () => m.clear() };
}

vi.mock('../../src/api/client.js', () => ({
  getCers: vi.fn(async () => ({ cers: [] })),
  createCer: vi.fn(async () => ({ cer: {} })),
  withdrawCerConsent: vi.fn(async () => ({})),
}));

afterEach(() => vi.unstubAllEnvs());

describe('Lab leads with "start your own lab", never "Welcome back"', () => {
  it('the hero does not greet a visitor as if the lab were theirs', async () => {
    const { default: Lab } = await import('../../src/pages/Lab.jsx');
    render(<Lab />);
    expect(screen.queryByText(/Welcome back/i)).toBeNull();
    expect(screen.getByRole('heading', { name: /start your own lab/i })).toBeInTheDocument();
  });
});

describe('FounderAuth login copy carries no trust score (no-scores rule)', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', { value: memStorage(), configurable: true, writable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: memStorage(), configurable: true, writable: true });
    vi.stubEnv('VITE_AUTH0_DOMAIN', 'test.auth0.com');
    vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'client-123');
  });
  it('shows "Your record" and never "trust score"', async () => {
    const { default: FounderAuth } = await import('../../src/pages/FounderAuth.jsx');
    const { container } = render(<MemoryRouter><FounderAuth /></MemoryRouter>);
    expect(container.textContent).toMatch(/Your record/);
    expect(container.textContent).not.toMatch(/trust score/i);
  });
});

describe('Portal LIVE badge is honest about seeded vs live-fed tenants', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: memStorage(), configurable: true, writable: true });
  });
  const renderFor = async (tenant) => {
    localStorage.setItem('portal_auth', JSON.stringify({ user: { email: `a@${tenant}.com` }, tenant }));
    const { default: PortalDashboard } = await import('../../src/pages/PortalDashboard.jsx');
    return render(<MemoryRouter><PortalDashboard /></MemoryRouter>);
  };

  it('a seeded tenant (cisco) is labelled Demo data, not LIVE', async () => {
    const { container } = await renderFor('cisco');
    expect(container.textContent).toMatch(/demo data/i);
  });

  it('a live CER tenant (vanta) shows LIVE, not Demo data', async () => {
    vi.resetModules();
    const { container } = await renderFor('vanta');
    expect(container.textContent).toMatch(/LIVE/);
    expect(container.textContent).not.toMatch(/demo data/i);
  });
});
