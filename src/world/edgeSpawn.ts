import { ISLAND, LANDMARK, LAGOON, PLAYER, SHIP } from "../constants";
import { heightAt, islandRadiusAt, lagoonDist } from "./terrain";

export interface EdgeSpawn {
  x: number;
  z: number;
  /** Camera yaw so the opening look is inland, away from the hull. */
  yaw: number;
}

function inNorthSpikes(x: number, z: number): boolean {
  if (LANDMARK.northSpikes.height <= 0) return false;
  const r = Math.hypot(x, z);
  const north = Math.max(0, z / Math.max(r, 1));
  return north >= 0.35 && r >= LANDMARK.northSpikes.startR;
}

function slopeAt(x: number, z: number): number {
  const h = heightAt(x, z);
  const d = 1.6;
  return Math.max(
    Math.abs(heightAt(x + d, z) - h),
    Math.abs(heightAt(x - d, z) - h),
    Math.abs(heightAt(x, z + d) - h),
    Math.abs(heightAt(x, z - d) - h),
  );
}

export function validEdgeSpawn(x: number, z: number): boolean {
  const h = heightAt(x, z);
  if (h < PLAYER.edgeMinHeight) return false;
  if (slopeAt(x, z) > PLAYER.edgeMaxSlope) return false;
  if (inNorthSpikes(x, z)) return false;
  if (lagoonDist(x, z) < LAGOON.radius + 4) return false;
  const r = Math.hypot(x, z);
  if (r > islandRadiusAt(x, z) - PLAYER.edgeCoastMargin) return false;
  if (Math.hypot(x - SHIP.pos.x, z - SHIP.pos.z) < PLAYER.edgeMinShipDist) return false;
  return true;
}

function yawAwayFromShip(x: number, z: number, jitter: number): number {
  const dx = x - SHIP.pos.x;
  const dz = z - SHIP.pos.z;
  const len = Math.hypot(dx, dz) || 1;
  // Camera forward is (-sin(yaw), -cos(yaw)). Face inland (spawn − ship).
  const lookX = dx / len;
  const lookZ = dz / len;
  return Math.atan2(-lookX, -lookZ) + jitter;
}

/**
 * Rejection-sample an inland K35 opening. Seeded so asset-qa / test hooks
 * with `seedOverride` land the same berth-hide each time.
 */
export function pickEdgeSpawn(rand: () => number): EdgeSpawn {
  const margin = PLAYER.edgeCoastMargin;
  const rMax = Math.max(8, ISLAND.radius - margin);
  // Angle 0 = +Z. Berth is south of origin on the real island, so "away"
  // clusters inland toward +Z / the opposite bearing.
  const toShip = Math.hypot(SHIP.pos.x, SHIP.pos.z) || 1;
  const awayA = Math.atan2(-SHIP.pos.x / toShip, -SHIP.pos.z / toShip);

  const tryOne = (): EdgeSpawn | null => {
    const a = awayA + (rand() - 0.5) * Math.PI;
    const r = (0.28 + rand() * 0.62) * rMax;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (!validEdgeSpawn(x, z)) return null;
    const jitter = (rand() - 0.5) * PLAYER.edgeYawJitter;
    return { x, z, yaw: yawAwayFromShip(x, z, jitter) };
  };

  for (let i = 0; i < 90; i++) {
    const hit = tryOne();
    if (hit) return hit;
  }

  // Grid fallback: keep the farthest dry cell from the hull.
  let best: EdgeSpawn | null = null;
  let bestD = -1;
  const step = Math.max(4, ISLAND.radius / 10);
  for (let x = -rMax; x <= rMax; x += step) {
    for (let z = -rMax; z <= rMax; z += step) {
      if (!validEdgeSpawn(x, z)) continue;
      const d = Math.hypot(x - SHIP.pos.x, z - SHIP.pos.z);
      if (d > bestD) {
        bestD = d;
        best = { x, z, yaw: yawAwayFromShip(x, z, 0) };
      }
    }
  }
  return best ?? {
    x: PLAYER.beachSpawn.x,
    z: PLAYER.beachSpawn.z,
    yaw: 0,
  };
}
