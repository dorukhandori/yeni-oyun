#!/usr/bin/env python3
"""Alpha-key a beige (or uniform) studio still and tight-crop the opaque figure.

Usage:
  python3 scripts/lib/key_and_crop_still.py INPUT.png OUTPUT.png

Samples the four corners; if they agree, flood-fills from the edges with that
seed (flora stills often land on grey instead of #aea49a). Falls back to the
character-studio BG_SEED in rgba_key.py.
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from scripts.lib.rgba_key import BG_RB, BG_SEED, crop_opaque, save_png  # noqa: E402


def corner_seed(im: Image.Image) -> tuple[int, int, int] | None:
    rgb = im.convert("RGB")
    w, h = rgb.size
    samples = [
        rgb.getpixel((2, 2)),
        rgb.getpixel((w - 3, 2)),
        rgb.getpixel((2, h - 3)),
        rgb.getpixel((w - 3, h - 3)),
    ]
    avg = tuple(sum(c[i] for c in samples) // 4 for i in range(3))
    for s in samples:
        if max(abs(s[i] - avg[i]) for i in range(3)) > 14:
            return None
    return avg  # type: ignore[return-value]


def flood_key(im: Image.Image, seed: tuple[int, int, int], maxc: int = 14) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    rb = seed[0] - seed[2]

    def is_bg(p: tuple[int, ...]) -> bool:
        if max(abs(int(p[i]) - seed[i]) for i in range(3)) > maxc:
            return False
        if abs((int(p[0]) - int(p[2])) - rb) > 10:
            return False
        return True

    def push(x: int, y: int) -> None:
        i = y * w + x
        if seen[i]:
            return
        seen[i] = 1
        q.append((x, y))

    for x in range(0, w, 3):
        push(x, 0)
        push(x, h - 1)
    for y in range(0, h, 3):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        p = px[x, y]
        if not is_bg(p):
            continue
        px[x, y] = (p[0], p[1], p[2], 0)
        if x > 0:
            push(x - 1, y)
        if x + 1 < w:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y + 1 < h:
            push(x, y + 1)

    fringe: list[tuple[int, int, int]] = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                continue
            edge = (
                (x > 0 and px[x - 1, y][3] == 0)
                or (x + 1 < w and px[x + 1, y][3] == 0)
                or (y > 0 and px[x, y - 1][3] == 0)
                or (y + 1 < h and px[x, y + 1][3] == 0)
            )
            if not edge:
                continue
            r, g, b, a = px[x, y]
            dist = max(abs(r - seed[0]), abs(g - seed[1]), abs(b - seed[2]))
            if dist <= 16:
                fringe.append((x, y, 0))
            elif dist <= 24:
                fringe.append((x, y, min(a, 110)))
    for x, y, a in fringe:
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, a)
    return im


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--tolerance")]
    tol_args = [a for a in sys.argv[1:] if a.startswith("--tolerance")]
    tolerance = int(tol_args[0].split("=", 1)[1]) if tol_args else 14
    if len(args) < 2:
        print(
            "usage: key_and_crop_still.py INPUT.png OUTPUT.png [--tolerance=N]  (N default 14 — "
            "raise for stills with a soft vignette/gradient backdrop that a tight flood-fill can't "
            "cross)",
            file=sys.stderr,
        )
        sys.exit(1)
    src, dst = Path(args[0]), Path(args[1])
    im = Image.open(src)
    seed = corner_seed(im) or BG_SEED
    keyed = flood_key(im, seed, maxc=tolerance)
    opaque = sum(1 for p in keyed.getdata() if p[3] > 24)
    total = keyed.size[0] * keyed.size[1]
    if opaque / total > 0.97:
        print(f"WARN: flood barely keyed ({opaque}/{total}); seed={seed}", file=sys.stderr)
    cropped = crop_opaque(keyed, (0, 0, keyed.size[0], keyed.size[1]), pad=4)
    save_png(cropped, dst)
    print(f"wrote {dst} {cropped.size[0]}x{cropped.size[1]} seed={seed} rb={BG_RB}")


if __name__ == "__main__":
    main()
