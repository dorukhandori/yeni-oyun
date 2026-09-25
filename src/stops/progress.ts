/**
 * Which stops the player has cleared — the only state that survives between
 * stops (K40: stops are independent; the one thing carried is the unlock).
 * Plan step 2b: "Lotus bir kez bitince Kiklop kalıcı açılır."
 *
 * localStorage can throw (Safari private mode, blocked site data) or come
 * back empty; every access is guarded and a failed read means "nothing
 * cleared yet", never a crash. A failed write is reported to the caller so
 * the UI does not claim a save that did not happen.
 */

export const PROGRESS_STORAGE_KEY = "lotophagoi.progress.v1";

export interface StopProgress {
  lotusCleared: boolean;
  cyclopsCleared: boolean;
  sirensCleared: boolean;
}

export type ClearableStop = "lotus" | "cyclops" | "sirens";

/** Minimal storage surface — `window.localStorage` in the game, a Map-backed fake in tests. */
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const EMPTY: StopProgress = { lotusCleared: false, cyclopsCleared: false, sirensCleared: false };

function defaultStorage(): ProgressStorage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Parse a stored value; anything malformed reads as "nothing cleared". */
export function parseProgress(raw: string | null): StopProgress {
  if (!raw) return { ...EMPTY };
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return { ...EMPTY };
    const o = v as Record<string, unknown>;
    return {
      lotusCleared: o.lotusCleared === true,
      cyclopsCleared: o.cyclopsCleared === true,
      sirensCleared: o.sirensCleared === true,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function readProgress(storage: ProgressStorage | null = defaultStorage()): StopProgress {
  if (!storage) return { ...EMPTY };
  try {
    return parseProgress(storage.getItem(PROGRESS_STORAGE_KEY));
  } catch {
    return { ...EMPTY };
  }
}

export interface MarkResult {
  progress: StopProgress;
  saved: boolean;
}

/** Returns the new progress and whether it actually reached storage. */
export function markCleared(stop: ClearableStop, storage: ProgressStorage | null = defaultStorage()): MarkResult {
  const prev = readProgress(storage);
  const progress: StopProgress = {
    ...prev,
    ...(stop === "lotus" ? { lotusCleared: true } : stop === "cyclops" ? { cyclopsCleared: true } : { sirensCleared: true }),
  };
  if (!storage) return { progress, saved: false };
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    return { progress, saved: true };
  } catch (err) {
    console.warn("[progress] could not save stop progress", err);
    return { progress, saved: false };
  }
}

/** Cyclops opens once Lotus has been cleared (K40, sahip 24 Ağu). */
export function cyclopsUnlocked(p: StopProgress): boolean {
  return p.lotusCleared;
}

/** Sirens opens once Cyclops has been cleared (K40 chain). */
export function sirensUnlocked(p: StopProgress): boolean {
  return p.cyclopsCleared;
}

/** URL that boots the Lotus page straight onto the Hub map (read by game.ts). */
export const HUB_URL = "./?to=hub";
/** URL that boots the Lotus page on the Title screen. */
export const TITLE_URL = "./";

export function wantsHubOnBoot(search: string): boolean {
  return new URLSearchParams(search).get("to") === "hub";
}
