// src/motion/text.ts — text beats built on the `reveal` effect, and velocity skew (MOTION-09).
// Arrival: masked lines rise into place. Exit: the block leaves along the inline axis
// (MOTION-02). Both are one-shots fired by chapter beats, so they never fight the scrub.
import { gsap } from 'gsap';
import { device } from '../core/device';
import { loop } from '../core/loop';
import { scroll } from '../core/scroll';
import { store } from '../core/store';
import { revealState } from './effects';
import { distance, dur, ease } from './tokens';

export interface Revealer {
  /** Lines rise in (forward beat) or come back (reverse of an exit). */
  show(): void;
  /** Reverse of the arrival: lines sink back under their masks. */
  unshow(): void;
  /** Forward exit along the inline axis. */
  exit(): void;
}

const revealers = new WeakMap<HTMLElement, Revealer>();

/** Forgets cached revealers so a rebuilt chapter starts clean. */
export function forgetRevealer(el: HTMLElement): void {
  revealers.delete(el);
}

/** Instant completion in QA keeps every screenshot deterministic (QA-02). */
function settle(anim: gsap.core.Animation): void {
  if (device.qa) anim.progress(1);
}

export function revealer(el: HTMLElement, chars = false): Revealer {
  const cached = revealers.get(el);
  if (cached) return cached;
  gsap.effects.reveal(el, { chars });
  gsap.set(el, { autoAlpha: 1 });
  const anim = (): gsap.core.Animation | null => revealState(el)?.anim ?? null;
  // Only an element that actually exited is brought back, so show() never overwrites another
  // timeline's transform on the same element (the h1 dock tweens its x).
  let exited = false;
  const r: Revealer = {
    show() {
      if (exited) {
        exited = false;
        const back = gsap.to(el, { x: 0, opacity: 1, duration: dur.quick, ease: ease.out, overwrite: 'auto' });
        settle(back);
      }
      const a = anim();
      if (!a) return;
      a.timeScale(1).play();
      settle(a);
    },
    unshow() {
      const a = anim();
      if (!a) return;
      a.timeScale(1.6).reverse();
      settle(a);
    },
    exit() {
      exited = true;
      // Exits run at ~60 % of an arrival (ui-ux-pro-max exit-faster-than-enter).
      const t = gsap.to(el, {
        x: store.get('reducedMotion') ? 0 : -distance.lg,
        opacity: 0,
        duration: store.get('reducedMotion') ? 0.2 : dur.quick,
        ease: ease.in,
        overwrite: 'auto',
      });
      settle(t);
    },
  };
  revealers.set(el, r);
  return r;
}

/** Display type leans into fast scrolling and straightens at rest (at most 4 degrees). */
export function mountVelocitySkew(): () => void {
  const targets = [...document.querySelectorAll<HTMLElement>('.display, .title')];
  const setters = targets.map((el) => gsap.quickTo(el, 'skewX', { duration: dur.quick, ease: ease.out }));
  let last = 0;
  const off = loop.onUpdate(() => {
    const v = store.get('reducedMotion') ? 0 : scroll.velocity;
    const skew = Math.round(-v * distance.skewMaxDeg * 100) / 100;
    if (skew === last) return;
    last = skew;
    setters.forEach((set) => set(skew));
  });
  return () => {
    off();
    gsap.set(targets, { skewX: 0 });
  };
}
