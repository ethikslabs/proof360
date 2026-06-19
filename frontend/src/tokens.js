export const TOKEN = {
  pearl: {
    bg:         '#f5f6f8',
    bgTint:     '#eef0f4',
    surface:    '#ffffff',
    surfaceLo:  '#f7f8fa',
    ink:        '#1a1d24',
    inkMid:     '#4a4f5c',
    inkSoft:    '#7b8190',
    inkGhost:   '#b4b9c4',
    hairline:   '#e6e8ec',
    hairStrong: '#d3d7df',
    plum:       '#5b4cc4',
    umber:      '#a8651e',
    teal:       '#176577',
    indigo:     '#3d3aa0',
    aws:        '#ff9900',
    awsInk:     '#232f3e',
    sevHigh:    '#c0392b',
    sevMed:     '#c2802f',
    sevOk:      '#2f9e5f',
  },
  paper: {
    bg:         '#fbf8f0',
    bgTint:     '#f6eef2',
    surface:    '#ffffff',
    surfaceLo:  '#faf6ec',
    ink:        '#241f31',
    inkMid:     '#5a5267',
    inkSoft:    '#8c8499',
    inkGhost:   '#bdb6c4',
    hairline:   '#ece4d4',
    hairStrong: '#d8cebc',
    plum:       '#6b4ea8',
    umber:      '#a8651e',
    teal:       '#176577',
    indigo:     '#3d3aa0',
    aws:        '#ff9900',
    awsInk:     '#232f3e',
    sevHigh:    '#b04545',
    sevMed:     '#c2802f',
    sevOk:      '#3f7a4f',
  },
  study: {
    bg:         '#ecedf2',
    bgTint:     '#e4e2ec',
    surface:    '#f6f6fa',
    surfaceLo:  '#eeeef5',
    ink:        '#1f1d2a',
    inkMid:     '#56536a',
    inkSoft:    '#86839a',
    inkGhost:   '#b2afc2',
    hairline:   '#d8d5e0',
    hairStrong: '#c2bed0',
    plum:       '#5a3f96',
    umber:      '#8a521c',
    teal:       '#125261',
    indigo:     '#332f8a',
    aws:        '#ff9900',
    awsInk:     '#232f3e',
    sevHigh:    '#a64141',
    sevMed:     '#b87420',
    sevOk:      '#3a6e48',
  },
};

export function tokens(theme) { return TOKEN[theme] || TOKEN.pearl; }

export const PERSONA = {
  sofia:    { label: 'Sophia',   token: 'umber',  note: 'Narrative & trust',     bio: 'Reads your trust story through investor and customer eyes.' },
  sophia:   { label: 'Sophia',   token: 'umber',  note: 'Narrative & trust',     bio: 'Reads your trust story through investor and customer eyes.' },
  leonardo: { label: 'Leonardo', token: 'plum',   note: 'Strategy & market',     bio: 'Translates trust gaps into fundraising and deal consequences.' },
  edison:   { label: 'Edison',   token: 'teal',   note: 'Technical & execution', bio: 'Sequences what to fix, in what order, and how fast.' },
  john_ai:  { label: 'John',     token: 'indigo', note: "John's AI assistant",   bio: 'Relays your message to John directly.' },
};

export function personaColor(persona, theme) {
  const tk = tokens(theme);
  const meta = PERSONA[persona];
  return tk[meta?.token] || tk.plum;
}

// ---------------------------------------------------------------------------
// THE MASTER TEMPLATE
// One source of truth for type + colour. JS code reads tokens()/FONT directly;
// CSS and <style> blocks read the same values as `var(--p360-*)` custom
// properties, emitted onto :root by applyTheme(). Change a value here and it
// updates everywhere — like a Word template's styles.
// ---------------------------------------------------------------------------

export const FONT = {
  serif: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  sans:  "'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  mono:  "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace",
};

export const DEFAULT_THEME = 'pearl';

// Emit the active theme's palette + fonts as CSS custom properties on :root,
// so stylesheets/<style> blocks can use var(--p360-ink), var(--p360-serif), etc.
// and stay perfectly in sync with the JS-side tokens() consumers (e.g. /chat).
export function applyTheme(theme = DEFAULT_THEME, root) {
  const el = root || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;
  const tk = tokens(theme);
  for (const [key, value] of Object.entries(tk)) {
    el.style.setProperty(`--p360-${key}`, value);
  }
  el.style.setProperty('--p360-serif', FONT.serif);
  el.style.setProperty('--p360-sans', FONT.sans);
  el.style.setProperty('--p360-mono', FONT.mono);
  el.setAttribute('data-theme', theme);
}
