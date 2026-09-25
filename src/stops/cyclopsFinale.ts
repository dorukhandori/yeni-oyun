/**
 * Cyclops Cave — Homeric finale state machine (docs/design/gdd-cyclops-finale.md).
 * Pure: no THREE, no DOM. `cyclopsStop.ts` feeds it the world each frame and
 * reacts to the events it returns (giant behaviour, props, HUD lines).
 *
 * gather → wine → stake → harden ⇄ blind → escape → sail → done
 */

export const FINALE_WINE_OFFER_RADIUS = 4.0;
export const FINALE_HARDEN_SECONDS = 2.5;
export const FINALE_STAKE_COOL_SECONDS = 45;
export const FINALE_INTERACT_RADIUS = 1.6;
export const FINALE_BLIND_RADIUS = 3.5;
export const FINALE_GUARD_HEAR_RADIUS = 7.0;
export const FINALE_GUARD_ATTACK_INTERVAL = 1.6;
export const FINALE_SHEEP_SPEED = 1.6;
export const FINALE_ESCAPE_Z = -4;
export const FINALE_BOULDER_INTERVAL = 3.0;
export const FINALE_BOULDER_TELEGRAPH_SECONDS = 1.4;
export const FINALE_BOULDER_RADIUS = 2.2;

export type FinaleStage = "gather" | "wine" | "stake" | "harden" | "blind" | "escape" | "sail" | "done";
export type FinaleCarry = "none" | "wine" | "stake";

export interface Vec2 {
  x: number;
  z: number;
}

export interface FinaleState {
  readonly stage: FinaleStage;
  readonly carry: FinaleCarry;
  /** Hardening progress at the hearth, 0..1. */
  readonly heat: number;
  /** Seconds until the hot stake cools (only meaningful in `blind`). */
  readonly hotT: number;
  /** Index of the sheep the player clings to, or null. */
  readonly clingSheep: number | null;
}

export interface FinaleWorld {
  dt: number;
  player: Vec2;
  /** One-shot E this frame. */
  interact: boolean;
  /** E held this frame. */
  interactHeld: boolean;
  delivered: number;
  target: number;
  giant: { pos: Vec2; visible: boolean; awake: boolean };
  hearth: Vec2;
  hearthRadius: number;
  stakeHome: Vec2;
  wineHome: Vec2;
  sheep: readonly Vec2[];
  atShip: boolean;
}

export type FinaleEvent =
  | "wineAppeared"
  | "wineTaken"
  | "wineGiven"
  | "stakeTaken"
  | "stakeHot"
  | "stakeCooled"
  | "blinded"
  | "clung"
  | "released"
  | "escaped"
  | "sailed";

export interface FinaleStep {
  state: FinaleState;
  events: FinaleEvent[];
}

export function initialFinale(): FinaleState {
  return { stage: "gather", carry: "none", heat: 0, hotT: 0, clingSheep: null };
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Index of the nearest point within `radius`, or null. */
export function nearestWithin(from: Vec2, points: readonly Vec2[], radius: number): number | null {
  let best: number | null = null;
  let bestD = radius;
  points.forEach((p, i) => {
    const d = dist(from, p);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

export function stepFinale(s: FinaleState, w: FinaleWorld): FinaleStep {
  switch (s.stage) {
    case "gather":
      return w.delivered >= w.target ? { state: { ...s, stage: "wine" }, events: ["wineAppeared"] } : { state: s, events: [] };

    case "wine":
      if (!w.interact) return { state: s, events: [] };
      if (s.carry === "none" && dist(w.player, w.wineHome) <= FINALE_INTERACT_RADIUS) {
        return { state: { ...s, carry: "wine" }, events: ["wineTaken"] };
      }
      if (
        s.carry === "wine" &&
        w.giant.visible &&
        w.giant.awake &&
        dist(w.player, w.giant.pos) <= FINALE_WINE_OFFER_RADIUS
      ) {
        return { state: { ...s, carry: "none", stage: "stake" }, events: ["wineGiven"] };
      }
      return { state: s, events: [] };

    case "stake":
      if (w.interact && dist(w.player, w.stakeHome) <= FINALE_INTERACT_RADIUS) {
        return { state: { ...s, carry: "stake", stage: "harden", heat: 0 }, events: ["stakeTaken"] };
      }
      return { state: s, events: [] };

    case "harden": {
      const atFire = dist(w.player, w.hearth) <= w.hearthRadius;
      if (!(w.interactHeld && atFire)) return { state: s, events: [] };
      const heat = Math.min(1, s.heat + w.dt / FINALE_HARDEN_SECONDS);
      if (heat < 1) return { state: { ...s, heat }, events: [] };
      return { state: { ...s, heat: 1, stage: "blind", hotT: FINALE_STAKE_COOL_SECONDS }, events: ["stakeHot"] };
    }

    case "blind": {
      if (w.interact && !w.giant.awake && dist(w.player, w.giant.pos) <= FINALE_BLIND_RADIUS) {
        return { state: { ...s, carry: "none", stage: "escape", hotT: 0 }, events: ["blinded"] };
      }
      const hotT = s.hotT - w.dt;
      if (hotT <= 0) return { state: { ...s, stage: "harden", heat: 0, hotT: 0 }, events: ["stakeCooled"] };
      return { state: { ...s, hotT }, events: [] };
    }

    case "escape": {
      if (w.player.z < FINALE_ESCAPE_Z) {
        const events: FinaleEvent[] = s.clingSheep !== null ? ["released", "escaped"] : ["escaped"];
        return { state: { ...s, stage: "sail", clingSheep: null }, events };
      }
      if (!w.interact) return { state: s, events: [] };
      if (s.clingSheep !== null) return { state: { ...s, clingSheep: null }, events: ["released"] };
      const i = nearestWithin(w.player, w.sheep, FINALE_INTERACT_RADIUS);
      return i === null ? { state: s, events: [] } : { state: { ...s, clingSheep: i }, events: ["clung"] };
    }

    case "sail":
      return w.interact && w.atShip ? { state: { ...s, stage: "done" }, events: ["sailed"] } : { state: s, events: [] };

    case "done":
      return { state: s, events: [] };
  }
}

/** The giant is passed out (drunk) from wine until blinded — no detect, no crush. */
export function giantPassedOut(stage: FinaleStage): boolean {
  return stage === "stake" || stage === "harden" || stage === "blind";
}

/** One objective line per stage for the quest panel (Turkish, player-facing). */
export function finaleObjective(s: FinaleState): string | null {
  switch (s.stage) {
    case "gather":
      return null;
    case "wine":
      return s.carry === "wine" ? "Şarabı deve sun — uyanıkken, yakınında E" : "Gemideki şarap tulumunu al";
    case "stake":
      return "Dev sızdı. Ağıllardaki zeytin kazığını al";
    case "harden":
      return "Kazığın ucunu ocakta kızdır — E basılı tut";
    case "blind":
      return "Kızgın kazığı uyuyan devin gözüne sapla";
    case "escape":
      return s.clingSheep !== null ? "Koyunun altındasın — kıpırdama, geç" : "Kör dev kapıda. Bir koyunun altına tutun (E)";
    case "sail":
      return "Gemiye koş — E ile yelken aç";
    case "done":
      return null;
  }
}
