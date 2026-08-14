/**
 * Single tuning surface for the whole game. Anything a designer might want to
 * change lives here — never inline a gameplay number anywhere else.
 * Mirrors docs/design/tuning.md once that document lands.
 */

export const STEP = 1000 / 60;

// -------------------------------------------------------------- world profile
/**
 * Two parallel presets, per sahip decision 2026-08-14 (resolves roadmap §4.1
 * K1/K2/K3 as one decision):
 *  - "test": the original hand-tuned prototype island — small, fast, on-screen
 *    forgetting bar, soft respawn-at-ship on full forgetting. Values below are
 *    the pre-existing constants, unchanged.
 *  - "real": docs/design/tuning.md's documented island — full size, no
 *    forgetting bar, hard "you forgot" loss on full forgetting.
 * This is NOT the multi-island/"challenger" system sahip described for later
 * (out of scope here, belongs to a future game-designer pass) — just one real
 * island plus one test island, switched by a single dev flag.
 */
export type WorldProfileKey = "test" | "real";

/**
 * Default profile as of the Title/Hub screens shipping (2026-08-14): "real"
 * is now the actual entry experience (Title -> Hub -> Lotus Adası uses the
 * tuned scale, no on-screen memory bar, hard loss). "test" remains the small
 * fast dev sandbox — reach it with `?profile=test` without touching code.
 */
const DEFAULT_PROFILE: WorldProfileKey = "real";

/**
 * Resolved once at module load (constants.ts is the first module every other
 * module transitively imports, so this runs before anything else captures a
 * profile-dependent value — reading the query param later, e.g. in main.ts,
 * would be too late because ES module evaluation order already froze the
 * exports below by then).
 */
function resolveProfileFromUrl(): WorldProfileKey {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  const q = new URLSearchParams(window.location.search).get("profile");
  return q === "real" || q === "test" ? q : DEFAULT_PROFILE;
}

export const ACTIVE_PROFILE: WorldProfileKey = resolveProfileFromUrl();

interface WorldProfileValues {
  island: { radius: number };
  player: { speed: number };
  lotus: { count: number; carryCap: number };
  ship: { pos: { x: number; z: number }; range: number };
  /** Per-second rates in the engine's internal 0-1 memory scale. */
  memory: {
    islandGain: number;
    perCarriedGain: number;
    lagoonGain: number;
    pickSpike: number;
    shipRecover: number;
    seaRecover: number;
  };
  hud: {
    /** Whether the on-screen forgetting bar (#memory) is shown at all. */
    showMemoryBar: boolean;
  };
  loss: {
    /** "respawn" = soft loss, teleport to ship (test). "gameOver" = hard, run-ending loss (real). */
    onFull: "respawn" | "gameOver";
  };
}

const PROFILES: Record<WorldProfileKey, WorldProfileValues> = {
  test: {
    island: { radius: 26 },
    player: { speed: 6.2 },
    lotus: { count: 34, carryCap: 6 },
    ship: { pos: { x: 11.5, z: 19.5 }, range: 7.4 },
    memory: {
      islandGain: 0.007,
      perCarriedGain: 0.005,
      lagoonGain: 0.009,
      pickSpike: 0.04,
      shipRecover: 0.22,
      seaRecover: 0.12,
    },
    hud: { showMemoryBar: true },
    loss: { onFull: "respawn" },
  },
  real: {
    island: { radius: 70 },
    player: { speed: 4.5 },
    lotus: { count: 28, carryCap: 4 },
    ship: { pos: { x: 0, z: -60 }, range: 4.0 },
    // tuning.md §5.1/5.2 documents these as puan/s on a 0-100 scale
    // (MEM_PASSIVE, MEM_PER_CARRIED, MEM_SCENT, MEM_ON_HARVEST is a one-shot
    // spike not a rate but is scaled the same way, MEM_SHIP_AURA,
    // MEM_SEA_RECOVER). The engine keeps memory as an internal 0-1 float
    // (Faz 1.6 hasn't decided whether to convert the engine to 0-100 yet), so
    // every value here is the tuning.md number divided by 100 — e.g. passive
    // gain 0.25 puan/s -> 0.0025 /s. See tuning.md's engine-note near §5 for
    // the same explanation kept in sync with the design doc.
    memory: {
      islandGain: 0.25 / 100,
      perCarriedGain: 0.15 / 100,
      lagoonGain: 0.35 / 100,
      pickSpike: 4.0 / 100,
      shipRecover: 2.0 / 100,
      seaRecover: 6.0 / 100,
    },
    hud: { showMemoryBar: false },
    loss: { onFull: "gameOver" },
  },
};

const profile = PROFILES[ACTIVE_PROFILE];

/** Profile-driven behaviour flags consumed outside the raw tuning numbers. */
export const WORLD = {
  profile: ACTIVE_PROFILE,
  showMemoryBar: profile.hud.showMemoryBar,
  lossMode: profile.loss.onFull,
} as const;

// ---------------------------------------------------------------- island shape
export const ISLAND = {
  /** Radius where the land meets the sea. */
  radius: profile.island.radius,
  /** Sea level sits at y = 0; the shore ramps down to this. */
  shoreDrop: -0.55,
  /** Peak height of the inland dome. */
  domeHeight: 2.1,
  /** How far inland the dome reaches its full height. */
  domeFalloff: 13,
  hillAmp: 1.6,
  hillFreq: 0.14,
  /** Width of the golden sand ring at the shoreline. */
  beachWidth: 8,
  /** Angular wobble so the coast is a set of bays, not a circle. */
  wobbleA: 0.07,
  wobbleB: 0.035,
  /** Terrain mesh extent and resolution. */
  planeSize: 96,
  planeSegments: 132,
} as const;

export const LAGOON = {
  center: { x: 0, z: 1.5 },
  radius: 12,
  /** Basin floor depth relative to sea level. */
  floor: -0.75,
  /** Still water surface height. */
  waterY: -0.06,
  /** Angular wobble so the shoreline is not a perfect circle. */
  wobbleA: 0.15,
  wobbleB: 0.08,
} as const;

/** Lotus on water — spring bob and pad tilt (pseudo-physics). */
export const LOTUS_PHYSICS = {
  bobStiffness: 28,
  bobDamping: 5.5,
  bobWaveAmp: 0.045,
  rollStiffness: 16,
  rollDamping: 4.2,
  rollWaveAmp: 0.11,
  /** Ripe bloom extra sway from wind. */
  swayAmp: 0.06,
} as const;

export const SHIP = {
  /** Beached on the near shore, to the side of the spawn. */
  pos: profile.ship.pos,
  /** Broadside to the shore so the sail and oars read from the beach. */
  rotY: -1.3,
  scale: 0.92,
  /** Delivery trigger radius. */
  range: profile.ship.range,
} as const;

// -------------------------------------------------------------------- player
export const PLAYER = {
  speed: profile.player.speed,
  /** Wading through the lagoon is slower. */
  waterSpeedMul: 0.62,
  /** Spring stiffness toward wish velocity (higher = snappier). */
  accel: 18,
  /** Velocity damping when no wish input (spring settle). */
  drag: 9,
  /** Satchel swing from horizontal acceleration (ASSET-001). */
  satchelStiffness: 24,
  satchelDamping: 7,
  radius: 0.45,
  turnLerp: 0.22,
  spawn: { x: 5.5, z: 22.5 },
  /** Deepest the sailor sinks while wading. */
  wadeFloor: -0.42,
  /** How far past the shoreline he may wade before being held back. */
  shoreLimit: 1,
} as const;

export const CAMERA = {
  fov: 55,
  dist: 8.2,
  height: 3.6,
  lookHeight: 1.5,
  lerp: 0.11,
  yawStart: 0,
  pitchStart: 0.16,
  pitchMin: -0.1,
  pitchMax: 0.62,
  mouseSens: 0.0032,
  keySens: 0.035,
  touchSens: 0.0044,
  /** Never let the camera dip closer than this to the ground/sea. */
  minClearance: 1.1,
  /** Camera kick decay and frequency for juice shakes. */
  shakeDecay: 7.5,
  shakeHz: 18,
} as const;

export const FEEL = {
  /** Footstep / splash dust cadence while moving. */
  dustInterval: 0.16,
  dustMinSpeed: 1.2,
  landImpactSpeed: 2.4,
  collectBloomPulse: 0.55,
  deliverBloomPulse: 0.75,
  bloomPulseDecay: 2.8,
} as const;

// --------------------------------------------------------------------- lotus
/** Puzzle gates — docs/design/level-lotus-island.md (sahip onayı: A1, B3, tepe, C2). */
export const PUZZLE = {
  /** Torus highlight only when memory is below this. */
  highlightMemoryMax: 0.35,
  /** Torus highlight only within this distance of the ripe plant. */
  highlightCloseRange: 1.15,
  /** Stepping-stone chain — player must visit pads in order. */
  stoneStepRadius: 0.95,
  stonePickGateIndex: 4,
  /** Hill wind cairns — interact in wind order to unlock cove lotuses. */
  cairnRange: 2.35,
  cairnSolveOrder: [0, 2, 1] as readonly number[],
  /** Fraction of cove-zone plants that stay gated until hill puzzle clears. */
  coveGatedRatio: 0.55,
  /** Deep-zone plants behind the lily-pad chain (by index within zone). */
  deepGatedFromIndex: 9,
} as const;

export const LOTUS = {
  count: profile.lotus.count,
  /** Seconds spent in each stage before advancing. */
  budTime: 14,
  halfTime: 11,
  ripeTime: 26,
  wiltTime: 16,
  /** Regrow delay after a bloom is taken. */
  goneTime: 12,
  /** Randomised +/- factor applied to every stage duration. */
  timeJitter: 0.45,
  /** How close the player must be to harvest. */
  pickRange: 2.4,
  /** Inventory cap before a trip back to the ship is required. */
  carryCap: profile.lotus.carryCap,
  /** Ripe lotuses to deliver for the departure. */
  target: 12,
  /** Minimum spacing when scattering plants across the lagoon. */
  minSpacing: 1.75,
  /**
   * Three harvest pockets (reed shore / deep lagoon / north cove).
   * Counts should sum to `count`.
   */
  zones: [
    { name: "reed", cx: -5.5, cz: 8.5, radius: 5.2, count: 12, spacing: 1.55 },
    { name: "deep", cx: 1.2, cz: -1.5, radius: 6.4, count: 14, spacing: 1.85 },
    { name: "cove", cx: 6.8, cz: -6.2, radius: 4.4, count: 8, spacing: 1.7 },
  ],
} as const;

// ------------------------------------------------------------- memory system
export const MEMORY = {
  /** 0 = clear headed, 1 = fully lotus-drunk. Rates are per second. */
  islandGain: profile.memory.islandGain,
  /** Extra drift per carried lotus — the scent works on you. */
  perCarriedGain: profile.memory.perCarriedGain,
  /** Wading in the lotus lagoon accelerates the forgetting. */
  lagoonGain: profile.memory.lagoonGain,
  /** Instant hit when a ripe lotus is picked. */
  pickSpike: profile.memory.pickSpike,
  /** Recovery near the ship. */
  shipRecover: profile.memory.shipRecover,
  /** Recovery while standing in the sea shallows. */
  seaRecover: profile.memory.seaRecover,
  /** Distance from the shoreline that still counts as "in the sea". */
  seaBand: 2.6,
  /** Above this the guiding arrow and part of the HUD fade away. */
  blindThreshold: 0.8,
  /** Seconds pinned at full memory before the run is lost. */
  loseHold: 6,
  /** Memory left after a lost run. */
  resetTo: 0.45,
  /** Visual haze curve mapped from memory. */
  hazeGamma: 1.85,
  hazeMax: 0.95,
} as const;

export const FLOW = {
  /** Seconds the departure animation runs before the win card settles. */
  departSeconds: 7,
  /** Seconds the "you forgot" card stays up before respawning at the ship. */
  lostCardSeconds: 3.4,
} as const;

/** One in-game day — sun height is the clock (tuning.md §2). */
export const DAY = {
  length: 420,
  /** Sun elevation at t=0 (degrees above horizon). */
  sunStartDeg: 55,
  /** Sun elevation at dusk (degrees). */
  sunEndDeg: 2,
  /** Remaining seconds when light turns rose / warn toast. */
  warnRemaining: 90,
} as const;

/** Silent lotus-eaters who offer a one-shot gift (tuning.md §6). */
export const LOTOPHAGOS = {
  count: 3,
  gift: 2,
  memCost: 0.2,
  range: 3.2,
  /** World spots near the three harvest pockets. */
  spots: [
    { name: "reed", x: -4.6, z: 7.2, faceY: 0.4 },
    { name: "deep", x: 0.4, z: 2.8, faceY: Math.PI },
    { name: "cove", x: 5.8, z: -4.8, faceY: -2.2 },
  ],
} as const;

/** Achaean fleet on the beach — twelve ships for twelve lotuses. */
export const FLEET = {
  count: 12,
  /** Index of Doryseus' ship (delivery + player spawn nearby). */
  playerIndex: 6,
  /** Spacing along the shore tangent. */
  spacing: 3.35,
} as const;

// ------------------------------------------------------------------- visuals
export const RENDER = {
  exposure: 1.02,
  bloomStrength: 0.42,
  bloomRadius: 0.45,
  bloomThreshold: 0.86,
  fogColor: 0xc2e0ea,
  fogDensity: 0.0092,
  skyTop: 0x2f86c9,
  skyHorizon: 0xffe6c2,
  sunColor: 0xfff0cc,
  sunIntensity: 3.1,
  ambientColor: 0xa8c8f0,
  ambientIntensity: 0.4,
  bounceSky: 0x8ecbff,
  bounceGround: 0xd9b478,
  bounceIntensity: 0.36,
} as const;

export const PALETTE = {
  sand: 0xe9cf98,
  sandWet: 0xc7a468,
  grassDry: 0xa8b566,
  grass: 0x7f9c56,
  grassDeep: 0x5e7f45,
  rock: 0xa8a091,
  marble: 0xeee6d6,
  seaShallow: 0x63d7d2,
  seaDeep: 0x0f6f9e,
  seaFoam: 0xf4ffff,
  lagoon: 0x38b8bb,
  pad: 0x4e7f44,
  padLight: 0x74a355,
  stem: 0x5f8a4a,
  petalBud: 0xbcd98f,
  petalHalf: 0xf7c9dc,
  petalRipe: 0xfff2f7,
  petalRipeTint: 0xff9ec4,
  petalWilt: 0x8f8577,
  lotusHeart: 0xffd45e,
  hull: 0x8f5d33,
  hullDark: 0x5e3a1e,
  hullTrim: 0xb03a2e,
  sail: 0xf2e4c9,
  cypress: 0x3f5f3a,
  olive: 0x7d9464,
  trunk: 0x6b5136,
} as const;
