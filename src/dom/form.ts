// src/dom/form.ts — the trial-session form (SCENE-24, SCENE-25, UI-06). Validation is local;
// a valid submit goes busy, then done, and no request is ever made (the form is a concept).
// The plan field mirrors the store both ways, so the plan chosen in Gravity is preselected and
// a plan picked here moves the plate on the bar. The 3D answer to `booking` lives in join.ts.
import { gsap } from 'gsap';
import { announce } from '../gl/fx';
import { PLAN_IDS, store, type PlanId } from '../core/store';
import { distance, dur, ease } from '../motion/tokens';

const PHONE = /^01[0125]\d{8}$/;

export function mountForm(): () => void {
  const form = document.querySelector<HTMLFormElement>('.join-form');
  if (!form) return () => undefined;
  const offs: Array<() => void> = [];
  const name = form.querySelector<HTMLInputElement>('#f-name');
  const phone = form.querySelector<HTMLInputElement>('#f-phone');
  const plans = [...form.querySelectorAll<HTMLInputElement>('input[name="plan"]')];
  const thumb = form.querySelector<HTMLElement>('.seg-thumb');
  const submit = form.querySelector<HTMLButtonElement>('.submit');
  const label = form.querySelector<HTMLElement>('.submit-label');
  const status = form.querySelector<HTMLElement>('.form-status');
  const idleText = label?.textContent ?? '';

  // The segmented control's thumb slides to the checked plan (and fades in the first time).
  const placeThumb = (plan: PlanId | null): void => {
    const index = plan ? PLAN_IDS.indexOf(plan) : -1;
    plans.forEach((input) => (input.checked = input.value === plan));
    if (!thumb) return;
    gsap.to(thumb, { opacity: index < 0 ? 0 : 1, xPercent: Math.max(0, index) * 100, duration: dur.base, ease: ease.out, overwrite: 'auto' });
  };
  placeThumb(store.get('selectedPlan'));
  offs.push(store.on('selectedPlan', placeThumb));
  const onPlan = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    if (input.name === 'plan') store.set('selectedPlan', input.value as PlanId);
  };
  form.addEventListener('change', onPlan);
  offs.push(() => form.removeEventListener('change', onPlan));

  const fields = [
    { el: name?.closest<HTMLElement>('.field'), valid: () => (name?.value.trim().length ?? 0) > 0, focus: name },
    { el: phone?.closest<HTMLElement>('.field'), valid: () => PHONE.test(phone?.value.trim() ?? ''), focus: phone },
    { el: form.querySelector<HTMLElement>('.field-plan'), valid: () => store.get('selectedPlan') !== null, focus: plans[0] },
  ];
  const mark = (el: HTMLElement | null | undefined, ok: boolean): void => {
    if (!el) return;
    el.classList.toggle('is-invalid', !ok);
    el.querySelector('input')?.setAttribute('aria-invalid', String(!ok));
    const error = el.querySelector<HTMLElement>('.field-error');
    if (error) gsap.to(error, { autoAlpha: ok ? 0 : 1, x: ok ? -distance.xs : 0, duration: dur.quick, ease: ok ? ease.in : ease.out, overwrite: 'auto' });
  };

  const onSubmit = (e: SubmitEvent): void => {
    e.preventDefault();
    if (store.get('booking') === 'busy') return;
    const results = fields.map((f) => f.valid());
    fields.forEach((f, i) => mark(f.el, results[i]));
    const first = fields.find((_, i) => !results[i]);
    if (first) {
      first.focus?.focus();
      return;
    }
    store.set('booking', 'busy');
    submit?.setAttribute('aria-busy', 'true');
    if (label) gsap.to(label, { scrambleText: { text: label.dataset.busy ?? idleText, chars: 'upperCase', speed: 0.6 }, duration: dur.base, overwrite: 'auto' });
    // A short, honest wait: nothing is sent anywhere.
    gsap.delayedCall(dur.cinematic, () => {
      store.set('booking', 'done');
      submit?.removeAttribute('aria-busy');
      if (label) gsap.to(label, { scrambleText: { text: idleText, chars: 'upperCase', speed: 0.6 }, duration: dur.base, overwrite: 'auto' });
      if (status) {
        gsap.fromTo(status, { autoAlpha: 0, y: distance.xs }, { autoAlpha: 1, y: 0, duration: dur.base, ease: ease.out, overwrite: 'auto' });
        announce(status.textContent ?? '');
      }
    });
  };
  form.addEventListener('submit', onSubmit);
  offs.push(() => form.removeEventListener('submit', onSubmit));
  // Editing after a booking returns the form to idle.
  const onInput = (): void => {
    if (store.get('booking') !== 'done') return;
    store.set('booking', 'idle');
    if (status) gsap.to(status, { autoAlpha: 0, duration: dur.quick, ease: ease.in, overwrite: 'auto' });
  };
  form.addEventListener('input', onInput);
  offs.push(() => form.removeEventListener('input', onInput));

  return () => offs.forEach((off) => off());
}
