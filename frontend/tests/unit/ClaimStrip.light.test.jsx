// ClaimStrip was born inside the dark companion panel, so its colours are baked
// for a #0b1120 ground: #e2e8f0 labels, #94a3b8 values. Reused as-is inside the
// light Record projection, every claim would render near-white on near-white —
// present in the DOM, invisible to a person. That is a worse failure than a
// missing section, because nothing about the page looks broken.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ClaimStrip } from '../../src/components/chat/ClaimStrip.jsx';

const CLAIMS = [
  { claim_id: 'c1', label: 'cloud provider', value: 'Oracle', status: 'inferred',
    provenance: { detail: 'IP → hosting provider lookup' } },
];

const inkOf = (container, text) =>
  [...container.querySelectorAll('span')].find((el) => el.textContent === text)?.style.color;

describe('ClaimStrip carries its own contrast', () => {
  it('reads dark-on-light when asked for light', () => {
    const { container } = render(<ClaimStrip claims={CLAIMS} light />);
    const label = inkOf(container, 'cloud provider');
    expect(label).toBeTruthy();
    expect(label).not.toBe('rgb(226, 232, 240)'); // the dark-panel ink
  });

  it('keeps the dark-panel colours by default — the panel is still its home', () => {
    const { container } = render(<ClaimStrip claims={CLAIMS} />);
    expect(inkOf(container, 'cloud provider')).toBe('rgb(226, 232, 240)');
  });

  // Secondary text never goes below #94a3b8 on dark (standing contrast rule).
  it('keeps supporting text legible in both grounds', () => {
    for (const light of [true, false]) {
      const { container } = render(<ClaimStrip claims={CLAIMS} light={light} />);
      expect(container.textContent).toContain('IP → hosting provider lookup');
    }
  });
});
