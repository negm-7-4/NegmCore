// src/dom/nav.ts — in-page links (skip link, wordmark, action, back-to-top) and the chrome.
// Every programmatic scroll goes through Lenis (ARCH-05); the URL hash is never written,
// because #qa is the only use of the hash (SHIP-03).
import { chapterRestY } from '../chapters/context';
import { scroll } from '../core/scroll';
import type { ChapterId } from '../core/store';
import { dur } from '../motion/tokens';

const CHAPTERS: readonly ChapterId[] = ['hero', 'mass', 'ignite', 'programs', 'orbit', 'gravity', 'join'];

/** Scrolls to a chapter's resting frame, or to the top for the hero. */
export function goToChapter(id: ChapterId, immediate = false): void {
  const y = id === 'hero' ? 0 : chapterRestY(id);
  scroll.to(y, { immediate, duration: immediate ? undefined : dur.cinematic });
}

export function isChapterId(value: string): value is ChapterId {
  return (CHAPTERS as readonly string[]).includes(value);
}

export function mountNav(): () => void {
  const onClick = (event: MouseEvent): void => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
    const id = link.getAttribute('href')?.slice(1) ?? '';
    if (id === 'main') {
      event.preventDefault();
      const main = document.getElementById('main');
      main?.focus({ preventScroll: true });
      goToChapter('hero');
      return;
    }
    if (!isChapterId(id)) return;
    event.preventDefault();
    goToChapter(id);
    // Move focus with the view so keyboard users continue from the chapter they chose.
    const heading = document.getElementById(id)?.querySelector<HTMLElement>('h1, h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
