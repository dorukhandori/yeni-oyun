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
  island: { radius: number; planeSize: number; planeSegments: number };
  player: { speed: number; spawn: { x: number; z: number } };
  lotus: { count: number; carryCap: number };
  ship: { pos: { x: number; z: number }; range: number };
  /**
   * Southward shift of the core loop (reed / lagoon / cove / NPCs) so those
   * pockets stay next to the ship when the island grows. 0 on the test island.
   */
  layoutShiftZ: number;
  fogDensity: number;
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
    island: { radius: 26, planeSize: 96, planeSegments: 132 },
    player: { speed: 6.2, spawn: { x: 5.5, z: 22.5 } },
    lotus: { count: 34, carryCap: 6 },
    ship: { pos: { x: 11.5, z: 19.5 }, range: 7.4 },
    layoutShiftZ: 0,
    fogDensity: 0.0092,
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
    // 15 Aug 2026 scale proposal (tuning.md §2.1, level-lotus-island.md §1):
    // island grows, core loop (ship↔reed↔lake) keeps its old distances.
    island: { radius: 160, planeSize: 384, planeSegments: 196 },
    player: { speed: 4.5, spawn: { x: 3.2, z: -146 } },
    lotus: { count: 28, carryCap: 4 },
    ship: { pos: { x: 0, z: -154 }, range: 6.5 },
    layoutShiftZ: -80,
    fogDensity: 0.0044,
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

/** Hub Lotus card = classic 12-run. Hub "Beş yeter" = K35 edge quest. */
export type LotusRunKind = "classic" | "edge";
let lotusRun: LotusRunKind = "classic";

export function setLotusRun(kind: LotusRunKind): void {
  lotusRun = kind;
}

export function isEdgeRun(): boolean {
  return lotusRun === "edge";
}

/** Profile-driven behaviour flags consumed outside the raw tuning numbers. */
export const WORLD = {
  profile: ACTIVE_PROFILE,
  showMemoryBar: profile.hud.showMemoryBar,
  lossMode: profile.loss.onFull,
  /** True only while the Beş yeter edge quest is the active run. */
  get k35(): boolean {
    return lotusRun === "edge";
  },
};

/**
 * Southward block-shift of the core loop (reed / lagoon / cove / NPCs) so
 * those pockets stay next to the ship when `real` grows to 160 m.
 * `tuning.md` §2.1 — distances inside the block do not change.
 */
export const LAYOUT_SHIFT_Z = profile.layoutShiftZ;

// ---------------------------------------------------------------- island shape
export const ISLAND = {
  /** Radius where the land meets the sea. */
  radius: profile.island.radius,
  /** Sea level sits at y = 0; the shore ramps down to this. */
  shoreDrop: -0.55,
  /** Peak height of the inland dome (soft rise; the weenie is LANDMARK.hill). */
  domeHeight: ACTIVE_PROFILE === "real" ? 3.4 : 2.1,
  /** How far inland the dome reaches its full height. */
  domeFalloff: ACTIVE_PROFILE === "real" ? 28 : 13,
  hillAmp: ACTIVE_PROFILE === "real" ? 1.8 : 1.6,
  hillFreq: 0.14,
  /** Width of the golden sand ring at the shoreline. */
  beachWidth: 8,
  /** Angular wobble so the coast is a set of bays, not a circle. */
  wobbleA: 0.07,
  wobbleB: 0.035,
  /** Terrain mesh extent and resolution — derived from radius (level-lotus-island.md §7.1). */
  planeSize: profile.island.planeSize,
  planeSegments: profile.island.planeSegments,
} as const;

/**
 * Local relief that the global sine `hills()` must not fake — a single
 * dominant peak, a cove headland framing the fleet, and a northern spike
 * skyline. Heights are 0 on the test island so the sandbox silhouette stays put.
 */
export const LANDMARK = {
  hill: { x: 70, z: 60, height: ACTIVE_PROFILE === "real" ? 48 : 0, radius: 44 },
  headland: { x: -30, z: -136, height: ACTIVE_PROFILE === "real" ? 11 : 0, radius: 16 },
  northSpikes: {
    height: ACTIVE_PROFILE === "real" ? 58 : 0,
    startR: 132,
    endR: 172,
  },
} as const;

export const LAGOON = {
  center: { x: 0, z: 1.5 + LAYOUT_SHIFT_Z },
  radius: 12,
  /** Basin floor depth relative to sea level. */
  floor: -0.75,
  /** Still water surface height. */
  waterY: -0.06,
  /** Angular wobble so the shoreline is not a perfect circle. */
  wobbleA: 0.15,
  wobbleB: 0.08,
} as const;

/**
 * Decorative freshwater pockets (LOT-53). Scenery only — `inLagoon()` stays
 * lagoon-only, so ponds never touch wade speed or the memory rates in
 * `gdd-memory-system.md`. Sites are stored in island-normalised polar space
 * (`ar`/`rf` are fractions of `ISLAND.radius`) so the same layout scales
 * between the 160 m `real` island and the 26 m sandbox; `resolvePonds()` in
 * `world/ponds.ts` pushes each site outward until it clears the lagoon, the
 * berth, the lotus zones, the coast and its neighbours, and drops it if it
 * never fits. Layout rationale: `docs/design/level-lotus-island.md` §8.
 */
export const PONDS = {
  /** Still surface, just under sea level like the lagoon so the rim reads wet. */
  waterY: -0.05,
  /**
   * Basin floor. Matched to `LAGOON.floor` on purpose: a shallower dish put
   * the waterline in the steep part of the bowl, where the terrain plane's
   * ~2 m vertex spacing cuts corners and the flat water disc poked out over
   * the bank as visible straight edges.
   */
  floor: -0.75,
  /** How far the rim climbs above the floor, so the pool has a bank. */
  rimRise: 0.35,
  /** Blend band outside the rim so the edge is a muddy shelf, not a step. */
  rimBlend: 3.4,
  /** Radius floor in metres. Only ever binds on the 26 m sandbox. */
  minRadius: 1.6,
  /**
   * Extra overlap past the analytic waterline, as a fraction of the rim, so
   * the disc edge tucks under the bank instead of ending in mid-air.
   */
  discOverlap: 0.06,
  /**
   * Clearance from the lagoon rim, the lotus zones and other ponds, as a
   * fraction of `ISLAND.radius`. Absolute metres do not port: 6 m is right on
   * the 160 m island and leaves the 26 m sandbox with no legal site at all,
   * because its lagoon already eats half the land.
   */
  keepoutFrac: 0.0375,
  keepoutMin: 1.2,
  /** Bearing sweep when the authored direction has no legal ground (radians). */
  bearingStep: 0.11,
  bearingSteps: 14,
  /**
   * How much of the beach ring stays pond-free. Capped by radius for the same
   * reason as `keepoutFrac` — the sandbox cannot spare a full 8 m of shore.
   */
  beachMarginFrac: 0.05,
  /** Outward search when a nominal site does not fit (fraction of radius per step). */
  pushStep: 0.04,
  pushMaxAr: 0.86,
  reedsPerPond: ACTIVE_PROFILE === "real" ? 30 : 9,
  pebblesPerPond: ACTIVE_PROFILE === "real" ? 16 : 6,
  /** A scatter of pads, not the lagoon's dense mat. */
  padsPerPond: ACTIVE_PROFILE === "real" ? 7 : 3,
  /** Pad size as a fraction of pond radius — keeps pads in proportion on any island. */
  padScale: 0.085,
  sites: [
    /** West meadow — the long empty run between the berth and the west coast. */
    { name: "west-meadow", angle: 3.02, ar: 0.5, rf: 0.075 },
    /** North hollow — breaks up the negative-space band before the spikes (§3.5). */
    { name: "north-hollow", angle: 1.92, ar: 0.55, rf: 0.062 },
    /** Hill approach — a rest beat on the long north trek, clear of the weenie bump. */
    { name: "hill-foot", angle: 0.72, ar: 0.28, rf: 0.055 },
    /** East shelf — gives the eastern half a reason to be crossed. */
    { name: "east-shelf", angle: -0.42, ar: 0.62, rf: 0.052 },
  ],
} as const;

/**
 * Faint desire lines between the places the player actually walks (LOT-53).
 * Not a drawn road: the mask is baked once into a single-channel DataTexture
 * (`world/paths.ts`) and multiplied by a break-up noise so the trail is
 * intermittent — "belli belirsiz", per sahip. Costs one texture fetch in the
 * ground shader and no extra geometry; the heightmap is untouched.
 */
export const PATHS = {
  /** Half-width in metres. Wider on `real` because the camera is further out. */
  halfWidth: ACTIVE_PROFILE === "real" ? 2.3 : 1.3,
  /** Soft shoulder outside `halfWidth` where the trail fades into grass. */
  feather: ACTIVE_PROFILE === "real" ? 2.2 : 1.1,
  /** Peak blend toward packed earth. Above ~0.7 it stops reading as a desire line. */
  strength: 0.55,
  /** Break-up: fraction of the mask that the patchy noise can eat away. */
  breakUp: 0.55,
  breakUpFreq: 0.085,
  /** Baked mask resolution over `ISLAND.planeSize`. 0.375 m/texel on `real`. */
  texSize: ACTIVE_PROFILE === "real" ? 1024 : 512,
  /** Metres between polyline samples; also the meander wavelength. */
  sampleStep: ACTIVE_PROFILE === "real" ? 7 : 3,
  /** Lateral meander so a route never reads as a ruler line. */
  meander: ACTIVE_PROFILE === "real" ? 4.5 : 1.6,
  /** Packed-earth tint applied to the dry-sand albedo. Derived from PALETTE.sand, no new hue. */
  tint: { r: 0.74, g: 0.66, b: 0.55 },
  /** Trees and boulders are pushed off a trail above this mask value. */
  clearMask: 0.35,
  /** Grass tufts are thinned above this mask value (higher — a trail keeps some fringe). */
  grassClearMask: 0.5,
  /**
   * Routes as anchor keys, resolved in `world/paths.ts`. Anchors that do not
   * exist on a profile (`hillFoot` is flat on `test`, ponds may be dropped)
   * are skipped, and a route with fewer than two surviving anchors is dropped.
   */
  routes: [
    { name: "landing", anchors: ["ship", "spawn", "reed"] },
    { name: "reed-lagoon", anchors: ["reed", "lagoonS"] },
    { name: "lagoon-shrine", anchors: ["lagoonN", "shrine"] },
    { name: "shrine-hill", anchors: ["shrine", "pond:hill-foot", "hillFoot"] },
    { name: "west-water", anchors: ["lagoonW", "pond:west-meadow"] },
    { name: "north-run", anchors: ["pond:hill-foot", "pond:north-hollow"] },
    { name: "east-run", anchors: ["lagoonE", "pond:east-shelf"] },
  ],
} as const;

/**
 * Pond-rim frogs (LOT-53). Ambient decor only: no collider, no interaction, no
 * relation to the hallucination figures in `gdd-lotus-hallucination.md`. Motion
 * is a pure function of `t` (hashed hop index) so it never accumulates drift and
 * costs one matrix write per frog per frame.
 */
export const FROGS = {
  perPond: ACTIVE_PROFILE === "real" ? 7 : 4,
  /** Extra frogs on the big lagoon rim, where the player actually walks. */
  onLagoon: ACTIVE_PROFILE === "real" ? 9 : 5,
  /** Body length in metres. Small enough to be a detail, big enough to notice. */
  size: 0.3,
  /** Band around a rim, as a fraction of that water body's radius. */
  rimInner: 0.92,
  rimOuter: 1.22,
  /** How far a frog may stray from its home spot. */
  leash: 0.9,
  /** Seconds between hops, randomised per frog inside this range. */
  hopPeriodMin: 3.4,
  hopPeriodMax: 7.8,
  /** Seconds a single hop takes. */
  hopTime: 0.42,
  hopArc: 0.22,
  /** Idle throat/flank bob amplitude, as a fraction of body height. */
  breathAmp: 0.07,
  breathHz: 1.9,
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
  /**
   * Fitted length in metres. Sahip 17 Aug: 3× the locked 14 m house-galley.
   */
  length: 42,
  scale: 1,
  mesh: "assets/models/ship_hero_03_mesh_8000.glb",
  /**
   * Tripo from Gemini still ASSET-075 v3 (Wedjat bow). 0 until playtest says flip.
   */
  meshFacing: 0,
  deckY: 4.74,
  deckHalfW: 6.6,
  deckHalfL: 20.7,
  /** Delivery trigger — scales with the 3× hull so the gangplank still counts. */
  range: profile.ship.range * 3,
  /** Inlaid glow on the Wedjat and nearby glyph grooves only — low, not hull-wide. */
  neonEye: 0x3dfff6,
  neonRune: 0xc46bff,
  neonIntensity: 0.55,
  /** Beached hull, lapping shallows — readable from the hill on a 42 m ship. */
  bobAmp: 0.55,
  bobHz: 1.05,
  rollAmp: 0.055,
  rollHz: 0.82,
  pitchAmp: 0.028,
  pitchHz: 0.7,
  /** K35 forget: min metres from the previous berth. */
  relocateMin: 40,
  /** K35 forget: min metres from the player. */
  relocatePlayerMin: 25,
  /** Brown-stone causeway: starts at the hull in the shallows, breaks the surface, then climbs the beach. */
  causewayCount: 52,
  causewayWidth: 2.8,
  causewayInland: 12,
  /** Stay on the hull — do not jump inland or the whole path lands on grass. */
  causewayClear: 0.6,
  causewayBow: 0.28,
  /** Rock centre in the shallows so the stones poke through the opaque sea. */
  causewayWaterY: 0.28,
} as const;

/** Hidden beauties + offer wander (K35, `gdd-lotus-island-run.md` §3.12–3.13). */
export const BEAUTY = {
  hillViewHeight: 22,
  womanPos: { x: -18, z: -64 },
  wanderR: 22,
  wanderSpeedMul: 0.35,
  range: 3.2,
  cairnSpots: [
    { x: 4.2, z: -3.4 + LAYOUT_SHIFT_Z },
    { x: 8.6, z: -7.8 + LAYOUT_SHIFT_Z },
    { x: 6.1, z: -9.6 + LAYOUT_SHIFT_Z },
  ],
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
  /**
   * Seconds for facing to catch the wish direction (`PLAYER_TURN_SMOOTH`).
   * Face input, not velocity — double-smoothing against `accel` reads as a
   * sideways slide in the old sprite.
   */
  turnSmooth: 0.1,
  spawn: profile.player.spawn,
  /** Hold W / stick-forward this many seconds to start running. */
  runHold: 10,
  /** Sprint multiplier on PLAYER.speed once runHold elapses. */
  runSpeedMul: 1.45,
  /** Deepest the sailor sinks while wading. */
  wadeFloor: -0.42,
  /** How far past the shoreline he may wade before being held back. */
  shoreLimit: 1,
  /**
   * Width of the resistance zone before `shoreLimit` (playtest bug: hard
   * invisible-wall stop at the boundary). Outward velocity is progressively
   * damped across this band instead of snapping the player to the limit.
   */
  boundarySoftZone: 1.6,
  /** Fraction of outward velocity shed per second at full boundary depth. */
  boundaryResistance: 0.85,
  /** Minimum gap between "this far" boundary toasts. */
  boundaryHintCooldown: 14,
} as const;

export const CAMERA = {
  fov: 55,
  dist: 8.2,
  height: 3.6,
  lookHeight: 1.5,
  lerp: 0.11,
  yawStart: 0,
  /** Slightly less look-down so the golden-hour disc fits in the sky band. */
  pitchStart: 0.09,
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
  /**
   * Harvest reveal (playtest bug: the sailor's body blocks the flower while
   * picking). Within `pickRevealRange` of a harvestable ripe bloom, the
   * camera eases up and back so the plant stays visible past the character.
   */
  pickRevealRange: 2.2,
  pickRevealLift: 0.6,
  pickRevealPullback: 0.9,
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

/**
 * Procedural WebAudio bed (`src/systems/audio.ts`). No asset files —
 * oscillators / filtered noise. Mute is a player preference, not a
 * gameplay number, but the bus level and ramp live here so HUD chrome
 * and the audio graph share one source.
 */
export const AUDIO = {
  /** Master bus when unmuted. */
  masterGain: 0.55,
  /** Mute/unmute linear ramp (seconds). Long enough to kill a click. */
  muteRamp: 0.08,
  /** localStorage key. Safari private mode may throw; callers try/catch. */
  muteStorageKey: "lotophagoi.muted",
} as const;

/**
 * Doryseus billboard (ASSET-041..044). Y-axis only — a full THREE.Sprite
 * tilts toward the shoulder camera and reads as floating.
 */
export const SAILOR = {
  /** World height of the 512² canvas (feet on the bottom pad). */
  height: 1.82,
  /**
   * ASSET-058 v2 — Tripo `multiview-to-model` (geometry) + Tripo's own
   * `texture_model` retexture (`POST /v3/models/texture`, not Meshy —
   * sahip 2026-08-16: "meshy değil, tripo kullanıyoruz"), same locked
   * ASSET-041..044 stills as texture direction. Verified per-angle (frozen
   * test-hook rotation, LOT-27 QA 2026-08-16): 0°/180° are correct mirrored
   * side profiles, 90° is a real back (short hair, no face), 270° is a real
   * front. No projection hack needed — `cardinalViews.ts` (the runtime
   * sprite-projection workaround) is retired and deleted. Untextured/unrigged
   * fallback only reached if `meshRig` below fails to load.
   */
  mesh: "assets/models/char_doryseus_02_textured_8000.glb",
  /**
   * Same textured mesh, rigged + retargeted by Tripo (`rig-check` →`rig`→
   * `retarget`, `scripts/gen-mesh.mjs --animate --glb`) onto the exact GLB
   * above — texture/material carried through (`export_with_geometry`), not
   * re-baked. Clips: `preset:idle`/`preset:walk`/`preset:run`, 2026-08-17;
   * `preset:biped:dig` added 2026-08-18 (sahip: "lotusu koparma animasyonu
   * yok, ekle") — Tripo's legacy biped catalog (90+ presets, checked in
   * full) has no exact pick/harvest/gather preset, so `dig` (a repeated
   * bend-and-reach toward the ground) stands in as the closest physical
   * match. `sailor.ts` plays it whenever `harvest > 0.08`. Swap for a
   * bespoke Blender clip if/when LOT-37 gets unblocked.
   */
  meshRig: "assets/models/char_doryseus_02_rig_8000.glb",
  /**
   * Clip-only donor GLB — `preset:biped:wave_goodbye_02` (departure wave)
   * and `preset:biped:bow` (delivery gesture), 2026-08-18 (sahip: "diğer
   * jestleri de (wave, delivery) yap"). Chosen by eye in the workbench out
   * of `wave_goodbye_01`/`_02`, `bow`, `greet_01`: `_01` turned out to be a
   * seated pose (wrong), `greet_01` an overhead cheer-wave (too big for a
   * quiet delivery moment) — `_02` and `bow` were the only two that actually
   * read right. Kept in a **separate** file from `meshRig` rather than
   * folded in: Tripo's retarget caps a request at 5 presets/call, and
   * `sailor.ts` attaches this file's clips onto the main rig's mixer at
   * runtime purely by bone-name match (same trick as the workbench's "dış
   * klip ekle") — no merge step needed. Stripped to skeleton+animation only
   * via `scripts/gltf-strip-to-anim.mjs` (6.96 MB raw Tripo export → 546 KB)
   * since Tripo's `export_with_geometry` always re-bakes the full mesh even
   * for a 2-clip request, and this repo is already over its K37 download
   * budget (roadmap.md) — shipping the raw export would have made that worse
   * for zero benefit (the donor's own mesh/skin is discarded on load).
   */
  gesturesFile: "assets/models/char_doryseus_02_gestures_8000.glb",
  meshEnabled: true,
  /**
   * Added to `root.rotation.y`. char_doryseus_02's own local "front" axis
   * sits 90° off the `facing` convention (confirmed via frozen rotation
   * sweep, LOT-27 QA 2026-08-17: at `facing=0` the mesh shows a side
   * profile, not front/back). -π/2 makes the mesh's real face point the
   * same way `facing` does, so W (away from camera) shows the real back
   * and S (toward camera) shows the real face — verified both ways with
   * `__LOTOPHAGOI_TEST_HOOKS__.freeze()` + a forced `facing` value, not
   * just derived on paper (this exact constant has flipped wrong before).
   */
  meshFacing: -Math.PI / 2,
  /** Extra yaw on the GLB inside the sailor root. 0 while meshFacing holds the value above. */
  meshYaw: 0,
  /**
   * Extra metres under the 3D soles. Was 0.08 for the old low-poly mesh's
   * jagged peaks; measured against char_doryseus_02 (LOT-27 QA 2026-08-17,
   * `fitGltfHeight` + terrain raycast both checked directly) the real
   * planted gap is ~0 — sahip saw "havada uçuyor" with the old value. Small
   * safety margin only, not a deliberate lift.
   */
  meshYLift: 0.01,
  /** Empty rows under the soles in the 512 canvas (measured 10px). */
  feetPad: 10 / 512,
  /** Fallback squash if no walk sheet is loaded. Sheet playback must not add this. */
  walkStepSquash: 0.03,
  walkStepStretch: 0.01,
  /** Disabled — lateral sway read as a drunken stagger on the back walk. */
  walkHipShift: 0,
  walkHipRoll: 0,
  /** Extra Y-squash while holding a harvest (knees compress before the hinge). */
  harvestBend: 0.06,
  /** Forward hip hinge while picking (radians). Pivot at harvestHip. Never pitch the camera-facing plane. */
  harvestLean: 0.38,
  /**
   * When the harvest sheet already draws the pose, keep only a whisper of
   * hinge so we do not double-bend (sheet + card pitch).
   */
  harvestSheetLean: 0.07,
  /** Hip height as a fraction of billboard height. */
  harvestHip: 0.46,
  /** Extra reach toward the bloom while bent (metres, local Z). */
  harvestReach: 0.05,
  /**
   * The 3D rig path (`meshLive`) never applied any of the bend/lean/reach
   * above — those only ever ran on the flat billboard fallback. Sahip
   * 2026-08-18: "zemine uyumlu bir eğilme ve uzanma hareketi yok" (no
   * floor-appropriate bend/reach) — `preset:biped:dig`'s own rotation
   * channels give *some* lean, but with nothing added on top it read as too
   * upright to pass as reaching for a lotus at water level. These layer a
   * whole-rig forward pitch + downward/forward offset on top of whatever the
   * clip already does, driven by the same `hinge`/`knee` curves the
   * billboard path uses. Kept smaller than the billboard's own
   * `harvestLean` (0.38) since the clip is already contributing bend —
   * this is a top-up, not the whole motion.
   */
  meshHarvestLean: 0.22,
  /** Extra downward sink (metres) at full harvest hinge, on top of `meshYLift`. */
  meshHarvestDrop: 0.14,
  /** Extra forward reach (metres, local Z) at full harvest hinge. */
  meshHarvestReach: 0.08,
  /** Crossfade seconds when the 8-way billboard changes facing (smoothstep). */
  viewFade: 0.16,
  /**
   * Extra radians past an octant centre before switching. Profile (D/A) sits
   * next to diagonal octants — a short hold stopped W+D flicker; a bit more
   * stops left↔frontLeft chatter while strafing.
   */
  viewHold: Math.PI * 0.09,
  /** Play a walk/run sheet once moving (or wish) exceeds this (0–1). */
  gaitMin: 0.04,
  /**
   * Warm linen multiply so the studio still sits in the Aegean sun
   * (`art-bible.md` §2 sand / sail / skin) instead of reading as unlit plastic.
   */
  sunTint: 0xf0e0c4,
  roughness: 0.88,
  metalness: 0,
  /** Warm fill — wrap lighting keeps this from reading as a sticker. */
  emissive: 0x6e4e28,
  emissiveIntensity: 0.38,
  /** Half-Lambert wrap (0.5 = NdotL remapped to 0.5–1). Never fully dark. */
  wrapLight: 0.5,
  /**
   * Metres ahead (along facing) to sample ground. A vertical billboard
   * intersects the uphill mesh; we lift by that delta so calves don't clip
   * (playtest: "yokuş çıkarken bacaklar zemine gömülüyor").
   */
  slopeProbe: 0.42,
  /** How much of the uphill delta becomes extra root height. */
  slopeLift: 0.85,
  /**
   * Fallback column count before a sheet's image reports its size.
   * Live playback uses width/height (square cells).
   */
  walkFrames: 8,
  /** Seconds for one two-step walk cycle. Dense sheets + blend hide the seam. */
  walkCycle: 1.12,
  /** Seconds for one two-step run cycle. */
  runCycle: 0.78,
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
  /**
   * Teaching-hint radii (playtest bug: "taşlar için ipucu eksik") — wider
   * than the actual interact/step ranges above, so the HUD explains the
   * mechanic while the player is still approaching it, not only once
   * they're already standing on top of it.
   */
  stoneHintRange: 6.0,
  cairnHintRange: 7.0,
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
  get goneTime(): number {
    return isEdgeRun() ? 0 : 12;
  },
  /** Randomised +/- factor applied to every stage duration. */
  get timeJitter(): number {
    return isEdgeRun() ? 0 : 0.45;
  },
  /** How close the player must be to harvest. */
  pickRange: 2.4,
  /** Seconds E must be held (`HARVEST_HOLD`). Instant tap does not pick. */
  hold: 1.2,
  /** Metres moved while holding before harvest progress resets. */
  cancelMove: 0.3,
  /** Inventory cap before a trip back to the ship is required. */
  carryCap: profile.lotus.carryCap,
  /** Ripe lotuses to deliver for the departure. */
  get target(): number {
    return isEdgeRun() ? 5 : 12;
  },
  /** Active plants in the edge quest (classic uses `count`). */
  edgeCount: 5,
  /** Minimum spacing when scattering plants across the lagoon. */
  get minSpacing(): number {
    return isEdgeRun() ? 18 : 1.75;
  },
  /**
   * Three harvest pockets (reed shore / deep lagoon / north cove).
   * Counts should sum to `count`.
   */
  zones: [
    { name: "reed", cx: -5.5, cz: 8.5 + LAYOUT_SHIFT_Z, radius: 5.2, count: 12, spacing: 1.55 },
    { name: "deep", cx: 1.2, cz: -1.5 + LAYOUT_SHIFT_Z, radius: 6.4, count: 14, spacing: 1.85 },
    { name: "cove", cx: 6.8, cz: -6.2 + LAYOUT_SHIFT_Z, radius: 4.4, count: 8, spacing: 1.7 },
  ],
};

/**
 * Stage readability tuning (playtest bug: "lotus aşaması okunmuyor" — the 4
 * billboard stages read too similarly at a glance). Only affects the ripe
 * stage's halo/glow pulse and the nearest-target highlight ring; the stage
 * textures/scales themselves (`LOOK` in `world/lotus.ts`) are unchanged.
 */
export const LOTUS_FX = {
  ripeHaloBaseOpacity: 0.48,
  ripeHaloPulseOpacity: 0.24,
  ripeHaloBaseScale: 1.3,
  ripeHaloPulseScale: 0.24,
  /** Extra brightness swing on the ripe bloom sprite itself. */
  ripeBloomBrightPulse: 0.12,
  /** Nearest-pickable-target ring — kept bright and never dips too low. */
  highlightBaseOpacity: 0.78,
  highlightPulseOpacity: 0.2,
  highlightBaseScale: 1.05,
  highlightPulseScale: 0.08,
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
  /** After a K35 forget event — not pinned at 1.0. */
  forgetFloor: 0.4,
  /** Seconds of no memory *gain* after forget (recover still works). */
  forgetIframes: 2.0,
  /** Night multiplies islandGain (last 20% + first 10% of the day). */
  nightMul: 1.25,
  /** Visual haze curve mapped from memory. */
  hazeGamma: 1.85,
  hazeMax: 0.95,
  /**
   * Walking-drift primitives (tuning.md §5.3 `DRIFT_MAX_ANGLE`/`DRIFT_PERIOD`
   * — the base eşik-3 "sarhoş yürüyüş" behaviour from `gdd-memory-system.md`
   * §4.3 is Faz 2.5, not yet wired here). Currently only consumed by the
   * hallucination contact spike below (`HALLUCINATION.driftMultiplier`),
   * which per `gdd-lotus-hallucination.md` §3.1/§4.2 reuses these two
   * constants rather than inventing its own drift system.
   */
  driftMaxAngleDeg: 15,
  driftPeriod: 4.0,
} as const;

/**
 * Lotus Adası'na özgü sanrı figürleri (hallucination) — `tuning.md` §13,
 * `docs/design/gdd-lotus-hallucination.md`. Yalnızca Lotus Adası'nda okunur;
 * Kiklop Mağarası ve Sirenler Geçidi bu sabitleri hiç okumaz (bkz. o
 * dosyanın §1.1). Puan cinsinden (0-100) tuning.md değerleri, `MEMORY`
 * grubuyla aynı ilkeyle motorun dahili 0-1 float `memory` state'ine 100'e
 * bölünerek çevrildi (bkz. `MEMORY`'nin başındaki "real" profile notu).
 */
export const HALLUCINATION = {
  /** HALLUCINATION_THRESHOLD (öneri 60 puan, 🔬 playtest'e ertelendi). */
  threshold: 60 / 100,
  /** MEM_THRESHOLD_HYSTERESIS (3 puan) yeniden kullanılıyor — ayrı bir sabit tanımlanmadı, gdd §4.1. */
  hysteresis: 3 / 100,
  /** HALLUCINATION_CREATURE_COUNT */
  creatureCount: 3,
  /** HALLUCINATION_SEED */
  seed: 7429,
  /** HALLUCINATION_FADE_TIME (s) */
  fadeTime: 1.5,
  /** HALLUCINATION_LINGER (s) */
  linger: 10.0,
  /** HALLUCINATION_RESPAWN_GAP (s) */
  respawnGap: 6.0,
  /** HALLUCINATION_ROUTE_BIAS_RADIUS (m) — spawn weighting toward the player-ship line. */
  routeBiasRadius: 18.0,
  /** HALLUCINATION_CONTACT_RADIUS (m) */
  contactRadius: 1.8,
  /** HALLUCINATION_CONTACT_MEM_SPIKE (öneri 10 puan -> dahili 0.10, 🔬 playtest'e ertelendi). */
  contactMemSpike: 10 / 100,
  /** HALLUCINATION_DRIFT_MULTIPLIER — MEMORY.driftMaxAngleDeg'e uygulanan geçici çarpan. */
  driftMultiplier: 2.0,
  /** HALLUCINATION_DRIFT_SPIKE_DURATION (s) */
  driftSpikeDuration: 4.0,
  /** HALLUCINATION_CONTACT_COOLDOWN (s) — kare-bazlı çoklu tetiklenmeyi önler. */
  contactCooldown: 2.0,
  /** HALLUCINATION_VANISH_ON_CONTACT — temas eden figür hemen söner. */
  vanishOnContact: true,
  /** Minimum spawn distance from the player/ship so a figure never "ambushes". */
  minSpawnDistFromPlayer: 3.5,
  minSpawnDistFromShip: 7.0,
  /** Gentle ghost-wander amplitude/speed while lingering (visual only). */
  wanderRadius: 1.1,
  wanderSpeed: 0.35,
} as const;

/**
 * Ambient island wildlife — Thallope (ASSET-060/061). Completely decorative:
 * no contact, no memory, no lotus. Not the hallucination family
 * (`docs/art/asset-registry.md` P3). Homes sit in the core-loop block so the
 * player actually sees them on the 160 m island.
 */
export const THALLOPE = {
  mesh: "assets/models/creature_thallope_01_mesh_4000.glb",
  /** Readable wildlife — a bit under Doryseus (1.82 m), not a speck. */
  height: 1.2,
  meshYLift: 0.01,
  /**
   * Bind-pose nose sits on local +X (head bone x=0.44, tail x=-0.46), while
   * wander yaw 0 is game +Z — same 90° mismatch as Doryseus. -π/2 maps the
   * nose onto the travel axis so they hop the way they face.
   */
  meshFacing: -Math.PI / 2,
  seed: 4173,
  walkSpeed: 1.05,
  hopSpeed: 1.35,
  /** Occasional hop; default is grounded walk so they don't read as flying. */
  hopChance: 0.16,
  wanderR: ACTIVE_PROFILE === "real" ? 12 : 7,
  turnSmooth: 0.14,
  avoidPlayer: 2.2,
  arriveDist: 0.7,
  /** Brief pause only after a hop; walk stays continuous. */
  idleMin: 0.12,
  idleMax: 0.35,
  stuckTime: 0.45,
  radius: 0.42,
  /** Keep off the delivery deck, not the whole ship trigger disc. */
  berthKeep: 2.6,
  shoreKeep: 2.4,
  /** Stay on the grass shelf, not the lagoon cliff. */
  lagoonKeep: 2.2,
  maxStep: 0.42,
  /** Soft body self-light — keep low so the hale doesn't blow the silhouette. */
  bodyGlow: 0.1,
  /** Inner-ear peach on the emissive map. */
  earGlow: 0.28,
  /** Bind-pose face offsets in metres, from the head bone world origin (+X = snout). */
  faceEyeFwd: 0.058,
  faceEyeUp: 0.024,
  faceEyeSide: 0.038,
  faceEyeR: 0.028,
  faceNoseFwd: 0.078,
  faceNoseUp: -0.006,
  faceNoseR: 0.016,
  faceMouthFwd: 0.062,
  faceMouthUp: -0.042,
  faceMouthW: 0.03,
  /** Drifting paw/body motes — rise and fade (süzülme), not a static halo. */
  moteCount: 10,
  moteScale: 0.12,
  moteScaleMin: 0.06,
  moteScaleMax: 0.14,
  moteOpacity: 0.48,
  moteRise: 0.22,
  moteDrift: 0.08,
  moteLifeMin: 1.7,
  moteLifeMax: 3.2,
  moteSpawnY: 0.06,
  moteSpawnR: 0.32,
  moteY: 0.1,
  moteZ: 0.2,
  dustScale: 0.22,
  dustOpacity: 0.38,
  /** Tight, dim aureole — sahip: hale kıs, efektler koyu. */
  haloScale: 1.32,
  haloCoreScale: 0.78,
  haloOpacity: 0.22,
  haloCoreOpacity: 0.28,
  haloY: 0.48,
  homes:
    ACTIVE_PROFILE === "real"
      ? [
          { x: 16, z: -72 },
          { x: -18, z: -88 },
          { x: 10, z: -108 },
        ]
      : [
          { x: 10, z: 15 },
          { x: -8, z: 16 },
        ],
} as const;

/**
 * Bayılma sunum katmanı — `gdd-memory-system.md` §9.1, `art-bible.md` §4.1,
 * `tuning.md` §5.4. Adds on top of the existing 4 haze layers in
 * `render/hazePass.ts` (desaturate/vignette/fog/blur) — does not replace
 * them. Only Lotus Adası runs today, so this is not profile-gated.
 */
export const FX = {
  /** FX_GHOST_OFFSET (px) — max edge double-image pixel offset, high memory only. */
  ghostOffsetPx: 2.5,
  /** FX_BREATH_PERIOD (s) — vignette opacity "breathing" period. */
  breathPeriod: 5.0,
  /** FX_BREATH_AMPLITUDE (0-1) — swing added to the vignette mix, small on purpose. */
  breathAmplitude: 0.04,
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
  /**
   * Elevation at t=0 (degrees). Third-person look-down + FOV 55° leaves a
   * thin sky band; 4.5° sat in the fleet (sun-god read as a nearby creature).
   * ~10° clears the masts and still stays in frame under the HUD clock.
   */
  sunStartDeg: 10,
  /** Elevation at dusk (degrees) — still above the masts, just over the far hills. */
  sunEndDeg: 7,
  /** Remaining seconds when light turns rose / warn toast. */
  warnRemaining: 90,
} as const;

/** Silent lotus-eaters who offer a one-shot gift (tuning.md §6). */
export const LOTOPHAGOS = {
  count: 3,
  get gift(): number {
    return isEdgeRun() ? 1 : 2;
  },
  memCost: 0.2,
  range: 3.2,
  /** World spots near the three harvest pockets. */
  spots: [
    { name: "reed", x: -4.6, z: 7.2 + LAYOUT_SHIFT_Z, faceY: 0.4 },
    { name: "deep", x: 0.4, z: 2.8 + LAYOUT_SHIFT_Z, faceY: Math.PI },
    { name: "cove", x: 5.8, z: -4.8 + LAYOUT_SHIFT_Z, faceY: -2.2 },
  ],
};

/**
 * Live K35 run clock shown in the HUD (docs/ux/screens.md §3.6). Only the
 * numbers the HUD code needs live here; the clock's colours and geometry are
 * ordinary CSS in ui/hud.css, same as every other HUD panel.
 */
export const RUN_CLOCK = {
  /**
   * Opacity floor under the memory haze. The rest of the HUD sinks to 0.18 as
   * forgetting takes hold (that IS the memory system), but this readout is a
   * competition instrument, not a diegetic panel — a speedrunner who cannot
   * read their own time has been punished twice for the same mistake. It still
   * dims, just never past legibility.
   */
  minOpacity: 0.55,
} as const;

/**
 * K35 "Beş yeter" online speedrun leaderboard — the project's only network
 * dependency (docs/design/gdd-lotus-island-run.md §10, Paca LOT-54..59).
 *
 * These numbers are a MIRROR, not the authority: the real gate lives in
 * scripts/supabase/k35-leaderboard.sql. The client copy exists so an obviously
 * invalid submission is caught before a round trip, never as a security
 * boundary — a static client cannot enforce anything (GDD §10.6).
 */
export const NET = {
  leaderboard: {
    /**
     * Abort a submit/fetch after this long. Deliberately larger than
     * FLOW.departSeconds (7 s) so a slow network cannot outlive the departure
     * cinematic the submit is fired behind.
     */
    timeoutMs: 8000,
    /** Rows pulled for the board — one readable screenful (GDD §10.4). */
    topLimit: 20,
    /**
     * Floor for an accepted run, ms. PLACEHOLDER, NOT A MEASUREMENT — chosen
     * deliberately low so no legitimate run is ever rejected. QA replaces it
     * with ~60% of a real measured speedrun (tuning.md §11.6, Paca LOT-59) and
     * must update the SQL in the same pass.
     */
    minTimeMs: 45_000,
    /** Ceiling for an accepted run, ms (2 h) — overflow/garbage filter. */
    maxTimeMs: 7_200_000,
    /** Nick length bounds — byte-for-byte the server rule (GDD §10.4). */
    nickMin: 2,
    nickMax: 16,
  },
  /** localStorage key for the remembered nick. Safari private mode throws on write — always guarded. */
  nickStorageKey: "lotophagoi.k35.nick",
} as const;

/** Hero home hull only — twelve-ship fleet retired (LOT-52). */
export const FLEET = {
  count: 1,
  playerIndex: 0,
  spacing: 3.35,
} as const;

// ------------------------------------------------------------------- visuals
export const RENDER = {
  /** ACES — keep ≤1 so sun + bloom cannot chalk grass (LOT-49). */
  exposure: 1.0,
  bloomStrength: 0.28,
  bloomRadius: 0.42,
  /** Sky / foam / sun disc only — lawn albedo stays under the knee. */
  bloomThreshold: 0.92,
  /** art-bible.md §3 fog `#dfe8ee`. */
  fogColor: 0xdfe8ee,
  fogDensity: profile.fogDensity,
  /**
   * Dusk fog. art-bible.md §2 has no brown in the sky family — the previous
   * `#c9a090` was off-palette mud and, stacked with the cloud photo and the
   * haze grade, flattened the whole dusk frame to one beige. Rose horizon
   * (`#e08a86`) lifted toward the base fog so distance still reads as haze.
   */
  fogDusk: 0xe9b6a8,
  /** art-bible.md §2 gökyüzü zenit `#7fb8dd`. */
  skyTop: 0x7fb8dd,
  /**
   * art-bible.md §2 horizon clock: altın → kehribar → gül. The bible calls
   * this sequence the real time-of-day read, so all three stops live here
   * instead of the two the shader used to lerp between.
   */
  skyHorizon: 0xf5d29a,
  skyHorizonAmber: 0xeeae6a,
  skyHorizonRose: 0xe08a86,
  /**
   * art-bible.md §2 [P] "Zenit mavisi sabit kalır — ışık asla azalmaz."
   * The zenith used to lerp 85% toward a navy `#2a3a6a`, which is what made
   * mid-day read mauve and dusk read grey. Kept as a near-hold; raise only
   * with a game-designer/art-director call, not silently.
   */
  skyTopDuskShift: 0.08,
  skyTopDusk: 0x6f9fc4,
  /** art-bible.md §2 sıcak yön ışığı `#ffcf94`. */
  sunColor: 0xffcf94,
  /**
   * Key, not a blow-out. Hemisphere carries volume so this can sit under
   * the ACES/bloom chalk that 3.1 caused on short grass.
   */
  sunIntensity: 1.85,
  /** Tiny cool floor — bible has no AmbientLight; hemi does the fill. */
  ambientColor: 0x5f7fa8,
  ambientIntensity: 0.12,
  bounceSky: 0xc5dff2,
  /** art-bible.md §2 serin gölge `#5f7fa8` — shadows read blue, not grey. */
  bounceGround: 0x5f7fa8,
  /** art-bible.md §3: gökyüzü ışığı yüksek ve güçlü. */
  bounceIntensity: 0.55,
  /**
   * Upward turquoise fill from the shallows — art-bible.md §3 "sahnenin üçüncü
   * ışığı". Sky channel is unused (black); only the ground colour lifts hulls
   * and character undersides.
   */
  waterBounceIntensity: 0.16,
  /**
   * Shadow camera follows the player (see stage.render). Whole-island ortho
   * at 4.5° sun made 18 cm texels and stair-step acne on the lawn.
   */
  sunShadowDistance: 90,
  shadowExtent: 44,
  shadowFar: 180,
  shadowMapSize: 2048,
  shadowBias: -0.0024,
  shadowNormalBias: 0.1,
} as const;

/**
 * Visible sun (art-bible.md §2 "Güneş halesi `#ffcf80`, bloom kaynağı").
 * The directional light stays close for the shadow camera; this is the disc
 * the player reads as the clock (`game-concept.md` §9.1).
 */
export const SUN_DISK = {
  haloColor: 0xffcf80,
  coreColor: 0xfff6d0,
  /** LOT-50 Helios head — Blender, vertex colour, unlit in sunDisk.ts. */
  mesh: "assets/models/sky_sungod_01_mesh_1200.glb",
  /**
   * World metres from the camera along the sun ray. 48 m sat inside the
   * fleet (parallax = a creature over the water). Past the island, short of
   * the hill ring / far plane.
   */
  distance: 220,
  /** Native face radius 1 m. Angular size ~4° — a sun, not a nearby giant. */
  meshScale: 16,
  /**
   * Disc radius in world units at `distance` (220 m) — an angular size of
   * ~10.8°. The disc used to be *hidden* the moment the GLB loaded, which left
   * the sun with no crisp edge at all: just a soft `pow(sunDot, n)` bloom
   * smear the cream head then disappeared into. It now always draws.
   */
  coreRadius: 42,
  /** Soft outer glow. Carries no edge of its own — it only lifts the sky. */
  haloRadius: 98,
  /**
   * Draw the LOT-50 Helios head inside the disc.
   *
   * **Off by default, and that is an open art-direction question for sahip,
   * not a settled call.** `sky_sungod_01_mesh_1200.glb` is a cartoon
   * smiley-face sun — round face, dot eyes, curved smile, triangular rays. It
   * reads as a weather-app icon and has nothing to do with `art-bible.md`'s
   * Aegean painterly register. Until it is redesigned (which means a Blender
   * regeneration via `scripts/blender/build_sun_god.py`, i.e. an asset step
   * sahip has to approve), the plain painterly disc is the better sun. Flip
   * this to `true` to see the head again — nothing else needs to change.
   */
  showGod: false,
  /**
   * Bronze Helios so the silhouette reads *against* the disc. The old cream
   * `#e2c48a` was lighter than the blown-out sky behind it, so the god was
   * invisible in every sunward frame. Only used when `showGod` is on.
   */
  godDay: 0xb4763c,
  godDusk: 0x8f4f2c,
  /**
   * Sky wash. The disc carries the circle now, so the in-shader core is a
   * near-point highlight (was 28 — broad enough to read as the sun itself and
   * fight the mesh) and the halo is a defined glow rather than the sheet of
   * white that used to swallow the sunward third of the frame (was 7.5/0.28).
   */
  skyCorePower: 140,
  skyHaloPower: 14,
  skyHaloGain: 0.34,
  /** Tint of the in-shader core highlight. Was hardcoded in stage.ts. */
  skyCoreTint: 0xffe9b8,
  skyCoreGain: 0.32,
  /**
   * atan2(z, x). Default camera sits at +Z looking −Z (inland). The HUD sun
   * clock sits in the top-centre of the frame, so the disc is offset east
   * (screen-right) of −Z or it hides behind the widget.
   */
  azimuthStart: -1.22,
  azimuthEnd: -1.48,
} as const;

/**
 * Generated-texture tiling — `docs/art/pipeline.md` §6: tile scale is a
 * meters-per-repeat constant, not eyeballed per mesh. Ground textures are
 * sampled in the terrain shader from world-space XZ (see `terrain.ts`), so
 * these are plain "meters per texture repeat" values independent of the
 * plane's own UV layout.
 */
export const TERRAIN_TEX = {
  /** flora_drygrass_01 (ASSET-032) tuft spacing reads right around this scale. */
  grassTileMeters: 3.4,
  /** sand_gold_01 (ASSET-015, cropped to drop its decorative border). */
  sandTileMeters: 4.5,
  /** sand_wet_01 (ASSET-016), same tiling as dry sand so the blend is seamless. */
  sandWetTileMeters: 4.5,
} as const;

export const SEA_TEX = {
  /**
   * Camera-snapped Gerstner patch (WaterThreeJS / Sean-Bradley pattern).
   * Cell size ≈ patchMeters / segments — must stay well under the shortest
   * wavelength or the surface reads as stained-glass slabs again.
   */
  patchMeters: 400,
  segments: 320,
  /** dirDeg is travel heading in XZ; steepness 0–1; wavelength metres. */
  waves: [
    { dirDeg: 22, steepness: 0.22, wavelength: 36 },
    { dirDeg: 41, steepness: 0.16, wavelength: 20 },
    { dirDeg: -8, steepness: 0.14, wavelength: 11 },
    { dirDeg: 58, steepness: 0.10, wavelength: 6.5 },
  ],
  /** Metres past the coast before chop is full strength. */
  shoreCalm: 22,
  /** Amplitude scale right at the waterline — 0 so Gerstner cannot tear holes in the beach. */
  shoreMin: 0,
  /** How far the sheet overlaps the wet-sand ring (art-bible beach). */
  overlapMeters: 10,
  /** Troughs never drop below this, so sand cannot show through. */
  floorY: 0.05,
  /** Static flood under the Gerstner chop — covers the seafloor to the horizon. */
  floodMeters: 1100,
  floodSegments: 48,
  foamShoreMeters: 11,
  /** Extra Gerstner steepness piled against the hull (shader only). */
  hullChop: 0.7,
  specPower: 72,
  specGain: 0.18,
  /** How much of the sampled wave height the hull rides (0–1). */
  hullFollow: 0.72,
  /** Keel sits this many metres below the sampled surface. */
  hullDraft: 0.4,
  hullPitchFollow: 0.42,
  hullRollFollow: 0.38,
} as const;

/**
 * Mid-ground flora (art-bible.md §6). High density at the lotus/lagoon rim,
 * groves on the hills, open sand left as breathing room. Not gameplay.
 */
export const FLORA = {
  /**
   * LOT-53 density pass. The 160 m `real` island carried a 70 m island's
   * scatter counts, which is most of why sahip read it as empty — every
   * grove/rock family below is one InstancedMesh (or one kit GLB batch), so
   * the extra instances cost draw-call-free vertices, not draw calls. Grass
   * spacing is deliberately NOT tightened: at 0.58 m the field is already the
   * fill-rate ceiling (see `grassFieldSpacing`).
   */
  cypressGroves: ACTIVE_PROFILE === "real" ? 26 : 7,
  cypressPerGrove: ACTIVE_PROFILE === "real" ? 5 : 3,
  oliveGroves: ACTIVE_PROFILE === "real" ? 21 : 6,
  olivePerGrove: ACTIVE_PROFILE === "real" ? 4 : 3,
  rockShore: ACTIVE_PROFILE === "real" ? 76 : 20,
  rockLagoon: ACTIVE_PROFILE === "real" ? 40 : 14,
  rockInland: ACTIVE_PROFILE === "real" ? 88 : 18,
  reedRim: ACTIVE_PROFILE === "real" ? 64 : 24,
  reedPocket: ACTIVE_PROFILE === "real" ? 44 : 20,
  lilyPads: ACTIVE_PROFILE === "real" ? 26 : 12,
  /**
   * 3D grass field. Instance count is the perf budget (hex spacing) — the
   * whole island is one InstancedMesh with frustumCulled off, so tightening
   * spacing cubes fill-rate (0.34 m chalked the frame + UnrealBloom).
   * Short lawn look = squash Y a little and overlap XZ, not more tufts.
   */
  grassFieldSpacing: ACTIVE_PROFILE === "real" ? 0.58 : 0.40,
  /** Native tuft ~0.57 m; ~0.40 → ~23 cm (meadow cut, not reed clumps). */
  grassHeightScale: 0.4,
  /** Wider than tall so neighbours overlap into a sward at the spacing above. */
  grassSpreadScale: 1.55,
  grassSink: 0.02,
  grassSway: 0.03,
  treeMinY: 1.7,
  treeMaxY: 14,
  /** Half of the 42 m hull plus margin so lawn does not grow through the berth. */
  shipKeepout: 26,
  groveRadius: 6.8,
} as const;

export const SHIP_TEX = {
  /** ship_plank_01 (ASSET-018) plank width, in hull-local units (unscaled hull). */
  plankTileUnits: 1.35,
} as const;

export const SKY_TEX = {
  /** hill_backdrop_01 (ASSET-023) — textured ring replacing the two farthest procedural cone layers. */
  hillDistance: ACTIVE_PROFILE === "real" ? 310 : 220,
  /** Keep this a horizon strip. 62 m at 280 m read as a light-blue wall in front of the sun. */
  hillHeight: ACTIVE_PROFILE === "real" ? 32 : 24,
  hillY: 2,
  /** Times the backdrop image repeats around the horizon (it is a single wide shot, not a 360 pan). */
  hillRepeat: 4,
  /** sky_goldenhour_01 (ASSET-022) cloud/horizon detail, blended over the procedural dusk gradient. */
  cloudRadius: 350,
  /**
   * Opacity the sky *photo* reaches at full dusk. Dropped from 0.5 once the
   * procedural deck (`CLOUDS` below) took over cloud duty: at 0.5 this still
   * is a single wide photo stretched over the whole dome, and stacked with
   * dusk fog it was what flattened the dusk frame into one cream wash. It now
   * survives only as a faint horizon-detail wash under the real clouds.
   */
  cloudMaxOpacity: 0.18,
} as const;

/**
 * Procedural cloud deck — `src/render/clouds.ts`.
 *
 * Before this block the game had no cloud system at all: `SKY_TEX` above put a
 * still photo on a second sphere that was fully transparent at t=0, so for
 * most of a run the sky was a bare gradient. Every colour here is derived from
 * an `art-bible.md` §2 hex rather than eyeballed — see the table there.
 */
export const CLOUDS = {
  /** Inside the gradient sphere (360) and the photo sphere (350). */
  domeRadius: 340,
  /** Draw after both sky spheres (−3 gradient, −2 photo), before the world. */
  renderOrder: -1,
  /** Baked once at startup. 512² of value noise costs a few ms of CPU, once. */
  textureSize: 512,
  seed: 20260818,
  /** FBM shape. `baseCells` is the coarsest lattice across one tile. */
  octaves: 5,
  gain: 0.5,
  baseCells: 4,
  /**
   * Coverage threshold — the single most visible knob. Higher = fewer, more
   * separated clouds and more open blue; lower = overcast. `softness` is the
   * width of the ramp above it, i.e. how wispy the edges are.
   */
  coverage: 0.45,
  softness: 0.2,
  /**
   * Deck altitude in metres for the ray→plane projection. Together with the
   * scales below this sets apparent cloud size: taller deck + larger scale =
   * bigger, slower, further clouds.
   */
  planeHeight: 900,
  /** Metres per texture repeat. A = silhouette layer, B = edge-breakup layer. */
  scaleA: 1400,
  scaleB: 520,
  /** UV units per second. ~2 m/s of apparent drift at `scaleA` — a breeze. */
  windA: [0.0016, 0.0009],
  windB: [0.0026, -0.0013],
  /**
   * Elevation (view-ray `y`) where the deck fades in. Kept low on purpose:
   * normal play looks roughly at the horizon, so a high fade-in would mean
   * "clouds exist but only if you look straight up".
   */
  horizonFadeLow: 0.02,
  horizonFadeHigh: 0.14,
  /** Silver lining falloff around the sun. */
  rimPower: 8,
  rimGain: 0.75,
  opacity: 0.92,
  opacityDusk: 0.98,
  /**
   * art-bible.md §2: sunlit face sits just above yelken bezi `#efe6d2`;
   * shaded face is sisli tepe `#8fa5b8` lifted toward zenit `#7fb8dd`; the
   * rim reuses the güneş halesi hex `#ffcf80` exactly.
   */
  litDay: 0xfbf1de,
  shadeDay: 0xb9c9d8,
  rimDay: 0xffcf80,
  /** Dusk: tops toward altın `#f5d29a`, shade toward gül `#e08a86` desaturated. */
  litDusk: 0xf6d3a4,
  shadeDusk: 0xc69a9c,
  rimDusk: 0xe08a86,
} as const;

export const PALETTE = {
  sand: 0xe9cf98,
  sandWet: 0xc7a468,
  grassDry: 0xa8b566,
  grass: 0x7f9c56,
  grassDeep: 0x5e7f45,
  /** Tebeşir beyazı kaya — art-bible.md §2 `#e6e2d4`, tinted by the chalk albedo. */
  rock: 0xe6e2d4,
  marble: 0xeee6d6,
  /** Art-bible.md §2 sığ turkuaz / lazuli derin. */
  seaShallow: 0x3fc8c0,
  /** art-bible.md §2 sığ parlak — dalga tepesi. */
  seaCrest: 0x6fe0d4,
  /** art-bible.md §2 lazuli orta — gemi çevresi. */
  seaMid: 0x1f6fa8,
  seaDeep: 0x14507f,
  seaFoam: 0xfbf7ef,
  /** Art-bible.md §2 iç göl `#5d8f86` — durgun, deniz turkuazı değil. */
  lagoon: 0x5d8f86,
  pad: 0x4e7f44,
  padLight: 0x74a355,
  stem: 0x5f8a4a,
  petalBud: 0xbcd98f,
  petalHalf: 0xf7c9dc,
  petalRipe: 0xfff2f7,
  petalRipeTint: 0xff9ec4,
  petalWilt: 0x8f8577,
  lotusHeart: 0xffd45e,
  hull: 0xc8b49a,
  hullDark: 0x5e3a1e,
  hullTrim: 0xb03a2e,
  /** Causeway stones — bible çakıl/ahşap gölge, not chalk white. */
  causeway: 0x8a7358,
  causewayWet: 0x6b5340,
  sail: 0xf2e4c9,
  cypress: 0x3d5240,
  olive: 0x6b7f4a,
  trunk: 0x6b5136,
  /**
   * Pond frogs (LOT-53). No new colour family — the back is the existing
   * cypress/olive green pair, the belly borrows the bud petal cream and the
   * eye reuses the Thallope's socket dark, so the critters sit inside
   * `art-bible.md` §2 as they are.
   */
  frogBack: 0x51703f,
  frogSpot: 0x3d5240,
  frogBelly: 0xbcd98f,
  frogEye: 0x2a221c,
  /** Sanrı figürleri + unutma pusu ailesi (art-bible.md §2/§4.1) — yeni bir renk ailesi getirilmiyor. */
  hallucination: 0xf6f2ea,
  /**
   * Thallope albedo — warm white (sahip: beyaz + parlak hare). Face stays
   * dark so eyes/nose/mouth still read.
   */
  thallope: 0xf6f2ea,
  /** Whisper of blush on white fur. */
  thallopeSpot: 0xf0d8de,
  /** Inner-ear peach. */
  thallopeEar: 0xffe4c4,
  /** Cream chest. */
  thallopeBelly: 0xfffbf6,
  /** Recessed eye sockets — mockup dark circles. */
  thallopeEye: 0x2a221c,
  /** Catchlight on the eye. */
  thallopeEyeShine: 0xf4ebe0,
  /** Nose bump — mockup pink. */
  thallopeNose: 0xe8a090,
  /** Mouth line. */
  thallopeMouth: 0x3a2a26,
  /** Paw motes + hale — koyu amber, tebeşir altın değil. */
  thallopeGlow: 0xc48a3a,
  thallopeHalo: 0xd4a050,
} as const;
