// src/gl/models/motes.ts — chalk motes (GL-09, FX-06): one Points object whose particles live
// in a box that travels with the camera, so the whole journey has chalk in the air at a fixed
// cost. Drift is a GPU offset; scroll velocity stretches each sprite into a streak.
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  NormalBlending,
  Points,
  ShaderMaterial,
  Uniform,
  Vector2,
  Vector3,
} from 'three';
import { token, tokenCss } from '../materials';

const vertex = /* glsl */ `
uniform vec3 uCenter;
uniform vec3 uBox;
uniform vec3 uOffset;
uniform float uSize;
uniform float uPixelRatio;
attribute float aSeed;
varying float vFade;
void main() {
  vec3 p = (fract(position + uOffset * (0.6 + aSeed * 0.8)) - 0.5) * uBox;
  vec4 mv = modelViewMatrix * vec4(uCenter + p, 1.0);
  float depth = -mv.z;
  vFade = smoothstep(0.08, 0.6, depth) * (1.0 - smoothstep(uBox.z * 0.35, uBox.z * 0.5, depth)) * (0.35 + aSeed * 0.65);
  gl_PointSize = uSize * (0.5 + aSeed) * uPixelRatio / max(depth, 0.05);
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform sampler2D uSprite;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uStreak;
uniform vec2 uDir;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  // Stretch along the motion direction: compress the sample coordinate across it.
  vec2 d = normalize(uDir + vec2(0.0001));
  vec2 n = vec2(-d.y, d.x);
  vec2 q = vec2(dot(c, d) * (1.0 - 0.8 * uStreak), dot(c, n) * (1.0 + 2.5 * uStreak));
  float a = texture2D(uSprite, q + 0.5).g * vFade * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * a, a);
}`;

function spriteTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, tokenCss('flare'));
  gradient.addColorStop(0.4, tokenCss('iron-500'));
  gradient.addColorStop(1, tokenCss('void'));
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

export interface Motes {
  points: Points;
  /** Burst: a short-lived boost in opacity and drift (impacts, FX-04). */
  burst: { value: number };
  update(dt: number, ambientScale: number, camera: Vector3, velocity: number, world: number): void;
  setCount(count: number): void;
  dispose(): void;
}

export function createMotes(count: number, pixelRatio: number): Motes {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  // A fixed pseudo-random sequence keeps every QA frame identical.
  let s = 1234567;
  const rnd = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i += 1) {
    positions.set([rnd(), rnd(), rnd()], i * 3);
    seeds[i] = rnd();
  }
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  const sprite = spriteTexture();
  const dark = token('iron-200');
  const light = token('iron-600');
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uCenter: new Uniform(new Vector3()),
      uBox: new Uniform(new Vector3(5, 3.2, 6)),
      uOffset: new Uniform(new Vector3()),
      uSize: new Uniform(0.018 * 900),
      uPixelRatio: new Uniform(pixelRatio),
      uSprite: new Uniform(sprite),
      uColor: new Uniform(new Color().copy(dark)),
      uOpacity: new Uniform(0.55),
      uStreak: new Uniform(0),
      uDir: new Uniform(new Vector2(0, 1)),
    },
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  const burst = { value: 0 };
  const offset = material.uniforms.uOffset.value as Vector3;
  const u = material.uniforms;

  return {
    points,
    burst,
    update(dt, ambientScale, camera, velocity, world) {
      offset.x += dt * 0.006 * ambientScale + dt * burst.value * 0.05;
      offset.y += dt * 0.011 * ambientScale + dt * burst.value * 0.08;
      offset.z += dt * 0.004 * ambientScale;
      (u.uCenter.value as Vector3).copy(camera);
      u.uStreak.value = Math.min(1, Math.abs(velocity) * 1.4);
      (u.uColor.value as Color).copy(dark).lerp(light, world);
      u.uOpacity.value = (0.5 - 0.34 * world) * (1 + burst.value * 1.5);
    },
    setCount(n: number) {
      geometry.setDrawRange(0, Math.min(count, n));
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      sprite.dispose();
    },
  };
}
