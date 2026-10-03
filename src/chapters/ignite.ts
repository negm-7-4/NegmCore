// src/chapters/ignite.ts — chapter 3, the Bore Shot (SCENE-15..17, FX-01, FX-02, FX-07).
// 0-35: the camera swings onto the bar's axis beyond the +X sleeve end; the outer plate slides
// off toward the camera and the Core lights behind its bore. 35-72: the camera dollies through
// the 50 mm bore while the FOV opens and the Ignite sweep turns the world white; exposure and
// bloom peak as the plate's plane is crossed. At peak white (72) the camera continues in the
// programs zone — the only cut, hidden inside the flash. 72-86 settle, 86-100 hold.
import { gsap } from 'gsap';
import { ZONE } from '../gl/props';
import { Shot, type PoseDef } from '../gl/rig';
import { forgetRevealer } from '../motion/text';
import { ease } from '../motion/tokens';
import { massShot } from './mass';
import { chapterTimeline, exitAt, registerChapterRest, revealAt, track, unregisterChapterTrigger, type ChapterContext, type ChapterModule } from './context';

let ctx: gsap.Context | null = null;

const P = ZONE.programs.x;
const CUT = 72;

/** The first pose after the cut, and the settled pose the programs chapter starts from. */
export function igniteSettled(portrait: boolean): PoseDef {
  return portrait
    ? { pos: [P - 1.2, 0.36, -0.2], look: [P + 3.4, 0.08, 0.55], fov: 32 }
    : { pos: [P - 1.4, 0.3, -0.3], look: [P + 3, 0.08, -0.3], fov: 32 };
}

export const ignite: ChapterModule = {
  id: 'ignite',
  build(c: ChapterContext) {
    const title = c.section.querySelector<HTMLElement>('.title');
    const body = c.section.querySelector<HTMLElement>('.body');
    const from = massShot(c.portrait).last();
    const axisBack = c.portrait ? 3.1 : 2.4;
    // Part A: in the origin zone, on the bar's axis, through the bore.
    const shotA = new Shot([
      from,
      { pos: [axisBack, 0.0, 0.0], look: [0.6, 0, 0], fov: 32 },
      { pos: [1.7, 0.0, 0.0], look: [0.6, 0, 0], fov: 40 },
      { pos: [1.42, 0.0, 0.0], look: [0.6, 0, 0], fov: 58 },
    ]);
    // Part B: after the cut, flying on in the white world toward the first station.
    const settled = igniteSettled(c.portrait);
    const shotB = new Shot([{ pos: [settled.pos[0] - 1.6, settled.pos[1], settled.pos[2]], look: settled.look, fov: 58 }, settled]);
    const cam = { a: 0, b: 0 };
    const s = c.props.origin.state;
    const core = c.props.origin.core;
    const fx = c.world.post.fx;
    const sweep = { w: 0 };
    const flash = { exposure: 1, bloom: 0, ca: 0, white: 0 };

    ctx = gsap.context(() => {
      const ct = chapterTimeline(c, 'ignite', (p) => {
        if (p * 100 < CUT) c.world.rig.set(shotA, cam.a);
        else c.world.rig.set(shotB, cam.b);
        c.world.setWorld(sweep.w, 1);
        fx.exposure = flash.exposure;
        fx.bloom = flash.bloom;
        fx.aberration = c.reduced ? 0 : flash.ca;
        fx.flash = flash.white;
      });
      const { tl } = ct;
      // 0-35: swing onto the axis; release the outer plate; the Core lights in the bore.
      track(tl, cam, { a: 1 / 3 }, 0, 20);
      s.release = 0;
      s.coreOn = 0;
      track(tl, s, { release: 1 }, 14, 30);
      track(tl, s, { coreOn: 1 }, 20, 30);
      // 35-72: dolly through the bore, FOV 32 -> 58; cross the plate plane near 59.
      track(tl, cam, { a: 2 / 3 }, 35, 50);
      track(tl, cam, { a: 1 }, 50, CUT);
      // Ignite sweep: white enters from the bottom; mid-sweep at the crossing (FX-02).
      track(tl, sweep, { w: 1 }, 48, 70);
      // Flash (FX-01): one monotonic ramp up to the crossing, one ramp down after the cut.
      track(tl, flash, { exposure: 3.4, bloom: 2.2, ease: ease.in }, 50, 62);
      track(tl, flash, { exposure: 1, bloom: 0, ease: ease.out }, 74, 86);
      // The white-out peaks at the cut and is held across it: the cut is invisible.
      track(tl, flash, { white: 1, ease: ease.in }, 63, 70);
      track(tl, flash, { white: 0, ease: ease.out }, 74, 84);
      track(tl, flash, { ca: 0.006 }, 54, 59);
      track(tl, flash, { ca: 0 }, 59, 68);
      // The Core brightens with the bore shot (FX-07) and returns after the cut.
      core.intensity.value = 1;
      track(tl, core.intensity, { value: 3 }, 50, 66);
      track(tl, core.intensity, { value: 1 }, 74, 80);
      // 72-86: settle in the white world; 86-100: hold (SCENE-02).
      track(tl, cam, { b: 1 }, CUT, 86);

      revealAt(ct, title, 3, true);
      revealAt(ct, body, 5);
      exitAt(ct, title, 24);
      exitAt(ct, body, 25);
      registerChapterRest('ignite', 0.27);
    }, c.section);
  },
  dispose() {
    ctx?.revert();
    ctx = null;
    unregisterChapterTrigger('ignite');
    document.querySelectorAll<HTMLElement>('#ignite .title, #ignite .body').forEach(forgetRevealer);
  },
};
