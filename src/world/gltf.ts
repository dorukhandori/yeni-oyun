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
