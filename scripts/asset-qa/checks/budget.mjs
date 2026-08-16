/**
 * C3 — size budget (pipeline.md §6 "Teknik butce").
 *
 *   texture <= 300 KB · UI ikonu <= 30 KB · backdrop/sky <= 600 KB
 *   spritesheet <= 500 KB · toplam ilk indirme <= 8 MB
 *
 * The per-file class is derived from the folder the file lives in, which is
 * the same taxonomy pipeline.md §6 uses for the folder scheme. `ref/` files
 * are excluded from the total: pipeline.md §6 says `_ref_` never enters the
 * game — but they DO sit in public/, so they are reported separately rather
 * than silently ignored.
 */

import { finding } from "../lib/report.mjs";

export const id = "budget";
export const title = "file size / download budget (pipeline.md §6)";
export const requires = [];

const KB = 1024;
const CAPS = {
  textures: 300 * KB,
  sprites: 300 * KB,
  spritesheets: 500 * KB,
  skybox: 600 * KB,
  models: 400 * KB,
  ui: 300 * KB, // UI *icons* are 30 KB; panels/backdrops are not icons — see UI_ICON_HINT
  ref: Infinity,
};
const UI_ICON_CAP = 30 * KB;
const TOTAL_CAP = 8 * 1024 * KB;

const fmt = (n) => (n >= KB * KB ? `${(n / KB / KB).toFixed(2)} MB` : `${(n / KB).toFixed(0)} KB`);

/** @param {import("../lib/context.mjs").QaContext} ctx */
export async function run(ctx) {
  const findings = [];
  const notes = [];
  let shippedTotal = 0;
  let refTotal = 0;
  let pngBytes = 0;
  const pngFiles = [];
  const perFolder = new Map();

  for (const file of ctx.diskFiles) {
    const folder = file.includes("/") ? file.slice(0, file.indexOf("/")) : "";
    const bytes = ctx.sizes.get(file) ?? 0;
    perFolder.set(folder, (perFolder.get(folder) ?? 0) + bytes);

    if (folder === "ref") {
      refTotal += bytes;
    } else {
      shippedTotal += bytes;
    }

    const cap = CAPS[folder] ?? 300 * KB;
    if (bytes > cap) {
      findings.push(
        finding(
          "warn",
          `budget/oversize/${file}`,
          `'${file}' is ${fmt(bytes)} — over the ${fmt(cap)} cap for ${folder}/`,
          "pipeline.md §6: uretim PNG -> oyuna giren WebP",
        ),
      );
    }

    // A PNG under public/assets/ is almost always an un-converted production
    // file. Aggregated into one finding — 13 separate INFO lines is noise, one
    // line with the recoverable total is a decision.
    if (file.endsWith(".png") && folder !== "ref" && bytes > UI_ICON_CAP) {
      pngFiles.push(file);
      pngBytes += bytes;
    }
  }

  if (pngFiles.length) {
    findings.push(
      finding(
        "info",
        "budget/png-not-webp",
        `${pngFiles.length} file(s) still ship as PNG, ${fmt(pngBytes)} total — WebP conversion is the documented step`,
        "pipeline.md §6: uretim PNG -> oyuna giren WebP. Existing conversions in this repo hit 10-95% savings.",
      ),
    );
  }

  if (shippedTotal > TOTAL_CAP) {
    findings.push(
      finding(
        "error",
        "budget/total-download",
        `public/assets/ ships ${fmt(shippedTotal)}, over the ${fmt(TOTAL_CAP)} first-download target`,
      ),
    );
  }

  const folders = [...perFolder.entries()].sort((a, b) => b[1] - a[1]).map(([f, b]) => `${f || "."}=${fmt(b)}`);
  notes.push(`shipped total ${fmt(shippedTotal)} / ${fmt(TOTAL_CAP)} · ref-only (excluded) ${fmt(refTotal)}`);
  notes.push(`by folder: ${folders.join("  ")}`);
  return { findings, notes };
}
