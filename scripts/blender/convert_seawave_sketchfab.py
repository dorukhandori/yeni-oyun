"""
Convert the downloaded Sketchfab "Sea wave / Deniz dalgası" GLB (sahip, 27
Ağu) into a self-contained, Cyclops-ready GLB.

Source: ~/Downloads/sea_wave-_deniz_dalgas.glb — single Plane001 mesh, real
displaced wave geometry (not flat), 107k tri, photoreal wave-photo texture
(alphaMode BLEND, ~0.9 baseColor alpha). Node hierarchy carries the classic
FBX-origin wrapper chain (Sketchfab_model -> *.fbx -> RootNode -> Plane001 ->
mesh) — same shape that baked an axis-correction rotation onto a node's own
transform in ASSET-116 (tree pack) earlier this session. Fix here is simpler
than that case: we import the WHOLE scene and bake each mesh's fully-resolved
world matrix into its geometry (not cherry-picking a sub-node out of its
ancestor chain), so the correction composes correctly automatically.

Run: blender --background --python scripts/blender/convert_seawave_sketchfab.py
"""

import bpy
import os
import mathutils

SRC_GLB = os.path.expanduser("~/Downloads/sea_wave-_deniz_dalgas.glb")
OUT_GLB = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "public", "assets", "models", "sea_wave_crest_01_mesh_107k.glb",
)
MAX_DIM = 1024

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC_GLB)

mesh_objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
assert mesh_objs, "no mesh imported"
print(f"imported {len(mesh_objs)} mesh object(s)")

bpy.context.view_layer.update()

# Bake each mesh's fully-resolved WORLD transform into its own geometry, then
# clear the object's transform to identity — this is the technique that fixed
# ASSET-116's tilted trees (same FBX-wrapper node-chain shape as this file).
for obj in mesh_objs:
    mesh = obj.data.copy()
    mesh.transform(obj.matrix_world)
    obj.data = mesh
    obj.matrix_world = mathutils.Matrix.Identity(4)
bpy.context.view_layer.update()

bpy.ops.object.select_all(action="DESELECT")
for o in mesh_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = mesh_objs[0]
if len(mesh_objs) > 1:
    bpy.ops.object.join()

wave = bpy.context.view_layer.objects.active
bpy.context.view_layer.update()

# `object.bound_box` can read stale/cached data right after an `obj.data =`
# swap — compute the true bbox directly from vertex coordinates instead
# (matrix_world is already Identity at this point, so local == world).
verts = wave.data.vertices
xs = [v.co.x for v in verts]
ys = [v.co.y for v in verts]
zs = [v.co.z for v in verts]
print(f"post-bake bbox x[{min(xs):.1f},{max(xs):.1f}] y[{min(ys):.1f},{max(ys):.1f}] z[{min(zs):.1f},{max(zs):.1f}]")

# Blender's own glTF importer already resolved Y-up(file)->Z-up(Blender) at
# import time, and we baked that into vertex data — so Blender-Z here really
# is the up axis, no manual-axis ambiguity like the plain-OBJ terrain import.
cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
base_z = min(zs)
for v in wave.data.vertices:
    v.co.x -= cx
    v.co.y -= cy
    v.co.z -= base_z
wave.data.update()

# Downsize the (single) baseColor image.
for img in bpy.data.images:
    w, h = img.size
    if w <= MAX_DIM and h <= MAX_DIM:
        continue
    scale = MAX_DIM / max(w, h)
    img.scale(max(1, round(w * scale)), max(1, round(h * scale)))
    print(f"downsized {img.name}: {w}x{h} -> {img.size[0]}x{img.size[1]}")

os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_draco_mesh_compression_enable=False,
)
print("wrote", OUT_GLB, os.path.getsize(OUT_GLB), "bytes")
