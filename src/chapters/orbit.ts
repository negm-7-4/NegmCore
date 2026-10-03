// src/chapters/orbit.ts — chapter 5, Orbit (SCENE-20, SCENE-21, FX-02). White to black.
// 0-34: the camera cranes up from the last station to a top-down view of the orbit zone while
// the six plates come out ring by ring. 34-42: the SVG rings draw themselves over the orbits and
// the three labels arrive, pinned to their plates by projecting them every frame. 42-56: hold.
// 56-62: copy, labels and rings leave. 60-93: the camera centres the Core and sinks a little
// while the Collapse sweep (67-93) takes the world back to black from the bottom.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type PerspectiveCamera, Vector3 } from 'three';
import { loop } from '../core/loop';
import { ZONE } from '../gl/props';
import { PORTRAIT_FOV, Shot, frameViewport, makePose, type PoseDef } from '../gl/rig';
import { forgetRevealer } from '../motion/text';
import { distance } from '../motion/tokens';
import { chapterTimeline, exitAt, registerChapterRest, revealAt, track, unregisterChapterTrigger, type ChapterContext, type ChapterModule } from './context';
import { programsEnd } from './programs';

let ctx: gsap.Context | null = null;
let stopPin: (() => void) | null = null;
let onRefreshInit: (() => void) | null = null;

const O = ZONE.orbit;
const HOLD_U = 2 / 3;
const PLATE_R = 0.225;

/** Orbit's last pose: top-down, the Core in the centre of the frame. Gravity starts here (SCENE-05). */
export function orbitEnd(portrait: boolean): PoseDef {
  return portrait ? { pos: [O.x - 0.4, 9.4, 0], look: [O.x, 0, 0], fov: 32 } : { pos: [O.x - 0.3, 6, 0], look: [O.x, 0, 0], fov: 32 };
}

function orbitShot(portrait: boolean): Shot {
  // Looking down with a small -X offset keeps "up" on screen pointing along the path (+X),
  // so the crane never rolls the frame. Landscape keeps the Core right of the copy column.
  const crane: PoseDef = portrait ? { pos: [O.x - 4.5, 3.6, -0.1], look: [O.x, 0, 0], fov: 32 } : { pos: [O.x - 4.5, 2.8, -0.7], look: [O.x, 0, -0.8], fov: 32 };
  // The outer ring with its plates spans 3.53 m. Portrait: it fits about 85 % of a 390 px
  // width. Landscape: the Core sits at 69 % of the width, the rings clear the copy column.
  const top: PoseDef = portrait ? { pos: [O.x - 0.5, 10.8, 0], look: [O.x, 0, 0], fov: 32 } : { pos: [O.x - 0.4, 7.8, -1.36], look: [O.x, 0, -1.36], fov: 32 };
  return new Shot([programsEnd(portrait), crane, top, orbitEnd(portrait)]);
}

interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Screen pixels per metre at the ring plane. */
  scale: number;
}

export const orbit: ChapterModule = {
  id: 'orbit',
  build(c: ChapterContext) {
    const title = c.section.querySelector<HTMLElement>('.title');
    const body = c.section.querySelector<HTMLElement>('.body');
    const rings = [...c.section.querySelectorAll<SVGEllipseElement>('.orbit-ring')];
    const labels = [...c.section.querySelectorAll<HTMLElement>('.orbit-label')];
    const inks = labels.map((l) => l.firstElementChild as HTMLElement);
    const shot = orbitShot(c.portrait);
    const cam = { u: 0 };
    const s = c.props.orbit.state;
    const sweep = { w: 1 };
    const pin = { on: 0 };
    const { radii, anchors } = c.props.orbit;
    const camera = c.world.camera;
    const canvas = c.world.renderer.domElement;
    const v = new Vector3();
    const ellipses: Ellipse[] = radii.map(() => ({ cx: 0, cy: 0, rx: 0, ry: 0, scale: 1 }));
    const setX = labels.map((l) => gsap.quickSetter(l, 'x', 'px') as (value: number) => void);
    const setY = labels.map((l) => gsap.quickSetter(l, 'y', 'px') as (value: number) => void);
    let widths = labels.map(() => 0); // read on refresh, never inside the frame loop
    let height = 0;
    let leftLimit = 0;
    let rightLimit = 0;
    const copy = c.section.querySelector<HTMLElement>('.copy');
    const at = labels.map(() => ({ x: 0, y: 0 }));

    const toScreen = (cm: PerspectiveCamera, x: number, z: number): Vector3 => {
      v.set(x, 0, z).project(cm);
      v.x = ((v.x + 1) / 2) * canvas.clientWidth;
      v.y = ((1 - v.y) / 2) * canvas.clientHeight;
      return v;
    };
    const measure = (cm: PerspectiveCamera): void => {
      radii.forEach((r, i) => {
        const e = ellipses[i];
        const cx = toScreen(cm, O.x, O.z);
        e.cx = cx.x;
        e.cy = cx.y;
        const xr = toScreen(cm, O.x, O.z + r).x;
        const xl = toScreen(cm, O.x, O.z - r).x;
        const yt = toScreen(cm, O.x + r, O.z).y;
        const yb = toScreen(cm, O.x - r, O.z).y;
        e.rx = Math.abs(xr - xl) / 2;
        e.ry = Math.abs(yb - yt) / 2;
        e.scale = e.rx / r;
      });
    };
    const paint = (): void => {
      rings.forEach((ring, i) => {
        const e = ellipses[i];
        ring.setAttribute('cx', e.cx.toFixed(1));
        ring.setAttribute('cy', e.cy.toFixed(1));
        ring.setAttribute('rx', e.rx.toFixed(1));
        ring.setAttribute('ry', e.ry.toFixed(1));
      });
    };
    // DrawSVG measures each ring's length when its tween (re)starts, so the rings are laid out at
    // the hold pose before every refresh; per-frame updates then only follow parallax (tiny).
    const holdCamera = (): void => {
      const pose = shot.evaluate(HOLD_U, makePose());
      const cm = camera.clone();
      cm.position.copy(pose.pos);
      cm.up.set(0, 1, 0);
      cm.lookAt(pose.look);
      // The live camera may not be sized yet at build time; size the copy from the canvas.
      const portrait = frameViewport(cm, canvas.clientWidth, canvas.clientHeight);
      cm.fov = pose.fov * (portrait ? PORTRAIT_FOV : 1);
      cm.updateProjectionMatrix();
      cm.updateMatrixWorld();
      measure(cm);
      paint();
      widths = labels.map((l) => l.offsetWidth);
      height = labels[0]?.offsetHeight ?? 0;
      // Labels never cross the copy column (landscape) or the screen edge (portrait).
      leftLimit = !portrait && copy ? copy.getBoundingClientRect().right + distance.md : distance.md;
      rightLimit = canvas.clientWidth - (portrait ? distance.md : distance.lg + distance.md); // clear of the rail
    };
    holdCamera();

    ctx = gsap.context(() => {
      const ct = chapterTimeline(c, 'orbit', () => {
        c.world.rig.set(shot, cam.u);
        c.world.setWorld(sweep.w, -1);
      });
      const { tl } = ct;
      // 0-34 crane to top-down; 42-56 hold; 60-93 centre the Core and sink (SCENE-02 holds).
      track(tl, cam, { u: HOLD_U }, 0, 34);
      track(tl, cam, { u: 1 }, 60, 93);
      // The plates come out ring by ring (props: scale = show * 3 - ring).
      s.show = 0;
      track(tl, s, { show: 1 }, 8, 30);
      // Rings draw over the orbits, inner first, and leave before the sweep (SCENE-04).
      gsap.set(rings, { drawSVG: '0%' });
      rings.forEach((ring, i) => {
        track(tl, ring, { drawSVG: '100%' }, 32 + i * 2, 38 + i * 2);
        track(tl, ring, { drawSVG: '100% 100%' }, 56 + i, 60 + i);
      });
      // Labels arrive along depth, leave along the inline axis, gone well before 67.
      gsap.set(inks, { autoAlpha: 0, scale: 0.9 });
      inks.forEach((ink, i) => {
        track(tl, ink, { autoAlpha: 1, scale: 1 }, 37 + i * 1.5, 40 + i * 1.5);
        track(tl, ink, { autoAlpha: 0, x: -distance.sm }, 56 + i, 58 + i);
      });
      track(tl, pin, { on: 1 }, 30, 30.01);
      track(tl, pin, { on: 0 }, 62, 62.01);
      // Collapse (FX-02, SCENE-21): black returns from the bottom; the Core stays lit centre.
      track(tl, sweep, { w: 0 }, 67, 93);

      revealAt(ct, title, 3, true);
      revealAt(ct, body, 5);
      exitAt(ct, title, 54);
      exitAt(ct, body, 55);
      registerChapterRest('orbit', 0.49);
    }, c.section);
    onRefreshInit = holdCamera;
    ScrollTrigger.addEventListener('refreshInit', holdCamera);

    // Pin the rings and labels to the 3D scene every frame while they are on screen.
    const unpin = loop.onUpdate(() => {
      if (pin.on < 0.5) return;
      camera.updateMatrixWorld();
      measure(camera);
      paint();
      anchors.forEach((anchor, i) => {
        if (!labels[i]) return;
        const p = toScreen(camera, O.x + anchor.position.x, O.z + anchor.position.z);
        const gap = PLATE_R * ellipses[i].scale + distance.xs;
        const w = widths[i];
        const a = at[i];
        // Labels sit on the side away from the Core, unless that side runs out of room.
        const right = p.x >= ellipses[i].cx ? p.x + gap + w < rightLimit : p.x - gap - w < leftLimit;
        a.x = right ? p.x + gap : p.x - gap - w;
        a.y = p.y;
        // Two labels never overlap: a later one steps clear of an earlier one.
        for (let j = 0; j < i; j += 1) {
          const b = at[j];
          const overlapX = a.x < b.x + widths[j] && b.x < a.x + w;
          if (overlapX && Math.abs(a.y - b.y) < height) a.y = b.y + (a.y >= b.y ? 1 : -1) * (height + distance.xs / 2);
        }
        setX[i](a.x);
        setY[i](a.y);
      });
    });
    // The pinning writes transforms and ring geometry outside the gsap context: undo them here,
    // so static mode (or a rebuild) never inherits a projected position.
    stopPin = () => {
      unpin();
      gsap.set(labels, { clearProps: 'transform' });
      rings.forEach((ring) => ['cx', 'cy', 'rx', 'ry'].forEach((a) => ring.removeAttribute(a)));
    };
  },
  dispose() {
    if (onRefreshInit) ScrollTrigger.removeEventListener('refreshInit', onRefreshInit);
    onRefreshInit = null;
    stopPin?.();
    stopPin = null;
    ctx?.revert();
    ctx = null;
    unregisterChapterTrigger('orbit');
    document.querySelectorAll<HTMLElement>('#orbit .title, #orbit .body').forEach(forgetRevealer);
  },
};
