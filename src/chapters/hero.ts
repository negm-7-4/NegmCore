// src/chapters/hero.ts — P0 placeholder: a cube that moves with scroll, proving the pipeline
// (Lenis -> ScrollTrigger -> GSAP timeline -> scene -> render). Replaced by the hero in P3.
import { gsap } from 'gsap';
import { BoxGeometry, Mesh, MeshNormalMaterial } from 'three';
import { ease } from '../motion/tokens';
import { registerChapterTrigger, unregisterChapterTrigger, type ChapterContext, type ChapterModule } from './context';

let ctx: gsap.Context | null = null;
let cube: Mesh<BoxGeometry, MeshNormalMaterial> | null = null;

export const hero: ChapterModule = {
  id: 'hero',
  build(c: ChapterContext) {
    cube = new Mesh(new BoxGeometry(0.6, 0.6, 0.6), new MeshNormalMaterial());
    c.gl.scene.add(cube);
    c.gl.camera.position.set(0, 0.28, 3.3);
    c.gl.camera.lookAt(0, 0, 0);
    const mesh = cube;
    ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: ease.none },
        scrollTrigger: { trigger: c.section, start: 'top top', end: 'bottom bottom', scrub: c.scrub },
      });
      tl.to(mesh.position, { x: -1.2, y: 0.3, duration: 1 }, 0).to(mesh.rotation, { x: Math.PI, y: Math.PI * 1.5, duration: 1 }, 0);
      if (tl.scrollTrigger) registerChapterTrigger('hero', tl.scrollTrigger);
    }, c.section);
  },
  dispose() {
    ctx?.revert();
    ctx = null;
    unregisterChapterTrigger('hero');
    if (cube) {
      cube.removeFromParent();
      cube.geometry.dispose();
      cube.material.dispose();
      cube = null;
    }
  },
};
