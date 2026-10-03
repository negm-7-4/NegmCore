// src/chapters/hero.ts — chapter 1, the Core (SCENE-11, SCENE-12). Black world.
// An unloaded bar floats level and rolls; the camera holds, then drifts to a three-quarter
// view. The h1 sits in the lower inline-start area so the bar crosses behind its caps and the
// difference blend inverts the letters where steel passes. Leaving, the h1 docks into the
// wordmark with Flip.fit (rects measured on refresh), and the cue leaves first.
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { device } from '../core/device';
import { Shot } from '../gl/rig';
import { forgetRevealer, revealer } from '../motion/text';
import { ease } from '../motion/tokens';
import { chapterTimeline, exitAt, registerChapterRest, track, unregisterChapterTrigger, type ChapterContext, type ChapterModule } from './context';

let ctx: gsap.Context | null = null;
let cleanup: Array<() => void> = [];

/** Poses shared with mass (SCENE-05): the hero's last pose is mass's first. */
export function heroShot(portrait: boolean): Shot {
  return portrait
    ? new Shot([
        { pos: [0, 0.35, 6.2], look: [0, 0.02, 0], fov: 32 },
        { pos: [1.7, 0.75, 5.5], look: [0.2, 0.05, 0], fov: 32 },
      ])
    : new Shot([
        { pos: [0, 0.28, 3.3], look: [0, 0.58, 0], fov: 32 },
        { pos: [1.3, 0.62, 2.95], look: [0.2, 0.5, 0], fov: 32 },
      ]);
}

export const hero: ChapterModule = {
  id: 'hero',
  build(c: ChapterContext) {
    const h1 = c.section.querySelector<HTMLElement>('.display');
    const meta = [...c.section.querySelectorAll<HTMLElement>('.hero-meta > *')];
    const cue = c.section.querySelector<HTMLElement>('.cue');
    const wordText = document.querySelector<HTMLElement>('.wordmark-text');
    const shot = heroShot(c.portrait);
    const cam = { u: 0 };
    const s = c.props.origin.state;
    const dock = { x: 0, y: 0, sx: 1, sy: 1 };

    // Rects are measured on refresh only (PERF-05): clear the dock, fit, cache.
    const measure = (): void => {
      if (!h1 || !wordText) return;
      gsap.set(h1, { x: 0, y: 0, scaleX: 1, scaleY: 1, transformOrigin: '0% 0%' });
      const vars = Flip.fit(h1, wordText, { scale: true, getVars: true }) as gsap.TweenVars | null;
      // Flip returns lengths as strings ("36px"); parse them rather than coerce.
      const num = (v: unknown, fallback: number): number => {
        const n = Number.parseFloat(String(v));
        return Number.isFinite(n) ? n : fallback;
      };
      dock.x = num(vars?.x, 0);
      dock.y = num(vars?.y, 0);
      dock.sx = num(vars?.scaleX, 1);
      dock.sy = num(vars?.scaleY, 1);
    };
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);
    cleanup.push(() => ScrollTrigger.removeEventListener('refreshInit', measure));

    ctx = gsap.context(() => {
      gsap.set(wordText, { opacity: 0 });
      c.world.setWorld(0, 1);
      const ct = chapterTimeline(c, 'hero', () => {
        c.world.rig.set(shot, cam.u);
        c.world.setWorld(0); // a black chapter: a jump back from the white world lands here
      });
      const { tl } = ct;
      // 0-13: hold (SCENE-02). 13-100: drift to the three-quarter view.
      track(tl, cam, { u: 1 }, 13, 100);
      // The bar rolls through the hero and comes to rest before mass loads it.
      gsap.set(s, { roll: 1 });
      track(tl, s, { roll: 0 }, 86, 100);
      exitAt(ct, cue, 14);
      meta.forEach((el, i) => exitAt(ct, el, 34 + i * 2));
      if (h1 && wordText) {
        if (c.reduced) {
          track(tl, h1, { opacity: 0 }, 60, 64);
          track(tl, wordText, { opacity: 1 }, 60, 64);
        } else {
          tl.to(h1, { x: () => dock.x, y: () => dock.y, scaleX: () => dock.sx, scaleY: () => dock.sy, ease: ease.inOut, duration: 33 }, 55);
          track(tl, h1, { opacity: 0 }, 88, 92);
          track(tl, wordText, { opacity: 1 }, 88, 92);
        }
      }
      registerChapterRest('hero', 0.05);

      // Entrance after the preloader's match cut: caps rise, then the meta lines.
      // Each line only arrives if the visitor has not already scrolled past its exit beat.
      const intro = (): void => {
        if (!h1) return;
        revealer(h1, true).show();
        const later = (delay: number, before: number, el: HTMLElement): void => {
          const run = (): void => {
            if (tl.time() < before) revealer(el).show();
          };
          if (device.qa) run();
          else gsap.delayedCall(delay, run);
        };
        meta.forEach((el, i) => later(0.25 + i * 0.09, 34 + i * 2, el));
        if (cue) later(0.6, 14, cue);
      };
      document.addEventListener('negm:ready', intro);
      cleanup.push(() => document.removeEventListener('negm:ready', intro));
      if (document.documentElement.classList.contains('is-ready')) intro();
      c.world.rig.set(shot, 0);
    }, c.section);
  },
  dispose() {
    ctx?.revert();
    ctx = null;
    cleanup.forEach((fn) => fn());
    cleanup = [];
    unregisterChapterTrigger('hero');
    document.querySelectorAll<HTMLElement>('#hero .display, #hero .hero-meta > *, #hero .cue').forEach(forgetRevealer);
  },
};
