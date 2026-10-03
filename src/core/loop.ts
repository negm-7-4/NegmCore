// src/core/loop.ts — the page's one clock (ARCH-04).
// Order inside every tick: Lenis (prioritised), GSAP's own update, then the scene update and
// the render, added last. No other requestAnimationFrame loop or interval exists.
import { gsap } from 'gsap';
import type Lenis from 'lenis';
import { device } from './device';
import { scroll } from './scroll';
import { store } from './store';

export type UpdateFn = (dt: number, ambientTime: number) => void;

const updaters: UpdateFn[] = [];
const frameTimes = new Float32Array(120);
let frameIndex = 0;
let frameCount = 0;
let renderFn: (() => void) | null = null;
let lastActivity = 0;
let forced = 0;
let sampleFn: ((frameMs: number, dt: number) => void) | null = null;
const frameWaiters: Array<() => void> = [];

/** Ambient (time-based, non-scroll) motion runs on its own clock so it can be paused smoothly. */
export const clock = {
  ambientTime: 0,
  /** 1 = running, 0 = frozen. Tweened by the ambient toggle; 0 in QA (QA-02). */
  ambientScale: device.qa ? 0 : 1,
};

function activity(): void {
  lastActivity = performance.now();
}

function frame(_time: number, deltaMs: number): void {
  if (document.hidden) return; // a hidden tab renders nothing (PERF-06, MOTION-10)
  // Clamp dt so a resumed tab or a long software frame never jumps ambient motion.
  const dt = Math.min(deltaMs, 50) / 1000;
  frameTimes[frameIndex] = deltaMs;
  frameIndex = (frameIndex + 1) % frameTimes.length;
  frameCount = Math.min(frameCount + 1, frameTimes.length);
  sampleFn?.(deltaMs, dt);

  scroll.updateVelocity(dt);
  if (scroll.moving) activity();
  clock.ambientTime += dt * clock.ambientScale;

  const ambientRunning = clock.ambientScale > 0.001 && !store.get('ambientPaused');
  const idle = !ambientRunning && performance.now() - lastActivity > 2500 && forced === 0;
  for (const update of updaters) update(dt, clock.ambientTime);
  if (!idle && renderFn) renderFn();
  if (forced > 0) forced -= 1;
  while (frameWaiters.length) frameWaiters.shift()?.();
}

export const loop = {
  init(lenis: Lenis): void {
    gsap.ticker.add((time) => lenis.raf(time * 1000), false, true); // prioritised: runs first
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(frame); // added last: runs after GSAP

    const wake = (): void => activity();
    for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchmove', 'resize'] as const) {
      window.addEventListener(type, wake, { passive: true });
    }
    // Resume with no time jump: lag smoothing absorbs the hidden period, then is turned off again.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        gsap.ticker.lagSmoothing(250, 33);
      } else {
        activity();
        const restore = (): void => {
          gsap.ticker.lagSmoothing(0);
          gsap.ticker.remove(restore);
        };
        gsap.ticker.add(restore);
      }
    });
    store.on('world', wake);
    store.on('selectedPlan', wake);
    store.on('ambientPaused', wake);
    activity();
  },

  /** Scene updates run in registration order, before the render. */
  onUpdate(fn: UpdateFn): () => void {
    updaters.push(fn);
    return () => {
      const i = updaters.indexOf(fn);
      if (i >= 0) updaters.splice(i, 1);
    };
  },

  setRenderer(fn: (() => void) | null): void {
    renderFn = fn;
  },

  setSampler(fn: ((frameMs: number, dt: number) => void) | null): void {
    sampleFn = fn;
  },

  /** Marks the scene dirty so the next frames render even when idle. */
  invalidate(frames = 2): void {
    activity();
    forced = Math.max(forced, frames);
  },

  /** Resolves after the next rendered tick. */
  nextFrame(): Promise<void> {
    loop.invalidate();
    return new Promise((resolve) => frameWaiters.push(resolve));
  },

  stats(): { fps: number; frameMsP95: number } {
    if (frameCount === 0) return { fps: 0, frameMsP95: 0 };
    const sorted = Array.from(frameTimes.subarray(0, frameCount)).sort((a, b) => a - b);
    const mean = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    return { fps: Math.round(1000 / Math.max(mean, 1)), frameMsP95: Math.round(p95 * 10) / 10 };
  },
};
