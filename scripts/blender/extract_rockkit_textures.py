#!/usr/bin/env python3
"""One-time extraction: pull the 3 embedded PBR textures (baseColor/Normal/
Roughness) out of ASSET-119's GLB (rock_stylized_kit_01_mesh_11pcs.glb) into
standalone PNG files under art-source/raw/, so other scripts (e.g.
build_coast_rock_kit.py) can reuse the same real rock-catalog pattern
without re-parsing the GLB each time.

Pure Python, no Blender needed — glTF embedded images are just raw PNG bytes
sitting in the .glb's BIN chunk, referenced by a bufferView.

  python3 scripts/blender/extract_rockkit_textures.py
"""

import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC_GLB = ROOT / "public" / "assets" / "models" / "rock_stylized_kit_01_mesh_11pcs.glb"
OUT_DIR = ROOT / "art-source" / "raw"


def main() -> int:
    data = SRC_GLB.read_bytes()
    _magic, _version, length = struct.unpack("<4sII", data[:12])
    offset = 12
    json_chunk = None
    bin_chunk = None
    while offset < length:
        clen, ctype = struct.unpack("<II", data[offset : offset + 8])
        chunk = data[offset + 8 : offset + 8 + clen]
        if ctype == 0x4E4F534A:  # "JSON"
            json_chunk = json.loads(chunk)
        elif ctype == 0x004E4942:  # "BIN\0"
            bin_chunk = chunk
        offset += 8 + clen
    assert json_chunk is not None and bin_chunk is not None

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for img in json_chunk["images"]:
        bv = json_chunk["bufferViews"][img["bufferView"]]
        start = bv.get("byteOffset", 0)
        blob = bin_chunk[start : start + bv["byteLength"]]
        out_path = OUT_DIR / f"rockkit_{img['name']}.png"
        out_path.write_bytes(blob)
        print(f"wrote {out_path.relative_to(ROOT)} ({len(blob)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
