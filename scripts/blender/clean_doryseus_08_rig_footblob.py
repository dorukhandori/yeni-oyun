"""Remove foot-shadow blob + inner-thigh paper wall from the rigged Doryseus 08 GLB.

Keeps Armature, weights, and Tripo clips. Selection is rest-pose + albedo,
not a second retarget.
"""
from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

import bmesh
import bpy
argv = sys.argv[sys.argv.index("--") + 1 :]
src = Path(argv[0]).resolve()
dst = Path(argv[1]).resolve()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src))

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
arm.data.pose_position = "REST"
bpy.context.view_layer.update()

for o in list(bpy.data.objects):
    if o.type == "MESH" and "ico" in o.name.lower():
        name = o.name
        bpy.data.objects.remove(o, do_unlink=True)
        print(f"[clean5] removed {name}")

mesh_obj = max(
    (o for o in bpy.data.objects if o.type == "MESH"),
    key=lambda o: len(o.data.vertices),
)
me = mesh_obj.data
mw = mesh_obj.matrix_world.copy()
rot = mw.to_3x3()

img = next(i for i in bpy.data.images if i.size[0] > 64)
tw, th = img.size
pixels = list(img.pixels)
uv_layer = me.uv_layers.active.data
vg_names = [g.name for g in mesh_obj.vertex_groups]
dom = []
for v in me.vertices:
    if not v.groups:
        dom.append("NONE")
        continue
    best = max(v.groups, key=lambda g: g.weight)
    dom.append(vg_names[best.group])


def sample_lum(poly) -> float:
    acc = 0.0
    for li in poly.loop_indices:
        uv = uv_layer[li].uv
        x = min(int((uv.x % 1.0) * tw), tw - 1)
        y = min(int((uv.y % 1.0) * th), th - 1)
        i = (y * tw + x) * 4
        r, g, b = pixels[i], pixels[i + 1], pixels[i + 2]
        acc += 0.2126 * r + 0.7152 * g + 0.0722 * b
    return acc / max(len(poly.loop_indices), 1)


# Right sandal pad in rest world-space (brown R_ToeBase cluster).
SANDAL_X = (-0.185, -0.085)
SANDAL_Y = (-0.120, -0.010)

delete: set[int] = set()
foot_ids: set[int] = set()
wall_ids: set[int] = set()

for poly in me.polygons:
    c = mw @ poly.center
    bones = set(dom[i] for i in poly.vertices)
    main = Counter(dom[i] for i in poly.vertices).most_common(1)[0][0]
    lum = sample_lum(poly)

    if main == "R_ToeBase" and lum >= 0.65:
        in_pad = SANDAL_X[0] <= c.x <= SANDAL_X[1] and SANDAL_Y[0] <= c.y <= SANDAL_Y[1]
        if not in_pad:
            foot_ids.add(poly.index)
            continue

    left = any("L_" in b and any(k in b for k in ("Thigh", "Calf", "Foot")) for b in bones)
    right = any("R_" in b and any(k in b for k in ("Thigh", "Calf", "Foot")) for b in bones)
    if left and right:
        n = (rot @ poly.normal).normalized()
        # Vertical paper between the thighs; keep downward tunic hem.
        if abs(n.x) > 0.70 and abs(n.z) < 0.55:
            wall_ids.add(poly.index)

delete.update(foot_ids)
delete.update(wall_ids)
print(f"[clean5] foot-blob={len(foot_ids)} crotch-wall={len(wall_ids)} total={len(delete)}")
if not (40 <= len(foot_ids) <= 200):
    raise SystemExit(f"[clean5] abort foot count {len(foot_ids)}")
if not (1 <= len(wall_ids) <= 40):
    raise SystemExit(f"[clean5] abort wall count {len(wall_ids)}")

bm = bmesh.new()
bm.from_mesh(me)
bm.faces.ensure_lookup_table()
marked = [f for f in bm.faces if f.index in delete]
bmesh.ops.delete(bm, geom=marked, context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.to_mesh(me)
me.update()
bm.free()
print(f"[clean5] after verts={len(me.vertices)} faces={len(me.polygons)}")

arm.data.pose_position = "POSE"
bpy.context.view_layer.update()
dst.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
mesh_obj.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(
    filepath=str(dst),
    export_format="GLB",
    use_selection=True,
    export_apply=False,
    export_materials="EXPORT",
    export_texcoords=True,
    export_normals=True,
    export_animations=True,
    export_nla_strips=True,
    export_skins=True,
    export_cameras=False,
    export_lights=False,
)
print(f"[clean5] wrote {dst} bytes={dst.stat().st_size}")
