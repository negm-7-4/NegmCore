// src/core/scroll.ts — Lenis, the only smooth-scroll engine and the only programmatic
// scroll API on the page (ARCH-05). ScrollTrigger reads Lenis; nothing else moves the page.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { device } from './device';

let lenis: Lenis | null = null;
let velocity = 0;
let lockCount = 0;

export interface ScrollToOptions {
  immediate?: boolean;
  duration?: number;
  offset?: number;
  onComplete?: () => void;
}

export const scroll = {
  /** Creates Lenis. The ticker wiring lives in loop.ts so there is one clock (ARCH-04). */
  init(): Lenis {
    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false, // touch stays native on coarse pointers (RESP-03)
      autoRaf: false,
      respectReducedMotion: true,
      anchors: false,
    });
    lenis.on('scroll', ScrollTrigger.update);
    // Layout modes (.is-gl, static) change the page height; Lenis re-measures with every refresh.
    ScrollTrigger.addEventListener('refreshInit', () => lenis?.resize());
    // The address bar showing or hiding never refreshes triggers or jumps the scene (RESP-04).
    ScrollTrigger.config({ ignoreMobileResize: true });
    return lenis;
  },

  get instance(): Lenis {
    if (!lenis) throw new Error('scroll.init() has not run');
    return lenis;
  },

  /** Scroll position in px. */
  get y(): number {
    return lenis ? lenis.scroll : window.scrollY;
  },

  get limit(): number {
    return lenis ? lenis.limit : document.documentElement.scrollHeight - window.innerHeight;
  },

  /** Smoothed scroll velocity in [-1, 1]; exactly 0 at rest (MOTION-09). */
  get velocity(): number {
    return velocity;
  },

  /** Called once per frame by the loop. */
  updateVelocity(dt: number): void {
    // QA seeks are jumps, not scrolling: frames show the rest state (QA-02).
    const raw = lenis && !device.qa ? lenis.velocity : 0;
    const target = gsap.utils.clamp(-1, 1, raw / 40);
    velocity += (target - velocity) * Math.min(1, dt * 8);
    if (Math.abs(velocity) < 1e-3 && Math.abs(target) < 1e-3) velocity = 0;
  },

  get moving(): boolean {
    return velocity !== 0 || Boolean(lenis?.isScrolling);
  },

  to(target: number | HTMLElement | string, options: ScrollToOptions = {}): void {
    if (!lenis) {
      const top = typeof target === 'number' ? target : 0;
      window.scrollTo({ top, behavior: 'instant' });
      options.onComplete?.();
      return;
    }
    lenis.scrollTo(target, {
      immediate: options.immediate ?? false,
      duration: options.duration,
      offset: options.offset ?? 0,
      force: true,
      lock: false,
      onComplete: options.onComplete ? () => options.onComplete?.() : undefined,
    });
  },

  /** Locks scrolling (preloader, menu overlay). Nested locks are counted. */
  lock(): void {
    lockCount += 1;
    lenis?.stop();
    document.documentElement.classList.add('is-scroll-locked');
  },

  unlock(): void {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) return;
    lenis?.start();
    document.documentElement.classList.remove('is-scroll-locked');
  },
};
