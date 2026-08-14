# Şablon — Odysseus turnaround (`reference`) **[K]**

> **Sınıf:** `reference` — makaledeki *"character turnarounds"*.
> **Çıktı:** still, 16:9, tek kadrajda 4 açı · **Hedef:** `art-source/ref/` · **Registry:** ASSET-001
> **Oyuna dosya olarak girmez.** Kodun ve tüm sonraki prompt'ların nişan aldığı hedeftir; animasyon hattının (§5) girdisidir.
> Ortak bloklar: `_anatomy.md`.

## Neden ilk bu üretilir

**[K]** Toolkit *"train a consistent character across shots"* yapabiliyor — karakter bir kez sabitlenir, sonraki tüm planlar ona bağlanır. Turnaround olmadan her klip başka bir adam çıkarır.
**[A]** Ayrıca animasyon hattının girdisi budur: still → AI video → frame extraction → quantize → elle temizlik → spritesheet (`pipeline.md` §5). Yani bu dosya yanlışsa üç spritesheet de yanlış çıkar.

**Sıra: turnaround → lotus aşama sayfası → key art → geri kalanı.**

## Prompt

```text
Using Higgsfield, generate this as an image — 16:9, high quality, character design turnaround sheet. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

Four views of the SAME character in one frame, evenly spaced left to right on a flat neutral warm-grey background: front view, three-quarter view, side profile, back view. Identical proportions, identical costume details, identical scale across all four. Flat even studio lighting so the design reads clearly — this is a reference sheet, not a scene.

Character (fully original design, no resemblance to any existing game or film character): Odysseus — a lean weathered Bronze Age captain, a simple stylized figure with a small head and a readable shoulder line, sun-worn off-white linen tunic with a faded ochre band, a leather belt and sandals, short dark beard, weathered forearms, and a plain cloth satchel at his hip. In the front and three-quarter views a white-and-pink lotus blossom shows at the mouth of the satchel; in the side and back views the satchel is flat and empty so the body shape reads clearly. No armour, no weapon, no helmet — he is ashore, not at war. Readable silhouette at thumbnail size.

No background scenery, no HUD, no text, no labels, no arrows, no grid, no watermark.

Look: stylized-cartoon game character design, soft-shaded rounded forms, clean flat colors, crisp silhouette, palette of off-white linen / faded ochre / leather brown / sun-tanned skin, with white-and-pink lotus and a golden flower center as the only bright accents. Original character only — no logos, no brand marks, no real game titles, no text.
```

## Varyasyon

4 üretim. Seçilen tek dosya `char_odysseus_turnaround_01_ref_2048.png` olarak kilitlenir; sonraki her prompt'ta karakter bloğu bu dosyaya bakılarak yazılır. `assets.csv` satırı zorunlu.

## Türev — Lotophagos figürü (ASSET-034, MVP sonrası)

Aynı iskelet, karakter bloğu değişir. Adada `LOTOPHAGOS_COUNT` (3) sessiz figür durur; oyuncu yaklaşınca **elini uzatır ve açık bir lotus tutar** (`docs/design/gdd-lotus-collection.md` §3.4). Düşman değildir, pazarlık etmez.

```text
Character (fully original design, no resemblance to any existing game or film character): a silent islander of the Lotus-Eaters — a calm still figure in a simple pale draped robe, barefoot, face serene and unfocused, one arm extended forward offering a single fully open white-and-pink lotus blossom on an open palm. Utterly non-threatening: relaxed shoulders, no weapon, no aggression, no menace in the pose or the silhouette. Views: front with the arm extended, three-quarter with the arm extended, side profile with the arm lowered, back view.
```

Kabul ek maddesi: silüet **ikram** okunuyor, tehdit okunmuyor.

## Kabul kriteri **[P]**

- [ ] Dört açıdaki figür **aynı** karakter — oran, kıyafet, sakal, sandalet aynı
- [ ] Silüet 128 px'e indirildiğinde tanınıyor (art bible §5)
- [ ] Sahne ışığı yok, düz referans aydınlatması var
- [ ] Yazı / etiket / ok yok
- [ ] Mevcut hiçbir oyun veya film karakterine benzemiyor **[K]**
- [ ] `assets.csv` satırı yazıldı: prompt + model + seed **[A]**
