// src/gl/materials.ts — the GL material constants of §10.3 and the shared materials.
// Colours are read from the token file at runtime (GL-10): one definition, two consumers.
// Every lit material is patched to blend two environment maps by the world (GL-11).
import {
  CanvasTexture,
  Color,
  type IUniform,
  type Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderChunk,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from 'three';

export type TokenName =
  | 'void'
  | 'flare'
  | 'iron-950'
  | 'iron-900'
  | 'iron-800'
  | 'iron-700'
  | 'iron-600'
  | 'iron-500'
  | 'iron-400'
  | 'iron-300'
  | 'iron-200'
  | 'iron-100'
  | 'signal'
  | 'core'
  | 'ink'
  | 'ink-mid';

const cssCache = new Map<TokenName, string>();

/** The token's CSS value (sRGB), for canvas drawing. */
export function tokenCss(name: TokenName): string {
  let value = cssCache.get(name);
  if (!value) {
    value = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
    if (!value) throw new Error(`missing colour token --color-${name}`);
    cssCache.set(name, value);
  }
  return value;
}

/** The token as a linear working-space Color. */
export function token(name: TokenName): Color {
  return new Color().setStyle(tokenCss(name), SRGBColorSpace);
}

/** §10.3, verbatim. */
export const MATERIAL = {
  steel: { color: 'iron-400', metalness: 1, roughness: 0.28, anisotropy: 0.7 },
  chrome: { color: 'iron-300', metalness: 1, roughness: 0.1 },
  plate: { color: 'iron-900', metalness: 0.55, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 },
  plateWhite: { color: 'iron-800', roughness: 0.6 },
  lettering: { color: 'iron-200' },
} as const;

/** Shared uniforms: the environment blend and the second (LIGHT) environment. */
export const envUniforms: { uEnvMix: IUniform<number>; envMap2: IUniform<Texture | null> } = {
  uEnvMix: { value: 0 },
  envMap2: { value: null },
};

/**
 * Patches a lit material so it samples DARK (envMap) and LIGHT (envMap2) and mixes them by
 * uEnvMix. Both PMREM textures share one size, so the CUBEUV defines hold for both.
 */
export function patchEnvBlend(material: MeshPhysicalMaterial): MeshPhysicalMaterial {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uEnvMix = envUniforms.uEnvMix;
    shader.uniforms.envMap2 = envUniforms.envMap2;
    shader.fragmentShader = shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>', envBlendChunk());
  };
  material.customProgramCacheKey = () => 'env-blend';
  return material;
}

let blendedChunk: string | null = null;

/** The stock chunk with every DARK sample replaced by a DARK/LIGHT mix. */
function envBlendChunk(): string {
  if (blendedChunk) return blendedChunk;
  const helper = `
uniform sampler2D envMap2;
uniform float uEnvMix;
#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
vec4 envBlend( const in vec3 dir, const in float roughness ) {
  return mix( textureCubeUV( envMap, dir, roughness ), textureCubeUV( envMap2, dir, roughness ), uEnvMix );
}
#endif
`;
  blendedChunk = `${helper}${ShaderChunk.envmap_physical_pars_fragment.replace(/textureCubeUV\( envMap, /g, 'envBlend( ')}`;
  return blendedChunk;
}

export interface Materials {
  steel: MeshPhysicalMaterial;
  steelKnurl: MeshPhysicalMaterial;
  chrome: MeshPhysicalMaterial;
  plate: MeshPhysicalMaterial;
  graphite: MeshPhysicalMaterial;
  shadow: MeshBasicMaterial;
  all: Material[];
  /** Plate colour and roughness follow the world (§10.3 "plate in the white world"). */
  setWorld(world: number): void;
  dispose(): void;
}

/** A crosshatch knurl tile; lines are raised (light) in the bump map. */
function knurlTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  g.fillStyle = tokenCss('void');
  g.fillRect(0, 0, size, size);
  g.strokeStyle = tokenCss('flare');
  g.lineWidth = 5;
  const pitch = 16;
  for (let i = -size; i < size * 2; i += pitch) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + size, size);
    g.moveTo(i, size);
    g.lineTo(i + size, 0);
    g.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(4.5, 20);
  texture.anisotropy = 4;
  return texture;
}

/** Radial falloff for contact-shadow blobs (GL-12): opaque centre, clear edge. */
function blobTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, tokenCss('flare'));
  gradient.addColorStop(0.45, tokenCss('iron-600'));
  gradient.addColorStop(1, tokenCss('void'));
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

export function createMaterials(envDark: Texture): Materials {
  const plateDark = token(MATERIAL.plate.color);
  const plateWhite = token(MATERIAL.plateWhite.color);
  const knurl = knurlTexture();
  const blob = blobTexture();

  const lit = (params: ConstructorParameters<typeof MeshPhysicalMaterial>[0]): MeshPhysicalMaterial =>
    patchEnvBlend(new MeshPhysicalMaterial({ envMap: envDark, envMapIntensity: 1, ...params }));

  const steel = lit({
    color: token(MATERIAL.steel.color),
    metalness: MATERIAL.steel.metalness,
    roughness: MATERIAL.steel.roughness,
    anisotropy: MATERIAL.steel.anisotropy,
    anisotropyRotation: Math.PI / 2, // along the shaft (cylinder V)
  });
  const steelKnurl = lit({
    color: token(MATERIAL.steel.color),
    metalness: MATERIAL.steel.metalness,
    roughness: MATERIAL.steel.roughness,
    anisotropy: MATERIAL.steel.anisotropy,
    anisotropyRotation: Math.PI / 2,
    bumpMap: knurl,
    bumpScale: 1.6,
  });
  const chrome = lit({
    color: token(MATERIAL.chrome.color),
    metalness: MATERIAL.chrome.metalness,
    roughness: MATERIAL.chrome.roughness,
  });
  const plate = lit({
    envMapIntensity: 1.5,
    color: plateDark.clone(),
    metalness: MATERIAL.plate.metalness,
    roughness: MATERIAL.plate.roughness,
    clearcoat: MATERIAL.plate.clearcoat,
    clearcoatRoughness: MATERIAL.plate.clearcoatRoughness,
  });
  // Kettlebell and dumbbell heads: the plate's cast-iron finish, carried by vertex colours
  // so each tool stays one draw call (GL-07).
  const graphite = lit({
    envMapIntensity: 1.5,
    color: new Color(1, 1, 1),
    vertexColors: true,
    metalness: MATERIAL.plate.metalness,
    roughness: MATERIAL.plate.roughness,
    clearcoat: MATERIAL.plate.clearcoat,
    clearcoatRoughness: MATERIAL.plate.clearcoatRoughness,
  });
  const shadow = new MeshBasicMaterial({ color: token('void'), alphaMap: blob, transparent: true, depthWrite: false, opacity: 0 });

  const all: Material[] = [steel, steelKnurl, chrome, plate, graphite, shadow];
  return {
    steel,
    steelKnurl,
    chrome,
    plate,
    graphite,
    shadow,
    all,
    setWorld(world: number) {
      envUniforms.uEnvMix.value = world;
      plate.color.copy(plateDark).lerp(plateWhite, world);
      plate.roughness = MATERIAL.plate.roughness + (MATERIAL.plateWhite.roughness - MATERIAL.plate.roughness) * world;
      graphite.roughness = plate.roughness;
      shadow.opacity = world * 0.55;
    },
    dispose() {
      knurl.dispose();
      blob.dispose();
      all.forEach((m) => m.dispose());
    },
  };
}
