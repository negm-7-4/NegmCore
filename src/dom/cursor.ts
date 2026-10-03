// src/dom/cursor.ts — the custom cursor (UI-01), fine pointers only (MOTION-08, RESP-03).
// A ring and a dot follow the pointer with different lag (quickTo). The ring's path morphs
// between states: a larger ring over links and buttons, a horizontal grip over the draggable
// object, a bar over text fields; pressing scales the whole cursor to 0.85. It inverts against
// the world through difference blending (components.css).
import { gsap } from 'gsap';
import { device } from '../core/device';
import { dur, ease } from '../motion/tokens';

type CursorState = 'idle' | 'link' | 'drag' | 'text';

// 48 x 48 viewBox, centred on 24,24; every shape is one closed path so MorphSVG maps cleanly.
const SHAPE: Record<CursorState, string> = {
  idle: 'M24 6a18 18 0 1 0 0.01 0Z',
  link: 'M24 6a18 18 0 1 0 0.01 0Z',
  drag: 'M4 18h40v12H4Z',
  text: 'M23 8h2v32h-2Z',
};
const SCALE: Record<CursorState, number> = { idle: 1, link: 1.5, drag: 1, text: 1 };
const PRESSED = 0.85;

function stateOf(target: EventTarget | null): CursorState {
  const el = target instanceof Element ? target : null;
  if (!el) return 'idle';
  if (el.closest('input:not([type="radio"]):not([type="checkbox"]), textarea')) return 'text';
  if (el.closest('.drag-proxy')) return 'drag';
  if (el.closest('a, button, label, [role="button"]')) return 'link';
  return 'idle';
}

export function mountCursor(): () => void {
  const root = document.querySelector<HTMLElement>('.cursor');
  const ring = root?.querySelector<SVGSVGElement>('.cursor-ring');
  const path = root?.querySelector<SVGPathElement>('.cursor-ring-path');
  const dot = root?.querySelector<HTMLElement>('.cursor-dot');
  if (!device.finePointer || device.qa || !root || !ring || !path || !dot) return () => undefined;
  document.documentElement.classList.add('has-cursor');
  gsap.set(root, { autoAlpha: 0 });

  const ringX = gsap.quickTo(ring, 'x', { duration: dur.base, ease: ease.out });
  const ringY = gsap.quickTo(ring, 'y', { duration: dur.base, ease: ease.out });
  const dotX = gsap.quickTo(dot, 'x', { duration: dur.instant, ease: ease.out });
  const dotY = gsap.quickTo(dot, 'y', { duration: dur.instant, ease: ease.out });
  let state: CursorState = 'idle';
  let pressed = false;
  let shown = false;

  const scale = (): void => {
    const k = pressed ? PRESSED : 1;
    gsap.to(ring, { scale: SCALE[state] * k, duration: dur.quick, ease: ease.out, overwrite: 'auto' });
    gsap.to(dot, { scale: (state === 'text' ? 0 : 1) * k, duration: dur.quick, ease: ease.out, overwrite: 'auto' });
  };
  const setState = (next: CursorState): void => {
    if (next === state) return;
    const morph = SHAPE[next] !== SHAPE[state];
    state = next;
    if (morph) gsap.to(path, { morphSVG: SHAPE[next], duration: dur.quick, ease: ease.out, overwrite: 'auto' });
    scale();
  };

  const onMove = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse') return;
    if (!shown) {
      shown = true;
      gsap.set([ring, dot], { x: e.clientX, y: e.clientY });
      gsap.to(root, { autoAlpha: 1, duration: dur.quick, ease: ease.out, overwrite: 'auto' });
    }
    ringX(e.clientX);
    ringY(e.clientY);
    dotX(e.clientX);
    dotY(e.clientY);
  };
  const onOver = (e: PointerEvent): void => setState(stateOf(e.target));
  const onDown = (): void => {
    pressed = true;
    scale();
  };
  const onUp = (): void => {
    pressed = false;
    scale();
  };
  const onLeave = (e: PointerEvent): void => {
    if (e.relatedTarget) return;
    shown = false;
    gsap.to(root, { autoAlpha: 0, duration: dur.quick, ease: ease.in, overwrite: 'auto' });
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  document.addEventListener('pointerout', onLeave, { passive: true });
  return () => {
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointerout', onLeave);
    document.documentElement.classList.remove('has-cursor');
  };
}
