const STATUS_ICON = { running: '⟳', complete: '✓', failed: '✗' };
const STATUS_COLOR = { running: '#f59e0b', complete: '#22c55e', failed: '#ef4444' };
const PROVIDER_LABEL = {
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  'anthropic/claude': 'Claude',
  internal: 'proof360',
};

export function ThinkingStream({ steps, visible }) {
  if (!visible || steps.length === 0) return null;

  return (
    <div style={{
      margin: '8px 0 16px',
      padding: '12px 16px',
      background: '#0d1520',
      border: '1px solid #1e293b',
      borderRadius: 10,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
        Working
      </p>
      {steps.map(step => (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ color: STATUS_COLOR[step.status], fontSize: 13, minWidth: 14 }}>
            {STATUS_ICON[step.status]}
          </span>
          <span style={{ fontSize: 13, color: step.status === 'complete' ? '#64748b' : '#f1f5f9', flex: 1 }}>
            {step.label}
          </span>
          {step.provider && step.provider !== 'internal' && (
            <span style={{ fontSize: 10, color: '#334155', fontStyle: 'italic' }}>
              via {PROVIDER_LABEL[step.provider] || step.provider}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
