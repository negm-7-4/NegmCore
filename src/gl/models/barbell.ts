// src/gl/models/barbell.ts — an IWF men's bar in metres (GL-02, GL-04).
// Shaft 1.31 m x 28 mm with two knurled zones and a smooth centre; 30 mm collars; 415 mm x
// 50 mm sleeves with end caps; 2.2 m overall. The bar's axis is X. Identical halves are
// instanced (GL-03), so the whole bar is three draw calls, plus one for the lock collars.
import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  Object3D,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Materials } from '../materials';

export const BAR = {
  shaftLength: 1.31,
  shaftRadius: 0.014,
  collarWidth: 0.03,
  collarRadius: 0.0375,
  sleeveLength: 0.415,
  sleeveRadius: 0.025,
  overall: 2.2,
  knurlInner: 0.21,
  knurlOuter: 0.6,
  /** Where the loadable sleeve starts, measured from the centre. */
  sleeveStart: 0.685,
  sleeveEnd: 1.1,
} as const;

export interface Barbell {
  group: Group;
  /** Lock collars (spin-on clamps). Index 0 is the +X side, 1 the -X side. */
  lockCollars: Object3D[];
  sync(): void;
  dispose(): void;
}

const ALONG_X = new Matrix4().makeRotationZ(-Math.PI / 2);
const FLIP = new Matrix4().makeRotationY(Math.PI);

/** Profile of one bar end, from the knurl's outer edge to the end cap, along +Y before rotation. */
function endProfile(): Vector2[] {
  const { shaftRadius: r, collarRadius: c, sleeveRadius: s } = BAR;
  return [
    new Vector2(r, BAR.knurlOuter),
    new Vector2(r, 0.651),
    new Vector2(r + 0.002, 0.654),
    new Vector2(c - 0.002, 0.655),
    new Vector2(c, 0.6565),
    new Vector2(c, 0.6835),
    new Vector2(c - 0.002, 0.685),
    new Vector2(s + 0.001, 0.6855),
    new Vector2(s, 0.687),
    new Vector2(s, 1.096),
    new Vector2(s - 0.0015, 1.0995),
    new Vector2(s - 0.004, 1.1),
    new Vector2(0.0001, 1.1),
  ];
}

/** A spring-free competition collar: a ring with a lever, so its spin reads on screen. */
function lockCollarGeometry(segments: number): BufferGeometry {
  const w = 0.035;
  const ring = new LatheGeometry(
    [
      new Vector2(0.0255, -w / 2),
      new Vector2(0.041, -w / 2),
      new Vector2(0.0425, -w / 2 + 0.002),
      new Vector2(0.0425, w / 2 - 0.002),
      new Vector2(0.041, w / 2),
      new Vector2(0.0255, w / 2),
      new Vector2(0.0255, -w / 2),
    ],
    segments,
  );
  ring.deleteAttribute('uv');
  const lever = new BoxGeometry(0.014, 0.024, 0.022);
  lever.translate(0, 0, 0.05);
  lever.deleteAttribute('uv');
  const merged = mergeGeometries([ring.toNonIndexed(), lever.toNonIndexed()]);
  merged.applyMatrix4(ALONG_X);
  return merged;
}

export function createBarbell(materials: Materials, segments: number): Barbell {
  const group = new Group();
  const radial = Math.max(24, Math.round(segments / 2));

  const centre = new CylinderGeometry(BAR.shaftRadius, BAR.shaftRadius, BAR.knurlInner * 2, radial, 1, true);
  centre.applyMatrix4(ALONG_X);
  const centreMesh = new Mesh(centre, materials.steel);
  group.add(centreMesh);

  const knurlLength = BAR.knurlOuter - BAR.knurlInner;
  const knurl = new CylinderGeometry(BAR.shaftRadius, BAR.shaftRadius, knurlLength, radial, 1, true);
  knurl.applyMatrix4(ALONG_X);
  const knurlMesh = new InstancedMesh(knurl, materials.steelKnurl, 2);
  const mid = BAR.knurlInner + knurlLength / 2;
  knurlMesh.setMatrixAt(0, new Matrix4().makeTranslation(mid, 0, 0));
  knurlMesh.setMatrixAt(1, new Matrix4().makeTranslation(-mid, 0, 0));
  group.add(knurlMesh);

  const ends = new LatheGeometry(endProfile(), segments);
  ends.applyMatrix4(ALONG_X);
  const endMesh = new InstancedMesh(ends, materials.chrome, 2);
  endMesh.setMatrixAt(0, new Matrix4());
  endMesh.setMatrixAt(1, FLIP);
  group.add(endMesh);

  const collarGeometry = lockCollarGeometry(segments);
  const collarMesh = new InstancedMesh(collarGeometry, materials.chrome, 2);
  const lockCollars = [new Object3D(), new Object3D()];
  lockCollars[0].position.set(BAR.sleeveEnd + 0.4, 0, 0);
  lockCollars[1].position.set(-BAR.sleeveEnd - 0.4, 0, 0);
  lockCollars[1].rotation.y = Math.PI;
  lockCollars.forEach((c) => (c.visible = false));
  group.add(collarMesh);

  const hidden = new Matrix4().makeScale(0, 0, 0);
  const sync = (): void => {
    lockCollars.forEach((collar, i) => {
      collar.updateMatrix();
      collarMesh.setMatrixAt(i, collar.visible ? collar.matrix : hidden);
    });
    collarMesh.instanceMatrix.needsUpdate = true;
    collarMesh.computeBoundingSphere();
  };
  sync();

  return {
    group,
    lockCollars,
    sync,
    dispose() {
      centre.dispose();
      knurl.dispose();
      ends.dispose();
      collarGeometry.dispose();
      knurlMesh.dispose();
      endMesh.dispose();
      collarMesh.dispose();
    },
  };
}
