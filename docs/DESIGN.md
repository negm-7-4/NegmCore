# Negm Core — design system (brief 1.2, rebuilt with ui-ux-pro-max)

Token source of truth: `src/styles/tokens.css`. This file records the decisions and why.

## How it was derived (ui-ux-pro-max, public copy run from the scratchpad)
- `--design-system "fitness gym immersive 3D dark landing" --variance 8 --motion 10 --density 3`
  → pattern Feature-Rich Showcase, style Brutalism, palette orange/green, type Barlow Condensed + Barlow.
- `--domain style "dark cinematic immersive 3D"` → Parallax Storytelling, 3D & Hyperrealism, Dark OLED.
- `--domain landing "immersive scroll storytelling"` → Scroll-Triggered Storytelling: chapters,
  progress indicator, readable without effects, reduced motion renders final states.
- `--domain gsap` (scrub camera, split text, transitions, magnetic) and `--stack threejs|html-tailwind`.
- Kept: type pairing, 0 px corners, bold condensed caps, spacious scale, z-index scale, exit faster
  than enter, chars only on short headlines, scrubbed camera, dispose paths, semantic tokens.
- Rejected: orange palette (client keeps §6.1), "instant transitions" (client wants everything to
  move), social proof and logos (BRAND-02), hash deep links (SHIP-03), pinning (ARCH-06).

## Tokens
- Worlds `void` #000 / `flare` #FFF; iron ramp for steel and secondary UI; `signal` = action,
  live state, focus; `ink` for green on white; `core` GL only. Green ≤ 8 % of any frame.
- Unblended UI reads `--world` (0/1): `--ui-fg`, `--ui-fg-2`, `--ui-line`, `--ui-accent`.
- Blended type layer: white ink + difference. Hierarchy by size, weight and case — never grey ink.
- Radius 0 everywhere. Hairline rules (1 px) are the only ornament: Brutalist structure, not decoration.
- Space (spacious): 8, 16, 24, 32, 48, 64, 96 px. z-index: canvas 0, panels 10, chrome 20,
  overlay 40, preloader 100, skip link 900, cursor 1000.

## Type roles (Barlow Condensed for mass, Barlow for reading)
| Role | Family / weight / case | Size token |
|---|---|---|
| h1 display | Barlow Condensed 800, caps | `--text-display` lh 1.15 |
| h2 title, marquee, wordmark | Barlow Condensed 800, caps | `--text-title` / context |
| lede, card name | Barlow 400 / Barlow Condensed 800 caps | `--text-lede` |
| body | Barlow 400, 52ch max | `--text-body` lh 1.7 |
| label, nav, field, button | Barlow 600 | `--text-label` lh 1.4 |
| numerals + units | Barlow Condensed 700, tabular, `dir=ltr`, NBSP | `--text-numeral` / label |

## Motion rules (from the skill, mapped to §9.2 tokens)
- Arrive: `core.out`, `slow` (lines) / `base` (UI). Leave: `core.in`, `quick` (≈ 60 % of enter).
- Headlines (≤ 3 words) split to chars inside line masks; paragraphs split to lines only.
- Camera and world move only by scrub; one-shots only for impacts and state changes.
- Reduced motion: no scrub travel, 0.4 s cuts between key poses, 0.2 s opacity text.

## Chapters (LTR: copy at inline-start = left, 3D subject at inline-end = right)
```
HERO black                                   MASS black
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│◎ NEGM CORE            [BOOK A TRIAL][⏸]│     │ MASS            ╔═ sleeve + plates ═╗ ▮│
│                   NEGM CORE / lede /20KG│     │ body             ║ knurl, lettering ║ ▮│
│════════ bar rolls, crosses the h1 ═════│     │ WEIGHT  20 KG    ║ 3 pairs slide on ║ ▮│
│ NEGM CORE (h1, lower left)        cue  │     │ … 4 rows  LOAD NOW 140 KG ╚══════════╝ ▮│
└──────────────────────────────────────┘     └──────────────────────────────────────┘
IGNITE black→white: rings, Core in the bore, dolly through, white flash. Text gone by 35 %.
PROGRAMS white: card left, object passes right, intro only before station 1, drag hint.
ORBIT white→black: top-down rings right, labels pinned, copy left; collapse in last third.
GRAVITY black: copy top-left, bar drops, plan plates in a row, cards anchored under them.
JOIN black: bar across the top half, h2 lower left, form lower right. FOOTER: marquee, note.
mobile (all): 3D subject in the top 55 %, copy and panels in the bottom 45 %, nav = overlay.
```

## Static mode (no WebGL / no JS)
Sections in flow with their world as CSS background (hero, mass black; ignite Ignite; programs
white; orbit Collapse; gravity, join black). A line-art SVG bar stands in for the scene in hero,
mass and join. Panels sit in flow under the copy. Copy is complete without JavaScript.

## Critique: what read generic, and how it was made specific
1. "Dark page + neon CTA" → green is rationed and means one thing: action or live state.
2. "Big hero headline over 3D" → the bar passes behind the caps and difference blending
   inverts the letters where steel crosses, so type and object read as one forged piece.
3. "Scroll-jacked slides" → no pinning: one camera path; the only cut hides in the white flash.
4. "Feature cards" → each card belongs to a real tool the camera flies past, arriving from depth.
5. "Pricing table" → plans are plates on the floor; choosing one rolls it onto your bar.
6. "Progress dots" → the chapter rail is a weight stack with a selector pin.
7. "Loading spinner" → the preloader loads a bar plate by plate, then match-cuts to 3D.
8. "Template sports font" → Barlow Condensed is used only in caps for mass and numerals;
   reading text stays in Barlow at 1.7 line height, 52ch.

## Removed in the remove-one pass (POLISH-01)
Filled in P7.
