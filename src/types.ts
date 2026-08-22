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
  /** K35: no memory gain while > 0 after a forget event. */
  forgetIframes: number;
  /** 0..1 departure animation progress. */
  depart: number;
  /** Countdown while the "you forgot" card is up. */
  cardTimer: number;
  /** Seconds since dawn (caps at DAY.length). */
  dayTime: number;
  /**
   * K35 speedrun clock, in fixed 60 Hz simulation steps — NOT seconds and NOT
   * wall clock (gdd-lotus-island-run.md §10.2). `dayTime` cannot be used: on
   * K35 it wraps modulo DAY.length, so it is not monotonic.
   *
   * Ticks only while `phase` is "play" or "departing"; the departure cinematic
   * counts because the finish moment is the "won" transition, not startDepart()
   * (GDD §10.1 H3 — sahip's ruling, and the reason FLOW.departSeconds lands in
   * every score). Reset only in fullRestart(); the forget event deliberately
   * never touches it (H1).
   */
  runSteps: number;
  /** World-space player position (XZ, y omitted — minimap/HUD only needs the ground plane). Updated every step() while playing. */
  playerX: number;
  playerZ: number;
  /**
   * K35 opening: shore-stone ritual completed (rebuild GDD §10a A0).
   * Classic 12-lotus starts true so the guide arrow keeps today's behaviour.
   * Edge / Beş yeter starts false; flips true when the shore stones return "done".
   */
  shoreFound: boolean;
}
