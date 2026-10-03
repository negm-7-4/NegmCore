// src/dom/panels.ts — fixed panels (green or interactive UI) shown only during their chapter
// (LAYOUT-07). A hidden panel stays in the tab order: when focus enters it, the page scrolls
// to that chapter's resting frame so the focused control is on screen (ACCESS-03).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapterRestY } from '../chapters/context';
import { scroll } from '../core/scroll';
import { store, type ChapterId } from '../core/store';
import { dur, ease } from '../motion/tokens';

export function mountPanels(): () => void {
  const listeners: Array<() => void> = [];
  const ctx = gsap.context(() => {
    for (const section of document.querySelectorAll<HTMLElement>('section.chapter')) {
      const panel = section.querySelector<HTMLElement>('.panel');
      if (!panel) continue;
      const id = section.id as ChapterId;
      const show = (on: boolean): void => {
        panel.classList.toggle('is-active', on);
        gsap.to(panel, {
          opacity: on ? 1 : 0,
          duration: store.get('reducedMotion') ? 0.2 : dur.quick,
          ease: on ? ease.out : ease.in,
          overwrite: 'auto',
        });
      };
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        onToggle: (self) => show(self.isActive),
      });
      const onFocus = (): void => {
        if (panel.classList.contains('is-active')) return;
        scroll.to(chapterRestY(id), { immediate: store.get('reducedMotion') });
      };
      panel.addEventListener('focusin', onFocus);
      listeners.push(() => panel.removeEventListener('focusin', onFocus));
    }
  });
  return () => {
    ctx.revert();
    listeners.forEach((off) => off());
    document.querySelectorAll('.panel.is-active').forEach((panel) => panel.classList.remove('is-active'));
  };
}
