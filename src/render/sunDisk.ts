import * as THREE from "three";
import { SUN_DISK } from "../constants";

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
  g.addColorStop(0, "rgba(255,210,120,0.0)");
  g.addColorStop(0.42, "rgba(255,170,70,0.28)");
  g.addColorStop(0.75, "rgba(255,140,50,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface SunDisk {
  group: THREE.Group;
  setDusk(duskT: number): void;
  faceCamera(camera: THREE.Camera): void;
}

/**
 * Textured disc (white core, amber rim) + additive hale. The rim is what
 * makes the circle survive ACES + bloom against the peach horizon.
 */
export function createSunDisk(): SunDisk {
  const group = new THREE.Group();
  group.name = "sunDisk";
  group.frustumCulled = false;
  group.renderOrder = 4;

  const haloMat = new THREE.MeshBasicMaterial({
    map: haloTexture(256),
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    fog: false,
    transparent: true,
    toneMapped: false,
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
    depthTest: false,
    fog: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), coreMat);
  core.scale.setScalar(SUN_DISK.coreScale);
  core.renderOrder = 5;
  core.frustumCulled = false;

  group.add(halo);
  group.add(core);

  const duskHalo = new THREE.Color(1.2, 0.5, 0.22);
  const dayHalo = new THREE.Color(1, 0.82, 0.45);
  const duskCore = new THREE.Color(1.15, 0.62, 0.35);
  const dayCore = new THREE.Color(1, 1, 1);
  const tmp = new THREE.Color();
  haloMat.color.copy(dayHalo);

  return {
    group,
    setDusk(duskT) {
      const t = Math.min(1, Math.max(0, duskT));
      tmp.copy(dayHalo).lerp(duskHalo, t);
      haloMat.color.copy(tmp);
      tmp.copy(dayCore).lerp(duskCore, t);
      coreMat.color.copy(tmp);
    },
    faceCamera(camera) {
      group.lookAt(camera.position);
    },
  };
}
