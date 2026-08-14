# Şablon — Key art / marketing still (`media`) **[K]**

> **Sınıf:** `media` — makaledeki *"key art, character art, concept art, and marketing sets - the whole visual identity of a title"*.
> **Çıktı:** still 16:9 (kapak) ve 4:5 (sosyal) · **Hedef:** `art-source/media/` · **Registry:** ASSET-003
> Key art aynı zamanda **palet doğrulama aracıdır**: `art-bible.md` §2 hex'leri gerçekte tutuyor mu buradan anlaşılır.
> Ortak bloklar: `_anatomy.md`.

## Prompt

```text
Using Higgsfield, generate this as an image — 16:9, high quality, poster-grade key art. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

Hero composition, three-quarter rear view of Odysseus standing ankle-deep in turquoise shallows among clusters of lotus plants, looking back over his shoulder toward the beached ship on the golden sand. The figure is small in frame; the island and the wide late-afternoon sky are vast around him. The ship sits clearly readable in the middle distance — the one cool, calm shape in a warm world.

Character (fully original design, no resemblance to any existing game or film character): Odysseus — a lean weathered Bronze Age captain, a simple stylized figure with a small head and readable shoulder line, sun-worn off-white linen tunic with a faded ochre band, leather belt and sandals, short dark beard, a plain cloth satchel at his hip with white-and-pink lotus blossoms showing at its mouth. No armour, no weapon, no helmet.

Setting: the shore of the Lotus-Eaters' island at golden hour — ankle-deep turquoise shallows dotted with white-and-pink lotus blossoms on broad green lily pads, reed beds at the water's edge, a strip of golden sand, a long sun-bleached wooden ship beached at the shoreline with its sail furled. Olive trees and dark cypresses behind, hazy blue-grey hills on the horizon, low warm sun near the horizon.

A faint milk-white haze is just beginning to gather in the far distance — beautiful, inviting, and slightly wrong.

No HUD, no interface, no text of any kind.

Look: sun-drenched Aegean island at golden hour — turquoise shallows shading into lapis blue, white foam lines, golden sand, white-and-pink lotus blossoms that look faintly lit from within, broad green lily pads, sun-bleached wood, distant hazy blue-grey hills, olive and cypress silhouettes. High sky light plus a warm low sun, COOL BLUE shadows (never black), turquoise bounce light coming up off the water. Soft bloom, warm color grade, light blue-white haze in the distance, soft-shaded stylized surfaces with low surface noise. Original characters and world only — no logos, no brand marks, no real game titles, no text.
```

## Varyasyon

4 üretim, en iyisi seçilir. Marketing seti (ASSET-030 sonrası) için ayrıca: (a) lotus tarlası yakın plan, (b) gemi güvertesinden kıyıya bakış, (c) pusun yükseldiği geç aşama.

## Kabul kriteri **[P]**

- [ ] **Yazı yok** — key art'ta HUD bile olmaz
- [ ] Ölçek hissi var: figür küçük, ada ve gökyüzü geniş
- [ ] **Gemi kadrajda okunuyor ve adadan daha serin** (art bible §1)
- [ ] Gölgeler mavi, siyah değil
- [ ] Pus var ama sahneyi henüz yutmamış — "davet" tonu korunmuş (art bible §4)
- [ ] Örneklenen hex'ler `art-bible.md` §2 ile uyuşuyor (pipet kontrolü)
- [ ] Generic AI look yok: merkezi simetri, anlamsız parıltı serpme, her yerde eşit detay **[P]**
- [ ] Fotogerçekçi değil, marka izi yok **[K]**
- [ ] `assets.csv` satırı yazıldı **[A]**
