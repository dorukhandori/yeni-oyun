"""
Convert the downloaded "beach_rocks_raw_scan.glb" (sahip, 27 Ağu) — a real
photogrammetry scan of 8 distinct beach rocks, each split into 1-3 submeshes
(65k-vertex GLTF limit) sharing one texture atlas each — into a lightweight,
game-ready kit GLB for coastline scattering.

Source: 123MB raw, ~700k+ total triangles across 20 submeshes, 8 separate
unique texture atlases (one per physical rock, not shared/tileable — typical
raw photogrammetry output, no LOD/cleanup done yet).

Per rock: join its own submeshes (they're one physical object, only split for
the vertex-count limit), decimate hard (target ~1800 tris — matches the
scale of the existing rock-catalog kit, ASSET-119), downsize its own unique
atlas to 512px. Keeps all 8 rocks as separate named objects (same
SM_Rocks_XX-style convention as ASSET-119) for per-piece scatter reuse.

Run: blender --background --python scripts/blender/convert_beach_rocks_scan.py
"""

import bpy
import os

SRC_GLB = os.path.expanduser("~/Downloads/beach_rocks_raw_scan.glb")
OUT_GLB = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "public", "assets", "models", "rock_beach_scan_kit_01_mesh_8pcs.glb",
)
TARGET_TRIS = 1800
TEX_MAX = 512

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC_GLB)

mesh_objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print(f"imported {len(mesh_objs)} submeshes")

# Group submeshes by their material (== which physical rock they belong to).
groups = {}
for o in mesh_objs:
    mat = o.data.materials[0] if o.data.materials else None
    key = mat.name if mat else o.name
    groups.setdefault(key, []).append(o)
print(f"grouped into {len(groups)} rocks:", list(groups.keys()))

rock_objs = []
for i, (matname, objs) in enumerate(sorted(groups.items()), start=1):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    rock = bpy.context.view_layer.objects.active
    rock.name = f"SM_BeachRock_{i:02d}"

    tri_count = len(rock.data.polygons)
    if tri_count > TARGET_TRIS:
        mod = rock.modifiers.new("Decimate", "DECIMATE")
        mod.ratio = max(0.005, TARGET_TRIS / max(1, tri_count))
        bpy.context.view_layer.objects.active = rock
        bpy.ops.object.modifier_apply(modifier=mod.name)
    print(f"  {rock.name}: {tri_count} -> {len(rock.data.polygons)} tris")

    # Recenter each rock's own origin to its geometry so runtime scatter code
    # can trust position == pivot (same convention as ASSET-119).
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    rock_objs.append(rock)

# Downsize every image (one unique atlas per rock — no sharing to exploit).
for img in bpy.data.images:
    w, h = img.size
    if w <= TEX_MAX and h <= TEX_MAX:
        continue
    scale = TEX_MAX / max(w, h)
    img.scale(max(1, round(w * scale)), max(1, round(h * scale)))
    print(f"downsized {img.name}: {w}x{h} -> {img.size[0]}x{img.size[1]}")

bpy.ops.object.select_all(action="DESELECT")
for o in rock_objs:
    o.select_set(True)

os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_draco_mesh_compression_enable=False,
)
print("wrote", OUT_GLB, os.path.getsize(OUT_GLB), "bytes")
