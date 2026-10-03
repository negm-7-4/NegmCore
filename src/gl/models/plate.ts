// src/gl/models/plate.ts — bumper plates (GL-05) and their lettering (GL-06).
// 450 mm diameter, 50.4 mm bore; thickness is art-directed per weight. The plate is a lathe
// with hub, recessed face and rim lip; the lettering is a two-point lathe annulus whose U runs
// around the ring, textured with a straight canvas strip so the browser shapes the Arabic.
// A PlateSet draws N identical plates as two instanced draw calls (body + lettering).
import {
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshPhysicalMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  Vector2,
} from 'three';
import { MATERIAL, patchEnvBlend, tokenCss, type Materials } from '../materials';

export type PlateWeight = 20 | 15 | 10;

export const PLATE = {
  radius: 0.225,
  bore: 0.0252,
  recess: 0.006,
  thickness: { 20: 0.054, 15: 0.04, 10: 0.03 } as Record<PlateWeight, number>,
  letterInner: 0.075,
  letterOuter: 0.188,
} as const;

const ALONG_X = new Matrix4().makeRotationZ(-Math.PI / 2);

function plateProfile(t: number): Vector2[] {
  const h = t / 2;
  const d = PLATE.recess;
  const R = PLATE.radius;
  const b = PLATE.bore;
  const face = (sign: number): Vector2[] => [
    new Vector2(b + 0.002, sign * h),
    new Vector2(0.058, sign * h),
    new Vector2(0.061, sign * (h - 0.002)),
    new Vector2(0.064, sign * (h - d)),
    new Vector2(0.196, sign * (h - d)),
    new Vector2(0.2, sign * (h - 0.002)),
    new Vector2(0.204, sign * h),
    new Vector2(R - 0.005, sign * h),
    new Vector2(R - 0.0012, sign * (h - 0.0012)),
    new Vector2(R, sign * (h - 0.005)),
  ];
  // Bore (-h -> +h), front face inward-out, rim, back face outward-in, closing at the bore.
  return [new Vector2(b, -h + 0.002), new Vector2(b, h - 0.002), ...face(1), ...face(-1).reverse(), new Vector2(b, -h + 0.002)];
}

const geometryCache = new Map<string, LatheGeometry>();

function plateGeometry(weight: PlateWeight, segments: number): LatheGeometry {
  const key = `${weight}:${segments}`;
  let g = geometryCache.get(key);
  if (!g) {
    g = new LatheGeometry(plateProfile(PLATE.thickness[weight]), segments);
    g.applyMatrix4(ALONG_X);
    geometryCache.set(key, g);
  }
  return g;
}

function ringGeometry(segments: number): LatheGeometry {
  const key = `ring:${segments}`;
  let g = geometryCache.get(key);
  if (!g) {
    g = new LatheGeometry([new Vector2(PLATE.letterOuter, 0), new Vector2(PLATE.letterInner, 0)], segments);
    g.applyMatrix4(ALONG_X);
    geometryCache.set(key, g);
  }
  return g;
}

const W = 2048;
const H = 256;
const BANDS: Array<[PlateWeight, boolean]> = [
  [20, false],
  [15, false],
  [10, false],
  [20, true],
  [15, true],
  [10, true],
];
let atlasCanvas: HTMLCanvasElement | null = null;
let atlasTexture: CanvasTexture | null = null;

/** One canvas holds every engraving strip (three weights, plain and highlighted), so all
 *  lettering materials share a single GPU texture (texture budget, PERF-02). */
function atlas(): CanvasTexture {
  if (atlasTexture) return atlasTexture;
  atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = W;
  atlasCanvas.height = H * BANDS.length;
  const g = atlasCanvas.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  g.fillStyle = tokenCss('void');
  g.fillRect(0, 0, W, H * BANDS.length);
  BANDS.forEach(([weight, highlight], i) => {
    g.save();
    g.translate(0, i * H);
    drawStrip(g, weight, highlight);
    g.restore();
  });
  atlasTexture = new CanvasTexture(atlasCanvas);
  atlasTexture.colorSpace = SRGBColorSpace;
  atlasTexture.anisotropy = 8;
  atlasTexture.wrapS = atlasTexture.wrapT = RepeatWrapping;
  return atlasTexture;
}

/** The engraving strip: the wordmark and the weight, twice around the ring. */
function drawStrip(g: CanvasRenderingContext2D, weight: PlateWeight, highlight: boolean): void {
  g.textBaseline = 'middle';
  const steel = tokenCss('iron-200');
  const star = (x: number): void => {
    g.save();
    g.translate(x, H / 2);
    g.fillStyle = steel;
    g.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const r = i % 2 === 0 ? 34 : 9;
      const a = (i * Math.PI) / 4;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.fill();
    g.restore();
  };
  // The run: wordmark, star, weight, star; twice around the ring. Measured, so nothing
  // overlaps across the seam.
  const brandFont = (px: number): string => `800 ${px}px "Barlow Condensed", sans-serif`;
  const numFont = (px: number): string => `700 ${px}px "Barlow Condensed", sans-serif`;
  const brand = 'NEGM CORE';
  const label = `${weight} KG`;
  const gap = 40;
  const starW = 56;
  const measure = (scale: number): [number, number] => {
    g.font = brandFont(104 * scale);
    const b = g.measureText(brand).width;
    g.font = numFont(132 * scale);
    return [b, g.measureText(label).width];
  };
  let scale = 1;
  let [bw, nw] = measure(scale);
  if (bw + nw + starW * 2 + gap * 4 > W / 2) {
    scale = (W / 2 - starW * 2 - gap * 4) / (bw + nw);
    [bw, nw] = measure(scale);
  }
  const spare = (W / 2 - (bw + nw + starW * 2)) / 4;
  g.textAlign = 'left';
  for (let rep = 0; rep < 2; rep += 1) {
    let x = rep * (W / 2) + spare / 2;
    g.fillStyle = steel;
    g.font = brandFont(104 * scale);
    g.fillText(brand, x, H / 2 + 6);
    x += bw + spare;
    star(x + starW / 2);
    x += starW + spare;
    g.font = numFont(132 * scale);
    g.fillStyle = highlight ? tokenCss('signal') : steel;
    g.fillText(label, x, H / 2 + 4);
    x += nw + spare;
    star(x + starW / 2);
  }
}

/** A view of one band of the atlas. The ring's V runs from the outer edge inward, so the band
 *  is flipped in V to keep the letters' tops toward the rim; U is flipped so the run reads
 *  left to right from outside the plate (Appendix B). */
function letteringTexture(weight: PlateWeight, highlight: boolean): Texture {
  const band = BANDS.findIndex(([w, h]) => w === weight && h === highlight);
  const texture = atlas().clone();
  const n = BANDS.length;
  // Canvas row `band` (top = 0) spans v in [1 - (band + 1) / n, 1 - band / n].
  texture.repeat.set(-1, -1 / n);
  texture.offset.set(1, 1 - band / n);
  return texture;
}

const letteringCache = new Map<string, { material: MeshPhysicalMaterial; texture: Texture }>();

export function letteringMaterial(weight: PlateWeight, highlight: boolean, materials: Materials): MeshPhysicalMaterial {
  const key = `${weight}:${highlight}`;
  let entry = letteringCache.get(key);
  if (!entry) {
    const texture = letteringTexture(weight, highlight);
    const material = patchEnvBlend(
      new MeshPhysicalMaterial({
        color: new Color(1, 1, 1),
        map: texture,
        alphaMap: texture,
        alphaTest: 0.5,
        bumpMap: texture,
        bumpScale: 2.5,
        metalness: MATERIAL.plate.metalness,
        roughness: 0.42,
        envMap: materials.plate.envMap ?? null,
      }),
    );
    entry = { material, texture };
    letteringCache.set(key, entry);
  }
  return entry.material;
}

export interface PlateSet {
  group: Group;
  items: Object3D[];
  weight: PlateWeight;
  thickness: number;
  setHighlight(on: boolean): void;
  /** Darkens plate `index` by `dim` (0..1) and lights its lettering ring by `glow` (0..1). */
  tint(index: number, dim: number, glow: number): void;
  sync(): void;
  dispose(): void;
}

const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const WHITE = new Color(1, 1, 1);
const tintColor = new Color();
let signal: Color | null = null;

export function createPlateSet(weight: PlateWeight, count: number, materials: Materials, segments: number): PlateSet {
  const group = new Group();
  const t = PLATE.thickness[weight];
  const body = new InstancedMesh(plateGeometry(weight, segments), materials.plate, count);
  const letters = new InstancedMesh(ringGeometry(segments), letteringMaterial(weight, false, materials), count * 2);
  group.add(body, letters);
  const items = Array.from({ length: count }, () => new Object3D());
  const lift = t / 2 - PLATE.recess + 0.0007;
  const front = new Matrix4().makeTranslation(lift, 0, 0);
  const back = new Matrix4().makeRotationY(Math.PI).premultiply(new Matrix4().makeTranslation(-lift, 0, 0));
  const m = new Matrix4();
  // Every set carries instance colours, so tinting adds no shader variant (PERF-02).
  for (let i = 0; i < count; i += 1) {
    body.setColorAt(i, WHITE);
    letters.setColorAt(i * 2, WHITE);
    letters.setColorAt(i * 2 + 1, WHITE);
  }

  const sync = (): void => {
    items.forEach((item, i) => {
      item.updateMatrix();
      if (!item.visible) {
        body.setMatrixAt(i, HIDDEN);
        letters.setMatrixAt(i * 2, HIDDEN);
        letters.setMatrixAt(i * 2 + 1, HIDDEN);
        return;
      }
      body.setMatrixAt(i, item.matrix);
      letters.setMatrixAt(i * 2, m.multiplyMatrices(item.matrix, front));
      letters.setMatrixAt(i * 2 + 1, m.multiplyMatrices(item.matrix, back));
    });
    body.instanceMatrix.needsUpdate = true;
    letters.instanceMatrix.needsUpdate = true;
    body.computeBoundingSphere();
    letters.computeBoundingSphere();
  };
  sync();

  return {
    group,
    items,
    weight,
    thickness: t,
    setHighlight(on: boolean) {
      letters.material = letteringMaterial(weight, on, materials);
    },
    tint(index: number, dim: number, glow: number) {
      signal ??= new Color().setStyle(tokenCss('signal'), SRGBColorSpace);
      const k = 1 - 0.7 * dim;
      body.setColorAt(index, tintColor.setScalar(k));
      // Above 1 the ring reads as lit, not just recoloured; bloom stays on the Core (FX-03).
      tintColor.copy(WHITE).lerp(signal, glow).multiplyScalar(k * (1 + 0.6 * glow));
      letters.setColorAt(index * 2, tintColor);
      letters.setColorAt(index * 2 + 1, tintColor);
      if (body.instanceColor) body.instanceColor.needsUpdate = true;
      if (letters.instanceColor) letters.instanceColor.needsUpdate = true;
    },
    sync,
    dispose() {
      body.dispose();
      letters.dispose();
    },
  };
}

export function disposePlateResources(): void {
  geometryCache.forEach((g) => g.dispose());
  geometryCache.clear();
  letteringCache.forEach(({ material }) => material.dispose());
  letteringCache.clear();
  atlasTexture?.dispose();
  atlasTexture = null;
  atlasCanvas = null;
}
