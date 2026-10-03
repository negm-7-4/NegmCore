// src/dom/chrome.ts — the fixed chrome (UI-03): the brand mark's star rounds into the Core on
// hover and focus (MorphSVG); the chrome slides away on a fast downward scroll and returns on
// upward intent (Observer); on narrow or touch screens the menu button opens the chapter list
// as a full-screen overlay with staggered masked lines and a morphing icon, closed by the
// button, a chosen link or Escape.
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import { device } from '../core/device';
import { scroll } from '../core/scroll';
import { MARK_CIRCLE, MARK_STAR, MENU_BARS, MENU_CLOSE } from '../motion/shapes';
import { distance, dur, ease, stagger } from '../motion/tokens';

/** Scroll speed (px/s) above which a downward scroll hides the chrome. */
const FAST = 1400;

export function mountChrome(): () => void {
  const offs: Array<() => void> = [];
  const listen = (el: EventTarget, type: string, fn: EventListener): void => {
    el.addEventListener(type, fn);
    offs.push(() => el.removeEventListener(type, fn));
  };

  // ---------- brand mark ----------
  const wordmark = document.querySelector<HTMLElement>('.wordmark');
  const star = wordmark?.querySelector<SVGPathElement>('.mark-star');
  if (wordmark && star) {
    let hovered = false;
    let focused = false;
    const morph = (): void => {
      const on = hovered || focused;
      gsap.to(star, { morphSVG: on ? MARK_CIRCLE : MARK_STAR, duration: dur.base, ease: ease.inOut, overwrite: 'auto' });
    };
    listen(wordmark, 'pointerenter', () => ((hovered = true), morph()));
    listen(wordmark, 'pointerleave', () => ((hovered = false), morph()));
    listen(wordmark, 'focus', () => ((focused = true), morph()));
    listen(wordmark, 'blur', () => ((focused = false), morph()));
  }

  // ---------- menu overlay ----------
  const button = document.querySelector<HTMLButtonElement>('.menu-btn');
  const icon = button?.querySelector<SVGPathElement>('.menu-icon');
  const buttonLabel = button?.querySelector<HTMLElement>('.menu-label');
  const nav = document.querySelector<HTMLElement>('.rail');
  const lines = nav ? [...nav.querySelectorAll<HTMLElement>('.rail-label')] : [];
  const outside = [...document.querySelectorAll<HTMLElement>('main, footer, .wordmark, .chrome-actions > :not(.menu-btn)')];
  let open = false;
  const setMenu = (next: boolean, returnFocus = true): void => {
    if (!button || !nav || next === open) return;
    open = next;
    button.setAttribute('aria-expanded', String(next));
    outside.forEach((el) => (el.inert = next));
    if (next) scroll.lock();
    else scroll.unlock();
    if (icon) gsap.to(icon, { morphSVG: next ? MENU_CLOSE : MENU_BARS, duration: dur.base, ease: ease.inOut, overwrite: 'auto' });
    if (buttonLabel) {
      const text = (next ? button.dataset.labelOpen : button.dataset.labelClosed) ?? '';
      gsap
        .timeline()
        .to(buttonLabel, { opacity: 0, y: -distance.xs, duration: dur.instant, ease: ease.in })
        .call(() => {
          buttonLabel.textContent = text;
        })
        .fromTo(buttonLabel, { opacity: 0, y: distance.xs }, { opacity: 1, y: 0, duration: dur.quick, ease: ease.out });
    }
    if (next) {
      gsap.to(nav, { autoAlpha: 1, duration: dur.quick, ease: ease.out, overwrite: 'auto' });
      gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: dur.slow, ease: ease.out, stagger: stagger.line, overwrite: 'auto' });
      nav.querySelector<HTMLElement>('.rail-link')?.focus({ preventScroll: true });
    } else {
      // Exits run faster than entrances; lines leave along the inline axis (MOTION-02).
      gsap.to(lines, { xPercent: -8, opacity: 0, duration: dur.quick, ease: ease.in, stagger: stagger.word / 2, overwrite: 'auto' });
      gsap.to(nav, {
        autoAlpha: 0,
        duration: dur.quick,
        delay: dur.instant,
        ease: ease.in,
        overwrite: 'auto',
        onComplete: () => gsap.set(lines, { xPercent: 0, opacity: 1 }),
      });
      if (returnFocus) button.focus({ preventScroll: true });
    }
  };
  if (button && nav) {
    listen(button, 'click', () => setMenu(!open));
    listen(document, 'keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape' && open) setMenu(false);
    });
    // A chosen chapter closes the overlay; nav.ts does the scrolling.
    listen(nav, 'click', (e) => {
      if ((e.target as Element).closest('.rail-link') && open) setMenu(false, false);
    });
    // Leaving the overlay layout (rotate, resize) closes it cleanly.
    const mq = window.matchMedia(`${device.narrowQuery}, (pointer: coarse)`);
    const onChange = (): void => {
      if (!mq.matches && open) setMenu(false, false);
      if (!mq.matches) gsap.set(nav, { clearProps: 'opacity,visibility' });
    };
    mq.addEventListener('change', onChange);
    offs.push(() => mq.removeEventListener('change', onChange));
  }

  // ---------- hide on a fast downward scroll, return on upward intent ----------
  const chrome = [...document.querySelectorAll<HTMLElement>('.wordmark, .chrome-actions')];
  if (!device.qa && chrome.length) {
    let hidden = false;
    const show = (on: boolean): void => {
      if (on === !hidden) return;
      hidden = !on;
      gsap.to(chrome, { yPercent: on ? 0 : -180, autoAlpha: on ? 1 : 0, duration: on ? dur.base : dur.quick, ease: on ? ease.out : ease.in, overwrite: 'auto' });
    };
    // User intent only: wheel and touch, never programmatic scrolls (nav links, back-to-top).
    // A finger moving up scrolls the page down, so the touch observer's directions swap.
    const busy = (): boolean => open || chrome.some((el) => el.contains(document.activeElement));
    // Speed from the intent deltas themselves over the last 200 ms (px/s), independent of the
    // frame rate; Observer's own velocity is sampled per tick.
    let samples: Array<[number, number]> = [];
    const speed = (delta: number): number => {
      const now = performance.now();
      samples.push([now, Math.abs(delta)]);
      samples = samples.filter(([t]) => now - t < 200);
      return samples.reduce((sum, [, d]) => sum + d, 0) / 0.2;
    };
    const down = (delta: number): void => {
      if (!busy() && speed(delta) > FAST && window.scrollY > window.innerHeight) show(false);
    };
    const up = (): void => {
      samples = [];
      show(true);
    };
    const wheel = Observer.create({ target: window, type: 'wheel', tolerance: 12, onDown: (self) => down(self.deltaY), onUp: up });
    const touch = Observer.create({ target: window, type: 'touch', tolerance: 12, onUp: (self) => down(self.deltaY), onDown: up });
    // Keyboard focus always brings the chrome back.
    listen(document, 'focusin', (e) => {
      if (chrome.some((el) => el.contains(e.target as Node))) show(true);
    });
    offs.push(() => {
      wheel.kill();
      touch.kill();
    });
  }

  return () => {
    if (open) setMenu(false, false);
    offs.forEach((off) => off());
  };
}
