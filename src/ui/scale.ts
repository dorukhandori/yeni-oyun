/**
 * Phone landscape contain-fit: keep the authored 16:9 stage and scale it
 * into the visible viewport (letterbox on 20:9 phones / 4:3 tablets).
 *
 * Desktop (fine pointer) is left full-window so asset-qa at 1280×720 and
 * ordinary monitors do not change. Portrait phones still hit the rotate
 * gate in orientation.ts — this module only sizes the landscape shell.
 */

import { UI_FIT } from "../constants";
import { isCoarsePointer } from "./orientation";

export type StageFit = {
  /** True when the 16:9 contain stage is active. */
  contain: boolean;
  /** CSS scale that maps the 1280×720 overlay onto the stage. */
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
      contain: false,
      scale: 1,
      width: Math.max(1, Math.round(viewW)),
      height: Math.max(1, Math.round(viewH)),
      left: Math.round(viewX),
      top: Math.round(viewY),
    };
  }

  const availW = Math.max(1, viewW - safe.l - safe.r);
  const availH = Math.max(1, viewH - safe.t - safe.b);
  const scale = Math.min(availW / UI_FIT.designW, availH / UI_FIT.designH);
  const width = Math.max(1, Math.round(UI_FIT.designW * scale));
  const height = Math.max(1, Math.round(UI_FIT.designH * scale));
  return {
    contain: true,
    scale,
    width,
    height,
    left: Math.round(viewX + safe.l + (availW - width) / 2),
    top: Math.round(viewY + safe.t + (availH - height) / 2),
  };
}

export function applyStageFit(fit: StageFit): void {
  const root = document.documentElement;
  root.classList.toggle("ui-fit", fit.contain);
  root.style.setProperty("--ui-scale", fit.scale.toFixed(4));
  root.style.setProperty("--ui-design-w", String(UI_FIT.designW));
  root.style.setProperty("--ui-design-h", String(UI_FIT.designH));
}

/** Size #app to the visual viewport, contain-fitting 16:9 on phones. */
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
