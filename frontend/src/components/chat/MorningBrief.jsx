import { useState } from 'react';
import { tokens, PERSONA } from '../../tokens.js';

const PROVIDERS = ['perplexity', 'gemini', 'internal'];
const PROVIDER_COLORS = {
  perplexity: 'teal',
  gemini:     'indigo',
  internal:   'umber',
};
const PROVIDER_MARKS = { perplexity: 'P', gemini: 'G', internal: '◇' };

function ProviderMark({ provider, t, size = 28 }) {
  const tk = tokens(t.theme);
  const color = tk[PROVIDER_COLORS[provider]] || tk.inkMid;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}10`, border: `1px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: size * 0.42, fontWeight: 600, color,
    }}>{PROVIDER_MARKS[provider] || '·'}</div>
  );
}

function PullSignalCard({ onConfirm, t }) {
  const tk = tokens(t.theme);
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onConfirm}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: hover ? `${tk.plum}08` : tk.surface,
        border: `1px solid ${hover ? `${tk.plum}40` : tk.hairline}`,
        borderRadius: 14, padding: '20px 24px', marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 18,
        transition: 'background 0.25s, border-color 0.25s',
      }}>
      <div style={{ display: 'flex' }}>
        {PROVIDERS.map((p, i) => (
          <div key={p} style={{
            marginLeft: i > 0 ? -7 : 0, zIndex: PROVIDERS.length - i, position: 'relative',
            boxShadow: `0 0 0 2px ${hover ? `${tk.plum}08` : tk.surface}`, borderRadius: '50%',
          }}>
            <ProviderMark provider={p} t={t} size={28} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10, fontWeight: 600, color: tk.plum,
          letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4,
        }}>Pull today&apos;s signal</div>
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic',
          fontSize: 16, color: tk.ink, lineHeight: 1.4,
        }}>What&apos;s happened in your industry since you last looked.</div>
      </div>
      <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 14, color: tk.inkSoft }}>↵</span>
    </button>
  );
}

const SINCE_LAST = [
  { who: 'sofia',    what: 'drafted your investor narrative opening',        when: 'late yesterday' },
  { who: 'edison',   what: 'flagged that your SSL config drifted overnight', when: '04:32' },
  { who: 'leonardo', what: 'matched 2 new vendors to your gaps',             when: '06:18' },
];

export function MorningBrief({ onPullSignal, t }) {
  const tk = tokens(t.theme);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ animation: 'fadeSlideUp 0.7s ease both', paddingTop: 12 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10, fontWeight: 500, color: tk.inkSoft,
          letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14,
        }}>
          This morning · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 style={{
          fontFamily: '"Instrument Serif", Georgia, serif', fontWeight: 400,
          fontSize: 'clamp(32px, 4vw, 46px)', color: tk.ink,
          letterSpacing: '-0.018em', lineHeight: 1.12, margin: '0 0 14px',
        }}>{greeting}.</h1>
        <p style={{
          fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic',
          fontSize: 17, color: tk.inkMid, lineHeight: 1.55, margin: 0, maxWidth: 520,
        }}>The room has been doing some work while you were away.</p>
      </div>

      <div style={{
        background: tk.surface, borderRadius: 14,
        border: `1px solid ${tk.hairline}`,
        padding: '22px 26px', marginBottom: 22,
      }}>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10, fontWeight: 600, color: tk.inkSoft,
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16,
        }}>Since you were here</div>
        {SINCE_LAST.map((s, i) => {
          const meta = PERSONA[s.who];
          const color = tk[meta?.token] || tk.inkMid;
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '76px 1fr 80px',
              gap: 16, alignItems: 'baseline',
              padding: '10px 0',
              borderBottom: i < SINCE_LAST.length - 1 ? `1px solid ${tk.hairline}` : 'none',
            }}>
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 9.5, fontWeight: 600, color,
                letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>{meta?.label || s.who}</span>
              <span style={{
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontSize: 14, color: tk.ink, lineHeight: 1.55,
              }}>{s.what}</span>
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 9.5, color: tk.inkSoft, letterSpacing: '0.06em', textAlign: 'right',
              }}>{s.when}</span>
            </div>
          );
        })}
      </div>

      <PullSignalCard onConfirm={onPullSignal} t={t} />
    </div>
  );
}
