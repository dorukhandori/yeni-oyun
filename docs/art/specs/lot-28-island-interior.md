# LOT-28 — Ada içi görsel cila · Blender kiti

> **Kart:** Paca LOT-28 · `Lotus │ Island interior │ Flora/rock/sea visual polish pass`
> **Tarih:** 2026-08-17 · **Yazan:** `@iris` · Game Art Director
> **Sahip kararı:** çim, taş, sazlık ve adada her yerde kullanılan tekrarlı prop'lar **Blender'da** tasarlanır (Tripo 3/4 still yolu iptal).
> **Otorite:** `art-bible.md` §2/§5/§6/§8 · `pipeline.md` §2.1 (yakın ağaç hacim) · `asset-pipeline-loop-plan.md` §2 (basit hacim = Blender MCP/CLI)
> **Üretici:** `scripts/blender/build_island_kit.py` · seed `20260817` · `npm run gen:island-kit`

## Kit (ASSET-068–073)

| ID | Dosya | Nerede |
|---|---|---|
| 068 | `rock_chalk_boulder_01_mesh_800.glb` | kıyı + iç ada kayası |
| 069 | `rock_chalk_pebble_01_mesh_400.glb` | göl kenarı çakıl |
| 070 | `flora_grasstuft_01_mesh_600.glb` | ada çim zemini (bilek hizası 3D carpet) |
| 071 | `flora_reed_01_mesh_900.glb` | göl rim + lotus cebi sazlık |
| 072 | `flora_olive_01_mesh_2000.glb` | zeytin koruluk |
| 073 | `flora_cypress_01_mesh_1800.glb` | servi koruluk |

Vertex colour = yerel albedo (`#e6e2d4` / `#6b7f4a` / `#3d5240` …). Doku ışık taşımaz. Origin yerde. 1 birim ≈ 1 m.

Sahneye bağlama: `src/world/islandKit.ts` + `terrain.ts`. Kit yüklenene kadar eski kod/billboard fallback görünür, sonra gizlenir. Collider yarıçapları aynı pose'lardan — silüet değişince ±%15 kuralı playtest'te bakılır.

**Ot tutamı (070) playtest:** bıçaklar beyaz kaldı — GLB vertex colour sahneye bağlanmıyordu + Standard specular güneşte tebeşir. Şimdi `PALETTE.grassDeep` Lambert, vertex colour kapalı.

## Bilinçli dışarıda

- **Deniz / göl** — LOT-48: kamera-hizalı Gerstner ızgara (`src/world/sea.ts` + `oceanWaves.ts`). İç göl hâlâ durgun Blender disk. Blender dalga kiremiti playtest'te reddedildi.
- **Nilüfer yaprağı** — ASSET-009 texture duruyor; 3D pad ayrı dilim.
- **Kuzey spike kayalık** — landmark, kit değil.
- **Doryseus / Thallope** — başka aile.

## Yeniden üretim

```bash
npm run gen:island-kit
```

Blender 5.2 CLI. Cursor'da Blender MCP yok; headless script yeterli ve tekrarlanabilir.
