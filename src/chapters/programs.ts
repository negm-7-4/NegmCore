// src/chapters/programs.ts — chapter 4, Programs (SCENE-18, SCENE-19). White world.
// The camera flies on along +X; three stations (barbell, kettlebell, dumbbell) pass on the
// inline-end side, one per third. In each third the object turns into its hero pose while
// the camera approaches (0-34 %), both hold (34-70 %, at least 30 % of the third and 12 % of
// the chapter), then the camera passes (70-100 %). Each card arrives from depth with a 3D tilt,
// holds, and leaves toward the camera. The intro line shows only before the first station.
// UI-10: the station in view can be dragged round (Draggable + InertiaPlugin on fine pointers)
// or turned with the arrow keys; released, it returns to its hero pose on `iron.settle`.
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { device } from '../core/device';
import { ZONE } from '../gl/props';
import { Shot, type PoseDef } from '../gl/rig';
import { forgetRevealer } from '../motion/text';
import { distance, dur, ease } from '../motion/tokens';
import { exitAt, chapterTimeline, registerChapterRest, revealAt, track, unregisterChapterTrigger, type ChapterContext, type ChapterModule } from './context';
import { igniteSettled } from './ignite';

let ctx: gsap.Context | null = null;
let offs: Array<() => void> = [];
const P = ZONE.programs.x;
/** Radians of turn per pixel dragged, and per arrow-key press. */
const TURN_PER_PX = 0.01;
const TURN_PER_KEY = 0.35;
const THIRD = 100 / 3;

// The camera keeps looking down the path (+X), so the stations still ahead stay between the
// copy column and the current object and never cross the copy. Hold: the camera pitches onto
// the object, which sits near 70 % of the width (portrait: centred, the copy is below). Pass: the
// camera has gone by and the object has left on the inline-end side.
const HOLD_D = [1.95, 2.25, 1.75]; // per object: the barbell is long, the kettlebell is tall
const HOLD_D_PORTRAIT = [2.5, 2.85, 2.7];
const HOLD_Y = [-0.02, 0.06, -0.06]; // object centre heights

function stationPoses(k: number, portrait: boolean): { hold: PoseDef; pass: PoseDef } {
  const sx = P + 3 + k * 3;
  const d = portrait ? HOLD_D_PORTRAIT[k] : HOLD_D[k];
  const h = portrait ? 0.34 : 0.3;
  const z = 0.62 - d * (portrait ? 0.025 : 0.18);
  const pitch = (h - HOLD_Y[k]) / d; // look 3 m ahead at the object's slope
  return {
    hold: { pos: [sx - d, h, z], look: [sx - d + 3, h - 3 * pitch, z], fov: 32 },
    pass: { pos: [sx + 0.4, h + 0.02, portrait ? 0.1 : 0], look: [sx + 4.4, 0.06, portrait ? 0.1 : 0], fov: 32 },
  };
}

/** The pose orbit's crane starts from (SCENE-05). */
export function programsEnd(portrait: boolean): PoseDef {
  return stationPoses(2, portrait).pass;
}

export const programs: ChapterModule = {
  id: 'programs',
  build(c: ChapterContext) {
    const intro = [...c.section.querySelectorAll<HTMLElement>('.programs-intro > *')];
    const cards = [...c.section.querySelectorAll<HTMLElement>('.program')];
    const hint = c.panel?.querySelector<HTMLElement>('.drag-hint') ?? null;
    const keys: PoseDef[] = [igniteSettled(c.portrait)];
    for (let k = 0; k < 3; k += 1) {
      const { hold, pass } = stationPoses(k, c.portrait);
      keys.push(hold, pass);
    }
    const shot = new Shot(keys);
    const cam = { u: 0 };
    const s = c.props.programs.state;

    ctx = gsap.context(() => {
      const ct = chapterTimeline(c, 'programs', () => {
        c.world.rig.set(shot, cam.u);
        c.world.setWorld(1); // programs is all white; a jump back from a black chapter lands here
      });
      const { tl } = ct;
      s.turn.fill(0);
      if (hint) gsap.set(hint, { autoAlpha: 0 });
      // Depth and tilt stay inside the motion tokens (DOM tilt <= 8°, distances <= 64 px); a
      // short perspective makes 64 px of depth read clearly.
      gsap.set(cards, { opacity: 0, z: -distance.lg, rotationY: distance.tiltMaxDeg, rotationX: distance.tiltMaxDeg / 2, transformOrigin: '0% 50%', transformPerspective: 400 });
      for (let k = 0; k < 3; k += 1) {
        const t0 = k * THIRD;
        const at = (f: number): number => t0 + f * THIRD;
        // Camera: approach, hold, pass. Position tracks are linear in scroll (SCENE-03).
        track(tl, cam, { u: (2 * k + 1) / 6 }, at(0), at(0.34));
        track(tl, cam, { u: (2 * k + 2) / 6 }, at(0.7), at(1));
        // The object turns into its hero pose as the camera arrives.
        tl.to(s.turn, { [k]: 1, duration: at(0.34) - at(0.04), ease: 'none' }, at(0.04));
        // The card arrives from depth with a 3D tilt, holds, and leaves toward the camera.
        const card = cards[k];
        if (card) {
          track(tl, card, { opacity: 1, z: 0, rotationY: 0, rotationX: 0 }, at(0.16), at(0.34));
          track(tl, card, { opacity: 0, z: distance.lg, rotationY: -distance.tiltMaxDeg }, at(0.7), at(0.84));
        }
        // The drag hint belongs to the hold only.
        if (hint) {
          track(tl, hint, { autoAlpha: 1 }, at(0.34), at(0.4));
          track(tl, hint, { autoAlpha: 0 }, at(0.64), at(0.7));
        }
      }
      // The intro line exists only before the first station (SCENE-19).
      intro.forEach((el, i) => {
        revealAt(ct, el, 1 + i * 1.5, i === 0);
        exitAt(ct, el, 9 + i);
      });
      registerChapterRest('programs', (0.34 + 0.7) / 2 / 3);

      // ---------- UI-10: turn the station in view ----------
      const proxy = c.panel?.querySelector<HTMLElement>('.drag-proxy') ?? null;
      const station = (): number => Math.min(2, Math.max(0, Math.floor(tl.progress() * 3)));
      // The proxy is a slider for assistive technology: its value is the turn in degrees.
      const report = (k: number): void => proxy?.setAttribute('aria-valuenow', String(Math.round((s.drag[k] * 180) / Math.PI)));
      const settle = (k: number): void => {
        gsap.to(s.drag, { [k]: 0, duration: dur.slow, ease: ease.settle, overwrite: 'auto', onComplete: () => report(k) });
      };
      if (proxy && device.finePointer && !c.reduced) {
        // Draggable drives a detached point; its x becomes the station's extra turn.
        const point = document.createElement('div');
        let k = 0;
        const [drag] = Draggable.create(point, {
          type: 'x',
          trigger: proxy,
          inertia: true,
          cursor: 'none',
          onPress() {
            k = station();
            gsap.killTweensOf(s.drag);
            gsap.set(point, { x: s.drag[k] / TURN_PER_PX });
            this.update();
          },
          onDrag() {
            s.drag[k] = this.x * TURN_PER_PX;
            report(k);
          },
          onThrowUpdate() {
            s.drag[k] = this.x * TURN_PER_PX;
          },
          onRelease() {
            if (!this.isThrowing) settle(k);
          },
          onThrowComplete() {
            settle(k);
          },
        });
        offs.push(() => drag.kill());
      }
      if (proxy) {
        const onKey = (e: KeyboardEvent): void => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const k = station();
          gsap.to(s.drag, { [k]: `${e.key === 'ArrowLeft' ? '-' : '+'}=${TURN_PER_KEY}`, duration: dur.quick, ease: ease.out, overwrite: 'auto', onComplete: () => report(k) });
        };
        const onKeyUp = (e: KeyboardEvent): void => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') gsap.delayedCall(dur.quick, () => settle(station()));
        };
        proxy.addEventListener('keydown', onKey);
        proxy.addEventListener('keyup', onKeyUp);
        offs.push(() => {
          proxy.removeEventListener('keydown', onKey);
          proxy.removeEventListener('keyup', onKeyUp);
        });
      }
    }, c.section);
  },
  dispose() {
    offs.forEach((off) => off());
    offs = [];
    ctx?.revert();
    ctx = null;
    unregisterChapterTrigger('programs');
    document.querySelectorAll<HTMLElement>('#programs .programs-intro > *').forEach(forgetRevealer);
  },
};
