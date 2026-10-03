// src/dom/form.ts — the trial-session form (SCENE-24, SCENE-25, UI-02 icon, UI-06).
// Fields: the label rests inside the empty field and floats up on focus or when filled (the
// placeholder fades in only under a floated label); the underline bar grows from inline-start
// on focus; an error shakes the field at most 6 px with `rattle` and slides its message in; a
// valid field turns its bar to the accent. Submit: busy spins the collar icon, success morphs it
// to a check; no request is ever made. The plan field mirrors the store both ways.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PLAN_IDS, store, type PlanId } from '../core/store';
import { announce } from '../gl/fx';
import { distance, dur, ease } from '../motion/tokens';

const PHONE = /^01[0125]\d{8}$/;
const CHECK = 'M4.5 12.6l1.7-1.7 3.8 3.8 7.8-7.8 1.7 1.7-9.5 9.5Z';

interface TextField {
  field: HTMLElement;
  input: HTMLInputElement;
  label: HTMLElement;
  fill: HTMLElement | null;
  valid: () => boolean;
  rest: number;
}

export function mountForm(): () => void {
  const form = document.querySelector<HTMLFormElement>('.join-form');
  if (!form) return () => undefined;
  const offs: Array<() => void> = [];
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void): void => {
    el.addEventListener(type, fn);
    offs.push(() => el.removeEventListener(type, fn));
  };

  const plans = [...form.querySelectorAll<HTMLInputElement>('input[name="plan"]')];
  const segLabels = plans.map((input) => input.nextElementSibling as HTMLElement | null);
  const thumb = form.querySelector<HTMLElement>('.seg-thumb');
  const submit = form.querySelector<HTMLButtonElement>('.submit');
  const label = form.querySelector<HTMLElement>('.submit-label');
  const icon = form.querySelector<SVGPathElement>('.submit-shape');
  const iconSvg = form.querySelector<SVGSVGElement>('.submit-icon');
  const status = form.querySelector<HTMLElement>('.form-status');
  const idleText = label?.textContent ?? '';
  const collar = icon?.getAttribute('d') ?? '';

  // ---------- plan: the segmented control mirrors the store ----------
  const placeThumb = (plan: PlanId | null): void => {
    const index = plan ? PLAN_IDS.indexOf(plan) : -1;
    plans.forEach((input, i) => {
      input.checked = input.value === plan;
      const text = segLabels[i];
      // The chosen option's text turns dark on the accent thumb, in step with the thumb; the
      // stylesheet mixes the colour from --on (PERF-04).
      if (text) gsap.to(text, { '--on': i === index ? 1 : 0, duration: dur.base, ease: ease.out, overwrite: 'auto' });
    });
    if (thumb) gsap.to(thumb, { opacity: index < 0 ? 0 : 1, xPercent: Math.max(0, index) * 100, duration: dur.base, ease: ease.out, overwrite: 'auto' });
  };
  placeThumb(store.get('selectedPlan'));
  offs.push(store.on('selectedPlan', placeThumb));
  on(form, 'change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name === 'plan') store.set('selectedPlan', input.value as PlanId);
  });

  // ---------- text fields ----------
  const texts: TextField[] = [];
  for (const [id, valid] of [
    ['f-name', (v: string) => v.trim().length > 0],
    ['f-phone', (v: string) => PHONE.test(v.trim())],
  ] as const) {
    const input = form.querySelector<HTMLInputElement>(`#${id}`);
    const field = input?.closest<HTMLElement>('.field');
    const fieldLabel = field?.querySelector<HTMLElement>('.field-label');
    if (!input || !field || !fieldLabel) continue;
    texts.push({ field, input, label: fieldLabel, fill: field.querySelector<HTMLElement>('.field-bar-fill'), valid: () => valid(input.value), rest: 0 });
  }
  // The resting offset puts the label on the input's centre line; measured on refresh only.
  const measure = (): void => {
    for (const t of texts) {
      t.rest = t.input.offsetTop + t.input.offsetHeight / 2 - (t.label.offsetTop + t.label.offsetHeight / 2);
      paint(t, true);
    }
  };
  const paint = (t: TextField, instant = false): void => {
    const focused = document.activeElement === t.input;
    const filled = t.input.value.length > 0;
    const up = focused || filled;
    const d = instant ? 0 : dur.quick;
    gsap.to(t.label, { y: up ? 0 : t.rest, scale: up ? 1 : 1.15, transformOrigin: '0% 50%', duration: d, ease: ease.out, overwrite: 'auto' });
    gsap.to(t.field, { '--ph': focused && !filled ? 1 : 0, duration: d, ease: ease.out, overwrite: 'auto' });
    if (t.fill) {
      const ok = filled && t.valid();
      gsap.to(t.fill, { scaleX: up ? 1 : 0, '--ok': ok ? 1 : 0, transformOrigin: '0% 50%', duration: d, ease: up ? ease.out : ease.in, overwrite: 'auto' });
    }
  };
  for (const t of texts) {
    on(t.input, 'focus', () => paint(t));
    on(t.input, 'blur', () => paint(t));
    on(t.input, 'input', () => {
      paint(t);
      if (t.field.classList.contains('is-invalid') && t.valid()) mark(t.field, true);
    });
  }
  measure();
  ScrollTrigger.addEventListener('refresh', measure);
  offs.push(() => ScrollTrigger.removeEventListener('refresh', measure));

  // ---------- validation ----------
  const planField = form.querySelector<HTMLElement>('.field-plan');
  const checks: Array<{ el: HTMLElement | null; valid: () => boolean; focus: HTMLElement | undefined }> = [
    ...texts.map((t) => ({ el: t.field, valid: t.valid, focus: t.input as HTMLElement })),
    { el: planField, valid: () => store.get('selectedPlan') !== null, focus: plans[0] },
  ];
  const mark = (el: HTMLElement | null, ok: boolean): void => {
    if (!el) return;
    el.classList.toggle('is-invalid', !ok);
    el.querySelectorAll('input').forEach((input) => input.setAttribute('aria-invalid', String(!ok)));
    const error = el.querySelector<HTMLElement>('.field-error');
    if (error) gsap.to(error, { autoAlpha: ok ? 0 : 1, x: ok ? -distance.xs : 0, duration: dur.quick, ease: ok ? ease.in : ease.out, overwrite: 'auto' });
    // A wiggle ease returns to its start value: 0 -> 6 px oscillates and settles at 0.
    if (!ok) gsap.fromTo(el, { x: 0 }, { x: 6, duration: dur.slow, ease: ease.rattle, overwrite: 'auto' });
  };
  on(form, 'change', (e) => {
    if ((e.target as HTMLInputElement).name === 'plan' && planField?.classList.contains('is-invalid')) mark(planField, true);
  });

  // ---------- submit: busy, then done ----------
  let spin: gsap.core.Tween | null = null;
  const swapLabel = (text: string): void => {
    if (!label) return;
    gsap
      .timeline()
      .to(label, { opacity: 0, y: -distance.xs, duration: dur.instant, ease: ease.in })
      .call(() => {
        label.textContent = text;
      })
      .fromTo(label, { opacity: 0, y: distance.xs }, { opacity: 1, y: 0, duration: dur.quick, ease: ease.out });
  };
  on(form, 'submit', (e) => {
    e.preventDefault();
    if (store.get('booking') === 'busy') return;
    const results = checks.map((c) => c.valid());
    checks.forEach((c, i) => mark(c.el, results[i]));
    const first = checks.find((_, i) => !results[i]);
    if (first) {
      first.focus?.focus();
      return;
    }
    store.set('booking', 'busy');
    submit?.setAttribute('aria-busy', 'true');
    swapLabel(label?.dataset.busy ?? idleText);
    if (iconSvg) spin = gsap.to(iconSvg, { rotation: '+=360', transformOrigin: '50% 50%', duration: dur.slow, ease: 'none', repeat: -1 });
    // A short, honest wait: nothing is sent anywhere.
    gsap.delayedCall(dur.cinematic, () => {
      store.set('booking', 'done');
      submit?.removeAttribute('aria-busy');
      spin?.kill();
      spin = null;
      if (iconSvg) gsap.to(iconSvg, { rotation: 0, duration: dur.quick, ease: ease.out, overwrite: 'auto' });
      if (icon) gsap.to(icon, { morphSVG: CHECK, duration: dur.base, ease: ease.inOut, overwrite: 'auto' });
      swapLabel(idleText);
      if (status) {
        gsap.fromTo(status, { autoAlpha: 0, y: distance.xs }, { autoAlpha: 1, y: 0, duration: dur.base, ease: ease.out, overwrite: 'auto' });
        announce(status.textContent ?? '');
      }
    });
  });
  // Editing after a booking returns the form to idle.
  on(form, 'input', () => {
    if (store.get('booking') !== 'done') return;
    store.set('booking', 'idle');
    if (icon) gsap.to(icon, { morphSVG: collar, duration: dur.base, ease: ease.inOut, overwrite: 'auto' });
    if (status) gsap.to(status, { autoAlpha: 0, duration: dur.quick, ease: ease.in, overwrite: 'auto' });
  });

  return () => {
    offs.forEach((off) => off());
    spin?.kill();
  };
}
