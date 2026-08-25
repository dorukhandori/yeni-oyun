# Implementasyon spec + Sprint 1 — Lotus kapanışı + Kiklop Mağarası inşası

> **Statü:** uygulamaya hazır iş listesi, plan değil. Tasarım/oynanış kararları burada verilmiyor — hepsi zaten kapalı (`docs/design/gdd-cyclops-blinding.md`, `docs/design/tuning.md`, `docs/production/cyclops-cave-production-plan.md`). Bu doküman onları **dosya/fonksiyon seviyesinde iş kırılımına** çevirir.
> **Tarih:** 2026-08-25. Yazan: ana oturum, sahibin sert geri bildirimi üzerine — önceki turlarda sayılar görsel/gerçek kod durumu hiç kontrol edilmeden kilitlendi, bu doküman **gerçek `src/` durumunu okuyarak** yazıldı, varsayımla değil.
> **Kapsam dışı:** yeni tasarım kararı almak. Bir belirsizlik çıkarsa (ör. iki dokümanın çelişmesi), burada durup sahibe sorulur, kendiliğinden karar verilmez.

---

## 0. Neden bu doküman var

Sahibin 25 Ağu 2026 eleştirisi, kabul edildi, buraya bağlayıcı olarak yazılıyor:

1. **Lotus Adası bitmeden Kiklop'a başlanmıyordu — halbuki gerçekte büyük kısmı zaten bitmiş.** `docs/production/roadmap.md`'nin 14 Ağustos'tan kalma "kodda YOK" tablosu **büyük ölçüde bayat** — §1 bunu ölçerek düzeltiyor. Gerçek kalan iş küçük, roadmap'in iddia ettiğinden çok daha az.
2. **Sayılar görsel/kod gerçekliği kontrol edilmeden kilitlenmeyecek.** Bu doküman her iddiayı `src/`'de arayıp satır numarasıyla kanıtlıyor.
3. **`CYCLOPS_CRUSH_CAP=3` (3 ezilme → tam sıfırlama) deneysel işaretleniyor**, playtest'e kadar kesin değil — §4'te.
4. **Ses işi somut bir Cursor bileti olarak açılıyor**, havada bırakılmıyor — §5'te.
5. **En pahalı/riskli iş (Polyphemos, mimari dikiş) önce**, en ucuz iş (dış manzara resmi, zaten yapıldı) sona — sıralama §3'te buna göre.

---

## 1. Lotus Adası — gerçek durum denetimi (2026-08-25, `src/` okunarak)

`roadmap.md` §1.3'ün "tasarımda var, kodda YOK" tablosuyla karşılaştırma:

| Madde | Roadmap'in iddiası (14 Ağu) | Gerçek durum (bugün, kanıt) | Sonuç |
|---|---|---|---|
| `HARVEST_HOLD` (E basılı tutma + ilerleme + hareketle iptal) | Yok | **Var, tam.** `LOTUS.hold=1.2`, `LOTUS.cancelMove=0.3` (`src/constants.ts:759,761`); basılı tutma/iptal/ilerleme mantığı `src/game.ts:1142-1162`; ilerleme halkası `src/game.ts:1210-1211` | ✅ Kapalı, iş yok |
| Dört unutuş eşiği + histerezis | Kodda tek eşik var | **Histerezis var** (`src/constants.ts:859,861`: `threshold:60/100`, `hysteresis:3/100`). Dört ayrı eşik mi yoksa tek eşik+histerezis mi olduğu **doğrulanmadı** — `qa-tester` tek tek `gdd-memory-system.md` §3.2'ye karşı koşmalı | ⚠️ Kısmen — tam doğrulama gerek, §1.2 |
| Deterministik olgunlaşma (`LOTUS_PHASE_SEED`) | `Math.random()` kullanıyor, rota öğrenilemez | **Artık deterministik.** `src/world/lotus.ts:562`: `mulberry32(ctx?.seed ?? 77002)` | ✅ Kapalı, iş yok (roadmap'in en kritik "P3 çökük" bulgusu artık geçersiz) |
| Yürüyüş sapması (eşik 3) | Yok | **Kısmi.** Sanrı-figürü temas sapması (`HALLUCINATION.driftMultiplier`) tam çalışıyor (`src/game.ts:923-935`). Ama kod içi yorum satırı (`src/game.ts:926`) açıkça diyor ki: *"regardless of the (not yet implemented) eşik-3 baseline drift"* — yani **temel unutuş-eşiği sapması (sanrı figürü olmadan, salt yüksek unutuşta) hâlâ yok** | ❌ Gerçek eksik — §1.1'de iş |
| Solmuş çiçek cezası (`MEM_WITHERED_PENALTY`) | Yok | **Hâlâ yok.** `src/game.ts`'de `stage === "wilt"` durumuna bağlı hiçbir kod yok (grep temiz) | ❌ Gerçek eksik — §1.1'de iş, ama **tasarım kararı olabilir**: `game.ts:242` civarındaki yorum ("natural loss IS the penalty") başka bir bağlamda (K35 forget event) yazılmış olsa da aynı felsefe burada da geçerli olabilir — `game-designer`'a tek soru: bilerek mi atlandı? |
| El yerleşimli 28 çiçek | Kod 3 bölgeye prosedürel saçıyor | **Muhtemelen artık moot** — K-A kararıyla (tek koşu, `edge` mod hedef 5) klasik 12'li modun önemi düştü, `LOTUS.minSpacing`/`edgeCount` gibi yeni sabitler var. Doğrulama gerek ama **öncelik değil** | 🔵 Düşük öncelik, §1.3 |
| Başlık/nasıl oynanır/hakkında ekranları | Yok | **Kısmen var** — `Menu` sınıfı (`src/ui/menu.ts`) title/hub/pause ekranlarını yönetiyor, `mountMuteToggle`, `requestLandscapeLock` var. Tam "nasıl oynanır/hakkında" içerik ekranı ayrı doğrulanmalı | ⚠️ Kısmen, §1.3 |
| Esc → duraklat | Yok | **Var.** ACTIVE_WORK.md'nin 23 Ağu satırı: "oyun içi pause" şipedildi | ✅ Kapalı |
| DOM pusula | Yok, 3D ok var | Doğrulanmadı bu turda — düşük risk, `qa-tester`'a bırak | 🔵 §1.3 |
| Bayılma katmanı (`FX_GHOST_OFFSET`/`FX_BREATH_*`) | Yok | Doğrulanmadı bu turda | 🔵 §1.3 |
| Sanrı figürleri | Yok | **Var, entegre.** `buildHallucinations` import + kullanım `src/game.ts:40`, temas mantığı `:1294-1310` | ✅ Kapalı |

**Okuma:** roadmap'in "büyük boşluk" listesinin çoğu artık kapalı. Gerçek kalan iş **iki madde**: (1.1) temel eşik-3 sapması + solmuş çiçek cezası — ikisi de küçük, tek oturumluk işler. Geri kalanı (1.2/1.3) doğrulama, yeni kod değil.

### 1.1 Sprint'e giren gerçek Lotus işleri

| # | İş | Dosya | Tahmini | Not |
|---|---|---|---|---|
| L1 | Temel eşik-3 yürüyüş sapması (sanrı figürü YOKKEN de, salt unutuş eşik 3'te) | `src/game.ts` (`driftTimer` mantığının yanına, ~line 928 civarı) | 0.5 oturum | `MEMORY.driftMaxAngleDeg`/`driftPeriod` zaten var, sadece eşik-3 koşulunu tetikleyen ikinci bir kaynak eklemek — mevcut sanrı-tetikli koddan **kopyala değil, aynı fonksiyonu paylaştır** |
| L2 | Solmuş çiçek cezası **ya da** bilinçli "yok" kararı | `game-designer` sorusu önce, sonra `src/game.ts`/`src/world/lotus.ts` | 0.5 oturum (karar + varsa uygulama) | Önce sahibe/`@helix`'e sor: bilerek mi atlandı (K35 forget-event felsefesiyle tutarlı olarak) yoksa gerçek bir boşluk mu |

### 1.2 Sprint'e girmeyen, ama kapanmadan "Lotus bitti" denemeyecek doğrulama işi

`qa-tester`'a ayrı, kısa bir görev: `gdd-lotus-collection.md` §8 (10 kriter) + `gdd-memory-system.md` §8 (14 kriter) tek tek koşulup işaretlenmeli. **Bu kod yazmıyor, sadece mevcut durumu ölçüyor** — L1/L2 dışında yeni iş çıkarsa buraya eklenir.

### 1.3 Düşük öncelik / K-A'ya bağlı

El yerleşimi, DOM pusula, bayılma katmanı, başlık/hakkında ekranlarının tam içeriği — bunlar **D7 kararı gereği K-A turunda** (Kiklop'tan sonra) ele alınacak, şimdi dokunulmuyor.

---

## 2. Kiklop Mağarası — mimari dikiş (A3, kademeli)

Karar: `docs/production/cyclops-cave-production-plan.md` §5.3 (D5=A3). Aşağıdaki, o kararın **gerçek `game.ts`/`types.ts` yapısına** karşı somutlaştırılmış hali.

### 2.1 Bugünkü gerçek yapı (kanıt)

- `src/types.ts:12`: `Phase = "title" | "hub" | "play" | "departing" | "won" | "lost" | "dusk" | "gameover"` — **"level" ya da "stop" kavramı yok**, tek dünya (Lotus) hardwired.
- `src/game.ts` tek `startGame()` closure'ı, boot'ta `buildLotusField`/`buildSailor`/`buildSea`/`buildShip`/`buildHillPuzzle`/`buildSteppingStones`/`buildThallopes`/`buildLotophagoi`/`buildHallucinations`/`buildShoreMist`/`buildTerrain` — 11 world-builder çağrısı **koşulsuz**, teardown yok.
- `src/constants.ts:41-45`: `?profile=test` deseni zaten var — `URLSearchParams(window.location.search).get("profile")`, modül yüklenirken bir kere okunuyor, `ACTIVE_PROFILE` sabitleniyor. **Bu, `?stop=` için doğrudan kopyalanacak emsal.**

### 2.2 Yeni dikiş — somut dosya planı

| # | İş | Dosya | Tahmini | Bağımlılık |
|---|---|---|---|---|
| K1 | ✅ **Yapıldı, 25 Ağu.** `?stop=` okuma, `ACTIVE_STOP: "lotus" \| "cyclops"` sabiti | `src/constants.ts` (mevcut `resolveProfileFromUrl` deseninin yanına) | 0.5 oturum | Yok, ilk iş |
| K2 | ✅ **Karara bağlandı, 25 Ağu — küçük mimari karar, ana oturum aldı.** `Phase` union'a **dokunulmadı** — mevcut fazlar korunuyor, `ACTIVE_STOP` ayrık bir eksen. Gerekçe: minimum risk, A3'ün "dokunmadan sar" felsefesiyle tutarlı; Cyclops'un kendi durum makinesi (kapı döngüsü vb.) K7'de ayrı, `Phase`'in dışında ele alınacak | `src/types.ts` (değişmedi) | 0 (karar, kod yok) | K1 |
| K3+K4 | ✅ **Yapıldı, 25 Ağu — planı dürüstçe revize ederek.** Orijinal plan ("Lotus'un 11 builder çağrısını `Stop` arayüzüne sar") **gerçek `startGame()`'in ne kadar iç içe geçmiş olduğunu hafife almıştı** — `field`/`hill`/`ship` gibi her local, ~1500 satırlık `step()`'in her yerinde closure ile paylaşılıyor, sadece boot'ta değil. Bunu bu oturumun bütçesinde güvenle çıkarmak riskliydi (Lotus'u bozma riski, A3'ün tam kaçınmak istediği şey). **Bunun yerine en güvenli minimal dikiş kuruldu:** `startGame()`'in en tepesine `if (ACTIVE_STOP === "cyclops") return startCyclopsStop(canvas);` — Lotus'un **tek satırı bile taşınmadı/değiştirilmedi**. Yeni `src/stops/cyclopsStop.ts`: kendi başına WebGLRenderer+Scene+Camera (`render/stage.ts`'in `createStage()`'ını **kasıtlı olarak kullanmıyor** — gökyüzü/güneş/bulut/haze getirir, plan zaten "mağara Lotus'tan daha hafif koşmalı" diyordu), koyu lacivert placeholder arkaplan, `#loading` dismissal. **Tarayıcıda doğrulandı:** `?stop=cyclops` farklı bir canvas render ediyor (Lotus'un mavi gökyüzü yerine `0x1a222c`), `?stop=` yokken Lotus Title→Hub akışı **tamamen bozulmadı** (ekran görüntüleriyle karşılaştırıldı). `npx tsc --noEmit` ve `npm run build` temiz. **Bilinen sınırlama, kasıtlı:** Title/Hub DOM ekranları (`menu.ts`) henüz `ACTIVE_STOP`'tan habersiz — `?stop=cyclops`'ta "Oyna" tıklaması hiçbir şey yapmıyor (Lotus'un `fullRestart` vb. hâlâ erken-dönüşten sonraki kodda tanımlı, o koda hiç ulaşılmıyor). Bu K12/K13'ün işi, bilerek bu tura alınmadı — `lotusStop.ts` adaptörü ve `Stop` arayüzü de bu yüzden **yazılmadı**, gerçek ihtiyaç netleşmeden (K7+ Cyclops'un kendi state machine'i oturunca) spekülatif bir soyutlama eklemek istemedik. | `src/constants.ts` (import), yeni `src/stops/cyclopsStop.ts`, `src/game.ts` (2 satır: import + erken dönüş) | ~1,5 oturum (1+1 tahmininden biraz fazla, keşif+doğrulama dahil) | K1 |
| K5 | ✅ **Yapıldı (primitif), 25 Ağu.** Ayrı `caveStage.ts` yerine `cyclopsStop.ts` içinde inline ambient+hemi ışık (kapı durumuna göre `hearthLight`/`torchLight` yarıçapı toggle) — dosya sayısı bilerek küçük tutuldu, gerçek görsel geçiş (ASSET-103, ≥1,5 s yumuşama) polish turunda | `src/stops/cyclopsStop.ts` | ~0,3 oturum | K4 |
| K6 | ✅ **Yapıldı (primitif), 25 Ağu.** `src/world/cyclopsCave.ts` — Blender'a gitmeden, düz renkli `BoxGeometry` oda kabukları (kroki'nin D/X/Y sayılarından birebir), `corridorHalfWidthAt(z)`/`roomIdAt(z)` çarpışma/bölge fonksiyonları, ocak+meşale `PointLight`, saklaş noktası halkaları (dev-görünür) | `src/world/cyclopsCave.ts` (yeni) | ~1 oturum | K5 |
| K7 | ✅ **Yapıldı, 25 Ağu.** Kapı döngüsü (`CYCLOPS_PHASE_OUT/RETURN/PRESENT` = 58/8/30 s, tam `CYCLOPS_CYCLE`), `pickWanderTarget` ağırlıklı çekiliş (kroki'nin kendi kabul-kriteri test vektörüyle eşleşen kümülatif sınırlar), dev kapsül placeholder'ı hedefe yürüyüp yerleşiyor. **Tarayıcıda deterministik test edildi** (aşağıya bkz.) | `src/stops/cyclopsStop.ts` | ~1 oturum | K6 |
| K8 | ✅ **Yapıldı, 25 Ağu.** Saklaş/hareketsizlik kuralı yeni sabit gerektirmedi (doğrulandı) — `lit`/`moving` durumuna göre `DETECT_RATE_*` + evre/oda çarpanları (RETURN ×1.5, ağıllar/iç nöy PRESENT'te ×3.0) + `DETECT_DECAY` | `src/stops/cyclopsStop.ts` | ~0,5 oturum | K7 |
| K9 | ✅ **Yapıldı, 25 Ağu — iki gerçek hata bulunup düzeltildi (aşağıya bkz.).** Ezilme=yakalanma (D2/C2: azık yakalanma noktasına döküldü, yok olmadı) + `CYCLOPS_CRUSH_CAP=3` (deneysel) tam sıfırlama. | `src/stops/cyclopsStop.ts` | ~1,5 oturum (hata avı dahil) | K8 |
| K10 | ✅ **Kısmen — placeholder mesh var, animasyon yok.** Basit kapsül, `idle/walk/sleep/settle` klipleri henüz yok (P-C ile gelecek, playtest sonrası) | `src/world/cyclopsCave.ts` + `cyclopsStop.ts` | ~0,3 oturum | K7 |
| K11 | ✅ **Yapıldı, 25 Ağu.** 7 azık (kroki koordinatlarıyla birebir), primitif silindir/küre mesh (peynir/tulum), `E` ile toplama (yalnız OUT/RETURN), gemiye (`z≤-15`) teslim | `src/world/cyclopsCave.ts` + `cyclopsStop.ts` | ~0,7 oturum | K6 |
| K12 | ⏳ **Yapılmadı — bilerek ertelendi.** Şu an yalnız DEV-only, stilsiz bir debug `<div>` (`[DEV DEBUG — gerçek HUD değil]`). Gerçek HUD (`src/ui/hud.ts`) mekanik tamamen doğrulanmadan yazılmayacak | `src/ui/hud.ts` | 0.5 oturum | K9 |
| K13 | ⏳ **Yapılmadı.** Hub kartı hâlâ statik div, `?stop=cyclops`'ta "Oyna" hâlâ inert | `src/ui/menu.ts`, `index.html` | 0.5 oturum | K1 |

### K5-K11 doğrulama notu (25 Ağu 2026)

Gerçek `requestAnimationFrame` tarayıcı otomasyonunda arka planda boğulduğu için (`document.hidden=true`), Lotus'un `__LOTOPHAGOI_TEST_HOOKS__.runSteps` desenine birebir uyan bir DEV-only `window.__CYCLOPS_DEBUG__` hook'u eklendi (`step(dt,n)`/`setMove`/`teleport`/`state()`). Bununla deterministik olarak test edilip **doğrulanan** davranışlar: koridor genişlik sınırlaması (dar boğaz 2 m / geniş ağıllar 7 m), oda tanıma, toplama→teslim akışı, tam kapı döngüsü (dev doğru ağırlıklı hedefe yürüyüp yerleşiyor), ezilme→azık düşme→ışınlanma, 3. ezilmede tam sıfırlama.

**Testte bulunup düzeltilen iki gerçek hata:**
1. `doorGlobal(z)` formülü negatif `z` (koy/patika, mağara dışı) için de 1'e clamp'leniyordu — oyuncu **gemideyken bile** DETECT birikiyordu. Düzeltme: DETECT hesap bloğu artık yalnız `z≥0` (mağara eşiğinden itibaren) çalışıyor.
2. Ezilme sonrası **bağışıklık penceresi yoktu** — oyuncu mağara ağzına ışınlanınca dev hâlâ o civardan geçiyorsa aynı/sonraki karede ikinci bir `onCaught()` tetiklenip `CRUSH_CAP`'i haksızca hızla tüketiyordu. Düzeltme: 2 sn'lik `crushGraceT` penceresi (ezilme + DETECT kontrolleri bu süre boyunca atlanıyor).

**Toplam K1-K13: ~10.75 oturum** (mekanik iskelet, Polyphemos placeholder ile). Gerçek Tripo mesh (P-C, ~80 kredi) K10'un yerini **playtest sonrası** alır — bu sırada da bir oturum daha.

**Sıra (D7 gereği):** K1-K13 tamamı Kiklop, K-A (Lotus tek-koşu sadeleştirmesi) bundan sonra — §1.3.

---

## 3. Bu sprint'te YAPILMAYACAK, bilerek ertelenen

- Polyphemos'un gerçek Tripo mesh+rig üretimi (K10 placeholder yeterli olana kadar)
- ASSET-105/106/107 (Depo/Ağıllar/İç nöy konseptleri) — mekanik çalışmadan görsel kilitlemenin manası yok, sahibin kendi eleştirisi buydu
- El yerleşimli 28 çiçek, DOM pusula, bayılma katmanı (§1.3)

---

## 4. `CYCLOPS_CRUSH_CAP=3` — DENEYSEL, playtest'e kadar kesin değil

`tuning.md` §12'ye şu not eklendi (bkz. commit): sahibin kendi kararıyla belirlendi ama **hiç oynanmadan**, üstelik devin rotası kasıtlı öngörülemez tutulurken. K9 implementasyonu bu sayıyı **kolayca değiştirilebilir tek bir sabit** olarak yazmalı (kod içine gömülü değil), ilk playtest'ten sonra sahip 3'ü değiştirmek isterse tek satır değişecek. **Bu bir uyarı, bir engel değil** — implementasyon durmuyor, ama "kesin karar" muamelesi görmüyor.

---

## 5. Ses işi — somut Cursor bileti

`@echo` (Sound Designer) Cursor-only, Claude Code'dan çağrılamıyor. Bu iş **havada bırakılmıyor** — aşağıdaki bilet hazır, sahip Cursor'ı açıp `@echo`'ya verdiğinde sıfırdan bağlam kurmasına gerek kalmasın diye kendi başına yeterli:

> **Bilet: Kiklop Mağarası — körleşme ses katmanı**
> **Kaynak:** `docs/design/gdd-cyclops-blinding.md` (mekanik otorite), `docs/art/art-bible.md` D11 kutusu (ton).
> **İhtiyaç:**
> 1. Kapı açık/kapalı geçiş sesi (taş sürtünmesi, ~2 sn, ekran hiç karartılmadığı için ses geçişi **tam da o an** oyuncuya "bir şey değişti" demeli — art-bible §4'ün "ekran karartma yasak" kuralı ses tarafına yansımaz, ses burada asıl taşıyıcı).
> 2. Devin adım/nefes sesi — PRESENT boyunca sürekli, mesafeye göre şiddet (yakınsa net, uzaksa belirsiz) — oyuncunun devin nereye gittiğini **kısmen** ses yoluyla tahmin etmesini sağlamalı (görsel ipucu yok, mekanik bunu istiyor — `gdd-cyclops-blinding.md` §3).
> 3. Ezilme anı — 3 şok bileşeni zaten kararlı (kamera sarsıntısı, kükreme, kenar vurgusu) — kükremenin ses varlığı `@echo`'nun işi.
> 4. Saklaş noktası hareketsizlik ihlali uyarısı — ince bir gerilim sinyali (müzik değil, ortam), can barı/UI öğesi olmadığı için **tamamen sesle** taşınmalı.
> **Kısıt:** Kenney CC0 paketleri zaten projede (`src/systems/audio.ts`) — yeni lisanslı kaynak gerekmiyor, mevcut paketlerden seçim + varsa hafif işleme yeterli.
> **Kapsam dışı:** müzik bestesi, yeni paket satın alma.

**Koordinasyon mekanizması:** bu bilet `docs/production/ACTIVE_WORK.md`'ye "beklemede" bölümüne, sahibe atanmış açık bir madde olarak eklendi (bkz. commit). Cursor tarafında biri (`@echo` ya da sahip) bunu aldığında `ACTIVE_WORK.md`'ye kendi claim satırını ekleyip **normal protokolü** izler — ekstra bir mekanizma icat edilmedi, mevcut çoklu-ajan protokolü zaten bunun için var, sadece **bilet olarak yazılı hale getirilmedi** daha önce.

---

## 6. Özet — sırada ne var

1. **K1-K13** (Kiklop mekanik iskeleti, Polyphemos placeholder ile) — ~10.75 oturum
2. **L1-L2** (Lotus'un gerçek kalan iki boşluğu) — ~1 oturum, K-A turunda
3. Ses bileti sahibe/Cursor'a devredildi, ayrı bir zaman çizelgesinde
4. Playtest'ten sonra: `CYCLOPS_CRUSH_CAP` doğrulaması, Polyphemos placeholder → gerçek P-C mesh, ASSET-105/106/107 konsept turu

**Bu doküman kod yazmadı.** Sıradaki adım gerçek implementasyona (K1'den başlayarak) geçmek — sahip onaylarsa.
