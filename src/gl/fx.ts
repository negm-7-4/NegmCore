// src/gl/fx.ts — impact one-shots shared by chapters (FX-04): a camera shake of at most
// 0.01 rad with the `rattle` ease, and a chalk burst. Object motion and the counter/state
// change belong to the calling chapter. In QA both settle at once (QA-02).
import { gsap } from 'gsap';
import { device } from '../core/device';
import { store } from '../core/store';
import { dur, ease } from '../motion/tokens';
import type { World } from './world';

export interface ImpactOptions {
  /** Shake amplitude in radians; clamped to 0.01. */
  shake?: number;
  /** Chalk burst strength, 0..1. */
  burst?: number;
}

export function impact(world: World, { shake = 0.006, burst = 0.6 }: ImpactOptions = {}): void {
  if (store.get('reducedMotion')) return; // ACCESS-01: no shake, no bursts
  // A wiggle ease oscillates around the start value and returns to it: tween 0 -> amplitude.
  const s = gsap.fromTo(world.rig.shake, { amp: 0 }, { amp: Math.min(shake, 0.01), duration: dur.slow, ease: ease.rattle, overwrite: 'auto' });
  const b = gsap.fromTo(world.motes.burst, { value: burst }, { value: 0, duration: dur.cinematic, ease: ease.out, overwrite: 'auto' });
  if (device.qa) {
    s.progress(1);
    b.progress(1);
  }
}

/** Plays a one-shot tween, or completes it at once in QA. */
export function oneShot<T extends gsap.core.Animation>(anim: T): T {
  if (device.qa) anim.progress(1);
  return anim;
}

/** One polite live region for the form result and the final load value (ACCESS-04). */
export function announce(text: string): void {
  if (!document.documentElement.classList.contains('is-ready')) return;
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  gsap.delayedCall(0.05, () => {
    live.textContent = text;
  });
}
