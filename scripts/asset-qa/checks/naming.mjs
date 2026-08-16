/**
 * C2 — naming convention + declared-vs-actual resolution (pipeline.md §6).
 *
 * Rule: kategori_ad_varyant_kanal_cozunurluk.uzanti — lowercase, '_' separator,
 * two-digit variant, resolution from the fixed ladder 256/512/1024/2048.
 *
 * Also cross-checks the filename's resolution token and the manifest's
 * `resolution` column against the real pixel dimensions read from the file
 * header (zero-dep PNG/WebP reader). A file named _512 that is actually 1344px
 * silently blows the texture budget.
 */

import { finding } from "../lib/report.mjs";
import { imageSize } from "../lib/imageSize.mjs";

export const id = "naming";
export const title = "file naming + resolution ladder (pipeline.md §6)";
export const requires = [];

const CATEGORIES = new Set([
  "lotus", "flora", "water", "sand", "rock", "ship", "hill", "sky", "ui", "char", "fx",
]);
const CHANNELS = new Set([
  "albedo", "normal", "rough", "emissive", "alpha", "caustic", "sheet", "ref",
]);
const LADDER = new Set([256, 512, 1024, 2048]);

/** `sand_gold_01_albedo_512.webp` -> parts, or null if it does not fit the grammar. */
export function parseAssetName(base) {
  const dot = base.lastIndexOf(".");
  if (dot < 0) return null;
  const stem = base.slice(0, dot);
  const ext = base.slice(dot + 1);
  const parts = stem.split("_");
  if (parts.length < 5) return null;
  const resolution = Number(parts[parts.length - 1]);
  const channel = parts[parts.length - 2];
  const variant = parts[parts.length - 3];
  const category = parts[0];
  const name = parts.slice(1, parts.length - 3).join("_");
  if (!Number.isFinite(resolution) || !name) return null;
  return { category, name, variant, channel, resolution, ext, stem };
}

/** @param {import("../lib/context.mjs").QaContext} ctx */
export async function run(ctx) {
  const findings = [];
  const notes = [];
  const nonNumericRes = [];
  let sheetCount = 0;
  const rowByFile = new Map(ctx.shippedRows.map((r) => [r.file, r]));

  for (const file of ctx.diskFiles) {
    const base = file.slice(file.lastIndexOf("/") + 1);

    if (base !== base.toLowerCase()) {
      findings.push(finding("error", `naming/uppercase/${file}`, `'${file}' contains uppercase characters`));
    }

    const p = parseAssetName(base);
    if (!p) {
      findings.push(
        finding(
          "warn",
          `naming/shape/${file}`,
          `'${file}' does not fit kategori_ad_varyant_kanal_cozunurluk.uzanti`,
          "pipeline.md §6",
        ),
      );
      continue;
    }

    if (!CATEGORIES.has(p.category)) {
      findings.push(finding("warn", `naming/category/${file}`, `'${file}': unknown category '${p.category}'`));
    }
    if (!CHANNELS.has(p.channel)) {
      findings.push(finding("warn", `naming/channel/${file}`, `'${file}': unknown channel '${p.channel}'`));
    }
    if (!/^\d{2}$/.test(p.variant)) {
      findings.push(finding("warn", `naming/variant/${file}`, `'${file}': variant '${p.variant}' is not two digits`));
    }
    if (!LADDER.has(p.resolution)) {
      findings.push(
        finding(
          "warn",
          `naming/ladder/${file}`,
          `'${file}': resolution ${p.resolution} is off the 256/512/1024/2048 ladder`,
          "pipeline.md §6: ara deger icat edilmez",
        ),
      );
    }

    // filename token vs. actual pixels.
    //
    // The token means "nominal source resolution", not "longest edge" — several
    // shipped assets were legitimately cropped smaller after alpha-keying
    // (flora_lilypad 547x643 from a 512-nominal source). So only the EXCEEDS
    // direction is a finding: a file that claims 512 and is actually 1024
    // silently doubles texture memory. Spritesheets are exempt entirely —
    // their token is the frame height, not the sheet width (see sheetNote).
    if (p.channel === "sheet") {
      sheetCount++;
      continue;
    }
    const size = imageSize(ctx.abs(file));
    if (!size) {
      notes.push(`${file}: dimensions unreadable (format not supported by the zero-dep reader)`);
      continue;
    }
    const longest = Math.max(size.width, size.height);
    if (longest > p.resolution) {
      findings.push(
        finding(
          "warn",
          `naming/oversize-vs-name/${file}`,
          `'${file}' claims ${p.resolution} but is actually ${size.width}x${size.height} — costs ${(
            (longest / p.resolution) ** 2
          ).toFixed(1)}x the declared texture memory`,
        ),
      );
    }

    // filename vs. manifest resolution column, numeric rows only
    const row = rowByFile.get(file);
    const declared = Number(row?.resolution);
    if (row && row.resolution && Number.isFinite(declared) && declared !== p.resolution) {
      findings.push(
        finding(
          "warn",
          `naming/manifest-res/${file}`,
          `${row.asset_id}: manifest resolution '${row.resolution}' != filename '${p.resolution}'`,
        ),
      );
    }
    if (row && row.resolution && !Number.isFinite(declared)) nonNumericRes.push(row.asset_id);
  }

  // One aggregated finding instead of one per row: the manifest `resolution`
  // column holds clip duration ("8s") for every video-derived spritesheet.
  // That is a schema question for art-director + technical-director, not 9 bugs.
  if (nonNumericRes.length) {
    findings.push(
      finding(
        "info",
        "naming/manifest-res-schema",
        `${nonNumericRes.length} manifest row(s) put a non-numeric value in 'resolution' (clip duration, e.g. '8s'): ${nonNumericRes.join(", ")}`,
        "pipeline.md §7 defines resolution as pixels. Video-derived sheets need either a separate 'duration' column or a pixel value here.",
      ),
    );
  }
  if (sheetCount) {
    notes.push(
      `${sheetCount} spritesheet(s) exempted from the resolution check — '_sheet_2048' names a frame box, not the sheet width (pipeline.md §6 does not cover this case)`,
    );
  }

  return { findings, notes };
}
