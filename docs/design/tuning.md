# Tuning — Lotus Adası

> **Bu dosya tüm sayısal değerlerin TEK kaynağıdır.** Başka bir dokümanda bir sayı görürsen ve buradakiyle çelişiyorsa, **burası doğrudur** ve o doküman düzeltilmelidir.
> **Motor tarafı için:** bu dosya `src/constants.ts`'in doğrudan kaynağıdır. Aşağıdaki her `SABİT_AD` **olduğu gibi** TypeScript sabit adı olarak kullanılabilir.
> **Tarih:** 2026-08-14 · **Durum:** ilk pas · birden çok değer playtest'e ertelendi (bkz. §11 — `DAY_LENGTH`, `MEM_SEA_RECOVER`, `HUD_VAGUE_COUNTER`, `MEM_ISLAND_RELIEF_PCT`, `HALLUCINATION_THRESHOLD`/`HALLUCINATION_CONTACT_MEM_SPIKE`)

> **Çoklu-ada notu (14 Ağu 2026, sahip onayı):** proje artık **3 duraklı bir koşu** — Lotus Adası (1. durak/çapa) + Kiklop Mağarası (2.) + Sirenler Geçidi (3.). Karar `docs/design/multi-island-concept.md`'de M7 (Seçenek 3) olarak kapandı. Bu dosyadaki sayıların büyük çoğunluğu (§1, §2, §3'ün çoğu, §4, §6, §7, §8) **hâlâ yalnızca Lotus Adası'nı** tarif ediyor — Sirenler'in kendi `level-*.md` ve tuning satırları `island-designer` agent'ının işi, henüz yazılmadı. Kiklop Mağarası için **§3.0 (hedef dağılımı), §5 (unutuş taşıma) ve §12 (algılanma sistemi)** eklendi; Kiklop'un salt geometri sabitleri (mağara derinliği, oda-başı öğe sayıları) hâlâ yalnızca `level-cyclops-cave.md`'de, buraya taşınmadı.
> **⚠️ Hub'a dönüş notu (14 Ağu 2026, aynı gün — `multi-island-concept.md` §9):** sahip "hub yok" kararını tersine çevirdi — **gerçek bir hub var, oyuncu durağı serbest sırayla seçiyor.** `RUN_TARGET_TOTAL` ve durak alt-hedefleri (§3.0) **değişmedi** — hub sıra özgürlüğü verir, hedefleri tek bir esnek havuza çevirmez. `MEM_ISLAND_RELIEF_PCT`'in tetik noktası (§5.2) artık "adalar arası doğrudan geçiş" değil, **"hub'a dönüş"** olarak okunmalı — formül/değer aynı. Ayrıntı ve gerekçe: `multi-island-concept.md` §9.2/§9.3.
> **⚠️ K35 (15 Ağu 2026, aynı gün düzeltme):** K35 **yalnızca hub kenar görevi Beş yeter**. Lotus ada kartı = klasik `real` (12, 28’li tarla, batış kayıp). Aşağıdaki “`real` = 5 / gün döner” satırları kenar görevi okur; asıl durak bu dosyanın 12 / 28 / güneş-kayıp okumasını tutar. Unutuş oranları (§5) durur.

---

## 0. Sözleşmeler (motor tarafı okusun)

| Kural | Değer |
|---|---|
| İsimlendirme | `UPPER_SNAKE_CASE`, istisnasız |
| **Süre** | **saniye (s), float.** Milisaniye **kullanılmaz.** Bir değeri ms sanma — `HARVEST_HOLD = 1.2` bir buçuk saniyeye yakındır, 1,2 ms değil. |
| Mesafe / uzunluk | metre (m), float |
| Hız | m/s · İvme: m/s² · Açı: derece (°), float |
| Unutuş | puan, 0–100 float, birimsiz |
| Unutuş oranı | puan/**saniye** |
| Sayım | adet, int |
| Ondalık ayracı | **nokta** (`4.5`). Tablolardaki açıklama metinlerinde virgül geçebilir; **değer sütunu her zaman noktalıdır.** |
| Negatif değerler | ASCII eksi (`-6.0`). Değer sütununda tipografik `−` **kullanılmaz.** |
| Koordinat | `+X doğu, +Z kuzey`, orijin ada merkezi, deniz seviyesi `y = 0` |
| Türetilmiş değerler | `[TÜRETİLMİŞ]` etiketli — sabit olarak yazılmaz, hesaplanır |
| Sabit olmayan satırlar | `[SABİT DEĞİL]` etiketli — açıklama/politika, koda girmez |
| Playtest'e ertelenmiş | 🔬 işaretli — bkz. §11 |

---

## 1. Oyuncu ve kamera

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `PLAYER_SPEED` | `4.5` | m/s | Hızlı yürüyüş. **Not (2026-08-15, ölçek büyütme önerisiyle güncellendi — bkz. §2.1):** bu sabit ada 160 m yarıçapa büyürken **değişmiyor.** Eski gerekçe ("70 m yarıçaplı adayı boydan boya 31 s'de geçirir, bu STAGE_RIPE'in altında kalır") artık **yanlış okunmasın diye** yeniden yazıldı: pillar hiçbir zaman gerçekte "adanın tamamını uçtan uca koş" değildi — sazlık/göl gibi bir kümenin **içindeki** çiçekten çiçeğe yetişme süresiydi. O yerel mesafeler (gemi↔sazlık ~35 m, gemi↔göl ~85 m) büyümediği için bu ilke hâlâ aynen geçerli; sadece adanın **dış hattının** artık STAGE_RIPE'le eşleşmediği açıkça not edildi (§2.1). |
| `PLAYER_ACCEL` | `18.0` | m/s² | 0.25 s'de tam hıza çıkar. Ağır hissettirmeyecek kadar hızlı, kaygan hissettirmeyecek kadar yavaş. |
| `PLAYER_TURN_SMOOTH` | `0.10` | s | Bakış yönünün hareket yönüne yumuşama süresi. |
| `PLAYER_RADIUS` | `0.4` | m | Çarpışma kapsülü yarıçapı. |
| `PLAYER_EYE_HEIGHT` | `1.7` | m | Ses dinleyicisinin (audio listener) yerden yüksekliği. |
| `CAMERA_DISTANCE` | `9.0` | m | Oyuncu + çevresindeki ~6 çiçeği aynı karede tutar; rota kurmak için gereken minimum görüş. |
| `CAMERA_HEIGHT` | `5.5` | m | Yerden yükseklik; olgun/solmuş ayrımının tepeden okunmasını sağlar. |
| `CAMERA_PITCH` | `-22.0` | ° | Yatayın altına bakış. Daha dik olursa ufuk (ve deniz) kaybolur — sütun P4'ü bozar. |
| `CAMERA_YAW_SPEED` | `0.15` | °/piksel | Fare hassasiyeti. |
| `CAMERA_ZOOM_MIN` | `7.0` | m | Dar aralık: oyuncu kuş bakışına kaçıp adayı "çözemesin". |
| `CAMERA_ZOOM_MAX` | `13.0` | m | " |

**Zıplama yoktur.** Kontrol şeması: **WASD** (kamera göreli hareket) · **fare** (kamera) · **E** (topla / teslim et / al / ayrıl) · **Esc** (duraklat). Zıplama, koşma, saldırı, envanter tuşu **yok** — sahip kararı, 14 Ağu 2026, kapalı. `JUMP_*` türünde hiçbir sabit tanımlanmayacak.

---

## 2. Ada ve gün

### 2.1 Ölçek büyütme önerisi (2026-08-15, playtest geri bildirimi — sahip onayı bekliyor) 🔬

**Geri bildirim:** sahip playtest sonrası adanın "profesyonel tasarlanmış, büyüklük hissi veren bir peyzaj gibi durmadığını" belirtti (referans: "Diablo zindanları gibi" — küçük, sıkışık, üretim değeri düşük). **Ton değil, ölçek/üretim değeri sorunu** — parlak/sıcak Ege kimliği (`art-bible.md`) hiç değişmiyor. Araştırma ilkeleri (landmark/"weenie", katmanlı derinlik, dikey çeşitlilik, negatif alan) uygulanacak. Ayrıntı ve landmark planı: `level-lotus-island.md` §1/§2/§3.4/§3.5.

**Yaklaşım — çekirdek döngü sabit kalır, ada büyür:** `ISLAND_RADIUS` uniform bir daire yarıçapı olarak büyüyor, ama **gemi + sazlık + göl kümesi bir blok olarak** yeni güney kıyısına doğru kaydırılıyor — aralarındaki **mesafeler birebir korunuyor** (gemi↔sazlık ~35 m/~8 s, gemi↔göl ~85 m/~19 s, değişmedi). Böylece `PLAYER_SPEED`, `STAGE_RIPE`, `DAY_LENGTH`, `CARRY_CAPACITY`, `LOTUS_TARGET` (5) **hiçbiri yeniden dengelenmiyor** — §9'daki elle hesap aynen geçerli kalıyor. Büyüyen tek şey adanın **kuzey yarısı**: tepe (landmark) çok daha uzağa ve çok daha yükseğe taşınıyor, kuzey kayalığı genişleyip arkasında görkemli bir sivri-kaya silüeti kazanıyor — ikisi de **isteğe bağlı**, alt-hedefi (5) etkilemiyor çünkü sazlık (12) + göl (10) = 22 çiçek tek başına yeterli.

**Neden `DAY_LENGTH` ile birlikte değiştirilmiyor (§11.1'in uyarısına rağmen):** o uyarı "ikisi birden değişirse hangisi işe yaradı bilemeyiz" diyor — bu geçerli bir uyarı ama **burada ikisi birden değişmiyor.** Çekirdek turlama mesafeleri (gemi↔sazlık↔göl) aynen korunduğu için `ISLAND_RADIUS`'un büyümesi turlama süresini/unutuş baskısını hiç değiştirmiyor; sadece adanın **görsel/negatif alan** payını büyütüyor. `DAY_LENGTH` playtest'i (§11.1) bu değişiklikten **bağımsız** kalır — ayrı ayrı ölçülebilirler.

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `ISLAND_RADIUS` | `160.0` (öneri, eski değer `70.0`) | m | Çap 320 m. 150–200 m aralığının ortasına yakın seçildi: adanın kuzey yarısına gerçek bir dağ/kayalık landmark'ı ve geniş bir negatif alan (boş vista) sığdıracak kadar büyük, ama gemi + sazlık + göl kümesi (çekirdek döngü) hiç büyümüyor — bkz. §2.1 üstteki not. |
| `SHIP_POSITION_X` | `0.0` | m | Güney kıyı, merkez hattı. Değişmedi. |
| `SHIP_POSITION_Z` | `-140.0` (öneri, eski değer `-60.0`) | m | Adanın yeni (160 m) güney kıyısına ~20 m kala — eski konumun (70 m yarıçapta ~10–17 m kıyı payı) aynı oranını korur. Sazlık/göl/oyuncu spawn/Lotophagoi koordinatları bu kaymayla **birlikte** kayar (aynı Δz), aralarındaki mesafeler değişmez. Kesin koordinatlar Faz 2.6'nın (`islandLayout.ts`) işi — burada verilen yön/mesafe hedefidir. |
| `DAY_LENGTH` 🔬 | `420.0` | s | 7 dakika. Hedef oturum 5–10 dk. Usta oyuncu ~4.5 dk'da (3 tur + tampon) bitirir, acemi süreyi doldurur. 300 s çok acımasız, 600 s ikinci yarıda gerilim düşüyor. **Playtest'te ölçülecek — §11.1** |
| `SUN_ANGLE_START` | `55.0` | ° | Öğleden sonra. Uzun ama dramatik olmayan gölge. |
| `SUN_ANGLE_END` | `2.0` | ° | Ufka değme = **atmosfer** (K35). Oturum bitmez; gün döner. |
| `SUN_WARN_AT_REMAINING` | `90.0` | s **kalan** | Bu kadar süre **kaldığında** ışık gül rengine döner ve dalga sesi yükselir. Oyuncuya "son tur" sinyali. Karşılaştırma: `kalanSure <= SUN_WARN_AT_REMAINING`. |

---

## 3. Lotus — sayı ve olgunluk

### 3.0 Koşu hedefi ve durak alt-hedefleri (14 Ağu 2026 — M7 sonucu; hub'a dönüşle birlikte doğrulandı, aynı gün)

`LOTUS_TARGET` artık **koşunun tamamının** hedefi değil, **1. durağın (Lotus Adası'nın) kendi alt-hedefi.** "12 gemi" anlatısı tek ve bütün kalıyor ama artık koşu-seviyesinde toplanıyor. **Hub kararı bunu değiştirmiyor:** her durağın toplanabilir öğesi (lotus / Kiklop'un öğeleri / Sirenler'in öğesi) diegetik olarak o durağa kilitli — oyuncu hub'da sırayı seçer ama hangi durakların zorunlu olduğunu değil. Kazanmak hâlâ üçünün de kendi alt-hedefini tamamlamasını gerektirir, hangi sırayla olursa olsun. Ayrıntı: `multi-island-concept.md` §9.3.

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `RUN_TARGET_TOTAL` | `12` | adet | Koşu boyunca sabit — Odysseus'un on iki gemisi (İlyada, Gemiler Kataloğu). Her durak bu toplama kendi alt-hedefiyle katkı verir; anlatı tekliğini korur (bkz. `multi-island-concept.md` §4.2/M5). |
| `LOTUS_TARGET` | `5` | adet | **Kilit (K35, 15 Ağu 2026).** 1. durak alt-hedefi. Lotus 5 + Kiklop 4 + Sirenler 3 = 12. 🔬 düştü. |
| `CYCLOPS_ISLAND_TARGET` 🔬 | `4` (öneri) | adet | **2. durak (Kiklop Mağarası) alt-hedefi.** `island-designer`'ın level-spec'i henüz yazılmadı; bu bir yer tutucu öneri. |
| `SIREN_ISLAND_TARGET` 🔬 | `3` (öneri) | adet | **3. durak (Sirenler Geçidi) alt-hedefi.** Aynı şekilde yer tutucu; en kısa/en yoğun durak olacağı varsayımıyla en düşük pay verildi. |

**K35:** 28’li tarla / zon / §9 denge hesabı `real`’de düştü — yerine `gdd-lotus-island-run.md` (5 rastgele). Aşağıdaki `LOTUS_TOTAL = 28` satırı **`test` / arşiv**. `SUN_ANGLE_END` = ufka değme **atmosferdir**, oturum bitişi değil.

### 3.1 Lotus Adası'nın kendi sayıları

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `LOTUS_TOTAL` | `5` (`real`) / `28` (`test`, arşiv) | adet | **K35:** `real`’de arama = hedef. 28’li küme düştü. |
| `CARRY_CAPACITY` | `4` | adet | 3 fazla küçük (5+ tur, tekrar), 6 fazla büyük (2 tur, gerilim yok). 4 → dolu çantanın unutuş yükünü (+0.6 puan/s) anlamlı kılar. Alt-hedef 12'den 5'e düşse de bu değer sabit kalmalı — P1 sütununun tutarlılığı ve "4'lük ritmin" tüm koşu boyunca öğrenilebilir kalması için (bkz. `multi-island-concept.md` §6/M5). |
| `STAGE_BUD` | `45.0` | s | Tomurcuk. Döngünün en uzun evresi — oyuncu "bunu beklemeye değmez" diyebilmeli. |
| `STAGE_HALF_OPEN` | `25.0` | s | Yarı açık. Olgunluğa geri sayım; oyuncunun planlama penceresi. Ada geçişine (31 s) az yetmez → "yakındakini bekle, uzaktakine yetişemezsin". |
| `STAGE_RIPE` | `30.0` | s | **Hasat penceresi.** Ada geçiş süresine (~31 s) kasten eşitlendi: gördüğün tek bir çiçeğe her yerden yetişirsin, **ikisine birden asla.** Oyunun tek zor kararı buradan doğar. |
| `STAGE_WITHERED` | `20.0` | s | Solmuş. Cezayı görünür kılacak kadar uzun, adayı çöplüğe çevirmeyecek kadar kısa. |
| `LOTUS_CYCLE` | `120.0` | s | `[TÜRETİLMİŞ]` = BUD + HALF_OPEN + RIPE + WITHERED. Bir gün (420 s) içinde her çiçek 3.5 kez olgunlaşır → kaynak asla tükenmez, zaman tükenir. |
| `LOTUS_PHASE_SEED` | `1181` | int | Başlangıç faz kaymaları bu tohumla dağıtılır. Deterministik = öğrenilebilir rota (sütun P3). |

**Evre enum'u** `[SABİT DEĞİL]` — `LotusStage = { BUD, HALF_OPEN, RIPE, WITHERED }`. Hasat sonrası bitki `LotusStage.BUD`'a döner (ayrı bir respawn sistemi yoktur).

---

## 4. Toplama ve teslim

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `HARVEST_RANGE` | `2.2` | m | Yanlışlıkla komşu çiçeği hedeflemeyecek kadar dar. Çiçekler arası minimum mesafe 3.0 m (§7). |
| `HARVEST_HOLD` | `1.2` | **s** | Basılı tutma süresi. Bir taahhüt olacak kadar uzun, 12+ tekrarda yormayacak kadar kısa. Toplam maliyet: 12 × 1.2 = 14.4 s = günün %3.4'ü. |
| `HARVEST_CANCEL_MOVE` | `0.3` | m | Toplama sırasında bu mesafeden fazla hareket → ilerleme **sıfırlanır** (yarım kalmaz). Tuş bırakınca da sıfırlanır. |
| `DELIVER_RANGE` | `4.0` | m | Gemi iskelesinin sonu. Cömert: teslim anı hiçbir zaman "nişan alma" problemi olmamalı. |
| `DELIVER_TIME_PER` | `0.4` | s | Çiçek başına. Dolu çanta = 1.6 s. Her çiçek için ayrı ses/animasyon vuruşu → ödül ritmi. |
| `DELIVER_PARTIAL` | `true` | bool | Tek çiçekle de teslim yapılabilir. Küçük turlar geçerli (güvenli ama yavaş) bir strateji olmalı. |

---

## 5. Unutuş (memory) sistemi

Ölçek `0.0` – `MEM_MAX`. 0 = zihin açık, 100 = kayıp eşiği.

> **Koşu-seviyesi not (14 Ağu 2026 — M7 sonucu; hub bağlamına taşındı aynı gün, `multi-island-concept.md` §9.2):** unutuş artık **ada başına sıfırlanmıyor, koşu boyunca taşınıyor** — hub'a dönüş de bir sıfırlama noktası değildir. Bir durak **başarıyla** bitirilip hub'a dönerken `MEM_ISLAND_RELIEF_PCT` kadar kısmi bir bağışlama uygulanır (§5.2); başarısız dönüşte (gün doldu ya da `MEM_GRACE` tükendi) bağışlama uygulanmaz. **⚠️ `MEM_MAX`'a ulaşıp `MEM_GRACE` dolduğunda ne olacağı flag'li, kapanmadı** — eski metin ("tüm koşu biter") hub'sız varsayımla yazıldı; bkz. `gdd-memory-system.md` §3.1 madde 9 ve `multi-island-concept.md` §9.5.

> **Motor notu (14 Ağu 2026):** `src/constants.ts`'teki `real` world profile bu
> bölümdeki puan/s oranlarını (`MEM_PASSIVE`, `MEM_SCENT`, `MEM_PER_CARRIED`,
> `MEM_ON_HARVEST`, `MEM_SHIP_AURA`, `MEM_SEA_RECOVER`) motorun hâlâ 0–1 float
> olan iç `memory` state'ine **100'e bölerek** çevirir — örn. pasif kazanç
> `0.25` puan/s → dahili `0.0025`/s. Bu geçici, sadece motor-tarafı bir
> dönüşümdür ve Faz 1.6'nın "unutuşu 0–1'den 0–100'e çevir mi" kararını
> **öngörmez** — o ölçek kararı hâlâ açık (bkz. `docs/production/roadmap.md`
> §4.1 eski K2, artık iki world profile ile kapandı). Playtest'e ertelenen
> §11.2 `MEM_SEA_RECOVER` gibi değerler bu dönüşümden aynen etkilenir; `real`
> profildeki `seaRecover` dahili değeri `0.06`/s'dir.

### 5.1 Artışlar

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `MEM_MAX` | `100.0` | puan | Yuvarlak ölçek; yüzde olarak da okunabilir. |
| `MEM_START` | `0.0` | puan | **Yalnızca koşunun ilk durağı (Lotus Adası) için geçerli.** Sonraki duraklar `MEM_ISLAND_RELIEF_PCT` formülünden türeyen bir değerle başlar — bkz. §5.2 ve `gdd-memory-system.md` §3.1. |
| `MEM_PASSIVE` | `0.25` | puan/s | Sadece adada olmanın bedeli. Tek başına 400 s'de dolar ≈ bir gün. "Hiçbir şey yapmazsan da kaybedersin." |
| `MEM_SCENT` | `0.35` | puan/s | Açmış bir çiçeğin `SCENT_RADIUS` yakınındayken **ek**. **Yığılmaz** — bir çiçek de yirmi çiçek de aynı oranı verir. |
| `SCENT_RADIUS` | `12.0` | m | Tarlada neredeyse hep içindesin, kıyıda hiç değilsin. Bölgeleri mekanik olarak ayırır. |
| `MEM_PER_CARRIED` | `0.15` | puan/s · çiçek | Taşınan **her** çiçek. Dolu çanta (4) = +0.6 puan/s. Risk/ödül pompasının kendisi: en verimli tur aynı zamanda en tehlikeli tur. |
| `MEM_ON_HARVEST` | `4.0` | puan | Toplama anındaki tek seferlik koku darbesi. 12 hasat = 48 puan; tek başına öldürmez ama yarım ölçek eder. |
| `MEM_WITHERED_PENALTY` | `12.0` | puan | Solmuş çiçeğe dokunma cezası. Bir hasadın 3 katı — hata pahalı, ama tek hata oyunu bitirmez. |
| `MEM_LOTOPHAGOS_TRADE` | `20.0` | puan | İkramı kabul etmenin bedeli (§6). |
| `MEM_RATE_MAX` | `1.20` | puan/s | `[TÜRETİLMİŞ]` = 0.25 + 0.35 + 4 × 0.15. Teorik tavan; sıfırdan doluya 83 s. |

### 5.2 Azalışlar

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `MEM_SEA_RECOVER` 🔬 | `-6.0` | puan/s | Ayaklar **tuzlu** suda/ıslak kumdayken. 5 s = 30 puan. Güçlü ama kıyıya inmeyi gerektirir → günden yer. **Playtest'te ölçülecek — §11.2** |
| `MEM_SHIP_AURA` | `-2.0` | puan/s | Gemiye `SHIP_AURA_RADIUS`'tan yakınken pasif. Teslim yaklaşımını ödüllendirir; gemi görsel değil **mekanik** olarak "ev" olur. |
| `SHIP_AURA_RADIUS` | `8.0` | m | `MEM_SHIP_AURA`'nın çalıştığı yarıçap. |
| `SEA_WATER_MIN_DEPTH` | `0.1` | m | `MEM_SEA_RECOVER` bu su derinliğinin üstünde tetiklenir. `SHORE_WET_BAND` içindeki ıslak kum da sayılır. |
| `MEM_PER_DELIVERED` | `-10.0` | puan | Teslim edilen **her** çiçek. Dolu teslim = -40, bir turun tipik kazancını (~45) neredeyse sıfırlar → dikkatli oyun başabaş, açgözlü oyun tırmanır. |
| `MEM_LAKE_RECOVER` | `0.0` | puan/s | İç göl **tatlı sudur, iyileştirmez.** Kasıtlı tuzak: oyuncu bir kez dener ve "tuz" kuralını öğrenir. |
| `MEM_ISLAND_RELIEF_PCT` 🔬 | `0.4` | oran (0–1, birimsiz) | **Hub'a dönüş bağışlaması** (14 Ağu 2026'da "ada geçişi" olarak tanımlandı, aynı gün hub bağlamına taşındı — `multi-island-concept.md` §9.2). Bir durak **başarıyla** bitirilip hub'a dönülürken **tek seferlik** uygulanır: `unutuş_hub_dönüşü = unutuş_durak_bitişi × (1 − MEM_ISLAND_RELIEF_PCT)`. Başarısız dönüşte (gün doldu / `MEM_GRACE` tükendi) uygulanmaz — oyuncu ham değerle hub'a taşınır. Temiz biten oyuncu (düşük unutuşla ayrılan) gerçek bir avantajla başlar; kıl payı biten oyuncu zaten baskı altında devam eder — koşu boyunca **yükselen bir zemin baskısı** yaratır ("ne kadar ileri gidersen dönüşü o kadar unutursun"). Tam sıfırlama (`=1.0`) hub'ı bir kaçış valfine çevirip bedeli siler; tam taşıma (`=0.0`) sonraki durakları orantısız cezalandırır. **Playtest'te ölçülecek** — `MEM_SEA_RECOVER`/`HUD_VAGUE_COUNTER` gibi §11'e eklenmesi gereken yeni bir aday. |

Adada başka hiçbir pasif iyileşme **yoktur**. Tek çare deniz ve gemi. `[SABİT DEĞİL]` **Hub'a dönüşte** tek iyileşme kaynağı `MEM_ISLAND_RELIEF_PCT`'tir, yalnızca başarılı tamamlanışta; bkz. yukarı. `[SABİT DEĞİL]`

### 5.3 Eşikler

| İsim | Değer | Birim | Ad | Oyuncuya olan |
|---|---|---|---|---|
| — | `0.0`–`24.9` | puan | Açık | Normal. HUD tam. |
| `MEM_THRESHOLD_HAZE` | `25.0` | puan | **Sis** | Süt beyazı vinyet başlar. Uzak sesler alçalır. Pusula oku titrer. |
| `MEM_THRESHOLD_DRIFT` | `50.0` | puan | **Kayış** | **Pusula oku kaybolur.** Teslim sayacı muğlaklaşır (🔬 §11.3). Doygunluk %30 düşer. |
| `MEM_THRESHOLD_LOST` | `75.0` | puan | **Unutuş** | **HUD tamamen kaybolur.** Ekran süt beyazına bulanır. Yürüyüş sapar. Boğuk uğultu. |
| `MEM_MAX` | `100.0` | puan | **Kalış** | `MEM_GRACE` süreli son şans başlar. |

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `MEM_GRACE` | `10.0` | s | 100'e vardıktan sonraki son şans. `PLAYER_SPEED` ile 45 m → kıyının makul yakınındaysan kurtulursun, iç göldeysen kurtulamazsın. Ani ölüm yerine **hak edilmiş** kayıp. |
| `MEM_THRESHOLD_HYSTERESIS` | `3.0` | puan | Eşiğin altına inerken 3 puan fazladan gerekir. Sınırda HUD'un yanıp sönmesini engeller. |
| `DRIFT_MAX_ANGLE` | `15.0` | ° | Eşik 3'te hareket yönüne eklenen sapma genliği. |
| `DRIFT_PERIOD` | `4.0` | s | Sapmanın salınım periyodu. Salınımlı → "sarhoş yürüyüş" okunur, ters telafi öğrenilemez. |

### 5.4 Sunum sabitleri (unutuşun görsel/işitsel ifadesi)

Hepsi `0.0`–`1.0` normalize edilmiş `etki = clamp01((unutuş − başlangıç) / (bitiş − başlangıç))` eğrisiyle uygulanır.

| İsim | Başlangıç | Bitiş | Maksimum | Birim |
|---|---|---|---|---|
| `FX_VIGNETTE` | `25.0` | `100.0` | `0.85` | opaklık 0–1 |
| `FX_DESATURATE` | `50.0` | `100.0` | `0.60` | doygunluk kaybı 0–1 |
| `FX_BLUR` | `75.0` | `100.0` | `3.0` | piksel |
| `FX_LOWPASS_HZ_MAX` | `25.0` | `100.0` | `18000.0` → `900.0` | Hz (kesim frekansı düşer) |
| `FX_FOG_DISTANCE` | `25.0` | `100.0` | `120.0` → `45.0` | m (sis yaklaşır) |
| `FX_GHOST_OFFSET` *(yeni, 14 Ağu 2026 — bayılma katmanı)* | `75.0` | `100.0` | `2.5` | piksel — kenar bölgesinde çift görüntü (ghosting) kayması. `FX_BLUR`'un (3 px) altında kalmalı, onunla yarışmaz. Bkz. `gdd-memory-system.md` §9.1. |
| `FX_BREATH_AMPLITUDE` *(yeni, 14 Ağu 2026 — bayılma katmanı)* | `0.0` | `100.0` | `0.04` | `FX_VIGNETTE` opaklığına eklenen sinüsoidal salınımın genliği (0–1 ölçeğinde, ~%5 tavan). Eşiksiz, unutuş `>0` olduğu sürece hafifçe aktif — "nefes" hissi sürekli, eşiğe bağlı sıçramaz. |

`FX_BREATH_PERIOD` = `5.0` s *(yeni, 14 Ağu 2026)* — nefes ritminin salınım periyodu, sabit (eşiğe bağlı değişmez). `DRIFT_PERIOD` (4.0 s) ile aynı büyüklük ailesinde ama ayrı bir sabit — ikisi karışmasın, sapma daha hızlı/keskin, nefes daha yavaş/yumuşak hissetmeli.

**Ayrık** olan tek şey bilgidir: pusula ve HUD ya vardır ya yoktur, `HUD_FADE_TIME` süresinde solar. Dalga sesi `FX_LOWPASS_HZ_MAX`'tan **muaftır** — en kötü anda bile duyulur.

---

## 6. Lotophagoi

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `LOTOPHAGOS_COUNT` | `3` | adet | Sazlık 1, iç göl 1, tepe eteği 1. |
| `LOTOPHAGOS_GIFT` | `1` (`real`) / `2` (`test`) | çiçek | **K35:** `real` kişi başı 1; 3 gezen + kadın = 4 < 5. `test` eski 2. |
| `LOTOPHAGOS_MEM_COST` | `20.0` | puan | `MEM_LOTOPHAGOS_TRADE` ile aynı değer. Üçünü de kabul = +60 puan. Meşru ama neredeyse ölümcül bir hız stratejisi — kasıtlı. |
| `LOTOPHAGOS_ONCE` | `true` | bool | Her figür bir kez ikram eder. Tekrar yaklaşınca sadece bakar. |
| `LOTOPHAGOS_RANGE` | `3.0` | m | İkram bu mesafede tetiklenir; E ile kabul, uzaklaşarak reddedilir. Reddetmenin bedeli yok. |

---

## 7. Yerleşim kuralları

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `LOTUS_MIN_SPACING` | `3.0` | m | `HARVEST_RANGE` (2.2) + tampon. İki çiçek asla aynı anda hedeflenemez. |
| `ZONE_REED_COUNT` | `12` | adet | Sazlık — yakın, yoğun, öğretici tarla. |
| `ZONE_LAKE_COUNT` | `10` | adet | İç göl — en zengin, en uzak. Açgözlülük bölgesi. |
| `ZONE_HILL_COUNT` | `6` | adet | Tepeler — seyrek. Tepenin ödülü çiçek değil manzaradır. |
| `HILL_VIEW_HEIGHT` | `22.0` (öneri, eski değer `14.0`) | m | Sazlığın ve gölün tamamının görülebildiği minimum yükseklik. **2026-08-15 güncellemesi (§2.1):** tepe artık çok daha yüksek (`HILL_LANDMARK_HEIGHT`, aşağıda) ve çok daha uzakta olduğu için manzara noktası da yükseldi — eski 14 m yeni ölçekte çiçek tarlalarının tamamını göstermeye yetmez. Beat 3 tetiği. |
| `HILL_LANDMARK_HEIGHT` *(yeni, 2026-08-15 öneri)* | `48.0` | m | Tepenin gerçek zirve yüksekliği (deniz seviyesinden), `HILL_VIEW_HEIGHT`'tan (22 m, "manzara açılır" eşiği) ayrı bir sayı — zirve manzara noktasından daha yüksek olmalı ki tepe uzaktan da (adanın her yerinden) dominant bir silüet olarak okunsun. Şu an kodda tek bir global gürültü fonksiyonuyla (`ISLAND.domeHeight`+`hillAmp`, toplam ~3.7 m) üretiliyor — bu sayıya ulaşmak için **ayrı, tepe merkezli bir yükselti fonksiyonu** gerekiyor (bkz. `level-lotus-island.md` §7), adanın geri kalanını şişirmeden. |
| `SHORE_WET_BAND` | `3.0` | m | Kıyıda `MEM_SEA_RECOVER`'ın çalıştığı ıslak kum şeridinin genişliği. |

**Çiçek koordinatları burada değil** `[SABİT DEĞİL]` — 28 konumun tamamı el yerleşimidir ve `docs/design/level-lotus-island.md` §2–§4'te tanımlıdır. Motor tarafı bunları ayrı bir veri dosyasından (`islandLayout.ts` vb.) okumalı; `constants.ts`'e gömülmemeli.

---

## 8. Arayüz

Bu tablo **sabit listesi değildir** `[SABİT DEĞİL]` — HUD öğelerinin yerleşim ve davranış tarifidir. Sayısal olan tek değer `HUD_FADE_TIME`'dır.

| Öğe | Konum | Davranış |
|---|---|---|
| Çanta | Sol üst | `0/4`. Dolduğunda kenar rengi değişir; reddedilen toplamada titrer. |
| Teslim | Sağ üst | `0/12`. Her teslimde tek tek sayar. Eşik 2'de muğlaklaşır (🔬 §11.3). |
| Güneş | Üst orta | Yay. Rakam yok. |
| Pusula | Alt orta | Gemi yönü oku. Eşik 2'de kaybolur. |
| Unutuş | Ekran çerçevesi | Ayrı bir bar **yok** — `FX_VIGNETTE`'in kendisi ölçektir. Sayı gösterilmez. |

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `HUD_FADE_TIME` | `1.5` | s | Eşik geçişlerinde HUD öğelerinin kaybolma/geri gelme süresi. Ani kesme "bug" gibi okunur. |
| `HUD_VAGUE_COUNTER` 🔬 | `true` | bool | Eşik 2'de teslim sayacı rakam yerine muğlak ifade gösterir. **Playtest'te ölçülecek — §11.3** |

---

## 9. Denge kontrolü (elle hesap)

Tipik verimli tur — gemiden çıkış, 4 çiçek, dönüş:

| Aşama | Süre | Unutuş değişimi |
|---|---|---|
| Gemi → sazlık (35 m) | 8 s | +2.0 (pasif) |
| 4 çiçek topla (~60 m yürüyüş + 4 × 1.2 s tutma) | 18 s | +10.8 (pasif+koku, artan taşıma) + 16.0 (4 hasat) |
| Sazlık → gemi (dolu, 35 m) | 8 s | +9.6 (pasif + taşıma×4) |
| Teslim (4 çiçek) | 1.6 s | **-40.0** |
| **Toplam** | **~36 s** | **-1.6** |

**Sonuç:** temiz bir tur başabaşın hafif altında. Dikkatli oyuncu unutuşu yönetebilir ama **hiç boşluğu yoktur**; bir solmuş çiçek (+12) ya da 20 s'lik bir bekleme (+12) turu artıya çevirir. Tam da istenen his.

Üç temiz tur = 108 s + arama/bekleme payı ≈ 240–300 s. `DAY_LENGTH` 420 s → usta oyuncu için ~%40 tampon, acemi için yeterince dar.

**Not (2026-08-15, §2.1 ölçek önerisiyle):** bu hesap **değişmeden** geçerli — gemi↔sazlık (35 m) ve gemi↔göl (85 m) mesafeleri `ISLAND_RADIUS` 70→160'a çıksa da aynı kalıyor (kümenin blok kayması, bkz. §2.1). Tepeye gidiş-dönüş bu hesabın **dışında** tutulur çünkü zaten "verimli tur" tanımına girmiyor (bkz. `level-lotus-island.md` §3.4/§5) — artık daha da uzak (~200 m tek yön, ~44 s) ve daha da bariz biçimde "verimlilik değil manzara" turudur.

---

## 10. Kapanan kararlar

| Karar | Sonuç | Tarih |
|---|---|---|
| Zıplama olacak mı | **Hayır.** Kaldırıldı; `JUMP_*` sabiti tanımlanmayacak. Kontroller: WASD + fare + E + Esc. | 14 Ağu 2026 |
| Çoklu-ada yapısı (roadmap eski K2'nin büyütülmüş hâli, `multi-island-concept.md` M7) | **Seçenek 3.** 3 durak (Lotus + Kiklop + Sirenler), ~~hub yok, tek kesintisiz koşu~~ **(aynı gün tersine çevrildi, aşağıdaki satıra bkz.)**, unutuş taşınıyor (`MEM_ISLAND_RELIEF_PCT`), hedef koşu-toplamında (`RUN_TARGET_TOTAL = 12`, durak başı: Lotus 5 / Kiklop 4 / Sirenler 3 — öneri, kesinleşmedi). | 14 Ağu 2026 |
| Kiklop Mağarası'nın algılanma (tespit) sistemi — `island-designer`'ın `level-cyclops-cave.md`'de önerdiği | **Onaylandı.** Mevcut unutuş sistemleriyle çelişmiyor (tek besleme noktası, ikinci can barı değil). İstemsiz envanter kaybı (`CAUGHT_ITEM_LOSS`) yeni bir sözleşme ama **yalnızca bu durakla sınırlı** kalması şartıyla kabul edildi. Sabitler §12'de, ayrıntı `gdd-detection-cyclops.md`'de. | 14 Ağu 2026 |
| Hub'a dönüş (M7'nin "hub yok" alt-maddesinin tersine çevrilmesi) | **Gerçek hub var** — oyuncu 3 durağı serbest sırayla seçer. Unutuş taşınmaya devam ediyor, tetik noktası "hub'a dönüş" (§5.2). `RUN_TARGET_TOTAL` ve durak alt-hedefleri değişmedi (§3.0). Oturum süresi (~20–30 dk) değişmedi, hub gezinme süresi ihmal edilebilir tutulmalı (hub = hafif seçim ekranı, dördüncü oynanabilir alan değil). **Kapanmayan tek soru:** koşu-bazlı kayıp (K27) — hub'sız varsayımla yazıldı, artık flag'li. Ayrıntı: `multi-island-concept.md` §9. | 14 Ağu 2026 (M7 ile aynı gün) |
| Bayılma/sanrı yeniden çerçevelemesi (playtest geri bildirimi, `hallucination-reframe-concept.md`) | **İkisi de onaylandı:** (1) unutuşun sunumu "bayılma/bilinç gevşemesi" katmanını içerecek şekilde genişledi — yeni `FX_GHOST_OFFSET`/`FX_BREATH_AMPLITUDE`/`FX_BREATH_PERIOD` (§5.4), çekirdek sayılar değişmedi. (2) **Lotus Adası'na özgü** yeni bir "sanrı figürleri" sistemi eklendi (§13, `gdd-lotus-hallucination.md`) — can/envanter kaybı yok (ilke korundu), temas = unutuş sıçraması + geçici `DRIFT` şiddetlenmesi, Kiklop'un `CAUGHT` diliyle aynı aile. Yalnızca 1. durak — Kiklop/Sirenler bu sabitleri okumaz. | 14 Ağu 2026 |

---

## 11. Playtest'te ölçülecek değerler

Bu üç değer **oynanır sürüm elde olmadan değiştirilmeyecek.** Masa başında tartışılmaları yasak; ölçüm sonucu beklenir.

### 11.1 `DAY_LENGTH` = 420 s 🔬
- **Ölçülecek:** ilk oyununu oynayan bir oyuncunun bitirdiği teslim sayısı ve toplam süre.
- **Karar kriteri:** acemi oyuncu ilk oyunda 12'yi hiç tamamlayamıyorsa **480 s**'ye çıkar; herkes 3 dakikanın altında bitiriyorsa **360 s**'ye iner. İkisi de olmuyorsa 420 kalır.
- **Uyarı:** `ISLAND_RADIUS` ile aynı anda değiştirilmez — ikisi de tur süresini etkiler, birlikte oynatılırsa hangisinin işe yaradığı ölçülemez.

### 11.2 `MEM_SEA_RECOVER` = -6.0 puan/s 🔬
- **Ölçülecek:** oyuncunun her teslim turundan sonra refleks olarak denize girip girmediği (tur başına deniz teması sayısı).
- **Karar kriteri:** oyuncu "her turdan sonra 5 saniye denize gir" makrosunu buluyorsa oran düşürülecek — **unutuş bir gerilim olmalı, bir vergi değil.** Çare sırası: (1) oranı -4.0'a indir, (2) gerekirse kademeli yap (ilk 3 s tam, sonrası yarım). Tersine, oyuncular kıyıyı hiç güvenli hissetmiyorsa oran korunur.
- **Uyarı:** `MEM_PER_DELIVERED` ile aynı anda değiştirilmez; ikisi de iyileşme kaynağıdır, birlikte artırılırsa unutuş tamamen anlamsızlaşır.

### 11.3 `HUD_VAGUE_COUNTER` = true (eşik 2'de muğlak sayaç) 🔬
- **Ölçülecek:** oyuncu eşik 2'yi geçtikten sonra kaç çiçek teslim ettiğini hâlâ biliyor mu; kaldığı yeri gemi direklerindeki bezlerden sayabiliyor mu.
- **Karar kriteri:** oyuncu ilerlemesini tamamen kaybediyor ve bunu "bug" ya da haksızlık olarak okuyorsa `false` yapılır. Direklerdeki bezleri sayarak kendini toparlıyorsa `true` kalır — tema açısından tercih edilen budur.
- **Bağlı test:** gemi direklerine bağlanan bez ilerleme göstergesi uzaktan okunabiliyor mu (`level-lotus-island.md` açık soru 2). Bu ikisi **birlikte** test edilmeli.

### 11.4 `MEM_ISLAND_RELIEF_PCT` = 0.4 🔬 (yeni, 14 Ağu 2026; hub bağlamına taşındı aynı gün)
- **Ölçülecek:** bir durağı bitirip hub'a dönen oyuncunun taşıdığı unutuş değeri, sıradaki durağı ne kadar erken zorlaştırıyor (özellikle kıl payı biten oyuncular ikinci durağı hiç tamamlayamıyorsa).
- **Karar kriteri:** oyuncular sistematik olarak hub'dan çıkışta "önceki turdan miras kalan" bir unutuşla başlayıp adil bulmuyorsa oran yükseltilir (daha çok bağışlama, `0.4` → `0.6`); tersine, taşıma hiç hissedilmiyorsa (duraklar birbirinden kopuk hissettiriyorsa) düşürülür (`0.4` → `0.2`).
- **Uyarı:** bu değer henüz bir level-spec üstünde test edilmedi (Kiklop/Sirenler henüz yazılmadı) — ilk ölçüm bu iki durak oynanır hale gelince mümkün. Hub'ın kendisi de henüz uygulanmadı (`gameplay-programmer`'ın işi) — ölçüm hub UI'ı çalışır hale gelince mümkün.

### 11.5 `HALLUCINATION_THRESHOLD` = 60.0 puan · `HALLUCINATION_CONTACT_MEM_SPIKE` = 10.0 puan 🔬 (yeni, 14 Ağu 2026)
- **Ölçülecek:** (a) oyuncular figürleri gerçekten bir "kaçış/rota" kararı olarak mı okuyor yoksa dekor mu sanıyor; (b) temas sıklığı — bir oyunda kaç kez temas ediliyor, bunun toplam unutuş bütçesine etkisi.
- **Karar kriteri:** oyuncular figürleri hiç fark etmiyorsa (ya eşik çok geç geliyor ya da temas riski hiç hissedilmiyor) `HALLUCINATION_THRESHOLD` düşürülür ve/veya `HALLUCINATION_CREATURE_COUNT`/`HALLUCINATION_ROUTE_BIAS_RADIUS` artırılır. Temas sıklıkla oluyor ve oyuncular "adaletsiz" buluyorsa `HALLUCINATION_CONTACT_MEM_SPIKE` düşürülür ya da `HALLUCINATION_CONTACT_RADIUS` daraltılır.
- **Uyarı:** bu ikisi `MEM_SEA_RECOVER`/`MEM_PER_DELIVERED` çiftiyle aynı anda değiştirilmez — sanrı sisteminin kendi bütçesi, unutuşun temel oranlarından ayrı ölçülmeli, yoksa hangi değişikliğin işe yaradığı belirsizleşir.

### 11.6 `NET.leaderboard.minTimeMs` = 45 000 ms 🔬 (yeni, 19 Ağu 2026 — yalnız K35)

- **Ne:** K35 "Beş yeter" online leaderboard'unun kabul ettiği **en kısa** süre. Bunun altındaki gönderimler sunucu tarafında reddedilir (`time_invalid`).
- **Statü: bu bir ölçüm değil, placeholder.** Meşru hiçbir koşuyu reddetmesin diye kasten çok düşük seçildi. Şu an gerçek bir speedrun süresi elimizde yok.
- **Ölçülecek:** `real` profilde bilerek yapılmış, oyunu bilen bir oyuncunun 5 lotusu teslim edip dümene geçtiği en hızlı koşunun süresi (ayrılış sinematiği dahil — bkz. `gdd-lotus-island-run.md` §10.2, `FLOW.departSeconds` skora dahildir).
- **Karar kriteri:** ölçülen en hızlı sürenin **~%60'ı** yeni değer olur. Yani 3:00'lık bir speedrun ölçülürse eşik ~108 000 ms'ye çıkar.
- **Uyarı:** bu sayı **iki yerde** yaşıyor — `src/constants.ts` (`NET.leaderboard.minTimeMs`, yalnız erken uyarı kopyası) ve `scripts/supabase/k35-leaderboard.sql` (otorite). **İkisi aynı anda güncellenmeli**, yoksa istemci geçirdiği bir skorun sunucudan reddedildiğini görür. Eşiğin tasarım evi `gdd-lotus-island-run.md` §10.5'tir.
- **Sahibi:** QA — Paca LOT-59.

### Playtest ölçüm listesi (kısa)

| # | Ölçülen | Nasıl | Eşik |
|---|---|---|---|
| 1 | İlk oyun bitiş süresi ve teslim sayısı | Otomatik log | 12/12 tamamlanamıyor → `DAY_LENGTH` ↑ |
| 2 | Tur başına deniz teması sayısı | Otomatik log | Her turda ≥1 ve kasıtlıysa → `MEM_SEA_RECOVER` ↓ |
| 3 | Eşik 2 sonrası "kaç çiçek teslim ettin?" sorusu | Sözlü, oyun sonrası | Bilmiyor + rahatsız → `HUD_VAGUE_COUNTER` = false |
| 4 | Anlık olgun çiçek sayısı | Otomatik örnekleme | 4'ün altına düzenli iniyorsa → `LOTUS_TOTAL` ↑ |
| 5 | Tepeye çıkan oyuncu oranı | Otomatik log | %30'un altı → tepe yeniden değerlendirilir |
| 6 | Kayıp finaline ulaşma oranı | Otomatik log | %0 ise unutuş etkisiz, %80+ ise çok sert |
| 7 | Durak geçişinde taşınan unutuşun sonraki durağı ne kadar zorlaştırdığı | Otomatik log | Bkz. §11.4 |
| 8 | Sanrı figürü temas sıklığı ve oyuncu tepkisi | Otomatik log + sözlü | Bkz. §11.5 |
| 9 | K35 bilinçli speedrun'un en hızlı süresi | Elle ölçüm (`real`, tek koşu) | Bkz. §11.6 — `minTimeMs` = ölçülenin %60'ı |

---

## 12. Kiklop Mağarası (2. durak) — algılanma (tespit) sistemi (yeni, 14 Ağu 2026)

> **Kaynak:** `island-designer`'ın `docs/design/level-cyclops-cave.md`'de önerdiği sistem, `game-designer` tarafından onaylandı ve karara bağlandı. Ayrıntı/gerekçe/formüller: `docs/design/gdd-detection-cyclops.md`. **Bu sistem yalnızca Kiklop Mağarası'nda geçerli** — Lotus Adası ve Sirenler Geçidi bu sabitleri okumaz.
> **Ad uyuşmazlığı düzeltmesi:** `level-cyclops-cave.md` bu adanın toplama hedefini `CYCLOPS_ITEM_TARGET` olarak adlandırıyor; §3.0'da zaten tanımlanan `CYCLOPS_ISLAND_TARGET` ile **aynı değeri (4)** taşıyan aynı kavram. Bu dosyada tek isim (`CYCLOPS_ISLAND_TARGET`) kullanılıyor — kod tarafı da bunu tek isimle uygulamalı.

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `DETECT_MAX` | `100.0` | puan | Unutuş ölçeğiyle aynı büyüklük/model — ikinci bir zihinsel sözleşme öğrenilmesin. |
| `DETECT_RATE_SHADOW_STILL` | `0.0` | puan/s | En güvenli hücre — "dur, gölgede kal" dersinin ödülü tam. |
| `DETECT_RATE_SHADOW_MOVING` | `3.0` | puan/s | Gölgede hareket etmek sessiz ama sıfır risk değil — gölge dışına taşma ihtimali. |
| `DETECT_RATE_LIT_STILL` | `4.0` | puan/s | Aydınlıkta durgun kalmak görünürsün ama sessizsin — orta risk. |
| `DETECT_RATE_LIT_MOVING` | `12.0` | puan/s | **En riskli hücre.** PRESENT evresinde (×3.0 çarpanla, aşağıda) sıfırdan dolmaya ~2.8 s — kasıtlı olarak anlık cezalandırıcı. |
| `DETECT_DECAY` | `8.0` | puan/s | Güvenli bölgede/evrede toparlanma; "gölge cebinde bekle" stratejisinin hissedilir ödülü. |
| `CYCLOPS_PHASE_OUT` | `58.0` | s | Polyphemos DIŞARIDA — taban oranlar, çarpan yok. |
| `CYCLOPS_PHASE_RETURN` | `7.0` | s | DÖNÜŞ telegrafı — `CYCLOPS_RETURN_MULTIPLIER` uygulanır, tepki payı verir (`MEM_GRACE` felsefesiyle aynı). |
| `CYCLOPS_PHASE_PRESENT` | `30.0` | s | İÇERİDE — `CYCLOPS_PRESENT_MULTIPLIER` uygulanır (yalnızca ağıllar/iç nöy odalarında). |
| `CYCLOPS_CYCLE` | `95.0` | s | `[TÜRETİLMİŞ]` = OUT + RETURN + PRESENT. Lotus'un 120 s'lik döngüsünden kısa — bu adanın oturum payı da kısa. |
| `CYCLOPS_RETURN_MULTIPLIER` | `1.5` | çarpan | DÖNÜŞ evresinde tüm `DETECT_RATE_*`'e uygulanır. |
| `CYCLOPS_PRESENT_MULTIPLIER` | `3.0` | çarpan | PRESENT evresinde, yalnızca ağıllar/iç nöy odalarında `DETECT_RATE_*`'e uygulanır; depo/mağara ağzı bu evrede de çarpansız kalır. |
| `CAUGHT_ITEM_LOSS` | `true` | bool | Yakalanma anında çantadaki **tüm** azık sıfırlanır — istemsiz envanter kaybı, bu projede bir ilk ve **yalnızca bu durakla sınırlı** (bkz. `gdd-detection-cyclops.md` §1.1). |
| `CAUGHT_MEM_SPIKE` | `30.0` | puan | Tek unutuş kaynağına tek seferlik ekleme. `MEM_WITHERED_PENALTY` (12) ve `MEM_LOTOPHAGOS_TRADE` (20) ile aynı aile, en büyüğü. |
| `CAUGHT_RESPAWN_POINT` | `"cave_mouth"` (D≈4) | `[SABİT DEĞİL]` | **Karar (14 Ağu 2026, `game-designer`):** mağara ağzı — koşu-bazlı kayıp finaliyle (gemiye/dışarı ışınlama) karışmasın diye kasıtlı olarak daha yumuşak. Gerekçe: `gdd-detection-cyclops.md` §3.4 madde 4. |
| `CYCLOPS_ITEM_TOTAL` 🔬 | `7.0` (öneri, aralık 6–8) | adet | 2 depo + 3 ağıllar + 2 iç nöy. Hedefin (`CYCLOPS_ISLAND_TARGET` = 4) 1.75 katı — Lotus'tan (28/12≈2.3×) daha dar tampon çünkü öğe yenilenmiyor. **Playtest'te ölçülecek** — yakalanma sonrası oyuncu hâlâ 4'e ulaşabiliyor mu. |
| `CYCLOPS_LIGHT_RADIUS` 🔬 | `6.0` (öneri) | m | `SCENT_RADIUS` deseninin yeniden kullanımı — meşale/ocak/mağara ağzı çevresinde "aydınlık" bayrağı üreten sabit yarıçap. Kesin değer mağara geometrisi netleşince (`island-designer`'ın iş) doğrulanmalı. |

**Kayıt dışı bırakılan (bilerek):** `CYCLOPS_CAVE_DEPTH` (65 m), `CYCLOPS_COVE_DEPTH` (15 m), oda-başı öğe sayıları (`CYCLOPS_ITEM_ANTECHAMBER_COUNT`=2, `CYCLOPS_ITEM_PENS_COUNT`=3, `CYCLOPS_ITEM_INNER_COUNT`=2) gibi salt-geometri sabitleri `level-cyclops-cave.md`'de kalıyor — bu dosyanın kapsamı yalnızca **algılanma sisteminin** paylaşılan/motor-genelinde sabitleri. Geometri sabitleri `island-designer`'ın level-spec'i netleştiğinde buraya taşınabilir (Lotus'un `LOTUS_MIN_SPACING` gibi §7'ye benzer bir yerleşim bölümü).

---

## 13. Lotus Adası (1. durak) — sanrı figürleri (hallucination) (yeni, 14 Ağu 2026)

> **Kaynak:** playtest sonrası sahip geri bildirimi → `hallucination-reframe-concept.md`'de seçenekler sunuldu → sahip kararı (14 Ağu 2026): his değişikliği + gerçek mekanik, ikisi de; ilke korunuyor (can kaybı yok); yalnızca Lotus Adası. Ayrıntı/gerekçe/formüller: `docs/design/gdd-lotus-hallucination.md`. **Bu sistem yalnızca Lotus Adası'nda geçerli** — Kiklop Mağarası ve Sirenler Geçidi bu sabitleri okumaz (Kiklop'un kendi ayrı `DETECT_*` sistemi var, §12).

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `HALLUCINATION_THRESHOLD` 🔬 | `60.0` (öneri) | puan | Figürlerin sahneye girmeye başladığı unutuş seviyesi. `MEM_THRESHOLD_DRIFT` (50, pusula gider) ile `MEM_THRESHOLD_LOST` (75, HUD tamamen gider) arası — "önceden haber" penceresi: pusula zaten kaybolmuşken, HUD tamamen gitmeden önce ilk figürler beliriyor. **Playtest'te ölçülecek — §11.5.** |
| `HALLUCINATION_CREATURE_COUNT` | `3` | adet | Aynı anda sahnede olabilecek maksimum figür. `LOTOPHAGOS_COUNT` (3) ile aynı ölçek felsefesi — "az ama anlamlı", CLAUDE.md'nin "merge static geometry, don't spawn hundreds" performans disipliniyle uyumlu. |
| `HALLUCINATION_SEED` | `7429` | int | Deterministik spawn düzeni — `LOTUS_PHASE_SEED`'in izlediği aynı ilke (P3, "ada okunabilir", rastgele değil). |
| `HALLUCINATION_FADE_TIME` | `1.5` | s | Belirme/kaybolma süresi. `HUD_FADE_TIME` ile aynı değer ve aynı gerekçe — fotosensitivite kuralı (≥1,5 s geçiş) burada da geçerli. |
| `HALLUCINATION_LINGER` | `10.0` | s | Bir figürün sahnede kalma süresi (fade-in/out hariç). Temas olmazsa bu sürenin sonunda kendiliğinden söner. |
| `HALLUCINATION_RESPAWN_GAP` | `6.0` | s | Bir figür söndükten sonra yeni birinin belirmesi için bekleme — ekran sürekli dolu olmasın. |
| `HALLUCINATION_ROUTE_BIAS_RADIUS` | `18.0` | m | Figürlerin spawn ağırlığının oyuncu-gemi hattına doğru kaydığı yarıçap — "teslim zorlaşıyor" burada somutlaşıyor (coğrafi tıkanma değil, rota üzerinde risk). Bkz. `gdd-lotus-hallucination.md` §3.3. |
| `HALLUCINATION_CONTACT_RADIUS` | `1.8` | m | Temas çarpışma yarıçapı. `PLAYER_RADIUS` (0.4) + figürün kendi hacmi payı. |
| `HALLUCINATION_CONTACT_MEM_SPIKE` 🔬 | `10.0` (öneri) | puan | Temas anındaki tek seferlik unutuş artışı. `MEM_ON_HARVEST` (4) ile `MEM_WITHERED_PENALTY` (12) arası; Kiklop'un `CAUGHT_MEM_SPIKE` (30) ailesinin en küçüğü — burada temas daha sık/daha hafif bir olay, Kiklop'taki yakalanma kadar nadir/ağır değil. **Playtest'te ölçülecek — §11.5.** |
| `HALLUCINATION_DRIFT_MULTIPLIER` | `2.0` | çarpan | Temas sonrası `DRIFT_MAX_ANGLE`'a uygulanan geçici çarpan. |
| `HALLUCINATION_DRIFT_SPIKE_DURATION` | `4.0` | s | Çarpanın etkili kaldığı süre. Unutuş `MEM_THRESHOLD_LOST` (75) altında olsa bile bu süre boyunca sapma mekaniği geçici olarak aktive olur — mevcut `DRIFT_*` kodunun yeniden kullanımı, yeni bir sapma sistemi icat edilmiyor. |
| `HALLUCINATION_CONTACT_COOLDOWN` | `2.0` | s | Temas sonrası kısa dokunulmazlık — kare-bazlı çoklu tetiklenmeyi önler. Farklı figürlere ayrı zamanlarda temas etmenin önünde değildir. |
| `HALLUCINATION_VANISH_ON_CONTACT` | `true` | bool | Temas eden figür hemen söner (yeniden `HALLUCINATION_RESPAWN_GAP` sonrası başka bir konumda belirebilir) — sürekli takip eden bir "avcı" değil, tek seferlik bir olay. |

**Kasıtlı olarak tanımlanmayan:** can/hasar/envanter sabiti **yok** — `gdd-lotus-hallucination.md` §1'in "düşman değil, unutuşun bir belirtisi" ilkesinin doğrudan sonucu. `CAUGHT_ITEM_LOSS` benzeri bir sabit buraya **bilerek eklenmedi**; Kiklop'un o istisnası yalnızca Kiklop Mağarası'na özgü kalıyor (bkz. `gdd-detection-cyclops.md` §1.1).

---

## Açık sorular

1. **`MEM_ON_HARVEST` (+4) sabit mi, hasat başına artan mı olmalı?** Sabit değer sade; artan değer (3. ve 4. çiçek daha pahalı) dolu çantayı daha da riskli yapar. Sade olan seçildi, sahip onayı gerekiyor.
2. **Lotophagos takası oyunu kırıyor mu?** Üçünü de kabul + 6 çiçek toplama, en hızlı bitiş olabilir. Playtest bunu doğrularsa `LOTOPHAGOS_GIFT` 2 → 1 iner. (Playtest listesine eklenecek bir aday.)
3. **`FX_*` sunum değerleri motor tarafında ayarlanabilir kalmalı mı?** Şu an sabit; art tarafı ince ayar isterse bunlar `constants.ts` yerine bir debug paneline taşınabilir.
