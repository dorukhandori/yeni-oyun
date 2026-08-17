#!/usr/bin/env python3
"""Build Lotophagoi sea as designed 3D meshes (Blender 5.2, headless).

Sahip 17 Aug: shader / CPU-plane water failed playtest — rebuild from
sculpted tiles, island-kit style. Vertex colours from art-bible.md §2.
No baked lighting. Origin at tile centre, height on +Z (glTF Y-up).

  blender --background --python scripts/blender/build_sea.py
  npm run gen:sea
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

# art-bible.md §2 (linear 0–1)
SHALLOW = (0.247, 0.784, 0.753)  # #3fc8c0
DEEP = (0.078, 0.314, 0.498)  # #14507f
FOAM = (0.984, 0.969, 0.937)  # #fbf7ef
LAGOON = (0.365, 0.561, 0.525)  # #5d8f86
LAGOON_DARK = (0.220, 0.380, 0.360)

SEED = 20260817
ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "assets" / "models"


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)


def new_mesh_object(name: str, bm: bmesh.types.BMesh) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def shade_smooth(obj: bpy.types.Object) -> None:
    for p in obj.data.polygons:
        p.use_smooth = True


def make_material(name: str, color: tuple[float, float, float], roughness: float) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Color"
    attr.location = (-280, 200)
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def assign_mat(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def paint_colors(obj: bpy.types.Object, colors: list[tuple[float, float, float]]) -> None:
    mesh = obj.data
    if "Color" in mesh.color_attributes:
        mesh.color_attributes.remove(mesh.color_attributes["Color"])
    attr = mesh.color_attributes.new(name="Color", type="BYTE_COLOR", domain="POINT")
    for i, col in enumerate(colors):
        attr.data[i].color = (*col, 1.0)


def lerp(a: tuple[float, float, float], b: tuple[float, float, float], t: float) -> tuple[float, float, float]:
    t = max(0.0, min(1.0, t))
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def wave_height(x: float, y: float) -> float:
    return (
        0.62 * math.sin(x * 0.85 + y * 0.18)
        + 0.36 * math.sin(x * 0.31 + y * 1.12)
        + 0.18 * math.sin(x * 1.55 + y * 1.35 + 0.7)
    )


def build_wave_tile() -> bpy.types.Object:
    """14 m sculpted chop — crests along X so tiles can face the shore."""
    bm = bmesh.new()
    n = 18
    span = 14.0
    half = span * 0.5
    grid: list[list[bmesh.types.BMVert]] = []
    for j in range(n + 1):
        row: list[bmesh.types.BMVert] = []
        y = -half + span * j / n
        for i in range(n + 1):
            x = -half + span * i / n
            z = wave_height(x, y)
            v = bm.verts.new(Vector((x, y, z)))
            row.append(v)
        grid.append(row)
    bm.verts.ensure_lookup_table()
    for j in range(n):
        for i in range(n):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    obj = new_mesh_object("water_wave", bm)
    shade_smooth(obj)
    ordered = []
    for v in obj.data.vertices:
        # bmesh indices may not match after to_mesh; recompute from position
        x, y, z = v.co.x, v.co.y, v.co.z
        t = (z + 0.85) / 1.7
        if t > 0.78:
            ordered.append(lerp(SHALLOW, FOAM, (t - 0.78) / 0.22))
        elif t < 0.38:
            ordered.append(lerp(DEEP, SHALLOW, t / 0.38))
        else:
            ordered.append(SHALLOW)
    paint_colors(obj, ordered)
    assign_mat(obj, make_material("sea_wave", SHALLOW, 0.18))
    return obj


def build_foam_crest() -> bpy.types.Object:
    """Breaker lip — instance along the shore and around the hull."""
    bm = bmesh.new()
    length = 9.0
    segs = 12
    rings = []
    for i in range(segs + 1):
        t = i / segs
        x = -length * 0.5 + length * t
        yaw = math.sin(t * math.pi * 2.2) * 0.35
        z = 0.12 + 0.28 * math.sin(t * math.pi)
        w = 0.22 + 0.18 * math.sin(t * math.pi)
        ring = []
        for ox, oz in ((-w, 0.0), (0.0, z), (w, 0.02)):
            v = bm.verts.new(Vector((x, ox + yaw, oz)))
            ring.append(v)
        rings.append(ring)
    bm.verts.ensure_lookup_table()
    for i in range(segs):
        a, b = rings[i], rings[i + 1]
        bm.faces.new((a[0], b[0], b[1], a[1]))
        bm.faces.new((a[1], b[1], b[2], a[2]))
    obj = new_mesh_object("water_foamcrest", bm)
    shade_smooth(obj)
    cols = []
    for v in obj.data.vertices:
        peak = max(0.0, min(1.0, v.co.z / 0.42))
        cols.append(lerp(SHALLOW, FOAM, 0.45 + peak * 0.55))
    paint_colors(obj, cols)
    assign_mat(obj, make_material("sea_foam", FOAM, 0.42))
    return obj


def build_lagoon() -> bpy.types.Object:
    """Still disc — no surf. Radius 12 m, matches LAGOON.radius."""
    bm = bmesh.new()
    rings = 8
    segs = 32
    radius = 12.0
    rings_v: list[list[bmesh.types.BMVert]] = []
    center = bm.verts.new(Vector((0.0, 0.0, 0.02)))
    for r in range(1, rings + 1):
        row = []
        rad = radius * r / rings
        for s in range(segs):
            a = (s / segs) * math.pi * 2
            x = math.cos(a) * rad
            y = math.sin(a) * rad
            z = 0.03 * math.sin(x * 0.55 + y * 0.4) * (1.0 - r / rings)
            row.append(bm.verts.new(Vector((x, y, z))))
        rings_v.append(row)
    bm.verts.ensure_lookup_table()
    inner = rings_v[0]
    for s in range(segs):
        bm.faces.new((center, inner[s], inner[(s + 1) % segs]))
    for r in range(rings - 1):
        a, b = rings_v[r], rings_v[r + 1]
        for s in range(segs):
            bm.faces.new((a[s], b[s], b[(s + 1) % segs], a[(s + 1) % segs]))
    obj = new_mesh_object("water_lagoon", bm)
    shade_smooth(obj)
    cols = []
    for v in obj.data.vertices:
        d = math.hypot(v.co.x, v.co.y) / radius
        cols.append(lerp(LAGOON, LAGOON_DARK, d * 0.65))
    paint_colors(obj, cols)
    assign_mat(obj, make_material("lagoon", LAGOON, 0.55))
    return obj


def export_glb(obj: bpy.types.Object, stem: str) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{stem}.glb"
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_materials="EXPORT",
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
    )
    faces = len(obj.data.polygons)
    kb = out.stat().st_size / 1024
    print(f"  {out.name}  {faces} faces  {kb:.1f} KB")
    return out


def main() -> int:
    print(f"Sea kit → {OUT_DIR} (seed {SEED})")
    reset_scene()
    wave = build_wave_tile()
    export_glb(wave, "water_wave_01_mesh_800")
    reset_scene()
    foam = build_foam_crest()
    export_glb(foam, "water_foamcrest_01_mesh_200")
    reset_scene()
    lagoon = build_lagoon()
    export_glb(lagoon, "water_lagoon_01_mesh_400")
    return 0


if __name__ == "__main__":
    sys.exit(main())
