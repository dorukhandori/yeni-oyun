"""
Convert the downloaded Sketchfab "Cave gate Stylized" (gltf+bin+textures) into
a single self-contained .glb matching this project's asset convention (see
public/assets/models/*.glb — every shipped model is one embedded-texture GLB,
no loose .bin/texture siblings).

Source: https://sketchfab.com/3d-models/cave-gate-stylized-0f29271be80f4c7593964afabd4e5fbc
Author: alzarac, CC-BY-4.0 (attribution required, commercial use allowed) —
credit line lives in docs/art/asset-registry.md / assets.csv for this asset.

This is a plain import+export round-trip, NOT a from-scratch procedural build
like this project's other blender/*.py scripts — glTF's own Y-up convention
round-trips through Blender's importer/exporter symmetrically, so none of the
axis-mirror/flip-normals dances those scripts need apply here.
"""

import bpy

SRC = "/Users/dori/Downloads/cave_gate_stylized/scene.gltf"
OUT = "/Users/dori/Desktop/yeni-oyun/public/assets/models/rock_cave_gate_stylized_01_mesh_3998.glb"


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)

    # cyclopsCave.ts hides the model's own "Floor"/"Grass" meshes at
    # runtime (Cyclops has its own ground/path system) — deleting them
    # HERE instead means their textures never ship at all (2 of 4 embedded
    # PNGs, ~2.2 MB of the budget-check's "over 400 KB cap" warning was
    # dead weight for geometry nobody ever sees).
    DROP_MATERIALS = {"Floor", "Grass"}
    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            continue
        mats = {slot.material.name for slot in obj.material_slots if slot.material}
        if mats & DROP_MATERIALS:
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        export_texture_dir="",
        export_apply=True,
        export_yup=True,
        export_draco_mesh_compression_enable=False,
    )
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
