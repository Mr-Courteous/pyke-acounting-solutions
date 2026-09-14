/**
 * Brand theme — the one file to edit to reskin the app.
 *
 * These values are pushed onto `:root` as CSS custom properties by
 * applyTheme() (called once in main.jsx before the app renders), so
 * every stylesheet under src/styles/ and every component's CSS file
 * keeps using var(--ledger-green) etc. — nothing else needs to change
 * when you edit a color here. Any JS that needs a raw value directly
 * (a chart library that won't take a CSS var, an inline style) should
 * import `theme` and use it directly rather than hardcoding a hex.
 */
export const theme = {
  colors: {
    // Base
    ink: '#17211c', // primary text
    inkSoft: '#4a5650', // secondary text, labels
    paper: '#e9ece4', // page background
    surface: '#fbfaf5', // panels, inputs, cards sitting on the paper
    line: '#c9c2ac', // hairline rules (table dividers, borders)
    lineSoft: '#dcd8c8', // quieter rule, e.g. inside a table

    // Brand / status — one accent each, reused everywhere rather than
    // introducing a new color per feature
    ledgerGreen: '#1f4d3d', // primary actions, active nav, positive status
    ledgerGreenHover: '#163a2e',
    brass: '#a9812c', // pending/secondary status
    signalRed: '#8b3a3a', // errors, overdue, destructive actions

    // Tints — the accent colors above at low opacity, for chip/badge backgrounds
    ledgerGreenTint: '#e2ebe6',
    brassTint: '#f3ead4',
    signalRedTint: '#f2e2e0',
  },
  fonts: {
    display: "'Newsreader', Georgia, serif", // page and section titles
    body: "'IBM Plex Sans', -apple-system, sans-serif", // everything else
    mono: "'IBM Plex Mono', ui-monospace, monospace", // amounts, codes, IRNs — real tabular data
  },
};

function toCssVarName(key) {
  // ledgerGreen -> --ledger-green
  return `--${key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
}

/** Applies `theme` to :root as CSS custom properties. Call once at startup — see main.jsx. */
export function applyTheme() {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => root.style.setProperty(toCssVarName(key), value));
  root.style.setProperty('--font-display', theme.fonts.display);
  root.style.setProperty('--font-body', theme.fonts.body);
  root.style.setProperty('--font-mono', theme.fonts.mono);
}
