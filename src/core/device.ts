// src/core/device.ts — what this device and this URL can do, read once at start.
// Why once: tier, pointer type and QA mode decide how the page is built; re-reading them
// mid-session would rebuild timelines under the visitor's scroll.

const query = (q: string): boolean => window.matchMedia(q).matches;

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

export const device = {
  /** `#qa` makes every frame deterministic (QA-02). */
  qa: window.location.hash.startsWith('#qa'),
  finePointer: query('(hover: hover) and (pointer: fine)'),
  coarsePointer: query('(pointer: coarse)'),
  cores: navigator.hardwareConcurrency || 4,
  memoryGb: (navigator as NavigatorWithMemory).deviceMemory ?? 8,
  reducedMotionQuery: '(prefers-reduced-motion: reduce)',
  finePointerQuery: '(hover: hover) and (pointer: fine)',
  portraitQuery: '(orientation: portrait) and (max-aspect-ratio: 4/5)',
  narrowQuery: '(max-width: 47.99rem)',
  get portrait(): boolean {
    return query(this.portraitQuery);
  },
  get narrow(): boolean {
    return query(this.narrowQuery);
  },
  get prefersReducedMotion(): boolean {
    return query(this.reducedMotionQuery);
  },
};

/** True when a WebGL2 context can be created at all. */
export function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const ok = gl !== null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
}
