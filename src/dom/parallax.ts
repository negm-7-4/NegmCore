// src/dom/parallax.ts — pointer parallax on the camera (SCENE-11, MOTION-08).
// An additive channel on the rig (GL-15): at most 0.04 rad, quickTo-smoothed, fine pointers
// only, off under reduced motion, back to zero when the pointer leaves the window.
import { gsap } from 'gsap';
import { device } from '../core/device';
import { store } from '../core/store';
import type { Rig } from '../gl/rig';
import { dur, ease } from '../motion/tokens';

const MAX = 0.04;

export function mountParallax(rig: Rig): () => void {
  if (!device.finePointer || device.qa) return () => undefined;
  const toX = gsap.quickTo(rig.parallax, 'x', { duration: dur.slow, ease: ease.out });
  const toY = gsap.quickTo(rig.parallax, 'y', { duration: dur.slow, ease: ease.out });
  const onMove = (event: PointerEvent): void => {
    if (store.get('reducedMotion') || event.pointerType !== 'mouse') return;
    const nx = (event.clientX / window.innerWidth) * 2 - 1;
    const ny = (event.clientY / window.innerHeight) * 2 - 1;
    toX(-nx * MAX);
    toY(-ny * MAX * 0.6);
  };
  const onLeave = (): void => {
    toX(0);
    toY(0);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    gsap.set(rig.parallax, { x: 0, y: 0 });
  };
}
