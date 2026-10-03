// src/core/resize.ts — resize lifecycle (MOTION-10). ScrollTrigger debounces its own refresh;
// this waits for the same quiet moment (a delayedCall on the one clock, no setTimeout) and
// ends the resize with a short settle on the camera, so the new framing eases into place.
import { gsap } from 'gsap';
import type { Rig } from '../gl/rig';
import { dur, ease } from '../motion/tokens';
import { device } from './device';
import { store } from './store';

export function mountResizeSettle(rig: Rig): () => void {
  const settle = gsap.delayedCall(dur.quick, () => {
    if (device.qa || store.get('reducedMotion')) return;
    gsap.fromTo(rig.fovBoost, { value: 1.5 }, { value: 0, duration: dur.base, ease: ease.settle, overwrite: 'auto' });
  }).pause();
  const onResize = (): void => {
    settle.restart(true); // debounced: every resize event pushes the settle back
  };
  window.addEventListener('resize', onResize, { passive: true });
  return () => {
    window.removeEventListener('resize', onResize);
    settle.kill();
  };
}
