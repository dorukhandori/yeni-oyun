"""Edge flood-fill alpha key for beige-studio stills (ASSET-001 / video frames).

The cream tunic sits close to the backdrop in RGB, so a global chroma key
eats the cloth. Backdrop pixels are almost perfectly uniform and have a
narrow red-minus-blue (~21); the tunic is warmer (~30). Flood from the
edges with that discriminator, then soften the anti-aliased fringe.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

BG_SEED = (174, 164, 153)
BG_RB = 21


def is_backdrop(p: tuple[int, ...], maxc: int = 10, rb_tol: int = 6) -> bool:
    if max(abs(int(p[i]) - BG_SEED[i]) for i in range(3)) > maxc:
        return False
    if abs((int(p[0]) - int(p[2])) - BG_RB) > rb_tol:
        return False
    return True


def key_rgba(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        i = y * w + x
        if seen[i]:
            return
        seen[i] = 1
        q.append((x, y))

    for x in range(0, w, 4):
        push(x, 0)
        push(x, h - 1)
    for y in range(0, h, 4):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        p = px[x, y]
        if not is_backdrop(p):
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

    # Soften only the 1px studio fringe (pixels that already touch keyed-out
    # backdrop). A global near-bg pass eats the cream tunic — same failure as
    # chroma-keying the whole page.
    fringe: list[tuple[int, int, int]] = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                continue
            edge = False
            if x > 0 and px[x - 1, y][3] == 0:
                edge = True
            elif x + 1 < w and px[x + 1, y][3] == 0:
                edge = True
            elif y > 0 and px[x, y - 1][3] == 0:
                edge = True
            elif y + 1 < h and px[x, y + 1][3] == 0:
                edge = True
            if not edge:
                continue
            r, g, b, a = px[x, y]
            dist = max(abs(r - BG_SEED[0]), abs(g - BG_SEED[1]), abs(b - BG_SEED[2]))
            rb = r - b
            if dist <= 12 and abs(rb - BG_RB) <= 8:
                fringe.append((x, y, 0))
            elif dist <= 18 and abs(rb - BG_RB) <= 12:
                fringe.append((x, y, min(a, 110)))
    for x, y, a in fringe:
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, a)
    return im


def figure_runs(im: Image.Image, min_col: int = 8) -> list[tuple[int, int]]:
    w, h = im.size
    px = im.load()
    cols = []
    for x in range(w):
        hit = 0
        for y in range(h):
            if px[x, y][3] > 24:
                hit += 1
        cols.append(hit)
    runs: list[tuple[int, int]] = []
    in_run = False
    start = 0
    for x, c in enumerate(cols):
        if c > min_col and not in_run:
            start = x
            in_run = True
        elif c <= min_col and in_run:
            runs.append((start, x - 1))
            in_run = False
    if in_run:
        runs.append((start, w - 1))
    return runs


def crop_opaque(im: Image.Image, box: tuple[int, int, int, int], pad: int = 2) -> Image.Image:
    x0, y0, x1, y1 = box
    px = im.load()
    top, bot = im.size[1], 0
    left, right = x1, x0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] > 24:
                if y < top:
                    top = y
                if y > bot:
                    bot = y
                if x < left:
                    left = x
                if x > right:
                    right = x
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(im.size[0], right + pad + 1)
    bot = min(im.size[1], bot + pad + 1)
    return im.crop((left, top, right, bot))


def fit_canvas(src: Image.Image, size: int, pad: int = 8) -> Image.Image:
    cw, ch = src.size
    scale = min((size - pad * 2) / cw, (size - pad * 2) / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - nw) // 2, size - pad - nh), resized)
    return canvas


def normalize_feet(frames: list[Image.Image], size: int, pad: int = 8) -> list[Image.Image]:
    """Same painted height, soles on the bottom pad — kills Veo zoom pops."""
    heights: list[int] = []
    crops: list[tuple[Image.Image, tuple[int, int, int, int]]] = []
    for im in frames:
        a = im.split()[3]
        bbox = a.getbbox()
        if not bbox:
            crops.append((im, (0, 0, im.size[0], im.size[1])))
            heights.append(im.size[1])
            continue
        crops.append((im, bbox))
        heights.append(bbox[3] - bbox[1])
    heights.sort()
    target = heights[len(heights) // 2]
    target = min(target, size - pad * 2)
    out: list[Image.Image] = []
    for im, bbox in crops:
        crop = im.crop(bbox)
        h = max(1, bbox[3] - bbox[1])
        scale = target / h
        nw, nh = max(1, int(crop.size[0] * scale)), max(1, int(crop.size[1] * scale))
        nw = min(nw, size - pad * 2)
        resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        canvas.paste(resized, ((size - nw) // 2, size - pad - nh), resized)
        out.append(canvas)
    return out


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG")
