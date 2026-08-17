import * as THREE from "three";
import { BEAUTY, ISLAND, LAGOON, LANDMARK, LOTUS, PATHS, PLAYER, PONDS, SHIP } from "../constants";
import { mulberry32 } from "./rng";
import { PONDS_RESOLVED, findPond } from "./ponds";

/**
 * Faint desire lines across the island (LOT-53).
 *
 * Sahip asked for "belli belirsiz patikalar" — trails you half-notice, not a
 * drawn road. Three techniques were on the table:
 *
 *  1. A per-vertex path weight on the terrain plane. Cheapest, but `real` has
 *     ~1.96 m between vertices (`planeSize` 384 / `planeSegments` 196), so a
 *     2.3 m trail would render as a dotted blob. Rejected.
 *  2. A distance-to-segment loop in the ground fragment shader. Crisp, but
 *     ~40 segments x a full-screen fragment count is hundreds of millions of
 *     ops per frame. Rejected.
 *  3. Bake the mask once into a single-channel texture and sample it. One
 *     texture fetch per fragment at runtime, and the bake only touches texels
 *     inside each segment's bounding box (a few percent of the map), so it
 *     costs a couple of milliseconds at load. Chosen.
 *
 * The heightmap is not touched: a desire line is worn grass, not a cutting.
 */

export interface PathMask {
  texture: THREE.DataTexture;
  /** World extent the texture covers, centred on the origin. */
  extent: number;
  /** CPU-side lookup, so scatter can stay off the trails. */
  sample(x: number, z: number): number;
}

interface Vec2 {
  x: number;
  z: number;
}

/**
 * Named waypoints a route may reference. Anything profile-dependent resolves
 * to `null` and is skipped — `hillFoot` is flat on the sandbox
 * (`LANDMARK.hill.height` is 0 there) and a pond may have been dropped.
 */
function anchor(key: string): Vec2 | null {
  if (key.startsWith("pond:")) {
    const pond = findPond(key.slice(5));
    return pond ? { x: pond.x, z: pond.z } : null;
  }
  switch (key) {
    case "ship":
      return { x: SHIP.pos.x, z: SHIP.pos.z };
    case "spawn":
      return { x: PLAYER.spawn.x, z: PLAYER.spawn.z };
    case "reed":
    case "deep":
    case "cove": {
      const zone = LOTUS.zones.find((z) => z.name === key);
      return zone ? { x: zone.cx, z: zone.cz } : null;
    }
    case "shrine":
      // Mirrors the shrine ring `terrain.ts` places; `womanPos` is the nearest
      // authored landmark on both profiles, so use it as the inland waypoint.
      return { x: BEAUTY.womanPos.x, z: BEAUTY.womanPos.z };
    case "lagoonS":
      return { x: LAGOON.center.x, z: LAGOON.center.z - LAGOON.radius - 2.5 };
    case "lagoonN":
      return { x: LAGOON.center.x, z: LAGOON.center.z + LAGOON.radius + 2.5 };
    case "lagoonW":
      return { x: LAGOON.center.x - LAGOON.radius - 2.5, z: LAGOON.center.z };
    case "lagoonE":
      return { x: LAGOON.center.x + LAGOON.radius + 2.5, z: LAGOON.center.z };
    case "hillFoot": {
      const hill = LANDMARK.hill;
      if (hill.height <= 0) return null;
      // Stop at the foot, not the summit — the climb itself is unworn rock.
      const d = Math.hypot(hill.x, hill.z);
      const k = d > 0 ? (d - hill.radius * 0.75) / d : 0;
      return { x: hill.x * k, z: hill.z * k };
    }
    default:
      return null;
  }
}

interface Segment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

/**
 * Walk a route's anchors, subdividing every leg into `PATHS.sampleStep` pieces
 * with a lateral meander so the trail wanders like a footpath instead of
 * running like a survey line.
 */
function routeSegments(points: Vec2[], rand: () => number): Segment[] {
  const out: Segment[] = [];
  const phase = rand() * Math.PI * 2;
  let cursor: Vec2 | null = null;
  let travelled = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.5) continue;
    const nx = -dz / len;
    const nz = dx / len;
    const steps = Math.max(1, Math.round(len / PATHS.sampleStep));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      // Taper the meander to zero at both ends so legs join cleanly.
      const taper = Math.sin(t * Math.PI);
      const off =
        (Math.sin(phase + (travelled + t * len) * 0.055) * 0.7 +
          Math.sin(phase * 1.7 + (travelled + t * len) * 0.13) * 0.3) *
        PATHS.meander *
        taper;
      const p = { x: a.x + dx * t + nx * off, z: a.z + dz * t + nz * off };
      if (cursor) out.push({ ax: cursor.x, az: cursor.z, bx: p.x, bz: p.z });
      cursor = p;
    }
    travelled += len;
  }
  return out;
}

function buildSegments(): Segment[] {
  const rand = mulberry32(20260818);
  const out: Segment[] = [];
  for (const route of PATHS.routes) {
    const points: Vec2[] = [];
    for (const key of route.anchors) {
      const p = anchor(key);
      if (p) points.push(p);
    }
    if (points.length < 2) continue;
    out.push(...routeSegments(points, rand));
  }
  return out;
}

/** Distance from (px, pz) to segment `s`. */
function distToSegment(px: number, pz: number, s: Segment): number {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((px - s.ax) * dx + (pz - s.az) * dz) / len2 : 0;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(px - (s.ax + dx * t), pz - (s.az + dz * t));
}

/** Layered sine patchiness — the same family as `terrain.hills()`. */
function breakUpNoise(x: number, z: number): number {
  const f = PATHS.breakUpFreq;
  const n =
    Math.sin(x * f) * Math.cos(z * f * 1.31) * 0.6 +
    Math.sin((x - z) * f * 2.3 + 0.6) * 0.4;
  return 0.5 + n * 0.5;
}

/**
 * Bake the mask. Only texels inside each segment's bounding box are visited,
 * so the cost scales with total path area (a few percent of the island), not
 * with `texSize`.
 */
export function buildPathMask(): PathMask {
  const size = PATHS.texSize;
  const extent = ISLAND.planeSize;
  const metersPerTexel = extent / size;
  const data = new Uint8Array(size * size);
  const segments = buildSegments();
  const reach = PATHS.halfWidth + PATHS.feather;

  const toTexel = (world: number) => (world + extent * 0.5) / metersPerTexel;

  for (const s of segments) {
    const minX = Math.max(0, Math.floor(toTexel(Math.min(s.ax, s.bx) - reach)));
    const maxX = Math.min(size - 1, Math.ceil(toTexel(Math.max(s.ax, s.bx) + reach)));
    const minZ = Math.max(0, Math.floor(toTexel(Math.min(s.az, s.bz) - reach)));
    const maxZ = Math.min(size - 1, Math.ceil(toTexel(Math.max(s.az, s.bz) + reach)));

    for (let iz = minZ; iz <= maxZ; iz++) {
      const wz = (iz + 0.5) * metersPerTexel - extent * 0.5;
      for (let ix = minX; ix <= maxX; ix++) {
        const wx = (ix + 0.5) * metersPerTexel - extent * 0.5;
        const d = distToSegment(wx, wz, s);
        if (d > reach) continue;
        // 1 at the centre line, 0 at halfWidth + feather.
        const t = Math.min(1, Math.max(0, (reach - d) / PATHS.feather));
        let m = t * t * (3 - 2 * t);
        // Patchiness: a trail that never breaks reads as a paved road.
        m *= 1 - PATHS.breakUp * (1 - breakUpNoise(wx, wz));
        const v = Math.round(Math.min(1, m) * 255);
        const idx = iz * size + ix;
        if (v > data[idx]) data[idx] = v;
      }
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return {
    texture,
    extent,
    sample(x, z) {
      const ix = Math.floor(toTexel(x));
      const iz = Math.floor(toTexel(z));
      if (ix < 0 || iz < 0 || ix >= size || iz >= size) return 0;
      return data[iz * size + ix] / 255;
    },
  };
}

/** Dev helper: how much of the authored layout survived on this profile. */
export function describeDressing(): string {
  const live = PATHS.routes.filter(
    (r) => r.anchors.map(anchor).filter(Boolean).length >= 2,
  );
  return [
    `ponds ${PONDS_RESOLVED.length}/${PONDS.sites.length}`,
    `routes ${live.length}/${PATHS.routes.length} (${live.map((r) => r.name).join(", ")})`,
  ].join(" | ");
}
