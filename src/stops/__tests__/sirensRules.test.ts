import { describe, expect, it } from "vitest";
import {
  SIRENS_HULL_CAP,
  SIRENS_HULL_RADIUS,
  SIRENS_ISLE,
  SIRENS_KNEAD_SECONDS,
  SIRENS_STRAIT_LENGTH,
  freeGapAt,
  generateStrait,
  initialSirens,
  pluggedCount,
  songIntensity,
  stepDeck,
  stepPassage,
  type DeckWorld,
  type SirensState,
} from "../sirensRules";

const deck = (over: Partial<DeckWorld> = {}): DeckWorld => ({
  dt: 1 / 60,
  player: { x: 0, z: 0 },
  interact: false,
  interactHeld: false,
  honeycomb: { x: 1, z: -3 },
  kneadSpot: { x: 0, z: -5 },
  rowers: [{ x: -1, z: 1 }, { x: 1, z: 2 }, { x: -1, z: 3 }],
  mast: { x: 0, z: 0.5 },
  ...over,
});
const st = (over: Partial<SirensState>): SirensState => ({ ...initialSirens(), ...over });

describe("sirens deck (gdd-sirens-passage §4.1–2)", () => {
  it("cannot plug a rower before the wax is kneaded", () => {
    const withWax = stepDeck(initialSirens(), deck({ player: { x: 1, z: -3 }, interact: true })).state;
    expect(withWax.hasWax).toBe(true);
    expect(stepDeck(withWax, deck({ player: { x: -1, z: 1 }, interact: true })).events).toEqual([]);
  });

  it("kneading takes SIRENS_KNEAD_SECONDS of holding E at the sunlit stern", () => {
    let s = st({ hasWax: true });
    const hold = deck({ player: { x: 0, z: -5 }, interactHeld: true, dt: 0.5 });
    const events: string[] = [];
    for (let i = 0; i < SIRENS_KNEAD_SECONDS / 0.5; i++) {
      const r = stepDeck(s, hold);
      s = r.state;
      events.push(...r.events);
    }
    expect(s.knead).toBe(1);
    expect(events).toEqual(["waxKneaded"]);
  });

  it("plugs each rower once, then moves to bind; bind needs the mast", () => {
    let s = st({ hasWax: true, knead: 1 });
    const once = stepDeck(s, deck({ player: { x: -1, z: 1 }, interact: true }));
    expect(pluggedCount(once.state)).toBe(1);
    expect(stepDeck(once.state, deck({ player: { x: -1, z: 1 }, interact: true })).events).toEqual([]);
    s = stepDeck(once.state, deck({ player: { x: 1, z: 2 }, interact: true })).state;
    s = stepDeck(s, deck({ player: { x: -1, z: 3 }, interact: true })).state;
    expect(s.stage).toBe("bind");
    expect(stepDeck(s, deck({ player: { x: 3, z: 3 }, interact: true })).events).toEqual([]);
    const bound = stepDeck(s, deck({ player: { x: 0, z: 0.5 }, interact: true }));
    expect(bound.events).toEqual(["bound"]);
    expect(bound.state.stage).toBe("passage");
  });
});

describe("sirens passage (§4.3–5)", () => {
  const sail = (s: SirensState, steer: number, seconds: number, rocks = [] as ReturnType<typeof generateStrait>) => {
    const events: string[] = [];
    for (let t = 0; t < seconds; t += 1 / 30) {
      const r = stepPassage(s, { dt: 1 / 30, steer, rocks });
      s = r.state;
      events.push(...r.events);
    }
    return { s, events };
  };

  it("the song pulls a hands-off ship toward the isle", () => {
    const start = st({ stage: "passage", ship: { x: 0, z: SIRENS_ISLE.z - 60 } });
    expect(songIntensity(start.ship)).toBeGreaterThan(0.4);
    const { s } = sail(start, 0, 4);
    expect(s.ship.x).toBeGreaterThan(5);
  });

  it("full rudder away beats the song", () => {
    const start = st({ stage: "passage", ship: { x: 0, z: SIRENS_ISLE.z - 60 } });
    const { s } = sail(start, -1, 4);
    expect(s.ship.x).toBeLessThan(-2);
  });

  it("a rock hit costs one hull point, with grace; the cap sinks the ship", () => {
    const rock = [{ x: 0, z: 10, r: 3 }];
    const first = sail(st({ stage: "passage", ship: { x: 0, z: 0 } }), 0, 1.5, rock);
    expect(first.s.hull).toBe(1);
    expect(first.events.filter((e) => e === "hit")).toHaveLength(1);
    const sunk = stepPassage(st({ stage: "passage", hull: SIRENS_HULL_CAP - 1, ship: { x: 0, z: 9 } }), { dt: 1 / 30, steer: 0, rocks: rock });
    expect(sunk.events).toEqual(["hit", "sunk"]);
  });

  it("reaching the end of the strait clears the stop", () => {
    const r = stepPassage(st({ stage: "passage", ship: { x: 0, z: SIRENS_STRAIT_LENGTH - 0.1 } }), { dt: 0.1, steer: 0, rocks: [] });
    expect(r.events).toEqual(["cleared"]);
    expect(r.state.stage).toBe("clear");
  });
});

describe("generateStrait", () => {
  it("is deterministic", () => {
    expect(generateStrait(7)).toEqual(generateStrait(7));
  });
  it("always leaves a lane wider than the hull", () => {
    const rocks = generateStrait();
    for (let z = 0; z <= SIRENS_STRAIT_LENGTH; z += 2) {
      expect(freeGapAt(z, rocks)).toBeGreaterThan(SIRENS_HULL_RADIUS * 2 + 4);
    }
  });
});
