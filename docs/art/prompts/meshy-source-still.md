# Image-to-3D kaynak still (Tripo)

> Anatomi: `_anatomy.md`. Palet: `art-bible.md` §2. Mesh üretimi: `pipeline.md` §5.1.
> Bu şablon **Tripo'ya giden 2D kaynağı** tarif eder. Higgsfield/Gemini mesh vermez.
> Dosya adı tarihsel (`meshy-source-still.md`); satıcı K39'dan beri Tripo.

Kaynak still kâğıt billboard **değildir**. Image-to-3D silüet + yumuşak hacim okur; düz karşıdan kart, yassı bir mesh çıkarır.

## Kaynak kuralları

- Tek nesne, stüdyo `#aea49a`, zemin/ufuk/HUD yok.
- **3/4 görüş** (hafif yukarı, nesnenin etrafı okunur) — düz karşıdan billboard yasak.
- `NOT photoreal`. Gölge serin mavi, siyah değil.
- Gömülü ışık Tripo'nun **form** okumasına yardım eder; oyuna **doku olarak girmez** (`texture: false`, `pbr: false`).
- Alt kenar düz (yere oturur). İkinci nesne yok.

## Örnek — zeytin (3/4, mesh kaynağı)

```text
Using Gemini, generate this as an image — 1:1, high quality, game-ready concept for image-to-3D.
Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

A SINGLE mature olive tree seen from a three-quarter angle, slightly above, as a complete sculptural object. Gnarled twisted pale trunk (#c8b49a) and a soft rounded silver-green canopy in overlapping blobs (#6b7f4a, #93964f). The trunk sits on the bottom edge of the frame. No second tree, no rocks, no grass, no sky.

Isolated on a perfectly flat even studio backdrop painted #aea49a warm beige, no floor, no horizon, no HUD, no text, no watermark.

Look: stylized-cartoon vegetation, soft-shaded rounded canopy masses, clean flat colors. Cool blue shadows, never black. Original design only — no logos, no brand marks, no text.
```

Kabul: 3/4 hacim okunuyor · tek nesne · alpha-key sonrası Tripo'ya PNG.

## İlk deneme sırası (koruluk değil)

1. Tek tebeşir kaya (ASSET-057 still, 3/4 yenilenirse daha iyi) — poly düşük, fail ucuz.
2. Tek zeytin, sonra tek servi.
3. Koruluk instancing ancak §8 + bütçe geçerse.

Komut: `npm run gen:mesh -- --image art-source/work/<keyed>.png -o art-source/raw/<name>.glb`
Cüzdan (üretim yok): `npm run gen:mesh -- --balance`
