import { BEAUTY, ISLAND, LAGOON, LANDMARK, LOTOPHAGOS, LOTUS, PLAYER, SHIP } from "../constants";
import { heightAt, lagoonDist } from "./terrain";

export interface SpawnCtx {
  playerX: number;
  playerZ: number;
  shipX: number;
  shipZ: number;
}

function inNorthSpikes(x: number, z: number): boolean {
  if (LANDMARK.northSpikes.height <= 0) return false;
  const r = Math.hypot(x, z);
  const north = Math.max(0, z / Math.max(r, 1));
  return north >= 0.35 && r >= LANDMARK.northSpikes.startR;
}

function nearHome(x: number, z: number): boolean {
  const homes = [
    ...LOTOPHAGOS.spots,
    BEAUTY.womanPos,
    ...BEAUTY.cairnSpots,
  ];
  return homes.some((h) => Math.hypot(h.x - x, h.z - z) < BEAUTY.range);
}

export function validLotusCell(
  x: number,
  z: number,
  others: Array<{ x: number; z: number }>,
  ctx: SpawnCtx,
  slack = 1,
): boolean {
  const h = heightAt(x, z);
  if (h < 0 && h < PLAYER.wadeFloor) return false;
  if (h < PLAYER.wadeFloor) return false;
  const shipR = SHIP.range * 2 * slack;
  if (Math.hypot(x - ctx.shipX, z - ctx.shipZ) < shipR) return false;
  const space = LOTUS.minSpacing * slack;
  if (others.some((o) => Math.hypot(o.x - x, o.z - z) < space)) return false;
  if (inNorthSpikes(x, z)) return false;
  if (nearHome(x, z)) return false;
  if (lagoonDist(x, z) < 2.2) return false;
  if (Math.hypot(x - ctx.playerX, z - ctx.playerZ) < PLAYER.radius * 4) return false;
  const r = Math.hypot(x, z);
  if (r > ISLAND.radius - 6) return false;
  return true;
}

export function sampleLotusCell(
  rand: () => number,
  others: Array<{ x: number; z: number }>,
  ctx: SpawnCtx,
): { x: number; z: number } {
  const tryBand = (slack: number, n: number): { x: number; z: number } | null => {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * (ISLAND.radius - 10);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (validLotusCell(x, z, others, ctx, slack)) return { x, z };
    }
    return null;
  };
  return tryBand(1, 80) ?? tryBand(1.2, 80) ?? {
    x: (rand() - 0.5) * ISLAND.radius * 0.6,
    z: (rand() - 0.5) * ISLAND.radius * 0.6,
  };
}

export function plantGroundY(x: number, z: number): number {
  return Math.max(heightAt(x, z), LAGOON.waterY);
}
