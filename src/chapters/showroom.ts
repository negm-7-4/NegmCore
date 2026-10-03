// src/chapters/showroom.ts — TEMPORARY (P2 only): presents each model alone on black and on
// white, close and far, so materials and lighting can be judged before any choreography.
// Removed at the start of P3.
import { Group, Mesh, PlaneGeometry } from 'three';
import { clock, loop } from '../core/loop';
import { store } from '../core/store';
import { createBarbell } from '../gl/models/barbell';
import { createCore } from '../gl/models/core';
import { createDumbbell } from '../gl/models/dumbbell';
import { createKettlebell } from '../gl/models/kettlebell';
import { createPlateSet, PLATE } from '../gl/models/plate';
import { Shot, type PoseDef } from '../gl/rig';
import type { World } from '../gl/world';

const X0 = 200;

export type ShowroomModel = 'barbell' | 'loaded' | 'plate' | 'kettlebell' | 'dumbbell' | 'core';

let built: Group | null = null;
const stations = new Map<ShowroomModel, { group: Group; close: PoseDef; far: PoseDef }>();

function build(world: World): void {
  const root = new Group();
  const seg = world.tier.latheSegments;
  const m = world.materials;
  const shadow = (w: number, d: number, y: number): Mesh => {
    const blob = new Mesh(new PlaneGeometry(w, d), m.shadow);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = y;
    return blob;
  };

  const add = (name: ShowroomModel, i: number, content: Group | Mesh, close: PoseDef, far: PoseDef): void => {
    const group = new Group();
    group.position.x = X0 + i * 20;
    group.add(content);
    root.add(group);
    const shift = (p: PoseDef): PoseDef => ({ ...p, pos: [p.pos[0] + group.position.x, p.pos[1], p.pos[2]], look: [p.look[0] + group.position.x, p.look[1], p.look[2]] });
    stations.set(name, { group, close: shift(close), far: shift(far) });
  };

  const bar = createBarbell(m, seg);
  const barGroup = new Group();
  barGroup.add(bar.group, shadow(2.4, 0.5, -0.24));
  add('barbell', 0, barGroup, { pos: [-0.62, 0.08, 0.32], look: [-0.62, 0, 0], fov: 32 }, { pos: [0, 0.28, 3.3], look: [0, 0, 0], fov: 32 });

  const loaded = createBarbell(m, seg);
  const plates = createPlateSet(20, 6, m, seg);
  plates.items.forEach((item, i) => {
    const side = i < 3 ? 1 : -1;
    const k = i % 3;
    item.position.set(side * (0.685 + PLATE.thickness[20] * (k + 0.5)), 0, 0);
  });
  loaded.lockCollars.forEach((c, i) => {
    c.visible = true;
    c.position.x = (i === 0 ? 1 : -1) * (0.685 + PLATE.thickness[20] * 3 + 0.02);
  });
  plates.sync();
  loaded.sync();
  const loadedGroup = new Group();
  loadedGroup.add(loaded.group, plates.group, shadow(2.6, 0.6, -0.225));
  add('loaded', 1, loadedGroup, { pos: [-1.35, 0.06, 0.42], look: [-0.78, 0, 0], fov: 32 }, { pos: [0.4, 0.5, 3.6], look: [0, 0, 0], fov: 32 });

  const single = createPlateSet(20, 1, m, seg);
  single.items[0].rotation.y = -Math.PI / 2 + 0.35;
  single.sync();
  const plateGroup = new Group();
  plateGroup.add(single.group, shadow(0.7, 0.4, -0.225));
  add('plate', 2, plateGroup, { pos: [0, 0.02, 0.62], look: [0, 0, 0], fov: 32 }, { pos: [0, 0.3, 1.9], look: [0, 0, 0], fov: 32 });

  const kb = createKettlebell(m, seg);
  const kbGroup = new Group();
  kbGroup.add(kb, shadow(0.4, 0.4, 0.001));
  kb.rotation.y = 0.5;
  add('kettlebell', 3, kbGroup, { pos: [0, 0.2, 0.62], look: [0, 0.12, 0], fov: 32 }, { pos: [0, 0.5, 1.8], look: [0, 0.12, 0], fov: 32 });

  const db = createDumbbell(m);
  const dbGroup = new Group();
  db.mesh.rotation.y = 0.5;
  dbGroup.add(db.mesh, shadow(0.5, 0.3, -0.07));
  add('dumbbell', 4, dbGroup, { pos: [0, 0.12, 0.5], look: [0, 0, 0], fov: 32 }, { pos: [0, 0.4, 1.6], look: [0, 0, 0], fov: 32 });

  const coreObj = createCore(seg);
  loop.onUpdate((_dt, t) => coreObj.update(t, clock.ambientScale, store.get('world')));
  const coreGroup = new Group();
  coreGroup.add(coreObj.group);
  add('core', 5, coreGroup, { pos: [0, 0, 0.45], look: [0, 0, 0], fov: 32 }, { pos: [0, 0, 1.6], look: [0, 0, 0], fov: 32 });

  world.scene.add(root);
  built = root;
}

export function showroom(world: World, name: ShowroomModel, white: boolean, far: boolean): void {
  if (!built) build(world);
  stations.forEach((station, key) => (station.group.visible = key === name));
  const station = stations.get(name);
  if (!station) return;
  world.setWorld(white ? 1 : 0, 1);
  world.rig.set(new Shot([far ? station.far : station.close]), 0);
}
