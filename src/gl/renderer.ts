// src/gl/renderer.ts — the WebGL2 renderer, its canvas size and its lifetime (GL-01).
// Why NoToneMapping and clear alpha 0: tone mapping happens in post, and the world colour
// is composited behind the scene by the Backdrop effect using the scene's alpha as coverage.
import { NoToneMapping, PerspectiveCamera, SRGBColorSpace, Scene, WebGLRenderer } from 'three';

export interface GLCore {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  /** CSS pixel size of the canvas, cached on resize (PERF-05). */
  size: { width: number; height: number };
  setPixelRatio(dpr: number): void;
  resize(): boolean;
  dispose(): void;
}

export function createRenderer(canvas: HTMLCanvasElement, dpr: number, onLost: () => void): GLCore {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 is required');
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearAlpha(0);
  // Statistics must cover every pass of the frame, so they are reset by hand (GL-01).
  renderer.info.autoReset = false;
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.02, 120);
  const size = { width: 0, height: 0 };
  // The frame loop never reads layout (PERF-05): a ResizeObserver reports the canvas box and
  // `resize()` only compares numbers. The first measure happens once, here.
  const next = { width: canvas.clientWidth, height: canvas.clientHeight };
  const observer = new ResizeObserver(([entry]) => {
    const box = entry.contentBoxSize[0];
    next.width = Math.round(box.inlineSize);
    next.height = Math.round(box.blockSize);
  });
  observer.observe(canvas);

  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      onLost();
    },
    { once: true },
  );

  const core: GLCore = {
    renderer,
    scene,
    camera,
    canvas,
    size,
    setPixelRatio(value: number) {
      renderer.setPixelRatio(value);
      renderer.setSize(size.width, size.height, false);
    },
    resize() {
      const { width, height } = next;
      if (width === size.width && height === size.height) return false;
      size.width = width;
      size.height = height;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      return true;
    },
    dispose() {
      observer.disconnect();
      renderer.dispose();
    },
  };
  core.resize();
  return core;
}
