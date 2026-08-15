#!/usr/bin/env node
/**
 * Slice a character turnaround still into alpha-keyed directional sprites.
 *
 * The ASSET-001 page has no alpha (opaque beige studio ground). Flood-filling
 * from the edges — not a global chroma key — keeps the off-white tunic, which
 * sits too close to the backdrop to survive a fuzz key. Same lesson as the
 * lotus stage sheets (ASSET-004..007).
 *
 * Usage:
 *   node scripts/sheet-from-still.mjs \
 *     public/assets/ref/char_odysseus_turnaround_01_ref_2048.png \
 *     public/assets/sprites/char_doryseus \
 *     art-source/work/char_doryseus_idle_01_sheet_2048.png
 *
 * Writes four 512² views (front / right / left / back) into public/assets/
 * and a packed draft sheet into art-source/work/ (over the 500 KB sheet
 * budget, not shipped). Walk clips go through scripts/sheet-from-video.mjs
 * once the Veo files exist.
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, process.argv[2] ?? "public/assets/ref/char_odysseus_turnaround_01_ref_2048.png");
const outPrefix = resolve(root, process.argv[3] ?? "public/assets/sprites/char_doryseus");
const sheet = resolve(
  root,
  process.argv[4] ?? "art-source/work/char_doryseus_idle_01_sheet_2048.png",
);

const r = spawnSync(
  "python3",
  [resolve(root, "scripts/slice_turnaround.py"), src, outPrefix, sheet],
  { encoding: "utf-8" },
);
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
