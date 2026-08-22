import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { assetUrl } from "../assets/paths";

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();
const bundleCache = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>();

export type GltfBundle = { scene: THREE.Group; animations: THREE.AnimationClip[] };

/**
 * Load a shipped GLB (`public/assets/models/…`) once, then clone.
 * Tripo meshes arrive untextured by default (`pipeline.md` §5.1) — pass
 * `tint` so scene lighting sculpts the volume instead of a baked albedo.
 */
export function loadGltf(relativePath: string, tint?: number): Promise<THREE.Group> {
  const url = assetUrl(relativePath);
  let pending = cache.get(url);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err),
      );
    });
    cache.set(url, pending);
  }
  return pending.then((src) => {
    const clone = src.clone(true);
    if (tint !== undefined) tintGltf(clone, tint);
    return clone;
  });
}

/** Load scene + clips (rigged Tripo GLB). */
export function loadGltfBundle(relativePath: string): Promise<GltfBundle> {
  const url = assetUrl(relativePath);
  let pending = bundleCache.get(url);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations.slice() }),
        undefined,
        (err) => reject(err),
      );
    });
    bundleCache.set(url, pending);
  }
  return pending;
}

export function cloneGltfBundle(bundle: GltfBundle): THREE.Group {
  return cloneSkinned(bundle.scene) as THREE.Group;
}

/** Hip + Root only — Pelvis/Waist pins freeze the torso into bind. */
const ROOT_BONES = /^(Root|Hip|Hips)$/i;

/**
 * Bind-pose translations for locomotion bones. Tripo in-place clips often
 * overwrite Hip.z (pelvis height in Root space) with 0, which drops the
 * skinned mesh by ~hip height after Root's Y-up quaternion.
 */
export function restBonePositions(root: THREE.Object3D): Map<string, THREE.Vector3> {
  const rest = new Map<string, THREE.Vector3>();
  root.traverse((obj) => {
    if (ROOT_BONES.test(obj.name)) rest.set(obj.name, obj.position.clone());
  });
  return rest;
}

/** Pin Root/Hip position tracks to bind pose so walk/idle stay in-place and upright. */
export function pinClipBonePositions(
  clip: THREE.AnimationClip,
  rest: Map<string, THREE.Vector3>,
): THREE.AnimationClip {
  const pinned = clip.clone();
  for (const track of pinned.tracks) {
    if (!track.name.endsWith(".position")) continue;
    const bone = track.name.slice(0, track.name.length - ".position".length);
    const bind = rest.get(bone);
    if (!bind) continue;
    const values = track.values;
    for (let i = 0; i + 2 < values.length; i += 3) {
      values[i] = bind.x;
      values[i + 1] = bind.y;
      values[i + 2] = bind.z;
    }
  }
  return pinned;
}

/** Scale so the AABB height matches `meters`, then plant feet on y=0. */
export function fitGltfHeight(root: THREE.Object3D, meters: number): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const h = size.y > 0.01 ? size.y : 1;
  root.scale.multiplyScalar(meters / h);
  const planted = new THREE.Box3().setFromObject(root);
  root.position.x -= (planted.min.x + planted.max.x) * 0.5;
  root.position.z -= (planted.min.z + planted.max.z) * 0.5;
  root.position.y -= planted.min.y;
}

/**
 * GLTFLoader binds the skeleton at export scale. `fitGltfHeight` then
 * scales a parent, so bone.matrixWorld and inverseBindMatrices disagree
 * and the shader stays on bind pose (bones move, mesh doesn't). Rebind
 * after the scale so skinning and animation share the same space.
 */
export function rebindSkinned(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    const mesh = obj as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    // No bindMatrix arg: bind() recaptures inverseBindMatrices from the
    // current (already scaled) bone worlds. Passing matrixWorld ourselves
    // skipped that and left export-scale IBMs in a scaled graph.
    mesh.bind(mesh.skeleton);
  });
}

/** Shadows + keep shipped albedo. Do not clamp metal/rough — that greys Tripo cloth. */
export function lightGltf(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial) {
        if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
        std.side = THREE.FrontSide;
        std.needsUpdate = true;
      }
    }
  });
}

/**
 * Konfuse tee/shorts: Tripo albedo has baked folds + near-white print, then
 * the island sun (1.85) and UnrealBloom smear both. Crush cloth greys, cap
 * print luma under the bloom knee, drop specular (Lambert).
 */
export function preparePrintSkin(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = (Array.isArray(mesh.material) ? mats.map(printLambert) : printLambert(mats[0])) as
      | THREE.Material
      | THREE.Material[];
  });
}

function printLambert(src: THREE.Material): THREE.Material {
  const std = src as THREE.MeshStandardMaterial;
  const map = std.map ?? null;
  if (map) flattenAlbedoForSun(map);
  const mat = new THREE.MeshLambertMaterial({
    map,
    color: std.color?.clone() ?? new THREE.Color(0xffffff),
    transparent: std.transparent,
    opacity: std.opacity,
    alphaTest: std.alphaTest,
    side: THREE.FrontSide,
  });
  mat.vertexColors = std.vertexColors;
  return mat;
}

/** Achromatic cloth/print only — skin and the colour shorts graphic stay. */
function flattenAlbedoForSun(map: THREE.Texture): void {
  const src = map.image as { width?: number; height?: number } | undefined;
  if (!src?.width || !src.height || typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(src as CanvasImageSource, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
    const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
    const avg = (r + g + b) / 3;
    const chroma = mx - mn;
    if (chroma < 28) {
      const out = avg < 88 ? avg * 0.4 : 128 + ((avg - 88) / 167) * 36;
      const s = avg > 1 ? out / avg : 0;
      d[i] = Math.min(255, r * s);
      d[i + 1] = Math.min(255, g * s);
      d[i + 2] = Math.min(255, b * s);
    } else if (mx > 210) {
      const s = 205 / mx;
      d[i] *= s;
      d[i + 1] *= s;
      d[i + 2] *= s;
    }
  }
  ctx.putImageData(img, 0, 0);
  map.image = canvas;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
}

/** Replace Tripo/default materials with a palette colour the engine can light. */
export function tintGltf(root: THREE.Object3D, hex: number): void {
  const mat = new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.82,
    metalness: 0,
  });
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = mat;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}
