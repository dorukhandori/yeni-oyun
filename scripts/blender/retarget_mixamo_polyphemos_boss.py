#!/usr/bin/env python3
"""
Bind the Polyphemos BOSS mesh (ASSET-126) to a Mixamo armature and copy
Mixamo clips onto it. Zero Tripo credits, no Mixamo auto-rigger upload.

Why a Mixamo-native skeleton instead of the Tripo rig (ASSET-127):
sahip can download any clip from Mixamo, and a Mixamo-skinned character
takes those clips DROP-IN — no per-clip bone-name mapping or rest-pose
alignment. The Tripo rig stays in the repo as the fallback/reference.

Differences from the Doryseus version this was adapted from:
  * NO `hang_arms()`. Doryseus's mesh stood with arms down, so the Mixamo
    T-pose rest had to be folded to match it. The boss mesh was generated
    FROM a T-pose multiview set (ASSET-125), so it already matches Mixamo
    rest exactly — folding would misalign it.
  * NO harvest/dig bake (Lotus-specific).
  * Clip names are plain `idle`/`walk`/`run` — that is what
    `cyclopsStop.ts` looks up (the Doryseus path uses `preset:*`).

Bone Heat still runs on a voxel cage and transfers back: the boss mesh is
cleaner than Doryseus's (63 non-manifold verts vs ~12k edges) but the cage
path is proven here and costs nothing.

Usage:
  blender --background --python scripts/blender/retarget_mixamo_polyphemos_boss.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
SRC_MESH = ROOT / "public/assets/models/char_polyphemos_boss_01_mesh_10000.glb"
MIXAMO = ROOT / "art-source/work/mixamo/locomotion"
DST = ROOT / "public/assets/models/char_polyphemos_boss_02_mixamo.glb"
DST_RAW = ROOT / "art-source/raw/char_polyphemos_boss_02_mixamo.glb"
HEIGHT_M = 5.0  # dev boyu, cyclopsStop.ts GIANT_HEIGHT_M ile aynı

# `cyclopsStop.ts` "idle" ve "walk" adlarını arıyor. Saldırı klipleri
# sahip Mixamo'dan indirdikçe buraya eklenecek (bkz. dosya başlığı).
CLIPS = (
    ("idle", MIXAMO / "idle.fbx"),
    ("walk", MIXAMO / "walking.fbx"),
    ("run", MIXAMO / "running.fbx"),
)

MAJOR = (
    "mixamorig:Hips",
    "mixamorig:Spine",
    "mixamorig:Spine1",
    "mixamorig:Spine2",
    "mixamorig:Neck",
    "mixamorig:Head",
    "mixamorig:LeftShoulder",
    "mixamorig:LeftArm",
    "mixamorig:LeftForeArm",
    "mixamorig:RightShoulder",
    "mixamorig:RightArm",
    "mixamorig:RightForeArm",
    "mixamorig:LeftUpLeg",
    "mixamorig:LeftLeg",
    "mixamorig:LeftFoot",
    "mixamorig:RightUpLeg",
    "mixamorig:RightLeg",
    "mixamorig:RightFoot",
)


def group_count(mesh, vg) -> int:
    n = 0
    for v in mesh.data.vertices:
        try:
            vg.weight(v.index)
            n += 1
        except RuntimeError:
            pass
    return n


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    bpy.context.scene.unit_settings.system = "METRIC"


def import_boss_mesh():
    bpy.ops.import_scene.gltf(filepath=str(SRC_MESH))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    mesh = max(meshes, key=lambda o: len(o.data.vertices))
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    while mesh.parent:
        bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    pts = [v.co.copy() for v in mesh.data.vertices]
    zs = [p.z for p in pts]
    ys = [p.y for p in pts]
    xs = [p.x for p in pts]
    min_z, max_z = min(zs), max(zs)
    h = max_z - min_z
    cx = (min(xs) + max(xs)) * 0.5
    cy = (min(ys) + max(ys)) * 0.5
    s = HEIGHT_M / h if h > 0.01 else 1.0
    for v in mesh.data.vertices:
        v.co.x = (v.co.x - cx) * s
        v.co.y = (v.co.y - cy) * s
        v.co.z = (v.co.z - min_z) * s
    mesh.data.update()
    mesh.name = "DoryseusMesh"

    # Mixamo faces -Y after FBX apply. Doryseus GLB face is +X (game meshFacing
    # -π/2). Rotate so the textured face looks Mixamo-forward.
    mesh.rotation_euler[2] = -math.pi / 2
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    print(f"[mixamo] mesh verts={len(mesh.data.vertices)} h={HEIGHT_M}")
    return mesh


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
    return arm


def rest_head(arm, bone: str) -> Vector:
    return arm.matrix_world @ arm.data.bones[bone].head_local


def rest_tail(arm, bone: str) -> Vector:
    return arm.matrix_world @ arm.data.bones[bone].tail_local


def world_head(arm, bone: str) -> Vector:
    pb = arm.pose.bones[bone]
    return arm.matrix_world @ pb.head


def scale_armature_to_mesh(arm, mesh) -> None:
    mesh_pts = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    mesh_h = max(p.z for p in mesh_pts) - min(p.z for p in mesh_pts)
    head_z = rest_tail(arm, "mixamorig:HeadTop_End").z
    foot_z = min(
        rest_head(arm, "mixamorig:LeftFoot").z,
        rest_head(arm, "mixamorig:RightFoot").z,
    )
    arm_h = head_z - foot_z
    if arm_h < 0.01:
        raise RuntimeError("Mixamo armature has no height")
    arm.scale *= mesh_h / arm_h
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.update()

    foot_z = min(
        rest_head(arm, "mixamorig:LeftFoot").z,
        rest_head(arm, "mixamorig:RightFoot").z,
    )
    hips = rest_head(arm, "mixamorig:Hips")
    mesh_cx = sum(p.x for p in mesh_pts) / len(mesh_pts)
    mesh_cy = sum(p.y for p in mesh_pts) / len(mesh_pts)
    arm.location.x += mesh_cx - hips.x
    arm.location.y += mesh_cy - hips.y
    arm.location.z -= foot_z
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.update()
    print(
        f"[mixamo] armature scaled hips={rest_head(arm, 'mixamorig:Hips')} "
        f"head={rest_tail(arm, 'mixamorig:HeadTop_End')}"
    )


def hang_arms(arm) -> None:
    """Fold Mixamo T-pose arms down so Bone Heat sees bones inside the tunic.

    Mixamo Left/RightArm local +X rotation of +90° maps the T-pose +X/-X
    limb onto world -Z (hanging) without flying the chain behind the body.
    """
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.transforms_clear()
    for name in ("mixamorig:LeftArm", "mixamorig:RightArm"):
        pb = arm.pose.bones[name]
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    bpy.context.view_layer.update()
    bpy.ops.pose.armature_apply()
    bpy.ops.object.mode_set(mode="OBJECT")
    print(
        f"[mixamo] hang L_hand={world_head(arm, 'mixamorig:LeftHand')} "
        f"R_hand={world_head(arm, 'mixamorig:RightHand')}"
    )


def capture_basis(arm) -> dict[str, Matrix]:
    bpy.context.view_layer.update()
    return {b.name: b.matrix_basis.copy() for b in arm.pose.bones}


def make_cage(mesh):
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.duplicate()
    cage = bpy.context.active_object
    cage.name = "WeightCage"
    cage.data.materials.clear()
    mod = cage.modifiers.new("vox", "REMESH")
    mod.mode = "VOXEL"
    mod.voxel_size = 0.02
    bpy.ops.object.modifier_apply(modifier="vox")
    print(f"[mixamo] cage verts={len(cage.data.vertices)}")
    return cage


def heat_and_transfer(original, cage, arm_obj) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    cage.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    cage_counts = {vg.name: group_count(cage, vg) for vg in cage.vertex_groups}
    missed = [n for n in MAJOR if cage_counts.get(n, 0) == 0]
    if missed:
        raise RuntimeError(f"Bone Heat missed major bones on cage: {missed}")
    print(
        "[mixamo] cage heat major",
        {n: cage_counts.get(n, 0) for n in MAJOR},
    )
    print(
        "[mixamo] cage heat hands",
        {
            n: cage_counts.get(n, 0)
            for n in ("mixamorig:LeftHand", "mixamorig:RightHand")
        },
    )

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

    bpy.ops.object.select_all(action="DESELECT")
    cage.select_set(True)
    bpy.context.view_layer.objects.active = cage
    bpy.ops.object.delete()


def action_range(arm) -> tuple[int, int]:
    ad = arm.animation_data
    if not ad or not ad.action:
        return (1, 1)
    lo, hi = ad.action.frame_range
    return (int(round(lo)), int(round(hi)))


def retarget_clip(source, target, name: str, idle_basis: dict[str, Matrix]) -> bpy.types.Action:
    start, end = action_range(source)
    if end <= start:
        end = start + 1
    action = bpy.data.actions.new(name=name)
    action.use_fake_user = True
    if not target.animation_data:
        target.animation_data_create()
    target.animation_data.action = action
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.mode_set(mode="POSE")

    names = [b.name for b in target.pose.bones if b.name in source.pose.bones]
    for pb in target.pose.bones:
        pb.rotation_mode = "QUATERNION"
    for f in range(start, end + 1):
        bpy.context.scene.frame_set(f)
        bpy.context.view_layer.update()
        for n in names:
            src = source.pose.bones[n]
            idle = idle_basis.get(n)
            if idle is None:
                continue
            delta = idle.inverted() @ src.matrix_basis
            pb = target.pose.bones[n]
            pb.rotation_mode = "QUATERNION"
            pb.matrix_basis = delta
            # Mixamo pack walk/run keep hip translation in centimetres after
            # FBX apply-scale, which launched the mesh ~170 m. Game locomotion
            # moves the root; clips are rotation-only (treadmill).
            pb.location = Vector((0.0, 0.0, 0.0))
            pb.scale = Vector((1.0, 1.0, 1.0))
            pb.keyframe_insert(data_path="rotation_quaternion", frame=f)

    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"[mixamo] baked {name} frames {start}-{end} bones={len(names)}")
    return action


def bake_harvest(target, idle_action: bpy.types.Action) -> bpy.types.Action:
    """Lotus pick: Mixamo pack has no gather clip — bend from idle rest."""
    frames = 36
    action = bpy.data.actions.new(name="preset:biped:dig")
    action.use_fake_user = True
    if not target.animation_data:
        target.animation_data_create()
    target.animation_data.action = action
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.mode_set(mode="POSE")
    pose = target.pose.bones

    extras = {
        "mixamorig:Spine": Vector((math.radians(18), 0.0, 0.0)),
        "mixamorig:Spine1": Vector((math.radians(14), 0.0, 0.0)),
        "mixamorig:Spine2": Vector((math.radians(8), 0.0, 0.0)),
        "mixamorig:RightArm": Vector((math.radians(35), 0.0, math.radians(-12))),
        "mixamorig:RightForeArm": Vector((math.radians(22), 0.0, 0.0)),
        "mixamorig:Hips": Vector((math.radians(8), 0.0, 0.0)),
    }

    for f in range(1, frames + 1):
        u = (f - 1) / (frames - 1)
        if u < 0.35:
            k = u / 0.35
        elif u < 0.7:
            k = 1.0
        else:
            k = 1.0 - (u - 0.7) / 0.3
        k = k * k * (3.0 - 2.0 * k)
        for pb in pose:
            extra = extras.get(pb.name, Vector((0.0, 0.0, 0.0)))
            pb.rotation_mode = "XYZ"
            pb.rotation_euler = extra * k
            pb.rotation_mode = "QUATERNION"
            pb.location = Vector((0.0, 0.0, 0.0))
            pb.keyframe_insert(data_path="rotation_quaternion", frame=f)
            pb.keyframe_insert(data_path="location", frame=f)

    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"[mixamo] baked preset:biped:dig frames=1-{frames}")
    return action


def push_nla(arm, actions: list[bpy.types.Action]) -> None:
    if not arm.animation_data:
        arm.animation_data_create()
    tracks = arm.animation_data.nla_tracks
    for track in list(tracks):
        tracks.remove(track)
    prev = None
    for action in actions:
        track = tracks.new(prev=prev)
        track.name = action.name
        track.strips.new(action.name, 1, action)
        prev = track
    arm.animation_data.action = None


def export_glb(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    keep = {"preset:idle", "preset:walk", "preset:run", "preset:biped:dig"}
    for action in list(bpy.data.actions):
        if action.name not in keep:
            bpy.data.actions.remove(action)
    kwargs = dict(
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
        export_extras=False,
    )
    bpy.ops.object.select_all(action="DESELECT")
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_animation_mode="NLA_TRACKS")
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    print(f"[mixamo] wrote {path} ({path.stat().st_size} bytes)")


def main() -> int:
    for _name, path in CLIPS:
        if not path.exists():
            print(f"missing {path}")
            return 1
    if not SRC_MESH.exists():
        print(f"missing {SRC_MESH}")
        return 1

    reset_scene()
    mesh = import_boss_mesh()
    target = import_mixamo_armature(MIXAMO / "idle.fbx", "PolyphemosMixamo")
    if target.animation_data:
        target.animation_data_clear()
    scale_armature_to_mesh(target, mesh)
    # hang_arms YOK — boss mesh'i T-pose, Mixamo rest'iyle zaten hizalı.
    cage = make_cage(mesh)
    heat_and_transfer(mesh, cage, target)

    source_idle = import_mixamo_armature(MIXAMO / "idle.fbx", "MixamoSrcIdle")
    scale_armature_to_mesh(source_idle, mesh)
    start, _end = action_range(source_idle)
    bpy.context.scene.frame_set(start)
    bpy.context.view_layer.update()
    idle_basis = capture_basis(source_idle)
    print(f"[mixamo] captured idle rest at frame {start}")

    baked: list[bpy.types.Action] = []
    idle_action = retarget_clip(source_idle, target, "idle", idle_basis)
    baked.append(idle_action)

    for clip_name, fbx in CLIPS[1:]:
        src = import_mixamo_armature(fbx, f"MixamoSrc_{clip_name}")
        scale_armature_to_mesh(src, mesh)
        baked.append(retarget_clip(src, target, clip_name, idle_basis))
        bpy.data.objects.remove(src, do_unlink=True)

    bpy.data.objects.remove(source_idle, do_unlink=True)

    push_nla(target, baked)
    export_glb(DST)
    DST_RAW.parent.mkdir(parents=True, exist_ok=True)
    DST_RAW.write_bytes(DST.read_bytes())
    print(f"[mixamo] copied {DST_RAW} ({DST_RAW.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
