import { describe, expect, it } from "vitest";
import {
  CYCLOPS_CRUSH_CAP,
  DETECT_MAX,
  crushShock,
  departureLedger,
  departureVerdict,
  detectGlow,
  detectRate,
  hideSpotAt,
  isHidden,
  shockFlashAt,
  stepDetect,
  type DetectInputs,
} from "../cyclopsRules";

const base: DetectInputs = {
  phase: "out",
  room: "depot",
  lit: false,
  moving: false,
  crawling: false,
  giantNearAndAwake: false,
};

describe("detectRate (gdd-cyclops-blinding §4.0)", () => {
  it("is zero when still in shadow — safety is instant (§8 criterion 3)", () => {
    expect(detectRate({ ...base, phase: "present", room: "inner" })).toBe(0);
  });

  it("reaches DETECT_MAX in ~11.1 s moving in shadow in the inner nook during PRESENT (§8 criterion 4)", () => {
    const rate = detectRate({ ...base, phase: "present", room: "inner", moving: true });
    expect(rate).toBe(9);
    expect(DETECT_MAX / rate).toBeCloseTo(11.1, 1);
  });

  it("does not apply the PRESENT room multiplier in the depot", () => {
    expect(detectRate({ ...base, phase: "present", room: "depot", moving: true })).toBe(3);
  });

  it("stacks the proximity multiplier on top of the room multiplier (§8 criterion 5)", () => {
    expect(detectRate({ ...base, phase: "present", room: "pens", moving: true, giantNearAndAwake: true })).toBe(18);
  });

  it("applies the RETURN multiplier and the crawl reduction", () => {
    expect(detectRate({ ...base, phase: "return", lit: true, moving: true })).toBe(18);
    expect(detectRate({ ...base, phase: "return", lit: true, moving: true, crawling: true })).toBeCloseTo(7.2);
  });
});

describe("stepDetect", () => {
  it("clamps growth at DETECT_MAX", () => {
    expect(stepDetect(99, 12, 1)).toBe(DETECT_MAX);
  });
  it("decays only when the rate is zero, never below 0", () => {
    expect(stepDetect(10, 0, 0.5)).toBe(6);
    expect(stepDetect(1, 0, 1)).toBe(0);
  });
});

describe("hide spots", () => {
  const spots = [
    { x: 5, z: 20, radius: 1.4 },
    { x: -5, z: 60, radius: 1.4 },
  ];
  it("finds the spot the player stands in", () => {
    expect(hideSpotAt(5.5, 20.5, spots)).toBe(spots[0]);
    expect(hideSpotAt(0, 20, spots)).toBeNull();
  });
  it("counts as hidden only when still inside a spot", () => {
    expect(isHidden(true, false)).toBe(true);
    expect(isHidden(true, true)).toBe(false);
    expect(isHidden(false, false)).toBe(false);
  });
});

describe("crushShock — escalates, 3rd is heaviest (bitiş sözleşmesi)", () => {
  it("grows strictly with each crush up to the cap", () => {
    const a = crushShock(1);
    const b = crushShock(2);
    const c = crushShock(CYCLOPS_CRUSH_CAP);
    expect(b.shake).toBeGreaterThan(a.shake);
    expect(c.shake).toBeGreaterThan(b.shake);
    expect(c.flashPeak).toBeGreaterThan(b.flashPeak);
    expect(c.flashPeak).toBeLessThanOrEqual(1);
  });
  it("fades over at least 1.5 s (plan §6 step 7)", () => {
    for (let n = 1; n <= CYCLOPS_CRUSH_CAP; n++) expect(crushShock(n).fadeSeconds).toBeGreaterThanOrEqual(1.5);
  });
  it("clamps counts outside 1..cap", () => {
    expect(crushShock(0)).toEqual(crushShock(1));
    expect(crushShock(9)).toEqual(crushShock(CYCLOPS_CRUSH_CAP));
  });
  it("flash rises in 200 ms then fades to 0", () => {
    const s = crushShock(1);
    expect(shockFlashAt(s, 0)).toBe(0);
    expect(shockFlashAt(s, 0.2)).toBeCloseTo(s.flashPeak);
    expect(shockFlashAt(s, 0.2 + s.fadeSeconds + 0.01)).toBe(0);
  });
});

describe("detectGlow", () => {
  it("is DETECT / DETECT_MAX clamped to 0..1", () => {
    expect(detectGlow(-5)).toBe(0);
    expect(detectGlow(50)).toBe(0.5);
    expect(detectGlow(500)).toBe(1);
  });
});

describe("departure card", () => {
  it("lists delivered, closings survived and mm:ss time", () => {
    expect(departureLedger({ delivered: 4, target: 4, closingsSurvived: 2, seconds: 245.9 })).toEqual([
      "Gemiye taşınan azık: 4 / 4",
      "Atlattığın kapanma: 2",
      "Süre: 4:05",
    ]);
  });
  it("praises a no-crush run", () => {
    expect(departureVerdict(0)).toMatch(/bir kez bile/);
    expect(departureVerdict(2)).toMatch(/İki kez/);
  });
});
