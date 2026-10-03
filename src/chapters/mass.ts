// src/chapters/mass.ts — chapter 2, Mass (SCENE-13, SCENE-14, UI-07). Black world.
// The camera trucks to the inline-end sleeve (+X) and closes in on knurling and lettering.
// Three pairs of 20 kg plates slide on, one per third; each landing is an impact one-shot
// that moves the counter 20 -> 60 -> 100 -> 140 (and back down on reverse). A collar spins
// on and locks; then the frame holds.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { announce, impact, oneShot } from '../gl/fx';
import { Shot } from '../gl/rig';
import { forgetRevealer } from '../motion/text';
import { dur, ease, stagger } from '../motion/tokens';
import { heroShot } from './hero';
import {
  chapterTimeline,
  chapterTrigger,
  exitAt,
  registerChapterRest,
  revealAt,
  track,
  unregisterChapterTrigger,
  type ChapterContext,
  type ChapterModule,
} from './context';

let ctx: gsap.Context | null = null;

/** Mass ends where ignite begins (SCENE-05). */
export function massShot(portrait: boolean): Shot {
  const from = heroShot(portrait).last();
  return portrait
    ? new Shot([from, { pos: [1.15, 0.32, 1.75], look: [0.86, 0.02, 0], fov: 32 }, { pos: [1.02, 0.28, 1.55], look: [0.82, 0.0, 0], fov: 32 }])
    : new Shot([from, { pos: [0.3, 0.17, 0.5], look: [0.78, 0.0, 0], fov: 32 }, { pos: [1.3, 0.48, 1.45], look: [0.6, 0.02, 0], fov: 32 }, { pos: [1.8, 0.29, 0.72], look: [0.44, 0.02, 0], fov: 32 }]);
}

const LOADS = [20, 60, 100, 140];

export const mass: ChapterModule = {
  id: 'mass',
  build(c: ChapterContext) {
    const title = c.section.querySelector<HTMLElement>('.title');
    const body = c.section.querySelector<HTMLElement>('.body');
    const label = c.section.querySelector<HTMLElement>('.counter-label');
    const rows = [...c.section.querySelectorAll<HTMLElement>('.spec')];
    const count = c.panel?.querySelector<HTMLElement>('[data-load]') ?? null;
    const shot = massShot(c.portrait);
    const cam = { u: 0 };
    const s = c.props.origin.state;

    ctx = gsap.context(() => {
      const ct = chapterTimeline(c, 'mass', () => c.world.rig.set(shot, cam.u));
      const { tl } = ct;
      // Camera: truck and close in (0-28), slow push (28-80), hold (80-95).
      track(tl, cam, { u: 1 / 3 }, 0, 28);
      track(tl, cam, { u: 1 }, 28, 80);

      // Plates: one pair per third; position tracks are linear in scroll (SCENE-03).
      const slides: Array<[number, number]> = [
        [12, 26],
        [36, 50],
        [66, 74],
      ];
      s.load.fill(0);
      s.jolt.fill(0);
      s.collar = 0;
      s.collarSpin = Math.PI * 6;
      slides.forEach(([a, b], p) => {
        tl.to(s.load, { [p]: 1, duration: b - a, ease: 'none' }, a);
        ct.beat(
          b,
          () => {
            oneShot(gsap.fromTo(s.jolt, { [p]: 0.012 }, { [p]: 0, duration: dur.base, ease: ease.settle }));
            impact(c.world, { shake: 0.005 + p * 0.0015, burst: 0.5 + p * 0.2 });
            if (count) oneShot(gsap.effects.counter(count, { to: LOADS[p + 1], duration: dur.quick }));
            if (p === 2) announce(`${label?.textContent ?? ''} ${LOADS[3]} KG`);
          },
          () => {
            if (count) oneShot(gsap.effects.counter(count, { to: LOADS[p], duration: dur.quick }));
          },
        );
      });
      // The collar spins on and locks (74-80), with a rattle on the lock.
      track(tl, s, { collar: 1 }, 74, 80);
      track(tl, s, { collarSpin: 0 }, 74, 80);
      ct.beat(
        80,
        () => {
          oneShot(gsap.fromTo(s, { collarSpin: 0.18 }, { collarSpin: 0, duration: dur.slow, ease: ease.rattle }));
          impact(c.world, { shake: 0.004, burst: 0.25 });
        },
        () => undefined,
      );

      // DOM beats: title (chars), body and label; spec rows in order via ScrollTrigger.batch.
      revealAt(ct, title, 3, true);
      revealAt(ct, body, 5);
      revealAt(ct, label, 8);
      [title, body, label].forEach((el) => exitAt(ct, el, 95));
      gsap.set(rows, { opacity: 0, yPercent: 60 });
      const values = rows.map((row) => row.querySelector<HTMLElement>('dd .num'));
      const units = rows.map((row) => row.querySelector<HTMLElement>('dd .unit'));
      const finals = values.map((v) => Number(v?.textContent ?? 0));
      const trigger = chapterTrigger('mass');
      const at = (pct: number): number => (trigger ? trigger.start + ((trigger.end - trigger.start) * pct) / 100 : 0);
      ScrollTrigger.batch(rows, {
        start: (self: ScrollTrigger) => at(9 + rows.indexOf(self.trigger as HTMLElement) * 1.5),
        end: () => at(95),
        interval: 0.05,
        onEnter: (batch: Element[]) => {
          oneShot(gsap.to(batch, { opacity: 1, yPercent: 0, duration: dur.base, ease: ease.out, stagger: stagger.row, overwrite: 'auto' }));
          batch.forEach((row) => {
            const i = rows.indexOf(row as HTMLElement);
            const v = values[i];
            const u = units[i];
            if (v) {
              v.textContent = '0';
              oneShot(gsap.effects.counter(v, { to: finals[i], duration: dur.slow }));
            }
            if (u) oneShot(gsap.to(u, { scrambleText: { text: u.textContent ?? '', chars: 'upperCase', speed: 0.6 }, duration: dur.base }));
          });
        },
        onLeave: (batch: Element[]) => oneShot(gsap.to(batch, { opacity: 0, x: -32, duration: dur.quick, ease: ease.in, overwrite: 'auto' })),
        onEnterBack: (batch: Element[]) => oneShot(gsap.to(batch, { opacity: 1, x: 0, duration: dur.quick, ease: ease.out, overwrite: 'auto' })),
        onLeaveBack: (batch: Element[]) => oneShot(gsap.to(batch, { opacity: 0, yPercent: 60, duration: dur.quick, ease: ease.in, overwrite: 'auto' })),
      });
      registerChapterRest('mass', 0.88);
    }, c.section);
  },
  dispose() {
    ctx?.revert();
    ctx = null;
    unregisterChapterTrigger('mass');
    document.querySelectorAll<HTMLElement>('#mass .title, #mass .body, #mass .counter-label').forEach(forgetRevealer);
  },
};
