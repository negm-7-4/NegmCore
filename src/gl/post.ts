// src/gl/post.ts — the post chain (GL-13): RenderPass, then Bloom (mipmap blur),
// ChromaticAberration, ToneMapping (ACES), Backdrop, Vignette, Noise.
// ChromaticAberration runs in its own pass ahead of the shared EffectPass: merged, its shader
// re-reads the raw input for red and blue and would erase the bloom from those channels.
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  BlendFunction,
} from 'postprocessing';
import { HalfFloatType, type PerspectiveCamera, type Scene, Vector2, type WebGLRenderer } from 'three';
import type { LiveQuality, TierSettings } from '../core/quality';
import { BackdropEffect } from './BackdropEffect';

export interface Post {
  composer: EffectComposer;
  bloom: BloomEffect;
  aberration: ChromaticAberrationEffect;
  backdrop: BackdropEffect;
  vignette: VignetteEffect;
  noise: NoiseEffect;
  /** Live controls written by chapters and effects every frame. */
  fx: { bloom: number; aberration: number; exposure: number; world: number; velocity: number };
  apply(quality: LiveQuality): void;
  render(dt: number): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

const BLOOM_BASE = 0.55;
const NOISE_BASE = 0.07;
const VIGNETTE_BASE = 0.42;

export function createPost(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, tier: TierSettings): Post {
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: tier.msaa });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 0.88,
    luminanceSmoothing: 0.06,
    intensity: BLOOM_BASE,
    radius: 0.62,
    levels: 5,
    resolutionScale: tier.bloom === 'full' ? 1 : 0.5,
  });
  const aberration = new ChromaticAberrationEffect({ offset: new Vector2(0, 0), radialModulation: true, modulationOffset: 0.2 });
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const backdrop = new BackdropEffect();
  const vignette = new VignetteEffect({ offset: 0.32, darkness: VIGNETTE_BASE });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  noise.blendMode.opacity.value = NOISE_BASE;

  const caPass = new EffectPass(camera, aberration);
  let mainPass: EffectPass | null = null;
  let bloomOn = tier.bloom !== 'off';
  let caOn = tier.aberration;

  const rebuild = (): void => {
    if (mainPass) {
      composer.removePass(mainPass);
      mainPass.dispose();
    }
    composer.removePass(caPass);
    if (caOn) composer.addPass(caPass);
    const effects = [toneMapping, backdrop, vignette, noise];
    mainPass = new EffectPass(camera, ...(bloomOn ? [bloom, ...effects] : effects));
    composer.addPass(mainPass);
  };
  rebuild();

  const fx = { bloom: 0, aberration: 0, exposure: 1, world: 0, velocity: 0 };
  const caOffset = aberration.offset;

  return {
    composer,
    bloom,
    aberration,
    backdrop,
    vignette,
    noise,
    fx,
    apply(quality: LiveQuality) {
      const nextBloom = quality.bloom && tier.bloom !== 'off';
      const nextCa = quality.aberration && tier.aberration;
      if (nextBloom !== bloomOn || nextCa !== caOn) {
        bloomOn = nextBloom;
        caOn = nextCa;
        rebuild();
      }
    },
    render(dt: number) {
      const w = fx.world;
      // In the white world vignette darkness is 0 and grain at most 0.05 (FX-02);
      // bloom is held back so white never hazes (FX-03).
      vignette.darkness = VIGNETTE_BASE * (1 - w);
      noise.blendMode.opacity.value = NOISE_BASE * (1 - w) + 0.04 * w;
      bloom.intensity = (BLOOM_BASE + fx.bloom) * (1 - 0.7 * w);
      const ca = (fx.aberration + Math.abs(fx.velocity) * 0.0025) * (caOn ? 1 : 0);
      caOffset.set(ca, ca * 0.6);
      renderer.toneMappingExposure = fx.exposure;
      composer.render(dt);
    },
    setSize(width: number, height: number) {
      composer.setSize(width, height, false);
    },
    dispose() {
      composer.dispose();
      [bloom, aberration, toneMapping, backdrop, vignette, noise].forEach((e) => e.dispose());
    },
  };
}
