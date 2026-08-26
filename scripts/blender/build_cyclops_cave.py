#!/usr/bin/env python3
"""Build the Kiklop Mağarası room-shell as ONE merged tunnel mesh (ASSET-090).

  blender --background --python scripts/blender/build_cyclops_cave.py

Replaces the previous "one BoxGeometry per room" shell in
src/world/cyclopsCave.ts (each room its own closed box, `BackSide` material)
with a single continuous mesh built by extruding an open (floor-less) wall+
ceiling profile along Z through the exact `ROOMS` table from
docs/design/level-cyclops-cave.md §1.2 / src/world/cyclopsCave.ts — the same
numbers that already drive collision (`corridorHalfWidthAt`). Re-running this
script after a design-doc room-size change keeps shell and collision in sync
by construction; a hand-placed geometry cannot make that guarantee.

Why not per-room boxes (what shipped 25-26 Aug as the "primitive pass"):
adjacent rooms of different width/ceiling each got their OWN closed box, so
at every room boundary there were two independent wall faces sitting at (or
very near) the same Z, both rendered `BackSide`. A camera whose boom carries
it past the player's room boundary lands inside the NEXT room's box and ends
up staring straight into that box's own near wall from ~1-2m — the whole
frame fills with a flat, close-up rock-texture, indistinguishable from being
stuck inside solid geometry (reproduced and reported this session, task
"Fix third-person camera clipping through room walls"). A single continuous
mesh with no interior end-cap faces between connected rooms has no such wall
to clip into — this is a structural fix, not a camera-side workaround.

Cross-section: an open "U" profile per room (bottom-left → top-left →
top-right → bottom-right, floor excluded — the floor is a separate mesh in
cyclopsCave.ts with its own sand/rock split and heightAt() slope, untouched
here). Consecutive rooms are connected by a short (TAPER m each side) tapered
collar so width/ceiling changes at boundaries read as a real narrowing/
widening in the rock, not an invisible step (production plan §2.0: "Depo →
Boğaz A daralması görünük olmalı"). `cove` and `path` are skipped entirely
(open sky by design — level-cyclops-cave.md, this session's own path-shell
fix). `inner`'s far end (D=65) is capped (dead end); `mouth`'s near end
(D=0) is left open (the cave's one real entrance).

UV: U = arc-length around the profile (meters, so a wall unwraps along its
own height and the ceiling along its own width with no stretch); V = world Z
(meters). `cyclopsCave.ts` applies the existing tileable rock material
(`loadCaveRockMaterial()`) with its own `.repeat()` in Three.js, exactly like
the floor already does — this script exports geometry + UVs only, no baked
material/texture, so the GLB stays tiny and the texture is never duplicated.

A small deterministic per-vertex jitter (perpendicular to each wall/ceiling
face) is added for a hand-carved-rock read instead of perfectly flat planes
— cosmetic only, collision is untouched (still `corridorHalfWidthAt` in TS).
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector, noise

SEED = 20260826
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "models" / "cave_cyclops_shell_01_mesh_68.glb"

# level-cyclops-cave.md §1.2 / src/world/cyclopsCave.ts ROOMS — id, dMin, dMax,
# halfWidth, ceilingY. Only rooms that get a real shell (cove + path are open
# sky, skipped — matches cyclopsCave.ts's own room-shell-loop exclusion).
ROOMS = [
    ("mouth", 0.0, 8.0, 5.0, 5.0),
    ("depot", 8.0, 22.0, 6.0, 4.0),
    ("gorgeA", 22.0, 26.0, 2.0, 3.0),
    ("pens", 26.0, 44.0, 7.0, 7.0),
    ("gorgeB", 44.0, 48.0, 2.0, 3.0),
    ("inner", 48.0, 65.0, 4.5, 5.0),
]
TAPER = 0.3  # m inset from each internal room boundary, collar length = 2*TAPER
JITTER_AMP = 0.06  # m, perpendicular hand-carved-rock roughness
JITTER_SCALE = 0.55  # noise frequency


def rng3(p: Vector, salt: float) -> float:
    """Stable 0..1 hash, independent of Python's random (matches build_island_kit.py)."""
    return noise.noise(p * JITTER_SCALE + Vector((salt, salt * 1.7, SEED * 0.0001))) * 0.5 + 0.5


def profile_points(hw: float, ceil: float) -> list[tuple[float, float]]:
    """Open U: bottom-left -> top-left -> top-right -> bottom-right. No floor edge."""
    return [(-hw, 0.0), (-hw, ceil), (hw, ceil), (hw, 0.0)]


def build() -> bpy.types.Object:
    bm = bmesh.new()
    verts: list[bmesh.types.BMVert] = []

    def add_ring(z: float, hw: float, ceil: float) -> list[bmesh.types.BMVert]:
        # NB axis mapping: (x, y) here are logical (width, height) — but
        # Blender's OWN up axis is Z, not Y (build_island_kit.py's
        # plant_on_ground() confirms this convention: it reads bound_box.z as
        # the ground). `export_yup` converts FROM Blender's native Z-up TO
        # glTF's Y-up assuming Blender Z really is height — feeding height
        # into raw Blender Y instead (as an earlier version of this script
        # did) makes the exporter swap height and depth in the shipped GLB.
        # So every vertex is built as Blender-native (x, depth, height): raw
        # Y = z (the room's D/depth value), raw Z = y (the profile's local
        # height) — verified against the exported GLB's own accessor
        # min/max, not just a Blender reimport (which round-trips the same
        # transform and can't catch a one-sided mistake).
        pts = profile_points(hw, ceil)
        ring = []
        for (x, y) in pts:
            p = Vector((x, z, y))
            # Perpendicular jitter: side walls jitter in X, ceiling jitters in
            # (Blender-native) Z — picked by which edge the point sits on.
            jx = (rng3(p, 3.1) - 0.5) * 2.0 * JITTER_AMP
            jh = (rng3(p, 7.9) - 0.5) * 2.0 * JITTER_AMP
            on_ceiling = abs(y - ceil) < 1e-6
            on_wall = not on_ceiling
            jittered = Vector((
                x + (jx if on_wall else jx * 0.3),
                z,
                y + (jh if on_ceiling else jh * 0.3),
            ))
            v = bm.verts.new(jittered)
            ring.append(v)
        return ring

    def bridge(ring_a: list[bmesh.types.BMVert], ring_b: list[bmesh.types.BMVert]) -> None:
        # Winding gives outward normals (away from the tunnel interior, into
        # the rock) so BackSide rendering (camera inside, looking out at the
        # back of each face) shows the wall/ceiling — verified by hand for
        # all 3 segments (left wall +X, ceiling +Y, right wall +X... i.e.
        # away from center on both sides) and by measuring the exported mesh.
        for i in range(len(ring_a) - 1):
            a0, a1 = ring_a[i], ring_a[i + 1]
            b0, b1 = ring_b[i], ring_b[i + 1]
            bm.faces.new((a0, b0, b1, a1))

    rings_front: dict[str, tuple[list[bmesh.types.BMVert], float]] = {}
    rings_back: dict[str, tuple[list[bmesh.types.BMVert], float]] = {}

    for i, (rid, dmin, dmax, hw, ceil) in enumerate(ROOMS):
        z_front = dmin + (TAPER if i > 0 else 0.0)
        z_back = dmax - (TAPER if i < len(ROOMS) - 1 else 0.0)
        rf = add_ring(z_front, hw, ceil)
        rb = add_ring(z_back, hw, ceil)
        bridge(rf, rb)
        rings_front[rid] = (rf, z_front)
        rings_back[rid] = (rb, z_back)

    for i in range(len(ROOMS) - 1):
        rid_a, rid_b = ROOMS[i][0], ROOMS[i + 1][0]
        rb, _ = rings_back[rid_a]
        rf, _ = rings_front[rid_b]
        bridge(rb, rf)

    # Dead end: inner's back (D=65) gets a flat cap. The 4 profile points
    # already trace bl->tl->tr->br in order, so closing them as one n-gon
    # face implicitly adds the missing bl-br (floor) edge as the polygon's
    # closing edge — no extra geometry needed.
    last_rb, _ = rings_back[ROOMS[-1][0]]
    bm.faces.new(last_rb)  # measured (raw GLB decode + render), NOT reversed like bridge()

    # mouth's front (D=0, z_front=0, no inset) is left open on purpose — the
    # cave's one real entrance, connects to the (shell-less) path outside.

    bm.normal_update()

    # UV: U = arc-length around the room's own profile (meters), V = world
    # depth (meters). Blender-native coords now: x=width, y=depth, z=height
    # (see add_ring's comment) — height lives in .z, depth in .y.
    uv_layer = bm.loops.layers.uv.new("UVMap")
    for face in bm.faces:
        for loop in face.loops:
            v = loop.vert
            x, depth, height = v.co.x, v.co.y, v.co.z
            # Per-face bounding box for a locally-consistent hw/ceil, robust
            # to jitter (walk bl(-hw,0)->tl(-hw,ceil)->tr(hw,ceil)->br(hw,0)).
            xs = [l.vert.co.x for l in face.loops]
            hs = [l.vert.co.z for l in face.loops]
            hw_f = (max(xs) - min(xs)) / 2.0 or 0.01
            ceil_f = max(hs) or 0.01
            if x <= 0:
                u = height  # left wall: climbing height
            elif height >= ceil_f - 0.05 and (max(xs) - min(xs)) > (max(hs) - min(hs)):
                u = ceil_f + (x + hw_f)  # ceiling: crossing width
            else:
                u = ceil_f + 2 * hw_f + (ceil_f - height)  # right wall: descending
            loop[uv_layer].uv = (u, depth)

    mesh = bpy.data.meshes.new("cave_cyclops_shell")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    obj = bpy.data.objects.new("cave_cyclops_shell", mesh)
    bpy.context.collection.objects.link(obj)

    mat = bpy.data.materials.new("cave_shell_preview")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.42, 0.40, 0.36, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.95
    obj.data.materials.append(mat)

    return obj


def export(obj: bpy.types.Object) -> None:
    # export_yup maps Blender-native Y -> glTF -Z (measured: D=0..65 came out
    # as glTF Z=0..-65, backwards from cyclopsCave.ts's "D = z, cave deepens
    # in +Z" convention). Mirror on Y and apply to fix the sign.
    obj.scale.y = -1
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # Measured (raw GLB decode, not a Blender reimport — reimporting undoes
    # the same yup transform and can't catch a one-sided mistake): the
    # negative-scale apply above flips face winding the OPPOSITE way from
    # what's needed — a cap face that should point away from the camera
    # (+Z, into the dead end) came out at -Z (back toward the camera, i.e.
    # invisible under BackSide). One explicit flip fixes it; confirmed by
    # re-running the same raw-decode check afterward.
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.flip_normals()
    bpy.ops.object.mode_set(mode="OBJECT")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_draco_mesh_compression_enable=False,
    )
    kb = OUT.stat().st_size / 1024
    print(f"SHELL: {len(obj.data.polygons)} faces, {kb:.1f} KB -> {OUT.relative_to(ROOT)}")


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    obj = build()
    export(obj)


if __name__ == "__main__":
    main()
