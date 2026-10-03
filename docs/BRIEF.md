# NEGM CORE — Master Build Brief

Version 1.0 · 2026-10-03 · Client and art director: Mohammed Negm · Executor: Claude

To run it: attach this file and write نفّذ الـ brief. To change a default, edit §2 first.

## 1. Mission

Build النجم كور (EL NEGM CORE): a one-page website for a concept gym in which the scroll wheel is a camera dolly. The whole page is one 3D scene, every state change is animated, and GSAP conducts all of it.

**Who it is for.** Mohammed is a designer-developer who will show this page to prospective clients as proof of craft. There is no real gym and no real location. The page is judged by eye, on a laptop with a discrete GPU and on a mid-range Android phone, by people deciding whether to hire him.

**What success looks like.** A visitor scrolls once and remembers one image: the camera flying through the bore of a weight plate while the black world ignites to white. Smooth frames and precise Arabic typography matter more than the number of effects.

**What "unlike anything else" means here.** It cannot be proven, so this brief replaces it with things that can be checked: one idea that belongs only to this name (§5), one signature shot (§8, chapter 3), Arabic-first kinetic typography done correctly (§9.4), and gates that reject generic output (§4).

## 2. Decisions already made

These are requirements, not suggestions. Each has one stated alternative; switch only if the line is edited before the run.

| Key | Decision | Trade-off and the alternative |
|---|---|---|
| LANGUAGE | `ar`: Arabic-first, RTL, simplified Modern Standard Arabic. Latin script only for the wordmark, numerals and units. | `en`: use the English column of §7, LTR, mirror every inline direction, and character-level splitting becomes allowed. |
| BRAND | Arabic النجم كور, Latin EL NEGM CORE. | Other transliterations (ALNAJM CORE, NEGM CORE): change the string here only. |
| CREDIT | Footer credit تصميم وتطوير: محمد نجم. | Edit the string. |
| FRAMEWORK | Vanilla TypeScript + Vite. GSAP mutates Three.js objects directly, one render loop, smallest bundle. | React + React Three Fiber: only worth it if this page will be merged into a React app; it adds a reconciler and a second scheduling model. |
| ASSETS | Procedural geometry written in code. No model, texture or HDRI files. Everything here is a surface of revolution, so lathe geometry is exact, tiny and needs no network. | Blender to GLB: more surface detail, but needs the user's computer linked and base64-inlined binaries. |
| SCROLL | Lenis. The original request said "LaTeX"; LaTeX is a document typesetting system with no role in a web animation stack, so it is read as Lenis. | If something else was meant, name it here. |
| SOUND | Off. | On: Web Audio synthesis only, muted by default, one toggle. |
| DELIVERY | One self-contained HTML file, published as an Artifact, plus a source zip. | Multi-file static site: only if the single file exceeds the size budget. |

## 3. Operating rules

**3.1 Autonomy.** You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task. Do not ask permission for work this brief already requests, and do not end a turn on a plan, a question or a promise: do the work. Stop only for (a) an action that deletes or overwrites anything outside the project folder, (b) sharing anything beyond a private artifact, or (c) a contradiction inside this brief that changes what gets built. For (c): finish everything that does not depend on it, state the assumption you took, continue.

**3.2 Scope.** This brief is the scope and the scope is the deliverable. Do not narrow it and do not widen it: no extra pages, backend, CMS, analytics, cookie banner, sound, or library that §11.1 does not list. If you notice something worth doing that the brief does not ask for, list it at the end of the final report instead of doing it. If one requirement turns out to be blocked, complete every other requirement in full and record the blocked one as a deviation with what you tried.

**3.3 Reporting style (caveman rules, embedded).** Reports to the user are in Egyptian Arabic with technical terms in English. Answer first. No greeting, no recap of the request, no closing offer. Fragments are fine; negations, numbers, units, paths and commands are never dropped or altered. One idea per sentence. Between tool calls, write nothing unless it is a warning. One line when a phase starts, one gate report when it ends (§16), one final report. Full sentences for warnings and for anything irreversible. This style applies to chat only: code, comments, README and docs are written in normal clear English.

**3.4 Evidence.** Never write "done", "works" or "verified" without evidence produced in this session: a screenshot you opened, a command's output, or file:line. What cannot be checked in this environment is recorded as `user-check` with the exact steps for the user; it is never reported as verified.

**3.5 Skills and sources.** Before designing, load the `frontend-design` skill. Before publishing an Artifact, load `artifact-design`. If any of these are listed as available, load them when their topic comes up: the official GSAP skills (`gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-performance`), `web-design-guidelines`, `ui-ux-pro-max`, `caveman`. If they are not installed, do not try to install them: their load-bearing rules are already embedded in §3.3, §9, §11 and §13. When sources disagree, the order is: this brief's explicit specifications, then official library documentation for API correctness, then design skills' defaults.

One conflict is already resolved: the design skills flag "black with a single bright green accent" and "motion on everything" as generic defaults. Here both are the client's explicit direction, so they stay. The skills' job is to make the execution specific to this subject, not to remove them.

How the six things the client named map onto this brief: UI/UX design is §6, §9.6 and §13; Fable method is this document's structure (goal with its reason, autonomy, scope as deliverable, evidence before "done"), following Anthropic's prompting guidance for Claude Fable 5.1, and needs nothing loaded; caveman is §3.3; website design / web design is `frontend-design` plus §5–§8; front-end is §9–§12.

**3.6 Working habits.** Issue independent tool calls together in one response. Edit files surgically instead of rewriting them. Do not draft whole files in your reasoning. State lives on disk (`docs/BRIEF.md`, `docs/LEDGER.json`, git history): if your context is compacted, re-read the brief, run `node scripts/ledger.mjs report` and `git log --oneline` before continuing.

## 4. Execution protocol

This section is how "every letter gets executed" becomes mechanical.

**4.1 The ledger.** Every checkable requirement in this brief carries a bracketed ID. The brief defines exactly 150 of them. `scripts/ledger.mjs` (Appendix A.5) extracts them from `docs/BRIEF.md` into `docs/LEDGER.json`. An ID has one status: `todo`, `built`, `verified`, `user-check` or `deviation`. `verified` requires evidence. `user-check` is accepted only on IDs marked †. A phase gate does not pass while any ID of that phase or an earlier phase is failing. Create `docs/BRIEF.md` by copying the attached file (`cp`), never by retyping it.

```phase-map
P0 ARCH QA
P1 BRAND COLOR TYPE COPY LAYOUT
P2 GL
P3 MOTION SCENE
P4 UI
P5 FX
P6 ACCESS RESP
P7 PERF POLISH
P8 SHIP
```

**4.2 Phases.**

| Phase | Build | The gate proves |
|---|---|---|
| P0 Foundation | Project from Appendix A, `docs/BRIEF.md` (this file, byte-exact), ledger, loop, scroll glue, store, QA hook, one placeholder chapter with a cube that moves with scroll. | The pipeline: typecheck, single-file build, headless screenshots, ledger count = 150. |
| P1 Design system and content | `docs/DESIGN.md`, tokens, fonts, layout, all copy in semantic HTML, the static page. | The page reads completely with no JavaScript and no WebGL, in both viewports. |
| P2 3D world | Renderer, environments, materials, models, post chain, camera rig, and a temporary showroom chapter that presents each model on black and on white. | Each model alone on black and on white, close and far. |
| P3 Motion system and scroll direction | Motion tokens, effects and text reveals, then the chapters in order: timelines, camera shots, object choreography, DOM beats. | Every chapter at 10/50/90 % matches §8. |
| P4 Interaction layer | Every component state in §9.6. | No un-animated state change remains and every plugin does its job. |
| P5 Effects | World sweeps, bore-shot flash, particles, impacts, bloom tuning. | The signature shot and both gradients. |
| P6 Adaptive and accessible | Tiers, adaptive quality, mobile blocking, reduced motion, static mode, keyboard. | Mobile frames, reduced-motion frames, static-mode frames. |
| P7 Performance and polish | Budgets, idle behaviour, the remove-one pass, proofreading. | Budgets met at every QA stop. |
| P8 Ship | Final audit, artifact, zip, README, final report. | `check --final` exits 0. |

**4.3 The gate procedure, identical at every phase.**

1. Run `npm run gate`. It must exit 0.
2. Re-read from disk, not from memory, every section of `docs/BRIEF.md` that owns this phase's areas.
3. Open the new screenshots in both viewports and compare each to the requirement or storyboard text. Fix and rerun until they match.
4. Regression: open one desktop screenshot for every chapter finished in earlier phases. Anything that broke is fixed now; its IDs go back to `todo` until re-verified.
5. Record each ID of this phase with `node scripts/ledger.mjs set <ID> verified "<evidence>"`. Then `node scripts/ledger.mjs check --gate <n>` must exit 0.
6. `git commit` with the phase name, then post the gate report (§16.1).

Do not start phase n+1 while gate n fails. Do not mark an ID from a screenshot you did not open. Inside P3, build the chapters in order and run `npm run gate` after each one; a chapter's IDs are recorded before the next chapter starts.

**4.4 Final audit (P8).** Start one independent subagent that has not seen the build conversation. Give it `docs/BRIEF.md`, `docs/LEDGER.json`, `src/`, `dist/index.html` and `qa/`, with this instruction: "Audit this website against the brief. For every requirement ID decide PASS or FAIL from primary evidence: open the code and the screenshots yourself and do not trust the ledger's evidence text. Return only the FAIL items, each with one line of reason and a file:line or screenshot path." Fix every FAIL or record it as a deviation. If no subagent tool exists, do the same audit yourself from disk in a fresh pass.

**4.5 Checkpoints.** The workspace may be reclaimed after inactivity. After the gates of P4 and P8, send the user a source zip (no `node_modules`). If a folder on the user's computer is connected, mirror the project there after every gate instead.

## 5. Concept

**The idea.** النجم كور means "the star core". Iron, the metal of every bar and plate, is forged in the cores of massive stars. The page is one continuous descent: from the cold dark outside, along a barbell, through the bore of a plate into the white-hot core, and back out to cold iron that the visitor now carries. "كور" is also the body's core, and the place every lift starts. One name, three readings: the star's core, the body's core, the gym.

**The one bold thing.** The Bore Shot (chapter 3). Everything else stays quiet so that it lands.

**Tone.** Precise, physical, calm. No hype adjectives and no exclamation marks.

- [BRAND-01] The page tells the §5 story in the §8 chapter order with no added, removed or reordered chapter.
- [BRAND-02] Honesty: the footer shows the concept note from §7; the page has no address, phone, map, price, testimonial, member count, named coach, partner logo or award.
- [BRAND-03] Every number on the page is an IWF equipment fact from §7.3, a value the visitor drives (load counter, chosen plan), or a plan detail shown under the باقات تصوّرية label; there are no statistics and no claims.
- [BRAND-04] Brand mark: an inline SVG of a plate seen end-on (two concentric rings) whose bore is a four-point star, drawn in `currentColor` so it inverts with the type.
- [BRAND-05] `docs/DESIGN.md` exists before any P1 code: tokens, type roles, an ASCII wireframe per chapter for desktop and mobile, and a critique naming each part that read generic and how it was made specific; at most 120 lines.

## 6. Visual identity

The client's palette, verbatim: black grading to white, white grading to black, a light green that sits well on black, and grey for the bar and the weights.

### 6.1 Colour tokens

Contrast ratios below were computed (WCAG 2.x) when this brief was written.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `void` | `#000000` | The black world. Text on white. | 21:1 with flare |
| `flare` | `#FFFFFF` | The white world. Text on black. | 21:1 with void |
| `iron-950` | `#0B0E0C` | Raised surface on black. Never a page background. | |
| `iron-900` | `#191B19` | Plate material. | |
| `iron-800` | `#2C2F2C` | Plate material in the white world. Borders on black. | |
| `iron-700` | `#454946` | Secondary text on white. | 9.15:1 on white |
| `iron-600` | `#676A67` | Tertiary text on white. | 5.48:1 on white |
| `iron-500` | `#8A8D8A` | Non-text marks. | 6.26:1 on black |
| `iron-400` | `#AEB2AF` | Steel. Secondary text on black. | 9.79:1 on black |
| `iron-300` | `#CED2CF` | Chrome. Borders on white. | |
| `iron-200` | `#E5E9E6` | Raised lettering on plates. | |
| `iron-100` | `#F2F6F3` | Raised surface on white. | |
| `signal` | `#9BF89F` | The light green. Accent on black; fill behind black text. | 16.32:1 on black |
| `core` | `#34DA56` | Emissive and glow in WebGL only. | |
| `ink` | `#03642B` | Green text and lines on white. | 7.34:1 on white |
| `ink-mid` | `#1CA045` | Green non-text marks on white. | 3.41:1 on white |

The greys are not neutral: they lean slightly toward the green (OKLCH chroma 0.006, hue 150), so steel, type and accent read as one family.

- [COLOR-01] Tokens are exactly this table, defined once (Tailwind `@theme` plus CSS variables); no hex literal appears outside the token file and the GL material constants file.
- [COLOR-02] The two worlds are true `#000000` and `#FFFFFF`; no tinted near-black or off-white stands in for them.
- [COLOR-03] Two named gradients exist: Ignite (black to white) and Collapse (white to black), interpolated in OKLab and dithered; in CSS as `linear-gradient(in oklab, ...)` under a fine noise layer (the WebGL version is GL-14).
- [COLOR-04] Green budget: `signal` covers at most 8 % of any viewport at rest and marks only the primary action, the current state, live numerals, the focus ring and the Core; it is never body text.
- [COLOR-05] In the white world, green text and lines use `ink`; `signal` appears on white only as a fill behind black text.
- [COLOR-06] Greys come only from the iron ramp, in materials, secondary text and borders.
- [COLOR-07] All monochrome type sits in a layer with `mix-blend-mode: difference` and white ink, so it inverts per pixel against whatever is behind it: the CSS world in static mode, the canvas and its geometry once WebGL is on.
- [COLOR-08] Text contrast is at least 4.5:1 (3:1 for text of 24 px bold and larger), measured at rest in both worlds, using only the pairs in the table.
- [COLOR-09] One CSS variable `--world` (0 black, 1 white) drives every world-aware token in unblended UI; whatever changes the world sets it (the section in static mode, the backdrop tween in WebGL mode).

### 6.2 Typography

Two families, chosen by rendering "النجم كور" in nine Arabic display candidates and comparing the results. **Alexandria** (variable, 100–900) carries Arabic and running Latin: at weight 900 its letters read as dense forged blocks, which is the idea of mass. **Big Shoulders** (variable) carries the Latin wordmark, numerals and units: condensed industrial figures that look stamped into a plate.

| Role | Family, weight | Size | Line height |
|---|---|---|---|
| Display (h1) | Alexandria 900 | `clamp(3.5rem, 14vw, 13rem)` | 1.15 |
| Chapter title (h2) | Alexandria 900 | `clamp(2.5rem, 9vw, 8rem)` | 1.15 |
| Lede | Alexandria 400 | `clamp(1.125rem, 1.6vw, 1.5rem)` | 1.6 |
| Body | Alexandria 400 | 1rem to 1.125rem | 1.7 |
| Label | Alexandria 600 | 0.875rem | 1.4 |
| Numerals, units | Big Shoulders 900 | `clamp(2rem, 6vw, 6rem)` and label sizes | 1.0 |
| Latin wordmark | Big Shoulders 800 | follows context | 1.0 |

- [TYPE-01] Exactly these two families, self-hosted from `@fontsource-variable/alexandria` and `@fontsource-variable/big-shoulders`; only three files are inlined (Alexandria arabic and latin, Big Shoulders latin, about 98 KB of woff2 together).
- [TYPE-02] Each family has a real fallback stack and `font-display: swap`, and anything that measures text (splits, docking rectangles) waits for `document.fonts.ready`.
- [TYPE-03] The scale is exactly the table above; no other font size appears.
- [TYPE-04] Arabic text has `letter-spacing: 0`, is never upper-cased, is never split into characters, and keeps the line heights above.
- [TYPE-05] Numerals are Latin digits in Big Shoulders with `tabular-nums`, wrapped in `dir="ltr"`, with a no-break space before the unit; Arabic-Indic digits never appear.
- [TYPE-06] `text-wrap: balance` is used on headings that are not split and never on elements SplitText touches; ledes are at most 34 characters wide.
- [TYPE-07] Brand names carry `translate="no"`.

### 6.3 Layout

- [LAYOUT-01] The document is `lang="ar" dir="rtl"`; CSS uses logical properties only, with physical left/right allowed solely for anchors projected from 3D.
- [LAYOUT-02] A 12-column grid with a side gutter of `clamp(16px, 5vw, 96px)`; each chapter has a text-safe zone on the side opposite its 3D subject (§8), and no text block leaves it.
- [LAYOUT-03] Fixed chrome is three pieces inside the safe-area insets: the wordmark at inline-start, the action and ambient toggle at inline-end, and the chapter rail on the inline-end edge.
- [LAYOUT-04] The chapter rail is a weight stack: seven plates and a `signal` selector pin on the current chapter; choosing a plate scrolls to that chapter through Lenis.
- [LAYOUT-05] Without JavaScript, or before enhancement, every section's copy is visible in normal flow; elements are hidden for reveals only under an `.is-enhanced` class set by script.
- [LAYOUT-06] The page works from 360 px to 2560 px wide with no horizontal scroll; stage heights use `svh` and the canvas uses `lvh`.
- [LAYOUT-07] Each chapter section holds two layers: a sticky `.stage` (blended, monochrome type only) and a `.panel` (unblended; everything green or interactive) that is `position: fixed` and shown only during its chapter when enhanced, and in normal flow otherwise.
- [LAYOUT-08] Semantic HTML: `header`, `nav`, `main`, one `section` per chapter with its heading, `footer`; exactly one `h1`; the canvas is `aria-hidden`.

## 7. Content

### 7.1 Rules

- [COPY-01] Visible copy is exactly the Arabic column of §7.2: nothing added, nothing reworded, no placeholder text.
- [COPY-02] An action keeps one name through its flow: the button احجز حصة تجريبية, the busy state جارٍ الحجز…, the result تم الحجز التجريبي.
- [COPY-03] Error messages state the problem and the fix, with no apology; they are the §7.2 strings.
- [COPY-04] Readouts and engravings use Latin units (KG, MM); sentences spell the unit out in Arabic (كيلوغرام).

### 7.2 Copy deck

| Where | Arabic (ships) | English (reference; ships if LANGUAGE = en) |
|---|---|---|
| Preloader label | جارٍ التحميل… | Loading… |
| Hero h1 | النجم كور | EL NEGM CORE |
| Hero Latin line | EL NEGM CORE | EL NEGM CORE |
| Hero lede | الحديد وُلِد في قلب نجم. وهنا، تحمله أنت. | Iron was born in the heart of a star. Here, you carry it. |
| Hero readout | 20 KG | 20 KG |
| Scroll cue | مرِّر للنزول إلى القلب | Scroll to descend into the core |
| Primary action | احجز حصة تجريبية | Book a trial session |
| Mass h2 | الكتلة | Mass |
| Mass body | عشرون كيلوغرامًا من الفولاذ قبل أن تضيف قرصًا واحدًا. كل قرص بعد ذلك قرار. | Twenty kilograms of steel before you add a single plate. Every plate after that is a decision. |
| Mass spec rows | الوزن 20 KG · الطول 2200 MM · قطر القبضة 28 MM · قطر القرص 450 MM (four label and value rows) | Weight · Length · Grip diameter · Plate diameter |
| Mass counter label | الحِمل الآن | Load now |
| Ignition h2 | الاشتعال | Ignition |
| Ignition body | في قلب النجم يتحوّل الضغط إلى ضوء. وتحت البار يتحوّل إلى قوة. | In a star's core, pressure becomes light. Under the bar, it becomes strength. |
| Programs h2 | البرامج | Programs |
| Programs intro | ثلاثة مسارات. اختر واحدًا، أو امشِ فيها كلها. | Three tracks. Pick one, or walk all of them. |
| Program 1 | القوة — سكوات، ديدليفت، بنش. ثلاث رفعات، وتقدّم يُقاس بالكيلوغرام. | Strength — Squat, deadlift, bench. Three lifts, progress measured in kilograms. |
| Program 2 | التحمّل — كيتل بل ودورات قصيرة. نبض أعلى ونَفَس أطول. | Conditioning — Kettlebell and short circuits. Higher pulse, longer breath. |
| Program 3 | الكور — كل رفعة تبدأ من المركز. نبنيه أولًا. | Core — Every lift starts from the centre. We build it first. |
| Drag hint | اسحب لتدوير القطعة | Drag to rotate the piece |
| Orbit h2 | المدار | Orbit |
| Orbit body | التقدّم يدور في مدار ثابت: حِمل، ثم تعافٍ، ثم حِمل أثقل. | Progress moves in a steady orbit: load, then recovery, then a heavier load. |
| Orbit labels | حِمل · تعافٍ · زيادة (three labels) | Load · Recovery · Progression |
| Gravity h2 | الجاذبية | Gravity |
| Gravity body | الجاذبية واحدة للجميع. اختر كم ستقاوم منها. | Gravity is the same for everyone. Choose how much of it you resist. |
| Plans label | باقات تصوّرية | Concept plans |
| Plan 10 | خفيف — 8 حصص في الشهر | Light — 8 sessions a month |
| Plan 15 | ثابت — 12 حصة في الشهر | Steady — 12 sessions a month |
| Plan 20 | كامل — دخول مفتوح وبرنامج شخصي | Full — open access and a personal programme |
| Plan action / chosen | اختر هذه الباقة / تم اختيار الباقة | Choose this plan / Plan chosen |
| Join h2 | احمل نصيبك من النجم. | Carry your share of the star. |
| Field: name | الاسم (placeholder: مثال: أحمد علي…) | Name |
| Field: phone | رقم الهاتف (placeholder: مثال: 01012345678…) | Phone number |
| Field: plan | الباقة | Plan |
| Submit / busy | احجز حصة تجريبية / جارٍ الحجز… | Book a trial session / Booking… |
| Success | تم الحجز التجريبي. هذا مشروع تصوّري، وبياناتك لم تُرسَل إلى أي مكان. | Trial booked. This is a concept project and your details were not sent anywhere. |
| Error: name | اكتب اسمك. | Enter your name. |
| Error: phone | اكتب رقم هاتف من 11 رقمًا، مثل 01012345678. | Enter an 11-digit phone number, like 01012345678. |
| Error: plan | اختر باقة. | Choose a plan. |
| Footer note | مشروع تصوّري. لا يوجد فرع فعلي لهذا الجيم. | Concept project. This gym has no physical branch. |
| Footer credit | تصميم وتطوير: محمد نجم | Design and build: Mohammed Negm |
| Back to top | عُد إلى السطح | Return to the surface |
| Ambient toggle | أوقف الحركة المحيطة / شغّل الحركة المحيطة | Pause ambient motion / Play ambient motion |
| Skip link | تخطَّ إلى المحتوى | Skip to content |
| Nav and rail | القلب · الكتلة · الاشتعال · البرامج · المدار · الجاذبية · انضم | Core · Mass · Ignition · Programs · Orbit · Gravity · Join |
| Menu button | القائمة / إغلاق | Menu / Close |

The middle dots, dashes and slashes in this table separate items for the brief; on the page each item is its own element.

### 7.3 Equipment facts (the only facts shown)

IWF men's bar: 20 kg, 2200 mm long, 28 mm grip diameter, 50 mm sleeve diameter, about 415 mm of loadable sleeve. Bumper plate diameter: 450 mm. The load counter starts at the bar's 20 and adds 40 per pair of 20 kg plates: 20, 60, 100, 140. The IWF plate colour code is deliberately not used; the palette stays monochrome plus green.

## 8. Experience: the storyboard

**World.** Units are metres. The journey runs along the world's −X axis so the camera never cuts; the only discontinuity is hidden inside the white flash. Coordinates below are starting points to tune by screenshot; the described framing is the requirement.

**Shared rules.**

- [SCENE-01] Scroll lengths are hero 150, mass 220, ignite 150, programs 270, orbit 180, gravity 220, join 130 `svh` (1320 in total) followed by a footer of natural height.
- [SCENE-02] Each chapter has a hold of at least 12 % of its length in which its composed frame rests and nothing but ambient motion moves.
- [SCENE-03] Scrub is 0.6 on fine pointers and `true` on touch; every scrubbed position track uses `ease: "none"`; impacts are one-shot tweens fired when a label is crossed, in both directions.
- [SCENE-04] No readable text overlaps a world sweep between 20 % and 80 % of the sweep; outgoing copy has left and incoming copy has not arrived.
- [SCENE-05] Camera continuity: adjacent chapters share their boundary pose (position, target, FOV, roll); the only teleport happens at peak white in chapter 3.
- [SCENE-06] On portrait viewports the 3D subject occupies the top 55 %, the text the bottom 45 %, with FOV 46 instead of 32.
- [SCENE-07] Warm-up: before the preloader exits, `renderer.compileAsync` has run and every chapter's key pose has been rendered once off-screen, so the first scroll compiles no shader.

**Chapter 0 — Preloader (not scrolled)**

- [SCENE-10] Black screen, the brand mark, the label and a counter in kilograms from 0 to 100 bound to five real milestones (fonts ready, geometry built, environments generated, shaders compiled with `compileAsync`, first frame); an SVG bar drawn with DrawSVG gains a plate at each milestone and the mark's star morphs to a circle as the last one lands; scrolling is locked until exit; total time after init completes is at most 2.5 s.

**Chapter 1 — القلب · hero (`hero`, black world)**

- [SCENE-11] Camera starts at (0, 0.28, 3.3) looking at the origin, FOV 32, and drifts to a slight three-quarter angle; an unloaded bar floats level and rolls slowly about its own axis; the h1 fills the lower inline-start area with the bar crossing behind its letters so the letters invert where the steel passes; lede, readout 20 KG and scroll cue sit in the text-safe zone; pointer parallax moves the camera by at most 0.04 rad.
- [SCENE-12] Leaving the hero, the h1 scales down and docks into the fixed wordmark position (rects measured on refresh), and the scroll cue leaves.

**Chapter 2 — الكتلة · mass (`mass`, black world)**

- [SCENE-13] The camera trucks to the inline-end sleeve and closes in until knurling and plate lettering are readable; three pairs of 20 kg plates slide onto both sleeves, one pair per third of the chapter, each landing firing a one-shot at its label (the landing effects are FX-04); a collar spins on and locks at the end.
- [SCENE-14] DOM beats: title and body reveal; the four spec rows reveal in order; the load counter reads 20, then 60, 100, 140 exactly as each pair lands, and counts back down on reverse scroll.

**Chapter 3 — الاشتعال · ignite (`ignite`, black to white): the Bore Shot**

- [SCENE-15] The camera swings onto the bar's axis beyond the sleeve end so the plates read as concentric rings; the outermost plate slides off the sleeve toward the camera and stops, facing it; the Core appears behind its bore as a point of light.
- [SCENE-16] The camera dollies through the 50 mm bore while FOV opens from 32 to about 58; as it crosses the plate's plane the Ignite sweep takes the world from black to white; at peak white the bar is hidden and the camera continues into the white world without a visible cut.
- [SCENE-17] Timing inside the chapter: 0–35 % align and release the plate, 35–75 % the dolly and the sweep, 75–100 % settle; title and body are gone before 35 %.

**Chapter 4 — البرامج · programs (`programs`, white world)**

- [SCENE-18] Three stations along the camera's path, one third of the chapter each: a barbell (القوة), a kettlebell (التحمّل), a dumbbell (الكور); the camera flies forward and each object passes on the inline-end side, turning into its hero pose and holding for 30 % of its third; objects are dark graphite and steel on white with contact shadows.
- [SCENE-19] Each station's card (name, sentence, tool name) arrives from depth with a 3D tilt under perspective, holds, and leaves toward the camera; the intro line shows only before the first station.

**Chapter 5 — المدار · orbit (`orbit`, white to black)**

- [SCENE-20] The camera cranes to a top-down view; six plates orbit the Core on three concentric rings (one, two and three plates) at different speeds; SVG rings draw themselves over the orbits and the three labels stay pinned to three plates by projecting their 3D positions to the screen every frame.
- [SCENE-21] In the last third the Collapse sweep takes the world from white to black, the black returning from the bottom so that mid-sweep the frame reads white grading to black from top to bottom, while the Core stays lit in the centre.

**Chapter 6 — الجاذبية · gravity (`gravity`, black world)**

- [SCENE-22] The camera drops to floor level; a loaded bar falls 1.2 m on a gravity curve over the first 30 % of the chapter; crossing the impact label fires a one-shot in which the bar bounces twice and settles (shake, chalk and the pool of light are FX-04).
- [SCENE-23] Three plan plates (10, 15, 20) stand in a row facing the camera with their plan cards anchored to them; hovering or focusing a plan tips its plate forward and lights its ring; choosing one rolls that plate onto the bar's sleeve as a one-shot and dims the other two; the choice is stored.

**Chapter 7 — انضم · join (`join`, black world)**

- [SCENE-24] The camera pulls back to the hero framing; the bar now carries the chosen plan's plates and collars and rolls slowly; the closing line reveals; the form sits in the text-safe zone with the chosen plan preselected.
- [SCENE-25] A valid submit shows the busy state, then the success message while the collars spin and lock and the Core pulses once; no network request is made.
- [SCENE-26] Footer: a wordmark marquee, the concept note, the credit and a back-to-top control that scrolls to 0 through Lenis.

## 9. Motion system

### 9.1 Principles

The client's rule is that nothing changes without being animated. It is audited at the P4 gate as UI-12; the rules below are what make it hold.

- [MOTION-01] GSAP is the only animation engine: no CSS `@keyframes`, no CSS `transition` (including Tailwind `transition-*` utilities) except on the focus ring, and no other animation library.
- [MOTION-02] One vocabulary: things arrive along the depth axis and leave along the inline axis; heavy things accelerate when they fall and settle with a small overshoot; only physical drops bounce.
- [MOTION-03] Every interaction tween is interruptible: it uses `overwrite: "auto"`, starts from the current value, and never blocks input.

### 9.2 Tokens

All in `src/motion/tokens.ts`; no literal duration or ease anywhere else.

| Token | Value |
|---|---|
| Durations (s) | `instant` 0.12 · `quick` 0.24 · `base` 0.48 · `slow` 0.9 · `cinematic` 1.4 |
| `core.out` | CustomEase `0.16,1,0.3,1`: default for arrivals |
| `core.inOut` | CustomEase `0.65,0,0.35,1`: moves between two rests |
| `core.in` | CustomEase `0.7,0,0.84,0`: exits and falls |
| `iron.settle` | CustomEase `0.34,1.56,0.64,1`: a mass landing, one overshoot |
| `plate.drop` | CustomBounce, strength 0.35: the bar drop only |
| `rattle` | CustomWiggle, 6 wiggles, easing out: collar rattle and camera shake |
| Stagger | 0.06 s per word, 0.09 s per line, 0.08 s per list row |
| Distances | 8, 16, 32, 64 px; DOM tilt at most 8°; text skew at most 4° |

- [MOTION-04] The token file defines exactly this table and the named eases are registered once at start-up.
- [MOTION-05] Reusable effects are registered with `gsap.registerEffect`: `reveal` (masked lines), `counter` (snapped number), `magnet` (pointer attraction), `tilt` (3D card tilt); components call effects, not raw tweens, for these four.

### 9.3 Plugin map

GSAP is used at full depth. Each plugin below has one named job; registering a plugin and not using it is a defect, and so is using a plugin not in this table.

| Plugin | Job |
|---|---|
| Core (timeline, context, matchMedia, ticker, quickTo, utils) | Everything; the ticker is the page's only clock. |
| ScrollTrigger | Chapter progress and scrub; `batch` for the spec rows. |
| SplitText | Line and word reveals. |
| Flip | The h1 docking into the nav (`Flip.fit`); plan card moving to its chosen state. |
| Observer | Scroll intent: the chrome hides on fast downward scroll and returns on upward intent. |
| CustomEase, CustomBounce, CustomWiggle | The eases in §9.2. |
| DrawSVGPlugin | Preloader bar, orbit rings, navigation underlines. |
| MorphSVGPlugin | Brand mark (star and circle), menu and close icon, busy and success icon, ambient icon, cursor ring. |
| MotionPathPlugin | The selector pin travelling along the chapter rail's path. |
| ScrambleTextPlugin | Latin unit labels (KG, MM) on readouts. |
| Draggable with InertiaPlugin | Rotating the active object in Programs. |

Not used, by decision: ScrollSmoother, ScrollToPlugin and `ScrollTrigger.normalizeScroll` (Lenis owns scrolling), GSDevTools and markers (development only), `@gsap/react`.

- [MOTION-06] No GSAP plugin outside this table is imported or registered.

### 9.4 Text

- [MOTION-07] Text reveals use `SplitText.create` with `type: "lines,words"`, `mask: "lines"`, `autoSplit: true`, `aria: "auto"` and the animation returned from `onSplit`; Arabic is never split into characters (Latin readouts may be); the mask wrapper carries `padding-block: 0.32em; margin-block: -0.32em` so the tails of ج ر م are not cut.

### 9.5 Pointer, velocity and lifecycle

- [MOTION-08] Pointer-driven motion (cursor, parallax, tilt, magnet) uses `gsap.quickTo` and exists only under `(hover: hover) and (pointer: fine)`.
- [MOTION-09] Scroll velocity from Lenis drives four things, clamped and smoothed, all zero at rest: display type skew, marquee speed and direction, chromatic aberration amount, and the bar's roll speed.
- [MOTION-10] Lifecycle: a hidden tab stops rendering and ambient motion and resumes with no time jump; resize is debounced and ends in a short settle tween; the preloader has an entrance and an exit.

### 9.6 Component states

Every state below has a designed, tweened transition in both directions.

- [UI-01] Cursor: a ring and a dot following with different lag; states for link (ring grows), draggable (ring morphs to a horizontal grip), text field (ring collapses to a bar), pressed (scale 0.85); it inverts against the world through difference blending.
- [UI-02] Primary action: magnetic within 80 px by at most 10 px; hover, focus, pressed (scale 0.96), busy (collar icon spinning), success (icon morphs to a check).
- [UI-03] Navigation: links underline with an SVG bar that draws from inline-start and gains two end caps; the brand mark's star morphs to a circle on hover and focus; the chrome hides on fast downward scroll and returns on upward intent; on narrow screens a full-screen overlay opens with staggered masked lines and a morphing menu icon, and closes on Escape.
- [UI-04] Chapter rail: the pin travels along its path as chapters change; hovering or focusing a plate shows its chapter name; the current plate is marked for assistive technology with `aria-current`.
- [UI-05] Plan selector: a radio group; hover and focus share one state (tilt of at most 8°, ring lit); the chosen state uses Flip; arrow keys move between plans.
- [UI-06] Form fields: label floats on focus or when filled; an underline bar grows from inline-start; error shakes at most 6 px with `rattle` and slides the message in; valid turns the bar to the accent.
- [UI-07] Load counter and spec rows: numbers tween with `snap: 1` and tabular figures; unit labels scramble in; rows reveal with `ScrollTrigger.batch`.
- [UI-08] Footer marquee: loops the wordmark; speed and direction follow scroll velocity; back-to-top has hover, focus and pressed states.
- [UI-09] Ambient toggle: a button with `aria-pressed` whose icon morphs between pause and play; it freezes idle rotation, particle drift, Core pulse and marquee, and leaves scroll-driven motion working.
- [UI-10] Programs object: draggable to rotate with inertia on fine pointers, with arrow-key rotation when focused and a visible hint; it returns to its hero pose with `iron.settle` when released.
- [UI-11] Every plugin in the §9.3 table performs its listed job somewhere on the page.
- [UI-12] No un-animated change: every change of visibility, position, size, colour, content or state that a visitor can cause or see is tweened, checked by exercising every control in every state; the only instant changes are the keyboard focus ring and reduced-motion mode.

## 10. 3D system

### 10.1 Renderer and loop

- [GL-01] `THREE.WebGLRenderer` on WebGL2 (not WebGPU) with `antialias: false`, sRGB output, `NoToneMapping` on the renderer, clear alpha 0, and `renderer.info.autoReset = false` with a manual `info.reset()` at the start of each frame so statistics cover the whole frame.

### 10.2 Models

All procedural. Real dimensions: shaft 1.31 m long and 28 mm in diameter; collars 30 mm; sleeves 415 mm long and 50 mm in diameter (2.2 m overall); plates 450 mm in diameter with a 50.4 mm bore. Plate thickness is art-directed (about 54 mm for 20 kg, 40 mm for 15, 30 mm for 10) and is not shown as a fact.

- [GL-02] Scene units are metres and the bar and plates use the dimensions above.
- [GL-03] No model, texture or HDRI file is loaded; identical objects are drawn with `InstancedMesh`.
- [GL-04] Barbell: a shaft with two knurled zones and a smooth centre (procedural bump or normal map drawn on a canvas), collars, sleeves with end caps; at chapter 2's distance the knurling is visible.
- [GL-05] Plate: a `LatheGeometry` profile with hub, recessed face, rim lip and bore, at 96, 64 or 48 radial segments by tier.
- [GL-06] Plate lettering: a flat annulus made with `LatheGeometry` from two points (its U runs around the ring and its V along the radius), textured with a straight canvas strip reading النجم كور, EL NEGM CORE and the weight, so the browser shapes the Arabic and the strip wraps into a ring; used as colour and bump; legible, joined and not mirrored when seen from outside.
- [GL-07] Kettlebell (lathe body, tube handle) and dumbbell (two heads, knurled handle), each one draw call.
- [GL-08] The Core: an emissive sphere with a fresnel halo shader, colour `core`, the only object allowed to bloom strongly.
- [GL-09] Chalk motes: one `Points` object with a soft sprite generated on a canvas; counts 4000, 2000 or 800 by tier.

### 10.3 Materials and light

| Material | Settings (`MeshPhysicalMaterial`) |
|---|---|
| Steel shaft | colour `iron-400`, metalness 1, roughness 0.28, anisotropy along the shaft |
| Chrome sleeves, collars | colour `iron-300`, metalness 1, roughness 0.10 |
| Plate | colour `iron-900`, metalness 0.55, roughness 0.5, clearcoat 0.35, clearcoat roughness 0.4 |
| Plate in the white world | colour moves to `iron-800`, roughness to 0.6 |
| Lettering | colour `iron-200`, bump from the strip; the weight numeral on the chosen plan's plate in `signal` |

- [GL-10] Materials are exactly this table, with colours read from the token file.
- [GL-11] Lighting is two procedural environments built from emissive softbox meshes and `PMREMGenerator.fromScene`: DARK (narrow strips and one green kicker) and LIGHT (large bright panels); they crossfade with `--world`; in both worlds every object shows shading and highlights, never a flat silhouette.
- [GL-12] In the white world objects are grounded by contact shadows made of blob planes with a radial falloff; no shadow maps anywhere.

### 10.4 Post-processing and camera

- [GL-13] One `EffectComposer` (pmndrs `postprocessing`, half-float buffers) with `RenderPass` then the effects in this order: Bloom (mipmap blur), ChromaticAberration, ToneMapping (ACES), Backdrop (Appendix A.6), Vignette, Noise; they share one `EffectPass`, except that ChromaticAberration takes its own pass first if the library refuses to merge it.
- [GL-14] The backdrop is composited after tone mapping: at rest, the mean of a 200 px square of empty background is at most 3 (of 255) in the black world and at least 250 in the white world.
- [GL-15] Camera rig: one `PerspectiveCamera`; each shot is a position curve, a look-at curve, FOV and roll driven by one scrubbed parameter; pointer parallax and shake are additive channels on top and never fight the scrub.
- [GL-16] The frame loop allocates nothing (vectors and matrices are reused), and a dispose path frees geometries, materials, textures and render targets.

### 10.5 Effects

- [FX-01] Bore-shot flash: bloom intensity and exposure peak as the camera crosses the plate, with a chromatic aberration pulse, tied to scroll progress; it is one monotonic ramp up and one ramp down, never a strobe.
- [FX-02] World sweeps run through the Backdrop effect's `mix` and `direction`: Ignite in chapter 3 (white enters from the bottom; mid-sweep the frame reads black to white, top to bottom) and Collapse in chapter 5 (black returns from the bottom; mid-sweep reads white to black); during white, vignette darkness is 0 and grain opacity is at most 0.05.
- [FX-03] Bloom is tuned so that only the Core and specular peaks bloom (luminance threshold at least 0.85) and the white world shows no haze.
- [FX-04] Impact one-shots (plates landing, bar drop, plan chosen, form success) each combine an object motion, a camera shake of at most 0.01 rad, a chalk burst and a counter or state change, and play correctly when scrolled past in reverse.
- [FX-05] Preloader exit is a match cut: the SVG bar and the 3D bar occupy the same screen rectangle within 4 px at the moment of the swap, revealed through an iris that opens from the bar's centre.
- [FX-06] Chalk motes drift slowly at rest, streak with scroll velocity, and are paused by the ambient toggle.
- [FX-07] The Core's halo pulses slowly at rest and brightens with the bore shot and the form success.

## 11. Architecture

### 11.1 Stack

Verified to install, typecheck and build together on 2026-10-03. Exact versions are in Appendix A.1.

| Layer | Package |
|---|---|
| Build | Vite 8, `vite-plugin-singlefile`, TypeScript 7 (strict) |
| Styling | Tailwind CSS 4 through `@tailwindcss/vite`; tokens in `@theme` |
| Animation | GSAP 3.15 with the plugins of §9.3 (all free in the public package) |
| Scroll | Lenis 1.3 |
| 3D | three 0.186, postprocessing 6.39 |
| Fonts | `@fontsource-variable/alexandria`, `@fontsource-variable/big-shoulders` |
| QA only | `playwright-core`, pinned to the preinstalled Chromium; never run `playwright install`; on a local machine set `CHROME_PATH` to an installed Chrome |

Why nothing else: two scroll engines or two clocks fight each other, and in a single-file build every extra library is weight every visitor downloads. Framer Motion, anime.js, AOS, Locomotive Scroll, ScrollSmoother, Theatre.js, Lottie, React and drei are excluded for that reason.

- [ARCH-01] Runtime dependencies are exactly three, gsap, lenis and postprocessing at the Appendix A.1 versions.
- [ARCH-02] `npm run build` emits one self-contained `dist/index.html` with JavaScript, CSS and fonts inlined, and the page makes zero network requests at runtime.

### 11.2 Structure

```
docs/        BRIEF.md  DESIGN.md  LEDGER.json
scripts/     ledger.mjs  qa.mjs  make-artifact.mjs
src/
  main.ts                 boot order only
  styles/                 tokens.css  base.css  components.css
  core/                   loop.ts  scroll.ts  store.ts  quality.ts  device.ts
  motion/                 tokens.ts  effects.ts  text.ts
  gl/                     renderer.ts  environment.ts  materials.ts  rig.ts  post.ts  BackdropEffect.ts
  gl/models/              barbell.ts  plate.ts  kettlebell.ts  dumbbell.ts  core.ts  motes.ts
  chapters/               preloader.ts  hero.ts  mass.ts  ignite.ts  programs.ts  orbit.ts  gravity.ts  join.ts
  dom/                    cursor.ts  nav.ts  rail.ts  form.ts  marquee.ts  ambient.ts
  qa/hook.ts
index.html
```

- [ARCH-03] Source files live only in the folders of this layout, each module has one responsibility, and no source file exceeds 400 lines.
- [ARCH-04] One clock: each frame runs Lenis, then GSAP, then the scene update, then the render, all inside `gsap.ticker`; no other `requestAnimationFrame` loop, `setInterval` or `setTimeout` choreography exists.
- [ARCH-05] Lenis is the only smooth-scroll engine and the only API for programmatic scrolling; ScrollSmoother, `normalizeScroll`, ScrollToPlugin and CSS `scroll-behavior: smooth` are absent.
- [ARCH-06] Chapters are CSS `position: sticky` stages inside tall sections; ScrollTrigger measures progress and never pins.
- [ARCH-07] Every ScrollTrigger sits on a top-level timeline or tween, created in page order; none is nested inside a parent timeline.
- [ARCH-08] Each chapter module exports `build(ctx)` and `dispose()`, runs inside its own `gsap.context()`, and the root uses `gsap.matchMedia()` for breakpoints and reduced motion; disposing a chapter leaves no tween, trigger or listener behind.
- [ARCH-09] One typed store holds `world`, `tier`, `reducedMotion`, `ambientPaused`, `selectedPlan` and `chapter`; modules subscribe to it and never reach into another module's DOM.
- [ARCH-10] DOM layering: the canvas is first in the document, `position: fixed; z-index: 0`; no ancestor of a blended `.stage` creates a stacking context (no `z-index`, `transform`, `filter` or `opacity` on `main` or the sections).
- [ARCH-11] TypeScript strict mode passes with zero errors, and the source has no `any`, `@ts-ignore` or `@ts-expect-error`.
- [ARCH-12] If WebGL is unavailable, or on `webglcontextlost`, the page switches to static mode (§13) instead of going blank, and runtime errors are collected in `window.__qa.errors`.
- [ARCH-13] The page needs no storage to work; any `localStorage` access is wrapped in `try/catch`.
- [ARCH-14] Tailwind's source detection is limited to `src/` and `index.html` (`@import "tailwindcss" source("../src");` and `@source "../index.html";` at the top of the stylesheet), and markup uses token utilities only, never arbitrary colour values.

### 11.3 Verified wiring

The order below was tested when this brief was written. Lenis is added to the ticker with priority so it runs before GSAP's own update; the render callback is added last.

```ts
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000), false, true); // prioritized: runs first
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((_time, deltaMs) => renderFrame(deltaMs / 1000)); // added last: runs after GSAP
```

### 11.4 QA hook

- [QA-01] `window.__qa` exposes `ready` (a promise resolved when boot has finished, the preloader has exited and one frame has rendered), `chapters` (id, start and end as global progress), `seek(progress)` (immediate scroll plus one settled frame), `stats()` (calls, triangles, geometries, textures, programs, dpr, tier, world, chapter, fps, frameMsP95), `set({ tier, reducedMotion, ambient, staticMode })` and `errors`.
- [QA-02] With the `#qa` hash, time-based ambient motion is frozen, scrub is `true`, entrance tweens complete at once and the tier is forced (HIGH at 1440×900, LOW at 390×844), so `seek(p)` always renders the same frame.
- [QA-03] `npm run gate` runs typecheck, build and `scripts/qa.mjs`, and exits non-zero on any console error, application error or horizontal overflow.
- [QA-04] `scripts/qa.mjs` shoots every entry of `__qa.chapters` at 10 %, 50 % and 90 % of its range, at 1440×900 and 390×844, and saves `qa/<viewport>/<chapter>-<pct>.png`.
- [QA-05] `node scripts/ledger.mjs init` reports exactly 150 requirements; any other number means `docs/BRIEF.md` is not a byte-exact copy of this file.

## 12. Performance

A fully animated 3D page is the easiest kind of page to make slow, so these are requirements, not aspirations.

### 12.1 Budgets

- [PERF-01] `dist/index.html` is at most 1.6 MB raw and 550 KB gzipped (the bare stack with three font files measured 901 KB and 310 KB).
- [PERF-02] At every QA stop, draw calls are at most 80 on HIGH and 50 on LOW, triangles at most 350 000 and 120 000, textures at most 24, shader programs at most 24.
- [PERF-03]† On the user's laptop with a discrete GPU the page holds 60 fps (95th-percentile frame at most 16.7 ms), and on a mid-range Android phone at least 45 fps, read from `__qa.stats()` on the real devices.
- [PERF-04] DOM animation changes only transforms, opacity and CSS custom properties; no layout property is animated, and `will-change` is present only while an element animates.
- [PERF-05] The frame loop performs no layout reads; rectangles are measured on refresh and resize and cached.
- [PERF-06] Rendering stops when the tab is hidden, and when nothing is moving (no scroll velocity, no pointer movement, ambient paused) the page renders on demand instead of every frame.

### 12.2 Tiers and adaptive quality

| Tier | Chosen when | DPR cap | MSAA | Bloom | Aberration | Motes | Lathe segments |
|---|---|---|---|---|---|---|---|
| HIGH | fine pointer and at least 8 logical cores | 2.0 | 4 | full | on | 4000 | 96 |
| MED | everything else on desktop; strong phones | 1.5 | 2 | half resolution | off | 2000 | 64 |
| LOW | coarse pointer with at most 6 cores or at most 4 GB reported memory | 1.25 | 0 | off | off | 800 | 48 |

- [RESP-01] The tier is chosen once at start by this table and is exposed in `__qa.stats()`.
- [RESP-02] Adaptive quality: if the smoothed frame time stays above 20 ms for 1.5 s, lower DPR by 0.25 (floor 1.0, or 0.85 on LOW), then disable bloom, then aberration; raise again only after 8 s below 12 ms; the controller never oscillates.
- [RESP-03] On coarse pointers Lenis leaves touch scrolling native (`syncTouch: false`), there is no custom cursor, no hover-only information and no drag-only interaction.
- [RESP-04] `ScrollTrigger.config({ ignoreMobileResize: true })` is set, and the canvas is sized in `lvh`, so the browser's address bar showing or hiding never resizes or jumps the scene.
- [RESP-05] At 390×844 every chapter follows the portrait blocking of SCENE-06, the navigation is the overlay, and plans stack vertically.

### 12.3 Polish

- [POLISH-01] The remove-one pass: for each chapter, one decorative element that does not serve the story is removed, and `docs/DESIGN.md` lists what was removed.
- [POLISH-02] Arabic copy is proofread against §7.2 character by character, including hamza, tanween and the ellipsis character `…`.
- [POLISH-03] The shipped file contains no ScrollTrigger markers, GSDevTools, `console.log`, commented-out code or TODO notes.

## 13. Accessibility and fallbacks

The client wants everything to move. People who cannot tolerate motion, or whose device cannot draw it, still get the whole page.

- [ACCESS-01] Under `prefers-reduced-motion: reduce` (through `gsap.matchMedia` and Lenis's `respectReducedMotion`), the camera cuts between chapter key poses with 0.4 s cross-fades instead of travelling; parallax, shake, velocity effects, particle drift and the marquee stop; text reveals become 0.2 s opacity changes; every control still works.
- [ACCESS-02] The ambient toggle is always reachable and stops all motion that runs for more than five seconds without user input.
- [ACCESS-03] Keyboard: a skip link is the first focusable element; tab order follows the visual order; every control has a visible `:focus-visible` ring (2 px, `signal` on black and `ink` on white, offset 3 px); fixed chrome never covers the focused element; Escape closes the overlay.
- [ACCESS-04] Assistive technology: split text keeps its accessible name (`aria: "auto"`); one polite live region announces the form result and the final load value only; decorative SVG is `aria-hidden`.
- [ACCESS-05] Form: visible labels, `autocomplete`, `inputmode="tel"` on the phone field, the pattern `^01[0125]\d{8}$`, inline errors next to their field, focus moved to the first error, submit handled with `preventDefault`, paste never blocked.
- [ACCESS-06] Touch targets are at least 44 by 44 px, `touch-action: manipulation` is set on controls, and zoom is not disabled.
- [ACCESS-07] Static mode (no WebGL, or forced through the QA hook): each section takes its world as a CSS background (hero and mass black, ignite the Ignite gradient, programs white, orbit the Collapse gradient, gravity and join black), a line-art SVG bar replaces the scene, and all copy and the form work.
- [ACCESS-08] Nothing on the page flashes more than three times in one second, and both world sweeps are single monotonic transitions.

## 14. Delivery

- [SHIP-01] `dist/index.html` runs unchanged from `file://` and from any static host.
- [SHIP-02] If the Artifact tool exists: `scripts/make-artifact.mjs` writes `dist/artifact.html` following the page contract in `artifact-design` (content only, with no doctype, `html`, `head` or `body` tags; `<title>النجم كور</title>` at the top; every colour set explicitly with `color-scheme: dark`; fixed chrome padded by the safe-area insets; `lang` and `dir` on the root wrapper), and it is published privately with the icon word `dumbbell` and a one-sentence description.
- [SHIP-03] The published page obeys the artifact frame: no external request of any kind, no `mailto:` or `tel:` actions, no `alert` or `confirm`, the form handled in script, and `#qa` as the only use of the URL hash.
- [SHIP-04] A source zip without `node_modules` and a `README.md` covering run, build, deploy to a static host, where to change copy and tokens, the QA and ledger commands, and the licences: three (MIT), GSAP (standard no-charge licence, free for commercial use), Lenis (MIT), postprocessing (Zlib), Tailwind CSS (MIT), fonts (OFL-1.1).
- [SHIP-05] The final audit of §4.4 has run and every FAIL is fixed or recorded as a deviation.
- [SHIP-06]† Real-device check: if a browser on the user's computer is reachable, open the published page there, confirm the canvas renders and the console is clean, and record `__qa.stats()`; otherwise give the user three exact steps to do it.
- [SHIP-07] `node scripts/ledger.mjs check --final` exits 0 and the final report (§16.2) is delivered.

If the single file breaks the artifact frame in a way the bundled build cannot fix, fall back to loading three, gsap and lenis as pinned ES modules from `cdn.jsdelivr.net/npm/` through an import map, keep everything else inline, and record it as a deviation.

## 15. Definition of done

1. `node scripts/ledger.mjs check --final` exits 0: all 150 IDs are `verified`, or `user-check` where † allows it, or a `deviation` with a reason.
2. `npm run gate` exits 0 on the final commit.
3. You have opened the final screenshots of every chapter in both viewports and each matches §8.
4. The independent audit returned no open FAIL.
5. The user has the page, the source zip and the final report.

Until all five hold, the task is not finished: keep working.

## 16. Report formats

**16.1 Gate report** (Egyptian Arabic, §3.3 style, nothing else in the message):

```
P<n> gate: PASS
اتعمل: <3 to 6 short lines>
الدليل: <screenshot paths you opened> | calls <n> | tris <n> | errors 0
ledger: <output of `ledger.mjs report`, phases on one line>
regression: <chapters re-checked> سليم | <what broke and was fixed>
deviation: لا يوجد | <ID: reason>
التالي: P<n+1>
```

**16.2 Final report:**

```
اتسلّم: <artifact name> | <zip name> | dist/index.html <size raw / gzip>
ledger: <verified>/<total> verified | <n> user-check | <n> deviation
user-check: <ID: the exact steps for the user, one line each>
deviation: <ID: reason, what was tried>
خارج الـ scope (اقتراحات): <at most three, one line each>
```

Your first message is one line saying you are starting P0. Then start.

## Appendix A. Verified starter files

These files were installed, type-checked, built and run when this brief was written. Create them exactly as given; extend them, do not rewrite them.

### A.1 package.json

Pinned versions, because a build that is rerun months later must produce the same file.

```json
{
  "name": "elnegm-core",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "build": "vite build",
    "qa": "node scripts/qa.mjs dist/index.html qa",
    "gate": "npm run typecheck && npm run build && npm run qa",
    "ledger": "node scripts/ledger.mjs"
  },
  "dependencies": {
    "gsap": "3.15.0",
    "lenis": "1.3.26",
    "postprocessing": "6.39.5",
    "three": "0.186.1"
  },
  "devDependencies": {
    "@fontsource-variable/alexandria": "5.3.0",
    "@fontsource-variable/big-shoulders": "5.3.0",
    "@tailwindcss/vite": "4.3.3",
    "@types/three": "0.186.0",
    "playwright-core": "1.56.0",
    "tailwindcss": "4.3.3",
    "typescript": "7.0.2",
    "vite": "8.3.2",
    "vite-plugin-singlefile": "2.3.3"
  }
}
```

### A.2 vite.config.ts

```ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained dist/index.html: JS, CSS and fonts are inlined so the file
// that QA screenshots is byte-for-byte the file that ships (no network at runtime).
export default defineConfig({
  plugins: [tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
    modulePreload: false,
    reportCompressedSize: true,
  },
});
```

### A.3 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

### A.4 scripts/qa.mjs

Reads its stops from `QA_STOPS` and its viewports from `QA_VIEWPORTS`. Extend it in P0 to take its stops from `window.__qa.chapters` and to name files by chapter (QA-04).

```js
// scripts/qa.mjs — deterministic screenshot + health harness.
// Why a script and not manual checks: every phase gate must produce the same evidence
// (screenshots, console errors, render stats) from the exact file that ships.
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.argv[2] ?? 'dist/index.html');
const outDir = resolve(process.argv[3] ?? 'qa');
const stops = (process.env.QA_STOPS ?? '0,0.125,0.25,0.375,0.5,0.625,0.75,0.875,1').split(',').map(Number);
const viewports = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false },
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
].filter((v) => !process.env.QA_VIEWPORTS || process.env.QA_VIEWPORTS.split(',').includes(v.name));

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH; // local machines: point at an installed Chrome
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined; // fall back to Playwright's own lookup
  const dir = readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
  return dir ? `${root}/${dir}/chrome-linux/chrome` : undefined;
}

const browser = await chromium.launch({
  executablePath: chromePath(),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const report = { file, generatedAt: new Date().toISOString(), runs: [], ok: true };

for (const vp of viewports) {
  const { name, ...contextOptions } = vp;
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...contextOptions });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto(`file://${file}#qa`);
  await page.waitForFunction(() => window.__qa !== undefined, null, { timeout: 30_000 });
  await page.evaluate(() => window.__qa.ready);
  mkdirSync(`${outDir}/${name}`, { recursive: true });
  const frames = [];
  for (const stop of stops) {
    await page.evaluate((p) => window.__qa.seek(p), stop);
    const shot = `${outDir}/${name}/p${String(Math.round(stop * 1000)).padStart(4, '0')}.png`;
    await page.screenshot({ path: shot });
    const probe = await page.evaluate(() => ({
      stats: window.__qa.stats(),
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
    }));
    frames.push({ stop, shot, ...probe });
  }
  const appErrors = await page.evaluate(() => window.__qa.errors);
  const run = { viewport: name, consoleErrors, appErrors, frames };
  if (consoleErrors.length || appErrors.length || frames.some((f) => f.overflowX > 0)) report.ok = false;
  report.runs.push(run);
  await context.close();
}
await browser.close();
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
for (const run of report.runs) {
  console.log(`[${run.viewport}] errors=${run.consoleErrors.length + run.appErrors.length}`);
  for (const f of run.frames) console.log(`  p=${f.stop} calls=${f.stats.calls} tris=${f.stats.triangles} overflowX=${f.overflowX} invert=${f.stats.invert}`);
  run.consoleErrors.concat(run.appErrors).forEach((e) => console.log('  ERROR:', e));
}
process.exit(report.ok ? 0 : 1);
```

### A.5 scripts/ledger.mjs

```js
// scripts/ledger.mjs — requirement ledger derived from docs/BRIEF.md.
// Why a script: "every requirement was done" must be a mechanical fact, not a memory.
// The brief is the only source of IDs; this file can never drift from it.
//
//   node scripts/ledger.mjs init                         create or refresh docs/LEDGER.json
//   node scripts/ledger.mjs set <ID> <status> "<evidence>"
//   node scripts/ledger.mjs check --gate <n>             phases 0..n must all pass
//   node scripts/ledger.mjs check --final                every phase must pass
//   node scripts/ledger.mjs report                       per-phase summary + open items
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const BRIEF = process.env.BRIEF ?? 'docs/BRIEF.md';
const LEDGER = process.env.LEDGER ?? 'docs/LEDGER.json';
const STATUSES = ['todo', 'built', 'verified', 'user-check', 'deviation'];
const PASSING = new Set(['verified', 'user-check', 'deviation']);
const ID_PATTERN = /\[([A-Z]{2,6})-(\d{2})\](†?)/g;

function fail(message) {
  console.error(`ledger: ${message}`);
  process.exit(1);
}

function parseBrief() {
  if (!existsSync(BRIEF)) fail(`${BRIEF} not found`);
  const text = readFileSync(BRIEF, 'utf8');
  const block = text.match(/```phase-map\r?\n([\s\S]*?)```/);
  if (!block) fail('no ```phase-map block in the brief');
  const phaseOfArea = new Map();
  for (const line of block[1].trim().split(/\r?\n/)) {
    const [phase, ...areas] = line.trim().split(/\s+/);
    for (const area of areas) phaseOfArea.set(area, Number(phase.slice(1)));
  }
  const requirements = new Map();
  const duplicates = new Set();
  for (const line of text.split(/\r?\n/)) {
    for (const match of line.matchAll(ID_PATTERN)) {
      const [, area, number, dagger] = match;
      const id = `${area}-${number}`;
      if (requirements.has(id)) {
        duplicates.add(id);
        continue;
      }
      if (!phaseOfArea.has(area)) fail(`area ${area} (${id}) is missing from the phase-map`);
      const summary = line
        .replace(ID_PATTERN, '')
        .replace(/^[\s|*-]+/, '')
        .replace(/[*`|]/g, '')
        .trim()
        .slice(0, 140);
      requirements.set(id, { id, phase: phaseOfArea.get(area), userCheckAllowed: dagger === '†', summary });
    }
  }
  if (duplicates.size) fail(`duplicate requirement IDs: ${[...duplicates].join(', ')}`);
  if (!requirements.size) fail('no requirement IDs found in the brief');
  return requirements;
}

function load() {
  return existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { entries: {} };
}

function save(ledger) {
  mkdirSync(dirname(LEDGER), { recursive: true });
  const ordered = Object.values(ledger.entries).sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id));
  ledger.entries = Object.fromEntries(ordered.map((entry) => [entry.id, entry]));
  writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
}

function sync() {
  const requirements = parseBrief();
  const ledger = load();
  let added = 0;
  let removed = 0;
  for (const [id, requirement] of requirements) {
    const previous = ledger.entries[id];
    if (!previous) added += 1;
    ledger.entries[id] = { status: 'todo', evidence: '', updated: '', ...previous, ...requirement };
  }
  for (const id of Object.keys(ledger.entries)) {
    if (!requirements.has(id)) {
      delete ledger.entries[id];
      removed += 1;
    }
  }
  save(ledger);
  return { ledger, added, removed, total: requirements.size };
}

function problemsOf(entry) {
  const problems = [];
  if (!PASSING.has(entry.status)) problems.push(`status is ${entry.status}`);
  else if (!entry.evidence.trim()) problems.push('no evidence');
  if (entry.status === 'user-check' && !entry.userCheckAllowed) problems.push('user-check is not allowed for this ID (no † in the brief)');
  return problems;
}

const [command, ...args] = process.argv.slice(2);

if (command === 'init') {
  const { added, removed, total } = sync();
  console.log(`ledger: ${total} requirements (${added} added, ${removed} removed) -> ${LEDGER}`);
} else if (command === 'set') {
  const [id, status, ...rest] = args;
  const evidence = rest.join(' ').trim();
  const { ledger } = sync();
  const entry = ledger.entries[id];
  if (!entry) fail(`unknown ID ${id}`);
  if (!STATUSES.includes(status)) fail(`status must be one of: ${STATUSES.join(', ')}`);
  if (PASSING.has(status) && !evidence) fail(`${status} needs evidence (file:line, screenshot path, or measured value)`);
  if (status === 'user-check' && !entry.userCheckAllowed) fail(`${id} cannot be user-check: verify it here`);
  Object.assign(entry, { status, evidence, updated: new Date().toISOString() });
  save(ledger);
  console.log(`ledger: ${id} -> ${status}`);
} else if (command === 'check') {
  const final = args.includes('--final');
  const gateIndex = args.indexOf('--gate');
  if (!final && gateIndex === -1) fail('use check --gate <n> or check --final');
  const gate = final ? Infinity : Number(args[gateIndex + 1]);
  if (!final && !Number.isInteger(gate)) fail('--gate needs a phase number');
  const { ledger } = sync();
  const scope = Object.values(ledger.entries).filter((entry) => entry.phase <= gate);
  const failing = scope.map((entry) => ({ entry, problems: problemsOf(entry) })).filter((item) => item.problems.length);
  for (const { entry, problems } of failing) console.log(`FAIL ${entry.id} (P${entry.phase}): ${problems.join('; ')} | ${entry.summary}`);
  const deviations = scope.filter((entry) => entry.status === 'deviation');
  for (const entry of deviations) console.log(`DEVIATION ${entry.id}: ${entry.evidence}`);
  console.log(`ledger: ${scope.length - failing.length}/${scope.length} pass ${final ? '(final)' : `(gate ${gate})`}; ${deviations.length} deviation(s)`);
  process.exit(failing.length ? 1 : 0);
} else if (command === 'report') {
  const { ledger } = sync();
  const entries = Object.values(ledger.entries);
  const phases = [...new Set(entries.map((entry) => entry.phase))].sort((a, b) => a - b);
  for (const phase of phases) {
    const inPhase = entries.filter((entry) => entry.phase === phase);
    const passing = inPhase.filter((entry) => !problemsOf(entry).length).length;
    console.log(`P${phase} ${passing}/${inPhase.length}`);
  }
  for (const entry of entries.filter((item) => item.status === 'user-check' || item.status === 'deviation')) {
    console.log(`${entry.status.toUpperCase()} ${entry.id}: ${entry.evidence}`);
  }
} else {
  fail('commands: init | set <ID> <status> "<evidence>" | check --gate <n> | check --final | report');
}
```

### A.6 src/gl/BackdropEffect.ts

```ts
// src/gl/BackdropEffect.ts
// Composites the black<->white "world" behind the tone-mapped scene inside the final
// post pass. Why here and not as scene.background: tone mapping would turn #FFFFFF into
// grey (ACES maps 1.0 to ~0.8). The scene is rendered with clear alpha 0, so its alpha is
// premultiplied coverage and the backdrop only fills what geometry does not cover.
import { Uniform } from 'three';
import { BlendFunction, Effect } from 'postprocessing';

const fragmentShader = /* glsl */ `
uniform float uMix;        // 0 = black world, 1 = white world, between = gradient sweep
uniform float uDirection;  // +1: white enters from the bottom, -1: white enters from the top

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float y = uDirection > 0.0 ? uv.y : 1.0 - uv.y;
  float lightness = smoothstep(0.0, 1.0, uMix * 2.0 - y);   // perceptual lightness (OKLab L)
  vec3 backdrop = vec3(lightness * lightness * lightness);   // L^3 = linear luminance for neutrals
  backdrop += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;       // 1-LSB dither: no banding in the sweep
  outputColor = vec4(inputColor.rgb + backdrop * (1.0 - inputColor.a), 1.0);
}`;

export class BackdropEffect extends Effect {
  constructor() {
    super('BackdropEffect', fragmentShader, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['uMix', new Uniform(0)],
        ['uDirection', new Uniform(1)],
      ]),
    });
  }

  /** Tween `.value` 0..1 with GSAP. */
  get mix(): Uniform<number> {
    return this.uniforms.get('uMix') as Uniform<number>;
  }

  /**
   * Which edge white enters from as mix goes 0 to 1 (and leaves through, last, as it goes 1 to 0).
   * +1 = bottom: mid-sweep the frame reads black to white, top to bottom (Ignite).
   * -1 = top: mid-sweep the frame reads white to black, top to bottom (Collapse).
   */
  get direction(): Uniform<number> {
    return this.uniforms.get('uDirection') as Uniform<number>;
  }
}
```

## Appendix B. What was tested, and what it taught

Measured on 2026-10-03 in Claude's cloud workspace (Node 22, headless Chromium with software WebGL) on a prototype built from the files above.

**Confirmed working**

- The pinned stack installs, passes `tsc --noEmit` under strict settings and builds to a single 901 KB file (310 KB gzipped) containing three, GSAP with ScrollTrigger, SplitText and CustomEase, Lenis, postprocessing, Tailwind and three inlined font files.
- Every GSAP plugin named in §9.3 ships in the public `gsap` package at 3.15.0.
- Headless Chromium renders WebGL2 with the flags in `qa.mjs`: zero console errors; a three-chapter prototype measured 25 draw calls and about 17 500 triangles.
- SplitText with `lines,words` and a line mask keeps Arabic joined and shaped.
- `mix-blend-mode: difference` on a sticky stage inverts type per pixel against the WebGL canvas: black on the white world, white where it crosses a black plate.
- The Backdrop effect draws the black-to-white sweep behind tone-mapped objects. With grain at 0.18 the empty background averaged 1 of 255 in the black world and 245 in the white world, which is why FX-02 caps grain in white.
- A canvas text strip on a two-point lathe annulus wraps into a ring with correct Arabic shaping.

**Pitfalls observed, with their fixes**

- A canvas with `z-index: -1` disappears behind `body`'s background. Keep it at `z-index: 0`, first in the document.
- Any stacking context between the blended layer and the canvas (for example `position: relative; z-index: 1` on `main`) silently disables the blend.
- SplitText's line mask cuts Arabic descenders at display line heights. Fix as in MOTION-07.
- Difference-blended type over the grey middle of a sweep is nearly invisible. Hence SCENE-04.
- A black plate on the white world is a flat disc under the dark environment. Hence the LIGHT environment in GL-11.
- Vignette and grain turn the white world dirty grey. Fade them as in FX-02.
- `rotateZ(+90°)` on a lathe sends its +Y face to −X, so a decal ends up on the hidden side; with the opposite rotation the lettering faces out but reads mirrored. Flip the strip's U (`repeat.x` negative, with the matching offset) and confirm in a screenshot.
- Tailwind 4 scans every text file in the project by default, including `docs/BRIEF.md` and `qa/`, and emits utilities for the class-like words it finds (the build grew from 901 KB to 906 KB). Limit it as in ARCH-14.
- Software WebGL takes about 8 s per 1440×900 frame with MSAA and bloom. Run desktop and mobile QA as separate commands, keep each under the tool timeout, and never use these timings as performance data.

**Known library behaviour, not re-tested here**

- With a composer, `renderer.info` resets on every pass and reports only the last one unless `autoReset` is off. Hence GL-01.
- ACES tone mapping maps a white `scene.background` to grey. That is why the backdrop is composited after tone mapping.
- The Backdrop effect was rendered only with `direction = +1`; `-1` shares the same shader.

**Security note.** `npm audit` reports nothing in the four runtime dependencies. It reports one build-time chain, `braces` through `micromatch` through `vite-plugin-singlefile` (GHSA-vfj7-8cjw-p6xm, a glob-pattern denial of service). It runs only at build time on patterns you control and is not shipped. Do not run `npm audit fix --force`: it downgrades the plugin to 0.9.0.

**Not tested here** (verify before relying on them): `Flip.fit` between a sticky element and a fixed one; Draggable on a proxy driving a 3D rotation; ChromaticAberration merged into the main `EffectPass`; a fixed `.panel` inside a section; `renderer.compileAsync` warm-up timing; behaviour inside the Artifact frame; real-GPU frame rates.

**Tried and rejected:** extruding the Arabic wordmark into 3D geometry at build time with fontkit. `getVariation` on the variable WOFF2 failed, so the wordmark stays as DOM type with difference blending, which is also faster to paint and accessible.
