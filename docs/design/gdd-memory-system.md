# GDD — Unutuş Sistemi (Memory)

> **Durum:** Tasarlandı — sahip onayı ve playtest bekliyor
> **Tarih:** 2026-08-14
> **Uyguladığı sütun:** **P2** (unutma görülür, anlatılmaz) · **P4** (kıyı huzurdur)
> **Sayılar:** hepsi `docs/design/tuning.md`'den. Bu dokümanda sayılar **sabit adıyla** anılır.
> **Bağlı doküman:** `gdd-lotus-collection.md` (kardeş sistem), `scenario.md` (tema), `game-concept.md` (çerçeve)
> **Çoklu-ada notu (14 Ağu 2026, sahip onayı, `multi-island-concept.md` M7):** proje artık **3 duraklı bir koşu** (Lotus Adası + Kiklop Mağarası + Sirenler Geçidi). Bu doküman aşağıda buna göre güncellendi: unutuş **ada başına sıfırlanmıyor**, koşu boyunca taşınıyor (§3.5). Kiklop/Sirenler'in kendi yerel unutuş kaynakları (`island-designer`'ın işi) henüz bu dosyaya yazılmadı; burada sadece **paylaşılan** mekanik (tek unutuş ölçeği, hub'a dönüş formülü) tanımlanıyor.
> **Hub'a dönüş notu (14 Ağu 2026 — `multi-island-concept.md` §9):** sahip "hub yok" kararını tersine çevirdi — **gerçek bir hub var, oyuncu durak seçebiliyor.** §3.1 madde 1 ve §3.5 buna göre güncellendi (taşıma tetiği "hub'a dönüş", "adalar arası doğrudan geçiş" değil — sonuç aynı, çerçeve değişti). **§3.1 madde 9 ve §4.4'teki kayıp finali de sahip onayıyla kapandı (14 Ağu 2026, K27):** kayıp artık koşu bazlı değil, **durak bazlı** — bir durakta `MEM_GRACE` biterse yalnızca o durak biter, oyuncu hub'a döner.

---

## 1. Genel bakış

Unutuş, oyunun tek tehdit sistemidir. **0–100 arası tek bir sayıdır** ve oyuncuya asla sayı olarak gösterilmez. Adada geçirilen zaman, açmış lotusların kokusu ve taşınan çiçekler bu değeri yükseltir; denize girmek, gemiye yaklaşmak ve çiçek teslim etmek düşürür.

Değer yükseldikçe oyun **oyuncudan bilgi alır**: önce sesler boğuklaşır, sonra gemiye giden pusula oku silinir, sonra tüm arayüz kaybolur ve ekran süt beyazına gömülür, sonunda oyuncu yürüdüğü yönü bile tam kontrol edemez. Doluya ulaşırsa `MEM_GRACE` saniyelik bir son şans başlar; bu sürede denize girilmez veya gemiye varılmazsa **kayıp finali** oynar.

**Sistemin tek kuralı:** unutuş oyuncunun *yapabildiklerini* asla kısıtlamaz — sadece *bildiklerini* kısıtlar. Can barı değildir, sersemletme değildir, yavaşlatma değildir. Homeros'taki tehdit ne ise odur: **dönüş arzusunun ve yolunun kaybı.**

---

## 2. Oyuncu fantezisi

**"Kendimi kaybettiğimi fark edebiliyorum — ve hâlâ vaktim var."**

Hedef duygu korku değil, **tatlı bir dalgınlık**. Oyuncu ilk eşiği geçtiğinde ürkmemeli; "ne güzel, her şey yumuşadı" diye düşünmeli. İkinci eşikte küçük bir panik: *pusula nerede?* Üçüncüde arayüz gidince oyuncunun elinde tek bir şey kalır — **dalga sesi.** O ana kadar dekor sandığı bir şey, birden hayatta kalma aracına dönüşür.

En değerli an oyuncunun ilk kez **isteyerek denize girdiği** andır. O an oyunun temasını kimse anlatmadan anlamış olur: dönüş fikrini hatırlamak için tuza dokunman gerekir.

Kaybetmek de kötü hissettirmemeli. Kayıp finali bir "game over" değil, adada kalmanın huzurudur — ve tam da bu yüzden rahatsız edicidir.

---

## 3. Ayrıntılı tasarım

### 3.1 Çekirdek kurallar

1. **Unutuş** `MEM_START`'tan başlayan, `0`–`MEM_MAX` arasına kenetlenmiş tek bir float değerdir. **`MEM_START` yalnızca koşunun ilk girişi için geçerlidir** (oyuncu hangi durağı ilk seçerse — hub serbest sıralı, bkz. `multi-island-concept.md` §9.1). Koşu boyunca tek bir unutuş değeri taşınır — **bir durağın kendisinde asla sıfırlanmaz, hub'a dönüşte de sıfırlanmaz.** Hub'dan bir sonraki durağa giriş değeri §3.5'teki hub-dönüşü formülünden türer.
2. Her karede net değişim hesaplanır: `unutuş += (artış_oranı − azalış_oranı) × dt`, ardından tek seferlik olaylar (`+4`, `−10` gibi) eklenir.
3. **Sürekli artışlar** (birbirine eklenir):
   - `MEM_PASSIVE` — adada olduğun sürece, her zaman, koşulsuz.
   - `MEM_SCENT` — **açmış** (yarı açık, olgun veya solmuş) en az bir lotus `SCENT_RADIUS` içindeyse. **Yığılmaz:** bir çiçek de yirmi çiçek de aynı oranı verir.
   - `MEM_PER_CARRIED × taşınan_çiçek_sayısı` — çantadaki her çiçek için.
4. **Tek seferlik artışlar:** `MEM_ON_HARVEST` (hasat), `MEM_WITHERED_PENALTY` (solmuşa dokunma), `MEM_LOTOPHAGOS_TRADE` (ikramı kabul).
5. **Sürekli azalışlar** (birbirine eklenir):
   - `MEM_SEA_RECOVER` — oyuncunun ayakları denizdeyken (su derinliği > 0,1 m veya `SHORE_WET_BAND` içindeyken).
   - `MEM_SHIP_AURA` — gemiye `SHIP_AURA_RADIUS` (8 m) mesafesinden yakınken.
6. **Tek seferlik azalış:** `MEM_PER_DELIVERED`, teslim edilen her çiçek için.
7. **İç göl iyileştirmez** (`MEM_LAKE_RECOVER` = 0). Yalnızca **tuzlu su** çalışır. Bu kural oyuncuya söylenmez; kendi denemesiyle öğrenir.
8. Değer dört eşikten geçerken oyunun **sunumu** değişir (§3.2). Eşikler `MEM_THRESHOLD_HYSTERESIS` kadar histerezisle çalışır — sınırda yanıp sönme olmaz.
9. `MEM_MAX`'a ulaşıldığında `MEM_GRACE` geri sayımı başlar. Bu sürede oyuncu denize girerse veya gemiye varırsa geri sayım iptal olur ve unutuş normal azalmaya devam eder. Girmezse **kayıp finali** tetiklenir — **durak bazlı** (sahip kararı, 14 Ağu 2026, K27, `multi-island-concept.md` §9.5): oyuncu **sadece o durağı** kaybeder, hub'a döner (bağışlama uygulanmadan, bkz. §3.5) ve istediği durağı (aynısı dahil) tekrar seçebilir. Koşunun tamamı sıfırlanmaz, önceki durakların ilerlemesi/toplananları korunur. (Not: ilk taslakta "koşunun tamamı biter" önerilmişti — hub geri geldiğinde bu tersine çevrildi, güncel karar bu maddedir.)
10. Unutuş **hiçbir zaman** şunları yapmaz: hız düşürmek, toplamayı engellemek, teslimi engellemek, hasar vermek, oyuncuyu hareketsiz bırakmak.

### 3.2 Eşikler ve etkileri

| Eşik | Ad | Puan | Görsel | İşitsel | Arayüz |
|---|---|---|---|---|---|
| 0 | **Açık** | 0–24 | Normal | Normal | HUD tam |
| 1 | **Sis** | `MEM_THRESHOLD_HAZE` (25) | Ekran kenarında süt beyazı vinyet, %15 opaklık | Uzak sesler −6 dB; yüksek frekanslar hafif kesilir | Pusula oku hafifçe titrer (±3°) |
| 2 | **Kayış** | `MEM_THRESHOLD_DRIFT` (50) | Vinyet %30; renk doygunluğu %30 düşer; uzak sis oyuncuya doğru yaklaşır | Lir enstrümanı ritmini kaybeder; kendi ayak sesin 80 ms gecikir | **Pusula oku kaybolur.** Teslim sayacı rakam yerine muğlak ifade gösterir ("birkaç", "yarısı kadar") |
| 3 | **Unutuş** | `MEM_THRESHOLD_LOST` (75) | Vinyet %45; 3 px bulanıklık; doygunluk %55 düşer; uzak gemi silueti siste **görünmez** olur | Boğuk uğultu (su altı hissi); lir tersten çalar; dalga sesi **korunur** (tek yön ipucu) | **HUD tamamen kaybolur.** Etkileşim ipuçları da gider. |
| 4 | **Kalış** | `MEM_MAX` (100) | Ekran yavaşça süt beyazına yükselir (`MEM_GRACE` boyunca %45 → %85) | Uğultu yükselir, dalga sesi de sönmeye başlar | Yok |

**Eşik 3'te yürüyüş sapması:** hareket vektörüne, genliği `DRIFT_MAX_ANGLE` ve periyodu `DRIFT_PERIOD` olan salınımlı bir açı eklenir. Sabit sapma değil salınımlı sapma seçildi — sabit olsa oyuncu telafi etmeyi öğrenir ve mekanik anlamsızlaşır.

**Neden bilgi bu sırayla gidiyor:** önce **konfor** (ses), sonra **navigasyon** (pusula), sonra **durum** (HUD), en son **kontrol** (yürüyüş). Oyuncunun elinden en son alınan şey bedenidir. Bu sıra tersine çevrilirse sistem "sarhoş simülatörü" gibi okunur ve tema kaybolur.

**Dalga sesi asla tamamen kesilmez.** Eşik 3'te bile duyulur. Bu, sistemin verdiği tek sözdür: **denizi her zaman duyabilirsin.** Sütun P4 bunu gerektirir.

### 3.3 Geri kazanma yolları

| Yol | Oran / miktar | Nerede | Öğrenilme biçimi |
|---|---|---|---|
| **Denize girmek** | `MEM_SEA_RECOVER` (−6,0 /s) | Ada çevresindeki ıslak kum ve sığ su (`SHORE_WET_BAND`) | Açılışta oyuncu zaten sudan çıkarak başlar; ilk eşik geçildiğinde kıyıya dönmek içgüdüseldir |
| **Gemiye yaklaşmak** | `MEM_SHIP_AURA` (−2,0 /s) | Gemiye `SHIP_AURA_RADIUS` (8 m) | Zaten teslim için gidilir; ödül otomatik gelir |
| **Çiçek teslim etmek** | `MEM_PER_DELIVERED` (−10 / çiçek) | Gemi | Ana döngünün kendisi. **En büyük iyileşme kaynağı ilerlemenin kendisidir** — sistemin en önemli tasarım kararı bu |
| İç göl | **0** | Merkez-kuzey | Kasıtlı tuzak; bir kez denenir, kural öğrenilir |

**Neden teslim en büyük iyileşme:** oyuncu asla "önce sağlığımı topla, sonra oyna" ikilemine düşmemeli. İlerlemek ve iyileşmek **aynı eylem** olmalı. Bu, sistemin bir vergiye dönüşmesini engeller.

### 3.4 Diğer sistemlerle etkileşim

| Sistem | Yön | Ne akar |
|---|---|---|
| **Lotus toplama** | Toplama → Unutuş | `onHarvest`, `onWitheredTouch`, `onDeliver`, `carriedCount`, en yakın açmış çiçeğin mesafesi |
| **Lotus toplama** | Unutuş → Toplama | **Hiçbir şey.** Tek yönlü. (Bkz. `gdd-lotus-collection.md` §3.3) |
| **Ada / seviye** | Seviye → Unutuş | Oyuncunun su içinde olup olmadığı, gemiye mesafesi |
| **Kamera / render** | Unutuş → Render | Vinyet opaklığı, doygunluk çarpanı, bulanıklık yarıçapı, sis mesafesi |
| **Ses** | Unutuş → Ses | Alçak geçiren filtre kesim frekansı, uğultu seviyesi, lir bozulması |
| **Arayüz** | Unutuş → HUD | Hangi öğelerin görünür olduğu, pusula durumu, sayaç muğlaklığı |
| **Hareket** | Unutuş → Hareket | Sapma açısı (yalnızca eşik 3+) |
| **Oyun durumu** | Unutuş → Oyun | Kayıp finali tetiği |
| **Kiklop algılanma sistemi** (`gdd-detection-cyclops.md`, yalnızca 2. durak) | tek yönlü (o → bu) | `onCaught` → `CAUGHT_MEM_SPIKE` (tek seferlik ekleme). Bu sistem unutuşun tersine hiç okumaz — sadece besler. **Örnek desen:** her yeni durağın kendi yerel tehlikesi, ikinci bir ölçek yerine bu tek kaynağa beslenmeli (`multi-island-concept.md` §6/M3 ilkesi). |

### 3.5 Hub'a dönüşte taşıma (14 Ağu 2026, `multi-island-concept.md` M4 sonucu; 14 Ağu 2026 aynı gün — hub bağlamına taşındı, `multi-island-concept.md` §9.2)

Koşu boyunca **tek bir unutuş değeri** taşınır — hub bir sıfırlama noktası değildir (`multi-island-concept.md` §9.1: hub'da zaman donar, ama unutuş **değeri** hub'a girerken/çıkarken kendiliğinden değişmez, yalnızca aşağıdaki tek olayda değişir). Bir durak **başarıyla** bitirilip (o durağın kendi "AYRILIŞ" anı — örn. Lotus Adası'nda gemiye binip dümende E) hub'a dönülürken, unutuş **kısmen bağışlanır**, tam sıfırlanmaz:

`unutuş_hub_dönüşü = unutuş_durak_bitişi × (1 − MEM_ISLAND_RELIEF_PCT)`

`MEM_ISLAND_RELIEF_PCT` (öneri 🔬 `0.4`, bkz. `tuning.md` §5.2/§11.4) — sabit oran, tüm geçişlerde aynı. Oyuncu hub'dan hangi durağı sıradaki olarak seçerse seçsin (sıra serbest — bkz. `multi-island-concept.md` §9.1), bu bağışlanmış değerle girer.

**Neden tam sıfırlama değil (hub varken bile):** tam sıfırlama hub'ı bir **kaçış valfine** çevirir — oyuncu bir durakta zorlanınca hub'a dönüp bedelsiz sıfırlanır, tekrar dener; "ilerlemek = iyileşmek" ilkesi (§3.3) anlamını yitirir ve unutuşun gerçek bir bedel olma özelliği (P2) hub'sız haline göre bile zayıflar. **Neden tam taşıma da değil:** oran `0` olsaydı bir durağı kıl payı biten oyuncu bir sonraki durağa neredeyse dolu unutuşla girer — bu, oyuncunun *bir durak boyunca* öğrendiği her şeyi anlamsızlaştırır ve orantısız bir ceza olur.

**Örnek (`MEM_ISLAND_RELIEF_PCT = 0.4`):** Lotus Adası'nı unutuş 20 ile (temiz) bitiren oyuncu hub'a 12 ile döner. Lotus Adası'nı unutuş 90 ile (kıl payı) bitiren oyuncu hub'a 54 ile döner — zaten baskı altında, sıradaki durak çok daha az tolerans veriyor. Bu, hedeflenen his: **ne kadar ileri gidersen, dönüşü o kadar unutursun** — artık *durak sırasına* değil, *kaç kez temiz bitirdiğine* bağlı.

**Bu formülün uygulandığı tek an:** başarılı durak tamamlanışı. Bir durak bitirilemeden (gün batımı sub-hedef karşılanmadan doldu veya `MEM_GRACE` tükendi) hub'a dönülürse **hiçbir bağışlama uygulanmaz** — oyuncu o anki (muhtemelen `MEM_MAX`'a yakın) değerle hub'a taşınır, ve sadece o durağı kaybetmiş olur (§3.1 madde 9, kapandı 14 Ağu 2026 — koşunun tamamı değil).

---

## 4. Formüller

### 4.1 Net değişim oranı

`d(unutuş)/dt = MEM_PASSIVE + (koku ? MEM_SCENT : 0) + (MEM_PER_CARRIED × c) − (denizde ? MEM_SEA_RECOVER : 0) − (gemide ? MEM_SHIP_AURA : 0)`

**Değişkenler:**

| Değişken | Sembol | Tip | Aralık | Açıklama |
|---|---|---|---|---|
| Taşınan çiçek | `c` | int | 0 … `CARRY_CAPACITY` | Çantadaki çiçek sayısı |
| Koku bayrağı | `koku` | bool | — | `SCENT_RADIUS` içinde en az bir **açmış** lotus var mı |
| Deniz bayrağı | `denizde` | bool | — | Ayaklar ıslak kum/sığ su içinde mi |
| Gemi bayrağı | `gemide` | bool | — | Gemiye mesafe ≤ `SHIP_AURA_RADIUS` mi |

**Çıktı aralığı:**

| Durum | Oran (puan/s) | Sıfırdan doluya |
|---|---|---|
| Kıyıda, boş çanta, koku yok | **+0,25** | 400 s |
| Tarlada, boş çanta | **+0,60** | 167 s |
| Tarlada, dolu çanta (4) | **+1,20** ← `MEM_RATE_MAX` | 83 s |
| Gemi yanında, dolu çanta, koku yok | **+0,85 − 2,00 = −1,15** | iyileşiyor |
| Denizde, dolu çanta | **+0,85 − 6,00 = −5,15** | 20 s'de sıfırlanır |

**Örnek:** oyuncu 3 çiçekle sazlıkta duruyor. `0,25 + 0,35 + 3×0,15 = 0,95 puan/s`. 20 saniye beklerse +19 puan — yani bir tomurcuğun açmasını beklemek neredeyse bir Lotophagos takası kadar pahalıdır. **Beklemek bir karardır.**

### 4.2 Sunum eğrileri

Eşikler arasında sıçrama değil **yumuşak geçiş** kullanılır. Her etki için:

`etki = clamp01( (unutuş − eşik_alt) / (eşik_üst − eşik_alt) ) × maks_etki`

| Etki | Başlangıç | Bitiş | Maksimum |
|---|---|---|---|
| Vinyet opaklığı | 25 | 100 | 0,85 |
| Doygunluk kaybı | 50 | 100 | 0,60 |
| Bulanıklık | 75 | 100 | 3,0 px |
| Alçak geçiren kesim | 25 | 100 | 18 kHz → 900 Hz |
| Yürüyüş sapması | 75 | 100 | `DRIFT_MAX_ANGLE` |

**Ayrık** olan tek şey **bilgi**dir: pusula ve HUD ya vardır ya yoktur, `HUD_FADE_TIME` süresinde solarak gider. Yarı görünür bir pusula kararsızlık yaratır, gerilim yaratmaz.

### 4.3 Yürüyüş sapması

`sapma(t) = DRIFT_MAX_ANGLE × yoğunluk × sin(2π t / DRIFT_PERIOD)`

`yoğunluk = clamp01((unutuş − 75) / 25)`

**Örnek:** unutuş 88 → yoğunluk 0,52 → sapma ±7,8° arası salınır, periyot 4 s.

### 4.4 Son şans geri sayımı

`unutuş ≥ MEM_MAX` olduğu anda `grace = MEM_GRACE`. Her karede `grace −= dt`.
`denizde || gemide` → `grace = MEM_GRACE` (tam sıfırlanır) ve normal azalma devreye girer.
`grace ≤ 0` → **kayıp finali** tetiklenir, **durak bazlı** (kapandı 14 Ağu 2026, K27, bkz. §3.1 madde 9): sadece o durak biter, koşunun tamamı değil. Oyuncu hub'a döner, o durağı bağışlamasız (§3.5) unutuş değeriyle tekrar seçebilir; önceki duraklardan toplananlar/ilerleme korunur.

**Erişilebilirlik kontrolü:** `MEM_GRACE × PLAYER_SPEED = 10 × 4,5 = 45 m`. Sazlıktan (gemi ~35 m) kurtulunur; iç gölden (deniz ~50 m) kurtulunamaz. Yani coğrafya kaderi belirler — oyuncu nereye kadar açıldığının bedelini öder.

---

## 5. Sınır durumlar

- **Unutuş 0'ın altına inerse:** 0'a kenetlenir. Negatif "birikmiş hatıra" yoktur; denizde bekleyerek kredi toplanamaz.
- **Unutuş tam olarak eşik değerindeyse:** eşik **dahil** sayılır (≥). Aşağı inerken `MEM_THRESHOLD_HYSTERESIS` kadar fazladan düşüş gerekir.
- **Oyuncu `MEM_GRACE` sırasında bir çiçek teslim ederse:** `MEM_PER_DELIVERED` uygulanır, değer `MEM_MAX`'ın altına düşer, geri sayım iptal olur. Teslim gemide yapıldığı için zaten `gemide` bayrağı da açıktır. Kurtuluş meşrudur.
- **Oyuncu `MEM_GRACE` sırasında 12. çiçeği teslim ederse:** kazanma koşulu açılır ve oyuncu dümene basabilir. **Kıl payı zafer mümkündür ve olması gerekir.**
- **Deniz ve koku aynı anda aktifse** (kıyıya çok yakın çiçek varsa): ikisi de uygulanır, net oran yine güçlü negatiftir (−5,4). Kıyı her koşulda güvenlidir (P4).
- **Oyuncu denizde duruyorsa ve unutuş 0'sa:** hiçbir şey olmaz. Ceza yok, ödül yok. Denizde beklemek günü yer; ceza gerekmez, güneş zaten cezadır.
- **Eşik 3'teyken oyuncu gemiye rastlantıyla varırsa:** `MEM_SHIP_AURA` başlar, değer düşer, eşiğin altına inince HUD `HUD_FADE_TIME` süresinde geri gelir. Geri dönüş her zaman mümkündür; kalıcı bozulma yoktur.
- **Aynı karede hem hasat hem eşik geçişi olursa:** önce değer güncellenir, sonra eşik değerlendirilir. Yani `+4`'lük hasat eşiği aşabilir ve HUD anında solmaya başlar. Doğru olan budur — oyuncu sebebi görür.
- **Oyun duraklatılırsa (Esc):** unutuş ilerlemez, güneş ilerlemez, olgunluk ilerlemez. Duraklat gerçek duraklatmadır; hiçbir sistem arkada çalışmaz.
- **Sekme arka plana alınırsa (tarayıcı):** aynı davranış — `visibilitychange` ile otomatik duraklatma. Aksi halde oyuncu sekmeden dönünce ölmüş olur; bu haksızlıktır.

---

## 6. Bağımlılıklar

| Bağımlılık | Yön | Sertlik | Arayüz |
|---|---|---|---|
| Lotus toplama | tek yönlü (o → bu) | **Sert** | Olaylar: `onHarvest`, `onWitheredTouch`, `onDeliver(n)`, `onLotophagosTrade`; durumlar: `carriedCount`, `nearestOpenBloomDistance` |
| Seviye / ada | tek yönlü | **Sert** | `isInSeaWater`, `distanceToShip` |
| Post-process yığını | tek yönlü (bu → o) | **Sert** | Vinyet, doygunluk, bulanıklık, sis mesafesi — sistemin tüm ifadesi buradan geçer |
| Ses motoru | tek yönlü | **Yumuşak** (görsel etkiler tek başına okunur, ama his yarıya iner) | Filtre kesimi, uğultu seviyesi, lir bozulması |
| HUD | tek yönlü | **Sert** | Görünürlük bayrakları, pusula durumu, sayaç muğlaklığı |
| Oyuncu hareketi | tek yönlü | **Yumuşak** | Sapma açısı |
| Oyun durumu | tek yönlü | **Sert** | Kayıp finali tetiği |

---

## 7. Ayar düğmeleri

Tam liste `tuning.md` §5'te. Playtest'te en riskli üç düğme:

| Düğme | Çok yüksekse | Çok düşükse |
|---|---|---|
| `MEM_SEA_RECOVER` | "Her turdan sonra 5 s denize gir" refleksi doğar; sistem gerilim değil **vergi** olur | Kıyı güvenli hissettirmez; sütun P4 çöker; oyun adaletsizleşir |
| `MEM_PER_CARRIED` | Dolu çantayla dönmek imkânsızlaşır, `CARRY_CAPACITY` anlamını yitirir | Risk/ödül pompası durur, dolu çanta bedava olur, oyunun tek kararı kaybolur |
| `MEM_THRESHOLD_LOST` | Oyuncu HUD kaybını hiç yaşamaz; oyunun en akılda kalıcı anı hiç oynanmaz | Oyuncu sürekli körlemesine oynar, sinirlenir, sistemi "bozuk" sanır |

**Birbirini etkisizleştiren çift:** `MEM_PER_DELIVERED` ↑ ve `MEM_SEA_RECOVER` ↑ birlikte artırılırsa unutuş tamamen anlamsızlaşır. **Sadece biri** ayarlanmalı; tercih `MEM_PER_DELIVERED` (ilerlemeye bağlı olan).

---

## 8. Kabul kriterleri

- **GIVEN** oyuncu adada, boş çantayla, hiçbir açmış lotusa `SCENT_RADIUS` içinde değil, **WHEN** 10 saniye geçer, **THEN** unutuş 2,5 ± 0,1 puan artar.
- **GIVEN** oyuncu 4 çiçek taşıyor ve bir açmış lotusun `SCENT_RADIUS` içinde, **WHEN** 10 saniye geçer, **THEN** unutuş 12,0 ± 0,2 puan artar.
- **GIVEN** oyuncunun `SCENT_RADIUS` içinde **beş** açmış lotus var, **WHEN** oran ölçülür, **THEN** koku katkısı tek çiçekliyle **aynıdır** (`MEM_SCENT`, yığılmaz).
- **GIVEN** unutuş 40, **WHEN** oyuncu sığ denize girer ve 5 saniye bekler, **THEN** unutuş 10 ± 0,5 olur.
- **GIVEN** unutuş 24 ve artıyor, **WHEN** değer 25'i geçer, **THEN** süt beyazı vinyet `HUD_FADE_TIME` içinde belirir ve uzak sesler alçalır.
- **GIVEN** unutuş 50'yi geçti, **WHEN** oyuncu HUD'a bakar, **THEN** pusula oku görünmez ve teslim sayacı rakam göstermez.
- **GIVEN** unutuş 52 ve azalıyor, **WHEN** değer 50'nin altına iner, **THEN** pusula **hemen geri gelmez** — `MEM_THRESHOLD_HYSTERESIS` kadar daha düşmesi gerekir (47).
- **GIVEN** unutuş 75'i geçti, **WHEN** oyuncu W tuşuna basılı tutar, **THEN** hareket yönü `DRIFT_PERIOD` periyoduyla salınan bir açıyla sapar ve tüm HUD öğeleri kaybolmuştur.
- **GIVEN** unutuş 75'in üstünde, **WHEN** ses ölçülür, **THEN** dalga sesi hâlâ duyulabilir düzeydedir (asla tamamen kesilmez).
- **GIVEN** unutuş `MEM_MAX`'a ulaştı, **WHEN** oyuncu `MEM_GRACE` içinde sığ denize girer, **THEN** geri sayım iptal olur ve unutuş `MEM_SEA_RECOVER` oranıyla düşmeye başlar.
- **GIVEN** unutuş `MEM_MAX`'a ulaştı, **WHEN** `MEM_GRACE` süresi denize/gemiye ulaşmadan dolar, **THEN** kayıp finali başlar.
- **GIVEN** oyuncu iç gölün içinde duruyor, **WHEN** 5 saniye geçer, **THEN** unutuş **azalmaz** (tatlı su iyileştirmez).
- **GIVEN** oyun Esc ile duraklatıldı, **WHEN** 30 saniye beklenir ve devam edilir, **THEN** unutuş değeri değişmemiştir.
- **GIVEN** unutuş herhangi bir değerde, **WHEN** oyuncu olgun bir çiçekte E'yi basılı tutar, **THEN** toplama normal süresinde ve normal biçimde tamamlanır (unutuş toplamayı **etkilemez**).

---

## 9. Görsel / işitsel gereksinimler

**Görsel katmanlar (post-process sırası):**

1. **Doygunluk azaltma** — dünyanın rengi çekilir, ışık çekilmez. Ada aydınlık kalmalı; kararan bir ekran korku oyunu dili konuşur, biz onu konuşmuyoruz.
2. **Süt beyazı vinyet** — siyah değil, **beyaz.** Kenarlardan içeri sızan sıcak beyaz. Unutmak burada karanlık değil, fazla ışıktır.
3. **Sis mesafesi kısalma** — atmosferik sis oyuncuya doğru sürünür; eşik 3'te gemi silueti sisin ardında kaybolur.
4. **Bulanıklık** — en son gelen ve en hafif etki. 3 px'i geçmemeli; oyuncu hâlâ önünü görmeli.

**İşitsel katmanlar:**

1. **Alçak geçiren filtre** — tüm mikstin üzerinde; unutuşla kesim frekansı düşer (18 kHz → 900 Hz).
2. **Uğultu** — eşik 2'den itibaren giren, alçak frekanslı, nefes benzeri döngü. Müzik değil, doku.
3. **Lir bozulması** — melodinin temposu ve tonu kayar; "kaset gerilmesi" hissi.
4. **Dalga sesi filtreden muaf** — bilinçli teknik istisna. Alçak geçiren filtre dalgaya **uygulanmaz** ki oyuncu en kötü anda bile denizi duyabilsin.

**Renk körlüğü:** unutuş rengi hiç kullanmaz — vinyet, bulanıklık, doygunluk ve ses üzerinden anlatılır. Renk körü oyuncu için bilgi kaybı yoktur.

**Fotosensitivite:** hiçbir eşikte yanıp sönme, stroboskopik etki veya ani parlaklık sıçraması yoktur. Tüm geçişler ≥ 1,5 s.

---

## 10. Arayüz gereksinimleri

**Unutuşun kendi göstergesi yoktur.** Sayı, bar, yüzde gösterilmez. Ölçek **ekranın kendisidir** (vinyetin kendisi = `FX_VIGNETTE`). Sütun P2'nin en sert uygulaması budur.

| Eşik | HUD durumu |
|---|---|
| Açık | Çanta, teslim, güneş yayı, pusula — hepsi görünür |
| Sis | Hepsi görünür; pusula titriyor |
| Kayış | **Pusula gider.** Teslim sayacı muğlaklaşır. Çanta ve güneş kalır |
| Unutuş | **Hiçbiri yok.** Etkileşim ipuçları da yok |
| Kalış | Yok |

Tüm geçişler `HUD_FADE_TIME` süresinde solarak olur; ani kesme "bug" gibi okunur.

**Muğlak sayaç metinleri** 🔬 (eşik 2, teslim sayacı yerine — `HUD_VAGUE_COUNTER`, playtest'e ertelendi): `"birkaç"` (1–3), `"yarısına yakın"` (4–7), `"neredeyse hepsi"` (8–11), `"hepsi"` (12). Oyuncu ilerlediğini bilir, ne kadar ilerlediğini bilmez.

---

## Playtest'e ertelenen değerler

Bu iki değer **oynanır sürüm elde olmadan değiştirilmeyecek.** Masa başında tartışılmaları yasak; ölçüm sonucu beklenir. Ölçüm yöntemi ve karar kriterleri: `tuning.md` §11.

| Değer | Şimdilik | Ölçülecek | Karar kriteri |
|---|---|---|---|
| `MEM_SEA_RECOVER` 🔬 | −6.0 puan/s (sabit) | Tur başına deniz teması sayısı | Oyuncu her turdan sonra denize girme refleksi buluyorsa oran düşürülecek — **unutuş gerilim olmalı, vergi olmamalı.** Çare sırası: −4.0'a indir, gerekirse kademeli yap (ilk 3 s tam, sonrası yarım). |
| `HUD_VAGUE_COUNTER` 🔬 (eşik 2'de muğlak sayaç) | `true` | Oyuncu eşik 2 sonrası kaç çiçek teslim ettiğini biliyor mu | Tamamen kaybediyor ve bunu haksızlık/bug olarak okuyorsa `false` yapılır. Gemi direklerindeki bezleri sayarak toparlıyorsa `true` kalır. |
| `MEM_ISLAND_RELIEF_PCT` 🔬 (hub'a dönüş bağışlaması, §3.5, eklendi 14 Ağu 2026, hub bağlamına taşındı aynı gün) | `0.4` | Bir durağı bitirip hub'a dönen oyuncunun taşıdığı unutuşun sonraki durağı ne kadar zorlaştırdığı | Sistematik olarak adaletsiz bulunuyorsa (kıl payı biten bir sonraki durağı hiç tamamlayamıyorsa) yükseltilir; taşıma hiç hissedilmiyorsa düşürülür. Ayrıntı: `tuning.md` §11.4. |

---

## Açık sorular

1. **Kayıp finali `MEM_GRACE` sonunda mı, yoksa oyuncu bir süre daha dolaşabilmeli mi?** Şu an sert kesim. Alternatif: oyuncu unutuş dolu halde dolaşmaya devam eder ve final ancak güneş battığında gelir — daha şiirsel ama daha uzun. **Sahip kararı.**
2. **Uğultu sesi ne kadar rahatsız edici olmalı?** Çok yumuşak olursa tehdit hissedilmez; çok sert olursa oyuncu sesi kapatır ve sistemin yarısı kaybolur.
3. **Oyunun başında unutuş mekaniği açıklanmalı mı?** Şu an hiçbir yerde açıklanmıyor — oyuncu vinyeti görüp kendi çıkarımını yapıyor. Bu cesur ama riskli. Açılış metnindeki tek satır ("*Kokusu yemeden de işler*", bkz. `scenario.md`) yeterli mi?
