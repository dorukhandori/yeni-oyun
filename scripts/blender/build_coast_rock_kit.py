#!/usr/bin/env python3
"""Build a procedural, asymmetric coastal rock kit for the Cyclops cove
shoreline (Blender 5.2 headless) — replaces the failed photogrammetry scan
(ASSET-121, reverted: source scan was a densely-packed rock PILE, so every
isolated piece came out as a torn/holed shell — see that asset's registry
entry for the full root-cause writeup).

Same geometry technique as `build_island_kit.py`'s `build_boulder()` (already
shipped, live on Lotus as ASSET-068/069) — a MULTI-BLOB union per rock (2-4
overlapping ico-spheres at randomized offsets/scales, same join-based
technique as that script's `build_olive()` canopy) so each rock reads as a
genuinely irregular, asymmetric weathered boulder instead of one deformed
sphere — sahip: "gerçekçi, asimetrik ... gerçek bir sahil hissi."

**Materyal (v2, 27 Ağu — sahip: "sahildeki beyaz kayaların deseni bizim
katalogdaki desen olsun, gerçeğe yakın olsun"):** v1 vertex-colour düz
tebeşir tonuydu (`build_island_kit.py` ile aynı, doku dosyası yok) — sahip
bunu yeterince "gerçek" bulmadı. Artık ASSET-119'un kendi taş kataloğunun
(`rock_stylized_kit_01_mesh_11pcs.glb`, RocksStylized_M — 11 farklı gerçek
taş fotoğrafının UV-atlas'ı, yosun/likenli koyu gri kireçtaşı) gömülü
`stones_baseColor/Normal/Roughness.png` dokuları `extract_rockkit_textures.py`
(tek seferlik, saf Python — Blender gerekmez) ile `art-source/raw/`'a
ayıklanıp buraya yeniden uygulanıyor — `bpy.ops.uv.smart_project()` ile her
kayanın kendi UV'si (çok-blob birleşimi düzensiz bir silüet olduğu için
otomatik/triplanar değil, gerçek bir unwrap gerekiyor).

12 pieces across 3 size tiers (small pebble → large outcrop boulder) so the
runtime scatter can vary density/scale for a natural, uneven coastline
("uçtan uca adamızı kaplayabilsin ama kum hissi önemli" — sand must stay
visible between rocks; that's a placement/density concern, handled in
cyclopsCave.ts, not here).

  blender --background --python scripts/blender/build_coast_rock_kit.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector, noise

SEED = 20260827
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "models" / "rock_coast_kit_01_mesh_12pcs.glb"
TEX_DIR = ROOT / "art-source" / "raw"


def rng(i: int, j: int = 0) -> float:
    return noise.noise(Vector((i * 0.173 + SEED * 0.001, j * 0.271, 0.5))) * 0.5 + 0.5


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)


def make_rock_catalog_material() -> bpy.types.Material:
    """ASSET-119's own real stone photo (stones_baseColor/Normal/Roughness,
    extracted by extract_rockkit_textures.py) — same node-wiring pattern as
    convert_rockkit_stylized.py used for the original 11-piece kit, so this
    procedural kit's rocks read as the SAME material/pattern sahip already
    approved ("bizim katalogdaki desen olsun, gerçeğe yakın olsun"), not a
    flat vertex-colour tint.
    """
    mat = bpy.data.materials.new("coast_rock_catalog")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")

    albedo_img = bpy.data.images.load(str(TEX_DIR / "rockkit_stones_baseColor.png"))
    albedo_tex = nt.nodes.new("ShaderNodeTexImage")
    albedo_tex.image = albedo_img
    albedo_tex.location = (-560, 300)
    nt.links.new(albedo_tex.outputs["Color"], bsdf.inputs["Base Color"])

    rough_img = bpy.data.images.load(str(TEX_DIR / "rockkit_stones_Roughness.png"))
    rough_img.colorspace_settings.name = "Non-Color"
    rough_tex = nt.nodes.new("ShaderNodeTexImage")
    rough_tex.image = rough_img
    rough_tex.location = (-560, 40)
    nt.links.new(rough_tex.outputs["Color"], bsdf.inputs["Roughness"])

    normal_img = bpy.data.images.load(str(TEX_DIR / "rockkit_stones_Normal.png"))
    normal_img.colorspace_settings.name = "Non-Color"
    normal_tex = nt.nodes.new("ShaderNodeTexImage")
    normal_tex.image = normal_img
    normal_tex.location = (-560, -220)
    normal_map_node = nt.nodes.new("ShaderNodeNormalMap")
    normal_map_node.location = (-280, -220)
    nt.links.new(normal_tex.outputs["Color"], normal_map_node.inputs["Color"])
    nt.links.new(normal_map_node.outputs["Normal"], bsdf.inputs["Normal"])

    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def unwrap_uv(obj: bpy.types.Object) -> None:
    # Çok-blob birleşimi düzensiz/kıvrımlı bir silüet — otomatik box/
    # triplanar mapping yerine gerçek bir Smart UV Project gerekiyor ki
    # gerçek taş dokusu her yüzeyde makul oranda otursun, gerilmesin.
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.03)
    bpy.ops.object.mode_set(mode="OBJECT")


def assign_mat(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def displace_verts(obj: bpy.types.Object, scale: float, amp: float, seed: int) -> None:
    mesh = obj.data
    for v in mesh.vertices:
        n = noise.noise(v.co * scale + Vector((seed * 0.17, 0.4, 0.2)))
        n2 = noise.noise(v.co * scale * 2.3 + Vector((0.8, seed * 0.11, 0.1))) * 0.45
        v.co += v.normal * (n + n2) * amp


def flatten_bottom(obj: bpy.types.Object, keep: float = 0.22) -> None:
    zs = [v.co.z for v in obj.data.vertices]
    lo, hi = min(zs), max(zs)
    cut = lo + (hi - lo) * keep
    for v in obj.data.vertices:
        if v.co.z < cut:
            v.co.z = lo + (v.co.z - lo) * 0.15


def decimate(obj: bpy.types.Object, ratio: float) -> None:
    mod = obj.modifiers.new("KitDecimate", "DECIMATE")
    mod.ratio = ratio
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier="KitDecimate")


def shade_smooth(obj: bpy.types.Object, angle_deg: float = 27.0) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle_deg))
    except Exception:
        bpy.ops.object.shade_smooth()


def plant_on_ground(obj: bpy.types.Object) -> None:
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    min_z = min(c.z for c in corners)
    cx = (min(c.x for c in corners) + max(c.x for c in corners)) * 0.5
    cy = (min(c.y for c in corners) + max(c.y for c in corners)) * 0.5
    obj.location.x -= cx
    obj.location.y -= cy
    obj.location.z -= min_z
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def build_rock(
    name: str, idx: int, blob_count: int, base_radius: float, squash: float, mat: bpy.types.Material
) -> bpy.types.Object:
    """Multi-blob union — 2-4 overlapping ico-spheres at randomized offsets/
    scales, joined into one mesh (same technique as build_island_kit.py's
    build_olive() canopy). This is what gives a genuinely irregular,
    asymmetric silhouette instead of one deformed sphere: real weathered
    boulders read as several fused lumps, not a smooth ellipsoid.
    """
    blobs: list[bpy.types.Object] = []
    for b in range(blob_count):
        r = base_radius * (0.5 + rng(idx, b * 3 + 1) * 0.75)
        # Wider offset spread than a simple pile of touching spheres — pushes
        # blobs further apart so the union reads as one twisted/elongated
        # mass with real silhouette breaks, not a cluster of round balls.
        off = Vector((
            (rng(idx, b * 3 + 2) - 0.5) * base_radius * 1.9,
            (rng(idx, b * 3 + 3) - 0.5) * base_radius * 1.9,
            r * (0.3 + rng(idx, b * 3 + 4) * 0.4),
        ))
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r, location=off)
        blob = bpy.context.active_object
        # Rotate each blob's own local axes before the non-uniform scale so
        # the elongation direction varies per-blob (not always axis-aligned
        # with its neighbours) — more angular/twisted, less "pile of eggs."
        blob.rotation_euler = (
            (rng(idx, b * 7 + 30) - 0.5) * 1.4,
            (rng(idx, b * 7 + 31) - 0.5) * 1.4,
            rng(idx, b * 7 + 32) * math.pi * 2,
        )
        sx = 0.65 + rng(idx, b * 5 + 10) * 0.95
        sy = 0.65 + rng(idx, b * 5 + 11) * 0.95
        sz = squash * (0.6 + rng(idx, b * 5 + 12) * 0.65)
        blob.scale = (sx, sy, sz)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        # Two-frequency displacement: a coarse low-freq pass for big
        # characterful dents/knuckles (rocks, not pebbles) + the original
        # finer pass for surface break-up.
        displace_verts(blob, scale=0.9 / max(base_radius, 0.2), amp=base_radius * 0.22, seed=idx * 13 + b)
        displace_verts(blob, scale=2.6 / max(base_radius, 0.2), amp=base_radius * 0.09, seed=idx * 13 + b + 100)
        blobs.append(blob)

    bpy.ops.object.select_all(action="DESELECT")
    for blob in blobs:
        blob.select_set(True)
    bpy.context.view_layer.objects.active = blobs[0]
    if len(blobs) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name

    flatten_bottom(obj, keep=0.2 + rng(idx, 90) * 0.12)
    obj.data.update()
    tri_count = len(obj.data.polygons)
    target_ratio = min(1.0, 900 / max(1, tri_count))
    if target_ratio < 0.95:
        decimate(obj, target_ratio)
    unwrap_uv(obj)
    assign_mat(obj, mat)
    plant_on_ground(obj)
    shade_smooth(obj)
    return obj


# 3 size tiers: small pebble -> mid rock -> large outcrop boulder. Each
# entry: (idx, blob_count, base_radius, squash).
SPECS = [
    # small (0.18-0.32 m base radius, 1-2 blobs — simple pebble-scale)
    (1, 1, 0.18, 0.75),
    (2, 2, 0.22, 0.7),
    (3, 1, 0.28, 0.8),
    (4, 2, 0.32, 0.65),
    # mid (0.45-0.75 m, 2-3 blobs — the workhorse "kayalık kıyı" rock)
    (5, 2, 0.48, 0.72),
    (6, 3, 0.58, 0.68),
    (7, 2, 0.66, 0.75),
    (8, 3, 0.74, 0.62),
    # large (0.95-1.6 m, 3-4 blobs — dramatic outcrop accents, sparse use)
    (9, 3, 0.98, 0.7),
    (10, 4, 1.18, 0.6),
    (11, 3, 1.35, 0.68),
    (12, 4, 1.58, 0.58),
]


def main() -> int:
    reset_scene()
    # Tek paylaşılan malzeme — 12 kaya da aynı dokuyu kullanıyor, ayrı ayrı
    # materyal/doku yaratmak GLB'ye aynı görüntüyü 12 kez gömerdi.
    shared_mat = make_rock_catalog_material()
    objs = []
    for idx, blob_count, base_radius, squash in SPECS:
        obj = build_rock(f"SM_CoastRock_{idx:02d}", idx, blob_count, base_radius, squash, shared_mat)
        objs.append(obj)
        tris = len(obj.data.polygons)
        print(f"  {obj.name}: r={base_radius:.2f} blobs={blob_count} tris={tris}")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
    )
    kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT.relative_to(ROOT)} ({kb:.1f} KB, {len(objs)} pieces)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
