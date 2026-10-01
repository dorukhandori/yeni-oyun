"""Inspect a character GLB and render four orthographic previews. No rig."""
import sys
from pathlib import Path

import bpy

glb = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
out_dir = Path(sys.argv[sys.argv.index("--") + 2]).resolve()
out_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))

verts = faces = 0
nonman = 0
meshes = []
for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    meshes.append(obj)
    me = obj.data
    verts += len(me.vertices)
    faces += len(me.polygons)
    bm_ok = False
    try:
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(me)
        bm.verts.ensure_lookup_table()
        nonman += sum(1 for v in bm.verts if not v.is_manifold)
        bm.free()
        bm_ok = True
    except Exception as exc:
        print(f"[preview] bmesh fail {exc}")
    print(f"[preview] mesh={obj.name} verts={len(me.vertices)} faces={len(me.polygons)}")

print(f"[preview] file={glb.name} meshes={len(meshes)} verts={verts} faces={faces} nonmanifold_verts={nonman}")
print(f"[preview] armatures={sum(1 for o in bpy.data.objects if o.type == 'ARMATURE')}")
print(f"[preview] actions={list(bpy.data.actions.keys())}")
for img in bpy.data.images:
    print(f"[preview] image={img.name} size={tuple(img.size)} packed={img.packed_file is not None}")

# World + light
world = bpy.data.worlds.new("preview")
bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.68, 0.64, 0.58, 1)
bg.inputs[1].default_value = 1.0

light_data = bpy.data.lights.new(name="key", type="SUN")
light_data.energy = 3.0
light_obj = bpy.data.objects.new("key", light_data)
bpy.context.collection.objects.link(light_obj)
light_obj.rotation_euler = (0.6, 0.2, 0.4)

# Fit camera to all meshes
import math
from mathutils import Vector

coords = []
for obj in meshes:
    for v in obj.bound_box:
        coords.append(obj.matrix_world @ Vector(v))
if not coords:
    raise SystemExit("no mesh")
min_c = Vector((min(c.x for c in coords), min(c.y for c in coords), min(c.z for c in coords)))
max_c = Vector((max(c.x for c in coords), max(c.y for c in coords), max(c.z for c in coords)))
center = (min_c + max_c) * 0.5
size = (max_c - min_c).length
print(f"[preview] bbox min={tuple(round(x,3) for x in min_c)} max={tuple(round(x,3) for x in max_c)}")

cam_data = bpy.data.cameras.new("preview")
cam_data.type = "ORTHO"
cam_data.ortho_scale = max(size * 1.15, 0.5)
cam = bpy.data.objects.new("preview", cam_data)
bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam

scene = bpy.context.scene
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = eng
        break
    except TypeError:
        continue
scene.render.resolution_x = 768
scene.render.resolution_y = 768
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"

dist = size * 1.4
views = {
    "front": (center.x, center.y - dist, center.z, 1.5708, 0, 0),
    "right": (center.x + dist, center.y, center.z, 1.5708, 0, 1.5708),
    "back": (center.x, center.y + dist, center.z, 1.5708, 0, 3.1416),
    "left": (center.x - dist, center.y, center.z, 1.5708, 0, -1.5708),
    "threeq": (center.x + dist * 0.7, center.y - dist * 0.7, center.z + size * 0.15, 1.2, 0, 0.7),
}

# glTF Y-up import in Blender is Z-up after import typically.
# Tripo GLBs often have character standing on XY with Y up in glTF = Z up in Blender.
# The above assumes Blender Z-up, character facing -Y. If facing is wrong, stills still show the body.

for name, (x, y, z, rx, ry, rz) in views.items():
    cam.location = (x, y, z)
    cam.rotation_euler = (rx, ry, rz)
    # Look at center
    direction = center - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    path = out_dir / f"char_doryseus_08_{name}.png"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    print(f"[preview] wrote {path}")
