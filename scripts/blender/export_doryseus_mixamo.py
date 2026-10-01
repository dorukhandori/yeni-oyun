#!/usr/bin/env python3
"""
Export Mixamo-upload FBX (no Tripo credits).

Two files:
  char_doryseus_02_textured_8000.fbx         — standing, front-facing
  char_doryseus_02_textured_8000_tpose.fbx   — same mesh, arms lifted to T
      (Mixamo auto-rigger needs this; the game mesh is unchanged)

Usage:
  blender --background --python scripts/blender/export_doryseus_mixamo.py
"""

from pathlib import Path
import math
import sys

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/assets/models/char_doryseus_02_textured_8000.glb"
OUT_DIR = ROOT / "art-source/work/mixamo"
DST_STAND = OUT_DIR / "char_doryseus_02_textured_8000.fbx"
DST_TPOSE = OUT_DIR / "char_doryseus_02_textured_8000_tpose.fbx"
HEIGHT_M = 1.82


def import_character():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SRC))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    mesh = max(meshes, key=lambda o: len(o.data.vertices))
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    while mesh.parent:
        bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    xs = [v.co.x for v in mesh.data.vertices]
    ys = [v.co.y for v in mesh.data.vertices]
    zs = [v.co.z for v in mesh.data.vertices]
    min_z, max_z = min(zs), max(zs)
    h = max_z - min_z
    cx = (min(xs) + max(xs)) * 0.5
    cy = (min(ys) + max(ys)) * 0.5
    for v in mesh.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= min_z
    if h > 0.01:
        s = HEIGHT_M / h
        for v in mesh.data.vertices:
            v.co *= s
    mesh.data.update()

    mesh.rotation_euler[2] = -math.pi / 2
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    for obj in list(bpy.context.scene.objects):
        if obj != mesh:
            bpy.data.objects.remove(obj, do_unlink=True)
    return mesh


def dist_seg(p: Vector, a: Vector, b: Vector) -> float:
    ab = b - a
    l2 = ab.length_squared
    if l2 < 1e-12:
        return (p - a).length
    t = max(0.0, min(1.0, (p - a).dot(ab) / l2))
    return (p - (a + ab * t)).length


def lift_arms_tpose(mesh) -> None:
    """Rotate hanging-arm vertices around each shoulder into a T-pose.

    Mixamo fails on the standing rest (arms against the tunic): wrist/elbow
    markers stack and the server returns 'unknown error while generating
    motion'. This file is Mixamo-only — the game still uses the standing GLB.
    """
    verts = mesh.data.vertices
    height = max(v.co.z for v in verts)
    shoulder_z = height * 0.78
    hand_l = max(verts, key=lambda v: v.co.x if 0.35 < v.co.z < shoulder_z else -1e9)
    hand_r = min(verts, key=lambda v: v.co.x if 0.35 < v.co.z < shoulder_z else 1e9)
    sh_l = Vector((hand_l.co.x * 0.35, 0.0, shoulder_z))
    sh_r = Vector((hand_r.co.x * 0.35, 0.0, shoulder_z))
    spine_a = Vector((0.0, 0.0, height * 0.50))
    spine_b = Vector((0.0, 0.0, height * 0.85))

    def is_arm(p: Vector, hand: Vector, sh: Vector) -> bool:
        if p.z > shoulder_z + 0.08 or p.z < 0.30:
            return False
        d_arm = dist_seg(p, sh, hand)
        d_body = dist_seg(p, spine_a, spine_b)
        return d_arm < d_body * 0.92 and d_arm < 0.38

    rot_l = Matrix.Rotation(math.radians(-85.0), 4, "Y")
    rot_r = Matrix.Rotation(math.radians(85.0), 4, "Y")
    n_l = n_r = 0
    for v in verts:
        p = v.co.copy()
        if is_arm(p, hand_l.co, sh_l) and p.x > 0.02:
            v.co = sh_l + (rot_l @ (p - sh_l))
            n_l += 1
        elif is_arm(p, hand_r.co, sh_r) and p.x < -0.02:
            v.co = sh_r + (rot_r @ (p - sh_r))
            n_r += 1
    mesh.data.update()
    print(f"[mixamo] t-pose arm verts L={n_l} R={n_r} hands=({hand_l.co.x:.3f},{hand_r.co.x:.3f})")


def export_fbx(mesh, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.export_scene.fbx(
        filepath=str(path),
        use_selection=True,
        object_types={"MESH"},
        apply_scale_options="FBX_SCALE_ALL",
        axis_forward="-Z",
        axis_up="Y",
        path_mode="COPY",
        embed_textures=True,
        bake_space_transform=True,
        use_mesh_modifiers=True,
        add_leaf_bones=False,
        bake_anim=False,
    )
    print(f"[mixamo] wrote {path} ({path.stat().st_size} bytes)")


def main() -> int:
    if not SRC.exists():
        print(f"missing {SRC}", file=sys.stderr)
        return 1
    mesh = import_character()
    export_fbx(mesh, DST_STAND)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
