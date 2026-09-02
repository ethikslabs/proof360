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
    umber:      '#92400e',
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
    umber:      '#92400e',
    teal:       '#176577',
    indigo:     '#3d3aa0',
    aws:        '#ff9900',
    awsInk:     '#232f3e',
    sevHigh:    '#b04545',
    sevMed:     '#c2802f',
    sevOk:      '#3f7a4f',
  },
  // -------------------------------------------------------------------------
  // 'parallel' — the mirrored theme (John ruling 2026-09-01: the two estates
  // run PARALLEL, never merged). Neutrals, ground and hairlines are lifted
  // VERBATIM from the live Ethiks360 web app so the two products share a
  // skeleton; the accent is deliberately OURS so the two can never be confused
  // in a screenshot. Same shape, different skin.
  //   his ground   #F5F4EE  --color-home-bg
  //   his tint     #EFECE3  --color-home-light-bg
  //   his ink      #1C1C1E  --color-home-dark / --color-title
  //   his muted    #5A5A5E  --color-home-muted
  //   his border   #EAE7DD  --color-home-border
  //   his accent   #58D5D3 primary / #E05326 orange   <-- NOT used here
  // -------------------------------------------------------------------------
  parallel: {
    bg:         '#f5f4ee',
    bgTint:     '#efece3',
    surface:    '#ffffff',
    surfaceLo:  '#faf9f5',
    ink:        '#1c1c1e',
    inkMid:     '#5a5a5e',
    inkSoft:    '#8b8b90',
    inkGhost:   '#b8b6ae',
    hairline:   '#eae7dd',
    hairStrong: '#d9d5c7',
    // The accents are WARM and OURS (John ruling 2026-09-02). His ground is a
    // warm cream; a cool violet accent (#5b4cc4, the pearl value) sat on it as
    // a clash. These two hues come from the activation-gap deck approved this
    // week, so the product and the deck now agree:
    //   plum -> #b0501c  (deck --gap)      teal -> #0e6b62  (deck --through)
    // We do NOT take his #E05326 orange: a screenshot must still say which
    // build it is, which is the whole point of the parallel-estates ruling.
    plum:       '#b0501c',
    umber:      '#7c3d0c',
    teal:       '#0e6b62',
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
  // The house voice (John ruling 2026-08-25): the record itself speaking — the
  // default meta-persona for the reading, opener, and scan narration. Personas
  // are present but invited; the house reads, the lenses interpret.
  proof360: { label: 'proof360', token: 'ink',    note: 'Reading your public trail', bio: 'The record itself — what the evidence shows, before any lens.' },
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
  // Instrument Serif is ALREADY shared with the live Ethiks360 app — it loads
  // the same Google face. The display voice matches without any work.
  serif: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  sans:  "'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  mono:  "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace",
  // The live app's UI face. Used by the 'parallel' theme so mirrored screens
  // set type identically to his; every other theme keeps IBM Plex Sans.
  ui:    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

// ---------------------------------------------------------------------------
// GEOMETRY — measured off the live Ethiks360 app (tailwind.config.js +
// src/styles/globals.css @theme block), so mirrored surfaces sit on the same
// grid rather than an eyeballed approximation. Emitted as --p360-* vars.
// ---------------------------------------------------------------------------
export const GEOMETRY = {
  // his --text-22 / -28 / -32 / -80
  text22:      '1.375rem',
  text28:      '1.75rem',
  text32:      '2rem',
  text80:      '5rem',
  // his borderRadius.banner-tr / banner-bl (6.25rem) and shadcn --radius
  radiusBanner: '6.25rem',
  radius:       '0.625rem',
  // his boxShadow.inner-custom
  shadowInner:  'inset 0 0 10px rgba(0, 0, 0, 0.5)',
  // his --breakpoint-3xl
  bp3xl:        '1515px',
};

// The house ground is now the mirrored one (John ruling 2026-09-02): warm
// cream, not the cool grey of 'pearl'. main.jsx calls applyTheme() with no
// argument, so this constant is what every surface actually renders on.
export const DEFAULT_THEME = 'parallel';

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
  // The UI face is deliberately NOT swapped with the theme (2026-09-02).
  // FONT.ui was recorded as Inter off his tailwind config and the rendered
  // face reads rounder than that, so it is unverified; and ~124 call sites
  // hardcode IBM Plex Sans rather than reading var(--p360-sans), so swapping
  // here would set half the screen in one face and half in the other. Flip
  // this in ONE move, after the face is confirmed and the families swept.
  el.style.setProperty('--p360-sans', FONT.sans);
  el.style.setProperty('--p360-mono', FONT.mono);
  el.style.setProperty('--p360-ui', FONT.ui);
  for (const [key, value] of Object.entries(GEOMETRY)) {
    el.style.setProperty(`--p360-${key}`, value);
  }
  el.setAttribute('data-theme', theme);
}
