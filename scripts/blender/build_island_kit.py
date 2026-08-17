#!/usr/bin/env python3
"""Build the repeating Lotus Island prop kit in Blender 5.2 (headless).

LOT-28 / art-bible.md §2 + §5 + §6. Stylized chalk rock, dry grass tuft,
reed clump, olive, cypress — vertex colours, no baked lighting, origin at
the ground. Re-run is deterministic (seed 20260817).

  blender --background --python scripts/blender/build_island_kit.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector, noise

# art-bible.md §2 (linear 0–1)
CHALK = (0.902, 0.886, 0.831)
CHALK_CREASE = (0.725, 0.714, 0.671)
OLIVE = (0.420, 0.498, 0.290)
SCORCH = (0.576, 0.588, 0.310)
CYPRESS = (0.239, 0.322, 0.251)
LEAF_SHADOW = (0.184, 0.420, 0.247)
TRUNK = (0.784, 0.706, 0.604)
TRUNK_CREASE = (0.541, 0.451, 0.345)
STUDIO = (0.682, 0.643, 0.604)

SEED = 20260817
ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "assets" / "models"


def rng(i: int, j: int = 0) -> float:
    """Stable 0–1 hash. Independent of Python's random."""
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


def new_mesh_object(name: str, bm: bmesh.types.BMesh) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


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


def paint_cavity(obj: bpy.types.Object, body: tuple[float, float, float], crease: tuple[float, float, float]) -> None:
    mesh = obj.data
    if "Color" in mesh.color_attributes:
        mesh.color_attributes.remove(mesh.color_attributes["Color"])
    attr = mesh.color_attributes.new(name="Color", type="BYTE_COLOR", domain="POINT")
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bm.normal_update()
    for i, v in enumerate(bm.verts):
        if not v.link_edges:
            t = 0.0
        else:
            acc = 0.0
            for e in v.link_edges:
                other = e.other_vert(v)
                delta = other.co - v.co
                if delta.length < 1e-8:
                    continue
                acc += delta.normalized().dot(v.normal)
            acc /= max(1, len(v.link_edges))
            t = max(0.0, min(1.0, (0.15 - acc) * 2.4))
        col = [body[k] * (1.0 - t) + crease[k] * t for k in range(3)] + [1.0]
        attr.data[i].color = col
    bm.free()
    mesh.color_attributes.active_color = attr


def paint_height_blend(
    obj: bpy.types.Object,
    low: tuple[float, float, float],
    high: tuple[float, float, float],
    y0: float,
    y1: float,
) -> None:
    mesh = obj.data
    if "Color" in mesh.color_attributes:
        mesh.color_attributes.remove(mesh.color_attributes["Color"])
    attr = mesh.color_attributes.new(name="Color", type="BYTE_COLOR", domain="POINT")
    for i, v in enumerate(mesh.vertices):
        t = 0.0 if y1 <= y0 else max(0.0, min(1.0, (v.co.z - y0) / (y1 - y0)))
        t = t * t * (3.0 - 2.0 * t)
        col = [low[k] * (1.0 - t) + high[k] * t for k in range(3)] + [1.0]
        attr.data[i].color = col
    mesh.color_attributes.active_color = attr


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


def shade_smooth(obj: bpy.types.Object, angle_deg: float = 42.0) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle_deg))
    except Exception:
        bpy.ops.object.shade_smooth()


def decimate(obj: bpy.types.Object, ratio: float) -> None:
    mod = obj.modifiers.new("KitDecimate", "DECIMATE")
    mod.ratio = ratio
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier="KitDecimate")


def displace_verts(obj: bpy.types.Object, scale: float, amp: float, seed: int) -> None:
    mesh = obj.data
    for i, v in enumerate(mesh.vertices):
        n = noise.noise(v.co * scale + Vector((seed * 0.17, 0.4, 0.2)))
        n2 = noise.noise(v.co * scale * 2.3 + Vector((0.8, seed * 0.11, 0.1))) * 0.45
        v.co += v.normal * (n + n2) * amp


def flatten_bottom(obj: bpy.types.Object, keep: float = 0.18) -> None:
    zs = [v.co.z for v in obj.data.vertices]
    lo, hi = min(zs), max(zs)
    cut = lo + (hi - lo) * keep
    for v in obj.data.vertices:
        if v.co.z < cut:
            v.co.z = lo + (v.co.z - lo) * 0.15


def export_glb(obj: bpy.types.Object, stem: str) -> Path:
    plant_on_ground(obj)
    shade_smooth(obj)
    faces = len(obj.data.polygons)
    out = OUT_DIR / f"{stem}.glb"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
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
    kb = out.stat().st_size / 1024
    print(f"KIT {stem}: {faces} tris, {kb:.1f} KB → {out.relative_to(ROOT)}")
    return out


# --------------------------------------------------------------------------- builders


def build_boulder() -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.62, location=(0, 0, 0.4))
    obj = bpy.context.active_object
    obj.name = "rock_chalk_boulder"
    obj.scale = (1.15, 0.92, 0.72)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    displace_verts(obj, scale=1.8, amp=0.11, seed=11)
    flatten_bottom(obj, keep=0.28)
    obj.data.update()
    decimate(obj, 0.55)
    paint_cavity(obj, CHALK, CHALK_CREASE)
    assign_mat(obj, make_material("rock_chalk", CHALK, 0.92))
    return obj


def build_pebble() -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.28, location=(0, 0, 0.16))
    obj = bpy.context.active_object
    obj.name = "rock_chalk_pebble"
    obj.scale = (1.2, 0.95, 0.55)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    displace_verts(obj, scale=3.4, amp=0.045, seed=23)
    flatten_bottom(obj, keep=0.35)
    obj.data.update()
    paint_cavity(obj, CHALK, CHALK_CREASE)
    assign_mat(obj, make_material("rock_pebble", CHALK, 0.9))
    return obj


def _blade(
    bm: bmesh.types.BMesh,
    yaw: float,
    lean: float,
    h: float,
    w: float,
    bend: float,
    spread: float,
    segs: int = 6,
) -> None:
    ox = math.cos(yaw) * spread
    oy = math.sin(yaw) * spread
    for s in range(segs + 1):
        t = s / segs
        width = w * (1.0 - t * 0.92)
        z = h * t
        x_bend = math.sin(t * math.pi * 0.5) * bend
        for side in (-1.0, 0.0, 1.0):
            local = Vector((side * width * 0.5 + x_bend, 0.0, z))
            rot = Vector((
                local.x * math.cos(yaw) - local.y * math.sin(yaw) + ox,
                local.x * math.sin(yaw) + local.y * math.cos(yaw) + oy,
                local.z,
            ))
            rot.x += lean * t
            bm.verts.new(rot)
    bm.verts.ensure_lookup_table()
    base = len(bm.verts) - (segs + 1) * 3
    for s in range(segs):
        a = base + s * 3
        b = a + 3
        bm.faces.new((bm.verts[a], bm.verts[a + 1], bm.verts[b + 1], bm.verts[b]))
        bm.faces.new((bm.verts[a + 1], bm.verts[a + 2], bm.verts[b + 2], bm.verts[b + 1]))


def _blade_uvs(bm: bmesh.types.BMesh, v_span: float) -> None:
    """Stretch the dry-grass albedo along each blade (U around the clump, V up)."""
    uv_layer = bm.loops.layers.uv.new("UVMap")
    span = max(v_span, 1e-4)
    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            u = math.atan2(co.y, co.x) / (math.pi * 2.0) + 0.5
            v = max(0.0, min(1.0, co.z / span))
            loop[uv_layer].uv = (u * 2.4, v * 1.15)


def build_grass() -> bpy.types.Object:
    """Knee-to-thigh meadow clump. Olive/scorch vertex colour — no ground albedo (that tex is pale soil)."""
    bm = bmesh.new()
    max_h = 0.0
    for i in range(8):
        yaw = (i / 8) * math.pi * 2 + rng(i, 1) * 0.32
        lean = (rng(i, 2) - 0.5) * 0.1
        h = 0.48 + rng(i, 3) * 0.14
        w = 0.02 + rng(i, 4) * 0.014
        bend = 0.05 + rng(i, 5) * 0.08
        spread = 0.1 + rng(i, 10) * 0.5
        _blade(bm, yaw, lean, h, w, bend, spread, segs=3)
        max_h = max(max_h, h)
    for i in range(7):
        yaw = (i / 7) * math.pi * 2 + rng(i, 21) * 0.7
        lean = (rng(i, 22) - 0.5) * 0.08
        h = 0.22 + rng(i, 23) * 0.16
        w = 0.012 + rng(i, 24) * 0.01
        bend = 0.02 + rng(i, 25) * 0.04
        spread = 0.04 + rng(i, 26) * 0.28
        _blade(bm, yaw, lean, h, w, bend, spread, segs=2)
        max_h = max(max_h, h)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _blade_uvs(bm, max_h)
    obj = new_mesh_object("flora_grasstuft", bm)
    paint_height_blend(obj, LEAF_SHADOW, OLIVE, 0.0, max_h)
    assign_mat(obj, make_material("grass_tuft", OLIVE, 0.94))
    return obj


def _stem(bm: bmesh.types.BMesh, yaw: float, h: float, lean: float, radius: float) -> None:
    rings = 7
    sides = 5
    for r in range(rings):
        t = r / (rings - 1)
        z = h * t
        rad = radius * (1.0 - t * 0.55)
        cx = lean * t * t
        for s in range(sides):
            a = (s / sides) * math.pi * 2 + yaw
            bm.verts.new(Vector((math.cos(a) * rad + cx, math.sin(a) * rad, z)))
    bm.verts.ensure_lookup_table()
    base = len(bm.verts) - rings * sides
    for r in range(rings - 1):
        for s in range(sides):
            a = base + r * sides + s
            b = base + r * sides + (s + 1) % sides
            c = base + (r + 1) * sides + (s + 1) % sides
            d = base + (r + 1) * sides + s
            bm.faces.new((bm.verts[a], bm.verts[b], bm.verts[c], bm.verts[d]))
    # seed head
    head_z = h + 0.07
    head_x = lean
    ico = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.045)
    for v in ico["verts"]:
        v.co.z *= 1.6
        v.co += Vector((head_x, 0.0, head_z))


def build_reed() -> bpy.types.Object:
    bm = bmesh.new()
    stems = 9
    for i in range(stems):
        ang = (i / stems) * math.pi * 2
        dist = 0.10 + rng(i, 6) * 0.16
        yaw = ang
        h = 1.15 + rng(i, 7) * 0.85
        lean = math.cos(ang) * (0.08 + rng(i, 8) * 0.12)
        radius = 0.018 + rng(i, 9) * 0.008
        # offset clump
        off = Vector((math.cos(ang) * dist, math.sin(ang) * dist, 0.0))
        before = len(bm.verts)
        _stem(bm, yaw, h, lean, radius)
        bm.verts.ensure_lookup_table()
        for v in bm.verts[before:]:
            v.co += off
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = new_mesh_object("flora_reed", bm)
    paint_height_blend(obj, LEAF_SHADOW, SCORCH, 0.0, 1.8)
    assign_mat(obj, make_material("reed", OLIVE, 0.84))
    return obj


def build_olive() -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=10, radius=0.16, depth=1.55, location=(0, 0, 0.78),
    )
    trunk = bpy.context.active_object
    trunk.name = "olive_trunk"
    displace_verts(trunk, scale=2.6, amp=0.04, seed=41)
    trunk.rotation_euler.x = math.radians(6)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    blobs = []
    specs = [
        (1.05, (0.0, 0.0, 2.05), (1.0, 0.72, 1.0), 51),
        (0.78, (0.55, -0.18, 2.18), (1.0, 0.68, 1.0), 52),
        (0.7, (-0.48, 0.28, 2.22), (1.0, 0.64, 1.0), 53),
        (0.62, (0.2, 0.48, 1.72), (1.0, 0.6, 1.0), 54),
        (0.52, (-0.1, -0.4, 2.42), (1.0, 0.58, 1.0), 55),
    ]
    for r, loc, sc, sd in specs:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=loc)
        b = bpy.context.active_object
        b.scale = sc
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        displace_verts(b, scale=1.6, amp=0.07, seed=sd)
        blobs.append(b)

    bpy.ops.object.select_all(action="DESELECT")
    trunk.select_set(True)
    for b in blobs:
        b.select_set(True)
    bpy.context.view_layer.objects.active = trunk
    bpy.ops.object.join()
    trunk.name = "flora_olive"
    paint_cavity(trunk, OLIVE, LEAF_SHADOW)
    # Overwrite trunk verts toward TRUNK using height
    mesh = trunk.data
    attr = mesh.color_attributes.get("Color")
    if attr is not None:
        for i, v in enumerate(mesh.vertices):
            if v.co.z < 1.35:
                t = max(0.0, min(1.0, v.co.z / 1.35))
                body = [TRUNK[k] * (1 - t * 0.2) + TRUNK_CREASE[k] * (t * 0.2) for k in range(3)]
                attr.data[i].color = (*body, 1.0)
    assign_mat(trunk, make_material("olive", OLIVE, 0.82))
    return trunk


def build_cypress() -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, radius=0.13, depth=1.15, location=(0, 0, 0.55),
    )
    trunk = bpy.context.active_object
    layers = [
        (0.95, 2.1, 1.7),
        (0.72, 1.9, 2.95),
        (0.5, 1.6, 4.1),
        (0.3, 1.25, 5.05),
        (0.16, 0.85, 5.7),
    ]
    cones = []
    for r, h, z in layers:
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=r, radius2=0.04, depth=h, location=(0, 0, z))
        c = bpy.context.active_object
        displace_verts(c, scale=1.9, amp=0.045, seed=int(z * 10))
        cones.append(c)
    bpy.ops.object.select_all(action="DESELECT")
    trunk.select_set(True)
    for c in cones:
        c.select_set(True)
    bpy.context.view_layer.objects.active = trunk
    bpy.ops.object.join()
    trunk.name = "flora_cypress"
    paint_height_blend(trunk, TRUNK, CYPRESS, 0.0, 1.3)
    mesh = trunk.data
    attr = mesh.color_attributes.get("Color")
    if attr is not None:
        for i, v in enumerate(mesh.vertices):
            if v.co.z > 1.2:
                t = min(1.0, (v.co.z - 1.2) / 4.5)
                col = [CYPRESS[k] * (1 - t * 0.25) + LEAF_SHADOW[k] * (t * 0.25) for k in range(3)]
                attr.data[i].color = (*col, 1.0)
    assign_mat(trunk, make_material("cypress", CYPRESS, 0.84))
    return trunk


BUILDERS = [
    ("rock_chalk_boulder_01_mesh_800", build_boulder),
    ("rock_chalk_pebble_01_mesh_400", build_pebble),
    ("flora_grasstuft_01_mesh_600", build_grass),
    ("flora_reed_01_mesh_900", build_reed),
    ("flora_olive_01_mesh_2000", build_olive),
    ("flora_cypress_01_mesh_1800", build_cypress),
]


def main() -> int:
    only = None
    if "--" in sys.argv:
        args = sys.argv[sys.argv.index("--") + 1 :]
        if args:
            only = args[0]
    print(f"Island kit → {OUT_DIR} (seed {SEED})")
    for stem, builder in BUILDERS:
        if only and only not in stem:
            continue
        reset_scene()
        obj = builder()
        export_glb(obj, stem)
    return 0


if __name__ == "__main__":
    sys.exit(main())
