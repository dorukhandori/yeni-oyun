# LOT-52 — Kahraman ev-gövde (hero home hull)

> **Kart:** Paca LOT-52 · `Lotus │ Ship │ Hero home hull`
> **Tarih:** 2026-08-17 · **Yazan:** `@iris` · Game Art Director
> **Durum:** tasarım kilitlendi — **mesh yok**. Sahip Adım 1–7’yi bu oturumda seçti.
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
| 4 | Ölçek **mütevazı** (~14 m boy, ~4 m en). Yelken park halinde de **açık** (poster üçgen). Tente yok; ev = eşik + güverte işçiliği. |
| 5 | Pruva = boyalı apotropaik **göz + sade mahmuz** (heykel yok). Ayrılış = yelken inmez; kumaş **karın doldurur**. Park = aynı üçgen, **gevşek**. |
| 6 | Teslim = ortada **amfora sırası**. Üretim = **hibrit:** Blender gövde + Tripo yalnız yelken kumaşı. |
| 7 | 12 küp = koşunun kileri: Lotus 1–5, Kiklop 6–9, Sirenler 10–12. Filo metaforu güvertede yaşar. |

## Silüet (80 m)

- Ada organik; gemi **tek doğrusal kütle** (`art-bible.md` §5).
- Yelken üçgeni her zaman gökyüzünde — 12 gövde olmadan pusula hedefi bu.
- Renk: ağarmış ahşap `#c8b49a`, yelken bezi `#efe6d2`, halat `#c9a877`. Ada sıcağına karşı **serin**.
- Olgun lotus pembe `#f78fae` ile yarışan doygunluk yok. Göz boyası kömür + krem; altın/bronz parıltı yok.

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
| Boy | ~14 m |
| En (orta) | ~4 m |
| Doryseus | güvertede oda gibi yürür; koyu yutmaz |
| Bugünkü filo | ~3.35 m aralıklı kutu gövdeler — bu spec onları siler |

Aynı mesh Kiklop / Sirenler berth’inde durur; iskele çocuk mesh’i zemine oturur. K35 `relocateHero` tek gövdeyi kaydırır.

## Üretim (mesh turu — henüz açılmadı)

| Parça | Hat |
|---|---|
| Gövde, küpeşte, güverte, mahmuz, direk, seren, iskele, amfora, göz geometrisi | Blender, tasarlanmış (ada kiti / güneş gibi). Vertex colour veya UV + mevcut plank/yelken/halat albedo (ASSET-018/019/020) |
| Yelken kumaşı | Tripo, gevşek + karın (blendshape veya iki mesh) |
| Sahne | `src/world/ship.ts` — tek hero; kardeş gövde döngüsü kalkar |

Yeni ASSET-id üretim başında verilir. LOT-28 ada kiti ve `sea.ts` bu aile değil.

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
