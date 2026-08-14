import * as THREE from "three";
import { ISLAND, LAGOON, PALETTE, PLAYER } from "../constants";
import { mulberry32 } from "./rng";

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

/** Ground height at a world position. Sea level is y = 0. */
export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const coast = islandRadiusAt(x, z);

  // Dome rising from the shoreline inward.
  const inland = smoothstep(coast, coast - ISLAND.domeFalloff, r);
  let h = inland * ISLAND.domeHeight + hills(x, z) * ISLAND.hillAmp * inland;

  // Beyond the shoreline the sea floor drops away.
  if (r > coast) {
    const out = r - coast;
    h = ISLAND.shoreDrop - out * 0.09;
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
  const colors = new Float32Array(pos.count * 3);

  const cSand = new THREE.Color(PALETTE.sand);
  const cSandWet = new THREE.Color(PALETTE.sandWet);
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

    // Grass tone by altitude, then sand painted over the shore and lagoon rim.
    if (y < 1.6) tmp.copy(cDry);
    else if (y < 2.8) tmp.copy(cDry).lerp(cGrass, smoothstep(1.6, 2.8, y));
    else tmp.copy(cGrass).lerp(cDeep, smoothstep(2.8, 3.8, y));

    const lr = lagoonRadiusAt(x, z);
    const coast = islandRadiusAt(x, z);
    const beachT = smoothstep(coast - ISLAND.beachWidth, coast - 1.5, r);
    const lagoonT = smoothstep(lr + 3.8, lr - 0.5, ld);
    const sandT = Math.max(beachT, lagoonT);
    tmp.lerp(cSand, sandT);
    tmp.lerp(cSandWet, smoothstep(0.45, -0.15, y) * 0.75);
    // Speckle so the flat-shaded facets read as ground, not plastic.
    const n = 0.94 + rand() * 0.12;
    tmp.lerp(cRock, Math.max(0, hills(x * 2.4, z * 2.4)) * 0.09);
    colors[i * 3] = tmp.r * n;
    colors[i * 3 + 1] = tmp.g * n;
    colors[i * 3 + 2] = tmp.b * n;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
      flatShading: true,
    }),
  );
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
  const rockMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rock,
    roughness: 0.95,
    flatShading: true,
  });
  const marbleMat = new THREE.MeshStandardMaterial({
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

  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2;
    const r = 6 + rand() * (ISLAND.radius * islandRadiusFactor(a) - 7);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y < 0.9 || lagoonDist(x, z) < lagoonRadiusAt(x, z) + 2.2) continue;
    // Keep the shoreline in front of the ship clear.
    if (z > 15 && Math.abs(x - 4) < 7) continue;

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

  // Weathered columns hint at the Lotophagoi's abandoned shrine.
  const shrine = { x: -13, z: -15 };
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
 * Hazy Aegean headlands across the water. Fog is disabled and the colour is
 * pre-mixed toward the sky so they read as atmospheric perspective.
 */
function buildDistantHills(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const layers = [
    { dist: 128, height: 26, color: 0x8fa8bd, count: 12 },
    { dist: 178, height: 34, color: 0xa9c4d6, count: 10 },
    { dist: 232, height: 42, color: 0xbcd8e6, count: 8 },
  ];

  for (const layer of layers) {
    const mat = new THREE.MeshBasicMaterial({ color: layer.color, fog: false });
    for (let i = 0; i < layer.count; i++) {
      const a = (i / layer.count) * Math.PI * 2 + rand() * 0.4;
      const d = layer.dist * (0.9 + rand() * 0.25);
      const h = layer.height * (0.55 + rand() * 0.7);
      const hill = new THREE.Mesh(new THREE.ConeGeometry(h * 1.5, h, 5, 1), mat);
      hill.position.set(Math.cos(a) * d, h * 0.5 - h * 0.42, Math.sin(a) * d);
      hill.rotation.y = rand() * Math.PI;
      hill.scale.z = 0.5 + rand() * 0.4;
      group.add(hill);
    }
  }
  return group;
}

/** Dense reed clumps along the south-west lagoon pocket (tutorial zone). */
function buildReedBeds(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const reedMat = new THREE.MeshStandardMaterial({
    color: 0x6a8a48,
    roughness: 0.9,
    flatShading: true,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0xc9b46a,
    roughness: 0.85,
    flatShading: true,
  });
  const stemGeo = new THREE.CylinderGeometry(0.025, 0.04, 1, 4);
  const tipGeo = new THREE.ConeGeometry(0.06, 0.22, 4);

  const cx = -5.5;
  const cz = 8.5;
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2;
    const r = 2.2 + rand() * 5.5;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y > LAGOON.waterY + 0.35 || y < LAGOON.floor + 0.05) continue;
    if (lagoonDist(x, z) > lagoonRadiusAt(x, z) + 0.8) continue;

    const stem = new THREE.Mesh(stemGeo, reedMat);
    const h = 0.7 + rand() * 1.1;
    stem.scale.set(1, h, 1);
    stem.position.set(x, LAGOON.waterY + h * 0.5, z);
    stem.rotation.z = (rand() - 0.5) * 0.25;
    stem.rotation.x = (rand() - 0.5) * 0.2;
    stem.castShadow = true;
    group.add(stem);

    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(x, LAGOON.waterY + h + 0.05, z);
    tip.rotation.z = stem.rotation.z;
    group.add(tip);
  }

  // North cove stepping stones — marks the distant pocket.
  const rockMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rock,
    roughness: 0.95,
    flatShading: true,
  });
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x = 3 + t * 5.5;
    const z = 4 - t * 9;
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
