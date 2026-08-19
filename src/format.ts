/**
 * Display formatting shared across layers. Leaf module on purpose — no imports,
 * so the HUD (src/ui), the Hub menu (src/ui) and the network client (src/net)
 * can all use it without any of them depending on each other.
 */

/**
 * MM:SS.cc — the ONE run-time format in the game (gdd-lotus-island-run.md
 * §10.4). Used by the live K35 HUD clock, the win card and the leaderboard, so
 * the number a runner watches tick up is the same string that lands in the
 * table. Pair it with `font-variant-numeric: tabular-nums` in CSS or the digits
 * jitter as they change.
 *
 * Minutes are NOT wrapped at 60: a 90-minute run reads "90:00.00", not
 * "30:00.00" — a silently wrapped clock is worse than an ugly one.
 *
 * Truncates rather than rounds (`Math.floor` on centiseconds): a clock that
 * shows 00:01.00 while 0.996 s have passed reads as if it jumped ahead.
 */
export function formatRunTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const cs = Math.floor(total / 10) % 100;
  const s = Math.floor(total / 1000) % 60;
  const m = Math.floor(total / 60000);
  const p2 = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `${p2(m)}:${p2(s)}.${p2(cs)}`;
}
