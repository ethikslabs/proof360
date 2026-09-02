// The four primitives of the "one subject" redesign, and the rules each one exists to
// hold. Every assertion below traces to either a constitutional document
// (docs/design/landing-emotional-contract.md, INVARIANTS.md) or a cited research
// finding — not to taste. Spec: _working/01_SPECS/2026-09-02-proof360-one-subject-redesign.md
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Inspector } from '../../src/components/chat/Inspector.jsx';
import { CommandPalette } from '../../src/components/chat/CommandPalette.jsx';
import { ComparisonRail } from '../../src/components/chat/ComparisonRail.jsx';
import { matchCommand, rankCommands } from '../../src/rendering/commandMatch.js';
import { BREAKPOINT } from '../../src/hooks/useBreakpoint.js';
import { tokens } from '../../src/tokens.js';

const tk = tokens('parallel');

// ─── Breakpoints ────────────────────────────────────────────────────────────
describe('breakpoints come from published tokens, not from a guess', () => {
  it('drops the rail where every design system drops it', () => {
    expect(BREAKPOINT.compact).toBe(768);   // Polaris md, Tailwind md, Atlassian s
  });

  it('brings the rail back only where one comfortably fits', () => {
    // Carbon lg 1056 · Polaris lg 1040 · Tailwind lg 1024 · Atlassian m 1024.
    // We take the most conservative: a rail that only just fits crowds the reading.
    expect(BREAKPOINT.medium).toBe(1056);
    expect(BREAKPOINT.medium).toBeGreaterThan(BREAKPOINT.compact);
  });
});

// ─── Command matching ───────────────────────────────────────────────────────
describe('command matching', () => {
  it('ranks a prefix above a substring above a subsequence', () => {
    expect(matchCommand('open', 'Open the working')).toBe(3);
    expect(matchCommand('working', 'Open the working')).toBe(2);
    expect(matchCommand('otw', 'Open the working')).toBe(1);
    expect(matchCommand('zzz', 'Open the working')).toBe(0);
  });

  it('returns everything for an empty query rather than nothing', () => {
    const cmds = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    expect(rankCommands(cmds, '   ')).toHaveLength(2);
  });

  it('puts the best match first', () => {
    const cmds = [
      { id: 'x', label: 'Show the working' },
      { id: 'y', label: 'Working set' },
    ];
    expect(rankCommands(cmds, 'working')[0].id).toBe('y');   // prefix beats substring
  });
});

// ─── Command palette: the APG dialog contract ───────────────────────────────
describe('the command palette honours the dialog contract', () => {
  const commands = [
    { id: 'read', label: 'Read a company', group: 'Do', run: vi.fn() },
    { id: 'sim', label: 'Switch to simulation', group: 'View', run: vi.fn() },
  ];

  it('is a modal dialog, not a disclosure widget', () => {
    render(<CommandPalette open onClose={() => {}} commands={commands} tk={tk} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={commands} tk={tk} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('runs the highlighted command on Enter', () => {
    const run = vi.fn();
    render(<CommandPalette open onClose={() => {}} commands={[{ id: 'r', label: 'Read', run }]} tk={tk} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(run).toHaveBeenCalled();
  });

  it('filters as you type', () => {
    render(<CommandPalette open onClose={() => {}} commands={commands} tk={tk} />);
    fireEvent.change(screen.getByLabelText('Type a command'), { target: { value: 'simul' } });
    expect(screen.getByText('Switch to simulation')).toBeInTheDocument();
    expect(screen.queryByText('Read a company')).toBeNull();
  });

  it('says plainly when nothing matches', () => {
    render(<CommandPalette open onClose={() => {}} commands={commands} tk={tk} />);
    fireEvent.change(screen.getByLabelText('Type a command'), { target: { value: 'qqqq' } });
    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
  });

  it('renders nothing at all when closed', () => {
    const { container } = render(<CommandPalette open={false} onClose={() => {}} commands={commands} tk={tk} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ─── Inspector: the honesty rules ───────────────────────────────────────────
describe('the inspector', () => {
  const subject = { label: 'Headcount', value: '120 specialists', confirmation: 'unconfirmed' };
  const observations = [
    { value: '120 specialists', source: 'finance.yahoo.com', observed_at: '2026-08-21', excerpt: 'Team of 120 specialists across 19 countries.', source_url: 'https://finance.yahoo.com/x' },
    { value: '51-200 employees', source: 'leadiq.com', observed_at: '2026-08-21', excerpt: '51 to 200 Employees.', source_url: 'https://leadiq.com/y' },
  ];

  it('shows every witness rather than picking one', () => {
    render(<Inspector subject={subject} observations={observations} tk={tk} onClose={() => {}} />);
    // '120 specialists' appears twice on purpose: once as the header's representative
    // value, once as the observation it came from. The representative is never a
    // resolution — the second reading sits right beside it, equally weighted.
    expect(screen.getAllByText('120 specialists').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('51-200 employees')).toBeInTheDocument();
    expect(screen.getByText(/2 sources/i)).toBeInTheDocument();
  });

  // John's ruling, 2026-09-02: never adjudicate a company's record.
  it('never calls two readings a conflict', () => {
    const { container } = render(<Inspector subject={subject} observations={observations} tk={tk} onClose={() => {}} />);
    expect(container.textContent).not.toMatch(/disagree|conflict|contradict|unverified|wrong/i);
    expect(container.textContent).toMatch(/rather than picking a winner/i);
  });

  // Passage-level, not document-level: ~90% vs ~80% precision, and a founder cannot
  // check a claim against a whole file.
  it('quotes the passage, not just the document', () => {
    render(<Inspector subject={subject} observations={observations} tk={tk} onClose={() => {}} />);
    expect(screen.getByText(/Team of 120 specialists across 19 countries/)).toBeInTheDocument();
  });

  // ABSENCE RULE — the two absences are different facts.
  it('distinguishes could-not-look from looked-and-found-nothing', () => {
    const a = render(<Inspector subject={subject} observations={null} tk={tk} onClose={() => {}} />);
    expect(a.container.textContent).toMatch(/didn’t get to look/i);
    a.unmount();
    const b = render(<Inspector subject={subject} observations={[]} tk={tk} onClose={() => {}} />);
    expect(b.container.textContent).toMatch(/looked and found nothing/i);
    expect(b.container.textContent).not.toMatch(/didn’t get to look/i);
  });

  // The trace raises felt trust without raising competence (arXiv 2601.16720), so it
  // must be labelled as a record of what ran, never as evidence the answer is right.
  it('labels the trace as a receipt, not as proof', () => {
    const { container } = render(
      <Inspector subject={subject} observations={observations} tk={tk} onClose={() => {}}
        acts={[{ title: 'Reading your site', note: '0 pages', phase: 'done' }]} />
    );
    expect(container.textContent).toMatch(/what ran, not why it’s right/i);
  });

  it('states unconfirmed without implying anyone is lying', () => {
    const { container } = render(<Inspector subject={subject} observations={observations} tk={tk} onClose={() => {}} />);
    expect(container.textContent).toMatch(/You haven’t confirmed this yet/i);
  });

  it('is a dialog only when it has to be, and closes on Escape', () => {
    const onClose = vi.fn();
    render(<Inspector subject={subject} observations={observations} modal tk={tk} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('is a plain region at widths where it can sit beside the reading', () => {
    render(<Inspector subject={subject} observations={observations} tk={tk} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });
});

// ─── Comparison rail: the grading rule ──────────────────────────────────────
describe('the comparison rail compares presence, never score', () => {
  const subject = { name: 'Cognisys', entries: { vendors: { present: true }, aws: {} } };
  const peer = { name: 'Hive & Co', entries: { vendors: { filled: true }, aws: { filled: true } } };

  it('shows both companies on the same rows', () => {
    const { container } = render(<ComparisonRail subject={subject} peer={peer} tk={tk} />);
    expect(container.textContent).toContain('Cognisys');
    expect(container.textContent).toContain('Hive & Co');
    expect(container.textContent).toMatch(/Investor readiness/i);
  });

  // "The founder never feels evaluated" is the contract's hardest line. Two scores side
  // by side is a grade; two states of fullness is a lamp.
  it('renders no numbers, no deltas and no word for worse', () => {
    const { container } = render(<ComparisonRail subject={subject} peer={peer} tk={tk} />);
    expect(container.textContent).not.toMatch(/score|\d+\s*%|\bbehind\b|\bmissing\b|\bworse\b|\bfail/i);
    expect(container.textContent).not.toMatch(/\d/);
  });

  it('marks which side is the example, in either arrangement', () => {
    const a = render(<ComparisonRail subject={peer} peer={subject} subjectIsExample tk={tk} />);
    expect(a.container.textContent).toMatch(/example/i);
    a.unmount();
    const b = render(<ComparisonRail subject={subject} peer={peer} tk={tk} />);
    expect(b.container.textContent).toMatch(/example/i);
  });

  it('opens a row into the one inspector rather than a second panel', () => {
    const onOpenRow = vi.fn();
    render(<ComparisonRail subject={subject} peer={peer} onOpenRow={onOpenRow} tk={tk} />);
    fireEvent.click(screen.getByText(/Investor readiness/i));
    // Keys are the estate's own SPACES ids, so a row cannot silently stop matching its data.
    expect(onOpenRow).toHaveBeenCalledWith('investor');
  });
});
