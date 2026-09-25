import type { Input } from "../systems/input";

/**
 * Shared DOM chrome for the self-contained stops (Cyclops, Sirens): the
 * existing Lotus `#pause` sheet and its touch toggle, driven without Lotus's
 * `Hud` class (whose constructor expects Lotus's own `#hud` children).
 * Stops are page loads (constants.ts ACTIVE_STOP), so Hub/Title are navigation.
 */

export interface PauseHandlers {
  onRestart(): void;
  onHub(): void;
  onTitle(): void;
  /** Pausing is refused while an end card is up. */
  canPause(): boolean;
}

export interface PauseControl {
  readonly paused: boolean;
  set(on: boolean): void;
  toggle(): void;
}

function must(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[stopChrome] #${id} missing — index.html changed`);
  return el;
}

export function mountPause(input: Input, h: PauseHandlers): PauseControl {
  const sheet = must("pause");
  const heading = document.getElementById("pauseHeading");
  let paused = false;
  const set = (on: boolean): void => {
    const next = on && h.canPause();
    paused = next;
    sheet.hidden = !next;
    input.lockBlocked = next;
    if (next) {
      document.exitPointerLock?.();
      if (heading) heading.textContent = "Duraklatıldı";
      must("pauseResume").focus();
    }
  };
  must("pauseResume").addEventListener("click", () => set(false));
  must("pauseRestart").addEventListener("click", () => {
    set(false);
    h.onRestart();
  });
  must("pauseHub").addEventListener("click", () => h.onHub());
  must("pauseTitle").addEventListener("click", () => h.onTitle());
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) set(false);
  });
  const toggleBtn = document.getElementById("pauseToggle");
  if (toggleBtn) {
    toggleBtn.hidden = false;
    toggleBtn.addEventListener("click", () => set(!paused));
  }
  return {
    get paused() {
      return paused;
    },
    set,
    toggle: () => set(!paused),
  };
}

/** Hide the Lotus Title/Hub DOM a stop boots over. */
export function hideLotusMenus(): void {
  for (const id of ["titleScreen", "hubScreen"]) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }
}
