// src/dom/marquee.ts — the footer wordmark marquee (SCENE-26, UI-08, MOTION-09). One looping
// tween on a doubled track; its timeScale is the idle drift (paused by the ambient toggle)
// plus the scroll velocity, so it speeds up with scrolling and turns round when scrolling up.
// Reduced motion stops it (ACCESS-01).
import { gsap } from 'gsap';
import { clock, loop } from '../core/loop';
import { scroll } from '../core/scroll';
import { store } from '../core/store';
import { dur } from '../motion/tokens';

/** Seconds for the track to travel one copy of itself at rest. */
const LAP = dur.cinematic * 16;
/** How strongly scroll velocity ([-1, 1]) adds to the drift. */
const PUSH = 5;

export function mountMarquee(): () => void {
  const track = document.querySelector<HTMLElement>('.marquee-track');
  const item = track?.querySelector<HTMLElement>('.marquee-item');
  if (!track || !item) return () => undefined;
  // Enough copies to cover two viewport widths, so the -50 % loop never shows a gap.
  const copies = Math.max(2, Math.ceil((window.innerWidth * 2) / Math.max(1, item.offsetWidth)));
  const clones: HTMLElement[] = [];
  for (let i = 1; i < copies * 2; i += 1) {
    const clone = item.cloneNode(true) as HTMLElement;
    track.append(clone);
    clones.push(clone);
  }
  const loopTween = gsap.fromTo(track, { xPercent: 0 }, { xPercent: -50, duration: LAP, ease: 'none', repeat: -1 });
  let direction = 1;
  let speed = 1;
  const off = loop.onUpdate((dt) => {
    const v = store.get('reducedMotion') ? 0 : scroll.velocity;
    if (Math.abs(v) > 0.02) direction = Math.sign(v);
    const idle = store.get('reducedMotion') || store.get('ambientPaused') ? 0 : clock.ambientScale;
    const target = direction * idle + v * PUSH;
    speed += (target - speed) * Math.min(1, dt * 6); // smoothed, so a reversal eases round
    loopTween.timeScale(Math.abs(speed) < 1e-3 ? 0 : speed);
  });
  return () => {
    off();
    loopTween.kill();
    clones.forEach((clone) => clone.remove());
    gsap.set(track, { clearProps: 'transform' });
  };
}
