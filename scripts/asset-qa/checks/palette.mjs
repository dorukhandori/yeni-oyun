/**
 * C4 — palette conformance (art-bible.md §2, dE2000 <= 12).
 *
 * The reference palette is PARSED OUT OF docs/art/art-bible.md, never copied
 * here. If art-direction changes a hex, this check follows automatically and
 * there is no second source of truth to drift.
 *
 * Decoding happens in Chromium (drawImage -> getImageData), not in Node:
 * half of the shipped assets are WebP, which pngjs cannot read, and the
 * alternatives (sharp native binary, @jsquash wasm) are a heavier dependency
 * than a browser we already need for contrast + regression.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { finding } from "../lib/report.mjs";
import { getBrowser, VIEWPORT } from "../lib/browser.mjs";

export const id = "palette";
export const title = "dominant colours vs. art-bible §2 palette (dE2000 <= 12)";
export const requires = ["playwright", "culori"];

const MAX_DE = 12;
/** How many dominant colours per asset are judged. */
const TOP_N = 5;
/** Ignore buckets that cover less than this share of opaque pixels. */
const MIN_SHARE = 0.04;

/**
 * `_ref_` files never enter the game (pipeline.md §6) and UI chrome is not
 * scene art — art-bible §2 is a *scene* palette. Judging a parchment panel
 * against it would produce noise, not signal.
 */
function isSceneTexture(file, row) {
  if (file.startsWith("ref/")) return false;
  if (file.startsWith("ui/")) return false;
  if (file.endsWith(".glb")) return false;
  if (row && row.class !== "scene-texture") return false;
  return true;
}

/**
 * Pulls every `| label | \`#rrggbb\` | usage |` row out of art-bible §2.
 * @returns {Array<{ hex: string, label: string }>}
 */
export function parsePalette(artBiblePath) {
  const text = readFileSync(artBiblePath, "utf8");
  const out = [];
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*`(#[0-9a-fA-F]{6})`\s*\|/);
    if (!m) continue;
    const hex = m[2].toLowerCase();
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push({ hex, label: m[1].replace(/\*\*/g, "").trim() });
  }
  return out;
}

/** @param {import("../lib/context.mjs").QaContext} ctx */
export async function run(ctx) {
  const { differenceCiede2000, converter } = await import("culori");
  const toLab = converter("lab");
  const de = differenceCiede2000();

  const palette = parsePalette(join(ctx.root, "docs", "art", "art-bible.md"));
  const findings = [];
  const notes = [];

  if (palette.length < 10) {
    return {
      findings: [
        finding("error", "palette/parse", `only ${palette.length} hex entries parsed from art-bible.md §2 — table format changed?`),
      ],
      notes,
    };
  }
  const paletteLab = palette.map((p) => ({ ...p, lab: toLab(p.hex) }));

  const rowByFile = new Map(ctx.shippedRows.map((r) => [r.file, r]));
  const targets = ctx.diskFiles.filter((f) => isSceneTexture(f, rowByFile.get(f)));
  if (!targets.length) return { findings, notes: ["no scene textures to judge"] };

  const { url, browser } = await getBrowser();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    await page.goto(`${url}/`, { waitUntil: "domcontentloaded" });

    for (const file of targets) {
      const row = rowByFile.get(file);
      const aid = row?.asset_id ?? file;

      // Normal maps and caustics are DATA, not colour (pipeline.md §6:
      // "Veri map'lerine dokunma"). Judging a tangent-space normal map's
      // lilac against a scene palette would be a category error.
      const channel = file.includes("_normal_") ? "normal" : file.includes("_caustic_") ? "caustic" : "colour";
      if (channel !== "colour") {
        notes.push(`${aid} skipped — ${channel} map is data, not colour (pipeline.md §6)`);
        continue;
      }

      const buckets = await page.evaluate(async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const w = Math.min(img.naturalWidth, 256);
        const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const cx = cv.getContext("2d", { willReadFrequently: true });
        cx.drawImage(img, 0, 0, w, h);
        const d = cx.getImageData(0, 0, w, h).data;

        // 5-bit-per-channel histogram = cheap, dependency-free median-cut
        // substitute. We only need "which colour families dominate".
        const hist = new Map();
        let opaque = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 200) continue; // transparent / alpha-keyed edge
          opaque++;
          const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
          const e = hist.get(key);
          if (e) {
            e.n++;
            e.r += d[i];
            e.g += d[i + 1];
            e.b += d[i + 2];
          } else {
            hist.set(key, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
          }
        }
        return [...hist.values()]
          .sort((a, b) => b.n - a.n)
          .slice(0, 24)
          .map((e) => ({
            share: e.n / Math.max(1, opaque),
            rgb: [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)],
          }));
      }, `${url}/assets/${file}`);

      // Alpha-heavy sprites and soft gradients spread across many 5-bit
      // buckets, so nothing clears the share floor. Falling back to the plain
      // top-N is better than silently skipping the asset — a skipped asset
      // looks like a pass in the report, which is the worst outcome.
      let judged = buckets.filter((b) => b.share >= MIN_SHARE).slice(0, TOP_N);
      let fallback = false;
      if (!judged.length) {
        judged = buckets.slice(0, TOP_N);
        fallback = true;
      }
      if (!judged.length) {
        notes.push(`${aid}: no opaque pixels to sample — skipped`);
        continue;
      }

      let worst = null;
      for (const b of judged) {
        const hex = `#${b.rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
        const lab = toLab(hex);
        let best = { d: Infinity, label: "?", hex: "?" };
        for (const p of paletteLab) {
          const d = de(lab, p.lab);
          if (d < best.d) best = { d, label: p.label, hex: p.hex };
        }
        if (!worst || best.d > worst.best.d) worst = { bucket: b, hex, best };
      }

      if (worst.best.d > MAX_DE) {
        findings.push(
          finding(
            "warn",
            `palette/off-family/${file}`,
            `${aid}: dominant ${worst.hex} (${(worst.bucket.share * 100).toFixed(0)}% of pixels) is dE ${worst.best.d.toFixed(1)} from its nearest palette entry ${worst.best.hex} "${worst.best.label}" — over ${MAX_DE}`,
            "art-bible.md §2. Either retint the asset or (art-director call) widen the palette.",
          ),
        );
      } else {
        notes.push(
          `${aid.padEnd(10)} worst dE ${worst.best.d.toFixed(1)} -> ${worst.best.hex} "${worst.best.label}"${
            fallback ? " (diffuse — top-N fallback)" : ""
          }`,
        );
      }
    }
  } finally {
    await page.close();
  }

  return { findings, notes };
}
