"""
Convert the downloaded Sketchfab "Low poly trees, flowers and grass" pack
(gltf+bin+textures) into a single self-contained .glb matching this
project's asset convention (see public/assets/models/*.glb — every shipped
model is one embedded-texture GLB, no loose .bin/texture siblings).

Source: https://sketchfab.com/3d-models/low-poly-trees-flowers-and-grass-442904f26b87407d98871b50b49c4169
Author: Márcio Meireles, CC-BY-4.0 (attribution required, commercial use
allowed) — credit line lives in docs/art/asset-registry.md / assets.csv.

Drops the two autumn-coloured tree variants (yellow/brown) — this game's
Lotophagoi cove is a warm Aegean SUMMER setting (art-bible §2), autumn
foliage would clash with the established palette. Keeps: the green tree,
the dry tree (reads as Mediterranean maki/scrubland), both flowers, both
grass-bush clumps, and the green ground-cover patch. Drops the brown
ground-cover patch too (redundant with the game's own sand material).

Plain import+export round-trip, not a from-scratch procedural build —
glTF's own Y-up convention round-trips through Blender symmetrically.
"""

import bpy

SRC = "/Users/dori/Downloads/low_poly_trees_flowers_and_grass/scene.gltf"
OUT = "/Users/dori/Desktop/yeni-oyun/public/assets/models/flora_lowpoly_pack_01_mesh_2336.glb"

DROP_NAME_SUBSTRINGS = [
    "autumn",  # wrong-season trees (yellow + brown variants)
    "plant-ground-brown-02",  # redundant with the game's own sand material
]

# İlk deneme (indirme boyutu, hiç küçültmeden) 19,3 MB'a çıktı — 27 gömülü
# doku, çoğu 1-2K çözünürlük + normal map çifti. pipeline.md §6 (üretim
# PNG -> oyuna giren küçük WebP/JPEG) ve ASSET-112'nin kendi emsali
# ("2048² -> 1024² JPEG85") izlenerek burada da agresif küçültme yapılıyor
# — bu küçük arka plan/dekor objeleri için normal map'ler zaten pek fark
# etmiyor.
MAX_DIM = 512


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)

    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            continue
        name_lower = obj.name.lower()
        if any(s in name_lower for s in DROP_NAME_SUBSTRINGS):
            bpy.data.objects.remove(obj, do_unlink=True)

    # Kalan tüm dokuları (artık yalnız kullanılan mesh'lerin dokuları,
    # silinen autumn/brown objelerin dokuları zaten Blender'ın kendi
    # "orphan data" temizliğiyle export'a hiç girmiyor) küçült. İlk deneme
    # (yalnız 512'ye) hâlâ 6,3 MB'dı — bu küçük arka plan objeleri (çiçek/
    # çim/dal) için normal map'ler zar zor fark ediliyor, çok daha agresif
    # küçültülüyor (128px); baseColor 512'de kalıyor.
    for img in bpy.data.images:
        is_normal = "normal" in img.name.lower()
        target = 128 if is_normal else MAX_DIM
        if img.size[0] <= target and img.size[1] <= target:
            continue
        w, h = img.size
        scale = target / max(w, h)
        img.scale(max(1, round(w * scale)), max(1, round(h * scale)))

    # JPEG DEĞİL — bu paketteki neredeyse her malzeme (grass/flowers/leaf
    # branches) `alphaMode: MASK` kullanıyor (kesme/cutout şeffaflığı,
    # yaprak/çiçek silüetleri için); JPEG alfa kanalı taşımadığından hepsini
    # opak dikdörtgenlere çevirirdi. PNG kalıyor, yalnız MAX_DIM küçültmesi
    # boyutu düşürüyor.
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
