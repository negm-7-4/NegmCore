// src/motion/shapes.ts — the SVG path pairs MorphSVG moves between (§9.3: brand mark, menu
// and close icon, ambient icon). One place, so the preloader and the chrome morph the same star.

/** The brand mark's star (24 x 24 viewBox, centred on 12,12). */
export const MARK_STAR = 'M12 7.5L12.9 11.1L16.5 12L12.9 12.9L12 16.5L11.1 12.9L7.5 12L11.1 11.1Z';
/** The star rounded into the Core. */
export const MARK_CIRCLE = 'M12 9.6C13.3 9.6 14.4 10.7 14.4 12C14.4 13.3 13.3 14.4 12 14.4C10.7 14.4 9.6 13.3 9.6 12C9.6 10.7 10.7 9.6 12 9.6Z';

/** Menu (two bars) and close (a cross), 24 x 24. */
export const MENU_BARS = 'M4 8h16v2H4zM4 14h16v2H4z';
export const MENU_CLOSE = 'M5.6 4.2L12 10.6L18.4 4.2L19.8 5.6L13.4 12L19.8 18.4L18.4 19.8L12 13.4L5.6 19.8L4.2 18.4L10.6 12L4.2 5.6Z';

/** Ambient toggle: pause (two bars) and play (a triangle), 24 x 24. */
export const AMBIENT_PAUSE = 'M8 6h3v12H8zM13 6h3v12h-3z';
export const AMBIENT_PLAY = 'M8 5L19 12L8 19Z';
