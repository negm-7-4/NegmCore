// src/dom/rail.ts — the chapter rail: a weight stack of seven plates with a selector pin.
// Choosing a plate scrolls through Lenis (LAYOUT-04, via nav.ts); the current plate carries
// aria-current (UI-04). Motion for the pin and labels is added in rail-motion (P4).
import { store } from '../core/store';

export function mountRail(): () => void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.rail-link')];
  const mark = (): void => {
    const current = `#${store.get('chapter')}`;
    for (const link of links) {
      if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };
  mark();
  return store.on('chapter', mark);
}
