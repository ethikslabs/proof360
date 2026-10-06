import { MEET_JOHN_URL } from './meetJohn.js';

// HubSpot's meetings embed is its page at ?embed=true in an iframe. Their
// MeetingsEmbedCode.js wrapper only inserts that iframe and auto-sizes it; it
// rendered blank in a headless check (2026-10-06) where the iframe on its own
// rendered the calendar, so the iframe is used directly at a fixed height.
export function MeetJohnModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(20,16,28,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fbf8f1', borderRadius: 14,
        width: 'min(760px, 95vw)', maxHeight: '92vh', overflowY: 'auto',
        padding: '22px 22px 18px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9ca3af' }}>Meet John</div>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'transparent', border: 'none', fontSize: 20, lineHeight: 1,
            color: '#6b7280', cursor: 'pointer',
          }}>×</button>
        </div>
        <iframe
          title="Book a time with John"
          src={`${MEET_JOHN_URL}?embed=true`}
          style={{ width: '100%', height: 'min(700px, 75vh)', border: 'none', display: 'block' }}
        />
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
          Calendar not loading? <a href={MEET_JOHN_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>Open it in a new tab</a>.
        </div>
      </div>
    </div>
  );
}
