const STATUS_ICON = { running: '⟳', complete: '✓', failed: '✗' };
const STATUS_COLOR = { running: '#d97706', complete: '#16a34a', failed: '#dc2626' };

const PROVIDER_META = {
  perplexity: { label: 'Perplexity', icon: '🔍' },
  gemini:     { label: 'Gemini',     icon: '✦' },
  'anthropic/claude': { label: 'Claude', icon: '◆' },
  internal:   { label: 'proof360',   icon: '⬡' },
};

export function ThinkingStream({ steps, visible }) {
  if (!visible || steps.length === 0) return null;

  return (
    <div style={{
      margin: '8px 0 16px',
      padding: '12px 16px',
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
        Working
      </p>
      {steps.map(step => {
        const meta = PROVIDER_META[step.provider] || { label: step.provider, icon: '·' };
        const done = step.status === 'complete';
        return (
          <div key={step.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: STATUS_COLOR[step.status], fontSize: 12, minWidth: 14 }}>
                {STATUS_ICON[step.status]}
              </span>
              <span style={{ fontSize: 13, color: done ? '#6b7280' : '#111827', flex: 1, fontWeight: done ? 400 : 500 }}>
                {step.label}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                <span>{meta.icon}</span>
                <span>{step.model || meta.label}</span>
              </span>
            </div>
            {step.reference && (
              <div style={{ marginLeft: 22, marginTop: 2, fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
                {step.reference}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
