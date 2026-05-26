// frontend/src/components/chat/ModeTiles.jsx
import { useState } from 'react';
import { tokens } from '../../tokens.js';

const MODES = [
  {
    id: 'investor', label: 'Investor readiness', icon: '📈',
    questions: [
      'What do investors check before wiring money?',
      'What breaks due diligence for a Series A?',
      'Which compliance gaps would a VC flag first?',
      'What evidence of traction matters most right now?',
      'How do I close the investor readiness gap in 90 days?',
    ],
  },
  {
    id: 'diligence', label: 'Due diligence', icon: '🔍',
    questions: [
      'What goes in a Series A data room?',
      'What legal issues do DD teams flag most often?',
      'Am I ready for SOC 2 Type I?',
      'What does a technical due diligence checklist look like?',
      'How do I prepare for an investor security review?',
    ],
  },
  {
    id: 'dealroom', label: 'Deal room', icon: '🏦',
    questions: [
      'How healthy is a typical Series A cap table?',
      'SAFE vs priced round — what do investors prefer right now?',
      'What valuation signals matter at seed stage?',
      'What term sheet clauses should I push back on?',
      'How do I build an investor pipeline from scratch?',
    ],
  },
  {
    id: 'documents', label: 'Documents', icon: '📄',
    questions: [
      'Review my pitch deck structure',
      "What's missing from a standard NDA for a SaaS startup?",
      'How do I structure a data room for DD?',
      'Summarise the key risks in this term sheet',
      'What does a board-ready policy document look like?',
    ],
  },
];

export function ModeTiles({ onSelect, t }) {
  const tk = tokens(t?.theme ?? 'pearl');
  const [activeId, setActiveId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredQ, setHoveredQ] = useState(null);

  const activeMode = MODES.find(m => m.id === activeId);

  function handleTileClick(id) {
    setActiveId(prev => prev === id ? null : id);
  }

  function handleQuestionClick(question) {
    setActiveId(null);
    onSelect?.(question);
  }

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>

      {/* Mode chips */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center', marginBottom: activeMode ? 10 : 0 }}>
        {MODES.map(m => {
          const isActive = activeId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleTileClick(m.id)}
              onMouseEnter={() => setHoveredId(m.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px',
                border: `1px solid ${isActive ? tk.ink : (hoveredId === m.id ? '#9ca3af' : tk.hairline)}`,
                borderRadius: 20,
                background: isActive ? tk.ink : 'transparent',
                color: isActive ? '#f8f5f0' : (hoveredId === m.id ? tk.ink : tk.inkSoft),
                fontSize: 12.5, fontWeight: 500,
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 11 }}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Question panel */}
      {activeMode && (
        <div style={{
          background: '#ffffff',
          border: `1px solid ${tk.hairline}`,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          marginTop: 6,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            borderBottom: `1px solid ${tk.hairline}`,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: tk.inkSoft,
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            <span>{activeMode.icon} {activeMode.label}</span>
            <button
              type="button"
              onClick={() => setActiveId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: tk.inkSoft, lineHeight: 1, padding: 0 }}
            >×</button>
          </div>
          {activeMode.questions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleQuestionClick(q)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px',
                borderBottom: i < activeMode.questions.length - 1 ? `1px solid ${tk.hairline}` : 'none',
                background: hoveredQ === i ? '#faf8f4' : 'none',
                border: 'none',
                fontSize: 13, color: tk.ink, lineHeight: 1.4,
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredQ(i)}
              onMouseLeave={() => setHoveredQ(null)}
            >{q}</button>
          ))}
        </div>
      )}
    </div>
  );
}
