import { tokens } from '../../tokens.js';

export function FloatQ({ q, side, top, layer, pulsing, gone, treatment, t }) {
  const tk = tokens(t.theme);
  const isFront = layer === 'front';
  const isMid   = layer === 'mid';
  const showMarks = treatment === 'marks' || treatment === 'editorial';

  const baseColor = isFront ? (pulsing ? tk.plum : tk.ink) : tk.inkSoft;
  const fontSize  = isFront ? 30 : isMid ? 14 : 10;
  const opacity   = gone    ? 0
                  : isFront ? (pulsing ? 0.62 : 0.34)
                  : isMid   ? 0.10 : 0.05;
  const blur = isFront ? 0 : isMid ? 1.2 : 2.4;

  const style = {
    position: 'absolute', top,
    [side]: treatment === 'editorial' ? '3.2vw' : '2vw',
    maxWidth: isFront ? 360 : 200,
    fontFamily: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
    fontStyle: 'italic',
    fontSize, lineHeight: isFront ? 1.18 : 1.4,
    letterSpacing: isFront ? '-0.012em' : '0',
    color: baseColor, opacity,
    filter: `blur(${blur}px)`,
    transform: `translateY(${isFront ? 0 : 12}px)`,
    transition: 'font-size 2.2s ease, opacity 2.2s ease, filter 2.2s ease, transform 2.2s ease, color 0.8s ease, max-width 2.2s ease',
    animation: pulsing ? 'fqPulse 2.4s ease-in-out infinite' : (isFront ? 'fqDrift 18s ease-in-out infinite' : 'none'),
    pointerEvents: 'none', userSelect: 'none', zIndex: 0,
    textAlign: side === 'right' ? 'right' : 'left',
  };

  if (!showMarks) return <div style={style}>{q}</div>;

  const markStyle = {
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontStyle: 'normal',
    fontSize: fontSize * 1.6, lineHeight: 0.4,
    color: isFront ? baseColor : tk.inkGhost,
    opacity: isFront ? 0.5 : 1,
    display: 'inline-block', transform: 'translateY(0.18em)',
    marginRight: side === 'right' ? 0 : '0.18em',
    marginLeft:  side === 'right' ? '0.18em' : 0,
  };

  return (
    <div style={style}>
      {side !== 'right' && <span style={markStyle}>&ldquo;</span>}
      {q}
      {side === 'right' && <span style={markStyle}>&rdquo;</span>}
    </div>
  );
}
