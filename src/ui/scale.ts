/**
 * Phone landscape shell: fill the visual viewport (popular 20:9 phones, not
 * a letterboxed 16:9 box). HUD scale is relative to iPhone 14 landscape
 * CSS pixels (844×390) — the most common modern phone size — so chrome
 * stays readable without shrinking the 3D view. Desktop (fine pointer)
 * stays full-window. Portrait still hits the rotate gate.
 */

import { UI_FIT } from "../constants";
import { isCoarsePointer } from "./orientation";

export type StageFit = {
  /** True on coarse-pointer phones; overlays use compact landscape CSS. */
  phone: boolean;
  /** HUD chrome scale vs UI_FIT.design (clamped). Canvas ignores this. */
  scale: number;
  width: number;
  height: number;
  left: number;
  top: number;
};

export type SafeInsets = { t: number; r: number; b: number; l: number };

const ZERO_SAFE: SafeInsets = { t: 0, r: 0, b: 0, l: 0 };

function readCssPx(name: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function readSafeInsets(): SafeInsets {
  return {
    t: readCssPx("--safe-t"),
    r: readCssPx("--safe-r"),
    b: readCssPx("--safe-b"),
    l: readCssPx("--safe-l"),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function computeStageFit(
  viewW: number,
  viewH: number,
  viewX: number,
  viewY: number,
  coarse: boolean,
  safe: SafeInsets = ZERO_SAFE,
): StageFit {
  if (!coarse) {
    return {
      phone: false,
      scale: 1,
      width: Math.max(1, Math.round(viewW)),
      height: Math.max(1, Math.round(viewH)),
      left: Math.round(viewX),
      top: Math.round(viewY),
    };
  }

  const availW = Math.max(1, viewW - safe.l - safe.r);
  const availH = Math.max(1, viewH - safe.t - safe.b);
  const raw = Math.min(availW / UI_FIT.designW, availH / UI_FIT.designH);
  return {
    phone: true,
    scale: clamp(raw, UI_FIT.minScale, UI_FIT.maxScale),
    width: Math.max(1, Math.round(availW)),
    height: Math.max(1, Math.round(availH)),
    left: Math.round(viewX + safe.l),
    top: Math.round(viewY + safe.t),
  };
}

export function applyStageFit(fit: StageFit): void {
  const root = document.documentElement;
  root.classList.toggle("ui-fit", fit.phone);
  root.style.setProperty("--ui-scale", fit.scale.toFixed(4));
  root.style.setProperty("--ui-design-w", String(UI_FIT.designW));
  root.style.setProperty("--ui-design-h", String(UI_FIT.designH));
}

/** Pin #app to the visible viewport. Phones fill it; they do not letterbox. */
export function fitGameStage(): StageFit {
  const vv = window.visualViewport;
  const viewW = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
  const viewH = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
  const viewX = Math.round(vv?.offsetLeft ?? 0);
  const viewY = Math.round(vv?.offsetTop ?? 0);
  const fit = computeStageFit(viewW, viewH, viewX, viewY, isCoarsePointer(), readSafeInsets());
  applyStageFit(fit);

  const root = document.documentElement;
  root.style.setProperty("--shell-w", `${fit.width}px`);
  root.style.setProperty("--shell-h", `${fit.height}px`);
  root.style.setProperty("--shell-x", `${fit.left}px`);
  root.style.setProperty("--shell-y", `${fit.top}px`);

  const app = document.getElementById("app");
  if (app) {
    app.style.left = `${fit.left}px`;
    app.style.top = `${fit.top}px`;
    app.style.width = `${fit.width}px`;
    app.style.height = `${fit.height}px`;
  }
  return fit;
}
