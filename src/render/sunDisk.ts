import * as THREE from "three";
import { SUN_DISK } from "../constants";

function radialGlow(inner: string, mid: string, size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sunDisk: 2d context unavailable");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.28, mid);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowSprite(map: THREE.Texture, scale: number, color: number, opacity: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map,
    color,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    transparent: true,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(scale);
  sprite.renderOrder = 1;
  sprite.frustumCulled = false;
  return sprite;
}

export interface SunDisk {
  group: THREE.Group;
  /** Place the disc on the same ray as the directional light. */
  setFromLight(lightPos: THREE.Vector3, duskT: number): void;
}

/**
 * Compact bloom source that sits on the sky. The wide halo and the readable
 * disc live in the sky shader; these sprites only give UnrealBloomPass a
 * hot spot to bloom (art-bible.md §2).
 */
export function createSunDisk(): SunDisk {
  const group = new THREE.Group();
  group.name = "sunDisk";

  const coreMap = radialGlow("rgba(255,255,255,1)", "rgba(255,236,180,0.85)", 128);
  const haloMap = radialGlow("rgba(255,207,128,0.95)", "rgba(255,180,80,0.35)", 256);

  const core = glowSprite(coreMap, SUN_DISK.coreScale, SUN_DISK.coreColor, 0.9);
  const halo = glowSprite(haloMap, SUN_DISK.haloScale, SUN_DISK.haloColor, 0.55);
  group.add(halo);
  group.add(core);

  const duskHalo = new THREE.Color(0xff8a6a);
  const dayHalo = new THREE.Color(SUN_DISK.haloColor);
  const tmp = new THREE.Color();
  const pos = new THREE.Vector3();

  return {
    group,
    setFromLight(lightPos, duskT) {
      const t = Math.min(1, Math.max(0, duskT));
      pos.copy(lightPos).normalize().multiplyScalar(SUN_DISK.distance);
      group.position.copy(pos);
      tmp.copy(dayHalo).lerp(duskHalo, t);
      (halo.material as THREE.SpriteMaterial).color.copy(tmp);
    },
  };
}
