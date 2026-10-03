// src/dom/ambient.ts — the ambient toggle (UI-09). aria-pressed reports "paused"; the icon
// morphs between pause and play; pausing eases the ambient clock to a stop, which freezes idle
// rotation, mote drift, the Core's pulse and the marquee's drift while every scroll-driven
// motion keeps working.
import { gsap } from 'gsap';
import { clock } from '../core/loop';
import { device } from '../core/device';
import { store } from '../core/store';
import { AMBIENT_PAUSE, AMBIENT_PLAY } from '../motion/shapes';
import { dur, ease } from '../motion/tokens';

export function mountAmbient(): () => void {
  const button = document.querySelector<HTMLButtonElement>('.ambient-btn');
  const icon = button?.querySelector<SVGPathElement>('.ambient-icon');
  const label = button?.querySelector<HTMLElement>('.ambient-label');
  if (!button) return () => undefined;

  const apply = (paused: boolean): void => {
    button.setAttribute('aria-pressed', String(paused));
    if (label) label.textContent = (paused ? button.dataset.labelOn : button.dataset.labelOff) ?? '';
    if (icon) gsap.to(icon, { morphSVG: paused ? AMBIENT_PLAY : AMBIENT_PAUSE, duration: dur.base, ease: ease.inOut, overwrite: 'auto' });
    run();
  };
  // The ambient clock stops when paused, and under reduced motion (ACCESS-01: drift, marquee).
  // QA keeps it frozen for deterministic frames (QA-02).
  const run = (): void => {
    if (device.qa) return;
    const on = !store.get('ambientPaused') && !store.get('reducedMotion');
    gsap.to(clock, { ambientScale: on ? 1 : 0, duration: dur.slow, ease: ease.inOut, overwrite: 'auto' });
  };
  const onClick = (): void => store.set('ambientPaused', !store.get('ambientPaused'));
  button.addEventListener('click', onClick);
  const off = store.on('ambientPaused', apply);
  const offReduced = store.on('reducedMotion', run);
  apply(store.get('ambientPaused'));
  return () => {
    button.removeEventListener('click', onClick);
    off();
    offReduced();
  };
}
