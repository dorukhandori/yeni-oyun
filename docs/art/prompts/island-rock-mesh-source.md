# Ada kayası — image-to-3D kaynak still (LOT-28 dilim 1)

> Anatomi: `_anatomy.md`. Palet: `art-bible.md` §2 kara (tebeşir `#e6e2d4`, gölge `#b9b6ab`).
> Mesh: `pipeline.md` §5.1. Kart: LOT-28. ID: **ASSET-062** (still) → **ASSET-063** (GLB).
> ASSET-057 düz karşıdan billboard'du ve sahneye girmedi. Bu şablon **3/4 hacim** ister.

Kaynak still kâğıt billboard değildir. Image-to-3D silüet + yumuşak hacim okur.

## Kaynak kuralları

- Tek nesne, stüdyo `#aea49a`, zemin/ufuk/HUD yok.
- **3/4 görüş**, hafif yukarı — düz karşıdan yasak.
- `NOT photoreal`. Gölge serin mavi, siyah değil. Oyuk `#b9b6ab`, asla koyu gri.
- Gömülü ışık yalnız form içindir; oyuna doku olarak girmez (`texture: false`).
- Alt kenar düz (yere oturur). İkinci kaya, ot, ağaç yok.

## ASSET-062 — tebeşir kaya (3/4)

`<ASPECT>` = `1:1` · raw: `art-source/raw/rock_chalk_boulder_02_ref_1024.png`

```text
Using Gemini, generate this as an image — 1:1, high quality, game-ready concept for image-to-3D.
Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

A SINGLE chalk-white Aegean boulder seen from a three-quarter angle, slightly above, as a complete sculptural object filling most of the frame. Soft rounded weathered mass, not a jagged cliff, not a cairn, not a stack. Pale chalk body (#e6e2d4) with cooler crease shadow (#b9b6ab) in the folds only — the rock is bright, no dark pits, no black cracks. A few sun-bleached edges, no moss, no lichen, no grass, no shells. The base sits on the bottom edge of the frame so it plants on ground. No second rock.

Isolated on a perfectly flat even studio backdrop painted #aea49a warm beige, no floor, no horizon, no cast shadows on the backdrop, no HUD, no text, no watermark.

Look: stylized-cartoon island rock, soft-shaded rounded volume, clean flat colors, chalk white and warm grey. Cool blue shadows, never black. Original design only — no logos, no brand marks, no text.
```

Kabul: tek kaya · 3/4 hacim okunuyor · alt kenar düz · koyu oyuk yok · alpha-key sonrası Tripo PNG.

## Mesh (ASSET-063)

G1 açıkken:

```bash
npm run gen:mesh -- --image art-source/work/rock_chalk_boulder_02_alpha_keyed.png \
  -o art-source/raw/rock_chalk_boulder_02_mesh.glb --polycount 2000
```

Dokusuz. Ship adı: `rock_chalk_boulder_02_mesh_2000.glb`. Tint: `PALETTE.rock`.
