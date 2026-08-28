import * as THREE from "three";
import { PALETTE, SEA_TEX, SHIP } from "../constants";
import { sampleOceanHull } from "./oceanWaves";
import { heightAt, islandRadiusAt } from "./terrain";
import { mulberry32 } from "./rng";
import { assetUrl } from "../assets/paths";
import { loadGltf } from "./gltf";
import { loadAlbedoTexture } from "./sprite";

/** Generated ship textures (`docs/art/asset-registry.md` P1 — Gemi), shipped as WebP. */
const PLANK_TEX_URL = "assets/textures/ship_plank_01_albedo_1024.webp";
const SAIL_TEX_URL = "assets/textures/ship_sail_01_albedo_1024.webp";
const ROPE_TEX_URL = "assets/textures/ship_rope_01_albedo_512.webp";

const JAR_EMPTY = 0x947a61;
const JAR_FULL = 0x6e5a48;

export interface Ship {
  group: THREE.Group;
  /** World position used for the delivery trigger (Doryseus' ship). */
  anchor: THREE.Vector3;
  /** Current hull yaw (park, forget-relocate, departing). */
  heading(): number;
  update(t: number, departing: number): void;
  /** Fill the first n amphorae (run pantry, LOT-52). */
  setDelivered(n: number): void;
  /** Move the hero hull (K35 forget). */
  relocateHero(x: number, z: number, rotY: number): void;
  addKeepsake(kind: "cairn" | "wreath"): void;
  reset(): void;
  /** World Y of the walkable deck, or null if the point is not on the hull. */
  deckY(x: number, z: number): number | null;
  /** Landward bow / causeway band — the only boarding gate. */
  atRamp(x: number, z: number): boolean;
  /**
   * K35 opening: hull is not in the world until the shore stones resolve.
   * Classic 12-lotus is always present.
   */
  setPresent(on: boolean): void;
  isPresent(): boolean;
}

/** Single hero home-hull (LOT-52). Sisters are gone. */
export function buildShip(): Ship {
  const group = new THREE.Group();
  const hull = new THREE.Group();
  hull.position.set(SHIP.pos.x, heightAt(SHIP.pos.x, SHIP.pos.z), SHIP.pos.z);
  hull.rotation.y = SHIP.rotY;
  hull.scale.setScalar(SHIP.scale);
  group.add(hull);

  const heroBerth = hull.position.clone();
  let heroRot: number = SHIP.rotY;
  const anchor = heroBerth.clone();
  const local = new THREE.Vector3();
  const bowA = new THREE.Vector3();
  const bowB = new THREE.Vector3();
  const jars: THREE.Mesh[] = [];
  let sailMesh: THREE.Mesh | null = null;
  let bellyIndex = -1;
  let sailUpdate: ((t: number, departing: number) => void) | null = null;

  const keepsakeRoot = new THREE.Group();
  keepsakeRoot.position.set(0, SHIP.deckY + 0.08, 0.15);
  hull.add(keepsakeRoot);
  const kept = new Set<string>();

  const causeway = new THREE.Group();
  group.add(causeway);
  plantCauseway(causeway, SHIP.pos.x, SHIP.pos.z, SHIP.rotY);
  let present = true;

  loadGltf(SHIP.mesh)
    .then((scene) => {
      paintHero(scene);
      plantHero(scene);
      hull.add(scene);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (/^Jar_\d+/i.test(mesh.name)) jars.push(mesh);
        if (mesh.name === "Sail" || mesh.morphTargetInfluences) {
          sailMesh = mesh;
          const dict = mesh.morphTargetDictionary;
          bellyIndex = dict?.belly ?? dict?.Belly ?? 0;
        }
      });
      jars.sort((a, b) => a.name.localeCompare(b.name));
    })
    .catch(() => {
      const fallback = buildHeroHull();
      hull.add(fallback);
      sailUpdate = fallback.userData.sailUpdate as (t: number, departing: number) => void;
    });

  return {
    group,
    anchor,
    deckY(x, z) {
      if (!present) return null;
      local.set(x, hull.position.y, z);
      hull.worldToLocal(local);
      if (Math.abs(local.x) > SHIP.deckHalfW || Math.abs(local.z) > SHIP.deckHalfL) return null;
      return hull.position.y + SHIP.deckY;
    },
    atRamp(x, z) {
      if (!present) return false;
      local.set(x, hull.position.y, z);
      hull.worldToLocal(local);
      if (Math.abs(local.x) > SHIP.boardRampBeam) return false;
      bowA.set(0, 0, SHIP.deckHalfL);
      bowB.set(0, 0, -SHIP.deckHalfL);
      hull.localToWorld(bowA);
      hull.localToWorld(bowB);
      const landward = Math.hypot(bowA.x, bowA.z) <= Math.hypot(bowB.x, bowB.z) ? 1 : -1;
      const along = local.z * landward;
      const bow = SHIP.deckHalfL * SHIP.boardBowFrac;
      return along > bow && along < SHIP.deckHalfL + SHIP.boardRampAlong;
    },
    setDelivered(n) {
      for (let i = 0; i < jars.length; i++) {
        const mat = jars[i].material as THREE.MeshStandardMaterial;
        const full = i < n;
        mat.color.setHex(full ? JAR_FULL : JAR_EMPTY);
        mat.emissive.setHex(full ? 0x3a3228 : 0x000000);
        mat.emissiveIntensity = full ? 0.18 : 0;
      }
    },
    relocateHero(x, z, rotY) {
      const y = heightAt(x, z);
      heroBerth.set(x, y, z);
      heroRot = rotY;
      hull.position.copy(heroBerth);
      hull.rotation.y = heroRot;
      anchor.copy(heroBerth);
      plantCauseway(causeway, x, z, rotY);
    },
    addKeepsake(kind) {
      if (kept.has(kind)) return;
      kept.add(kind);
      const mesh =
        kind === "cairn"
          ? new THREE.Mesh(
              new THREE.IcosahedronGeometry(0.16, 0),
              new THREE.MeshStandardMaterial({
                color: PALETTE.marble,
                roughness: 0.65,
                flatShading: true,
              }),
            )
          : new THREE.Mesh(
              new THREE.TorusGeometry(0.18, 0.045, 6, 12),
              new THREE.MeshStandardMaterial({
                color: PALETTE.petalRipeTint,
                roughness: 0.5,
                flatShading: true,
              }),
            );
      mesh.position.set(kept.size === 1 ? -0.45 : 0.45, 0.12, 1.1);
      if (kind === "wreath") mesh.rotation.x = Math.PI / 2;
      keepsakeRoot.add(mesh);
    },
    reset() {
      heroBerth.set(SHIP.pos.x, heightAt(SHIP.pos.x, SHIP.pos.z), SHIP.pos.z);
      heroRot = SHIP.rotY;
      kept.clear();
      while (keepsakeRoot.children.length) {
        keepsakeRoot.remove(keepsakeRoot.children[0]);
      }
      hull.position.copy(heroBerth);
      hull.rotation.set(0, heroRot, 0);
      this.setDelivered(0);
      plantCauseway(causeway, SHIP.pos.x, SHIP.pos.z, SHIP.rotY);
    },
    heading() {
      return hull.rotation.y;
    },
    setPresent(on) {
      present = on;
      group.visible = on;
    },
    isPresent() {
      return present;
    },
    update(t, departing) {
      if (!present) {
        anchor.set(heroBerth.x, heroBerth.y, heroBerth.z);
        return;
      }
      sailUpdate?.(t, departing);
      if (sailMesh && bellyIndex >= 0 && sailMesh.morphTargetInfluences) {
        const infl = sailMesh.morphTargetInfluences;
        infl[bellyIndex] += (Math.min(1, departing) - infl[bellyIndex]) * 0.08;
      }
      const d = Math.max(0, departing);
      const leaveA = Math.atan2(heroBerth.z, heroBerth.x);
      const live = 1 + d * 1.6;
      hull.position.x = heroBerth.x + Math.cos(leaveA) * d * 22;
      hull.position.z = heroBerth.z + Math.sin(leaveA) * d * 22;
      const wave = sampleOceanHull(
        hull.position.x,
        hull.position.z,
        heroRot,
        t,
        SHIP.deckHalfL * 0.62,
        SHIP.deckHalfW * 0.7,
      );
      const grounded = d < 0.04;
      if (grounded) {
        hull.position.y = heroBerth.y - SHIP.keelBury + wave.y * SHIP.groundFollow;
        hull.rotation.x = SHIP.listPitch + wave.pitch * SHIP.groundPitchFollow;
        hull.rotation.z = SHIP.listRoll + wave.roll * SHIP.groundRollFollow;
      } else {
        hull.position.y = wave.y * SEA_TEX.hullFollow - SEA_TEX.hullDraft + d * 0.3;
        hull.rotation.x = wave.pitch * SEA_TEX.hullPitchFollow * live;
        hull.rotation.z = wave.roll * SEA_TEX.hullRollFollow * live;
      }
      hull.rotation.y = heroRot;
      anchor.set(hull.position.x, hull.position.y, hull.position.z);
    },
  };
}

type RockPose = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
};

function causewayPoses(hx: number, hz: number, rotY: number): RockPose[] {
  const il = Math.hypot(hx, hz) || 1;
  const ix = -hx / il;
  const iz = -hz / il;
  const ax = Math.sin(rotY);
  const az = Math.cos(rotY);
  const bowR = Math.hypot(hx + ax * SHIP.deckHalfL, hz + az * SHIP.deckHalfL);
  const sternR = Math.hypot(hx - ax * SHIP.deckHalfL, hz - az * SHIP.deckHalfL);
  const bow = bowR <= sternR ? 1 : -1;
  // Begin at the hull in the water (landward bow quarter), not already on the grass.
  const startX = hx + ix * SHIP.causewayClear + ax * bow * SHIP.deckHalfL * SHIP.causewayBow;
  const startZ = hz + iz * SHIP.causewayClear + az * bow * SHIP.deckHalfL * SHIP.causewayBow;
  const startR = Math.hypot(startX, startZ);
  const coast = islandRadiusAt(startX, startZ);
  const endR = Math.max(12, coast - SHIP.causewayInland);
  const endX = startX + ix * Math.max(12, startR - endR);
  const endZ = startZ + iz * Math.max(12, startR - endR);
  const dx = endX - startX;
  const dz = endZ - startZ;
  const span = Math.hypot(dx, dz) || 1;
  const px = -dz / span;
  const pz = dx / span;
  const rand = mulberry32(20260817 + Math.round(hx * 10) + Math.round(hz * 10));
  const out: RockPose[] = [];
  const n = SHIP.causewayCount;
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const side = (rand() - 0.5) * SHIP.causewayWidth * (0.55 + (1 - t) * 0.45);
    const jitter = (rand() - 0.5) * 0.55;
    const x = startX + dx * t + px * side + ix * jitter * 0.2;
    const z = startZ + dz * t + pz * side + iz * jitter * 0.2;
    const ground = heightAt(x, z);
    const wet = ground < 0.12;
    const s = wet ? 0.7 + rand() * 0.55 : 0.4 + rand() * 0.55;
    const y = wet ? SHIP.causewayWaterY : ground - 0.06;
    out.push({
      x,
      y,
      z,
      sx: s * (0.85 + rand() * 0.4),
      sy: wet ? s * (0.7 + rand() * 0.45) : s * (0.36 + rand() * 0.35),
      sz: s * (0.85 + rand() * 0.4),
      rotX: rand() * 0.9,
      rotY: rand() * Math.PI * 2,
      rotZ: (rand() - 0.5) * 0.7,
    });
  }
  return out;
}

function instanceRocks(geo: THREE.BufferGeometry, poses: RockPose[], color: number): THREE.InstancedMesh {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, poses.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i];
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function plantCauseway(root: THREE.Group, hx: number, hz: number, rotY: number): void {
  while (root.children.length) {
    const ch = root.children[0] as THREE.Mesh;
    root.remove(ch);
    ch.geometry?.dispose();
    const mat = ch.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  }
  const poses = causewayPoses(hx, hz, rotY);
  const a = poses.filter((_, i) => i % 2 === 0);
  const b = poses.filter((_, i) => i % 2 === 1);
  if (a.length) root.add(instanceRocks(new THREE.IcosahedronGeometry(0.55, 0), a, PALETTE.causeway));
  if (b.length) root.add(instanceRocks(new THREE.DodecahedronGeometry(0.48, 0), b, PALETTE.causewayWet));
}

/**
 * Fit + centre + hull-keel-seat a raw hero-ship GLB scene in place. Exported
 * (27 Ağu 2026) so Cyclops can plant the same real ship on its own beach
 * (sahip: "gemimiz" among the exterior dressing asks) without duplicating
 * this fitting logic — self-contained beyond the generic `SHIP.*` constants,
 * no Lotus run-state involved.
 */
export function plantHero(scene: THREE.Object3D): void {
  scene.rotation.y = SHIP.meshFacing;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const span = Math.max(size.x, size.z, 0.01);
  scene.scale.multiplyScalar(SHIP.length / span);
  scene.updateMatrixWorld(true);
  const planted = new THREE.Box3().setFromObject(scene);
  scene.position.x -= (planted.min.x + planted.max.x) * 0.5;
  scene.position.z -= (planted.min.z + planted.max.z) * 0.5;
  // AABB min.y is the oar tips on this Tripo blob, not the keel. Sit on the
  // hull-bottom quantile so the galley rests in the sand instead of hovering.
  scene.position.y -= hullKeelY(scene);
}

/**
 * Re-seat an already-planted hull so its keel plane sits at world `y`.
 *
 * `plantHero()` seats the keel at y=0, but it does so at ITS OWN scale. A
 * stop that applies a further `scale.multiplyScalar(...)` afterwards (Cyclops
 * shrinks the galley to 0.42 for its small cove) scales the geometry about
 * the object origin while `position.y` stays put — the keel drifts off the
 * seating plane and the ship visibly hovers (28 Ağu 2026, sahibin denizi
 * görünür olunca ortaya çıktı). Call this last, after every transform.
 */
export function seatHullKeel(root: THREE.Object3D, y: number): void {
  root.updateMatrixWorld(true);
  root.position.y += y - hullKeelY(root);
}

/** World Y of the hull seating plane, ignoring oars / rudder that set AABB min.y. */
function hullKeelY(root: THREE.Object3D): number {
  const ys: number[] = [];
  const v = new THREE.Vector3();
  const box = new THREE.Box3();
  const c = new THREE.Vector3();
  const size = new THREE.Vector3();
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  box.getCenter(c);
  box.getSize(size);
  const alongX = size.x >= size.z;
  const beamLim = Math.min(size.x, size.z) * SHIP.keelBeamFrac;
  const lenLim = Math.max(size.x, size.z) * SHIP.keelLengthFrac;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry?.getAttribute("position");
    if (!pos) return;
    const m = mesh.matrixWorld;
    for (let i = 0; i < pos.count; i += 2) {
      v.fromBufferAttribute(pos, i);
      v.applyMatrix4(m);
      const lateral = alongX ? Math.abs(v.z - c.z) : Math.abs(v.x - c.x);
      const along = alongX ? Math.abs(v.x - c.x) : Math.abs(v.z - c.z);
      if (lateral > beamLim || along > lenLim) continue;
      ys.push(v.y);
    }
  });
  if (ys.length < 8) return box.min.y + size.y * SHIP.keelFromAabb;
  ys.sort((a, b) => a - b);
  const at = (q: number) => ys[Math.min(ys.length - 1, Math.floor(ys.length * q))];
  // Skip the oar/rudder cluster (aabb min is ~-9.5 m). The hull body sits
  // well above that; planting on min.y hovers the galley by several metres.
  return at(SHIP.keelQuantile);
}

/** Exported alongside `plantHero` — see its comment. */
export function paintHero(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const map = src && "map" in src ? (src as THREE.MeshStandardMaterial).map : null;
    const hasVC = Boolean(mesh.geometry.getAttribute("color"));
    const isSail = mesh.name === "Sail";
    const isJar = /^Jar_/i.test(mesh.name);
    const mat = new THREE.MeshStandardMaterial({
      map,
      vertexColors: hasVC && !map,
      color: map ? 0xffffff : hasVC ? 0xffffff : isJar ? JAR_EMPTY : PALETTE.hull,
      roughness: isSail ? 0.78 : map ? 0.78 : 0.86,
      metalness: 0,
      side: isSail ? THREE.DoubleSide : THREE.FrontSide,
    });
    if (map) applyHeroNeon(mat, map);
    mesh.material = mat;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

/** Faint inlaid glow on the Wedjat pupil and nearby carved glyphs — wood albedo stays. */
function applyHeroNeon(mat: THREE.MeshStandardMaterial, map: THREE.Texture): void {
  const bake = (): void => {
    const emissive = bakeShipNeon(map);
    if (!emissive) return;
    mat.map = map;
    mat.emissiveMap = emissive;
    mat.emissive.setHex(0xffffff);
    mat.emissiveIntensity = SHIP.neonIntensity;
    mat.needsUpdate = true;
  };
  if (map.image) bake();
  else {
    const img = map.source?.data as HTMLImageElement | undefined;
    if (img && "complete" in img && !img.complete) img.addEventListener("load", bake, { once: true });
  }
}

function bakeShipNeon(map: THREE.Texture): THREE.Texture | null {
  const img = map.image as { width?: number; height?: number } | undefined;
  if (!img?.width || !img.height || typeof document === "undefined") return null;
  const w = img.width;
  const h = img.height;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d");
  if (!sctx) return null;
  try {
    sctx.drawImage(img as CanvasImageSource, 0, 0);
  } catch {
    return null;
  }
  const pix = sctx.getImageData(0, 0, w, h);
  const em = sctx.createImageData(w, h);
  const eye = new THREE.Color(SHIP.neonEye);
  const rune = new THREE.Color(SHIP.neonRune);
  const d = pix.data;
  const e = em.data;
  const n = w * h;
  const pupil = new Uint8Array(n);
  const lum = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    lum[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // True lapis disc — not cool-blue wood shadow (bible shadows are blue).
    if (sat > 0.42 && b > 0.38 && b > r + 0.12 && b > g + 0.04 && lum[p] > 0.18 && lum[p] < 0.72) {
      pupil[p] = 1;
    }
  }
  const radius = Math.max(6, Math.round(Math.min(w, h) * 0.012));
  const nearPupil = dilateMask(pupil, w, h, radius);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    e[i + 3] = 255;
    if (pupil[p] === 1) {
      writeGlow(e, i, eye, 0.42);
      continue;
    }
    if (nearPupil[p] === 0) {
      e[i] = e[i + 1] = e[i + 2] = 0;
      continue;
    }
    const groove = lum[p] < 0.3 && grooveContrast(lum, w, h, p) > 0.1;
    if (groove) writeGlow(e, i, rune, 0.22);
    else {
      e[i] = e[i + 1] = e[i + 2] = 0;
    }
  }
  sctx.putImageData(em, 0, 0);
  const emissive = new THREE.CanvasTexture(src);
  emissive.colorSpace = THREE.SRGBColorSpace;
  emissive.flipY = map.flipY;
  emissive.needsUpdate = true;
  return emissive;
}

function writeGlow(data: Uint8ClampedArray, i: number, color: THREE.Color, strength: number): void {
  data[i] = Math.round(color.r * strength * 255);
  data[i + 1] = Math.round(color.g * strength * 255);
  data[i + 2] = Math.round(color.b * strength * 255);
}

function grooveContrast(lum: Float32Array, w: number, h: number, p: number): number {
  const x = p % w;
  const y = (p / w) | 0;
  let hi = lum[p];
  for (let oy = -1; oy <= 1; oy++) {
    const yy = y + oy;
    if (yy < 0 || yy >= h) continue;
    for (let ox = -1; ox <= 1; ox++) {
      const xx = x + ox;
      if (xx < 0 || xx >= w) continue;
      const v = lum[yy * w + xx];
      if (v > hi) hi = v;
    }
  }
  return hi - lum[p];
}

function dilateMask(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (src[y * w + x] === 0) continue;
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(h - 1, y + radius);
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      for (let yy = y0; yy <= y1; yy++) {
        const row = yy * w;
        out.fill(1, row + x0, row + x1 + 1);
      }
    }
  }
  return out;
}

function buildDeckMaterial(): THREE.MeshStandardMaterial {
  const tex = loadAlbedoTexture(assetUrl(PLANK_TEX_URL));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.8, 5.4);
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: PALETTE.hullDark,
    roughness: 0.85,
    flatShading: true,
  });
}

function buildSailMaterial(): THREE.MeshStandardMaterial {
  const tex = loadAlbedoTexture(assetUrl(SAIL_TEX_URL));
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: PALETTE.sail,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
}

/** Procedural fallback if the LOT-52 GLB is missing. */
function buildHeroHull(): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: PALETTE.hull,
    roughness: 0.85,
    flatShading: true,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.hullDark,
    roughness: 0.9,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: PALETTE.hullTrim,
    roughness: 0.7,
    flatShading: true,
  });
  const deckMat = buildDeckMaterial();
  const sailMat = buildSailMaterial();
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf7f2e2, roughness: 0.6 });

  const hullGeo = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.scale.set(1.5, 1.5, 5.2);
  hull.position.y = 1.5;
  hull.castShadow = true;
  group.add(hull);

  const rail = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 6, 28), darkMat);
  rail.rotation.x = Math.PI / 2;
  rail.scale.set(1.5, 5.2, 1);
  rail.position.y = 1.5;
  group.add(rail);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 9.2), deckMat);
  deck.position.y = 1.42;
  group.add(deck);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.06, 0.26, 8.4), trimMat);
  stripe.position.y = 1.05;
  group.add(stripe);

  for (const [z, tilt] of [
    [5.1, -0.5],
    [-5.1, 0.5],
  ] as const) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.6, 8), hullMat);
    post.position.set(0, 1.9, z);
    post.rotation.x = tilt;
    group.add(post);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 6, 14, Math.PI * 1.4), hullMat);
    curl.position.set(0, 2.9, z + (z > 0 ? 0.55 : -0.55));
    curl.rotation.set(0, Math.PI / 2, z > 0 ? 0.6 : -0.6);
    group.add(curl);
  }

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), eyeMat);
    eye.position.set(s * 1.3, 1.62, 3.5);
    eye.rotation.y = s * Math.PI * 0.5;
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), darkMat);
    pupil.position.set(s * 1.33, 1.62, 3.5);
    pupil.rotation.y = s * Math.PI * 0.5;
    group.add(pupil);
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 7.6, 8), hullMat);
  mast.position.y = 5.1;
  mast.castShadow = true;
  group.add(mast);

  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.6, 6), darkMat);
  yard.rotation.z = Math.PI / 2;
  yard.position.y = 7.3;
  group.add(yard);

  const sailGeo = new THREE.PlaneGeometry(5.2, 3.9, 14, 8);
  const sailPos = sailGeo.attributes.position as THREE.BufferAttribute;
  const sailBase = Float32Array.from(sailPos.array);
  const sail = new THREE.Mesh(sailGeo, sailMat);
  sail.position.set(0, 5.4, -0.1);
  sail.castShadow = true;
  group.add(sail);

  const band = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.55), trimMat);
  band.position.set(0, 5.4, -0.16);
  group.add(band);

  const plank = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 4.6), deckMat);
  plank.position.set(-1.6, 0.85, -1.2);
  plank.rotation.set(0.28, 0.35, 0.12);
  group.add(plank);

  const ropeTex = loadAlbedoTexture(assetUrl(ROPE_TEX_URL));
  ropeTex.offset.set(0.197, 0.009);
  ropeTex.repeat.set(0.66, 0.542);
  const netMat = new THREE.MeshStandardMaterial({
    map: ropeTex,
    transparent: true,
    alphaTest: 0.4,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), netMat);
  net.rotation.x = -Math.PI / 2;
  net.position.set(0.7, 1.52, -3.6);
  net.rotation.z = 0.3;
  group.add(net);

  group.userData.sailUpdate = (t: number, departing: number) => {
    for (let i = 0; i < sailPos.count; i++) {
      const x = sailBase[i * 3];
      const yv = sailBase[i * 3 + 1];
      sailPos.setZ(
        i,
        Math.sin(x * 1.1 + t * 2.1) * (0.16 + departing * 0.3) + Math.sin(yv * 1.4 - t * 1.5) * 0.09,
      );
    }
    sailPos.needsUpdate = true;
    sailGeo.computeVertexNormals();
  };

  return group;
}
