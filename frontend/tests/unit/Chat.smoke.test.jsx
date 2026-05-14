import { render, screen } from '@testing-library/react';
import { PersonaChips } from '../../src/components/chat/PersonaChips.jsx';
import { MessageBubble } from '../../src/components/chat/MessageBubble.jsx';
import { ChatInput } from '../../src/components/chat/ChatInput.jsx';

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
    expect(screen.getByRole('button', { name: /start|send|go/i })).toBeInTheDocument();
  });
});
