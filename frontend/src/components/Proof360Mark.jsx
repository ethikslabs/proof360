import { useEffect, useRef } from 'react';

/**
 * Proof360 brand mark — animated SVG, two tempos.
 *
 * variant="ambient"  16s cycle  nav, header, footer
 * variant="hero"     24s cycle  landing hero, focal placements
 *
 * Geometry: three 270° arcs (outer r55, middle r42, inner r29) + attestation tick.
 * Rotation: outer 1rev, middle 2rev, inner 3rev — all spin same direction.
 * Palette: muted traffic-light (red/amber/green) + bright tick on attestation hold.
 */
export function Proof360Mark({ variant = 'ambient', size = 200, className = '', style = {} }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia) return;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const svg = svgRef.current;
    if (!svg || typeof svg.pauseAnimations !== 'function') return;
    svg.pauseAnimations();
    // Seek to the lock-with-tick-visible frame
    svg.setCurrentTime(variant === 'hero' ? 12 : 8);
  }, [variant]);

  if (variant === 'hero') {
    return (
      <svg
        ref={svgRef}
        className={`proof360-mark proof360-mark--hero${className ? ` ${className}` : ''}`}
        width={size}
        height={size}
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Proof360"
        style={style}
      >
        <title>Proof360</title>
        <g transform="translate(100, 100)">
          <g>
            <path d="M 38.9 -38.9 A 55 55 0 1 1 -38.9 -38.9" fill="none" stroke="var(--p360-red, #A64640)" strokeWidth="5" strokeLinecap="round" />
            <animateTransform attributeName="transform" type="rotate" values="0; 360; 360; 720" keyTimes="0; 0.333; 0.667; 1" dur="24s" repeatCount="indefinite" />
          </g>
          <g>
            <path d="M 40.6 -10.9 A 42 42 0 1 1 -10.9 -40.6" fill="none" stroke="var(--p360-amber, #C7922E)" strokeWidth="5" strokeLinecap="round" />
            <animateTransform attributeName="transform" type="rotate" values="0; 720; 720; 1440" keyTimes="0; 0.333; 0.667; 1" dur="24s" repeatCount="indefinite" />
          </g>
          <g>
            <path d="M 28 7.5 A 29 29 0 1 1 7.5 -28" fill="none" stroke="var(--p360-green, #3D9B5A)" strokeWidth="5" strokeLinecap="round" />
            <animateTransform attributeName="transform" type="rotate" values="0; 1080; 1080; 2160" keyTimes="0; 0.333; 0.667; 1" dur="24s" repeatCount="indefinite" />
          </g>
          <path d="M -10 0 L -3 8 L 12 -10" fill="none" stroke="var(--p360-tick, #46B561)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0">
            <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" keyTimes="0; 0.333; 0.417; 0.625; 0.667; 1" dur="24s" repeatCount="indefinite" />
          </path>
        </g>
      </svg>
    );
  }

  // ambient (16s)
  return (
    <svg
      ref={svgRef}
      className={`proof360-mark proof360-mark--ambient${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Proof360"
      style={style}
    >
      <title>Proof360</title>
      <g transform="translate(100, 100)">
        <g>
          <path d="M 38.9 -38.9 A 55 55 0 1 1 -38.9 -38.9" fill="none" stroke="var(--p360-red, #A64640)" strokeWidth="5" strokeLinecap="round" />
          <animateTransform attributeName="transform" type="rotate" values="0; 360; 360; 720" keyTimes="0; 0.375; 0.625; 1" dur="16s" repeatCount="indefinite" />
        </g>
        <g>
          <path d="M 40.6 -10.9 A 42 42 0 1 1 -10.9 -40.6" fill="none" stroke="var(--p360-amber, #C7922E)" strokeWidth="5" strokeLinecap="round" />
          <animateTransform attributeName="transform" type="rotate" values="0; 720; 720; 1440" keyTimes="0; 0.375; 0.625; 1" dur="16s" repeatCount="indefinite" />
        </g>
        <g>
          <path d="M 28 7.5 A 29 29 0 1 1 7.5 -28" fill="none" stroke="var(--p360-green, #3D9B5A)" strokeWidth="5" strokeLinecap="round" />
          <animateTransform attributeName="transform" type="rotate" values="0; 1080; 1080; 2160" keyTimes="0; 0.375; 0.625; 1" dur="16s" repeatCount="indefinite" />
        </g>
        <path d="M -10 0 L -3 8 L 12 -10" fill="none" stroke="var(--p360-tick, #46B561)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0">
          <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" keyTimes="0; 0.375; 0.475; 0.594; 0.625; 1" dur="16s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  );
}
