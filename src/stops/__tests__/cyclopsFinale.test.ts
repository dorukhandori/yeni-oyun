import { describe, expect, it } from "vitest";
import {
  FINALE_HARDEN_SECONDS,
  FINALE_STAKE_COOL_SECONDS,
  giantPassedOut,
  initialFinale,
  stepFinale,
  type FinaleState,
  type FinaleWorld,
} from "../cyclopsFinale";

const world = (over: Partial<FinaleWorld> = {}): FinaleWorld => ({
  dt: 1 / 60,
  player: { x: 0, z: 0 },
  interact: false,
  interactHeld: false,
  delivered: 0,
  target: 4,
  giant: { pos: { x: 0, z: 20 }, visible: true, awake: true },
  hearth: { x: -4, z: 35 },
  hearthRadius: 2.2,
  stakeHome: { x: 5, z: 30 },
  wineHome: { x: 2, z: -38 },
  sheep: [],
  atShip: false,
  ...over,
});

const at = (s: Partial<FinaleState>): FinaleState => ({ ...initialFinale(), ...s });

describe("cyclops finale (gdd-cyclops-finale.md §4)", () => {
  it("wine appears only after the delivery target (criterion 1)", () => {
    expect(stepFinale(initialFinale(), world({ delivered: 3 })).events).toEqual([]);
    const r = stepFinale(initialFinale(), world({ delivered: 4 }));
    expect(r.state.stage).toBe("wine");
    expect(r.events).toEqual(["wineAppeared"]);
  });

  it("wine is taken at the ship and only given to an awake, near, visible giant (criterion 2)", () => {
    const took = stepFinale(at({ stage: "wine" }), world({ player: { x: 2, z: -38 }, interact: true }));
    expect(took.state.carry).toBe("wine");
    const carrying = took.state;
    const asleep = world({ player: { x: 0, z: 17 }, interact: true, giant: { pos: { x: 0, z: 20 }, visible: true, awake: false } });
    expect(stepFinale(carrying, asleep).events).toEqual([]);
    const far = world({ player: { x: 0, z: 10 }, interact: true });
    expect(stepFinale(carrying, far).events).toEqual([]);
    const given = stepFinale(carrying, world({ player: { x: 0, z: 17 }, interact: true }));
    expect(given.events).toEqual(["wineGiven"]);
    expect(given.state.stage).toBe("stake");
    expect(giantPassedOut(given.state.stage)).toBe(true);
  });

  it("the stake must be held in the fire for FINALE_HARDEN_SECONDS (criterion 4)", () => {
    let s = stepFinale(at({ stage: "stake" }), world({ player: { x: 5, z: 30 }, interact: true })).state;
    expect(s.stage).toBe("harden");
    const fire = world({ player: { x: -4, z: 34 }, interactHeld: true, dt: 0.5 });
    const steps = Math.round(FINALE_HARDEN_SECONDS / 0.5);
    let events: string[] = [];
    for (let i = 0; i < steps; i++) ({ state: s, events } = stepFinale(s, fire));
    expect(s.stage).toBe("blind");
    expect(events).toEqual(["stakeHot"]);
    // holding E away from the fire does nothing
    const cold = stepFinale(at({ stage: "harden", carry: "stake" }), world({ player: { x: 10, z: 34 }, interactHeld: true, dt: 5 }));
    expect(cold.state.heat).toBe(0);
  });

  it("a cooled stake goes back to the fire", () => {
    const r = stepFinale(at({ stage: "blind", carry: "stake", heat: 1, hotT: 0.1 }), world({ dt: 0.2 }));
    expect(r.state.stage).toBe("harden");
    expect(r.state.heat).toBe(0);
    expect(r.events).toEqual(["stakeCooled"]);
    expect(FINALE_STAKE_COOL_SECONDS).toBeGreaterThan(10);
  });

  it("blinding needs the giant within reach and starts the escape (criterion 5)", () => {
    const hot = at({ stage: "blind", carry: "stake", heat: 1, hotT: 30 });
    expect(stepFinale(hot, world({ player: { x: 0, z: 50 }, interact: true, giant: { pos: { x: 0, z: 60 }, visible: true, awake: false } })).events).toEqual([]);
    const r = stepFinale(hot, world({ player: { x: 0, z: 57.5 }, interact: true, giant: { pos: { x: 0, z: 60 }, visible: true, awake: false } }));
    expect(r.events).toEqual(["blinded"]);
    // an awake (still staggering) giant cannot be blinded
    const awake = stepFinale(hot, world({ player: { x: 0, z: 57.5 }, interact: true, giant: { pos: { x: 0, z: 60 }, visible: true, awake: true } }));
    expect(awake.events).toEqual([]);
    expect(r.state.stage).toBe("escape");
    expect(r.state.carry).toBe("none");
  });

  it("clings to the nearest sheep, releases on E, escapes past the door", () => {
    const sheep = [{ x: 5, z: 10 }, { x: 0.5, z: 8 }];
    const c = stepFinale(at({ stage: "escape" }), world({ player: { x: 0, z: 8 }, interact: true, sheep }));
    expect(c.state.clingSheep).toBe(1);
    expect(stepFinale(c.state, world({ interact: true, player: { x: 0, z: 8 }, sheep })).events).toEqual(["released"]);
    const out = stepFinale(c.state, world({ player: { x: 0, z: -5 }, sheep }));
    expect(out.state.stage).toBe("sail");
    expect(out.events).toEqual(["released", "escaped"]);
  });

  it("sails only at the ship (criterion 7)", () => {
    expect(stepFinale(at({ stage: "sail" }), world({ interact: true, atShip: false })).events).toEqual([]);
    const r = stepFinale(at({ stage: "sail" }), world({ interact: true, atShip: true }));
    expect(r.state.stage).toBe("done");
    expect(r.events).toEqual(["sailed"]);
  });
});
