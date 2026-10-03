// src/qa/hook.ts — window.__qa, the deterministic handle the gate scripts drive (QA-01).
// Why a hook: screenshots are evidence only if the same progress always renders the same frame.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapterRanges, type ChapterRange } from '../chapters/context';
import { loop } from '../core/loop';
import { scroll } from '../core/scroll';
import { store, type Tier } from '../core/store';

export interface QAStats {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  dpr: number;
  tier: Tier;
  world: number;
  chapter: string;
  fps: number;
  frameMsP95: number;
}

export interface QASettings {
  tier?: Tier;
  reducedMotion?: boolean;
  ambient?: boolean;
  staticMode?: boolean;
}

export interface QAHook {
  ready: Promise<void>;
  readonly chapters: ChapterRange[];
  seek(progress: number): Promise<void>;
  stats(): QAStats;
  set(settings: QASettings): Promise<void>;
  errors: string[];
  /** Live trigger and tween counts, for the dispose audit (ARCH-08). */
  debug(): { triggers: number; tweens: number; timings?: Record<string, number>; pose?: { pos: number[]; look: number[]; fov: number; roll: number } | null; quality?: { dpr: number; bloom: boolean; aberration: boolean } | null; renders?: number };
}

declare global {
  interface Window {
    __qa: QAHook;
  }
}

const errors: string[] = [];

/** Installed first in main.ts so boot errors are collected too (ARCH-12). */
export function installErrorCollector(): void {
  window.addEventListener('error', (event) => errors.push(String(event.error ?? event.message)));
  window.addEventListener('unhandledrejection', (event) => errors.push(`unhandled rejection: ${String(event.reason)}`));
}

export function reportError(error: unknown): void {
  errors.push(error instanceof Error ? `${error.name}: ${error.message} @ ${(error.stack ?? '').split('\n').slice(1, 4).join(' | ')}` : String(error));
}

export interface QADeps {
  ready: Promise<void>;
  debug(): { triggers: number; tweens: number; timings?: Record<string, number>; pose?: { pos: number[]; look: number[]; fov: number; roll: number } | null; quality?: { dpr: number; bloom: boolean; aberration: boolean } | null; renders?: number };
  renderStats(): Pick<QAStats, 'calls' | 'triangles' | 'geometries' | 'textures' | 'programs' | 'dpr'>;
  apply(settings: QASettings): Promise<void>;
}

export function installQAHook(deps: QADeps): void {
  window.__qa = {
    ready: deps.ready,
    get chapters() {
      return chapterRanges();
    },
    async seek(progress: number) {
      const target = Math.max(0, Math.min(1, progress)) * scroll.limit;
      scroll.to(target, { immediate: true });
      ScrollTrigger.update();
      // Two rendered ticks: the first applies the scroll to every timeline, the second settles.
      await loop.nextFrame();
      await loop.nextFrame();
    },
    stats() {
      return {
        ...deps.renderStats(),
        tier: store.get('tier'),
        world: Math.round(store.get('world') * 1000) / 1000,
        chapter: store.get('chapter'),
        ...loop.stats(),
      };
    },
    async set(settings: QASettings) {
      await deps.apply(settings);
      await loop.nextFrame();
    },
    errors,
    debug: deps.debug,
  };
}
