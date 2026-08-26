// The overlay fails alone.
//
// One object in one text slot threw React #31 inside a projection, the app-level
// ErrorBoundary caught it, and the entire chat — the read, the personas, the
// record, the conversation in progress — was replaced by a black RENDER ERROR
// screen with a "Back to home" button (John, 2026-08-26).
//
// The shape bug that caused it is fixed, but the blast radius was the real
// defect. A sheet that flies in over the conversation is a leaf; a leaf must not
// be able to destroy the room it opened over. The conversation is the one thing
// the founder cannot afford to lose — so anything overlaid on it fails inside
// its own frame, says so plainly, and hands back a way out.
import { Component } from 'react';

export class PanelBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Loud in the console, quiet on the screen: whoever is debugging needs the
    // stack, the founder needs a sentence.
    console.error('[panel] projection failed to render', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    const { children, onClose } = this.props;
    if (!error) return children;

    return (
      <div style={{
        padding: '48px 48px 60px', maxWidth: 640, margin: '0 auto',
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}>
        <p style={{
          fontFamily: '"IBM Plex Mono", monospace', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#b45309', margin: '0 0 14px',
        }}>
          This panel didn&apos;t open
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4b5563', margin: '0 0 8px' }}>
          We couldn&apos;t render this one. That&apos;s on us, not you.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4b5563', margin: '0 0 22px' }}>
          Your conversation is still there and nothing has been lost.
        </p>
        {onClose && (
          <button
            onClick={() => { this.setState({ error: null }); onClose(); }}
            style={{
              fontFamily: '"IBM Plex Mono", monospace', fontSize: 11,
              background: 'none', border: '1px solid rgba(31,36,48,0.25)',
              borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: '#1f2430',
            }}
          >
            ← Back to the conversation
          </button>
        )}
      </div>
    );
  }
}

export default PanelBoundary;
