"""Second pass: calf-height paper wall + leftover floor ribbons.

Run on the already-cleaned unrigged Smart Mesh. Does not touch sandals.
"""
from __future__ import annotations

import sys
from pathlib import Path

import bmesh
import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
src = Path(argv[0]).resolve()
dst = Path(argv[1]).resolve()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src))
obj = next(o for o in bpy.data.objects if o.type == "MESH")
me = obj.data
me.transform(obj.matrix_world)
obj.matrix_world.identity()

bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
index = {f.index: f for f in bm.faces}
min_z = min(v.co.z for v in bm.verts)

delete_ids: set[int] = set()
wall_ids: set[int] = set()
span_ids: set[int] = set()
for f in bm.faces:
    c = f.calc_center_median()
    pts = [v.co for v in f.verts]
    dx = max(p.x for p in pts) - min(p.x for p in pts)
    dy = max(p.y for p in pts) - min(p.y for p in pts)
    n = f.normal.normalized()
    # Calf/groin paper wall sits lateral of the legs (x more negative than inner thigh).
    if (
        abs(n.x) > 0.85
        and dy > 0.05
        and dx < 0.03
        and 0.02 < c.y < 0.16
        and c.x < -0.32
        and c.z < min_z + 0.78
    ):
        wall_ids.add(f.index)
        continue
    # Floor ribbon that still spans both sandals.
    if abs(n.z) > 0.75 and dy > 0.10 and c.z < min_z + 0.08:
        span_ids.add(f.index)

print(f"[pass2] wall={len(wall_ids)} span={len(span_ids)}")
delete_ids.update(wall_ids)
delete_ids.update(span_ids)
marked = [index[i] for i in delete_ids if i in index]
print(f"[pass2] deleting {len(marked)} faces")
if not (4 <= len(marked) <= 120):
    raise SystemExit(f"[pass2] abort: unexpected delete count {len(marked)}")

bmesh.ops.delete(bm, geom=marked, context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.to_mesh(me)
me.update()
bm.free()
print(f"[pass2] after verts={len(me.vertices)} faces={len(me.polygons)}")

dst.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.export_scene.gltf(
    filepath=str(dst),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_materials="EXPORT",
    export_texcoords=True,
    export_normals=True,
    export_cameras=False,
    export_lights=False,
    export_animations=False,
)
print(f"[pass2] wrote {dst} bytes={dst.stat().st_size}")
