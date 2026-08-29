#!/usr/bin/env python3
"""
Third approach to the Polyphemos boss moveset. Retarget Mixamo motion onto
the boss's OWN Tripo armature (ASSET-127) instead of moving the boss mesh
onto a Mixamo skeleton.

Why not the first two approaches (both reverted in 744c7f8): they tried to
carry skin weights from the Tripo rig to a Mixamo skeleton — once by
re-solving them (voxel-cage Bone Heat, 10x left/right asymmetry, hands
unweighted) and once by renaming vertex groups (weights carried perfectly,
result was worse). The second failure is structural and worth stating
plainly: a skin weight is meaningless without the bind matrix it was solved
against. Tripo's bones and Mixamo's bones sit at different rest positions
with different rest orientations, so the same weight deforms a vertex
through the wrong rest offset.

This script never touches a weight. ASSET-127's mesh, vertex groups and
bind matrices ship out exactly as they came in; only bone ROTATIONS are
written. That sidesteps the entire class of bug above.

Technique: armature-space delta transfer. Per mapped bone, take the
source's rotation away from its own rest measured in ARMATURE space,
D = pose_arm * rest_arm^-1, and give the target the same delta from its
own rest: desired_arm = D * target_rest_arm. Bones are then written
parent-first, each one reading its already-posed parent chain out of
pose_bone.matrix, so only the rotation is overwritten and the head
position keeps following the parent.

One thing armature space does NOT give for free: the two rigs must be
FACING the same way. Measured here, the Tripo rig is yawed +90 deg from
Mixamo's (Mixamo faces -Y with its arm span on X; the boss faces +X with
its span on Y, the same +X facing GIANT_MESH_FACING already compensates
for in game). Left unhandled that turns every delta into a rotation about
the wrong world axis: "swing the arm down from T-pose" becomes "twist the
arm along its own length", which renders as a boss standing in T-pose with
122 keyframes of pure roll on it. The fix is to conjugate the delta by the
yaw offset, A * D * A^-1. That bug is invisible to every numeric check
short of measuring a limb's direction: bone travel, keyframe counts and
per-bone rotation magnitude all look healthy while nothing swings.

The deleted retarget_mixamo_polyphemos.py (commit 2f64fe1) used a
parent-relative conjugation, C * q * C^-1 with C = target_rest_local *
source_rest_local^-1, and that is what was tried here first. It renders
as a whole body tipped over with the arms locked above the head. Two
reasons, both fatal on this pair of rigs: the correction was built from
PARENT-RELATIVE rest orientations, which only agree between two rigs whose
hierarchies match link for link (Tripo interposes Pelvis and NeckTwist02
where Mixamo has nothing), and conjugation transports a delta into another
frame rather than re-expressing it there. Armature space has neither
problem — it is the one frame both rigs genuinely share.

It applies cleanly here because the Tripo mesh was generated from the
ASSET-125 T-pose multiview set, so the rig rests in the same T-pose family
Mixamo does (measured: upper arm to hand drops 0.078 over a 0.242 span,
~18 deg below horizontal).

Root motion is rotation-only (treadmill). cyclopsStop.ts drives the boss's
world translation itself; a baked root would fight it.

Usage:
  blender --background --python scripts/blender/retarget_mixamo_polyphemos_boss_tripo.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion

ROOT = Path(__file__).resolve().parents[2]
SRC_GLB = ROOT / "public/assets/models/char_polyphemos_boss_01_rig.glb"
MIXAMO = ROOT / "art-source/work/mixamo/boss"
DST = ROOT / "public/assets/models/char_polyphemos_boss_03_anim.glb"

CLIPS = (
    ("idle", MIXAMO / "breathing_idle.fbx"),
    ("walk", MIXAMO / "walk.fbx"),
    ("run", MIXAMO / "run.fbx"),
    ("sweep", MIXAMO / "sweep.fbx"),
    ("slam", MIXAMO / "slam.fbx"),
    ("punch", MIXAMO / "punch.fbx"),
    ("roar", MIXAMO / "roar.fbx"),
)

# Mixamo bone -> Tripo bone (ASSET-127, 41 joints). The *Twist01/02 helper
# bones stay in bind pose on purpose: they exist to distribute a twist the
# retarget does not produce, and driving them from a Mixamo rig that has no
# equivalent would only double-count the parent's rotation.
BONE_MAP = {
    "mixamorig:Hips": "Hip",
    "mixamorig:Spine": "Waist",
    "mixamorig:Spine1": "Spine01",
    "mixamorig:Spine2": "Spine02",
    "mixamorig:Neck": "NeckTwist01",
    "mixamorig:Head": "Head",
    "mixamorig:LeftShoulder": "L_Clavicle",
    "mixamorig:LeftArm": "L_Upperarm",
    "mixamorig:LeftForeArm": "L_Forearm",
    "mixamorig:LeftHand": "L_Hand",
    "mixamorig:RightShoulder": "R_Clavicle",
    "mixamorig:RightArm": "R_Upperarm",
    "mixamorig:RightForeArm": "R_Forearm",
    "mixamorig:RightHand": "R_Hand",
    "mixamorig:LeftUpLeg": "L_Thigh",
    "mixamorig:LeftLeg": "L_Calf",
    "mixamorig:LeftFoot": "L_Foot",
    "mixamorig:LeftToeBase": "L_ToeBase",
    "mixamorig:RightUpLeg": "R_Thigh",
    "mixamorig:RightLeg": "R_Calf",
    "mixamorig:RightFoot": "R_Foot",
    "mixamorig:RightToeBase": "R_ToeBase",
}


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    bpy.context.scene.unit_settings.system = "METRIC"


def import_boss():
    bpy.ops.import_scene.gltf(filepath=str(SRC_GLB))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    mesh = max(meshes, key=lambda o: len(o.data.vertices))
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    missing = [t for t in BONE_MAP.values() if t not in arm.pose.bones]
    if missing:
        raise RuntimeError(f"BONE_MAP references bones not on the Tripo rig: {missing}")
    weighted = sum(1 for v in mesh.data.vertices if v.groups)
    print(
        f"[boss-retarget] {mesh.name} verts={len(mesh.data.vertices)} "
        f"weighted={weighted} groups={len(mesh.vertex_groups)} bones={len(arm.data.bones)}"
    )
    if weighted < len(mesh.data.vertices) * 0.99:
        raise RuntimeError(f"source skin is not intact: {weighted}/{len(mesh.data.vertices)}")
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
        raise RuntimeError(f"{name}: BONE_MAP references bones not on the Mixamo rig: {missing}")
    if not (arm.animation_data and arm.animation_data.action):
        raise RuntimeError(f"{name}: source FBX carries no action")
    return arm


def clear_pose(arm) -> None:
    """Full reset, every bone, every channel — not only the mapped ones.
    Load-bearing: a leftover pose from a previous clip silently contaminates
    the next retarget (see 2f64fe1's write-up).
    """
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.pose.transforms_clear()
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()


def hierarchy_order(arm, names: list[str]) -> list[str]:
    """Mapped bones, parents before children. Writing a child before its
    parent would read a stale parent pose out of pose_bone.matrix.
    """
    depth = {}
    for n in names:
        d, b = 0, arm.data.bones[n]
        while b.parent:
            d += 1
            b = b.parent
        depth[n] = d
    return sorted(names, key=lambda n: depth[n])


def yaw_offset(target, src) -> float:
    """Radians of Z rotation taking the Mixamo rig's facing onto the Tripo
    rig's. Measured from the rigs themselves rather than hardcoded, and
    cross-checked against a second, independent probe so a future rig that
    is not simply yawed fails here instead of silently exporting roll.
    """

    def yaw(v):
        return math.atan2(v.y, v.x)

    def head(arm, name):
        return arm.data.bones[name].matrix_local.to_translation()

    span = yaw(head(target, "L_Upperarm") - head(target, "R_Upperarm")) - yaw(
        head(src, "mixamorig:LeftArm") - head(src, "mixamorig:RightArm")
    )
    toe = yaw(head(target, "L_ToeBase") - head(target, "L_Foot")) - yaw(
        head(src, "mixamorig:LeftToeBase") - head(src, "mixamorig:LeftFoot")
    )
    disagree = abs(math.degrees((span - toe + math.pi) % (2 * math.pi) - math.pi))
    if disagree > 20.0:
        raise RuntimeError(
            f"arm-span and toe probes disagree on facing by {disagree:.1f} deg — "
            "the rigs differ by more than a yaw, fix the mapping by hand"
        )
    snapped = round(math.degrees(span) / 90.0) * 90.0
    print(
        f"[boss-retarget] facing offset: arm-span={math.degrees(span):+.1f} "
        f"toe={math.degrees(toe):+.1f} -> using {snapped:+.0f} deg"
    )
    return math.radians(snapped)


def rest_arm_quat(armobj, bonename: str) -> Quaternion:
    """Rest orientation in ARMATURE space (not parent-relative)."""
    return armobj.data.bones[bonename].matrix_local.to_quaternion()


def action_range(arm) -> tuple[int, int]:
    lo, hi = arm.animation_data.action.frame_range
    return (int(round(lo)), int(round(hi)))


def retarget_clip(target, src, order: list[str], name: str):
    align = Quaternion((0.0, 0.0, 1.0), yaw_offset(target, src))
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

    src_rest = {s_name: rest_arm_quat(src, s_name) for s_name in BONE_MAP}
    tgt_rest = {t_name: rest_arm_quat(target, t_name) for t_name in BONE_MAP.values()}
    inv_map = {t: s_name for s_name, t in BONE_MAP.items()}

    for f in range(start, end + 1):
        bpy.context.scene.frame_set(f)
        bpy.context.view_layer.update()
        for t in order:
            s_name = inv_map[t]
            delta = src.pose.bones[s_name].matrix.to_quaternion() @ src_rest[s_name].inverted()
            want = (align @ delta @ align.inverted()) @ tgt_rest[t]
            pb = target.pose.bones[t]
            m = pb.matrix  # parent chain already written this frame, see hierarchy_order
            pb.matrix = Matrix.LocRotScale(m.to_translation(), want, m.to_scale())
            pb.location = (0.0, 0.0, 0.0)  # treadmill, see the module docstring
            bpy.context.view_layer.update()
            pb.keyframe_insert(data_path="rotation_quaternion", frame=f)

    print(f"[boss-retarget] baked '{name}' frames {start}-{end}, {len(order)} bones")
    return action


def measure_travel(target, action, name: str) -> None:
    """Per-clip motion QA. 744c7f8's lesson is that this is NOT sufficient on
    its own — a render is still required — but a clip that measures ~0 travel
    on every bone is broken for certain and worth failing early on.
    """
    target.animation_data.action = action
    start, end = int(round(action.frame_range[0])), int(round(action.frame_range[1]))
    probes = ("R_Hand", "L_Hand", "R_Foot", "L_Foot", "Head")
    prev: dict[str, object] = {}
    travel = {p: 0.0 for p in probes}
    for f in range(start, end + 1):
        bpy.context.scene.frame_set(f)
        bpy.context.view_layer.update()
        for p in probes:
            w = (target.matrix_world @ target.pose.bones[p].matrix).to_translation()
            if p in prev:
                travel[p] += (w - prev[p]).length
            prev[p] = w
    print(
        f"[boss-retarget] travel '{name}' "
        + " ".join(f"{p}={travel[p]:.2f}m" for p in probes)
    )
    if max(travel.values()) < 0.01:
        raise RuntimeError(f"clip '{name}' has no motion on any probe bone")


def push_nla(arm, actions) -> None:
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
    bpy.context.view_layer.objects.active = arm
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
        # 26 Aug lesson: the shared GLTFLoader has no DRACOLoader attached.
        export_draco_mesh_compression_enable=False,
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_animation_mode="NLA_TRACKS")
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    print(f"[boss-retarget] wrote {path} ({path.stat().st_size} bytes)")


def main() -> int:
    if not SRC_GLB.exists():
        print(f"missing {SRC_GLB}")
        return 1
    for _name, path in CLIPS:
        if not path.exists():
            print(f"missing {path}")
            return 1

    reset_scene()
    mesh, target = import_boss()
    order = hierarchy_order(target, list(BONE_MAP.values()))
    print(f"[boss-retarget] write order: {order}")

    baked = []
    for clip_name, fbx_path in CLIPS:
        clear_pose(target)
        src = import_mixamo_armature(fbx_path, f"MixamoSrc_{clip_name}")
        baked.append(retarget_clip(target, src, order, clip_name))
        bpy.data.objects.remove(src, do_unlink=True)

    for action in baked:
        measure_travel(target, action, action.name)

    clear_pose(target)  # export a clean rest pose, not the last clip's last frame
    push_nla(target, baked)
    export_glb(mesh, target, DST)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
