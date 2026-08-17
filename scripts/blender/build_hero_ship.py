#!/usr/bin/env python3
"""Build the Lotophagoi hero home-hull (LOT-52) in Blender 5.2 (headless).

Invented house-galley: ~14 m × ~4 m, bleached wood, threshold gap + gangplank,
12 amphorae, always-set sail with slack/belly shapekeys.
docs/art/specs/lot-52-hero-home-hull.md

  blender --background --python scripts/blender/build_hero_ship.py
  npm run gen:hero-ship
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

# art-bible.md §2
WOOD = (0.784, 0.706, 0.604)  # #c8b49a
WOOD_DARK = (0.541, 0.451, 0.345)  # #8a7358
SAIL = (0.937, 0.902, 0.824)  # #efe6d2
SAIL_FOLD = (0.820, 0.780, 0.700)
ROPE = (0.788, 0.659, 0.467)  # #c9a877
EYE_CREAM = (0.945, 0.918, 0.855)
EYE_CHAR = (0.165, 0.145, 0.125)
CLAY = (0.58, 0.48, 0.38)
CLAY_LIP = (0.46, 0.38, 0.30)
HELM = (0.48, 0.40, 0.31)

SEED = 20260817
ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "assets" / "models"
STEM = "ship_hero_01_mesh_4000"

LENGTH = 14.0
BEAM = 4.0
STATIONS = 16
RIBS = 9


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)


def hex_mat(name: str, color: tuple[float, float, float], rough: float = 0.86) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Color"
    attr.location = (-280, 200)
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def name_obj(obj: bpy.types.Object, name: str) -> bpy.types.Object:
    obj.name = name
    if obj.data:
        obj.data.name = name
    return obj


def assign_mat(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def paint(obj: bpy.types.Object, color: tuple[float, float, float], crease: tuple[float, float, float] | None = None) -> None:
    mesh = obj.data
    if "Color" in mesh.color_attributes:
        mesh.color_attributes.remove(mesh.color_attributes["Color"])
    attr = mesh.color_attributes.new(name="Color", type="BYTE_COLOR", domain="POINT")
    zs = [v.co.z for v in mesh.vertices]
    zlo, zhi = min(zs), max(zs)
    span = max(0.001, zhi - zlo)
    for i, v in enumerate(mesh.vertices):
        col = list(color)
        if crease is not None:
            t = (v.co.z - zlo) / span
            if t < 0.22:
                k = 1.0 - t / 0.22
                col = [color[j] * (1 - k) + crease[j] * k for j in range(3)]
        attr.data[i].color = (*col, 1.0)
    mesh.color_attributes.active_color = attr


def new_from_bm(name: str, bm: bmesh.types.BMesh) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def shade_smooth(obj: bpy.types.Object) -> None:
    for p in obj.data.polygons:
        p.use_smooth = True


def half_beam(s: float) -> float:
    t = max(0.0, 1.0 - s * s)
    return (BEAM * 0.5) * (0.30 + 0.70 * (t**0.62))


def deck_z(s: float) -> float:
    return 1.50 + 0.20 * s * s


def keel_z(s: float) -> float:
    return 0.05 + 0.16 * abs(s) ** 1.35


def station_y(i: int) -> float:
    s = i / (STATIONS - 1) * 2.0 - 1.0
    return s * (LENGTH * 0.5), s


def build_hull() -> bpy.types.Object:
    bm = bmesh.new()
    rings: list[list[bmesh.types.BMVert]] = []
    for i in range(STATIONS):
        y, s = station_y(i)
        hb = half_beam(s)
        dz = deck_z(s)
        kz = keel_z(s)
        ring: list[bmesh.types.BMVert] = []
        for k in range(RIBS):
            a = math.pi * k / (RIBS - 1)
            x = hb * math.cos(a)
            z = kz + (dz - kz) * (1.0 - math.sin(a))
            ring.append(bm.verts.new(Vector((x, y, z))))
        rings.append(ring)

    for i in range(STATIONS - 1):
        for k in range(RIBS - 1):
            a, b = rings[i][k], rings[i][k + 1]
            c, d = rings[i + 1][k + 1], rings[i + 1][k]
            bm.faces.new((a, b, c, d))

    # Bow / stern caps (fans to a stem point).
    for end, s_sign in ((rings[-1], 1.0), (rings[0], -1.0)):
        y = s_sign * (LENGTH * 0.5 + 0.35)
        tip = bm.verts.new(Vector((0.0, y, deck_z(s_sign) * 0.55)))
        for k in range(RIBS - 1):
            if s_sign > 0:
                bm.faces.new((end[k], end[k + 1], tip))
            else:
                bm.faces.new((end[k + 1], end[k], tip))

    # Deck, skip starboard midships gap (threshold). x < 0 is shore side.
    for i in range(STATIONS - 1):
        _, s0 = station_y(i)
        _, s1 = station_y(i + 1)
        mid = 0.5 * (s0 + s1)
        gap = abs(mid) < 0.11
        port_a, port_b = rings[i][0], rings[i + 1][0]
        stbd_a, stbd_b = rings[i][-1], rings[i + 1][-1]
        if gap:
            # Close only the port half of the deck so the gap reads as a door.
            mid_a = bm.verts.new(Vector((0.15, rings[i][0].co.y, deck_z(s0))))
            mid_b = bm.verts.new(Vector((0.15, rings[i + 1][0].co.y, deck_z(s1))))
            bm.faces.new((port_a, port_b, mid_b, mid_a))
        else:
            bm.faces.new((port_a, port_b, stbd_b, stbd_a))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = new_from_bm("Hull", bm)
    name_obj(obj, "Hull")
    shade_smooth(obj)
    paint(obj, WOOD, WOOD_DARK)
    assign_mat(obj, hex_mat("hull_wood", WOOD, 0.88))
    return obj


def add_box(
    name: str,
    size: tuple[float, float, float],
    loc: tuple[float, float, float],
    color: tuple[float, float, float],
    rot: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    paint(obj, color, WOOD_DARK if color == WOOD else None)
    assign_mat(obj, hex_mat(name + "_mat", color, 0.84))
    return obj


def add_cyl(
    name: str,
    r_top: float,
    r_bot: float,
    depth: float,
    loc: tuple[float, float, float],
    color: tuple[float, float, float],
    rot: tuple[float, float, float] = (0.0, 0.0, 0.0),
    verts: int = 8,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts,
        radius1=r_bot,
        radius2=r_top,
        depth=depth,
        location=loc,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    paint(obj, color)
    assign_mat(obj, hex_mat(name + "_mat", color, 0.82))
    return obj


def build_rail_and_posts() -> list[bpy.types.Object]:
    bits: list[bpy.types.Object] = []
    # Gunwale cap, broken at the threshold (starboard mid).
    for i in range(STATIONS - 1):
        y0, s0 = station_y(i)
        y1, s1 = station_y(i + 1)
        mid = 0.5 * (s0 + s1)
        gap = abs(mid) < 0.11
        for sign, skip in ((1.0, False), (-1.0, gap)):
            if skip:
                continue
            hb = 0.5 * (half_beam(s0) + half_beam(s1))
            z = 0.5 * (deck_z(s0) + deck_z(s1)) + 0.08
            length = abs(y1 - y0) + 0.04
            bits.append(
                add_box(
                    f"Rail_{i}_{sign:.0f}",
                    (0.10, length * 0.5, 0.09),
                    (sign * (hb + 0.04), 0.5 * (y0 + y1), z),
                    WOOD_DARK,
                )
            )
    # Threshold posts — the door.
    z = deck_z(0.0) + 0.55
    for y in (-0.62, 0.62):
        bits.append(add_cyl("GatePost", 0.07, 0.09, 1.15, (-half_beam(0.0) - 0.02, y, z), WOOD_DARK, verts=6))
    # Rope lintel between posts.
    bits.append(
        add_box("Lintel", (0.05, 0.68, 0.04), (-half_beam(0.0) - 0.02, 0.0, deck_z(0.0) + 1.12), ROPE)
    )
    return bits


def build_ram() -> bpy.types.Object:
    bm = bmesh.new()
    y = LENGTH * 0.5 + 0.15
    z = 0.55
    nose = bm.verts.new(Vector((0.0, y + 0.85, z)))
    base = [
        bm.verts.new(Vector((0.18, y, z + 0.16))),
        bm.verts.new(Vector((-0.18, y, z + 0.16))),
        bm.verts.new(Vector((-0.18, y, z - 0.16))),
        bm.verts.new(Vector((0.18, y, z - 0.16))),
    ]
    bm.faces.new((base[0], base[1], base[2], base[3]))
    for i in range(4):
        bm.faces.new((base[i], base[(i + 1) % 4], nose))
    obj = new_from_bm("Ram", bm)
    paint(obj, WOOD_DARK)
    assign_mat(obj, hex_mat("ram", WOOD_DARK, 0.8))
    return obj


def build_eyes() -> list[bpy.types.Object]:
    bits: list[bpy.types.Object] = []
    y = LENGTH * 0.5 - 1.15
    z = deck_z(0.72) - 0.18
    hb = half_beam(0.72)
    for sign in (-1.0, 1.0):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=12, radius=0.28, depth=0.06, location=(sign * (hb - 0.04), y, z)
        )
        sclera = bpy.context.active_object
        sclera.name = f"Eye_{sign:.0f}"
        sclera.rotation_euler = (0.0, math.pi * 0.5, 0.0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        paint(sclera, EYE_CREAM)
        assign_mat(sclera, hex_mat(sclera.name, EYE_CREAM, 0.55))
        bits.append(sclera)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=10, radius=0.11, depth=0.07, location=(sign * (hb + 0.01), y, z)
        )
        pupil = bpy.context.active_object
        pupil.name = f"Pupil_{sign:.0f}"
        pupil.rotation_euler = (0.0, math.pi * 0.5, 0.0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        paint(pupil, EYE_CHAR)
        assign_mat(pupil, hex_mat(pupil.name, EYE_CHAR, 0.5))
        bits.append(pupil)
    return bits


def build_mast() -> list[bpy.types.Object]:
    mast = add_cyl("Mast", 0.09, 0.13, 8.2, (0.0, 0.55, 1.50 + 4.1), WOOD, verts=8)
    yard = add_cyl(
        "Yard",
        0.055,
        0.055,
        6.4,
        (0.0, 0.55, 7.35),
        WOOD_DARK,
        rot=(0.0, math.pi * 0.5, 0.0),
        verts=6,
    )
    return [mast, yard]


def build_sail() -> bpy.types.Object:
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=10, y_subdivisions=8, size=1.0, location=(0.0, 0.42, 5.15))
    obj = bpy.context.active_object
    obj.name = "Sail"
    if obj.data:
        obj.data.name = "Sail"
    obj.scale = (5.6, 0.08, 3.9)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # Hang from the yard: rotate so the grid faces along the beam.
    obj.rotation_euler = (math.pi * 0.5, 0.0, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    mesh = obj.data
    for v in mesh.vertices:
        edge = min(1.0, abs(v.co.x) / 2.7)
        drop = (1.0 - edge) * 0.22
        v.co.y -= drop * 0.35
        v.co.z -= (1.0 - edge) * 0.06
    mesh.update()
    if obj.data.shape_keys is None:
        obj.shape_key_add(name="Basis")
    belly = obj.shape_key_add(name="belly")
    for i, v in enumerate(mesh.vertices):
        edge = min(1.0, abs(v.co.x) / 2.7)
        belly.data[i].co = v.co.copy()
        belly.data[i].co.y -= 0.55 * (1.0 - edge)
        belly.data[i].co.z -= 0.10 * (1.0 - edge)
    paint(obj, SAIL, SAIL_FOLD)
    assign_mat(obj, hex_mat("sail_cloth", SAIL, 0.78))
    return obj


def build_gangplank() -> bpy.types.Object:
    # Shore side is -X. Short plank from the threshold down onto sand.
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-2.55, 0.0, 0.95))
    obj = bpy.context.active_object
    obj.name = "Gangplank"
    obj.scale = (2.15, 0.42, 0.07)
    obj.rotation_euler = (0.0, 0.38, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    paint(obj, WOOD, WOOD_DARK)
    assign_mat(obj, hex_mat("plank", WOOD, 0.9))
    return obj


def build_jars() -> list[bpy.types.Object]:
    bits: list[bpy.types.Object] = []
    # Two rows of six along the keel, midships — the run pantry.
    z = deck_z(0.0) + 0.38
    idx = 0
    for row, x in enumerate((-0.55, 0.55)):
        for col in range(6):
            y = -1.55 + col * 0.62
            bpy.ops.mesh.primitive_cone_add(
                vertices=8, radius1=0.16, radius2=0.07, depth=0.72, location=(x, y, z)
            )
            body = bpy.context.active_object
            body.name = f"Jar_{idx:02d}"
            paint(body, CLAY, CLAY_LIP)
            assign_mat(body, hex_mat(body.name, CLAY, 0.8))
            bpy.ops.mesh.primitive_torus_add(
                major_radius=0.08, minor_radius=0.025, major_segments=8, minor_segments=6, location=(x, y, z + 0.34)
            )
            lip = bpy.context.active_object
            paint(lip, CLAY_LIP)
            assign_mat(lip, hex_mat(f"JarLip_{idx:02d}", CLAY_LIP, 0.75))
            bpy.ops.object.select_all(action="DESELECT")
            body.select_set(True)
            lip.select_set(True)
            bpy.context.view_layer.objects.active = body
            bpy.ops.object.join()
            jar = bpy.context.active_object
            name_obj(jar, f"Jar_{idx:02d}")
            bits.append(jar)
            idx += 1
    return bits


def build_helm() -> list[bpy.types.Object]:
    y = -LENGTH * 0.5 + 1.05
    z = deck_z(-0.85) + 0.55
    tiller = add_box("Tiller", (0.06, 0.85, 0.06), (0.0, y, z), HELM, rot=(0.55, 0.0, 0.0))
    post = add_cyl("HelmPost", 0.07, 0.09, 0.9, (0.0, y + 0.55, deck_z(-0.85) + 0.45), WOOD_DARK, verts=6)
    return [tiller, post]


def build_oars() -> list[bpy.types.Object]:
    bits: list[bpy.types.Object] = []
    # Shipped along the port (+X) rail — not in the water.
    hb = half_beam(0.0)
    z = deck_z(0.0) + 0.18
    for i in range(6):
        y = -2.8 + i * 1.05
        bits.append(
            add_box(f"Oar_{i}", (1.55, 0.04, 0.035), (hb - 0.35, y, z), WOOD_DARK, rot=(0.0, 0.0, 0.18))
        )
    return bits


def join_static(objs: list[bpy.types.Object], name: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    hull = bpy.context.active_object
    name_obj(hull, name)
    return hull


def export_glb(objects: list[bpy.types.Object], stem: str) -> Path:
    out = OUT_DIR / f"{stem}.glb"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    kwargs = dict(
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
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_morph=True)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    faces = sum(len(o.data.polygons) for o in objects if o.data)
    kb = out.stat().st_size / 1024
    print(f"SHIP {stem}: {faces} faces, {kb:.1f} KB → {out.relative_to(ROOT)}")
    return out


def main() -> int:
    print(f"Hero home hull → {OUT_DIR} (seed {SEED})")
    reset_scene()
    hull = build_hull()
    extras = (
        build_rail_and_posts()
        + [build_ram(), build_gangplank()]
        + build_eyes()
        + build_mast()
        + build_helm()
        + build_oars()
    )
    jars = build_jars()
    sail = build_sail()
    static = join_static([hull] + extras, "HeroHull")
    export_glb([static, sail, *jars], STEM)
    return 0


if __name__ == "__main__":
    sys.exit(main())
