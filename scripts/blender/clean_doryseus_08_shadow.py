"""Delete the floor-shadow sheet on Doryseus 08. Keeps sandal pads."""
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
horiz_ids = []
for f in bm.faces:
    n = f.normal.normalized()
    c = f.calc_center_median()
    if abs(n.z) > 0.8 and c.z < min_z + 0.08:
        horiz_ids.append(f.index)

face_set = set(horiz_ids)
seen: set[int] = set()
islands: list[list[int]] = []
for fi in face_set:
    if fi in seen:
        continue
    stack = [fi]
    seen.add(fi)
    isl = [fi]
    while stack:
        cur = stack.pop()
        for e in index[cur].edges:
            for of in e.link_faces:
                if of.index in face_set and of.index not in seen:
                    seen.add(of.index)
                    stack.append(of.index)
                    isl.append(of.index)
    islands.append(isl)

scored = []
for isl in islands:
    area = sum(index[j].calc_area() for j in isl)
    scored.append((area, isl))
scored.sort(reverse=True)

print("[clean] horiz islands by area:")
for area, isl in scored[:12]:
    cs = [index[j].calc_center_median() for j in isl]
    print(
        f"  n={len(isl):3d} area={area:.4f} "
        f"x={min(c.x for c in cs):+.3f}..{max(c.x for c in cs):+.3f} "
        f"y={min(c.y for c in cs):+.3f}..{max(c.y for c in cs):+.3f}"
    )

# Shadow sheets are large-area and sit away from the two sandal pads.
# Sandals are ~0.031 area, 69–71 faces, under the feet at x≈-0.3.
delete_ids: set[int] = set()
for area, isl in scored:
    if area >= 0.05:
        delete_ids.update(isl)
        continue
    cs = [index[j].calc_center_median() for j in isl]
    far_x = max(c.x for c in cs)
    far_y = min(c.y for c in cs)
    # ribbon tip in front of / beside the body, not under a sandal
    if far_x > 0.15 or far_y < -0.4:
        delete_ids.update(isl)

# Pass 2: paper wall between the thighs (normal ±X, spans the stance in Y).
wall_ids: set[int] = set()
for f in bm.faces:
    if f.index in delete_ids:
        continue
    c = f.calc_center_median()
    pts = [v.co for v in f.verts]
    dx = max(p.x for p in pts) - min(p.x for p in pts)
    dy = max(p.y for p in pts) - min(p.y for p in pts)
    n = f.normal.normalized()
    if (
        abs(n.x) > 0.85
        and dy > 0.06
        and dx < 0.04
        and 0.02 < c.y < 0.16
        and c.z < min_z + 0.62
    ):
        wall_ids.add(f.index)
print(f"[clean] wall faces {len(wall_ids)}")
delete_ids.update(wall_ids)

# Pass 3: leftover shadow ribbon in front of / beside the body (not under sandals).
ribbon_ids: set[int] = set()
for f in bm.faces:
    if f.index in delete_ids:
        continue
    c = f.calc_center_median()
    pts = [v.co for v in f.verts]
    dy = max(p.y for p in pts) - min(p.y for p in pts)
    n = f.normal.normalized()
    far = c.z < min_z + 0.09 and (c.x > -0.12 or c.y < -0.40)
    between_feet_floor = (
        0.04 < c.y < 0.12 and abs(n.z) > 0.8 and dy > 0.08 and c.z < min_z + 0.10
    )
    if far or between_feet_floor:
        ribbon_ids.add(f.index)
print(f"[clean] leftover ribbon faces {len(ribbon_ids)}")
delete_ids.update(ribbon_ids)

marked = [index[i] for i in delete_ids if i in index]
print(f"[clean] deleting {len(marked)} faces")
if not (40 <= len(marked) <= 400):
    raise SystemExit(f"[clean] abort: unexpected delete count {len(marked)}")

bmesh.ops.delete(bm, geom=marked, context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.to_mesh(me)
me.update()
bm.free()
print(f"[clean] after verts={len(me.vertices)} faces={len(me.polygons)}")

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
print(f"[clean] wrote {dst} bytes={dst.stat().st_size}")
