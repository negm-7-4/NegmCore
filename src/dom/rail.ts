// src/dom/rail.ts — the chapter rail (UI-03, UI-04): a weight stack of seven plates with a
// selector pin. Choosing a plate scrolls through Lenis (nav.ts). The pin travels along the
// rail's path with MotionPathPlugin as chapters change; the current plate is marked for
// assistive technology with aria-current and lit with a tween. Hover or focus shows a plate's
// chapter name and draws its underline from inline-start, then the two end caps arrive.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { device } from '../core/device';
import { store, type ChapterId } from '../core/store';
import { distance, dur, ease } from '../motion/tokens';

const ORDER: readonly ChapterId[] = ['hero', 'mass', 'ignite', 'programs', 'orbit', 'gravity', 'join'];

export function mountRail(): () => void {
  const nav = document.querySelector<HTMLElement>('.rail');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.rail-link')];
  const pin = nav?.querySelector<HTMLElement>('.rail-pin');
  const path = nav?.querySelector<SVGPathElement>('.rail-path');
  if (!nav || !links.length) return () => undefined;
  const offs: Array<() => void> = [];
  const css = getComputedStyle(document.documentElement);
  const color = (name: string): string => css.getPropertyValue(name).trim();
  // The overlay (narrow or coarse) shows every label; the desktop rail reveals them on demand.
  const overlay = (): boolean => device.narrow || !device.finePointer;

  // ---------- current chapter: aria-current, lit plate, travelling pin ----------
  let index = ORDER.indexOf(store.get('chapter'));
  const mark = (instant = false): void => {
    const current = `#${store.get('chapter')}`;
    for (const link of links) {
      const on = link.getAttribute('href') === current;
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      const plate = link.querySelector('.rail-plate');
      if (plate) gsap.to(plate, { borderColor: color(on ? '--ui-accent-mark' : '--ui-fg-2'), duration: instant ? 0 : dur.base, ease: ease.out, overwrite: 'auto' });
    }
    const next = Math.max(0, ORDER.indexOf(store.get('chapter')));
    if (pin && path && !overlay()) {
      gsap.to(pin, {
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: index / (ORDER.length - 1), end: next / (ORDER.length - 1) },
        duration: instant ? 0 : dur.slow,
        ease: ease.inOut,
        overwrite: 'auto',
      });
    }
    index = next;
  };
  mark(true);
  offs.push(store.on('chapter', () => mark()));
  // A resize re-lays the path out; put the pin back on it without travel.
  const replace = (): void => {
    index = Math.max(0, ORDER.indexOf(store.get('chapter')));
    if (pin && path && !overlay()) gsap.set(pin, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: index / (ORDER.length - 1), end: index / (ORDER.length - 1) } });
  };
  ScrollTrigger.addEventListener('refresh', replace);
  offs.push(() => ScrollTrigger.removeEventListener('refresh', replace));

  // ---------- hover and focus: name and underline ----------
  const measure = (): void => {
    for (const link of links) {
      const label = link.querySelector<HTMLElement>('.rail-label');
      if (label) link.style.setProperty('--label-w', `${label.offsetWidth}px`);
    }
  };
  measure();
  ScrollTrigger.addEventListener('refresh', measure);
  offs.push(() => ScrollTrigger.removeEventListener('refresh', measure));
  for (const link of links) {
    const label = link.querySelector<HTMLElement>('.rail-label');
    const underline = link.querySelector<SVGSVGElement>('.rail-underline');
    const bar = link.querySelector<SVGPathElement>('.u-bar');
    const caps = link.querySelector<SVGPathElement>('.u-cap');
    if (underline) gsap.set(underline, { opacity: 1 });
    if (bar) gsap.set(bar, { drawSVG: '100% 100%' });
    if (caps) gsap.set(caps, { scaleY: 0, transformOrigin: '50% 50%' });
    let hovered = false;
    let focused = false;
    const show = (): void => {
      const on = hovered || focused;
      if (label && !overlay()) gsap.to(label, { opacity: on ? 1 : 0, x: on ? 0 : distance.xs, duration: on ? dur.quick : dur.instant, ease: on ? ease.out : ease.in, overwrite: 'auto' });
      // The path runs from x = 100 to 0, so its end is inline-start (LTR): draw from there.
      if (bar) gsap.to(bar, { drawSVG: on ? '0% 100%' : '100% 100%', duration: on ? dur.base : dur.quick, ease: on ? ease.out : ease.in, overwrite: 'auto' });
      if (caps) gsap.to(caps, { scaleY: on ? 1 : 0, duration: dur.quick, delay: on ? dur.quick : 0, ease: on ? ease.settle : ease.in, overwrite: 'auto' });
    };
    const handlers: Array<[string, EventListener]> = [
      ['pointerenter', () => ((hovered = true), show())],
      ['pointerleave', () => ((hovered = false), show())],
      ['focus', () => ((focused = true), show())],
      ['blur', () => ((focused = false), show())],
    ];
    handlers.forEach(([type, fn]) => link.addEventListener(type, fn));
    offs.push(() => handlers.forEach(([type, fn]) => link.removeEventListener(type, fn)));
  }
  return () => offs.forEach((off) => off());
}
