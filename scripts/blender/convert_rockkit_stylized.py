"""
Convert the downloaded "Rocks Stylized" kit (sahip, 27 Ağu, rock-catalog/)
into a self-contained, low-poly-friendly GLB for a natural Cyclops
cave-wall scatter kit.

Source: ~/Downloads/rock-catalog/Free+Pack+-+Rocks+Stylized.blend — 11
distinct rock meshes (SM_Rocks_01..11), one shared material
"RocksStylized_M" whose own base-color image reference is BROKEN (external
file path from the original artist's machine, resolves to a 0x0 image here)
— same class of bug as ASSET-117's MTL absolute-Windows-path issue. Real
textures live in the separate Textures.rar (stones_baseColor/Normal/
Roughness/Metalness/AO.png, already extracted to scratch).

Unlike ASSET-117 (a distant, unlit, fog-blended silhouette where PBR detail
is wasted), this kit is meant for a close-up, walkable cave-wall — real
normal+roughness shading is worth keeping, just downsized hard (source maps
are 4096px, tens of MB each).

Run: blender --background --python scripts/blender/convert_rockkit_stylized.py
"""

import bpy
import os

BLEND_SRC = os.path.expanduser("~/Downloads/rock-catalog/Free+Pack+-+Rocks+Stylized.blend")
TEX_DIR = "/private/tmp/claude-501/-Users-dori-Desktop-yeni-oyun/0f4a3a2b-d353-48c2-9161-7a6aaa014063/scratchpad/rock_extract"
OUT_GLB = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "public", "assets", "models", "rock_stylized_kit_01_mesh_11pcs.glb",
)
ALBEDO_MAX = 1024
DATA_MAX = 512  # normal/roughness — detail is subtle at typical view distance anyway

bpy.ops.wm.open_mainfile(filepath=BLEND_SRC)

mesh_objs = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("SM_Rocks_")]
print(f"found {len(mesh_objs)} rock meshes:", [o.name for o in mesh_objs])
assert len(mesh_objs) >= 1, "no SM_Rocks_* meshes found"

mat = bpy.data.materials.get("RocksStylized_M")
assert mat is not None, "RocksStylized_M material missing"
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links

bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
assert bsdf is not None, "no Principled BSDF on RocksStylized_M"

# Rewire base color to the real local file (broken external ref replaced).
albedo_img = bpy.data.images.load(os.path.join(TEX_DIR, "stones_baseColor.png"))
albedo_tex = next(
    (n for n in nodes if n.type == "TEX_IMAGE" and n.image and n.image.name == "bake_albedo_1"),
    None,
)
if albedo_tex is None:
    albedo_tex = nodes.new("ShaderNodeTexImage")
albedo_tex.image = albedo_img
if not albedo_tex.outputs["Color"].links:
    links.new(albedo_tex.outputs["Color"], bsdf.inputs["Base Color"])
else:
    # ensure it actually feeds Base Color even if some other link existed
    for link in list(bsdf.inputs["Base Color"].links):
        links.remove(link)
    links.new(albedo_tex.outputs["Color"], bsdf.inputs["Base Color"])

# Roughness (plug straight in, no separate node needed for a simple map).
rough_img = bpy.data.images.load(os.path.join(TEX_DIR, "stones_Roughness.png"))
rough_img.colorspace_settings.name = "Non-Color"
rough_tex = nodes.new("ShaderNodeTexImage")
rough_tex.image = rough_img
for link in list(bsdf.inputs["Roughness"].links):
    links.remove(link)
links.new(rough_tex.outputs["Color"], bsdf.inputs["Roughness"])

# Normal map via a Normal Map node (glTF export needs this node, not a raw link).
normal_img = bpy.data.images.load(os.path.join(TEX_DIR, "stones_Normal.png"))
normal_img.colorspace_settings.name = "Non-Color"
normal_tex = nodes.new("ShaderNodeTexImage")
normal_tex.image = normal_img
normal_map_node = nodes.new("ShaderNodeNormalMap")
links.new(normal_tex.outputs["Color"], normal_map_node.inputs["Color"])
for link in list(bsdf.inputs["Normal"].links):
    links.remove(link)
links.new(normal_map_node.outputs["Normal"], bsdf.inputs["Normal"])

# No metalness — this is rock; force it to 0 rather than trust the kit's map.
bsdf.inputs["Metallic"].default_value = 0.0

for img, target in ((albedo_img, ALBEDO_MAX), (rough_img, DATA_MAX), (normal_img, DATA_MAX)):
    w, h = img.size
    if w <= target and h <= target:
        continue
    scale = target / max(w, h)
    img.scale(max(1, round(w * scale)), max(1, round(h * scale)))
    print(f"downsized {img.name}: {w}x{h} -> {img.size[0]}x{img.size[1]}")

# Center each rock's own origin near its geometry (Blender's own gizmo
# convention) so later runtime scatter code can trust position==pivot; keep
# each as its own object (do NOT join) — the whole point is per-piece reuse,
# same convention as ISLAND_KIT.boulder / the tree pack.
bpy.ops.object.select_all(action="DESELECT")
for o in mesh_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = mesh_objs[0]
bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")

os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_draco_mesh_compression_enable=False,
)
print("wrote", OUT_GLB, os.path.getsize(OUT_GLB), "bytes")
