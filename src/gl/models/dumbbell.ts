// src/gl/models/dumbbell.ts — a hex dumbbell: two six-sided lathe heads and a knurled steel
// handle in one geometry and one material (GL-07). The material's single canvas carries bump
// (R), roughness (G) and metalness (B): heads sample its flat half, the handle its knurled half.
import {
  BufferAttribute,
  type BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  RepeatWrapping,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { patchEnvBlend, token, type Materials } from '../materials';

function atlas(): CanvasTexture {
  const W = 256;
  const H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  // Heads: no bump, roughness 0.5, metalness 0.55 (plate finish). Handle: knurl, steel 0.28, 1.0.
  g.fillStyle = 'rgb(0 128 140)';
  g.fillRect(0, 0, W / 2, H);
  g.fillStyle = 'rgb(0 71 255)';
  g.fillRect(W / 2, 0, W / 2, H);
  g.save();
  g.beginPath();
  g.rect(W / 2, 0, W / 2, H);
  g.clip();
  g.strokeStyle = 'rgb(255 71 255)';
  g.lineWidth = 2;
  for (let i = W / 2 - H; i < W + H; i += 6) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + H, H);
    g.moveTo(i, H);
    g.lineTo(i + H, 0);
    g.stroke();
  }
  g.restore();
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

/** Remaps a geometry's U into [u0, u1] so it samples one half of the atlas. */
function remapU(geometry: BufferGeometry, u0: number, u1: number, vScale = 1): void {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), uv.getY(i) * vScale);
  uv.needsUpdate = true;
}

function paint(geometry: BufferGeometry, rgb: [number, number, number]): void {
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) colors.set(rgb, i * 3);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
}

export interface Dumbbell {
  mesh: Mesh;
  dispose(): void;
}

export function createDumbbell(materials: Materials): Dumbbell {
  const head = (): LatheGeometry => {
    const r = 0.068;
    const w = 0.1;
    const g = new LatheGeometry(
      [new Vector2(0.0001, -w / 2), new Vector2(r - 0.004, -w / 2), new Vector2(r, -w / 2 + 0.004), new Vector2(r, w / 2 - 0.004), new Vector2(r - 0.004, w / 2), new Vector2(0.0001, w / 2)],
      6,
    );
    g.rotateZ(-Math.PI / 2);
    return g;
  };
  const iron = token('iron-900');
  const steel = token('iron-400');
  const left = head();
  left.translate(-0.115, 0, 0);
  const right = head();
  right.translate(0.115, 0, 0);
  const handle = new CylinderGeometry(0.016, 0.016, 0.13, 32, 1, true);
  handle.rotateZ(-Math.PI / 2);
  for (const g of [left, right]) {
    remapU(g, 0.02, 0.46);
    paint(g, [iron.r, iron.g, iron.b]);
  }
  remapU(handle, 0.54, 0.98, 3);
  paint(handle, [steel.r, steel.g, steel.b]);
  const geometry = mergeGeometries([left.toNonIndexed(), right.toNonIndexed(), handle.toNonIndexed()]);
  [left, right, handle].forEach((g) => g.dispose());

  const texture = atlas();
  const material = patchEnvBlend(
    new MeshPhysicalMaterial({
      vertexColors: true,
      metalness: 1,
      roughness: 1,
      metalnessMap: texture,
      roughnessMap: texture,
      bumpMap: texture,
      bumpScale: 0.6,
      envMapIntensity: 1.8,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      envMap: materials.plate.envMap,
    }),
  );
  const mesh = new Mesh(geometry, material);
  return {
    mesh,
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
