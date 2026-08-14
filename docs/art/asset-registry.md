# Asset kayıt defteri — Lotus Adası

> **Son güncelleme:** 2026-08-14 · **Durum:** Gemini medya motoru aktif · **ASSET-001** (Odysseus v04) · **ASSET-002** (lotus v02) kilitlendi
> **Oyun:** Odysseia IX — Lotus Yiyenler Adası · **Motor:** Three.js 3D
> **Tasarım otoritesi:** `docs/design/` (`game-concept.md`, `gdd-lotus-collection.md`, `gdd-memory-system.md`, `tuning.md`). Bu liste onlarla eşitlendi 2026-08-14; `level-lotus-island.md` gelince tarla/bölge kalemleri gözden geçirilecek.
> **Pipeline:** `docs/art/pipeline.md` · **Görsel dil:** `docs/art/art-bible.md` · **Shipping manifest:** `public/assets/assets.csv`

Bu defter tek doğruluk kaynağıdır: burada satırı olmayan asset üretilmez, üretilse de oyuna girmez (`pipeline.md` §8).
Üretilen her dosya ayrıca **`public/assets/assets.csv`** içine prompt + model + seed ile yazılır — manifest shipping artifact'tir (`pipeline.md` §7) **[A]**.

**Etiketler:** **[K]** makalede tanımlı iş kalemi · **[A]** araştırmada doğrulanmış pratik · **[P]** proje kararı · **[?]** onay bekliyor.

> **Not:** `docs/design/` altındaki GDD paralel yazılıyor. Geldiğinde aşağıdaki liste (özellikle lotus aşama sayısı, teslim döngüsü ve HUD kalemleri) onunla eşitlenecek.

## Sınıflar

| Sınıf | Anlamı | Nereye gider |
|---|---|---|
| `media` **[K]** | Trailer, key art, cutdown — oyunu *gösteren* medya | `art-source/media/` |
| `reference` **[K]** | Concept art, turnaround — kodun nişan aldığı hedef | `art-source/ref/` |
| `scene-texture` **[P][?]** | Higgsfield still'inden türetilmiş oyun içi doku/billboard | `public/assets/textures/` |
| `spritesheet` **[A]** | still → video → frame → quantize → elle temizlik (`pipeline.md` §5) | `public/assets/spritesheets/` |
| `ui` **[P]** | HUD ikonu / çerçeve | `public/assets/ui/` |
| `code` **[K]** | Higgsfield'a gitmez, kodla üretilir (*"without a single hand-modeled asset"*) | `src/` (3D agent) |

## Durumlar

`planned` → `generated` (ham çıktı `art-source/raw/`) → `accepted` (§8 kapısı geçildi + csv satırı yazıldı) → `integrated`

CCGS `asset-spec` karşılıkları: `planned`=Needed · `generated`=In Progress · `accepted`=Approved · `integrated`=Done.

---

## Özet

| Toplam | planned | generated | accepted | integrated |
|---|---|---|---|---|
| 34 | 31 | 0 | 0 | 2 |

---

## P0 — Higgsfield erişimi gelince ilk üçü

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-001 | **Odysseus** turnaround | `reference` **[K]** | still, 4 açı | `prompts/character-turnaround.md` (Gemini §) | **integrated** | Sahip **varyant 04**. `assets/ref/char_odysseus_turnaround_01_ref_2048.png` → billboard + satchel fiziği. |
| ASSET-002 | Lotus 4 olgunluk aşaması sayfası | `reference` **[K]** → `scene-texture` **[?]** | still, yan yana 4 | `prompts/concept-sheet.md` (Gemini §) | **integrated** | Sahip **varyant 02**. `assets/ref/lotus_stages_01_ref_2048.png` → sahnede sprite + su fiziği. |
| ASSET-003 | Ada key art — kıyı + gemi | `media` **[K]** | still 16:9 | `prompts/key-art.md` | planned | Palet doğrulaması: art bible §2 hex'leri tutuyor mu |

---

## P1 — Lotus ve bitki örtüsü

| ID | Ad | Sınıf | Kanal / tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-004 | Lotus — aşama 1, tomurcuk | `scene-texture` **[?]** | albedo + alpha | `prompts/style-reference-still.md` | planned | Kapalı, dar silüet |
| ASSET-005 | Lotus — aşama 2, yarı açık | `scene-texture` **[?]** | albedo + alpha | `prompts/style-reference-still.md` | planned | |
| ASSET-006 | Lotus — aşama 3, **olgun** | `scene-texture` **[?]** | albedo + alpha | `prompts/style-reference-still.md` | planned | Adanın en doygun ve en geniş çiçeği, içten hafif ışıyor — tek "topla" sinyali, ikon yok |
| ASSET-007 | Lotus — aşama 4, solmuş | `scene-texture` **[?]** | albedo + alpha | `prompts/style-reference-still.md` | planned | Yapraklar düşük, doygunluk ölü |
| ASSET-008 | Lotus açma animasyonu (2→3) | `spritesheet` **[A]** | sheet | `prompts/character-animation-clip.md` | planned | Aşama geçişi görsel ödül |
| ASSET-009 | Nilüfer yaprağı (su üstü) | `scene-texture` **[?]** | albedo + alpha | `prompts/style-reference-still.md` | planned | Basamak/yürünebilirlik sinyali |
| ASSET-010 | Sazlık / kamış (billboard) | `scene-texture` **[?]** | alpha | `prompts/style-reference-still.md` | planned | Görüş keser, tarla sınırı |
| ASSET-011 | Zeytin & servi silueti | `scene-texture` **[?]** | alpha | `prompts/skybox-backdrop.md` | planned | Orta-uzak katman |

---

## P1 — Su ve kıyı

| ID | Ad | Sınıf | Kanal | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-012 | Sığ su dalga dokusu | `scene-texture` **[?]** | normal | `prompts/style-reference-still.md` | planned | Renk motorda, normal'de renk yok |
| ASSET-013 | Köpük hattı | `scene-texture` **[?]** | alpha | `prompts/style-reference-still.md` | planned | Kıyı çizgisi; bloom eşiğinin üstünde |
| ASSET-014 | Sığ su caustic | `scene-texture` **[?]** | caustic | `prompts/style-reference-still.md` | planned | Additive katman, dikişsiz |
| ASSET-015 | Altın kum (tileable) | `scene-texture` **[?]** | albedo | `prompts/style-reference-still.md` | planned | Yön bildiren büyük detay yok |
| ASSET-016 | Islak kum | `scene-texture` **[?]** | albedo | `prompts/style-reference-still.md` | planned | Dalga şeridi; kuru kumla dokuyla ayrılır |
| ASSET-017 | Çakıl / kıyı taşı | `scene-texture` **[?]** | albedo | `prompts/style-reference-still.md` | planned | Patika |
| ASSET-031 | Tebeşir beyazı kayalık | `scene-texture` **[?]** | albedo | `prompts/style-reference-still.md` | planned | `game-concept.md` §9.3 — ada parlak, hiçbir yeri koyu değil |
| ASSET-032 | Kavruk yeşil ot | `scene-texture` **[?]** | albedo | `prompts/style-reference-still.md` | planned | Ada zemini, güneşte kurumuş |
| ASSET-033 | İç göl suyu (tatlı su) | `scene-texture` **[?]** | normal | `prompts/style-reference-still.md` | planned | Denizden ayrışmalı: köpük yok, durgun, yeşilimsi. İyileştirmez (`gdd-memory-system.md` §3.3) |

---

## P1 — Gemi

| ID | Ad | Sınıf | Kanal | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-018 | Ağarmış gemi tahtası | `scene-texture` **[?]** | albedo | `prompts/style-reference-still.md` | planned | Serin ton — gemi tek soğuk çapa (art bible §1) |
| ASSET-019 | Yelken bezi | `scene-texture` **[?]** | albedo | `prompts/style-reference-still.md` | planned | Dokuma dokusu, hafif yıpranma |
| ASSET-020 | Halat / ağ | `scene-texture` **[?]** | albedo + alpha | `prompts/style-reference-still.md` | planned | |
| ASSET-021 | Gemi concept — teslim noktası | `reference` **[K]** | still | `prompts/concept-sheet.md` | planned | Formu kilitler; 3D agent geometriyi buna bakarak kurar |

**[?] Gemi sayısı açık:** `game-concept.md` §1 "on iki gemi"den söz ediyor (hedef 12 çünkü gemi 12), §5.1 döngüsü ise tek bir "gemi"de teslim yapıyor. Görsel sonucu büyük: **tek gemi mi, kıyıda sıralı 12 gemi mi?** `level-lotus-island.md` gelene kadar tek gemi + arkada filo silüeti varsayıldı. Key art bu varsayımla üretilecek — sahip onayı gerekiyor.

---

## P1 — Gökyüzü ve uzak

| ID | Ad | Sınıf | Kanal | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-022 | Altın saat gökyüzü (skybox) | `scene-texture` **[?]** | albedo | `prompts/skybox-backdrop.md` | planned | Açık hava — gerçek skybox anlamlı |
| ASSET-023 | Uzak sisli tepe backdrop | `scene-texture` **[?]** | albedo | `prompts/skybox-backdrop.md` | planned | Fog'a gömülü, ön planla yarışmaz |

---

## P1 — Karakter

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-024 | Odysseus yürüme döngüsü | `spritesheet` **[A]** | sheet | `prompts/character-animation-clip.md` | planned | ASSET-001'den türetilir |
| ASSET-025 | Odysseus toplama hareketi | `spritesheet` **[A]** | sheet | `prompts/character-animation-clip.md` | planned | Eğilme + koparma; `HARVEST_HOLD` 1,2 s'yi karşılamalı |
| ASSET-026 | Odysseus teslim hareketi | `spritesheet` **[A]** | sheet | `prompts/character-animation-clip.md` | planned | Ambara bırakma |
| ASSET-034 | Lotophagos figürü — ikram duruşu | `reference` **[K]** | still | `prompts/character-turnaround.md` | planned | 3 sessiz figür (`LOTOPHAGOS_COUNT`), elinde açık lotus uzatır. **MVP sonrası** (`game-concept.md` §12) |

---

## P2 — UI **[P]**

> **Unutuş göstergesi listede YOK ve olmayacak.** `docs/design/gdd-memory-system.md` §10: unutuşun barı/sayısı/yüzdesi yoktur, ölçek ekranın kendisidir (süt beyazı vinyet). Sahip'in brief'i "unutma göstergesi çerçevesi" istemişti; GDD bunu açıkça reddediyor ve tasarım otoritesi GDD'dir. **Sahip onayı gereken çelişki.**

| ID | Ad | Sınıf | Şablon | Durum | Not |
|---|---|---|---|---|---|
| ASSET-027 | Çanta ikonu + lotus yuvası | `ui` | `prompts/ui-icons.md` | planned | `HUD_CARRY`, 4 yuva (`CARRY_CAPACITY`) |
| ASSET-028 | Güneş yayı + pusula oku | `ui` | `prompts/ui-icons.md` | planned | Pusula eşik 25'te titrer, 50'de gider — ayrı dosya olmalı |
| ASSET-029 | Teslim istemi çerçevesi + gemi işareti | `ui` | `prompts/ui-icons.md` | planned | Boş çerçeve; metin kodda basılır (TOPLA / TESLİM ET) |

---

## P2 — Medya **[K]**

| ID | Ad | Sınıf | Şablon | Durum | Not |
|---|---|---|---|---|---|
| ASSET-030 | Announce trailer (~12 sn, 16:9) | `media` | `prompts/trailer.md` | planned | Unutma pusunun yükselişi trailer'ın dramatik yayı |
| — | Gameplay-capture klip | `media` | `prompts/gameplay-capture.md` | — | Trailer sonrası; ASSET-030 onaylanınca satır açılır |
| — | Social cutdown 9:16 | `media` | `prompts/social-cutdown.md` | — | **[K]** trailer'dan kesilir, sıfırdan üretilmez |
| — | Sinematik beat | `media` | `prompts/cinematic-beat.md` | — | **[?]** anlatı hedefi GDD'den gelecek |

---

## Higgsfield'a GİTMEYEN kalemler **[K]**

Oynanır build'in görseli koddan çıkar; bunlar 3D agent'ın işi, prompt yazılmaz.

| Ad | Sınıf | Not |
|---|---|---|
| Ada arazisi / kıyı geometrisi | `code` | Prosedürel mesh |
| Su yüzeyi shader hareketi | `code` | Renk + dalga motorda |
| Işık kurgusu (gökyüzü + yön + su yansıması) | `code` | art bible §3 |
| **Unutma post-process katmanı** | `code` | Haze + doygunluk kaybı + kenar erimesi — art bible §4, texture'a gömülmez |
| Bloom / grade / vignette / fog | `code` | |
| Lotus toplama & teslim geri bildirimi | `code` | Squash-stretch, mikro sarsıntı **[K]** |
