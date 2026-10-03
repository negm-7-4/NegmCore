// src/motion/tokens.ts — the motion vocabulary of §9.2, and the one place plugins are registered.
// Why one file: a duration or ease written inline anywhere else is a second vocabulary.
import { gsap } from 'gsap';
import { CustomBounce } from 'gsap/CustomBounce';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';
import { Draggable } from 'gsap/Draggable';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Observer } from 'gsap/Observer';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

export const dur = {
  instant: 0.12,
  quick: 0.24,
  base: 0.48,
  slow: 0.9,
  cinematic: 1.4,
} as const;

export const ease = {
  out: 'core.out',
  inOut: 'core.inOut',
  in: 'core.in',
  settle: 'iron.settle',
  drop: 'plate.drop',
  rattle: 'rattle',
  /** Scrubbed position tracks are linear in scroll (SCENE-03). */
  none: 'none',
} as const;

export const stagger = {
  word: 0.06,
  line: 0.09,
  row: 0.08,
} as const;

export const distance = {
  xs: 8,
  sm: 16,
  md: 32,
  lg: 64,
  tiltMaxDeg: 8,
  skewMaxDeg: 4,
} as const;

let registered = false;

/** Registers the §9.3 plugins and the named eases, once (MOTION-04, MOTION-06). */
export function registerMotion(): void {
  if (registered) return;
  registered = true;
  gsap.registerPlugin(
    ScrollTrigger,
    SplitText,
    Flip,
    Observer,
    CustomEase,
    CustomBounce,
    CustomWiggle,
    DrawSVGPlugin,
    MorphSVGPlugin,
    MotionPathPlugin,
    ScrambleTextPlugin,
    Draggable,
    InertiaPlugin,
  );
  CustomEase.create(ease.out, '0.16,1,0.3,1');
  CustomEase.create(ease.inOut, '0.65,0,0.35,1');
  CustomEase.create(ease.in, '0.7,0,0.84,0');
  CustomEase.create(ease.settle, '0.34,1.56,0.64,1');
  CustomBounce.create(ease.drop, { strength: 0.35 });
  CustomWiggle.create(ease.rattle, { wiggles: 6, type: 'easeOut' });
  gsap.defaults({ duration: dur.base, ease: ease.out });
}
