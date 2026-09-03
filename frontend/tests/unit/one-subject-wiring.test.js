// "One subject, everything else earned" (93eee44) shipped the primitives; this test holds the
// wiring the Sarvesh Lab workshop (2026-09-03) found missing. useBreakpoint's `hasRail` reached
// exactly one call site (the Inspector's `modal` prop) while <Sidebar> rendered at every width —
// the rail sat at 240px from 768 to 4K, the exact defect the one-subject spec set out to fix.
// useRailState was exported and called by nobody; Chat.jsx kept a bare `sidebarCollapsed`.
// Source-level on purpose (precedent: demoFixtureCopy.test.js) — Chat.jsx is not rendered whole
// under test, and the assertion is about where a hook's output goes, not what it draws.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const chat = readFileSync('src/pages/Chat.jsx', 'utf8');

describe('the middle width state is wired, not just computed', () => {
  it('mounts <Sidebar> only when the width class has a rail', () => {
    expect(chat).toMatch(/hasRail\s*&&\s*\(?\s*<Sidebar\b/);
  });
  it('keeps the rail preference separate from the computed width class', () => {
    expect(chat).toMatch(/useRailState\s*\(/);
  });
});

describe('one level-2 surface — the reading ledger opens the Inspector', () => {
  it('every <HowWeReadThis> mount passes onOpen={setInspecting}', () => {
    const mounts = chat.match(/<HowWeReadThis[\s\S]*?\/>/g) || [];
    expect(mounts.length).toBeGreaterThanOrEqual(1);
    for (const m of mounts) expect(m).toMatch(/onOpen=\{setInspecting\}/);
  });
  it('HowWeReadThis has no ladder of its own any more', () => {
    const src = readFileSync('src/components/chat/HowWeReadThis.jsx', 'utf8');
    expect(src).not.toMatch(/Show the arithmetic/);
    expect(src).not.toMatch(/useState/);
  });
});
