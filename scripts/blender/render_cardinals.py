"""Render true cardinal views of a GLB by measuring which axis is the facing axis."""
import sys, math
from pathlib import Path
import bpy, mathutils

glb = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
out_dir = Path(sys.argv[sys.argv.index("--") + 2]).resolve()
out_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))

# world bbox
mins = mathutils.Vector((1e9,)*3); maxs = mathutils.Vector((-1e9,)*3)
for o in bpy.data.objects:
    if o.type != "MESH": continue
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c)
        for i in range(3):
            mins[i] = min(mins[i], w[i]); maxs[i] = max(maxs[i], w[i])
size = maxs - mins
center = (maxs + mins) / 2
print(f"[bbox] min={tuple(round(v,3) for v in mins)} max={tuple(round(v,3) for v in maxs)} size={tuple(round(v,3) for v in size)}")

# Blender Z-up: Z is height. The WIDER horizontal axis is the arm span (X or Y).
span_axis = 0 if size[0] > size[1] else 1     # arms
face_axis = 1 - span_axis                      # facing
print(f"[axes] arm-span axis={'XY'[span_axis]} facing axis={'XY'[face_axis]}")

world = bpy.data.worlds.new("W"); world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.72, 0.71, 0.69, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 1.6
bpy.context.scene.world = world

sun_data = bpy.data.lights.new("S", type="SUN"); sun_data.energy = 3.0
sun = bpy.data.objects.new("S", sun_data); bpy.context.collection.objects.link(sun)
sun.rotation_euler = (math.radians(55), 0, math.radians(35))

cam_data = bpy.data.cameras.new("C"); cam_data.type = "ORTHO"
cam_data.ortho_scale = max(size) * 1.25
cam = bpy.data.objects.new("C", cam_data); bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = scene.render.resolution_y = 768
scene.render.film_transparent = False

dist = max(size) * 3
# (name, offset direction) — facing axis positive/negative and span axis for sides
views = {}
for name, vec in [
    ("A", ( 1, 0)), ("B", (-1, 0)), ("C", (0, 1)), ("D", (0,-1)),
]:
    off = mathutils.Vector((0,0,0))
    off[face_axis] = vec[0] * dist
    off[span_axis] = vec[1] * dist
    views[name] = off

for name, off in views.items():
    cam.location = center + off
    d = (center - cam.location).normalized()
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(out_dir / f"cardinal_{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"[wrote] {name}")
