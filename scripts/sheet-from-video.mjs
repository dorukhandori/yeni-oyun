#!/usr/bin/env node
/**
 * pipeline.md §5 — still → video → frame extract → palette quantize → sheet.
 *
 * Step 5 (manual cleanup) is a sahip gate: this script stops at a *draft*
 * sheet in art-source/work/ and copies it to public/assets/spritesheets/
 * only with --ship. Do not treat the draft as final.
 *
 * Usage:
 *   node scripts/sheet-from-video.mjs art-source/raw/char_doryseus_walk_clip_01.mp4 \
 *     --name char_doryseus_walk --fps 8 --cols 8
 *
 * Requires ffmpeg on PATH. The Veo clips listed in assets.csv (ASSET-024/025/026)
 * are not in this repo (art-source/ is gitignored and currently empty) — regenerate
 * them before running this.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
function has(flag) {
  return process.argv.includes(flag);
}

const input = process.argv[2];
if (!input || input.startsWith("-")) {
  console.error(
    "usage: node scripts/sheet-from-video.mjs <clip.mp4> [--name char_doryseus_walk] [--fps 8] [--cols 8] [--colors 32] [--ship]",
  );
  process.exit(2);
}

const clip = resolve(root, input);
if (!existsSync(clip)) {
  console.error(`missing clip: ${clip}\nart-source/ is gitignored — the Veo files are not in the repo.`);
  process.exit(1);
}

const name = arg("--name", basename(clip, ".mp4").replace(/_clip_\d+$/, "").replace(/_01$/, ""));
const fps = arg("--fps", "8");
const cols = arg("--cols", "8");
const colors = arg("--colors", "32");
const ship = has("--ship");

const framesDir = resolve(root, "art-source/frames", name);
const workDir = resolve(root, "art-source/work", name);
mkdirSync(framesDir, { recursive: true });
mkdirSync(workDir, { recursive: true });

const ff = spawnSync(
  "ffmpeg",
  ["-y", "-i", clip, "-vf", `fps=${fps}`, resolve(framesDir, "frame_%03d.png")],
  { encoding: "utf-8" },
);
if (ff.status !== 0) {
  process.stderr.write(ff.stderr || "ffmpeg failed\n");
  process.exit(ff.status ?? 1);
}

const py = `
import sys
from pathlib import Path
from PIL import Image

sys.path.insert(0, ${JSON.stringify(resolve(root, "scripts"))})
from lib.rgba_key import key_rgba, crop_opaque, fit_canvas, save_png

frames_dir = Path(${JSON.stringify(framesDir)})
work_dir = Path(${JSON.stringify(workDir)})
cols = ${Number(cols)}
colors = ${Number(colors)}
name = ${JSON.stringify(name)}
ship = ${ship ? "True" : "False"}
root = Path(${JSON.stringify(root)})

frames = sorted(frames_dir.glob("frame_*.png"))
if not frames:
    raise SystemExit("no frames extracted")

keyed = []
for src in frames:
    im = key_rgba(Image.open(src))
    crop = crop_opaque(im, (0, 0, im.size[0], im.size[1]))
    canvas = fit_canvas(crop, 256)
    # Adaptive palette — draft only; art-bible lock is the sahip eye-pass.
    q = canvas.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    out = canvas.copy()
    out.paste(q.convert("RGBA"))
    # Restore keyed alpha (quantize drops it).
    a = canvas.split()[3]
    out.putalpha(a)
    dest = work_dir / src.name
    save_png(out, dest)
    keyed.append(out)
    print(f"frame {src.name} -> {dest}")

rows = (len(keyed) + cols - 1) // cols
sheet = Image.new("RGBA", (256 * cols, 256 * rows), (0, 0, 0, 0))
for i, im in enumerate(keyed):
    sheet.paste(im, ((i % cols) * 256, (i // cols) * 256))
draft = work_dir / f"{name}_01_sheet_draft.png"
save_png(sheet, draft)
print(f"draft {draft} frames={len(keyed)} grid={cols}x{rows}")
print("pipeline.md §5 step 5: manual cleanup in art-source/work/ before --ship")
if ship:
    dest = root / "public/assets/spritesheets" / f"{name}_01_sheet_1024.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest, "PNG")
    print(f"shipped {dest}")
`;

const r = spawnSync("python3", ["-c", py], { encoding: "utf-8" });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
