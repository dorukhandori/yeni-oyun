# Asset kayıt defteri — Lotus Adası

> **Son güncelleme:** 2026-08-14 (ikinci tur — menü görsel yönü, ASSET-035..040 eklendi) · **Durum:** Higgsfield hâlâ bağlı değil; tüm üretim Gemini API doğrudan yolla yapıldı — `scripts/gen-assets.mjs` (toplu tur + Veo video, `pipeline.md` §3) ve `scripts/gen-gemini-image.mjs` (tekil varyant üretimi, ASSET-001/002 varyant turları). P0 üçlüsü + 26/27 `planned` kalem üretildi (bkz. Özet ve "Üretim sırası" bölümü) — 20'si `public/assets/`'e taşınmış durumda, kod entegrasyonu (Three.js'e `TextureLoader` ile bağlanma) ayrı bir sonraki iş. Oyuncu karakterinin adı **Doryseus** (orijinal tasarım, Homeros'un Odysseus'u değil — sahip kararı 2026-08-14). **ASSET-035..040** (menü parşömen paneli + altın çerçeve + Hub illustre ada haritası) `planned` — bu turun art-director alt-ajanının Bash aracı yoktu, prompt dosyaları hazır, üretim bekliyor (bkz. P2 — UI (menü kroması) bölümü).
> **Kilitli varyantlar:** **ASSET-001** = sahip seçimi varyant 04 · **ASSET-002** = sahip seçimi varyant 02 (`public/preview/` galerisinde tüm varyantlar duruyor).
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
| 40 | 7 | 8 | 5 | 20 |

**2026-08-14, ikinci tur — menü görsel yönü (BOTW parşömen + illustre Hub haritası):** sahip'le menü görsel dili üzerine kilitlenen kararlar sonrası **ASSET-035..040** eklendi (aşağıda P2 — UI (menü kroması) bölümü). Bu oturumun **Bash aracı yoktur** — `scripts/gen-assets.mjs` bizzat çalıştırılamadı; üç prompt dosyası `art-source/work/prompt-asset-035/036/037-*.txt` olarak hazırlandı, komutlar aşağıdaki tabloda. Hepsi `planned`.

**2026-08-14, üçüncü tur — Three.js kod entegrasyonu (gameplay-programmer):** 15 `accepted` scene-texture kalemi (ASSET-009, 010, 012–016, 018–020, 022, 023, 031–033) gerçek Three.js materyallerine bağlandı, `accepted` → `integrated`. Kapsam dışı kalan tek kalem **ASSET-017** (çakıl) — sahip'in bu tur için verdiği texture listesinde yoktu, dokunulmadı. İki raw dosyada (`flora_reed_01`, `water_foam_01`) ve iki ek dosyada (`flora_lilypad_01`, `ship_rope_01`) isimlerindeki "alpha" ibaresine rağmen **gerçek alpha kanalı yoktu** (düz gri/beyaz fon) — renk-mesafe alpha-key ile işlendi, sonuçlar `art-source/work/*_alpha_keyed.png`'de duruyor. `sand_gold_01` ayrıca **tileable değildi** (kenarlarda deniz kabuğu süsü + köşede farklı ton) — merkezden kırpıldı. `hill_backdrop_01`'de üretimden kalma beyaz çerçeve kırpıldı. Tüm entegre dosyalar PNG'den WebP'ye çevrildi (`docs/art/pipeline.md` §6) — toplam `public/assets/textures/` + `public/assets/skybox/` boyutu ~22 MB ham çıktıdan **~950 KB**'a indi. Detaylar: `public/assets/assets.csv` satır notları + bu tablodaki ilgili satırlar.

**2026-08-14 toplu üretim turu:** kalan 27 `planned` kalemden 26'sı üretildi (ASSET-034 Lotophagos figürü kasıtlı olarak MVP-sonrası ertelendi). 20'si `public/assets/`'e taşındı ve §8 kabul kapısından geçti (kod entegrasyonu hâlâ ayrı bir iş — `accepted` ≠ `integrated`); 8'i (`generated`) ham halde kaldı: 3 UI ikonu tek sayfada kırpılmayı bekliyor, zeytin/servi turnaround sayfası kırpılmayı bekliyor, 4 karakter/lotus video klibi `pipeline.md` §5'in henüz yazılmamış frame-extraction/quantize/temizlik hattını bekliyor. 4 asset ilk denemede reddedilip (davetsiz çiçek motifleri veya yanlış palet — bkz. ilgili satır notları) prompt düzeltmesiyle yeniden üretildi.

---

## Üretim sırası — 27 planned kalem (art director önceliklendirmesi, 2026-08-14)

**Önce bir uygulama notu:** bu önceliklendirmeyi yapan `art-director` alt-ajanının bu oturumda **Bash/kabuk çalıştırma aracı yok** — yalnızca dosya okuma/yazma. Yani `scripts/gen-assets.mjs`'i bizzat çalıştıramadım, üretilen görselleri inceleyemedim, dosya taşıyamadım, `assets.csv` satırı ekleyemedim. P0 üçlüsünü üreten oturum (Bash erişimi olan ana oturum) bunu yapabiliyordu; bu oturum yapamıyor. Aşağıdakiler bu yüzden **üretime hazır ama üretilmemiş** durumda:

- 27 kalemin hepsi için `art-source/work/prompt-asset-0NN-*.txt` dosyaları hazırlandı (P0'daki `prompt-asset-001/002/003` kuralını izler — çözülmüş, İngilizce, tek başına çalıştırılabilir prompt metni).
- Aşağıdaki sıra ve komutlar Bash erişimi olan tarafın (ana oturum ya da sahip) çalıştırması için hazır.
- Her komut çalıştıktan sonra çıktı `art-source/raw/`'a düşer; §8 kabul kapısından geçirilip (görsel gözle kontrol, palet/ışık/IP), doğru klasöre taşınmalı, `public/assets/assets.csv` satırı yazılmalı, bu tablo ve ilgili bölüm satırı `generated`/`accepted`/`integrated` olarak güncellenmeli.

### Sıralama gerekçesi

Üç ölçüte göre sıralandı: (1) koda **en hızlı ve düşük riskle entegre olan** (tek `TextureLoader` swap), (2) **oynanışı en çok destekleyen** (unutuş mekaniğini görselleştiren veya çekirdek okuma problemini çözen), (3) **düşük risk/yüksek etki**. Karakter animasyon spritesheet'leri (still→video→frame→quantize→elle temizlik, `pipeline.md` §5) kasıtlı olarak en sona bırakıldı: 6 adımlı hat, tek still üretiminden çok daha pahalı, ve `src/world/sailor.ts` şu an düşük-poli primitive kullanıyor (ASSET-001 notu) — spritesheet'e geçmek gameplay-programmer'ın ayrı bir motor kararı vermesini gerektiriyor, henüz verilmedi. ASSET-034 tasarım dokümanının kendisi tarafından **MVP sonrası** işaretlendiği için en sonda.

| Sıra | ID | Neden bu sırada | Prompt dosyası | Komut (Bash erişimi olan taraf çalıştırır) | Hedef (üretim sonrası, §8 geçince) |
|---|---|---|---|---|---|
| 1 | ASSET-022 | Gökyüzü her karede görünür (`art-bible.md` §6), tek dosya, en büyük görsel alan | `prompt-asset-022-sky-goldenhour.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-022-sky-goldenhour.txt --aspect 2:1 -o art-source/raw/sky_goldenhour_01_albedo_2048.png` | `public/assets/skybox/` |
| 2 | ASSET-015 | En büyük tekil zemin yüzeyi (plaj), basit tileable swap | `prompt-asset-015-sand-gold.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-015-sand-gold.txt --aspect 1:1 -o art-source/raw/sand_gold_01_albedo_1024.png` | `public/assets/textures/` |
| 3 | ASSET-012 | Su, çekirdek oynanış düzlemi (lotus tarlası sığ suda) | `prompt-asset-012-water-shallow-normal.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-012-water-shallow-normal.txt --aspect 1:1 -o art-source/raw/water_shallow_01_normal_512.png` | `public/assets/textures/` |
| 4 | ASSET-033 | Mekanik açısından yüklü: göl denizden **görsel olarak** ayrışmalı, aksi halde "iyileştirmez" kuralı sinsi kalamaz (`gdd-memory-system.md` §3.3) | `prompt-asset-033-lake-water.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-033-lake-water.txt --aspect 1:1 -o art-source/raw/water_lake_01_normal_512.png` | `public/assets/textures/` |
| 5 | ASSET-016 | ASSET-015 ile aynı bölge, düşük ek maliyet, aynı geçiş | `prompt-asset-016-sand-wet.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-016-sand-wet.txt --aspect 1:1 -o art-source/raw/sand_wet_01_albedo_1024.png` | `public/assets/textures/` |
| 6 | ASSET-021 | Gemi formu kilitlenmeden gemi dokuları UV'siz kalır; 3D agent'ın nişan aldığı hedef | `prompt-asset-021-ship-concept.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-021-ship-concept.txt --aspect 16:9 -o art-source/raw/ship_concept_01_ref_1344.png` | `art-source/ref/` (reference, oyuna girmez) |
| 7 | ASSET-018 | Gemi = tek soğuk çapa (`art-bible.md` §1), en yüksek anlatı ağırlıklı prop | `prompt-asset-018-ship-plank.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-018-ship-plank.txt --aspect 1:1 -o art-source/raw/ship_plank_01_albedo_1024.png` | `public/assets/textures/` |
| 8 | ASSET-019 | Gemi setini tamamlar | `prompt-asset-019-ship-sail.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-019-ship-sail.txt --aspect 1:1 -o art-source/raw/ship_sail_01_albedo_1024.png` | `public/assets/textures/` |
| 9 | ASSET-013 | Kıyı çizgisi okunabilirliği, su setini tamamlar | `prompt-asset-013-foam.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-013-foam.txt --aspect 16:9 -o art-source/raw/water_foam_01_alpha_512.png` | `public/assets/textures/` |
| 10 | ASSET-014 | Su setinin son parçası, additive polish | `prompt-asset-014-caustic.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-014-caustic.txt --aspect 1:1 -o art-source/raw/water_caustic_01_caustic_512.png` | `public/assets/textures/` |
| 11 | ASSET-031 | Ada zemininin ikinci büyük yüzeyi, `game-concept.md` §9.3 kuralını taşır (hiçbir yer koyu değil) | `prompt-asset-031-rock-chalk.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-031-rock-chalk.txt --aspect 1:1 -o art-source/raw/rock_chalk_01_albedo_1024.png` | `public/assets/textures/` |
| 12 | ASSET-032 | Ada zemini, her yerde görünür | `prompt-asset-032-drygrass.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-032-drygrass.txt --aspect 1:1 -o art-source/raw/flora_drygrass_01_albedo_1024.png` | `public/assets/textures/` |
| 13 | ASSET-023 | Gökyüzüyle (sıra 1) aynı uzak katman, paralaks çifti | `prompt-asset-023-hill-backdrop.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-023-hill-backdrop.txt --aspect 2:1 -o art-source/raw/hill_backdrop_01_albedo_2048.png` | `public/assets/skybox/` |
| 14 | ASSET-017 | Patika dokusu, orta öncelik | `prompt-asset-017-pebble.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-017-pebble.txt --aspect 1:1 -o art-source/raw/sand_pebble_01_albedo_512.png` | `public/assets/textures/` |
| 15 | ASSET-020 | Gemi detayı, küçük prop | `prompt-asset-020-ship-rope.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-020-ship-rope.txt --aspect 1:1 -o art-source/raw/ship_rope_01_albedo_512.png` | `public/assets/textures/` |
| 16 | ASSET-028 | Pusula = unutuşun **bilgi kaybı** katmanının ilk göstergesi (`gdd-memory-system.md` §10) — ucuz, tek sayfa, mekanik kritik | `prompt-asset-027-029-ui-icons.txt` (tek sayfa, 3 ID paylaşır — bkz. `prompt-asset-028-sun-compass-note.txt`) | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-027-029-ui-icons.txt --aspect 1:1 -o art-source/raw/ui_icon_sheet_01.png` | kırpılıp `public/assets/ui/` (6 ayrı dosya) |
| 17 | ASSET-027 | Aynı sayfadan kırpılır (yukarıdaki komutu tekrar çalıştırmaya gerek yok) | *(aynı sayfa)* | — | `public/assets/ui/` |
| 18 | ASSET-029 | Aynı sayfadan kırpılır | *(aynı sayfa)* | — | `public/assets/ui/` |
| 19 | ASSET-009 | Nilüfer yaprağı — basamak/yürünebilirlik sinyali, şu an prosedürel | `prompt-asset-009-lilypad.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-009-lilypad.txt --aspect 1:1 -o art-source/raw/flora_lilypad_01_albedo_512.png` | `public/assets/textures/` |
| 20 | ASSET-010 | Sazlık — tarla sınırı, görüş kesme | `prompt-asset-010-reed.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-010-reed.txt --aspect 1:1 -o art-source/raw/flora_reed_01_alpha_512.png` | `public/assets/textures/` |
| 21 | ASSET-011 | Orta-uzak katman, atmosfer > oynanış | `prompt-asset-011-olive-cypress.txt` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-011-olive-cypress.txt --aspect 16:9 -o art-source/raw/flora_tree_01_alpha_1024.png` | `public/assets/textures/` |
| 22 | ASSET-030 | Veo bu oturumda doğrulandı; kendi kendine yeten teslim, kod entegrasyonu gerektirmiyor | `prompt-asset-030-trailer.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-030-trailer.txt --aspect 16:9 --seconds 12 -o art-source/raw/trailer_announce_01.mp4` | `art-source/media/` |
| 23 | ASSET-024 | Karakter animasyon hattı başlar (6 adım, pahalı) — en çok görülecek döngü önce | `prompt-asset-024-doryseus-walk.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-024-doryseus-walk.txt --aspect 1:1 --seconds 3 -o art-source/raw/char_doryseus_walk_clip_01.mp4` | `art-source/frames/` → … → `public/assets/spritesheets/` (§5) |
| 24 | ASSET-025 | Aynı hat, toplama hareketi — `HARVEST_HOLD` 1,2s'yi karşılamalı | `prompt-asset-025-doryseus-harvest.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-025-doryseus-harvest.txt --aspect 1:1 --seconds 3 -o art-source/raw/char_doryseus_harvest_clip_01.mp4` | `art-source/frames/` → … → `public/assets/spritesheets/` |
| 25 | ASSET-026 | Aynı hat, teslim hareketi | `prompt-asset-026-doryseus-deliver.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-026-doryseus-deliver.txt --aspect 1:1 --seconds 3 -o art-source/raw/char_doryseus_deliver_clip_01.mp4` | `art-source/frames/` → … → `public/assets/spritesheets/` |
| 26 | ASSET-008 | Aynı hat, lotus açma — lotus zaten billboard sprite olduğu için doğal sıradaki adım | `prompt-asset-008-lotus-open.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-008-lotus-open.txt --aspect 1:1 --seconds 2 -o art-source/raw/lotus_open_clip_01.mp4` | `art-source/frames/` → … → `public/assets/spritesheets/` |
| 27 | ASSET-034 | Tasarım dokümanı **MVP sonrası** diyor (`game-concept.md` §12) — üretimi ertelemek tasarım kararına uyar | `prompt-asset-034-lotophagos.txt` | *(bilerek ertelendi — bkz. dosyanın "HOLD" başlığı)* | `art-source/ref/` |

**Karakter animasyon hattı için önkoşul uyarısı [P]:** sıra 23–26'ya geçmeden önce gameplay-programmer'a şu soru sorulmalı: *"`src/world/sailor.ts` düşük-poli primitive'den `Sprite`/spritesheet render'a geçecek mi, yoksa still turnaround yalnızca yön referansı olarak mı kalacak?"* Cevap "hayır, primitive kalıyor" ise ASSET-024/025/026 hiç üretilmemeli — 6 adımlı pahalı hattı kullanılmayacak bir asset için harcamak olur. ASSET-002'de lotus için tam olarak bu karar zaten verildi ("billboard sprite" — registry notu); karakter için eşdeğer karar **henüz yok**.

---

## P0 — Higgsfield erişimi gelince ilk üçü

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-001 | **Doryseus** turnaround | `reference` **[K]** | still, 4 açı | `prompts/character-turnaround.md` (Gemini §) / `art-source/work/prompt-asset-001-turnaround.txt` | **accepted** | **Sahip seçimi: varyant 04** (`public/preview/` galerisinde 4 varyantın hepsi duruyor) → `public/assets/ref/char_odysseus_turnaround_01_ref_2048.png` · `gemini-2.5-flash-image` · seed none · 1:1 · 1024×1024 · 2026-08-14. **İsim notu (2026-08-14):** oyuncu karakteri artık **Doryseus** (orijinal tasarım, Homeros'un Odysseus'u değil — sahip kararı); dosya adı ve görsel **değişmedi/yeniden üretilmedi**, yalnızca karakter adı metinde güncellendi. **Sınıf notu (merge 2026-08-14): `reference` olarak kaldı, `scene-texture` DEĞİL** — sayfada alpha kanalı yok (opak bej zemin), 4'e dilimlenip billboard yapıldığında oyuncu dev bir bej dikdörtgen olarak render ediliyordu; `src/world/sailor.ts` prosedürel low-poly modelini **bu turnaround'a göre yeniden şekillendirdi** ve öyle kaldı (satchel spring fiziği duruyor). Bu still kod için **hedef/yön referansı** |
| ASSET-002 | Lotus 4 olgunluk aşaması sayfası | `reference` **[K]** | still, yan yana 4 | `prompts/concept-sheet.md` (Gemini §) / `art-source/work/prompt-asset-002-lotus-stages.txt` | **accepted** | **Sahip seçimi: varyant 02** (4 varyant `public/preview/lotus/`'ta) → `public/assets/ref/lotus_stages_01_ref_2048.png` · `gemini-2.5-flash-image` · seed none · 1:1 · 1024×1024 · 2026-08-14. **Sınıf notu (merge 2026-08-14):** sayfanın kendisi alpha'sız/opak bej olduğu için **doğrudan dilimlenip sahneye girmiyor**; oyuna giren şey bu sayfadan tek tek kırpılıp alpha-key'lenmiş **ASSET-004..007** billboard'ları (aşağıda). Oyunun çekirdek okuma problemi; evre görünüşleri `gdd-lotus-collection.md` §3.2'den |
| ASSET-003 | Ada key art — kıyı + gemi | `media` **[K]** | still 16:9 | `prompts/key-art.md` / `art-source/work/prompt-asset-003-key-art.txt` | **accepted** | `art-source/media/key_art_shore_01_media_1344.png` · `gemini-2.5-flash-image` · seed none · 16:9 · 1344×768 · 2026-08-14 · sahip onayı 2026-08-14. `media` sınıfı — oyun sahnesine girmez; türevi `public/assets/ui/title_bg_key_art_1344.webp` Hub ekranı arka planı olarak kullanılıyor (`src/ui/hud.css` `.hub-bg`). Palet yönü tutuyor (turkuaz sığlık, altın kum, serin gemi) |

---

## P1 — Lotus ve bitki örtüsü

| ID | Ad | Sınıf | Kanal / tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-004 | Lotus — aşama 1, tomurcuk | `scene-texture` | albedo (alpha gömülü) | ASSET-002'den kırpıldı | **integrated** | `public/assets/textures/lotus_bud_01_albedo_512.png` (502×512) · Kapalı, dar silüet · `lotus.ts` `STAGE_TEX.bud` |
| ASSET-005 | Lotus — aşama 2, yarı açık | `scene-texture` | albedo (alpha gömülü) | ASSET-002'den kırpıldı | **integrated** | `public/assets/textures/lotus_half_02_albedo_512.png` (512×351) · `lotus.ts` `STAGE_TEX.half` |
| ASSET-006 | Lotus — aşama 3, **olgun** | `scene-texture` | albedo (alpha gömülü) | ASSET-002'den kırpıldı | **integrated** | `public/assets/textures/lotus_bloom_03_albedo_512.png` (512×232) · Adanın en doygun ve en geniş çiçeği, içten hafif ışıyor — tek "topla" sinyali, ikon yok · `lotus.ts` `STAGE_TEX.ripe` |
| ASSET-007 | Lotus — aşama 4, solmuş | `scene-texture` | albedo (alpha gömülü) | ASSET-002'den kırpıldı | **integrated** | `public/assets/textures/lotus_wilt_04_albedo_512.png` (512×353) · Yapraklar düşük, doygunluk ölü · `lotus.ts` `STAGE_TEX.wilt` |
| ASSET-008 | Lotus açma animasyonu (2→3) | `spritesheet` **[A]** | sheet | `art-source/work/prompt-asset-008-lotus-open.txt` | **generated** | `art-source/raw/lotus_open_clip_01.mp4` (Veo, 4s/16:9) · aynı şekilde spritesheet hattı bekliyor |
| ASSET-009 | Nilüfer yaprağı (su üstü) | `scene-texture` | albedo | `art-source/work/prompt-asset-009-lilypad.txt` | **integrated** | `public/assets/textures/flora_lilypad_01_albedo_512.webp` · `gemini-2.5-flash-image` · 2026-08-14 · raw dosyada gerçek alpha yoktu (beyaz fon) — alpha-key'lendi (547×643'e kırpıldı), WebP'ye çevrildi · `src/world/lotus.ts` `padMat`/`padMatLight` (CircleGeometry yerini PlaneGeometry+alphaTest aldı) |
| ASSET-010 | Sazlık / kamış (billboard) | `scene-texture` | alpha | `art-source/work/prompt-asset-010-reed.txt` | **integrated** | `public/assets/textures/flora_reed_01_alpha_512.webp` · `gemini-2.5-flash-image` · 2026-08-14 · raw dosyada gerçek alpha yoktu (gri fon) — alpha-key'lendi (624×862'ye kırpıldı), WebP'ye çevrildi · `src/world/terrain.ts` `buildReedBeds` (çapraz çift-plane billboard kümeleri, `mergeGeometries` ile tek draw call — eski prosedürel govde/uç silindir-koni çiftlerinin yerini aldı) |
| ASSET-011 | Zeytin & servi silueti | `scene-texture` | alpha | `art-source/work/prompt-asset-011-olive-cypress.txt` | **generated** | `art-source/raw/flora_tree_01_alpha.png` · 3'lü turnaround sayfası (zeytin×2 + servi) · **henüz kırpılmadı** — lotus stages gibi tek tek alpha-key'lenmesi lazım · `public/assets/`'e taşınmadı |

---

## P1 — Su ve kıyı

| ID | Ad | Sınıf | Kanal | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-012 | Sığ su dalga dokusu | `scene-texture` | normal | `art-source/work/prompt-asset-012-water-shallow-normal.txt` | **integrated** | `public/assets/textures/water_shallow_01_normal_512.webp` · 2026-08-14 · WebP (linear, sRGB yok) · `src/world/sea.ts` ana deniz `MeshStandardMaterial.normalMap`, `SEA_TEX.shallowNormalTileMeters/Strength` |
| ASSET-013 | Köpük hattı | `scene-texture` | alpha | `art-source/work/prompt-asset-013-foam.txt` | **integrated** | `public/assets/textures/water_foam_01_alpha_512.webp` · 2026-08-14 · raw dosyada gerçek alpha yoktu (gri fon) — alpha-key'lendi, WebP'ye çevrildi · `src/world/sea.ts` `foamMat` (RingGeometry u=kıyı çevresinde repeat, v=clamp), `SEA_TEX.foamRepeatX` |
| ASSET-014 | Sığ su caustic | `scene-texture` | caustic | `art-source/work/prompt-asset-014-caustic.txt` | **integrated** | `public/assets/textures/water_caustic_01_caustic_512.webp` · 2026-08-14 · additive blend'de doğru çalıştığı doğrulandı (siyah zemin katkı yapmıyor) · `src/world/sea.ts` yeni caustic ring mesh (`AdditiveBlending`, zamanla kayan UV offset), `SEA_TEX.causticTileMeters/ScrollSpeed/Opacity` |
| ASSET-015 | Altın kum (tileable) | `scene-texture` | albedo | `art-source/work/prompt-asset-015-sand-gold.txt` | **integrated** | `public/assets/textures/sand_gold_01_albedo_512.webp` · 2026-08-14 · **2×2 döşeme kontrolünde orijinal görsel tileable DEĞİLDİ** (kenarlarda deniz kabuğu süsü + köşede farklı ton bandı) — 620×620 merkez bölge kırpılıp 512'ye küçültüldü, yeniden test edilip dikişsiz doğrulandı · `src/world/terrain.ts` `buildGroundMaterial` (world-space UV splat shader), `TERRAIN_TEX.sandTileMeters` |
| ASSET-016 | Islak kum | `scene-texture` | albedo | `art-source/work/prompt-asset-016-sand-wet.txt` | **integrated** | `public/assets/textures/sand_wet_01_albedo_1024.webp` · 2026-08-14 · ilk deneme davetsiz lotus/parlayan çiçek motifleriyle reddedildi, prompta "no flowers" kısıtı eklenip yeniden üretildi · 2×2 döşemede dikişsiz doğrulandı · `src/world/terrain.ts` `buildGroundMaterial` (`aWeights.y` ile kuru kum karışımı) |
| ASSET-017 | Çakıl / kıyı taşı | `scene-texture` | albedo | `art-source/work/prompt-asset-017-pebble.txt` | **accepted** | `public/assets/textures/sand_pebble_01_albedo_512.png` · 2026-08-14 · ilk deneme davetsiz beyaz çiçek lekeleriyle reddedildi, "no flowers" kısıtıyla yeniden üretildi · **2026-08-14 üçüncü tur kapsamı dışında bırakıldı** (sahip'in bu turdaki texture listesinde yoktu) — kod entegrasyonu hâlâ bekliyor |
| ASSET-031 | Tebeşir beyazı kayalık | `scene-texture` | albedo | `art-source/work/prompt-asset-031-rock-chalk.txt` | **integrated** | `public/assets/textures/rock_chalk_01_albedo_1024.webp` · 2026-08-14 · `src/world/terrain.ts` `rockMat` (kayalar) + `marbleMat` (mabet sütunları) + kuzey koyu adım taşları |
| ASSET-032 | Kavruk yeşil ot | `scene-texture` | albedo | `art-source/work/prompt-asset-032-drygrass.txt` | **integrated** | `public/assets/textures/flora_drygrass_01_albedo_1024.webp` · 2026-08-14 · iki revizyon gerekti (önce davetsiz lotus çiçekleri, sonra mavi renkli toprak çatlakları) · `src/world/terrain.ts` `buildGroundMaterial` (`aTint` ile yükseklik-bazlı yeşil gradyan çarpımı), `TERRAIN_TEX.grassTileMeters` |
| ASSET-033 | İç göl suyu (tatlı su) | `scene-texture` | normal | `art-source/work/prompt-asset-033-lake-water.txt` | **integrated** | `public/assets/textures/water_lake_01_normal_512.webp` · 2026-08-14 · denizden hem renkle (mevcut `PALETTE.lagoon`) hem artık normal dalga karakteriyle ayrışıyor · `src/world/sea.ts` lagoon `MeshStandardMaterial.normalMap`, `SEA_TEX.lakeNormalTileMeters/Strength` |

---

## P1 — Gemi

| ID | Ad | Sınıf | Kanal | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-018 | Ağarmış gemi tahtası | `scene-texture` | albedo | `art-source/work/prompt-asset-018-ship-plank.txt` | **integrated** | `public/assets/textures/ship_plank_01_albedo_1024.webp` · 2026-08-14 · ilk deneme yanlış palette (mavi/camgöbeği) ile reddedildi, hex açıkça belirtilip yeniden üretildi · `src/world/ship.ts` `buildDeckMaterial` (güverte, yürüme tahtası, tüm filo — 12 gemi) |
| ASSET-019 | Yelken bezi | `scene-texture` | albedo | `art-source/work/prompt-asset-019-ship-sail.txt` | **integrated** | `public/assets/textures/ship_sail_01_albedo_1024.webp` · 2026-08-14 · doku kontrastı zayıf/neredeyse düz beyaz doğru tespit edilmişti, yine de `PALETTE.sail` tonuyla çarpılarak kullanıldı · `src/world/ship.ts` `buildSailMaterial` |
| ASSET-020 | Halat / ağ | `scene-texture` | albedo + alpha | `art-source/work/prompt-asset-020-ship-rope.txt` | **integrated** | `public/assets/textures/ship_rope_01_albedo_512.webp` · 2026-08-14 · raw dosyada gerçek alpha yoktu (beyaz fon) — alpha-key'lendi (1024×644'e kırpıldı); yalnızca ağ yarısı offset/repeat ile kırpılıp kullanıldı (halat şeridi kullanılmadı) · `src/world/ship.ts` `netMat` (güverte üstü balıkçı ağı prop'u) |
| ASSET-021 | Gemi concept — teslim noktası | `reference` **[K]** | still | `art-source/work/prompt-asset-021-ship-concept.txt` | **accepted** | `art-source/ref/ship_concept_01_ref_1344.png` · 2026-08-14 · oyuna girmez, 3D agent'ın nişan aldığı hedef |

**Gemi sayısı — kapandı:** tek teslim gemisi + kıyıda 12 gemilik filo silüeti (`FLEET.count = 12`, `constants.ts`). `level-lotus-island.md` krokisi ve kod bunu doğruluyor. Key art bu varsayımla üretildi.

---

## P1 — Gökyüzü ve uzak

| ID | Ad | Sınıf | Kanal | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-022 | Altın saat gökyüzü (skybox) | `scene-texture` | albedo | `art-source/work/prompt-asset-022-sky-goldenhour.txt` | **integrated** | `public/assets/skybox/sky_goldenhour_01_albedo_2048.webp` · 2026-08-14 · `src/render/stage.ts` — ikinci sky sphere (radius 350, `BackSide`), gündüz→alacakaranlık geçişinde opaklığı 0→0.5 artan katman olarak prosedürel gradyanın üstüne biniyor; mevcut dinamik renk geçişi bozulmadı, `SKY_TEX.cloudMaxOpacity` |
| ASSET-023 | Uzak sisli tepe backdrop | `scene-texture` | albedo | `art-source/work/prompt-asset-023-hill-backdrop.txt` | **integrated** | `public/assets/skybox/hill_backdrop_01_albedo_2048.webp` · 2026-08-14 · ilk deneme 2:1 geçersiz aspect ile düştü, 21:9'a düzeltildi · üretimden kalma beyaz çerçeve kırpıldı (1536×672→1480×583), 2048 genişliğe ölçeklendi · `src/world/terrain.ts` `buildHillBackdropRing` (açık silindir + üst kenar solma shader'ı) uzak iki koni katmanının yerini aldı, yakın koni katmanı korundu, `SKY_TEX.hillDistance/Height/Repeat` |

---

## P1 — Karakter

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-024 | Doryseus yürüme döngüsü | `spritesheet` **[A]** | sheet | `art-source/work/prompt-asset-024-doryseus-walk.txt` | **generated** | `art-source/raw/char_doryseus_walk_clip_01.mp4` (Veo, 4s/16:9) · pipeline.md §5'in frame-extraction/quantize/temizlik hattı henüz yazılmadı — spritesheet'e dönüşmedi |
| ASSET-025 | Doryseus toplama hareketi | `spritesheet` **[A]** | sheet | `art-source/work/prompt-asset-025-doryseus-harvest.txt` | **generated** | `art-source/raw/char_doryseus_harvest_clip_01.mp4` (Veo, 4s/16:9) · aynı şekilde spritesheet hattı bekliyor |
| ASSET-026 | Doryseus teslim hareketi | `spritesheet` **[A]** | sheet | `art-source/work/prompt-asset-026-doryseus-deliver.txt` | **generated** | `art-source/raw/char_doryseus_deliver_clip_01.mp4` (Veo, 4s/16:9) · aynı şekilde spritesheet hattı bekliyor |
| ASSET-034 | Lotophagos figürü — ikram duruşu | `reference` **[K]** | still | `prompts/character-turnaround.md` | planned | 3 sessiz figür (`LOTOPHAGOS_COUNT`), elinde açık lotus uzatır. **MVP sonrası** (`game-concept.md` §12) |

---

## P2 — UI **[P]**

> **Unutuş göstergesi listede YOK ve olmayacak.** `docs/design/gdd-memory-system.md` §10: unutuşun barı/sayısı/yüzdesi yoktur, ölçek ekranın kendisidir (süt beyazı vinyet). Sahip'in brief'i "unutma göstergesi çerçevesi" istemişti; GDD bunu açıkça reddediyor ve tasarım otoritesi GDD'dir. **Sahip onayı gereken çelişki.**

| ID | Ad | Sınıf | Şablon | Durum | Not |
|---|---|---|---|---|---|
| ASSET-027 | Çanta ikonu + lotus yuvası | `ui` | `art-source/work/prompt-asset-027-029-ui-icons.txt` | **generated** | `art-source/raw/ui_icon_sheet_01.png` — 6 ikonluk tek sayfa (çanta/lotus/pusula/gem/gemi/çerçeve), **henüz kırpılmadı**, `public/assets/ui/`'ye taşınmadı |
| ASSET-028 | Güneş yayı + pusula oku | `ui` | `art-source/work/prompt-asset-027-029-ui-icons.txt` | **generated** | Aynı sayfadan kırpılacak (pusula oku) — **henüz kırpılmadı** |
| ASSET-029 | Teslim istemi çerçevesi + gemi işareti | `ui` | `art-source/work/prompt-asset-027-029-ui-icons.txt` | **generated** | Aynı sayfadan kırpılacak (çerçeve + gemi işareti) — **henüz kırpılmadı** |

---

## P2 — UI (menü kroması) — **YENİ, 2026-08-14** **[P]**

> Sahip'le kilitlenen karar: menü görsel dili **Zelda BOTW tarzı parşömen** (krem zemin, ince altın çizgi çerçeve, sade tipografi) + Hub'ın **illustre parşömen harita**'ya dönüşmesi (3 ada, noktalı rota). Kaynak: sahip'in görev talimatı, 2026-08-14. Palet art-bible §2'nin altın saat ailesinden (`#e8c98a`, `#c99a3c`, `#c8b49a`, `#f3d488`) çıkmıyor; mor/mavi/soğuk fantastik RPG klişesine kaçmıyor (art-bible §9 yasağı — "generic AI look", "doygun neon"). Kiklop illüstrasyonu bile art-bible'ın "ışık asla azalmaz" ilkesine uyuyor — mağara ağzı gölgeli/serin ama mor-neon kristal yok.
>
> **Bu turun Bash durumu:** bu oturumun Bash/kabuk aracı yok. Üç prompt dosyası hazır (`art-source/work/prompt-asset-035/036/037-*.txt`), aşağıdaki komutlar Bash erişimi olan tarafça (ana oturum ya da sahip) çalıştırılmalı. Çıktı `art-source/raw/`'a düşer, §8 kapısından geçirilip doğru klasöre taşınmalı, bu tablo ve `assets.csv` güncellenmeli.

| ID | Ad | Sınıf | Şablon / prompt dosyası | Durum | Komut | Hedef (§8 geçince) |
|---|---|---|---|---|---|---|
| ASSET-035 | Parşömen panel dokusu (menü paneli arkaplanı — Başlık/Nasıl oynanır/Hakkında ortak) | `ui` | `art-source/work/prompt-asset-035-parchment-panel.txt` | **accepted** | `public/assets/ui/ui_parchment_panel_01_albedo_1024.png` · 2026-08-14 · kod entegrasyonu (ui-programmer) bekliyor |
| ASSET-036 | İnce altın çizgi çerçeve (köşe motifli, panel kenarı) | `ui` | `art-source/work/prompt-asset-036-gold-frame.txt` | **accepted** | `public/assets/ui/ui_frame_gold_01_alpha_1024.png` · 2026-08-14 · alpha-key'lendi (düz gri zemin şeffaflaştırıldı), 9-slice/border-image olarak kullanılabilir |
| ASSET-037 | Hub harita sayfası — 3 ada yan yana (Lotus/Kiklop/Sirenler), tek illüstrasyon dili | `reference` | `art-source/work/prompt-asset-037-hub-map-islands.txt` | **accepted** | `art-source/ref/ui_hubmap_sheet_01_ref_2048.png` · 2026-08-14 · üç ada tek çizim dilinde, kırpıldı → ASSET-038/039/040 |
| ASSET-038 | Hub kartı — Lotus Adası ikonu | `ui` | ASSET-037'den kırpıldı | **accepted** | `public/assets/ui/ui_hubmap_lotus_01_albedo_512.png` · 2026-08-14 |
| ASSET-039 | Hub kartı — Kiklop Mağarası ikonu | `ui` | ASSET-037'den kırpıldı | **accepted** | `public/assets/ui/ui_hubmap_cyclops_01_albedo_512.png` · 2026-08-14 |
| ASSET-040 | Hub kartı — Sirenler Geçidi ikonu | `ui` | ASSET-037'den kırpıldı | **accepted** | `public/assets/ui/ui_hubmap_sirens_01_albedo_512.png` · 2026-08-14 |

**Rota/noktalı yol motifi — asset ÜRETİLMİYOR (bilinçli karar) [P]:** sahip'in görev talimatı üretmenin şart olmadığını, basit olanın kazanmasını söylüyor. 3 Hub kartını birleştiren noktalı rota, sabit bir kompozisyonda (3 kart + aralarında düz/hafif eğri bir çizgi) SVG `stroke-dasharray` veya CSS `border-style: dashed` ile **kodla** çözülebilecek kadar basit; ayrı bir Higgsfield/Gemini çıktısı gerektirmiyor (`asset-registry.md`'nin "Higgsfield'a GİTMEYEN kalemler" sınıfına düşüyor, aşağıdaki tabloya bkz.). Uygulama `ui-programmer`'ın işi.

### Kabul kriteri **[P]** — ASSET-035/036/037-040 seti

- [ ] Palet §2'nin altın saat ailesinde (`#e8c98a`, `#c99a3c`, `#c8b49a`, `#f3d488`, `#fdf3f0`) — mor/mavi/soğuk RPG tonu yok
- [ ] ASSET-035: kenarlar yıpranmış/hafif kıvrık ama **merkez metin okunacak kadar temiz/kontrastlı** — sahip'in "scrim azalacak, panel doku yeterince opak olsun" talebi
- [ ] ASSET-036: çerçeve ince, köşe motifleri sade — ağır "fantasy RPG gotik çerçeve" değil
- [ ] ASSET-037: üç ada **aynı çizim elinden** çıkmış hissi — aynı çizgi kalınlığı, aynı ışık yönü, aynı doygunluk
- [ ] Kiklop illüstrasyonu gölgeli/serin ama **mor-neon kristal yok**, mağara ağzı kapkaranlık değil (art-bible §1 "ışık asla azalmaz")
- [ ] Üçünde de ekranda metin/rakam/etiket yok
- [ ] Fotogerçekçi değil, logo/marka yok
- [ ] `assets.csv` satırı ve bu tablonun durumu üretim sonrası güncellenecek

---

## P2 — Medya **[K]**

| ID | Ad | Sınıf | Şablon | Durum | Not |
|---|---|---|---|---|---|
| ASSET-030 | Announce trailer (~12 sn, 16:9) | `media` | `art-source/work/prompt-asset-030-trailer.txt` | **accepted** | `art-source/media/trailer_announce_01.mp4` (Veo, 8s/16:9 — 12s/2:1 API'de geçersizdi, 8s/16:9'a düzeltildi) · 2026-08-14 · izlenip onaylanmalı, `media` sınıfı oyuna girmez |
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
