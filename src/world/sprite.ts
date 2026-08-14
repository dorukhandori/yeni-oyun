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

/**
 * Load (and cache) a data-carrying texture (normal / rough / caustic mask).
 * Never sRGB — `docs/art/pipeline.md` §6: data maps stay in linear space.
 */
export function loadDataTexture(url: string): THREE.Texture {
  const existing = textureCache.get(url);
  if (existing) return existing;
  const tex = loader.load(url);
  textureCache.set(url, tex);
  return tex;
}

/** Tileable ground/water texture: repeat wrap + a fixed meters-per-tile scale. */
export function tileTexture(tex: THREE.Texture, tileMeters: number, spanMeters: number): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  const reps = spanMeters / tileMeters;
  tex.repeat.set(reps, reps);
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

let cachedFigure: THREE.Texture | null = null;

/**
 * Soft, silhouette-only humanoid impression for the Lotus Adası hallucination
 * figures (`docs/design/gdd-lotus-hallucination.md` §3.2, `art-bible.md`
 * §4.1: "dumanlı/yarı-saydam bir izlenim... billboard sprite ile üretilebilir"
 * — deliberately not a solid mesh, and no hard contour). Two feathered
 * ellipses (robe + head), procedurally drawn so no new asset is required and
 * the final visual identity stays open for `art-director` to replace later.
 */
export function hallucinationSprite(): THREE.Texture {
  if (cachedFigure) return cachedFigure;
  const w = 96;
  const h = 160;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  const softBlob = (cx: number, cy: number, rx: number, ry: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.6})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  softBlob(w / 2, h * 0.64, w * 0.3, h * 0.36, 0.55); // robe/torso
  softBlob(w / 2, h * 0.22, w * 0.17, h * 0.17, 0.6); // head

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedFigure = tex;
  return tex;
}
