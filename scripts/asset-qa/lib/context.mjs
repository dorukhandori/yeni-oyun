/**
 * Builds the shared, read-only context every check receives.
 *
 * Scanning the disk and parsing assets.csv happens exactly once per run, so
 * adding a fourth/fifth check costs no extra I/O.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./csv.mjs";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const ASSET_DIR = join(ROOT, "public", "assets");
export const MANIFEST = join(ASSET_DIR, "assets.csv");

/** Files that live under public/assets/ but are not assets. */
const IGNORED = new Set([".gitkeep", ".DS_Store", "assets.csv"]);

/** @returns {string[]} paths relative to public/assets/, POSIX separators */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (!IGNORED.has(name)) out.push(relative(ASSET_DIR, abs).split("\\").join("/"));
  }
  return out;
}

/**
 * A manifest `file` cell wrapped in parentheses — e.g. `(art-source/raw/x.png)` —
 * is the existing convention for "generated but not shipped yet". Those rows
 * must NOT be expected on disk under public/assets/.
 */
export function isUnshippedCell(cell) {
  return cell.startsWith("(") && cell.endsWith(")");
}

export function buildContext() {
  if (!existsSync(MANIFEST)) {
    throw new Error(`manifest not found: ${MANIFEST}`);
  }
  const { header, rows } = parseCsv(readFileSync(MANIFEST, "utf8"));
  const diskFiles = existsSync(ASSET_DIR) ? walk(ASSET_DIR).sort() : [];
  const sizes = new Map(diskFiles.map((f) => [f, statSync(join(ASSET_DIR, f)).size]));

  return {
    root: ROOT,
    assetDir: ASSET_DIR,
    manifestPath: MANIFEST,
    manifestHeader: header,
    manifestRows: rows,
    /** shipped rows only: file cell is a real public/assets/ relative path */
    shippedRows: rows.filter((r) => r.file && !isUnshippedCell(r.file)),
    diskFiles,
    /** @type {Map<string, number>} relative path -> bytes */
    sizes,
    abs: (rel) => join(ASSET_DIR, rel),
  };
}

/** @typedef {ReturnType<typeof buildContext>} QaContext */
