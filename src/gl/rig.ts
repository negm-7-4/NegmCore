// src/gl/rig.ts — the camera rig (GL-15). One PerspectiveCamera; every shot is a position
// curve, a look-at curve, FOV and roll, all driven by one scrubbed parameter u in [0, 1].
// Pointer parallax and impact shake are additive channels applied after the shot, so they
// never fight the scrub. Nothing here allocates per frame (GL-16).
import { CatmullRomCurve3, MathUtils, type PerspectiveCamera, Vector3 } from 'three';

export interface PoseDef {
  pos: [number, number, number];
  look: [number, number, number];
  fov?: number;
  roll?: number;
}

export interface Pose {
  pos: Vector3;
  look: Vector3;
  fov: number;
  roll: number;
}

export function makePose(): Pose {
  return { pos: new Vector3(), look: new Vector3(), fov: 32, roll: 0 };
}

export class Shot {
  private readonly posCurve: CatmullRomCurve3;
  private readonly lookCurve: CatmullRomCurve3;
  private readonly fovs: number[];
  private readonly rolls: number[];

  constructor(readonly defs: PoseDef[]) {
    // A still shot is one pose; the curve needs two points, so it is repeated.
    const keys = defs.length === 1 ? [defs[0], defs[0]] : defs;
    const pts = keys.map((d) => new Vector3(...d.pos));
    const looks = keys.map((d) => new Vector3(...d.look));
    this.posCurve = new CatmullRomCurve3(pts, false, 'centripetal');
    this.lookCurve = new CatmullRomCurve3(looks, false, 'centripetal');
    this.fovs = keys.map((d) => d.fov ?? 32);
    this.rolls = keys.map((d) => d.roll ?? 0);
  }

  /** Writes the pose at u into `out`. Keys sit at u = i / (n - 1). */
  evaluate(u: number, out: Pose): Pose {
    const t = MathUtils.clamp(u, 0, 1);
    this.posCurve.getPoint(t, out.pos);
    this.lookCurve.getPoint(t, out.look);
    const n = this.fovs.length - 1;
    const f = t * n;
    const i = Math.min(n - 1, Math.floor(f));
    const k = n === 0 ? 0 : MathUtils.smootherstep(f - i, 0, 1);
    out.fov = n === 0 ? this.fovs[0] : MathUtils.lerp(this.fovs[i], this.fovs[i + 1], k);
    out.roll = n === 0 ? this.rolls[0] : MathUtils.lerp(this.rolls[i], this.rolls[i + 1], k);
    return out;
  }

  first(): PoseDef {
    return this.defs[0];
  }

  last(): PoseDef {
    return this.defs[this.defs.length - 1];
  }
}

/** Portrait FOV factor: 46 instead of 32 (SCENE-06). */
export const PORTRAIT_FOV = 46 / 32;

export class Rig {
  readonly pose: Pose = makePose();
  /** Additive pointer parallax in radians (|x|, |y| <= 0.04), written through gsap.quickTo. */
  readonly parallax = { x: 0, y: 0 };
  /** Impact shake amplitude in radians (<= 0.01), tweened by one-shots. */
  readonly shake = { amp: 0 };
  /** Extra FOV added by effects (bore shot), in degrees. */
  readonly fovBoost = { value: 0 };
  portrait = false;
  private shakeTime = 0;
  private lastShot: Shot | null = null;
  private lastU = -1;

  constructor(readonly camera: PerspectiveCamera) {}

  /** Called by the chapter whose timeline just moved. The latest call wins. */
  set(shot: Shot, u: number): void {
    this.lastShot = shot;
    this.lastU = u;
    shot.evaluate(u, this.pose);
  }

  get active(): { shot: Shot | null; u: number } {
    return { shot: this.lastShot, u: this.lastU };
  }

  update(dt: number): void {
    const cam = this.camera;
    const { pos, look, fov, roll } = this.pose;
    cam.position.copy(pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(look);
    cam.rotateZ(roll);
    cam.rotateY(this.parallax.x);
    cam.rotateX(this.parallax.y);
    if (this.shake.amp > 1e-5) {
      this.shakeTime += dt;
      const a = Math.min(this.shake.amp, 0.01);
      const t = this.shakeTime * 47;
      cam.rotateX(a * Math.sin(t) * Math.cos(t * 0.37));
      cam.rotateY(a * Math.sin(t * 1.31 + 1.7));
    }
    const target = (fov + this.fovBoost.value) * (this.portrait ? PORTRAIT_FOV : 1);
    if (Math.abs(cam.fov - target) > 1e-4) {
      cam.fov = target;
      cam.updateProjectionMatrix();
    }
  }

  /** Portrait blocking: the optical centre sits in the middle of the top 55 % (SCENE-06). */
  applyViewport(width: number, height: number): void {
    this.portrait = frameViewport(this.camera, width, height);
  }
}

/** Sizes a camera for the viewport (aspect, portrait view offset); returns whether it is portrait. */
export function frameViewport(camera: PerspectiveCamera, width: number, height: number): boolean {
  const portrait = height > width * 1.25;
  if (portrait) camera.setViewOffset(width, height, 0, height * 0.225, width, height);
  else camera.clearViewOffset();
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  return portrait;
}
