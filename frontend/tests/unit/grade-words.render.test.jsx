// I4 (review 2026-08-25, demo-visible): GraphView rendered a raw
// Math.round(confidence * 100) + '%' — the fake-precision bug the rest of
// the honesty wave (grade-words.test.js) already closed everywhere else.
// ProvenanceAccordion had the same class of bug (currently dead code, fixed
// anyway). Split into its own .jsx file — the plain .js sibling can't carry
// JSX through this project's vite/oxc transform.
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { GraphView } from '../../src/components/chat/GraphView.jsx';
import { ProvenanceAccordion } from '../../src/components/chat/ProvenanceAccordion.jsx';

describe('GraphView — no raw percentage, grade words only (I4)', () => {
  it('never renders a % character for a node with confidence', () => {
    const nodes = [
      { id: 'claim-0', type: 'claim', label: 'product_type: SaaS', confidence: 0.9 },
      { id: 'claim-1', type: 'claim', label: 'data_sensitivity: High', confidence: 0.6 },
    ];
    const { container } = render(<GraphView nodes={nodes} />);
    expect(container.textContent).not.toContain('%');
    expect(container.textContent).toContain('confirmed');
    expect(container.textContent).toContain('probable');
  });

  it('renders nothing confidence-related for a node with no confidence', () => {
    const nodes = [{ id: 'gap-0', type: 'gap', label: 'No SSL', severity: 'critical' }];
    const { container } = render(<GraphView nodes={nodes} />);
    expect(container.textContent).not.toContain('%');
  });
});

describe('ProvenanceAccordion — no raw percentage, grade words only (I4)', () => {
  it('never renders a % character for a trail with confidence', () => {
    const trails = [{ conclusion: 'Hosted on AWS', sources: [], models: [], confidence: 0.9 }];
    const { container, getByText } = render(<ProvenanceAccordion trails={trails} />);
    fireEvent.click(getByText('Hosted on AWS'));
    expect(container.textContent).not.toContain('%');
    expect(container.textContent).toContain('confirmed');
  });
});
