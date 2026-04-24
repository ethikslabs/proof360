const RIBBON_CONFIG = {
  medium:  { text: 'High-confidence read with some gaps',              bg: 'bg-amber-50 border-amber-200 text-amber-800' },
  low:     { text: 'Directional read — additional signals recommended', bg: 'bg-orange-50 border-orange-200 text-orange-800' },
  partial: { text: 'Limited data — treat as early signal',             bg: 'bg-red-50 border-red-200 text-red-800' },
};

/**
 * Maps a confidence level to its display text.
 * Returns null for "high" or unknown levels.
 */
export function confidenceLevelToText(level) {
  if (!level || level === 'high') return null;
  return RIBBON_CONFIG[level]?.text ?? null;
}

export default function ConfidenceRibbon({ confidence }) {
  if (!confidence || !confidence.overall) return null;

  const config = RIBBON_CONFIG[confidence.overall];
  if (!config) return null;

  return (
    <div
      className={`w-full border px-5 py-3 ${config.bg}`}
      style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13 }}
    >
      {config.text}
    </div>
  );
}
