#!/usr/bin/env python3
"""Build the Lotophagoi sun-god head (LOT-50) in Blender 5.2 (headless).

Designed silhouette: round face disc (the clock) + 12 kite rays (the hours).
Black-figure / pediment language — not a Pixar sun. Vertex colours from
art-bible.md §2. Origin at the disc centre. Face points +Y (Blender);
glTF Y-up maps that to -Z so Three.js lookAt matches the old plane.

  blender --background --python scripts/blender/build_sun_god.py
  npm run gen:sun-god
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

# art-bible.md §2 (linear 0–1)
CORE = (1.000, 0.965, 0.816)  # #fff6d0
RAY = (1.000, 0.812, 0.502)  # #ffcf80
RAY_TIP = (0.980, 0.545, 0.220)
CREASE = (0.720, 0.380, 0.160)
SOCKET = (0.180, 0.090, 0.055)
PUPIL = (0.070, 0.040, 0.030)
HIGHLIGHT = (1.000, 0.980, 0.900)

SEED = 20260817
ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "assets" / "models"
REF_DIR = ROOT / "art-source" / "ref"
STEM = "sky_sungod_01_mesh_1200"


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
    mesh = obj.data
    for p in mesh.polygons:
        p.use_smooth = True


def make_material(name: str, color: tuple[float, float, float]) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = 1.0
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 0.35
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


def add_brow_ridge(bm: bmesh.types.BMesh) -> None:
    """Single arched strip — pediment brow, not five boxes."""
    segs = 12
    front: list[tuple[bmesh.types.BMVert, bmesh.types.BMVert]] = []
    back: list[tuple[bmesh.types.BMVert, bmesh.types.BMVert]] = []
    for i in range(segs + 1):
        t = i / segs
        ang = math.pi * (0.18 + 0.64 * t)
        cx = math.cos(ang) * 0.50
        cz = 0.06 + math.sin(ang) * 0.30
        w = 0.045
        hy = 0.028
        front.append(
            (
                bm.verts.new(Vector((cx, 0.08 - hy, cz - w))),
                bm.verts.new(Vector((cx, 0.08 - hy, cz + w))),
            )
        )
        back.append(
            (
                bm.verts.new(Vector((cx, 0.08 + hy, cz - w))),
                bm.verts.new(Vector((cx, 0.08 + hy, cz + w))),
            )
        )
    for i in range(segs):
        a0, a1 = front[i]
        a2, a3 = front[i + 1]
        b0, b1 = back[i]
        b2, b3 = back[i + 1]
        bm.faces.new((a0, a2, a3, a1))
        bm.faces.new((b0, b1, b3, b2))
        bm.faces.new((a1, a3, b3, b1))
        bm.faces.new((a0, b0, b2, a2))
    bm.faces.new((*front[0], *reversed(back[0])))
    bm.faces.new((*front[-1], *reversed(back[-1])))


def add_wedge_nose(bm: bmesh.types.BMesh) -> None:
    y0, y1 = 0.06, 0.145
    pts = [
        Vector((0.0, y0, 0.18)),
        Vector((0.075, y0, -0.02)),
        Vector((-0.075, y0, -0.02)),
        Vector((0.0, y0, -0.14)),
        Vector((0.0, y1, 0.18)),
        Vector((0.075, y1, -0.02)),
        Vector((-0.075, y1, -0.02)),
        Vector((0.0, y1, -0.14)),
    ]
    vs = [bm.verts.new(p) for p in pts]
    quads = (
        (0, 1, 5, 4),
        (0, 4, 6, 2),
        (1, 3, 7, 5),
        (2, 6, 7, 3),
        (0, 2, 1),
        (4, 5, 6),
        (1, 2, 3),
        (5, 7, 6),
    )
    for f in quads:
        bm.faces.new(tuple(vs[i] for i in f))


def add_mouth_arc(bm: bmesh.types.BMesh) -> None:
    segs = 8
    prev_f = None
    prev_b = None
    for i in range(segs + 1):
        t = i / segs
        ang = math.pi * (1.12 + 0.76 * t)
        cx = math.cos(ang) * 0.20
        cz = -0.10 + math.sin(ang) * 0.18
        f = (
            bm.verts.new(Vector((cx, 0.075, cz - 0.02))),
            bm.verts.new(Vector((cx, 0.075, cz + 0.02))),
        )
        b = (
            bm.verts.new(Vector((cx, 0.11, cz - 0.02))),
            bm.verts.new(Vector((cx, 0.11, cz + 0.02))),
        )
        if prev_f is not None:
            bm.faces.new((prev_f[0], f[0], f[1], prev_f[1]))
            bm.faces.new((prev_b[0], prev_b[1], b[1], b[0]))
            bm.faces.new((prev_f[1], f[1], b[1], prev_b[1]))
            bm.faces.new((prev_f[0], prev_b[0], b[0], f[0]))
        prev_f, prev_b = f, b


def add_kite(
    bm: bmesh.types.BMesh,
    yaw: float,
    length: float,
    width: float,
    thick: float,
    root: float,
) -> None:
    """Graphic ray: lozenge from the rim, in the XZ plane, extruded on Y."""
    ca, sa = math.cos(yaw), math.sin(yaw)
    px, pz = -sa, ca  # perpendicular in XZ
    y0, y1 = -thick * 0.5, thick * 0.5
    r_mid = root + length * 0.38
    r_tip = root + length
    rings = [
        (root, width * 0.22),
        (r_mid, width),
        (r_tip, width * 0.08),
    ]
    verts_a: list[bmesh.types.BMVert] = []
    verts_b: list[bmesh.types.BMVert] = []
    for r, w in rings:
        cx, cz = ca * r, sa * r
        for y in (y0, y1):
            left = bm.verts.new(Vector((cx + px * w, y, cz + pz * w)))
            right = bm.verts.new(Vector((cx - px * w, y, cz - pz * w)))
            if y == y0:
                verts_a.extend((left, right))
            else:
                verts_b.extend((left, right))
    # rings: 3 stations × 2 (L/R) on each cap. Index 0,1 root; 2,3 mid; 4,5 tip.
    def cap(vs: list[bmesh.types.BMVert]) -> None:
        bm.faces.new((vs[0], vs[2], vs[3], vs[1]))
        bm.faces.new((vs[2], vs[4], vs[5], vs[3]))

    cap(verts_a)
    cap(verts_b)
    # sides
    for i in range(0, 6, 2):
        if i + 3 >= len(verts_a):
            break
        a0, a1 = verts_a[i], verts_a[i + 1]
        b0, b1 = verts_b[i], verts_b[i + 1]
        bm.faces.new((a0, b0, b1, a1))
    # long edges of the kite
    for i in (0, 2):
        bm.faces.new((verts_a[i], verts_a[i + 2], verts_b[i + 2], verts_b[i]))
        bm.faces.new((verts_a[i + 1], verts_b[i + 1], verts_b[i + 3], verts_a[i + 3]))
    # tip close
    bm.faces.new((verts_a[4], verts_b[4], verts_b[5], verts_a[5]))


def add_disc(bm: bmesh.types.BMesh, radius: float, segs: int, y0: float, y1: float) -> None:
    def ring(y: float) -> list[bmesh.types.BMVert]:
        vs = []
        for i in range(segs):
            a = (i / segs) * math.pi * 2
            vs.append(bm.verts.new(Vector((math.cos(a) * radius, y, math.sin(a) * radius))))
        return vs

    front = ring(y1)
    back = ring(y0)
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((back[i], back[j], front[j], front[i]))
    bm.faces.new(list(reversed(front)))
    bm.faces.new(back)


def add_ellipsoid(
    bm: bmesh.types.BMesh,
    center: Vector,
    rx: float,
    ry: float,
    rz: float,
    segs: int = 10,
) -> None:
    ico = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    for v in ico["verts"]:
        v.co.x *= rx
        v.co.y *= ry
        v.co.z *= rz
        v.co += center


def build_sun() -> bpy.types.Object:
    bm = bmesh.new()
    add_disc(bm, radius=1.0, segs=48, y0=-0.07, y1=0.07)
    # Convex face — designed shield, not a sphere.
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        r = math.hypot(v.co.x, v.co.z)
        if r <= 1.001 and v.co.y > 0.0:
            v.co.y += 0.055 * (1.0 - r * r)

    for i in range(12):
        # 12 o'clock on +Z so the still/read reads as a clock face.
        yaw = (i / 12) * math.pi * 2 + math.pi / 2
        add_kite(
            bm,
            yaw=yaw,
            length=0.56,
            width=0.095,
            thick=0.05,
            root=0.97,
        )

    add_brow_ridge(bm)

    # Almond sockets + round pupils — graphic, not boxes.
    for side in (-1.0, 1.0):
        add_ellipsoid(bm, Vector((side * 0.27, 0.095, 0.11)), 0.14, 0.035, 0.085)
        add_ellipsoid(bm, Vector((side * 0.27, 0.125, 0.10)), 0.05, 0.032, 0.05)

    add_wedge_nose(bm)
    add_mouth_arc(bm)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = new_mesh_object("sky_sungod", bm)
    paint_sun(obj)
    assign_mat(obj, make_material("sungod", CORE))
    shade_smooth(obj)
    obj.location = (0.0, 0.0, 0.0)
    return obj


def paint_sun(obj: bpy.types.Object) -> None:
    mesh = obj.data
    if "Color" in mesh.color_attributes:
        mesh.color_attributes.remove(mesh.color_attributes["Color"])
    attr = mesh.color_attributes.new(name="Color", type="BYTE_COLOR", domain="POINT")
    for i, v in enumerate(mesh.vertices):
        r = math.hypot(v.co.x, v.co.z)
        col = list(CORE)
        if r > 1.02:
            t = max(0.0, min(1.0, (r - 1.02) / 0.62))
            t = t * t * (3.0 - 2.0 * t)
            col = [RAY[k] * (1.0 - t) + RAY_TIP[k] * t for k in range(3)]
        else:
            # sockets: two ellipses
            for side in (-1.0, 1.0):
                dx = (v.co.x - side * 0.27) / 0.14
                dz = (v.co.z - 0.11) / 0.085
                if dx * dx + dz * dz < 1.0 and v.co.y > 0.02:
                    inner = dx * dx + dz * dz < 0.22
                    col = list(PUPIL if inner else SOCKET)
                    break
            else:
                if 0.16 < v.co.z < 0.40 and abs(v.co.x) < 0.52 and v.co.y > 0.05:
                    col = list(CREASE)
                elif abs(v.co.x) < 0.09 and -0.16 < v.co.z < 0.20 and v.co.y > 0.08:
                    col = list(CREASE)
                elif abs(v.co.x) < 0.22 and -0.34 < v.co.z < -0.16 and v.co.y > 0.05:
                    col = list(SOCKET)
                elif v.co.z > 0.42 and v.co.y > 0.04:
                    col = [CORE[k] * 0.35 + HIGHLIGHT[k] * 0.65 for k in range(3)]
        attr.data[i].color = (*col, 1.0)
    mesh.color_attributes.active_color = attr


def export_glb(obj: bpy.types.Object, stem: str) -> Path:
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
    print(f"  {out.name}  {faces} faces  {kb:.1f} KB")
    return out


def export_front_still(obj: bpy.types.Object) -> Path:
    """Orthographic front still — designed drawing for an optional Tripo pass."""
    REF_DIR.mkdir(parents=True, exist_ok=True)
    out = REF_DIR / "sky_sungod_01_ref_1024.png"
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.film_transparent = True
    scene.render.filepath = str(out)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    shading = scene.display.shading
    shading.light = "FLAT"
    shading.color_type = "VERTEX"
    cam_data = bpy.data.cameras.new("sun_ref")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 3.4
    cam = bpy.data.objects.new("sun_ref", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (0.0, 4.0, 0.0)
    cam.rotation_euler = (math.pi / 2, 0.0, math.pi)
    scene.camera = cam
    bpy.ops.render.render(write_still=True)
    print(f"  still {out}")
    return out


def main() -> int:
    print(f"Sun-god → {OUT_DIR} (seed {SEED})")
    reset_scene()
    obj = build_sun()
    export_glb(obj, STEM)
    try:
        export_front_still(obj)
    except Exception as err:
        print(f"  still skipped: {err}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
