import * as THREE from "three";
import { SUN_DISK } from "../constants";
import { loadGltf } from "../world/gltf";

function discTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sunDisk: 2d context unavailable");
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  // Hot core + darker rim so the circle reads against a peach sky after ACES/bloom.
  g.addColorStop(0, "rgba(255,255,245,1)");
  g.addColorStop(0.18, "rgba(255,240,190,1)");
  g.addColorStop(0.48, "rgba(255,198,90,1)");
  g.addColorStop(0.7, "rgba(210,110,28,1)");
  g.addColorStop(0.86, "rgba(90,32,8,1)");
  g.addColorStop(0.94, "rgba(40,12,4,0.85)");
  g.addColorStop(1, "rgba(20,6,2,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function haloTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sunDisk: 2d context unavailable");
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, "rgba(255,220,140,0.45)");
  g.addColorStop(0.22, "rgba(255,200,110,0.28)");
  g.addColorStop(0.55, "rgba(255,170,70,0.1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function paintGod(root: THREE.Object3D): THREE.MeshBasicMaterial[] {
  const mats: THREE.MeshBasicMaterial[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      // Multiply the cream vertex colours down so UnrealBloom cannot turn
      // the face into a white triangle; ACES still grades the sky.
      color: 0xe2c48a,
      fog: false,
      toneMapped: true,
      // Never writes depth (it is a sky element), but it MUST test: with
      // depthTest off the Helios head painted straight over the hull, the
      // sail, the masts and the HUD sun clock. It sits 220 m out along the
      // sun ray, so honest depth just means real geometry in front of it
      // occludes it — which is what "the sun is behind the ship" should look
      // like.
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });
    mesh.material = mat;
    mesh.renderOrder = 8;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mats.push(mat);
  });
  return mats;
}

export interface SunDisk {
  group: THREE.Group;
  setDusk(duskT: number): void;
  faceCamera(camera: THREE.Camera): void;
}

/**
 * Helios head (ASSET-074) + additive hale. Flat disc stays as fallback until
 * the GLB loads. Unlit so the silhouette is the clock, not a lit sculpture.
 */
export function createSunDisk(): SunDisk {
  const group = new THREE.Group();
  group.name = "sunDisk";
  group.frustumCulled = false;
  group.renderOrder = 8;

  const haloMat = new THREE.MeshBasicMaterial({
    map: haloTexture(256),
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    // Same reason as paintGod() below — the glow tracked the head through
    // solid geometry too.
    depthTest: true,
    fog: false,
    transparent: true,
    toneMapped: true,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
  halo.scale.setScalar(SUN_DISK.haloScale);
  halo.renderOrder = 4;
  halo.frustumCulled = false;

  const coreMat = new THREE.MeshBasicMaterial({
    map: discTexture(256),
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: true,
    side: THREE.DoubleSide,
  });
  const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), coreMat);
  core.scale.setScalar(SUN_DISK.coreScale);
  core.renderOrder = 5;
  core.frustumCulled = false;

  group.add(halo);
  group.add(core);

  const duskHalo = new THREE.Color(0.85, 0.38, 0.16);
  const dayHalo = new THREE.Color(0.72, 0.52, 0.28);
  const duskCore = new THREE.Color(0.95, 0.55, 0.28);
  const dayCore = new THREE.Color(0.92, 0.82, 0.62);
  const duskGod = new THREE.Color(0xc47a48);
  const dayGod = new THREE.Color(0xe2c48a);
  const tmp = new THREE.Color();
  haloMat.color.copy(dayHalo);

  const godMats: THREE.MeshBasicMaterial[] = [];
  let duskT = 0;

  const applyDusk = (t: number) => {
    tmp.copy(dayHalo).lerp(duskHalo, t);
    haloMat.color.copy(tmp);
    tmp.copy(dayCore).lerp(duskCore, t);
    coreMat.color.copy(tmp);
    tmp.copy(dayGod).lerp(duskGod, t);
    for (const mat of godMats) mat.color.copy(tmp);
  };

  void loadGltf(SUN_DISK.mesh)
    .then((root) => {
      root.scale.setScalar(SUN_DISK.meshScale);
      // Blender +Y face → glTF -Z, which Object3D.lookAt aims at the camera.
      godMats.push(...paintGod(root));
      group.add(root);
      core.visible = false;
      halo.visible = false;
      applyDusk(duskT);
    })
    .catch((err) => {
      console.warn("[sunDisk] sungod GLB missing, keeping flat disc", err);
    });

  return {
    group,
    setDusk(next) {
      duskT = Math.min(1, Math.max(0, next));
      applyDusk(duskT);
    },
    faceCamera(camera) {
      group.lookAt(camera.position);
    },
  };
}
