// Display order is not arrival order. The perimeter scan fires first for latency —
// its probes stream in the background — but arriving first put "Perimeter scan" at
// the top of the founder's screen, announcing a security tool before a word of the
// read was visible. John, 2026-09-02: "perimeter scan should be dead last".
import { describe, it, expect } from 'vitest';
import { partitionLines, DISPLAY_RANK } from '../../src/components/chat/ActTrace.jsx';

const start = (act, title) => ({ type: 'act', act, phase: 'start', title });

// Arrival order as the backend actually emits it — perimeter first.
const ARRIVAL = [
  start('perimeter', 'Infrastructure and posture'),
  start('site', 'Reading your public trail'),
  start('perplexity', 'Asking the live web about you'),
  start('gemini', 'A second, independent read'),
  start('correlate', 'Correlating what every witness saw'),
  start('corpus', 'Checking our research holdings'),
  start('reading', 'Writing your read'),
];

describe('ActTrace display order', () => {
  const ids = partitionLines(ARRIVAL).acts.map((a) => a.title);

  it('leads with the holdings — the step nobody else can run', () => {
    expect(ids[0]).toMatch(/holdings/i);
  });

  it('puts posture last of the gathering steps, never first', () => {
    const posture = ids.findIndex((t) => /Infrastructure and posture/i.test(t));
    expect(posture).toBeGreaterThan(0);
    expect(posture).toBe(ids.length - 2);   // only the synthesis sits below it
  });

  it('closes on the synthesis, because that is genuinely last', () => {
    expect(ids[ids.length - 1]).toMatch(/Writing your read/i);
  });

  it('never renders the old security noun', () => {
    expect(ids.join(' ')).not.toMatch(/Perimeter scan/i);
  });

  it('reorders rather than dropping — every act still renders', () => {
    expect(ids).toHaveLength(ARRIVAL.length);
  });

  it('keeps arrival order among unranked acts', () => {
    const withUnknown = [...ARRIVAL, start('mystery', 'Something new')];
    const out = partitionLines(withUnknown).acts.map((a) => a.title);
    expect(out).toContain('Something new');
    expect(DISPLAY_RANK.mystery).toBeUndefined();
  });
});
