#!/usr/bin/env python3
"""Slice ASSET-001 into four alpha-keyed directional sprites + a packed idle sheet."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.rgba_key import crop_opaque, figure_runs, fit_canvas, key_rgba, save_png

NAMES = ("front", "right", "left", "back")
CANVAS = 512


def main() -> None:
    src = Path(sys.argv[1])
    prefix = Path(sys.argv[2])
    im = key_rgba(Image.open(src))
    runs = figure_runs(im)
    if len(runs) != 4:
        raise SystemExit(f"expected 4 figures, found {len(runs)}: {runs}")

    written: list[Path] = []
    h = im.size[1]
    for name, (x0, x1) in zip(NAMES, runs):
        crop = crop_opaque(im, (x0, 0, x1 + 1, h))
        canvas = fit_canvas(crop, CANVAS)
        out = prefix.parent / f"{prefix.name}_{name}_01_albedo_512.png"
        save_png(canvas, out)
        written.append(out)
        print(f"wrote {out} src-x={x0}-{x1} crop={crop.size}")

    sheet = Image.new("RGBA", (CANVAS * 4, CANVAS), (0, 0, 0, 0))
    for i, path in enumerate(written):
        sheet.paste(Image.open(path), (i * CANVAS, 0))
    sheet_path = Path(sys.argv[3]) if len(sys.argv) > 3 else prefix.parent / f"{prefix.name}_idle_01_sheet_2048.png"
    save_png(sheet, sheet_path)
    print(f"wrote {sheet_path}")


if __name__ == "__main__":
    main()
