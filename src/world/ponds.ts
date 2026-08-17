import * as THREE from "three";
import { FLORA, ISLAND, LAGOON, LOTUS, PALETTE, PONDS, SEA_TEX, SHIP } from "../constants";
import { mulberry32 } from "./rng";
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture } from "./sprite";

/**
 * Decorative freshwater pockets away from the inner lake (LOT-53).
 *
 * Scenery only. `terrain.inLagoon()` is untouched, so nothing here changes
 * wade speed, `MEM_LAKE_RECOVER` or any other tuned rate — a pond is a hole in
 * the heightmap with a disc of water in it.
 *
 * This module owns the *shape* maths (`pondBasinAt`) and deliberately imports
 * nothing from `terrain.ts`: `heightAt()` calls into here, not the other way
 * round, so there is no import cycle. Anything that genuinely needs ground
 * height takes a sampler as an argument.
 */

export interface Pond {
  name: string;
  x: number;
  z: number;
  /** Carved rim radius. The visible water disc is `PONDS.discInset` smaller. */
  radius: number;
}

/** Angular wobble so a pond is an irregular pool, not a stamped circle. */
function pondRadiusFactor(angle: number, seed: number): number {
  return 1 + 0.17 * Math.sin(angle * 3 + seed) + 0.09 * Math.sin(angle * 5 - seed * 1.7);
}

function coastRadiusFactor(angle: number): number {
  return 1 + ISLAND.wobbleA * Math.sin(angle * 2 + 0.9) + ISLAND.wobbleB * Math.sin(angle * 4 - 2.2);
}

function lagoonRadiusFactorLocal(angle: number): number {
  return 1 + LAGOON.wobbleA * Math.sin(angle * 3 + 0.7) + LAGOON.wobbleB * Math.sin(angle * 5 - 1.2);
}

/**
 * Can a pond of `radius` sit at (x, z)? Checks the lagoon, the berth, every
 * lotus zone, the coast and the ponds accepted so far. Pure geometry — no
 * terrain sampling, so it is safe to call from `resolvePonds()` before the
 * heightmap exists.
 */
function siteFits(x: number, z: number, radius: number, taken: Pond[]): boolean {
  const keep = Math.max(PONDS.keepoutMin, ISLAND.radius * PONDS.keepoutFrac);

  // Inner lake.
  const la = Math.atan2(z - LAGOON.center.z, x - LAGOON.center.x);
  const lagoonR = LAGOON.radius * lagoonRadiusFactorLocal(la);
  if (Math.hypot(x - LAGOON.center.x, z - LAGOON.center.z) < lagoonR + radius + keep) return false;

  // Berth: the hull is 42 m on both profiles, so this clearance is absolute —
  // it is the ship's size, not the island's, that decides it.
  if (Math.hypot(x - SHIP.pos.x, z - SHIP.pos.z) < radius + FLORA.shipKeepout) return false;

  // Harvest pockets stay readable — a pond must not swallow a lotus zone.
  for (const zone of LOTUS.zones) {
    if (Math.hypot(x - zone.cx, z - zone.cz) < zone.radius + radius + keep) return false;
  }

  // Stay inland, and — the one that actually bites — stay clear of the sea
  // sheet. `sea.ts` draws the ocean inward to `coast - SEA_TEX.overlapMeters`
  // and floors it at `SEA_TEX.floorY` (+0.05). A pond basin digs to -0.75, so
  // a pond overlapping that band gets the ocean rendered *inside* it: the
  // outer half of the pool turns into `PALETTE.seaFoam` cream. Caught on the
  // sandbox island, where the coast is close enough for the bands to meet.
  const r = Math.hypot(x, z);
  const coast = ISLAND.radius * coastRadiusFactor(Math.atan2(z, x));
  const beachMargin = Math.min(ISLAND.beachWidth, ISLAND.radius * PONDS.beachMarginFrac);
  if (r + radius > coast - beachMargin - keep) return false;
  if (r + radius > coast - SEA_TEX.overlapMeters) return false;

  for (const p of taken) {
    if (Math.hypot(x - p.x, z - p.z) < p.radius + radius + keep) return false;
  }
  return true;
}

/**
 * Turn `PONDS.sites` (island-normalised polar) into world ponds. Each site is
 * pushed outward along its bearing until it fits; a site that never fits is
 * dropped rather than forced, which is what keeps the 26 m sandbox honest —
 * its lagoon eats most of the island, so it simply gets fewer ponds.
 */
function resolvePonds(): Pond[] {
  const out: Pond[] = [];

  // Bearing offsets tried at each distance, nearest-to-authored first. A purely
  // radial search fails on the sandbox island: both the coast and the lagoon
  // rim wobble by ±10-23%, so whether a ring of legal ground exists at all
  // depends on the bearing. Sweeping a little to either side finds the gap
  // where the lagoon rim pulls in and the coast bulges out.
  const bearings: number[] = [0];
  for (let k = 1; k <= PONDS.bearingSteps; k++) {
    const dev = k * PONDS.bearingStep;
    bearings.push(dev, -dev);
  }

  for (const site of PONDS.sites) {
    const radius = Math.max(PONDS.minRadius, ISLAND.radius * site.rf);
    let placed = false;
    // Distance first, bearing second: keep the pond at the distance the layout
    // asked for, and spend the freedom on direction instead.
    for (let ar = site.ar; ar <= PONDS.pushMaxAr && !placed; ar += PONDS.pushStep) {
      const d = ISLAND.radius * ar;
      for (const dev of bearings) {
        const a = site.angle + dev;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        if (!siteFits(x, z, radius, out)) continue;
        out.push({ name: site.name, x, z, radius });
        placed = true;
        break;
      }
    }
  }
  return out;
}

/** Resolved once at module load — every consumer sees the same island. */
export const PONDS_RESOLVED: Pond[] = resolvePonds();

export function findPond(name: string): Pond | undefined {
  return PONDS_RESOLVED.find((p) => p.name === name);
}

/** Wobbled rim radius of `pond` at a world position. */
export function pondRadiusAt(pond: Pond, x: number, z: number): number {
  const a = Math.atan2(z - pond.z, x - pond.x);
  return pond.radius * pondRadiusFactor(a, pond.x * 0.13 + pond.z * 0.07);
}

/**
 * Where the basin profile actually crosses the water surface, as a fraction
 * of the rim radius. Solving for it beats guessing an inset: the visible pool
 * is a good deal smaller than the carved rim, and a disc sized to the rim ends
 * up hovering over dry bank.
 */
export const WATERLINE_RATIO: number = Math.sqrt(
  Math.min(1, Math.max(0, (PONDS.waterY - PONDS.floor) / (-PONDS.floor + PONDS.rimRise))),
);

/**
 * Blend the ground toward a shallow basin. Mirrors the lagoon carve in
 * `heightAt()`: full basin inside the rim, feathered out across
 * `PONDS.rimBlend` so the edge is a muddy shelf rather than a cliff, and
 * `Math.min` against the surrounding ground so a pond never *raises* terrain.
 *
 * Returns the adjusted height; callers pass the height they already computed.
 */
export function pondBasinAt(x: number, z: number, h: number): number {
  if (PONDS_RESOLVED.length === 0) return h;
  let out = h;
  for (const pond of PONDS_RESOLVED) {
    const d = Math.hypot(x - pond.x, z - pond.z);
    const pr = pondRadiusAt(pond, x, z);
    if (d > pr + PONDS.rimBlend) continue;
    // 1 at the centre, 0 at rim + blend.
    const t = Math.min(1, Math.max(0, (pr + PONDS.rimBlend - d) / (PONDS.rimBlend + 0.001)));
    const w = t * t * (3 - 2 * t);
    const rel = Math.min(1, d / Math.max(pr, 0.001));
    // Floor at the centre rising to a rim above the water line, so the pool
    // has a bank instead of ending flush with the surface.
    const basin = PONDS.floor + rel * rel * (-PONDS.floor + PONDS.rimRise);
    out = out * (1 - w) + Math.min(out, basin) * w;
  }
  return out;
}

/** How far inside a pond (0 = outside, 1 = centre). Used to keep scatter dry. */
export function pondMaskAt(x: number, z: number, pad = 0): number {
  let m = 0;
  for (const pond of PONDS_RESOLVED) {
    const d = Math.hypot(x - pond.x, z - pond.z);
    const pr = pondRadiusAt(pond, x, z) + pad;
    if (d >= pr) continue;
    m = Math.max(m, 1 - d / pr);
  }
  return m;
}

/** True inside any pond's carved rim (+ `pad` metres). Cheap scatter reject. */
export function inAnyPond(x: number, z: number, pad = 0): boolean {
  return pondMaskAt(x, z, pad) > 0;
}

export interface PondScenery {
  group: THREE.Group;
  update(t: number): void;
}

/**
 * Water discs + rim pebbles + a few lily pads. The disc is its own smooth
 * geometry, so the pool edge stays crisp even though the terrain plane only
 * has ~2 m vertex spacing on `real`; `discInset` keeps it inside the carve so
 * it can never float over dry grass.
 */
export function buildPondScenery(sampleHeight: (x: number, z: number) => number): PondScenery {
  const group = new THREE.Group();
  const rand = mulberry32(20260817);
  const updates: Array<(t: number) => void> = [];
  if (PONDS_RESOLVED.length === 0) return { group, update: () => {} };

  // Deliberately matte. The lagoon GLB gets away with roughness 0.55 because
  // its surface is modelled and its normals vary; a pond is one perfectly flat
  // disc, so a single specular lobe covers the whole pool and — with the low
  // dusk sun and UnrealBloom on top — turned the sandbox pond into a sheet of
  // white paper. Art-bible §2 calls the fresh water "durgun" anyway.
  const waterMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lagoon,
    roughness: 0.78,
    metalness: 0,
    transparent: true,
    opacity: 0.88,
    envMapIntensity: 0.1,
  });

  const rockTex = loadAlbedoTexture(assetUrl("assets/textures/rock_chalk_01_albedo_1024.webp"));
  rockTex.wrapS = THREE.RepeatWrapping;
  rockTex.wrapT = THREE.RepeatWrapping;
  const pebbleMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    color: PALETTE.rock,
    roughness: 0.93,
    flatShading: true,
  });
  const pebbleGeo = new THREE.IcosahedronGeometry(1, 0);

  const padTex = loadAlbedoTexture(assetUrl("assets/textures/flora_lilypad_01_albedo_512.webp"));
  const padMat = new THREE.MeshStandardMaterial({
    map: padTex,
    color: PALETTE.pad,
    transparent: true,
    alphaTest: 0.35,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const padGeo = new THREE.PlaneGeometry(547 / 643, 1);
  padGeo.rotateX(-Math.PI / 2);

  const discs: THREE.Mesh[] = [];
  const pebblePoses: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];
  const padPoses: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];

  for (const pond of PONDS_RESOLVED) {
    // Wobbled disc: one ring of vertices matching `pondRadiusAt` so the water
    // edge follows the same irregular rim the heightmap carved, sized to the
    // solved waterline rather than to the rim itself.
    const segments = 64;
    const discFactor = Math.min(1, WATERLINE_RATIO + PONDS.discOverlap);
    const shape = new THREE.Shape();
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const rr =
        pond.radius * pondRadiusFactor(a, pond.x * 0.13 + pond.z * 0.07) * discFactor;
      const px = Math.cos(a) * rr;
      // Negated: `rotateX(-PI/2)` maps shape-Y to world -Z, and the disc wobble
      // has to line up with the `pondRadiusAt` wobble the heightmap carved.
      const pz = -Math.sin(a) * rr;
      if (i === 0) shape.moveTo(px, pz);
      else shape.lineTo(px, pz);
    }
    const geo = new THREE.ShapeGeometry(shape, segments);
    geo.rotateX(-Math.PI / 2);
    const disc = new THREE.Mesh(geo, waterMat);
    disc.position.set(pond.x, PONDS.waterY, pond.z);
    disc.receiveShadow = true;
    group.add(disc);
    discs.push(disc);

    for (let i = 0; i < PONDS.pebblesPerPond; i++) {
      const a = rand() * Math.PI * 2;
      const rr = pondRadiusAt(pond, pond.x + Math.cos(a), pond.z + Math.sin(a));
      const d = rr * (0.94 + rand() * 0.24);
      const x = pond.x + Math.cos(a) * d;
      const z = pond.z + Math.sin(a) * d;
      const y = sampleHeight(x, z);
      pebblePoses.push({ x, y, z, s: 0.22 + rand() * 0.3, rot: rand() * 6.28 });
    }

    for (let i = 0; i < PONDS.padsPerPond; i++) {
      const a = rand() * Math.PI * 2;
      // Scaled by the waterline so a pad never beaches itself on the bank.
      const d = (0.2 + rand() * 0.6) * pond.radius * WATERLINE_RATIO;
      padPoses.push({
        x: pond.x + Math.cos(a) * d,
        y: PONDS.waterY + 0.03,
        z: pond.z + Math.sin(a) * d,
        // Proportional to the pond, not absolute: a fixed ~1 m pad covered
        // most of a 1.9 m sandbox pool and read as a white slab.
        s: pond.radius * PONDS.padScale * (0.75 + rand() * 0.6),
        rot: rand() * 6.28,
      });
    }
  }

  if (pebblePoses.length > 0) {
    const mesh = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebblePoses.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pebblePoses.length; i++) {
      const p = pebblePoses[i];
      dummy.position.set(p.x, p.y - p.s * 0.28, p.z);
      dummy.scale.set(p.s, p.s * (0.5 + rand() * 0.35), p.s * (0.85 + rand() * 0.4));
      dummy.rotation.set(rand() * 0.9, p.rot, rand() * 0.7);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  if (padPoses.length > 0) {
    const mesh = new THREE.InstancedMesh(padGeo, padMat, padPoses.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < padPoses.length; i++) {
      const p = padPoses[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.s, 1, p.s);
      dummy.rotation.set(0, p.rot, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  // Barely-there breathing, same cadence as the lagoon mesh in `sea.ts`.
  updates.push((t) => {
    for (let i = 0; i < discs.length; i++) {
      discs[i].position.y = PONDS.waterY + Math.sin(t * 0.45 + i * 1.7) * 0.015;
    }
  });

  return {
    group,
    update(t) {
      for (const fn of updates) fn(t);
    },
  };
}
