# LOT-52 — Kahraman ev-gövde (hero home hull)

> **Kart:** Paca LOT-52 · `Lotus │ Ship │ Hero home hull`
> **Tarih:** 2026-08-17 · **Yazan:** `@iris` · Game Art Director
> **Durum:** mesh turu — Gemini still v3 (ASSET-075, kabarık Wedjat) → Tripo dokulu GLB (ASSET-076). v2 silüet sahip beğendi; göz Mısır + runik kabartma (17 Ağu).
> **Otorite (görsel):** `art-bible.md` §1/§2/§5/§9 — gemi tek soğuk çapa; stylized, müze dokusu değil.
> **Otorite (oynanış, çelişince):** `gdd-lotus-island-run.md` teslim + dümen; bu spec filoyu **görselden** düşürür, 12’yi güverte kilerine taşır.

## Ne

Her durakta aynı **tek** kahraman gemisi. Ev burası: kuma oturmuş gövde + kısa iskele kapısı + yürünebilir güverte. Filo yok. On iki kardeş gövde yok. `FLEET.count = 12` bu kilitten sonra kod ve GDD’de güncellenir (mesh turunda, bu dosyada değil).

## Sahip kilitleri (Adım 1–7)

| Adım | Kilit |
|---|---|
| 1 | Tek kahraman gövde. Görkem = yaşanır ev-güverte (küpeşte, amfora, okunur teslim). |
| 2 | Tek büyük tarihi 3D gemi, güverte tam sanat. 12’li filo görseli düşer. Güverte kalbi = **eşik** (adadan gemiye kapı). |
| 3 | Eşik = kuma oturmuş gövde **+** kısa iskele (iki direk). Silüet = **icat ev-kadırga** (uzaktan uzun çizgi, ortadan yürünebilir ev). |
| 4 | Ölçek **3×** (~42 m boy). Sahip 17 Ağu: “gemiyi 3 kat büyüt”. Önceki mütevazı 14 m kilidi bu turda açıldı. Yelken park halinde de **açık**. |
| 5 | Pruva = kabarık Mısır **Wedjat** (Horus gözü) + sade mahmuz. Göz düz boya değil: yüksek kabartma ahşap amulet + runik oyma yazıt. Heykel pruva yok. Ayrılış = yelken inmez; kumaş **karın doldurur**. Park = aynı üçgen, **gevşek**. Sahip 17 Ağu: “göz daha Mısır mitolojisini andırsın ve kabarık runik olsun.” |
| 6 | Teslim = ortada **amfora sırası**. Üretim = **Gemini still → Tripo mesh** (sahip: Blender v0 yeterince görkemli değil). |
| 7 | 12 küp = koşunun kileri: Lotus 1–5, Kiklop 6–9, Sirenler 10–12. Filo metaforu güvertede yaşar. |

## Silüet (80 m)

- Ada organik; gemi **tek doğrusal kütle** (`art-bible.md` §5).
- Yelken üçgeni her zaman gökyüzünde — 12 gövde olmadan pusula hedefi bu.
- Renk: ağarmış ahşap `#c8b49a`, yelken bezi `#efe6d2`, halat `#c9a877`. Ada sıcağına karşı **serin**.
- Olgun lotus pembe `#f78fae` ile yarışan doygunluk yok. Göz: lazuli `#1f6fa8` + kömür + krem; kabartma olukları `#8a7358`. Altın/bronz parıltı yok. Piramit, sfenks, asılı ankh yok.

## Güverte programı (20 m → ayak)

Kıyıya **borda**. İskele kuma, orta küpeşte boşluğuna.

```
deniz ─────────────────────────────────────────────
        PRUVA     orta ev              KIÇ
        göz+mahmuz  amfora 1–12        dümen
                    [eşik]====iskele=== kum
───────────────────────────────────────────────────
```

- **Kapı:** iki direk + kısa tahta + küpeşte boşluğu. 20 m’den eşik okunur.
- **Ev:** eşikten içeri amfora sırası + mevcut hatıra yeri (höyük / çelenk).
- **Ayrılış:** kıç dümen (E, hedef dolunca). Teslim eşiğiyle karışmaz.
- Güverte **yürünür** (home/ship). Teslim tetik eşiğin iç tarafında kalır.

## Yelken (hibrit)

- Direk + seren: Blender, gövdeyle aynı stil.
- Kumaş: Tripo (gevşek kıvrım istenen yer — güneş tanrısında kaçınılan organik, burada işe yarar).
- İki hal: **gevşek** (park) / **karın** (departing). Aynı üçgen, rüzgâr okunur. İndirme yok.
- Kürekler suya inmez; küpeşte boyunca toplanmış (ayrılış vuruşu yelken).

## Ölçek

| | |
|---|---|
| Boy | ~42 m (sahip 3×; önceki kilit 14 m) |
| En (orta) | ~12 m |
| Doryseus | güvertede oda gibi yürür; koyu yutmaz |
| Bugünkü filo | ~3.35 m aralıklı kutu gövdeler — bu spec onları siler |

Aynı mesh Kiklop / Sirenler berth’inde durur; iskele çocuk mesh’i zemine oturur. K35 `relocateHero` tek gövdeyi kaydırır.

## Üretim

| Parça | Hat |
|---|---|
| 3/4 still | Gemini `gemini-3-pro-image` · v3 = v2 image-edit (Wedjat + runik kabartma) |
| Mesh | Tripo H3.1 image-to-3D, **dokulu**, 8000 face · `ship_hero_03_mesh_8000.glb` |
| Sahne | `src/world/ship.ts` — tek hero, 42 m; kara tarafında kahverengi kaya patikası (pruva → kum) |
| Yedek | `scripts/blender/build_hero_ship.py` v0 — sahne fallback |

LOT-28 ada kiti ve `sea.ts` bu aile değil.

## Yasak

- 12 kardeş gemi, ufuk silüet filosu.
- Müze / fotogerçek ahşap fotoğrafı (`art-bible.md` §9).
- Pruva heykelciği, bilinen Odysseia pruva kopyası.
- Tente (Adım 4’te düştü).
- Yelken indirme (ayrılış kumaş karnı).
- Olgun pembe / hazine-altını donanım.
- Meshy. Ada kiti script’ine ekleme.

## Doküman borcu (mesh ile birlikte, şimdi değil)

`scenario.md` güney filo, `art-bible.md` §6 “12 gemilik filo”, `asset-registry.md` K24, `FLEET.count`. 12 sayısı **koşu kilerinde** kalır (`RUN_TARGET_TOTAL`). `@helix` GDD cümlesini mesh turunda eşitler.

## Kabul (mesh gelince)

- Plajdan: soğuk uzun gövde + açık yelken üçgeni; kardeş yok.
- 20 m: iskele kapı.
- Güvertede: 12 amfora sırası, dümen kıçta ayrı.
- Park gevşek / departing karın, tek bakışta.
- Unutuşta gemi son direnen soğuk çapa (`art-bible.md` §4).
