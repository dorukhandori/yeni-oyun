#!/usr/bin/env python3
"""
Give the Polyphemos BOSS a Mixamo skeleton WITHOUT re-solving skin weights.

Why this exists (28 Ağu 2026, sahip: "klipler ve hareketler çok kötü, hiç
alakası yok"): the first attempt skinned the raw mesh to a Mixamo armature
with Bone Heat on a voxel cage. That produced garbage — the cage merges
nearby surfaces, so nearest-neighbour weight transfer handed one leg's
vertices to the other leg's bone and the arms picked up torso weights. In
motion the character melted: legs fused, arms stretched like rubber. The
log had already said it, and it was missed:

    LeftForeArm 1557  vs  RightForeArm 15772   (10x asymmetry)
    LeftHand 0        vs  RightHand 0          (hands unweighted)

The fix is not a better solver — it is to STOP solving. Tripo's auto-rig
(ASSET-127) already produced verified-clean weights on this exact mesh
(same 18318 verts, all 18318 weighted; region QA: hands 99-100%, head 82%,
feet 86%). So we reuse those weights and only swap the skeleton:

  1. Import the Tripo-rigged GLB — mesh + its good vertex groups.
  2. Import a Mixamo armature and scale it onto that mesh.
  3. RENAME the vertex groups Tripo -> Mixamo (BONE_MAP below). Tripo's
     twist bones have no Mixamo counterpart, so their weights are folded
     into the bone they twist around (UpperarmTwist -> LeftArm, etc.).
  4. Bind the mesh to the Mixamo armature.
  5. Copy the Mixamo actions across as-is. No retargeting maths at all —
     the target IS a Mixamo skeleton, so the clips are native.

Step 5 is the real prize: any clip sahip downloads from Mixamo drops in
with no bone mapping and no rest-pose alignment.

Usage:
  blender --background --python scripts/blender/retarget_mixamo_polyphemos_boss.py
"""

from __future__ import annotations

from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SRC_RIG = ROOT / "public/assets/models/char_polyphemos_boss_01_rig.glb"
MIXAMO = ROOT / "art-source/work/mixamo/boss"
DST = ROOT / "public/assets/models/char_polyphemos_boss_02_mixamo.glb"
DST_RAW = ROOT / "art-source/raw/char_polyphemos_boss_02_mixamo.glb"
HEIGHT_M = 5.0  # cyclopsStop.ts GIANT_HEIGHT_M ile aynı

CLIPS = (
    ("idle", MIXAMO / "idle.fbx"),
    ("walk", MIXAMO / "walk.fbx"),
    ("run", MIXAMO / "run.fbx"),
    ("sweep", MIXAMO / "sweep.fbx"),
    ("slam", MIXAMO / "slam.fbx"),
    ("punch", MIXAMO / "punch.fbx"),
    ("roar", MIXAMO / "roar.fbx"),
)

# Tripo vertex-group -> Mixamo bone. Twist bones fold into the bone they
# twist around; Root/Pelvis fold into Hips (Mixamo has no separate root
# deform bone and the game drives world position itself).
BONE_MAP = {
    "Root": "mixamorig:Hips",
    "Hip": "mixamorig:Hips",
    "Pelvis": "mixamorig:Hips",
    "Waist": "mixamorig:Spine",
    "Spine01": "mixamorig:Spine1",
    "Spine02": "mixamorig:Spine2",
    "NeckTwist01": "mixamorig:Neck",
    "NeckTwist02": "mixamorig:Neck",
    "Head": "mixamorig:Head",
    "L_Clavicle": "mixamorig:LeftShoulder",
    "L_Upperarm": "mixamorig:LeftArm",
    "L_UpperarmTwist01": "mixamorig:LeftArm",
    "L_UpperarmTwist02": "mixamorig:LeftArm",
    "L_Forearm": "mixamorig:LeftForeArm",
    "L_ForearmTwist01": "mixamorig:LeftForeArm",
    "L_ForearmTwist02": "mixamorig:LeftForeArm",
    "L_Hand": "mixamorig:LeftHand",
    "R_Clavicle": "mixamorig:RightShoulder",
    "R_Upperarm": "mixamorig:RightArm",
    "R_UpperarmTwist01": "mixamorig:RightArm",
    "R_UpperarmTwist02": "mixamorig:RightArm",
    "R_Forearm": "mixamorig:RightForeArm",
    "R_ForearmTwist01": "mixamorig:RightForeArm",
    "R_ForearmTwist02": "mixamorig:RightForeArm",
    "R_Hand": "mixamorig:RightHand",
    "L_Thigh": "mixamorig:LeftUpLeg",
    "L_ThighTwist01": "mixamorig:LeftUpLeg",
    "L_ThighTwist02": "mixamorig:LeftUpLeg",
    "L_Calf": "mixamorig:LeftLeg",
    "L_CalfTwist01": "mixamorig:LeftLeg",
    "L_CalfTwist02": "mixamorig:LeftLeg",
    "L_Foot": "mixamorig:LeftFoot",
    "L_ToeBase": "mixamorig:LeftToeBase",
    "R_Thigh": "mixamorig:RightUpLeg",
    "R_ThighTwist01": "mixamorig:RightUpLeg",
    "R_ThighTwist02": "mixamorig:RightUpLeg",
    "R_Calf": "mixamorig:RightLeg",
    "R_CalfTwist01": "mixamorig:RightLeg",
    "R_CalfTwist02": "mixamorig:RightLeg",
    "R_Foot": "mixamorig:RightFoot",
    "R_ToeBase": "mixamorig:RightToeBase",
}

# Bunlar OLMAK ZORUNDA — biri eksikse o uzuv hiç deforme olmaz.
# `mixamorig:Hips` bilerek listede DEĞİL: Tripo'nun karşılığı olan `Hip`
# bir kontrol kemiği ve hiç ağırlık taşımıyor; kalça bölgesini Spine ve
# UpLeg zaten sürüyor (ölçüldü: 21 grup eşleşti, 18318/18318 vertex ağırlıklı).
CHECK_BONES = (
    "mixamorig:Spine1",
    "mixamorig:Head",
    "mixamorig:LeftArm",
    "mixamorig:LeftForeArm",
    "mixamorig:LeftHand",
    "mixamorig:RightArm",
    "mixamorig:RightForeArm",
    "mixamorig:RightHand",
    "mixamorig:LeftUpLeg",
    "mixamorig:LeftLeg",
    "mixamorig:LeftFoot",
    "mixamorig:RightUpLeg",
    "mixamorig:RightLeg",
    "mixamorig:RightFoot",
)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    bpy.context.scene.unit_settings.system = "METRIC"


def import_rigged_mesh():
    """Tripo-rigged GLB -> the mesh with its good weights (armature dropped)."""
    bpy.ops.import_scene.gltf(filepath=str(SRC_RIG))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    mesh = max(meshes, key=lambda o: len(o.data.vertices))
    for o in list(bpy.context.scene.objects):
        if o is not mesh:
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    for mod in list(mesh.modifiers):
        mesh.modifiers.remove(mod)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    zs = [v.co.z for v in mesh.data.vertices]
    xs = [v.co.x for v in mesh.data.vertices]
    ys = [v.co.y for v in mesh.data.vertices]
    h = max(zs) - min(zs)
    cx = (min(xs) + max(xs)) * 0.5
    cy = (min(ys) + max(ys)) * 0.5
    min_z = min(zs)
    s = HEIGHT_M / h if h > 0.01 else 1.0
    for v in mesh.data.vertices:
        v.co.x = (v.co.x - cx) * s
        v.co.y = (v.co.y - cy) * s
        v.co.z = (v.co.z - min_z) * s
    mesh.data.update()
    mesh.name = "PolyphemosBossMesh"
    weighted = sum(1 for v in mesh.data.vertices if len(v.groups) > 0)
    print(f"[boss] mesh verts={len(mesh.data.vertices)} weighted={weighted} h={HEIGHT_M}")
    if weighted == 0:
        raise RuntimeError("Tripo rig carried no weights — wrong source file?")
    return mesh


def remap_groups(mesh) -> None:
    """Rename Tripo vertex groups to Mixamo names, summing folded twists."""
    src = {vg.index: vg.name for vg in mesh.vertex_groups}
    unmapped = sorted({n for n in src.values() if n not in BONE_MAP})
    if unmapped:
        print(f"[boss] WARN unmapped tripo groups (dropped): {unmapped}")

    acc: dict[str, dict[int, float]] = {}
    for v in mesh.data.vertices:
        for g in v.groups:
            old = src.get(g.group)
            new = BONE_MAP.get(old)
            if new is None or g.weight <= 0.0:
                continue
            acc.setdefault(new, {})
            acc[new][v.index] = acc[new].get(v.index, 0.0) + g.weight

    while mesh.vertex_groups:
        mesh.vertex_groups.remove(mesh.vertex_groups[0])
    for name, weights in acc.items():
        vg = mesh.vertex_groups.new(name=name)
        for idx, w in weights.items():
            vg.add([idx], min(1.0, w), "REPLACE")

    weighted = sum(1 for v in mesh.data.vertices if len(v.groups) > 0)
    print(f"[boss] remapped groups={len(acc)} weighted_verts={weighted}/{len(mesh.data.vertices)}")
    if weighted == 0:
        raise RuntimeError("Remap produced no weights")


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


def scale_armature_to_mesh(arm, mesh) -> None:
    pts = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    mesh_h = max(p.z for p in pts) - min(p.z for p in pts)
    head_z = rest_tail(arm, "mixamorig:HeadTop_End").z
    foot_z = min(rest_head(arm, "mixamorig:LeftFoot").z, rest_head(arm, "mixamorig:RightFoot").z)
    arm_h = head_z - foot_z
    if arm_h < 0.01:
        raise RuntimeError("Mixamo armature has no height")
    arm.scale *= mesh_h / arm_h
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.update()

    foot_z = min(rest_head(arm, "mixamorig:LeftFoot").z, rest_head(arm, "mixamorig:RightFoot").z)
    hips = rest_head(arm, "mixamorig:Hips")
    cx = sum(p.x for p in pts) / len(pts)
    cy = sum(p.y for p in pts) / len(pts)
    arm.location.x += cx - hips.x
    arm.location.y += cy - hips.y
    arm.location.z -= foot_z
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.update()
    print(f"[boss] armature fitted hips={rest_head(arm, 'mixamorig:Hips')}")


def bind(mesh, arm) -> None:
    have = {vg.name for vg in mesh.vertex_groups}
    missing = [b for b in CHECK_BONES if b not in have]
    if missing:
        raise RuntimeError(f"Vertex groups missing for bones: {missing}")
    absent = [b for b in CHECK_BONES if b not in arm.data.bones]
    if absent:
        raise RuntimeError(f"Armature is missing bones: {absent}")
    for mod in list(mesh.modifiers):
        if mod.type == "ARMATURE":
            mesh.modifiers.remove(mod)
    m = mesh.modifiers.new("Armature", "ARMATURE")
    m.object = arm
    m.use_vertex_groups = True
    mesh.parent = arm
    print("[boss] bound mesh to Mixamo armature")


def copy_clip(source, name: str) -> bpy.types.Action:
    """Same skeleton on both sides — copy the action's curves verbatim."""
    src_action = source.animation_data.action if source.animation_data else None
    if src_action is None:
        raise RuntimeError(f"{name}: source FBX carries no action")
    action = src_action.copy()
    action.name = name
    action.use_fake_user = True
    # Mixamo bakes hip translation in FBX units; the game drives world
    # position itself, so strip location curves and keep rotation only.
    #
    # Blender 4.4+ moved actions to slots/layers and `Action.fcurves` is gone
    # (5.2 raises AttributeError) — walk both shapes so this keeps working on
    # either version.
    removed = 0
    if hasattr(action, "fcurves"):
        for fc in list(action.fcurves):
            if fc.data_path.endswith("location"):
                action.fcurves.remove(fc)
                removed += 1
    else:
        for layer in getattr(action, "layers", []):
            for strip in getattr(layer, "strips", []):
                for bag in getattr(strip, "channelbags", []):
                    for fc in list(bag.fcurves):
                        if fc.data_path.endswith("location"):
                            bag.fcurves.remove(fc)
                            removed += 1
    fs, fe = action.frame_range
    print(f"[boss] clip {name}: frames {int(fs)}-{int(fe)} location_curves_removed={removed}")
    return action


def push_nla(arm, actions: list[bpy.types.Action]) -> None:
    if not arm.animation_data:
        arm.animation_data_create()
    tracks = arm.animation_data.nla_tracks
    for t in list(tracks):
        tracks.remove(t)
    prev = None
    for a in actions:
        tr = tracks.new(prev=prev)
        tr.name = a.name
        tr.strips.new(a.name, 1, a)
        prev = tr
    arm.animation_data.action = None


def export_glb(path: Path, keep: set[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
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
    print(f"[boss] wrote {path} ({path.stat().st_size} bytes)")


def main() -> int:
    for _n, p in CLIPS:
        if not p.exists():
            print(f"missing {p}")
            return 1
    if not SRC_RIG.exists():
        print(f"missing {SRC_RIG}")
        return 1

    reset_scene()
    mesh = import_rigged_mesh()
    remap_groups(mesh)

    target = import_mixamo_armature(CLIPS[0][1], "PolyphemosMixamo")
    if target.animation_data:
        target.animation_data_clear()
    scale_armature_to_mesh(target, mesh)
    bind(mesh, target)

    baked: list[bpy.types.Action] = []
    for clip_name, fbx in CLIPS:
        src = import_mixamo_armature(fbx, f"Src_{clip_name}")
        baked.append(copy_clip(src, clip_name))
        bpy.data.objects.remove(src, do_unlink=True)

    push_nla(target, baked)
    export_glb(DST, {n for n, _ in CLIPS})
    DST_RAW.parent.mkdir(parents=True, exist_ok=True)
    DST_RAW.write_bytes(DST.read_bytes())
    print(f"[boss] copied {DST_RAW}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
