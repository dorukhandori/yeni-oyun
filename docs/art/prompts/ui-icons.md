# Şablon — HUD ikonları **[P]**

> **Kaynak durumu:** Makale HUD'ın **ne olduğunu** tanımlar (köşe köşe yerleşim, bağlam tuş ipuçları) ama HUD ikonlarını Higgsfield ile üretmekten söz etmez. Yerleşim **[K]**, ikon üretimi **[P]**.
> **Çıktı:** still 1:1, set halinde · **Hedef:** `public/assets/ui/` · **Registry:** ASSET-027 … ASSET-029
> **Tasarım otoritesi:** `docs/design/gdd-memory-system.md` §10 ve `gdd-lotus-collection.md` §3.3. Görsel dil: `art-bible.md` §7.

## ⚠ Unutuşun göstergesi YOK

`gdd-memory-system.md` §10, harfiyen: *"Unutuşun kendi göstergesi yoktur. Sayı, bar, yüzde gösterilmez. Ölçek **ekranın kendisidir**."*

Yani **unutma barı / çerçevesi / dolgusu üretilmez.** Unutuş süt beyazı vinyet + doygunluk kaybı + HUD'ın çekilmesiyle anlatılır ve tamamı **post-process katmanıdır** — asset değil, kod. Bir ikon dosyası olarak üretmek sütun P2'yi çürütür.

**Bunun yerine HUD'ın işi, unutuş arttıkça sırayla kaybolmaktır:**

| Eşik | HUD durumu (`gdd-memory-system.md` §10) |
|---|---|
| Açık (0–24) | Çanta, teslim sayacı, güneş yayı, pusula — hepsi görünür |
| Sis (25+) | Hepsi görünür; **pusula titrer** (±3°) |
| Kayış (50+) | **Pusula gider.** Teslim sayacı rakam yerine muğlak ifade gösterir ("birkaç", "yarısına yakın") |
| Unutuş (75+) | **HUD tamamen gider**, etkileşim ipuçları dahil |
| Kalış (100) | Yok |

Geçişler `HUD_FADE_TIME` süresinde solarak olur — ani kesme "bug" gibi okunur. **Tasarım sonucu:** her HUD öğesi tek başına solabilecek biçimde **ayrı dosya** olmalı.

## Set içeriği

Dört öğe: **çanta** (`HUD_CARRY`, 4 yuva), **teslim sayacı** (`HUD_DELIVERED`, 12 hedef), **güneş yayı** (gün göstergesi), **pusula oku** (gemi yönü).

## Prompt

```text
Using Higgsfield, generate this as an image — 1:1, high quality, game UI icon sheet. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

A set of game HUD elements arranged in a clean grid on a plain flat neutral background, each element fully separated with clear space around it, identical rendering style and identical light direction across the whole set:
1. a small cloth satchel icon with FOUR empty slots along its mouth, seen straight on.
2. a single white-and-pink open lotus blossom icon, small and simple, for marking a filled slot.
3. a slim shallow ARC that reads as the path of the sun across the sky, with a small round sun bead sitting on it.
4. a simple compass arrow — a clean tapered pointer, no compass rose, no cardinal letters.
5. a small ship silhouette marker in cool pale wood tones, cooler than everything else in the set.
6. a small rounded rectangular plate in sun-bleached pale wood with a thin gold rim, EMPTY, to hold a short action label.

Style across the whole set: thin gold line-work on sun-bleached pale wood, slightly volumetric cartoon UI with a soft outer drop shadow and a thin warm highlight along the upper edge. Slightly more saturated than a bright sunlit game world so they stay readable. Stylized antique Greek feeling — NOT a museum-accurate archaeological reconstruction, NOT photoreal wood or metal.

No progress bars, no meters, no health bars, no percentage rings, no minimap, no text, no numbers, no letters, no watermark.

Look: stylized game UI, soft-shaded volumetric forms, thin gold line-work on sun-bleached pale wood, clean edges, palette of gold / off-white / pale wood / white-and-pink lotus. Cool blue shadows. Original icon designs only — no logos, no brand marks, no text.
```

## İşleme **[P]**

Sayfa gelir → öğeler tek tek kesilir, alpha temizlenir → `public/assets/ui/`. Her öğe ayrı dosya, çünkü ayrı ayrı solacaklar:

```
ui_satchel_01_albedo_256.png
ui_lotus_slot_01_albedo_128.png
ui_sun_arc_01_albedo_256.png
ui_compass_01_albedo_128.png
ui_ship_marker_01_albedo_128.png
ui_prompt_frame_01_albedo_256.png
```

## Açık sorular **[?]**

- **Bağlam etiketleri:** oyun içi metinler Türkçe (`game-concept.md` açık soru 5) → "TOPLA / TESLİM ET". Şablon **boş çerçeve** üretir, metin kodda basılır; dil kararı sonraya kalabilir.
- **Güneş yayı** ayrı bir HUD öğesi mi, yoksa gökyüzündeki güneşin kendisi mi yeterli? `game-concept.md` §9.1 "güneşin yüksekliği HUD'a bakmadan okunan asıl saat" diyor — yay yedek gösterge olabilir, gereksiz de olabilir.
- **Pusula titremesi** (eşik 1) kodla mı yapılır, ikonun ikinci varyantı mı gerekir? Varsayım: kodla.

## Kabul kriteri **[P]**

- [ ] **Bar / metre / yüzde / can göstergesi YOK** — `gdd-memory-system.md` §10
- [ ] Minimap yok
- [ ] Set içi stil ve ışık yönü **tek**
- [ ] Her öğe ayrı ayrı kesilebilir ve ayrı ayrı solabilir
- [ ] Çanta yuva sayısı **4** (`CARRY_CAPACITY`)
- [ ] Pusula oku tek başına yön okuyor (gül/harf yok)
- [ ] Gemi işareti setin en serin öğesi (art bible §1)
- [ ] 128 px'e indirildiğinde her öğe tanınıyor
- [ ] Şeffaflık temiz, halo yok
- [ ] Yazı / sayı yok **[K]**
- [ ] Dosya ≤ 30 KB, isim kuralına uygun
- [ ] `assets.csv` satırı yazıldı **[A]**
