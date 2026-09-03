// The next rung of the honesty wave that grade-words.test.js started. That one
// killed "confidence: 0.6" rendered as "60%" — fake precision. This one kills
// the same fault one level up: a trust score out of 100, drawn as a red/amber/
// green ring, with a verdict word under it.
//
// John's ruling 2026-08-26, said twice: "We are not doing scores" / "No numbers
// — makes you feel like you are in school being graded." It is not a new
// decision. The landing emotional contract has said it since 2026-05-18 —
// "Not a grading rubric", "The founder never feels evaluated" — and the HX
// north star spells out why: a founder who sees 23/100 feels judged and
// defensive, which is the opposite of the thing the product is for.
//
// The chat surface was converted and honours it. The founder dashboard, the
// partner portal and the projection tiles never were, and still render rings.
//
// The word grades die with the number grades. "Deal ready / Partial / Needs
// work" in green/amber/red is the same report card with the digits filed off —
// removing 47/100 and leaving "Needs work" in red keeps the feeling intact.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// A verdict a surface must never pronounce on a company.
const VERDICT_WORDS = [/deal ready/i, /needs work/i, /\bpartial\b/i];

// A score reads as a score whether or not the "/100" is next to it.
function expectNoGrade(container) {
  const text = container.textContent || '';
  expect(text).not.toContain('/100');
  expect(text).not.toMatch(/out of 100/i);
  expect(text).not.toMatch(/\btrust score\b/i);
  expect(text).not.toMatch(/\bscores?\s+your\b/i);
  for (const verdict of VERDICT_WORDS) {
    expect(text).not.toMatch(verdict);
  }
  // The ring itself: an SVG whose only job is to draw a proportion of a circle.
  expect(container.querySelector('[data-score-ring]')).toBeNull();
}

const REPORT = {
  sessionId: 'sess-1',
  company_name: 'Cognisys',
  website: 'cognisys.co.uk',
  trust_score: 15,
  gaps_count: 8,
  gaps: [{ gap_id: 'dmarc', severity: 'moderate' }],
  saved_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
};

// This environment's localStorage has no clear(), so the suite installs its own
// Storage the pages can read through — the same "never touch the real one"
// posture auth.test.js takes.
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
  return storage;
}

beforeEach(() => {
  installStorage();
  vi.clearAllMocks();
});

describe('FounderDashboard — the founder is never graded', () => {
  beforeEach(() => {
    localStorage.setItem('founder_auth', JSON.stringify({ user: { email: 'john@ethikslabs.com', name: 'John' } }));
    localStorage.setItem('founder_reports', JSON.stringify([REPORT]));
  });

  it('renders no score, no ring and no verdict for the most recent scan', async () => {
    const FounderDashboard = (await import('../../src/pages/FounderDashboard.jsx')).default;
    const { container } = render(
      <MemoryRouter><FounderDashboard /></MemoryRouter>
    );
    expectNoGrade(container);
  });

  it('does not render the raw score number on its own either', async () => {
    const FounderDashboard = (await import('../../src/pages/FounderDashboard.jsx')).default;
    const { container } = render(
      <MemoryRouter><FounderDashboard /></MemoryRouter>
    );
    // 15 is REPORT.trust_score. A bare 15 next to the company name is still the
    // grade — the "/100" was never the part that stung.
    expect(container.textContent).not.toMatch(/Score\s*15/i);
  });

  it('says what was found and where it came from instead', async () => {
    const FounderDashboard = (await import('../../src/pages/FounderDashboard.jsx')).default;
    const { container } = render(
      <MemoryRouter><FounderDashboard /></MemoryRouter>
    );
    // The space the ring occupied carries the trail, not a verdict: the company,
    // when it was read, and what came back.
    expect(container.textContent).toMatch(/cognisys/i);
    expect(container.textContent).toMatch(/gap/i);
  });
});

describe('the partner portal ranks nobody', () => {
  beforeEach(() => {
    localStorage.setItem('portal_auth', JSON.stringify({
      user: { email: 'partner@vanta.com', name: 'Partner' },
      tenant: 'vanta',
    }));
  });

  it('the lead list shows no score, no ring and no verdict word', async () => {
    const PortalDashboard = (await import('../../src/pages/PortalDashboard.jsx')).default;
    const { container } = render(
      <MemoryRouter><PortalDashboard /></MemoryRouter>
    );
    expectNoGrade(container);
    // The desk-wide average was the loudest grade on the page.
    expect(container.textContent).not.toMatch(/avg trust score/i);
    // "$k OPPORTUNITY" was score_impact × $200 — a score in dollars (retired 2026-09-03).
    expect(container.textContent).not.toMatch(/OPPORTUNITY/);
    expect(container.textContent).not.toMatch(/\$\d+k\b/);
  });

  // Regrouping the desk BY WHAT THE LEAD NEEDS (John's choice 2026-08-26) is a
  // new information architecture for this page, not subtraction, and is tracked
  // as its own piece. What this change guarantees is narrower and worth pinning
  // on its own: whatever order the desk ends up in, it is never a ranking of the
  // founder.
  it('still lists the leads after the ranking is gone', async () => {
    const PortalDashboard = (await import('../../src/pages/PortalDashboard.jsx')).default;
    const { container } = render(
      <MemoryRouter><PortalDashboard /></MemoryRouter>
    );
    expect(container.textContent.length).toBeGreaterThan(200);
  });
});

// The projection tile carried the largest grade in the product — a 132px ring
// under the heading "Where they stand". Projection needs live company/stage
// props to render, so this pins the module contract instead: the ring component
// is gone, not merely unmounted on some paths.
describe('chat projection tiles carry no ring', () => {
  it('Projections no longer defines or renders a score ring', async () => {
    const src = await import('../../src/components/chat/Projections.jsx?raw').then(m => m.default);
    expect(src).not.toMatch(/function ScoreRing/);
    expect(src).not.toMatch(/<ScoreRing/);
  });
});
