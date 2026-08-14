export const STEP = 1000 / 60;

/** World units per map cell. */
export const CELL = 1.5;

/** Ceiling height of the cave shell. */
export const CAVE_H = 5;

export const PLAYER = {
  speed: 4.2,
  accel: 26,
  radius: 0.4,
  turnLerp: 0.18,
} as const;

export const CAMERA = {
  fov: 52,
  /** Distance behind the creature. */
  dist: 6.4,
  height: 2.5,
  lookHeight: 1.45,
  lerp: 0.12,
  yawStart: 0,
  pitchStart: 0.08,
  pitchMin: -0.08,
  pitchMax: 0.5,
  mouseSens: 0.0032,
  keySens: 0.035,
} as const;

export const INTERACT_RANGE = 2.6;

/** Growth ticks at 60 Hz. */
export const GROW_TICKS = {
  seed: 90,
  sprout: 140,
  grow: 160,
} as const;

export const PRICES = {
  seedBuy: 4,
  cropSell: 12,
} as const;

export const START = {
  coins: 24,
  seeds: 6,
  stamina: 4,
  maxStamina: 4,
} as const;

/** Cool cave / warm lantern palette lifted from the reference frame. */
export const PALETTE = {
  fog: 0x140c22,
  rock: 0x3b3448,
  rockDeep: 0x241f31,
  rockWarm: 0x5a3a34,
  moss: 0x2c3a34,
  soil: 0x3a2a1e,
  soilTilled: 0x54402c,
  soilWet: 0x2a1d14,
  plank: 0x6b4527,
  plankDark: 0x40281a,
  water: 0x11565c,
  waterGlow: 0x1f8f8a,
  crystal: 0x8b5cf6,
  crystalHot: 0xc9a6ff,
  lantern: 0xff8a3c,
  lanternCore: 0xffd9a0,
  ambient: 0x2b2447,
  tunic: 0xc4382a,
  cream: 0xf3e4c6,
  wing: 0xd77bff,
  sprout: 0x7ddf8a,
  ripe: 0x9dffd0,
} as const;
