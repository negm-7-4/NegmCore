// src/gl/props.ts — every object the chapters choreograph, placed in four zones along +X
// (the journey mirrors with the English, LTR page), plus a per-frame director.
// Why proxies: hero, mass and ignite all move the same bar. If three timelines tweened the
// same transforms they would overwrite each other when scrubbed backwards. Instead each
// chapter tweens its own numbers in `state`, and `update()` derives the transforms once a frame.
import { Group, MathUtils, Mesh, MeshBasicMaterial, AdditiveBlending, PlaneGeometry, Vector3, type Object3D } from 'three';
import { PLAN_IDS, type PlanId } from '../core/store';
import { token } from './materials';
import { BAR, createBarbell, type Barbell } from './models/barbell';
import { createCore, type CoreObject } from './models/core';
import { createDumbbell, type Dumbbell } from './models/dumbbell';
import { createKettlebell } from './models/kettlebell';
import { createPlateSet, PLATE, type PlateSet, type PlateWeight } from './models/plate';
import type { World } from './world';

export const ZONE = {
  origin: new Vector3(0, 0, 0),
  programs: new Vector3(40, 0, 0),
  orbit: new Vector3(62, 0, 0),
  gravity: new Vector3(82, 0, 0),
} as const;

const T20 = PLATE.thickness[20];
/** Centre of loaded slot `k` on the +X sleeve. */
export const slotX = (k: number, t = T20): number => BAR.sleeveStart + T20 * k + t / 2;

export const PLAN_WEIGHT: Record<PlanId, PlateWeight> = { '10': 10, '15': 15, '20': 20 };

/** Where the three plan plates stand in the gravity zone (local X per plan, local Z). */
export const PLAN_STAND = { x: [-0.62, 0, 0.62] as const, z: 1.45 } as const;

const PLANS = PLAN_IDS;

export interface Props {
  origin: {
    group: Group;
    bar: Barbell;
    plates: PlateSet;
    core: CoreObject;
    state: { roll: number; load: [number, number, number]; jolt: [number, number, number]; collar: number; collarSpin: number; release: number; coreOn: number };
  };
  programs: {
    group: Group;
    stations: Group[];
    pivots: Object3D[];
    state: { turn: [number, number, number]; drag: [number, number, number] };
  };
  orbit: {
    group: Group;
    core: CoreObject;
    radii: [number, number, number];
    /** First plate of each ring, for the projected labels. */
    anchors: Object3D[];
    state: { show: number };
  };
  gravity: {
    group: Group;
    bar: Barbell;
    barGroup: Group;
    plates: PlateSet;
    core: CoreObject;
    planStanding: Record<PlanId, PlateSet>;
    planMounted: Record<PlanId, PlateSet>;
    state: {
      fall: number;
      bounce: number;
      lift: number;
      roll: number;
      pool: number;
      collar: number;
      collarSpin: number;
      chosen: PlanId | null;
      choose: Record<PlanId, number>;
      tip: Record<PlanId, number>;
      dim: Record<PlanId, number>;
      mirror: number;
      coreOn: number;
      /** Join: the plates left standing tip over and lie flat as the bar lifts (0..1). */
      lay: number;
    };
  };
  update(dt: number, ambientTime: number, ambientScale: number, velocity: number, world: number): void;
  dispose(): void;
}

function blob(world: World, w: number, d: number): Mesh {
  const mesh = new Mesh(new PlaneGeometry(w, d), world.materials.shadow);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function createProps(world: World): Props {
  const seg = world.tier.latheSegments;
  const m = world.materials;
  const disposers: Array<() => void> = [];

  // ---------- origin: the bar of hero, mass and ignite ----------
  const origin = new Group();
  origin.position.copy(ZONE.origin);
  const roller = new Group(); // rolls about X (hero); plates ride with it
  const barA = createBarbell(m, seg);
  const platesA = createPlateSet(20, 6, m, seg);
  roller.add(barA.group, platesA.group);
  const coreA = createCore(seg);
  coreA.group.position.set(1.32, 0, 0);
  origin.add(roller, coreA.group);
  disposers.push(barA.dispose, platesA.dispose, coreA.dispose);

  // ---------- programs: three stations on the inline-end side (+Z when looking +X) ----------
  const programs = new Group();
  programs.position.copy(ZONE.programs);
  const stations: Group[] = [];
  const pivots: Object3D[] = [];
  const barC = createBarbell(m, seg);
  const platesC = createPlateSet(20, 2, m, seg);
  platesC.items[0].position.x = slotX(0);
  platesC.items[1].position.x = -slotX(0);
  platesC.sync();
  const kettle = createKettlebell(m, seg);
  const dumb: Dumbbell = createDumbbell(m);
  disposers.push(barC.dispose, platesC.dispose, dumb.dispose, () => kettle.geometry.dispose());
  const contents: Array<{ obj: Object3D; y: number; shadow: [number, number]; scale: number }> = [
    { obj: (() => { const g = new Group(); g.add(barC.group, platesC.group); return g; })(), y: 0.26, shadow: [2.5, 0.55], scale: 0.62 },
    { obj: kettle, y: 0, shadow: [0.42, 0.42], scale: 1.45 },
    { obj: dumb.mesh, y: 0.075, shadow: [0.55, 0.3], scale: 1.6 },
  ];
  contents.forEach((c, k) => {
    const station = new Group();
    station.position.set(3 + k * 3, -0.18, 0.62);
    const pivot = new Group();
    pivot.position.y = c.y * c.scale;
    pivot.scale.setScalar(c.scale);
    pivot.add(c.obj);
    const shadow = blob(world, c.shadow[0] * c.scale, c.shadow[1] * c.scale);
    shadow.position.y = 0.002;
    station.add(pivot, shadow);
    programs.add(station);
    stations.push(station);
    pivots.push(pivot);
  });

  // ---------- orbit: the Core with six plates on three rings, lying flat ----------
  const orbit = new Group();
  orbit.position.copy(ZONE.orbit);
  const coreO = createCore(seg);
  // Ring spacing (0.48 m) exceeds a plate's diameter (0.45 m): neighbours never intersect.
  const radii: [number, number, number] = [0.58, 1.06, 1.54];
  const ringSets = [createPlateSet(20, 1, m, seg), createPlateSet(15, 2, m, seg), createPlateSet(10, 3, m, seg)];
  ringSets.forEach((set) => {
    set.items.forEach((item) => (item.rotation.z = Math.PI / 2)); // plate axis X -> Y: faces up
    orbit.add(set.group);
    disposers.push(set.dispose);
  });
  orbit.add(coreO.group);
  disposers.push(coreO.dispose);
  const anchors = ringSets.map((set) => set.items[0]);

  // ---------- gravity / join: bar B, plan plates, the pool of light ----------
  const gravity = new Group();
  gravity.position.copy(ZONE.gravity);
  const barGroup = new Group(); // translated by fall, bounce and lift; rolls in join
  const barB = createBarbell(m, seg);
  const platesB = createPlateSet(20, 4, m, seg);
  [0, 1].forEach((k) => {
    platesB.items[k * 2].position.x = slotX(k);
    platesB.items[k * 2 + 1].position.x = -slotX(k);
  });
  platesB.sync();
  barGroup.add(barB.group, platesB.group);
  gravity.add(barGroup);
  disposers.push(barB.dispose, platesB.dispose);
  const planStanding = {} as Record<PlanId, PlateSet>;
  const planMounted = {} as Record<PlanId, PlateSet>;
  PLANS.forEach((id) => {
    const standing = createPlateSet(PLAN_WEIGHT[id], 1, m, seg);
    const mounted = createPlateSet(PLAN_WEIGHT[id], 2, m, seg);
    const t = PLATE.thickness[PLAN_WEIGHT[id]];
    mounted.items[0].position.x = slotX(2, t);
    mounted.items[1].position.x = -slotX(2, t);
    mounted.items.forEach((i) => (i.visible = false));
    mounted.setHighlight(true);
    mounted.sync();
    gravity.add(standing.group);
    barGroup.add(mounted.group);
    planStanding[id] = standing;
    planMounted[id] = mounted;
    disposers.push(standing.dispose, mounted.dispose);
  });
  const poolMaterial = new MeshBasicMaterial({
    color: token('iron-300'),
    alphaMap: m.shadow.alphaMap,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    opacity: 0,
  });
  const pool = new Mesh(new PlaneGeometry(3.2, 1.4), poolMaterial);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.001;
  gravity.add(pool);
  const coreJ = createCore(seg);
  coreJ.group.position.set(0, 1.75, -1.6);
  gravity.add(coreJ.group);
  disposers.push(coreJ.dispose, () => {
    pool.geometry.dispose();
    poolMaterial.dispose();
  });

  world.scene.add(origin, programs, orbit, gravity);

  const per = <T>(v: T): Record<PlanId, T> => ({ '10': v, '15': v, '20': v });
  const props: Props = {
    origin: {
      group: origin,
      bar: barA,
      plates: platesA,
      core: coreA,
      state: { roll: 0, load: [0, 0, 0], jolt: [0, 0, 0], collar: 0, collarSpin: 0, release: 0, coreOn: 0 },
    },
    programs: { group: programs, stations, pivots, state: { turn: [0, 0, 0], drag: [0, 0, 0] } },
    orbit: { group: orbit, core: coreO, radii, anchors, state: { show: 0 } },
    gravity: {
      group: gravity,
      bar: barB,
      barGroup,
      plates: platesB,
      core: coreJ,
      planStanding,
      planMounted,
      state: { fall: 0, bounce: 0, lift: 0, roll: 0, pool: 0, collar: 0, collarSpin: 0, chosen: null, choose: per(0), tip: per(0), dim: per(0), mirror: 0, coreOn: 0, lay: 0 },
    },
    update: () => undefined,
    dispose() {
      world.scene.remove(origin, programs, orbit, gravity);
      disposers.forEach((d) => d());
    },
  };

  const cam = world.camera.position;
  const tmp = new Vector3();
  const outer = BAR.sleeveEnd + 0.36;
  const STAND_Z = PLAN_STAND.z;
  const standX = (i: number): number => PLAN_STAND.x[i];

  props.update = (dt, ambientTime, ambientScale, velocity, w) => {
    // Zones draw only near the camera, so draw calls stay inside the budget (PERF-02).
    origin.visible = cam.distanceTo(ZONE.origin) < 9;
    programs.visible = Math.abs(cam.x - ZONE.programs.x - 5) < 12;
    orbit.visible = cam.distanceTo(ZONE.orbit) < 14;
    gravity.visible = cam.distanceTo(tmp.copy(ZONE.gravity).setY(0.5)) < 22;

    if (origin.visible) {
      const s = props.origin.state;
      // Ambient roll plus scroll velocity (MOTION-09); the hero owns `roll` as an enable.
      roller.rotation.x += (0.22 * ambientScale + velocity * 1.6) * s.roll * dt;
      s.load.forEach((l, p) => {
        const slot = slotX(p);
        const x = MathUtils.lerp(outer + p * 0.12, slot, l) + s.jolt[p];
        const plus = platesA.items[p * 2];
        const minus = platesA.items[p * 2 + 1];
        plus.visible = minus.visible = l > 0.001;
        plus.position.x = p === 2 ? MathUtils.lerp(x, 1.55, s.release) : x;
        minus.position.x = -x;
      });
      barA.lockCollars.forEach((c, i) => {
        const sign = i === 0 ? 1 : -1;
        c.visible = s.collar > 0.001 && !(i === 0 && s.release > 0.001);
        c.position.x = sign * MathUtils.lerp(outer + 0.3, slotX(2) + T20 / 2 + 0.02, s.collar);
        c.rotation.x = s.collarSpin;
      });
      coreA.group.scale.setScalar(Math.max(0.0001, s.coreOn));
      coreA.update(ambientTime, ambientScale, w);
      platesA.sync();
      barA.sync();
    }

    if (programs.visible) {
      const s = props.programs.state;
      const heroYaw = [-0.08, 1.12, 0.9];
      pivots.forEach((p, k) => {
        const turn = MathUtils.smootherstep(s.turn[k], 0, 1);
        p.rotation.y = MathUtils.lerp(heroYaw[k] - 1.6, heroYaw[k], turn) + s.drag[k] + ambientTime * 0.08 * (k === 2 ? 1 : 0);
        p.rotation.x = k === 0 ? MathUtils.lerp(-0.4, -0.12, turn) : 0;
      });
    }

    if (orbit.visible) {
      const s = props.orbit.state;
      const speeds = [0.5, -0.32, 0.21];
      const phases = [0, 2.3, 3.6]; // at rest the three labelled plates sit far apart
      ringSets.forEach((set, r) => {
        set.items.forEach((item, i) => {
          const a = (i / set.items.length) * Math.PI * 2 + phases[r] + ambientTime * speeds[r];
          item.position.set(Math.cos(a) * radii[r], 0, Math.sin(a) * radii[r]);
          item.rotation.y = -a;
          item.scale.setScalar(Math.max(0.0001, MathUtils.clamp(s.show * 3 - r, 0, 1)));
        });
        set.sync();
      });
      coreO.update(ambientTime, ambientScale, w);
    }

    if (gravity.visible) {
      const s = props.gravity.state;
      const rest = PLATE.radius;
      // `fall` is scrubbed linearly; the drop itself follows gravity (y = h0 - h * fall²).
      barGroup.position.y = rest + 1.2 * (1 - s.fall * s.fall) + s.bounce + s.lift * 0.68;
      barGroup.rotation.x += (0.22 * ambientScale + velocity * 1.6) * s.roll * dt;
      barB.lockCollars.forEach((c, i) => {
        const sign = i === 0 ? 1 : -1;
        const chosenT = s.chosen ? PLATE.thickness[PLAN_WEIGHT[s.chosen]] : 0;
        const inner = s.chosen ? slotX(2, chosenT) + chosenT / 2 : slotX(1) + T20 / 2;
        c.visible = s.collar > 0.001;
        c.position.x = sign * MathUtils.lerp(outer + 0.3, inner + 0.02, s.collar);
        c.rotation.x = s.collarSpin;
      });
      barB.sync();
      PLANS.forEach((id, i) => {
        const standing = planStanding[id].items[0];
        const mounted = planMounted[id];
        const c = s.choose[id];
        const t = PLATE.thickness[PLAN_WEIGHT[id]];
        mounted.items[0].visible = c >= 0.999;
        mounted.items[1].visible = c >= 0.999 && s.mirror > 0.001;
        mounted.items[1].position.x = -MathUtils.lerp(outer + 0.3, slotX(2, t), s.mirror);
        standing.visible = c < 0.999;
        // Standing in the row, facing the camera; tipped forward and its ring lit on hover or
        // focus; dimmed when another plan is chosen (SCENE-23).
        planStanding[id].tint(0, s.dim[id], s.tip[id]);
        // Euler YXZ: yaw (Y) of the roll (local X, the plate axis) of the tip (local Z).
        standing.rotation.order = 'YXZ';
        if (c <= 0) {
          // Pivot on the front edge of the rim: the hover tip, then (join) the fall onto the
          // face, accelerating like a body falling over (angle grows with lay²).
          const a = 0.32 * s.tip[id] * (1 - s.lay) + (Math.PI / 2) * s.lay * s.lay;
          const half = t / 2;
          standing.position.set(
            standX(i),
            rest * Math.cos(a) + half * Math.sin(a),
            STAND_Z + half + rest * Math.sin(a) - half * Math.cos(a),
          );
          standing.rotation.set(0, Math.PI / 2, a);
        } else {
          // Roll along the floor toward the +X sleeve end, turn, then slide onto the sleeve.
          barGroup.updateMatrix();
          tmp.set(slotX(2, t), 0, 0).applyMatrix4(barGroup.matrix);
          const k1 = MathUtils.smoothstep(c, 0, 0.55);
          const k2 = MathUtils.smoothstep(c, 0.55, 0.75);
          const k3 = MathUtils.smoothstep(c, 0.75, 1);
          const startX = standX(i);
          const approach = outer + 0.35;
          standing.position.set(
            MathUtils.lerp(MathUtils.lerp(startX, approach, k1), tmp.x, k3),
            MathUtils.lerp(rest, tmp.y, k3),
            MathUtils.lerp(STAND_Z, 0, k1),
          );
          const travel = Math.hypot(approach - startX, STAND_Z);
          standing.rotation.set(-(k1 * travel) / rest + barGroup.rotation.x * k3, MathUtils.lerp(Math.PI / 2, 0, k2), 0);
        }
        planStanding[id].sync();
        mounted.sync();
      });
      // A pool, not a floodlight; it fades as the bar leaves the floor (join).
      (pool.material as MeshBasicMaterial).opacity = s.pool * 0.2 * (1 - 0.9 * s.lift);
      pool.scale.set(1 + s.pool * 0.4, 1, 1 + s.pool * 0.4);
      coreJ.group.scale.setScalar(Math.max(0.0001, s.coreOn));
      coreJ.update(ambientTime, ambientScale, w);
    }
  };

  return props;
}
