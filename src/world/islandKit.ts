import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { loadGltf } from "./gltf";
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture } from "./sprite";

/**
 * Repeating Lotus Island props — Blender kit (LOT-28).
 * Vertex colours carry art-bible §2 local colour; engine lights the volume.
 * Grass tufts also sample the dry-grass albedo so they read as grass, not plastic blades.
 */

export const ISLAND_KIT = {
  boulder: "assets/models/rock_chalk_boulder_01_mesh_800.glb",
  pebble: "assets/models/rock_chalk_pebble_01_mesh_400.glb",
  grass: "assets/models/flora_grasstuft_01_mesh_600.glb",
  reed: "assets/models/flora_reed_01_mesh_900.glb",
  olive: "assets/models/flora_olive_01_mesh_2000.glb",
  cypress: "assets/models/flora_cypress_01_mesh_1800.glb",
} as const;

export type KitPose = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotY: number;
  rotX?: number;
  rotZ?: number;
};

export type KitLook = {
  sway?: number;
  /** Optional albedo (grass tufts use the dry-grass ground texture). */
  mapUrl?: string;
  doubleSide?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  envMapIntensity?: number;
  /** Diffuse tint. Default white (vertex colours carry the look). */
  color?: number;
  vertexColors?: boolean;
  roughness?: number;
  /** Diffuse-only lighting — no view-dependent specular flash. */
  lambert?: boolean;
  /**
   * After lighting, cap luminance so sun 3.1 + UnrealBloom cannot chalk
   * thin blades when the camera swings past the sun disc.
   */
  lumaMax?: number;
};

export async function loadKitGeometry(path: string): Promise<THREE.BufferGeometry> {
  const root = await loadGltf(path);
  root.updateMatrixWorld(true);
  const geos: THREE.BufferGeometry[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    geos.push(g);
  });
  if (geos.length === 0) throw new Error(`island kit empty: ${path}`);
  const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  if (!merged) throw new Error(`island kit merge failed: ${path}`);
  merged.computeVertexNormals();
  return merged;
}

export function kitMaterial(look: KitLook = {}): {
  mat: THREE.MeshStandardMaterial | THREE.MeshLambertMaterial;
  wind: { value: number };
} {
  const sway = look.sway ?? 0;
  let map: THREE.Texture | null = null;
  if (look.mapUrl) {
    map = loadAlbedoTexture(assetUrl(look.mapUrl)).clone();
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.needsUpdate = true;
  }
  const shared = {
    vertexColors: look.vertexColors ?? true,
    color: look.color ?? 0xffffff,
    side: look.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  };
  const mat = look.lambert
    ? new THREE.MeshLambertMaterial(shared)
    : new THREE.MeshStandardMaterial({
        ...shared,
        roughness: look.roughness ?? 0.94,
        metalness: 0,
        envMapIntensity: look.envMapIntensity ?? 0.2,
      });
  if (map) mat.map = map;
  const wind = { value: 0 };
  const lumaMax = look.lumaMax;
  if (sway <= 0 && lumaMax === undefined) return { mat, wind };
  mat.customProgramCacheKey = () => `kit:${sway > 0 ? "w" : ""}:${lumaMax ?? ""}`;
  mat.onBeforeCompile = (shader) => {
    if (sway > 0) {
      shader.uniforms.uTime = wind;
      shader.uniforms.uSway = { value: sway };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
uniform float uTime;
uniform float uSway;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
float h = max(position.y, 0.0);
transformed.x += sin(uTime * 1.35 + position.z * 0.45 + position.x * 0.2) * h * uSway;
transformed.z += cos(uTime * 1.05 + position.x * 0.4) * h * uSway * 0.55;`,
        );
    }
    if (lumaMax !== undefined) {
      const cap = lumaMax.toFixed(3);
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `float _kitLum = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
outgoingLight *= min(1.0, ${cap} / max(_kitLum, 1e-5));
#include <opaque_fragment>`,
      );
    }
  };
  return { mat, wind };
}

export function instanceKit(
  geometry: THREE.BufferGeometry,
  poses: KitPose[],
  look: KitLook = {},
): { mesh: THREE.InstancedMesh; update: (t: number) => void } {
  const { mat, wind } = kitMaterial(look);
  const mesh = new THREE.InstancedMesh(geometry, mat, poses.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i];
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.rotation.set(p.rotX ?? 0, p.rotY, p.rotZ ?? 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = look.castShadow ?? true;
  mesh.receiveShadow = look.receiveShadow ?? true;
  mesh.frustumCulled = false;
  return {
    mesh,
    update: (t) => {
      wind.value = t;
    },
  };
}

/** Load a kit GLB and instance it. On failure the caller keeps the legacy mesh. */
export async function placeKit(
  group: THREE.Group,
  path: string,
  poses: KitPose[],
  look: KitLook | number = {},
): Promise<{ update: (t: number) => void } | null> {
  if (poses.length === 0) return null;
  const opts: KitLook = typeof look === "number" ? { sway: look } : look;
  try {
    const geo = await loadKitGeometry(path);
    const inst = instanceKit(geo, poses, opts);
    group.add(inst.mesh);
    return inst;
  } catch (err) {
    console.warn(`[islandKit] failed ${path}`, err);
    return null;
  }
}
