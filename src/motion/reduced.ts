// src/motion/reduced.ts — the two timings ACCESS-01 fixes for prefers-reduced-motion. They sit
// beside the §9.2 tokens rather than inside them, so tokens.ts stays exactly that table.

/** Camera cuts between key poses cross-fade over this long (seconds). */
export const REDUCED_CUT = 0.4;
/** Text reveals and exits become opacity changes this long (seconds). */
export const REDUCED_TEXT = 0.2;
