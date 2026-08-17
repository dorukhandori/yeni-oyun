# LOT-50 — Güneş tanrısı baş silüeti

> **Kart:** Paca LOT-50 · `Lotus │ Lighting │ Sun-god head silhouette`
> **Tarih:** 2026-08-17 · **Yazan:** `@iris` · Game Art Director
> **Sahip kararı:** seçenek 1 — yalnız baş + ışın yelesi. Tasarımsal (vazo/pediment), Pixar değil. Blender hattı; Tripo yalnızca tasarlanmış ön-yüz still yetmezse.
> **Otorite:** `art-bible.md` §2 hale `#ffcf80` / yön `#ffcf94` · `game-concept.md` §9.1 (güneş = saat)

## Ne

Gökyüzündeki disk bir **Helios başı** olur: yuvarlak yüz (saat durur) + **12 ışın** (günün saatleri). Hale mevcut additive plane (`sunDisk.ts`) — mesh bloom kaynağı değil, silüet.

## Tasarım dili

- Siyah-figür / alınlık kesiti: net kenar, simetri, ritmik ışın (uzun-kısa-uzun).
- Yüz: tek kaş kemeri, badem göz çukuru, kama burun, kısa ağız yayı. Gövde yok, boyun yok, saç yok.
- 80 m’den **ışınlı bir daire** okunur; yüz detayı yakın bakışta.

## Üretim

| | |
|---|---|
| Script | `scripts/blender/build_sun_god.py` · seed `20260817` |
| Komut | `npm run gen:sun-god` |
| GLB | `public/assets/models/sky_sungod_01_mesh_1200.glb` (ASSET-074) |
| Still (Tripo kapısı) | `art-source/ref/sky_sungod_01_ref_1024.png` — Workbench, düz ışık, vertex colour. Oyuna girmez. |
| Sahne | `src/render/sunDisk.ts` — GLB yoksa eski düz disk fallback |

**Tripo:** varsayılan kapalı. Organik blob, tasarımsal silüeti bozar. Sahip “yüz daha hacimli” derse still → `node scripts/gen-mesh.mjs --image art-source/ref/sky_sungod_01_ref_1024.png --polycount 1200` ve sonuç spec’e karşı okunur; Blender kanon kalır.

## Yasak

- Ada kiti script’ine (`build_island_kit.py`) ekleme — LOT-28 ayrı aile.
- Güneş gözlüğü, gövde, el, lens flare ormanı.
- Albedo’ya ışık boyamak. Vertex colour = yerel renk; gökyüzü malzemesi unlit.

## Kabul

- Plajdan ışınlı baş; yuvarlak disk kaybolmaz.
- Çim / zemin tebeşirlenmez (unlit + mevcut luma/bloom eşiği).
- Batışta renk kayar, silüet durur.
