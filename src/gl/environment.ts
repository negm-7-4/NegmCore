// src/gl/environment.ts — two procedural studio environments, no HDRI file (GL-03, GL-11).
// DARK: narrow strip softboxes and one green kicker, so steel reads as edges of light.
// LIGHT: large bright panels with a darker floor, so black iron on white still has shading.
import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { token } from './materials';

interface Softbox {
  w: number;
  h: number;
  pos: [number, number, number];
  color: Color;
}

function studio(background: Color, boxes: Softbox[]): Scene {
  const scene = new Scene();
  scene.background = background;
  for (const box of boxes) {
    const mesh = new Mesh(new PlaneGeometry(box.w, box.h), new MeshBasicMaterial({ color: box.color, side: DoubleSide }));
    mesh.position.set(...box.pos);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  }
  return scene;
}

function disposeScene(scene: Scene): void {
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      (object.material as MeshBasicMaterial).dispose();
    }
  });
}

export interface Environments {
  dark: Texture;
  light: Texture;
  dispose(): void;
}

export function createEnvironments(renderer: WebGLRenderer): Environments {
  const white = token('flare');
  const strip = (k: number): Color => white.clone().multiplyScalar(k);
  const kicker = token('core').multiplyScalar(2.2);

  const dark = studio(token('void'), [
    { w: 5, h: 0.14, pos: [0, 2.4, 1.2], color: strip(9) },
    { w: 0.16, h: 3.2, pos: [2.6, 0.4, 0.8], color: strip(6) },
    { w: 0.12, h: 3.2, pos: [-2.4, 0.2, -1.4], color: strip(4) },
    { w: 3.5, h: 0.08, pos: [0, -1.8, 2.2], color: strip(2.5) },
    { w: 0.9, h: 0.35, pos: [-1.6, -0.7, 1.9], color: kicker },
    { w: 3, h: 1.6, pos: [0.6, 1.4, 3.2], color: strip(1.25) },
    { w: 0.1, h: 2.6, pos: [-1.2, 0.6, 2.6], color: strip(3) },
  ]);
  const light = studio(token('iron-300'), [
    { w: 8, h: 8, pos: [0, 4, 0.5], color: strip(2.4) },
    { w: 6, h: 4, pos: [4, 0.8, 1.5], color: strip(1.6) },
    { w: 6, h: 4, pos: [-4, 0.8, 1.5], color: strip(1.4) },
    { w: 5, h: 3, pos: [0, 1, 4], color: strip(1.8) },
    { w: 10, h: 10, pos: [0, -4, 0], color: token('iron-600') },
  ]);

  const pmrem = new PMREMGenerator(renderer);
  const darkTarget = pmrem.fromScene(dark, 0.02, 0.1, 100, { size: 256 });
  const lightTarget = pmrem.fromScene(light, 0.04, 0.1, 100, { size: 256 });
  pmrem.dispose();
  disposeScene(dark);
  disposeScene(light);

  return {
    dark: darkTarget.texture,
    light: lightTarget.texture,
    dispose() {
      darkTarget.dispose();
      lightTarget.dispose();
    },
  };
}
