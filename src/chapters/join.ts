// src/chapters/join.ts — chapter 7, Join (SCENE-24, SCENE-25, FX-04, FX-07). Black world.
// 0-44: the bar lifts off the floor, the chosen plan's second plate slides onto the other sleeve,
// the collars come on, and the camera rises to the hero's framing around the lifted bar while
// the Core comes up behind it. 40-50: the bar starts its slow roll. 46-58: the closing line and
// the form arrive (plan preselected by form.ts). 58-100: hold. A valid booking spins and locks
// the collars, pulses the Core once and shakes the frame a little (one-shot).
import { gsap } from 'gsap';
import { scroll } from '../core/scroll';
import { store } from '../core/store';
import { impact, oneShot } from '../gl/fx';
import { ZONE } from '../gl/props';
import { PLATE } from '../gl/models/plate';
import { Shot, type PoseDef } from '../gl/rig';
import { forgetRevealer } from '../motion/text';
import { distance, dur, ease } from '../motion/tokens';
import { chapterRestY, chapterTimeline, exitAt, registerChapterRest, revealAt, track, unregisterChapterTrigger, type ChapterContext, type ChapterModule } from './context';
import { gravitySettled } from './gravity';

let ctx: gsap.Context | null = null;
let offs: Array<() => void> = [];

const G = ZONE.gravity;
/** Bar height once lifted (props: y = rest + lift * 0.68). */
const BY = PLATE.radius + 0.68;

function joinShot(portrait: boolean): Shot {
  // The hero's framing (hero.ts), re-centred on the lifted bar.
  const end: PoseDef = portrait ? { pos: [G.x, BY + 0.35, 6.2], look: [G.x, BY + 0.02, 0], fov: 32 } : { pos: [G.x, BY + 0.28, 3.3], look: [G.x, BY + 0.58, 0], fov: 32 };
  const rise: PoseDef = portrait ? { pos: [G.x + 0.4, BY + 0.5, 6.8], look: [G.x, BY * 0.6, 0.3], fov: 32 } : { pos: [G.x + 0.4, BY + 0.45, 4.4], look: [G.x, BY * 0.7 + 0.25, 0.4], fov: 32 };
  return new Shot([gravitySettled(portrait), rise, end]);
}

export const join: ChapterModule = {
  id: 'join',
  build(c: ChapterContext) {
    const title = c.section.querySelector<HTMLElement>('.title');
    const parts = c.panel ? [...c.panel.querySelectorAll<HTMLElement>('.join-form > *')].filter((el) => !el.classList.contains('form-status')) : [];
    const shot = joinShot(c.portrait);
    const cam = { u: 0 };
    const s = c.props.gravity.state;
    const core = c.props.gravity.core;

    let tl: gsap.core.Timeline | null = null;
    ctx = gsap.context(() => {
      const ct = chapterTimeline(c, 'join', () => {
        c.world.rig.set(shot, cam.u);
        c.world.setWorld(0);
      });
      tl = ct.tl;
      track(ct.tl, cam, { u: 1 }, 0, 44);
      s.lift = 0;
      s.mirror = 0;
      s.collar = 0;
      s.collarSpin = Math.PI * 6;
      s.roll = 0;
      s.coreOn = 0;
      s.lay = 0;
      track(ct.tl, s, { lift: 1 }, 6, 40);
      track(ct.tl, s, { lay: 1 }, 8, 24); // the plates left standing are set down
      track(ct.tl, s, { mirror: 1 }, 22, 36);
      track(ct.tl, s, { collar: 1 }, 34, 44);
      track(ct.tl, s, { collarSpin: 0 }, 34, 44);
      track(ct.tl, s, { roll: 1 }, 40, 50);
      track(ct.tl, s, { coreOn: 1 }, 12, 40);

      // The form arrives from depth after the closing line; it holds to the end of the page.
      gsap.set(parts, { opacity: 0, z: -distance.lg, transformPerspective: 600 });
      // Portrait: the closing line and the form share the lower screen, so the line plays
      // first (44-54) and the form follows; landscape keeps both.
      const formAt = c.portrait ? 56 : 48;
      parts.forEach((el, i) => track(ct.tl, el, { opacity: 1, z: 0 }, formAt + i * 1.5, formAt + 5 + i * 1.5));
      revealAt(ct, title, c.portrait ? 44 : 46, true);
      if (c.portrait) exitAt(ct, title, 54);
      registerChapterRest('join', 0.8);
    }, c.section);

    // A form field focused before the form has arrived brings the chapter to its rest frame.
    if (c.panel) {
      const onFocus = (): void => {
        if (tl && tl.progress() < (c.portrait ? 0.66 : 0.58)) scroll.to(chapterRestY('join'), { immediate: c.reduced });
      };
      c.panel.addEventListener('focusin', onFocus);
      offs.push(() => c.panel?.removeEventListener('focusin', onFocus));
    }

    // A valid booking (SCENE-25): the collars spin and lock, the Core pulses once (FX-07).
    offs.push(
      store.on('booking', (state) => {
        if (state !== 'done') return;
        const lock = gsap.timeline();
        lock.fromTo(s, { collarSpin: Math.PI * 4 }, { collarSpin: 0, duration: dur.slow, ease: ease.out });
        lock.fromTo(s, { collarSpin: 0 }, { collarSpin: 0.18, duration: dur.slow, ease: ease.rattle });
        lock.call(() => impact(c.world, { shake: 0.004, burst: 0.6 }));
        oneShot(lock);
        const pulse = gsap.timeline();
        pulse.to(core.intensity, { value: 3, duration: dur.base, ease: ease.out });
        pulse.to(core.intensity, { value: 1, duration: dur.slow, ease: ease.inOut });
        oneShot(pulse);
      }),
    );
  },
  dispose() {
    offs.forEach((off) => off());
    offs = [];
    ctx?.revert();
    ctx = null;
    unregisterChapterTrigger('join');
    document.querySelectorAll<HTMLElement>('#join .title').forEach(forgetRevealer);
  },
};
