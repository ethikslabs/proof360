import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { advisoryFromText, advisoryThinkingSteps, modelAnswerLine, fmtRegisterDate } from '../../src/utils/advisory.js';
import { AdvisoryCard } from '../../src/components/chat/AdvisoryCard.jsx';
import { tokens } from '../../src/tokens.js';

const tk = tokens('pearl');

describe('advisoryFromText — ask-shape + register-noun, never a noun alone', () => {
  it('fires on genuine register asks', () => {
    expect(advisoryFromText('Are there any models trained on soil data?')).toBe(true);
    expect(advisoryFromText('what datasets could we use for crop yield?')).toBe(true);
    expect(advisoryFromText('recommend open data for African agriculture')).toBe(true);
  });

  it('does NOT fire on trust statements that merely mention data/models', () => {
    expect(advisoryFromText('our customer data is encrypted at rest')).toBe(false);
    expect(advisoryFromText('we run our threat model quarterly')).toBe(false);
    expect(advisoryFromText('tell me about SOC 2')).toBe(false);
  });

  // Bare 'any'/'available' are statements, not asks (Codex P2, PR #18 round 3) —
  // these must reach the personas, not the register.
  it('does NOT fire on statements containing any/available', () => {
    expect(advisoryFromText('we do not use any training data')).toBe(false);
    expect(advisoryFromText('our training data is available in S3')).toBe(false);
  });

  it('still fires on question-marked asks without a request verb', () => {
    expect(advisoryFromText('any datasets on soil health?')).toBe(true);
  });
});

describe('the watchable retrieval (law 1)', () => {
  it('thinking lines cite register totals + derivation date', () => {
    const steps = advisoryThinkingSteps({
      models: { total: 631, sources: 9, derived_at: '2026-07-14T06:25:45.751Z' },
      data: { total: 1172, derived_at: '2026-07-14T07:37:20.030746+00:00' },
    });
    expect(steps).toHaveLength(2);
    expect(steps[0].reference).toMatch(/631 models · 9 sources · derived 14 Jul 2026/);
    expect(steps[1].reference).toMatch(/1172 free public datasets · derived 14 Jul 2026/);
    expect(steps.every((s) => s.status === 'complete')).toBe(true);
  });

  it('fmtRegisterDate never bluffs a date', () => {
    expect(fmtRegisterDate(null)).toBe('date unknown');
    expect(fmtRegisterDate('garbage')).toBe('date unknown');
  });
});

const ZERO_ADVISORY = {
  query: 'soil chemistry africa',
  models: { matches: [], match_count: 0, total: 631, sources: 9, derived_at: '2026-07-14T06:25:45.751Z' },
  data: {
    matches: [
      {
        dataset_id: 'afsis', name: 'Africa Soil Information Service (AfSIS) Soil Chemistry',
        commercial: 'free', tags: ['agriculture', 'machine learning'],
        description: 'Soil infrared spectral data and paired soil property reference measurements',
        license: 'ODbL 1.0', link: 'https://registry.opendata.aws/afsis/',
      },
    ],
    match_count: 1, total: 1172, derived_at: '2026-07-14T07:37:20.030746+00:00',
    paid_rail: { label: 'AWS Data Exchange', commercial: 'paid', billing_frame: "bills to the customer's AWS account — FORUM", margin: 'disclosed at quote' },
  },
};

describe('AdvisoryCard — the honest zero as an answer (laws 2–4)', () => {
  it('renders the zero confidently, with provenance chips, free list, paid rail below', () => {
    render(<AdvisoryCard advisory={ZERO_ADVISORY} tk={tk} />);

    // Law 2: the zero is an answer with provenance — never an apology.
    expect(screen.getByText(/no specialised model claims this domain/i)).toBeInTheDocument();
    expect(screen.getByText('631 models')).toBeInTheDocument();
    expect(screen.getByText('9 sources')).toBeInTheDocument();
    expect(screen.getAllByText(/derived 14 Jul 2026/).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/sorry|unfortunately|couldn't find/i)).toBeNull();

    // The shopping list: named, free, checkable.
    const afsis = screen.getByRole('link', { name: /AfSIS.*Soil Chemistry/i });
    expect(afsis).toHaveAttribute('href', 'https://registry.opendata.aws/afsis/');
    expect(screen.getByText(/free · \$0/i)).toBeInTheDocument();

    // Law 4: the paid rail is present, below, in the CUSTOMER's billing frame.
    expect(screen.getByText(/your own AWS account/i)).toBeInTheDocument();
    expect(screen.getByText(/AWS Data Exchange/)).toBeInTheDocument();
    expect(screen.getByText(/disclosed at quote/i)).toBeInTheDocument();
  });

  it('modelAnswerLine states what was searched on a zero', () => {
    const line = modelAnswerLine(ZERO_ADVISORY.models);
    expect(line).toMatch(/all 631 models across 9 sources/);
    expect(line).not.toMatch(/sorry|unfortunately/i);
  });
});
