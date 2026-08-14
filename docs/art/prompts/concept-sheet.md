# Şablon — Concept sheet: lotus aşamaları & gemi (`reference`) **[K]**

> **Sınıf:** `reference` — makaledeki *"concept art"*.
> **Çıktı:** still, 16:9 · **Hedef:** `art-source/ref/` · **Registry:** ASSET-002 (lotus), ASSET-021 (gemi)
> Oyunun **çekirdek okuma problemi** burada çözülür: oyuncu olgun lotusu silüetten ayırt edebilmeli.
> Ortak bloklar: `_anatomy.md`. Palet: `art-bible.md` §2.

---

## A) Lotus — 4 olgunluk aşaması (ASSET-002)

```text
Using Higgsfield, generate this as an image — 16:9, high quality, game asset concept sheet. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

Four growth stages of the SAME lotus blossom in one frame, evenly spaced left to right, each sitting on a broad green lily pad in ankle-deep turquoise water, identical camera angle and identical scale reference across all four. Flat even lighting on a plain neutral background — this is a reference sheet, not a scene.

Stage 1 — BUD: tightly closed, a narrow upright spear, pale green-cream, desaturated. Nothing pink is visible.
Stage 2 — HALF-OPEN: petals part and the pink interior becomes visible for the first time, silhouette widening into a cup.
Stage 3 — RIPE: fully open, the widest silhouette of the four, petals fanned flat and wide in the most saturated and brightest white-and-pink of the whole set — it looks faintly lit from within, as if carrying a little light. This is the one stage that says "pick me", and it says it with COLOR and SILHOUETTE, not with an icon or a marker.
Stage 4 — WITHERED: petals sag and droop down past the lily pad, silhouette collapsed, saturation gone, color fallen toward dull BROWN.

Each stage must be readable by silhouette ALONE, with color removed: stage 1 narrow and upright, stage 2 a cup, stage 3 wide open and flat, stage 4 collapsed and drooping downward.

No HUD, no text, no numbers, no labels, no arrows, no watermark.

Look: stylized-cartoon game asset, soft-shaded rounded forms, clean flat colors, white and pink petals, broad green lily pad, turquoise water. The ripe stage is the most saturated white-pink on the sheet; the withered stage is the least saturated and browner. Cool blue shadows, never black. Original plant design only — no logos, no brand marks, no text.
```

**Türev:** onaylanan sayfadan aşamalar tek tek kesilip `lotus_bud_01`, `lotus_bloom_02/03`, `lotus_wither_04` olarak `public/assets/` altına alınabilir — ama bu `scene-texture` uzantısıdır, sahip onayı ister **[?]** (`pipeline.md` §2).

### Kabul kriteri **[P]**

- [ ] Dört aşama **aynı** çiçek — yaprak formu ve oran tutarlı
- [ ] **Renk kapatıldığında** aşama sırası hâlâ okunuyor (art bible §2 renk körlüğü maddesi)
- [ ] Olgunluk **renk + silüet** ile okunuyor, ikon/işaretleyici ile değil (`docs/design/game-concept.md` §9.4)
- [ ] 3. aşama sayfadaki en doygun ve en geniş çiçek; içten hafif ışık hissi var
- [ ] 4. aşama doygunluğunu kaybetmiş ve **kahverengiye** düşmüş (grimsi krem değil)
- [ ] 4. aşama silüeti aşağı düşüyor (yön farkı belirgin)
- [ ] Sayı / etiket / sahne ışığı yok
- [ ] `assets.csv` satırı yazıldı **[A]**

---

## B) Gemi — teslim noktası (ASSET-021)

```text
Using Higgsfield, generate this as an image — 16:9, high quality, game asset concept sheet. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

Three views of the SAME ancient wooden ship in one frame: three-quarter bow view, full side profile, and stern view. Identical proportions and scale across all three. A long low single-masted wooden vessel with a furled linen sail, a row of oar ports, coiled rope on the deck, and a shallow hull built to be beached. Flat even lighting on a plain neutral background — reference sheet, not a scene.

The wood is SUN-BLEACHED and cool-toned, noticeably cooler and less saturated than the warm golden island around it — this ship is the one calm, cool anchor in the world.

No crew, no water, no HUD, no text, no labels, no measurements, no watermark.

Look: stylized-cartoon game asset, soft-shaded rounded forms, clean flat colors, sun-bleached pale wood, off-white linen sail, ochre rope. Cool blue shadows. Stylized antique — NOT a museum-accurate archaeological reconstruction, NOT photoreal wood texture. Original ship design only — no logos, no brand marks, no text.
```

### Kabul kriteri **[P]**

- [ ] Üç görünüşteki gemi **aynı** gemi
- [ ] Ahşap tonu adadan **belirgin şekilde daha serin** (art bible §1 "tek soğuk çapa")
- [ ] Uzun düz kütle okunuyor — adanın organik formlarından ayrışıyor
- [ ] Müze/arkeolojik doğruluk peşinde değil, stilize
- [ ] Yazı / ölçü / tayfa yok
- [ ] `assets.csv` satırı yazıldı **[A]**
