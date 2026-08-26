# Kiklop Mağarası — asset üretim planı (2. durak)

> **Durum:** taslak — sahip onayı bekliyor. **Commit edilmedi.**
> **Tarih:** 2026-08-26 · `producer` / `@nile`, alt-danışma: `@axiom` (Technical Director), `@cove` (Island Designer)
> **Tur türü:** planlama. **Kod yazılmadı, asset üretilmedi, kredi harcanmadı.** Tek çalıştırılan komut salt-okuma (`node scripts/asset-qa/run.mjs --only budget`).
> **Tetikleyen:** sahip, 26 Ağu 2026 — *"tam asset üretimine geç, plan çıkar. planin icerisinde sahil ve o yokus koyunlu patika da yer alsin onun tasarim referans cizimlerini kitlemedik"*

## Bu doküman ne, ne değil

`docs/production/cyclops-cave-production-plan.md` (873 satır, 24-25 Ağu) bu durağın **kapsam ve karar** dokümanıdır — asset kimliklerini (ASSET-090…108), zorunlu Gemini onay kapısını (§4.2) ve Polyphemos'un P-C kararını orada kurduk. **O doküman geçerli, bu onu değiştirmiyor.**

Bu doküman onun **üretim/sıralama** tarafıdır: mekanik bittikten *sonra* hangi asset hangi sırayla, hangi maliyetle, hangi ölçülebilir "bitti" kriteriyle üretilecek. İkisi çeliştiğinde: karar/kapsam için o dosya, sıra/maliyet/kriter için bu dosya.

**Disiplin notu (25 Ağu, sahibin eleştirisi — `implementation-spec-sprint1.md`):** planlama turlarının hiç doğrulama yapmadan sayı kilitlemesi kabul edilmedi. Bu dokümandaki her üretim adımının **somut, ölçülebilir bir "bitti" kriteri** var ve §0'daki durum tespiti **ölçülerek** yapıldı, hatırlanarak değil.

---

## 0. Nerede duruyoruz — ölçülmüş durum

Mekanik taraf bitti ve iterasyondan geçti (K1–K13, 25–26 Ağu): kapı döngüsü, DETECT, toplama/teslim, ezilme + `CYCLOPS_CRUSH_CAP`, KAYBETTIN ekranı, dash/sürünme, devin rage/telgraf saldırısı. Hepsi `__CYCLOPS_DEBUG__` ile doğrulandı ve push'landı.

**Görsel taraf ise neredeyse tamamen placeholder.** `src/world/cyclopsCave.ts` + `src/stops/cyclopsStop.ts` okunarak çıkarılan gerçek envanter:

| Kalem | Şu anki hâli | Hedef |
|---|---|---|
| Mağara kabuğu (4 oda + 2 boğaz + ağız) | 7 adet `BoxGeometry`, `BackSide`, tek PolyHaven kaya dokusu tile'lı | ASSET-090 — gerçek kaya kabuğu |
| Duvar/zemin dokusu | ASSET-091, **PLAYER/GEÇİCİ** — PolyHaven "Worn Rock Natural 01" (CC0), art-bible beyazına doğru tint'li (`0xd8d0bc`) | ASSET-091/092 — oda konseptlerinden türeyen gerçek doku |
| Zemin | tüm D −20…65'i kaplayan **tek** `PlaneGeometry` — sahil ile mağara aynı düzlem, aynı doku | Ayrı dış/iç malzeme |
| Polyphemos | ASSET-092, Sketchfab CC-BY statik mesh, **hiç animasyon klibi yok**; sadece prosedürel yön dönüşü + stomp bob'u | ASSET-098 — gerçek rig + klip seti |
| Gizlenme girintileri | Gerçek geometri (kaya çıkıntısı / duvar oyuğu), oturum başına rastgele | Görsel olarak yeterli; **fiziksel giriş yok** (§6) |
| Azık propları | Kod mesh — silindir (peynir) + ölçekli küre (tulum) | ASSET-093/094 — konsept + doku |
| Ocak / meşale | `PointLight` + küçük parlak küre | ASSET-096 — kor parçacığı |
| Ağıl / kuzu-keçi dekoru | **Hiç yok** | ASSET-095 — prosedürel kod mesh |
| Koca kaya (kapı) | **Hiç görünür geometri yok** — kapı yalnız mantıksal bir durum | ASSET-097 |
| Koy (`cove`, D −20…−8) | `halfWidth: Infinity`, **hiç geometri kurulmuyor**, açık boşluk | §4 |
| Patika (`path`, D −8…0) | Düz kutu duvar, 6 m geniş, **düz zemin (y=0), hiç yokuş yok** | §4 |
| Koyunlar | ASSET-093 (CC-BY), 4 statik kopya, sabit koordinat, rig yok | §4 |
| Ses | **Hiç yok** — bu durakta tek ses çalmıyor | §5 |

**Kapıdan geçmiş olanlar (bitti, tekrar üretilmeyecek):** ASSET-104 (mağara ağzı) · ASSET-105 (depo) · ASSET-106 (ağıllar/ocak) · ASSET-107 (iç nöy) — dördü de Gemini konsept turundan geçti, sahip birer varyant kilitledi, `art-source/ref/`'te duruyor, `asset-registry.md`'de gerekçeleriyle kayıtlı. **Bunlar ASSET-090/091/092'nin görsel referansı — üretim bunlara bakarak yapılacak, sıfırdan yorum yapılmayacak.**

**Kapıdan HİÇ geçmemiş olan:** koy + patika (dış mekan). Sahibin bu turdaki isteğinin tam çekirdeği — §4.

---

## 1. Ölçülen bütçe gerçeği — bu, üretimi baştan kısıtlıyor

`node scripts/asset-qa/run.mjs --only budget` (26 Ağu, bu tur):

```
shipped total 31.35 MB / 8.00 MB
by folder: models=23.96 MB  textures=3.72 MB  ref=3.59 MB  ui=3.10 MB  audio=564 KB
```

**Sevk edilen toplam bütçenin ~4 katında.** Kontrol yine de `PASS` veriyor, çünkü `budget/total-download` bulgusu `baseline.json`'da "kabul edildi" olarak işaretli — yani kapı kapalı değil, **kapı devre dışı bırakılmış**. `pipeline.md` §6'nın `models/` başına 400 KB sınırını 9 GLB ihlal ediyor; ASSET-092 (Polyphemos, 3.07 MB) ve ASSET-093 (koyun, 637 KB) **baseline'da yok**, yani yeni bulgu olarak listeleniyorlar.

Bu bir "sonra bakarız" kalemi değil: bu planın en pahalı iki kalemi (gerçek mağara kabuğu + gerçek Polyphemos rig'i) tam olarak `models/` ve `textures/` klasörlerine yazacak.

### Adım 0 — bedava temizlik (sıfır sanat maliyeti, ilk yapılacak iş)

`public/assets/models/` içindeki her GLB'nin `src/` referansı sayıldı. **Hiç `src/` referansı olmayan 4 dosya, toplam 9,44 MB:**

| Dosya | Boyut | Git durumu | Not |
|---|---|---|---|
| `char_doryseus_07_mixamo_8000.glb` | 6,26 MB | **untracked** | Mixamo denemesi, koda hiç bağlanmadı |
| `char_doryseus_konfuse_smart_5000.glb` | 1,27 MB | tracked | ASSET-086, `_rig_` varyantının provenance'ı |
| `char_doryseus_08_rig_5000.glb` | 991 KB | **untracked** | `_clean6_` ile **birebir aynı boyut** — muhtemel kopya |
| `char_doryseus_08_smart_5000.glb` | 534 KB | **untracked** | ASSET-085'in provenance'ı |

**Ayrıca bulundu — `CLAUDE.md`'de eski bir bilgi var, düzeltilmeli.** `CLAUDE.md` `char_doryseus_02_textured_8000.glb` (5,70 MB) için *"unrigged provenance only, not loaded by any code"* diyor. **Bu doğru değil:** `src/world/sailor.ts:74-89`'daki `mountTextured()` bu dosyayı gerçekten `loadGltf` ediyor ve satır 118'de **çağrılıyor** — rig yüklemesi başarısız olursa devreye giren `catch` yedeği olarak. Yani silinemez, silinirse Doryseus'un tek fallback'i gider.

> **Öneri (silmek yerine):** fallback hedefini `char_doryseus_08_smart_5000.glb`'ye (546 KB, aynı v08 ailesi, mevcut rig'in rig'siz eşi) çevirmek — **5,70 MB → 546 KB**, fallback davranışı korunur, üstelik fallback artık canlı rig'le *aynı* karakter modelini gösterir (bugün v02'ye, eski bir gövdeye düşüyor). Bu bir `gameplay-programmer` dokunuşu, tek satır sabit değişikliği + doğrulama. 🔬 v08 smart mesh'in `fitGltfHeight` ile doğru oturduğu test edilmeli.

**"Bitti" kriteri:** `--only budget` çıktısında `models=` satırı **23,96 MB → ≤14,5 MB** (fallback de değişirse ≤9,3 MB); `npx tsc --noEmit` + `npm run build` temiz; oyun (Lotus **ve** Kiklop) hâlâ açılıyor; Doryseus fallback yolu bilerek bozulmuş bir rig yoluyla bir kez test edilmiş.

> **Ölçüm notu, dürüstlük için:** 31,35 MB **barındırılan** (`public/assets/` diskteki) toplamdır — tek bir oyuncunun indirdiği miktar değil. `asset-qa`'nın bütçe kontrolü diski ölçüyor. Gerçek oyuncu indirmesi bunun çok altında; yine de kapı bu sayıya bakıyor ve yeni asset'ler doğrudan buraya yazacak.
**Maliyet:** 0 kredi, ~0,25 oturum. **Bu adım diğer her şeyden önce yapılmalı** — yoksa yeni asset'lerin bütçe etkisi zaten kırmızı bir zeminde ölçülemez.

> ⚠️ **Bu dosyalar başka oturumların (Cursor/Grok) ürünü.** Silmeden önce `ACTIVE_WORK.md` claim'i + sahip onayı gerekir — özellikle üçü untracked olduğu için `git checkout` ile geri gelmezler. **Öneri: silmek yerine `art-source/work/`'e taşımak** (git'e girmez, `public/assets/` bütçesinden çıkar, kaybolmaz).

---

## 2. Mağara iç geometrisi — ASSET-090 / 091 / 092

### 2.0 Elimizde ne var — konsept kapısı bu kalem için ZATEN geçildi

Bu, planın en rahat kalemi: dört oda konsepti sahip tarafından kilitlendi ve dosyalar diskte doğrulandı.

| Konsept | Dosya (`art-source/ref/`) | Neyin referansı |
|---|---|---|
| ASSET-104 mağara ağzı | `scene_cyclops_cave_mouth_01_ref_1344.png` | ASSET-090 / 091 / 097 / 101 |
| ASSET-105 depo | `scene_cyclops_depot_01_ref_1344.png` | ASSET-091 / 092 / 102 |
| ASSET-106 ağıllar-ocak | `scene_cyclops_pens_hearth_01_ref_1344.png` | ASSET-091 / 092 / 095 / 096 |
| ASSET-107 iç nöy | `scene_cyclops_inner_nook_01_ref_1344.png` | ASSET-091 / 092 |

**Yani ASSET-090/091/092 için yeni bir Gemini kapısı GEREKMİYOR.** Üretim doğrudan bu dört görsele bakarak yapılır — bu, planın konsept turu harcamayacak tek büyük kalemi.

Konsept turlarının kilitlediği ve geometriye **bağlayıcı** olarak geçen teknik hedefler (registry'den):
- **Depo → Boğaz A daralması görünür olmalı.** ASSET-105 üç tur sürdü çünkü ilk ikisinde oda sonsuz bir tünel gibi akıyordu; sahip 12 m → 4 m daralmasının okunmasını istedi. Kabuk geometrisi bu daralmayı **fiziksel olarak** göstermeli.
- **Geçitlerin ötesinden ışık sızmaz.** ASSET-106'nın 01/03 varyantları tam bu yüzden elendi (boğaz çevresinde mavi parıltı halkası). Kabuk + ışık kurgusu boğazları gerçekten kapkaranlık bırakmalı.
- **Ağıllar odası asimetrik.** 14 m genişlik / 7 m tavan, ocak merkezden 4 m batıda (`x=−4, D=35`) — bir duvar aydınlık, bir duvar gölge cebi. Bu bir sanat tercihi değil, `CYCLOPS_LIGHT_RADIUS` 6 m ile gölge cebinin var olabilmesinin **tek** koşulu.
- **İç nöy çıkmaz sokak**, 9 m / 5 m, tek meşale 3,0 m sabit yarıçap.
- **Her odanın saklaş noktası geometrik olarak okunmalı** (niş / kaya çıkıntısı / duvar cebi) — işaretle değil. Bu bugün kısmen var (rastgele yerleşen gerçek geometri), ama §6.1'in fiziksel-giriş borcu duruyor.

### 2.1 Üretim yolu — **Blender prosedürel script**, `@axiom` değerlendirmesi

**Karar önerisi: `scripts/blender/build_cyclops_cave.py`**, `build_island_kit.py` deseninde. Üç seçenek ölçülerek karşılaştırıldı:

| Yol | Değerlendirme |
|---|---|
| **Blender prosedürel** ✅ | Emsal ölçüldü: `build_island_kit.py` çıktıları 6–34 kB / 168–720 üçgen, deterministik seed, yeniden çalıştırılabilir, 0 kredi. |
| PolyHaven parça-parça ❌ | PolyHaven'da mağara *iç mekânı* yok, kaya *propları* var. Parçalardan kabuk kurmak çok draw call + eşleşmeyen çarpışma + `cyclopsCave.ts:321-325`'te **zaten bir kez yaşanmış** z-fighting sınıfı sorunlar demek. |
| Tripo ❌ | `gen-mesh.mjs` image-to-3D — tek organik nesne üretir. 85 m'lik, oda genişlikleri dokümanla kilitli bir iç mekân onun problem tanımı değil. Kredi harcamanın gerekçesi yok. |

**Asıl gerekçe (ve bu planın en önemli mimari argümanı):** mağaranın şekli zaten **bir tabloda yazılı sayılardan** ibaret — `cyclopsCave.ts`'in `ROOMS` dizisi `level-cyclops-cave.md` §1.2'nin birebir kopyası, **ve çarpışma modeli (`corridorHalfWidthAt`) aynı tabloyu okuyor.** Aynı tabloyu okuyan bir script, görsel kabuk ile çarpışmayı **yapısal olarak senkron tutar.** Elle oturtulmuş bir geometri bunu yapamaz: `@helix` bir odanın `halfWidth`'ini 6→7 yaptığı gün sanat ile çarpışma sessizce ayrışır — sonradan bulunması en pahalı hata sınıfı.

**Melez:** prosedürel kabuk (merged, vertex color + UV) + mevcut tileable PolyHaven kaya seti (CC0, zaten doğru yol) + siluet kırmak için `build_island_kit.py`'nin hazır `rock_chalk_boulder/pebble` ailesinden **kabukla birlikte merge edilmiş** birkaç kütle. Ek draw call: **0**.

### 2.2 Ölçülen bütçe — bugünkü mağara

| Kalem | Draw call | Üçgen |
|---|---|---|
| Zemin + 7 oda kabuğu + geçit kapağı | 9 | 98 |
| Gizlenme geometrisi + halkalar | 12 | ~388 |
| Azık propları (6) | 6 | ~600 |
| **Koyun ×4 (ASSET-093)** | 4 | **12 512** |
| **Polyphemos (ASSET-092)** | 1 | **27 398** |
| Doryseus rig | 1 | 5 398 |
| **Toplam** | **~34** | **~46 500** |

**Level geometrisinin tamamı bu bütçenin %2'si (~1 100 üçgen).** %59'u tek başına Polyphemos, %27'si 4 koyun. Karşılaştırma: Lotus'un Gerstner deniz yaması tek başına **73 728 üçgen** (`SEA_TEX.segments = 192`) — mağara sahnesi bugün Lotus'un belirgin biçimde altında. Üretim planının "Lotus'tan daha hafif sahne" varsayımı **ölçümle doğrulandı.**

### 2.3 Gerçek darboğaz üçgen değil, doku VRAM'i

Diskteki JPEG boyutu ile GPU'da tuttuğu yer alakasız: sıkıştırılmamış 1024² RGBA = 4 MB, mipmap'lerle ≈ **5,6 MB** — kaynak dosya 100 KB olsa bile.

| Kaynak | Dosya | Decode edilmiş VRAM |
|---|---|---|
| `rock_cave_wall_01_{albedo,normal,rough}` | 430 KB | ~16,8 MB |
| Polyphemos gömülü (3 × 1024²) | 3,07 MB | ~16,8 MB |
| Koyun gömülü (3 × 1024²) | 0,62 MB | ~16,8 MB |
| Doryseus | 0,99 MB | ~5,6 MB |
| **Toplam** | ~4,9 MB | **~56 MB** |

### 2.4 Bütçe hedefleri — ASSET-090 ve sonrası (bağlayıcı öneri)

| Kalem | Üst sınır | Gerekçe |
|---|---|---|
| Kabuk üçgen | **≤ 25 000**, tek merged geometry | Polyphemos'un tek başına harcadığının altında. ~20 üçgen/m² — 5 m izleme mesafesinde silüet için fazlasıyla yeter |
| Kabuk draw call | **1** (zemin ayrı materyalse 2) | `mergeGeometries`, `CLAUDE.md` kuralı. Bugünkü 7 kutu → 1 |
| Durak toplam draw call | **≤ 25** | Bugün ~34. Kabuk 7→1, koyunlar 4→1 (`InstancedMesh`), gizlenme halkaları (6) kaldırılıyor — sahip zaten "gerçek girinti/çıkıntı" istedi, halka geçici ikincil ipucuydu |
| Kabuk doku | **1 tileable set = 3 × 1024²**, her biri ≤ 300 KB | Mevcut PolyHaven seti (164/163/103 KB) zaten uyuyor. **Zemin için ikinci set açılmaz** — aynı doku farklı `repeat` ile |
| Durak toplam doku VRAM | **≤ 64 MB decoded** | Bugün ~56 MB. Entegre GPU'da paylaşılan bellek; üstü Iris Xe sınıfında swap riski |
| Durak ilk indirme (karakterler hariç) | **≤ 1,5 MB** | `pipeline.md` §6'nın "GLB ≤ 400 KB" tavanı merged bir iç mekân için gerçekçi değil; 400 KB kabuk + ~430 KB doku + proplar bu zarfa sığar |
| Polyphemos (yeniden üretilirse) | **≤ 8 000 üçgen, 1 × 1024² albedo** | Doryseus emsali: 5 398 üçgen / 1 doku / 991 KB. Bugünkü 27 398 / 3 doku — oyuncunun 5 katı |

> 💡 **Bugün yapılabilecek, 0 kredilik kazanç:** Polyphemos'un `metallicRoughness` haritası bir kiklopta gereksiz. Skaler `roughness`'a çevirmek **~5,6 MB VRAM + 1 sampler** kazandırır, asset yeniden üretilmeden.

### 2.5 Kare bütçesi — `@axiom` açık kalemini kapattı

> **16,6 ms hedef, 18,0 ms sert tavan.** Sürdürülebilir **≥ 55 FPS** *ve* **%1'lik dip ≥ 50 FPS**, 1080p, entegre GPU sınıfı, tam post zinciriyle. Ölçüm: en yoğun sahne (Lotus, dusk), `renderer.info` (`calls`, `triangles`) + kare süresi histogramı.

Ortalama FPS tek başına yanıltıcı — bu oyunda takılmanın hissedildiği yer **dip kareler** (dev yaklaşırken, telgraf sırasında). Yeni her post pass kendi ms maliyetiyle **ayrı ayrı** ölçülür; "hepsi birlikte 55" yetmez. Mağara kapalı mekân olduğu için gökyüzü küresi/bulut shader'ı/güneş diski/Gerstner ızgarası **hiç yüklenmiyor** — bu bütçeyi rahat karşılamalı; asıl sınav Lotus'ta.

**Yeri:** bu eşik `pipeline.md`'ye değil `docs/production/roadmap.md` Faz 3.5/7.1'in yanına yazılmalı, asset-QA oradan referans versin — eşik dokümanda yaşar, check'te değil.

---

## 3. Polyphemos — ASSET-098 / 108

### 3.0 🔴 İKİNCİ AÇIK KAPI — ASSET-108 konsepti hiç üretilmedi

Ölçüldü: `asset-registry.md`'de **ASSET-108 satırı yok** (0 eşleşme), `art-source/work/`'te Polyphemos prompt dosyası yok, `art-source/ref/`'te turnaround görseli yok. Dört oda konsepti üretildi, **beşinci (figür) hiç başlamadı.**

Bu, D4-ek'in birebir kapsadığı ve **en yüksek kredi riski taşıyan** kalem: §4.2'nin kendi gerekçesi *"onaylanmamış bir konsept üstüne mesh üretmek `char_doryseus` v2'de yaşanan hatayı (yanlış temelden üretip yeniden üretmek) tekrarlama riski taşır"* diyor. Hangi üretim yolu seçilirse seçilsin (§3.2), **Tripo'ya tek kredi gitmeden önce bu kapı geçilmeli.**

### 3.1 D10'un yatırıma bindirdiği yük — bu, "uzaktan silüet" işi değil

Sahip 25 Ağu'da D10'u **(b) doğrudan görünür tehdit** olarak kapattı ve `CYCLOPS_JUMPSCARE_DURATION`'ı kaldırdı. Sonuçları asset tarafında somut:

- Dev **PRESENT boyunca sürekli sahnede** — 0,6 saniyelik bir flaşta değil, **dakikalarca** okunuyor. Ölçülen döngü ~78,5 s – ~154 s (`tuning.md` §12).
- Yüz ve **tek göz** dahil detay görülecek. Gemini konsept turunda bu, **yakın plana dayanacak bir tasarım** istemek demek.
- Ayrı bir "canavarı gizle" shader'ı/sis perdesi **yazılmayacak** — belirsizlik tasarlanan bir efekt değil, ışığın doğal sonucu.
- Klip seti tasarımın kendi 3-aday-nokta mekaniğine birebir bağlı: `walk` (hedefe giderken), `settle` (varış/yerleşme), `sleep` (yerleştikten sonra), `idle`. Dördü de gerçekten izlenecek.
- 🆕 Şok efekti **ezilme başına ağırlaşmalı** — `CYCLOPS_CRUSH_CAP`=3'ün kalan hakkını P2'yi bozmadan (sayı/bar yok) hissettiren tek kanal bu.

**Bugünkü boşluk:** ASSET-092 placeholder'ın **hiç iskelet animasyonu yok.** Dev yürürken ayakları hareket etmiyor; elimizde sadece prosedürel yön dönüşü + stomp bob'u var. Bir korku durağının sürekli sahnede duran tek tehdit figürü için bu, mağara duvarı dokusundan daha büyük bir eksik.

> **Küçük ek borç:** `cyclopsStop.ts:63` `GIANT_MESH_FACING = 0` — 🔬 **tahmin, hiç doğrulanmadı.** Doryseus'ta aynı sabit per-açı doğrulama sonrası `0 → −π/2` çıkmıştı (LOT-75 follow-up). Yeni model/rig gelince bu değer **mutlaka** ölçülmeli, varsayılmamalı.

> **Not — `CLAUDE.md`'nin vendor kararı bu figür için otomatik geçerli değil.** *"Vendor is Tripo, not Meshy"* kararı (16 Ağu) **oynanabilir karakterler** (Doryseus) bağlamında ve o zaman elimizde hiçbir alternatif mesh yokken alındı. Polyphemos oynanabilir değil ve elimizde zaten bir mesh var. Kararın bu figüre aynen uygulanıp uygulanmayacağı §3.2'nin konusu — **sahibin teyidi gerekiyor**, sessizce varsayılmamalı.

### 3.2 🔑 Elimizdeki model gerçekte ne — ölçüldü, iki kez bağımsız

GLB'nin JSON chunk'ı programatik olarak parse edildi (`@axiom` ölçtü, `@nile` bağımsız tekrarladı — **iki ölçüm birebir örtüştü**):

```
nodes: 121   meshes: 1   skins: 1   animations: 0   materials: 1   images: 3
triangles: 27 398   vertices: 15 431   skin 0 joints: 114
mesh attributes: POSITION, NORMAL, TEXCOORD_0, COLOR_0, JOINTS_0, WEIGHTS_0
```

**Bu, planlamayı değiştiren bulgu: model rig'li ve deforme olmaya hazır.** `JOINTS_0`/`WEIGHTS_0` var, 114 kemikli skin var, mesh gerçek bir `SkinnedMesh`. **Eksik olan yalnızca klip** (`animations: 0`). Kemik + ağırlık + bind zaten sanatçının elinden çıkmış hâliyle duruyor.

İskelet 3ds Max Biped/Character Studio topolojisi — Mixamo isimlendirmesi değil (`mixamorig` öneki: **0 eşleşme**), ama kanonik biped hiyerarşisi (`Pelvis → Spine → Spine1/2/3 → Neck → Head`, `Clavicle → UpperArm → Forearm → Hand`, `Thigh → Calf → Foot → Toe0`). Yani bir Mixamo iskeletiyle 18–20 satırlık isim tablosuyla **birebir eşlenebilir**.
⚠️ Tuzak: `cyclop  L Clavicle_08` isminde **çift boşluk** var.

**Rest pozu A-pose** (kollar gövdeden açık). Bu, Doryseus'un `export_doryseus_mixamo.py` docstring'inde kayıtlı olan gerçek arızasının (*"Mixamo fails on the standing rest — wrist/elbow markers stack → unknown error"*) **bu modelde tekrarlanmayacağı** anlamına geliyor.

### 3.3 🐞 Ölçülmüş hata — `GIANT_MESH_FACING = 0` yanlış

Kemik rest dünya konumları hesaplandı (`@nile` bağımsız doğrulaması, ham glTF birimleri):

```
L Foot  x=82.30  z=+20.84      L Toe0  x=96.91  z=+20.84
R Foot  x=82.30  z=−26.34      R Toe0  x=96.91  z=−26.34
```

Ayak parmakları ayak bileğinin **+X**'inde; sol/sağ ayak **Z**'de ayrışıyor. Yani **model +X'e bakıyor, yanal eksen Z.** Repo'nun kendi konvansiyonu gereği (`SAILOR.meshFacing = −π/2`; `retarget_mixamo_doryseus.py:103`'ün yorumu: *"Doryseus GLB face is +X (game meshFacing −π/2)"*) `GIANT_MESH_FACING` **`−Math.PI/2`** olmalı.

**Bugün `0` (`cyclopsStop.ts:63`).** Yani dev şu anda yürüdüğü yöne **90° yan bakarak** ilerliyor. Tek satırlık düzeltme, **hangi animasyon yolu seçilirse seçilsin önce yapılmalı** — yoksa hiçbir klibin doğru görünüp görünmediği değerlendirilemez. (Sabit zaten `🔬 tahmin` diye işaretliydi, ACTIVE_WORK 26 Ağu satırı.)

### 3.4 Dört yol

| | **(A) Tripo tam yol** *(mevcut plan)* | **(B) Mevcut armature + Mixamo klip** | **(C) Tripo yalnız rig+retarget** | **(D) Prosedürel devam** |
|---|---|---|---|---|
| Kredi | **~80–85** | **0** | ~40 | 0 |
| Oturum | ~3–3,5 | ~1,5–2 | ~1–1,5 | — |
| Sanatçının 114 kemikli rig'i | atılır (yeni mesh) | **korunur** | atılır (Tripo kendi iskeletini kurar) | korunur |
| Sahibin seçtiği görünüm | değişir | **korunur** | kısmen (Tripo işlemesinden geçer) | korunur |
| `sleep`/`settle` klibi | 🔬 preset adı **doğrulanmadı** | **satın almadan önce görülür** | 🔬 aynı belirsizlik | yok |
| Risk | Doryseus'ta **iki kez** bozuk çıktı | orta (retarget formülü) | 🔬 dal hiç çalıştırılmamış | D10 ile uyumsuz |

**(A) hakkında:** bu karar 24–25 Ağu'da alındığında elimizde **kapsül** vardı. ~80 kredinin ~45'i mesh+doku adımlarıydı — o iki adımın çıktısı bugün zaten elimizde ve **sahip onu 4 aday arasından kendi seçti**. Aynı iki adım Doryseus emsalinde tüm riskin de kaynağıydı (v2 el defekti + kol-bacak kemik bağlantısı, v3 A-pose'da donan omuzlar; üçüncüsü **yalnız canlı oyunda** görüldü).

**(B) hakkında — repo'da çalışan bir emsal var:** `scripts/blender/retarget_mixamo_doryseus.py`. Çıktısı `char_doryseus_07_mixamo_8000.glb` — ölçüldü: 65 mixamorig kemik, `preset:idle/walk/run/biped:dig` adlı **4 klip**, her biri 195 kanal, `HUMANOID_CLIPS` ile uyumlu isimler. Mixamo yolu bu projede **sonuna kadar gidilmiş ve teslim edilebilir GLB üretmiş.** (Neden shiplenmediği 🔬 belgede yok.)
Polyphemos için Doryseus'tan **daha kolay**: o script'in en riskli iki adımı (`make_cage()` + `heat_and_transfer()` voxel remesh/bone-heat; `hang_arms()` T-pose katlama) burada **gereksiz** — ağırlıklar zaten var, model zaten A-pose.
**Tek gerçek zorluk, dürüstçe:** `retarget_clip()` bugün `matrix_basis` deltasını doğrudan kopyalıyor; bu Doryseus'ta çalıştı çünkü hedef armature **zaten Mixamo armature'ıydı**. Yabancı iskelette rest-göreli formül gerekir (`target_pose = src_pose · src_rest⁻¹ · target_rest`) — ~40 satırlık, kitabi bir ek.

> **`blender-rig-fix-lessons.md` burada fazla genelleştirilmemeli.** Kayıtlı felaket *"elle mesh geometrisi silip yeniden inşa etmek"*ti ve kök neden bozuk **geometri**ydi, ağırlık değil. (B) geometriye ve ağırlıklara **hiç dokunmuyor** — yalnız animasyon kanalı ekliyor, kaynak GLB değişmeden duruyor, çıktı tek komutla yeniden üretilebiliyor. Bozuk bir retarget geri alınabilir ve göze batar; bozuk bir mesh patch'i sessizce ilerlemişti.

**(C) hakkında:** `gen-mesh.mjs`'in `animateCharacter()` fonksiyonu (satır 257–263) dışarıdan GLB kabul edecek şekilde **yazılmış** (`--glb` → `POST /v3/files` → `rig-check`). Ama 🔬 **bu dal hiç çalıştırılmamış** — `git log -S"--glb"` tek commit döndürüyor, ayrı bir başarı kaydı yok. **Ucuz prob var:** `rig-check` bir kontrol çağrısı, üretim değil — muhtemelen 0 kredi. Bu belirsizlik **~0 krediyle, tek komutla** kapatılabilir.

**(D) hakkında:** iskelet olmadan kol/bacak yok — "dev yürümüyor, kayıyor" hissinin kaynağı bu ve kod eklemekle çözülmez. D10 (sahip: dev dakikalarca doğrudan görünür) ile uyumsuz. **Tek meşru kullanımı:** (B)/(C) bitene kadarki köprü.

### 3.5 `@axiom`'un önerisi — kademeli, ucuz probla başlayan

1. **Şimdi, 0 kredi:** `GIANT_MESH_FACING = −Math.PI/2` düzeltmesi (§3.3). Hangi yol seçilirse seçilsin gerekli, bugünkü en büyük görsel arıza.
2. **Şimdi, ~0 kredi:** Tripo `rig-check` probu — dışarıdan mesh alıyor mu? (`--check-only` bayrağı, ~5 satır.)
3. **Ana yol: (B).** Gerekçe sırayla: **doğruluk** (sanatçının ağırlıkları korunur) · **basitlik** (repo'da çalışmış script'in en riskli iki adımı çıkarılmış hâli) · **mimariye uyum** (`preset:*` isimleri `humanoidRig.ts` sözleşmesine oturur) · **geri alınabilirlik** (kaynak GLB'ye dokunulmaz) · **kredi 0** ve `sleep`/`settle` klipleri **satın almadan önce görülür**.
4. **(A) reddedilmiyor — gerekçesi düştü.** Sahip Sketchfab modelini estetik olarak *geçici* görüyorsa (CSV satırı "GECICI/PLACEHOLDER" diyor) (A) hâlâ doğru yol. **Ama o zaman bu bir sanat yönü kararı** — `@axiom`'un performans/mimari kararı değil; `@iris` + sahip vermeli.

**Bu senin kararın.** Öneri: 1 ve 2'yi bir oturumda yap (~0,25 oturum, 0 kredi), sonucuna göre (B)/(C) arasında seç.

**Pazarlıksız kabul kriteri (her yol için ortak):** klip canlı oyunda `__CYCLOPS_DEBUG__` + dondurulmuş kamerayla **4 açıdan** görülmeden "bitti" denmez. Doryseus v3'ün üçüncü defekti (donmuş omuzlar) Blender'da **görünmüyordu**.

> ⚙️ **Mimari not, hangi yol seçilirse seçilsin:** `cyclopsStop.ts` bugün devi `loadGltfBundle()` ile yüklüyor — mixer yok, `expectedBytes` kontrolü yok, `SkeletonUtils.clone` yok. Klip gelince `createHumanoidActor()` yoluna geçmeli; ama o fonksiyon `HUMANOID_CLIPS`'i (idle/walk/run/harvest) **hardcode ediyor** ve eksikse `throw` ediyor (`humanoidRig.ts:108`). Polyphemos'un `idle/walk/sleep/settle` slotları için **klip-slot haritası parametre olmalı** — küçük ama sözleşme değiştiren bir refactor, `@byte`'ın işi.

---

## 4. YENİ — Sahil (koy) + koyunlu yokuş patika

> Danışan: `@cove` (Island Designer), 26 Ağu. Sahibin bu turdaki isteğinin çekirdeği.

### 4.0 🔴 ZORUNLU İLK ADIM — bu sahne konsept kapısından hiç geçmedi

D4-ek (sahip kararı, 24 Ağu, `cyclops-cave-production-plan.md` §4.2) bağlayıcı: **bu adanın her sahnesi önce Gemini'de konsept çizdirilip onaylatılacak; onaysız hiçbir görsel karar ilerlemez.** Mağaranın dört iç sahnesi (ASSET-104…107) bu kapıdan geçti — bazıları üç tur revizyonla. **Koy + patika hiç geçmedi.** Sahibin kendi ifadesi de bunu söylüyor: *"onun tasarim referans cizimlerini kitlemedik"*.

Yani üretim sırası tartışmaya kapalı: **konsept → sahip onayı → ancak sonra geometri/doku.** Ama bir şart var, §4.2'ye bakınız:

> ⚠️ **Konsept turu, kapsam kararından SONRA başlamalı.** "Hafif" ile "Tam" çok farklı kompozisyon ister (kısa düz koridor vs. gerçek teraslı yokuş) — kapsam seçilmeden üretilen 3 varyant büyük olasılıkla çöpe gider. Bu, ASSET-105'in üç tur harcamasının (oda sınırları prompt'ta netleşmemişti) doğrudan dersi.

### 4.1 Ölçülen mevcut durum + iki gerçek hata

`src/world/cyclopsCave.ts` ve `src/stops/cyclopsStop.ts` okunarak:

- **Koy** (D −20…−8, 12 m): `halfWidth: Infinity` → shell döngüsü bu odayı atlıyor (`if (r.id === "cove" || !Number.isFinite(r.halfWidth)) continue;`). Gerçekten açık: duvar yok, tavan yok. Gemi D≈−15'te, teslim noktası.
- 🐞 **Hata 1 — patika kodda kapalı bir kutu.** Patikanın (D −8…0) `halfWidth`'i `3` (sonlu), yani shell döngüsünden **atlanmıyor** → 6 m geniş × 12 m yüksek × 8 m derin, `BackSide`, mağara kaya dokulu tam bir `BoxGeometry` kuruluyor. `level-cyclops-cave.md` §1.2 tablosu ise patikanın tavanını **"açık"** diye tarif ediyor. **Doküman ile kod çelişiyor** ve bugün oyuncu sahilden mağaraya bir tünelden giriyor. Hangi kapsam seçilirse seçilsin düzeltilmesi gereken bir taban hatası — "büyütme" değil.
- **Zemin:** D −20…65'in tamamı **tek** `PlaneGeometry`, mağara kaya albedosuyla. Yani sahilde bugün mağara zemini var; deniz kenarı hissi sıfır.
- 🐞 **Hata 2 — "yokuş"un kodda hiçbir karşılığı yok.** Kot her yerde y=0. `cyclopsStop.ts` (~satır 273) kendi yorumunda kabul ediyor: *"Zemin hep y=0 (primitif geometri), gerçek `heightAt` eşdeğeri yok."* `CameraRig`'e sabit `() => 0` yükseklik fonksiyonu veriliyor. Sahibin istediği "yokuş patika" **sıfırdan eklenmesi gereken** bir şey.
- **Oynanış işlevi:** bugün saf geçiş — 0 öğe, 0 mekanik. Kroki bunu bilinçli olarak "son nefes alanı" diye adlandırıyor.

**`@cove`'un oynanış önerisi:** burası kasıtlı bir nefes/geçiş koridoru olarak **kalsın**, yeni toplama/bulmaca katmanı eklenmesin. Gerekçe: sahip görsel referans istedi, yeni mekanik istemedi; ayrıca buraya öğe eklemek `CYCLOPS_ISLAND_TARGET`/oda-başı denge hesabını değiştirir — o `@helix`'in malı, tek taraflı eklenemez.

### 4.2 🔴 AÇIK KAPSAM SORUSU — sahip karar verecek

Sahip geçen tur bu sahnenin kapsamını **açıkça "sadece hafif set-dressing"e sınırlamıştı** (Korsika fotogrametri taraması kullanılamayınca; koy/patika geometrisi değişmedi, yalnız 4 koyun eklendi). Şimdi *"tam asset üretimine geç"* diyor. **Bu, o sınırı da kaldırıyor mu, yoksa sınır duruyor ve yalnız üretim kalitesi mi yükseliyor?** Netleşmeden konsept turu başlamamalı.

| | **Seçenek Hafif+** | **Seçenek Tam** |
|---|---|---|
| **Geometri** | `ROOMS` sözleşmesi hiç bozulmaz. Koy açık, patika 8 m × 6 m tek koridor. | Patika genişliği 2–3 alt-banda ayrılır (sahilde geniş → mağara ağzına doğru kayalıklarla daralan hat), mevcut `ROOMS` deseni tekrar kullanılır. |
| **Kot (yokuş)** | Minimal: patika boyunca **0 → ~1,5 m** yükseliş. "Yokuş" kelimesinin sözlük anlamını karşılar. | Gerçek: **0 → 2,0–3,0 m**, D=−8'den D=0'a. Gemiden mağaraya yürüyüş hissedilir bir tırmanış olur. |
| **Set-dressing** | 4 koyun, eğime göre yeniden konumlanır. | + düşük yükseklikli kayalık çıkıntı kümeleri (Korsika'nın "teraslı taş" hissinin küçük ölçekli, okunabilir karşılığı). **Bina/köy YOK.** |
| **Kodda asıl iş** | `heightAt(z)` + `CameraRig` getter'ına bağlama + patikanın kapalı-kutu hatasının düzeltilmesi. | Aynısı + zemin `PlaneGeometry`'nin segment'lenmesi (ya da ayrı rampa mesh'i) + genişlik bantlama + koyunların Y'sinin eğriye oturtulması. |
| **Maliyet** | ~1,5–2 oturum | ~3–4 oturum |
| **Risk** | Düşük. | Eğimli zeminde hareket/kamera davranışı (takılma, ani sıçrama) **bu projede hiç test edilmedi** — yeni bir yüzey türü. |
| **Ne kaybeder** | "Koyunlu patika" hâlâ düz tek koridor hissi verir; Korsika referansı görsel olarak yankılanmaz. | Mekanik katkısı sıfır olan (saf geçiş) bir alana orantısız mühendislik. |

**Blast radius (Tam için, ölçüldü):** `heightAt`'in kapsamı **D ∈ [−8, 0] ile sınırlı** tutulabilir — mağara içi (D≥0) 0 döner, yani item/hide-spot/dev Y mantığının hiçbiri etkilenmez. `corridorHalfWidthAt` zaten oda başına tek sayı döndürüyor, bantlamak ucuz. 🔬 `RoomId` enum'una yeni alt-kimlik eklenirse `HIDE_SPOT_ROOM_IDS`/`ITEM_DEFS`'in bağımlılığı kontrol edilmeli (patikada 0 öğe/0 saklaş noktası olduğu için pratikte düşük risk, ama doğrulanmalı).

**`@cove`'un önerisi: Hafif+.** Sahibin kelimesini ("yokuş") karşılayan en düşük riskli seçenek. Tam daha güçlü bir referans karşılığı verir ama mekanik katkısı sıfır bir alana orantısız yatırım riski taşır. İkisi de meşru — **bu senin kararın.**

**"Bitti" kriteri (her iki seçenekte ortak):** patika artık kapalı kutu değil (gökyüzü görünüyor) · sahil zemini mağara dokusundan görsel olarak ayrışmış · ölçülebilir, kayıtlı bir Y kotu farkı var ve kamera/oyuncu/koyun hepsi ona hizalı · Gemini kapısından geçmiş, sahip tarafından kilitlenmiş bir referans görseli `art-source/ref/`'te + `asset-registry.md` satırı var · `ROOMS` D aralıkları ve oda sayısı değişmedi. **Tam için ek:** patika genişliği en az 2 alt-bant · kayalık çıkıntı kümeleri yerleşmiş (bina/köy yok) · eğimli zeminde hareket/kamera playtest'te sorunsuz.

### 4.3 Konsept görselinin teknik hedefleri (`@iris`'e girdi — prompt değil, gereksinim)

ASSET-106/107'nin `asset-registry.md`'deki "kroki'den doğrudan türetilmiş teknik hedefler" formatıyla aynı:

1. **Işık/ton: gün ışığı, sıcak Ege dili.** D11'in "Kiklop karartma istisnası" bu alana **yayılmıyor** — istisna mağara ağzından (D=0) başlar. ASSET-104 zaten *"dışarıyı adanın geri kalanıyla aynı sıcak/güneşli dilde tut, korku bütçesini içeri sakla"* kararını kilitledi; bu sahne onun **devamı**, aynı ışık kotunda başlamalı.
2. **Koy:** açık su + kayalık burun, **tek gemi** demirli (D≈−15). Filo yok — [H] IX.116 civarı "on biri geride kaldı" ile tutarlı. Gemi konsept içinde net okunmalı (teslim noktası burası).
3. **Patika: koydan mağara ağzına doğru YÜKSELEN bir hat.** Kompozisyonda kot farkı okunmalı — düz bir sahil yürüyüşü değil. *(Somut şekli §4.2'nin kapsam kararına bağlı.)*
4. **Koyunlar:** patika boyunca otlayan/serbest — "koyunlu patika" fikri net olsun. Mevcut Sketchfab modelinin silüetiyle birebir tutarlılık **zorunlu değil**.
5. **Zemin:** kumlu-kayalık sahil → aşınmış taş/toprak patika. ASSET-105/106/107'nin kasvetli iç mekan kayasından **görsel olarak ayrışık** (burası hâlâ dışarısı).
6. 🔴 **Korsika / "Village of Canari" referansı = TON kaynağı, GEOMETRİ kaynağı DEĞİL.** Teraslı taş/kıyı hissi ilham olabilir; **bina/köy yeniden inşası konseptte de olmamalı.** Sahip bunu geçen tur zaten kesti — bu tur onu sessizce geri açmamalı.
7. **Mağara ağzıyla süreklilik:** bu sahne ASSET-104'ün hemen önündeki alanı gösteriyor. Geçiş noktasındaki kayalık formasyon ve ışık kotu iki konseptte tutarlı olmalı; STYLE/LOOK+IP blokları ASSET-104 ile **aynı `_anatomy.md` çapasından byte-identical** kopyalanmalı (§4.2 madde 1 kilit-çapa disiplini).
8. **Ölçek:** patika ~8 m uzunluk × 6 m genişlik (Hafif+) veya değişken genişlik (Tam).

### 4.4 Yeni asset kimlikleri (ASSET-109'dan itibaren — 108'e kadar dolu)

| ID | Kalem | Sınıf | Yol | Maliyet |
|---|---|---|---|---|
| **ASSET-109** | Koy + koyunlu yokuş patika — **sahne konsepti** | `reference` | Gemini (`npm run gen:assets image`), **zorunlu gate**, 3 varyant | 0 kredi, ~1 tur (🔬 ASSET-105 emsali: 3 tur da sürebilir) |
| **ASSET-110** | Sahil zemini dokusu (kum + aşınmış kıyı kayası) | `scene-texture` | `gen-assets.mjs`, ASSET-109'dan referans | ~1 tur |
| **ASSET-111** | Patika yüzeyi + kayalık çıkıntılar | `scene-mesh`/`code` | Hafif+: kod mesh. Tam: Blender (`build_island_kit.py` deseni) | 0 kredi |
| **ASSET-112** | Koyun (mevcut ASSET-093 çakışmasının yeni kimliği — §7.2) | `scene-model` | Yeniden üretim yok, yalnızca kayıt düzeltmesi | 0 kredi |

---

## 5. Ses katmanı — ASSET-099, sahipsiz bilet

**Durum: 25 Ağu'dan beri sahipsiz, bu turda da sahiplenilemedi.**

- `@echo` (Sound Designer) **Cursor-only** — Claude Code'un `.claude/agents/` roster'ında yok, buradan çağrılamaz. Bu bir eksiklik değil, kurulumun bilinen sınırı (`CLAUDE.md`, "Cursor-only extras").
- Tam bilet metni **zaten yazılı**: `docs/production/implementation-spec-sprint1.md` §5 — kapı geçiş sesi, devin PRESENT boyunca mesafeye göre adım/nefes sesi, ezilme kükremesi, saklaş noktası hareketsizlik ihlali sinyali.
- Lisans engeli **yok**: Kenney CC0 kütüphanesi `src/systems/audio.ts`'te zaten kurulu. Yeni kredi/satın alma gerekmiyor.
- **Bu durakta şu an tek bir ses çalmıyor.** Korku türü bir durak için bu, mağara kabuğu dokusundan daha büyük bir "gerçek görünüm/his" boşluğu — karanlık + ölçek + ses üçlüsünün üçte biri tamamen eksik.

**Sahibe net eylem:** Cursor'ı açıp `@echo`'ya `implementation-spec-sprint1.md` §5'i vermek. Ayrı bir mekanizma yok, normal claim protokolüyle devam eder.
**"Bitti" kriteri:** dört olayın (kapı, adım/nefes, ezilme, hareketsizlik ihlali) her biri gerçek oyunda tetiklendiğinde duyuluyor; `audio.ts`'in mevcut mute/`localStorage` sözleşmesine bağlı; Lotus'un ses katmanına hiç dokunulmamış.
**Maliyet:** 0 kredi, ~1 oturum — **ama `@nile`'ın oturumunda değil.**

> **Sıra önerisi:** ses, mağara kabuğundan **önce** yapılabilir ve muhtemelen yapılmalı. Bağımlılığı yok, maliyeti sıfır, algılanan etkisi en yüksek kalemlerden biri. Şu an sıranın en sonunda olmasının tek sebebi sahiplik — teknik bir gerekçe değil.

---

## 6. Kapsam dışı — bilinen mekanik borçlar

Bunlar **asset işi değil** ve bu planın kapsamında değil. Buraya yazılmalarının tek sebebi: ikisi de oyunun görsel/his kalitesini doğrudan etkiliyor ve unutulmaya müsait.

**6.1 — Gizlenme girintilerine fiziksel giriş yok.**
`cyclopsCave.ts`'in kendi yorumunda kabul edilmiş, bilinçli bir sadeleştirme: `corridorHalfWidthAt(z)` **oda başına tek bir sayı** döndürüyor, konuma göre değişmiyor. Yani duvar oyuğu **görsel olarak** gerçek bir cep ama oyuncu fiziksel olarak **içine giremiyor** — duvara yaslanıp mevcut yarıçap-mesafe kontrolünü geçmesi yeterli. Sonuç: "girintiye sokuldum" hissi yok, "doğru noktada durdum" hissi var. Düzeltmesi `corridorHalfWidthAt`'i konum-farkında yapmak (küçük ama gerçek bir çarpışma değişikliği) — `gameplay-programmer`/`@byte` işi.

**6.2 — K13 hub kilidi gerçek bir kontrol yapmıyor.**
Ölçüldü: `src/ui/menu.ts:234`'teki tıklama dinleyicisi **koşulsuz** `window.location.href = "?stop=cyclops"` yapıyor — `locked` sınıfına da, herhangi bir ilerleme durumuna da bakmıyor. `setCyclopsReady()` yalnız rozet metnini/sınıfını değiştiriyor ve yalnız oturum içi (`localStorage` yok, `game.ts:631`). Yani Lotus hiç bitirilmeden Kiklop oynanabiliyor. Bu **bilinçli bir test kolaylığıydı** (`implementation-spec-sprint1.md` K13, "🟡 kısmen"), ama roadmap'in 2.6d-yerine-geçen kalemi (kalıcı kilit, tek `localStorage` boolean'ı, ~0,25 oturum) hâlâ yapılmadı.

---

## 7. Sıralama, maliyet, açık kararlar

### 7.1 Önerilen sıra

**Prensip: önce sıfır-maliyetli düzeltmeler ve bloklayıcı kararlar, sonra konsept kapıları, en son pahalı üretim.** 25 Ağu'nun dersi (*"en pahalı asset'e en son sıra ayrıldı"*) burada tersine çevriliyor: Polyphemos'un **kararı** öne alınıyor, **harcaması** değil.

| # | İş | Kim | Kredi | Oturum | Bağımlılık |
|---|---|---|---|---|---|
| **0a** | `GIANT_MESH_FACING` → `−π/2` (§3.3) — ölçülmüş hata | `@byte` | 0 | 0,1 | — |
| **0b** | Tripo `rig-check` probu (§3.4 C) — belirsizliği ~0 krediyle kapat | `@axiom` | ~0 | 0,15 | — |
| **0c** | Asset ID çakışması düzeltmesi (§7.2) | `@iris` | 0 | 0,25 | — |
| **0d** | `models/` temizliği + fallback küçültme (§1 Adım 0) | `@byte` | 0 | 0,25 | sahip onayı |
| **0e** | Polyphemos `metallicRoughness` → skaler (§2.4) | `@byte` | 0 | 0,1 | — |
| **1** | 🔴 **Sahip kararı: koy/patika kapsamı** (§4.2 Hafif+ / Tam) | **sahip** | — | — | **2'yi blokluyor** |
| **2** | ASSET-109 koy/patika konsepti — Gemini gate, 3 varyant | `@iris` | 0 | 1 (🔬 3'e kadar) | 1 |
| **3** | ASSET-108 Polyphemos konsepti + 4-açı turnaround — Gemini gate | `@iris` | 0 | 1 | 0b sonucu |
| **4** | 🔊 **Ses katmanı** (§5) — bağımsız, paralel gidebilir | `@echo` (Cursor) | 0 | 1 | sahip Cursor'ı açmalı |
| **5** | Polyphemos animasyonu — (B) veya (C) | `@axiom`+`@byte` | 0 veya ~40 | 1,5–2 | 0a, 0b, 3 |
| **6** | ASSET-090 mağara kabuğu — `build_cyclops_cave.py` | `@byte` | 0 | 1,5–2 | — (konsept hazır) |
| **7** | ASSET-091/092 gerçek dokular | `@iris` | 0 | 1 | 6 |
| **8** | ASSET-110/111 sahil zemini + patika geometrisi | `@byte`+`@iris` | 0 | 1,5–2 (Tam: 3–4) | 1, 2 |
| **9** | ASSET-093/094 azık propları, 095 ağıl dekoru, 096 ocak, 097 koca kaya | `@iris`+`@byte` | 0 | 1,5 | 7 |
| | **Toplam** | | **0 – ~40** | **~11–14** | |

**En önemli sonuç: bu plan büyük olasılıkla `0 kredi` ile bitiyor.** Orijinal ~80 kredilik tek kalem (ASSET-098) artık ~0 veya ~40 — çünkü mesh+doku adımlarının satın alacağı şey bugün zaten elimizde.

**Roadmap ile kıyas:** D8'in Kiklop tahmini ~18–19 oturumdu; K1–K13 (mekanik) ~10,75 harcadı, bu plan üstüne ~11–14 koyuyor → toplam ~22–25. D8'in *"onay turları ortalama iki tur alırsa ~22–23"* uyarısıyla tutarlı. **Yeni bir sürpriz büyüme yok.**

### 7.2 🐞 Asset kimlik çakışması — kayıt hatası, üretimden önce düzeltilmeli

Ölçüldü (`public/assets/assets.csv` ile `cyclops-cave-production-plan.md` §4.3 karşılaştırması). Geçen turun placeholder'ları, **üretim planında başka kalemler için rezerve edilmiş** ID'lere yazılmış:

| ID | Planda rezerve | `assets.csv`'de gerçekte | Durum |
|---|---|---|---|
| ASSET-091 | Kaya duvar dokusu (mağara içi) | `rock_cave_wall_01_*` (PolyHaven placeholder) | ✅ Doğru — aynı kalem, geçici sürümü |
| **ASSET-092** | **Mağara zemini dokusu** | `char_polyphemos_01_stand_27000.glb` | 🔴 **Çakışma** — Polyphemos'un rezerve ID'si **ASSET-098** |
| **ASSET-093** | **Azık propu — peynir tekeri** | `creature_sheep_01_stand_3100.glb` | 🔴 **Çakışma** — koyunun hiç ID'si yok, yeni açılmalı (**ASSET-112**) |

**Neden şimdi önemli:** bu planın ürettiği her şey (mağara zemini dokusu, gerçek Polyphemos, azık propları) tam olarak bu ID'lere yazacak. Düzeltilmezse ya üretim yanlış ID'ye gider ya da placeholder'ın üstüne yazılıp provenance kaybolur. Düzeltme **sıfır sanat maliyeti**, ~0,25 oturum: `assets.csv`'de üç satırın ID'si değişir, `asset-registry.md`'ye ASSET-112 satırı eklenir, `cyclopsCave.ts`'in yorumundaki "ASSET-093, CC-BY koyun" referansı güncellenir.

> Not: bu bir suçlama değil — geçen tur hızlı bir "ucuz kazanım" turuydu ve ID'ler oradan sıradan devam ettirilmişti; rezervasyonlar ayrı bir dosyada (üretim planı §4.3) yaşadığı için görülmedi. **Ders:** yeni ID açarken `assets.csv`'nin son satırına değil, üretim planının rezervasyon tablosuna bakılmalı.

**"Bitti" kriteri:** `npm run test:assets --only manifest` bu üç dosya için yeni bulgu üretmiyor; `asset-registry.md` ve `assets.csv` aynı ID'yi aynı kaleme veriyor; kod yorumları güncel.

### 7.3 Sahibe açık kararlar — durum

| # | Karar | Seçenekler | Öneri | Sonuç |
|---|---|---|---|---|
| **S1** | **Koy/patika kapsamı** (§4.2) — "tam asset üretimine geç" bu sahnenin geçen turdaki "hafif set-dressing" sınırını da kaldırıyor mu? | **Hafif+** (~1,5–2 oturum, minimal yokuş) · **Tam** (~3–4 oturum, gerçek teraslı kot + kayalık) | `@cove`: **Hafif+** | ✅ **KARARLANDI (26 Ağu, sahip): Hafif+, ama kredi kısıtlaması yok.** Verbatim: *"hafif ama adanin ambiansi icin onemli. o yuzden kredi harcayabiliriz."* Yani: geometri/mekanik kapsamı **Hafif+** kalıyor (tek koridor, `ROOMS` sözleşmesi bozulmuyor, bina/köy yok) — ama ASSET-109 konsept turu ve ASSET-110 doku pasosu **bütçe kısılarak değil, gerçek kaliteyle** yapılacak; "ucuz olsun diye köşe kesme" bu sahne için geçerli değil. §4.2'nin "Hafif+" satırları bağlayıcı, yalnız kredi/tur tahminleri esnek. |
| **S2** | **Polyphemos yolu** (§3.4) — `CLAUDE.md`'nin "vendor Tripo" kararı bu figüre de uygulanacak mı? | **(B)** 0 kredi, sahibin seçtiği model korunur · **(A)** ~80 kredi, sıfırdan Tripo · **(C)** ~40 kredi | `@axiom`: önce 0b probu, sonra **(B)** | ✅ **KARARLANDI (26 Ağu, sahip): (B) — mevcut rig + Mixamo retarget.** Sahibin 4 aday arasından seçtiği görünüm korunuyor, `retarget_mixamo_doryseus.py` deseni tekrar kullanılacak (bkz. §3.6, yeni). |
| **S3** | Sketchfab Polyphemos **estetik olarak geçici mi, kalıcı mı?** | Kalıcı → (B) · Geçici → (A) | — | ✅ S2 = (B) seçildiği için **zımnen kalıcı** — ayrıca sorulmadı, (B)'nin kendisi bu kararı içeriyor. |
| **S4** | **Ses katmanı sahipliği** (§5) — sahip Cursor'ı açıp `@echo`'ya verecek mi? | Evet / hayır (sahipsiz kalır) | Bilet hazır, 0 kredi, en yüksek his/maliyet oranı | 🔲 **Hâlâ açık** — bu turda sorulmadı, sahibe ayrıca sorulacak. |
| **S5** | `models/` temizliği (§1) — 9,44 MB dosya **silinsin mi, `art-source/`'a taşınsın mı**? | Taşı (öneri) / sil / dokunma | **Taşı** — `07_mixamo` (B) yolunun kanıtı, silinmemeli | ✅ **Varsayılan uygulanıyor: Taşı** (mevcut depolama politikasıyla tutarlı, düşük riskli, geri alınabilir — sahip itiraz ederse değiştirilir). |

### 3.6 S2 kararı sonrası — uygulama sırası (yeni, 26 Ağu)

1. `scripts/blender/retarget_mixamo_doryseus.py`'yi oku, Polyphemos'a uyarlanabilirlik kontrolü yap (§3.4'ün "tek gerçek zorluk" notu — rest-göreli formül gerekebilir).
2. Mixamo'dan uygun idle/walk klipleri indir (Doryseus emsalinde nasıl yapıldıysa aynı yol).
3. Retarget script'ini çalıştır, `char_polyphemos_02_animated_XXXX.glb` gibi yeni bir dosya üret (mevcut ASSET-092'yi **değiştirme**, yeni bir sürüm/ID olarak ekle — geri alınabilirlik).
4. `cyclopsStop.ts`'i `loadGltfBundle`'dan `createHumanoidActor`'a geçir (§3.5'in mimari notu — `HUMANOID_CLIPS` klip-slot haritası parametre olmalı, Polyphemos'un `idle/walk` slotları Doryseus'unkinden farklı).
5. Pazarlıksız kabul kriteri (§3.5): `__CYCLOPS_DEBUG__` + dondurulmuş kamerayla **4 açıdan** görülmeden "bitti" denmez.

### 7.4 Bu turda yapılmayanlar — dürüstlük notu

- **Hiç kod yazılmadı, hiç asset üretilmedi, hiç kredi harcanmadı.** Çalıştırılan tek komut salt-okuma (`asset-qa --only budget`) + GLB'lerin ikili parse'ı.
- **Plan commit edilmedi** — sahip onayı bekliyor. `ACTIVE_WORK.md`'deki claim satırı (`118f8e1`) hariç.
- **`@iris` (Art Director) bu turda çağrılmadı.** Konsept prompt'larının kendisi (ASSET-108/109) yazılmadı — bunlar üretim turunun işi ve S1 kararına bağlı. Bu turda yalnız **gereksinimler** (§4.3) toplandı.
- **`@helix` çağrılmadı.** §4.1'in "patikaya mekanik eklenmesin" önerisi `@cove`'un level-design görüşü; toplama dengesini değiştiren bir karar gerekirse `@helix`'e gitmeli.
- **§4.2'nin oturum tahminleri 🔬 ölçülmedi** — `@cove`'un kod okumasına dayanan mühendislik tahmini. Özellikle "eğimli zeminde hareket/kamera" bu projede **hiç denenmedi**; Tam seçilirse burada sürpriz çıkabilir.
