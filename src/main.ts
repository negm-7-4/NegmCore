// src/main.ts — boot order only.
import './styles/base.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { hero } from './chapters/hero';
import { scrubAmount, type ChapterModule } from './chapters/context';
import { device, supportsWebGL2 } from './core/device';
import { loop } from './core/loop';
import { chooseTier, QualityController, TIERS } from './core/quality';
import { scroll } from './core/scroll';
import { store } from './core/store';
import { mountNav } from './dom/nav';
import { mountPanels } from './dom/panels';
import { mountRail } from './dom/rail';
import { mountWorld } from './dom/world';
import { createWorld, type World } from './gl/world';
import { clock } from './core/loop';
import { registerMotion } from './motion/tokens';
import { installErrorCollector, installQAHook, reportError } from './qa/hook';
import { showroom, type ShowroomModel } from './chapters/showroom';

installErrorCollector();
registerMotion();

const root = document.documentElement;
const chapters: ChapterModule[] = [hero];
let gl: World | null = null;

function enterStaticMode(): void {
  if (store.get('staticMode')) return;
  store.set('staticMode', true);
  rootMedia?.revert(); // disposes every chapter through the matchMedia cleanup
  chapters.forEach((chapter) => chapter.dispose());
  loop.setRenderer(null);
  gl?.dispose();
  gl = null;
  root.classList.remove('is-gl');
  root.classList.add('is-static');
  unmountPanels();
  unmountPanels = () => undefined;
  unmountWorld();
  unmountWorld = mountWorld();
  ScrollTrigger.refresh();
}

let unmountPanels: () => void = () => undefined;
let unmountWorld: () => void = () => undefined;

function buildChapters(core: World): void {
  for (const chapter of chapters) {
    const section = document.getElementById(chapter.id);
    const stage = section?.querySelector<HTMLElement>('.stage');
    if (!section || !stage) throw new Error(`missing section #${chapter.id}`);
    chapter.build({ world: core, section, stage, panel: section.querySelector<HTMLElement>('.panel'), scrub: scrubAmount() });
  }
}

/**
 * The root gsap.matchMedia (ARCH-08): when reduced motion or the pointer/orientation class
 * changes, every chapter is disposed and rebuilt for the new conditions.
 */
function mountChapters(core: World): void {
  const mm = gsap.matchMedia();
  rootMedia = mm;
  mm.add(
    { reduce: device.reducedMotionQuery, fine: device.finePointerQuery, portrait: device.portraitQuery },
    (context) => {
      if (store.get('staticMode')) return;
      store.set('reducedMotion', Boolean(context.conditions?.reduce) || forcedReduced);
      buildChapters(core);
      ScrollTrigger.refresh();
      return () => chapters.forEach((chapter) => chapter.dispose());
    },
  );
  rebuild = () => {
    mm.revert();
    mountChapters(core);
  };
}

let rootMedia: gsap.MatchMedia | null = null;
let frameDt = 1 / 60;
let forcedReduced = false;
let rebuild: () => void = () => undefined;

async function boot(): Promise<void> {
  const tier = chooseTier();
  store.set('tier', tier);
  store.set('reducedMotion', device.prefersReducedMotion);
  const quality = new QualityController(tier);
  loop.setSampler((ms, dt) => quality.sample(ms, dt));
  loop.init(scroll.init());
  root.classList.add('is-enhanced');

  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  if (supportsWebGL2()) {
    try {
      gl = createWorld(canvas, TIERS[tier], quality.live.dpr, enterStaticMode);
      root.classList.add('is-gl');
      const core = gl;
      quality.onChange((q) => core.applyQuality(q));
      loop.setRenderer(() => core.frame(frameDt, clock.ambientTime, clock.ambientScale, scroll.velocity));
      loop.onUpdate((dt) => {
        frameDt = dt;
      });
      mountChapters(core);
    } catch (error) {
      reportError(error);
      enterStaticMode();
    }
  } else {
    enterStaticMode();
  }

  mountNav();
  mountRail();
  if (!store.get('staticMode')) {
    unmountWorld = mountWorld();
    unmountPanels = mountPanels();
  }

  await document.fonts.ready;
  ScrollTrigger.refresh();
  await loop.nextFrame();
  root.classList.add('is-ready'); // replaced by the preloader exit in P3
}

const ready = boot().catch((error: unknown) => {
  reportError(error);
  enterStaticMode();
});

installQAHook({
  ready: ready.then(() => undefined),
  debug: () => ({ triggers: ScrollTrigger.getAll().length, tweens: gsap.globalTimeline.getChildren(true, true, true).length }),
  renderStats: () => {
    const info = gl?.renderer.info;
    return {
      calls: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      geometries: info?.memory.geometries ?? 0,
      textures: info?.memory.textures ?? 0,
      programs: info?.programs?.length ?? 0,
      dpr: gl?.renderer.getPixelRatio() ?? 0,
    };
  },
  apply: async (settings) => {
    if (settings.staticMode) enterStaticMode();
    if (settings.ambient !== undefined) store.set('ambientPaused', !settings.ambient);
    if (settings.tier) store.set('tier', settings.tier);
    if (settings.reducedMotion !== undefined && settings.reducedMotion !== forcedReduced) {
      forcedReduced = settings.reducedMotion;
      rebuild();
    }
  },
});

// TEMPORARY (P2 showroom): removed in P3.
(window as unknown as { __showroom: (n: ShowroomModel, w: boolean, f: boolean) => Promise<void> }).__showroom = async (n, w, f) => {
  if (!gl) return;
  showroom(gl, n, w, f);
  await window.__qa.seek(0);
};
