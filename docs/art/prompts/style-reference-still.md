# Şablon — Sahne stil referansı / doku kaynağı **[P]**

> ## ⚠ Bu şablonun tamamı proje uzantısıdır — kaynak makalede yoktur
>
> Makale oynanır build için şunu söyler: *"From 'idea' to 'a link people can play' **without a single hand-modeled asset**"* — oyun içi görsel **kodla** üretilir, Higgsfield medya üretir. Still'i oyuna texture olarak sokmak **bizim eklememizdir** ve sahip onayı bekliyor **[?]** (`pipeline.md` §2).
>
> **[A]** Araştırma da bu yönde uyarıyor: üretilmiş asset'e hero rolü verilmiyor; çalışan yol "concept image → sonra üretim".
>
> **Onay gelmezse:** bu şablonla üretilen her şey `reference` sınıfındadır — `art-source/ref/` altında kalır, `public/assets/` altına **girmez**.

> **Registry:** ASSET-004 … ASSET-020 · Ortak bloklar: `_anatomy.md` · Palet: `art-bible.md` §2

## Ortak açılış

Her alt konu şu açılışı kullanır, `<SUBJECT>` ve `<ASPECT>` doldurulur:

```text
Using Higgsfield, generate this as an image — <ASPECT>, high quality, game texture reference. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

<SUBJECT>

Flat even lighting with no cast shadows and no light or haze baked into the surface — lighting comes from the engine, not the texture. No character, no HUD, no text, no watermark, no border.

Look: stylized-cartoon game surface, soft-shaded, clean flat colors, low surface noise, palette limited to turquoise and lapis water / golden and wet sand / white foam / white-and-pink lotus that looks faintly lit from within / green lily pad / olive green / sun-bleached pale wood. Cool blue shadows, never black. Original design only — no logos, no brand marks, no text.
```

**Neden "flat even lighting" [P]:** art bible §8 — doku ışığı taşımaz. Ayrıca **unutma pusu texture'a boyanmaz** (§4); haze çalışma zamanı katmanıdır.

---

## Lotus ve bitki örtüsü

### ASSET-004…007 — Lotus 4 aşaması

`<ASPECT>` = `1:1` · Dosyalar: `lotus_bud_01_albedo_256.png`, `lotus_bloom_02_albedo_512.png`, `lotus_bloom_03_albedo_512.png`, `lotus_wither_04_albedo_512.png` (+ `_alpha_`)

```text
<SUBJECT>:
A single stylized lotus blossom seen straight on as a flat billboard, isolated on a plain flat background with a clean cut-out edge suitable for alpha masking. <STAGE>
```

`<STAGE>` değerleri:

- **04 / bud:** `Tightly closed bud, a narrow upright spear, pale green-cream and desaturated, nothing pink visible.`
- **05 / half-open:** `Half-open cup, petals parting so the pink interior shows for the first time, silhouette widening.`
- **06 / ripe:** `Fully open, the widest flattest silhouette, petals fanned wide in the most saturated bright white-and-pink, looking faintly lit from within.`
- **07 / withered:** `Petals sagging and drooping downward, collapsed silhouette, saturation gone, color fallen toward dull brown.`

Kabul: dört dosya **aynı** çiçek · olgunluk **renk + silüet** ile okunuyor (ikon yok) · solmuş kahverengiye düşmüş · alpha kenarı temiz, halo yok · renk kapatılınca aşama sırası okunuyor.

### ASSET-009 — Nilüfer yaprağı

`<ASPECT>` = `1:1` · Dosya: `flora_lilypad_01_albedo_512.png`

```text
<SUBJECT>:
A single broad round green lily pad seen from directly above, isolated on a plain flat background with a clean cut-out edge for alpha masking. Flat wide surface with a small notch at one edge and subtle radial veining, mid-green with a slightly darker rim.
```

Kabul: tepeden bakış (perspektif yok) · geniş düz daire silüeti — "üstüne basılır" hissi · alpha temiz.

### ASSET-010 — Sazlık / kamış

`<ASPECT>` = `1:1` · Dosya: `flora_reed_01_alpha_512.png`

```text
<SUBJECT>:
A dense cluster of tall thin vertical reeds seen straight on as a flat billboard, isolated on a plain flat background with a clean cut-out edge for alpha masking. Slightly varying heights, thin blades, muted olive and warm green, a few dry pale stalks.
```

Kabul: dikey ince form korunmuş · alt kenar düz kesilmiş (zemine oturur) · alpha kenarı ince, halo yok.

---

## Su ve kıyı

### ASSET-012 — Sığ su dalga dokusu

`<ASPECT>` = `1:1` · Dosya: `water_shallow_01_normal_512.png`

```text
<SUBJECT>:
A seamless tileable shallow-water ripple pattern rendered as a NORMAL MAP — soft rounded overlapping ripples with gentle slopes, small and fine near-shore scale, no foam, NO color information, purple-blue normal-map coloring only. Tiles perfectly on all four edges.
```

Kabul: normal map, renk taşımıyor (turkuaz motordan) · dalga ölçeği sığ su için küçük · dikişsiz.

### ASSET-013 — Köpük hattı

`<ASPECT>` = `16:9` · Dosya: `water_foam_01_alpha_512.png`

```text
<SUBJECT>:
A horizontal band of white sea foam as it breaks on a shallow shoreline, isolated on a plain flat background with a clean cut-out edge for alpha masking. Soft irregular lacy foam edge along the top, thinning to scattered bubbles at the bottom. Pure white to warm off-white, no sand, no water color. Tiles horizontally.
```

Kabul: yatay dikişsiz · köpük kenarı düzensiz ve organik (tekrar göze batmıyor) · yalnız beyaz, kum rengi karışmamış.

### ASSET-014 — Sığ su caustic

`<ASPECT>` = `1:1` · Dosya: `water_caustic_01_caustic_512.png`

```text
<SUBJECT>:
A seamless tileable caustic light pattern as seen on a sandy seabed through shallow water — a soft bright web of overlapping light lines on pure black, no sand texture, no color other than the light itself. Designed to be used as an additive overlay. Tiles perfectly on all four edges.
```

Kabul: siyah zemin (additive kullanılabilir) · kum dokusu karışmamış · dikişsiz · ışık ağı yumuşak, keskin değil.

### ASSET-015 / 016 — Altın kum ve ıslak kum

`<ASPECT>` = `1:1` · Dosyalar: `sand_gold_01_albedo_1024.png`, `sand_wet_01_albedo_1024.png`

```text
<SUBJECT>:
A seamless tileable beach sand texture — fine even grain with a few tiny shell fragments and small pebbles, no footprints, no ripple lines that indicate a direction, no single dominant feature. <VARIANT> Tiles perfectly on all four edges.
```

`<VARIANT>`: kuru için `Warm dry golden sand.` · ıslak için `Damp darker sand with a slightly denser, smoother surface — clearly readable as wet by texture and tone, not by a painted shadow.`

Kabul: dikişsiz · **yön bildiren büyük detay yok** · ıslak/kuru ayrımı boyanmış gölgeyle değil dokuyla yapılmış.

### ASSET-017 — Çakıl

`<ASPECT>` = `1:1` · Dosya: `sand_pebble_01_albedo_512.png`

```text
<SUBJECT>:
A seamless tileable texture of small smooth rounded shore pebbles packed together, varied warm grey and pale ochre tones, a few larger stones for scale variety. Tiles perfectly on all four edges.
```

Kabul: dikişsiz · taş boyutları çeşitli ama tek bir "hero" taş yok.

### ASSET-031 — Tebeşir beyazı kayalık

`<ASPECT>` = `1:1` · Dosya: `rock_chalk_01_albedo_1024.png`

```text
<SUBJECT>:
A seamless tileable texture of bright chalk-white sun-baked limestone rock — angular fractured surfaces, thin warm-grey cracks, a few pale ochre mineral stains. BRIGHT overall: no dark areas anywhere, no deep crevices painted in shadow. Tiles perfectly on all four edges.
```

Kabul: dikişsiz · **hiçbir yeri koyu değil** (`game-concept.md` §9.3: ada kuru ve parlak, karanlık yok) · çatlaklar boyanmış gölge değil, ton farkı.

### ASSET-032 — Kavruk yeşil ot

`<ASPECT>` = `1:1` · Dosya: `flora_drygrass_01_albedo_1024.png`

```text
<SUBJECT>:
A seamless tileable texture of dry sun-scorched island grass — short sparse tufts of olive and yellow-green over pale dusty soil, a few bleached straw-colored blades. Dry, not lush. Tiles perfectly on all four edges.
```

Kabul: dikişsiz · yeşil doygun değil, kavruk · yön bildiren büyük detay yok.

### ASSET-033 — İç göl suyu (tatlı su)

`<ASPECT>` = `1:1` · Dosya: `water_lake_01_normal_512.png`

```text
<SUBJECT>:
A seamless tileable STILL freshwater surface rendered as a NORMAL MAP — very shallow slow broad undulations, much calmer and larger in scale than sea ripples, no breaking waves, no foam, NO color information, purple-blue normal-map coloring only. Tiles perfectly on all four edges.
```

Kabul: deniz dalgasından **açıkça daha durgun ve daha büyük ölçekli** · köpük yok · normal map, renk yok. Gerekçe: göl iyileştirmiyor ve bu kural oyuncuya söylenmiyor — farkı **gözle** sezmeli (`docs/design/gdd-memory-system.md` §3.3).

---

## Gemi

### ASSET-018 — Ağarmış gemi tahtası

`<ASPECT>` = `1:1` · Dosya: `ship_plank_01_albedo_1024.png`

```text
<SUBJECT>:
A seamless tileable texture of sun-bleached wooden ship planks laid side by side, straight and repetitive, visible grain, worn edges, a few dark peg holes. PALE and COOL-TONED — noticeably cooler and less saturated than warm golden sand. Tiles perfectly along the plank direction.
```

Kabul: plank yönünde dikişsiz · **kumdan belirgin şekilde daha serin ton** (art bible §1) · düz tekrarlı form korunmuş.

### ASSET-019 — Yelken bezi

`<ASPECT>` = `1:1` · Dosya: `ship_sail_01_albedo_1024.png`

```text
<SUBJECT>:
A seamless tileable texture of coarse woven linen sailcloth — visible weave, off-white to pale cream, light staining and a few mended patches, no rope, no stitching seams that indicate a direction. Tiles perfectly on all four edges.
```

Kabul: dikişsiz · dokuma dokusu okunuyor ama gürültülü değil · yön bildirmiyor.

### ASSET-020 — Halat / ağ

`<ASPECT>` = `1:1` · Dosya: `ship_rope_01_albedo_512.png` (+ `_alpha_`)

```text
<SUBJECT>:
Two elements on one plain flat background with clean cut-out edges for alpha masking: a length of twisted ochre hemp rope running horizontally, and a loose square-mesh fishing net. Warm ochre and pale tan fibers.
```

Kabul: halat sarımı okunuyor · ağ deliklerinde alpha temiz · iki eleman ayrık, üst üste binmiyor.

---

## Genel kabul kriteri **[P]**

Konuya özel maddelerin üstüne, hepsi için:

- [ ] Işık / gölge / **unutma pusu** texture'a gömülmemiş
- [ ] Gölge tonu mavi ailede (siyah/nötr gri yok)
- [ ] Palet `art-bible.md` §2 aralığında
- [ ] İsim kuralı `pipeline.md` §6'ya uygun
- [ ] Boyut bütçede (texture ≤ 300 KB)
- [ ] **`assets.csv` satırı yazıldı: prompt + model + seed** **[A]**
- [ ] **Onay yoksa `public/assets/` altına kopyalanmadı** **[?]**
