"""Delete floor-shadow / crotch-web faces from the rigged Doryseus 08 GLB.

Keeps the Armature, vertex groups, and Tripo clips. Rest pose only.
"""
from __future__ import annotations

import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
src = Path(argv[0]).resolve()
dst = Path(argv[1]).resolve()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src))

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
arm.data.pose_position = "REST"
bpy.context.view_layer.update()

mesh_obj = max(
    (o for o in bpy.data.objects if o.type == "MESH" and "ico" not in o.name.lower()),
    key=lambda o: len(o.data.vertices),
)
for o in list(bpy.data.objects):
    if o.type == "MESH" and o != mesh_obj:
        name = o.name
        bpy.data.objects.remove(o, do_unlink=True)
        print(f"[clean-rig] removed extra mesh {name}")

me = mesh_obj.data
mw = mesh_obj.matrix_world.copy()
rot = mw.to_3x3()

bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
index = {f.index: f for f in bm.faces}


def wpos(v) -> Vector:
    return mw @ v.co


world_z = [wpos(v).z for v in bm.verts]
min_z = min(world_z)
max_z = max(world_z)
H = max(max_z - min_z, 0.5)
gnd = min_z + 0.05 * H
print(f"[clean-rig] mesh={mesh_obj.name} verts={len(bm.verts)} faces={len(bm.faces)} z=[{min_z:.3f},{max_z:.3f}] H={H:.3f}")


def face_world(f):
    pts = [wpos(v) for v in f.verts]
    c = sum(pts, Vector()) / len(pts)
    n = (rot @ f.normal).normalized()
    xs = [p.x for p in pts]
    ys = [p.y for p in pts]
    zs = [p.z for p in pts]
    return c, n, (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)), pts


horiz_ids = []
for f in bm.faces:
    c, n, _, _ = face_world(f)
    if abs(n.z) > 0.8 and c.z < gnd:
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
print("[clean-rig] horiz islands by area:")
for area, isl in scored[:12]:
    cs = [face_world(index[j])[0] for j in isl]
    print(
        f"  n={len(isl):3d} area={area:.4f} "
        f"x={min(c.x for c in cs):+.3f}..{max(c.x for c in cs):+.3f} "
        f"y={min(c.y for c in cs):+.3f}..{max(c.y for c in cs):+.3f}"
    )

delete_ids: set[int] = set()
for area, isl in scored:
    if area >= 0.05:
        delete_ids.update(isl)
        continue
    cs = [face_world(index[j])[0] for j in isl]
    if max(c.x for c in cs) > 0.08 * H or min(c.y for c in cs) < -0.22 * H:
        delete_ids.update(isl)

wall_ids: set[int] = set()
for f in bm.faces:
    if f.index in delete_ids:
        continue
    c, n, (dx, dy, dz), _ = face_world(f)
    if abs(n.x) > 0.85 and dy > 0.033 * H and dx < 0.025 * H and 0.015 < c.y < 0.075 and c.z < min_z + 0.38 * H:
        wall_ids.add(f.index)
print(f"[clean-rig] wall={len(wall_ids)}")
delete_ids.update(wall_ids)

ribbon_ids: set[int] = set()
for f in bm.faces:
    if f.index in delete_ids:
        continue
    c, n, (dx, dy, dz), _ = face_world(f)
    far = c.z < gnd + 0.02 * H and (c.x > 0.05 * H or c.y < -0.22 * H)
    between_feet_floor = (
        0.018 < c.y < 0.072 and abs(n.z) > 0.8 and dy > 0.04 * H and c.z < gnd + 0.02 * H
    )
    if far or between_feet_floor:
        ribbon_ids.add(f.index)
print(f"[clean-rig] ribbon={len(ribbon_ids)}")
delete_ids.update(ribbon_ids)

marked = [index[i] for i in delete_ids if i in index]
print(f"[clean-rig] deleting {len(marked)} faces")
if not (40 <= len(marked) <= 400):
    raise SystemExit(f"[clean-rig] abort: unexpected delete count {len(marked)}")

bmesh.ops.delete(bm, geom=marked, context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.to_mesh(me)
me.update()
bm.free()
print(f"[clean-rig] after verts={len(me.vertices)} faces={len(me.polygons)} groups={len(mesh_obj.vertex_groups)}")

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
print(f"[clean-rig] wrote {dst} bytes={dst.stat().st_size}")
