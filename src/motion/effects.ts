// src/motion/effects.ts — the four reusable effects of MOTION-05, registered once.
// Components call gsap.effects.reveal / counter / magnet / tilt instead of raw tweens, so the
// vocabulary (durations, eases, distances) lives in one place.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { store } from '../core/store';
import { distance, dur, ease, stagger } from './tokens';

export interface RevealState {
  /** The current reveal animation; replaced when autoSplit re-splits on resize. */
  anim: gsap.core.Animation | null;
  split: SplitText | null;
}

const reveals = new WeakMap<Element, RevealState>();
const counters = new WeakMap<Element, { v: number }>();
const pointers = new WeakMap<Element, Record<string, gsap.QuickToFunc>>();

export function revealState(el: Element): RevealState | undefined {
  return reveals.get(el);
}

function quick(el: Element, prop: string, duration: number): gsap.QuickToFunc {
  let map = pointers.get(el);
  if (!map) {
    map = {};
    pointers.set(el, map);
  }
  map[prop] ??= gsap.quickTo(el, prop, { duration, ease: ease.out });
  return map[prop];
}

let registered = false;

export function registerEffects(): void {
  if (registered) return;
  registered = true;

  // Masked line reveal (MOTION-07). Returns a paused animation; play/reverse is driven by
  // chapter beats. autoSplit re-splits after font or width changes and onSplit rebuilds.
  gsap.registerEffect({
    name: 'reveal',
    extendTimeline: false,
    defaults: { chars: false },
    effect: (targets: Element[], config: { chars: boolean }) => {
      const el = targets[0];
      const existing = reveals.get(el);
      if (existing?.anim) return existing.anim;
      const state: RevealState = { anim: null, split: null };
      reveals.set(el, state);
      // Short Latin headlines may split to characters (LANGUAGE en); copy splits to lines.
      state.split = SplitText.create(el, {
        type: config.chars ? 'lines,words,chars' : 'lines,words',
        mask: 'lines',
        linesClass: 'split-line',
        wordsClass: 'split-word',
        autoSplit: true,
        aria: 'auto',
        onSplit: (self: SplitText) => {
          const progress = state.anim ? state.anim.progress() : 0;
          const anim = store.get('reducedMotion')
            ? gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none', paused: true })
            : config.chars
              ? gsap.fromTo(
                  self.chars,
                  { yPercent: 112, rotationX: -40, transformOrigin: '50% 100%' },
                  { yPercent: 0, rotationX: 0, duration: dur.slow, ease: ease.out, stagger: 0.025, paused: true },
                )
              : gsap.fromTo(
                  self.lines,
                  { yPercent: 108, rotationX: -14, transformOrigin: '50% 100%' },
                  { yPercent: 0, rotationX: 0, duration: dur.slow, ease: ease.out, stagger: stagger.line, paused: true },
                );
          anim.progress(progress);
          state.anim = anim;
          return anim;
        },
      });
      return state.anim ?? gsap.to({}, { duration: 0, paused: true });
    },
  });

  // Snapped number tween with tabular figures (UI-07).
  gsap.registerEffect({
    name: 'counter',
    extendTimeline: false,
    defaults: { to: 0, duration: dur.base },
    effect: (targets: Element[], config: { to: number; duration: number }) => {
      const el = targets[0];
      let proxy = counters.get(el);
      if (!proxy) {
        proxy = { v: Number(el.textContent) || 0 };
        counters.set(el, proxy);
      }
      const p = proxy;
      return gsap.to(p, {
        v: config.to,
        duration: store.get('reducedMotion') ? 0.2 : config.duration,
        ease: ease.out,
        snap: { v: 1 },
        overwrite: 'auto',
        onUpdate: () => {
          el.textContent = String(Math.round(p.v));
        },
      });
    },
  });

  // Pointer attraction (UI-02). quickTo keeps it interruptible and allocation-free (MOTION-08).
  gsap.registerEffect({
    name: 'magnet',
    extendTimeline: false,
    defaults: { x: 0, y: 0 },
    effect: (targets: Element[], config: { x: number; y: number }) => {
      const el = targets[0];
      const max = 10;
      quick(el, 'x', dur.quick)(gsap.utils.clamp(-max, max, config.x));
      return quick(el, 'y', dur.quick)(gsap.utils.clamp(-max, max, config.y)) as unknown as gsap.core.Tween;
    },
  });

  // 3D card tilt, at most 8 degrees (UI-05, SCENE-19).
  gsap.registerEffect({
    name: 'tilt',
    extendTimeline: false,
    defaults: { rx: 0, ry: 0 },
    effect: (targets: Element[], config: { rx: number; ry: number }) => {
      const el = targets[0];
      const max = distance.tiltMaxDeg;
      gsap.set(el, { transformPerspective: 900 });
      quick(el, 'rotationX', dur.base)(gsap.utils.clamp(-max, max, config.rx));
      return quick(el, 'rotationY', dur.base)(gsap.utils.clamp(-max, max, config.ry)) as unknown as gsap.core.Tween;
    },
  });
}
