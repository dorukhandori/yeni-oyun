import { describe, expect, it } from "vitest";
import {
  PROGRESS_STORAGE_KEY,
  cyclopsUnlocked,
  markCleared,
  parseProgress,
  readProgress,
  wantsHubOnBoot,
  type ProgressStorage,
} from "../progress";

function memoryStorage(): ProgressStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("stop progress", () => {
  it("starts with nothing cleared and Cyclops locked", () => {
    const p = readProgress(memoryStorage());
    expect(p).toEqual({ lotusCleared: false, cyclopsCleared: false });
    expect(cyclopsUnlocked(p)).toBe(false);
  });

  it("clearing Lotus persists and unlocks Cyclops", () => {
    const s = memoryStorage();
    const r = markCleared("lotus", s);
    expect(r.saved).toBe(true);
    expect(cyclopsUnlocked(readProgress(s))).toBe(true);
  });

  it("clearing Cyclops keeps the Lotus flag", () => {
    const s = memoryStorage();
    markCleared("lotus", s);
    markCleared("cyclops", s);
    expect(readProgress(s)).toEqual({ lotusCleared: true, cyclopsCleared: true });
  });

  it("reads malformed or foreign data as nothing cleared", () => {
    expect(parseProgress("not json")).toEqual({ lotusCleared: false, cyclopsCleared: false });
    expect(parseProgress("[1,2]")).toEqual({ lotusCleared: false, cyclopsCleared: false });
    expect(parseProgress('{"lotusCleared":"yes"}')).toEqual({ lotusCleared: false, cyclopsCleared: false });
  });

  it("reports saved:false when storage throws, without throwing", () => {
    const broken: ProgressStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(readProgress(broken).lotusCleared).toBe(false);
    const r = markCleared("lotus", broken);
    expect(r.saved).toBe(false);
    expect(r.progress.lotusCleared).toBe(true);
  });

  it("reports saved:false with no storage at all", () => {
    expect(markCleared("cyclops", null).saved).toBe(false);
  });

  it("stores under the versioned key", () => {
    const s = memoryStorage();
    markCleared("lotus", s);
    expect(s.data.has(PROGRESS_STORAGE_KEY)).toBe(true);
  });
});

describe("wantsHubOnBoot", () => {
  it("is true only for ?to=hub", () => {
    expect(wantsHubOnBoot("?to=hub")).toBe(true);
    expect(wantsHubOnBoot("?to=title")).toBe(false);
    expect(wantsHubOnBoot("")).toBe(false);
  });
});
