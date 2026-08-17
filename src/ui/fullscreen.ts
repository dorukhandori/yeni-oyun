/**
 * Phone-browser fullscreen enter/exit, plus a visualViewport shell so the
 * URL bar cannot cover the canvas/HUD.
 *
 * Native Fullscreen API works on Android Chrome and iPad Safari. iPhone Safari
 * still does not implement Element.requestFullscreen (Apple, through iOS 26) —
 * there the same button enters a CSS immersive fit that pins #app to the
 * visible viewport and nudges Safari to collapse its toolbar.
 *
 * Enter must be called from a user gesture — Title "Oyna" and the corner
 * toggle are those gestures. Landscape lock stays in orientation.ts.
 */

import { isCoarsePointer } from "./orientation";

const BTN_ID = "fsToggle";
const REFIT_DELAYS_MS = [50, 250, 500];

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

function isCssImmersive(): boolean {
  return document.documentElement.classList.contains("is-immersive");
}

export function isFullscreen(): boolean {
  return fullscreenElement() !== null || isCssImmersive();
}

function isStandaloneDisplay(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function setCssImmersive(on: boolean): void {
  document.documentElement.classList.toggle("is-immersive", on);
}

async function tryNativeEnter(): Promise<boolean> {
  if (fullscreenElement()) return true;
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
    return fullscreenElement() !== null;
  } catch {
    return false;
  }
}

async function tryNativeExit(): Promise<void> {
  if (!fullscreenElement()) return;
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

/**
 * iPhone cannot hide Safari chrome via the Fullscreen API. A user-gesture
 * scroll of 1px is the remaining way to ask the toolbar to collapse; we then
 * pin #app to the (now larger) visual viewport.
 */
function nudgeSafariToolbar(): void {
  const html = document.documentElement;
  html.classList.add("shell-nudge");
  const grow = Math.max(window.innerHeight, window.screen.height) + 64;
  document.body.style.height = `${grow}px`;
  window.scrollTo(0, 1);
  window.setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.style.height = "";
    html.classList.remove("shell-nudge");
    onVisualViewport();
  }, 60);
}

function scheduleRefits(): void {
  for (const ms of REFIT_DELAYS_MS) {
    window.setTimeout(onVisualViewport, ms);
  }
}

export async function enterFullscreen(): Promise<boolean> {
  if (isFullscreen()) {
    onVisualViewport();
    return true;
  }
  await tryNativeEnter();
  setCssImmersive(true);
  nudgeSafariToolbar();
  scheduleRefits();
  syncMountedToggle();
  return isFullscreen();
}

export async function exitFullscreen(): Promise<void> {
  setCssImmersive(false);
  await tryNativeExit();
  onVisualViewport();
  syncMountedToggle();
}

export async function toggleFullscreen(): Promise<void> {
  if (isFullscreen()) await exitFullscreen();
  else await enterFullscreen();
}

/**
 * Call from a user gesture (Title "Oyna", hub island tap). Desktop is left
 * windowed. iPhone uses the CSS immersive fit because the native API is absent.
 */
export async function requestPlayFullscreen(): Promise<void> {
  if (!isCoarsePointer()) return;
  await enterFullscreen();
}

function fitShell(): void {
  const vv = window.visualViewport;
  const w = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
  const h = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
  const x = Math.round(vv?.offsetLeft ?? 0);
  const y = Math.round(vv?.offsetTop ?? 0);
  const root = document.documentElement;
  root.style.setProperty("--shell-w", `${w}px`);
  root.style.setProperty("--shell-h", `${h}px`);
  root.style.setProperty("--shell-x", `${x}px`);
  root.style.setProperty("--shell-y", `${y}px`);
  const app = document.getElementById("app");
  if (app) {
    app.style.left = `${x}px`;
    app.style.top = `${y}px`;
    app.style.width = `${w}px`;
    app.style.height = `${h}px`;
  }
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
  const show = !isStandaloneDisplay();
  btn.hidden = !show;
  document.body.classList.toggle("has-fs-toggle", show);
}

function syncMountedToggle(): void {
  const btn = document.getElementById(BTN_ID) as HTMLButtonElement | null;
  if (btn) syncToggle(btn);
}

export function mountFullscreenShell(): void {
  if (document.getElementById(BTN_ID)) return;

  document.documentElement.classList.add("shell-fit");
  fitShell();
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onVisualViewport);
  vv?.addEventListener("scroll", onVisualViewport);
  window.addEventListener("resize", fitShell);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(onVisualViewport, 400);
  });
  window.addEventListener("pageshow", onVisualViewport);

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
    if (!fullscreenElement()) setCssImmersive(false);
    syncToggle(btn);
    onVisualViewport();
  };
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);
  window.matchMedia("(pointer: coarse)").addEventListener("change", () => syncToggle(btn));
  syncToggle(btn);
}
