/**
 * Sirens Passage — pure rules (docs/design/gdd-sirens-passage.md).
 * No THREE, no DOM: `sirensStop.ts` feeds the world in and reacts to events.
 *
 * prep (deck: wax → knead → plug 3 rowers) → bind (mast) → passage (steer the
 * strait against the song) → clear.
 */

export const SIRENS_KNEAD_SECONDS = 2.0;
export const SIRENS_INTERACT_RADIUS = 1.4;
export const SIRENS_SAIL_SPEED = 9;
export const SIRENS_STRAIT_LENGTH = 620;
export const SIRENS_STEER_SPEED = 7.0;
export const SIRENS_SONG_PULL = 5.5;
export const SIRENS_SONG_RADIUS = 190;
export const SIRENS_HULL_RADIUS = 3.2;
/** Collision circles along the keel (bow, midships, stern) — a galley is long, not round. */
export const SIRENS_HULL_OFFSETS = [-7, 0, 7] as const;
export const SIRENS_HULL_CAP = 3;
export const SIRENS_HIT_GRACE = 1.5;
export const SIRENS_CHANNEL_HALF_WIDTH = 26;
export const SIRENS_ROWERS = 3;
/** Lateral velocity smoothing (s) — a galley answers the rudder slowly. */
export const SIRENS_STEER_SMOOTH = 0.45;
/** Where the Sirens' meadow sits: east of the channel, mid-strait. */
export const SIRENS_ISLE = { x: SIRENS_CHANNEL_HALF_WIDTH + 44, z: SIRENS_STRAIT_LENGTH * 0.5 } as const;

export interface Vec2 {
  x: number;
  z: number;
}
export interface Rock extends Vec2 {
  r: number;
}

export type SirensStage = "prep" | "bind" | "passage" | "clear";

export interface SirensState {
  readonly stage: SirensStage;
  readonly hasWax: boolean;
  /** Kneading progress 0..1; 1 = soft wax ready to plug ears. */
  readonly knead: number;
  readonly plugged: readonly boolean[];
  /** Ship position in the strait (x lateral, z along). */
  readonly ship: Vec2;
  readonly vx: number;
  readonly hull: number;
  readonly hitGraceT: number;
}

export function initialSirens(): SirensState {
  return {
    stage: "prep",
    hasWax: false,
    knead: 0,
    plugged: Array.from({ length: SIRENS_ROWERS }, () => false),
    ship: { x: 0, z: 0 },
    vx: 0,
    hull: 0,
    hitGraceT: 0,
  };
}

export type SirensEvent =
  | "waxTaken"
  | "waxKneaded"
  | "plugged"
  | "bound"
  | "hit"
  | "sunk"
  | "cleared";

export interface SirensStep {
  state: SirensState;
  events: SirensEvent[];
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export interface DeckWorld {
  dt: number;
  /** Player position in ship-local deck coordinates. */
  player: Vec2;
  interact: boolean;
  interactHeld: boolean;
  honeycomb: Vec2;
  /** Where kneading happens (the sunlit stern). */
  kneadSpot: Vec2;
  rowers: readonly Vec2[];
  mast: Vec2;
}

export function pluggedCount(s: SirensState): number {
  return s.plugged.filter(Boolean).length;
}

/** Deck stages (prep, bind). No danger here — gdd §2. */
export function stepDeck(s: SirensState, w: DeckWorld): SirensStep {
  if (s.stage !== "prep" && s.stage !== "bind") return { state: s, events: [] };
  if (s.stage === "bind") {
    if (w.interact && dist(w.player, w.mast) <= SIRENS_INTERACT_RADIUS) {
      return { state: { ...s, stage: "passage" }, events: ["bound"] };
    }
    return { state: s, events: [] };
  }
  if (!s.hasWax) {
    return w.interact && dist(w.player, w.honeycomb) <= SIRENS_INTERACT_RADIUS
      ? { state: { ...s, hasWax: true }, events: ["waxTaken"] }
      : { state: s, events: [] };
  }
  if (s.knead < 1) {
    if (!(w.interactHeld && dist(w.player, w.kneadSpot) <= SIRENS_INTERACT_RADIUS)) return { state: s, events: [] };
    const knead = Math.min(1, s.knead + w.dt / SIRENS_KNEAD_SECONDS);
    return { state: { ...s, knead }, events: knead >= 1 ? ["waxKneaded"] : [] };
  }
  if (!w.interact) return { state: s, events: [] };
  const i = w.rowers.findIndex((r, idx) => !s.plugged[idx] && dist(w.player, r) <= SIRENS_INTERACT_RADIUS);
  if (i < 0) return { state: s, events: [] };
  const plugged = s.plugged.map((p, idx) => p || idx === i);
  const done = plugged.every(Boolean);
  return { state: { ...s, plugged, stage: done ? "bind" : "prep" }, events: ["plugged"] };
}

/** 0..1 — how loudly the ship hears the song. */
export function songIntensity(ship: Vec2, isle: Vec2 = SIRENS_ISLE): number {
  return Math.max(0, Math.min(1, 1 - dist(ship, isle) / SIRENS_SONG_RADIUS));
}

export interface PassageWorld {
  dt: number;
  /** Rudder input −1 (port / −x) … +1 (starboard / +x). */
  steer: number;
  rocks: readonly Rock[];
  isle?: Vec2;
}

export function stepPassage(s: SirensState, w: PassageWorld): SirensStep {
  if (s.stage !== "passage") return { state: s, events: [] };
  const isle = w.isle ?? SIRENS_ISLE;
  const song = songIntensity(s.ship, isle);
  const pull = Math.sign(isle.x - s.ship.x) * SIRENS_SONG_PULL * song;
  const steer = Math.max(-1, Math.min(1, w.steer));
  const want = steer * SIRENS_STEER_SPEED + pull;
  const k = 1 - Math.exp(-w.dt / SIRENS_STEER_SMOOTH);
  let vx = s.vx + (want - s.vx) * k;
  let x = s.ship.x + vx * w.dt;
  const z = s.ship.z + SIRENS_SAIL_SPEED * w.dt;
  let hull = s.hull;
  let hitGraceT = Math.max(0, s.hitGraceT - w.dt);
  const events: SirensEvent[] = [];

  for (const r of w.rocks) for (const off of SIRENS_HULL_OFFSETS) {
    const dx = x - r.x;
    const dz = z + off - r.z;
    const d = Math.hypot(dx, dz);
    const min = r.r + SIRENS_HULL_RADIUS;
    if (d >= min) continue;
    // Shove the hull out sideways (the galley keeps its heading).
    const side = dx === 0 ? -Math.sign(r.x || 1) : Math.sign(dx);
    x = r.x + side * Math.sqrt(Math.max(0, min * min - dz * dz)) + side * 0.05;
    vx = side * SIRENS_STEER_SPEED * 0.6;
    if (hitGraceT <= 0) {
      hull += 1;
      hitGraceT = SIRENS_HIT_GRACE;
      events.push("hit");
    }
  }
  if (hull >= SIRENS_HULL_CAP) events.push("sunk");
  const cleared = z >= SIRENS_STRAIT_LENGTH && hull < SIRENS_HULL_CAP;
  if (cleared) events.push("cleared");
  return {
    state: { ...s, ship: { x, z }, vx, hull, hitGraceT, stage: cleared ? "clear" : s.stage },
    events,
  };
}

/** Small deterministic PRNG (mulberry32) so the strait is the same every attempt. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WALL_STEP = 11;
const MID_START = 90;
const MID_STEP = 42;
/** A mid-channel rock never closes more than this much of the channel — a free lane always exists. */
const MID_MAX_REACH = 0.55;

/** Rock walls both sides + staggered mid-channel rocks, reproducible by seed. */
export function generateStrait(seed = 20260925): Rock[] {
  const rand = rng(seed);
  const rocks: Rock[] = [];
  for (let z = -20; z <= SIRENS_STRAIT_LENGTH + 40; z += WALL_STEP) {
    for (const side of [-1, 1]) {
      const r = 4 + rand() * 4;
      rocks.push({ x: side * (SIRENS_CHANNEL_HALF_WIDTH + r * 0.6 + rand() * 3), z: z + rand() * 5, r });
    }
  }
  let side = 1;
  for (let z = MID_START; z < SIRENS_STRAIT_LENGTH - 40; z += MID_STEP + rand() * 14) {
    const r = 3.5 + rand() * 3;
    // Anchored on one wall, reaching into the channel at most MID_MAX_REACH of its width.
    const inner = side * (SIRENS_CHANNEL_HALF_WIDTH - 2 * SIRENS_CHANNEL_HALF_WIDTH * MID_MAX_REACH * (0.6 + rand() * 0.4));
    rocks.push({ x: inner + side * r, z, r });
    side = -side;
  }
  return rocks;
}

/** Narrowest free gap (m) across the channel at z, given the rocks — for tests/tuning. */
export function freeGapAt(z: number, rocks: readonly Rock[]): number {
  const blocked: [number, number][] = [];
  for (const r of rocks) {
    const dz = Math.abs(r.z - z);
    if (dz >= r.r) continue;
    const half = Math.sqrt(r.r * r.r - dz * dz);
    blocked.push([r.x - half, r.x + half]);
  }
  const lo = -SIRENS_CHANNEL_HALF_WIDTH - 20;
  const hi = SIRENS_CHANNEL_HALF_WIDTH + 20;
  blocked.sort((a, b) => a[0] - b[0]);
  let best = 0;
  let cursor = lo;
  for (const [a, b] of blocked) {
    if (a > cursor) best = Math.max(best, a - cursor);
    cursor = Math.max(cursor, b);
  }
  return Math.max(best, hi - cursor);
}

export function sirensObjective(s: SirensState): string | null {
  switch (s.stage) {
    case "prep":
      if (!s.hasWax) return "Bal peteğinden balmumunu al";
      if (s.knead < 1) return "Mumu kıçtaki güneşte yoğur — E basılı tut";
      return `Kürekçilerin kulaklarını tıka (${pluggedCount(s)}/${SIRENS_ROWERS})`;
    case "bind":
      return "Direğe git — E: \"Beni bağlayın\"";
    case "passage":
      return "A/D dümen — şarkıya kapılma, kayalara çarpma";
    case "clear":
      return null;
  }
}
