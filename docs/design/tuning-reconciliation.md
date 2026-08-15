# Tuning ↔ constants.ts — kapsamlı fark tablosu (Faz 1.1)

> **Bu doküman karar vermez, seçenek üretir.** Her satırdaki "Öneri" sütunu bağlayıcı değildir — sahip Faz 1.2'de satır satır onaylayacak/değiştirecek. `game-designer` burada gerekçe sağlıyor, seçim yapmıyor.
> **Tarih:** 2026-08-15 · **Kapsam:** `docs/design/tuning.md` (tüm bölümler) ↔ `src/constants.ts` (tüm export'lar).
> **Kapsam dışı:** K1/K2/K3 (unutuş barı / ada ölçeği / kayıp davranışı) — bunlar `roadmap.md` §4.1'de **kapalı** sayılıyor, iki world-profile (`test`/`real`) çözümüyle.
> **Not (aynı gün, K34):** bu tablo yazıldıktan sonra `real` profil `ISLAND.radius` 70→**160**, gemi (0,−60)→**(0,−140)** olarak kodlandı (çekirdek döngü `LAYOUT_SHIFT_Z = −80` ile kaydı). Aşağıdaki "Eşleşenler" satırındaki radius=70 / gemi (0,−60) **artık güncel değil** — K34 playtest onayı gelince bu tablo Faz 1.2'de yeniden yazılmalı. Tablo, K34 öncesi `real`'in iç tutarlılığını belgeler.
> **K35:** Lotus `real` sayıları bu tablodan değil `gdd-lotus-island-run.md` §7’den okunur. Kod hâlâ eski (12/28); spec kazanır.

---

## Baş bulgu: iki-profil çözümü yalnızca 12 değeri kapsıyor, geri kalan her şey hâlâ test-adası sayılarında donmuş

K1/K2/K3'ün `test`/`real` çözümü yalnızca şu alanları profile göre değiştiriyor: `ISLAND.radius`, `PLAYER.speed`, `LOTUS.count`/`carryCap`, `SHIP.pos`/`range`, `MEMORY`'nin 6 oranı (`islandGain`, `perCarriedGain`, `lagoonGain`, `pickSpike`, `shipRecover`, `seaRecover`), `WORLD.showMemoryBar`, `WORLD.lossMode`. **Bu 12 değer, `real` profilde `tuning.md` ile birebir eşleşiyor** (aşağıdaki "Eşleşenler" bölümüne bkz.) — K1-3 çözümü kendi kapsamında gerçekten çalışmış.

Ama `constants.ts`'in geri kalanı — kamera, oyuncu çevirme/yarıçap, lotus aşama süreleri, hasat/teslim menzilleri, unutuş eşikleri, unutuş azalış detayları, Lotophagoi menzili, yerleşim kuralları, HUD zamanlamaları — **profile hiç bağlı değil.** `?profile=real` seçildiğinde bile bu değerler hâlâ orijinal küçük/hızlı test-adası tasarımının sayılarını taşıyor. Yani bugün "gerçek" oyunu oynayan biri, adanın boyutu ve unutuş oranları doğru olsa da, aşama süreleri 3 kat kısa, hasat basılı-tutma mekaniği hiç yok, dört eşikten üçü yok, ve çiçekler hâlâ test-ölçekli koordinatlarda kümelenmiş bir oyun oynuyor. Bu, aşağıdaki "Paket zinciri" bölümünün ana konusu.

---

## A. Paket zinciri: ada yarıçapı → çiçek yerleşimi → tur süresi → unutuş oranı → kamera mesafesi

Roadmap bu zincirin **tek tek değil paket halinde** düşünülmesini istiyor. Zincirin her halkasını ayrı ayrı denetledim:

1. **Ada yarıçapı** — `real` profilde `ISLAND.radius = 70` — `tuning.md`'nin `ISLAND_RADIUS = 70.0` ile birebir eşleşiyor. ✅ Bu halka kapalı.
2. **Çiçek yerleşimi** — `LOTUS.zones` (reed/deep/cove) **profile bağlı değil**: üç bölgenin merkez koordinatları (`cx`/`cz` değerleri -5.5..6.8 aralığında, yarıçapları 4.4–6.4 m) hâlâ 26 m'lik test adasına göre yazılmış. `real` profilde `LOTUS.count = 28` olduğunda kod yalnızca `spots.length = LOTUS.count` ile diziyi **kırpıyor** (roadmap §1.4a'nın "bilinen sınırlama" notu) — çiçekleri 70 m'lik adaya **yeniden dağıtmıyor**. Sonuç: `real` profilde 28 çiçeğin tamamı adanın merkezine yakın ~12 m yarıçaplı bir alanda kümeleniyor, adanın geri kalan ~58 m'si boş kalıyor. **Bu, zincirin en kırık halkası.**
3. **Tur süresi** — `tuning.md`'nin `STAGE_RIPE = 30.0 s` kararı doğrudan "ada boydan boya geçişi ~31 s" varsayımına kilitli (bkz. tuning.md §3.1 gerekçesi: "gördüğün tek bir çiçeğe her yerden yetişirsin, ikisine birden asla"). Ama (a) çiçekler merkezde kümelendiği için gerçek yürüme mesafeleri 31 s'lik tam-ada geçişinden çok kısa, (b) kodun kendi `ripeTime = 26` (profile'dan bağımsız, her zaman 26 s) zaten `tuning.md`'nin 30 s'sinden farklı. İki sorun üst üste biniyor: yanlış süre + yanlış mesafe → tasarımın "tek zor karar" gerekçesi bugün hiç geçerli değil.
4. **Unutuş oranları** — bunlar doğru: `real` profildeki 6 oran `tuning.md`'nin puan/s değerlerinin 100'e bölünmüş hâliyle birebir eşleşiyor (bkz. Eşleşenler). Ama bu oranların dengesi `tuning.md` §9'daki "tipik tur" hesabına dayanıyor, o hesap da adım 2 ve 3'teki mesafe/süre varsayımlarını kullanıyor. Oranların kendisi doğru olsa da, **üzerine oturduğu zemin (mesafe/süre) yanlış** — yani §9'un "temiz tur başabaşın hafif altında" sonucu bugünkü kodda geçerli değil.
5. **Kamera mesafesi** — `CAMERA_DISTANCE = 9.0 m` / `CAMERA_HEIGHT = 5.5 m` tuning gerekçesi "oyuncu + çevresindeki ~6 çiçeği aynı karede tutmak." Kodun `CAMERA.dist = 8.2` / `height = 3.6` zaten farklı (aşağıya bkz.), ama asıl sorun kamera değil — çiçekler merkezde kümelendiği için mevcut kamera mesafesiyle bile "6 çiçek" hedefi anlamsızlaşıyor, çünkü oyuncu zaten kümenin içinde duruyor.

**Sonuç:** adım 1 ve 4 (ada boyutu, unutuş oranları) doğru taşınmış. Adım 2, 3, 5 hâlâ eski tasarımın izini taşıyor. Bunları tek tek "kod kazanır/doc kazanır" diye düzeltmek yanlış çerçeve — bu paket, **Faz 2.6'nın işi** (`level-lotus-island.md`'nin el yerleşimli 28 çiçeğinin `islandLayout.ts`'e taşınması). Faz 1.2'de tek tek satır onaylamak yerine, sahip'in bu zincir için vereceği asıl karar muhtemelen "Faz 2.6'ya kadar bekle" olacak — aşağıdaki ilgili satırlarda bunu ayrıca not ettim.

---

## B. Ana fark tablosu (ikisinde de var, değer farklı)

*Tüm karşılaştırmalar `real` profile göre — `test` profil kasıtlı olarak farklıdır, K2 kapsamında zaten tartışılmış.*

### B.1 Oyuncu ve kamera (tuning §1)

| Sabit (tuning.md) | tuning.md değeri | constants.ts karşılığı | Oran/fark | Öneri | Gerekçe | Maliyet |
|---|---|---|---|---|---|---|
| `PLAYER_RADIUS` | 0.4 m | `PLAYER.radius` = 0.45 m | 1.125× | doc kazanır | Çarpışma kapsülü; %12,5 fark oynanışta hissedilir boyutta değil ama çarpışma/hasat menzili hesaplarını (`HARVEST_RANGE`) etkiliyor | `LOTUS_MIN_SPACING` ve hasat menzili hesaplarının dayandığı taban değer |
| `PLAYER_TURN_SMOOTH` | 0.10 s (yumuşama **süresi**) | `PLAYER.turnLerp` = 0.22 (lerp **katsayısı**, birimsiz) | karşılaştırılamaz — farklı parametrizasyon | üçüncü değer | tuning.md süre cinsinden tanımlıyor, kod her kare uygulanan sabit bir lerp katsayısı kullanıyor (60 Hz'de ~0.22 katsayı ≈ farklı bir zaman sabiti verir). Birebir eşleştirme `gameplay-programmer`'ın işi | Karakterin dönüş hissi; oyuncu-kamera senkronu |
| `CAMERA_DISTANCE` | 9.0 m | `CAMERA.dist` = 8.2 m | 0.911× | doc kazanır (ama bkz. §A adım 5) | Tuning'in "6 çiçek aynı karede" gerekçesi çiçek kümelenmesi düzelmeden test edilemez | Kamera görüş alanı, çiçek okunabilirliği |
| `CAMERA_HEIGHT` | 5.5 m | `CAMERA.height` = 3.6 m | 0.655× | doc kazanır (ama bkz. §A adım 5) | "Olgun/solmuş ayrımının tepeden okunması" gerekçesi 3.6 m'de zayıflar | Aşama okunabilirliği (P4 sütunu) |
| `CAMERA_PITCH` | -22.0° (**sabit** açı) | `CAMERA.pitchStart` = 0.16 rad (~9.2°), `pitchMin` = -0.1 rad, `pitchMax` = 0.62 rad (**oyuncu ayarlayabiliyor**) | yapısal fark, sadece sayısal değil | tasarım sorusu, üçüncü değer | tuning.md sabit sinematik açı tarifliyor ("daha dik olursa ufuk kaybolur — sütun P4'ü bozar"); kod fare ile ayarlanabilir dikey kamera sunuyor. Bu iki farklı kamera felsefesi — hangisi isteniyor, sahip'in tercih sorusu | Ufuk/deniz görünürlüğü garantisi (P4); eğer serbest pitch kalırsa P4 gerekçesi yeniden yazılmalı |
| `CAMERA_YAW_SPEED` | 0.15 °/piksel (yalnızca yaw) | `CAMERA.mouseSens` = 0.0032 (yaw **ve** pitch için ortak) | ~1.22× (0.15° = 0.00262 rad/px varsayımıyla) | üçüncü değer | Birim dönüşümü yaklaşık; ayrıca kod aynı hassasiyeti pitch'e de uyguluyor — tuning modelinde pitch zaten sabit olduğu için bu karşılaştırma yok | Fare hissi; CAMERA_PITCH kararına bağlı |
| `CAMERA_ZOOM_MIN` / `CAMERA_ZOOM_MAX` | 7.0 m / 13.0 m | **yok** — `CAMERA.dist` sabit, zoom mekaniği hiç yok | — | bkz. §C | Roadmap'in "tasarımda var, kodda yok" listesinde bile geçmiyor — daha önce fark edilmemiş bir eksik | Kamera kontrol şeması |

### B.2 Lotus — hedef ve zon dağılımı (tuning §3)

| Sabit | tuning.md değeri | constants.ts karşılığı | Oran/fark | Öneri | Gerekçe | Maliyet |
|---|---|---|---|---|---|---|
| `LOTUS_TARGET` | 5 (K35 kilit) | `LOTUS.target` = 12 | — | **doc kazanır; kod §9 bekliyor** | K35: Lotus `real` hedefi 5. | Final / dümen |
| `ZONE_LAKE_COUNT` (§7) | 10 | `LOTUS.zones[1]` ("deep") `.count` = 14 | 1.4× | üçüncü değer | Her iki sayı da 28'lik toplama göre hesaplanmış eski varsayımlar; `tuning.md`'nin kendisi bunu "hâlâ eski 12 hedefine göre" diye işaretliyor (§3.0) | Faz 2.6 el yerleşimiyle birlikte yeniden dengelenecek, şimdilik ikisi de geçici |
| `ZONE_HILL_COUNT` (§7) | 6 | `LOTUS.zones[2]` ("cove") `.count` = 8 | 1.33× | üçüncü değer | Aynı not; ayrıca **isim uyuşmazlığı** — tuning "tepeler" (yükseklik/manzara bölgesi) diyor, kod "cove" (koy) diyor. `PUZZLE` objesindeki `cairnSolveOrder`/`coveGatedRatio` iki ayrı bölgeye işaret ediyor olabilir — bu bir isimlendirme kontrolü değil, **kavram eşleşmesi kontrolü** gerektiriyor | `level-lotus-island.md`'nin krokisiyle karşılaştırılmalı (bu görevin kapsamı dışında, `island-designer`'ın işi) |
| — (§3.1 not) | `LOTUS_TOTAL=28`, zonlar hâlâ eski dengeye göre | `LOTUS.zones` toplamı = 12+14+8 = **34**, `real` profilde `count=28`'e **kırpılıyor** | — | bkz. §A | Kırpma, zonların oransal dağılımını bozuyor (34→28 kırpma son zonun bir kısmını komple siliyor, üç bölge arasında orantılı küçültme yapmıyor) | Zon dengesi, "kıtlık değil rota problemi" tasarım hedefi |

### B.3 Lotus — aşama süreleri (tuning §3.1)

| Sabit | tuning.md değeri | constants.ts karşılığı | Oran/fark | Öneri | Gerekçe | Maliyet |
|---|---|---|---|---|---|---|
| `STAGE_BUD` | 45.0 s | `LOTUS.budTime` = 14, **profile bağlı değil** | 0.311× | doc kazanır | Roadmap zaten bunu Faz 2.1'e bağlıyor ("deterministik olgunlaşma" işiyle birlikte) | Tam döngü süresi, günlük olgunlaşma sayısı (§3.1 "3.5 kez olgunlaşır" hesabı) |
| `STAGE_HALF_OPEN` | 25.0 s | `LOTUS.halfTime` = 11 | 0.44× | doc kazanır | Aynı | Aynı |
| `STAGE_RIPE` | 30.0 s | `LOTUS.ripeTime` = 26 | 0.867× | doc kazanır (ama bkz. §A adım 3) | Bu değer, adanın 31 s'lik geçiş süresine **kasıtlı** eşitlenmiş — adım 2 (çiçek kümelenmesi) düzelmeden bu satırı tek başına 30'a çekmek yanlış hissi düzeltmez | Oyunun "tek zor kararı" (rota planlama) |
| `STAGE_WITHERED` | 20.0 s | `LOTUS.wiltTime` = 16 | 0.8× | doc kazanır | Ceza görünürlüğü penceresi | `MEM_WITHERED_PENALTY` (şu an kodda hiç yok, bkz. §C) ile birlikte anlam kazanıyor |
| `LOTUS_CYCLE` [TÜRETİLMİŞ] = 120 s | 120 s | Kodun kendi döngüsü: 14+11+26+16 = 67 s (+ `goneTime`=12 s eklenirse 79 s) | 0.558×–0.658× | doc kazanır | Günde kaç kez olgunlaştığı hesabı (§3.1) doğrudan bu toplama bağlı | Kaynak bolluğu/kıtlık dengesi |
| — | **yok** (tuning'de tanımlı değil — "hasat sonrası bitki BUD'a döner, ayrı respawn sistemi yoktur") | `LOTUS.goneTime` = 12 s — hasat sonrası ayrı bir "gone" (yok) evresi var | — | **doc kazanır** | tuning.md §3.1 açıkça "ayrı bir respawn sistemi yoktur" diyor; kodun 5. evresi bu ilkeyi ihlal ediyor | Aşama enum'u (`LotusStage`), 4 aşamalı okunabilirlik tasarımı |
| — | **yok** (determinizm bekleniyor — `LOTUS_PHASE_SEED`) | `LOTUS.timeJitter` = 0.45 (%45 rastgele sapma, `Math.random()` ile) | — | **doc kazanır** | Roadmap zaten bunu en büyük tek "P3 çökük" bulgusu olarak işaretlemiş — rota öğrenilemez | Oyunun öğrenilebilirlik sütunu (P3), Faz 2.1'in tamamı |

### B.4 Toplama ve teslim (tuning §4)

| Sabit | tuning.md değeri | constants.ts karşılığı | Oran/fark | Öneri | Gerekçe | Maliyet |
|---|---|---|---|---|---|---|
| `HARVEST_RANGE` | 2.2 m | `LOTUS.pickRange` = 2.4 m | 1.091× | doc kazanır | `LOTUS_MIN_SPACING`'in dayandığı taban değer (bkz. altta) | Yerleşim kuralı tutarlılığı |
| `LOTUS_MIN_SPACING` (§7) | 3.0 m (= `HARVEST_RANGE` 2.2 + tampon) | `LOTUS.minSpacing` = 1.75 m | 0.583× | **doc kazanır — doğruluk sorunu, sadece tercih değil** | tuning.md'nin kendi kuralı: iki çiçek asla aynı anda hedeflenemesin diye `minSpacing > pickRange` olmalı. Kodda **tam tersi**: `minSpacing` (1.75) `pickRange`'den (2.4) **küçük** — yani bugün iki çiçek aynı anda menzile girebilir, tasarımın "hangi çiçeği hedefliyorum" netliği bozulabilir | Hasat hedefleme netliği; zon içi `spacing` alanlarıyla (1.55/1.85/1.7) da tutarsız, o üçü de `minSpacing`'den farklı |

### B.5 Unutuş — artışlar (tuning §5.1)

| Sabit | tuning.md değeri | constants.ts karşılığı | Oran/fark | Öneri | Gerekçe | Maliyet |
|---|---|---|---|---|---|---|
| `MEM_SCENT` + `SCENT_RADIUS` | 0.35 puan/s, açık çiçeğin 12 m yarıçapında, **yığılmaz** | `MEMORY.lagoonGain` = 0.35/100 (**oran doğru**) ama tetik koşulu **farklı**: "lagündeyse" kontrolü, çiçek yakınlığı değil | oran eşleşiyor, mekanik eşleşmiyor | doc kazanır (mekanik) | Roadmap bunu zaten Faz 2.7'ye atamış: "Koku modeli: SCENT_RADIUS tabanlı... mevcut 'lagündeyse' kontrolünün yerine." Bugün tarlanın dışında (lagün dışında) açık çiçeğin yanında durmak hiç ek unutuş vermiyor olabilir | Unutuş dengesi, §9'un tur hesabı |
| `MEM_MAX` | 100.0 puan (0–100 ölçek) | **yok** — motor 0–1 float kullanıyor, `MEM_MAX` karşılığı yok (üstü 1.0 olarak örtük) | ölçek farkı | **açık — Faz 1.6'nın kararı** | `constants.ts`'in kendi yorumu bunu zaten "Faz 1.6'nın kararını öngörmez" diye işaretlemiş; bu satır o kararı **yeniden açmıyor**, sadece kayıtlı tutuyor | Tüm `MEM_*`/`FX_*` eğrilerinin okunabilirliği; ölçek kararı verilene kadar her yeni unutuş sabiti "gerçek puan" değil "100'e bölünmüş" yazılmak zorunda |

### B.6 Unutuş — azalışlar (tuning §5.2)

| Sabit | tuning.md değeri | constants.ts karşılığı | Oran/fark | Öneri | Gerekçe | Maliyet |
|---|---|---|---|---|---|---|
| `SHORE_WET_BAND` (§7) | 3.0 m (ıslak kum şeridi genişliği) | `MEMORY.seaBand` = 2.6 m ("hâlâ deniz sayılan" mesafe — farklı tanım) | 0.867×, kavramsal fark | üçüncü değer | İkisi de "nerede deniz iyileşmesi tetiklenir" sorusuna cevap veriyor ama biri kıyı-şeridi genişliği, diğeri oyuncudan-kıyıya mesafe olarak tanımlı. Tek bir kavrama birleştirilmeli | `MEM_SEA_RECOVER`'ın tetiklendiği alan, Faz 2.8 |
| `MEM_PER_DELIVERED` | -10.0 puan / çiçek (teslimde) | **bulunamadı** — `constants.ts`'te teslime bağlı bir unutuş sabiti yok | — | doğrulama gerekli | Roadmap'in eski §1.4 tablosu "sabit −18 (adetten bağımsız)" diyordu ama bugünkü `constants.ts`'te böyle bir alan yok — ya kaldırılmış ya `game.ts`'e taşınmış. **Bu görev yalnızca `constants.ts`'i tarıyor; `game.ts` doğrulaması `gameplay-programmer`'ın işi** | Teslim anının unutuş dengesi, §9'un "-40 teslim" hesabı |

### B.7 Unutuş — eşikler (tuning §5.3)

| Sabit | tuning.md değeri | constants.ts karşılığı | Oran/fark | Öneri | Gerekçe | Maliyet |
|---|---|---|---|---|---|---|
| `MEM_GRACE` | 10.0 s | `MEMORY.loseHold` = 6 s, **profile bağlı değil** | 0.6× | doc kazanır | tuning gerekçesi: `PLAYER_SPEED` ile 45 m menzil hesaplanmış ("kıyının makul yakınındaysan kurtulursun"). 6 s'de bu menzil ~27 m'ye düşüyor — "hak edilmiş kayıp" hissi zayıflıyor | Kayıp finali hissi, Faz 2.4 |
| `MEM_THRESHOLD_HAZE`/`DRIFT`/`LOST` (25/50/75) | 3 ayrı eşik | `MEMORY.blindThreshold` = 0.8 — **tek eşik** | — | doc kazanır | Roadmap zaten bu kaydı tutuyor ("kodda tek eşik var"). Bu satır sadece resmi hâle getiriyor | HUD kaybolma kademeleri (pusula/sayaç/vinyet farklı eşiklerde) |

---

## C. `tuning.md`'de olup `constants.ts`'te hiç karşılığı olmayan sabitler

Roadmap'in fazlarına göre gruplandı — "eksik" değil, çoğu zaten planlı bir fazın işi.

### C.1 Bugünkü tek oynanabilir durak (Lotus Adası) — Faz 2/3/4'ün işi, sahip onayı bekliyor değil, uygulama bekliyor

| Sabit | tuning.md değeri | Hangi faz |
|---|---|---|
| `PLAYER_EYE_HEIGHT` | 1.7 m | atanmamış — ses dinleyicisi yüksekliği, küçük iş |
| `CAMERA_ZOOM_MIN` / `CAMERA_ZOOM_MAX` | 7.0 / 13.0 m | atanmamış — daha önce fark edilmemiş, roadmap'e eklenmeli |
| `HARVEST_HOLD` | 1.2 s | Faz 2.2 |
| `HARVEST_CANCEL_MOVE` | 0.3 m | Faz 2.2 |
| `DELIVER_TIME_PER` | 0.4 s/çiçek | atanmamış — Faz 2 civarı, küçük iş |
| `DELIVER_PARTIAL` | true (bool/politika) | muhtemelen `game.ts` mantığında, `constants.ts`'te olmasına gerek yok — doğrulama önerilir |
| `MEM_WITHERED_PENALTY` | 12.0 puan | Faz 2.3 |
| `MEM_START` | 0.0 puan | muhtemelen `game.ts`'te örtük — doğrulama önerilir |
| `SCENT_RADIUS` | 12.0 m | Faz 2.7 |
| `SHIP_AURA_RADIUS` | 8.0 m | Faz 2.8 |
| `SEA_WATER_MIN_DEPTH` | 0.1 m | Faz 2.8 |
| `MEM_LAKE_RECOVER` | 0.0 puan/s (politika — göl iyileştirmesin) | değer 0 olduğu için "yokluk" zaten doğru davranış olabilir, doğrulama önerilir |
| `MEM_THRESHOLD_HYSTERESIS` | 3.0 puan | Faz 2.4 |
| `HILL_VIEW_HEIGHT` | 14.0 m | atanmamış, Faz 2.6 civarı |
| `LOTUS_PHASE_SEED` | 1181 (int) | Faz 2.1 |
| `HUD_FADE_TIME` | 1.5 s | Faz 4.2/4.3 |
| `HUD_VAGUE_COUNTER` 🔬 | true | Faz 4.4, playtest'e ertelendi (§11.3) |
| `LOTOPHAGOS_ONCE` | true (bool) | muhtemelen `game.ts`'te örtük — doğrulama önerilir |
| `FX_VIGNETTE`/`FX_DESATURATE`/`FX_BLUR`/`FX_LOWPASS_HZ_MAX`/`FX_FOG_DISTANCE` | 5 ayrı eğri | Faz 3.1/3.2 — bugün `MEMORY.hazeGamma`/`hazeMax` tek bir genel eğriye sıkıştırıyor |

### C.2 Koşu/hub seviyesi — Faz 2.6d, hub henüz yok

| Sabit | tuning.md değeri |
|---|---|
| `RUN_TARGET_TOTAL` | 12 |
| `MEM_ISLAND_RELIEF_PCT` 🔬 | 0.4 (öneri) |

### C.3 Kiklop Mağarası (2. durak) — Faz 2.6b/2.6e, level-spec kilitli ama koda hiç geçmemiş

| Sabit | tuning.md değeri |
|---|---|
| `CYCLOPS_ISLAND_TARGET` 🔬 | 4 (öneri) |
| `DETECT_MAX` | 100.0 |
| `DETECT_RATE_SHADOW_STILL` | 0.0 |
| `DETECT_RATE_SHADOW_MOVING` | 3.0 |
| `DETECT_RATE_LIT_STILL` | 4.0 |
| `DETECT_RATE_LIT_MOVING` | 12.0 |
| `DETECT_DECAY` | 8.0 |
| `CYCLOPS_PHASE_OUT` | 58.0 s |
| `CYCLOPS_PHASE_RETURN` | 7.0 s |
| `CYCLOPS_PHASE_PRESENT` | 30.0 s |
| `CYCLOPS_CYCLE` [TÜRETİLMİŞ] | 95.0 s |
| `CYCLOPS_RETURN_MULTIPLIER` | 1.5 |
| `CYCLOPS_PRESENT_MULTIPLIER` | 3.0 |
| `CAUGHT_ITEM_LOSS` | true |
| `CAUGHT_MEM_SPIKE` | 30.0 puan |
| `CAUGHT_RESPAWN_POINT` | "cave_mouth" |
| `CYCLOPS_ITEM_TOTAL` 🔬 | 7.0 (öneri) |
| `CYCLOPS_LIGHT_RADIUS` 🔬 | 6.0 (öneri) |

### C.4 Sirenler Geçidi (3. durak) — level-spec bile yazılmamış

| Sabit | tuning.md değeri |
|---|---|
| `SIREN_ISLAND_TARGET` 🔬 | 3 (öneri) |

*(Sirenler'in kendi tuning sabitleri henüz `tuning.md`'ye girmemiş — `island-designer`'ın işi, roadmap Faz 2.6c.)*

---

## D. `constants.ts`'te olup `tuning.md`'de karşılığı olmayan sabitler

### D.1 Gameplay-ilgili — game-designer'ın dikkatine değer

| Sabit | Değer | Not |
|---|---|---|
| `PUZZLE` (tüm obje: `highlightMemoryMax`, `stoneStepRadius`, `stonePickGateIndex`, `cairnRange`, `cairnSolveOrder`, `stoneHintRange`, `cairnHintRange`, `coveGatedRatio`, `deepGatedFromIndex`) | çeşitli | **`tuning.md`'de hiç yok.** Kod yorumunda "`level-lotus-island.md` (sahip onayı: A1, B3, tepe, C2)" diyor — yani bu muhtemelen o dosyada tarif edilmiş bir taş/rüzgâr-kaimi bulmacası, `tuning.md`'ye henüz taşınmamış. `level-lotus-island.md` bu görevin okuma kapsamında değildi; **`island-designer` ya da `game-designer`'ın bir sonraki adımı bu dosyayı `tuning.md`'ye taşımak olmalı** (Kiklop'un geometri sabitleri için zaten planlanan "level-spec netleşince tuning.md'ye taşınır" örüntüsüyle aynı) |
| `CAMERA.keySens`, `CAMERA.touchSens` | 0.035, 0.0044 | Klavye/dokunmatik kamera hassasiyeti — tuning.md yalnızca fare hassasiyetini tanımlıyor (`CAMERA_YAW_SPEED`), input yöntemi başına ayrım yok |
| `MEMORY.resetTo` | 0.45 | Sadece `test` profilin yumuşak-kayıp davranışı için (gemide 0.45 unutuşla yeniden doğuş) — `real` profilin sert kaybı bunu kullanmıyor, `tuning.md`'nin de buna ihtiyacı yok (tasarım "hak edilmiş kayıp" diyor, geri dönüş tanımlamıyor) |
| `HALLUCINATION.minSpawnDistFromPlayer`/`minSpawnDistFromShip`/`wanderRadius`/`wanderSpeed` | 3.5 / 7.0 / 1.1 / 0.35 | `gdd-lotus-hallucination.md`/`tuning.md` §13'ün tarif etmediği uygulama detayları (ani-belirme önleme, boşta gezinme). Muhtemelen kasıtlı olarak tuning.md'nin kapsamı dışı bırakılmış (çok ince ayrıntı) — sorun değil |

### D.2 Görsel/his alanı — CLAUDE.md'nin "docs/art görsel dili sahiplenir" kuralına göre zaten `tuning.md`'nin kapsamı dışı, sadece kayıt için listelendi

`ISLAND` (radius hariç geometri alanları), `LAGOON`, `LOTUS_PHYSICS`, `SHIP.rotY`/`scale`, `PLAYER.waterSpeedMul`/`drag`/`satchelStiffness`/`satchelDamping`/`spawn`/`wadeFloor`/`shoreLimit`/`boundarySoftZone`/`boundaryResistance`/`boundaryHintCooldown`, `CAMERA.fov`/`lookHeight`/`lerp`/`yawStart`/`minClearance`/`shakeDecay`/`shakeHz`/`pickRevealRange`/`pickRevealLift`/`pickRevealPullback`, `FEEL` (tüm obje), `LOTUS_FX` (tüm obje), `FLOW`, `FLEET.playerIndex`/`spacing`, `RENDER`, `TERRAIN_TEX`, `SEA_TEX`, `SHIP_TEX`, `SKY_TEX`, `PALETTE`.

Bu grup **game-designer persona'sının "görsel yönü değiştirme" yasağı kapsamında** — burada sadece eksiksizlik için kayıtlı, herhangi bir öneri taşımıyor.

---

## E. Eşleşenler (doğrulama için, kısa liste)

`real` profilde `tuning.md` ile **birebir** (veya belgelenen 100× ölçek dönüşümüyle birebir) eşleşen değerler — bunlarda hiçbir işlem gerekmiyor:

- `ISLAND.radius` = 70 ✅
- `SHIP.pos` = (0, −60), `SHIP.range` = 4.0 ✅
- `DAY.length/sunStartDeg/sunEndDeg/warnRemaining` = 420/55/2/90 ✅
- `LOTUS.count` = 28, `carryCap` = 4 ✅ (zon dağılımının kendisi hâlâ sorunlu, bkz. B.2)
- `LOTUS.zones[reed].count` = 12 ✅ (`ZONE_REED_COUNT` ile eşleşiyor)
- `MEMORY.islandGain/perCarriedGain/lagoonGain/pickSpike/shipRecover/seaRecover` — hepsi `tuning.md`'nin puan/s değerlerinin /100'ü ✅
- `MEMORY.driftMaxAngleDeg/driftPeriod` = 15/4.0 ✅ (mekanik henüz bağlı değil ama sabitler doğru)
- `LOTOPHAGOS.count/gift/memCost` = 3/2/0.2(=20/100) ✅
- `FX.ghostOffsetPx/breathPeriod/breathAmplitude` = 2.5/5.0/0.04 ✅
- **`HALLUCINATION` grubunun tamamı** (14 alan: threshold, hysteresis, creatureCount, seed, fadeTime, linger, respawnGap, routeBiasRadius, contactRadius, contactMemSpike, driftMultiplier, driftSpikeDuration, contactCooldown, vanishOnContact) ✅ — bu grup tuning.md §13 ile **birebir**, en yeni eklenen sistem olmasına rağmen en temiz eşleşme. Bu, K1-3 sonrası eklenen sabitlerin doğru yazılabildiğinin kanıtı.

---

## Özet — en riskli/en maliyetli 3 karar

1. **Çiçek yerleşiminin ada boyutuna taşınmamış olması** (§A) — `real` profilin `ISLAND.radius=70` ve `MEMORY` oranları doğru geldi ama `LOTUS.zones` hâlâ 26 m'lik test adasının koordinatlarında. Bu tek başına, doğru gelen diğer her şeyi (unutuş dengesi, aşama süreleri, kamera) anlamsızlaştırıyor. Faz 2.6'ya kadar bekletilmesi önerilir — parça parça düzeltmek yeniden iş demek.
2. **Lotus aşama süreleri + determinizm eksikliği** (B.3) — üç sorun üst üste: süreler yanlış (0.3–0.87×), `Math.random()`/`timeJitter` yüzünden rota hiç öğrenilemiyor, ve tuning.md'nin yasakladığı bir 5. "gone" evresi var. Faz 2.1'in tek maddesi ama üç ayrı tasarım ilkesini birden ihlal ediyor.
3. **`LOTUS_MIN_SPACING` < `HARVEST_RANGE`** (B.4) — bu diğerlerinden farklı: bir tasarım tercihi değil, tuning.md'nin kendi iç tutarlılık kuralının (iki çiçek asla aynı anda hedeflenemez) bugün kodda **ihlal edildiği** bir durum. Küçük bir sayı değişikliği (1.75→3.0) ama olası bir hedefleme bug'ını kapatıyor.

**Toplam:** ana fark tablosunda (§B) 23 satır, eksik-kod tarafında (§C) 33 sabit (çoğu zaten planlı fazların kapsamında), kod-fazlası tarafında (§D) 1 dikkat gerektiren grup (`PUZZLE`) + geniş bir görsel/his alanı listesi, eşleşen (§E) 24+ sabit.
