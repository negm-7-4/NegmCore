// src/dom/world.ts — keeps --world and the current chapter in step with the page.
// GL mode: chapters move store.world with the backdrop sweep; this module only mirrors it into
// the CSS variable. Static mode: the section under the chrome decides the world (COLOR-09).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { store, type ChapterId } from '../core/store';
import { dur, ease } from '../motion/tokens';

export function mountWorld(): () => void {
  const root = document.documentElement;
  const offWorld = store.on('world', (value) => root.style.setProperty('--world', value.toFixed(3)));
  root.style.setProperty('--world', store.get('world').toFixed(3));

  const ctx = gsap.context(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('section.chapter')];
    for (const section of sections) {
      ScrollTrigger.create({
        trigger: section,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => {
          if (self.isActive) store.set('chapter', section.id as ChapterId);
        },
      });
    }
    if (!store.get('staticMode')) return;

    // Static mode: the world under the fixed chrome. Gradient sections flip after their
    // solid head (45 % of the section), matching where the CSS gradient starts to turn.
    const proxy = { w: store.get('world') };
    const goTo = (target: number): void => {
      gsap.to(proxy, {
        w: target,
        duration: dur.quick,
        ease: ease.inOut,
        overwrite: 'auto',
        onUpdate: () => store.set('world', proxy.w),
      });
    };
    for (const section of sections) {
      const base = Number(section.dataset.world ?? 0);
      const gradient = section.id === 'ignite' || section.id === 'orbit';
      ScrollTrigger.create({
        trigger: section,
        start: 'top top+=36',
        end: 'bottom top+=36',
        onUpdate: (self) => {
          const flipped = gradient && self.progress > 0.6;
          goTo(flipped ? 1 - base : base);
        },
        onToggle: (self) => {
          if (self.isActive) goTo(gradient && self.progress > 0.6 ? 1 - base : base);
        },
      });
    }
  });

  return () => {
    offWorld();
    ctx.revert();
  };
}
