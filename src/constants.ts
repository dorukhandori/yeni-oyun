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
    ship: { pos: { x: 0, z: -140 }, range: 4.0 },
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
  /** K35 forget: min metres from the previous berth. */
  relocateMin: 40,
  /** K35 forget: min metres from the player. */
  relocatePlayerMin: 25,
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
   * re-baked. Clips: `preset:idle`/`preset:walk`/`preset:run`, 2026-08-17.
   */
  meshRig: "assets/models/char_doryseus_02_rig_8000.glb",
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
   * Elevation at t=0 (degrees). Third-person look-down + FOV 55° leaves only
   * ~8–11° of sky above the world horizon; anything higher is off the top
   * of the frame (the disc read as a few haze pixels on the hills). Stay
   * inside that band for the whole afternoon→dusk clock.
   */
  sunStartDeg: 4.5,
  /** Elevation at dusk (degrees) — still a fat disc, just over the far hills. */
  sunEndDeg: 2.2,
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
  fogDensity: profile.fogDensity,
  skyTop: 0x2f86c9,
  skyHorizon: 0xffe6c2,
  sunColor: 0xfff0cc,
  sunIntensity: 3.1,
  ambientColor: 0xa8c8f0,
  ambientIntensity: 0.4,
  bounceSky: 0x8ecbff,
  bounceGround: 0xd9b478,
  bounceIntensity: 0.36,
  /**
   * Upward turquoise fill from the shallows — art-bible.md §3 "sahnenin üçüncü
   * ışığı". Sky channel is unused (black); only the ground colour lifts hulls
   * and character undersides.
   */
  waterBounceIntensity: 0.26,
} as const;

/**
 * Visible sun (art-bible.md §2 "Güneş halesi `#ffcf80`, bloom kaynağı").
 * The directional light stays close for the shadow camera; this is the disc
 * the player reads as the clock (`game-concept.md` §9.1).
 */
export const SUN_DISK = {
  haloColor: 0xffcf80,
  coreColor: 0xfff6d0,
  /**
   * Metres from the camera. Far plane is 600; keep this close so the disc
   * is large in screen space and cannot be clipped.
   */
  distance: 48,
  /** World-unit diameters at `distance` (~10° core; hale stays tight so bloom doesn't erase the rim). */
  coreScale: 8.4,
  haloScale: 11.5,
  /** Mild sky wash — the opaque disc carries the readable circle. */
  skyCorePower: 22,
  skyHaloPower: 4.5,
  skyHaloGain: 0.55,
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
  /** water_shallow_01 (ASSET-012) ripple wavelength. */
  shallowNormalTileMeters: 6.5,
  shallowNormalStrength: 0.55,
  /** water_lake_01 (ASSET-033) — slower, calmer ripple than the open sea. */
  lakeNormalTileMeters: 7.5,
  lakeNormalStrength: 0.22,
  /** water_foam_01 (ASSET-013) repeats around the coastline ring. */
  foamRepeatX: 30,
  /** water_caustic_01 (ASSET-014), additive shimmer over the shallows. */
  causticTileMeters: 3.2,
  causticScrollSpeed: 0.035,
  causticOpacity: 0.55,
  /** Stylized Gerstner-ish vertex waves (art-bible.md §1 NOT photoreal). */
  waveAmpA: 0.22,
  waveAmpB: 0.16,
  waveAmpC: 0.1,
  /** Lake caustic — much weaker so the lagoon does not read as sea. */
  lakeCausticOpacity: 0.1,
} as const;

/**
 * Mid-ground flora (art-bible.md §6). High density at the lotus/lagoon rim,
 * groves on the hills, open sand left as breathing room. Not gameplay.
 */
export const FLORA = {
  cypressGroves: ACTIVE_PROFILE === "real" ? 14 : 6,
  cypressPerGrove: ACTIVE_PROFILE === "real" ? 5 : 3,
  oliveGroves: ACTIVE_PROFILE === "real" ? 11 : 5,
  olivePerGrove: ACTIVE_PROFILE === "real" ? 4 : 3,
  rockShore: ACTIVE_PROFILE === "real" ? 52 : 18,
  rockLagoon: ACTIVE_PROFILE === "real" ? 32 : 12,
  rockInland: ACTIVE_PROFILE === "real" ? 40 : 14,
  reedRim: ACTIVE_PROFILE === "real" ? 64 : 24,
  reedPocket: ACTIVE_PROFILE === "real" ? 44 : 20,
  lilyPads: ACTIVE_PROFILE === "real" ? 26 : 12,
  grassTufts: ACTIVE_PROFILE === "real" ? 72 : 28,
  treeMinY: 1.7,
  treeMaxY: 14,
  shipKeepout: 18,
  groveRadius: 6.8,
} as const;

export const SHIP_TEX = {
  /** ship_plank_01 (ASSET-018) plank width, in hull-local units (unscaled hull). */
  plankTileUnits: 1.35,
} as const;

export const SKY_TEX = {
  /** hill_backdrop_01 (ASSET-023) — textured ring replacing the two farthest procedural cone layers. */
  hillDistance: ACTIVE_PROFILE === "real" ? 280 : 205,
  hillHeight: ACTIVE_PROFILE === "real" ? 62 : 46,
  hillY: 4,
  /** Times the backdrop image repeats around the horizon (it is a single wide shot, not a 360 pan). */
  hillRepeat: 4,
  /** sky_goldenhour_01 (ASSET-022) cloud/horizon detail, blended over the procedural dusk gradient. */
  cloudRadius: 350,
  /** Opacity the cloud layer reaches at full dusk (t=1); 0 at t=0, matching today's look exactly. */
  cloudMaxOpacity: 0.5,
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
  hull: 0x8f5d33,
  hullDark: 0x5e3a1e,
  hullTrim: 0xb03a2e,
  sail: 0xf2e4c9,
  cypress: 0x3d5240,
  olive: 0x6b7f4a,
  trunk: 0x6b5136,
  /** Sanrı figürleri + unutma pusu ailesi (art-bible.md §2/§4.1) — yeni bir renk ailesi getirilmiyor. */
  hallucination: 0xf6f2ea,
} as const;
