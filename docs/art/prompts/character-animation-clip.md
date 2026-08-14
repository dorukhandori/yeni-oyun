# Şablon — Animasyon klibi (still → video → spritesheet) **[A]**

> ## Bu şablon makalede yok — araştırmada doğrulanmış saha pratiğidir
>
> Kaynak: `docs/research/ai-pipeline-games.md` §4.2 — *To the Abyss, We Dive!* dört yaratığı **still → AI video → frame extraction → palette quantize → elle temizlik → spritesheet** hattıyla animasyonlamış. Higgsfield mesh vermediği için hareketli karakter böyle çıkarılır.

> **Sınıf:** `spritesheet` · **Çıktı:** video (ara ürün) → spritesheet (final)
> **Hedef:** klip `art-source/raw/` → kareler `art-source/frames/` → final `public/assets/spritesheets/`
> **Registry:** ASSET-008 (lotus açma), ASSET-024/025/026 (Doryseus döngüleri)
> **Girdi:** onaylı turnaround still — bugün için kabul edilmiş `char_odysseus_turnaround_01_ref_1344.png` (ASSET-001, isim değişikliğinden önce üretildi, hâlâ geçerli); yeni bir turnaround üretilirse `char_doryseus_turnaround_01_ref_2048.png` adını alır. Bu dosya yoksa üretim başlamaz.
> **Tasarım notu:** toplama animasyonu `HARVEST_HOLD` (1,2 s) süresini karşılamalı — oyuncunun tek savunmasız anı (`docs/design/gdd-lotus-collection.md` §2).
> Ortak bloklar: `_anatomy.md`. Hat adımları: `pipeline.md` §5.

## Altı adım **[A]**

| # | Adım | Nerede |
|---|---|---|
| 1 | Onaylı still (turnaround / concept) | `art-source/ref/` |
| 2 | AI video — kısa **döngü** klibi (bu şablon) | `art-source/raw/` |
| 3 | Frame extraction | `art-source/frames/` |
| 4 | Palette quantize (art bible §2 paleti) | `art-source/work/` |
| 5 | **Elle temizlik — zorunlu** | `art-source/work/` |
| 6 | Spritesheet | `public/assets/spritesheets/` |

**[A]** Adım 3–6 tek komuta indirilir (referans projede `pixelize.gd`, bizde `scripts/` altında bir Node script'i) — henüz yazılmadı **[?]**.

---

## Prompt A — Doryseus yürüme döngüsü (ASSET-024)

```text
Using Higgsfield, generate this as a video — 1:1, ~3 seconds, high quality, SEAMLESS LOOP where the last frame matches the first. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

Full-body side profile view, locked-off camera, character walking in place at the center of frame. The camera does NOT move, does NOT zoom, and does NOT orbit. The character does not travel across frame — it walks on the spot so the cycle loops cleanly.

Character (fully original design, no resemblance to any existing game or film character): Doryseus — a lean weathered Bronze Age captain, a simple stylized figure with a small head and readable shoulder line, sun-worn off-white linen tunic with a faded ochre band, leather belt and sandals, short dark beard, a plain cloth satchel at his hip. No armour, no weapon. Calm, deliberate walk with a small natural bounce.

Plain flat neutral background, single flat color, no scenery, no shadow on the ground, no HUD, no text, no watermark. Flat even lighting with no moving highlights.

Look: stylized-cartoon game character, soft-shaded rounded forms, clean flat colors, palette of off-white linen / faded ochre / leather brown / sun-tanned skin. Consistent silhouette in every frame. Original character only — no logos, no brand marks, no real game titles, no text.
```

## Prompt B — Toplama hareketi (ASSET-025)

Aynı iskelet; hareket bloğu değişir:

```text
Motion: Doryseus bends down at the waist, closes his hand around a lotus blossom at ground level, holds for a beat, plucks it, and straightens back up to the starting pose — a single complete action that returns exactly to the first frame.
```

## Prompt C — Teslim hareketi (ASSET-026)

```text
Motion: Doryseus lifts the lotus blossoms out of the satchel at his hip, extends both arms forward to set them down at waist height, then lowers his arms back to the starting pose — a single complete action that returns exactly to the first frame.
```

## Prompt D — Lotus açma (ASSET-008)

```text
Using Higgsfield, generate this as a video — 1:1, ~2 seconds, high quality, ONE-SHOT transition (does not loop). Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

Locked-off macro view of a single lotus blossom on a broad green lily pad, centered in frame. The camera does not move.

Motion: the blossom opens from a half-open cup into a fully open flower — petals fan outward and flat, and the white-and-pink color saturates and brightens until it looks faintly lit from within. Nothing else in frame moves.

Plain flat neutral background, no scenery, no water motion, no HUD, no text, no watermark. Flat even lighting.

Look: stylized-cartoon game asset, soft-shaded rounded forms, clean flat colors, white and pink petals, broad green lily pad. Cool blue shadows, never black. Original plant design only — no logos, no brand marks, no text.
```

---

## Varyasyon

Döngü başına 3 üretim. Kriter tek: **başı-sonu birleşen** klip. Birleşmeyen klip atılır, düzeltilmeye çalışılmaz.

## Kabul kriteri **[P] / [A]**

- [ ] **Döngü başı-sonu birleşiyor** (tek yönlü hareketlerde başlangıç pozuna dönüyor) **[A]**
- [ ] Kamera sabit — kayma / zoom / orbit yok
- [ ] Karakter yerinde hareket ediyor, kadraj boyunca ilerlemiyor
- [ ] Her karede silüet tutarlı; kıyafet ve oran kaymamış
- [ ] Arka plan düz tek renk — maskeleme yapılabilir
- [ ] Quantize sonrası palet `art-bible.md` §2'de
- [ ] **Elle temizlikten geçti** **[A]**
- [ ] Spritesheet kare oranı sabit, `NearestFilter` ile bulanıklaşmıyor
- [ ] Dosya ≤ 500 KB, isim kuralına uygun (`ör. char_doryseus_walk_01_sheet_1024.png`)
- [ ] `assets.csv` satırı yazıldı: prompt + model + seed **[A]**
