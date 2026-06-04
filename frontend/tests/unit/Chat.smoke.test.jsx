import { render, screen } from '@testing-library/react';
import { PersonaChips } from '../../src/components/chat/PersonaChips.jsx';
import { MessageBubble } from '../../src/components/chat/MessageBubble.jsx';
import { ChatInput } from '../../src/components/chat/ChatInput.jsx';
import { ThinkingStream } from '../../src/components/chat/ThinkingStream.jsx';
import { DrawerPanel } from '../../src/components/chat/DrawerPanel.jsx';
import { VendorShortlist } from '../../src/components/chat/VendorShortlist.jsx';

describe('PersonaChips', () => {
  it('renders all four personas', () => {
    render(<PersonaChips activePersona={null} onSelect={() => {}} />);
    expect(screen.getByText(/sofia/i)).toBeInTheDocument();
    expect(screen.getByText(/leonardo/i)).toBeInTheDocument();
    expect(screen.getByText(/edison/i)).toBeInTheDocument();
    expect(screen.getByText(/john/i)).toBeInTheDocument();
  });

  it('marks active persona', () => {
    render(<PersonaChips activePersona="sofia" onSelect={() => {}} />);
    const sofiaChip = screen.getByText(/sofia/i).closest('button');
    expect(sofiaChip).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('MessageBubble', () => {
  it('renders user message', () => {
    const msg = { id: '1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders persona message with label', () => {
    const msg = { id: '2', role: 'assistant', persona: 'sofia', content: 'Sofia response', timestamp: new Date().toISOString() };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText('Sofia response')).toBeInTheDocument();
    expect(screen.getAllByText(/sofia/i).length).toBeGreaterThan(0);
  });
});

describe('ChatInput', () => {
  it('renders textarea and submit button', () => {
    render(<ChatInput onSubmit={() => {}} disabled={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^(analyze|start|send)$/i })).toBeInTheDocument();
  });
});

describe('ThinkingStream', () => {
  it('renders nothing when not visible', () => {
    const t = { theme: 'pearl' };
    const { container } = render(<ThinkingStream steps={[]} visible={false} t={t} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders steps when visible', () => {
    const steps = [{ id: 't1', label: 'Checking market', provider: 'perplexity', status: 'complete', durationMs: 400 }];
    const t = { theme: 'pearl' };
    render(<ThinkingStream steps={steps} visible={true} t={t} />);
    expect(screen.getByText('Checking market')).toBeInTheDocument();
  });
});

describe('DrawerPanel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<DrawerPanel title="Test" isOpen={false} onClose={() => {}}><p>content</p></DrawerPanel>);
    expect(container.firstChild).toBeNull();
  });

  it('renders content and title when open', () => {
    render(<DrawerPanel title="Evidence" isOpen={true} onClose={() => {}}><p>evidence content</p></DrawerPanel>);
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('evidence content')).toBeInTheDocument();
  });
});

describe('VendorShortlist', () => {
  it('renders vendors grouped by timing', () => {
    const vendors = [
      { id: 'v1', name: 'MFA', category: 'identity', timing: 'now', reason: 'needs it', status: 'suggested' },
      { id: 'v2', name: 'Vanta', category: 'compliance', timing: 'later', reason: 'enterprise', status: 'suggested' },
    ];
    render(<VendorShortlist vendors={vendors} onShortlist={() => {}} onDefer={() => {}} />);
    expect(screen.getByText('MFA')).toBeInTheDocument();
    expect(screen.getByText('Vanta')).toBeInTheDocument();
  });
});
