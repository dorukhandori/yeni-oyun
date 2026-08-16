/**
 * C1 — manifest integrity: public/assets/assets.csv <-> public/assets/ on disk.
 *
 * Enforces pipeline.md §7: "Manifest satiri olmayan dosya public/assets/
 * altinda bulunamaz" and the mandatory-column rules (model non-empty,
 * seed never blank, status in a known set).
 *
 * Zero npm dependencies. This is the check that must never need one.
 */

import { finding } from "../lib/report.mjs";
import { isUnshippedCell } from "../lib/context.mjs";

export const id = "manifest";
export const title = "assets.csv <-> public/assets/ integrity (pipeline.md §7)";
export const requires = [];

const REQUIRED_COLUMNS = [
  "asset_id",
  "file",
  "category",
  "class",
  "prompt_file",
  "model",
  "seed",
  "aspect",
  "resolution",
  "date",
  "status",
  "notes",
];
const VALID_STATUS = new Set(["generated", "accepted", "integrated"]);

/** @param {import("../lib/context.mjs").QaContext} ctx */
export async function run(ctx) {
  const findings = [];
  const notes = [];

  // --- column contract -----------------------------------------------------
  for (const col of REQUIRED_COLUMNS) {
    if (!ctx.manifestHeader.includes(col)) {
      findings.push(
        finding("error", `manifest/column-missing/${col}`, `assets.csv header is missing required column '${col}'`),
      );
    }
  }

  // --- row-level rules -----------------------------------------------------
  const seenIds = new Set();
  let unshipped = 0;
  const declared = new Set();
  for (const row of ctx.manifestRows) {
    const aid = row.asset_id || `line-${row.__line}`;

    if (!row.asset_id) {
      findings.push(finding("error", `manifest/no-id/line-${row.__line}`, `assets.csv line ${row.__line} has no asset_id`));
    } else if (seenIds.has(row.asset_id)) {
      findings.push(finding("error", `manifest/duplicate-id/${row.asset_id}`, `duplicate asset_id '${row.asset_id}'`));
    } else {
      seenIds.add(row.asset_id);
    }

    if (!row.model) {
      findings.push(
        finding("error", `manifest/empty-model/${aid}`, `${aid}: 'model' is empty`, "pipeline.md §7: model bos birakilamaz"),
      );
    }
    if (!row.seed) {
      findings.push(
        finding("error", `manifest/empty-seed/${aid}`, `${aid}: 'seed' is empty`, "pipeline.md §7: yoksa 'none' yazilir, tahmin edilmez"),
      );
    }
    if (!VALID_STATUS.has(row.status)) {
      findings.push(
        finding(
          "error",
          `manifest/bad-status/${aid}`,
          `${aid}: status '${row.status}' is not one of ${[...VALID_STATUS].join(" | ")}`,
        ),
      );
    }
    if (!row.prompt_file) {
      findings.push(finding("warn", `manifest/no-prompt/${aid}`, `${aid}: 'prompt_file' is empty — asset is not reproducible`));
    }

    if (!row.file) {
      findings.push(finding("error", `manifest/no-file/${aid}`, `${aid}: 'file' is empty`));
      continue;
    }

    if (isUnshippedCell(row.file)) {
      // "(art-source/raw/x.png)" — declared, generated, deliberately not shipped.
      // art-source/ is gitignored, so its absence is expected, not a finding.
      unshipped++;
      continue;
    }

    if (declared.has(row.file)) {
      findings.push(finding("warn", `manifest/duplicate-file/${row.file}`, `two manifest rows point at '${row.file}'`));
    }
    declared.add(row.file);
  }

  // --- manifest row -> disk ------------------------------------------------
  const diskSet = new Set(ctx.diskFiles);
  for (const row of ctx.shippedRows) {
    if (!diskSet.has(row.file)) {
      findings.push(
        finding(
          "error",
          `manifest/orphan-row/${row.file}`,
          `${row.asset_id}: manifest declares '${row.file}' but it is not on disk under public/assets/`,
          "Either the file was never copied in, or the row should use the '(path)' unshipped convention.",
        ),
      );
    }
  }

  // --- disk -> manifest row (the pipeline.md §7 hard rule) -----------------
  for (const file of ctx.diskFiles) {
    if (!declared.has(file)) {
      findings.push(
        finding(
          "error",
          `manifest/untracked-file/${file}`,
          `'${file}' ships in public/assets/ but has NO assets.csv row`,
          "pipeline.md §7: manifest satiri olmayan dosya public/assets/ altinda bulunamaz",
        ),
      );
    }
  }

  notes.push(`${ctx.diskFiles.length} files on disk · ${ctx.manifestRows.length} manifest rows (${ctx.shippedRows.length} shipped, ${unshipped} declared-unshipped)`);
  return { findings, notes };
}
