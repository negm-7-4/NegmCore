// src/gl/BackdropEffect.ts
// Composites the black<->white "world" behind the tone-mapped scene inside the final
// post pass. Why here and not as scene.background: tone mapping would turn #FFFFFF into
// grey (ACES maps 1.0 to ~0.8). The scene is rendered with clear alpha 0, so its alpha is
// premultiplied coverage and the backdrop only fills what geometry does not cover.
import { Uniform } from 'three';
import { BlendFunction, Effect } from 'postprocessing';

const fragmentShader = /* glsl */ `
uniform float uMix;        // 0 = black world, 1 = white world, between = gradient sweep
uniform float uDirection;  // +1: white enters from the bottom, -1: white enters from the top
uniform float uFlash;      // extension: 0..1 white-out that hides the Bore Shot's cut (FX-01)

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float y = uDirection > 0.0 ? uv.y : 1.0 - uv.y;
  float lightness = smoothstep(0.0, 1.0, uMix * 2.0 - y);   // perceptual lightness (OKLab L)
  vec3 backdrop = vec3(lightness * lightness * lightness);   // L^3 = linear luminance for neutrals
  backdrop += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;       // 1-LSB dither: no banding in the sweep
  outputColor = vec4(inputColor.rgb + backdrop * (1.0 - inputColor.a), 1.0);
  outputColor.rgb = mix(outputColor.rgb, vec3(1.0), uFlash);
}`;

export class BackdropEffect extends Effect {
  constructor() {
    super('BackdropEffect', fragmentShader, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['uMix', new Uniform(0)],
        ['uDirection', new Uniform(1)],
        ['uFlash', new Uniform(0)],
      ]),
    });
  }

  /** Tween `.value` 0..1 with GSAP. */
  get mix(): Uniform<number> {
    return this.uniforms.get('uMix') as Uniform<number>;
  }

  /**
   * Which edge white enters from as mix goes 0 to 1 (and leaves through, last, as it goes 1 to 0).
   * +1 = bottom: mid-sweep the frame reads black to white, top to bottom (Ignite).
   * -1 = top: mid-sweep the frame reads white to black, top to bottom (Collapse).
   */
  get direction(): Uniform<number> {
    return this.uniforms.get('uDirection') as Uniform<number>;
  }

  /** Extension (FX-01): mixes the final frame toward white; 0 at rest. */
  get flash(): Uniform<number> {
    return this.uniforms.get('uFlash') as Uniform<number>;
  }
}
