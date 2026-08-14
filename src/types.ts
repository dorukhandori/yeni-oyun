export type LotusStage = "bud" | "half" | "ripe" | "wilt" | "gone";

/**
 * "lost" = soft loss (test profile): timed card, auto-respawn at ship.
 * "gameover" = hard loss (real profile): full forgetting ends the run, only
 * a manual restart continues (see WORLD.lossMode in constants.ts).
 * "title" = Welcome/menu screen, boot state. "hub" = island-select screen
 * (docs/ux/screens.md §1/§3) — both freeze the world entirely (see the
 * early-return guard in game.ts's step()); no movement, camera, memory, day
 * clock, or world-object animation runs while in either.
 */
export type Phase = "title" | "hub" | "play" | "departing" | "won" | "lost" | "dusk" | "gameover";

export interface GameState {
  phase: Phase;
  /** Ripe blooms in the basket. */
  carried: number;
  /** Ripe blooms stowed aboard the ship. */
  delivered: number;
  /** 0 = clear headed, 1 = lotus-drunk. */
  memory: number;
  /** Seconds spent pinned at full memory. */
  lostTimer: number;
  /** 0..1 departure animation progress. */
  depart: number;
  /** Countdown while the "you forgot" card is up. */
  cardTimer: number;
  /** Seconds since dawn (caps at DAY.length). */
  dayTime: number;
  /** World-space player position (XZ, y omitted — minimap/HUD only needs the ground plane). Updated every step() while playing. */
  playerX: number;
  playerZ: number;
}
