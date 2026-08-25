# Tuning — Lotus Adası

> **Bu dosya tüm sayısal değerlerin TEK kaynağıdır.** Başka bir dokümanda bir sayı görürsen ve buradakiyle çelişiyorsa, **burası doğrudur** ve o doküman düzeltilmelidir.
> **Motor tarafı için:** bu dosya `src/constants.ts`'in doğrudan kaynağıdır. Aşağıdaki her `SABİT_AD` **olduğu gibi** TypeScript sabit adı olarak kullanılabilir.
> **Tarih:** 2026-08-14 · son revizyon **2026-08-24 (K40 + D3)** · **Durum:** ilk pas · birden çok değer playtest'e ertelendi (bkz. §11 — `DAY_LENGTH`, `MEM_SEA_RECOVER`, `HUD_VAGUE_COUNTER`, ~~`MEM_ISLAND_RELIEF_PCT`~~ **(düştü, K40)**, `HALLUCINATION_THRESHOLD`/`HALLUCINATION_CONTACT_MEM_SPIKE`)

> **Çoklu-ada notu (14 Ağu 2026, sahip onayı):** proje artık **3 duraklı bir koşu** — Lotus Adası (1. durak/çapa) + Kiklop Mağarası (2.) + Sirenler Geçidi (3.). Karar `docs/design/multi-island-concept.md`'de M7 (Seçenek 3) olarak kapandı. Bu dosyadaki sayıların büyük çoğunluğu (§1, §2, §3'ün çoğu, §4, §6, §7, §8) **hâlâ yalnızca Lotus Adası'nı** tarif ediyor — Sirenler'in kendi `level-*.md` ve tuning satırları `island-designer` agent'ının işi, henüz yazılmadı. Kiklop Mağarası için **§3.0 (hedef dağılımı), §5 (unutuş taşıma) ve §12 (algılanma sistemi)** eklendi; Kiklop'un salt geometri sabitleri (mağara derinliği, oda-başı öğe sayıları) hâlâ yalnızca `level-cyclops-cave.md`'de, buraya taşınmadı.
> **🔴 K40 notu (24 Ağu 2026, sahip — `multi-island-concept.md` §10):** **duraklar bağımsız.** Lotus'u bir kez bitirmek Kiklop'u **kalıcı** açar; sonrasında her durak hub'dan bağımsız seçilen, kendi başına biten bir oturumdur ve duraklar arasında **hiçbir durum taşınmaz.** Bu dosyada düşenler: **`RUN_TARGET_TOTAL`** (§3.0) · **`MEM_ISLAND_RELIEF_PCT`** (§5.2) · **§11.4** ve §11 ölçüm listesi **madde 7**. `MEM_START = 0` artık **her** durakta koşulsuz geçerli. **Ayrıca (D3, aynı gün):** **Kiklop Mağarası bu dosyanın §5 (unutuş) ailesini hiç okumaz** — o durakta unutuş sistemi *yoktur*, yerine körleşme vardır (`gdd-cyclops-blinding.md`, §12).
>
> ~~**Hub'a dönüş notu (14 Ağu 2026):** ... `RUN_TARGET_TOTAL` ve durak alt-hedefleri değişmedi ... `MEM_ISLAND_RELIEF_PCT`'in tetik noktası "hub'a dönüş" olarak okunmalı ...~~ **— arşiv, K40 ile geçersiz.** Hub'ın **var olması** hâlâ doğru; taşıdığı durum yok.
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

### 3.0 ~~Koşu hedefi ve durak alt-hedefleri~~ — 🔴 **`RUN_TARGET_TOTAL` GEÇERSİZ (K40, 24 Ağu 2026, sahip)**

> **Duraklar-üstü bir "koşu" yok.** Her durak bağımsız, kendi başına biten bir oturumdur; aralarında hiçbir durum taşınmaz. Bunun sonucu: **`RUN_TARGET_TOTAL = 12` diye bir sabit yok** — 12'yi duraklara paylaştırma modeli (5/4/3) düştü. **Her durağın hedefi kendi başına yeterlidir ve kendi başına anlamlıdır.** Gerekçe ve tam liste: `multi-island-concept.md` §10.
>
> **Geçerli kalan sayılar** (artık "alt-hedef" değil, o durağın **kendi** hedefi):
>
> | Durak | Hedef | Durum |
> |---|---|---|
> | Lotus Adası (K35 "Tam yelken") | `LOTUS_TARGET` = **5** | Kilit, canlıda |
> | Kiklop Mağarası | `CYCLOPS_ISLAND_TARGET` = **4** | Kilit (24 Ağu 2026) — §12'ye bak |
> | Sirenler Geçidi | `SIREN_ISLAND_TARGET` = **3** 🔬 | Yer tutucu; level-spec yazılmadı |
>
> "12 gemi" anlatısı (İlyada, Gemiler Kataloğu) **bir mekanik hedef olmaktan çıktı**, anlatı/görsel motif olarak kalıyor (`FLEET.count`, gemi direkleri). ⚠️ **Türetilmiş (@nile, 24 Ağu 2026) — sahip vetosuna açık:** sahip 12'nin motif olarak kalmasını açıkça söylemedi; K40'ın kaçınılmaz sonucu olduğu için böyle yazıldı.

*(Aşağısı 14 Ağu 2026'nın metni — arşiv, uygulanmıyor.)*

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

> **🔴 Kapsam notu (K40 + D3, 24 Ağu 2026, sahip):** bu bölüm (§5'in tamamı) **yalnızca unutuş sistemi olan duraklarda** geçerlidir — bugün pratikte **yalnız Lotus Adası.** **Kiklop Mağarası bu bölümü hiç okumaz** (D3: o durakta unutuş sistemi *yoktur*; yerine körleşme — `gdd-cyclops-blinding.md`, §12). Unutuş **durak başına sıfırlanır**: her durak `MEM_START = 0`'dan başlar, duraklar arasında **hiçbir değer taşınmaz** (K40). `MEM_MAX` + `MEM_GRACE` dolarsa **yalnız o durak** biter, oyuncu hub'a döner — duraklar-üstü bir "koşu" olmadığı için kaybedilecek bir koşu da yok. Lotus'ta bu akışın yerine K35 forget-event geçer (`gdd-lotus-island-run.md` §3.5).
>
> ~~**Koşu-seviyesi not (14 Ağu 2026 — M7):** unutuş ada başına sıfırlanmıyor, koşu boyunca taşınıyor; hub'a dönüşte `MEM_ISLAND_RELIEF_PCT` kısmi bağışlaması ... `MEM_GRACE` dolunca ne olacağı flag'li, kapanmadı.~~ **— arşiv, K40 ile tamamen geçersiz.**

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
| `MEM_START` | `0.0` | puan | **Her durak girişinde koşulsuz geçerli** (K40, 24 Ağu 2026 — duraklar arası taşıma kalktı). ~~Eski: "yalnızca koşunun ilk durağı için geçerli, sonrakiler `MEM_ISLAND_RELIEF_PCT`'ten türer."~~ **Not:** Kiklop Mağarası bu sabiti hiç okumaz — orada unutuş sistemi yoktur (§12, `gdd-cyclops-blinding.md`). |
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
| ~~`MEM_ISLAND_RELIEF_PCT`~~ | 🔴 **YOK** | — | **Düştü (K40, 24 Ağu 2026, sahip).** Duraklar arası unutuş taşınmıyor → bağışlanacak bir şey de yok. Kodda hiç uygulanmamıştı; **uygulanmayacak.** Bkz. `multi-island-concept.md` §10, `gdd-memory-system.md` §3.5. Arşiv gerekçesi aşağıdaki satırda. |
| ~~`MEM_ISLAND_RELIEF_PCT`~~ 🔬 *(arşiv, 14 Ağu 2026)* | ~~`0.4`~~ | oran (0–1, birimsiz) | **Hub'a dönüş bağışlaması** (14 Ağu 2026'da "ada geçişi" olarak tanımlandı, aynı gün hub bağlamına taşındı — `multi-island-concept.md` §9.2). Bir durak **başarıyla** bitirilip hub'a dönülürken **tek seferlik** uygulanır: `unutuş_hub_dönüşü = unutuş_durak_bitişi × (1 − MEM_ISLAND_RELIEF_PCT)`. Başarısız dönüşte (gün doldu / `MEM_GRACE` tükendi) uygulanmaz — oyuncu ham değerle hub'a taşınır. Temiz biten oyuncu (düşük unutuşla ayrılan) gerçek bir avantajla başlar; kıl payı biten oyuncu zaten baskı altında devam eder — koşu boyunca **yükselen bir zemin baskısı** yaratır ("ne kadar ileri gidersen dönüşü o kadar unutursun"). Tam sıfırlama (`=1.0`) hub'ı bir kaçış valfine çevirip bedeli siler; tam taşıma (`=0.0`) sonraki durakları orantısız cezalandırır. **Playtest'te ölçülecek** — `MEM_SEA_RECOVER`/`HUD_VAGUE_COUNTER` gibi §11'e eklenmesi gereken yeni bir aday. |

Adada başka hiçbir pasif iyileşme **yoktur**. Tek çare deniz ve gemi. `[SABİT DEĞİL]` ~~**Hub'a dönüşte** tek iyileşme kaynağı `MEM_ISLAND_RELIEF_PCT`'tir~~ — **hub'a dönüşte hiçbir iyileşme yok; her durak `MEM_START = 0`'dan başlar** (K40, 24 Ağu 2026). `[SABİT DEĞİL]`

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
| **🔴 K40 — Bağımsız durak oturumları** *(M7'nin "tek koşu"sunu iptal eder)* | **Duraklar arası hiçbir durum taşınmıyor.** Lotus'u bir kez bitirmek Kiklop'u **kalıcı** açar; sonrasında her durak hub'dan bağımsız seçilen, kendi başına biten bir oturum. Düşenler: `MEM_ISLAND_RELIEF_PCT` (§5.2), `RUN_TARGET_TOTAL` + alt-hedef paylaştırması (§3.0), §11.4 ölçümü, ölçüm listesi madde 7, K27/K28/K29/K30'un koşu-varsayımlı kısımları. Geçerli kalan: 3 durak kimliği, hub'ın kendisi, her durağın kendi hedefi. Gerekçe: `multi-island-concept.md` §10. | **24 Ağu 2026** |
| ~~Çoklu-ada yapısı~~ (roadmap eski K2'nin büyütülmüş hâli, `multi-island-concept.md` M7) — **büyük ölçüde geçersiz, bkz. K40 satırı** | ~~**Seçenek 3.** 3 durak (Lotus + Kiklop + Sirenler), hub yok, tek kesintisiz koşu, unutuş taşınıyor (`MEM_ISLAND_RELIEF_PCT`), hedef koşu-toplamında (`RUN_TARGET_TOTAL = 12`, durak başı: Lotus 5 / Kiklop 4 / Sirenler 3).~~ **Geçerli kalan tek parça:** 3 durak seçimi (Lotus + Kiklop + Sirenler, Kirke kapsam dışı). | 14 Ağu 2026 |
| Kiklop Mağarası'nın algılanma (tespit) sistemi — `island-designer`'ın `level-cyclops-cave.md`'de önerdiği | **Onaylandı.** Mevcut unutuş sistemleriyle çelişmiyor (tek besleme noktası, ikinci can barı değil). İstemsiz envanter kaybı (`CAUGHT_ITEM_LOSS`) yeni bir sözleşme ama **yalnızca bu durakla sınırlı** kalması şartıyla kabul edildi. Sabitler §12'de, ayrıntı `gdd-detection-cyclops.md`'de. | 14 Ağu 2026 |
| Hub'a dönüş (M7'nin "hub yok" alt-maddesinin tersine çevrilmesi) — **kısmen geçersiz, bkz. K40** | **Gerçek hub var** — bu **hâlâ geçerli.** ~~Unutuş taşınmaya devam ediyor, tetik "hub'a dönüş"~~ → **K40 ile düştü, hiçbir şey taşınmıyor.** ~~`RUN_TARGET_TOTAL`~~ → **düştü.** ~~Oturum süresi ~20–30 dk (koşunun tamamı)~~ → **durak başına ~5–10 dk**, duraklar-üstü bütçe yok. Hub hâlâ hafif bir seçim ekranı, dördüncü oynanabilir alan değil — bu kısıt korundu. ~~Kapanmayan soru: koşu-bazlı kayıp (K27)~~ → **konusuz kaldı**, koşu diye bir kap yok. Ayrıntı: `multi-island-concept.md` §9 (arşiv) + **§10 (geçerli)**. | 14 Ağu 2026 · **K40 ile revize: 24 Ağu 2026** |
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
- **⚠️ Ölçüm geldi (22 Ağu 2026) — ama ölçülen şey bu düğme değildi.** Playtest: *“ne yapacağımızı anlamadık.”* Kök neden incelenince `src/ui/hud.ts` `update()`'in muğlaklaştırmayı **unutuş eşiğine hiç bağlamadığı** görüldü: `if (WORLD.k35)` yeterli sayılıyor, `st.memory` kontrol edilmiyor. Yani K35'te sayaç **unutuş sıfırken, ilk kareden itibaren** muğlak (`—`, sonra `birkaç`). Bu §8 tablosuna, bu maddeye ve `ux/hud.md` eşik tablosuna (Kayış @50) aykırıdır. **Düğme `true` kalabilir; önce uygulamanın spec'e uyması gerekir.** Öneri ve dilimleme: `gdd-lotus-island-scenario.md` §1.2 / §5.1 D0. Doğru davranış geldikten *sonra* bu madde yeniden ölçülmeli.

### 11.4 ~~`MEM_ISLAND_RELIEF_PCT` = 0.4~~ — 🔴 **DÜŞTÜ (K40, 24 Ağu 2026, sahip). Ölçülmeyecek.**

> Duraklar arası unutuş taşınmıyor; sabit yok, ölçüm de yok. §11 ölçüm listesinin **7. maddesi** de bu yüzden düştü. Bkz. `multi-island-concept.md` §10. *(Aşağısı arşiv.)*

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

### 11.7 Kiklop Mağarası — körleşme döngüsü ve yakalanma bedeli 🔬 (yeni, 24 Ağu 2026)

Dört ayrı ölçüm, hepsi 2. durak oynanır hale gelince (§6 adım 10, `cyclops-cave-production-plan.md`):

- **(a) Döngü öğrenilebilirliği.** *Ölçülecek:* ilk-geçiş (first-clear) medyan oturumunda görülen tam `CYCLOPS_CYCLE` sayısı. *Kriter:* **<3 tam döngü** çıkarsa iki kaldıraç var — (1) `CYCLOPS_PHASE_OUT` 58→43 s (⚠️ iç nöy'ün tek-pencereye sığma payını 23 s'den 8 s'ye düşürür, riskli, yeniden doğrulanmalı), (2) `CYCLOPS_PHASE_PRESENT`'i kısaltmak (zaten ölü zaman, kaybı az — ama en derin gezinmenin fiziksel olarak tamamlanamaması riski, `gdd-cyclops-blinding.md` §2.4). **Başlangıç: hiçbiri uygulanmıyor.**
- **(b) PRESENT ölü zaman mı.** *Ölçülecek:* sözlü — oyuncu kapı kapalıyken "bekliyorum, sıkıldım" diyor mu; ve PRESENT boyunca fiilen ne yapıyor (saklanıyor mu, rastgele mi dolaşıyor). *Kriter:* sıkılma raporlanıyorsa `CYCLOPS_PHASE_PRESENT` düşürülür ya da PRESENT'e bir "yapılacak şey" eklenir (⚠️ kapsam artışı, sahip onayı gerekir).
- **(c) `CYCLOPS_CRUSH_CAP` = 3 doğru sayı mı.** *Ölçülecek:* deneme başına ortalama ezilme sayısı; kaç oyuncu 3'e ulaşıp denemeyi kaybediyor; kaybedenler tekrar deniyor mu yoksa bırakıyor mu. **Bağlam:** 25 Ağu'da eklendi (sahip); D3 `CAUGHT_MEM_SPIKE`'ı kaldırınca kalan boşluğu kapatıyor. *Kriter:* ilk-oyun oyuncularının **çoğu** 3'e ulaşıp kaybediyorsa `4`'e çıkar (level-spec §7 "en az bir yakalanma normal kabul edilmeli" diyor — 3 hak, 1 normal + 2 tolerans demek); **hiç kimse** 3'e ulaşmıyorsa ceza hissedilmiyordur, `2`'ye iner.
- **(d) Denemenin tamamen sıfırlanması adil mi.** *Ölçülecek:* sözlü — oyuncu `delivered`'ın da sıfırlanmasını "adil bir bahis" mi yoksa "emeğimi çöpe attı" mı buluyor. **Bağlam:** bu, kuralın en sert parçası ve bilinçli (aksi halde kayıp ücretsiz bir checkpoint olurdu). *Kriter:* oyuncular sistematik olarak haksızlık raporluyorsa **önce `CAP` gevşetilir** (4'e), teslim edilenin korunması **son çare** — çünkü o değişiklik kuralın bahis niteliğini tamamen siler.
- **(f) Kalan hak sayı olmadan okunuyor mu.** *Ölçülecek:* 2. ezilmeden sonra oyuncuya "kaç hakkın kaldı" diye sor. *Kriter:* oyuncu "bilmiyorum ama son şansım gibi hissettim" diyorsa sunum **doğru** çalışıyor (P2 hedefi tam olarak bu); "hiç fark etmedim" diyorsa korku efektinin ezilme başına ağırlaşması yetersizdir, `@iris`'e geri gider. **Sayaç ekranda gösterilerek çözülmez** — P2 ihlali olur.
- **(e) `CYCLOPS_GIANT_PROXIMITY_RADIUS` = 8.0 m.** *Ölçülecek:* dev saklaş noktasının yanından geçerken oyuncu gerginlik hissediyor mu / fark ediyor mu. *Kriter:* hiç fark edilmiyorsa 6.0 m'ye indir; sürekli yanlışlıkla yakalanılıyorsa 10.0 m'ye çıkar.

**⚠️ Uyarı:** (a) ve (c) **aynı anda değiştirilmez** — ikisi de oturum uzunluğunu etkiler, birlikte oynatılırsa hangisinin işe yaradığı ölçülemez (`DAY_LENGTH`/`ISLAND_RADIUS` uyarısıyla aynı disiplin).

### Playtest ölçüm listesi (kısa)

| # | Ölçülen | Nasıl | Eşik |
|---|---|---|---|
| 1 | İlk oyun bitiş süresi ve teslim sayısı | Otomatik log | 12/12 tamamlanamıyor → `DAY_LENGTH` ↑ |
| 2 | Tur başına deniz teması sayısı | Otomatik log | Her turda ≥1 ve kasıtlıysa → `MEM_SEA_RECOVER` ↓ |
| 3 | Eşik 2 sonrası "kaç çiçek teslim ettin?" sorusu | Sözlü, oyun sonrası | Bilmiyor + rahatsız → `HUD_VAGUE_COUNTER` = false |
| 4 | Anlık olgun çiçek sayısı | Otomatik örnekleme | 4'ün altına düzenli iniyorsa → `LOTUS_TOTAL` ↑ |
| 5 | Tepeye çıkan oyuncu oranı | Otomatik log | %30'un altı → tepe yeniden değerlendirilir |
| 6 | Kayıp finaline ulaşma oranı | Otomatik log | %0 ise unutuş etkisiz, %80+ ise çok sert |
| ~~7~~ | ~~Durak geçişinde taşınan unutuşun sonraki durağı ne kadar zorlaştırdığı~~ | 🔴 **düştü (K40, 24 Ağu 2026)** — taşıma yok | — |
| 8 | Sanrı figürü temas sıklığı ve oyuncu tepkisi | Otomatik log + sözlü | Bkz. §11.5 |
| 9 | K35 bilinçli speedrun'un en hızlı süresi | Elle ölçüm (`real`, tek koşu) | Bkz. §11.6 — `minTimeMs` = ölçülenin %60'ı |
| **10** | **Kiklop: ilk-geçişte görülen tam döngü sayısı** | Otomatik log | <3 → bkz. §11.7 (a) |
| **11** | **Kiklop: PRESENT'te sıkılma / yakalanma sayısı / durak gerilimi** | Sözlü + otomatik log | Bkz. §11.7 (b)(c)(d) |

---

## 12. Kiklop Mağarası (2. durak) — körleşme + algılanma (14 Ağu 2026 · **büyük revizyon 24 Ağu 2026**)

> **🔴 24 Ağu 2026 revizyonu (sahip):** bu durak artık **iki katmanlı**. (1) **Körleşme** — kapı açık/kapalı döngüsü, oda-başı saklaş noktaları, hareketsizlik kuralı, devin rastgele derinliğe gidip uyuması, ezilme (`gdd-cyclops-blinding.md`, **yeni otorite**). (2) **Algılanma** — `DETECT_*` matrisi, aynı zaman çizgisinde (`gdd-detection-cyclops.md`). **Bu adada unutuş sistemi YOK** (D3): `MEM_*`, `FX_VIGNETTE`, haze, `DRIFT_*` hiç çalışmıyor, `CAUGHT_MEM_SPIKE` **kaldırıldı**. Yakalanma cezası: azık **yere düşer, yok olmaz** (D2/C2) + mağara ağzına ışınlanma. Geometri/koordinatlar: `level-cyclops-cave.md`.

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
| `CYCLOPS_PHASE_OUT` | `58.0` | s | **Kapı AÇIK** — güneş içeri dolar, **toplama mümkün**. Taban oranlar, çarpan yok. Değer değişmedi: iç nöy dahil tam bir gidiş-dönüş-hasat turu (~35 s) tek pencereye sığıyor, ~23 s tampon kalıyor. |
| `CYCLOPS_PHASE_RETURN` | `8.0` | s | **Kapı kapanma telegrafı** (7.0 → **8.0**, 24 Ağu 2026). Dev dışarıdan yaklaşır. Toplama hâlâ mümkün. `CYCLOPS_RETURN_MULTIPLIER` uygulanır. **Alt sınır gerekçesi:** `level-cyclops-cave.md` §4.8 — bir odanın en uzak azığından saklaş noktasına en kötü durum **2.7 s**; 8.0 s bunun üstünde **≥5.3 s** tepki payı bırakır (`MEM_GRACE` felsefesi: ani, adaletsiz ceza yok). |
| `CYCLOPS_PHASE_PRESENT` | `30.0` | s | **Kapı KAPALI** — genel ışık düşer, **toplama tamamen devre dışı**, saf saklan evresi. `CYCLOPS_PRESENT_MULTIPLIER` uygulanır (yalnız ağıllar/iç nöy). **Değer aynı, gerekçesi yeniden kuruldu:** en derin gezinme hedefi (İç nöy, D=60) `CYCLOPS_GIANT_SPEED` ile **20.0 s** yürüyüş + **10.0 s** yerleşme payı = 30.0. **Üst sınır:** PRESENT artık saf ölü zaman; uzatmak tempoyu düşürür. Bu, en derin yürüyüşü tam karşılayan **en küçük** sayı. |
| `CYCLOPS_CYCLE` | `96.0` | s | `[TÜRETİLMİŞ]` = 58.0 + 8.0 + 30.0. (Eski 95.0; tek fark RETURN'ün +1 s'i.) Bir oturumda: acemi (~6–7 dk) **~4 tam döngü**, usta (~3–4 dk) **~2**. 🔬 Ölçüm: ilk-geçiş medyanı **<3 döngü** çıkarsa §11.7'ye bak. |
| `CYCLOPS_RETURN_MULTIPLIER` | `1.5` | çarpan | DÖNÜŞ evresinde tüm `DETECT_RATE_*`'e uygulanır. |
| `CYCLOPS_PRESENT_MULTIPLIER` | `3.0` | çarpan | PRESENT evresinde, yalnızca ağıllar/iç nöy odalarında `DETECT_RATE_*`'e uygulanır; depo/mağara ağzı bu evrede de çarpansız kalır. |
| ~~`CAUGHT_ITEM_LOSS`~~ | 🔴 **YOK** | — | **Düştü (D2/C2, 24 Ağu 2026, sahip).** ~~"çantadaki tüm azık sıfırlanır, havuzdan geri gelmez"~~ — bu kural **bitirilemeyen bir durak** üretiyordu (ölçüldü: 4 taşırken yakalanınca sahnede 3 kalır, hedef 4). Yerine `CAUGHT_ITEM_DROP` geçti. |
| **`CAUGHT_ITEM_DROP`** *(yeni)* | `true` | bool | **D2/C2.** Yakalanma/ezilme anında çantadaki azık **yok olmaz** — yakalanma noktasının çevresine zemine dökülür ve **tekrar toplanabilir** kalır. K35 Lotus'un "sıfırla ama yok etme" deseniyle aynı felsefe; tematik olarak da doğru (kaçarken sepeti düşürdün). Kilitlenmeyi yapısal olarak kapatır. |
| **`CAUGHT_DROP_RADIUS`** *(yeni)* | `2.0` | m | Dökülen azığın yakalanma noktası çevresine saçılma yarıçapı (sahip: "~1–2 m"). Düşen öğe **geçerli zemine snap edilir**, duvar/geometri içine düşmez (`level-cyclops-cave.md` §5.2). |
| ~~`CAUGHT_MEM_SPIKE`~~ | 🔴 **YOK** | — | **Tamamen kaldırıldı (D3, 24 Ağu 2026, sahip).** Bu adada unutuş sistemi **yok** — beslenecek bir kaynak da yok. ~~`30.0` puan~~. `MEM_WITHERED_PENALTY`/`MEM_LOTOPHAGOS_TRADE` ailesi artık **yalnız Lotus Adası** için geçerli; Kiklop o aileden çıktı. ⚠️ **Sonuç:** yakalanmanın bedeli artık yalnız *zaman + azığı yeniden toplama*; caydırıcılığı 🔬 playtest'te ölçülecek (§11.7). |
| **`CYCLOPS_CRUSH_CAP`** *(yeni)* | `3` | adet | **🟡 Kayıp koşulu — sahip kararı, 25 Ağu 2026, DENEYSEL (kesin değil).** ⚠️ **25 Ağu, sahibin kendi eleştirisi üzerine düşürüldü:** bu sayı hiç oynanmadan, devin rotası kasıtlı öngörülemez tutulurken beş dakikada karara bağlandı — `@helix`'in gerekçeli "kayıp koşulu yok" önerisinin yerine geçti ama kendisi hiç test edilmedi. **İmplementasyon (`docs/production/implementation-spec-sprint1.md` K9) sayıyı kod içine gömülü değil, tek satırda değiştirilebilir bir sabit olarak yazmalı** — ilk playtest sonrası değişebilir, "kesin" muamelesi görmüyor. Davranış (değişmezse): bir **denemede** 3. yakalanma/ezilmede durak **başarısız** olur: oyuncu hub'a döner ve **o denemedeki tüm ilerleme sıfırlanır — teslim edilmiş azık dahil** (`delivered` → 0, azık yerleşimi başa, `DETECT`/`phaseT` sıfır). **Kalıcı ceza yok:** durak sınırsız kez yeniden denenebilir, hub kilidi açık kalır. 1. ve 2. yakalanmada yalnız D2/C2 cezası işler, ilerleme korunur. **Ekranda gösterilmez** (P2) — kalan hak, her ezilmede ağırlaşan korku efektiyle hissettirilir. D3'ün (unutuş yok) açtığı "hiç kayıp koşulu kalmadı" boşluğunu kapatır. Ayrıntı: `gdd-cyclops-blinding.md` bitiş/kayıp sözleşmesi, §11.7'nin ölçüm maddesi. |
| `CAUGHT_RESPAWN_POINT` | `"cave_mouth"` (D≈4) | `[SABİT DEĞİL]` | Mağara ağzı — **değişmedi** (14 Ağu). ⚠️ 25 Ağu: `CYCLOPS_CRUSH_CAP` geldiği için buranın "🔬 gerilim yetmezse gemiye çek" notu **artık gerekmiyor** — caydırıcılığı `CAP` taşıyor. ⚠️ Eski gerekçesi ("koşu-bazlı kayıp finaliyle karışmasın") D3/K40 ile geçersiz; **yeni gerekçe:** cezayı hissettirir ama turu sıfırlamaz. 🔬 Durak "gerilimsiz" ölçülürse ilk kaldıraç burasıdır (gemiye çekmek bir döngü daha kaybettirir) — bkz. `gdd-cyclops-blinding.md` Ek. |
| `CYCLOPS_ITEM_TOTAL` 🔬 | `7.0` (öneri, aralık 6–8) | adet | 2 depo + 3 ağıllar + 2 iç nöy. Hedefin (`CYCLOPS_ISLAND_TARGET` = 4) 1.75 katı — Lotus'tan (28/12≈2.3×) daha dar tampon çünkü öğe yenilenmiyor. **Playtest'te ölçülecek** — yakalanma sonrası oyuncu hâlâ 4'e ulaşabiliyor mu. |
| `CYCLOPS_LIGHT_RADIUS` 🔬 | `6.0` | m | Yerel kaynak (ocak/meşale) çevresinde `lit` bayrağı üreten yarıçap, **kapı açıkken**. `@cove` geometriyi doğruladı: ocak `(x=−4, D=35)`'e kaydırıldığı için 14 m'lik ağıllar odasında doğu duvarında ~5 m gerçek gölge şeridi kalıyor (merkezde olsaydı 1 m kalır, gölge cebi kullanılamazdı). **Yarıçap değişmedi, ocak taşındı.** |
| **`CYCLOPS_LIGHT_RADIUS_PRESENT`** *(yeni)* 🔬 | `3.0` | m | **Kapı KAPALIYKEN** aynı yerel kaynakların küçülmüş yarıçapı (ateş köze döner). Çift-ceza riski `gdd-detection-cyclops.md` §4.4'te incelendi: küçülme aslında oyuncunun **lehine** — daha çok alan `gölge` satırına düşer, ×3.0 çarpanı daha az hücrede ısırır. |

### 12.1 Körleşme (kapı) sabitleri — YENİ (24 Ağu 2026, sahip)

> Otorite: **`docs/design/gdd-cyclops-blinding.md`**. Bu sistem `DETECT_*`'in **yerine geçmiyor** — aynı zaman çizgisinde, onunla birlikte çalışıyor. Bileşik formül `gdd-cyclops-blinding.md` §4.0'da tek bir sözde-kod bloğu olarak.

| İsim | Değer | Birim | Gerekçe |
|---|---|---|---|
| `CYCLOPS_DOOR_LIGHT_REACH` | `45.0` | m | Kapı açıkken ağız ışığının derinliğe göre sönme mesafesi: `doorGlobal(D) = clamp01(1 − D / 45)`. İç nöy'ün (D 48–65) **kapı açıkken bile loş** kalması bu formülden düşer — ayrıca kodlanmış bir istisna değil. |
| `CYCLOPS_DOOR_LIT_THRESHOLD` | `0.5` | oran (0–1) | `[TÜRETİLMİŞ]` Sürekli `doorGlobal` değerini DETECT'in **ikili** `lit` bayrağına çeviren eşik: `lit = inLocalSource \|\| doorGlobal(D) >= 0.5`. `@cove`'un bölge sınırlarıyla temiz örtüşüyor — mağara ağzı/depo günışığıyla `lit`, ağıllardan (D=26) sonra `lit` tamamen yerel kaynaklara devrediyor. Kapalıyken `doorGlobal = 0` her yerde. |
| `CYCLOPS_GIANT_SPEED` | `3.0` | m/s | `[TÜRETİLMİŞ]` `PLAYER.speed`'in (4.5) ~%67'si — "ağır ama amaçlı" yürüyüş. **Kovalamaca hızı değil**; dev oyuncuyu asla kovalamıyor. `CYCLOPS_PHASE_PRESENT`'in 30 s'si bu hızdan türüyor. |
| `CYCLOPS_CRUSH_RADIUS` | `2.0` | m | `[TÜRETİLMİŞ]` **Ezilme** yarıçapı — oyuncu-dev mesafesi bunun altına düşerse `DETECT` değerinden **bağımsız** olarak anında `onCaught()`. Boğazlarda (X=4 m, dev merkez hattı `x=0`) duvardan duvara tüm genişliği kaplıyor → **boğazda devin geçişine denk gelmek neredeyse kesin ezilme**; bu kasıtlı. Geniş odalarda (12–14 m) saklaş noktaları (yanda 5–5.5 m) doğal olarak dışarıda kalıyor. |
| `CYCLOPS_GIANT_PROXIMITY_RADIUS` 🔬 | `8.0` | m | `[TÜRETİLMİŞ]` Dev **hedefine yürürken** (henüz yerleşmemişken) bu yarıçaptaki oyuncuya ek çarpan biner. Yerleştikten (uyuduktan) sonra düşer — uyuyan dev "izlemiyor". `@cove`'un saklaş↔durma mesafeleri (6.4 / 9.5 / 9.8 m) doğal eşik veriyor. |
| `CYCLOPS_PROXIMITY_MULTIPLIER` 🔬 | `2.0` | çarpan | Yukarıdaki yarıçap içindeyken oda çarpanına **ek** olarak binen katsayı. |
| `CYCLOPS_HIDE_SPOT_RADIUS` | `1.5` (mağara ağzı: `1.2`) | m | Oyuncunun saklaş noktasının "içinde" sayıldığı yarıçap. Koordinatlar `level-cyclops-cave.md` §3'te: ağız `(4, 6)` · depo `(5, 19)` · ağıllar `(5.5, 35)` · iç nöy `(4, 51)`. **Boğazlarda saklaş noktası yok** (bilinçli). |
| `CYCLOPS_WANDER_SHALLOW_PCT` | `0.15` | oran | Devin **sığ eşikte** `(0, 8)` durma olasılığı. |
| `CYCLOPS_WANDER_DEPOT_PCT` | `0.20` | oran | **Depo** `(0, 15)`. |
| `CYCLOPS_WANDER_PENS_PCT` | `0.40` | oran | **Ağıllar/Ocak** `(−4, 35)` — en yüksek ağırlık, `[H]` kanona sadık (Polyphemos'un asıl sağım/oturma yeri, IX.219 civarı): "eve dönmek" en olası davranış. |
| `CYCLOPS_WANDER_INNER_PCT` | `0.25` | oran | **İç nöy** `(0, 60)` — kişisel köşesi/uyuma noktası. **Toplam = 1.00.** |

**Gezinme çekilişi — determinizm kararı `[TÜRETİLMİŞ, @helix]`:** **dağılım sabit ve öğrenilebilir, sonuç her PRESENT'te yeniden atılır.** Bilerek **`CYCLOPS_WANDER_SEED` YOK** — `LOTUS_PHASE_SEED`/`HALLUCINATION_SEED` deseni burada **uygulanmıyor.** Gerekçe: o desen sabit varlıkların zamanlamasını ezberletmek için var; burada amaç tam tersi — sahip "her döngüde farklı, öngörülemez" dedi, "hiçbir oda garanti güvenli değil" hissi buna bağlı. P3 ile uzlaşma: oyuncu **örüntüyü** (genelde ocağa gider, bazen derine iner) istatistiksel olarak öğrenir, **o döngüyü** öğrenemez. Saflık korunuyor: `pickWanderTarget(rng)` — üretimde `Math.random`, testte mock enjekte edilir.

**Toplama kilidi:** `E` yalnız **OUT + RETURN**'de çalışır. PRESENT'te toplama tamamen devre dışı — kısmi hasat durumu oluşmaz. **Yeni tuş yok** (WASD + fare + E + Esc); "hareketsiz kalmak" = WASD'a basmamak, `HARVEST_HOLD` benzeri bir tut jesti gerekmiyor.

**Hareketsizlik kuralı — yeni sabit gerektirmiyor:** saklaş noktaları gölge cebine denk düştüğü için tam hareketsizlik `DETECT_RATE_SHADOW_STILL = 0.0` hücresine düşer → **koruma ilk kareden itibaren tam**, ısınma süresi/geri sayım **yok**. Kıpırdarsan `SHADOW_MOVING` (3.0) devreye girer; ağıllar/iç nöy'de ×3.0 ile `9.0` puan/s → `DETECT_MAX`'a ~11.1 s. **İkinci bir sayaç icat edilmedi** (P1/P2 disiplini).

### 12.2 Sınır — hangi sabit nerede yaşıyor (24 Ağu 2026, `@cove` geometriyi kesinleştirdikten sonra)

`@cove` 24 Ağu'da level-spec'i baştan yazdı ve geometriyi kesinleştirdi. Sınır artık net:

| **`tuning.md` §12'de yaşar** (davranış/sistem — motorun okuduğu) | **`level-cyclops-cave.md`'de kalır** (yerleşim — sahne kurulumunun okuduğu) |
|---|---|
| Tüm `DETECT_*` oranları, eşikler, çarpanlar | Oda sınırları (D aralıkları), genişlik X, tavan Y |
| Tüm `CYCLOPS_PHASE_*`, `CYCLOPS_CYCLE` | Saklaş noktası **koordinatları** `(x, D)` — yarıçapları burada (§12.1) |
| `CYCLOPS_DOOR_LIGHT_REACH`, `CYCLOPS_DOOR_LIT_THRESHOLD` | Bölge-başı görünürlük **tablosu** (formülün türevi, tonal referans) |
| `CYCLOPS_GIANT_SPEED`, `CRUSH_RADIUS`, `PROXIMITY_*` | Devin **rota hattı** (`x = 0`) ve 3 durma **noktasının koordinatı** |
| `CYCLOPS_WANDER_*_PCT` (olasılıklar) | Ocağın konumu `(−4, 35)` |
| `CAUGHT_ITEM_DROP`, `CAUGHT_DROP_RADIUS`, `CAUGHT_RESPAWN_POINT` | 7 azığın **koordinatları** ve tipleri; düşen öğenin zemine snap kuralı |
| `CYCLOPS_ITEM_TOTAL` (7), `CYCLOPS_ISLAND_TARGET` (4), `CYCLOPS_LIGHT_RADIUS*` | `CYCLOPS_CAVE_DEPTH` (65 m), `CYCLOPS_COVE_DEPTH` (15 m), oda-başı öğe sayıları (2/3/2) |

**İlke:** bir sayı *ne olduğunu* değiştiriyorsa (davranış) → `tuning.md`. *Nerede olduğunu* değiştiriyorsa (yerleşim) → level-spec. Oda-başı öğe sayıları (2/3/2) sınırda duruyor; **level-spec'te bırakıldı** çünkü koordinat listesiyle birlikte okunmadıkça anlamsızlar — ama toplamları (`CYCLOPS_ITEM_TOTAL = 7`) burada yaşıyor, çünkü denge hesabına giren o.

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
| `HALLUCINATION_CONTACT_MEM_SPIKE` 🔬 | `10.0` (öneri) | puan | Temas anındaki tek seferlik unutuş artışı. `MEM_ON_HARVEST` (4) ile `MEM_WITHERED_PENALTY` (12) arası — tek seferlik unutuş olayları ailesinin en küçüğü. ⚠️ **24 Ağu 2026 düzeltmesi:** eski gerekçe bunu ~~"Kiklop'un `CAUGHT_MEM_SPIKE` (30) ailesinin en küçüğü"~~ diye konumlandırıyordu; **`CAUGHT_MEM_SPIKE` artık yok** (D3 — Kiklop'ta unutuş sistemi hiç çalışmıyor), yani bu aile artık **yalnız Lotus Adası'na** ait: `MEM_ON_HARVEST` (4) · **`HALLUCINATION_CONTACT` (10)** · `MEM_WITHERED_PENALTY` (12) · `MEM_LOTOPHAGOS_TRADE` (20). Değer değişmedi, yalnız ölçek referansı düzeltildi. **Playtest'te ölçülecek — §11.5.** |
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
