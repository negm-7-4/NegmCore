// src/gl/models/core.ts — the Core (GL-08): an emissive sphere in `core` green with a fresnel
// halo. It is the only object allowed to bloom strongly: its colour is pushed far above 1.0
// while every other material stays near the bloom threshold.
import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  Uniform,
} from 'three';
import { token } from '../materials';

export interface CoreObject {
  group: Group;
  /** 0..n: drives core brightness and halo strength (pulse, bore shot, form success). */
  intensity: { value: number };
  update(ambientTime: number, ambientScale: number, world: number): void;
  dispose(): void;
}

const haloVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const haloFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
  float glow = pow(facing, 2.6) * uStrength;
  // Alpha stays 0: the halo adds light without hiding the world behind it.
  gl_FragColor = vec4(uColor * glow, 0.0);
}`;

export function createCore(segments: number): CoreObject {
  const group = new Group();
  const base = token('core');
  const sphereGeometry = new SphereGeometry(0.032, Math.max(24, segments / 2), Math.max(16, segments / 4));
  const sphereMaterial = new MeshBasicMaterial({ color: base.clone().multiplyScalar(9) });
  const sphere = new Mesh(sphereGeometry, sphereMaterial);
  const haloGeometry = new SphereGeometry(0.17, 32, 16);
  const haloMaterial = new ShaderMaterial({
    vertexShader: haloVertex,
    fragmentShader: haloFragment,
    uniforms: { uColor: new Uniform(new Color().copy(base).multiplyScalar(2.2)), uStrength: new Uniform(0.6) },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const halo = new Mesh(haloGeometry, haloMaterial);
  group.add(halo, sphere);
  const intensity = { value: 1 };
  const strength = haloMaterial.uniforms.uStrength as Uniform<number>;

  return {
    group,
    intensity,
    update(ambientTime: number, ambientScale: number, world: number) {
      // A slow breath at rest (FX-07); frozen when ambient motion is paused or in QA.
      const pulse = 1 + 0.18 * Math.sin(ambientTime * 1.6) * Math.min(1, ambientScale + 0.0001);
      strength.value = 0.42 * intensity.value * pulse * (1 - 0.85 * world);
      // On white the Core must still read green, so it is not driven into white-hot.
      const heat = 7 + (1.4 - 7) * world;
      sphereMaterial.color.copy(base).multiplyScalar(heat * Math.max(0.35, intensity.value) * pulse);
      halo.scale.setScalar(0.85 + 0.25 * intensity.value);
    },
    dispose() {
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
    },
  };
}
