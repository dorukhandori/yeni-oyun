import { SEA_TEX } from "../constants";
import { islandRadiusAt } from "./terrain";

/**
 * Shared Gerstner spectrum for the ocean mesh (GPU) and the hero hull (CPU).
 * Same numbers as Sean-Bradley / GPU Gems 1 ch.1 — not FFT, not tiled GLBs.
 * Keep this file and `sea.ts` GLSL in lockstep.
 */

export type WaveUniform = [number, number, number, number];

export interface OceanSample {
  y: number;
  nx: number;
  ny: number;
  nz: number;
}

const G = 9.8;
const TWO_PI = Math.PI * 2;

export function waveUniform(wave: (typeof SEA_TEX.waves)[number]): WaveUniform {
  const rad = (wave.dirDeg * Math.PI) / 180;
  return [Math.sin(rad), Math.cos(rad), wave.steepness, wave.wavelength];
}

export const WAVE_UNIFORMS: WaveUniform[] = SEA_TEX.waves.map(waveUniform);

function shoreAmp(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const coast = islandRadiusAt(x, z);
  const t = Math.min(1, Math.max(0, (r - (coast - 1)) / SEA_TEX.shoreCalm));
  const smooth = t * t * (3 - 2 * t);
  return SEA_TEX.shoreMin + (1 - SEA_TEX.shoreMin) * smooth;
}

/**
 * Height + normal at a world XZ. Shore-damped so the beached hull laps
 * instead of riding a 2 m swell. No hull-chop here (that's visual-only).
 */
export function sampleOcean(x: number, z: number, time: number): OceanSample {
  const ampMul = shoreAmp(x, z);
  let y = 0;
  let tx = 1;
  let ty = 0;
  let tz = 0;
  let bx = 0;
  let by = 0;
  let bz = 1;

  for (const w of SEA_TEX.waves) {
    const k = TWO_PI / w.wavelength;
    const c = Math.sqrt(G / k);
    const rad = (w.dirDeg * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dz = Math.cos(rad);
    const steep = w.steepness * ampMul;
    const f = k * (dx * x + dz * z - c * time);
    const a = steep / k;
    const cosf = Math.cos(f);
    const sinf = Math.sin(f);
    y += a * sinf;
    tx += -dx * dx * steep * sinf;
    ty += dx * steep * cosf;
    tz += -dx * dz * steep * sinf;
    bx += -dx * dz * steep * sinf;
    by += dz * steep * cosf;
    bz += -dz * dz * steep * sinf;
  }

  const nx = ty * bz - tz * by;
  const ny = tz * bx - tx * bz;
  const nz = tx * by - ty * bx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { y, nx: nx / len, ny: ny / len, nz: nz / len };
}

/** Pitch / roll from four samples around a hull, plus centre height. */
export function sampleOceanHull(
  x: number,
  z: number,
  yaw: number,
  time: number,
  halfL: number,
  halfW: number,
): { y: number; pitch: number; roll: number } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const mid = sampleOcean(x, z, time);
  const bow = sampleOcean(x + c * halfL, z + s * halfL, time);
  const stern = sampleOcean(x - c * halfL, z - s * halfL, time);
  const stbd = sampleOcean(x - s * halfW, z + c * halfW, time);
  const port = sampleOcean(x + s * halfW, z - c * halfW, time);
  const y = (mid.y + bow.y + stern.y) * 0.333;
  const spanL = Math.max(0.5, halfL * 2);
  const spanW = Math.max(0.5, halfW * 2);
  return {
    y,
    pitch: Math.atan2(bow.y - stern.y, spanL),
    roll: Math.atan2(stbd.y - port.y, spanW),
  };
}
