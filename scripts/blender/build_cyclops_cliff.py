#!/usr/bin/env python3
"""Build the cave-mouth cliff face — a solid chalk-rock slab with a real
oval archway cut through it, seen from OUTSIDE (the coastal path).

  blender --background --python scripts/blender/build_cyclops_cliff.py

Sahip (26 Ağu 2026, ekran görüntüsü geri bildirimi): the D=0 threshold had
no exterior-facing geometry at all — the "mouth" room's own shell
(BackSide, from build_cyclops_cave.py) is only visible from INSIDE, so
walking up the path toward the cave you'd see nothing but open air until
you crossed the threshold. Sahip wants an oval opening specifically,
matching ASSET-104's "large natural rock archway" concept.

Geometry: a wide, tall chalk-rock slab straddling D=0, with an elliptical
hole booleaned through it — the ellipse is sized a little larger than the
interior "mouth" room's own opening (halfWidth 5, ceiling 5) so the
archway reads as a real frame around the interior, not a tight seam.
Mild per-vertex Displace-modifier noise breaks up the otherwise flat
slab faces into a rougher, hand-carved-looking cliff surface.

Exported with the same Blender-native-axis fix as build_cyclops_cave.py
(height baked into raw Z, depth into raw Y, Y-mirrored before export so
glTF Z comes out positive-increasing — see that script's own comments
for the full reasoning) so this drops into cyclopsCave.ts's existing
D=z, Y=height convention with no surprises.
"""

from __future__ import annotations

from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "models" / "rock_cyclops_cliff_01_mesh_4460.glb"

# Blender-native axes throughout: X=width, Y=depth (D), Z=height.
SLAB_W = 22.0
SLAB_H = 15.0
SLAB_THICK = 3.2
SLAB_Y = 0.0  # centred on D=0, the mouth threshold

ARCH_RX = 5.6  # horizontal half-width of the oval opening (interior hw=5)
ARCH_RZ = 6.3  # vertical half-height of the oval opening (interior ceil=5)
ARCH_CENTER_Z = 5.0  # so the oval's low point sits a touch below ground (real opening reaches the floor)

CHALK = (0.902, 0.886, 0.831, 1.0)  # art-bible.md §2 chalk-white, linear


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)

    bpy.ops.mesh.primitive_cube_add(size=1)
    slab = bpy.context.active_object
    slab.name = "cyclops_cliff"
    slab.scale = (SLAB_W, SLAB_THICK, SLAB_H)
    slab.location = (0.0, SLAB_Y, SLAB_H / 2 - 1.0)  # base ~1m below D-floor, natural embedded look
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=SLAB_THICK * 3, vertices=28)
    cutter = bpy.context.active_object
    cutter.name = "arch_cutter"
    # Cylinder's own axis (local Z, the "depth" direction) rotates onto
    # world Y here (punches through the slab along D). Scale is set in the
    # cylinder's LOCAL frame BEFORE that rotation is baked in, so it's
    # local X -> world X (horizontal radius), local Y -> world Z (vertical
    # radius, after the X-rotation), local Z -> world Y (how far the cut
    # extends through the slab, not a radius at all).
    cutter.rotation_euler = (1.5708, 0.0, 0.0)
    cutter.scale = (ARCH_RX, ARCH_RZ, 1.0)
    cutter.location = (0.0, SLAB_Y, ARCH_CENTER_Z)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    boo = slab.modifiers.new("Arch", "BOOLEAN")
    boo.operation = "DIFFERENCE"
    boo.object = cutter
    bpy.context.view_layer.objects.active = slab
    bpy.ops.object.modifier_apply(modifier=boo.name)
    bpy.data.objects.remove(cutter, do_unlink=True)

    # Mild surface roughness — FLAT subdivide (edit-mode, keeps the slab's
    # own rectangular silhouette exactly as authored — a SUBSURF modifier
    # was tried first and rounded the whole outer slab into a lozenge/donut
    # shape along with the arch hole, which is not what a cliff face should
    # look like) + a Displace modifier with a procedural noise texture.
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    for _ in range(3):
        bpy.ops.mesh.subdivide(smoothness=0)
    bpy.ops.object.mode_set(mode="OBJECT")

    tex = bpy.data.textures.new("cliff_noise", type="CLOUDS")
    tex.noise_scale = 1.4
    disp = bpy.context.object.modifiers.new("Rough", "DISPLACE")
    disp.texture = tex
    disp.strength = 0.22
    disp.mid_level = 0.5
    bpy.ops.object.modifier_apply(modifier=disp.name)

    mat = bpy.data.materials.new("cliff_chalk_preview")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = CHALK
        bsdf.inputs["Roughness"].default_value = 0.95
    bpy.context.object.data.materials.append(mat)

    obj = bpy.context.object
    print(f"CLIFF: {len(obj.data.polygons)} faces, verts={len(obj.data.vertices)}")

    # --- axis fix: Y-mirror only, NO extra flip_normals -------------------
    # export_yup maps Blender-native Y -> glTF -Z (same measured behaviour
    # as build_cyclops_cave.py), so the mirror is needed for D to come out
    # positive-increasing. But unlike that script's shell (a BackSide
    # surface meant to be seen from INSIDE, which needs inward-pointing
    # normals), this is an ordinary solid viewed from OUTSIDE with a normal
    # FrontSide-style material — it needs standard outward normals. Copying
    # the shell script's extra flip_normals() here (an earlier version of
    # this script did) inverted them into pointing INTO the slab, which
    # made the whole mesh invisible in-game (empirically confirmed via raw
    # GLB normal decode: the +X edge read normal (-1,0,0), pointing inward,
    # before this fix). The mirror's own winding flip is exactly what's
    # needed on its own — no further correction.
    obj.scale.y = -1
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

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
    print(f"CLIFF: exported {kb:.1f} KB -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
