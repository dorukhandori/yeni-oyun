# Kiklop Mağarası (2. durak) — konsolide üretim planı

> **Durum:** **2. tur (24 Ağu 2026) — sahip D1–D9'u ve yeni çekirdek mekaniği kapattı.** Bu doküman artık bir öneri seti değil, **implementasyona hazır spec**. Kod yazılmadı, asset üretilmedi, kredi harcanmadı.
> **Tarih:** 2026-08-24 (1. tur: plan · 2. tur: kararların sayıya çevrilmesi)
> **Yazan:** `producer` / `@nile` · alt-ajanlar: `island-designer`/`@cove` (kroki, saklaş noktaları, oda geometrisi), `game-designer`/`@helix` (döngü süresi, DETECT uzlaştırması, tam sayılar), `art-director`/`@iris` (asset listesi, ton, zorunlu Gemini onay kapısı)
> **Tetikleyen:** sahip — *"Şimdi büyük ölçüde ilk adayı bitirdik. İkinci adaya geçeceğiz."* + 24 Ağu'nun D1–D9 karar turu + **"bu adada çok net bir korku teması olacak."**
> **Bu doküman ne değildir:** tasarım otoritesi değil. Otorite dosyaları: `level-cyclops-cave.md` (yerleşim/geometri), **`gdd-cyclops-blinding.md` (körleşme — yeni çekirdek mekanik)**, `gdd-detection-cyclops.md` (algılanma), `tuning.md` §12 (sayılar). Çelişki çıkarsa `docs/design/` kazanır; bu dosya iş planı, asset planı ve mimariyi taşır.
> **Bağlı doküman:** `docs/design/multi-island-concept.md` **§10 (K40 — bağımsız duraklar; §5–§9 arşiv)** · `docs/design/level-cyclops-cave.md` · `docs/design/gdd-cyclops-blinding.md` · `docs/design/gdd-detection-cyclops.md` · `docs/design/tuning.md` §12 · `docs/design/gdd-lotus-island-run.md` (K35, Kiklop kilidi) · `docs/ux/screens.md` §3/§4/§9 · `docs/art/{art-bible,pipeline,asset-registry}.md` · `docs/production/roadmap.md` Faz 2.6b/2.6e

---

## 0.0 🔴 Bu turda kapanan kararlar — özet tablo (hepsi sahip, 24 Ağu 2026)

Aşağıdakiler **kapalıdır.** Yeni bilgi olmadan yeniden açılmaz.

| # | Karar | Sonuç | Nerede işlendi |
|---|---|---|---|
| **D1** | Anlatı çerçevesi | **F3** — toplanabilir = peynir/şarap tulumu (statik prop, `lotus.ts` `Plant` API deseni). Hub kart metni (*"Körleşmeden, tayfanla birlikte çık."*) **aynen kalır**. Gerekçe: gemide bekleyen tayfa aç, erzaksız geçit aşılmaz. **Escort AI yok.** | `level-cyclops-cave.md` §0/§5, §4 asset listesi |
| **D2** | Yakalanma/ezilme cezası | **C2** — çantadaki azık yakalanma noktasının ~1–2 m çevresine **dökülür, yok olmaz**, tekrar toplanabilir. Oyuncu mağara ağzına (D≈4) ışınlanır. **`CAUGHT_MEM_SPIKE` tamamen kaldırıldı.** | `gdd-detection-cyclops.md` §3.4, `tuning.md` §12 |
| **D3** | Unutuş/bellek sistemi | **Bu adada YOK.** `MEMORY`, `FX_VIGNETTE`, haze/vinyet, `DRIFT_*` — hiçbiri Kiklop'ta çalışmıyor. Yerine adaya özgü **körleşme** mekaniği (aşağıda). | `gdd-cyclops-blinding.md` (yeni), `gdd-memory-system.md` §3.4 |
| **🆕** | **Çekirdek mekanik: körleşme** | Kapı durumu = OUT/PRESENT evrelerinin fiziksel karşılığı. **Kapı açık = toplama mümkün; kapalı = saf saklan.** Dev her döngüde **rastgele bir derinliğe** gidip uyur. Her odada **1 saklaş noktası**; orada bile **hareketsiz kalma** kuralı var. Ezilme = yakalanma. Eski oda-bazlı `DETECT_*` çarpanları **aynı zaman çizgisinde** çalışmaya devam eder — **iki katmanlı risk.** | `gdd-cyclops-blinding.md` (yeni otorite) |
| **D4** | Polyphemos asset | **P-C** — tam Tripo mesh + rig, `idle/walk/sleep/settle`, ~80 kredi. **+ yeni standing kural:** bu adanın **her** sahnesi (ada dışı, her mağara odası, iç mekânlar, Polyphemos) önce **Gemini'de konsept çizdirilip sahibe onaylatılacak.** Onaysız hiçbir görsel karar ilerlemez. | §4 (`@iris`) |
| **🆕** | **Korku (horror) teması** | Bu ada **açıkça korku türünde** bir sahne. Lotus'un Ege/painterly sakin tonundan **kasıtlı kopuş**. Art yönü, ses tasarımı, Polyphemos'un sunumu ve `art-bible.md` ile ton ilişkisi buna göre ele alınacak. | §4.0 (`@iris`) + §7'de açık soru |
| **D5** | Mimari | **A3 (kademeli)** — yeni `src/stops/` dikişi + `?stop=` yönlendirmesi. Kiklop `Stop` arayüzünü baştan uygular; **Lotus'a dokunulmaz**, ince adaptörle kalır. Mağara gökyüzü/bulut/güneş/deniz yüklemediği için Lotus'tan **daha hafif** koşmalı. | §5 |
| **D6** | `MEM_HUB_CAP` | **N/A — kapandı, konusuz kaldı.** Soru "hub'a dönüşte taşınan unutuşa tavan gerekir mi" idi; K40 duraklar arası taşımayı tamamen kaldırdı, D3 de bu adadan unutuşu sildi. Tavanı olacak bir değer yok. | — |
| **D7** | Sıralama | **Kiklop önce, K-A (Lotus tek-koşu sadeleştirmesi) sonra.** *(1. turun önerisi "K-A önce" idi — sahip tersini seçti.)* ⚠️ İkisi aynı dosyalara dokunuyor (`constants.ts`/`game.ts`/`menu.ts`), **paralel yapılmamalı.** | §6 |
| **D8** | Roadmap tahmini | **Güncellensin.** Faz 2.6b/2.6e'nin eski "3 oturum"u gerçek dışı; yeni rakam §6'da. | `roadmap.md` Faz 2 |
| **D9** | `test:assets` manifest kırmızısı | **Kiklop assetleri eklenmeden önce temizlensin.** Takipsiz `ship_hero_*`/`water_*` GLB'ler. İş kalemi §6'da; sahibi `@axiom`/`@iris`. | §4.4, §6 |
| **D10** | Polyphemos'un görünürlüğü *(25 Ağu)* | **Doğrudan görünen, somut tehdit.** PRESENT boyunca **sürekli sahnede**, ışığın izin verdiği ölçüde **net görülüyor** — silüet/gizem dili değil. Eski "yalnız CAUGHT'ta ~0,6 s beliriş" kararı **kaldırıldı**. P-C'nin ~80 kredilik yatırımı **güçlendi**. | `gdd-cyclops-blinding.md` §7.1 |
| **D11** | Korku teması ↔ `art-bible.md` §9 *(25 Ağu)* | **Karartma yasağı Kiklop için resmen açıldı.** Tam karartma + karanlık-tehdit dili **serbest ve istenen**; genel kural diğer duraklar için bozulmadı. Hâlâ yasak: mor-kristal paleti, kırmızı flaş, can barı, stroboskop. | `art-bible.md` §4 + §9 istisna kutusu |
| **🆕** | **Kayıp koşulu** *(25 Ağu)* | **`CYCLOPS_CRUSH_CAP` = 3.** Bir denemede 3. ezilmede durak **başarısız** → hub, **o denemedeki tüm ilerleme (teslim dahil) sıfırlanır**, sınırsız tekrar. Ekranda gösterilmez (P2). `@helix`'in "kayıp yok" türetmesi **reddedildi**. | `gdd-cyclops-blinding.md` · `tuning.md` §12 |
| **🔴 K40** | **Yapısal** | **M7'nin "3 duraklı tek koşu"su geçersiz.** Lotus'u bir kez bitirmek Kiklop'u **kalıcı** açar; sonrasında her durak **hub'dan bağımsız seçilen, kendi başına biten bir oturum** — aralarında hiçbir durum (unutuş, körleşme, envanter, ilerleme) taşınmaz. | `multi-island-concept.md` §10 + 7 dosyada işaretlendi (§0.4) |

---

## 0. Önce dürüstlük — bu planın zemini

### 0.1 Uzman alt-ajanlar — 2. turda çağrıldı

**1. tur (plan):** `Agent` aracı mevcut değildi, bölümler tek oturum tarafından ilgili uzmanın kontrol listesi uygulanarak yazıldı.

**2. tur (24 Ağu, bu tur):** araç mevcuttu ve üç uzman **gerçekten çağrıldı** — `island-designer`/`@cove` (§1 geometri + saklaş noktaları, `level-cyclops-cave.md`), `game-designer`/`@helix` (§2 sayılar + döngü + DETECT uzlaştırması, `gdd-cyclops-blinding.md` + `tuning.md` §12), `art-director`/`@iris` (§4 ton + asset + onay kapısı). Çıktıları `@nile` tarafından her birinin **kendi kabul kriterine göre** doğrulandı; sonuç §0.5'te.

**Hâlâ çağrılmayan:** `technical-director`/`@axiom` (§5 mimari kararı A3 sahip tarafından zaten verildi — `@axiom`'un işi kalan kısmı **uygulama turunda** doğrulamak, bkz. §6 adım 2) ve `ux-designer`/`@tide` (§3.2 metinleri + hub akışı, §6 adım 9'da).

### 0.2 Kodda Kiklop'a ait ne var — ölçüldü

`grep -rn "CYCLOPS\|DETECT\|ISLAND_RELIEF" src/` → **sıfır sonuç.** Bugün var olan tek şey:

| Ne | Nerede | Durum |
|---|---|---|
| Hub kartı (görsel) | `index.html` `#cardCyclops` | Var — ama `<div>`, **listener yok**, yapı gereği inert (`menu.ts` yorumu bunu açıkça söylüyor) |
| Kilit rozeti | `menu.ts` `setCyclopsReady()` | Var — `startDepart()`'ta `true`, `goTitle()`'da `false`. Oturum-içi, kalıcılık yok (K30 hibrit ile uyumlu) |
| Kart görseli | `public/assets/ui/ui_hubmap_cyclops_01_albedo_512.png` | Var |
| Kart metni | `index.html` | *"Körleşmeden, tayfanla birlikte çık."* — **bkz. §1.1, bu cümle level-spec ile çelişiyor** |
| `MEM_ISLAND_RELIEF_PCT` | — | **Kodda yok.** Sadece dokümanda. Hub'a dönüşte unutuş bugün hiç taşınmıyor, çünkü taşınacak ikinci durak yok |
| Mağara, algılanma, Polyphemos | — | **Hiçbiri yok.** Sıfırdan |

Yani: 2. durak **%0 uygulanmış**, tasarım tarafı ise **%80 hazır ve kilitli.** Bu iyi bir başlangıç noktası — bu plan sıfırdan tasarım yapmıyor, hazır tasarımı üretime çeviriyor.

### 0.3 Sürüklenme uyarısı — Lotus 14 Ağustos'tan beri değişti

`level-cyclops-cave.md` ve `gdd-detection-cyclops.md` **14 Ağustos**'ta yazıldı. O günden bu yana Lotus Adası iki kez yeniden çerçevelendi (`gdd-lotus-island-run.md` K35, sonra `gdd-lotus-island-rebuild.md` Med-Cezir; ikincisinin A2–A5'i 23 Ağustos'ta canlıya alındı). Kiklop dokümanları bu değişikliklerin **hiçbirini görmedi.** Somut sonuçlar:

1. **"Hub yok, kesintisiz geçiş" varsayımı ölü.** `level-cyclops-cave.md` §0 hâlâ *"Hub yok — oyuncu Lotus Adası'ndan gemiye binip kesintisiz buraya geçer"* diyor. `multi-island-concept.md` §9 bunu aynı gün tersine çevirdi ve **hub canlıda çalışıyor.** Kiklop'a giriş hub kartından olacak. §8'deki "ilk 30 saniye" tablosunun 0–5 s satırı (Lotus'un gemisinden kesintisiz kamera geçişi) bu yüzden **geçersiz**, yeniden yazılmalı (§1.5).
2. **Lotus'un kayıp modeli değişti.** K35'te unutuş dolması durağı bitirmiyor: çanta sıfırlanır, `delivered` kalır, gemi başka kıyıya oturur. Kiklop dokümanları hâlâ K27'nin ("bir durakta unutuş dolarsa tüm koşu biter") kapalı olduğunu varsayıyor — oysa K27 `multi-island-concept.md` §9.5'te **yeniden açıldı ve kapanmadı.** Bkz. §7 açık karar D3.
3. **Lotus alt-hedefi 5'te kilitlendi** (`tuning.md` §3.0, K35). Kiklop'un 4'ü hâlâ 🔬 öneri.
4. **Sahip 22 Ağustos'ta K-A kararını verdi** (tek koşu — Beş yeter kalır, klasik 12'li kalkar) ama **kodda uygulanmadı**: `LOTUS.target` hâlâ `isEdgeRun() ? 5 : 12`, `fullRestart("classic")` hâlâ canlı. Bu Kiklop'u doğrudan blokla*mıyor* ama §5'teki mimari dilim ile aynı dosyalara (`constants.ts`, `game.ts`, `menu.ts`) dokunuyor — sıralama önemli, bkz. §6 uyarı.

### 0.4 K40'ın doküman ayak izi — nerede ne işaretlendi

Yapısal karar (duraklar bağımsız) yedi dosyada iz bıraktı. Hiçbir yerde **silme** yapılmadı — eski metin arşiv olarak duruyor, üstüne "artık geçersiz (K40, 24 Ağu 2026)" notu düşüldü.

| Dosya | Ne işaretlendi |
|---|---|
| `docs/design/multi-island-concept.md` | **Yeni §10** (kararın kendisi + geçersizler listesi + kilit kalıcılığı) · en üste kırmızı uyarı · M7 kutusu |
| `docs/design/gdd-memory-system.md` | Üstbilgi K40 notu · §3.1 madde 1 (`MEM_START` istisnası düştü) · §3.4 Kiklop satırı (**bağ koptu**) · **§3.5 tamamen geçersiz** · §4.4 kayıp finali · playtest tablosu |
| `docs/design/tuning.md` | §3.0 (`RUN_TARGET_TOTAL` düştü) · §5.1 `MEM_START` · §5.2 `MEM_ISLAND_RELIEF_PCT` (**YOK**) · §10 kapanan kararlar (**K40 satırı eklendi**) · §11.4 · ölçüm listesi madde 7 |
| `docs/design/game-concept.md` | §2 Tür/Hedef oturum/Kapsam · Kapanan kararlar tablosu (**K40 satırı eklendi**) · §3 kayıp notu |
| `docs/production/roadmap.md` | **Faz 2.6d düşürüldü** (yerine kilit kalıcılığı, 0,25 oturum) · Faz 2.6e kapsamı büyüdü · **K40 satırı eklendi** · K27 konusuz, K28 revize, K30 madde 1/2/3/5 geçersiz |
| `docs/ux/screens.md` | Üstbilgi: §3.3'ün **C (Hibrit)** kilidi geçersiz → **kalıcı kilit**; §10'un durak/koşu kayıp ikilemi (S3) konusuz; "Koşu sonu" ekranı karşılıksız |
| `docs/ux/user-flow.md` | Üstbilgi: "koşu boyunca 3 kez tekrarlanan döngü" · §10 açık kararı **konusuz** · 8. adımın "Koşu sonu" dalı **karşılıksız** · kilit modeli → kalıcı |
| `docs/ux/ia.md` | Üstbilgi: **"Koşu sonu" düğümü** + **U6/M4** girişleri karşılıksız · "durak-bazlı mı koşu-bazlı mı" konusuz · Hub kilit mekanizması **kapandı** |
| `docs/design/level-cyclops-cave.md` | Üstbilgideki *"unutuş `MEM_ISLAND_RELIEF_PCT` ile kısmen taşınmış gelir"* ve §8'in kesintisiz-geçiş tablosu (`@cove` düzeltti) |

**Bilerek dokunulmayan:** `CLAUDE.md` ve `.cursor/rules/project.mdc`'nin kimlik paragrafı — bunlar korumalı konfigürasyon dosyaları; bir ajan mesajı onları değiştirmeye yetki veremez. **Sahibe not:** `CLAUDE.md`'nin "What this is" bölümü hâlâ tek-durak/eski-hub dilini taşıyor; K40 sonrası güncellenmesi gerekiyor, ama bunu **sahibin kendisi** yapmalı.

**Ek olarak işaretlenen iki UX dosyası:** `docs/ux/user-flow.md` (üstbilgi — "koşu boyunca 3 kez" döngüsü, §10 açık kararı, 8. adımın "Koşu sonu" dalı, kilit modeli) ve `docs/ux/ia.md` (üstbilgi — "Koşu sonu" düğümü + U6/M4, kilit mekanizması). **Toplam işaretlenen dosya: 9.**

**Hâlâ eski dili taşıyan, bu turda dokunulmayan üç ikincil dosya** (düşük risk, karar taşımıyorlar — istenirse ayrı bir temizlik turu): `docs/design/tuning-reconciliation.md` (`RUN_TARGET_TOTAL`/`MEM_ISLAND_RELIEF_PCT` satırları bir özet tablosunda), `docs/design/lotus-exploration-reframe.md` ("Kiklop/Sirenler K27'yi kendi duraklarında tutabilir"), `docs/art/specs/lot-52-hero-home-hull.md` ("12 sayısı koşu kilerinde kalır (`RUN_TARGET_TOTAL`)").

---

## 1. Ada / level tasarımı (`island-designer` bakışı)

> ## 🔴 §1'in tamamı devredildi — otorite artık `docs/design/level-cyclops-cave.md`
>
> **24 Ağu 2026, 2. tur:** `island-designer`/`@cove` çağrıldı ve level-spec'i baştan yazdı. Bu bölümün 1. turda ürettiği kroki/ölçü/analiz **oraya taşındı ve kesinleştirildi**; aşağısı **arşiv** — bir sayı alacaksan level-spec'ten al, buradan değil.
>
> **`@cove`'un kapattığı ve implementasyona hazır hâle getirdiği şeyler:**
>
> | Konu | Nerede | Ne oldu |
> |---|---|---|
> | Eksen sözleşmesi (`D = z − z_eşik`, X, Y) | §1.1 | Bağlayıcı kural olarak yazıldı |
> | **Kroki ↔ tablo çelişkisi** (§2 "ağıllar 22–42" vs §1.4 "26–44") | §1.2 + §2 | **Çözüldü** — üretim planının sayıları kazandı, ASCII kroki ona göre yeniden çizildi. Tek tablo kaldı |
> | **Saklaş noktaları** (yeni mekaniğin gereği) | §3.2–3.5 | Somut `(x, D)` + yarıçap: ağız `(4,6)` r1.2 · depo `(5,19)` r1.5 · ağıllar `(5.5,35)` r1.5 · iç nöy `(4,51)` r1.5 |
> | Boğazlarda saklaş noktası | §3.6 | **Yok** — bilinçli karar + "boğazda kapı kapanırsa ne olur" cevaplandı |
> | **Ocak konumu** (§1.4'ün ölçtüğü "1 m'lik kullanılamaz gölge cebi" hatası) | §3.4 | **Düzeltildi** — ocak `(x=−4, D=35)`'e kaydırıldı, doğu duvarında gerçek ~5 m gölge şeridi oluştu. `CYCLOPS_LIGHT_RADIUS`'a dokunulmadı |
> | **Kapı ışık haritası** | §4.6 | `doorGlobal(D) = clamp01(1 − D / CYCLOPS_DOOR_LIGHT_REACH)`, `REACH = 45.0 m` — iç nöy'ün kapı açıkken bile loş kalması buradan düşüyor |
> | Devin rota hattı + 3 durma noktası | §4.7 | `x = 0` (boğazların 4 m'si zorunlu kılıyor); durma noktaları depo `(0,15)` · ocak `(−4,35)` · iç nöy `(0,60)`. Saklaş noktalarına mesafe **hepsi ≥6 m** |
> | **Erişim süreleri** (`@helix`'in döngü kalibrasyonu girdisi) | §4.8 | Ham tablo — kritik sayı: oda-içi en uzak azıktan saklaş noktasına **2.3–2.7 s**, `CYCLOPS_PHASE_RETURN`'ün alt sınırı |
> | 7 azığın koordinatları + tipleri | §5.1 | `LOTUS_MIN_SPACING` (3.0 m) kontrol edildi; en yakın çift ~7.3 m, kısıt bağlamıyor |
> | Düşen azığın konum kuralı (D2) | §5.2 | Geçerli zemine snap, duvar içine düşmez |
> | **Kilitlenme kontrolü** | §5.3 | D2 sonrası yapısal olarak bitirilemez durum **kalmadı** — hesaplandı |
> | Kapının `[H]`/`[O]` etiketi | §9 | **Düzeltildi** — kapının kapanması `[H]` (IX.240 civarı); eski "dekor" kararı yanlışlıkla `[O]`'ya kaymıştı |
>
> **`@cove`'un `@helix`'e devrettiği üç flag** (level-spec §12 madde 9–11): `gdd-detection-cyclops.md`'nin unutuş bağlarının temizlenmesi · ikili `lit` bayrağı ↔ sürekli `doorGlobal` eşleşmesi · `CYCLOPS_LIGHT_RADIUS_PRESENT` × `PRESENT_MULTIPLIER` çift-cezalandırma riski.
>
> **`@nile`'ın doğrulama turunda yakaladığı çelişki** (level-spec §12 madde 12, yeni): §4.3'ün *"Polyphemos PRESENT boyunca hiç görünür durmuyor, yalnız CAUGHT'ta 0,6 s"* kilitli kararı yeni mekanikle **çelişiyor** — dev artık PRESENT boyunca fiilen mağarada yürüyor, uyuyor ve ona **fiziksel olarak çarpılabiliyor**. → **§7.2 D10, sahibe açık soru.**

---

### 1.1 🔴 En kritik bulgu — kart metni ile level-spec çelişiyor *(1. tur — **KAPANDI: D1 = F3**, aşağısı arşiv)*

Canlıdaki hub kartı: **"Körleşmeden, tayfanla birlikte çık."**
`level-cyclops-cave.md` §0.2/§5'in tarif ettiği durak: **tek başına gizlice girip peynir/şarap tulumu çalıp kaçmak.**

Bu iki cümle aynı seviyeyi tarif etmiyor. Kart metni 23 Ağustos'ta sahip onayıyla canlıya alındı; level-spec 14 Ağustos'ta kilitlendi. **İkisi de "kilitli" sayılıyor ve birbirini geçersiz kılıyor.** Bu bir metin detayı değil: toplanabilir öğenin **ne olduğunu** belirliyor, o da mağaranın geometrisini, asset listesini ve mühendislik maliyetini belirliyor.

Üç çerçeve, sonuçlarıyla:

| | **F1 — Azık soygunu** (14 Ağu doku) | **F2 — Tayfa kurtarma** (kart metni birebir) | **F3 — Azık, tayfa gerekçesiyle** (hibrit) |
|---|---|---|---|
| **Toplanabilir** | Peynir tekeri / şarap tulumu — statik prop | Unutulmuş tayfa — takip eden/taşınan aktör | Peynir/tulum — statik prop |
| **Neden oradasın** | Erzak lazım, Polyphemos dönmeden al ve kaç | Tayfan mağarada kaldı, çıkar | Gemide bekleyen tayfa aç; erzaksız geçit aşılmaz |
| **"Körleşme" ne demek** | — (kart metni değişmeli) | Polyphemos'un körlüğü / senin körlüğün, bulanık | **Unutuş sisinin kendisi** — `FX_VIGNETTE`/haze zaten "göremez hale gelmek" gibi görünüyor, kart metni mekanik olarak *doğru* oluyor |
| **Mühendislik** | En düşük — `lotus.ts`'in `Plant` API'si birebir kopyalanır (`level-cyclops-cave.md` §10) | **En yüksek** — takip/escort davranışı, çarpışma, "kayboldu" durumu; `thallope.ts` yürüyüş kodu var ama escort AI yok | En düşük (F1 ile aynı) |
| **Asset** | Peynir + tulum propu (2 adet, ucuz) | 3–4 tayfa mesh + animasyon — **yeni Tripo rig turu** (~50–90 kredi, `char_doryseus` yolunun tekrarı) | Peynir + tulum propu |
| **Kart metni** | Değişmeli (sahip onaylamıştı) | Aynen kalır | Aynen kalır |
| **Odysseia bağı** | [H] doğrudan — sepetteki peynirler IX.219 | [O] icat — kanonda tayfa kurtarılmıyor, yeniyor | [H] doğrudan + [O] hafif gerekçe |

**Önerim: F3.** Gerekçe: (a) canlı kart metnini bozmuyor — sahip o cümleyi görüp onayladı; (b) "körleşme"yi mekanik olarak **doğru** kılıyor, çünkü unutuş sisi zaten görsel körleşmedir ve `CAUGHT_MEM_SPIKE` (30 puan) tek başına bir eşik atlatabiliyor — yani yakalanmak seni gerçekten körleştiriyor; (c) escort AI'sını (bu projede hiç emsali olmayan, en büyük tek mühendislik kalemi) kapsam dışında tutuyor; (d) 14 Ağustos doküman setinin **tamamını geçerli bırakıyor** — sadece bir gerekçe cümlesi ekleniyor.

**Bu senin kararın.** F2 en güçlü anlatı ama tek başına bu durağın kapsamını kabaca 1,5 katına çıkarır ve escort davranışı solo projede en sık batan kalemdir.

### 1.2 🔴 İkinci kritik bulgu — mevcut sayılar kilitlenebilir (unwinnable) bir duruma izin veriyor *(1. tur — **KAPANDI: D2 = C2**; `@cove` level-spec §5.3'te kilitlenmenin kalmadığını hesapladı. Aşağısı arşiv)*

Bu, tasarım setinde ölçülerek bulunan **gerçek bir hata**, görüş farkı değil.

Kilitli/önerilen sayılar: `CYCLOPS_ISLAND_TARGET = 4` · `CARRY_CAPACITY = 4` (kilitli, tüm adalarda) · `CYCLOPS_ITEM_TOTAL = 7` 🔬 · azık **yenilenmez** (`level-cyclops-cave.md` §5) · `CAUGHT_ITEM_LOSS = true`, çantadaki **tüm** öğeler kaybolur ve **havuza geri dönmez** (`gdd-detection-cyclops.md` §3.4 madde 2).

Senaryo: oyuncu 4 azığı toplar, gemiye dönerken boğazda yakalanır. Çanta 0'a döner, 4 öğe yok olur. Sahnede kalan: 3. Teslim edilmiş: 0. Ulaşılabilir maksimum artık **3 < 4**. **Durak matematiksel olarak bitirilemez** ve oyunda bunu söyleyen hiçbir şey yok — oyuncu kalan 3'ü toplayıp boğazda bekler.

Bu marjinal bir köşe durumu değil: level-spec'in kendi §7'si *"en az bir yakalanma normal kabul edilmeli"* diyor ve §7 "hedef = kapasite" tasarımı oyuncuyu tam olarak **4'ü birden taşımaya** teşvik ediyor. Yani en olası ilk-oyun rotası, en olası kilitlenme rotası.

Dört çözüm:

| | Ne | Maliyet | Yan etki |
|---|---|---|---|
| **C1** | `CYCLOPS_ITEM_TOTAL`'ı 7 → **12**'ye çıkar (target + carryCap × 2 tolere edilen yakalanma) | Sıfır kod, sadece sayı | "Dar tampon" niyetini (§5'in kendi gerekçesi) yok eder; her şeyi topla davranışı geri gelir |
| **C2** ✅ | **Yakalanınca azık yere düşer, yok olmaz** — yakalanma noktasında zemine saçılır, tekrar toplanabilir | Küçük — aynı statik `Plant` nesnesini yeni konuma taşı, `visible = true` | Ceza hâlâ ağır (tehlikeli odaya geri dönmen gerekir + `CAUGHT_MEM_SPIKE` 30 + `CAUGHT_RESPAWN` mağara ağzına) ama asla terminal değil |
| **C3** | Kayıp kısmi: `ceil(carried/2)` ya da sabit 2 öğe | Sıfır kod | "Yakalanmak büyük bir olay" hissini yumuşatır; hâlâ 2 yakalanmada kilitlenebilir (7−2−2=3) |
| **C4** | Teslim edilmiş öğeler asla kaybolmaz + hedefe kadar yeter garantisi için tur içi respawn | Orta | Azığın "yenilenmez" ton kararını (§5) bozar |

**Önerim: C2.** Gerekçe: (a) K35 Lotus'un **zaten kanıtladığı desen** — unutuş dolunca çanta sıfırlanır ama ada yok olmaz, *yeniden konumlanır* (`gdd-lotus-island-run.md`); C2 aynı felsefe, (b) tematik olarak birebir doğru — kaçarken sepeti düşürdün, (c) `CAUGHT_MEM_SPIKE` zaten asıl cezayı taşıyor, envanterin *kalıcı yok oluşu* fazladan ve tehlikeli, (d) `CYCLOPS_ITEM_TOTAL = 7`'yi ve dar tampon niyetini korur. Uygulama: `onCaught` çantadaki her öğeyi yakalanma konumunun ~1–2 m çevresine geri koyar.

**Bu bir `game-designer` kararı** (`gdd-detection-cyclops.md` §3.4 madde 2'yi değiştirir) — sahip onayı gerekiyor. Ama **bir çözüm seçilmeden 2.6e implementasyonuna başlanmamalı**; yoksa ilk playtest'te kilitlenen bir durak çıkar.

### 1.3 Kapanan / kapanmayan açık sorular (`level-cyclops-cave.md` §12)

| # | Soru | Durum |
|---|---|---|
| 1 | Anlatı çerçevesi | **Açık — sahip kararı.** §1.1'de üç seçenek + F3 önerisi. Artık sadece ton sorusu değil: kart metni yüzünden mekanik bir soru |
| 2 | Yakalanma sonrası ışınlanma noktası | **Kapandı** — mağara ağzı (D≈4), `gdd-detection-cyclops.md` §3.4 madde 4 |
| 3 | `CYCLOPS_ITEM_TOTAL` 6/7/8 | **Kısmen kapandı: 7 kalsın**, ama §1.2'nin çözümü seçilmeden anlamsız. C2 seçilirse 7 doğru; C1 seçilirse 12 |
| 4 | Polyphemos görünürlüğü | ~~Kapandı (14 Ağu) — CAUGHT anına bağlı kısa beliriş~~ → **🔴 TERSİNE KAPANDI (D10, 25 Ağu, sahip): PRESENT boyunca sürekli, doğrudan görünür.** Bkz. §4.4 |
| 5 | "Güvenli minimal rota" keşfediliyor mu | **Playtest'e kalmış** — kapatılamaz, ölçülür. §6'da ölçüm maddesi var |
| 6 | Koca kaya dekor mu | **Kapandı** (14 Ağu, sahip) — dekor + PRESENT'te gölge/gıcırtı ipucu |
| **7 (yeni)** | Yakalanma envanteri yok mu ediyor, düşürüyor mu | **Açık — §1.2, sahip/`@helix` kararı** |
| **8 (yeni)** | Hub'dan girişte açılış beat'i ne | **Kapandı bu dokümanda — §1.5** (level-spec §8'in "kesintisiz geçiş" tablosu hub yüzünden geçersiz) |

### 1.4 Kroki — ölçülü hâli *(1. tur — **DEVREDİLDİ**, otorite: `level-cyclops-cave.md` §1.2/§2/§4.6–4.8. Aşağısı arşiv; `CYCLOPS_CYCLE` uyarısı `@helix`'e girdi oldu)*

Level-spec §2'nin krokisi doğru; aşağıda `gameplay-programmer`'ın doğrudan sayıya çevirebileceği hâli. **Eksen sözleşmesi:** mağara `+Z` yönünde derinleşir, `D = z − z_eşik`. Genişlik `X`, yükseklik `Y`. Lotus'un dünya uzayından **tamamen ayrı bir sahne** (bkz. §5).

| Bölge | D (m) | Genişlik X (m) | Tavan Y (m) | Öğe | Işık | Not |
|---|---|---|---|---|---|---|
| Koy / gemi | −20 … −8 | serbest, açık | gökyüzü | 0 | gün ışığı | Teslim + çıkış. `SHIP_AURA`/`MEM_SEA_RECOVER` eşdeğeri burada çalışır (P4 kilitli) |
| Patika | −8 … 0 | 6 | açık | 0 | gün ışığı | Kısa; "son nefes" alanı |
| **Mağara ağzı** | 0 … 8 | 10 | 6 → 4 | 0 | **aydınlık** (gün ışığı sızar) | Öğretici. PRESENT'te çarpan **yok**. `CAUGHT_RESPAWN` = D≈4 |
| **Depo** (antişambr) | 8 … 22 | 12 | 4 | **2** | orta — ağız ışığının kuyruğu | PRESENT'te çarpan **yok** (`gdd-detection-cyclops.md` §3.2) |
| Boğaz A | 22 … 26 | **4** | 3 | 0 | gölge | Dar geçit — görüş kesme, şaşırtma |
| **Ağıllar / Ocak** | 26 … 44 | **14** (en geniş) | 7 | **3** | **ocak = en yoğun aydınlık** (`CYCLOPS_LIGHT_RADIUS` 6 m) | PRESENT'te `×3.0`. **Gölge cebi:** doğu duvarı, ocaktan ≥7 m, ~4×3 m |
| Boğaz B | 44 … 48 | 4 | 3 | 0 | gölge | |
| **İç nöy / Uyuma köşesi** | 48 … 65 | 9 | 5 | **2** | zayıf — tek meşale | PRESENT'te `×3.0`. En değerli azık |

**Toplam yürüyüş mesafesi (gemi → en derin öğe → gemi):** ~170 m. `PLAYER.speed = 4.5 m/s` ile saf yürüyüş ~38 s; gölge beklemeleri + hasat (4 × `HARVEST_HOLD` 1.2 s) ile ustalık turu **~3–4 dk** — level-spec §7'nin tahminiyle uyuşuyor. ✅

**Doğrulama — `CYCLOPS_CYCLE` (95 s) bu geometriye oturuyor mu:** gemiden (D=−15) saf yürüyüş gidiş-dönüş süreleri — depo (D≈15) **13 s**, ağıllar (D≈35) **22 s**, iç nöy (D≈56) **32 s**. DIŞARIDA evresi 58 s. Yani **üç odanın hepsi teorik olarak tek bir DIŞARIDA penceresine sığıyor** — iç nöy dahil (32 s + 2,4 s hasat = ~35 s < 58 s). Riski taşıyan şey mesafe değil, `CYCLOPS_PRESENT_MULTIPLIER`'ın (×3.0) yalnız ağıllar/iç nöyde uygulanması ve oyuncunun evre saatini **göremiyor** olması (yalnız RETURN telegrafını duyuyor). Bu hâlâ istenen risk eğrisini veriyor ✅ ama şu iki notla:

> ⚠️ **Bulunan gerçek sorun — döngü öğrenilebilir ama koşu onu öğrenmeye yetmiyor.** Ustalık turu ~3–4 dk (level-spec §7); `CYCLOPS_CYCLE` 95 s. Yani **bir koşuda yalnızca ~2–2,5 tam döngü** görülüyor. P3'ün ("sürpriz mekanik yok, sürpriz zamanlama var — döngü öğrenilebilir") işe yaraması için oyuncunun deseni gözlemleyecek kadar tekrar görmesi gerek; 2 tekrar bunun için az. İki çözüm: (a) `CYCLOPS_CYCLE`'ı ~60 s'e indir (OUT 36 / RETURN 6 / PRESENT 18 — oranlar korunur, koşu başına ~4 döngü), (b) öğrenmenin **koşular arası** olduğunu kabul et — hub durağı tekrar oynatıyor, oyuncu ikinci girişinde deseni biliyor. **Öneri: (b) + playtest'te ölç.** (a) bedava değil: PRESENT 18 s'e inince iç nöy turu (35 s) neredeyse hiç güvenli pencereye sığmaz ve derin rota fiilen kapanır. Bu bir `@helix` kararı, adım 10'un ölçüm listesine eklendi.

**Doğrulama — `CYCLOPS_LIGHT_RADIUS` (6 m) mağara genişliğine oturuyor mu:** ağıllar odası 14 m geniş, ocak merkezde → aydınlık çapı 12 m, iki yanda ~1 m gölge kalıyor. **Gölge cebi bu haliyle 1 m'lik bir şerit — kullanılamaz.** Düzeltme: ya ocak merkezden 4 m yana kaydırılır (doğuda ~5 m gölge kalır, cep gerçek olur) ya da `CYCLOPS_LIGHT_RADIUS` 5.0'a iner. **Öneri: ocağı kaydır**, yarıçapa dokunma — yarıçap paylaşılan bir sabit, geometri yerel. `@helix` onayı gerekmez, bu bir yerleşim kararı.

### 1.5 Giriş / çıkış akışı — hub'lı hâli (level-spec §8'in yerine)

Level-spec §8'in 0–5 s satırı ("Lotus'un gemisinden kesintisiz kamera geçişi") hub kararı yüzünden geçersiz. Yerine, `screens.md` §3.2/§4'ün zaten tarif ettiği akış:

```
Hub → [Kiklop kartı, "Kilidi açıldı"] → Açılış overlay (§4) → play → ...
   ├─ 4 teslim + gemide E  → Ayrılış (§9) → Hub, Sirenler kilidi açılır
   └─ unutuş dolar         → §7 D3'ün cevabına göre (Lotus deseni ya da K27)
```

| Süre | Ne olur | Ne öğretir |
|---|---|---|
| — | **Açılış overlay** (`screens.md` §4, Lotus'un A3 perdesi ile aynı aile): 1–2 satır + challenge beyanı (§3.2) | Neden buradasın, ne başaracaksın |
| 0–6 s | Kontrol koyda, gemi arkanda, mağara ağzı önünde. Dışarısı güvenli | Yer, yön |
| 6–14 s | Ağızdan içeri; ışık düşer, ses değişir (dışarıda dalga → içeride damla + yankı) | Eşik geçildi |
| 14–22 s | Depoda ilk azık göz hizasında; `E — al` (aynı tuş, aynı `HARVEST_HOLD`) | Fiil değişmedi |
| 22–30 s | İlk toplama sırasında uzaktan gürleme/ayak sesi (evre değişmese bile) | Burada birisi var — P2'nin bu adadaki ilk uygulaması |

**30. saniyede oyuncu:** toplama fiilinin aynı, ortam kuralının farklı olduğunu **hissetmiş** olmalı — eğitim metniyle değil.

**Hub kartını "canlandırma" işi (kod):** `#cardCyclops` `<div>` → `<button>`; `menu.ts`'e `onSelectCyclops` handler'ı; kilitliyken Enter'a basılırsa `screens.md` §3.2'nin istediği görsel "hayır" + gerekçe metni (*"Önce Lotus Adası'ndan kurtul"*) — bugün **sessiz reddetme** var, bu zaten mevcut bir UX eksiği.

---

## 2. Oyun mantığı / mekanikler (`game-designer` bakışı)

### 2.1 Ne yeniden kullanılıyor, ne yeni — envanter

> **⚠️ Bu tablo 24 Ağu 2026'da D3 ile büyük ölçüde değişti** — ilk dört satır tersine döndü.

| Sistem | Kaynak | Kiklop'ta |
|---|---|---|
| Unutuş çekirdeği (`MEMORY`, eşikler, histerezis, `MEM_GRACE`) | `gdd-memory-system.md` | 🔴 **YOK (D3).** ~~"Aynen — tek kaynak ilkesi"~~. Bu adada unutuş diye bir değer **hiç yok**; `st.memory` bu durakta okunmaz/yazılmaz |
| Unutuş sunumu (`FX_VIGNETTE`, haze, ghost/nefes) | `tuning.md` §5.4, `hazePass.ts` | 🔴 **YOK (D3).** ~~"Aynen — kart metnindeki körleşme bu"~~. **"Körleşme" artık bambaşka bir şey:** mağara kapısının kapanmasıyla gelen fiziksel karanlık (`gdd-cyclops-blinding.md`), unutuş sisi değil |
| **Körleşme — kapı döngüsü, saklaş noktaları, hareketsizlik kuralı** | `gdd-cyclops-blinding.md` | ✅ **YENİ — bu durağın çekirdek mekaniği** (24 Ağu 2026) |
| Toplama fiili (`E`, `HARVEST_HOLD` 1.2 s, `cancelMove`) | `gdd-lotus-collection.md` | **Aynen** — yeni tuş yok. ⚠️ **Tek fark:** yalnız kapı **açıkken** çalışır; PRESENT'te toplama devre dışı |
| `CARRY_CAPACITY` = 4 | kilitli | **Aynen** |
| Teslim (gemiye git, otomatik) | `ship.ts` | **Aynen**, tek gemi |
| Yürüyüş sapması `DRIFT_*` | `tuning.md` §5.3 | 🔴 **YOK (D3)** — unutuşa bağlıydı, unutuş yok. ~~"Aynen (ada-bağımsız)"~~ |
| Sanrı figürleri `HALLUCINATION_*` | `gdd-lotus-hallucination.md` | ❌ **Yok** — yalnız Lotus (`tuning.md` §13 açıkça söylüyor) |
| Lotus evre döngüsü (`LOTUS_CYCLE`, olgunlaşma/solma) | `lotus.ts` | ❌ **Yok** — azık statik, yenilenmez |
| Gelgit / Med-Cezir döngüsü | `gdd-lotus-island-rebuild.md` | ❌ **Yok** — Lotus'a özgü |
| K35 forget event (gemi başka kıyıya oturur) | `gdd-lotus-island-run.md` | ❌ **Yok** — Lotus'a özgü. **Ama Kiklop'un unutuş-dolma davranışı hâlâ tanımsız, bkz. §7 D3** |
| Höyük/taş ritüelleri, gelgit kadranı, sahil taşları | `hillPuzzle.ts`, `steppingStones.ts`, `shoreStones` | ❌ **Yok** |
| **Algılanma `DETECT_*`** | `gdd-detection-cyclops.md` | ✅ **YENİ — bu durağın tek yeni sistemi** |
| **Polyphemos evre saati `CYCLOPS_PHASE_*`** | aynı | ✅ **YENİ** |
| **`onCaught` olayı** | aynı | ✅ **YENİ** — ama artık envanteri **yok etmiyor**, yere döküyor (D2/C2). Projede ilk istemsiz envanter **taşıma** olayı |
| ~~**`MEM_ISLAND_RELIEF_PCT` uygulaması**~~ | ~~`multi-island-concept.md` §9.2~~ | 🔴 **DÜŞTÜ (K40).** Duraklar arası hiçbir durum taşınmıyor; sabit **yok**, iş kalemi (roadmap 2.6d) **kapatıldı** |

**Okuma:** bu durağın çekirdek döngüsü Lotus'un **aynısı** (yürü → E ile al → gemiye taşı → teslim et). Yeni olan tek şey, o döngünün üstüne binen bir baskı vanası. Bu, `multi-island-concept.md` §6/M3'ün "her durak ortak omurgaya kendi twist'ini ekler, yerini almaz" ilkesinin birebir uygulaması — ve mühendislik açısından iyi haber: **yeni bir oyun yazmıyoruz, bir sistem ekliyoruz.**

### 2.2 Algılanma — implementasyona hazır özet

`gdd-detection-cyclops.md` tam sözleşmedir; aşağısı onun tek sayfalık uygulama özeti.

**Durum:** `detect: number` (0…100), `phaseT: number` (0…95 s), `caught: boolean` (tek karelik olay).

**Her adımda:**
```
lit    = (oyuncu herhangi bir ışık kaynağının CYCLOPS_LIGHT_RADIUS'u içinde) || (bölge = mağara ağzı)
moving = input.wasd basılı (hız eşiği değil — tuş durumu, tutarlılık için)
base   = lit ? (moving ? 12.0 : 4.0) : (moving ? 3.0 : 0.0)      // puan/s
mult   = phase == OUT ? 1.0 : phase == RETURN ? 1.5
       : (bölge ∈ {ağıllar, iç nöy} ? 3.0 : 1.0)                  // PRESENT
detect = clamp(detect + (base*mult - (base == 0 ? DETECT_DECAY : 0)) * dt, 0, 100)
```
> ⚠️ **Formül belirsizliği — `@helix` netleştirmeli.** `gdd-detection-cyclops.md` §4.1 `DETECT_DECAY`'i *"yalnızca hiçbir oda-bazlı risk yokken"* uygulanır diye yazıyor, ama §3.3'ün "gölge cebinde bekle, DETECT düşsün" beklenen davranışı **ağıllar odasının içinde** geçiyor — o oda PRESENT'te risklidir. İki okuma çelişiyor. **Öneri:** azalma koşulu **oda değil, hücre** olsun — `base == 0` (yani gölge + durgun) olduğu her an `DETECT_DECAY` işlesin, oda fark etmeksizin. Bu, matrisin en güvenli hücresini gerçekten "güvenli" yapar ve level-spec'in gölge cebi dersini besler. Yukarıdaki sözde kod bu okumayı kullanıyor.

**Evre saati:** `phaseT = (phaseT + dt) % 95`; `< 58` → OUT, `< 65` → RETURN, else PRESENT. Deterministik, tohumsuz — P3.

**`detect ≥ 100` → `onCaught()`:**
1. Korku efekti **üçlüsü** (kamera sarsıntısı ~250 ms · tek-shot kükreme · kehribar kenar vurgusu, yükseliş ~200 ms / **sönüş ≥1,5 s**). ⚠️ **Dördüncü bileşen ~~"Polyphemos ~0,6 s beliriş"~~ DÜŞTÜ (D10, 25 Ağu)** — dev zaten sürekli görünüyor, "beliriş" diye bir an yok. 🆕 Üçlü **ezilme başına ağırlaşır** (3. en ağır, `CYCLOPS_CRUSH_CAP`)
2. Çanta → **azık yakalanma noktasının `CAUGHT_DROP_RADIUS` (2 m) çevresine dökülür, YOK OLMAZ** (D2/C2, kapandı). Düşen öğe geçerli zemine snap edilir
3. ~~`memory += 30.0` (`CAUGHT_MEM_SPIKE`)~~ → 🔴 **DÜŞTÜ (D3)** — bu adada unutuş yok, beslenecek kaynak yok
4. Oyuncu → mağara ağzı (D≈4)
5. `detect = 0`
6. 🆕 **`crushCount += 1`.** `crushCount < CYCLOPS_CRUSH_CAP` (3) ise faz **değişmez**, oyun devam eder. **`crushCount === 3` ise durak BAŞARISIZ:** hub'a dönülür ve **denemenin tamamı sıfırlanır** (`delivered` → 0, azık yerleşimi başa, `phaseT`/`detect` sıfır). Kalıcı ceza yok — sınırsız tekrar denenebilir
7. ⚠️ **Ezilme (`CYCLOPS_CRUSH_RADIUS` teması) aynı `onCaught()`'a akar** — tetikleyici farklı (temas vs. `detect ≥ 100`), sonuç birebir aynı

**Duraklat (Esc):** `detect` ve `phaseT` ilerlemez. Mevcut pause zaten dünya saatini donduruyor, tek iş yeni iki değişkeni aynı guard'ın içine almak.

### 2.3 ~~Unutuş taşıma — bu durakta nasıl işliyor~~ — 🔴 **BÖLÜM TAMAMEN DÜŞTÜ (D3 + K40, 24 Ağu 2026)**

> **İki ayrı kararla birden geçersiz oldu:** (a) **K40** duraklar arası taşımayı tamamen kaldırdı — `MEM_ISLAND_RELIEF_PCT` diye bir sabit yok; (b) **D3** bu adadan unutuş sistemini tamamen kaldırdı — taşınacak bir değer de yok.
>
> **Bu, 1. turun burada ölçtüğü iki riski de kapatıyor:** *"kilitlenme riski #2"* (yüksek unutuşla giren oyuncunun `DRIFT` yüzünden gölge cebinde duramaması → besleyen sarmal) **ortadan kalktı**, çünkü `DRIFT` bu adada çalışmıyor. `MEM_HUB_CAP` sorusu (D6) da bu yüzden **N/A**.
>
> **Yerine gelen:** hiçbir şey. Kiklop `MEM_START = 0` eşdeğeri bir durumla değil, **hiç unutuş durumu olmadan** başlar. Bu adanın baskı kaynağı tek başına körleşme + algılanmadır.

*(Aşağısı 1. turun metni — arşiv.)*

#### ~~Unutuş taşıma — bu durakta nasıl işliyor~~

`multi-island-concept.md` §9.2, tetiği "hub'a dönüş" olarak tanımladı. Kodda hiç yok. İlk kez burada gerekiyor:

```
Durağı BAŞARIYLA bitirip hub'a dönüş:   memory_hub = memory_bitiş × (1 − MEM_ISLAND_RELIEF_PCT)   // 🔬 0.4
Durağı BİTİREMEDEN hub'a dönüş:         memory_hub = memory_bitiş                                   // bağışlama yok
Hub'dan bir durağa giriş:               memory_start = memory_hub
```

**Sonuç — sayısal örnek:** Lotus'u unutuş 20 ile bitiren oyuncu Kiklop'a **12** ile girer. Kıl payı bitiren (85) **51** ile girer — ve Kiklop'ta tek bir yakalanma (+30) onu **81**'e çıkarır. `MEM_THRESHOLD_*` eşiklerinin üstünde bir sızma turu yapmak, sisin/sapmanın içinde gizlenmek demek. Bu iyi bir gerilim eğrisi ✅ ama **iki gerçek risk var:**

1. **Kilitlenme riski #2:** yüksek unutuşla giren oyuncu Kiklop'ta `DRIFT` yüzünden gölge cebinde duramaz (sapma onu ışığa taşır), bu da daha çok yakalanma → daha çok unutuş. Kendini besleyen bir sarmal. **Öneri:** `MEM_ISLAND_RELIEF_PCT`'nin **taban** değil **tavan** olarak da çalışması — yani hub'a dönüşte bir de mutlak tavan (`MEM_HUB_CAP`, öneri 🔬 60) uygulansın. `@helix` kararı, playtest'e kadar açık kalabilir.
2. **`MEM_START = 0` semantiği:** `fullRestart()` bugün koşulsuz `st.memory = 0` yapıyor. Taşıma uygulanınca bu satır durağa göre dallanmalı — kolay ama sessizce kaçırılırsa taşıma hiç çalışmaz ve kimse fark etmez. §6'da açık bir kabul kriteri var.

### 2.4 ~~Yakalanma cezasının unutuşla kesişimi~~ — 🔴 **DÜŞTÜ (D3, 24 Ağu 2026)**

> `CAUGHT_MEM_SPIKE` **kaldırıldı**; kesişecek bir unutuş yok. 1. turun buradaki ölçek karşılaştırması (`MEM_ON_HARVEST` 4 · `HALLUCINATION_CONTACT` 10 · `MEM_WITHERED_PENALTY` 12 · `MEM_LOTOPHAGOS_TRADE` 20 · `CAUGHT` 30) **artık yalnızca Lotus Adası için** geçerli — Kiklop o aileden çıktı.
>
> **Bunun doğurduğu gerçek soru** (`@helix`'e devredildi): `CAUGHT_MEM_SPIKE` bu durağın **asıl** cezasıydı; kaldırılınca yakalanmanın bedeli yalnızca *zaman + azığı yeniden toplama zahmeti + korku FX*'e indi. Bu yeterli bir caydırıcı mı, yoksa yakalanma "ucuzladı" mı? `gdd-cyclops-blinding.md`'de karara bağlanıyor; §6 adım 10'un ölçüm listesinde.

*(Aşağısı 1. turun metni — arşiv.)*

#### ~~Yakalanma cezasının unutuşla kesişimi~~

`CAUGHT_MEM_SPIKE = 30` bugünkü tek-seferlik olay ailesinin en büyüğü (`MEM_ON_HARVEST` 4 · `HALLUCINATION_CONTACT` 10 · `MEM_WITHERED_PENALTY` 12 · `MEM_LOTOPHAGOS_TRADE` 20 · **`CAUGHT` 30**). Ölçek tutarlı ✅, değiştirilmesine gerek yok — ama §2.3'teki tavan sorusuyla birlikte playtest edilmeli.

---

## 3. Challenge tasarımı

### 3.1 Bu durağı Lotus'tan ne ayırıyor

| | Lotus Adası (canlı) | Kiklop Mağarası |
|---|---|---|
| Mekân | Açık, 320 m çaplı, her yöne git | **Dar, doğrusal, tek boğaz** — her dönüş aynı riskli noktadan |
| Ne seni zorluyor | Zaman + unutuş + arama (çiçek nerede) | **Zamanlama + konum** — nerede olduğun *ne zaman* olduğuna bağlı |
| **Tehdit kaynağı** | Unutuş (tek kaynak, sürekli) | 🔴 **Unutuş YOK (D3).** İki katman: **körleşme** (kapı kapanır, karanlık, fiziksel ezilme) + **algılanma** (`DETECT`, oranlı görülme) |
| Kaynak yenileniyor mu | Evet, döngüsel (`LOTUS_CYCLE`) | **Hayır, sonlu** — tek seferlik soygun (ama yakalanınca **kaybolmuyor**, yere düşüyor — D2) |
| Kaç tur | En az 2 (5 hedef / 4 kapasite) | **1 tur yeter** (4 = 4) — yapısal olarak farklı tempo |
| **Zaman ritmi** | Sürekli tek bir gün saati (`DAY_LENGTH`) | 🆕 **Kesikli gündüz/gece.** Kapı açık = topla; kapı kapalı = **toplama tamamen durur**, saklan. Projede ilk kez oyuncunun ana fiili periyodik olarak **kapatılıyor** |
| Doğru hamle | Yürümeye devam et, ara | **Bazen dur ve hiçbir şey yapma** — projede ilk kez "durmak" bir strateji. 🆕 Ve artık **nerede** durduğun da önemli (oda-başı saklaş noktaları) |
| Öğrenme | Ada okunur (P3) | Döngü okunur — ama 🆕 **devin gittiği derinlik her döngüde değişiyor**; öğrenilen şey *rota* değil, *ritim ve tepki* |
| **Ton** | Ege/painterly, sakin, ışık dolu | 🆕 **Açıkça korku (horror).** Kasıtlı kopuş — bkz. §4.0 |

**Tek cümlelik kimlik:** *Lotus'ta acele etmek pahalıdır çünkü unutursun; Kiklop'ta acele etmek pahalıdır çünkü duyulursun.* **Güncelleme (24 Ağu):** artık sadece "duyulursun" değil — **kapı kapanır ve karanlıkta onunla kalırsın.** Lotus'un tehdidi içeriden (kendi zihnin), Kiklop'unki dışarıdan (odada senden büyük bir şey var) geliyor.

### 3.2 Metinler (Lotus'un A3 üslubunda — `gdd-lotus-island-rebuild.md` §5.2, `screens.md` §3/§4)

> **24 Ağu güncellemesi:** metinler kapı mekaniğine ve korku tonuna göre revize edildi. **Kart metni D1/F3 ile kilitli, değişmiyor** — ve artık **mekanik olarak da doğru**: "körleşme" gerçekten karanlıkta kalmak demek. Son hâli `ux-designer`/`@tide`'ın (§6 adım 9).

**Hub kartı** (canlıdaki metin, D1/F3 ile **kilitli, değişmez**):
> **Kiklop Mağarası**
> `Kilidi açıldı`
> Körleşmeden, tayfanla birlikte çık.

**Açılış perdesi** (`screens.md` §4, oyun başlamadan) — **revize:**
> Filon geride kaldı. Tek gemi, boş ambar, önünde bir mağara ağzı.
> **Dört azık topla ve gemine dön.**
> Kapı açıkken topla. Kapandığında ışık gider — o zaman tek işin **saklanmak** ve **kıpırdamamak**.

*(Eski satır — arşiv: "İçerideki senden büyük. Işıkta durma, koşarken görülürsün — gölgede beklemek de bir hamledir." Hâlâ doğru ama artık **ikincil** katmanı tarif ediyor; açılış perdesi asıl ritmi öğretmeli.)*

**Koşu içi beat satırları** (oyun kesilmez, `hud.say()` ailesi) — **revize:**

| Tetik | Metin | Not |
|---|---|---|
| İlk kez mağaraya girince | *Dışarıda kalan gemin. Ambarı boş.* | değişmedi |
| İlk `E — al` tamamlanınca | *Bir. Üç daha.* | değişmedi |
| **İlk RETURN telegrafı** (kapı kapanmak üzere) | *Kapı kapanıyor. Bir yer bul.* | 🆕 eski: *"Ayak sesi. Yaklaşıyor."* — artık **ne yapması gerektiğini** söylüyor, sadece tehdit bildirmiyor |
| **Kapı ilk kez kapanınca** | *Karanlık. Nefesini tut.* | 🆕 |
| İlk kez bir saklaş noktasında durgun kalınca | *Burada göremez — kıpırdamazsan.* | 🆕 son iki kelime yeni: hareketsizlik kuralını öğretiyor |
| **Kapı ilk kez tekrar açılınca** | *Işık. Devam et.* | 🆕 — döngünün tekrar ettiğini, bunun terminal olmadığını öğretir |
| **PRESENT'te `E`'ye basılırsa** | *Şimdi olmaz.* | 🆕 — sessiz reddetme yerine gerekçe; toplama neden çalışmadığını söyler |
| **1.** `onCaught` sonrası (mağara ağzında uyanınca) | *Görüldün. Ne taşıyorsan düştü — hâlâ orada.* | 🆕 son üç kelime **kritik**: D2/C2'nin "yok olmadı" bilgisini oyuncuya söylemezsen ceza gereğinden ağır okunur |
| **2.** `onCaught` sonrası | *İkinci kez. Bir daha kaldıramazsın.* | 🆕 **`CYCLOPS_CRUSH_CAP` = 3'ün tek uyarısı.** Sayı vermiyor (P2), ama "son şansın" bilgisini net veriyor — oyuncu 3. ezilmede denemeyi kaybedeceğini **bilmeden** kaybederse adaletsiz olur |
| **3.** ezilme = deneme biter | *(beat satırı yok — Ayrılış/başarısızlık kartı devralır)* | Kart metni `@tide`'ın (§6 adım 9): denemenin sıfırlandığını ve **hemen tekrar denenebileceğini** açıkça söylemeli |
| 4/4 teslim edilince | *Ambar dolu. Gemine bin.* | değişmedi |

> ⚠️ **`@tide`'a not:** yukarıdaki satırların hepsi **ilk kez** tetiklenir (tekrar etmez) — `hud.say()` ailesinin mevcut disiplini. Korku tonu metinde **abartılmamalı**; `art-bible.md`'nin ölçülü dili korunuyor, gerilimi ışık ve ses taşıyor, metin değil.

**Ayrılış kartı** (`screens.md` §9, Lotus'un A5 hesap kartı ailesinde) — **revize:**
> **AYRILIŞ**
> Azık: 4/4 · Yakalanma: N · Atlattığın kapanma: M · Süre: MM:SS
> *Sirenler Geçidi açıldı.*

> ✅ **"Polyphemos'u gördün mü" satırı kalıcı olarak KALKTI (D10, 25 Ağu 2026).** Dev artık PRESENT boyunca **sürekli görünüyor** — "hiç görmeden bitirmek" diye bir ustalık ödülü yok, soru anlamsız.
>
> 🆕 **"Atlattığın kapanma: M"** yeni ustalık ölçüsü: kaç kapı-kapanma döngüsünü yakalanmadan atlattın. **Yeni asıl ölçü bu** — level-spec §7'nin eski "canavarı hiç görmeden bitir" ödülünün yerine geçiyor.
>
> 🆕 **Yakalanma satırı artık bir bahis göstergesi:** `CYCLOPS_CRUSH_CAP` = 3 olduğu için "Yakalanma: N" satırı **koşu içinde gösterilmez** (P2) ama **Ayrılış kartında** gösterilir — kart zaten koşu bitince geliyor, orada sayı vermek P2'yi bozmuyor. `0/3` ile bitirmek en yüksek ustalık.
>
> ⚠️ **K40 notu:** *"Sirenler Geçidi açıldı"* satırı **doğru kalıyor** ama artık farklı bir anlamda — duraklar-üstü bir koşuda "sıradaki durak" değil, hub'da **kalıcı olarak** açılan bir kart. `@tide` metni buna göre gözden geçirmeli (§6 adım 9).

### 3.3 Mekân bulmacası var mı — hayır, bilerek *(gerekçe değişti, sonuç aynı)*

Lotus'ta höyük ritüeli ve nilüfer taşları var (kapı açan bulmacalar). Kiklop'ta **bulmaca yok.**

> ⚠️ **24 Ağu düzeltmesi:** 1. turun gerekçesi (*"level-spec §9'un 'kilitli kapı yoktur' ilkesi ve koca kayanın kasıtlı olarak **dekor** bırakılması"*) **artık geçersiz** — D9 ile koca kaya gerçek bir mekanik oldu, kapanıyor. **Ama sonuç değişmiyor**, sadece gerekçe: kapı bir **bulmaca** değil, bir **saat**. Oyuncunun çözeceği bir kilit yok; okuyacağı bir ritim var. Kapı hiçbir zaman oyuncunun bir eylemiyle açılmıyor/kapanmıyor — tamamen döngüye bağlı.

Bu durağın "bulmacası" **zamanlama**dır. İkinci bir bulmaca katmanı eklemek, **iki** yeni sistemin (körleşme + algılanma) öğrenilmesini boğar — 1. turda tek sistem vardı, şimdi iki var, yani bu kısıt **daha da** bağlayıcı. **Kapsam dışı kalıyor.**

### 3.4 Risk / ödül döngüsü — doğrulandı

- **Güvenli minimal rota var:** depo (2) + ağıllar (3) = 5 ≥ 4. İç nöye hiç girmeden bitirilebilir ✅
- **Derin rota meşru ama gereksiz:** iç nöy 2 fazladan öğe = bir yakalanmayı karşılayan tampon
- **Lotus'tan yapısal fark:** orada mesafe ↑ ise koku baskısı ↓ (dengeleyici). Burada mesafe ↑ ise risk de ↑ (dengeleyici yok) — kasıtlı, soygun temasına uygun
- ⚠️ **Ölçülecek** (§6): oyuncular güvenli rotayı gerçekten buluyor mu, yoksa refleksle en derine mi gidiyor (level-spec §12 madde 5)

---

## 4. Assetler ve üretim yolları (`art-director` bakışı — 2. tur, revize, 2026-08-24 `@iris`)

> **Bu turda değişen:** D1/D3/D4/D9 artık öneri değil kapalı karar (§0.0); D4-ek yeni bir **standing süreç kuralı** ekliyor (zorunlu Gemini konsept→onay kapısı, tüm adanın görselleri için); D3 unutuş/haze'i tamamen bu adadan siliyor, yerine `level-cyclops-cave.md` §0.4/§4.6/§9'un **zaten sayıya döktüğü** kapı-durumu ışık sistemi geçiyor — aşağıdaki §4.1 o sayıları tekrar üretmiyor, **hex'e çeviriyor**. Yeni açık soru **D10** (§7.2, Polyphemos'un körleşme dilinde nasıl var olacağı) bu bölümde cevaplanıyor (§4.4). D9'un "manifest kırmızısı" iş kalemi bu turda **gerçekten çalıştırılıp ölçüldü** (§4.6) — dokümanın önceki `ship_hero_*`/`water_*` varsayımı **yanlış çıktı**, gerçek bulgular aşağıda.

### 4.1 Görsel kimlik — kapı açık / kapı kapalı iki durumlu palet

`level-cyclops-cave.md` §4.6 (`@cove`) her bölge için kapı-açık/kapı-kapalı **0–1 görünürlük** sayısını zaten türetti (`doorGlobal(D)` + yerel kaynak toplamı). Bu bölümün işi o sayıları **`art-bible.md` §2 hex'leriyle** somutlaştırmak — `asset-prompt-playbook.md` B0'ın "isim + hex birlikte" disipliniyle:

| Bölge | Kapı **AÇIK** (görünürlük, `@cove`) | Kapı **KAPALI** (görünürlük) | Palet (ikisinde de aynı aile, yalnız oran/yarıçap değişir) |
|---|---|---|---|
| Koy / Patika | 1.0 (dış mekân) | *(kapı buraya etkimiyor — koy hep dışarıda)* | Standart ada paleti, değişmiyor |
| Mağara ağzı | **0.95** | **0.35** | Ana ışık `sıcak yön ışığı #ffcf94` (açık) → `ufuk-kehribar #eeae6a` sızıntı (kapalı); gölge her zaman `serin gölge #5f7fa8`; kaya `tebeşir beyazı #e6e2d4` |
| Depo | **0.67** | **0.15** | Ana ışık yalnız `ufuk-kehribar #eeae6a` (ağız ışığının kuyruğu / kapalıyken **hiç yerel kaynağı yok** — bkz. ASSET-102 aşağıda); gölge `#5f7fa8` |
| Ağıllar/Ocak | **0.55** | **0.30** | Ana ışık `ufuk-kehribar #eeae6a` (ocak, açıkken `CYCLOPS_LIGHT_RADIUS` 6 m / kapalıyken köz 3 m — **aynı doku, farklı yarıçap**, yeni renk yok); gölge `#5f7fa8` |
| İç nöy | **0.20** | **0.12** | Ana ışık `#eeae6a` (meşale, sabit 3 m); gölge `#5f7fa8` — adanın **her zaman en loş** bölgesi |

**Üç disiplin, hiçbiri ihlal edilmiyor:**
1. **Palet dışı renk yok** — kapı kapalıyken bile kullanılan iki renk (`#eeae6a` kehribar, `#5f7fa8` serin gölge) zaten `art-bible.md` §2'de var; yalnız kapatılan/açılan bir *oran*, yeni bir aile değil.
2. **Doku ışık taşımaz** (art-bible §8) — ocak/meşale dokusu tek, kapı durumu yalnız **yarıçap/yoğunluk** parametresi değiştiriyor (`CYCLOPS_LIGHT_RADIUS` 6→3 m). Bu yüzden ASSET-091/092 (duvar/zemin dokusu) **tek varyant** — açık/kapalı için ikinci bir doku üretmeye gerek yok.
3. **Ekranı karartmak yasak / hiçbir hücre 0 değil** (art-bible §4) — `@cove`'un tablosu bunu zaten garanti ediyor (en düşük değer İç nöy kapalı = 0.12, sıfır değil). **Art-bible'a önerilen ek cümle** (dosya değiştirilmedi, öneri):

> **[P] Öneri, sahip onayı gerekir — Kiklop genişlemesi (2026-08-24, `@iris`):** *"Kiklop Mağarası'nda koca kaya kapı PRESENT evresinde kapanır ve genel ışık düşer — bu, adanın 'hiçbir yeri koyu değil / ışık asla azalmaz' ilkesinin bilinçli, tek istisnasıdır. İstisna şu üç sınırla çalışır: (1) ana ışık kapalıyken de sıcak kehribar (`#eeae6a`) kalır, asla siyaha ya da nötr griye düşmez; (2) gölge her zaman serin mavi (`#5f7fa8`) kalır; (3) hiçbir bölge `level-cyclops-cave.md` §4.6'nın belirlediği tabandan (en düşük: İç nöy kapalı, 0.12 normalize görünürlük) aşağı düşmez — oyuncunun 2–3 m önündeki bir yüzey ya da toplanabilir her zaman silüetiyle ayırt edilebilir kalır. Bu istisna yalnızca Kiklop'un fiziksel kapı mekaniğine bağlıdır, unutuş/vinyet sistemiyle karıştırılmaz ve Lotus Adası'na hiç sızmaz."*

> # ✅ D11 ile aşıldı (25 Ağu 2026, sahip) — aşağıdaki paragraf ARŞİV
>
> `@iris` 24 Ağu'da yasakları korumak zorunda olduğu için korkuyu ölçek + ses + şok anına yüklemiş ve tabanı 0,12–0,20'de tutmuştu. **Sahip 25 Ağu'da `art-bible.md`'nin karartma yasağını Kiklop için resmen açtı** — bu adada **tam karartma ve karanlık-tehdit dili serbest ve istenen.** `@iris`'in çözümü artık **zorunlu kısıt değil, tercihe bağlı sunum notu**: ölçek/ses/şok katmanları hâlâ iyi tasarım ve öneriliyor, ama artık *karanlığın yerine geçmek* için değil, *karanlıkla birlikte* çalışmak için. **"Hiçbir hücre 0'a inmesin" kuralı kalktı.**
>
> **Hâlâ geçerli olan yasaklar (D11 bunları açmadı):** mor kristal/fener/bataklık paleti · kırmızı hasar flaşı · can barı · stroboskopik geçiş ve <1,5 s geçişler (fotosensitivite). Bunlar erişilebilirlik ve P1/P2 kararlarıdır, üslup kararı değil. Ayrıntı: `art-bible.md` §9'un Kiklop istisna kutusu.
>
> 🆕 **D10 ile birlikte okunmalı:** karanlık artık devi **saklamak** için değil — dev zaten sürekli görünüyor (§4.4). Karanlık, onu gördüğün anı **daha ağır** kılmak ve nereye kadar görebildiğini kısıtlamak için var.

*(Arşiv — 24 Ağu, `@iris`:)* ~~**Korku teması ile bu palet nasıl bir arada duruyor:** bu adanın korkusu **yoksunluktan/karanlıktan değil, kısıtlılıktan ve ölçekten** gelmeli — art-bible §9'un "karanlık mağara paleti iptal edildi, geri gelmez" ve "ekranı karartmak yasak" yasakları hâlâ geçerli, sahip bunları geri açmadı.~~ `@cove`'un tablosu zaten bunun somut kanıtı: kapı açıkken bile çoğu oda 0.55'in altında (Ağıllar 0.55, İç nöy 0.20) — Lotus'un "her yer bol ışıklı" felsefesinden **kasıtlı bir kopuş**, ama hiçbir hücre asla sıfıra inmiyor. Korkuyu taşıyan asıl katman ışık değil: (a) mekân ölçeği (dar boğazlar, tek çıkış), (b) devin fiziksel varlığı/sesi (ses tasarımı, `@echo`), (c) CAUGHT anının şok efekti (kamera sarsıntısı + tek-shot kükreme + ≥1,5 s sönen kenar vurgusu — zaten fotosensitivite kurallarına uygun tasarlanmış, §4.4.1). **Bu bir yorum, `[TÜRETİLMİŞ] (@iris, 24 Ağu 2026) — sahip vetosuna açık`** — sahip "hayır, ben gerçekten karanlık istiyorum" derse art-bible §9'un ilgili yasağının yeniden açılması gerekir, o benim kararım değil.

### 4.2 Zorunlu Gemini onay kapısı — süreç dokümanı (D4-ek, standing kural)

Sahip kararı birebir: **bu adanın her sahnesi — dış görünüş, her mağara odası, iç mekânlar, Polyphemos — önce Gemini'de konsept çizdirilip onaylatılacak; onaysız hiçbir görsel karar ilerlemez.** Bu, Faz 0'ın P0 (turnaround/lotus-sayfası/hub-key-art) desenini bu ada için **genelleştirip zorunlu kılıyor**. Somut akış (`asset-prompt-playbook.md` A0–A4'ün doğrudan uygulaması):

1. **Kilit çapa seç** — oda/figür başına **tek** prompt, `_anatomy.md`'nin STYLE/LOOK+IP blokları **byte-identical** kopyalanır (paraphrase yasak, A2), yalnız SETTING/karakter cümlesi değişir. Polyphemos için ayrıca `character-turnaround.md`'nin 4-açı-tek-kare deseni kullanılır (Tripo `multiview-to-model`'in girdisi olacağı için).
2. **3 varyant üret** — aynı prompt, 3 ayrı çağrı (bu proje seed reuse yapmıyor, `asset-prompt-playbook.md` B10 — tutarlılık tek-çağrı-çoklu-varyant ya da anchor tekrarından gelir, 3 ayrı çağrının kendi aralarında görsel farkı normaldir ve karşılaştırmayı anlamlı kılan da budur).
3. **Sahibe sunum: üçü birlikte, tek tek değil.** Üç dosya yan yana (bir kontakt-sayfa/montaj ya da art-director'ın sırayla gösterdiği 3 görsel) — Faz 0'ın "4 üretim, sahip seçer" (`character-turnaround.md` §Varyasyon) desenindeki karşılaştırmalı-seçim mantığının aynısı.
4. **Sahip birini kilitler.** Seçim `art-source/ref/`'e gider, adı `pipeline.md` §6 kuralına uyar (`kategori_ad_01_ref_çözünürlük.png`).
5. **Onay kayda geçer** — `public/assets/assets.csv` satırı (prompt dosyası + model + `seed=none`) + `asset-registry.md` satırı, notlarda *"sahip seçti: varyant N, [tarih]"* (ASSET-001/002 emsali).
6. **Ancak bundan sonra** doku/mesh/Tripo üretimine geçilir — oda konseptleri ASSET-091/092 doku prompt'larının ve `caveStage.ts` ışık kalibrasyonunun referansı olur; Polyphemos konsepti Tripo `multiview-to-model`'in girdisidir.

**Neden onaysız ilerlemek yasak:** `pipeline.md`'nin KAPI 1/İntake felsefesi zaten bunu söylüyor (*"judgment work… before build work"*) — ama bu adada özellikle kritik, çünkü Tripo mesh/rig adımı (Polyphemos) **geri dönüşü zor bir kredi harcaması**; onaylanmamış bir konsept üstüne mesh üretmek P-B/P-C'nin `char_doryseus` v2'de yaşadığı hatayı (yanlış temelden üretip yeniden üretmek) tekrarlama riski taşır.

**Zorunlu vs. muaf — liste:**

| Kalem | Zorunlu mu | Gerekçe |
|---|---|---|
| Mağara ağzı / Depo / Ağıllar-Ocak / İç nöy (4 oda "sahnesi") | **Zorunlu** | D4-ek'in birebir kapsadığı "mağara odalarının her biri" |
| Polyphemos (konsept + turnaround) | **Zorunlu** | D4-ek'in "Polyphemos'un kendisi" maddesi + en yüksek kredi riski |
| Azık propları (peynir tekeri / şarap tulumu) | **Zorunlu — türetilmiş genişletme** | D4-ek harfiyen "prop" demiyor, ama bu proje lotusun kendisini (ASSET-002, salt bir bitki propu) aynı gerekçeyle (adanın **çekirdek toplanabilir okunabilirlik problemi**) gate'ledi — emsal tutarlılığı için aynı muameleyi öneriyorum. **[TÜRETİLMİŞ] (@iris) — sahip vetosuna açık**, veto edilirse §4.3'te ASSET-093/094 muaf kod-mesh listesine geri döner |
| Açılış perdesi arkaplanı (ASSET-101, üretilirse) | **Şartlı zorunlu** | Bir "sahne" — üretilmeye karar verilirse gate'den geçer; üretilmemesi de geçerli bir seçenek (mevcut parşömen kroması yeterli olabilir) |
| Ağıl/kuzu-keçi dekoru, koca kaya geometrisi, ocak/meşale ışığı, kapı geçiş animasyonu, algılanma kenar parıltısı | **Muaf** | Saf kod-mesh dekor / saf runtime ışık-shader efekti — üretilecek bir "resim" yok, gate'in girdisi olacak bir Gemini çıktısı da yok. Koca kaya + Ağıllar dekoru zaten mağara ağzı/ağıllar oda-konseptinin (zorunlu) kapsadığı görsel dile bakılarak inşa edilir — ayrı bir gate'e ihtiyaç yok |
| Ses paketi | **Muaf** | Gemini/Higgsfield'ın alanı değil (`@echo`, mevcut kod/Kenney altyapısı) |

### 4.3 Asset listesi — `asset-registry.md` formatında, hepsi `planned`

| ID | Kalem | Sınıf | Üretim yolu | Tahmini maliyet | Not |
|---|---|---|---|---|---|
| ASSET-090 | **Mağara kabuğu** — koridor + 4 oda + 2 boğaz, tek merged mesh | `scene-mesh` | Blender prosedürel, `build_island_kit.py` deseni → yeni `build_cyclops_cave.py` | 0 kredi, ~1 oturum | `level-cyclops-cave.md` §1–3'ün ölçülerine bağlı. **Yeni gereksinim:** her odanın 1 saklaş noktası (§3) **geometrik olarak** (niş/kaya çıkıntısı/duvar cebi) okunmalı — bkz. §4.5 "saklaş noktası görsel dili" |
| ASSET-091 | Kaya duvar dokusu (tileable, mağara içi) | `scene-texture` | `gen-assets.mjs` (Gemini), ASSET-104/105/106/107 oda-konseptlerinden referans alır | ~1 tur | **Tek varyant** — açık/kapalı için ikinci doku yok (§4.1 madde 2) |
| ASSET-092 | Mağara zemini dokusu (sıkışmış toprak + saman) | `scene-texture` | `gen-assets.mjs` | ~1 tur | Tek varyant, aynı gerekçe |
| ASSET-093 | **Azık propu — peynir tekeri** | `scene-mesh`/`scene-texture` | Gemini konsept (zorunlu gate, §4.2) → kod mesh + doku | 0 kredi (Tripo'ya değmeyecek kadar küçük) | D1/F3 ile kilitlendi — tayfa mesh **yok** |
| ASSET-094 | Azık propu — şarap tulumu | aynı | aynı | 0 kredi | ASSET-093 ile aynı gate/üretim |
| ASSET-095 | Ağıl + kuzu/keçi dekoru | `code` | Prosedürel kod mesh (`lotophagos.ts`/`frogs.ts` deseni) | 0 kredi | Muaf (§4.2 tablosu) |
| ASSET-096 | Ocak ateşi (ışık + kor parçacığı) | `code` | Mevcut `Bursts` + `glowSprite()` | 0 kredi | **Artık iki durumlu**: açık `CYCLOPS_LIGHT_RADIUS` 6 m / kapalı köz ~3 m (`level-cyclops-cave.md` §4.6) — parametre değişimi, doku aynı |
| ASSET-097 | **Koca kaya — artık dekor değil, durum değiştiren prop** | `scene-mesh` + `code` (animasyon) | `build_island_kit.py`'nin `rock_chalk` ailesinden ölçeklenmiş varyant + açık/kapalı geçiş (kayma/dönme) | 0 kredi | `level-cyclops-cave.md` §9/§11 — geometri mağara ağzı oda-konseptinin (ASSET-104) kapsamında, ayrı gate gerekmez. Animasyon/ses `@byte`/`@echo` |
| ASSET-098 | **Polyphemos figürü — mesh + doku + rig** | `scene-mesh` | **P-C, kilitli** — bkz. §4.4 | ~80 kredi (kırılım §4.4) | ASSET-108'den (onaylı konsept) türer |
| ASSET-099 | Ses paketi | `code` | `audio.ts` / Kenney CC0 | 0 kredi | `@echo`, muaf |
| ASSET-100 | Algılanma kenar parıltısı (kehribar) | `code` | **Uygulama yolu açık — bkz. §4.5**, `hazePass.ts`'e ikinci uniform **değil**, ayrı öneri | 0 kredi | Muaf (kod/shader, resim değil) |
| ASSET-101 | Kiklop açılış perdesi arkaplanı | `ui` | `gen-assets.mjs` (Gemini), ASSET-104 (mağara ağzı) konseptine dayanır | ~1 tur | Opsiyonel — mevcut parşömen kroması yeterli olabilir |
| **ASSET-102** *(yeni)* | Depo — kapı-kapalı taban ışık kaynağı (küçük duvar mangalı/yağ lambası) | `code` | Mevcut `Bursts`/nokta ışık deseni | 0 kredi | **Türetilmiş (@iris) — sahip vetosuna açık.** Depo'nun bugün hiç yerel kaynağı yok (§4.1); kapı kapanınca 0.15'lik taban ışığını **fiziksel bir kaynağa** bağlamak gerekiyor, yoksa "ışık nereden geliyor" sorusu havada kalır |
| **ASSET-103** *(yeni)* | Kapı açık/kapalı küresel ışık geçişi | `code` | `caveStage.ts` — sahne ışığı (ambient/hemi) animasyonu, **post-process pass değil** | 0 kredi | Bkz. §4.5. ≥1,5 s geçiş, ekran hiç karartılmaz (art-bible §4) |
| **ASSET-104** *(yeni)* | Mağara ağzı — sahne konsepti | `reference` | Gemini, **zorunlu gate**, 3 varyant | ~1 tur | ASSET-090/091/097/101'in görsel referansı |
| **ASSET-105** *(yeni)* | Depo — sahne konsepti | `reference` | Gemini, **zorunlu gate**, 3 varyant | ~1 tur | ASSET-091/092/102'nin referansı |
| **ASSET-106** *(yeni)* | Ağıllar/Ocak — sahne konsepti | `reference` | Gemini, **zorunlu gate**, 3 varyant | ~1 tur | ASSET-091/092/095/096'nın referansı |
| **ASSET-107** *(yeni)* | İç nöy/Uyuma köşesi — sahne konsepti | `reference` | Gemini, **zorunlu gate**, 3 varyant | ~1 tur | En loş oda — "taban okunabilirlik" kararının görsel provası burada yapılmalı |
| **ASSET-108** *(yeni)* | Polyphemos — konsept + 4-açı turnaround | `reference` | Gemini, **zorunlu gate**, 3 varyant (her biri 4-açı tek kare) | ~1 tur | ASSET-098'in Tripo `multiview-to-model` girdisi |

**Toplam yeni dış-asset kredisi: ~80 (yalnızca Polyphemos, ASSET-098).** Gemini konsept turları (ASSET-104–108) kredi sayılmıyor (Tripo bütçesinden ayrı, ~5 oturumluk üretim/onay turu). Geri kalan her şey (mağara geometrisi, dokular, propler, ses, ışık/animasyon kodu) 0 Tripo kredisi.

### 4.4 Polyphemos — P-C kilitli, ✅ **D10 de kapandı (25 Ağu 2026, sahip)**

> ## ✅ D10 kararı: **(b) Doğrudan görünür tehdit**
>
> Sahip aşağıdaki üç seçenekten **(b)**'yi seçti — `@iris`'in önerdiği ara yol (c) **değil**.
>
> **Kural:** Polyphemos PRESENT boyunca **sürekli sahnede** ve **ışığın izin verdiği ölçüde doğrudan/net görülüyor.** Silüet/gizem dili **yok**. Ayrı bir "gizleme" shader'ı, sis perdesi ya da silüet malzemesi **yazılmayacak** — dev normal şekilde render edilir; onu ne kadar gördüğün bulunduğu yerin o anki aydınlığına bağlıdır. **Belirsizlik tasarlanan bir efekt değil, ışık koşullarının doğal sonucudur.**
>
> **Asset sonucu — `@iris` için net:** ~80 kredilik P-C yatırımının gerekçesi **en güçlü hâlinde**. Model 0,6 saniyelik bir flaşta değil, **dakikalarca** ekranda okunacak; yüz ve tek göz dahil detay **görülecek**; `idle/walk/sleep/settle` dördü de gerçekten izlenecek (`walk` hedefe giderken, `settle` yerleşirken, `sleep` yerleştikten sonra). Gemini konsept turunda (ASSET-108) bu, **yakın plana dayanacak bir tasarım** istemek demek — uzaktan silüet olarak çalışan bir form yeterli değil.
>
> **`CYCLOPS_JUMPSCARE_DURATION` (kısa beliriş) düştü.** CAUGHT'ın diğer üç bileşeni (kamera sarsıntısı, tek-shot kükreme, kenar vurgusu) korunuyor — ama artık bir *reveal* değil, zaten görünen bir şeyin **yakınlaşması/tepkisi**.
>
> 🆕 **Yeni gereksinim (kayıp koşulundan):** şok efekti **ezilme başına ağırlaşmalı** — `CYCLOPS_CRUSH_CAP` = 3'ün kalan hakkını P2'yi bozmadan (sayı/bar yok) hissettiren **tek kanal** bu. 3. ezilme belirgin biçimde en ağır olmalı. Fotosensitivite kısıtları (stroboskop yok, ≥1,5 s sönüş, kırmızı yok) **her üç seviyede de** geçerli.
>
> *(Aşağıdaki üç-seçenek tablosu arşiv — `@iris`'in 24 Ağu'daki sunumu. Sahip (b)'yi seçti.)*

D4 artık öneri değil: **P-C, tam Tripo mesh + doku + rig, `idle/walk/sleep/settle`, ~80 kredi.** 1. turun P-A önerisi geçersiz — sahip tersini seçti, gerekçe relitige edilmiyor (görev talimatı). Ama **D10** (§7.2, `@helix`/`@nile` bu bölüme havale etti) hâlâ açık ve doğrudan bu yatırımın **nasıl görüneceğini** belirliyor — eski "yalnız CAUGHT'ta 0,6 s beliriş" varsayımı da geçersiz, çünkü körleşme mekaniği devi **PRESENT boyunca mağarada dolaştırıyor** (`level-cyclops-cave.md` §4.7).

#### 4.4.1 D10 — üç seçenek

| | (a) Hiç net gösterme | (b) Doğrudan görünür tehdit | **(c) Ara yol — önerim** |
|---|---|---|---|
| Roaming (PRESENT) | Yalnız silüet/gölge, yüz hiç okunmaz | Tam görünür, kendi ışığıyla (meşale/göz parıltısı) | Odanın **kendi** kapı-kapalı ışığıyla (§4.1 tablosu, 0.12–0.35) doğal olarak silüetleşir — **ayrı bir "canavarı gizle" hilesi gerekmez**, aynı ışık sistemi onu da kapsar |
| CAUGHT anı (~0,6–0,8 s) | Yine belirsiz/bulanık | Net, aydınlık, detaylı | **Net, yakın** — tek "para atışı" anı, tam doku/rig burada okunur |
| ~80 kredilik doku+rig yatırımı gerekçesi | **Zayıflar** — detay hiç net görünmüyorsa doku kalitesi neredeyse israf | Güçlü | **Güçlü** — roaming'de ücretsiz (aynı oda-ışığı sistemi), CAUGHT'ta tam gerekçeli |
| D4 (~80 kredi, kapalı karar) ile tutarlılık | **Çelişir** — D4'ü fiilen yeniden açar (doku adımını gereksizleştirir) | Tutarlı | **Tutarlı** |

**Önerim: (c).** Gerekçe: D4 zaten kapalı bir karar (~80 kredi, P-C) — (a)'yı seçmek bunu dolaylı olarak yeniden açar (doku harcamasının çoğunu anlamsızlaştırır), bu görev talimatının "D4'ü relitige etme" kısıtına aykırı düşer. (c) hem D4'le tutarlı hem de sahip'in "açıkça korku türü" isteğiyle uyumlu: roaming sırasında ayrı bir "canavarı sakla" mekanizması **kurmaya gerek yok** — §4.1'in kapı-durumu ışık tablosu zaten çoğu odayı loş tutuyor (0.12–0.30), yani belirsizlik/dread **ücretsiz gelir**, tasarlanmış bir görsel efekt değil doğal bir sonuç. CAUGHT anındaki net/yakın beliriş ise Polyphemos'un TEK "hero shot"u — tam doku+rig yatırımının okunduğu tek an, bu da ~80 krediyi gerekçelendirir. **Bu sahip'in kararı** — (a) veya (b) seçilirse §4.4.2'nin kredi kırılımı değişmez (mesh/doku/rig adımları aynı), yalnızca roaming sunum kararı (ayrı bir "obscure" shader/malzeme gerekip gerekmediği) değişir.

#### 4.4.2 P-C — adım adım, kredi kırılımı

| # | Adım | Kredi | Not |
|---|---|---|---|
| 1 | Gemini konsept + 4-açı turnaround (ASSET-108), **zorunlu gate**, 3 varyant → sahip 1'ini kilitler | 0 (Tripo dışı) | `character-turnaround.md` deseni; Doryseus ASSET-001 emsali |
| 2 | Tripo `multiview-to-model` (geometri) — front/left/back/right, `char_doryseus` v3/ASSET-081 emsali | **~30** | Üretim planı 1. turun P-B tahminiyle aynı büyüklük |
| 3 | Tripo `texture_model` (retexture) — `gen-tripo-retexture.mjs` deseni | **~10–15** | Aynı script, aynı iki-adımlı yol (`multiview-to-model` → `texture_model`, undocumented route, `CLAUDE.md`'de zaten doğrulanmış) |
| 4 | Rig + `--animations preset:idle,preset:walk,preset:???sleep,preset:???settle` tek retarget çağrısı | **~40** | Doryseus'un gerçek emsali: idle+walk+run+dig (4 preset, tek çağrı) = **40 kredi** (`ACTIVE_WORK.md` 2026-08-18 satırı) — aynı büyüklük sınıfı bekleniyor |
| | **Toplam** | **~80–85** | Sahip'in söylediği "~80 kredi" ile tutarlı |

⚠️ **`preset:sleep`/`preset:settle` adları doğrulanmadı.** Doryseus'un `harvest` animasyonu için tam preset kataloğu (90+ isim) taranıp en yakın eşleşme (`preset:biped:dig`) bulunmuştu (`ACTIVE_WORK.md` 2026-08-18) — aynı tarama **Polyphemos için de yapılmalı**, kredi harcanmadan önce. "sleep" muhtemelen mevcut (uyku/yatma pozu için standart bir biped preset'i olması olası), "settle" (bir yere varıp oturma/yerleşme) için en yakın eşleşme `preset:sit` ya da benzeri olabilir — bu bir **varsayım**, gerçek isim `--balance`/katalog taramasıyla doğrulanmadan `--animate` çalıştırılmamalı. 4 preset, Tripo'nun 5-preset/çağrı sınırına (`CLAUDE.md`) rahatça sığıyor.

**`idle/walk/sleep/settle` seçimi neden anlamlı (kod uydurma değil):** `level-cyclops-cave.md` §4.7 devin PRESENT boyunca 3 aday derinlikten birine gidip **durduğunu/oturduğunu/uyuduğunu** zaten tarif ediyor (Depo'da orta-derinlik duruş, Ağıllar'da kendi ocağında oturma, İç nöy'de "kişisel köşesi" — uyku). `idle` genel bekleme, `walk` roaming, `settle` varış anı (oturma/yerleşme geçişi), `sleep` İç nöy'deki döngüsel uyuma durumu — dördü de tasarımın kendi 3-aday-nokta mekaniğine birebir karşılık geliyor.

**Oturum tahmini (revize, 1. turun ~2,5'inden yüksek — D4-ek'in yeni gate'i + canlı-oyun doğrulama disiplini eklendiği için):**

| Aşama | Oturum |
|---|---|
| Gemini konsept + gate (D4-ek) | 0,5–1 |
| Turnaround still + G1 onayı | 0,5 |
| Tripo mesh + texture | 0,5 |
| Preset katalog taraması + rig + retarget | 1 |
| **Canlı-oyunda doğrulama** (Blender screenshot'ına güvenmeden — §4.6 risk notu) | 0,5–1 |
| **Toplam** | **~3–3,5** |

### 4.5 Kapı geçişi ve algılanma göstergesi — iki ayrı sinyal, iki ayrı uygulama (D3'ün yeniden değerlendirmesi)

1. turun önerisi ("kehribar kenar kanalı `hazePass.ts`'e ikinci uniform") **yeniden değerlendirildi** — D3 unutuş/haze'i bu adadan tamamen sildiği için `hazePass.ts` A3 mimarisinde muhtemelen bu durak için **hiç kurulmayacak** (Lotus'a özgü bir pass'i paylaşmak, mimarinin kendi izolasyon mantığına ters düşer — bkz. üretim planı §5.4'ün `stage.ts`/`caveStage.ts` ayrımı, aynı gerekçe burada da geçerli).

**İki farklı sinyal, karıştırılmamalı:**

| Sinyal | Ne | Doğası |
|---|---|---|
| **Kapı ışığı** (ASSET-103) | Sahne-genel ambient/hemi ışık şiddeti, kapı açık/kapalıya bağlı | **Diegetik** — dünyanın kendi ışığı, ekran filtresi değil |
| **Algılanma göstergesi** (ASSET-100) | Oyuncuya özel risk sinyali, DETECT değerine bağlı kehribar kenar parıltısı | **Ekran-uzayı** — HUD'a yakın bir dil, ama HUD bar/sayı değil (art-bible §7/§9 yasağı) |

**Kapı ışığı için öneri (net):** `caveStage.ts` içinde doğrudan ışık şiddeti/renk interpolasyonu (yeni bir shader pass **değil**) — `@cove`'un §4.1 tablosundaki sayılar arasında ≥1,5 s'lik bir lerp. Bu hem en ucuz yol (yeni pass yok, `@axiom`'un bütçesine yük binmiyor) hem de kavramsal olarak doğru (gerçek bir ışık durumu değişimi, post-process efekt değil).

**Algılanma göstergesi için üç seçenek, `@axiom` performans bütçesine göre karar verilmeli:**

| | A — `hazePass.ts`'e 2. uniform (1. turun önerisi) | B — Ayrı, izole yeni pass (`detectPass.ts`) | **C — DOM/CSS overlay (`hud.css`)** |
|---|---|---|---|
| Maliyet | ~0 ek (mevcut pass'a binen) | Yeni fullscreen fragment shader, ~bloom sınıfı ek maliyet | **Sıfır GPU** — CSS box-shadow/gradient, mevcut `hud.ts` fade altyapısı |
| Mimari uyum | **Zayıf** — Lotus'a özgü pass'i paylaşmak, A3'ün izolasyon mantığına ters | İyi — Kiklop'a özel, Lotus'a hiç dokunmuyor | İyi — zaten DOM katmanı Lotus'tan bağımsız |
| Görsel kalite | Bloom pipeline içinde "gerçek ışık" hissi | Aynı, izole | Daha "yapıştırılmış" görünebilir, ama compass/satchel fade'i zaten bu dille çalışıyor |
| Risk | Kiklop değişikliği yanlışlıkla Lotus'un unutuş görselini bozabilir | Yok | Yok |

**Önerim: C, gerekirse B.** A'yı önermiyorum — mimari, D3'ün "bu adada haze/unutuş hiç çalışmıyor" kararıyla dolaylı çelişiyor. Nihai karar **`@axiom`'un** (performans bütçesi + A3'ün Stop izolasyon disiplinine uygunluk).

⚠️ **Renk çakışması riski (1. turdan taşındı, hâlâ geçerli):** kehribar hem (a) ocak/meşale ışığı, hem (b) CAUGHT kenar vurgusu, hem (c) sürekli algılanma göstergesi olabilir. Üçü aynı ekranda aynı tonda olursa oyuncu ayrım yapamaz. **Öneri (değişmedi):** algılanma göstergesi yalnız ekran kenarında + hafif nabız, ocak ışığı sabit ve dünya-içi.

**Saklaş noktası görsel dili (yeni soru, §4.3 ASSET-090'ın gereksinimi):** oyuncu bir nişin "saklanılacak yer" olduğunu **bakınca** anlamalı, işaretle değil (art-bible'ın "renk körlüğü"/"ikonla göstermeme" disiplini, §2/§9). İki seçenek:

- **Öneri: pure geometri/gölge** — niş, çevresindeki ışıktan (ocak/meşale/kapı) doğal olarak daha karanlık kalan içbükey bir oyuk; okunabilirlik salt siluet + gölgeden gelir, yeni bir renk/parıltı **eklenmiyor**.
- Alternatif (önermiyorum): nişin içinde hafif kehribar iç-parıltı (köz/eski kandil izi) — reddediyorum çünkü yukarıdaki "üç kehribar anlamı" çakışma riskini **dörde** çıkarır (ocak + CAUGHT + algılanma + şimdi "güvenli nokta" de kehribar olursa oyuncu hiçbirini ayırt edemez).

`@cove`'un saklaş noktası koordinatları (§3, `level-cyclops-cave.md`) zaten "ışık kaynağından en uzak nokta" mantığıyla seçilmiş — bu, geometri+gölge önerisiyle **doğal olarak örtüşüyor**, ek bir görsel katman gerektirmiyor.

### 4.6 Kabul kapısı + D9 iş kalemi (bu turda gerçekten ölçüldü)

Her kalem `pipeline.md` §8'den geçmeli: gözle kontrol → palet uyumu (§4.1) → doğru klasör → `assets.csv` satırı → `asset-registry.md` güncellemesi → `npm run test:assets` **PASS**. Gemini-gate'li kalemler (§4.2 tablosu) ayrıca sahip onayı olmadan üretim adımına (doku/mesh) geçemez.

**D9 — gerçek ölçüm (2026-08-24, `@iris`, `node scripts/asset-qa/run.mjs --only manifest`):** dokümanın önceki `ship_hero_*`/`water_*` varsayımı **yanlış** — o iki aile CSV'de `integrated` olarak doğru kayıtlı, kırmızının kaynağı değil. Gerçek bulgular:

1. **3 şema hatası** — `ASSET-077`/`ASSET-078` satırları `status=retired` kullanıyor, manifest kontrolcüsü bunu geçerli bir değer olarak tanımıyor (yalnız `generated|accepted|integrated` kabul ediyor). **Karar gerekiyor:** `retired` geçerli bir statü olsun mu (kontrolcü şeması güncellenir) yoksa bu satırlar farklı mı işaretlenmeli — `@axiom` kararı.
2. **~19 "declared but not on disk"** — eski 2D lokomasyon spritesheet'leri (ASSET-024/025/041–051), eski `char_doryseus_01` rig satırları (058/059), `char_doryseus_02_rig` (063), retired Blender deniz GLB'leri (077/078), `char_doryseus_02_gestures` (080) — hepsi **kasıtlı olarak retired/hiç shiplenmedi**, kayıp değil. Manifest'in kendi "`(path)` unshipped" konvansiyonuyla sarmalanmaları gerekiyor.
3. **3 gerçek untracked dosya** — `char_doryseus_07_mixamo_8000.glb`, `char_doryseus_08_rig_5000.glb`, `char_doryseus_08_smart_5000.glb` (disk üzerinde `csv` satırı yok). Bunlar başka bir eşzamanlı oturumun (Cursor/Grok, karakter ışığı/rig denemeleri, `char_doryseus_08_*` ailesinin `konfuse_rig`/`konfuse_smart`/`clean6` varyantlarıyla aynı deney serisi) WIP dosyaları — **`ship_hero_*`/`water_*` değil.**

**İş kalemi (bu tur yapılmadı, tanım):**
- **Ne:** yukarıdaki 3 sınıf bulguyu kapat — (1) `retired` statü şemasına eklensin ya da satırlar düzeltilsin, (2) 19 satır `(path)` konvansiyonuna sarmalansın, (3) 3 untracked `char_doryseus_08_*`/`_07_*` dosyası için ya csv satırı yazılsın (gerçekten shiplenecekse) ya da silinsin (deneysel/superseded ise — WIP dosya adlarındaki `konfuse`/`clean6` ekleri bunun bir iterasyon artığı olduğunu düşündürüyor).
- **Komut:** `node scripts/asset-qa/run.mjs --only manifest` yeşile dönene kadar; gerçekten kabul edilen istisnalar için `--update-baseline` (yalnız gerçek istisnalar — mevcut boşlukları örtmek için değil).
- **Kim:** şema/statü kararı `@axiom`; csv satır/registry düzeltmeleri `@iris`; untracked dosyaların silinip silinmeyeceği karar taşıyan tarafla (muhtemelen ana oturum/Cursor) koordine edilmeli — bunlar benim üretimim değil, silme kararı bana ait değil.
- **Kabul kriteri:** `node scripts/asset-qa/run.mjs --only manifest` çıktısı **"all checks passed."** (ya da yalnızca gerçekten kabul edilmiş, `baseline.json`'a kayıtlı istisnalar kalır) — Kiklop'un ilk csv satırı yazılmadan **önce**.

### 4.7 🆕 Ses tasarımı — korku katmanı (iş kalemi, `@nile`, 24 Ağu 2026)

> **Neden ayrı bir başlık:** sahip *"çok net bir korku teması"* dedi. §4.1'in vardığı sonuç — korku **karanlıktan değil, ölçek + kısıtlılık + sesten** gelecek (art-bible §9 karartmayı yasaklıyor) — sesi bu adanın **birincil korku taşıyıcısı** yapıyor, ikincil bir cila değil. Bu turda hiç ele alınmamıştı; alınmadan bırakılırsa korku teması görsel tarafta kısıtlanmış, işitsel tarafta hiç kurulmamış olur ve **ada düz kalır.**

**Ne üretilecek** (hepsi 0 kredi — mevcut altyapı):

| Katman | İçerik | Nereye oturur |
|---|---|---|
| **Ortam (sürekli)** | Damla, yankı kuyruğu, uzak su; kapı **açıkken** dışarıdan sızan dalga/rüzgâr | `audio.ts` döngüsel kaynak |
| **Kapı olayı** 🆕 | Kapanma: alçak, uzun taş sürtünmesi + ani ortam **kesilmesi** (dışarısı susar). Açılma: aynı sesin tersi + dalga sesinin geri gelmesi | Tek-shot; körleşme durum makinesinin OUT↔PRESENT geçişine bağlı |
| **Devin varlığı (PRESENT)** 🆕 | Uzak ayak sesi — **devin gerçek konumuna/derinliğine bağlı** ses seviyesi ve yönü; sonra horlama/nefes (uyuma noktasına vardığında). Oyuncunun devin nerede olduğunu **görmeden** tahmin etmesinin tek yolu bu | Konum-bazlı; `@helix`'in gezinme dağılımına bağlı |
| **Sessizlik** 🆕 | **Kasıtlı boşluk.** Kapı kapandıktan hemen sonra ve dev uyuduktan sonra ortam katmanı belirgin biçimde **incelir** — gerilim sesin varlığından değil, yokluğundan gelir | Karışım kuralı, yeni asset değil |
| **Oyuncunun kendi sesi** | Ayak sesi + nefes, `DETECT` yükseldikçe belirginleşir (mevcut tasarım, `gdd-detection-cyclops.md` §3.3 — değişmedi) | `DETECT` eğrisine bağlı |
| **CAUGHT** | Tek-shot kükreme (mevcut §4.4.1 tasarımı — değişmedi) | Şok anı |
| **Dekor** | Koyun/keçi meleme (ağıllar) | Ortam, düşük seviye |

**Altyapı:** önce repo'daki **Kenney CC0 paketlerine** bakılmalı (commit `f2e3cdb`, "later Title/Hub and foley cues" için eklenmişti — mağara/taş/hayvan foley'i orada olabilir); yoksa `audio.ts`'in mevcut oscillator/noise deseni. **Yeni bağımlılık eklenmemeli.**

**Kabul kriteri:** kapı kapalıyken, **ekrana bakmadan**, oyuncu (a) devin yaklaşık derinliğini ve (b) uyuyup uyumadığını sesten kestirebilmeli. Bu sağlanmıyorsa korku katmanı işlevsel değil, sadece dekoratif demektir.

> ### 🔴 Sahiplik sorunu — sahibin eylemi gerekiyor
>
> Bu iş **`@echo` · Sound Designer**'ın alanı. **`@echo` Cursor-only** (`CLAUDE.md`: *"Cursor-only extras (same Paca nicks): `@myth` · Narrative Director, `@echo` · Sound Designer"*) — **Claude Code'dan çağrılamıyor**, bu turda da çağrılamadı. Sahip bunu bir **Cursor oturumunda** açmazsa iş sahipsiz kalır ve sessizce düşer. Alternatif: `@byte` (gameplay-programmer) mekanik/tetikleme tarafını yapar, ses **tasarımı** kararları sahibe kalır — ama o zaman "korku sesi" tasarlanmış değil, sadece bağlanmış olur.

---

## 5. Geliştirme mimarisi (`technical-director` bakışı)

### 5.1 Bugünkü şekil — ölçüldü

`src/game.ts` tek bir 1554 satırlık `startGame()` closure'ı. İçinde:
- Lotus dünyasının **tamamı boot anında koşulsuz kuruluyor** (`buildTerrain()`, `buildSea()`, `buildLotusField()`, `buildSteppingStones()`, `buildHillPuzzle()`, `buildShoreStones()`, `buildShip()`, `buildLotophagoi()`, `buildHallucinations()`, `buildThallopes()`, `buildSailor()` — 11 çağrı, hepsi `stage.scene`'e ekleniyor)
- **Hiçbir teardown yok.** `fullRestart()` var ama o *reset* ediyor, *dispose* etmiyor
- `src/constants.ts` (1535 satır) modül seviyesinde `ACTIVE_PROFILE`'a göre dallanıyor; `ISLAND`, `LANDMARK`, `LAGOON`, `PONDS`, `LOTUS`... hepsi Lotus'a özgü sabitler
- `stage.ts` gökyüzü küresi + bulutlar + güneş diski + yön ışığı + `FogExp2` kuruyor — **bir mağarada bunların hiçbiri istenmiyor**
- Tek soyutlama seviyesi: `WorldProfileKey = "test" | "real"` (aynı adanın iki ölçeği) ve `LotusRunKind = "classic" | "edge"` (aynı adanın iki koşusu)

**Sonuç: "level" diye bir kavram yok.** Bu bir eleştiri değil — tek ada varsayımıyla doğru bir mimariydi. Ama ikinci durak bunu doğrudan deliyor.

### 5.2 Üç seçenek

| | **A1 — Ayrı giriş (`?stop=cyclops`, tam sayfa yükleme)** | **A2 — `Stop` arayüzü + yerinde geçiş** | **A3 — Kademeli: yeni kod arkasına dikiş, Lotus adaptörle** |
|---|---|---|---|
| **Ne demek** | Hub kartı `location.href = "?stop=cyclops"`. `main.ts` parametreye bakıp `startGame()` yerine `startCyclops()` çağırır. İki durak asla aynı anda bellekte olmaz | `interface Stop { build(); dispose(); step(dt); }`. `game.ts` kabuk olur, Lotus ve Kiklop iki implementasyon | Kiklop **yeni** `Stop` arayüzünü baştan uygular; Lotus dokunulmadan kalır, ince bir adaptörle aynı arayüze sokulur. Geçiş yine reload (A1 gibi) ama kod şekli A2'ye hazır |
| **`game.ts` refactor** | **Yok** — dokunulmuyor | **Büyük** — 1554 satırlık closure parçalanır | **Küçük** — sadece dışına sarmalayıcı |
| **Regresyon riski (Lotus)** | **~Sıfır** | **Yüksek** — 23 Ağu'da sahip onaylı, canlı, çalışan bir durak | Düşük |
| **GPU/bellek** | **En iyi** — iki dünya hiç birlikte yaşamaz, dispose derdi yok | Dispose doğru yapılmazsa **sızıntı** (geometri/doku/RT'ler); three.js'te en sık hata kaynağı | A1 ile aynı |
| **Kullanıcı deneyimi** | Kısa beyaz/yükleme anı (~1–2 s) durak geçişinde | Kesintisiz | A1 ile aynı |
| **Hub durumu** | Reload'da kaybolur → `cyclopsUnlocked` **sessizce sıfırlanır** ⚠️ | Korunur | `sessionStorage` ile çözülür (1 satır) |
| **Oturum maliyeti** | ~0,5 | **~3–4** | ~1 |

### 5.3 Öneri: **A3**

Gerekçe:
1. **Lotus şu an çalışıyor ve sahip onayladı.** Med-Cezir A2–A5 dün canlıya girdi. En büyük risk, ikinci durağı eklerken birinciyi bozmak — A2 bunu tam olarak yapmaya davetiye.
2. **Bellek/GPU tarafında A1/A3 sadece daha güvenli değil, daha *iyi*.** Bundle bugün 843,7 kB; mağara geometrisi + dokuları + Polyphemos üstüne binince tek sahnede iki dünya tutmanın hiçbir faydası yok, sadece dispose borcu var.
3. **A3, A2'yi ölçmeden reddetmiyor** — Kiklop `Stop` arayüzünü baştan doğru uygularsa, üçüncü durak (Sirenler) geldiğinde A2'ye geçmek ucuzlar. O zamana kadar iki gerçek örnek elde olur.

**A1/A3'ün tek gerçek bedeli — dürüstçe:** durak geçişinde bir reload anı. `screens.md` bunu yasaklamıyor ve hub zaten bir DOM ekranı (WebGL değil) — reload sırasında hub'ın kendisi ekranda kalabilir. `cyclopsUnlocked`/`sirensUnlocked` + hub'a taşınan unutuş (`memory_hub`) `sessionStorage`'a yazılır. Bu proje "kayıt yok" ilkesini savunuyor ama `sessionStorage` **sekme kapanınca silinir** — kalıcı kayıt değil, bir koşunun içi. Uyumlu.

### 5.4 Somut dosya planı (A3)

**Yeni:**
```
src/stops/types.ts          Stop arayüzü + RunContext (memory, unlocked, nick)
src/stops/runState.ts       sessionStorage köprüsü — koşu boyu taşınan tek yer
src/stops/cyclops/cave.ts       mağara geometrisi + oda/ışık bölgesi sorguları
src/stops/cyclops/detect.ts     DETECT durumu + evre saati + onCaught  ← saf, test edilebilir
src/stops/cyclops/forage.ts     azık toplanabilirleri (lotus.ts Plant deseni, evre yok)
src/stops/cyclops/polyphemos.ts CAUGHT anı reveal + korku efekti tetikleri
src/stops/cyclops/stop.ts       Stop implementasyonu — yukarıdakileri birleştirir
scripts/blender/build_cyclops_cave.py
```
**Değişen (küçük, cerrahi):**
```
src/main.ts        ?stop= parametresine göre dallanma
src/constants.ts   yeni CYCLOPS bloğu (tuning.md §12 birebir) + MEM_ISLAND_RELIEF_PCT
src/ui/menu.ts     onSelectCyclops handler'ı + kilitli kart "hayır" tepkisi
index.html         #cardCyclops div → button
src/render/stage.ts  ⚠️ mağara ışık/gökyüzü modu — BURASI ÇAKIŞMA ALANI, bkz. aşağı
src/render/hazePass.ts  ikinci (kehribar) kanal
src/game.ts        yalnız Stop adaptör sarmalayıcısı; iç mantığa dokunulmaz
```

> ⚠️ **Eşzamanlılık uyarısı — `stage.ts`.** Cursor/Grok oturumu 2026-08-23'ten beri `src/render/stage.ts` + `src/constants.ts` + `src/world/{gltf,sailor,humanoidRig}.ts` üzerinde **aktif** (karakter ışığı). Kiklop'un mağara ışık modu tam da `stage.ts`'e dokunuyor. **Bu iki iş aynı anda yapılmamalı.** Ya Grok dilimi kapanana kadar beklenir, ya mağara ışığı `stage.ts`'e hiç dokunmadan ayrı bir `caveStage.ts` olarak yazılır (öneri — A3 zaten iki durağı ayırıyor, ışık kurulumunu da ayırmak doğal). `constants.ts` çakışması kaçınılmaz ama `CYCLOPS` bloğu dosyanın **sonuna** eklenirse merge çatışması pratikte olmaz.

### 5.5 Performans bütçesi

| Kalem | Tahmin | Not |
|---|---|---|
| Mağara mesh | 1 merged geometry, ~8–15k üçgen | Lotus'un arazi + kit + flora'sının **çok altında** — kapalı mekân daha ucuz |
| Draw call | ~8–12 | Ada ~40+; mağara doğal olarak hafif |
| Işık | 1 ambient + 1–2 point (ocak, meşale), `decay` tamed (CLAUDE.md kuralı) | Gökyüzü küresi, bulut shader'ı, güneş diski, deniz Gerstner ızgarası **hiç yüklenmez** → mağara Lotus'tan **daha hızlı** koşmalı |
| Post-process | 🔄 **Revize (D3, `@iris` §4.5):** ~~"haze pass'a kehribar 2. uniform"~~ — **haze pass bu adada hiç çalışmıyor** (unutuş yok), ona kanal eklemek anlamsız. İki ayrı sinyal, iki ayrı yol: **kapı ışığı** = `caveStage.ts`'te ışık animasyonu (**ek pass yok, ek uniform yok**); **algılanma göstergesi** = `@iris`'in A/B/C seçeneklerinden biri (önerisi **C — DOM/CSS overlay**, en ucuz ve mimari olarak en temiz). **`@axiom` kararı** | Bloom mevcut; net sonuç 1. turun tahmininden **daha ucuz** ✅ |
| Bundle | +~15–25 kB kod, + mağara GLB (~200–500 kB) | A3'te mağara GLB yalnız `?stop=cyclops` yolunda yüklenir |
| **Beklenen sonuç** | **Lotus'tan daha hafif bir sahne** | Bu, mobil tarafta rahatlama demek |

### 5.6 Test edilebilirlik

`detect.ts`'i **saf** tutmak (girdi: `lit`, `moving`, `phase`, `zone`, `dt`; çıktı: yeni `detect` + `caught`) `gdd-detection-cyclops.md` §8'in kabul kriterlerinin **birim testle** doğrulanabilmesi demek — bu projede ilk kez gerçek bir birim test yüzeyi olur. Ekstra maliyeti neredeyse sıfır, karşılığı büyük.

> 🆕 **24 Ağu: bu argüman ikiye katlandı.** Artık **iki** saf modül var — `detect.ts` **ve** `blinding.ts` (kapı durum makinesi, saklaş noktası testi, hareketsizlik kuralı, devin gezinme derinliği). İkincisi özellikle önemli: devin gezinme derinliği **rastgele/seed'li** olduğu için (bkz. `gdd-cyclops-blinding.md`) elle oynayarak tüm dalları görmek pratikte imkânsız — dağılımın doğru çalıştığı **yalnızca** birim testle doğrulanabilir. `__LOTOPHAGOI_TEST_HOOKS__`'a `freeze()` + evre atlatma + **kapı durumunu zorlama** eklenirse asset-QA ekran regresyonu da mümkün olur (kapı açık/kapalı iki ayrı baseline karesi).

---

## 6. Sıralı iş planı

Roadmap Faz 2.6b/2.6e'nin altını dolduran, **oturum bazlı** liste. Roadmap tablosu formatında.

> **24 Ağu 2026 — bu tablo yeniden yazıldı.** Adım 0 (karar turu) **kapandı**. Adım 8 (unutuş taşıma) **düştü**. Adım 5 (algılanma) **ikiye bölündü** (körleşme ayrı bir sistem). Adım 3'e **zorunlu Gemini onay kapısı** girdi. Adım 7 P-A'dan **P-C**'ye çıktı. Yeni bir ses adımı eklendi.

| # | İş | Rol | Kapsam |
|---|---|---|---|
| ~~**0**~~ | ~~Karar turu — sahip~~ | — | ✅ **KAPANDI (24 Ağu 2026)** — D1–D9 + körleşme + korku teması + K40. Tek kalan: **D10** (§7.2), ama o yalnız **adım 7'yi** blokluyor, 1–6'yı değil |
| **0b** | **🔴 D9 — `test:assets` manifest kırmızısını temizle.** ⚠️ **Planın eski iddiası (`ship_hero_*`/`water_*`) YANLIŞTI** — `@iris` 24 Ağu'da gerçekten ölçtü (`node scripts/asset-qa/run.mjs --only manifest`), o iki aile CSV'de doğru kayıtlı. Gerçek kırmızı: **3 şema hatası** (`status=retired` tanınmıyor), **~19 "declared but not on disk"** satırı (kasıtlı retired, `(path)` konvansiyonuna sarmalanmalı), **3 gerçek untracked dosya** (`char_doryseus_07/08_*`, başka bir oturumun WIP'i). Tam tanım + kabul kriteri: **§4.6**. **Adım 3b'den önce yapılmalı** | `@axiom` (şema) + `@iris` (csv/registry) | 0,25 oturum |
| 1 | Doküman kilitleme: `tuning.md` §12 (körleşme + revize algılanma sabitleri), `gdd-cyclops-blinding.md`, `level-cyclops-cave.md` — **✅ bu turda büyük ölçüde yapıldı**, kalan yalnız D10 sonrası düzeltme | `@helix` + `@cove` | ✅ ~bitti |
| 2 | **Mimari dikişi:** `src/stops/` iskeleti, `Stop` arayüzü, `?stop=` yönlendirmesi, Lotus adaptörü. **Kiklop içeriği yok** — Lotus'un hiçbir davranışı değişmemiş olmalı. ⚠️ `runState.ts` kapsamı **küçüldü** (K40: taşınacak durum yok; yalnız kilit bayrağı) | `@axiom` + `@byte` | 1 oturum |
| **2b** | **Kilit kalıcılığı (K40):** Lotus bir kez bitince Kiklop kalıcı açılır — tek `localStorage` boolean'ı, `menu.ts`'in oturum-içi `setCyclopsReady()`'sinin kalıcılaştırılması | `@byte` | 0,25 oturum |
| **3a** | **🔴 Gemini konsept turu + sahip onayı** — ada dışı, 3 mağara odası, boğazlar, Polyphemos. Her kalem için 3 varyant → sahip seçer. **Onaysız 3B üretimi yok** (D4-ek). **Korku tonu prompt'larda net hedeflenir** | `@iris` + sahip | §4'te |
| 3b | **Mağara geometrisi:** `build_cyclops_cave.py` (Blender prosedürel) → ASSET-090 GLB; `cave.ts` yükleyici + oda/ışık bölgesi sorguları + çarpışma sınırı + **saklaş noktası hacimleri**; `caveStage.ts` ışık kurulumu (⚠️ `stage.ts`'e **dokunma**, Grok dilimi orada). Oynanabilir boş mağara | `@byte` + `@iris` | §6'da |
| 4 | **Toplama:** `forage.ts` — 7 azık (`@cove` §5.1'in koordinatları), `Plant` API deseni, `E`/`HARVEST_HOLD`, gemiye teslim, 4/4 → Ayrılış. **Hiçbir tehdit yok** — durak bu noktada bitirilebilir olmalı | `@byte` | 1 oturum |
| **5a** | 🆕 **Körleşme çekirdeği:** kapı durum makinesi (OUT/RETURN/PRESENT ↔ açık/kapanıyor/kapalı), küresel ışık katmanı (`doorGlobal`), **PRESENT'te toplama kilidi**, saklaş noktası içinde/dışında testi, hareketsizlik kuralı, devin gezinme derinliği + uyuma noktası, ezilme çarpışması → `onCaught`. 🆕 **`attempt` durumu + `CYCLOPS_CRUSH_CAP` akışı:** `crushCount` sayacı, 3'e ulaşınca durağı başarısız bitirip **denemeyi tamamen sıfırlama** (`delivered` → 0, azık yerleşimi başa, `phaseT`/`DETECT` sıfır) ve hub'a dönüş. ⚠️ **"Deneme" bu projede yeni bir kavram** — `fullRestart()` bugün durak-bazlı düşünmüyor; Kiklop'un `Stop`'u kendi attempt durumunu tutmalı. **Saf/test edilebilir** (`blinding.ts`) | `@byte` | §6'da |
| **5b** | **Algılanma çekirdeği:** `detect.ts` (saf), 2×2 matris, evre çarpanları, `DETECT_DECAY` (tek formül), `onCaught` → **azık yere döküm (D2)** + mağara ağzına ışınlama. **`CAUGHT_MEM_SPIKE` yok.** Birim testler | `@byte` | §6'da |
| 6 | **Sunum:** kehribar algılanma kanalı, **kapı açık/kapalı ışık geçişi** (≥1,5 s, ekran kararmaz), ocak/meşale, oyuncunun kendi ayak sesi/nefesi eğrisi, saklaş noktasının **bakınca okunması** | `@glyph` + `@iris` | §6'da |
| **6b** | 🆕 **Ses tasarımı — korku katmanı.** Nefes, ayak sesi, kapı kapanma/açılma, uzak dolaşan ayak sesi (PRESENT), sessizliğin kullanımı, CAUGHT kükreme. ⚠️ **`@echo` Cursor-only, Claude Code'dan çağrılamıyor** — sahibin bunu Cursor oturumunda açması gerekiyor, yoksa iş sahipsiz kalır | `@echo` (Cursor) | §4'te |
| 7 | **Polyphemos + CAUGHT korku anı:** **P-C** (Tripo mesh + rig, `idle/walk/sleep/settle` — dördü de **sürekli görünecek**, D10). Kamera sarsıntısı, tek-shot kükreme, kenar vurgusu (yükseliş ~200 ms / sönüş ≥1,5 s). ⚠️ **`CYCLOPS_JUMPSCARE_DURATION` düştü** (D10 — "kısa beliriş" diye bir şey yok, dev zaten görünür). 🆕 **Ezilme başına ağırlaşan şok** — `CYCLOPS_CRUSH_CAP`'in kalan hakkını P2'yi bozmadan hissettiren tek kanal, 3. ezilme en ağır. ✅ **D10 blokajı kalktı** | `@iris` + `@byte` | §4'te |
| ~~8~~ | ~~Unutuş taşıma: `MEM_ISLAND_RELIEF_PCT` uygulaması~~ | — | 🔴 **DÜŞTÜ (K40 + D3).** İş kalemi kapatıldı; roadmap 2.6d de kapatıldı |
| 9 | **Hub bağlantısı:** `#cardCyclops` `<div>` → `<button>`, `onSelectCyclops`, kilitli kartta görsel/sesli "hayır" + gerekçe (bugün **sessiz reddetme** var, mevcut UX eksiği), açılış perdesi (§3.2 revize metinleri), Ayrılış hesap kartı, Sirenler kilidi | `@glyph` + `@tide` | 1 oturum |
| 10 | **Playtest + ölçüm turu.** Ölçülecekler: (a) ilk oyunda kaç yakalanma, (b) güvenli minimal rota keşfediliyor mu (level-spec §12.5), (c) `CYCLOPS_ITEM_TOTAL` 7 tempo açısından doğru mu, (d) **yeni `CYCLOPS_CYCLE`'da oyuncu ritmi öğreniyor mu** — oturum başına kaç döngü, (e) tam tur süresi ~5–10 dk hedefinde mi, (f) 🆕 **PRESENT ölü zaman gibi mi hissettiriyor** (oyuncu "bekliyorum, sıkıldım" diyor mu), (g) 🆕 **`CYCLOPS_CRUSH_CAP` = 3 doğru sayı mı** — deneme başına ortalama ezilme, kaç kişi 3'e ulaşıp kaybediyor, kaybedenler tekrar deniyor mu (`tuning.md` §11.7 c), (h) 🆕 **denemenin tamamen sıfırlanması adil mi** — `delivered`'ın da gitmesi "adil bahis" mi "emeğim çöpe gitti" mi (§11.7 d), (i) 🆕 **kalan hak sayı olmadan okunuyor mu** — 2. ezilmeden sonra oyuncu "son şansım" hissediyor mu (§11.7 f), (j) 🆕 **korku tonu tutuyor mu** — D11 sonrası tam karartma serbest; rahatsız edici mi, fotosensitivite kısıtları korunuyor mu | `@flint` + `@pebble` + sahip | 1 oturum |
| 11 | Ölçüm sonrası tuning düzeltmeleri + 🔬 işaretlerinin düşürülmesi + `asset-registry` durum güncellemeleri | `@helix` + `@iris` | 0,5 oturum |

### 6.1 Toplam tahmin (D8) — **~18–19 oturum**

| Adım | Oturum | Adım | Oturum |
|---|---|---|---|
| 0b manifest temizliği | 0,25 | 5b algılanma çekirdeği | 1,0 |
| 2 mimari dikişi | 1,0 | 6 sunum (ışık/gösterge) | 1,0 |
| 2b kilit kalıcılığı | 0,25 | 6b **ses (korku katmanı)** | 1,0 |
| **3a Gemini konsept + onay turları** | **5,0** | 7 Polyphemos P-C + şok anı | 2,5 |
| 3b mağara geometrisi | 1,5 | 9 hub bağlantısı | 1,0 |
| 4 toplama döngüsü | 1,0 | 10 playtest + ölçüm | 1,0 |
| **5a körleşme çekirdeği** | **1,5** | 11 ölçüm sonrası tuning | 0,5 |
| | | **TOPLAM** | **~18,5** |

**Tahminin üç kez büyümesinin dürüst hesabı:**

| Tahmin | Ne zaman / neye dayanıyordu | Sayı |
|---|---|---|
| Roadmap Faz 2.6b+2.6e | 14 Ağu — hub'sız, `Stop` mimarisiz, asset'siz varsayım | **~3** |
| Bu planın 1. turu | 24 Ağu sabahı — hub + A3 mimarisi + P-A silüet + tek yeni sistem | **~10** |
| **Bu planın 2. turu** | 24 Ağu — aşağıdaki dört kalem eklendi | **~18,5** |

**Farkı yaratan dört kalem (hepsi sahip kararı, hiçbiri kapsam kayması değil):**

1. **Zorunlu Gemini onay kapısı (D4-ek): +5 oturum.** En büyük tek kalem. 4 oda konsepti + Polyphemos, her biri 3 varyant + sahip onayı. **Bu bir maliyet değil, bilinçli bir kalite yatırımı** — sahip "hiçbir görsel karar onaysız ilerlemeyecek" dedi; bunun karşılığı budur ve saklanmamalı.
2. **P-C yerine P-A (D4): +2 oturum.** 1. tur 0 kredili kod silüet öneriyordu (~0,5 oturum); şimdi tam Tripo mesh + doku + rig (~80 kredi, ~2,5 oturum) **+ `blender-rig-fix-lessons.md`'nin tarif ettiği risk payı**.
3. **Körleşme, ikinci bir yeni sistem (D3): +1,5 oturum.** 1. turda tek yeni sistem vardı (algılanma). Şimdi iki var ve **aynı zaman çizgisinde bileşiyorlar** — ayrı ayrı yazılıp birlikte debug edilmeleri gerekiyor.
4. **Korku temasının ses katmanı: +1 oturum.** Önceki turlarda hiç yoktu.

**Düşen tek kalem:** unutuş taşıma (eski adım 8, −0,5 oturum) — K40 + D3 ile iptal.

> ⚠️ **`@nile` notu, dürüstlük payı:** 18,5 rakamı **adım 3a'nın gerçekten 5 oturumda kapandığını** varsayıyor. Onay turları doğaları gereği öngörülemez — sahip bir konsepti beğenmezse tur tekrarlanır. Eğer oda konseptleri ortalama **iki** tur alırsa toplam **~22–23**'e çıkar. Bu rakam sabit bir taahhüt değil, bir **büyüklük mertebesi**: bu durak, Lotus Adası'nın çekirdek mekaniğine harcanan emeğin **kabaca iki katı**. Sahip bunu görüp "çok" derse, kapsamı küçültmenin en ucuz iki yolu **(a)** Gemini kapısını yalnız Polyphemos + 1 anahtar oda ile sınırlamak (−3 oturum), **(b)** P-C'yi P-B'ye düşürmek (rig yok, −1,5 oturum + −40 kredi). **İkisi de sahip'in kararı** — ben kapsamı kendiliğimden küçültmüyorum.

**Sıralama gerekçesi (önemli):** 3 → 4 → 5 sırası bilinçli. Her adımın sonunda **oynanabilir bir şey** var: önce boş mağara, sonra bitirilebilir bir durak, sonra zor bir durak. Algılanmayı geometriyle birlikte yazmak, iki yeni şeyi aynı anda debug etmek demek — bu projede en sık batan kalıp (bkz. `blender-rig-fix-lessons.md`).

**⚠️ Bağımlılık uyarısı:** adım 2 ve 8, `constants.ts` + `game.ts` + `menu.ts`'e dokunuyor — yani sahip'in **K-A kararının** (tek koşu, klasik 12'nin kaldırılması, `gdd-lotus-island-scenario.md` §12.2) uygulanacağı dosyaların aynısı. **İkisi paralel yapılmamalı.** Öneri: K-A önce (küçük, kapsamı belli), Kiklop sonra — yoksa `LotusRunKind`/`LOTUS.target` getter'ları iki taraftan birden değişir.

---

## 7. Karar durumu

### 7.1 Kapanan kararlar — D1–D9 (24 Ağu 2026, sahip)

**Hepsi kapandı.** Tam tablo ve gerekçeler §0.0'da. Kısa hâli:

| # | Karar | Not |
|---|---|---|
| D1 | **F3** — azık propu, kart metni aynen, escort AI yok | 1. turun önerisiyle aynı |
| D2 | **C2** — azık düşer, yok olmaz | 1. turun önerisiyle aynı |
| D3 | **Bu adada unutuş yok** — yerine körleşme | 1. turun üç seçeneğinin **hiçbiri değil**; sahip yeni bir mekanik tarif etti |
| D4 | **P-C** — Tripo mesh + rig, ~80 kredi + **zorunlu Gemini onay kapısı** | 1. turun önerisi P-A idi; **sahip tersini seçti** |
| D5 | **A3** — kademeli `src/stops/` dikişi | 1. turun önerisiyle aynı |
| D6 | **N/A** — konusuz kaldı (K40 + D3) | |
| D7 | **Kiklop önce, K-A sonra** | 1. turun önerisi "K-A önce" idi; **sahip tersini seçti** |
| D8 | **Roadmap tahmini güncellensin** | §6'da |
| D9 | **Manifest kırmızısı temizlensin** | §6'da iş kalemi |
| 🔴 K40 | **Duraklar bağımsız** | Yapısal; §0.4'te 7 dosyada işlendi |

**Yeniden açılma kuralı:** bunlar yeni bilgi (playtest ölçümü, teknik engel) olmadan yeniden tartışılmaz. Playtest'e bağlı olarak *ayarlanabilecek* sayılar 🔬 ile işaretli ve §6 adım 10'un ölçüm listesinde.

### 7.2 ✅ D10, D11 ve kayıp koşulu — **kapandı (25 Ağu 2026, sahip)**

**Sahibe açık kavramsal madde kalmadı.** Üçü de kesin karar; türetilmiş/veto-açık değiller.

| # | Karar | Sonuç | Nerede işlendi |
|---|---|---|---|
| **D11** | Korku teması ↔ `art-bible.md` §9 yasakları | **Yasak Kiklop için resmen açıldı.** Bu adada **tam karartma ve karanlık-tehdit dili serbest ve istenen** — genel kural diğer duraklar için bozulmadı. `@iris`'in "hiçbir hücre 0'a inmesin" çözümü artık **zorunlu kısıt değil, tercihe bağlı sunum notu**. **Hâlâ yasak:** mor kristal/fener/bataklık paleti, kırmızı hasar flaşı, can barı, stroboskopik geçiş (fotosensitivite). | `art-bible.md` §4 + §9 (**istisna kutusu**) · `gdd-cyclops-blinding.md` §7.1 |
| **D10** | Polyphemos'un görünürlüğü | **Doğrudan görünen, somut tehdit.** PRESENT boyunca **sürekli sahnede**, ışığın izin verdiği ölçüde **net görülüyor** — silüet/gizem dili **değil**. Eski "yalnız CAUGHT'ta 0,6 s beliriş" kararı (14 Ağu) **kaldırıldı**; `CYCLOPS_JUMPSCARE_DURATION` düştü. **P-C'nin (~80 kredi) yatırım gerekçesi güçlendi** — model dakikalarca ekranda okunacak, `idle/walk/sleep/settle`'ın dördü de görülecek. | `gdd-cyclops-blinding.md` **§7.1** · `level-cyclops-cave.md` §12.4 · `gdd-detection-cyclops.md` |
| **Kayıp koşulu** | `@helix`'in "kayıp yok" önerisi | **REDDEDİLDİ.** Yerine **`CYCLOPS_CRUSH_CAP` = 3**: bir denemede 3. yakalanma/ezilmede durak **başarısız** → hub'a dönülür, **o denemedeki tüm ilerleme (teslim edilen azık dahil) sıfırlanır**, durak **sınırsız kez** yeniden denenebilir (kalıcı ceza yok). Ekranda **gösterilmez** (P2) — ezilme başına ağırlaşan korku efektiyle hissettirilir. | `gdd-cyclops-blinding.md` bitiş/kayıp sözleşmesi · `tuning.md` §12 · §11.7 (c)(d)(f) |

**Bunların üçü birlikte adanın kimliğini netleştirdi:** *karanlık serbest + dev görünür + üç ezilmede deneme biter.* Korku artık **"onu göremiyorum"** değil, **"onu görüyorum, benden büyük, ve üçüncü hatam denemeyi bitirir."**

### 7.2a Arşiv — bu sorular 24 Ağu'da nasıl sorulmuştu

*(Aşağısı 24 Ağu'nun metni. Sahip 25 Ağu'da üçünü de kapattı — yukarıdaki tablo bağlayıcıdır.)*

| # | Soru | Neden açıktı | Kim sunmuştu |
|---|---|---|---|
| **D11** 🔴 | **Korku teması ile `art-bible.md` §9'un üç kilitli yasağı doğrudan çarpışıyor.** Art-bible §9 [P] şunları **yasaklıyor**: (1) *"Karanlık mağara paleti — iptal edildi, **geri gelmez**"*, (2) *"**Tehdidi karanlıkla anlatmak** — bu oyunda tehdit ışıktır. **Ekranı karartmak yasak.**"*, (3) *"Siyah gölge / nötr gri"*. Yeni mekanik ise birebir şu: **kapı kapanır → ışık gider → karanlıkta seni ezebilecek bir şey var.** Bu, 2. yasağın tam tersi. | Bu bir üslup nüansı değil — art-bible'ın **kilitli** bir proje yasağı. `@iris` bunu "korku **yoksunluktan değil, kısıtlılıktan ve ölçekten** gelsin" diye çözdü (hiçbir hücre 0'a inmiyor; en karanlık oda 0.12–0.20 bandında kalıyor) ve bunu **türetilmiş, sahip vetosuna açık** olarak işaretledi. **Ama bu, sahip'in "çok net bir korku teması" isteğinin ne kadarını karşılıyor — bunu sahip söylemeli.** İki yol: **(1)** `@iris`'in çözümü kabul edilir, art-bible §9 olduğu gibi kalır, korkuyu ölçek + ses + CAUGHT şoku taşır; **(2)** sahip gerçekten karanlık ister, o zaman **art-bible §9'un 2. yasağı resmen yeniden açılır ve değiştirilir** — bu, `docs/art/`'ın kilitli bir kararını bozmak demek, hafife alınmamalı. | `@nile` (bu satır) + `@iris` §4.1'de gerekçesiyle |
| **D10** 🟡 | **Polyphemos korku dilinde nasıl var olacak?** (a) **Hiç net gösterme** — klasik korku dili: silüet/gölge/ses, yüz asla okunmaz. (b) **Doğrudan görünür tehdit** — dev tam görülür, korku yakınlıktan gelir. (c) Ara bir yol. | Bu, D4'ün (P-C, tam mesh + rig, ~80 kredi) **yatırım gerekçesini doğrudan etkiliyor**: eğer (a) seçilirse tam rig'in ne kadarı ekranda okunacak, dürüstçe sorulmalı. Ayrıca yeni "körleşme" mekaniği devi **PRESENT boyunca mağarada dolaştırıyor** — eski tasarımdaki "yalnız CAUGHT anında 0,6 s beliriş" kuralı artık **yetmiyor**, dev artık bir süre orada. | `@iris`, §4'te seçenekler + asset/kredi sonuçlarıyla |

### 7.3 Türetilmiş kararlar — sahip vetosuna açık

Sahip'in açıkça söylemediği, ama kapanan kararların kaçınılmaz sonucu olduğu için **türetilen** noktalar. Sahip bunlardan birine "hayır" derse ilgili bölüm yeniden yazılır; hiçbiri implementasyonu bloklamıyor.

| Konu | Türeten | Ne türetildi |
|---|---|---|
| Kilit kalıcılığı | `@nile` | `localStorage`'da tek boolean (`sessionStorage` değil — sekme kapanınca kilit geri gelmemeli). Bkz. `multi-island-concept.md` §10.5 |
| "12 gemi" motifi | `@nile` | `RUN_TARGET_TOTAL` mekanik hedef olmaktan çıktı; 12 **anlatı/görsel motif** olarak kalıyor (`FLEET.count`, direkler). `tuning.md` §3.0 |
| Geometri/sayı türetmeleri | `@cove` / `@helix` | Kendi bölümlerinde tek tek "türetilmiş — sahip vetosuna açık" diye işaretli |
| Ton/palet genişletmesi | `@iris` | `art-bible.md`'ye önerilen metin — **dosya değiştirilmedi**, sahip onaylarsa ayrı turda girer. §4 |

---

## 8. Bu turda değişen dosyalar

### 8.1 1. tur (plan)

| Dosya | Ne oldu |
|---|---|
| `docs/production/cyclops-cave-production-plan.md` | **Yeni** — bu dosya |
| `docs/production/ACTIVE_WORK.md` | Claim satırı eklendi (commit edilmedi) |

### 8.2 🆕 2. tur (24 Ağu 2026 — kararların spec'e çevrilmesi)

| Dosya | Kim | Ne oldu |
|---|---|---|
| `docs/design/level-cyclops-cave.md` | `@cove` | **Baştan yazıldı** — kroki↔tablo çelişkisi çözüldü, saklaş noktaları, ocak konumu, kapı ışık formülü, devin rota hattı, erişim süreleri, 7 azığın koordinatları, kilitlenme kontrolü, §12 açık sorular. `@nile` §12'ye madde 12'yi (D10 çelişkisi) ekledi |
| `docs/design/gdd-cyclops-blinding.md` | `@helix` | **YENİ** — körleşme mekaniğinin otorite dokümanı |
| `docs/design/gdd-detection-cyclops.md` | `@helix` | D3 ile uzlaştırıldı (`CAUGHT_MEM_SPIKE` kaldırıldı, unutuş bağları koptu, `DETECT_DECAY` belirsizliği kapandı, iki katmanın bileşimi tek sözde-kodda) |
| `docs/design/tuning.md` | `@helix` (§12) + `@nile` (diğer) | §12: körleşme sabitleri + revize algılanma. Diğer: §3.0 `RUN_TARGET_TOTAL` düştü, §5.1/§5.2 `MEM_START`/`MEM_ISLAND_RELIEF_PCT`, §10 **K40 satırı**, §11.4 + ölçüm listesi madde 7 |
| `docs/design/multi-island-concept.md` | `@nile` | **Yeni §10 (K40)** — kararın kendisi, geçersizler listesi, kilit kalıcılığı. Üstte kırmızı uyarı |
| `docs/design/gdd-memory-system.md` | `@nile` | Üstbilgi K40 notu, §3.1 madde 1, §3.4 Kiklop satırı (**bağ koptu**), **§3.5 geçersiz**, §4.4, playtest tablosu |
| `docs/design/game-concept.md` | `@nile` | §2 Tür/Hedef oturum/Kapsam, Kapanan kararlar (**K40 satırı**), §3 |
| `docs/production/roadmap.md` | `@nile` | **Faz 2.6d düşürüldü**, 2.6e kapsamı büyüdü, **K40 satırı**, K27/K28/K30 işaretlendi |
| `docs/ux/screens.md` | `@nile` | Üstbilgi: C (Hibrit) kilidi → **kalıcı kilit**; S3 ve "Koşu sonu" ekranı konusuz |
| `docs/production/cyclops-cave-production-plan.md` | `@nile` + `@iris` (§4) | §0.0 karar tablosu, §0.1/§0.4, §1 devir, §2.1/§2.3/§2.4, §3.1/§3.2/§3.3, **§4 baştan (`@iris`)**, §4.7 ses (`@nile`), §5.5/§5.6, §6, §7, §8, §9 |
| `docs/production/ACTIVE_WORK.md` | `@nile` | 2. tur claim satırı (**commit edilmedi**) |

**`src/`'ye tek satır yazılmadı. `public/assets/`'e tek dosya eklenmedi. Hiçbir üretim pipeline'ı çalıştırılmadı, kredi harcanmadı.** Tek çalıştırılan komut: `node scripts/asset-qa/run.mjs --only manifest` (`@iris`, **salt-okuma QA kontrolü**, üretim değil — D9'u gerçekten ölçmek için). Cursor/Grok'un `src/render/stage.ts` + `src/world/{gltf,sailor,humanoidRig}.ts` alanına **dokunulmadı**.

---

## 9. Paca kartları — taslak (sahip kendisi açacak)

`http://localhost:8090` 1. turda erişilemedi. Başlık şablonu `Ortam │ State │ Title` (İngilizce), yorumlar Türkçe, her yorum `[@nick · Title]` ile başlar.

**Epic:** `Lotophagoi │ Cyclops Cave │ Stop 2 — production` — alt kartlar §6'nın satırları.

> **24 Ağu: liste yeniden yazıldı.** D1/D2 kartları **kapandı** (sahip cevapladı). `MEM_ISLAND_RELIEF_PCT` kartı **düştü** (K40). "amber edge channel" kartı yeniden çerçevelendi (D3 — haze pass kullanılmıyor). Körleşme, kilit kalıcılığı, ses ve iki karar kartı **yeni**.

| Kart başlığı | Kaynak | Bloklayan |
|---|---|---|
| ~~`… Lock the narrative frame and hub card copy`~~ | D1 | ✅ **Kapandı** (F3) |
| ~~`… Fix the unwinnable caught-loss rule`~~ | D2 | ✅ **Kapandı** (C2) |
| ~~`… Decide the horror tone vs. art-bible §9 bans`~~ | **D11** | ✅ **Kapandı** — yasak Kiklop için açıldı |
| ~~`… Decide how Polyphemos reads in the horror language`~~ | **D10** | ✅ **Kapandı** — doğrudan görünür tehdit |
| 🆕 `Lotophagoi │ Cyclops Cave │ Attempt state and CYCLOPS_CRUSH_CAP failure flow` | §6.5a / kayıp koşulu | §6.4 |
| `Lotophagoi │ Pipeline │ Clear the red manifest gate before new assets` | §4.6 / D9 | — |
| `Lotophagoi │ Engine │ Introduce the Stop seam and ?stop routing` | §6.2 / D5 | — (D7: Kiklop önce) |
| 🆕 `Lotophagoi │ Hub │ Persist the Cyclops unlock across sessions` | §6.2b / K40 | §6.2 |
| 🆕 `Lotophagoi │ Cyclops Cave │ Gemini concept round and sahip approval gate` | §4.2 / D4-ek | D11 |
| `Lotophagoi │ Cyclops Cave │ Procedural cave shell (ASSET-090) and cave stage` | §6.3b | §6.2, §4.6, §4.2 |
| `Lotophagoi │ Cyclops Cave │ Forage collectibles and delivery loop` | §6.4 | §6.3b |
| 🆕 `Lotophagoi │ Cyclops Cave │ Blinding core — door cycle, hiding spots, stillness` | §6.5a | §6.4 |
| `Lotophagoi │ Cyclops Cave │ Detection core and onCaught (unit-tested)` | §6.5b | §6.5a |
| `Lotophagoi │ Cyclops Cave │ Door light transition and detection indicator` | §6.6 / §4.5 | §6.5b |
| 🆕 `Lotophagoi │ Cyclops Cave │ Horror audio layer — presence, door, silence` | §4.7 / §6.6b | §6.5a · ⚠️ `@echo` **Cursor-only** |
| `Lotophagoi │ Cyclops Cave │ Polyphemos (P-C) and the caught scare beat` | §6.7 / D4 | **D10**, §6.5a |
| `Lotophagoi │ Hub │ Wire the Cyclops card, opening curtain and departure card` | §6.9 | §6.4 |
| `Lotophagoi │ Cyclops Cave │ Playtest and measurement round` | §6.10 | §6.9 |
