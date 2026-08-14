export type LotusStage = "bud" | "half" | "ripe" | "wilt" | "gone";

export type Phase = "play" | "departing" | "won" | "lost" | "dusk";

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
}
