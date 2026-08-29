"""Render sampled frames of every animation clip in a GLB.

744c7f8's lesson: bone-travel numbers prove motion EXISTS, not that it looks
like anything. Every clip QA pass has to end in pixels.

Usage:
  blender --background --python scripts/blender/render_clip_frames.py -- <glb> <out_dir> [frames_per_clip]
"""
import sys, math
from pathlib import Path
import bpy, mathutils

argv = sys.argv[sys.argv.index("--") + 1:]
glb = Path(argv[0]).resolve()
out_dir = Path(argv[1]).resolve()
n_frames = int(argv[2]) if len(argv) > 2 else 4
out_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
meshes = [o for o in bpy.data.objects if o.type == "MESH"]

# Evaluated bbox: bound_box is the REST cage and ignores armature deform, so
# framing off it puts a posed figure half out of frame.
deps = bpy.context.evaluated_depsgraph_get()
mins = mathutils.Vector((1e9,) * 3); maxs = mathutils.Vector((-1e9,) * 3)
for o in meshes:
    ev = o.evaluated_get(deps)
    for v in ev.data.vertices:
        w = o.matrix_world @ v.co
        for i in range(3):
            mins[i] = min(mins[i], w[i]); maxs[i] = max(maxs[i], w[i])
size = maxs - mins
center = (maxs + mins) / 2
print(f"[bbox] size={tuple(round(v,3) for v in size)}")

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
scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.film_transparent = False

# 3/4 front view: shows arm swing and leg separation at once, unlike a strict
# side or front where one of the two collapses.
dist = max(size) * 3
off = mathutils.Vector((dist * 0.82, -dist * 0.55, dist * 0.22))
cam.location = center + off
cam.rotation_euler = (center - cam.location).normalized().to_track_quat('-Z', 'Y').to_euler()

if not arm.animation_data:
    arm.animation_data_create()
for track in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(track)

actions = sorted(bpy.data.actions, key=lambda a: a.name)
print(f"[clips] {[a.name for a in actions]}")
for action in actions:
    arm.animation_data.action = action
    if hasattr(arm.animation_data, "action_slot") and action.slots:
        arm.animation_data.action_slot = action.slots[0]
    lo, hi = int(round(action.frame_range[0])), int(round(action.frame_range[1]))
    step = max(1, (hi - lo) // max(1, n_frames - 1))
    for k in range(n_frames):
        f = min(hi, lo + k * step)
        scene.frame_set(f)
        bpy.context.view_layer.update()
        safe = action.name.replace(":", "_").replace("/", "_")
        scene.render.filepath = str(out_dir / f"{safe}_f{f:03d}.png")
        bpy.ops.render.render(write_still=True)
    print(f"[wrote] {action.name} frames {lo}-{hi}")
