/**
 * C6 — screenshot regression (benchmark §5 criterion 3, <= 0.1% pixels).
 *
 * Determinism comes from three seams, all of which had to exist first:
 *   1. game.ts already runs a fixed 60 Hz step (STEP = 1000/60).
 *   2. `setPhase("play", { seed })` pins the lotus field RNG.
 *   3. `freeze()` stops the simulation, so haze.time / sea / bloom uniforms
 *      hold and composer.render() emits the same frame every rAF tick.
 * Chromium runs WebGL on SwiftShader (see lib/browser.mjs) — a software
 * rasteriser is reproducible across machines in a way a GPU driver is not.
 *
 * Baselines live in scripts/asset-qa/baselines/*.png and ARE meant to be
 * committed: a baseline you cannot diff in review is not a baseline. Diff
 * images land in .asset-qa-out/ (gitignored scratch) when a shot fails.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { finding } from "../lib/report.mjs";
import { openScene, VIEWPORT } from "../lib/browser.mjs";

export const id = "regression";
export const title = "screenshot regression vs. baseline (<= 0.1% pixels)";
export const requires = ["playwright", "pixelmatch", "pngjs"];

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = join(HERE, "..", "baselines");
const OUT_DIR = join(HERE, "..", "..", "..", ".asset-qa-out");

/** Fraction of differing pixels that fails the shot. */
const MAX_DIFF_RATIO = 0.001;
/** Per-pixel colour tolerance handed to pixelmatch (0..1). */
const PIXEL_THRESHOLD = 0.1;

/**
 * The shot list. Deliberately small: every shot is a file someone has to eyeball
 * when it legitimately changes. Two DOM screens + the 3D scene at the four
 * forgetting thresholds the memory GDD cares about.
 */
const SHOTS = [
  { name: "title", phase: "title", profile: "test" },
  { name: "hub", phase: "hub", profile: "test" },
  { name: "play-mem00", phase: "play", profile: "test", memory: 0.0 },
  { name: "play-mem50", phase: "play", profile: "test", memory: 0.5 },
  { name: "play-mem75", phase: "play", profile: "test", memory: 0.75 },
  { name: "play-mem95", phase: "play", profile: "test", memory: 0.95 },
];

/** @param {import("../lib/context.mjs").QaContext} _ctx */
export async function run(_ctx) {
  const pixelmatch = (await import("pixelmatch")).default;
  const { PNG } = await import("pngjs");

  const findings = [];
  const notes = [];
  const writeBaselines = process.argv.includes("--update-baseline");
  mkdirSync(BASELINE_DIR, { recursive: true });

  for (const shot of SHOTS) {
    const { page, errors } = await openScene(shot);
    let shotBuf;
    try {
      for (const e of errors) {
        findings.push(finding("error", `regression/pageerror/${shot.name}`, `${shot.name}: page error — ${e}`));
      }
      shotBuf = await page.screenshot({ type: "png", animations: "disabled" });
    } finally {
      await page.close();
    }

    const baselinePath = join(BASELINE_DIR, `${shot.name}.png`);

    if (!existsSync(baselinePath)) {
      if (writeBaselines) {
        writeFileSync(baselinePath, shotBuf);
        notes.push(`${shot.name}: baseline created`);
      } else {
        findings.push(
          finding(
            "warn",
            `regression/no-baseline/${shot.name}`,
            `${shot.name}: no baseline yet`,
            "node scripts/asset-qa/run.mjs --update-baseline creates it (then eyeball the PNG before committing)",
          ),
        );
      }
      continue;
    }

    const actual = PNG.sync.read(shotBuf);
    const expected = PNG.sync.read(readFileSync(baselinePath));

    if (actual.width !== expected.width || actual.height !== expected.height) {
      findings.push(
        finding(
          "error",
          `regression/size/${shot.name}`,
          `${shot.name}: ${actual.width}x${actual.height} vs baseline ${expected.width}x${expected.height}`,
          `viewport is pinned to ${VIEWPORT.width}x${VIEWPORT.height} — a mismatch means the baseline predates that`,
        ),
      );
      continue;
    }

    const diff = new PNG({ width: actual.width, height: actual.height });
    const changed = pixelmatch(expected.data, actual.data, diff.data, actual.width, actual.height, {
      threshold: PIXEL_THRESHOLD,
    });
    const ratio = changed / (actual.width * actual.height);

    if (ratio > MAX_DIFF_RATIO) {
      mkdirSync(OUT_DIR, { recursive: true });
      const diffPath = join(OUT_DIR, `${shot.name}.diff.png`);
      writeFileSync(diffPath, PNG.sync.write(diff));
      writeFileSync(join(OUT_DIR, `${shot.name}.actual.png`), shotBuf);
      if (writeBaselines) {
        writeFileSync(baselinePath, shotBuf);
        notes.push(`${shot.name}: baseline updated (${(ratio * 100).toFixed(3)}% was over limit)`);
      } else {
        findings.push(
          finding(
            "error",
            `regression/diff/${shot.name}`,
            `${shot.name}: ${(ratio * 100).toFixed(3)}% of pixels changed (limit ${(MAX_DIFF_RATIO * 100).toFixed(1)}%)`,
            `diff written to .asset-qa-out/${shot.name}.diff.png — if the change is intended, --update-baseline`,
          ),
        );
      }
    } else {
      notes.push(`${shot.name.padEnd(12)} ${(ratio * 100).toFixed(3)}% changed`);
      if (writeBaselines) writeFileSync(baselinePath, shotBuf);
    }
  }

  return { findings, notes };
}
