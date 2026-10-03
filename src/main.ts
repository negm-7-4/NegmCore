// src/main.ts — boot order only.
// 1 preloader in -> fonts -> geometry + chapters -> environments -> shaders -> warm-up frames
// -> DOM components -> preloader match-cut out. Static mode replaces 3-5 when WebGL is absent.
import './styles/base.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Vector3 } from 'three';
import { chapterRestY, mountChapterTracker, scrubAmount, type ChapterContext, type ChapterModule } from './chapters/context';
import { gravity } from './chapters/gravity';
import { hero } from './chapters/hero';
import { ignite } from './chapters/ignite';
import { join } from './chapters/join';
import { mass } from './chapters/mass';
import { orbit } from './chapters/orbit';
import { createPreloader, type BarRect } from './chapters/preloader';
import { programs } from './chapters/programs';
import { device, supportsWebGL2 } from './core/device';
import { clock, loop } from './core/loop';
import { chooseTier, QualityController, TIERS } from './core/quality';
import { mountResizeSettle } from './core/resize';
import { scroll } from './core/scroll';
import { store } from './core/store';
import { mountActions } from './dom/actions';
import { mountAmbient } from './dom/ambient';
import { mountChrome } from './dom/chrome';
import { mountCursor } from './dom/cursor';
import { mountForm } from './dom/form';
import { mountMarquee } from './dom/marquee';
import { mountNav } from './dom/nav';
import { mountPanels } from './dom/panels';
import { mountParallax } from './dom/parallax';
import { mountPlans } from './dom/plans';
import { mountRail } from './dom/rail';
import { mountWorld } from './dom/world';
import { createProps, ZONE, type Props } from './gl/props';
import { createWorld, type World } from './gl/world';
import { registerEffects } from './motion/effects';
import { mountVelocitySkew } from './motion/text';
import { registerMotion } from './motion/tokens';
import { installErrorCollector, installQAHook, reportError } from './qa/hook';

installErrorCollector();
registerMotion();
registerEffects();

const root = document.documentElement;
const chapters: ChapterModule[] = [hero, mass, ignite, programs, orbit, gravity, join];
let gl: World | null = null;
let props: Props | null = null;
let rootMedia: gsap.MatchMedia | null = null;
let forcedReduced = false;
let frameDt = 1 / 60;
let rebuild: () => void = () => undefined;
let unmountPanels: () => void = () => undefined;
let qualityRef: QualityController | null = null;
let unmountWorld: () => void = () => undefined;

function enterStaticMode(): void {
  if (store.get('staticMode')) return;
  store.set('staticMode', true);
  rootMedia?.revert(); // disposes every chapter through the matchMedia cleanup
  chapters.forEach((chapter) => chapter.dispose());
  loop.setRenderer(null);
  props?.dispose();
  gl?.dispose();
  props = null;
  gl = null;
  root.classList.remove('is-gl');
  root.classList.add('is-static');
  store.set('world', 0);
  unmountPanels();
  unmountPanels = () => undefined;
  unmountWorld();
  unmountWorld = mountWorld();
  ScrollTrigger.refresh();
}

function buildChapters(world: World, p: Props, reduced: boolean, portrait: boolean): void {
  for (const chapter of chapters) {
    const section = document.getElementById(chapter.id);
    const stage = section?.querySelector<HTMLElement>('.stage');
    if (!section || !stage) throw new Error(`missing section #${chapter.id}`);
    const ctx: ChapterContext = {
      world,
      props: p,
      section,
      stage,
      panel: section.querySelector<HTMLElement>('.panel'),
      scrub: reduced ? true : scrubAmount(),
      reduced,
      portrait,
    };
    chapter.build(ctx);
  }
}

/**
 * The root gsap.matchMedia (ARCH-08): when reduced motion or the pointer/orientation class
 * changes, every chapter is disposed and rebuilt for the new conditions.
 */
function mountChapters(world: World, p: Props): void {
  const mm = gsap.matchMedia();
  rootMedia = mm;
  mm.add({ reduce: device.reducedMotionQuery, fine: device.finePointerQuery, portrait: device.portraitQuery }, (context) => {
    if (store.get('staticMode')) return;
    const reduced = Boolean(context.conditions?.reduce) || forcedReduced;
    store.set('reducedMotion', reduced);
    world.rig.quantize = reduced; // key poses and cross-faded cuts instead of travel (ACCESS-01)
    buildChapters(world, p, reduced, Boolean(context.conditions?.portrait));
    mountChapterTracker();
    ScrollTrigger.refresh();
    return () => chapters.forEach((chapter) => chapter.dispose());
  });
  rebuild = () => {
    mm.revert();
    mountChapters(world, p);
  };
}

/** The hero bar's screen rectangle, for the preloader's match cut (FX-05). */
function heroBarRect(world: World): BarRect {
  world.rig.update();
  world.camera.updateMatrixWorld();
  const a = new Vector3(-1.1, 0, 0).add(ZONE.origin).project(world.camera);
  const b = new Vector3(1.1, 0, 0).add(ZONE.origin).project(world.camera);
  const { width, height } = world.size;
  const x1 = ((a.x + 1) / 2) * width;
  const x2 = ((b.x + 1) / 2) * width;
  const yc = ((1 - a.y) / 2) * height;
  const w = Math.abs(x2 - x1);
  const h = (w * 240) / 1100;
  return { x: Math.min(x1, x2), y: yc - h / 2, w, h };
}

/** Renders every chapter's resting frame once behind the preloader (SCENE-07). */
async function warmUp(): Promise<void> {
  for (const chapter of chapters) {
    scroll.to(chapterRestY(chapter.id), { immediate: true });
    ScrollTrigger.update();
    await loop.nextFrame();
  }
  scroll.to(0, { immediate: true });
  ScrollTrigger.update();
  await loop.nextFrame();
}

/** Boot milestones in ms since start, exposed through __qa.debug for the SCENE-10 check. */
const timings: Record<string, number> = {};

async function boot(): Promise<void> {
  const t0 = performance.now();
  const mark = (name: string): void => {
    timings[name] = Math.round(performance.now() - t0);
  };
  const tier = chooseTier();
  store.set('tier', tier);
  store.set('reducedMotion', device.prefersReducedMotion);
  const quality = new QualityController(tier);
  qualityRef = quality;
  loop.setSampler((ms, dt) => quality.sample(ms, dt));
  loop.init(scroll.init());
  root.classList.add('is-enhanced');

  const preloader = createPreloader();
  await preloader.enter();
  await document.fonts.ready;
  mark('fonts');
  await preloader.milestone(1);

  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  if (supportsWebGL2()) {
    try {
      const world = createWorld(canvas, TIERS[tier], quality.live.dpr, enterStaticMode);
      const p = createProps(world);
      gl = world;
      props = p;
      root.classList.add('is-gl');
      quality.onChange((q) => world.applyQuality(q));
      loop.onUpdate((dt, ambientTime) => {
        frameDt = dt;
        world.rig.update();
        p.update(dt, ambientTime, clock.ambientScale, store.get('reducedMotion') ? 0 : scroll.velocity, store.get('world'));
      });
      // Velocity effects (chromatic aberration, mote streaks) stop under reduced motion (ACCESS-01).
      loop.setRenderer(() => world.frame(frameDt, clock.ambientTime, clock.ambientScale, store.get('reducedMotion') ? 0 : scroll.velocity));
      ScrollTrigger.refresh();
      mountChapters(world, p);
      mark('geometry');
      await preloader.milestone(2);
      preloader.placeBar(heroBarRect(world));

      world.buildEnvironment();
      mark('environment');
      await preloader.milestone(3);

      [p.origin.group, p.programs.group, p.orbit.group, p.gravity.group].forEach((g) => (g.visible = true));
      // Compile against the composer's input buffer: the scene always renders into it (linear
      // output), so compiling for the screen (sRGB) would double every program (PERF-02).
      const screen = world.renderer.getRenderTarget();
      world.renderer.setRenderTarget(world.post.composer.inputBuffer);
      await world.renderer.compileAsync(world.scene, world.camera);
      world.renderer.setRenderTarget(screen);
      mark('shaders');
      await preloader.milestone(4);

      await warmUp();
      mark('firstFrame');
      await preloader.milestone(5);
    } catch (error) {
      reportError(error);
      enterStaticMode();
    }
  } else {
    enterStaticMode();
  }
  if (store.get('staticMode')) {
    for (const k of [2, 3, 4, 5] as const) await preloader.milestone(k);
  }

  mountNav();
  mountRail();
  mountChrome();
  mountAmbient();
  mountActions();
  mountCursor();
  mountPlans();
  mountForm();
  mountMarquee();
  if (!store.get('staticMode') && gl) {
    unmountWorld = mountWorld();
    unmountPanels = mountPanels();
    mountParallax(gl.rig);
    mountResizeSettle(gl.rig);
  }
  mountVelocitySkew();
  ScrollTrigger.refresh();
  await loop.nextFrame();
  mark('ready');
  await preloader.exit();
  mark('exit');
  document.dispatchEvent(new Event('negm:ready'));
}

const ready = boot().catch((error: unknown) => {
  reportError(error);
  enterStaticMode();
  root.classList.add('is-ready');
});

installQAHook({
  ready: ready.then(() => undefined),
  debug: () => ({
    triggers: ScrollTrigger.getAll().length,
    tweens: gsap.globalTimeline.getChildren(true, true, true).length,
    timings,
    // The camera's current shot pose, for the continuity check at chapter boundaries (SCENE-05).
    pose: gl ? { pos: gl.rig.pose.pos.toArray(), look: gl.rig.pose.look.toArray(), fov: gl.rig.pose.fov, roll: gl.rig.pose.roll } : null,
    // The adaptive quality state, for the RESP-02 check.
    quality: qualityRef ? { ...qualityRef.live } : null,
    // Frames actually rendered since boot, for the on-demand rendering check (PERF-06).
    renders: loop.renders(),
  }),
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
