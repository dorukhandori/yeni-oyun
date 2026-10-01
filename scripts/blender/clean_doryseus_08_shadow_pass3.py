"""Pass 3: remaining shin curtain + toe/floor slivers. Keeps tunic hem and sandals."""
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

ids: set[int] = set()
for f in bm.faces:
    c = f.calc_center_median()
    pts = [v.co for v in f.verts]
    dx = max(p.x for p in pts) - min(p.x for p in pts)
    dy = max(p.y for p in pts) - min(p.y for p in pts)
    n = f.normal.normalized()
    gap = 0.02 < c.y < 0.16
    below_hem = c.z < min_z + 0.52
    wall = gap and below_hem and (dy > 0.06 or (abs(n.x) > 0.70 and dx < 0.035))
    far_floor = c.z < min_z + 0.06 and (c.x > -0.18 or c.y < -0.35 or c.y > 0.28)
    span_floor = abs(n.z) > 0.7 and dy > 0.10 and c.z < min_z + 0.10
    toe_sliver = c.z < min_z + 0.05 and c.x > -0.16 and abs(n.z) > 0.5
    if wall or far_floor or span_floor or toe_sliver:
        ids.add(f.index)

marked = [index[i] for i in ids if i in index]
print(f"[pass3] deleting {len(marked)} faces")
if not (20 <= len(marked) <= 200):
    raise SystemExit(f"[pass3] abort: unexpected delete count {len(marked)}")

bmesh.ops.delete(bm, geom=marked, context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.to_mesh(me)
me.update()
bm.free()
print(f"[pass3] after verts={len(me.vertices)} faces={len(me.polygons)}")

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
print(f"[pass3] wrote {dst} bytes={dst.stat().st_size}")
