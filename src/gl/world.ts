// src/gl/world.ts — assembles the GL layer: renderer, environments, materials, post, rig and
// the shared objects (motes). Chapters add their own objects to `world.scene` and read the
// shared materials from here. One render per tick, called by the loop after GSAP has run.
import { MathUtils } from 'three';
import type { LiveQuality, TierSettings } from '../core/quality';
import { store } from '../core/store';
import { createEnvironments, type Environments } from './environment';
import { applyEnvironment, createMaterials, type Materials } from './materials';
import { createMotes, type Motes } from './models/motes';
import { disposePlateResources } from './models/plate';
import { createPost, type Post } from './post';
import { createRenderer, type GLCore } from './renderer';
import { Rig } from './rig';

export interface World extends GLCore {
  env: Environments | null;
  materials: Materials;
  post: Post;
  rig: Rig;
  motes: Motes;
  tier: TierSettings;
  /** 0 = black world, 1 = white world. Drives backdrop, env blend, materials, post. */
  setWorld(value: number, direction?: 1 | -1): void;
  /** Renders one frame. The rig and props are updated earlier in the tick (main.ts). */
  frame(dt: number, ambientTime: number, ambientScale: number, velocity: number): void;
  applyQuality(quality: LiveQuality): void;
  /** Builds the two studios and lights every material with them (preloader milestone 3). */
  buildEnvironment(): void;
}

export function createWorld(canvas: HTMLCanvasElement, tier: TierSettings, dpr: number, onLost: () => void): World {
  const core = createRenderer(canvas, dpr, onLost);
  const materials = createMaterials();
  const post = createPost(core.renderer, core.scene, core.camera, tier);
  const rig = new Rig(core.camera);
  const motes = createMotes(tier.motes, dpr);
  core.scene.add(motes.points);

  let lastW = -1;
  let lastH = -1;
  const sizeTo = (): void => {
    core.resize();
    const { width, height } = core.size;
    if (width === lastW && height === lastH) return;
    lastW = width;
    lastH = height;
    post.setSize(width, height);
    rig.applyViewport(width, height);
  };
  sizeTo();

  const world: World = {
    ...core,
    env: null,
    materials,
    post,
    rig,
    motes,
    tier,
    setWorld(value: number, direction?: 1 | -1) {
      const w = MathUtils.clamp(value, 0, 1);
      if (direction) post.backdrop.direction.value = direction;
      post.backdrop.mix.value = w;
      post.fx.world = w;
      materials.setWorld(w);
      store.set('world', w);
    },
    frame(dt, _ambientTime, ambientScale, velocity) {
      sizeTo();
      motes.update(dt, ambientScale, core.camera.position, velocity, post.fx.world);
      post.fx.velocity = velocity;
      core.renderer.info.reset();
      post.render(dt);
    },
    buildEnvironment() {
      if (world.env) return;
      world.env = createEnvironments(core.renderer);
      applyEnvironment(world.env.dark, world.env.light);
    },
    applyQuality(quality: LiveQuality) {
      core.setPixelRatio(quality.dpr);
      post.setSize(core.size.width, core.size.height);
      post.apply(quality);
    },
    dispose() {
      post.dispose();
      motes.dispose();
      materials.dispose();
      disposePlateResources();
      world.env?.dispose();
      core.dispose();
    },
  };
  return world;
}
