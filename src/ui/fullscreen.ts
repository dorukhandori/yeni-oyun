/**
 * Phone-browser fullscreen enter/exit, plus a visualViewport shell so the
 * URL bar cannot cover the canvas/HUD when the Fullscreen API is missing
 * (iOS Safari) or the player has left fullscreen.
 *
 * Enter must be called from a user gesture — Title "Oyna" and the corner
 * toggle are those gestures. Landscape lock stays in orientation.ts.
 */

import { isCoarsePointer } from "./orientation";

const BTN_ID = "fsToggle";

type FsEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FsDoc = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
};

function fsDoc(): FsDoc {
  return document as FsDoc;
}

function fsRoot(): FsEl {
  return document.documentElement as FsEl;
}

function fullscreenElement(): Element | null {
  const d = fsDoc();
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

function canRequestFullscreen(): boolean {
  const el = fsRoot();
  return (
    typeof el.requestFullscreen === "function" ||
    typeof el.webkitRequestFullscreen === "function"
  );
}

export function isFullscreen(): boolean {
  return fullscreenElement() !== null;
}

function isStandaloneDisplay(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export async function enterFullscreen(): Promise<boolean> {
  if (isFullscreen()) return true;
  if (!canRequestFullscreen()) return false;
  const el = fsRoot();
  try {
    if (typeof el.requestFullscreen === "function") {
      try {
        await el.requestFullscreen({ navigationUI: "hide" });
      } catch {
        await el.requestFullscreen();
      }
    } else {
      await el.webkitRequestFullscreen?.();
    }
    return isFullscreen();
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen()) return;
  const d = fsDoc();
  try {
    if (typeof document.exitFullscreen === "function") {
      await document.exitFullscreen();
    } else {
      await d.webkitExitFullscreen?.();
    }
  } catch {
    /* browser chrome / gesture rejection */
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (isFullscreen()) await exitFullscreen();
  else await enterFullscreen();
}

/**
 * Call from a user gesture (Title "Oyna", hub island tap). Desktop is left
 * windowed. iOS Safari has no generic Fullscreen API — this then no-ops and
 * the visualViewport shell is the fallback.
 */
export async function requestPlayFullscreen(): Promise<void> {
  if (!isCoarsePointer()) return;
  await enterFullscreen();
}

function fitShell(): void {
  const vv = window.visualViewport;
  const w = vv?.width ?? window.innerWidth;
  const h = vv?.height ?? window.innerHeight;
  const x = vv?.offsetLeft ?? 0;
  const y = vv?.offsetTop ?? 0;
  const root = document.documentElement;
  root.style.setProperty("--shell-w", `${Math.round(w)}px`);
  root.style.setProperty("--shell-h", `${Math.round(h)}px`);
  root.style.setProperty("--shell-x", `${Math.round(x)}px`);
  root.style.setProperty("--shell-y", `${Math.round(y)}px`);
}

function onVisualViewport(): void {
  fitShell();
  // stage.ts already listens to window.resize; visualViewport changes do not
  // always fire it (URL-bar show/hide), so poke the renderer after fitting.
  window.dispatchEvent(new Event("resize"));
}

function syncToggle(btn: HTMLButtonElement): void {
  const on = isFullscreen();
  btn.classList.toggle("is-fs", on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  const label = on ? "Tam ekrandan çık" : "Tam ekran";
  btn.setAttribute("aria-label", label);
  btn.title = label;
  const show = !isStandaloneDisplay() && (canRequestFullscreen() || on);
  btn.hidden = !show;
  document.body.classList.toggle("has-fs-toggle", show);
}

export function mountFullscreenShell(): void {
  if (document.getElementById(BTN_ID)) return;

  document.documentElement.classList.add("shell-fit");
  fitShell();
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onVisualViewport);
  vv?.addEventListener("scroll", onVisualViewport);
  window.addEventListener("resize", fitShell);

  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.type = "button";
  btn.className = "fs-toggle";
  btn.innerHTML = `
    <span class="fs-icon fs-icon-enter" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>
      </svg>
    </span>
    <span class="fs-icon fs-icon-exit" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 8H3V3M16 8h5V3M8 16H3v5M16 16h5v5"/>
      </svg>
    </span>
  `;
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    void toggleFullscreen();
  });
  const host = document.getElementById("app") ?? document.body;
  host.appendChild(btn);

  const onFsChange = (): void => {
    syncToggle(btn);
    onVisualViewport();
  };
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);
  window.matchMedia("(pointer: coarse)").addEventListener("change", () => syncToggle(btn));
  syncToggle(btn);
}
