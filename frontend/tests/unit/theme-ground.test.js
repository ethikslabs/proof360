// The house ground is a contract, not a preference (John ruling 2026-09-02).
// Every existing test passes theme:'pearl' explicitly, so nothing covered what
// an un-argumented applyTheme() actually renders — which is what every real
// surface gets. These lock the three things that can regress silently.
import { describe, it, expect } from 'vitest';
import { TOKEN, FONT, DEFAULT_THEME, applyTheme, tokens } from '../../src/tokens.js';

describe('the default ground', () => {
  it('is the mirrored warm cream, not the cool grey', () => {
    expect(DEFAULT_THEME).toBe('parallel');
    expect(tokens(DEFAULT_THEME).bg).toBe('#f5f4ee');
  });

  // Lifted verbatim off the live Ethiks360 app so the two products sit on one
  // skeleton. If these drift, the shared-skeleton claim stops being true.
  it('carries his neutrals unchanged', () => {
    const tk = TOKEN.parallel;
    expect(tk.bg).toBe('#f5f4ee');        // --color-home-bg
    expect(tk.bgTint).toBe('#efece3');    // --color-home-light-bg
    expect(tk.ink).toBe('#1c1c1e');       // --color-home-dark
    expect(tk.inkMid).toBe('#5a5a5e');    // --color-home-muted
    expect(tk.hairline).toBe('#eae7dd');  // --color-home-border
  });

  // Same skeleton, our skin. A screenshot must still say which build it is.
  it('never adopts his accent hues', () => {
    const hues = Object.values(TOKEN.parallel).map(v => String(v).toLowerCase());
    expect(hues).not.toContain('#e05326');  // his orange
    expect(hues).not.toContain('#58d5d3');  // his primary
  });

  // Deferred deliberately: FONT.ui is unverified and ~124 call sites hardcode
  // Plex Sans, so a face swap here would split the screen between two faces.
  it('does not swap the UI face with the theme', () => {
    const el = { style: { setProperty(k, v) { (this._ ||= {})[k] = v; } }, setAttribute() {} };
    applyTheme('parallel', el);
    expect(el.style._['--p360-sans']).toBe(FONT.sans);
    expect(el.style._['--p360-sans']).not.toContain('Inter');
  });
});
