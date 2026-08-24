/**
 * Phone landscape shell: fill the visual viewport edge-to-edge. Safe-area
 * (Dynamic Island / home indicator) is for HUD chrome only — shrinking
 * #app by those insets left light-blue pillarbox on iPhone 17 Pro Max.
 * HUD scale is relative to iPhone 14 landscape CSS (844×390). Desktop
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

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function computeStageFit(
  viewW: number,
  viewH: number,
  viewX: number,
  viewY: number,
  coarse: boolean,
): StageFit {
  const width = Math.max(1, Math.round(viewW));
  const height = Math.max(1, Math.round(viewH));
  const left = Math.round(viewX);
  const top = Math.round(viewY);
  if (!coarse) {
    return { phone: false, scale: 1, width, height, left, top };
  }
  const raw = Math.min(width / UI_FIT.designW, height / UI_FIT.designH);
  return {
    phone: true,
    scale: clamp(raw, UI_FIT.minScale, UI_FIT.maxScale),
    width,
    height,
    left,
    top,
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
  const fit = computeStageFit(viewW, viewH, viewX, viewY, isCoarsePointer());
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
