// PersonaFollowUps — live persona follow-up chips (docs/plans/2026-08-25-persona-
// chips-and-proposal-cards.md, Task 2). Renders exactly what the /followups
// endpoint returned for THIS session — no canned text in live. Empty/null in,
// nothing out (honest degradation; INVARIANTS no-canned-text).
export const PERSONA_COLORS = { sofia: '#a8651e', edison: '#176577', leonardo: '#6b4ea8' };
export const PERSONA_NAMES = { sofia: 'Sophia', edison: 'Edison', leonardo: 'Leonardo' };
export const PERSONA_LENSES = {
  sofia: 'Narrative & trust',
  edison: 'Technical & execution',
  leonardo: 'Strategy & market',
};

export function PersonaFollowUps({ followups, onAsk, tk }) {
  if (!followups || followups.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '4px 0 20px' }}>
      {followups.map((f) => {
        const color = PERSONA_COLORS[f.persona] ?? tk.inkSoft;
        const name = PERSONA_NAMES[f.persona] ?? f.persona;
        return (
          <button
            key={f.persona}
            type="button"
            onClick={() => onAsk(f.persona, f.question)}
            title={PERSONA_LENSES[f.persona] ?? undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 13px', borderRadius: 20,
              border: `1px solid ${tk.hairline}`,
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: 12, color: tk.inkSoft,
              transition: 'all 0.14s',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontWeight: 600, color }}>{name}</span>
            <span>{f.question}</span>
          </button>
        );
      })}
    </div>
  );
}
