import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
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
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture } from "./sprite";

/**
 * Generated ground/prop textures (`docs/art/asset-registry.md` P1 — Su ve
 * kıyı / Gökyüzü ve uzak), shipped as WebP per `docs/art/pipeline.md` §6.
 */
const GRASS_TEX_URL = "assets/textures/flora_drygrass_01_albedo_1024.webp";
const SAND_TEX_URL = "assets/textures/sand_gold_01_albedo_512.webp";
const SAND_WET_TEX_URL = "assets/textures/sand_wet_01_albedo_1024.webp";
const ROCK_TEX_URL = "assets/textures/rock_chalk_01_albedo_1024.webp";
const REED_TEX_URL = "assets/textures/flora_reed_01_alpha_512.webp";
const HILL_BACKDROP_TEX_URL = "assets/skybox/hill_backdrop_01_albedo_2048.webp";

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

export interface Terrain {
  group: THREE.Group;
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

export function buildTerrain(): Terrain {
  const group = new THREE.Group();
  const rand = mulberry32(20260814);

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
  const trunkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.trunk,
    roughness: 0.9,
    flatShading: true,
  });
  const cypressMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cypress,
    roughness: 0.85,
    flatShading: true,
  });
  const oliveMat = new THREE.MeshStandardMaterial({
    color: PALETTE.olive,
    roughness: 0.85,
    flatShading: true,
  });
  // Weathered chalk rock (ASSET-031) doubles as both the loose boulders and
  // the shrine's marble — both read as pale cracked stone at this palette.
  const rockTex = loadAlbedoTexture(assetUrl(ROCK_TEX_URL));
  rockTex.wrapS = THREE.RepeatWrapping;
  rockTex.wrapT = THREE.RepeatWrapping;
  rockTex.repeat.set(1.4, 1.4);
  const rockMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    color: PALETTE.rock,
    roughness: 0.95,
    flatShading: true,
  });
  const marbleMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    color: PALETTE.marble,
    roughness: 0.6,
    flatShading: true,
  });

  const cypressGeo = new THREE.ConeGeometry(1, 5.2, 7);
  const oliveGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.6, 6);
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const columnGeo = new THREE.CylinderGeometry(0.42, 0.5, 4.4, 10);
  const capGeo = new THREE.BoxGeometry(1.3, 0.4, 1.3);

  const placeOnGround = (o: THREE.Object3D, x: number, z: number, yOff = 0) => {
    o.position.set(x, heightAt(x, z) + yOff, z);
    o.castShadow = true;
    group.add(o);
  };

  const floraCount = ISLAND.radius > 80 ? 140 : 60;
  for (let i = 0; i < floraCount; i++) {
    const a = rand() * Math.PI * 2;
    const r = 6 + rand() * (ISLAND.radius * islandRadiusFactor(a) - 7);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y < 0.9 || y > 16 || lagoonDist(x, z) < lagoonRadiusAt(x, z) + 2.2) continue;
    // Keep the shoreline in front of the ship clear.
    if (Math.hypot(x - SHIP.pos.x, z - SHIP.pos.z) < 18) continue;
    if (LAYOUT_SHIFT_Z === 0 && z > 15 && Math.abs(x - 4) < 7) continue;

    const kind = rand();
    if (kind < 0.42) {
      const t = new THREE.Mesh(cypressGeo, cypressMat);
      const s = 0.7 + rand() * 0.7;
      t.scale.set(s * (0.8 + rand() * 0.3), s, s * (0.8 + rand() * 0.3));
      placeOnGround(t, x, z, 5.2 * s * 0.5 - 0.2);
      t.rotation.y = rand() * 6.28;
    } else if (kind < 0.78) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.8;
      g.add(trunk);
      const blobs = 2 + Math.floor(rand() * 3);
      for (let b = 0; b < blobs; b++) {
        const m = new THREE.Mesh(oliveGeo, oliveMat);
        const s = 0.7 + rand() * 0.55;
        m.scale.set(s, s * 0.78, s);
        m.position.set((rand() - 0.5) * 1.1, 1.6 + rand() * 0.7, (rand() - 0.5) * 1.1);
        g.add(m);
      }
      g.scale.setScalar(0.85 + rand() * 0.5);
      placeOnGround(g, x, z, -0.15);
      g.rotation.y = rand() * 6.28;
    } else {
      const m = new THREE.Mesh(rockGeo, rockMat);
      const s = 0.5 + rand() * 1.1;
      m.scale.set(s, s * (0.5 + rand() * 0.5), s);
      m.rotation.set(rand() * 6.28, rand() * 6.28, rand() * 6.28);
      placeOnGround(m, x, z, -s * 0.25);
    }
  }

  group.add(buildDistantHills(rand));
  group.add(buildReedBeds(rand));
  group.add(buildNorthSpikeRocks(rand));

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
    if (!broken) {
      const cap = new THREE.Mesh(capGeo, marbleMat);
      placeOnGround(cap, x, z, hCol + 0.05);
    }
  }

  return { group };
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
 * Dense reed clumps along the south-west lagoon pocket (tutorial zone).
 * Each clump is a pair of crossed alpha-cutout billboards carrying the
 * generated reed tuft (ASSET-010) — replaces the old procedural
 * stem/tip cylinder+cone pairs (`docs/art/pipeline.md` §6: "sazlık billboard
 * PlaneGeometry"). All clumps are merged into one draw call.
 */
function buildReedBeds(rand: () => number): THREE.Group {
  const group = new THREE.Group();

  const reedTex = loadAlbedoTexture(assetUrl(REED_TEX_URL));
  const reedAspect = 624 / 862; // cropped alpha-key pixel dimensions
  const reedMat = new THREE.MeshStandardMaterial({
    map: reedTex,
    transparent: true,
    alphaTest: 0.4,
    depthWrite: true,
    side: THREE.DoubleSide,
    roughness: 0.85,
  });

  const clumpGeos: THREE.BufferGeometry[] = [];
  const reedZone = LOTUS.zones[0];
  const cx = reedZone.cx;
  const cz = reedZone.cz;
  for (let i = 0; i < 34; i++) {
    const a = rand() * Math.PI * 2;
    const r = 2.2 + rand() * 5.5;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y > LAGOON.waterY + 0.35 || y < LAGOON.floor + 0.05) continue;
    if (lagoonDist(x, z) > lagoonRadiusAt(x, z) + 0.8) continue;

    const h = 1.1 + rand() * 0.9;
    const w = h * reedAspect;
    const yaw = rand() * Math.PI;
    for (const crossOffset of [0, Math.PI / 2]) {
      const plane = new THREE.PlaneGeometry(w, h);
      plane.translate(0, h * 0.5, 0);
      plane.rotateY(yaw + crossOffset);
      plane.translate(x, y, z);
      clumpGeos.push(plane);
    }
  }

  if (clumpGeos.length > 0) {
    const merged = mergeGeometries(clumpGeos);
    const reeds = new THREE.Mesh(merged, reedMat);
    reeds.castShadow = true;
    group.add(reeds);
  }

  // North cove stepping stones — marks the distant pocket.
  const stoneTex = loadAlbedoTexture(assetUrl(ROCK_TEX_URL));
  const rockMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: PALETTE.rock,
    roughness: 0.95,
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

  return group;
}
