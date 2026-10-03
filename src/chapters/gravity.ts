// src/chapters/gravity.ts — chapter 6, Gravity (SCENE-22, SCENE-23, FX-04). Black world.
// 0-30: the camera comes down from the orbit to floor level while a loaded bar falls 1.2 m
// (scrubbed linearly; props turn it into y = h - g t²). 30: impact one-shot — two bounces on
// `plate.drop`, shake, chalk and the pool of light. 36-46: the plan cards arrive from depth,
// anchored under their plates. 46-90: hold; hover or focus tips a plate and lights its ring,
// choosing rolls it onto the sleeve and dims the others. 90-96: cards and copy leave.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Vector3 } from 'three';
import { loop } from '../core/loop';
import { scroll } from '../core/scroll';
import { PLAN_IDS, store, type PlanId } from '../core/store';
import { impact, oneShot } from '../gl/fx';
import { PLAN_STAND, ZONE } from '../gl/props';
import { Shot, type PoseDef } from '../gl/rig';
import { forgetRevealer } from '../motion/text';
import { distance, dur, ease } from '../motion/tokens';
import {
  chapterRestY,
  chapterTimeline,
  exitAt,
  registerChapterRest,
  revealAt,
  track,
  unregisterChapterTrigger,
  type ChapterContext,
  type ChapterModule,
} from './context';
import { orbitEnd } from './orbit';

let ctx: gsap.Context | null = null;
let offs: Array<() => void> = [];

const G = ZONE.gravity;
const IMPACT = 30;
const CARDS_IN = 46;
const REST = 0.62;

/** The settled floor-level pose; join starts here (SCENE-05). */
export function gravitySettled(portrait: boolean): PoseDef {
  // Low over the floor, high enough that the bar reads above the row of plan plates, which
  // sit just above the plan cards (landscape) or in the top 55 % (portrait).
  return portrait
    ? { pos: [G.x, 1.75, 6.7], look: [G.x, 0.22, 0.7], fov: 32 }
    : { pos: [G.x + 0.1, 1.2, 5.1], look: [G.x, 0.3, 0.9], fov: 32 };
}

function gravityShot(portrait: boolean): Shot {
  const travel: PoseDef = portrait ? { pos: [G.x - 9.5, 2.8, 4.6], look: [G.x, 1, 0.4], fov: 32 } : { pos: [G.x - 9.5, 2.6, 3.4], look: [G.x, 1, 0.4], fov: 32 };
  const floor: PoseDef = portrait ? { pos: [G.x + 0.1, 1.85, 7.1], look: [G.x, 0.25, 0.7], fov: 32 } : { pos: [G.x + 0.25, 1.28, 5.5], look: [G.x, 0.34, 0.9], fov: 32 };
  return new Shot([orbitEnd(portrait), travel, floor, gravitySettled(portrait)]);
}

/** Where `plate.drop` first touches down, and the height of its first rebound (as a fraction). */
function dropProfile(): { touch: number; rebound: number } {
  const fn = gsap.parseEase(ease.drop);
  let touch = 0;
  let rebound = 0;
  for (let t = 0; t <= 1; t += 0.002) {
    const v = fn(t);
    if (!touch && v >= 0.999) touch = t;
    if (touch) rebound = Math.max(rebound, 1 - v);
  }
  return { touch, rebound };
}

export const gravity: ChapterModule = {
  id: 'gravity',
  build(c: ChapterContext) {
    const title = c.section.querySelector<HTMLElement>('.title');
    const body = c.section.querySelector<HTMLElement>('.body');
    const legend = c.panel?.querySelector<HTMLElement>('.plans-label') ?? null;
    const cards = c.panel ? [...c.panel.querySelectorAll<HTMLElement>('.plan')] : [];
    const shot = gravityShot(c.portrait);
    const cam = { u: 0 };
    const s = c.props.gravity.state;
    const { touch, rebound } = dropProfile();
    const bounceHeight = rebound > 0 ? 0.045 / rebound : 0; // first rebound about 4.5 cm

    // The 3D side of the plan selector follows the store (SCENE-23).
    const selected = store.get('selectedPlan');
    PLAN_IDS.forEach((p) => {
      s.choose[p] = p === selected ? 1 : 0;
      s.dim[p] = selected && p !== selected ? 1 : 0;
      s.tip[p] = 0;
    });
    s.chosen = selected;

    let tl: gsap.core.Timeline | null = null;
    ctx = gsap.context(() => {
      const ct = chapterTimeline(c, 'gravity', () => {
        c.world.rig.set(shot, cam.u);
        c.world.setWorld(0);
      });
      tl = ct.tl;
      // Camera: down to floor level with the fall (0-30), settle (30-46), hold.
      track(ct.tl, cam, { u: 2 / 3 }, 0, IMPACT);
      track(ct.tl, cam, { u: 1 }, IMPACT, CARDS_IN);
      s.fall = 0;
      s.bounce = 0;
      s.pool = 0;
      track(ct.tl, s, { fall: 1 }, 0, IMPACT);
      // Impact (FX-04): two bounces and a settle on `plate.drop`, started at its first touch-down
      // so the bar leaves the floor at once; shake, chalk and the pool of light.
      ct.beat(
        IMPACT,
        () => {
          oneShot(
            gsap
              .fromTo(s, { bounce: bounceHeight }, { bounce: 0, duration: dur.slow / Math.max(0.2, 1 - touch), ease: ease.drop, overwrite: 'auto' })
              .progress(touch),
          );
          oneShot(gsap.to(s, { pool: 1, duration: dur.slow, ease: ease.out, overwrite: 'auto' }));
          impact(c.world, { shake: 0.008, burst: 0.9 });
        },
        () => {
          gsap.killTweensOf(s, 'bounce');
          s.bounce = 0;
          oneShot(gsap.to(s, { pool: 0, duration: dur.quick, ease: ease.in, overwrite: 'auto' }));
        },
      );

      // Cards arrive from depth after the impact and leave along the inline axis.
      const arrivals = [legend, ...cards].filter((el): el is HTMLElement => el !== null);
      // Depth only: rotation stays free for the plan cards' hover tilt (UI-05).
      gsap.set(arrivals, { opacity: 0, z: -distance.lg, transformPerspective: 600 });
      arrivals.forEach((el, i) => {
        track(ct.tl, el, { opacity: 1, z: 0 }, 36 + i * 1.5, 41 + i * 1.5);
        track(ct.tl, el, { opacity: 0, x: -distance.md }, 90 + i, 93 + i);
      });

      revealAt(ct, title, 4, true);
      revealAt(ct, body, 6);
      // Portrait: the copy and the cards share the bottom 45 %, so the copy leaves first.
      exitAt(ct, title, c.portrait ? 32 : 91);
      exitAt(ct, body, c.portrait ? 33 : 92);
      registerChapterRest('gravity', REST);
    }, c.section);

    // A plan card focused before the cards have arrived brings the chapter to its rest frame.
    if (c.panel) {
      const onFocus = (): void => {
        if (tl && tl.progress() * 100 < CARDS_IN) scroll.to(chapterRestY('gravity'), { immediate: c.reduced });
      };
      c.panel.addEventListener('focusin', onFocus);
      offs.push(() => c.panel?.removeEventListener('focusin', onFocus));
    }

    // Hover and focus tip the plate forward and light its ring.
    offs.push(
      store.on('planFocus', (plan, previous) => {
        if (previous) gsap.to(s.tip, { [previous]: 0, duration: dur.base, ease: ease.out, overwrite: 'auto' });
        if (plan) gsap.to(s.tip, { [plan]: 1, duration: dur.base, ease: ease.out, overwrite: 'auto' });
      }),
    );
    // Choosing rolls the plate onto the sleeve (a one-shot) and dims the other two.
    offs.push(
      store.on('selectedPlan', (plan, previous) => {
        s.chosen = plan;
        if (previous) oneShot(gsap.to(s.choose, { [previous]: 0, duration: dur.slow, ease: ease.inOut, overwrite: 'auto' }));
        PLAN_IDS.forEach((p: PlanId) => {
          oneShot(gsap.to(s.dim, { [p]: plan && p !== plan ? 1 : 0, duration: dur.base, ease: ease.out, overwrite: 'auto' }));
        });
        if (plan) {
          oneShot(
            gsap.to(s.choose, {
              [plan]: 1,
              duration: dur.cinematic,
              ease: ease.inOut,
              overwrite: 'auto',
              onComplete: () => impact(c.world, { shake: 0.004, burst: 0.45 }),
            }),
          );
        }
      }),
    );

    // Landscape: each card follows its plate's projected position (at most 64 px either way),
    // through the CSS `translate` property so GSAP's own x stays free for the exit.
    if (!c.portrait && c.panel) {
      const camera = c.world.camera;
      const v = new Vector3();
      let centres = cards.map(() => 0);
      const layout = (): void => {
        const left = c.panel?.getBoundingClientRect().left ?? 0;
        centres = cards.map((card) => left + card.offsetLeft + card.offsetWidth / 2);
      };
      layout();
      ScrollTrigger.addEventListener('refresh', layout);
      offs.push(() => {
        ScrollTrigger.removeEventListener('refresh', layout);
        cards.forEach((card) => (card.style.translate = ''));
      });
      offs.push(
        loop.onUpdate(() => {
          const p = tl ? tl.progress() * 100 : 0;
          if (p < 34 || p > 90) return;
          camera.updateMatrixWorld();
          cards.forEach((_, i) => {
            v.set(G.x + PLAN_STAND.x[i], 0, G.z + PLAN_STAND.z).project(camera);
            const x = ((v.x + 1) / 2) * c.world.size.width; // cached size, no layout read (PERF-05)
            // Whole pixels: no sub-pixel shimmer on the text, and a still card stays still.
            cards[i].style.translate = `${Math.round(gsap.utils.clamp(-distance.lg, distance.lg, x - centres[i]))}px 0`;
          });
        }),
      );
    }
  },
  dispose() {
    offs.forEach((off) => off());
    offs = [];
    ctx?.revert();
    ctx = null;
    unregisterChapterTrigger('gravity');
    document.querySelectorAll<HTMLElement>('#gravity .title, #gravity .body').forEach(forgetRevealer);
  },
};
