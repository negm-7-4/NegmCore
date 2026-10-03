// src/dom/plans.ts — the plan selector (SCENE-23, UI-05): a native radio group, so arrow keys
// move between plans and the choice is announced by the browser. This module owns the cards;
// it writes the choice and the pointer/keyboard focus to the store, and the gravity chapter
// answers in 3D. The chosen card crossfades its action line to the chosen line.
import { gsap } from 'gsap';
import { PLAN_IDS, store, type PlanId } from '../core/store';
import { dur, ease } from '../motion/tokens';

function isPlan(value: string | undefined): value is PlanId {
  return PLAN_IDS.includes(value as PlanId);
}

export function mountPlans(): () => void {
  const root = document.querySelector<HTMLElement>('#gravity .plans');
  if (!root) return () => undefined;
  const cards = [...root.querySelectorAll<HTMLElement>('.plan')];
  const offs: Array<() => void> = [];
  const listen = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void): void => {
    el.addEventListener(type, fn);
    offs.push(() => el.removeEventListener(type, fn));
  };

  const planOf = (el: Element | null): PlanId | null => {
    const value = el?.closest<HTMLElement>('.plan')?.dataset.plan;
    return isPlan(value) ? value : null;
  };

  // Pointer and keyboard share one focus state (UI-05).
  for (const card of cards) {
    listen(card, 'pointerenter', () => store.set('planFocus', planOf(card)));
    listen(card, 'pointerleave', () => {
      if (!card.contains(document.activeElement)) store.set('planFocus', null);
    });
  }
  listen(root, 'focusin', (e) => store.set('planFocus', planOf(e.target as Element)));
  listen(root, 'focusout', (e) => {
    if (!root.contains(e.relatedTarget as Node | null)) store.set('planFocus', null);
  });
  listen(root, 'change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name === 'plan-pick' && isPlan(input.value)) store.set('selectedPlan', input.value);
  });

  const reflect = (plan: PlanId | null): void => {
    for (const card of cards) {
      const on = card.dataset.plan === plan;
      const input = card.querySelector<HTMLInputElement>('input');
      if (input) input.checked = on;
      card.classList.toggle('is-chosen', on);
      const choose = card.querySelector('.plan-choose');
      const chosen = card.querySelector('.plan-chosen');
      gsap.to(choose, { opacity: on ? 0 : 1, duration: dur.quick, ease: on ? ease.in : ease.out, overwrite: 'auto' });
      gsap.to(chosen, { opacity: on ? 1 : 0, duration: dur.quick, ease: on ? ease.out : ease.in, overwrite: 'auto' });
    }
  };
  reflect(store.get('selectedPlan'));
  offs.push(store.on('selectedPlan', reflect));

  return () => offs.forEach((off) => off());
}
