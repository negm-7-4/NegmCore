// src/chapters/preloader.ts — chapter 0 (SCENE-10, FX-05, MOTION-10).
// The counter climbs 0 -> 100 KG on five real milestones (fonts, geometry, environments,
// shaders, first frame); the SVG bar gains a plate at each one and the mark's star morphs to
// a circle as the last lands. The exit is a match cut: the SVG bar already sits on the 3D
// bar's screen rectangle, and an iris opens from the bar's centre to reveal the scene.
import { gsap } from 'gsap';
import { device } from '../core/device';
import { scroll } from '../core/scroll';
import { store } from '../core/store';
import { MARK_CIRCLE } from '../motion/shapes';
import { REDUCED_CUT, REDUCED_TEXT } from '../motion/reduced';
import { distance, dur, ease, stagger } from '../motion/tokens';

export interface BarRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Preloader {
  enter(): Promise<void>;
  milestone(index: 1 | 2 | 3 | 4 | 5): Promise<void>;
  placeBar(rect: BarRect): void;
  exit(): Promise<void>;
  /** Time from the last milestone to the end of the exit, in seconds (SCENE-10 budget). */
  readonly exitSeconds: number;
}


function done(anim: gsap.core.Animation): Promise<void> {
  if (device.qa) anim.progress(1);
  return new Promise((resolve) => {
    if (anim.progress() >= 1) resolve();
    else anim.eventCallback('onComplete', () => resolve());
  });
}

export function createPreloader(): Preloader {
  const root = document.querySelector<HTMLElement>('.preloader');
  const html = document.documentElement;
  if (!root) {
    return { enter: async () => undefined, milestone: async () => undefined, placeBar: () => undefined, exit: async () => undefined, exitSeconds: 0 };
  }
  const mark = root.querySelector<SVGSVGElement>('.preloader-mark');
  const star = root.querySelector<SVGPathElement>('.preloader-mark .mark-star');
  const label = root.querySelector<HTMLElement>('.preloader-label');
  const countWrap = root.querySelector<HTMLElement>('.preloader-count');
  const count = root.querySelector<HTMLElement>('[data-preload-count]');
  const bar = root.querySelector<SVGPathElement>('.pl-bar');
  const plates = [...root.querySelectorAll<SVGPathElement>('.pl-plate')];
  const svg = root.querySelector<SVGSVGElement>('.preloader-bar');
  let rect: BarRect | null = null;
  const reduced = store.get('reducedMotion');
  gsap.set(plates, { drawSVG: '50% 50%', opacity: 1 });

  return {
    exitSeconds: dur.quick + dur.cinematic,
    async enter() {
      scroll.lock();
      const tl = gsap.timeline({ defaults: { ease: ease.out } });
      tl.fromTo(mark, { scale: 0.6, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: dur.base })
        .fromTo([label, countWrap], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: dur.base, stagger: 0.08 }, '<0.1')
        .fromTo(bar, { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: reduced ? REDUCED_TEXT : dur.slow, ease: ease.inOut }, '<');
      await done(tl);
    },
    async milestone(index) {
      const tl = gsap.timeline();
      if (count) tl.add(gsap.effects.counter(count, { to: index * 20, duration: dur.quick }), 0);
      const plate = plates[index - 1];
      if (plate) tl.fromTo(plate, { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: dur.quick, ease: ease.settle }, 0);
      if (index === 5 && star) tl.to(star, { morphSVG: MARK_CIRCLE, duration: dur.base, ease: ease.inOut }, 0);
      await done(tl);
    },
    placeBar(r: BarRect) {
      rect = r;
      // FX-05: the SVG bar takes the 3D bar's screen rectangle before the swap.
      if (svg) gsap.set(svg, { '--bar-x': `${r.x}px`, '--bar-y': `${r.y}px`, '--bar-w': `${r.w}px`, '--bar-h': `${r.h}px` });
    },
    async exit() {
      const cx = rect ? rect.x + rect.w / 2 : window.innerWidth / 2;
      const cy = rect ? rect.y + rect.h / 2 : window.innerHeight / 2;
      const radius = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) + 2;
      const tl = gsap.timeline();
      tl.set(root, { '--iris-x': `${cx}px`, '--iris-y': `${cy}px`, '--iris': '0px' })
        .to([mark, label, countWrap, ...plates], { opacity: 0, y: -distance.xs, duration: dur.quick, ease: ease.in, stagger: stagger.word / 3 })
        .to(root, { '--iris': `${radius}px`, duration: reduced ? REDUCED_CUT : dur.cinematic, ease: ease.inOut }, '>-0.05')
        .to(svg, { opacity: 0, duration: dur.quick, ease: ease.in }, '<0.2');
      await done(tl);
      html.classList.add('is-ready');
      scroll.unlock();
    },
  };
}
