# GDD — Körleşme (Kapı) Sistemi — Kiklop Mağarası

> **Durum:** onaylandı (kavramsal, çekirdek mekanik sahip'in birebir kararı) — sayıların çoğu türetildi, bir kısmı 🔬 playtest'e ertelendi.
> **Tarih:** 2026-08-24
> **Yazan:** `game-designer`/`@helix`. Girdi: sahip'in D1–D9 + "körleşme" 7 maddelik tarifi (24 Ağu 2026) · `island-designer`/`@cove`'un `level-cyclops-cave.md` §0.4/§1–§4.8/§9 (kroki, saklaş noktaları, ışık formülü, devin rota hattı, erişim süreleri) · `docs/production/cyclops-cave-production-plan.md` §0.0/§1.4/§2.2 (kapanan kararlar, `CYCLOPS_CYCLE` uyarısı, `DETECT_DECAY` belirsizliği).
> **Bu doküman `gdd-detection-cyclops.md` (algılanma/`DETECT_*`) ile aynı zaman çizgisinde, onun *üstüne binen* bir katmanı tarif eder — onun yerini almaz.** Algılanma sistemi hâlâ geçerli (rate matrisi, evre çarpanları); bu doküman kapı durumunu, devin gezinmesini, saklaş disiplinini ve ezilmeyi ekliyor, ayrıca ikisinin **tek bir sözde-kod bloğunda** nasıl bileştiğini tanımlıyor (§4.0).
> **Kapsam:** yalnızca Kiklop Mağarası (K40'ın bağımsız 2. durağı). `MEMORY`, `MEM_*`, `FX_VIGNETTE`, haze, `DRIFT_*`, `MEM_GRACE`, koşu-bazlı kayıp finali — **hiçbiri bu adada yok** (D3, sahip, 24 Ağu 2026). Bu, `gdd-detection-cyclops.md`'nin 14 Ağustos'ta kurduğu "algılanma tek bir unutuş kaynağına besleniyor" modelini kökten değiştirir — bkz. §1.
> **Bağlı doküman:** `level-cyclops-cave.md` (geometri/yerleşim otoritesi, bu dosya ona girdi vermez, ondan girdi alır) · `gdd-detection-cyclops.md` (algılanma — bu turda D3'e göre uzlaştırıldı, ayrı düzenlendi) · `tuning.md` §12 (sabitler — bu dosyadaki her sayı oradan isimle okunur) · `docs/production/cyclops-cave-production-plan.md` (üretim planı, otorite değil)

---

## 0. Sahip'in kapattığı çerçeve — özet, tartışılmıyor

1. Kapı açık = OUT + RETURN evreleri (toplama mümkün). Kapı kapanması = PRESENT'in başlangıcı (toplama tamamen kapalı).
2. Dev PRESENT'te rastgele bir derinliğe kadar dolaşıp orada uyur — her döngüde farklı.
3. Her odada 1 saklaş noktası var; PRESENT boyunca oyuncunun tek işi saklanmak.
4. Saklaş noktasında bile küçük risk var — tam pasif güvenlik yok, hareketsizlik bir disiplin.
5. "Ezilme" = "yakalanma" ile birebir aynı olay (`onCaught`), D2'nin cezası geçerli, bellek sıçraması yok.
6. Eski oda-bazlı `CYCLOPS_PRESENT_MULTIPLIER` (×3.0) hâlâ geçerli — iki katmanlı risk (fiziksel çarpma + oranlı görülme).
7. Yapısal: duraklar bağımsız (K40), `CYCLOPS_ISLAND_TARGET` (4) bu durağın kendi hedefi.

Bunların hiçbiri bu dokümanın kararı değil — sahip'in birebir sözü, aşağıda yalnızca sayıya çevriliyor.

---

## 1. Genel bakış

Körleşme, Kiklop Mağarası'nın **ikinci** yerel katmanı — algılanma (`DETECT_*`, ışık+hareket) zaten oradaydı, körleşme ona kapı durumunu (gündüz/gece) ve fiziksel çarpışmayı (ezilme) ekliyor. İki katman **aynı zaman çizgisinde** çalışır: kapı açıkken (OUT/RETURN) toplama mümkündür ve algılanma normal işler; kapı kapandığında (PRESENT) toplama tamamen durur, devin kendisi sahneye fiziksel bir tehlike olarak girer, algılanma da (küçültülmüş ışık + PRESENT çarpanıyla) çalışmaya devam eder.

**Kritik fark, 14 Ağustos'un modelinden:** o zaman PRESENT sırasında bile depo/mağara ağzında **güvenli toplama** mümkündü (çarpan yoktu). D3 + körleşme bunu tamamen kapattı — PRESENT artık **hiçbir yerde** toplama izni vermiyor. Bu, döngü süresi hesabını (§2) ve dev'in fiziksel varlığını (§3) zorunlu kılan asıl değişiklik.

**P1 kontrolü (üçüncü kez soruldu — 25 Ağu 2026, `CYCLOPS_CRUSH_CAP` eklendikten sonra):** bu durak ikinci bir "can barı" mı yaratıyor? **Hayır — ama artık "sınırda ve bilinçli" bir hayır.**

- D3, `CAUGHT_MEM_SPIKE` üzerinden unutuşa giden bağı tamamen kesti; `DETECT` ve ezilme **hiçbir global/kalıcı değere** yazmıyor, ikisi de aynı `onCaught()`'a akıyor.
- **Ama artık bir sayaç var:** `crushCount`, `CYCLOPS_CRUSH_CAP`'e (3) ulaşınca **denemeyi** bitiriyor. Bu, tanım gereği ayrık bir "hak" sistemidir.
- **Neden yine de can barı değil:** (a) **ekranda hiçbir biçimde gösterilmiyor** — sayı, bar, ikon, kalp yok (P2); oyuncu kalan hakkını *saymıyor*, ezilme başına ağırlaşan korku efektiyle *hissediyor*. (b) Kaybı **kalıcı bir şey değil** — hub kilidi açık kalır, durak sınırsız kez yeniden denenebilir; kaybedilen tek şey o denemedir. (c) Sağlık gibi **doldurulmuyor/yenilenmiyor** — iyileştirme, can toplama, rejenerasyon yok; yalnızca yeni deneme sıfırlar.
- **Emsal:** bu, unutuşun `MEM_THRESHOLD_*` eşiklerinin aynı felsefesi — ayrık bir yapı var ama oyuncu onu bir ölçek olarak değil, **şiddetlenen bir durum** olarak okuyor. Lotus'ta bu "sis → kayış → unutuş"; burada "1. ezilme → 2. ezilme (*"bir daha kaldıramazsın"*) → deneme biter".

Bkz. bitiş/kayıp sözleşmesi bölümü.

**P2 kontrolü:** hiçbir yeni sayı/bar eklenmiyor. Kapı durumu ışığın kendisiyle, saklanma güvenliği mevcut kehribar kenar parıltısıyla okunuyor — bkz. §7.

**P3 kontrolü — gerçek gerilim, çözüldü (§2.2):** "sürpriz mekanik yok, sürpriz zamanlama/konum var" ilkesi ile sahip'in "her döngüde öngörülemez derinlik" talebi arasındaki gerilim, **kuralın sabit kalıp sonucun her girişte yeniden atılmasıyla** çözüldü — ayrıntı §2.2.

---

## 2. Döngü süresi — `CYCLOPS_CYCLE` ve alt evreler

### 2.1 Neden yeniden hesaplanması zorunlu

Eski (14 Ağu) `CYCLOPS_CYCLE` = 95 s (OUT 58 / RETURN 7 / PRESENT 30), PRESENT'te depo/mağara ağzında toplamaya izin veren bir modele göre kalibre edilmişti. Körleşme bunu kapattığı için PRESENT artık **saf ölü zaman** — üretim planının kendi ölçümü de (§1.4) bunu doğruluyor: mastery turunda (~3–4 dk) yalnızca ~2–2,5 döngü görülüyor, desen öğrenilemiyor. Aşağıdaki üç soruyu tek tek çözüyorum.

### 2.2 OUT — tek pencereye sığmalı mı, sığmamalı mı?

**Karar: sığmalı — kasıtlı olarak yeterli.** Gerekçe: `level-cyclops-cave.md` §7 "ustalık oyunu" zaten tek turda 4/4'ü hedefliyor ve üretim planı §1.4'ün kendi hesabı bunu doğruluyor (gemi→iç nöy→gemi saf yürüyüş 32 s + hasat ~2,4 s ≈ 35 s, eski OUT 58 s'nin altında, bolca pay). Bu hesap **geometriye bağlı**, kapı mekaniğinden etkilenmiyor — `OUT` değerini değiştirmiyorum: **`CYCLOPS_PHASE_OUT = 58.0 s` (değişmedi).**

Neden "kasıtlı yetmemeli" değil: eğer OUT tek turu kapasın diye kısıtlanırsa, en temiz/dikkatli oyun tarzı (tek seferde 4/4) cezalandırılır — bu, "acele etme, dikkatli ol" dersini tersine çevirir. Beceri hâlâ ödüllenmeli; çoklu-döngü ihtiyacı sadece **temkinsiz/yavaş** oyuncunun doğal sonucu olmalı (birden fazla kısa sefer yapan, ya da yakalanıp geri dönen oyuncu), dayatılan bir kısıt değil.

### 2.3 RETURN — telegraf süresi

Eski değer 7.0 s idi. `@cove`'un yeni erişim tablosu (§4.8, `level-cyclops-cave.md`) somut bir alt sınır verdi: bir odanın en uzak öğesinden saklaş noktasına saf yürüyüş **2.3–2.7 s**. Eski 7.0 s bunun ~4.3–4.7 s üstünde bir tampon bırakıyordu.

**Karar: `CYCLOPS_PHASE_RETURN = 8.0 s`** (7.0 → 8.0, +1 s). Gerekçe — üç bileşenli:
- **Saf hareket:** en kötü durum 2.7 s (`@cove`'un iç nöy verisi).
- **Algı + karar:** telegrafın kendisini fark edip (ses/ışık titremesi) yön değiştirme kararını vermek için ~2.0–2.3 s — bu, saf hareket süresinden **ayrı** bir bileşen, `MEM_GRACE`'in "ani, adaletsiz ceza yok" felsefesiyle aynı mantık.
- **Güvenlik payı:** ~3.0 s. Eskisinden **daha büyük** bir pay istiyorum çünkü bahis yükseldi: eski modelde RETURN'ü kaçırmanın bedeli "PRESENT'te riskli bir odada kal"dı (hâlâ toplama mümkündü, sadece pahalıydı); yeni modelde bedel "toplama tamamen kapalı + fiziksel ezilme riski" — kaçırmanın maliyeti nitel olarak arttı, tepki payının da artması adil.

Toplam: 2.7 + 2.3 + 3.0 = 8.0 s. Bu, boğaz geçişini (0.9 s, `PLAYER_SPEED` 4.5 m/s ile 4 m) de bol bol kapsıyor (8.0 − 0.9 = 7.1 s tampon) — RETURN'ün başında boğazda yakalanan bir oyuncu bile karşı odaya rahatça geçebiliyor.

### 2.4 PRESENT — üst sınır ve gerekçesi

**Karar: `CYCLOPS_PHASE_PRESENT = 30.0 s` (değişmedi, ama gerekçesi tamamen yeniden kuruldu).**

PRESENT artık iki bileşenden oluşuyor: **(a) devin D=0'dan seçtiği hedefe yürüme süresi** + **(b) yerleştikten sonraki minimum "uyuma" payı** (oyuncunun onu gerçekten "yerleşmiş" hissetmesi için, döngü devin ayak sesinin ortasında kesilmesin diye).

Yeni sabit: **`CYCLOPS_GIANT_SPEED = 3.0 m/s`** [TÜRETİLMİŞ] — `PLAYER_SPEED`'in (4.5) ~%67'si, "ağır ama amaçlı" bir yürüyüş, kovalamaca hızı değil (dev asla oyuncuyu kovalamıyor, bu bir hız yarışı mekaniği değil).

En derin aday (İç nöy, `x=0,D=60`) rota hattı boyunca (`x=0`, `@cove` §4.7) D=0'dan yaklaşık 60 m — `60 / 3.0 = 20.0 s` yürüme. Kalan `30.0 − 20.0 = 10.0 s`, yerleşme/uyuma payı. **Bu, eski 30 s değerini hiç değiştirmeden yeniden anlamlandırıyor** — sayı aynı kalıyor çünkü tesadüfen (ya da tasarımın orijinal sezgisi doğru çıktığı için) en derin rotayı tam karşılıyor, gereksiz churn yok.

**Üst sınırın nedeni (neden daha uzun değil):** PRESENT artık toplama açısından **saf ölü zaman**. 30 s zaten "bekle" hissinin başlayabileceği bir eşik — daha uzatmak (örn. 45–60 s, sığ hedefler için bolca yer bırakmak adına) oyuncuyu anlamsız beklemeye zorlar, tempo/gerilim düşer (bkz. üretim planının kendi endişesi, §1.4). 30 s, en zorlayıcı durumu (en derin gezinme) tam doldurup taşırmayan **en küçük** sayı — daha kısası devin yürüyüşünü yarıda keser (ki bu, "rastgele bir derinliğe kadar dolaşır" sahip sözünü ihlal eder, o yürüyüşün fiziksel olarak tamamlanması gerekiyor).

**Not — PRESENT süresi sabit, hedef derinliğe göre DEĞİŞMİYOR.** Dev sığ bir noktada dururken kalan süreyi (örn. 30 − 2.7 = 27.3 s) "beklemede/oturuyor" geçiriyor; bu, döngünün makro-ritmini (P3'ün "öğrenilebilir çerçeve" ihtiyacı — sabit OUT/RETURN/PRESENT üçlüsü her zaman aynı, yalnızca *neresi* tehlikeli olduğu değişiyor) sabit tutmak için bilinçli bir tercih. Alternatif (PRESENT'i hedefe göre kısalt/uzat — sığ gezinme = kısa gece) daha az ölü zaman verir ama döngü uzunluğunu döngüden döngüye değiştirir, "tek bir `CYCLOPS_CYCLE`" kavramını bozar ve implementasyonu karmaşıklaştırır (playtest'e 🔬 bırakılan bir alternatif olarak §8'de not edildi, ama **seçilen** tasarım sabit süre).

### 2.5 `CYCLOPS_CYCLE` — toplam

`CYCLOPS_CYCLE = CYCLOPS_PHASE_OUT + CYCLOPS_PHASE_RETURN + CYCLOPS_PHASE_PRESENT = 58.0 + 8.0 + 30.0 = 96.0 s` [TÜRETİLMİŞ]. (Eski: 95.0 s — pratikte aynı, RETURN'ün +1 s'i dışında churn yok.)

### 2.6 Bir oturumda kaç tam döngü görülüyor — hesap

`level-cyclops-cave.md` §7'nin oturum tahminleri (değişmedi, geometri aynı): acemi oyun **~6–7 dk**, ustalık oyunu **~3–4 dk**.

| Profil | Süre | `CYCLOPS_CYCLE` (96 s) ile döngü sayısı |
|---|---|---|
| Acemi | 360–420 s | **~3.75–4.4 → ~4 tam döngü** (+ bir kısmi) |
| Usta | 180–240 s | **~1.9–2.5 → ~2 tam döngü** |

**P3 ile uzlaşma:** üretim planının endişesi (§1.4, "2–2.5 döngü desen öğrenmeye az") gerçek ama **eşitsiz dağılıyor** — tam da öğrenmeye ihtiyacı olan (acemi) profil daha çok tekrar görüyor (~4), zaten hızlı olan (usta) profil daha azını görüyor (~2) ama **zaten** öğrenmiş biri olduğu için buna ihtiyacı yok. Bu kendi kendini dengeleyen bir döngü: yakalanma → mağara ağzına yürüyüş + yeniden toplama, oturumu uzatır, bu da **daha fazla** döngü izletir — yani tam olarak deseni henüz öğrenmemiş oyuncu, hatası yüzünden daha fazla tekrara maruz kalıyor. **Playtest'te ölçülecek — 🔬 somut eşik:** ilk-geçiş (first-clear) medyan oturumda görülen döngü sayısı ölçülsün; **<3 tam döngü** çıkarsa iki kaldıraç var (a) `CYCLOPS_PHASE_OUT`'u ~15 s kısaltmak (58→43 s — ama bu, iç nöy'ün tek-pencere sığması payını `35 s`'den `43-35=8 s` tampona düşürür, riskli, yeniden doğrulanmalı), (b) PRESENT'i kısaltmak (zaten ölü zaman, kaybı daha az — ama en derin gezinmenin fiziksel olarak tamamlanamaması riskini doğurur, §2.4). Başlangıç: **hiçbiri uygulanmıyor, ölçüm bekleniyor.**

---

## 3. Devin gezinme derinliği — olasılık dağılımı

### 3.1 Determinizm mi rastgelelik mi — gerilim ve çözüm

**Gerçek gerilim:** P3'ün tarihsel uygulaması (`LOTUS_PHASE_SEED`, `HALLUCINATION_SEED`) **tam determinizm** — sabit bir tohum, her oturumda aynı desen, "ada okunabilir" ilkesi. Sahip ise körleşme için birebir "her döngüde farklı, öngörülemez" dedi — bu, tam determinizme doğrudan aykırı.

**Çözüm — kuralın sabit kalması, sonucun her girişte yeniden atılması:** [TÜRETİLMİŞ, @helix, 24 Ağu 2026 — sahip vetosuna açık]

- **Dağılımın kendisi (aşağıdaki 4 hücre + yüzdeler) sabit ve öğrenilebilir** — bu, P3'ün "sürpriz mekanik yok" tarafı: oyuncu birkaç girişten sonra "genelde ağıllara gidiyor, bazen derine iniyor" örüntüsünü **istatistiksel olarak** öğrenebilir, tıpkı gerçek bir avcının alışkanlıklarını öğrenmek gibi.
- **Her PRESENT başlangıcında bağımsız bir rastgele çekiliş yapılır** (sabit bir tohumdan değil — gerçek `Math.random()` ya da eşdeğeri) — bu, P3'ün "sürpriz konum/zamanlama var" tarafı: hangi döngüde nereye gideceği, LOTUS'un tersine, **önceden hesaplanamaz.**
- **Neden `LOTUS_PHASE_SEED` deseni burada uygulanmıyor:** o desen, **sabit varlıkların** (çiçekler) zamanlamasını öğrenmek için var — oyuncu haritayı ezberleyip rotasını optimize edebilsin diye. Kiklop'ta amaç tam tersi: devin **tahmin edilememesi**, "her oda potansiyel olarak tehlikeli" hissini korumak (sahip'in "her döngüde farklı" talebinin doğrudan nedeni). Determinizm burada P3'ü değil, sahip'in açık isteğini ihlal ederdi.
- **Saflık/test edilebilirlik çelişmiyor:** gerçek rastgelelik kullanmak, fonksiyonun saf olmasını engellemiyor — `pickWanderTarget(rng: () => number)` şeklinde, üretimde `Math.random` enjekte edilir, testte sabit/mock bir `rng` enjekte edilir (standart desen). §8'in kabul kriterleri bunu doğrudan test ediyor.

**Sabit adı:** `CYCLOPS_WANDER_*` (aşağıdaki 4 yüzde sabiti) — **bilerek bir `CYCLOPS_WANDER_SEED` yok**, çünkü tohumlanacak bir şey yok (her çekiliş bağımsız).

### 3.2 Dağılım — 4 hücre, toplam 1.0

`@cove`'un 3 adayına (§4.7, `level-cyclops-cave.md`) bir 4. seçenek ekliyorum — sahip'in "belki hiç derine inmiyor" ihtimalini karşılamak için, task talimatının da işaret ettiği gibi.

| Hedef | Koordinat | Olasılık | Sabit | Yürüme süresi (`CYCLOPS_GIANT_SPEED` 3.0 m/s ile) |
|---|---|---|---|---|
| **Sığ eşik** (girişe yakın, tam içeri girmeden durur) | `(x=0, D=8)` — mağara ağzı/depo sınırı | **0.15** | `CYCLOPS_WANDER_SHALLOW_PCT` | 8 m → 2.7 s |
| **Depo** | `(x=0, D=15)` | **0.20** | `CYCLOPS_WANDER_DEPOT_PCT` | 15 m → 5.0 s |
| **Ağıllar/Ocak** (kendi ocağı — Homeros'ta da asıl oturma/sağım yeri) | `(x=-4, D=35)` | **0.40** | `CYCLOPS_WANDER_PENS_PCT` | ~35.5 m → 11.8 s |
| **İç nöy** (kişisel köşesi, en derin) | `(x=0, D=60)` | **0.25** | `CYCLOPS_WANDER_INNER_PCT` | 60 m → 20.0 s |

**Toplam: 1.00.** Ağıllar/Ocak en yüksek ağırlığı taşıyor çünkü **[H] kanona sadık** — Homeros'ta Polyphemos'un asıl oturma/sağım yeri orası (IX.219 civarı, `@cove`'un §4.7'de zaten not ettiği gerekçe); "eve dönmek" en olası davranış. İç nöy ikinci en yüksek çünkü orası onun "kişisel köşesi" (uyuma noktası) — mantıklı ama ev kadar sık değil. Sığ/depo daha düşük ağırlıklı çünkü bunlar "içeri girip hemen durma" davranışları — daha az doğal ama sahip'in "hiçbir oda garanti güvenli değil" ilkesini karşılamak için sıfır olamaz.

**Neden 4. hücre (sığ) eklendi:** task talimatı açıkça "hiç derine inmeden ağızda/depoda kalma" ihtimalini istedi. Bu ayrıca oyunun **her odayı** garantili tehlikeli kılmadığını (bazı döngülerde ağıllar/iç nöy tamamen devin ziyaret etmediği, dolayısıyla o döngü boyunca gerçekten sakin geçtiği) bir olasılık olarak bırakıyor — %35 (0.15+0.20) ihtimalle dev derin odalara hiç uğramıyor, bu da riskin **her zaman** tepede olmadığı bir nefes alanı sağlıyor.

---

## 4. Saklaş noktası — hareketsizlik kuralı

### 4.0 Bileşik formül — tek sözde-kod bloğu (algılanma + körleşme)

Implementasyoncu için, iki katmanın nasıl birlikte çalıştığı **tek bir yerde**:

```
// Her karede, yalnızca mağara sahnesindeyken
doorOpen   = phase !== PRESENT
D          = player.depth
inLocal    = withinAnyLocalLightSource(player.pos, phase)   // ocak (PRESENT'te 3.0 m'ye küçülür) / meşale (her zaman 3.0 m)
doorGlobal = doorOpen ? clamp01(1 - D / CYCLOPS_DOOR_LIGHT_REACH) : 0
lit        = inLocal || doorGlobal >= CYCLOPS_DOOR_LIT_THRESHOLD
moving     = input.wasdHeld                                  // tuş durumu, hız eşiği değil (§4.1 tutarlılığı)

base = lit
  ? (moving ? DETECT_RATE_LIT_MOVING    : DETECT_RATE_LIT_STILL)
  : (moving ? DETECT_RATE_SHADOW_MOVING : DETECT_RATE_SHADOW_STILL)

roomMult = (phase === PRESENT && room in {PENS, INNER}) ? CYCLOPS_PRESENT_MULTIPLIER
         : (phase === RETURN)                            ? CYCLOPS_RETURN_MULTIPLIER
         : 1.0

giantTransiting = (phase === PRESENT) && !giant.settled
proximityMult   = (giantTransiting && distance(player.pos, giant.pos) <= CYCLOPS_GIANT_PROXIMITY_RADIUS)
  ? CYCLOPS_PROXIMITY_MULTIPLIER : 1.0

decay  = (base === 0) ? DETECT_DECAY : 0        // hücre-bazlı (§5, DETECT_DECAY netleştirmesi) — oda değil
detect = clamp(detect + (base * roomMult * proximityMult - decay) * dt, 0, DETECT_MAX)

crushed = (phase === PRESENT) && distance(player.pos, giant.pos) <= CYCLOPS_CRUSH_RADIUS

if (detect >= DETECT_MAX || crushed) onCaught()   // aynı fonksiyon, iki tetikleyici — §4.4

canHarvest = doorOpen   // OUT ya da RETURN; PRESENT'te DETECT değerinden bağımsız olarak her zaman false
```

```
onCaught():
  scatterItems(carried, near = player.pos, radius = CAUGHT_DROP_RADIUS)   // D2/C2 — yok olmaz
  fx.playShock()                                                          // §4.4.1, değişmedi
  player.teleportTo(CAUGHT_RESPAWN_POINT)                                  // mağara ağzı, D≈4
  detect = 0
  // memory'ye hiçbir yazma yok — CAUGHT_MEM_SPIKE kaldırıldı (D3)
  // phase değişmez — ölüm/game-over yok
```

### 4.1 Hareket toleransı

**Tuş durumu, hız değil** — `gdd-detection-cyclops.md` §4.1'in disiplinini bilinçli olarak koruyorum (kırmıyorum). Gerekçe: aynı `moving` sinyali zaten PRESENT'te de kullanılıyor (yukarıdaki formül); iki farklı "hareket" tanımı (bir yerde tuş durumu, başka yerde hız eşiği) implementasyonda ve oyuncunun zihin modelinde gereksiz ayrışma yaratırdı.

### 4.2 Kıpırdayınca ne oluyor — mevcut `DETECT`'i kullan, ikinci sayaç yok

**Karar: hiçbir yeni sayaç yok.** Saklaş noktaları zaten (`@cove`'un yerleşimiyle) gölge cebine denk düşüyor — yani saklaş noktasında durgun kalmak `DETECT_RATE_SHADOW_STILL = 0.0` hücresine denk geliyor: **saklaş noktasında tam hareketsizlik, DETECT'i hiç artırmıyor, mevcut formülle zaten sıfır risk.** Kıpırdarsan (`SHADOW_MOVING = 3.0` puan/s), PRESENT'in oda çarpanı (ağıllar/iç nöy'de ×3.0) da varsa `3.0 × 3.0 = 9.0` puan/s — `DETECT_MAX`'a (100) sıfırdan **~11.1 saniyede** ulaşır. Bu tam olarak sahip'in istediği: "hareketsiz kal" kuralının **anında güvenli, ama fiziksel olarak sürekli kıpırdarsan gerçek bir bedel var** olması. Depo/mağara ağzı saklaş noktalarında (PRESENT çarpanı yok) aynı kıpırdama `3.0` puan/s'de kalır — `DETECT_MAX`'a ~33 s'de ulaşır, daha bağışlayıcı (bu odalar zaten daha güvenli tanımlı).

**Neden ayrı bir sayaç icat edilmedi:** mevcut `DETECT` matrisi, saklaş noktasının kendi ışık/hareket profiliyle **zaten** tam olarak istenen davranışı üretiyor — yeni bir sayaç, aynı bilgiyi iki kez modellemek olurdu (P2'nin "az ama anlamlı" disiplinine de aykırı).

### 4.3 Yakınlık — devin yanından geçerken mi, sürekli mi

**Karar: ikisi de, ama farklı katmanlarda.**

- **Sürekli (devin konumundan bağımsız):** oda-bazlı `CYCLOPS_PRESENT_MULTIPLIER` (×3.0, ağıllar/iç nöy) PRESENT boyunca **her zaman** aktif — dev nerede olursa olsun. Bu, "PRESENT'in kendisi tehlikelidir, sadece devin yanında değil" ilkesini koruyor (sahip madde 7).
- **Yalnızca geçerken (devin gerçek konumuna bağlı):** yeni `CYCLOPS_GIANT_PROXIMITY_RADIUS` = **8.0 m** [TÜRETİLMİŞ 🔬] — dev **hâlâ hedefine yürürken** (henüz yerleşmemişken) oyuncunun saklaş noktasına bu yarıçapın içine girerse, `CYCLOPS_PROXIMITY_MULTIPLIER` = **2.0×** [TÜRETİLMİŞ 🔬] ek olarak biner (yukarıdaki formülde `roomMult`'a çarpan olarak eklenir). Dev **yerleştikten sonra** (uyurken) bu ek çarpan düşer — uyuyan dev "izlemiyor", yalnızca oda-bazlı ortam riski kalır.

**Neden 8.0 m:** `@cove`'un saklaş-noktası↔dev-durma-noktası mesafeleri (depo 6.4 m, ağıllar 9.5 m, iç nöy 9.8 m, §4.7) doğal bir eşik veriyor — 8.0 m yalnızca **depo**yu bu riske dahil ediyor (6.4 < 8.0), ağıllar/iç nöy saklaş noktaları zaten yeterince uzak (9.5/9.8 > 8.0) yerleştikten sonra bu ek riski hiç almaz; ama dev onların **yanından geçerken** (rotası `x=0`'da, saklaş noktaları `x≈±4–5.5`'te) hâlâ 8 m'nin içine girebilir — yani derin odaların saklaş noktaları da geçiş sırasında kısa bir pencere için bu riski taşıyabiliyor, sadece yerleşim sonrası taşımıyor. **🔬 playtest ölçütü:** dev'in geçişi sırasında saklaş noktasında gerçekten "gerilim hissi" var mı (oyuncu fark ediyor mu) — varsa 8.0 m aynen kalır; oyuncular geçişi hiç fark etmiyorsa (mesafe çok cömert) 6.0 m'ye indirilir; oyuncular sürekli yanlışlıkla yakalanıyorsa (mesafe çok cimri) 10.0 m'ye çıkarılır.

### 4.4 Kaç saniye hareketsiz "güvenli" sayılır

**Eşik gerekmiyor — güvenlik anlık.** `DETECT_RATE_SHADOW_STILL = 0.0` olduğu için, saklaş noktasında tam hareketsiz kalmanın koruması **ilk kareden itibaren** tam — birikimli bir "ısınma" süresi yok, `MEM_GRACE` gibi bir geri sayım da yok. Bu bilinçli bir sadeleştirme: yeni bir zamanlayıcı icat etmemek (§4.2'nin "ikinci sayaç yok" kararıyla tutarlı).

### 4.5 `HARVEST_HOLD` benzeri bir "tut" jesti — yok, doğrulandı

Hareketsiz kalmak = WASD'a **basmamak**, pasif bir durum, yeni bir tuş ya da basılı-tutma jesti gerektirmiyor. **Doğrulandı — yeni tuş yok.**

---

## 5. Ezilme (fiziksel çarpma) kuralı

- **`CYCLOPS_CRUSH_RADIUS = 2.0 m`** [TÜRETİLMİŞ] — oyuncu-dev mesafesi bu yarıçabın altına düşerse (herhangi bir `DETECT` değerinden bağımsız) anında `onCaught()`. Gerekçe: 4 m genişliğindeki boğazlarda (`@cove` §3.6) merkez hattan (`x=0`) 2.0 m yarıçap, **duvardan duvara tüm genişliği kaplıyor** (2 m + 2 m = 4 m) — yani boğazda devin geçişine denk gelmek **neredeyse kesin** ezilme demek, tam olarak `@cove`'un "bu kasıtlı, boğazın 'yakalanma riski alanı' kimliğinin doğrudan sonucu" tespitini sayıya çeviriyor. Geniş odalarda (12–14 m) aynı 2.0 m, yalnızca devin merkez hattına gerçekten yakın duran birini tehdit ediyor — saklaş noktaları (5–5.5 m yanda) doğal olarak güvenli kalıyor.
- **Devin hızı:** `CYCLOPS_GIANT_SPEED = 3.0 m/s` (§2.4) — hem yürüyüş hem ezilme hesaplarında aynı sabit.
- **Tetikleyici koşul — geçiş mi, PRESENT'in tamamı mı:** **PRESENT'in tamamı**, sadece geçiş anı değil. Gerekçe: basitlik + tutarlılık — dev yerleştikten sonra bile üstüne yürüyen bir oyuncu (bilerek ya da dikkatsizce) onu "uyandırmalı"; ayrı bir "uyuyan devle çarpışma yok" istisnası tanımlamak gereksiz karmaşıklık ve kaçak bir güvenli bölge (oyuncunun devin tam yanına gidip durabileceği bir "ölü alan") yaratır — sahip'in "hiçbir oda garanti güvenli değil" ilkesine aykırı olurdu.
- **Aynı `onCaught` fonksiyonu:** §4.0'daki sözde-kodda açıkça görüldüğü gibi, `detect >= DETECT_MAX` ve `crushed` **aynı** `onCaught()`'u tetikliyor — tetikleyici farklı (biri birikimli bir oran, biri anlık bir mesafe testi), sonuç birebir aynı (§4.4, `gdd-detection-cyclops.md`'nin C2/D2 cezası).

---

## 6. Kapı geçiş kuralları

- **Kapı kapanırken oyuncu eşikte (D≈0) ise:** **konum bazlı, ikili kural** — PRESENT başladığı anda oyuncunun `D ≥ 0` (fiziksel olarak kapı çizgisini geçmiş) ise **içeride** sayılır ve o PRESENT boyunca dışarı çıkamaz; `D < 0` ise **dışarıda** sayılır ve mağara PRESENT boyunca erişilemez kalır. Ekstra bir tampon bölgesi tanımlamıyorum — mağara ağzı bölgesinin kendi saklaş noktası zaten girişe çok yakın (D=6, §3.2) ve erişim süresi (1.6 s, §4.8) `CYCLOPS_PHASE_RETURN` (8.0 s) içinde bolca yer buluyor, yani "tam sınırda" kalan bir oyuncu bile kendi saklaş noktasına rahatça ulaşabiliyor.
- **Oyuncu dışarıdaysa (koy/gemi) PRESENT boyunca:** serbestçe hareket edebilir, bekleyebilir, **elindeki azığı gemiye teslim edebilir** — teslimat kapı durumundan bağımsız, koy/gemi bölgesi hiçbir zaman kapının yetkisi altında değil. Yalnızca mağaraya **yeniden girmek** PRESENT boyunca mümkün değil.
- **Kapı kapalıyken oyuncu çıkamaz** (§9, `level-cyclops-cave.md` ile aynı) — ama **terminal değil**: PRESENT bitip OUT başladığında kapı otomatik açılır, oyuncu serbest kalır. Bu, `level-lotus-island.md`'nin "kilitli kapı yoktur" ilkesiyle çelişmiyor — anahtarsız bir kilit, süresi kendiliğinden doluyor.

---

## 7. Sunum (P2 disiplini)

Hiçbir yeni sayı/bar eklenmiyor — mevcut iki kanal yeniden kullanılıyor:

1. **Kapı durumu (gündüz/gece):** ışığın kendisiyle okunuyor — `§4.6`'nın (`level-cyclops-cave.md`) küresel `doorGlobal` katmanı ve yerel kaynakların (ocak/meşale) PRESENT'te küçülmesi zaten bunu taşıyor. Ek bir "kapı ikonu" ya da "gece göstergesi" **gerekmiyor** — mağara gerçekten kararıyor, bu yeterli sinyal.
   > 🔴 **D11 güncellemesi (25 Ağu 2026, sahip):** ~~"aynı `art-bible.md` §4'ün 'ekranı karartmak yasak' tabanıyla, tamamen kör etmeden"~~ — **bu kısıt kalktı.** `art-bible.md` §4/§9'un karartma yasağı **Kiklop Mağarası için resmen açıldı**; bu adada tam karartma ve karanlık-tehdit dili **serbest ve istenen**. Taban okunabilirlik zorunluluğu yok. `@iris`'in "hiçbir hücre 0'a inmesin" (0,12–0,20 bandı) çözümü artık bir kısıtlama değil, **tercihe bağlı sunum notu**.
2. **"Şu an güvendesin/değilsin" hissi (sayı/bar olmadan):** mevcut kehribar/turuncu kenar parıltısı (`gdd-detection-cyclops.md` §3.3, `etki = clamp01(DETECT/DETECT_MAX)`) **aynen** kullanılıyor — saklaş noktasında tam hareketsizken bu parıltı sıfıra iner/kalır (görsel olarak "sönüyor"), kıpırdarsan yeniden belirir/güçlenir. İkinci bir gösterge icat edilmiyor, mevcut sürekli eğri zaten bu ihtiyacı karşılıyor.
3. **RETURN telegrafı:** mevcut ses/ışık titremesi (level-spec §9) — ek olarak, kapı kapanmadan önceki son ~2 s'de ayak sesi/gürleme belirgin biçimde yaklaşıyor hissi (görsel karar `@iris`'in, işlev burada tarif ediliyor).
4. **Dev geçerken (proximity):** ayrı bir **soyut** gösterge **yok** — kehribar parıltısı zaten proximity çarpanı sayesinde daha hızlı büyüyor (§4.0 formülü). Ama artık asıl sinyal görsel: **devin kendisi görünüyor** (§7.1).

### 7.1 🔴 Polyphemos'un görünürlüğü — D10, sahip kararı (25 Ağu 2026)

**Karar: Polyphemos PRESENT boyunca, ışığın izin verdiği ölçüde, doğrudan ve net görülebilen somut bir tehdittir.** Silüet/gizem dili **değil**.

**Kaldırılan eski kural:** 14 Ağu 2026'da kapanmış olan *"Polyphemos'un modeli PRESENT evresi boyunca hiçbir zaman sürekli render edilmiyor/görünür durmuyor — yalnızca CAUGHT anında ~0,4–0,8 s'lik bir pencerede beliriyor"* kararı **tamamen geçersizdir.** (`level-cyclops-cave.md` §4.3 ve §4.4.1'in "kısa beliriş" bileşeni, `gdd-detection-cyclops.md`'nin ilgili notları.) Gerekçe: o karar, devin mağarada fiziksel olarak **bulunmadığı** bir tasarıma dayanıyordu; körleşme mekaniği devi PRESENT boyunca içeri sokup yürüttüğü ve ona **fiziksel olarak çarpılmayı** (`CYCLOPS_CRUSH_RADIUS`) bir yakalanma tetikleyicisi yaptığı andan itibaren "görünmeyen dev" tutarsız hale geldi — çarpabileceğin ama göremediğin bir şey adaletsizdir.

**Yeni kural — somut:**

| | Kural |
|---|---|
| **Ne zaman görünür** | PRESENT boyunca **sürekli** — dev sahnede, konumu gerçek, çarpışma hacmi gerçek. OUT/RETURN'de mağarada değil (dışarıda), dolayısıyla görünmez. |
| **Ne kadar görünür** | **Işığın izin verdiği ölçüde.** Ayrı bir "gizleme" shader'ı, sis perdesi, silüet malzemesi **yok** — dev normal şekilde render edilir; onu ne kadar gördüğün, bulunduğu yerin o anki aydınlığına bağlıdır (ocak yanında net, karanlık boğazda az). Belirsizlik **tasarlanan bir efekt değil, ışık koşullarının doğal sonucudur.** |
| **Yüz/detay okunuyor mu** | **Evet** — tek göz dahil. Bu, D4'ün (P-C, tam Tripo mesh + doku + rig) **yatırım gerekçesidir**: model 0,6 saniyelik bir flaşta değil, dakikalarca ekranda okunacak. |
| **Animasyon** | `idle / walk / sleep / settle` — dördü de gerçekten görülecek. `walk` hedefe yürürken, `settle` yerleşirken, `sleep` yerleştikten sonra, `idle` ara durumlarda. |
| **CAUGHT anı** | Şok efekti dörtlüsü (kamera sarsıntısı, tek-shot kükreme, kenar vurgusu) **korunuyor** — ama artık bir *reveal* değil, zaten görünen bir şeyin **yakınlaşması/tepkisi**. "Kısa beliriş" bileşeni (`CYCLOPS_JUMPSCARE_DURATION`) **düştü**. |

**Tasarım sonucu — korku dili değişti:** korku artık *"onu göremiyorum, nerede?"* değil, ***"onu görüyorum ve o benden büyük, aramızda 9 metre var ve kıpırdarsam beni fark edecek."*** Bu, D11'in (karanlık serbest) ve korku temasının ikisiyle de tutarlı: karanlık devi **saklamak** için değil, onu gördüğün anı **daha ağır** kılmak için var.

**Ustalık ödülü değişti — dürüstçe:** `level-cyclops-cave.md` §7'nin *"ustalık oyununun ödülü canavarı hiç görmeden bitirmiş olmak"* cümlesi **artık geçersiz.** Yeterince hızlı bir oyuncu tek bir PRESENT görmeden bitirebilir (ustalık turu ~3–4 dk, ilk PRESENT ~66. saniyede başlar — yani pratikte **görecek**). Yerine geçen ustalık ölçüsü: **hiç yakalanmadan/ezilmeden bitirmek** (Ayrılış kartındaki "Atlattığın kapanma: M" satırı bunu zaten ölçüyor).

---

## 8. Kabul kriterleri

1. **GIVEN** faz OUT ya da RETURN (kapı açık), **WHEN** oyuncu olgun bir azıkta `HARVEST_HOLD`'u tamamlar, **THEN** öğe normal şekilde toplanır.
2. **GIVEN** faz PRESENT (kapı kapalı), **WHEN** oyuncu herhangi bir azıkta `E`'ye basar, **THEN** hiçbir şey olmaz — toplama tamamen devre dışı, kısmi bir hasat durumu oluşmaz.
3. **GIVEN** oyuncu tam hareketsiz (`moving=false`) ve gölgede (`lit=false`), **WHEN** herhangi bir süre geçer, **THEN** `DETECT` hiç artmaz — güvenlik anlıktır, minimum bekleme eşiği yoktur.
4. **GIVEN** oyuncu PRESENT'te ağıllar/iç nöy odasının saklaş noktasında gölgede kıpırdıyor (`moving=true`, proximity yok), **WHEN** `DETECT=0`'dan ~11.1 s geçer, **THEN** `DETECT`, `DETECT_MAX`'a ulaşır ve `onCaught()` tetiklenir (`3.0 × 3.0 = 9.0` puan/s).
5. **GIVEN** dev henüz hedefine yürürken (`giant.settled = false`) oyuncuya `CYCLOPS_GIANT_PROXIMITY_RADIUS` (8.0 m) içine giriyor, **WHEN** oyuncu o anda hareket halindeyse, **THEN** `CYCLOPS_PROXIMITY_MULTIPLIER` (2.0×) oda çarpanına ek olarak biner.
6. **GIVEN** faz PRESENT, **WHEN** oyuncu-dev mesafesi `CYCLOPS_CRUSH_RADIUS`'un (2.0 m) altına düşer (devin hareket halinde ya da yerleşmiş olması fark etmeksizin), **THEN** `onCaught()` anında tetiklenir, `DETECT` değeri ne olursa olsun.
7. **GIVEN** oyuncu 4 m genişliğindeki bir boğazda, dev merkez hattı (`x=0`) boyunca geçerken, **THEN** oyuncu boğazın hemen hemen her noktasında `CYCLOPS_CRUSH_RADIUS` içinde sayılır (2.0 m yarıçap = 4 m genişliğin tamamı) — bu, kasıtlı olarak neredeyse kaçınılmaz bir sonuç.
8. **GIVEN** `onCaught()` tetiklenir (DETECT ya da ezilme fark etmez), **WHEN** olay işlenir, **THEN**: taşınan azık yakalanma noktasının `CAUGHT_DROP_RADIUS`'u (2.0 m) içine dökülür ve toplanabilir kalır (yok olmaz); oyuncu `CAUGHT_RESPAWN_POINT`'e (mağara ağzı, D≈4) ışınlanır; `DETECT` sıfırlanır; hiçbir bellek/global değere yazılmaz (`CAUGHT_MEM_SPIKE` yok); faz ve `CYCLOPS_CYCLE` saati etkilenmez.
9. **GIVEN** RETURN telegrafı, oyuncu bir odanın en uzak öğesindeyken başlar (en kötü durum 2.7 s saf yürüyüş), **WHEN** `CYCLOPS_PHASE_RETURN` (8.0 s) geçer, **THEN** oyuncunun saf hareket süresinin üstünde ≥5.3 s payı vardır.
10. **GIVEN** PRESENT başlar (kapı kapanır) ve oyuncunun `D ≥ 0`'dır, **THEN** oyuncu o PRESENT boyunca içeride sayılır ve kapıdan çıkamaz; **GIVEN** o anda `D < 0`'dır, **THEN** oyuncu dışarıda sayılır ve mağara bir sonraki OUT'a kadar erişilemez.
11. **GIVEN** oyuncu koy/gemi bölgesinde (D < −8), herhangi bir fazda (PRESENT dahil), **THEN** oyuncu serbestçe hareket edebilir, bekleyebilir ve elindeki azığı gemiye teslim edebilir — bunların hiçbiri kapının açık olmasını gerektirmez.
12. **GIVEN** Esc ile duraklatma aktif, **WHEN** herhangi bir süre geçer, **THEN** `detect`, `phaseT` ve devin gezinme konumu/ilerlemesi tamamen donar.
13. **GIVEN** oyuncu bir oturumda keyfi sayıda kez yakalanır/ezilir (≥1), **WHEN** oyun devam eder, **THEN** `CYCLOPS_ITEM_TOTAL` (7) her zaman tamamen erişilebilir kalır ve `CYCLOPS_ISLAND_TARGET` (4) her zaman ulaşılabilir — durak hiçbir zaman bitirilemez hale gelmez (D2/C2'nin garantisi).
14. **GIVEN** oyuncu 4/4 azığı gemiye teslim edip `E`'ye basar, **THEN** durak kazanılmış sayılır.
15. **GIVEN** oyuncu bir denemede 2 kez yakalanmış/ezilmiş (`crushCount = 2`) ve 3 azık teslim etmiş, **WHEN** 3. yakalanma/ezilme gerçekleşir (`crushCount` → `CYCLOPS_CRUSH_CAP` = 3), **THEN** durak **başarısız** olur: oyuncu hub'a döner, `delivered` **0'a sıfırlanır**, azık yerleşimi başa döner, `DETECT` ve `phaseT` sıfırlanır — ve Kiklop'un hub kilidi **açık kalır**, durak hemen yeniden denenebilir.
16. **GIVEN** oyuncu bir denemede 2. kez yakalanır (`crushCount` → 2, `CAP`'in altında), **THEN** yalnızca D2/C2 cezası uygulanır (azık dökülür, mağara ağzına ışınlanma) — teslim edilmiş azık ve ilerleme **korunur**, durak bitmez.
17. **GIVEN** `CYCLOPS_CRUSH_CAP` durumu, **THEN** kalan hak **hiçbir zaman** ekranda sayı/bar/ikon olarak gösterilmez (P2) — yalnızca her ezilmede belirgin biçimde ağırlaşan korku efektiyle hissettirilir.
18. **GIVEN** oyuncu durağı başarısız bitirip yeniden başlar, **THEN** yeni deneme tamamen temiz başlar (`crushCount = 0`, `delivered = 0`) ve **önceki denemeden hiçbir şey taşınmaz** — ne ceza, ne avantaj, ne deneme sayacı (K40'ın "duraklar arası durum taşınmaz" ilkesinin durak-içi karşılığı).
15. **GIVEN** `pickWanderTarget(rng)` sabit bir `rng` dizisiyle (`0`, `0.15`, `0.35`, `0.75`, `0.999`) çağrılır, **THEN** sırasıyla Sığ eşik, Depo (0.15 sınırında), Ağıllar/Ocak (0.35 sınırında), İç nöy (0.75 sınırında), İç nöy döndürür — kümülatif dağılım, tek bir `rng` girdisinin saf, deterministik bir fonksiyonudur.

---

## Ek — bitiş/kayıp sözleşmesi (D3 sonrası, türetilmiş)

> # 🔴 KARAR DEĞİŞTİ — sahip, 25 Ağu 2026. `@helix`'in "kayıp koşulu yok" önerisi **REDDEDİLDİ.**
>
> Aşağıdaki **"Seçenek A"** artık geçerli değildir. Yerine somut bir kayıp kuralı geldi: **`CYCLOPS_CRUSH_CAP`.** Metin arşiv olarak duruyor; **bağlayıcı olan bu bölümün başındaki yeni kuraldır.**

## Bitiş / kayıp sözleşmesi — **`CYCLOPS_CRUSH_CAP` (sahip kararı, 25 Ağu 2026, kesin)**

Bu **türetilmiş bir öneri değil, sahip onaylı kesin bir karardır.** Veto açık değildir.

| | Kural |
|---|---|
| **Kazanma** | 4/4 azık teslim + gemide `E`. (Değişmedi.) |
| **Kaybetme** | **`CYCLOPS_CRUSH_CAP` = 3.** Bir denemede **3. yakalanma/ezilme** gerçekleştiği anda durak **başarısız** sayılır. |
| **Kaybın sonucu** | Oyuncu **hub'a döner.** **O denemedeki tüm ilerleme sıfırlanır** — teslim edilmiş azık dahil (`delivered` → 0), sahnedeki azık yerleşimi başa döner, `DETECT` ve döngü saati sıfırlanır. |
| **Kalıcı mı** | **Hayır.** Durak **sınırsız kez** baştan denenebilir. Kaybedilen tek şey **o denemedir**; Kiklop'un hub'daki kilidi açık kalır, hiçbir kalıcı ceza yok. |
| **1. ve 2. yakalanma** | Değişmedi — D2/C2: azık yere dökülür (yok olmaz), oyuncu mağara ağzına ışınlanır, `DETECT` sıfırlanır, ilerleme **korunur**. |

**Neden `delivered` de sıfırlanıyor:** aksi halde "3 kez ezil, hub'a dön, teslim ettiklerini koru, tekrar gir" bir kestirme olurdu — kayıp bir ceza değil, ücretsiz bir checkpoint'e dönerdi. Denemenin **tamamen** sıfırlanması, `CYCLOPS_CRUSH_CAP`'i gerçek bir bahis yapıyor.

**Bu, D3'ün açtığı boşluğu kapatıyor.** D3 unutuşu (ve onunla birlikte `MEM_GRACE`/kayıp finalini) bu adadan kaldırınca durakta hiçbir kayıp koşulu kalmamıştı; `@helix` bunu "kayıp yok" diye türetmişti, sahip bunun yerine **ezilme sayısına bağlı, adaya özgü bir kayıp koşulu** koydu. Sonuç: yakalanmanın bedeli artık yalnız zaman değil — **üçüncüsü denemeyi bitiriyor.** §11.7 (c)'nin "yakalanma ucuzladı mı" endişesi bu kararla büyük ölçüde kapandı.

**P1 kontrolü (yeniden yapıldı):** bu ikinci bir "can barı" mı? **Hayır, ama sınırda ve bilinçli.** `CYCLOPS_CRUSH_CAP` ekranda **gösterilmiyor** (P2 — sayı/bar yok); oyuncu kaç hakkı kaldığını **hissetmeli**, saymamalı. Sunum: her ezilmede korku efekti belirgin biçimde **ağırlaşır** (3. seferde en ağır) — bkz. §7. Bu, unutuşun eşik sisteminin (`MEM_THRESHOLD_*`) aynı felsefesi: ayrık bir sayaç var ama oyuncu onu ölçek olarak değil, **şiddetlenen bir durum** olarak okuyor.

> ⚠️ **`@nile` uygulama notu:** "deneme" (`attempt`) bu adada yeni bir kavram — `fullRestart()` bugün durak-bazlı değil koşu-bazlı düşünüyor. Kiklop'un `Stop` implementasyonu kendi `attempt` durumunu (`crushCount`, `delivered`, azık yerleşimi, `phaseT`) tutmalı ve `CYCLOPS_CRUSH_CAP`'e ulaşınca tamamını sıfırlayıp hub'a dönmeli. Bu, §6 adım 5a'nın kapsamına girer.

---

### Arşiv — reddedilen "Seçenek A" (24 Ağu 2026, `@helix` türetmesi)

> **Aşağısı artık uygulanmıyor.** Sahip 25 Ağu'da reddetti. Tarihçe olarak bırakıldı: seçenek karşılaştırma tablosu, `CYCLOPS_CRUSH_CAP`'in neden B ve C'den farklı bir üçüncü yol olduğunu gösterdiği için hâlâ okunmaya değer — sahip'in seçtiği kural, tablodaki **C'ye (yakalanma-sayısı tavanı) yakın** ama onun "görünmez sayaç adaletsizliği" itirazını sunumla (şiddetlenen korku efekti) çözüyor.

~~**Seçilen: Seçenek A — saf kazanma-koşullu durak. Kayıp koşulu yok, süre limiti yok, deneme sınırı yok.**~~ `[REDDEDİLDİ — sahip, 25 Ağu 2026]`

~~Durak **yalnızca** 4/4 teslim + gemide `E` ile biter. Bitirmeden hub'a dönmek, K40 gereği hiçbir durum taşımadan ve hiçbir "başarısızlık" kaydı olmadan biter. Yakalanma/ezilme yalnızca **zaman** kaybettirir; hiçbir sayaç dolup durağı sonlandırmaz.~~

**Üç seçenek, sonuçlarıyla:**

| | **A — Kayıp koşulu yok** ✅ seçilen | **B — Soft gün saati** | **C — Yakalanma-sayısı tavanı** |
|---|---|---|---|
| **Ne** | Durak yalnız kazanılarak biter; oyuncu istediği kadar döngü kalabilir | Lotus'un `DAY_LENGTH`'i gibi bir saat; dolunca durak biter | N. yakalanmada durak biter |
| **Gerilim kaynağı** | Yakalanmanın **zaman maliyeti** — her yakalanma bir döngü daha bekletir, sabrı yer | Dışsal, sabit bir geri sayım | Hata bütçesi |
| **Kart metniyle uyum** (*"Körleşmeden, tayfanla birlikte çık"*) | *"Körleşme"* = kapı kapanınca gelen karanlık, **her döngüde tekrarlanan bir durum** — "körleşmeden çık" = "karanlık basmadan dışarı çıkabil". Metin **mekanik olarak doğru** | "Körleşme" bir geri sayıma dönüşür — metin yine çalışır ama anlamı kayar | Metinle ilgisiz; "körleşme" hiçbir şeyi tarif etmez |
| **Korku temasıyla uyum** | **Güçlü** — korku, ceza tehdidinden değil, **karanlıkta odada senden büyük bir şeyle kalmaktan** gelir. Klasik korku dili: kaybetme korkusu değil, *bulunma* korkusu | Zayıflatır — gerilim "yetişemeyeceğim"e kayar, tür aksiyona döner | Nötr |
| **Sistem maliyeti** | **Sıfır yeni sistem** | Yeni saat + HUD sunumu + bitiş ekranı | Yeni sayaç (P2: ekranda gösterilemez → oyuncu kaç hakkı kaldığını **bilemez**, bu adaletsiz) |
| **P1 ("tek mekanik, iki yön")** | Korunur — tek baskı kaynağı körleşme | İkinci bir baskı kaynağı ekler | İkinci bir "can" ekler — **P1 ihlali** |
| **Risk** | Durak "kaybedilemez" olduğu için **fazla yumuşak** hissedebilir — playtest'te ölçülmeli (§6 adım 10, madde g) | Kapsam artışı; K40 sonrası gerekçesiz | P1 ihlali + görünmez sayaç adaletsizliği |

**A'nın seçilme gerekçesi:** (a) sahip'in kapattığı hiçbir karar bir kayıp koşulu **gerektirmiyor**; (b) D3 zaten bu adadan tek tehdit ölçeğini (unutuş) kaldırdı — yerine ikinci bir soyut sayaç koymak, kaldırılan şeyi başka adla geri getirmek olurdu; (c) K40 sonrası "kaybetmek" ne demek belirsiz — kaybedilecek bir koşu yok, hub'a dönmek zaten serbest; (d) korku türünde ceza genelde **ölüm değil, geri atılma**dır (C2 tam olarak bu).

**Bu kararın açık riski, saklamıyorum:** bir durağın *hiç* kaybedilememesi bu projede bir ilk — Lotus'ta bile forget-event var. Eğer playtest'te durak "gerilimsiz" çıkarsa, en ucuz düzeltme **B değil**, yakalanmanın zaman maliyetini artırmaktır (ör. `CAUGHT_RESPAWN_POINT`'i mağara ağzından **gemiye** çekmek — bir döngü daha kaybettirir, yeni sistem gerektirmez). **Bu bir öneri, uygulanmadı** — §6 adım 10'un (g) ölçümüne bağlı.
