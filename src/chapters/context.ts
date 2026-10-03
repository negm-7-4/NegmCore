// src/chapters/context.ts — what every chapter module receives, and the chapter registry.
// Why a registry: the QA hook, the rail and the nav all need the same chapter ranges, and
// they must come from the ScrollTriggers that actually drive the page, not from guesses.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { device } from '../core/device';
import type { ChapterId } from '../core/store';
import type { World } from '../gl/world';

export interface ChapterContext {
  world: World;
  section: HTMLElement;
  stage: HTMLElement;
  panel: HTMLElement | null;
  /** 0.6 on fine pointers, true on touch and in QA (SCENE-03, QA-02). */
  scrub: number | true;
}

export interface ChapterModule {
  id: ChapterId;
  build(ctx: ChapterContext): void;
  dispose(): void;
}

export interface ChapterRange {
  id: ChapterId;
  start: number;
  end: number;
}

const triggers = new Map<ChapterId, ScrollTrigger>();

export function scrubAmount(): number | true {
  return device.qa || !device.finePointer ? true : 0.6;
}

/** Each chapter registers the trigger that spans its whole section. */
export function registerChapterTrigger(id: ChapterId, trigger: ScrollTrigger): void {
  triggers.set(id, trigger);
}

export function unregisterChapterTrigger(id: ChapterId): void {
  triggers.delete(id);
}

/**
 * Chapter ranges as global scroll progress, in page order. Without a trigger (static mode)
 * the section's own box is used, so QA can still visit every chapter.
 */
export function chapterRanges(): ChapterRange[] {
  const max = ScrollTrigger.maxScroll(window) || 1;
  const sections = [...document.querySelectorAll<HTMLElement>('section.chapter')];
  return sections.map((section) => {
    const id = section.id as ChapterId;
    const t = triggers.get(id);
    const top = t ? t.start : section.offsetTop;
    const end = t ? t.end : section.offsetTop + Math.max(0, section.offsetHeight - window.innerHeight);
    return { id, start: Math.max(0, Math.min(1, top / max)), end: Math.max(0, Math.min(1, end / max)) };
  });
}

export function chapterTrigger(id: ChapterId): ScrollTrigger | undefined {
  return triggers.get(id);
}

const rests = new Map<ChapterId, number>();

/** Where inside its range a chapter's composed frame rests (0..1), for navigation targets. */
export function registerChapterRest(id: ChapterId, progress: number): void {
  rests.set(id, progress);
}

/** Scroll position (px) of a chapter's resting frame; the section top when it has no trigger. */
export function chapterRestY(id: ChapterId): number {
  const t = triggers.get(id);
  if (t) return t.start + (t.end - t.start) * (rests.get(id) ?? 0.5);
  const section = document.getElementById(id);
  return section ? section.offsetTop : 0;
}
