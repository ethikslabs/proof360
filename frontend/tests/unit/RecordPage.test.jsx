// "What we need is a pop out to a new page with all of that, not just sitting in
// the bubble" — John, 2026-08-26.
//
// The companion panel had done its job too well. It began as a chip that counted
// things; by this afternoon it held the claims, the pathway and the shortlist,
// and it was floating over Leonardo's answer, clipping his best paragraph
// mid-sentence. It was also telling three stories about one record on one screen:
// header "12 noted" (claims + shortlist + proposals), body "6 things we've noted
// so far" (claims only), left rail "0/6" (a legacy tile count wired to nothing).
//
// So the record gets a place of its own. Everything, at full width, on a surface
// that isn't competing with the conversation for the same pixels — and the panel
// goes back to being a glance with a door in it.
//
// It opens cold: a link, a refresh, a second tab. No chat state, no props from a
// parent — it re-reads the record from the session and renders whatever is true.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecordPage } from '../../src/pages/RecordPage.jsx';

const RECORD = {
  company_name: 'Cognisys',
  website_url: 'https://cognisys.example',
  claims: [
    { claim_id: 'c1', field: 'infrastructure.cloud_provider', label: 'cloud provider',
      value: 'Oracle', status: 'confirmed',
      provenance: { method: 'recon-ip', detail: 'IP → hosting provider lookup' },
      confirmed: { by: 'founder' } },
    { claim_id: 'c2', field: 'market.customer_type', label: 'customer type',
      value: 'Mixed', status: 'inferred',
      provenance: { method: 'claude-inference', detail: 'website extraction' } },
  ],
  proposals: [
    { id: 'aws-wa', kind: 'program', title: 'AWS Well-Architected Partner Program',
      description: '$5,000 funded per qualified review',
      url: 'https://aws.amazon.com/architecture/well-architected/',
      reason: 'proposed because your cloud provider is confirmed as Oracle.' },
  ],
  // Real move shape from cerProjection: label + item + reason + cta, not a title.
  shortlist: [
    { cer_id: 'm1', label: 'AWS pathway via Ingram Micro', route: 'ingram_micro_aws',
      item: { title: 'AWS Well-Architected Partner Program' },
      reason: { moment: 'while discussing the Australian launch' },
      cta: { label: 'Book a conversation', url: 'https://example.com/book' },
      admin_status: 'Submitted', consent_state: 'granted' },
  ],
  confirmed_count: 1,
  inferred_count: 1,
  total_count: 2,
};

function mockFetch(payload, { ok = true, status = 200 } = {}) {
  return vi.fn().mockResolvedValue({
    ok, status, json: async () => payload,
  });
}

const draw = () => render(<MemoryRouter><RecordPage /></MemoryRouter>);

// This environment's localStorage has no working setItem/clear, so the suite
// installs its own Storage — the same "never touch the real one" posture
// no-scores.render.test.jsx and auth.test.js take.
function installStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  const storage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true, writable: true });
  return storage;
}

beforeEach(() => {
  installStorage({ proof360_session_id: 'sess-1' });
});
afterEach(() => {
  installStorage();
  vi.unstubAllGlobals();
});

describe('RecordPage — the record, with room to be read', () => {
  it('recovers the session on its own, so the page survives a refresh or a new tab', async () => {
    const fetchSpy = mockFetch({ record: RECORD });
    vi.stubGlobal('fetch', fetchSpy);
    draw();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/v1/session/sess-1/record');
  });

  it('says whose record it is', async () => {
    vi.stubGlobal('fetch', mockFetch({ record: RECORD }));
    const { findByText } = draw();
    expect(await findByText(/Cognisys/)).toBeTruthy();
  });

  it('shows every claim in full, not a count', async () => {
    vi.stubGlobal('fetch', mockFetch({ record: RECORD }));
    const { container } = draw();
    await waitFor(() => expect(container.textContent).toContain('cloud provider'));
    expect(container.textContent).toContain('Oracle');
    expect(container.textContent).toContain('customer type');
    expect(container.textContent).toContain('Mixed');
  });

  it('carries the pathway and the reason it is open', async () => {
    vi.stubGlobal('fetch', mockFetch({ record: RECORD }));
    const { container } = draw();
    await waitFor(() => expect(container.textContent).toContain('AWS Well-Architected Partner Program'));
    expect(container.textContent).toMatch(/because your cloud provider is confirmed as Oracle/i);
  });

  it('carries what was kept', async () => {
    vi.stubGlobal('fetch', mockFetch({ record: RECORD }));
    const { container } = draw();
    await waitFor(() => expect(container.textContent).toContain('AWS pathway via Ingram Micro'));
  });

  it('an unanswered claim is answerable right here — the record is where you settle it', async () => {
    const fetchSpy = mockFetch({ record: RECORD });
    vi.stubGlobal('fetch', fetchSpy);
    const { findByRole } = draw();
    fireEvent.click(await findByRole('button', { name: /that's right/i }));
    await waitFor(() => {
      const posted = fetchSpy.mock.calls.find(([url]) => String(url).includes('/claims/c2/answer'));
      expect(posted).toBeTruthy();
    });
  });

  it('offers the way back to the conversation', async () => {
    vi.stubGlobal('fetch', mockFetch({ record: RECORD }));
    const { container } = draw();
    await waitFor(() => expect(container.textContent).toContain('Cognisys'));
    const back = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'));
    expect(back).toContain('/chat');
  });

  // The ABSENCE RULE: an empty record says so plainly and invites, it never
  // renders a scaffold of empty sections that reads as a form to be filled.
  it('says something human when there is no record yet, never an empty scaffold', async () => {
    vi.stubGlobal('fetch', mockFetch({ record: {
      company_name: null, claims: [], proposals: [], shortlist: [],
      confirmed_count: 0, inferred_count: 0, total_count: 0,
    } }));
    const { container } = draw();
    await waitFor(() => expect(container.textContent).toMatch(/nothing here yet|builds as/i));
    expect(container.textContent).not.toMatch(/open to you now/i);
  });

  it('says so plainly when the record cannot be reached — never a blank page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { container } = draw();
    await waitFor(() => expect(container.textContent).toMatch(/couldn't load|could not load/i));
  });

  it('does not strand a visitor who has never had a session', async () => {
    installStorage();
    const fetchSpy = mockFetch({ record: RECORD });
    vi.stubGlobal('fetch', fetchSpy);
    const { container } = draw();
    await waitFor(() => expect(container.textContent).toMatch(/nothing here yet|start/i));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
