import * as THREE from "three";

const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

/**
 * Load (and cache) a color-carrying texture from `public/assets/`.
 * Always sRGB — per `docs/art/pipeline.md` §6, albedo/color maps use
 * `SRGBColorSpace`, data maps (normal/rough/caustic) never do.
 */
export function loadAlbedoTexture(url: string): THREE.Texture {
  const existing = textureCache.get(url);
  if (existing) return existing;
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(url, tex);
  return tex;
}

let cached: THREE.Texture | null = null;

/** Soft round sprite so particle points do not read as hard squares. */
export function glowSprite(): THREE.Texture {
  if (cached) return cached;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(255,255,255,0.75)");
  g.addColorStop(0.65, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cached = tex;
  return tex;
}
