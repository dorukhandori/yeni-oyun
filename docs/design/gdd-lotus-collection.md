# GDD — Lotus Toplama Sistemi

> **Durum:** Tasarlandı — sahip onayı ve playtest bekliyor
> **Tarih:** 2026-08-14
> **Uyguladığı sütun:** **P1** (tek mekanik, iki yön) · **P3** (ada okunabilir)
> **Sayılar:** hepsi `docs/design/tuning.md`'den. Bu dokümanda sayılar **sabit adıyla** anılır (`STAGE_RIPE` gibi); değer değişecekse orada değişir.
> **Bağlı doküman:** `gdd-memory-system.md` (kardeş sistem), `level-lotus-island.md` (yerleşim), `game-concept.md` (çerçeve)

---

## 1. Genel bakış

Lotus Toplama, oyunun tek ilerleme sistemidir. Adaya dikili **`LOTUS_TOTAL`** adet lotus bitkisinin her biri kesintisiz bir olgunluk döngüsünden geçer: **tomurcuk → yarı açık → olgun → solmuş → tomurcuk.** Oyuncu yalnızca **olgun** evredeki çiçeği toplayabilir. Toplanan çiçek çantada taşınır (`CARRY_CAPACITY` sınırı) ve gemide teslim edilir. **`LOTUS_TARGET`** çiçek teslim edildiğinde kazanma koşulu açılır.

Sistem oyuncudan tek bir şey ister: **zamanı ve mesafeyi birlikte okumak.** Hangi çiçek ne zaman olgunlaşacak, oraya yürümek kaç saniye sürer, o sırada elimdekiler beni ne kadar yükleyecek.

Bu sistem olmasa oyun olmaz; ama tek başına da oyun değildir — riski `gdd-memory-system.md` verir. İkisi tek bir fiile (**topla**) bağlıdır ve birbirinin tam tersi yönde çeker.

---

## 2. Oyuncu fantezisi

**"Adayı okuyabiliyorum."**

Hedeflenen duygu keşif değil, **ustalık**: ilk oyunda oyuncu rastgele dolaşır ve elinin altında açan çiçeği kaçırır. Üçüncü oyunda sazlığın kuzey ucundaki üçlünün birlikte olgunlaştığını bilir, oraya erken varır ve üçünü tek nefeste alır.

Toplama anının kendisi de **fiziksel bir taahhüt** olmalı: `HARVEST_HOLD` boyunca oyuncu durur, eğilir, çiçeği koparır. Bu 1,2 saniye oyunun tek "savunmasız" anıdır — koku işlemeye devam eder, güneş alçalmaya devam eder.

Referans his: *Firewatch*'ın haritayla yön bulması ile *Dredge*'in "bir tarama daha yaparsam karanlıkta kalırım" hesabının kesişimi. İkisi de basit fiillerdir; ikisini de zaman baskısı derinleştirir.

---

## 3. Ayrıntılı tasarım

### 3.1 Çekirdek kurallar

1. Adada **`LOTUS_TOTAL`** adet lotus bitkisi vardır. Sayı sabittir; bitki eklenmez, silinmez.
2. Her bitki bağımsız bir **olgunluk saati** taşır. Saat oyun başında `LOTUS_PHASE_SEED` ile dağıtılmış bir faz kaymasıyla başlar ve **duraksız** ilerler.
3. Döngü dört evrededir ve her zaman aynı sırayla döner: **tomurcuk → yarı açık → olgun → solmuş → tomurcuk.** Geri dönüş, atlama, dallanma yoktur.
4. Toplama yalnızca **olgun** evrede mümkündür. Diğer evrelerde E tuşu bu bitkiye etki etmez.
5. Toplamak için oyuncu bitkiye `HARVEST_RANGE` kadar yaklaşır ve **E**'yi `HARVEST_HOLD` boyunca basılı tutar. Tuş bırakılırsa veya oyuncu `HARVEST_CANCEL_MOVE` eşiğinden fazla hareket ederse ilerleme **sıfırlanır** (yarım kalmaz).
6. Toplama tamamlanınca: çantaya +1 çiçek, bitki **tomurcuk** evresine döner (`LotusStage.BUD`), unutuşa `MEM_ON_HARVEST` eklenir.
7. Çanta doluyken (`CARRY_CAPACITY`) toplama başlatılamaz. Oyuncu bunu ekranda görür; sessiz başarısızlık yoktur.
8. **Solmuş** bir çiçeğe E ile dokunulursa çiçek toplanmaz, unutuşa `MEM_WITHERED_PENALTY` eklenir ve bitki tomurcuğa döner. Bu tek seferliktir; aynı bitki tekrar cezalandırmaz çünkü artık tomurcuktur.
9. Teslim: oyuncu gemiye `DELIVER_RANGE` kadar yaklaşıp **E**'ye basar. Çantadaki **tüm** çiçekler `DELIVER_TIME_PER` aralıklarla teslim edilir; her biri için teslim sayacı +1 ve unutuşa `MEM_PER_DELIVERED` uygulanır.
10. Kısmi teslim serbesttir (`DELIVER_PARTIAL`). Tek çiçekle dönmek geçerli, güvenli ve yavaş bir stratejidir.
11. Teslim sayacı **`LOTUS_TARGET`**'a ulaştığında geminin dümeni etkileşilebilir hale gelir. Sayaç bundan sonra artmaz; fazla çiçek toplamanın hiçbir faydası yoktur.
12. **Lotophagoi takası** toplamanın alternatif yoludur: bkz. §3.4.

### 3.2 Evreler ve geçişler

| Evre | Süre | Görünüş | Toplanır mı | Koku yayar mı |
|---|---|---|---|---|
| **Tomurcuk** | `STAGE_BUD` | Kapalı, sıkı, soluk yeşil-krem mızrak. Silüet dar ve dik. | Hayır | **Hayır** |
| **Yarı açık** | `STAGE_HALF_OPEN` | Taç yapraklar aralanır, iç pembe görünür. Silüet genişler. | Hayır | Evet |
| **Olgun** | `STAGE_RIPE` | Tam açık, beyaz-pembe, adanın en doygun ve en açık rengi. Silüet en geniş; hafif ışık taşıyor gibi. | **Evet** | Evet |
| **Solmuş** | `STAGE_WITHERED` | Taç yapraklar sarkar, doygunluk düşer, kahverengiye kayar. Silüet çöker. | Hayır (ceza) | Evet |

| Geçiş | Tetik | Sonuç |
|---|---|---|
| Tomurcuk → Yarı açık | `STAGE_BUD` doldu | Koku yayımı **başlar** |
| Yarı açık → Olgun | `STAGE_HALF_OPEN` doldu | Toplanabilir olur; kısa bir açılma animasyonu + tek yumuşak ses |
| Olgun → Solmuş | `STAGE_RIPE` doldu, toplanmadı | Toplanamaz olur; ceza hedefi haline gelir |
| Solmuş → Tomurcuk | `STAGE_WITHERED` doldu | Koku yayımı **durur**; saat yeniden başlar |
| Olgun → Tomurcuk | Oyuncu topladı | Çanta +1, `MEM_ON_HARVEST` |
| Solmuş → Tomurcuk | Oyuncu dokundu | Çanta değişmez, `MEM_WITHERED_PENALTY` |

**Kritik tasarım kararı:** `STAGE_RIPE` (30 s) ada geçiş süresine (~31 s, `ISLAND_RADIUS` ve `PLAYER_SPEED`'ten) kasten eşitlendi. Anlamı: oyuncu gördüğü **tek bir** olgun çiçeğe adanın her yerinden yetişebilir, ama **iki uzak çiçeğe birden asla.** Oyunun tek gerçek kararı bu eşitlikten doğar.

**Neden koku tomurcukta yok:** oyuncunun "güvenli bekleme noktası" diye bir yeri olmalı. Tomurcuk tarlasının ortasında beklemek ucuzdur; açmış tarlanın ortasında beklemek pahalıdır. Bu, yerleşimi (bkz. `level-lotus-island.md`) taktik hale getirir.

### 3.3 Diğer sistemlerle etkileşim

| Sistem | Yön | Ne akar |
|---|---|---|
| **Unutuş** (`gdd-memory-system.md`) | Bu sistem → Unutuş | Hasat olayı (`MEM_ON_HARVEST`), solmuş cezası (`MEM_WITHERED_PENALTY`), taşınan çiçek sayısı (`MEM_PER_CARRIED`), teslim olayı (`MEM_PER_DELIVERED`), her bitkinin koku yayıp yaymadığı (evreden türer) |
| **Unutuş** | Unutuş → Bu sistem | Hiçbir şey. **Unutuş toplamayı asla engellemez.** Sadece oyuncunun *nerede olduğunu bilmesini* engeller. Bu ayrım kutsaldır: sistem oyuncunun elini bağlamaz, gözünü bağlar. |
| **Gün / güneş** | Gün → Bu sistem | Yalnızca oturumu bitirir. Olgunluk hızları gün boyunca **değişmez** (sabit hız = öğrenilebilirlik = P3). |
| **Seviye** (`level-lotus-island.md`) | Seviye → Bu sistem | Bitki koordinatları ve bölge dağılımı (`ZONE_*_COUNT`) |
| **Arayüz** | Bu sistem → HUD | çanta sayacı, teslim sayacı |

### 3.4 Lotophagoi takası

Adada **`LOTOPHAGOS_COUNT`** sessiz figür durur. Oyuncu `LOTOPHAGOS_RANGE` içine girdiğinde figür elini uzatır ve **açık bir lotus tutar**. Tek etkileşim:

- **E** → `LOTOPHAGOS_GIFT` kadar olgun çiçek doğrudan çantaya girer (kapasite aşılmaz; yer yoksa alınabildiği kadarı alınır), unutuşa `LOTOPHAGOS_MEM_COST` eklenir.
- **Uzaklaş** → hiçbir şey olmaz, bedel yoktur. Figür elini indirir ama tekrar yaklaşırsan yine uzatır.
- Kabul edildikten sonra o figür bir daha ikram etmez (`LOTOPHAGOS_ONCE`).

**Diyalog yok, seçenek menüsü yok, konuşma yok.** Homeros'ta da Lotophagoi düşman değildir ve pazarlık etmez; sadece verirler. Tek tuş bunu doğru anlatır.

**Denge notu:** üç figürün tamamı kabul edilirse 6 çiçek (hedefin yarısı) +60 unutuş karşılığında gelir. Bu, meşru ama neredeyse ölümcül bir hız stratejisidir ve **kasıtlıdır** — oyuncunun kendi eliyle kurduğu bir tuzak, oyunun temasıyla birebir aynı şey.

---

## 4. Formüller

### 4.1 Olgunluk evresi

Bir bitkinin `t` anındaki evresi:

`faz(i, t) = (t + offset_i) mod LOTUS_CYCLE`

**Değişkenler:**

| Değişken | Tip | Aralık | Açıklama |
|---|---|---|---|
| `t` | float | 0 … `DAY_LENGTH` | Oyun başından beri geçen süre (s) |
| `i` | int | 0 … `LOTUS_TOTAL`−1 | Bitki indeksi |
| `offset_i` | float | 0 … `LOTUS_CYCLE` | `LOTUS_PHASE_SEED` ile üretilen sabit faz kayması |
| `faz` | float | 0 … `LOTUS_CYCLE` | Döngü içindeki konum |

Evre eşlemesi:

| `faz` aralığı | Evre |
|---|---|
| `[0, B)` | Tomurcuk |
| `[B, B+H)` | Yarı açık |
| `[B+H, B+H+R)` | **Olgun** |
| `[B+H+R, LOTUS_CYCLE)` | Solmuş |

`B = STAGE_BUD`, `H = STAGE_HALF_OPEN`, `R = STAGE_RIPE`.

**Örnek:** `offset_i = 30`, `t = 100` → `faz = 130 mod 120 = 10` → `10 < 45` → **tomurcuk**.
`t = 180` → `faz = 210 mod 120 = 90` → `70 ≤ 90 < 100` → **olgun** (10 saniyesi kaldı).

**Hasat sonrası:** bitki toplandığında `offset_i` yeniden hesaplanır: `offset_i = −t mod LOTUS_CYCLE`, yani faz 0'a (tomurcuk başına) alınır. Bu, tek bir formülle hem doğal döngüyü hem hasat sıfırlamasını çözer — ayrı bir "timer" nesnesi gerekmez.

### 4.2 Anlık olgun çiçek sayısı (denge kontrolü)

`beklenen_olgun = LOTUS_TOTAL × (STAGE_RIPE / LOTUS_CYCLE)`

= 28 × (30 / 120) = **7,0 çiçek**

**Çıktı aralığı:** faz dağılımı düzgünse pratikte 4–10 arası salınır. 4'ün altına düzenli olarak inerse `LOTUS_TOTAL` artırılmalı; 12'nin üstüne çıkarsa oyun kolaylaşır ve rota kurma anlamını yitirir.

### 4.3 Toplama ilerlemesi

`ilerleme += dt / HARVEST_HOLD` (E basılıyken ve hedef geçerliyken)
`ilerleme = 0` (tuş bırakılınca veya oyuncu `HARVEST_CANCEL_MOVE` mesafesinden fazla hareket edince)
`ilerleme ≥ 1` → hasat

**Çıktı aralığı:** 0 … 1. Doğrudan halka göstergesinin dolgu oranı olarak kullanılır.

### 4.4 Hedef seçimi

Birden çok bitki `HARVEST_RANGE` içindeyse:

`hedef = min( mesafe(oyuncu, bitki) )` — yalnızca **olgun** ve **solmuş** bitkiler aday.

`LOTUS_MIN_SPACING` (3,0 m) > `HARVEST_RANGE` (2,2 m) olduğu için pratikte aynı anda birden fazla aday **oluşamaz**; bu kural yalnızca güvenlik ağıdır.

---

## 5. Sınır durumlar

- **Çanta doluyken (4/4) olgun çiçeğe E basılırsa:** toplama başlamaz. HUD'daki çanta göstergesi bir kez titrer ve kısa bir "dolu" sesi çalar. Unutuş **etkilenmez**.
- **Toplama sırasında çiçek olgunluktan çıkarsa** (kalan süre `HARVEST_HOLD`'dan azken başlanmışsa): toplama **tamamlanır ve başarılı sayılır.** Neden: oyuncu zamanında başlamıştır; onu 0,2 saniyeyle cezalandırmak öğrenilebilirliği (P3) bozar. Görsel olarak çiçek solmaya başlasa bile hasat geçerlidir.
- **Solmuş çiçeğe kazayla dokunma:** ceza tek seferliktir ve bitki tomurcuğa döner, yani aynı hata aynı bitkide arka arkaya tekrarlanamaz. Ceza uygulandığında ekranda kısa bir kahverengi flaş + bir ses; oyuncu ne olduğunu anlamalı.
- **Toplama sırasında unutuş eşik 3'ü geçerse:** toplama kesilmez. Unutuş toplamaya asla müdahale etmez (§3.3).
- **Teslim sırasında güneş batarsa:** teslim animasyonu **tamamlanır**, sonra bitiş değerlendirilir. Yani son saniyede varan oyuncu 12'yi tamamlayabilir. Bu bilinçli bir cömertliktir.
- **Lotophagos ikramı çanta 3/4 iken kabul edilirse:** yalnızca 1 çiçek alınır, ama `LOTOPHAGOS_MEM_COST` **tam** uygulanır ve figür harcanmış sayılır. Sertçe: aç gözlülük cezalandırılır. HUD kabul öncesi çanta doluluğunu gösterdiği için bu bilgi oyuncuda vardır.
- **Çanta doluyken Lotophagos ikramı:** kabul edilemez. Figür elini uzatmaz.
- **`LOTUS_TARGET` aşılırsa:** aşılamaz — 12'ye ulaşınca teslim sayacı kilitlenir. Çantada kalan çiçekler teslim edilebilir ama sayaç artmaz ve `MEM_PER_DELIVERED` **uygulanmaya devam eder** (yani son anda kafa açmak için kullanılabilir; küçük ve zararsız bir ustalık payı).
- **Oyuncu hiç çiçek toplamadan gemide E'ye basarsa:** hiçbir şey olmaz. Sessiz.
- **İki bitki `LOTUS_MIN_SPACING`'ten yakın yerleştirilirse:** seviye yükleme sırasında konsola uyarı, yakın olan ikinci bitki 3,0 m'ye itilir.

---

## 6. Bağımlılıklar

| Bağımlılık | Yön | Sertlik | Arayüz |
|---|---|---|---|
| Unutuş sistemi | çift yönlü | **Yumuşak** (bu sistem tek başına çalışır, ama oyun olmaz) | Bu sistem olay yayınlar: `onHarvest`, `onWitheredTouch`, `onDeliver`, `carriedCount`, `scentSourcesNearby` |
| Seviye / ada | tek yönlü (seviye → bu) | **Sert** | Bitki koordinat listesi + bölge etiketi |
| Oyuncu hareketi / girdi | tek yönlü | **Sert** | Oyuncu konumu, E tuşu basılı süresi, hareket delta'sı |
| Gün / güneş sayacı | tek yönlü | **Yumuşak** | Yalnızca oturum sonu tetikleyicisi |
| HUD | tek yönlü (bu → HUD) | **Yumuşak** | `carried`, `capacity`, `delivered`, `target`, `harvestProgress` |

---

## 7. Ayar düğmeleri

Tam liste ve gerekçeleri `tuning.md` §3, §4, §6, §7'de. Tasarımcının playtest'te en sık dokunacağı üç düğme ve kırılma noktaları:

| Düğme | Çok yüksekse | Çok düşükse |
|---|---|---|
| `STAGE_RIPE` | Her çiçeğe yetişilir, rota kurma anlamsızlaşır, oyun bir yürüyüş simülatörüne döner | Oyuncu sürekli kaçırır, adaletsizlik hissi, "bug mı?" |
| `CARRY_CAPACITY` | Tur sayısı düşer, gerilim düşer, gemi anlamını yitirir | Tur sayısı patlar, tekrar hissi, gün yetmez |
| `LOTUS_TOTAL` | Ada kalabalıklaşır, olgun çiçek her yerde, karar kalmaz | Kıtlık; oyuncu beklemek zorunda kalır ve beklemek **koku bedeliyle** birleşince çifte ceza olur |

**Birbirini etkisizleştiren çift:** `LOTUS_TOTAL` ↑ ve `STAGE_RIPE` ↑ aynı yöne çalışır (ikisi de olgun çiçek bolluğu üretir). İkisi aynı anda artırılmamalı; biri seçilmeli.

---

## 8. Kabul kriterleri

- **GIVEN** bir bitki olgun evrede, **WHEN** oyuncu `HARVEST_RANGE` içinde E'yi `HARVEST_HOLD` boyunca basılı tutar, **THEN** çanta sayacı 1 artar, bitki tomurcuk evresine döner ve unutuş `MEM_ON_HARVEST` kadar artar.
- **GIVEN** bir bitki tomurcuk veya yarı açık evrede, **WHEN** oyuncu E'yi basılı tutar, **THEN** hiçbir toplama ilerlemesi başlamaz ve hiçbir değer değişmez.
- **GIVEN** bir bitki solmuş evrede, **WHEN** oyuncu E'ye basar, **THEN** çanta değişmez, unutuş `MEM_WITHERED_PENALTY` kadar artar ve bitki tomurcuğa döner.
- **GIVEN** çanta `CARRY_CAPACITY` doluluğunda, **WHEN** oyuncu olgun bir çiçekte E'yi basılı tutar, **THEN** toplama başlamaz ve HUD "dolu" geri bildirimi verir.
- **GIVEN** toplama ilerlemesi %80'de, **WHEN** oyuncu `HARVEST_CANCEL_MOVE` eşiğinden fazla hareket eder, **THEN** ilerleme 0'a döner ve hiçbir çiçek alınmaz.
- **GIVEN** çantada 3 çiçek var, **WHEN** oyuncu gemide `DELIVER_RANGE` içinde E'ye basar, **THEN** teslim sayacı 3 artar, çanta 0 olur ve unutuş 3 × `MEM_PER_DELIVERED` kadar azalır.
- **GIVEN** `t = 0` ve sabit `LOTUS_PHASE_SEED`, **WHEN** oyun iki kez baştan başlatılır, **THEN** her bitkinin her `t` anındaki evresi **birebir aynıdır** (deterministiklik testi).
- **GIVEN** oyun 300 saniyedir çalışıyor, **WHEN** anlık olgun bitki sayısı ölçülür, **THEN** değer 4 ile 10 arasındadır (100 örnekli ortalama 7,0 ± 1,5).
- **GIVEN** teslim sayacı `LOTUS_TARGET`'a eşit, **WHEN** oyuncu bir çiçek daha teslim eder, **THEN** sayaç artmaz ama unutuş yine `MEM_PER_DELIVERED` kadar azalır.
- **GIVEN** bir Lotophagos ikramı kabul edilmiş, **WHEN** oyuncu aynı figüre tekrar yaklaşır, **THEN** ikram tetiklenmez ve E hiçbir şey yapmaz.

---

## 9. Görsel / işitsel gereksinimler

> Ayrıntı art bible'ın işi. Buradaki liste **oynanışın çalışması için zorunlu** olan minimum settir.

| Olay | Görsel | Ses |
|---|---|---|
| Yarı açık → Olgun geçişi | 0,6 s'lik açılma; taç yapraklar dışa döner, silüet genişler, renk en doygun beyaz-pembeye çıkar | Tek, yumuşak, alçak bir "açılma" tonu — 15 m'ye kadar duyulur, oyuncuyu döndürmeli |
| Olgun → Solmuş geçişi | 1,0 s'lik çökme; doygunluk düşer, taç yaprak sarkar | Ses yok (kayıp sessiz olmalı, oyuncu bunu **görerek** öğrensin) |
| Toplama süresi | Çiçeğin etrafında dolan ince halka; oyuncu eğilme duruşu | Yükselen yumuşak vınlama; kesilirse anında düşer |
| Hasat tamamlandı | Çiçek kalkar, kısa beyaz parçacık, sap tomurcuğa iner | Net "kopma" + kısa nefes |
| Solmuş cezası | Kısa kahverengi ekran flaşı (%20, 0,25 s) + toz parçacığı | Boğuk, kuru, hoşnutsuz ses |
| Teslim (çiçek başına) | Çiçek ambardaki suya düşer, turkuaz sıçrama | Suya düşme + kısa nefes alma. **Fanfar yok.** |
| Lotophagos ikramı | Figür elini uzatır, avuçtaki çiçek hafifçe parlar | Tek nefes/iç çekiş; konuşma yok |

**Renk körlüğü:** olgunluk yalnız renkle anlatılamaz. Her evrenin **silüeti farklı** olmalı (dar dik → genişleyen → tam açık → çökmüş). Ekran gri tonlamaya alındığında bile dört evre ayırt edilebilmelidir.

---

## 10. Arayüz gereksinimleri

| Öğe | Konum | Davranış |
|---|---|---|
| Çanta sayacı | Sol üst | `0/4`. Dolduğunda kenar rengi değişir. Reddedilen toplamada titrer. |
| Teslim sayacı | Sağ üst | `0/12`. Her teslimde tek tek sayar (`DELIVER_TIME_PER` ritminde). 12'de sabitlenir ve bir kez parlar. |
| Toplama halkası | Dünya uzayında, çiçeğin üstünde | Yalnızca toplama sırasında görünür. |
| Etkileşim ipucu | Dünya uzayında, hedefin üstünde | Olgun çiçekte "E — topla", gemide "E — teslim et", Lotophagos'ta "E — al", dümende "E — ayrıl". Unutuş eşik 3'te bu ipuçları da kaybolur. |

**Ekonomi:** yok. Para, dükkân, alım-satım, yükseltme yoktur. Tek kaynak lotustur ve tek kullanımı teslimdir.

---

## Açık sorular

1. **Olgunlaşma sesi 15 m'den duyulmalı mı?** Duyulursa oyuncu ekrana bakmadan da yönlenir (güzel), ama sazlıkta sürekli ses olur (yorucu). Aynı anda çalabilecek ses sayısı sınırlanmalı mı?
2. **Yarı açık evrede oyuncuya kalan süre gösterilsin mi?** Şu an gösterilmiyor; oyuncu tahmin ediyor. Göstermek adaleti artırır, ustalığı azaltır. **Sahip kararı.**
3. **Solmuş cezası çok mu sert?** +12 puan, bir hasadın üç katı. Kazara dokunma sık yaşanıyorsa E tuşu solmuş çiçeği hiç hedeflemesin (ceza tamamen kalkar) seçeneği var — ama o zaman "dikkat et" mesajı da kalkar.
4. **`LOTUS_TARGET` 12'ye ulaşınca oyun kendiliğinden bitmeli mi, oyuncu gemiye gitmeli mi?** Şu an gemiye gitmesi gerekiyor (son bir gerilim turu). Alternatif: 12. teslim zaten gemide olduğu için anında bitiş. Şu anki tasarım **12. teslim gemide yapıldığından zaten oradasın** — yani dümene basmak bir onay adımı. Gereksiz bir tuş mu?
5. **Hasat sonrası bitki tomurcuğa mı dönmeli, yoksa tamamen mi kaybolmalı?** Tomurcuğa dönmek adayı canlı tutar ve kaynağı tüketilemez kılar. Kaybolmak "adayı boşalttım" hissi verir. Tomurcuk seçildi; sahip onayı gerekiyor.
