export const TOKEN = {
  pearl: {
    bg:         '#f4efe6',
    bgTint:     '#ece4ef',
    surface:    '#fbf8f1',
    surfaceLo:  '#f7f1e6',
    ink:        '#241f31',
    inkMid:     '#5a5267',
    inkSoft:    '#8c8499',
    inkGhost:   '#b8b1c0',
    hairline:   '#e0d8c9',
    hairStrong: '#cdc3b1',
    plum:       '#6b4ea8',
    umber:      '#a8651e',
    teal:       '#176577',
    indigo:     '#3d3aa0',
    sevHigh:    '#b04545',
    sevMed:     '#c2802f',
    sevOk:      '#3f7a4f',
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
    sevHigh:    '#a64141',
    sevMed:     '#b87420',
    sevOk:      '#3a6e48',
  },
};

export function tokens(theme) { return TOKEN[theme] || TOKEN.pearl; }

export const PERSONA = {
  sofia:    { label: 'Sophia',   token: 'umber',  note: 'Investor & trust lens'     },
  leonardo: { label: 'Leonardo', token: 'plum',   note: 'Narrative & positioning'   },
  edison:   { label: 'Edison',   token: 'teal',   note: 'Technical & enterprise DD' },
  john_ai:  { label: 'John',     token: 'indigo', note: "John's AI assistant"       },
};

export function personaColor(persona, theme) {
  const tk = tokens(theme);
  const meta = PERSONA[persona];
  return tk[meta?.token] || tk.plum;
}
