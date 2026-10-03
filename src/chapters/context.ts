// src/chapters/context.ts — what every chapter module receives, the chapter registry, and the
// timeline helpers every chapter uses (one scrubbed master timeline + beats).
// Why a registry: the QA hook, the rail and the nav all need the same chapter ranges, and
// they must come from the ScrollTriggers that actually drive the page, not from guesses.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { device } from '../core/device';
import { store, type ChapterId } from '../core/store';
import type { Props } from '../gl/props';
import type { World } from '../gl/world';
import { revealer } from '../motion/text';

export interface ChapterContext {
  world: World;
  props: Props;
  section: HTMLElement;
  stage: HTMLElement;
  panel: HTMLElement | null;
  /** 0.6 on fine pointers, true on touch and in QA (SCENE-03, QA-02). */
  scrub: number | true;
  reduced: boolean;
  portrait: boolean;
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
const rests = new Map<ChapterId, number>();

export function scrubAmount(): number | true {
  return device.qa || !device.finePointer ? true : 0.6;
}

export function registerChapterTrigger(id: ChapterId, trigger: ScrollTrigger): void {
  triggers.set(id, trigger);
}

export function unregisterChapterTrigger(id: ChapterId): void {
  triggers.delete(id);
}

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

interface Beat {
  at: number;
  forward: () => void;
  backward: () => void;
}

export interface ChapterTimeline {
  tl: gsap.core.Timeline;
  /**
   * A one-shot fired when the scrubbed playhead crosses `at` (0..100): `forward` going down
   * the page, `backward` going up (SCENE-03). Driven by the playhead, so scrub smoothing and
   * QA jumps both cross beats in order.
   */
  beat(at: number, forward: () => void, backward: () => void): void;
}

/**
 * A chapter's master timeline: 100 units = the chapter's whole scroll length, scrubbed,
 * top-level (ARCH-07), never pinned (ARCH-06). `onProgress` runs after every render.
 */
export function chapterTimeline(c: ChapterContext, id: ChapterId, onProgress?: (p: number) => void): ChapterTimeline {
  const beats: Beat[] = [];
  let prev = 0;
  const tl: gsap.core.Timeline = gsap.timeline({
    defaults: { ease: 'none', immediateRender: false },
    scrollTrigger: {
      trigger: c.section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: c.scrub,
      invalidateOnRefresh: true,
      onToggle: (self) => {
        if (self.isActive) store.set('chapter', id);
      },
    },
    onUpdate: () => {
      const now = tl.time();
      if (now !== prev) {
        const down = now > prev;
        for (const b of down ? beats : [...beats].reverse()) {
          if (down && prev < b.at && now >= b.at) b.forward();
          else if (!down && prev >= b.at && now < b.at) b.backward();
        }
        prev = now;
      }
      onProgress?.(now / 100);
    },
  });
  tl.set({}, {}, 100); // the timeline is exactly 100 units long
  if (tl.scrollTrigger) registerChapterTrigger(id, tl.scrollTrigger);
  return {
    tl,
    beat(at, forward, backward) {
      beats.push({ at, forward, backward });
      beats.sort((a, b) => a.at - b.at);
    },
  };
}

/** Animates a target along the timeline from `start` to `end` (in 0..100 units). */
export function track(tl: gsap.core.Timeline, target: object, vars: gsap.TweenVars, start: number, end: number): void {
  tl.to(target, { ease: 'none', ...vars, duration: Math.max(0.0001, end - start) }, start);
}

/** Text arrives at `at` going down and sinks back going up. */
export function revealAt(ct: ChapterTimeline, el: HTMLElement | null, at: number, chars = false): void {
  if (!el) return;
  const r = revealer(el, chars);
  ct.beat(at, () => r.show(), () => r.unshow());
}

/** Text leaves along the inline axis at `at` going down and returns going up. */
export function exitAt(ct: ChapterTimeline, el: HTMLElement | null, at: number): void {
  if (!el) return;
  const r = revealer(el);
  ct.beat(at, () => r.exit(), () => r.show());
}
