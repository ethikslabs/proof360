// Warm, contextual — never a sales CTA.
export function EscalationCTA({ message, telegramUrl, email }) {
  if (!message) return null;

  return (
    <div style={{
      marginTop: 24,
      background: '#f5f3ff',
      border: '1px solid #e0e7ff',
      borderRadius: 10,
      padding: '16px 18px',
    }}>
      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, marginBottom: 14 }}>
        {message}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {telegramUrl && (
          <a href={telegramUrl} target="_blank" rel="noreferrer" style={{
            fontSize: 12, fontWeight: 600, color: '#4f46e5',
            background: '#ede9fe', padding: '6px 14px', borderRadius: 20,
            textDecoration: 'none',
          }}>
            → Telegram
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} style={{
            fontSize: 12, fontWeight: 600, color: '#374151',
            background: '#f3f4f6', padding: '6px 14px', borderRadius: 20,
            textDecoration: 'none',
          }}>
            → Email
          </a>
        )}
      </div>
    </div>
  );
}
