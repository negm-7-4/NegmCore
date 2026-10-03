// src/dom/actions.ts — the primary actions (UI-02): the header's "Book a trial session" and the
// form's submit. Magnetic within 80 px of the button by at most 10 px (the `magnet` effect,
// fine pointers only); hover and focus lift the fill toward white; pressing scales to 0.96.
// Colour states tween a 0..1 custom property (--lift) that the stylesheet mixes from the world
// tokens, so DOM motion stays on transforms, opacity and custom properties (PERF-04).
// The submit's busy and success icons belong to form.ts. The back-to-top link (UI-08) shares
// the hover, focus and pressed treatment.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { device } from '../core/device';
import { dur, ease } from '../motion/tokens';

const REACH = 80;
const PRESS = 0.96;

export function mountActions(): () => void {
  const actions = [...document.querySelectorAll<HTMLElement>('[data-magnet]')];
  if (!actions.length) return () => undefined;
  const offs: Array<() => void> = [];
  const lift = (el: HTMLElement, on: boolean): void => {
    gsap.to(el, { '--lift': on ? 1 : 0, duration: dur.quick, ease: on ? ease.out : ease.in, overwrite: 'auto' });
  };

  for (const el of actions) {
    let hovered = false;
    let focused = false;
    const paint = (): void => lift(el, hovered || focused);
    const press = (down: boolean): void => {
      gsap.to(el, { scale: down ? PRESS : 1, duration: down ? dur.instant : dur.quick, ease: down ? ease.out : ease.settle, overwrite: 'auto' });
    };
    const handlers: Array<[string, EventListener]> = [
      ['pointerenter', () => ((hovered = true), paint())],
      ['pointerleave', () => ((hovered = false), paint(), press(false))],
      ['focus', () => ((focused = true), paint())],
      ['blur', () => ((focused = false), paint())],
      ['pointerdown', () => press(true)],
      ['pointerup', () => press(false)],
      ['keydown', (e) => (e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ' ? press(true) : undefined],
      ['keyup', () => press(false)],
    ];
    handlers.forEach(([type, fn]) => el.addEventListener(type, fn));
    offs.push(() => handlers.forEach(([type, fn]) => el.removeEventListener(type, fn)));
  }

  // Back-to-top (UI-08): hover and focus fill the outline faintly and firm its border;
  // pressing scales it like the primary actions.
  const toTop = document.querySelector<HTMLElement>('.to-top');
  if (toTop) {
    let hovered = false;
    let focused = false;
    const paint = (): void => lift(toTop, hovered || focused);
    const press = (down: boolean): void => {
      gsap.to(toTop, { scale: down ? PRESS : 1, duration: down ? dur.instant : dur.quick, ease: down ? ease.out : ease.settle, overwrite: 'auto' });
    };
    const handlers: Array<[string, EventListener]> = [
      ['pointerenter', () => ((hovered = true), paint())],
      ['pointerleave', () => ((hovered = false), paint(), press(false))],
      ['focus', () => ((focused = true), paint())],
      ['blur', () => ((focused = false), paint())],
      ['pointerdown', () => press(true)],
      ['pointerup', () => press(false)],
    ];
    handlers.forEach(([type, fn]) => toTop.addEventListener(type, fn));
    offs.push(() => handlers.forEach(([type, fn]) => toTop.removeEventListener(type, fn)));
  }

  // Magnet (MOTION-08): rects are measured on refresh only (PERF-05); fixed chrome and fixed
  // panels keep them valid between refreshes.
  if (device.finePointer && !device.qa) {
    let rects = actions.map((el) => el.getBoundingClientRect());
    const measure = (): void => {
      gsap.set(actions, { x: 0, y: 0 });
      rects = actions.map((el) => el.getBoundingClientRect());
    };
    ScrollTrigger.addEventListener('refresh', measure);
    offs.push(() => ScrollTrigger.removeEventListener('refresh', measure));
    const pulled = actions.map(() => false);
    const onMove = (e: PointerEvent): void => {
      actions.forEach((el, i) => {
        const r = rects[i];
        const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
        const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
        const d = Math.hypot(dx, dy);
        const visible = el.offsetParent !== null;
        if (d < REACH && visible) {
          const k = 1 - d / REACH;
          gsap.effects.magnet(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.25 * k, y: (e.clientY - (r.top + r.height / 2)) * 0.25 * k });
          pulled[i] = true;
        } else if (pulled[i]) {
          gsap.effects.magnet(el, { x: 0, y: 0 });
          pulled[i] = false;
        }
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    offs.push(() => window.removeEventListener('pointermove', onMove));
  }
  return () => offs.forEach((off) => off());
}
