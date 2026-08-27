"""
Convert the ambientCG Terrain003 OBJ+MTL download (CC0) into a single
self-contained GLB for Cyclops's distant "infinity" backdrop.

Source: ~/Downloads/terrain/terrain.obj + terrain.mtl + textures_2k/
(sahip'in indirdiği, https://ambientcg.com/a/Terrain003 — CC0 lisans, gerçek
heykellenmiş arazi meshi, 2047 üçgen).

We only keep the albedo map (downsized) — this mesh is meant to render as an
unlit, fog-blended silhouette far behind the play area (same treatment as
terrain.ts's own buildHillBackdropRing), so normal/roughness/AO/metallic maps
would only add weight with zero visible benefit at that distance.

Run: blender --background --python scripts/blender/convert_terrain003_ambientcg.py
"""

import bpy
import os

SRC_OBJ = os.path.expanduser("~/Downloads/terrain/terrain.obj")
SRC_ALBEDO = os.path.expanduser("~/Downloads/terrain/textures_2k/terrain_Albedo.png")
OUT_GLB = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "public", "assets", "models", "terrain_backdrop_01_mesh_2000.glb",
)
MAX_DIM = 1024  # albedo only; background silhouette doesn't need more
TARGET_WIDTH = 480.0  # game-world metres across the mesh's longest horizontal axis

# ---------------------------------------------------------------- clean scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# --------------------------------------------------------------------- import
bpy.ops.wm.obj_import(filepath=SRC_OBJ, forward_axis="NEGATIVE_Z", up_axis="Y")

mesh_objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
assert mesh_objs, "no mesh imported"
print(f"imported {len(mesh_objs)} mesh object(s)")
for o in mesh_objs:
    print(" ", o.name, len(o.data.polygons), "polys")

# --------------------------------------------------------- rebuild material
# The MTL's map_Kd points at an absolute Windows path
# (C:\Users\Hunter\Desktop\terrain\textures\terrain_Albedo.png) that doesn't
# resolve here, so Blender's importer silently loaded no texture at all.
# Load the real local file directly and wire it into a fresh unlit-ish
# material — this mesh only ever renders as a fog-blended, unlit distant
# silhouette (matching terrain.ts's own buildHillBackdropRing treatment), so
# normal/roughness/AO/metallic maps are dropped entirely, not just unlinked.
albedo_img = bpy.data.images.load(SRC_ALBEDO)
mat = bpy.data.materials.new("terrain_backdrop")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links
nodes.clear()
out = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
tex = nodes.new("ShaderNodeTexImage")
tex.image = albedo_img
links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
bsdf.inputs["Roughness"].default_value = 1.0

for o in mesh_objs:
    o.data.materials.clear()
    o.data.materials.append(mat)

# Downsize the albedo image in place before export.
w, h = albedo_img.size
if w > MAX_DIM or h > MAX_DIM:
    scale = MAX_DIM / max(w, h)
    albedo_img.scale(max(1, round(w * scale)), max(1, round(h * scale)))
    print(f"downsized albedo: {w}x{h} -> {albedo_img.size[0]}x{albedo_img.size[1]}")

# ------------------------------------------------------------ center + level
import mathutils

bpy.ops.object.select_all(action="DESELECT")
for o in mesh_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = mesh_objs[0]
if len(mesh_objs) > 1:
    bpy.ops.object.join()
terrain = bpy.context.view_layer.objects.active
bpy.context.view_layer.update()

# NB: Blender's own scene space is Z-up at this point (export_yup=True below
# does the Z->Y swap only at export time) — so the mesh's true "height" axis
# here is Blender Z, not Y (Y is the second *horizontal* axis in this obj).
bbox_world = [terrain.matrix_world @ mathutils.Vector(c) for c in terrain.bound_box]
xs = [v.x for v in bbox_world]
ys = [v.y for v in bbox_world]
zs = [v.z for v in bbox_world]
cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
base_z = min(zs)
size_x = max(xs) - min(xs)
size_y = max(ys) - min(ys)
size_z = max(zs) - min(zs)
print(f"raw size x={size_x:.1f} y={size_y:.1f} z(height)={size_z:.1f}")

scale = TARGET_WIDTH / max(size_x, size_y)
print(f"scale factor {scale:.6f}")

# Re-center on X/Y (Blender-horizontal), drop the base to Blender-Z=0 (game
# Y=0 after export_yup), then uniformly scale to TARGET_WIDTH.
terrain.location = (-cx * scale, -cy * scale, -base_z * scale)
terrain.scale = (scale, scale, scale)
bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)

# ------------------------------------------------------------------ export
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_draco_mesh_compression_enable=False,
)
print("wrote", OUT_GLB, os.path.getsize(OUT_GLB), "bytes")
