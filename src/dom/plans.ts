// src/dom/plans.ts — the plan selector (SCENE-23, UI-05): a native radio group, so arrow keys
// move between plans and the choice is announced by the browser. Hover and focus share one
// state: the card tilts (the `tilt` effect, at most 8°, fine pointers) and its ring lights; the
// store's planFocus lets the gravity chapter tip the plate too. The chosen state moves a marker
// bar between cards with Flip, fills the chosen ring and crossfades the action line.
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { device } from '../core/device';
import { PLAN_IDS, store, type PlanId } from '../core/store';
import { distance, dur, ease } from '../motion/tokens';

function isPlan(value: string | undefined): value is PlanId {
  return PLAN_IDS.includes(value as PlanId);
}

export function mountPlans(): () => void {
  const root = document.querySelector<HTMLElement>('#gravity .plans');
  if (!root) return () => undefined;
  const cards = [...root.querySelectorAll<HTMLElement>('.plan')];
  const offs: Array<() => void> = [];
  const listen = (el: EventTarget, type: string, fn: EventListener): void => {
    el.addEventListener(type, fn);
    offs.push(() => el.removeEventListener(type, fn));
  };
  const css = getComputedStyle(document.documentElement);
  const color = (name: string): string => css.getPropertyValue(name).trim();
  const planOf = (el: Element | null): PlanId | null => {
    const value = el?.closest<HTMLElement>('.plan')?.dataset.plan;
    return isPlan(value) ? value : null;
  };
  const tiltable = device.finePointer && !store.get('reducedMotion');

  // ---------- hover and focus: one shared state ----------
  for (const card of cards) {
    listen(card, 'pointerenter', () => store.set('planFocus', planOf(card)));
    listen(card, 'pointerleave', () => {
      if (!card.contains(document.activeElement)) store.set('planFocus', null);
      if (tiltable) gsap.effects.tilt(card, { rx: 0, ry: 0 });
    });
    if (tiltable) {
      listen(card, 'pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = ((e as PointerEvent).clientX - r.left) / r.width - 0.5;
        const py = ((e as PointerEvent).clientY - r.top) / r.height - 0.5;
        gsap.effects.tilt(card, { rx: -py * 2 * distance.tiltMaxDeg, ry: px * 2 * distance.tiltMaxDeg });
      });
    }
  }
  listen(root, 'focusin', (e) => store.set('planFocus', planOf(e.target as Element)));
  listen(root, 'focusout', (e) => {
    if (!root.contains((e as FocusEvent).relatedTarget as Node | null)) store.set('planFocus', null);
  });
  const lightRing = (plan: PlanId | null, previous: PlanId | null): void => {
    for (const card of cards) {
      const id = card.dataset.plan;
      if (id !== plan && id !== previous) continue;
      const on = id === plan;
      const ring = card.querySelector('.plan-ring');
      if (ring) gsap.to(ring, { borderColor: color(on || id === store.get('selectedPlan') ? '--ui-accent' : '--ui-fg-2'), scale: on ? 1.15 : 1, duration: dur.quick, ease: on ? ease.out : ease.in, overwrite: 'auto' });
      // Keyboard focus tilts a little toward the reader, the same state the pointer reaches.
      if (tiltable && document.activeElement && card.contains(document.activeElement)) gsap.effects.tilt(card, { rx: on ? -distance.tiltMaxDeg / 2 : 0, ry: 0 });
    }
  };
  offs.push(store.on('planFocus', lightRing));
  listen(root, 'change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name === 'plan-pick' && isPlan(input.value)) store.set('selectedPlan', input.value);
  });

  // ---------- the chosen state ----------
  const marker = document.createElement('span');
  marker.className = 'plan-marker';
  marker.setAttribute('aria-hidden', 'true');
  gsap.set(marker, { opacity: 0 });
  const reflect = (plan: PlanId | null): void => {
    const card = cards.find((c) => c.dataset.plan === plan) ?? null;
    // Flip: the marker bar travels from the old card to the new one (or grows in the first time).
    if (card) {
      const state = marker.isConnected ? Flip.getState(marker) : null;
      card.append(marker);
      if (state) Flip.from(state, { duration: dur.base, ease: ease.inOut });
      else gsap.fromTo(marker, { opacity: 0, scaleX: 0, transformOrigin: '0% 50%' }, { opacity: 1, scaleX: 1, duration: dur.base, ease: ease.out });
    } else if (marker.isConnected) {
      gsap.to(marker, { opacity: 0, duration: dur.quick, ease: ease.in, onComplete: () => marker.remove() });
    }
    for (const c of cards) {
      const on = c.dataset.plan === plan;
      const input = c.querySelector<HTMLInputElement>('input');
      if (input) input.checked = on;
      c.classList.toggle('is-chosen', on);
      const ring = c.querySelector('.plan-ring');
      if (ring) gsap.to(ring, { backgroundColor: on ? color('--ui-accent') : 'transparent', borderColor: color(on ? '--ui-accent' : '--ui-fg-2'), duration: dur.base, ease: ease.out, overwrite: 'auto' });
      gsap.to(c.querySelector('.plan-choose'), { opacity: on ? 0 : 1, duration: dur.quick, ease: on ? ease.in : ease.out, overwrite: 'auto' });
      gsap.to(c.querySelector('.plan-chosen'), { opacity: on ? 1 : 0, duration: dur.quick, ease: on ? ease.out : ease.in, overwrite: 'auto' });
    }
  };
  reflect(store.get('selectedPlan'));
  offs.push(store.on('selectedPlan', reflect));

  return () => {
    offs.forEach((off) => off());
    marker.remove();
  };
}
