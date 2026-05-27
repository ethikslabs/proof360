// frontend/src/components/chat/GuidanceBlock.jsx

export function GuidanceBlock({ block, isRegenerating }) {
  if (!block) return null;

  return (
    <div style={{
      background: '#ecfeff',
      border: '1px solid #9dccd655',
      borderRadius: '4px 16px 16px 16px',
      padding: '12px 16px',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      fontSize: 13,
      lineHeight: 1.7,
      color: '#241f31',
      position: 'relative',
    }}>
      {isRegenerating && (
        <div style={{ fontSize: 10, color: '#8c8499', fontStyle: 'italic', marginBottom: 8 }}>
          ↻ Updating based on your correction…
        </div>
      )}

      {/* Beat 2: Why it matters (synthesis) */}
      <p style={{ margin: '0 0 12px' }}>{block.synthesis}</p>

      {/* Beat 3: Next move — always required */}
      {block.next_move && (
        <div style={{
          borderTop: '1px solid #e0d8c9',
          paddingTop: 10,
          marginTop: 4,
          fontSize: 12,
          color: '#5a5267',
        }}>
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 8.5, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#176577', marginRight: 8,
          }}>
            Next
          </span>
          {block.next_move}
        </div>
      )}

      {/* Provenance */}
      <div style={{ fontSize: 9, color: '#b8b1c0', marginTop: 10, fontStyle: 'italic' }}>
        {block.persona} lens · {block.signals.length} signal{block.signals.length !== 1 ? 's' : ''} ·{' '}
        {new Date(block.generated_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
