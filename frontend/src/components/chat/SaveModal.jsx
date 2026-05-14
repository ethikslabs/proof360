import { useState } from 'react';

export function SaveModal({ onSave, onDismiss }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 16, padding: 32, width: 420, maxWidth: '90vw' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>Save your snapshot</p>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
          We'll only use your name and email so you can come back to this report. Your report stays private. Refine it anytime or delete it.
        </p>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', background: '#0d1520', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
        />
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', background: '#0d1520', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 13, marginBottom: 20, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onSave({ name, email })}
            disabled={!name || !email}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, background: name && email ? '#4f46e5' : '#1e293b', color: name && email ? '#fff' : '#475569', border: 'none', fontSize: 13, fontWeight: 700, cursor: name && email ? 'pointer' : 'default' }}
          >
            Save my report
          </button>
          <button
            onClick={onDismiss}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, background: 'transparent', color: '#64748b', border: '1px solid #1e293b', fontSize: 13, cursor: 'pointer' }}
          >
            Keep exploring
          </button>
        </div>
      </div>
    </div>
  );
}
