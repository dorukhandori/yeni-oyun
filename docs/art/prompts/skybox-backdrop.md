# Şablon — Gökyüzü ve uzak backdrop **[P]**

> **Kaynak durumu:** Makalede skybox/backdrop üretimi yoktur. **Proje uzantısı [P]**, `style-reference-still.md` ile aynı onay kapısına tabidir **[?]**.
> **Çıktı:** still panoramik · **Hedef:** `public/assets/skybox/` (onaylanırsa) veya `art-source/ref/`
> **Registry:** ASSET-022 (gökyüzü), ASSET-023 (tepe backdrop), ASSET-011 (zeytin/servi silueti)
> Ortak bloklar: `_anatomy.md` · Palet: `art-bible.md` §2

## Neden bu sefer gerçek skybox anlamlı

Ada **açık havada**, gökyüzü geniş ve görünür (`art-bible.md` §6). Mağara sahnesinden farkı bu: burada gerçek bir skybox işe yarar, üstüne fog'a gömülü tepe katmanı gelir.

---

## ASSET-022 — Altın saat gökyüzü

`<ASPECT>` = `2:1` panoramik · Dosya: `sky_goldenhour_01_albedo_2048.png`

```text
Using Higgsfield, generate this as an image — 2:1 wide panorama, high quality, game sky dome plate. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

A wide stylized golden-hour sky with no ground and no horizon line objects — clear light blue at the top grading down into a warm golden band near the bottom, a low soft sun glow just above the lower edge, and a few thin stylized wisps of cloud catching warm light. Even, smooth gradients with low noise.

No landscape, no sea, no birds, no lens flare, no sun disc with hard edges, no HUD, no text, no watermark.

Look: stylized-cartoon golden-hour sky — light blue zenith, warm golden horizon band, soft sun glow, clean smooth gradients, gentle bloom around the glow. Original design only — no logos, no brand marks, no text.
```

Kabul: yatay uçlar birleşiyor (dome'a sarılır) · sert güneş diski ve lens flare yok · gradyan bantlaşması (banding) yok.

---

## ASSET-023 — Uzak sisli tepe backdrop

`<ASPECT>` = `2:1` panoramik · Dosya: `hill_backdrop_01_albedo_2048.png`

```text
Using Higgsfield, generate this as an image — 2:1 wide panorama, high quality, game background plate. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

A wide distant background plate of layered Aegean hills — two or three receding ridge lines in hazy blue-grey, softened by light blue-white atmospheric haze, with a few tiny dark cypress silhouettes suggested along the nearest ridge. Everything is distant and LOW CONTRAST.

No foreground objects, no sea, no beach, no buildings, no character, no HUD, no text, no watermark. Detail must fall off toward the haze so this plate never competes with the foreground gameplay layer. The bottom edge is a clean flat cut so the plate can sit behind terrain.

Look: stylized-cartoon distant landscape — hazy blue-grey ridges, light blue-white atmospheric haze, faint dark cypress silhouettes, soft edges, no sharp detail. Cool tones only, no warm accents. Original design only — no logos, no brand marks, no text.
```

Kabul: kontrast düşük, ön planla yarışmıyor · sıcak aksan yok (sıcaklık ön plandan gelir) · alt kenar düz kesim.

---

## ASSET-011 — Zeytin & servi silueti (orta-uzak katman)

`<ASPECT>` = `16:9` · Dosya: `flora_tree_01_alpha_1024.png`

```text
Using Higgsfield, generate this as an image — 16:9, high quality, game billboard reference. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

Three separate trees side by side on a plain flat background with clean cut-out edges for alpha masking, each fully isolated with clear space around it: a gnarled olive tree with a twisted pale trunk and soft silver-green canopy, a tall narrow dark cypress, and a second smaller olive tree at a different angle. Seen straight on as flat billboards.

Flat even lighting, no cast shadows, no ground, no HUD, no text, no watermark.

Look: stylized-cartoon vegetation, soft-shaded rounded canopy masses, clean flat colors, olive green and silver-green foliage, dark cypress green, pale twisted bark. Cool blue shadows, never black. Original designs only — no logos, no brand marks, no text.
```

Kabul: üç ağaç ayrık ve maskelenebilir · gövde/kanopi silüeti okunuyor · perspektif yok (düz karşıdan).

---

## Three.js yerleşimi **[P]**

- **Gökyüzü:** `sky_goldenhour` küre veya kutu içine, `MeshBasicMaterial`, `side = BackSide`. Işık almaz.
- **Tepe backdrop:** sahnenin arkasına tek büyük plane, `scene.fog` ile birlikte; oynanış düzleminden uzağa konur ki paralaks doğal olsun.
- **Ağaçlar:** alpha'lı billboard `Sprite` veya `PlaneGeometry`; orta-uzak katmanda tekrar eder, ön planda kullanılmaz.
- `colorSpace = SRGBColorSpace`, backdrop'ta `RepeatWrapping` **yok** (tek parça).

## Genel kabul kriteri **[P]**

- [ ] Ön planla yarışmıyor: kontrast düşük, detay haze'e düşüyor
- [ ] Gökyüzünde banding yok, backdrop'ta sıcak aksan yok
- [ ] Dosya ≤ 600 KB, isim kuralına uygun (`pipeline.md` §6)
- [ ] Unutma pusu **plate'e boyanmamış** — haze çalışma zamanı katmanı (art bible §4)
- [ ] `assets.csv` satırı yazıldı **[A]**
- [ ] **Onay yoksa `public/assets/` altına kopyalanmadı** **[?]**
