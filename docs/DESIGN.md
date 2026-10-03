# النجم كور — design system

Source of truth for tokens: `src/styles/tokens.css` (BRIEF §6). This file records decisions.

## Tokens
- Worlds: `void` #000 / `flare` #FFF only. Iron ramp 950–100 leans green (h150, c0.006).
- Green: `signal` on black (primary action, current state, live numerals, focus, Core);
  `ink` for green text/lines on white; `ink-mid` for non-text marks on white; `core` GL only.
- Gradients: Ignite (black→white), Collapse (white→black), OKLab, dithered by grain.
- Unblended UI reads `--world` (0/1): `--ui-fg`, `--ui-fg-2`, `--ui-line`, `--ui-accent`.
- Blended type layer (`.stage`): white ink + `mix-blend-mode: difference`, full opacity only.
  Hierarchy comes from size and weight, never from grey ink (keeps every pair 21:1).

## Type roles
| Role | Family/weight | Token |
|---|---|---|
| h1 | Alexandria 900 | `--text-display` lh 1.15 |
| h2, marquee | Alexandria 900 / Big Shoulders 800 | `--text-title` lh 1.15 |
| lede, card name | Alexandria 400 / 900 | `--text-lede` lh 1.6 |
| body | Alexandria 400 | `--text-body` lh 1.7 |
| label, nav, field | Alexandria 600 | `--text-label` lh 1.4 |
| numerals + units | Big Shoulders 900, tabular, `dir=ltr`, NBSP | `--text-numeral` or `--text-label` |

## Chrome (all chapters)
```
desktop 1440                                      mobile 390
┌───────────────────────────────────────────┐    ┌──────────────────┐
│[احجز حصة تجريبية][⏸]          النجم كور ✦│    │[≡][⏸]  النجم كور ✦│
│◎ rail: 7 plates, pin                      │    │                  │
│◎ (inline-end edge, centred)               │    │ (rail -> overlay)│
└───────────────────────────────────────────┘    └──────────────────┘
```

## Chapters (3D subject | text-safe zone). RTL: inline-start = right.
```
HERO  black                                  MASS  black
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ 20 KG                                 │     │  ╔═ sleeve + plates ═╗   الكتلة        │
│ EL NEGM CORE / lede                   │     │  ║  knurl, lettering ║   body          │
│════════════ bar (rolls) ═════════════│     │  ║  3 pairs slide on ║   الوزن  20 KG   │
│              ████ النجم كور ████      │     │  ╚═══════════════════╝   ... 4 rows    │
│ مرِّر للنزول          (bar behind h1)  │     │                    الحِمل الآن 140 KG  │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
mobile: bar in top 55 %, h1 + lede below.    mobile: sleeve top 55 %, copy + counter below.

IGNITE black→white (Bore Shot)               PROGRAMS white
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│          ◎ rings, plate faces cam     │     │ object passes ←            ┌card────┐│
│          ● Core behind the bore       │     │ (inline-end side)          │القوة    ││
│ (dolly through bore, sweep ↑ white)   │     │ drag hint under object     │sentence ││
│                     الاشتعال / body   │     │                            └────────┘│
└──────────────────────────────────────┘     └──────────────────────────────────────┘
text leaves before 35 %; nothing over sweep.  intro line only before station 1.

ORBIT white→black (top-down)                 GRAVITY black
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│   ○ ○ rings + plates, labels pinned   │     │  bar falls 1.2 m, bounces   الجاذبية │
│  ○  ●  ○   حِمل / تعافٍ / زيادة         │     │                              body    │
│   ○ ○                     المدار/body │     │  ◎10    ◎15    ◎20   plan plates     │
│ collapse sweep in last third          │     │ [خفيف] [ثابت] [كامل] cards anchored    │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
mobile: system top 55 %, copy below.         mobile: plates top, cards stack vertically.

JOIN black                                   FOOTER black, natural height
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│══════ bar + chosen plates + collars ══│     │ EL NEGM CORE ✦ النجم كور ✦ (marquee)  │
│                                       │     │ concept note · credit   [عُد إلى السطح] │
│ احمل نصيبك من النجم.     [form panel]  │     └──────────────────────────────────────┘
└──────────────────────────────────────┘
```

## Static mode (no WebGL / no JS)
Sections in flow with their world as CSS background (hero, mass black; ignite Ignite;
programs white; orbit Collapse; gravity, join black). A line-art SVG bar (`<use>` of one
symbol) stands in for the scene in hero, mass and join. Panels sit in flow under the copy.

## Critique: what read generic, and how it was made specific
1. "Dark page + neon green CTA" → green is rationed (≤ 8 %) and means one thing: live state
   or the action. The rest is steel greys that lean toward the same green hue.
2. "Big hero headline over 3D" → the h1 is cut by the real bar: difference blending
   inverts the letters where steel passes, so type and object read as one forged piece.
3. "Scroll-jacked section slides" → no pinning, no slides: one camera, one continuous
   path; the only cut is hidden inside the white flash of the Bore Shot.
4. "Feature cards" → each programme card belongs to a physical tool the camera flies past,
   and arrives from depth with the same vocabulary as the objects.
5. "Pricing table" → plans are plates standing on the floor; choosing one rolls the plate
   onto the bar you carry into the form.
6. "Progress dots" → the chapter rail is a weight stack with a pin, like a machine.
7. "Loading spinner" → the preloader loads a bar plate by plate, then match-cuts to 3D.

## Removed in the remove-one pass (POLISH-01)
Filled in P7.
