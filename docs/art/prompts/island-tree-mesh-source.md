# Ada ağacı — image-to-3D kaynak still (LOT-28 dilim 2)

> Anatomi: `_anatomy.md`. Palet: `art-bible.md` §2 (zeytin `#6b7f4a` / kavruk `#93964f` / servi `#3d5240` / gövde `#c8b49a`).
> Mesh: `pipeline.md` §5.1. Kart: LOT-28.
> ASSET-053/054 **düz karşıdan** billboard — sahip kâğıt reddi; Tripo'ya gitmez (`pipeline.md` §2.1). Bu şablon 3/4.

Dilim 1 (kaya GLB) §8 geçmeden bu still üretilmez — koruluk, tek prop kanıtı ister.

## Kaynak kuralları

- Tek ağaç, stüdyo `#aea49a`, zemin/ufuk/HUD yok.
- **3/4**, hafif yukarı. Düz billboard yasak.
- `NOT photoreal`. Gölge serin mavi.
- Kanopi yumuşak kütle; iğne/yaprak fotoğrafı yok.
- Gövde alt kenarda. İkinci ağaç, kaya, ot yok.

## ASSET-064 — zeytin (3/4)

`<ASPECT>` = `1:1` · raw: `art-source/raw/flora_olive_02_ref_1024.png`

```text
Using Gemini, generate this as an image — 1:1, high quality, game-ready concept for image-to-3D.
Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

A SINGLE mature olive tree seen from a three-quarter angle, slightly above, as a complete sculptural object. Gnarled twisted pale trunk (#c8b49a sun-bleached wood, #8a7358 in the cool folds) and a soft rounded silver-green canopy in two or three overlapping blobs (#6b7f4a olive green, #93964f sun-scorched green on the sun side). Soft-shaded, NOT photoreal, NOT a fruit-tree photo. The trunk sits on the bottom edge of the frame. No second tree, no rocks, no grass, no sky.

Isolated on a perfectly flat even studio backdrop painted #aea49a warm beige, no floor, no horizon, no cast shadows on the backdrop, no HUD, no text, no watermark.

Look: stylized-cartoon vegetation, soft-shaded rounded canopy masses, clean flat colors, olive green and silver-green foliage, pale twisted bark. Cool blue shadows, never black. Original design only — no logos, no brand marks, no text.
```

Kabul: tek zeytin · gövde + yumuşak kanopi 3/4 · alt kenar düz.

## ASSET-066 — servi (3/4)

`<ASPECT>` = `9:16` · raw: `art-source/raw/flora_cypress_02_ref_1024.png`

```text
Using Gemini, generate this as an image — 9:16, high quality, game-ready concept for image-to-3D.
Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

A SINGLE tall Mediterranean cypress seen from a three-quarter angle, slightly above, as a complete sculptural object filling the tall frame. One narrow dark-green flame-shaped canopy (#3d5240 cypress dark, #2f6b3f leaf shadow in the cool folds) over a short pale sun-bleached trunk (#c8b49a). Soft-shaded rounded masses, NOT needle photoreal, NOT a pine, NOT a Christmas tree. The trunk sits on the bottom edge of the frame. No second tree, no rocks, no grass, no sky.

Isolated on a perfectly flat even studio backdrop painted #aea49a warm beige, no floor, no horizon, no cast shadows on the backdrop, no HUD, no text, no watermark.

Look: stylized-cartoon vegetation, soft-shaded flame canopy, clean flat colors, dark cypress green, pale bark. Cool blue shadows, never black. Original design only — no logos, no brand marks, no text.
```

Kabul: tek servi · alev silüeti 3/4 hacimli · gövde alt kenarda.

## Mesh (ASSET-065 / ASSET-067)

Kaynak still kilitlendikten sonra, G1 ayrı (ağaç, kaya diliminden sonra):

```bash
npm run gen:mesh -- --image art-source/work/flora_olive_02_alpha_keyed.png \
  -o art-source/raw/flora_olive_02_mesh.glb --polycount 4000

npm run gen:mesh -- --image art-source/work/flora_cypress_02_alpha_keyed.png \
  -o art-source/raw/flora_cypress_02_mesh.glb --polycount 4000
```

Dokusuz. Koruluk instancing ancak §8 + 400 KB tavanı. Tint: zeytin `PALETTE.olive` (`#6b7f4a`), servi `PALETTE.cypress` (`#3d5240`).
