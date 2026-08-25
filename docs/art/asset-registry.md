# Asset kayıt defteri — Lotus Adası

> **Son güncelleme:** 2026-08-15 (Hub harita arkaplanı — storybook takımada konsepti, ASSET-052, `accepted`+entegre) · önceki: 2026-08-15 (Doryseus idle billboard ASSET-041..044) · önceki: 2026-08-14 (menü görsel yönü, ASSET-035..040) · **Durum:** Higgsfield hâlâ bağlı değil; tüm üretim Gemini API doğrudan yolla yapıldı — `scripts/gen-assets.mjs` (toplu tur + Veo video, `pipeline.md` §3) ve `scripts/gen-gemini-image.mjs` (tekil varyant üretimi, ASSET-001/002 varyant turları). P0 üçlüsü + 26/27 `planned` kalem üretildi (bkz. Özet ve "Üretim sırası" bölümü) — 20'si `public/assets/`'e taşınmış durumda, kod entegrasyonu (Three.js'e `TextureLoader` ile bağlanma) ayrı bir sonraki iş. Oyuncu karakterinin adı **Doryseus** (orijinal tasarım, Homeros'un Odysseus'u değil — sahip kararı 2026-08-14). **ASSET-035..040** (menü parşömen paneli + altın çerçeve + Hub illustre ada haritası) `planned` — bu turun art-director alt-ajanının Bash aracı yoktu, prompt dosyaları hazır, üretim bekliyor (bkz. P2 — UI (menü kroması) bölümü).
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
| `scene-mesh` **[P]** | Tripo image-to-3D GLB (`pipeline.md` §5.1) — dokusuz, motor ışıklar | `public/assets/models/` |
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

Üç ölçüte göre sıralandı: (1) koda **en hızlı ve düşük riskle entegre olan** (tek `TextureLoader` swap), (2) **oynanışı en çok destekleyen** (unutuş mekaniğini görselleştiren veya çekirdek okuma problemini çözen), (3) **düşük risk/yüksek etki**. Oynanabilir gövde 2026-08-21'den beri v3 Tripo rig (`char_doryseus_02_rig_8000.glb`). ASSET-041..044 idle stills kilit Tripo multiview kaynağı + mesh yüklenemezse billboard. 2D walk/run/harvest spritesheet'ler (ASSET-024 ailesi) 2026-08-21 silindi. ASSET-034 tasarım dokümanının kendisi tarafından **MVP sonrası** işaretlendiği için en sonda.

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
| 21 | ASSET-011 | Orta-uzak katman (sayfa; kırpılmaz) | `docs/art/prompts/flora-billboard.md` | isolated 053/054 tercih (2026-08-16) | — |
| 28 | ASSET-053 | Servi billboard | `docs/art/prompts/flora-billboard.md` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-053-cypress.txt --aspect 9:16 -o art-source/raw/flora_cypress_01_alpha.png` | `public/assets/textures/` |
| 29 | ASSET-054 | Zeytin billboard | `docs/art/prompts/flora-billboard.md` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-054-olive.txt --aspect 1:1 -o art-source/raw/flora_olive_01_alpha.png` | `public/assets/textures/` |
| 30 | ASSET-055 | Saz kümesi v2 | `docs/art/prompts/flora-billboard.md` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-055-reed.txt --aspect 1:1 -o art-source/raw/flora_reed_02_alpha.png` | `public/assets/textures/` |
| 31 | ASSET-056 | Ot tutamı | `docs/art/prompts/flora-billboard.md` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-056-grasstuft.txt --aspect 1:1 -o art-source/raw/flora_grasstuft_01_alpha.png` | `public/assets/textures/` |
| 32 | ASSET-057 | Tebeşir kaya billboard | `docs/art/prompts/flora-billboard.md` | `node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-057-chalk-boulder.txt --aspect 1:1 -o art-source/raw/rock_chalk_boulder_01_alpha.png` | `public/assets/textures/` (sahne dışı — zemin sızıntısı) |
| 22 | ASSET-030 | Veo bu oturumda doğrulandı; kendi kendine yeten teslim, kod entegrasyonu gerektirmiyor | `prompt-asset-030-trailer.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-030-trailer.txt --aspect 16:9 --seconds 12 -o art-source/raw/trailer_announce_01.mp4` | `art-source/media/` |
| 23 | ASSET-024 | Karakter animasyon hattı başlar (6 adım, pahalı) — en çok görülecek döngü önce | `prompt-asset-024-doryseus-walk.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-024-doryseus-walk.txt --aspect 1:1 --seconds 3 -o art-source/raw/char_doryseus_walk_clip_01.mp4` | `art-source/frames/` → … → `public/assets/spritesheets/` (§5) |
| 24 | ASSET-025 | Aynı hat, toplama hareketi — `HARVEST_HOLD` 1,2s'yi karşılamalı | `prompt-asset-025-doryseus-harvest.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-025-doryseus-harvest.txt --aspect 1:1 --seconds 3 -o art-source/raw/char_doryseus_harvest_clip_01.mp4` | `art-source/frames/` → … → `public/assets/spritesheets/` |
| 25 | ASSET-026 | Aynı hat, teslim hareketi | `prompt-asset-026-doryseus-deliver.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-026-doryseus-deliver.txt --aspect 1:1 --seconds 3 -o art-source/raw/char_doryseus_deliver_clip_01.mp4` | `art-source/frames/` → … → `public/assets/spritesheets/` |
| 26 | ASSET-008 | Aynı hat, lotus açma — lotus zaten billboard sprite olduğu için doğal sıradaki adım | `prompt-asset-008-lotus-open.txt` | `node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-008-lotus-open.txt --aspect 1:1 --seconds 2 -o art-source/raw/lotus_open_clip_01.mp4` | `art-source/frames/` → … → `public/assets/spritesheets/` |
| 27 | ASSET-034 | Tasarım dokümanı **MVP sonrası** diyor (`game-concept.md` §12) — üretimi ertelemek tasarım kararına uyar | `prompt-asset-034-lotophagos.txt` | *(bilerek ertelendi — bkz. dosyanın "HOLD" başlığı)* | `art-source/ref/` |

**Karakter render kararı (16–21 Ağu 2026, sahip):** oynanabilir gövde gerçek dokulu 3D mesh — v3 Tripo `char_doryseus_02_rig_8000.glb` (idle/walk/run/dig). ASSET-041..044 kilit stills (Tripo kaynağı). 2D locomotion spritesheet'ler 2026-08-21 silindi.

---

## P0 — Higgsfield erişimi gelince ilk üçü

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-001 | **Doryseus** turnaround | `reference` **[K]** | still, 4 açı | `prompts/character-turnaround.md` (Gemini §) / `art-source/work/prompt-asset-001-turnaround.txt` | **accepted** | **Sahip seçimi: varyant 04** → `public/assets/ref/char_odysseus_turnaround_01_ref_2048.png` · 1024×1024 · 2026-08-14. Lotus ASSET-002 ile aynı kural: sayfanın kendisi oyuna girmez (alpha yok, opak bej). **15 Ağu 2026:** kenar flood-fill + kırpma (`scripts/sheet-from-still.mjs`) → oyuna giren **ASSET-041..044**. Global chroma-key tuniki yer; `r−b` ayırıcı + kenardan flood. Elle temizlik hâlâ sahip kapısı. |
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
| ASSET-010 | Sazlık / kamış (billboard) | `scene-texture` | alpha | `art-source/work/prompt-asset-010-reed.txt` | **accepted** | v1 — 2026-08-16 sahnede **ASSET-055** ile değiştirildi; dosya diskte |
| ASSET-011 | Zeytin & servi sayfası | `scene-texture` | alpha | `docs/art/prompts/flora-billboard.md` | **generated** | 3'lü sayfa raw kayıptı. 2026-08-16 isolated **ASSET-053/054** üretildi (kırpma yerine). `public/assets/`'e taşınmadı |
| ASSET-053 | Servi (isolated still) | `scene-texture` | alpha | `docs/art/prompts/flora-billboard.md` | **generated** | Sahip 2026-08-16 ön plan kâğıt reddi. Sahneden çıktı; kod mesh. Dosya stil ref / image-to-3D kaynağı (`pipeline.md` §2.1–2.2) |
| ASSET-054 | Zeytin (isolated still) | `scene-texture` | alpha | `docs/art/prompts/flora-billboard.md` | **generated** | Aynı ret. `terrain.ts` InstancedMesh hacimli zeytin (icosahedron kanopi, düz gölge yok) |
| ASSET-055 | Saz kümesi v2 | `scene-texture` | alpha | `docs/art/prompts/flora-billboard.md` | **integrated** | `flora_reed_02_alpha_512.webp` · Gemini 2026-08-16 · `buildReedBeds` |
| ASSET-056 | Ot tutamı | `scene-texture` | alpha | `docs/art/prompts/flora-billboard.md` | **integrated** | `flora_grasstuft_01_alpha_512.webp` · Gemini 2026-08-16 · `buildGrassTufts` |
| ASSET-057 | Tebeşir kaya billboard | `scene-texture` | alpha | `docs/art/prompts/flora-billboard.md` | **generated** | `rock_chalk_boulder_01_alpha_512.webp` · stüdyo zemin kaya rengine yakın, sahneye girmedi |

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
| ASSET-033 | İç göl suyu (tatlı su) | `scene-texture` | normal | `art-source/work/prompt-asset-033-lake-water.txt` | **integrated** | `public/assets/textures/water_lake_01_normal_512.webp` · 2026-08-14 · **LOT-48 rebuild (17 Ağu):** okyanus yüzeyi artık shader plane değil; ASSET-077–079 Blender mesh. Bu normal göl yedeği olarak durur. |

**LOT-48 deniz kiti (17 Ağu 2026, sahip: shader su reddi → 3D model):** `scripts/blender/build_sea.py` · `src/world/sea.ts` InstancedMesh.

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-077 | Dalga kiremiti | `scene-mesh` **[P]** | GLB | `scripts/blender/build_sea.py` | **integrated** | `water_wave_01_mesh_800.glb` · 14 m sculpted chop, vertex colour §2 |
| ASSET-078 | Kıyı/gövde köpük dubası | `scene-mesh` **[P]** | GLB | `scripts/blender/build_sea.py` | **integrated** | `water_foamcrest_01_mesh_200.glb` · breaker lip |
| ASSET-079 | İç göl diski | `scene-mesh` **[P]** | GLB | `scripts/blender/build_sea.py` | **integrated** | `water_lagoon_01_mesh_400.glb` · durgun, köpüksüz |

---

## P1 — Gemi

| ID | Ad | Sınıf | Kanal | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-018 | Ağarmış gemi tahtası | `scene-texture` | albedo | `art-source/work/prompt-asset-018-ship-plank.txt` | **integrated** | `public/assets/textures/ship_plank_01_albedo_1024.webp` · 2026-08-14 · ilk deneme yanlış palette (mavi/camgöbeği) ile reddedildi, hex açıkça belirtilip yeniden üretildi · `src/world/ship.ts` `buildDeckMaterial` (güverte, yürüme tahtası, tüm filo — 12 gemi) |
| ASSET-019 | Yelken bezi | `scene-texture` | albedo | `art-source/work/prompt-asset-019-ship-sail.txt` | **integrated** | `public/assets/textures/ship_sail_01_albedo_1024.webp` · 2026-08-14 · doku kontrastı zayıf/neredeyse düz beyaz doğru tespit edilmişti, yine de `PALETTE.sail` tonuyla çarpılarak kullanıldı · `src/world/ship.ts` `buildSailMaterial` |
| ASSET-020 | Halat / ağ | `scene-texture` | albedo + alpha | `art-source/work/prompt-asset-020-ship-rope.txt` | **integrated** | `public/assets/textures/ship_rope_01_albedo_512.webp` · 2026-08-14 · raw dosyada gerçek alpha yoktu (beyaz fon) — alpha-key'lendi (1024×644'e kırpıldı); yalnızca ağ yarısı offset/repeat ile kırpılıp kullanıldı (halat şeridi kullanılmadı) · `src/world/ship.ts` `netMat` (güverte üstü balıkçı ağı prop'u) |
| ASSET-021 | Gemi concept — teslim noktası | `reference` **[K]** | still | `art-source/work/prompt-asset-021-ship-concept.txt` | **accepted** | `art-source/ref/ship_concept_01_ref_1344.png` · 2026-08-14 · oyuna girmez, 3D agent'ın nişan aldığı hedef |

**Gemi sayısı — LOT-52:** tek kahraman ev-kadırga (`ASSET-075`, `FLEET.count = 1`). On iki, güverte kilerindeki amforadır. Eski 12 gövdelik filo retired.

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
| ASSET-041 | Doryseus — ön idle | `scene-texture` | albedo (alpha) | ASSET-001'den kırpıldı | **integrated** | `public/assets/sprites/char_doryseus_front_01_albedo_512.png` · kilit Tripo multiview kaynağı + mesh yüklenemezse billboard |
| ASSET-042 | Doryseus — sağ profil idle | `scene-texture` | albedo (alpha) | ASSET-001'den kırpıldı | **integrated** | `char_doryseus_right_01_albedo_512.png` |
| ASSET-043 | Doryseus — sol profil idle | `scene-texture` | albedo (alpha) | ASSET-001'den kırpıldı | **integrated** | `char_doryseus_left_01_albedo_512.png` |
| ASSET-044 | Doryseus — sırt idle | `scene-texture` | albedo (alpha) | ASSET-001'den kırpıldı | **integrated** | `char_doryseus_back_01_albedo_512.png` |
| ASSET-058 | Doryseus — hacimli mesh (eski) | `scene-mesh` **[P]** | GLB | `prompts/doryseus-mesh-source.md` + ASSET-041..044 | **retired** | `char_doryseus_01_mesh_8000.glb` · silindi 2026-08-21, kodda hiç referansı yoktu, `char_doryseus_02_textured_8000.glb` (`SAILOR.mesh`) yerini aldı |
| ASSET-059 | Doryseus — rig + yürüyüş (eski) | `scene-mesh` **[P]** | GLB | ASSET-058 + Tripo retarget | **retired** | `char_doryseus_01_rig_8000.glb` · silindi 2026-08-21, kodda hiç referansı yoktu, `char_doryseus_02_rig_8000.glb` yerini aldı |
| ASSET-024 / 045 / 046 / 047 / 048 / 049 / 050 / 051 / 025 | Doryseus 2D walk/run/harvest sheets | `spritesheet` | sheet | Veo → spritesheet | **retired** 2026-08-21 | Sahip: yalnız v3 Tripo gövde. Sheet dosyaları silindi; lokomasyon `char_doryseus_02_rig_8000.glb` (`preset:idle/walk/run/biped:dig`). Billboard fallback artık ASSET-041..044 idle stills. |
| ASSET-026 | Doryseus teslim hareketi | `spritesheet` **[A]** | sheet | `art-source/work/prompt-asset-026-doryseus-deliver.txt` | **generated** | `art-source/raw/char_doryseus_deliver_clip_01.mp4` — 2D sheet üretilmedi; jest GLB de 2026-08-21 silindi |
| ASSET-034 | Lotophagos figürü — ikram duruşu | `reference` **[K]** | still | `prompts/character-turnaround.md` | planned | 3 sessiz figür (`LOTOPHAGOS_COUNT`), elinde açık lotus uzatır. **MVP sonrası** (`game-concept.md` §12) |

---

## P3 — Ambient yaratıklar (yeni, 2026-08-17) **[P]**

> Sahip brifi (17 Ağu 2026): adada dolaşan, tamamen **ambient/süs** (oyuncuyla hiçbir mekanik etkileşimi yok — temas, toplama, unutuş sistemlerinin hiçbiri bu yaratığı okumaz/ondan etkilenmez) küçük mitolojik yaratıklar; iki hareket (yürüme + tavşan-sıçraması). **`docs/design/gdd-lotus-hallucination.md`'deki sanrı figürleriyle karıştırılmamalı** — o aile süt beyazı/yarı-saydam/`#f6f2ea`, yalnız yüksek unutuşta belirir, temas cezası var; bu aile sıcak/opak/her zaman sahnede, sıfır mekanik etki. Ayrıntılı görsel brif ve prompt gövdesi: `@iris` konsültasyon çıktısı (bu satırın kaynağı), tam metin ana oturumun elinde. **Kimlik: "Thallope"** (sahip onayladı, 17 Ağu 2026) — orijinal icat (Homeros'ta yok), lotus-tomurcuğu tüyü + tavşan kulaklı, küçük bir geyik yavrusu/tavşan melezi ada ruhu; adanın "cazibe" kaydını taşır (art-bible §1), unutuş/sis ailesinin görsel zıddı.
>
> **İsimlendirme kategorisi: `creature`** (sahip onayladı, 17 Ağu 2026 — `pipeline.md` §6 kategori sözlüğüne eklendi, `char`'dan ayrı: oynanan/hikâye karakteri değil, ambient yaban hayatı).
>
> **Üretim durumu (17 Ağu 2026, Cursor/@byte, LOT-39):** mesh + Rigify `walk`+`hop` §8'in ölçülebilir yarısından geçirildi, `public/assets/`'e kopyalandı, `assets.csv` satırları yazıldı, `src/world/thallope.ts` ile Lotus Adası'na ambient spawn olarak bağlandı. İnsan yarısı (NOT photoreal / IP temiz / unutuş texture'da yok) sahip "geç ve oyuna alalım" onayıyla kapandı. **Bilinen v1 sınırı:** bazı karelerde ayaklar yana dönük (kemik `roll`, LOT-34) — düzeltilmedi.

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-060 | Thallope — 3/4 stüdyo still, image-to-3D kaynağı | `reference` **[P]** | still, tek nesne | `docs/art/prompts/meshy-source-still.md` | **accepted** | `public/assets/ref/creature_thallope_01_ref_1024.png` — `_ref_` oyuna girmez. 3/4 stüdyo `#aea49a`. Palet: `#cfd8b8` / `#f6a8bc` / `#ffcf80` (art-bible §2). |
| ASSET-061 | Thallope — hacimli mesh + yürüme/sıçrama rig | `scene-mesh` **[P]** | GLB | ASSET-060 + Tripo image-to-3D (`pipeline.md` §5.1) + Blender MCP/Rigify | **integrated** | `public/assets/models/creature_thallope_01_mesh_4000.glb` + `src/world/thallope.ts`. Tripo mesh 4.778 üçgen; Rigify `basic_quadruped`; klipler `walk` (1.04s) + `hop` (0.71s). Dokusuz — `tintGltf(PALETTE.thallope)`. 670 KB (400 KB `models/` tavanının üstünde, Rigify 283 kemik + klipler). **v1:** ayak yaw (LOT-34). |

---

## P4 — Ada içi hacim kiti (LOT-28, 2026-08-17) **[P]**

> Sahip (17 Ağu): çim, taş, sazlık ve adada her yerde kullanılan tekrarlı prop'lar **Blender'da** tasarlanır — Tripo still değil. Kaynak: `scripts/blender/build_island_kit.py` (seed `20260817`). Vertex colour = art-bible §2 yerel renk; ışık motordan. Billboard ağaç (ASSET-053/054) sahneye dönmez. Deniz shader (G6) bu kitte yok.
>
> **ID notu:** ASSET-062/063 csv'de Doryseus `char_doryseus_02_*` — bu kit 068'den başlar.

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-068 | Tebeşir kaya (boulder) | `scene-mesh` **[P]** | GLB | `scripts/blender/build_island_kit.py` | **integrated** | `rock_chalk_boulder_01_mesh_800.glb` · kıyı + iç ada. Tint yok, vertex colour `#e6e2d4`/`#b9b6ab`. |
| ASSET-069 | Tebeşir çakıl (pebble) | `scene-mesh` **[P]** | GLB | aynı | **integrated** | `rock_chalk_pebble_01_mesh_400.glb` · göl kenarı. |
| ASSET-070 | Ot tutamı (hacim) | `scene-mesh` **[P]** | GLB | aynı | **integrated** | `flora_grasstuft_01_mesh_600.glb` · ada çim zemini, bilek hizası InstancedMesh carpet + ASSET-032 albedo. |
| ASSET-071 | Saz kümesi (hacim) | `scene-mesh` **[P]** | GLB | aynı | **integrated** | `flora_reed_01_mesh_900.glb` · ASSET-055 billboard fallback. |
| ASSET-072 | Zeytin (hacim) | `scene-mesh` **[P]** | GLB | aynı | **integrated** | `flora_olive_01_mesh_2000.glb` · kod mesh fallback. |
| ASSET-073 | Servi (hacim) | `scene-mesh` **[P]** | GLB | aynı | **integrated** | `flora_cypress_01_mesh_1800.glb` · kod mesh fallback. |

Eski planned ASSET-062–067 (Tripo 3/4 still) **iptal** — ID çakışması + sahip Blender kararı. Prompt dosyaları `docs/art/prompts/island-*-mesh-source.md` stil referansı olarak durur, üretim yolu değildir.

## P5 — Güneş tanrısı (LOT-50, 2026-08-17) **[P]**

> Sahip: seçenek 1, tasarımsal baş+12 ışın. Blender kanon. Tripo yalnızca tasarlanmış ön-yüz still yetmezse.

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-074 | Helios baş silüeti | `scene-mesh` **[P]** | GLB | `scripts/blender/build_sun_god.py` | **integrated** | `sky_sungod_01_mesh_1200.glb` · 12 kite ışın, vertex colour `#fff6d0`/`#ffcf80`. `src/render/sunDisk.ts`. Still: `art-source/ref/sky_sungod_01_ref_1024.png` (oyuna girmez). |

## P6 — Kahraman ev-gövde (LOT-52, 2026-08-17) **[P]**

> Sahip: tek büyük tarihi ev-kadırga, her adada aynı. Filo yok. 12 amfora = koşu kileri. Spec: `docs/art/specs/lot-52-hero-home-hull.md`.
> Üretim (sahip, 17 Ağu akşam): Blender v0 yeterince görkemli değil → **Gemini still → Tripo mesh**.

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-075 | Kahraman gemi — 3/4 still | `reference` **[P]** | still | `docs/art/prompts/ship-hero-mesh-source.md` | **accepted** | `public/assets/ref/ship_hero_03_ref_1344.png` — Gemini 3-pro-image, v2 gövde image-edit, kabarık Wedjat + runik oyma. v1 holkas / v2 düz Yunan gözü elendi. `_ref_` oyuna girmez. |
| ASSET-076 | Kahraman ev-kadırga mesh | `scene-mesh` **[P]** | GLB | ASSET-075 + Tripo image-to-3D | **integrated** | `ship_hero_03_mesh_8000.glb` · H3.1, 8000 face, **dokulu** (lazuli göz), `src/world/ship.ts` 14 m. v2 dokusuz ve Blender v0 yedek. |

---

## P7 — Ada donatım katmanı (LOT-53, 2026-08-17) **[P]**

> Sahip brifi (17 Ağu 2026): "tüm lotus adasının ve küçük adanın mapping'ini yap … belli belirsiz patikalar, birkaç farklı yerde gölet, göletin kenarlarında kurbağalar … şu anda gözüme boş geliyor."
> Yerleşim/rota kararları ve gerekçeleri: `docs/design/level-lotus-island.md` §8. Sayılar: `src/constants.ts` → `PONDS` / `PATHS` / `FROGS`.
>
> **Üretim notu — dış pipeline kullanılmadı.** Bu setin tamamı **kod içi prosedürel** (Three.js primitifleri + mevcut `PALETTE`) ya da **mevcut dokuların yeniden kullanımı**dır. Tripo / Hyper3D / Higgsfield / PolyHaven / Sketchfab'a **hiç gidilmedi**, `public/assets/` altına **tek bir yeni dosya eklenmedi**, üretim kredisi harcanmadı. Sahibin 17 Ağu ek kısıtı ("yeni asset üretiminden önce referans görselleri onaya sun") bu yüzden tetiklenmedi — onay gerektiren adım hiç oluşmadı. Kurbağa ileride gerçek bir mesh'e yükseltilecekse, o **yeni bir kalem** olur ve önce referans-onay akışından geçer.
>
> **Palet:** yeni renk ailesi **yok.** Kurbağa sırtı mevcut servi/zeytin yeşili çiftinden, karnı `petalBud` kreminden, gözü Thallope'un göz koyusundan türetildi (`PALETTE.frog*`). Patika "sıkışmış toprak" rengi, mevcut kuru-kum albedo'sunun daha koyu/soluk tonlanmışıdır (`PATHS.tint`) — art-bible §2 kum ailesinin içinde.

| ID | Ad | Sınıf | Tip | Şablon | Durum | Not |
|---|---|---|---|---|---|---|
| ASSET-080 | Golet suyu + havza | `scene-mesh` | prosedürel (kod) | `src/world/ponds.ts` | **integrated** | Dalgalı `ShapeGeometry` diski, 64 segment, `PALETTE.lagoon`. Havza `heightAt()`'e `pondBasinAt()` terimi olarak giriyor. Disk yarıçapı çözülen su hattından (`WATERLINE_RATIO`) türetiliyor — çukur yarıçapından değil (ilk sürüm kıyıda havada kalıp poligon kenarı gösteriyordu). Kıyıda ASSET-071 saz + ASSET-069 çakıl + ASSET-034 nilüfer yaprağı yeniden kullanılıyor. |
| ASSET-081 | Belli belirsiz patika maskesi | `scene-texture` | prosedürel (runtime `DataTexture`) | `src/world/paths.ts` | **integrated** | Tek kanallı, `real` 1024² (0,375 m/texel), `test` 512². Bake 22 ms, texel'lerin %3,2'si dolu. Zemin shader'ında tek `texture2D` fetch. Doku **dosyası yok** — her açılışta rotalardan üretiliyor, bu yüzden ada şekli değişince patika da değişiyor. |
| ASSET-082 | Kurbağa (ambient fauna) | `creature` | prosedürel (kod mesh) | `src/world/frogs.ts` | **integrated** | ~150 üçgen, merged + `InstancedMesh`, vertex colour. Gövde/burun/göz kubbeleri/katlı arka bacak. `real` ~37 adet. Hareket `t`'nin saf fonksiyonu (hash'lenmiş sıçrama indeksi) — durum yok, sapma yok. **Sanrı figürü DEĞİL:** collider yok, temas testi yok, hiçbir mekanik etki yok (Thallope ile aynı katman). |

---

## P8 — Kiklop Mağarası (2. durak) — konsept turu **YENİ, 2026-08-25** **[P]**

> Sahip kararı **D11** (25 Ağu 2026, `docs/art/art-bible.md` §9 istisna kutusu): Kiklop Mağarası kasıtlı korku dili konuşuyor, karartma/karanlık-tehdit yasağı **yalnız bu durakta** açık. **Bu, satır 298'deki eski P2-UI kabul kriterini ("mağara ağzı kapkaranlık değil") geçersiz kılmaz** — o kriter, zaten kilitlenmiş/shipped küçük Hub-kartı madalyonuna (ASSET-039, 512 px ikon, 14 Ağu 2026) özgüdür ve Hub'ın üç ada için ortak, tarafsız çizim diline bağlıdır; D11'in kapsamı **durağın kendi sahne/level konseptleri** (bu bölüm), Hub ikonuna otomatik yayılmaz. Hub ikonunun D11 ışığında yeniden üretilip üretilmeyeceği ayrı, henüz sorulmamış bir soru.
>
> Tam konsolide plan: `docs/production/cyclops-cave-production-plan.md` §4.2 (asset listesi/ID envanteri) ve §4.4 (Polyphemos gerekçesi). Mekanik otorite: `docs/design/gdd-cyclops-blinding.md`.

| ID | Ad | Sınıf | Şablon / prompt dosyası | Durum | Not |
|---|---|---|---|---|---|
| ASSET-104 | Mağara ağzı — sahne konsepti (ada dış görünüşü + eşik) | `reference` | `art-source/work/prompt-asset-104-cyclops-cave-mouth.txt` (round 1, gün ışığı ağırlıklı — **kilitlenen varyant bu turdan**) + `art-source/work/prompt-asset-104-cyclops-cave-mouth-v2-dark.txt` (round 2, sahip "biraz daha dark" geri bildirimi — denendi, elendi, aşağıya bkz.) | **accepted** | Sahip seçimi (iki tur revizyon sonrası, 2026-08-25): round 1 varyant 02 → `art-source/ref/scene_cyclops_cave_mouth_01_ref_1344.png` · `gemini-2.5-flash-image` · seed none · 16:9 · 1344×768. **Karar gerekçesi — sahip'in kendi önerisi:** dışarıyı adanın geri kalanıyla (Lotus/Hub'ın altın-saat ailesi) aynı sıcak/güneşli dilde tutup "korku bütçesi"ni bilerek **içeri** (ASSET-105/106/107 — Depo/Ağıllar/İç nöy) sakla; kontrast tekniği (parlak dış + tek karanlık delik) korunuyor, kurşuni/ağır gökyüzü denemesi (round 2, varyant 04) bu yüzden geri çekildi — bütün dış sahneyi karartmak yerine iç mekan konseptleri **round 2'den daha da karanlığa** çekilecek. Round 1'in 3 varyantından biri (01) ayrıca elendi — mağara karşı taraftan ışık sızan kısa bir tünel gibi çıkmıştı, `level-cyclops-cave.md`'nin 170 m'lik çok-odalı, çıkışsız derinliğiyle çelişiyordu. Bu sahne `ASSET-090/091/097/101`'in görsel referansı (`cyclops-cave-production-plan.md` §4.2). **Sonraki sahnelerin (ASSET-105-107) ton hedefi:** round 2'nin (04/05/06) kurşuni/soğuk yoğunluğu artık dış mekan değil, iç mekan taban çizgisi — oda konseptleri bunun bir kademe daha koyusundan başlamalı. |

### Kabul kriteri **[P]** — ASSET-104

- [x] Dışarısı (koy/patika, D<0) gün ışığı, kroki (`level-cyclops-cave.md` §1.4) ile tutarlı — kayalık/kum/deniz paleti art-bible §2'den
- [x] Mağara eşiği (D=0-8) aydınlık, ama iç derinlik okunaklı bir karanlığa gömülüyor — **karartma burada bilinçli** (D11 istisnası)
- [x] Mor-kristal/fener/bataklık paleti yok — karanlık Ege kayasının ve ocak kehribarının karanlığı (art-bible §9 Kiklop kutusu)
- [x] Fotogerçekçi değil, logo/marka yok
- [ ] `assets.csv` satırı — bkz. §7 (bu satır henüz eklenmedi, `class=reference` olduğu için oyuna girmiyor, satır zorunlu değilse atlanabilir — `art-director` teyit etsin)

| ASSET-105 | Depo (antişambr) — sahne konsepti, oda + Boğaz A eşiği | `reference` | `art-source/work/prompt-asset-105-cyclops-depot.txt` (round 1) → `-v2-detailed.txt` (round 2, sahip "daha detaylı + daha kasvetli" geri bildirimi) → `-v3-chamber.txt` (round 3, sahip "odalar/bölmeler nerede" geri bildirimi — **kilitlenen varyant bu turdan**) | **accepted** | Sahip seçimi (üç tur revizyon, 2026-08-25): round 3 varyant 07 → `art-source/ref/scene_cyclops_depot_01_ref_1344.png` · `gemini-2.5-flash-image` · seed none · 16:9 · 1344×768. **İterasyon geçmişi:** round 1 (temel kehribar-eşik/karanlık-derinlik kompozisyonu) kabul edilebilirdi ama sahip daha fazla somut detay istedi (round 2 — ip/peynir/tulum/sepet/testi/niş eklendi, oda daha kasvetli/yoğun karartıldı). Round 1/2'nin **ikisinde de** ortak bir hata vardı: oda sonsuz bir tünel gibi karanlığa akıp gidiyordu, `level-cyclops-cave.md`'nin kroki'sindeki **Depo (12 m) → Boğaz A (4 m) daralması**'nı (dar geçit, görüş kesen bir "boğaz") hiç göstermiyordu — sahip bunu yakaladı. Round 3 bunu düzeltti: oda artık net sınırlı bir hacim, sona doğru belirgin şekilde daralıp küçük, kapkaranlık bir kemere/eşiğe (Boğaz A) bağlanıyor — kemerin içi hâlâ tam karanlık (ötesi gösterilmiyor), sadece kehribar bir çerçeveyle vurgulanıyor. Round 3'ün 3 varyantından ikisi (08 en karanlık/en az okunaklı, 09 07'ye çok yakın) elendi; 07 detay okunabilirliği ile karanlık dengesini en iyi tutan seçildi. Bu sahne `ASSET-091/092/102`'nin görsel referansı (`cyclops-cave-production-plan.md` §4.2). |

### Kabul kriteri **[P]** — ASSET-105

- [x] Oda net sınırlı bir hacim (12 m × 4 m kroki ölçüsüyle tutarlı okunuyor), sonsuz tünel değil
- [x] Sona doğru **Boğaz A'ya belirgin daralma** — dar/kapkaranlık bir kemer/eşik, kroki'nin 12→4 m geçişiyle tutarlı
- [x] Tek ışık kaynağı (mağara ağzının kehribar kuyruğu) — ikinci/rakip bir ışık lekesi yok (round 1/2'de bazı varyantlarda vardı, bilerek elendi)
- [x] Kapı-kapalı durumda hiç yerel ışık kaynağı olmaması (ASSET-102'nin gerekçesi) görselde ima ediliyor — oda ışıksız kaldığında neredeyse tam karanlık olacağı okunuyor
- [x] Mor-kristal/fener/bataklık paleti yok, Ege kayası + ocak kehribarı ailesinde
- [x] Yeterince somut detay (propların ayrı ayrı seçilebilir olması) — bu bir "inşa edilebilir referans", salt mood painting değil
- [x] Fotogerçekçi değil, logo/marka yok
- [ ] `assets.csv` satırı — ASSET-104 ile aynı gerekçeyle beklemede

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
| ASSET-052 *(yeni, 15 Ağu 2026)* | Hub harita **arkaplanı** — tam kadraj takımada illüstrasyonu + zeytin/defne yaprağı altın-varak çerçeve tek parçada (sahip brief: Hub "daha interaktif, görsel olarak harika" olsun, 15 Ağu; 3 alternatif konsept sunuldu — chart/storybook/atlas, sahip **storybook**'u seçti). `.hub-map`'in ASSET-035+036 (düz parşömen + ayrı ince çerçeve) kombinasyonunun yerini alıyor; ASSET-037/038/039/040 (ada madalyonları) **değişmedi**, yeni arkaplanın üstünde aynen duruyor. | `ui` | `art-source/work/prompt-hub-concept-b-storybook.txt` | **accepted** | `public/assets/ui/ui_hubmap_storybook_01_albedo_1344.webp` · gemini-2.5-flash-image · seed none · 16:9 (üretildi) → CSS'te 16:10 `cover` · 1344 · 2026-08-15 · sahip onayı 2026-08-15 · kod entegre edildi (`src/ui/hud.css` `.hub-map.parchment-panel::before/::after`) · **not:** madalyon etiket/rozet metinleri yeni arkaplanla düşük kontrasta düştüğü için `.hub-island-name`/`.hub-quest-name`'e krem hâle (text-shadow) + rozet pilleri opaklaştırıldı (screens.md §3.5 kontrast gereksinimi) |

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

## Audio beds **[P]**

Mixkit Stock Music Free License (atıf zorunlu değil). Oyuna `src/systems/audio.ts` bağlar; Title/Hub `menu`, ada `play`, bitiş kartları sessiz. Teslim fanfarı değil (`gdd-lotus-collection.md` §9).

| ID | Ad | Sınıf | Kaynak | Durum | Not |
|---|---|---|---|---|---|
| ASSET-088 | Title/Hub tema | `scene-audio` | Mixkit *Valley Sunset* (Alejandro Magaña) | **integrated** | `public/assets/audio/fx_musictitle_01_loop_256.mp3` — 48 s fade-loop, 48 kbps |
| ASSET-089 | Ada atmosfer (mistik/chill) | `scene-audio` | Mixkit *Forest Mist Whispers* (Alejandro Magaña) | **integrated** | `public/assets/audio/fx_musicplay_01_loop_256.mp3` — 48 s dilim; unutuş `setHaze` lowpass'inden geçer |
