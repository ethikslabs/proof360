export const SPACE_GLYPHS = {
  chat: (c) => (
    <svg viewBox="0 0 22 22" width="14" height="14">
      <path d="M4 6 Q4 4 6 4 H16 Q18 4 18 6 V13 Q18 15 16 15 H10 L6 18 V15 Q4 15 4 13 Z"
            fill="none" stroke={c} strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  investor: (c) => (
    <svg viewBox="0 0 22 22" width="14" height="14">
      <circle cx="11" cy="11" r="9" fill="none" stroke={c} strokeWidth="1.2" opacity="0.4"/>
      <circle cx="11" cy="11" r="5" fill="none" stroke={c} strokeWidth="1.2" opacity="0.7"/>
      <circle cx="11" cy="11" r="1.6" fill={c}/>
    </svg>
  ),
  vendors: (c) => (
    <svg viewBox="0 0 22 22" width="14" height="14">
      <rect x="3"  y="5"  width="5" height="12" fill="none" stroke={c} strokeWidth="1.2"/>
      <rect x="9"  y="8"  width="5" height="9"  fill="none" stroke={c} strokeWidth="1.2"/>
      <rect x="15" y="3"  width="5" height="14" fill={c} opacity="0.85"/>
    </svg>
  ),
  aws: (c) => (
    <svg viewBox="0 0 22 22" width="14" height="14">
      <path d="M3 14 Q11 6 19 14" fill="none" stroke={c} strokeWidth="1.2"/>
      <circle cx="11" cy="10" r="1.5" fill={c}/>
      <path d="M3 17 L19 17" stroke={c} strokeWidth="0.8" opacity="0.45"/>
    </svg>
  ),
  posture: (c) => (
    <svg viewBox="0 0 22 22" width="14" height="14">
      <path d="M11 3 L18 6 V11 Q18 16 11 19 Q4 16 4 11 V6 Z" fill="none" stroke={c} strokeWidth="1.2"/>
      <path d="M8 11 L10.5 13.5 L15 9" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  spv: (c) => (
    <svg viewBox="0 0 22 22" width="14" height="14">
      <rect x="4" y="5" width="14" height="12" rx="1" fill="none" stroke={c} strokeWidth="1.2"/>
      <line x1="4" y1="9" x2="18" y2="9" stroke={c} strokeWidth="1.2"/>
      <circle cx="14" cy="13" r="1.8" fill={c}/>
    </svg>
  ),
  microsoft: (c) => (
    <svg viewBox="0 0 22 22" width="14" height="14">
      <rect x="3"  y="3"  width="7" height="7" fill={c} opacity="0.9"/>
      <rect x="12" y="3"  width="7" height="7" fill={c} opacity="0.55"/>
      <rect x="3"  y="12" width="7" height="7" fill={c} opacity="0.55"/>
      <rect x="12" y="12" width="7" height="7" fill={c} opacity="0.9"/>
    </svg>
  ),
};
