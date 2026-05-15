const STATUS_ICON = { running: '⟳', complete: '✓', failed: '✗' };
const STATUS_COLOR = { running: '#d97706', complete: '#16a34a', failed: '#dc2626' };
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
      background: '#f3f4f6',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
        Working
      </p>
      {steps.map(step => (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ color: STATUS_COLOR[step.status], fontSize: 13, minWidth: 14 }}>
            {STATUS_ICON[step.status]}
          </span>
          <span style={{ fontSize: 13, color: step.status === 'complete' ? '#9ca3af' : '#111827', flex: 1 }}>
            {step.label}
          </span>
          {step.provider && step.provider !== 'internal' && (
            <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
              via {PROVIDER_LABEL[step.provider] || step.provider}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
