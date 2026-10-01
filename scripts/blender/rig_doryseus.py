#!/usr/bin/env python3
"""
Rig the textured Doryseus in Blender — no Mixamo upload, no Tripo retarget.

The playable mesh is non-manifold (Bone Heat fails on it). We:
  1. Keep the original vertices/UVs/textures untouched.
  2. Voxel-remesh a *cage* copy (closed volume).
  3. Automatic Weights on the cage.
  4. Data-Transfer those weights back onto the original.
  5. Bake idle/walk/run/harvest from the standing rest pose.

Usage:
  blender --background --python scripts/blender/rig_doryseus.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/assets/models/char_doryseus_02_textured_8000.glb"
DST = ROOT / "art-source/raw/char_doryseus_06_rig_8000.glb"

CLIP_FRAMES = {"idle": 48, "walk": 32, "run": 20, "harvest": 36}


def group_count(mesh, vg) -> int:
    n = 0
    for v in mesh.data.vertices:
        try:
            vg.weight(v.index)
            n += 1
        except RuntimeError:
            pass
    return n


def import_mesh(path: Path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    mesh = max(meshes, key=lambda o: len(o.data.vertices))
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    while mesh.parent:
        bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mesh.name = "DoryseusMesh"
    return mesh


def make_cage(mesh):
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.duplicate()
    cage = bpy.context.active_object
    cage.name = "WeightCage"
    # Drop materials so the cage cannot leak into the export.
    cage.data.materials.clear()
    mod = cage.modifiers.new("vox", "REMESH")
    mod.mode = "VOXEL"
    mod.voxel_size = 0.02
    bpy.ops.object.modifier_apply(modifier="vox")
    print(f"[rig] cage verts={len(cage.data.vertices)} faces={len(cage.data.polygons)}")
    return cage


def add_bone(arm, name: str, head: Vector, tail: Vector, parent: str | None = None):
    bone = arm.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    bone.use_connect = False
    if parent:
        bone.parent = arm.edit_bones[parent]
    return bone


def build_armature(mesh):
    pts = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    xs, ys, zs = [p.x for p in pts], [p.y for p in pts], [p.z for p in pts]
    mn = Vector((min(xs), min(ys), min(zs)))
    mx = Vector((max(xs), max(ys), max(zs)))
    h = mx.z - mn.z
    cx = (mn.x + mx.x) * 0.5
    cy = (mn.y + mx.y) * 0.5
    z0 = mn.z
    w = mx.x - mn.x

    hip_z = z0 + h * 0.52
    chest_z = z0 + h * 0.70
    neck_z = z0 + h * 0.84
    head_z = z0 + h * 0.96
    top_z = z0 + h
    knee_z = z0 + h * 0.28
    ankle_z = z0 + h * 0.07
    toe_z = z0 + h * 0.02
    sh_z = z0 + h * 0.78
    elbow_z = z0 + h * 0.58
    wrist_z = z0 + h * 0.40
    hand_z = z0 + h * 0.34
    hip_x = w * 0.18
    sh_x = w * 0.38
    # Arms hang beside the tunic (rest pose), not A-pose.
    arm_x = w * 0.48
    hand_x = w * 0.50
    foot_y = (mx.y - mn.y) * 0.15

    arm_data = bpy.data.armatures.new("DoryseusArmature")
    arm_obj = bpy.data.objects.new("DoryseusArmature", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")

    add_bone(arm_data, "Hips", Vector((cx, cy, z0 + h * 0.46)), Vector((cx, cy, z0 + h * 0.56)))
    add_bone(arm_data, "Spine", Vector((cx, cy, hip_z)), Vector((cx, cy, chest_z)), "Hips")
    add_bone(arm_data, "Chest", Vector((cx, cy, chest_z)), Vector((cx, cy, neck_z)), "Spine")
    add_bone(arm_data, "Neck", Vector((cx, cy, neck_z)), Vector((cx, cy, head_z)), "Chest")
    add_bone(arm_data, "Head", Vector((cx, cy, head_z)), Vector((cx, cy, top_z)), "Neck")

    add_bone(arm_data, "LeftUpLeg", Vector((cx + hip_x, cy, hip_z)), Vector((cx + hip_x, cy, knee_z)), "Hips")
    add_bone(arm_data, "LeftLeg", Vector((cx + hip_x, cy, knee_z)), Vector((cx + hip_x, cy, ankle_z)), "LeftUpLeg")
    add_bone(
        arm_data,
        "LeftFoot",
        Vector((cx + hip_x, cy, ankle_z)),
        Vector((cx + hip_x, cy + foot_y, toe_z)),
        "LeftLeg",
    )
    add_bone(arm_data, "RightUpLeg", Vector((cx - hip_x, cy, hip_z)), Vector((cx - hip_x, cy, knee_z)), "Hips")
    add_bone(arm_data, "RightLeg", Vector((cx - hip_x, cy, knee_z)), Vector((cx - hip_x, cy, ankle_z)), "RightUpLeg")
    add_bone(
        arm_data,
        "RightFoot",
        Vector((cx - hip_x, cy, ankle_z)),
        Vector((cx - hip_x, cy + foot_y, toe_z)),
        "RightLeg",
    )

    add_bone(arm_data, "LeftShoulder", Vector((cx, cy, sh_z)), Vector((cx + sh_x, cy, sh_z)), "Chest")
    add_bone(arm_data, "LeftArm", Vector((cx + sh_x, cy, sh_z)), Vector((cx + arm_x, cy, elbow_z)), "LeftShoulder")
    add_bone(arm_data, "LeftForeArm", Vector((cx + arm_x, cy, elbow_z)), Vector((cx + hand_x, cy, wrist_z)), "LeftArm")
    add_bone(arm_data, "LeftHand", Vector((cx + hand_x, cy, wrist_z)), Vector((cx + hand_x, cy, hand_z)), "LeftForeArm")
    add_bone(arm_data, "RightShoulder", Vector((cx, cy, sh_z)), Vector((cx - sh_x, cy, sh_z)), "Chest")
    add_bone(arm_data, "RightArm", Vector((cx - sh_x, cy, sh_z)), Vector((cx - arm_x, cy, elbow_z)), "RightShoulder")
    add_bone(arm_data, "RightForeArm", Vector((cx - arm_x, cy, elbow_z)), Vector((cx - hand_x, cy, wrist_z)), "RightArm")
    add_bone(arm_data, "RightHand", Vector((cx - hand_x, cy, wrist_z)), Vector((cx - hand_x, cy, hand_z)), "RightForeArm")

    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"[rig] armature h={h:.3f} bones={len(arm_data.bones)}")
    return arm_obj


def heat_and_transfer(original, cage, arm_obj):
    bpy.ops.object.select_all(action="DESELECT")
    cage.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    cage_counts = {vg.name: group_count(cage, vg) for vg in cage.vertex_groups}
    print(f"[rig] cage heat {cage_counts}")
    empty = [n for n, c in cage_counts.items() if c == 0]
    if empty:
        raise RuntimeError(f"Bone Heat missed cage bones: {empty}")

    bpy.ops.object.select_all(action="DESELECT")
    original.select_set(True)
    bpy.context.view_layer.objects.active = original
    while original.vertex_groups:
        original.vertex_groups.remove(original.vertex_groups[0])
    for vg in cage.vertex_groups:
        original.vertex_groups.new(name=vg.name)

    dt = original.modifiers.new("WeightsFromCage", "DATA_TRANSFER")
    dt.object = cage
    dt.use_vert_data = True
    dt.data_types_verts = {"VGROUP_WEIGHTS"}
    dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"
    dt.mix_mode = "REPLACE"
    bpy.ops.object.datalayout_transfer(modifier="WeightsFromCage")
    bpy.ops.object.modifier_apply(modifier="WeightsFromCage")

    for mod in list(original.modifiers):
        if mod.type == "ARMATURE":
            original.modifiers.remove(mod)
    arm_mod = original.modifiers.new("Armature", "ARMATURE")
    arm_mod.object = arm_obj
    arm_mod.use_vertex_groups = True
    original.parent = arm_obj

    orig_counts = {vg.name: group_count(original, vg) for vg in original.vertex_groups}
    print(f"[rig] original weights {orig_counts}")

    bpy.ops.object.select_all(action="DESELECT")
    cage.select_set(True)
    bpy.context.view_layer.objects.active = cage
    bpy.ops.object.delete()


def key_bone(pb, frame: int, euler) -> None:
    pb.rotation_mode = "XYZ"
    pb.rotation_euler = euler
    pb.keyframe_insert(data_path="rotation_euler", frame=frame)


def bake_clips(arm_obj) -> None:
    pose = arm_obj.pose.bones
    rest = (
        "Hips",
        "Neck",
        "Head",
        "LeftFoot",
        "RightFoot",
        "LeftShoulder",
        "RightShoulder",
        "LeftHand",
        "RightHand",
        "Chest",
    )

    def ensure(name: str, frames: int):
        action = bpy.data.actions.new(name=name)
        if not arm_obj.animation_data:
            arm_obj.animation_data_create()
        arm_obj.animation_data.action = action
        action.use_fake_user = True
        bpy.context.scene.frame_start = 1
        bpy.context.scene.frame_end = frames
        return action

    ensure("idle", CLIP_FRAMES["idle"])
    n = CLIP_FRAMES["idle"]
    for f in range(1, n + 1):
        t = (f - 1) / n * math.tau
        key_bone(pose["Spine"], f, (math.radians(1.2) * math.sin(t), 0.0, 0.0))
        key_bone(pose["Chest"], f, (math.radians(0.6) * math.sin(t), 0.0, 0.0))
        for name in pose.keys():
            if name not in ("Spine", "Chest"):
                key_bone(pose[name], f, (0.0, 0.0, 0.0))

    def gait(name: str, frames: int, thigh: float, arm: float) -> None:
        ensure(name, frames)
        for f in range(1, frames + 1):
            t = (f - 1) / frames * math.tau
            s = math.sin(t)
            c = math.cos(t)
            key_bone(pose["Hips"], f, (0.0, 0.0, math.radians(1.5) * s))
            key_bone(pose["Spine"], f, (math.radians(2.5) * s, 0.0, 0.0))
            key_bone(pose["LeftUpLeg"], f, (math.radians(thigh) * s, 0.0, 0.0))
            key_bone(pose["RightUpLeg"], f, (math.radians(-thigh) * s, 0.0, 0.0))
            key_bone(pose["LeftLeg"], f, (math.radians(max(0.0, -thigh * 0.65 * s)), 0.0, 0.0))
            key_bone(pose["RightLeg"], f, (math.radians(max(0.0, thigh * 0.65 * s)), 0.0, 0.0))
            key_bone(pose["LeftArm"], f, (math.radians(-arm) * s, 0.0, 0.0))
            key_bone(pose["RightArm"], f, (math.radians(arm) * s, 0.0, 0.0))
            key_bone(pose["LeftForeArm"], f, (math.radians(6.0) * max(0.0, c), 0.0, 0.0))
            key_bone(pose["RightForeArm"], f, (math.radians(6.0) * max(0.0, -c), 0.0, 0.0))
            for name in rest:
                if name != "Hips":
                    key_bone(pose[name], f, (0.0, 0.0, 0.0))

    gait("walk", CLIP_FRAMES["walk"], 22.0, 16.0)
    gait("run", CLIP_FRAMES["run"], 34.0, 28.0)

    ensure("harvest", CLIP_FRAMES["harvest"])
    hn = CLIP_FRAMES["harvest"]
    for f in range(1, hn + 1):
        u = (f - 1) / (hn - 1)
        if u < 0.35:
            k = u / 0.35
        elif u < 0.7:
            k = 1.0
        else:
            k = 1.0 - (u - 0.7) / 0.3
        k = k * k * (3.0 - 2.0 * k)
        key_bone(pose["Spine"], f, (math.radians(22.0) * k, 0.0, 0.0))
        key_bone(pose["Chest"], f, (math.radians(12.0) * k, 0.0, 0.0))
        key_bone(pose["RightArm"], f, (math.radians(40.0) * k, 0.0, math.radians(-8.0) * k))
        key_bone(pose["RightForeArm"], f, (math.radians(16.0) * k, 0.0, 0.0))
        key_bone(pose["Hips"], f, (math.radians(6.0) * k, 0.0, 0.0))
        for name in pose.keys():
            if name not in ("Spine", "Chest", "RightArm", "RightForeArm", "Hips"):
                key_bone(pose[name], f, (0.0, 0.0, 0.0))

    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    tracks = arm_obj.animation_data.nla_tracks
    for track in list(tracks):
        tracks.remove(track)
    prev = None
    for name in ("idle", "walk", "run", "harvest"):
        action = bpy.data.actions.get(name)
        track = tracks.new(prev=prev)
        track.name = name
        track.strips.new(name, 1, action)
        prev = track
    arm_obj.animation_data.action = None
    print("[rig] clips", list(CLIP_FRAMES))


def export_glb(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_skins=True,
        export_animations=True,
        export_nla_strips=True,
        export_apply=False,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    print(f"[rig] wrote {path} ({path.stat().st_size} bytes)")


def main() -> int:
    if not SRC.exists():
        print(f"missing {SRC}", file=sys.stderr)
        return 1
    mesh = import_mesh(SRC)
    print(f"[rig] imported verts={len(mesh.data.vertices)}")
    cage = make_cage(mesh)
    arm = build_armature(mesh)
    heat_and_transfer(mesh, cage, arm)
    bake_clips(arm)
    export_glb(DST)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
