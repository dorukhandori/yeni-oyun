import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  FLORA,
  ISLAND,
  LAGOON,
  LANDMARK,
  LAYOUT_SHIFT_Z,
  LOTUS,
  PALETTE,
  PLAYER,
  SHIP,
  SKY_TEX,
  TERRAIN_TEX,
} from "../constants";
import { mulberry32 } from "./rng";
import { displace } from "./geo";
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture } from "./sprite";
import { ISLAND_KIT, placeKit, type KitLook, type KitPose } from "./islandKit";

/**
 * Generated ground/prop textures (`docs/art/asset-registry.md` P1 — Su ve
 * kıyı / Gökyüzü ve uzak), shipped as WebP per `docs/art/pipeline.md` §6.
 */
const GRASS_TEX_URL = "assets/textures/flora_drygrass_01_albedo_1024.webp";
const SAND_TEX_URL = "assets/textures/sand_gold_01_albedo_512.webp";
const SAND_WET_TEX_URL = "assets/textures/sand_wet_01_albedo_1024.webp";
const ROCK_TEX_URL = "assets/textures/rock_chalk_01_albedo_1024.webp";
const REED_TEX_URL = "assets/textures/flora_reed_02_alpha_512.webp";
const HILL_BACKDROP_TEX_URL = "assets/skybox/hill_backdrop_01_albedo_2048.webp";

const REED_ASPECT = 512 / 482;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Cheap layered sine "noise" — deterministic and good enough for soft hills. */
function hills(x: number, z: number): number {
  const f = ISLAND.hillFreq;
  return (
    Math.sin(x * f) * Math.cos(z * f * 1.21) * 0.55 +
    Math.sin((x + z) * f * 1.9 + 1.3) * 0.3 +
    Math.cos(x * f * 3.1 - z * f * 2.4) * 0.15
  );
}

export function lagoonDist(x: number, z: number): number {
  return Math.hypot(x - LAGOON.center.x, z - LAGOON.center.z);
}

/** Wobble factor applied to the lagoon radius at a given bearing. */
export function lagoonRadiusFactor(angle: number): number {
  return (
    1 + LAGOON.wobbleA * Math.sin(angle * 3 + 0.7) + LAGOON.wobbleB * Math.sin(angle * 5 - 1.2)
  );
}

export function lagoonRadiusAt(x: number, z: number): number {
  const a = Math.atan2(z - LAGOON.center.z, x - LAGOON.center.x);
  return LAGOON.radius * lagoonRadiusFactor(a);
}

/** Coastline radius at a bearing — bays and headlands instead of a circle. */
export function islandRadiusFactor(angle: number): number {
  return (
    1 + ISLAND.wobbleA * Math.sin(angle * 2 + 0.9) + ISLAND.wobbleB * Math.sin(angle * 4 - 2.2)
  );
}

export function islandRadiusAt(x: number, z: number): number {
  return ISLAND.radius * islandRadiusFactor(Math.atan2(z, x));
}

/** Radial bump — 1 at the centre, 0 at `radius`, smooth falloff. */
function radialBump(dx: number, dz: number, radius: number): number {
  const d = Math.hypot(dx, dz);
  if (d >= radius || radius <= 0) return 0;
  const t = 1 - d / radius;
  return t * t * (3 - 2 * t);
}

/** Dominant north-east weenie — does not lift the rest of the island. */
function hillLandmark(x: number, z: number): number {
  const { x: hx, z: hz, height, radius } = LANDMARK.hill;
  if (height <= 0) return 0;
  const t = radialBump(x - hx, z - hz, radius);
  // Sharper peak so the 48 m summit reads as a silhouette, not a plateau.
  return height * t * t;
}

/** Small rocky nose west of the fleet — frames the beach, does not wall it. */
function headlandLandmark(x: number, z: number): number {
  const { x: hx, z: hz, height, radius } = LANDMARK.headland;
  if (height <= 0) return 0;
  return height * radialBump(x - hx, z - hz, radius);
}

/** Northern spike skyline — coastal band, walkable only at the feet. */
function northSpikeLandmark(x: number, z: number): number {
  const { height, startR, endR } = LANDMARK.northSpikes;
  if (height <= 0) return 0;
  const r = Math.hypot(x, z);
  const north = Math.max(0, z / Math.max(r, 1));
  if (north < 0.35) return 0;
  const ring = smoothstep(startR, startR + 10, r) * smoothstep(endR, endR - 8, r);
  if (ring <= 0) return 0;
  const spike = Math.abs(Math.sin(x * 0.21) * Math.cos(z * 0.17));
  return north * ring * (0.28 + spike * 0.72) * height;
}

/** Ground height at a world position. Sea level is y = 0. */
export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const coast = islandRadiusAt(x, z);

  // Dome rising from the shoreline inward.
  const inland = smoothstep(coast, coast - ISLAND.domeFalloff, r);
  let h = inland * ISLAND.domeHeight + hills(x, z) * ISLAND.hillAmp * inland;
  h += (hillLandmark(x, z) + headlandLandmark(x, z)) * inland;

  const spike = northSpikeLandmark(x, z);

  // Beyond the shoreline the sea floor drops away — northern rocks may pierce it.
  if (r > coast) {
    const out = r - coast;
    h = ISLAND.shoreDrop - out * 0.09;
    h = Math.max(h, spike * smoothstep(22, 0, out));
  } else {
    h += spike;
  }

  // Lagoon basin carved into the island.
  const ld = lagoonDist(x, z);
  // Blend the basin into the surrounding land so the rim is a beach, not a cliff.
  const lr = lagoonRadiusAt(x, z);
  const w = smoothstep(lr + 5, lr - 1, ld);
  if (w > 0.001) {
    const t = ld / lr;
    const basin = LAGOON.floor + t * t * (0.85 + LAGOON.radius * 0.02);
    h = h * (1 - w) + Math.min(h + 0.6, basin) * w;
  }

  return h;
}

export function inLagoon(x: number, z: number): boolean {
  return lagoonDist(x, z) < lagoonRadiusAt(x, z) - 0.3 && heightAt(x, z) < LAGOON.waterY;
}

/** Furthest the player may wade out from the island centre at a bearing. */
export function wadeLimitAt(x: number, z: number): number {
  return islandRadiusAt(x, z) + PLAYER.shoreLimit;
}

/** A static solid the player can bump into — world XZ + a push-out radius. */
export interface Collider {
  x: number;
  z: number;
  radius: number;
}

export interface Terrain {
  group: THREE.Group;
  /** Rocks, tree trunks, shrine columns — static circle colliders for `game.ts`'s movement step. */
  colliders: Collider[];
  update(t: number): void;
}

/**
 * Ground material — three tileable textures (grass, dry sand, wet sand)
 * splatted from the `aTint`/`aWeights` vertex attributes computed in
 * `buildTerrain()`. Built on `MeshStandardMaterial.onBeforeCompile` so the
 * ground keeps standard PBR lighting + shadow receiving; only the albedo
 * (`diffuseColor`) is replaced. World-space XZ (not the plane's stretched
 * UVs) drives the texture sampling so tile scale is a fixed meters-per-repeat
 * value regardless of how large the terrain plane is (`TERRAIN_TEX`).
 */
function buildGroundMaterial(): THREE.MeshStandardMaterial {
  const grassTex = loadAlbedoTexture(assetUrl(GRASS_TEX_URL));
  const sandTex = loadAlbedoTexture(assetUrl(SAND_TEX_URL));
  const sandWetTex = loadAlbedoTexture(assetUrl(SAND_WET_TEX_URL));
  for (const t of [grassTex, sandTex, sandWetTex]) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }

  const material = new THREE.MeshStandardMaterial({
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.tGrass = { value: grassTex };
    shader.uniforms.tSand = { value: sandTex };
    shader.uniforms.tSandWet = { value: sandWetTex };
    shader.uniforms.uGrassTile = { value: TERRAIN_TEX.grassTileMeters };
    shader.uniforms.uSandTile = { value: TERRAIN_TEX.sandTileMeters };
    shader.uniforms.uSandWetTile = { value: TERRAIN_TEX.sandWetTileMeters };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec3 aTint;
attribute vec2 aWeights;
varying vec3 vTint;
varying vec2 vWeights;
varying vec2 vWorldXZ;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vTint = aTint;
vWeights = aWeights;
vWorldXZ = position.xz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D tGrass;
uniform sampler2D tSand;
uniform sampler2D tSandWet;
uniform float uGrassTile;
uniform float uSandTile;
uniform float uSandWetTile;
varying vec3 vTint;
varying vec2 vWeights;
varying vec2 vWorldXZ;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec3 groundGrass = texture2D(tGrass, vWorldXZ / uGrassTile).rgb * vTint;
vec3 groundSandDry = texture2D(tSand, vWorldXZ / uSandTile).rgb;
vec3 groundSandWet = texture2D(tSandWet, vWorldXZ / uSandWetTile).rgb;
vec3 groundSand = mix(groundSandDry, groundSandWet, vWeights.y);
diffuseColor.rgb = mix(groundGrass, groundSand, vWeights.x);`,
      );
  };

  return material;
}

function colorize(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Mediterranean cypress — trunk + stacked cones. Volume from the mesh; light from the engine. */
function makeCypressGeo(): THREE.BufferGeometry {
  const trunk = colorize(new THREE.CylinderGeometry(0.1, 0.18, 1.2, 7), PALETTE.trunk);
  trunk.translate(0, 0.58, 0);
  const layers = [
    { r: 0.92, h: 2.05, y: 1.68 },
    { r: 0.7, h: 1.85, y: 2.92 },
    { r: 0.48, h: 1.55, y: 4.05 },
    { r: 0.28, h: 1.2, y: 4.95 },
  ];
  const parts: THREE.BufferGeometry[] = [trunk];
  for (const L of layers) {
    const cone = colorize(new THREE.ConeGeometry(L.r, L.h, 8), PALETTE.cypress);
    cone.translate(0, L.y, 0);
    parts.push(cone);
  }
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("cypress geo merge failed");
  merged.computeVertexNormals();
  return merged;
}

/** Olive: gnarled trunk + overlapping canopy volumes. Smooth normals, not billboard cards. */
function makeOliveGeo(): THREE.BufferGeometry {
  const trunk = colorize(new THREE.CylinderGeometry(0.14, 0.22, 1.45, 8), PALETTE.trunk);
  trunk.translate(0, 0.7, 0);
  const blobs = [
    { s: 1.12, y: 1.88, x: 0, z: 0, sy: 0.76, hex: PALETTE.olive },
    { s: 0.8, y: 2.08, x: 0.58, z: -0.2, sy: 0.68, hex: PALETTE.olive },
    { s: 0.72, y: 2.12, x: -0.5, z: 0.32, sy: 0.64, hex: PALETTE.grassDry },
    { s: 0.66, y: 1.58, x: 0.22, z: 0.52, sy: 0.6, hex: PALETTE.olive },
    { s: 0.55, y: 2.38, x: -0.12, z: -0.38, sy: 0.55, hex: PALETTE.olive },
  ];
  const parts: THREE.BufferGeometry[] = [trunk];
  for (const b of blobs) {
    const ic = colorize(new THREE.IcosahedronGeometry(b.s, 1), b.hex);
    ic.scale(1, b.sy, 1);
    ic.translate(b.x, b.y, b.z);
    parts.push(ic);
  }
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("olive geo merge failed");
  merged.computeVertexNormals();
  return merged;
}

function alphaBillboardMat(url: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: loadAlbedoTexture(assetUrl(url)),
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.4,
    depthWrite: true,
    side: THREE.DoubleSide,
    roughness: 0.88,
  });
}

function attachSway(mat: THREE.MeshStandardMaterial, amount: number): { value: number } {
  const wind = { value: 0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind;
    shader.uniforms.uSway = { value: amount };
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
  };
  return wind;
}

function nearLotus(x: number, z: number, extra = 1.6): boolean {
  return LOTUS.zones.some((zn) => Math.hypot(x - zn.cx, z - zn.cz) < zn.radius + extra);
}

function onTreeLand(x: number, z: number): number | null {
  const y = heightAt(x, z);
  if (y < FLORA.treeMinY || y > FLORA.treeMaxY) return null;
  if (lagoonDist(x, z) < lagoonRadiusAt(x, z) + 2.4) return null;
  if (Math.hypot(x - SHIP.pos.x, z - SHIP.pos.z) < FLORA.shipKeepout) return null;
  if (nearLotus(x, z)) return null;
  const coast = islandRadiusAt(x, z);
  if (Math.hypot(x, z) > coast - 7) return null;
  return y;
}

function scatterPoint(
  rand: () => number,
  valid: (x: number, z: number) => number | null,
  tries = 18,
): { x: number; z: number; y: number } | null {
  for (let t = 0; t < tries; t++) {
    const a = rand() * Math.PI * 2;
    const coast = ISLAND.radius * islandRadiusFactor(a);
    const r = 8 + rand() * Math.max(4, coast - 10);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = valid(x, z);
    if (y !== null) return { x, z, y };
  }
  return null;
}

type Pose = {
  x: number;
  z: number;
  y: number;
  sx: number;
  sy: number;
  sz: number;
  rotY: number;
  rotX?: number;
  rotZ?: number;
};

function toKitPose(p: Pose): KitPose {
  return {
    x: p.x,
    y: p.y,
    z: p.z,
    sx: p.sx,
    sy: p.sy,
    sz: p.sz,
    rotY: p.rotY,
    rotX: p.rotX,
    rotZ: p.rotZ,
  };
}

function fillInstanced(mesh: THREE.InstancedMesh, poses: Pose[]): void {
  const dummy = new THREE.Object3D();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i];
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
}

export function buildTerrain(): Terrain {
  const group = new THREE.Group();
  const rand = mulberry32(20260814);
  const kitUpdates: Array<(t: number) => void> = [];
  const useKit = (
    legacy: THREE.Object3D,
    path: string,
    poses: Pose[],
    look: KitLook | number = {},
  ) => {
    void placeKit(group, path, poses.map(toKitPose), look).then((u) => {
      if (!u) return;
      legacy.visible = false;
      kitUpdates.push(u.update);
    });
  };

  const geo = new THREE.PlaneGeometry(
    ISLAND.planeSize,
    ISLAND.planeSize,
    ISLAND.planeSegments,
    ISLAND.planeSegments,
  );
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  // Per-vertex ground-shader inputs (custom attributes, not the standard
  // `color` slot — see the onBeforeCompile block below):
  //  - aTint: grass hue-by-altitude gradient + speckle, multiplies the grass texture only.
  //  - aWeights.x: sand vs. grass blend (shoreline + lagoon rim).
  //  - aWeights.y: wet vs. dry sand blend, inside the sand portion only.
  const tints = new Float32Array(pos.count * 3);
  const weights = new Float32Array(pos.count * 2);

  const cDry = new THREE.Color(PALETTE.grassDry);
  const cGrass = new THREE.Color(PALETTE.grass);
  const cDeep = new THREE.Color(PALETTE.grassDeep);
  const cRock = new THREE.Color(PALETTE.rock);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);

    const r = Math.hypot(x, z);
    const ld = lagoonDist(x, z);

    // Grass hue by altitude — tints the grass texture (flora_drygrass_01).
    // Above ~8 m the weenie / north rocks fade to chalk so the 48 m peak reads.
    if (y < 1.6) tmp.copy(cDry);
    else if (y < 2.8) tmp.copy(cDry).lerp(cGrass, smoothstep(1.6, 2.8, y));
    else if (y < 8) tmp.copy(cGrass).lerp(cDeep, smoothstep(2.8, 8, y));
    else tmp.copy(cDeep).lerp(cRock, smoothstep(8, 22, y));
    // Subtle rocky fleck within the grass, same noise as before.
    tmp.lerp(cRock, Math.max(0, hills(x * 2.4, z * 2.4)) * 0.09);
    // Speckle so the flat-shaded facets read as ground, not plastic.
    const n = 0.94 + rand() * 0.12;
    tints[i * 3] = tmp.r * n;
    tints[i * 3 + 1] = tmp.g * n;
    tints[i * 3 + 2] = tmp.b * n;

    const lr = lagoonRadiusAt(x, z);
    const coast = islandRadiusAt(x, z);
    const beachT = smoothstep(coast - ISLAND.beachWidth, coast - 1.5, r);
    const lagoonT = smoothstep(lr + 3.8, lr - 0.5, ld);
    weights[i * 2] = Math.max(beachT, lagoonT);
    weights[i * 2 + 1] = smoothstep(0.45, -0.15, y);
  }

  geo.setAttribute("aTint", new THREE.BufferAttribute(tints, 3));
  geo.setAttribute("aWeights", new THREE.BufferAttribute(weights, 2));
  geo.computeVertexNormals();

  const ground = new THREE.Mesh(geo, buildGroundMaterial());
  ground.receiveShadow = true;
  group.add(ground);

  // ------------------------------------------------------------------- props
  const rockTex = loadAlbedoTexture(assetUrl(ROCK_TEX_URL));
  rockTex.wrapS = THREE.RepeatWrapping;
  rockTex.wrapT = THREE.RepeatWrapping;
  rockTex.repeat.set(1.4, 1.4);
  const rockMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    color: PALETTE.rock,
    roughness: 0.92,
    flatShading: true,
  });
  const marbleMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    color: PALETTE.marble,
    roughness: 0.6,
    flatShading: true,
  });

  const columnGeo = new THREE.CylinderGeometry(0.42, 0.5, 4.4, 10);
  const capGeo = new THREE.BoxGeometry(1.3, 0.4, 1.3);

  const placeOnGround = (o: THREE.Object3D, x: number, z: number, yOff = 0) => {
    o.position.set(x, heightAt(x, z) + yOff, z);
    o.castShadow = true;
    group.add(o);
  };

  const treeMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0,
  });

  // Static push-out circles for game.ts's movement step — rocks and tree
  // trunks read as solid but nothing ever blocked walking through them.
  const colliders: Collider[] = [];
  /** Cypress trunk base radius ~0.18 local units (`makeCypressGeo`). */
  const CYPRESS_TRUNK_R = 0.18;
  /** Olive trunk base radius ~0.22 local units (`makeOliveGeo`). */
  const OLIVE_TRUNK_R = 0.22;
  /** Icosahedron rock radius 1 local unit; 0.55 keeps the collider inside the displaced silhouette. */
  const ROCK_COLLIDE_FACTOR = 0.55;
  /** Shrine column radius (`columnGeo` = CylinderGeometry(0.42, 0.5, ...)). */
  const COLUMN_R = 0.46;

  const cypressPoses: Pose[] = [];
  for (let g = 0; g < FLORA.cypressGroves; g++) {
    const center = scatterPoint(rand, onTreeLand);
    if (!center) continue;
    const n = 2 + Math.floor(rand() * FLORA.cypressPerGrove);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const d = k === 0 ? 0 : 1.4 + rand() * FLORA.groveRadius;
      const x = center.x + Math.cos(a) * d;
      const z = center.z + Math.sin(a) * d;
      const y = onTreeLand(x, z);
      if (y === null) continue;
      const s = 0.88 + rand() * 0.5;
      const sx = s * (0.86 + rand() * 0.18);
      const sz = s * (0.86 + rand() * 0.18);
      cypressPoses.push({ x, z, y: y - 0.06, sx, sy: s, sz, rotY: rand() * 6.28 });
      colliders.push({ x, z, radius: CYPRESS_TRUNK_R * ((sx + sz) / 2) });
    }
  }
  if (cypressPoses.length > 0) {
    const mesh = new THREE.InstancedMesh(makeCypressGeo(), treeMat, cypressPoses.length);
    fillInstanced(mesh, cypressPoses);
    mesh.frustumCulled = false;
    group.add(mesh);
    useKit(mesh, ISLAND_KIT.cypress, cypressPoses);
  }

  const olivePoses: Pose[] = [];
  for (let g = 0; g < FLORA.oliveGroves; g++) {
    const center = scatterPoint(rand, onTreeLand);
    if (!center) continue;
    const n = 2 + Math.floor(rand() * FLORA.olivePerGrove);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const d = k === 0 ? 0 : 1.2 + rand() * (FLORA.groveRadius * 0.85);
      const x = center.x + Math.cos(a) * d;
      const z = center.z + Math.sin(a) * d;
      const y = onTreeLand(x, z);
      if (y === null) continue;
      const s = 0.92 + rand() * 0.48;
      olivePoses.push({
        x,
        z,
        y: y - 0.08,
        sx: s,
        sy: s * (0.9 + rand() * 0.14),
        sz: s,
        rotY: rand() * 6.28,
      });
      colliders.push({ x, z, radius: OLIVE_TRUNK_R * s });
    }
  }
  if (olivePoses.length > 0) {
    const mesh = new THREE.InstancedMesh(makeOliveGeo(), treeMat, olivePoses.length);
    fillInstanced(mesh, olivePoses);
    mesh.frustumCulled = false;
    group.add(mesh);
    useKit(mesh, ISLAND_KIT.olive, olivePoses);
  }

  const rockGeo = displace(new THREE.IcosahedronGeometry(1, 0), 0.35, rand);
  const rockPoses: Pose[] = [];
  const boulderPoses: Pose[] = [];
  const pebblePoses: Pose[] = [];
  /** `solid` false for lagoon-edge pebbles — shore/inland boulders block, wading debris doesn't. */
  const pushRock = (x: number, z: number, y: number, s: number, solid = true) => {
    const sx = s * (0.85 + rand() * 0.4);
    const sz = s * (0.85 + rand() * 0.4);
    const pose: Pose = {
      x,
      z,
      y: y - s * 0.22,
      sx,
      sy: s * (0.45 + rand() * 0.4),
      sz,
      rotY: rand() * 6.28,
      rotX: rand() * 1.2,
      rotZ: rand() * 0.8,
    };
    rockPoses.push(pose);
    (solid ? boulderPoses : pebblePoses).push(pose);
    if (solid) colliders.push({ x, z, radius: ROCK_COLLIDE_FACTOR * ((sx + sz) / 2) });
  };
  for (let i = 0; i < FLORA.rockShore; i++) {
    const a = rand() * Math.PI * 2;
    const coast = ISLAND.radius * islandRadiusFactor(a);
    const r = coast - 0.6 - rand() * 4.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y < -0.15 || y > 3.2) continue;
    if (Math.hypot(x - SHIP.pos.x, z - SHIP.pos.z) < 8) continue;
    pushRock(x, z, y, 0.45 + rand() * 1.15);
  }
  for (let i = 0; i < FLORA.rockLagoon; i++) {
    const a = rand() * Math.PI * 2;
    const lr = LAGOON.radius * lagoonRadiusFactor(a);
    const r = lr + 0.35 + rand() * 1.8;
    const x = LAGOON.center.x + Math.cos(a) * r;
    const z = LAGOON.center.z + Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y < LAGOON.floor + 0.05 || y > 2.4) continue;
    pushRock(x, z, y, 0.35 + rand() * 0.7, false);
  }
  for (let i = 0; i < FLORA.rockInland; i++) {
    const p = scatterPoint(rand, (x, z) => {
      const y = heightAt(x, z);
      if (y < 0.7 || y > 10) return null;
      if (lagoonDist(x, z) < lagoonRadiusAt(x, z) + 1.2) return null;
      if (Math.hypot(x - SHIP.pos.x, z - SHIP.pos.z) < FLORA.shipKeepout) return null;
      return y;
    });
    if (!p) continue;
    pushRock(p.x, p.z, p.y, 0.5 + rand() * 1.3);
  }
  if (rockPoses.length > 0) {
    const mesh = new THREE.InstancedMesh(rockGeo, rockMat, rockPoses.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < rockPoses.length; i++) {
      const p = rockPoses[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.rotation.set(p.rotX ?? rand() * 1.2, p.rotY, p.rotZ ?? rand() * 0.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    void Promise.all([
      placeKit(group, ISLAND_KIT.boulder, boulderPoses.map(toKitPose)),
      placeKit(group, ISLAND_KIT.pebble, pebblePoses.map(toKitPose)),
    ]).then(([boulders, pebbles]) => {
      if (boulders || pebbles) mesh.visible = false;
      if (boulders) kitUpdates.push(boulders.update);
      if (pebbles) kitUpdates.push(pebbles.update);
    });
  }

  const reeds = buildReedBeds(rand);
  const grass = buildGrassTufts(rand);
  group.add(buildDistantHills(rand));
  group.add(reeds.group);
  group.add(grass.group);
  group.add(buildNorthSpikeRocks(rand));
  if (reeds.reedMesh) useKit(reeds.reedMesh, ISLAND_KIT.reed, reeds.poses, 0.08);
  useKit(grass.group, ISLAND_KIT.grass, grass.poses, {
    sway: FLORA.grassSway,
    doubleSide: true,
    castShadow: false,
    receiveShadow: false,
    envMapIntensity: 0,
    vertexColors: false,
    color: PALETTE.grassDeep,
    lambert: true,
    lumaMax: 0.3,
  });

  // Weathered columns hint at the Lotophagoi's abandoned shrine.
  const shrine = { x: -13, z: -15 + LAYOUT_SHIFT_Z };
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const x = shrine.x + Math.cos(a) * 3.6;
    const z = shrine.z + Math.sin(a) * 3.6;
    const broken = i === 1 || i === 4;
    const hCol = broken ? 1.6 + rand() * 1.2 : 4.4;
    const col = new THREE.Mesh(columnGeo, marbleMat);
    col.scale.y = hCol / 4.4;
    placeOnGround(col, x, z, hCol / 2 - 0.2);
    col.rotation.y = rand() * 0.4;
    colliders.push({ x, z, radius: COLUMN_R });
    if (!broken) {
      const cap = new THREE.Mesh(capGeo, marbleMat);
      placeOnGround(cap, x, z, hCol + 0.05);
    }
  }

  return {
    group,
    colliders,
    update(t) {
      reeds.update(t);
      grass.update(t);
      for (const u of kitUpdates) u(t);
    },
  };
}

/**
 * Extra chalk spikes on the north coast so the heightmap's soft band still
 * reads as a jagged skyline from the south beach.
 */
function buildNorthSpikeRocks(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  if (LANDMARK.northSpikes.height <= 0) return group;

  const rockTex = loadAlbedoTexture(assetUrl(ROCK_TEX_URL));
  rockTex.wrapS = THREE.RepeatWrapping;
  rockTex.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({
    map: rockTex,
    color: PALETTE.rock,
    roughness: 0.95,
    flatShading: true,
  });

  const { startR, endR } = LANDMARK.northSpikes;
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * 0.5 + (rand() - 0.5) * 1.15;
    const r = startR + 8 + rand() * (endR - startR - 16);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    const h = 7 + rand() * 16;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(1.6 + rand() * 2.4, h, 5, 1), mat);
    spike.position.set(x, y + h * 0.35, z);
    spike.rotation.y = rand() * Math.PI;
    spike.rotation.z = (rand() - 0.5) * 0.25;
    spike.scale.z = 0.45 + rand() * 0.35;
    spike.castShadow = true;
    group.add(spike);
  }
  return group;
}

/**
 * Hazy Aegean headlands across the water. The near layer stays procedural
 * (cheap silhouette variety close to the coast); the far skyline is one
 * textured ring using the generated hill backdrop (ASSET-023), which reads
 * far better than a flat-colour cone at that distance.
 */
function buildDistantHills(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const nearLayer = {
    dist: ISLAND.radius + 68,
    height: 26,
    color: 0x8fa8bd,
    count: 12,
  };

  const mat = new THREE.MeshBasicMaterial({ color: nearLayer.color, fog: false });
  for (let i = 0; i < nearLayer.count; i++) {
    const a = (i / nearLayer.count) * Math.PI * 2 + rand() * 0.4;
    const d = nearLayer.dist * (0.9 + rand() * 0.25);
    const h = nearLayer.height * (0.55 + rand() * 0.7);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(h * 1.5, h, 5, 1), mat);
    hill.position.set(Math.cos(a) * d, h * 0.5 - h * 0.42, Math.sin(a) * d);
    hill.rotation.y = rand() * Math.PI;
    hill.scale.z = 0.5 + rand() * 0.4;
    group.add(hill);
  }

  group.add(buildHillBackdropRing());
  return group;
}

/**
 * Textured farthest skyline — an open cylinder wrapped in the hill backdrop
 * photo, repeated a few times around the horizon (it is a single wide shot,
 * not a seamless 360 pan, so we tile it like the existing cone layers do
 * with silhouettes rather than pretending it is equirectangular). A tiny
 * custom shader fades the top edge to transparent so it blends into the sky
 * gradient instead of cutting a hard horizon line; `fog: false` matches the
 * near cone layer so both stay crisp as atmospheric-perspective cutouts.
 */
function buildHillBackdropRing(): THREE.Mesh {
  const tex = loadAlbedoTexture(assetUrl(HILL_BACKDROP_TEX_URL));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.x = SKY_TEX.hillRepeat;

  const geo = new THREE.CylinderGeometry(
    SKY_TEX.hillDistance,
    SKY_TEX.hillDistance,
    SKY_TEX.hillHeight,
    48,
    1,
    true,
  );
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex } },
    side: THREE.BackSide,
    fog: false,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(map, vUv);
        // v=0 is the cylinder's top edge (open into the sky) — fade it out.
        float topFade = smoothstep(0.0, 0.5, vUv.y);
        gl_FragColor = vec4(c.rgb, topFade);
      }
    `,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.position.y = SKY_TEX.hillY;
  return ring;
}

/**
 * Dense reed clumps along the lagoon rim (art-bible.md §6: sazlık = border)
 * plus a thicker pocket at the tutorial harvest zone.
 */
function buildReedBeds(rand: () => number): {
  group: THREE.Group;
  update: (t: number) => void;
  reedMesh: THREE.Object3D | null;
  poses: Pose[];
} {
  const group = new THREE.Group();
  const poses: Pose[] = [];

  const reedMat = alphaBillboardMat(REED_TEX_URL);
  reedMat.roughness = 0.85;
  const wind = attachSway(reedMat, 0.08);

  const clumpGeos: THREE.BufferGeometry[] = [];
  const plant = (x: number, z: number) => {
    const y = heightAt(x, z);
    if (y > LAGOON.waterY + 0.55 || y < LAGOON.floor + 0.02) return;
    const h = 1.25 + rand() * 1.15;
    const w = h * REED_ASPECT;
    const yaw = rand() * Math.PI;
    const s = h / 1.94;
    poses.push({ x, z, y: y - 0.02, sx: s, sy: s, sz: s, rotY: yaw });
    for (const crossOffset of [0, Math.PI / 2]) {
      const plane = new THREE.PlaneGeometry(w, h);
      plane.translate(0, h * 0.5, 0);
      plane.rotateY(yaw + crossOffset);
      plane.translate(x, y - 0.02, z);
      clumpGeos.push(plane);
    }
  };

  for (let i = 0; i < FLORA.reedRim; i++) {
    const a = (i / FLORA.reedRim) * Math.PI * 2 + (rand() - 0.5) * 0.18;
    const lr = LAGOON.radius * lagoonRadiusFactor(a);
    const r = lr - 0.4 + rand() * 2.2;
    plant(LAGOON.center.x + Math.cos(a) * r, LAGOON.center.z + Math.sin(a) * r);
  }

  const reedZone = LOTUS.zones[0];
  for (let i = 0; i < FLORA.reedPocket; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1.6 + rand() * reedZone.radius;
    plant(reedZone.cx + Math.cos(a) * r, reedZone.cz + Math.sin(a) * r);
  }

  let reedMesh: THREE.Object3D | null = null;
  if (clumpGeos.length > 0) {
    const merged = mergeGeometries(clumpGeos);
    for (const g of clumpGeos) g.dispose();
    if (merged) {
      const reeds = new THREE.Mesh(merged, reedMat);
      reeds.castShadow = true;
      group.add(reeds);
      reedMesh = reeds;
    }
  }

  const stoneTex = loadAlbedoTexture(assetUrl(ROCK_TEX_URL));
  const rockMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: PALETTE.rock,
    roughness: 0.92,
    flatShading: true,
  });
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x = 3 + t * 5.5;
    const z = 4 - t * 9 + LAYOUT_SHIFT_Z;
    const y = heightAt(x, z);
    if (y < -0.2) continue;
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rand() * 0.25, 0), rockMat);
    stone.position.set(x, y + 0.12, z);
    stone.scale.set(1, 0.45, 1.1);
    stone.rotation.y = rand() * 6;
    stone.castShadow = true;
    group.add(stone);
  }

  return {
    group,
    reedMesh,
    poses,
    update(t) {
      wind.value = t;
    },
  };
}

function inNorthSpikeBand(x: number, z: number): boolean {
  if (LANDMARK.northSpikes.height <= 0) return false;
  const r = Math.hypot(x, z);
  const north = Math.max(0, z / Math.max(r, 1));
  return north >= 0.35 && r >= LANDMARK.northSpikes.startR;
}

/** Grass (not beach sand, not lagoon water, not the spike rocks). */
function onGrassField(x: number, z: number): number | null {
  const y = heightAt(x, z);
  if (y < 0.12 || y > 16) return null;
  const r = Math.hypot(x, z);
  const coast = islandRadiusAt(x, z);
  if (r > coast - 1.6) return null;
  const beachT = smoothstep(coast - ISLAND.beachWidth, coast - 1.5, r);
  if (beachT > 0.42) return null;
  const ld = lagoonDist(x, z);
  const lr = lagoonRadiusAt(x, z);
  if (ld < lr + 0.35) return null;
  const lagoonT = smoothstep(lr + 3.8, lr - 0.5, ld);
  if (lagoonT > 0.5) return null;
  if (inNorthSpikeBand(x, z)) return null;
  if (nearLotus(x, z, 0.55)) return null;
  return y;
}

/** Island-wide 3D grass carpet (ASSET-070). Billboard fallback only if the kit GLB is missing. */
function buildGrassTufts(rand: () => number): {
  group: THREE.Group;
  update: (t: number) => void;
  poses: Pose[];
} {
  const group = new THREE.Group();
  const poses: Pose[] = [];
  const spacing = FLORA.grassFieldSpacing;
  const hexH = spacing * 0.8660254;
  const reach = ISLAND.radius + 2;
  let row = 0;
  for (let z = -reach; z <= reach; z += hexH) {
    const ox = (row % 2) * spacing * 0.5;
    row++;
    for (let x = -reach; x <= reach; x += spacing) {
      const jx = x + ox + (rand() - 0.5) * spacing * 0.38;
      const jz = z + (rand() - 0.5) * hexH * 0.38;
      const y = onGrassField(jx, jz);
      if (y === null) continue;
      const spread = FLORA.grassSpreadScale * (0.9 + rand() * 0.2);
      const h = FLORA.grassHeightScale * (0.85 + rand() * 0.3);
      poses.push({
        x: jx,
        z: jz,
        y: y - FLORA.grassSink,
        sx: spread,
        sy: h,
        sz: spread,
        rotY: rand() * Math.PI * 2,
      });
    }
  }

  return {
    group,
    poses,
    update() {
      /* Kit InstancedMesh owns sway once loaded. */
    },
  };
}
