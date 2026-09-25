/**
 * Cyclops Cave — pure rules (no THREE, no DOM), so they can be unit-tested
 * in node. `cyclopsStop.ts` owns the scene and the loop; this file owns the
 * arithmetic the design docs lock:
 *
 * - `detectRate`   — gdd-cyclops-blinding.md §4.0 (2×2 matrix + multipliers)
 * - `hideSpotAt`   — §4.2: a hide spot IS a shadow pocket, whatever lights it
 * - `crushShock`   — §7.1 / bitiş sözleşmesi: the shock grows with each crush,
 *                    3rd the heaviest, and is the ONLY channel that tells the
 *                    player how many chances are left (P2 — no number, no bar)
 * - `departureLedger` — §7.1 "Atlattığın kapanma: M" line on the win card
 *
 * Numbers live in `docs/design/tuning.md` §12; names match it.
 */

export const DETECT_MAX = 100.0;
export const DETECT_RATE_SHADOW_STILL = 0.0;
export const DETECT_RATE_SHADOW_MOVING = 3.0;
export const DETECT_RATE_LIT_STILL = 4.0;
export const DETECT_RATE_LIT_MOVING = 12.0;
export const DETECT_DECAY = 8.0;
export const CYCLOPS_RETURN_MULTIPLIER = 1.5;
export const CYCLOPS_PRESENT_MULTIPLIER = 3.0;
export const CYCLOPS_PROXIMITY_MULTIPLIER = 2.0;
/** 🟡 Deneysel — tuning.md §12: playtest'e kadar kesin değil. */
export const CYCLOPS_CRUSH_CAP = 3;
/** Sürünürken DETECT birikim çarpanı (sahip, 26 Ağu — "yerde sürünme"). 🟡 */
export const CRAWL_DETECT_MULT = 0.4;

export type CyclopsPhase = "out" | "return" | "present";

export interface DetectInputs {
  phase: CyclopsPhase;
  /** `roomIdAt()` result — only "pens"/"inner" matter here. */
  room: string;
  lit: boolean;
  moving: boolean;
  crawling: boolean;
  /** Giant awake and within CYCLOPS_GIANT_PROXIMITY_RADIUS. */
  giantNearAndAwake: boolean;
}

/** Points/second DETECT grows by (0 → it decays instead). §4.0. */
export function detectRate(i: DetectInputs): number {
  let rate = i.lit
    ? i.moving
      ? DETECT_RATE_LIT_MOVING
      : DETECT_RATE_LIT_STILL
    : i.moving
      ? DETECT_RATE_SHADOW_MOVING
      : DETECT_RATE_SHADOW_STILL;
  if (i.phase === "return") rate *= CYCLOPS_RETURN_MULTIPLIER;
  if (i.phase === "present" && (i.room === "pens" || i.room === "inner")) rate *= CYCLOPS_PRESENT_MULTIPLIER;
  if (i.giantNearAndAwake) rate *= CYCLOPS_PROXIMITY_MULTIPLIER;
  if (i.crawling) rate *= CRAWL_DETECT_MULT;
  return rate;
}

/** One integration step, clamped to [0, DETECT_MAX]. Decay only when rate is 0 (cell-based, §5). */
export function stepDetect(detect: number, rate: number, dt: number): number {
  if (rate > 0) return Math.min(DETECT_MAX, detect + rate * dt);
  return Math.max(0, detect - DETECT_DECAY * dt);
}

export interface HideSpotLike {
  x: number;
  z: number;
  radius: number;
}

/** The hide spot the point stands in, or null. */
export function hideSpotAt<T extends HideSpotLike>(x: number, z: number, spots: readonly T[]): T | null {
  for (const s of spots) {
    if (Math.hypot(x - s.x, z - s.z) <= s.radius) return s;
  }
  return null;
}

/**
 * "Hidden" = inside a hide spot AND not moving (§4.4 — safety is instant,
 * no warm-up timer). Hidden forces `lit=false` (§4.2: the spot is a shadow
 * pocket even next to the hearth) and makes the player invisible to the
 * giant's feet — a still body in a niche is stepped around, not on
 * (sahip, 26 Ağu: "orada ezilmemeleri epey zor olsun ama bir kaç tane
 * saklanma girintisi olsun"). The rage slam still lands anywhere in the
 * room — that was sahip's explicit call (no permanently safe corner).
 */
export function isHidden(inSpot: boolean, moving: boolean): boolean {
  return inSpot && !moving;
}

export interface CrushShock {
  /** CameraRig.kick amount. */
  shake: number;
  /** Peak opacity of the red edge flash, 0..1. */
  flashPeak: number;
  /** Seconds the flash takes to fade back to 0 (≥1.5 s — plan §6 step 7). */
  fadeSeconds: number;
  /** Roar loudness multiplier. */
  roar: number;
}

/**
 * Escalating shock per crush (1-based count). Rise ~200 ms, fade ≥1.5 s
 * (production plan §6 step 7). Crush 3 = heaviest; it is also the loss.
 */
export function crushShock(crushCount: number): CrushShock {
  const n = Math.max(1, Math.min(CYCLOPS_CRUSH_CAP, Math.floor(crushCount)));
  const t = (n - 1) / (CYCLOPS_CRUSH_CAP - 1); // 0, 0.5, 1
  return {
    shake: 0.35 + 0.5 * t,
    flashPeak: 0.45 + 0.5 * t,
    fadeSeconds: 1.5 + 1.5 * t,
    roar: 0.6 + 0.4 * t,
  };
}

/** Edge-flash opacity `age` seconds after a shock (fast attack, linear fade). */
export function shockFlashAt(shock: CrushShock, age: number): number {
  const RISE = 0.2;
  if (age < 0) return 0;
  if (age < RISE) return shock.flashPeak * (age / RISE);
  const f = 1 - (age - RISE) / shock.fadeSeconds;
  return f > 0 ? shock.flashPeak * f : 0;
}

/** Amber edge glow, gdd-detection-cyclops.md §3.3: `etki = clamp01(DETECT/DETECT_MAX)`. */
export function detectGlow(detect: number): number {
  return Math.max(0, Math.min(1, detect / DETECT_MAX));
}

export interface DepartureStats {
  delivered: number;
  target: number;
  closingsSurvived: number;
  seconds: number;
}

/** Win-card ledger lines (Turkish, player-facing). */
export function departureLedger(s: DepartureStats): string[] {
  const m = Math.floor(s.seconds / 60);
  const sec = Math.floor(s.seconds % 60);
  return [
    `Gemiye taşınan azık: ${s.delivered} / ${s.target}`,
    `Atlattığın kapanma: ${s.closingsSurvived}`,
    `Süre: ${m}:${String(sec).padStart(2, "0")}`,
  ];
}

/** One closing line on the win card — mastery is "never caught" (§7.1). */
export function departureVerdict(crushCount: number): string {
  if (crushCount <= 0) return "Dev seni bir kez bile yakalayamadı.";
  if (crushCount === 1) return "Bir kez yere serildin, yine de kalktın.";
  return "İki kez ezildin. Üçüncüsü gelmeden kaçtın.";
}
