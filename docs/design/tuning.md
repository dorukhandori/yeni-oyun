# Tuning — Lotus Adası

> **Bu dosya tüm sayısal değerlerin TEK kaynağıdır.** Başka bir dokümanda bir sayı görürsen ve buradakiyle çelişiyorsa, **burası doğrudur** ve o doküman düzeltilmelidir.
> **Motor tarafı için:** bu dosya `src/constants.ts`'in doğrudan kaynağıdır. Aşağıdaki her `SABİT_AD` **olduğu gibi** TypeScript sabit adı olarak kullanılabilir.
> **Tarih:** 2026-08-14 · **Durum:** ilk pas · üç değer playtest'e ertelendi (bkz. §11)

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
| `PLAYER_SPEED` | `4.5` | m/s | Hızlı yürüyüş. 70 m yarıçaplı adayı boydan boya 31 s'de geçirir; bu, olgunluk penceresinin (30 s) hemen altında kalır — "gördüğün olgun çiçeğe ancak yetişirsin". |
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

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `ISLAND_RADIUS` | `70.0` | m | Çapı 140 m. Tam geçiş 31 s. Gemi–en uzak bölge tek yön ~12–14 s → bir teslim turu 40–60 s → 420 s içine 7–10 tur sığar. |
| `SHIP_POSITION_X` | `0.0` | m | Güney kıyı, merkez hattı. |
| `SHIP_POSITION_Z` | `-60.0` | m | Adanın merkezine 60 m; her turun sabit çapası. |
| `DAY_LENGTH` 🔬 | `420.0` | s | 7 dakika. Hedef oturum 5–10 dk. Usta oyuncu ~4.5 dk'da (3 tur + tampon) bitirir, acemi süreyi doldurur. 300 s çok acımasız, 600 s ikinci yarıda gerilim düşüyor. **Playtest'te ölçülecek — §11.1** |
| `SUN_ANGLE_START` | `55.0` | ° | Öğleden sonra. Uzun ama dramatik olmayan gölge. |
| `SUN_ANGLE_END` | `2.0` | ° | Ufka değme anı = süre bitişi. Güneş yüksekliği HUD'suz saat göstergesidir. |
| `SUN_WARN_AT_REMAINING` | `90.0` | s **kalan** | Bu kadar süre **kaldığında** ışık gül rengine döner ve dalga sesi yükselir. Oyuncuya "son tur" sinyali. Karşılaştırma: `kalanSure <= SUN_WARN_AT_REMAINING`. |

---

## 3. Lotus — sayı ve olgunluk

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `LOTUS_TOTAL` | `28` | adet | Sazlık 12 + iç göl 10 + tepeler 6. Ortalama %25'i olgun → her an ~7 toplanabilir çiçek. Kıtlık değil, **rota** problemi yaratır. |
| `LOTUS_TARGET` | `12` | adet | Odysseus'un on iki gemisi (İlyada, Gemiler Kataloğu). Kapasite 4 ile tam bölünür → minimum 3 tur → anlatının 3 beat'iyle birebir örtüşür. |
| `CARRY_CAPACITY` | `4` | adet | 3 fazla küçük (5+ tur, tekrar), 6 fazla büyük (2 tur, gerilim yok). 4 → hedefi tam 3 tura böler ve dolu çantanın unutuş yükünü (+0.6 puan/s) anlamlı kılar. |
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

### 5.1 Artışlar

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `MEM_MAX` | `100.0` | puan | Yuvarlak ölçek; yüzde olarak da okunabilir. |
| `MEM_START` | `0.0` | puan | Oyun açık zihinle başlar. |
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

Adada başka hiçbir pasif iyileşme **yoktur**. Tek çare deniz ve gemi. `[SABİT DEĞİL]`

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

**Ayrık** olan tek şey bilgidir: pusula ve HUD ya vardır ya yoktur, `HUD_FADE_TIME` süresinde solar. Dalga sesi `FX_LOWPASS_HZ_MAX`'tan **muaftır** — en kötü anda bile duyulur.

---

## 6. Lotophagoi

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `LOTOPHAGOS_COUNT` | `3` | adet | Sazlık 1, iç göl 1, tepe eteği 1. |
| `LOTOPHAGOS_GIFT` | `2` | çiçek | Kişi başı, tek seferlik. Toplam 6 = hedefin yarısı. Oyunu kısaltabilir ama **bitiremez.** |
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
| `HILL_VIEW_HEIGHT` | `14.0` | m | Sazlığın ve gölün tamamının görülebildiği minimum yükseklik. Beat 3 tetiği. |
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

---

## 10. Kapanan kararlar

| Karar | Sonuç | Tarih |
|---|---|---|
| Zıplama olacak mı | **Hayır.** Kaldırıldı; `JUMP_*` sabiti tanımlanmayacak. Kontroller: WASD + fare + E + Esc. | 14 Ağu 2026 |

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

### Playtest ölçüm listesi (kısa)

| # | Ölçülen | Nasıl | Eşik |
|---|---|---|---|
| 1 | İlk oyun bitiş süresi ve teslim sayısı | Otomatik log | 12/12 tamamlanamıyor → `DAY_LENGTH` ↑ |
| 2 | Tur başına deniz teması sayısı | Otomatik log | Her turda ≥1 ve kasıtlıysa → `MEM_SEA_RECOVER` ↓ |
| 3 | Eşik 2 sonrası "kaç çiçek teslim ettin?" sorusu | Sözlü, oyun sonrası | Bilmiyor + rahatsız → `HUD_VAGUE_COUNTER` = false |
| 4 | Anlık olgun çiçek sayısı | Otomatik örnekleme | 4'ün altına düzenli iniyorsa → `LOTUS_TOTAL` ↑ |
| 5 | Tepeye çıkan oyuncu oranı | Otomatik log | %30'un altı → tepe yeniden değerlendirilir |
| 6 | Kayıp finaline ulaşma oranı | Otomatik log | %0 ise unutuş etkisiz, %80+ ise çok sert |

---

## Açık sorular

1. **`MEM_ON_HARVEST` (+4) sabit mi, hasat başına artan mı olmalı?** Sabit değer sade; artan değer (3. ve 4. çiçek daha pahalı) dolu çantayı daha da riskli yapar. Sade olan seçildi, sahip onayı gerekiyor.
2. **Lotophagos takası oyunu kırıyor mu?** Üçünü de kabul + 6 çiçek toplama, en hızlı bitiş olabilir. Playtest bunu doğrularsa `LOTOPHAGOS_GIFT` 2 → 1 iner. (Playtest listesine eklenecek bir aday.)
3. **`FX_*` sunum değerleri motor tarafında ayarlanabilir kalmalı mı?** Şu an sabit; art tarafı ince ayar isterse bunlar `constants.ts` yerine bir debug paneline taşınabilir.
