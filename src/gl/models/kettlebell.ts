// src/gl/models/kettlebell.ts — a cast-iron kettlebell: lathe body plus tube handle, merged
// into one geometry with vertex colours so it is a single draw call (GL-07).
import {
  BufferAttribute,
  type BufferGeometry,
  CatmullRomCurve3,
  LatheGeometry,
  Mesh,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { token, type Materials } from '../materials';

function paint(geometry: BufferGeometry, r: number, g: number, b: number): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) colors.set([r, g, b], i * 3);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

export function createKettlebell(materials: Materials, segments: number): Mesh {
  // Bell: flat foot, round belly, narrowing shoulder where the horns start. Height ~0.24 m.
  const profile: Vector2[] = [new Vector2(0.0001, -0.105), new Vector2(0.066, -0.105), new Vector2(0.072, -0.1)];
  for (let i = 0; i <= 16; i += 1) {
    const a = -Math.PI * 0.36 + (i / 16) * Math.PI * 0.84;
    profile.push(new Vector2(Math.cos(a) * 0.112, Math.sin(a) * 0.112 - 0.005));
  }
  profile.push(new Vector2(0.0001, 0.107));
  const body = new LatheGeometry(profile, segments);

  const handlePath = new CatmullRomCurve3([
    new Vector3(-0.072, 0.055, 0),
    new Vector3(-0.08, 0.13, 0),
    new Vector3(-0.065, 0.2, 0),
    new Vector3(0, 0.228, 0),
    new Vector3(0.065, 0.2, 0),
    new Vector3(0.08, 0.13, 0),
    new Vector3(0.072, 0.055, 0),
  ]);
  const handle = new TubeGeometry(handlePath, 48, 0.017, Math.max(12, segments / 4), false);

  const iron = token('iron-900');
  for (const g of [body, handle]) {
    g.deleteAttribute('uv');
    paint(g, iron.r, iron.g, iron.b);
  }
  const merged = mergeGeometries([body.toNonIndexed(), handle.toNonIndexed()]);
  body.dispose();
  handle.dispose();
  merged.translate(0, 0.105, 0);
  return new Mesh(merged, materials.graphite);
}
