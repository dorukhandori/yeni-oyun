#!/usr/bin/env python3
"""Pack a short walk strip from extracted Veo frames.

Takes a consecutive window (default: skip 1s settle, then 8 frames at 8 fps =
one stride). Keys the beige studio, fits 256², writes a 1-row sheet.

pipeline.md §5 step 5 (manual cleanup) is still a sahip gate. --ship copies a
playable draft into public/assets/spritesheets/ for playtest.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.rgba_key import crop_opaque, fit_canvas, key_rgba, normalize_feet, save_png


def shrink(im: Image.Image, max_w: int = 640) -> Image.Image:
    if im.size[0] <= max_w:
        return im
    h = int(im.size[1] * (max_w / im.size[0]))
    return im.resize((max_w, h), Image.Resampling.BILINEAR)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("frames_dir")
    p.add_argument("--name", required=True)
    p.add_argument("--start", type=int, default=8)
    p.add_argument("--count", type=int, default=8)
    p.add_argument("--canvas", type=int, default=256)
    p.add_argument("--ship", action="store_true")
    args = p.parse_args()

    root = Path(__file__).resolve().parent.parent
    raw = sorted(Path(args.frames_dir).glob("frame_*.png"))
    if not raw:
        raise SystemExit(f"no frames in {args.frames_dir}")
    window = raw[args.start : args.start + args.count]
    if len(window) < args.count:
        window = raw[: args.count]
    if len(window) < 4:
        raise SystemExit(f"need ≥4 frames, got {len(window)}")

    work = root / "art-source/work" / args.name
    work.mkdir(parents=True, exist_ok=True)
    picks: list[Image.Image] = []
    for i, src in enumerate(window):
        im = key_rgba(shrink(Image.open(src)))
        crop = crop_opaque(im, (0, 0, im.size[0], im.size[1]))
        canvas = fit_canvas(crop, args.canvas)
        picks.append(canvas)
        print(f"  {src.name} -> walk_{i:02d}.png")

    picks = normalize_feet(picks, args.canvas)
    for i, canvas in enumerate(picks):
        save_png(canvas, work / f"walk_{i:02d}.png")

    cols = len(picks)
    sheet = Image.new("RGBA", (args.canvas * cols, args.canvas), (0, 0, 0, 0))
    for i, im in enumerate(picks):
        sheet.paste(im, (i * args.canvas, 0))
    draft = work / f"{args.name}_01_sheet_draft.png"
    save_png(sheet, draft)
    print(f"draft {draft} frames={cols}")

    if args.ship:
        dest = root / "public/assets/spritesheets" / f"{args.name}_01_sheet_2048.png"
        dest.parent.mkdir(parents=True, exist_ok=True)
        save_png(sheet, dest)
        print(f"shipped {dest} ({dest.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
