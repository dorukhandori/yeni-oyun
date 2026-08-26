#!/usr/bin/env python3
"""
Retarget Mixamo idle/walk clips onto Polyphemos's own existing armature
(ASSET-092, "Cyclop" by lucasprs51450, Sketchfab). No Tripo credits, no
Bone Heat / voxel-cage weight transfer — unlike char_doryseus_07_mixamo's
script, Polyphemos's mesh already ships with good skin weights on its own
114-bone rig (verified by producer's asset-production-plan audit, 26 Ağu
2026: skins:1, JOINTS_0/WEIGHTS_0 present). The only thing missing was a
usable animation clip (the source FBX's baked "running" clip had an
unexplained continuous root-bone Z offset across the whole cycle, not a
single bad frame — not trusted, see cyclopsStop.ts's walkGiantTowards()
comment).

Retarget approach: Polyphemos's bone names/hierarchy share no naming with
Mixamo's ("mixamorig:Hips" vs "cyclop Pelvis_02") but correspond 1:1 for
the ~20 major joints, and both rigs rest in a similar T-pose family. So a
straight matrix_basis copy (which char_doryseus_07's retarget_clip() uses,
valid only because ITS target was already a Mixamo-family armature) does
not apply here. Instead: per mapped bone pair, compute a fixed correction
quaternion C = target_rest_local * source_rest_local^-1 (captured once,
via bone.matrix_local — Blender's own parent-relative rest orientation),
then for every frame set the target's pose rotation to C * source_pose *
C^-1 (a standard rest-realignment conjugation). Verified interactively in
a live Blender session before writing this script: both idle (frame 1)
and walking (frame 16, mid-stride) produced coherent, undistorted poses —
no visual check would have caught a purely numerical retarget bug before
that.

One real bug found and fixed during that verification, worth recording:
an EARLIER unrelated Blender session (this same project, same day) had
set Object_4's pose_position to REST and cleared its animation action to
inspect the original broken running clip — that display-only toggle does
NOT reset pose-bone data values, so the original clip's catastrophic
frame-1 root offset (~-25 on one axis) was still sitting in the pose
bones underneath, contaminating every retarget attempt until an explicit
bpy.ops.pose.transforms_clear() ran first. This script starts from a
completely fresh scene import specifically so that contamination can
never recur — no live-session leftover state to inherit.

Root motion: rotation-only (treadmill), matching char_doryseus_07's own
convention — game code already drives root translation via real walking
(cyclopsStop.ts's walkGiantTowards), a baked clip translating the root
would fight that.

Usage:
  blender --background --python scripts/blender/retarget_mixamo_polyphemos.py
"""

from __future__ import annotations

from pathlib import Path

import bpy
from mathutils import Quaternion

ROOT = Path(__file__).resolve().parents[2]
SRC_GLB = ROOT / "public/assets/models/char_polyphemos_01_stand_27000.glb"
MIXAMO = ROOT / "art-source/work/mixamo/locomotion"
DST = ROOT / "public/assets/models/char_polyphemos_02_animated_8000.glb"
DST_RAW = ROOT / "art-source/raw/char_polyphemos_02_animated_8000.glb"

CLIPS = (
    ("idle", MIXAMO / "idle.fbx"),
    ("walk", MIXAMO / "walking.fbx"),
)

# Mixamo bone name -> Polyphemos bone name. Only the ~20 major joints —
# fingers/cloth/"muscle strand" secondary bones (114 total on the source
# rig) stay in bind pose, a deliberate primitive-pass simplification (a
# giant's fingers are not going to read at gameplay camera distance).
BONE_MAP = {
    "mixamorig:Hips": "cyclop Pelvis_02",
    "mixamorig:Spine": "cyclop Spine_03",
    "mixamorig:Spine1": "cyclop Spine1_04",
    "mixamorig:Spine2": "cyclop Spine2_05",
    "mixamorig:Neck": "cyclop Neck_07",
    "mixamorig:Head": "cyclop Head_065",
    "mixamorig:LeftShoulder": "cyclop  L Clavicle_08",  # source has a real double space
    "mixamorig:LeftArm": "cyclop L UpperArm_09",
    "mixamorig:LeftForeArm": "cyclop L Forearm_010",
    "mixamorig:LeftHand": "cyclop L Hand_011",
    "mixamorig:RightShoulder": "cyclop R Clavicle_036",
    "mixamorig:RightArm": "cyclop R UpperArm_037",
    "mixamorig:RightForeArm": "cyclop R Forearm_038",
    "mixamorig:RightHand": "cyclop R Hand_039",
    "mixamorig:LeftUpLeg": "cyclop L Thigh_092",
    "mixamorig:LeftLeg": "cyclop L Calf_093",
    "mixamorig:LeftFoot": "cyclop L Foot_094",
    "mixamorig:RightUpLeg": "cyclop R Thigh_097",
    "mixamorig:RightLeg": "cyclop R Calf_098",
    "mixamorig:RightFoot": "cyclop R Foot_099",
}


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    bpy.context.scene.unit_settings.system = "METRIC"


def import_polyphemos():
    bpy.ops.import_scene.gltf(filepath=str(SRC_GLB))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    mesh = max(meshes, key=lambda o: len(o.data.vertices))
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    missing = [t for t in BONE_MAP.values() if t not in arm.pose.bones]
    if missing:
        raise RuntimeError(f"BONE_MAP references bones not on the armature: {missing}")
    return mesh, arm


def import_mixamo_armature(path: Path, name: str):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(
        filepath=str(path),
        automatic_bone_orientation=False,
        ignore_leaf_bones=False,
        use_anim=True,
    )
    added = [o for o in bpy.context.scene.objects if o not in before]
    arm = next(o for o in added if o.type == "ARMATURE")
    for o in added:
        if o != arm:
            bpy.data.objects.remove(o, do_unlink=True)
    arm.name = name
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    missing = [s for s in BONE_MAP if s not in arm.pose.bones]
    if missing:
        raise RuntimeError(f"{name}: BONE_MAP references bones not on Mixamo rig: {missing}")
    return arm


def clear_pose(arm) -> None:
    """Full reset, every bone, every channel — not just the mapped ones.
    Load-bearing: see the module docstring's note on leftover contamination.
    """
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.pose.transforms_clear()
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()


def rest_quat(armobj, bonename: str) -> Quaternion:
    b = armobj.data.bones[bonename]
    m = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
    return m.to_quaternion()


def build_alignment(target, src) -> dict[str, Quaternion]:
    """Per-bone correction: target_rest_local * source_rest_local^-1."""
    out = {}
    for s, t in BONE_MAP.items():
        out[s] = rest_quat(target, t) @ rest_quat(src, s).inverted()
    return out


def action_range(arm) -> tuple[int, int]:
    ad = arm.animation_data
    if not ad or not ad.action:
        return (1, 1)
    lo, hi = ad.action.frame_range
    return (int(round(lo)), int(round(hi)))


def retarget_clip(target, src, align: dict[str, Quaternion], name: str) -> bpy.types.Action:
    start, end = action_range(src)
    if end <= start:
        end = start + 1
    action = bpy.data.actions.new(name=name)
    action.use_fake_user = True
    if not target.animation_data:
        target.animation_data_create()
    target.animation_data.action = action

    for pb in target.pose.bones:
        pb.rotation_mode = "QUATERNION"
    for pb in src.pose.bones:
        pb.rotation_mode = "QUATERNION"

    for f in range(start, end + 1):
        bpy.context.scene.frame_set(f)
        bpy.context.view_layer.update()
        for s, t in BONE_MAP.items():
            c = align[s]
            target.pose.bones[t].rotation_quaternion = c @ src.pose.bones[s].rotation_quaternion @ c.inverted()
            target.pose.bones[t].location = (0.0, 0.0, 0.0)  # treadmill, see docstring
            target.pose.bones[t].keyframe_insert(data_path="rotation_quaternion", frame=f)

    print(f"[polyphemos-retarget] baked '{name}' frames {start}-{end}, {len(BONE_MAP)} bones")
    return action


def push_nla(arm, actions: list[bpy.types.Action]) -> None:
    if not arm.animation_data:
        arm.animation_data_create()
    for track in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(track)
    prev = None
    for action in actions:
        track = arm.animation_data.nla_tracks.new(prev=prev)
        track.name = action.name
        track.strips.new(action.name, 1, action)
        prev = track
    arm.animation_data.action = None


def export_glb(mesh, arm, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    arm.select_set(True)
    kwargs = dict(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_skins=True,
        export_animations=True,
        export_nla_strips=True,
        export_apply=False,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_image_format="JPEG",
        export_jpeg_quality=85,
        export_draco_mesh_compression_enable=False,  # 26 Ağu lesson: shared GLTFLoader has no DRACOLoader
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_animation_mode="NLA_TRACKS")
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    print(f"[polyphemos-retarget] wrote {path} ({path.stat().st_size} bytes)")


def main() -> int:
    for _name, path in CLIPS:
        if not path.exists():
            print(f"missing {path}")
            return 1
    if not SRC_GLB.exists():
        print(f"missing {SRC_GLB}")
        return 1

    reset_scene()
    mesh, target = import_polyphemos()
    print(f"[polyphemos-retarget] loaded {mesh.name} verts={len(mesh.data.vertices)}, armature bones={len(target.data.bones)}")

    baked: list[bpy.types.Action] = []
    for clip_name, fbx_path in CLIPS:
        clear_pose(target)
        src = import_mixamo_armature(fbx_path, f"MixamoSrc_{clip_name}")
        align = build_alignment(target, src)
        baked.append(retarget_clip(target, src, align, clip_name))
        bpy.data.objects.remove(src, do_unlink=True)

    clear_pose(target)  # leave the exported rest pose clean, not idle's last frame
    push_nla(target, baked)
    export_glb(mesh, target, DST)
    DST_RAW.parent.mkdir(parents=True, exist_ok=True)
    DST_RAW.write_bytes(DST.read_bytes())
    print(f"[polyphemos-retarget] copied {DST_RAW} ({DST_RAW.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
