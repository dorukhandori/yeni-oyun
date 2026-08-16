# Asset test platformu — `npm run test:assets`

> **Ne bu:** yeni bir asset (AI-üretimi ya da elle yapılmış) `public/assets/` altına girmeden önce tek komutla koşturulan yerel doğrulama kapısı. `docs/art/pipeline.md` §8'in "kabul kapısı" checklist'ini elle-göz kararı olmaktan çıkarıp makinaya devreden alt küme.
> **Tarih:** 2026-08-16 · **Yazan:** `technical-director` alt-ajanı · **Durum:** **altı kontrolün altısı da çalışıyor** (sahip 2026-08-16 onayladı, bağımlılıklar kuruldu). Commit edilmedi.
> **Yetki:** bu doküman operasyonel — hiçbir mekanik/tuning/görsel stil kararı vermez. Eşikleri `docs/art/pipeline.md` §6/§7/§8, `docs/art/art-bible.md` §2 ve `docs/ux/screens.md` §3.5'ten **okur**, kendi sayısını icat etmez.

---

## 0. Neden tek platform — üç dağınık öneriyi birleştirmek

Şu ana kadar üç ayrı yerde üç ayrı araç önerilmişti:

| Nereden | Öneri | Durum |
|---|---|---|
| `lotophagoi-problems-repo-solutions.md` S4 | `assets.csv` ↔ disk manifest denetimi (kyh-vibedgames `asset_manifest_check.py`'nin CSV'ye uyarlanması) | öneri |
| `lotophagoi-problems-repo-solutions.md` S2/S3 | canvas inspector + Playwright görsel QA | öneri |
| `lotophagoi-visual-quality-benchmark.md` §4 V-QA1/2/3 | `pixelmatch`+Playwright, `color-thief`, `wcag-contrast` | öneri |

Üçünü ayrı ayrı kurmak, tek geliştirici için üç ayrı komut, üç ayrı çıktı formatı ve üç ayrı "bunu koşmayı unuttum" demek. Bu doküman hepsini **tek orkestratör + N tane bağımsız kontrol modülü** hâline getirir: bir komut, tek rapor, tek exit code.

**Yerine geçmediği şey:** `pipeline.md` §8'deki insan kapıları. "NOT photoreal", "IP temiz", "spritesheet döngü başı-sonu birleşiyor", "unutuş texture'a gömülmemiş" maddeleri **makine kararı değil** — bu platform onları kontrol etmez ve etmiyormuş gibi de davranmaz. Otomatikleşen kısım checklist'in ölçülebilir yarısı; kalan yarısı hâlâ sahip kapısı.

---

## 1. Mimari

```
scripts/
  asset-qa/                 # DOĞRULAMA — hiçbir zaman asset/src dosyası değiştirmez
    run.mjs                 # orkestratör  ->  npm run test:assets
    baseline.json           # kabul edilmiş bulgular (--update-baseline üretir)
    baselines/*.png         # 6 ekran görüntüsü referansı — COMMIT EDİLİR
    lib/
      context.mjs           # tek seferlik disk taraması + manifest parse -> paylaşılan ctx
      csv.mjs               # assets.csv okuyucu (yorum satırı + tırnak desteği)
      imageSize.mjs         # PNG/WebP başlığından boyut — sıfır bağımlılık
      report.mjs            # Finding şekli, severity, ANSI renk
      browser.mjs           # tek Vite sunucusu + tek Chromium, üç kontrol paylaşır
    checks/
      manifest.mjs          # C1  assets.csv <-> disk            sıfır bağımlılık
      naming.mjs            # C2  isimlendirme + çözünürlük      sıfır bağımlılık
      budget.mjs            # C3  dosya/indirme bütçesi          sıfır bağımlılık
      contrast.mjs          # C5  WCAG kontrastı                 playwright
      palette.mjs           # C4  dE2000 palet uyumu             playwright + culori
      regression.mjs        # C6  ekran görüntüsü regresyonu     playwright + pixelmatch
      planned.mjs           # C7-C8 bildirimi (henüz kod değil)
.asset-qa-out/              # başarısız çalıştırmanın diff/actual PNG'leri (gitignore)
```

Statik üçlü önce koşar: bozuk bir manifest, tarayıcı 30 saniye harcamadan önce raporlanır.

### 1.1 Modül sözleşmesi

`src/world/` altındaki her builder'ın `{ group, update(t) }` döndürmesiyle aynı disiplin — her kontrol modülü şunu ihraç eder:

```js
export const id       = "manifest";                       // --only ile seçilir, baseline anahtarı öneki
export const title    = "assets.csv <-> public/assets/";  // rapordaki başlık
export const requires = [];                               // gerekli npm paketleri
export async function run(ctx) -> { findings: Finding[], notes?: string[] }
```

Bunun bedava getirdikleri:

- **Yeni kontrol = 1 dosya + `run.mjs`'te 1 satır import.** Orkestratör hiç değişmez.
- **`requires` boş değilse ve paket kurulu değilse kontrol `SKIP`, asla `FAIL`.** Kurulmamış opsiyonel bağımlılık kapıyı kırmızıya boyarsa kimse kapıyı koşmaz.
- **Tek disk taraması.** `context.mjs` bir kez tarar, altıncı kontrolü eklemek ek I/O maliyeti getirmez.
- **Kontroller `public/assets/` ve `src/`'ye yazmaz.** Doğrulama ile üretim ayrı (bkz. §3). `npm run dev` açıkken koşmak güvenli — sunucuya, porta, dosyaya dokunmuyor.

### 1.2 `Finding` ve baseline

```js
{ key: "manifest/untracked-file/ui/x.webp", severity: "error"|"warn"|"info", message, hint? }
```

`key` **çalıştırmalar arası sabit** olmalı (zaman damgası, byte sayısı, mutlak yol içermez) — çünkü `baseline.json` bunu saklıyor.

Baseline'ın varlık sebebi: bu repo **bugün zaten** 46 bulgu üretiyor (§5). Baseline olmayan bir kapı ilk günden kırmızı kalır, kırmızı kalan kapı görmezden gelinir, görmezden gelinen kapı yoktur. `--update-baseline` "bunları gördüm, şimdilik kabul ediyorum" demektir; **yeni** sapma her zaman kırmızı yapar.

> `baseline.json` 2026-08-16'da mevcut 46 bulguyu kabul ederek oluşturuldu (`--update-baseline`), böylece kapı bugün yeşil ve **bundan sonraki** her sapma kırmızı yapıyor. Bu bir temizlik değil bir erteleme: §5'teki liste hâlâ kapatılmayı bekliyor, sadece artık yeni sorunları gizlemiyor.

### 1.3 CLI

```bash
npm run test:assets                      # tam kapı, exit 0/1
node scripts/asset-qa/run.mjs --only manifest
node scripts/asset-qa/run.mjs --strict            # warn de FAIL sayılır
node scripts/asset-qa/run.mjs --json report.json  # makine okunur çıktı
node scripts/asset-qa/run.mjs --update-baseline   # mevcut bulguları kabul et
```

Exit: `0` geçti · `1` yeni bulgu · `2` harness hatası.

---

## 2. Kontroller

| # | id | Neyi doğrular | Kaynak kural | Bağımlılık | Durum |
|---|---|---|---|---|---|
| C1 | `manifest` | Diskteki her dosyanın CSV satırı var; her CSV satırının dosyası var; `asset_id` tekil; `model`/`seed`/`status` dolu ve geçerli | `pipeline.md` §7 | yok | **çalışıyor** |
| C2 | `naming` | `kategori_ad_varyant_kanal_çözünürlük.uzantı`; kategori/kanal sözlükte; çözünürlük merdivende; **dosya adındaki çözünürlük gerçek piksel boyutundan küçük değil** | `pipeline.md` §6 | yok | **çalışıyor** |
| C3 | `budget` | Dosya başı tavan (texture 300 KB · spritesheet 500 KB · sky 600 KB), toplam ilk indirme ≤ 8 MB, PNG→WebP dönüşüm borcu | `pipeline.md` §6 | yok | **çalışıyor** |
| C4 | `palette` | Her sahne texture'unun baskın renkleri art-bible §2 paletine ΔE2000 ≤ 12 | `art-bible.md` §2 · benchmark §5 #1 | playwright, culori | **çalışıyor** |
| C5 | `contrast` | HUD/menü metni ↔ arkasındaki gerçek piksel ≥ 4.5:1 (büyük metin 3:1) | `ux/screens.md` §3.5 · benchmark §5 #2 | playwright, pngjs | **çalışıyor** |
| C6 | `regression` | 6 sabit ekran görüntüsü baseline'a karşı ≤ %0.1 piksel farkı | benchmark §5 #3 | playwright, pixelmatch, pngjs | **çalışıyor** |

### C2 hakkında bir uyarlama notu

İlk sürüm "dosya adı 512 diyorsa dosya tam 512 olmalı" diye kontrol ediyordu ve 20+ yanlış pozitif üretti: bu repoda dosya adındaki sayı **nominal kaynak çözünürlüğü**, alpha-key sonrası kırpma dosyayı küçültüyor (`flora_lilypad_01_albedo_512.webp` → 547×643 gibi). Kontrol bu yüzden yalnızca **aşan** yönü bulgu sayıyor — çünkü bütçeyi bozan yön o. Spritesheet'ler (`_sheet_` kanalı) tamamen muaf: oradaki `2048` kare kutusu, sayfa genişliği değil, ve `pipeline.md` §6 bu durumu tanımlamıyor (bkz. §6 açık soru 2).

Bu, platformun genel ilkesi: **yanlış pozitif üreten bir kural, kuralın kendisinin eksik tanımlandığının kanıtıdır** — kuralı gevşetip açık soruyu §6'ya yazıyoruz, kontrolü sessizce kapatmıyoruz.

---

## 3. "Yapının iyileştirilmesi" — `scripts/` yeniden düzeni (ÖNERİ, taşıma yapılmadı)

`scripts/` şu an 6 script + 1 python lib'i düz bir klasörde tutuyor ve iki farklı iş yapıyor: **üretim** (dosya yazar, ffmpeg/Gemini API çağırır, geri alınamaz) ve artık **doğrulama** (hiçbir şey yazmaz). Bu ikisini karıştırmak, bir asset QA script'ini yanlışlıkla `--ship` bayrağıyla koşturmak gibi bir hata sınıfı üretir.

**Önerilen hedef:**

```
scripts/
  pipeline/                 # ÜRETİM — dosya yazar, dış servis çağırır
    gen-assets.mjs
    gen-gemini-image.mjs
    sheet-from-still.mjs
    sheet-from-video.mjs
    pack-walk-cycle.py
    slice_turnaround.py
    lib/
      rgba_key.py
  asset-qa/                 # DOĞRULAMA — salt okunur (bugün zaten böyle)
    ...
```

Kural tek cümle: **`pipeline/` yazar, `asset-qa/` okur.** Gelecekteki chroma-key/manifest-yazan script'ler `pipeline/`'a, yeni kontroller `asset-qa/checks/`'e gider; ikisi arasında ortak kod gerekirse `asset-qa/lib/csv.mjs` gibi saf-okuma modüller paylaşılabilir, ters yön (QA'nın pipeline'dan import etmesi) yasak.

**Taşımanın maliyeti (bu yüzden şimdi yapılmadı):**

| Dokunulacak | Neden |
|---|---|
| `package.json` 3 script satırı | `gen:assets`, `sheet:still`, `sheet:video` yolları |
| `scripts/sheet-from-video.mjs` docstring'i + `sheet-from-still.mjs` | usage örneklerindeki yollar |
| `pipeline.md` §6 klasör şeması, satır 183 | `scripts/` açıklaması |
| `docs/art/pipeline.md` §5 ve `asset-registry.md` içindeki script yolu atıfları | metin |
| Python `scripts/lib/` import yolu | `pack-walk-cycle.py` / `slice_turnaround.py` `lib.rgba_key` import'u |

Yaklaşık 10 dakikalık mekanik iş ama **eşzamanlı ajan riski yüksek** (git mv + doküman güncellemesi aynı anda başka bir oturum `scripts/`'e dokunuyorsa çakışır). Önerim: bu taşımayı asset-qa onaylandıktan **sonra**, tek başına, tek commit'te yapmak. `asset-qa/` zaten doğru yerde doğduğu için taşınmasına gerek yok — sadece mevcut 6 script `pipeline/`'a iner.

---

## 4. Bağımlılıklar — sahip onayladı, KURULDU (2026-08-16)

Boyutlar `npm view <pkg> dist.unpackedSize` ile sorgulandı; kurulum `npm install --save-dev playwright pixelmatch pngjs culori` + `npx playwright install chromium`.

**`playwright` seçildi, `@playwright/test` değil.** Gerekçe: `@playwright/test` bir test *koşucusu* getiriyor (config keşfi, `expect`, kendi raporlayıcısı). Bizim koşucumuz zaten `run.mjs` ve tüm kontrol sözleşmesi ona bağlı. İki koşucu, iki rapor formatı ve "hangi komutu çalıştıracağım" belirsizliği demek olurdu. Sade `playwright` yalnızca tarayıcı otomasyon API'sini veriyor — ihtiyacımız olan tam olarak bu.

**`npm audit` notu:** kurulumdan sonra 2 açık (1 moderate, 1 high) raporlanıyor. **Bunların ikisi de kurulumdan önce vardı** — `vite@5` → `esbuild` zinciri. Düzeltmesi `vite@8`'e breaking upgrade; bu platformun kapsamı değil, ayrı bir karar. Yeni kurulan dört paketin hiçbiri açık getirmedi.

### 4.1 Mimari karar: bir tarayıcı, üç kontrol

C4/C5/C6'yı **ayrı ayrı** kurmak Node tarafında bir görüntü çözücü gerektirir ve asıl maliyet orada: `pngjs` yalnızca PNG okur, oysa bu repoda shipping asset'lerin yarısı **WebP**. Node'da WebP çözmek `sharp` (native binary, platforma bağlı) ya da `@jsquash/webp` (wasm) demek.

Alternatif: **üç kontrolü de Playwright'ın Chromium'unda koşturmak.** Chromium PNG'yi de WebP'yi de zaten çözüyor; baskın renk çıkarımı `<canvas>` + `getImageData` ile 40 satır. Böylece:

- `sharp` / `@jsquash/webp` / `colorthief` **hiç gerekmez**
- C5 (kontrast) ve C6 (regresyon) zaten tarayıcı istiyordu — bağımlılık paylaşılıyor
- Aynı `page.screenshot()` hem kontrast örneklemesi hem regresyon karşılaştırması için kullanılıyor

### 4.2 Önerilen liste

| Paket | Sürüm | Paket boyutu | Bağımlılıkları | Ne için | Risk |
|---|---|---|---|---|---|
| `playwright` | 1.62.1 | 4.9 MB (+`playwright-core`) | `playwright-core` | C5, C6, C4 | **Asıl maliyet paket değil, tarayıcı indirmesi:** `npx playwright install chromium` ~150 MB, repo'ya değil `~/Library/Caches/ms-playwright`'a iner. Microsoft bakımlı, gamedev-dışı ama devDependency olarak standart. |
| `pixelmatch` | 7.2.0 | 21 KB | `pngjs` | C6 piksel farkı | Çok düşük. mapbox, tek amaçlı, stabil. |
| `pngjs` | 7.0.0 | 635 KB | yok | C6 (screenshot PNG decode) | Düşük; `pixelmatch` zaten getiriyor. |
| `culori` | 4.0.2 | 1.1 MB | yok | C4 ΔE2000 | Düşük, saf JS, tree-shakeable. **`colorjs.io` yerine bunu öneriyorum: colorjs.io 15.4 MB açılıyor**, tek bir ΔE fonksiyonu için orantısız. |

**Toplam:** ~6.7 MB `node_modules` + repo dışında 150 MB tarayıcı cache. `vite build` çıktısına **sıfır** etki — hepsi devDependency, hiçbiri `src/`'den import edilmiyor.

### 4.3 Reddedilenler ve gerekçeleri

| Paket | Neden hayır |
|---|---|
| `colorthief` (1.66 MB) | Tarayıcı build'i `<canvas>`'a bağlı; Node yolu ayrı bir çözücü gerektiriyor. §4.1'deki tarayıcı yaklaşımında zaten canvas var — o zaman median-cut'ı 40 satırda kendimiz yazarız, bir bağımlılık daha eklemeyiz. Benchmark §4 V-QA2'nin önerisinden **bilinçli sapma.** |
| `wcag-contrast` (24 KB) | Küçük ve zararsız, ama WCAG kontrast oranı 15 satır matematik (relative luminance + `(L1+0.05)/(L2+0.05)`). Tedarik zincirine bir giriş daha eklemeye değmez. Benchmark §4 V-QA3'ten **bilinçli sapma** — kriter aynı kalıyor, aracı değişiyor. |
| `colorjs.io` (15.4 MB) | Tek fonksiyon için 15 MB. `culori` aynı işi yapıyor. |
| `sharp` | Native binary, platforma özel, CI'da ayrı derdi. §4.1 sayesinde gereksiz. |
| `n8ao` | Bu platformun konusu değil — render bağımlılığı, `technical-director` ayrıca değerlendirir (benchmark V1). |

---

## 4.5 Determinizm — asıl iş buradaydı

Ekran görüntüsü regresyonu, kurulumun **tek zor parçasıydı** ve iki tur hata aldı. Kayda geçmesi gereken şey:

**İlk deneme:** `setPhase("play", {seed})` + `freeze()` + 1200 ms duvar-saati bekleme. Sonuç: DOM ekranları (`title`, `hub`) %0.000–0.015 oynadı ama 3D sahne **%8–18 fark verdi**. Kullanılamaz.

**Sebep 1 — duvar saati.** `await page.waitForTimeout(1200)` sabit *süre* bekler, sabit *adım sayısı* değil. Makine yüküne göre 60 Hz döngü farklı sayıda `step()` çalıştırır, dolayısıyla dünya farklı bir simülasyon zamanında donar. → Çözüm: `runSteps(n)` hook'u, tam olarak n sabit adım.

**Sebep 2 — tohumsuz `Math.random`.** `burst.ts` tek başına spawn başına 21 rastgele sayı çekiyor. → Çözüm: `seedRandom(seed)` hook'u, global `Math.random`'ı mulberry32 ile değiştirir (yalnızca DEV).

**Sebep 3 — dünya saati restart'ta sıfırlanmıyor.** Bu, diff görüntüsüne bakmadan bulunamazdı: geometri **birebir aynıydı** (gri), fark yalnızca denizin üstündeydi — kayan caustic/köpük UV'leri. `fullRestart()` dünyayı yeniden kuruyor ama `time` değişkenine dokunmuyor, yani ilk (duvar-saatli) ısınma turunun zamanı restart'ın içinden sızıyordu. → Çözüm: `resetClock()` hook'u — `time`, `st.dayTime`, `stage.bloomBoost` sıfırlanır. **Oyun davranışı değiştirilmedi**; restart'ın gerçek semantiği ne olmalı sorusu `game-designer`'ın, benim değil (bkz. §7 soru 8).

**Sonuç:** altı görüntünün dördü (3D olanlar) art arda çalıştırmada **%0.000** fark veriyor. `title` %0.006–0.015 arası oynuyor (CSS mote animasyonları + sürüm etiketi); `page.screenshot({ animations: "disabled" })` bunu büyük ölçüde bastırıyor ve kalan artık %0.1 eşiğinin çok altında.

**Bir tuzak daha, kayda değer:** `page.waitForFunction` Playwright'ta *izole dünyada* çalışır — DOM'u paylaşır ama sayfa script'lerinin `window` üzerine astığı özellikleri **görmez**. `__LOTOPHAGOI_TEST_HOOKS__` bu yüzden hiç görünmedi ve 60 saniye timeout'a düştü. `page.evaluate` ana dünyada çalışıyor; hazır olma beklemesi onun üstüne kuruldu (`lib/browser.mjs`).

---

## 4.6 `window.__LOTOPHAGOI_TEST_HOOKS__` — DEV-only seam

`src/game.ts` `TestHooks` arayüzünü ihraç eder, `src/main.ts` onu `import.meta.env.DEV` arkasında window'a asar.

| Hook | Ne yapar |
|---|---|
| `getState()` | `GameState` kopyası |
| `setPhase(phase, {kind, seed})` | Menünün kullandığı **aynı** fonksiyonlara yönlenir (`goTitle`/`goHub`/`fullRestart`) — DOM overlay ve HUD gerçek oyundaki durumda kalır |
| `setProfile(profile)` | Sorgu parametresiyle **reload**. `ACTIVE_PROFILE` modül yüklenirken bir kez çözülüyor ve her world builder profile-bağımlı değerleri kuruluşta yakalıyor; yerinde değiştirmek ada geometrisini tuning sayılarından ayırırdı |
| `setMemory(v)` | 0..1 unutuş |
| `seedRandom(seed)` | Global `Math.random` → mulberry32 |
| `resetClock()` | `time` / `dayTime` / `bloomBoost` sıfırla |
| `runSteps(n)` | Tam n sabit 60 Hz adım |
| `freeze()` / `unfreeze()` | Simülasyonu durdur/başlat |

**Prod build'e sızmıyor — ölçüldü.** Kritik ayrıntı: yalnızca `main.ts`'teki atamayı gate'lemek **yetmedi**. Rollup window özellik adını düşürdü ama `startGame`'in döndürdüğü nesne literalini ve adlandırdığı tüm closure'ları yine de üretti (~370 bayt, erişilemez ama gönderiliyor). Çözüm `return`'ün kendisini gate'lemek:

```ts
export function startGame(canvas: HTMLCanvasElement): TestHooks | null {
  ...
  if (!import.meta.env.DEV) return null;
  return { getState: ..., setPhase: ..., ... };
}
```

`npm run build` sonrası doğrulama — `dist/assets/index-*.js` içinde **sıfır** eşleşme:

```
__LOTOPHAGOI_TEST_HOOKS__   0
seedRandom                  0
resetClock                  0
runSteps                    0
setProfile                  0
unfreeze                    0
```

---

## 5. Platform gerçekten ne buldu (2026-08-16, `npm run test:assets`)

Bu **çalıştırılmış** çıktıdır, tahmin değil. Kapı `exit 1` verdi; 3 kontrolün 2'si `FAIL`.

### C1 manifest — 4 hata (hepsi gerçek)

| Bulgu | Yorum |
|---|---|
| `ui/title_bg_key_art_1344.webp` diskte var, **`assets.csv` satırı yok** | `pipeline.md` §7'nin bağlayıcı kuralının doğrudan ihlali. Dosya `asset-registry.md` ASSET-003 notunda "türevi" olarak geçiyor ama kendi manifest satırı yok — Title/Hub ekranında canlı kullanılıyor (`hud.css .hub-bg`). |
| ASSET-021 `ref/ship_concept_01_ref_1344.png` diskte yok | |
| ASSET-037 `ref/ui_hubmap_sheet_01_ref_2048.png` diskte yok | |
| ASSET-030 `media/trailer_announce_01.mp4` diskte yok | `public/assets/media/` klasörü hiç yok. Bu üçü muhtemelen `(parantez)` "unshipped" konvansiyonuna geçmeli — ama bu bir **kayıt kararı**, `art-director` vermeli. |

### C2 naming — 0 hata, 19 uyarı

En dikkat çekici olanlar, çünkü doğrudan doku belleği demek:

- `textures/water_foam_01_alpha_512.webp` → gerçekte 1267×512 = **adının vaat ettiğinin 6.1 katı** doku belleği
- `textures/water_shallow_01_normal_512.webp`, `water_lake_01_normal_512.webp`, `water_caustic_01_caustic_512.webp`, `sand_pebble_01_albedo_512.png` → hepsi 1024×1024, **4 kat**
- `ui/title_bg_key_art_1344.webp` isimlendirme kuralına hiç uymuyor (kategori `title`, kanal `art`, varyant `key`, çözünürlük merdiven dışı)
- ASSET-001/002: manifest `resolution=1024`, dosya adı `_2048` — ikisinden biri yanlış
- 9 spritesheet satırında `resolution` kolonunda piksel değil **klip süresi (`8s`)** var

### C3 budget — 1 hata, 7 uyarı

- **`public/assets/` toplam 10.12 MB, `pipeline.md` §6 hedefi 8 MB.** Bu, bugün ölçülmüş, hedefi %26 aşan bir sayı. (Bunun 1.90 MB'ı `ref/` — oyuna girmiyor ama `public/` altında olduğu için yine de indiriliyor; kontrol ikisini ayrı raporluyor, hedefe saymıyor.)
- 23 dosya hâlâ PNG, toplam 9.01 MB — bu repodaki mevcut PNG→WebP dönüşümleri %10–95 arası kazanç sağlamıştı (`assets.csv` notlarından)
- Tavan aşanlar: `ui_parchment_panel` 958 KB, `ui_frame_gold` 768 KB, `sand_pebble` 1.57 MB, 3× hubmap ikonu ~400 KB, `walk_front` sheet 651 KB

### C5 contrast — 12 hata (en sert blok)

Hiçbiri daha önce ölçülmemişti. `text-shadow` WCAG'de kredilendirilmediği için bunlar **kötümser ama spec'e sadık** sayılar:

| Ekran | Eleman | Oran | Eşik |
|---|---|---|---|
| hub | `.hub-quest-name` "Beş yeter" | **2.20:1** | 4.5 |
| hub | `.hub-island-name` "Lotus Adası" | **2.22:1** | 4.5 |
| hub | `.hub-island-badge.ready` "Hazır" | **2.22:1** | 4.5 |
| hub | `.hub-island-name` (Kiklop / Sirenler) | 2.29 / 2.35:1 | 4.5 |
| hub | `.hub-title` | 3.94:1 | 4.5 |
| title | `.menu-btn` (Oyna / Nasıl oynanır / Hakkında) | 3.20–3.28:1 | 4.5 |
| title | `.title-sub` "Odysseia" | 3.31:1 | 4.5 |
| title | `.title-name` | 4.53:1 | 3 (büyük metin) — **geçti** |

Bu tam olarak ASSET-052 sonrası elle yamanan yer. Yama kontrastı **iyileştirdi ama AA'ya taşımadı** — busy bir illüstrasyonun üstünde krem text-shadow ile 4.5:1'e çıkmak zor. Bu bir `ux-designer` + `art-director` kararı: opak plaka mı, daha koyu scrim mi, yoksa "büyük metin 3:1" istisnasına mı oynanacak.

### C4 palette — 2 uyarı, 18 geçiş

Palet ailesi genel olarak **çok tutarlı** (çoğu asset dE 2–8). İki aykırı:

- ASSET-005 (lotus yarı-açık): baskın `#ab646c`, en yakın palet girdisinden dE **15.1**
- ASSET-007 (lotus solmuş): baskın `#4b3b2a`, dE **20.2** — palette'te "Solmuş kahve `#8e6f4e`" var ama bu ondan belirgin daha koyu

Not: normal/caustic map'ler otomatik atlanıyor (veri, renk değil — `pipeline.md` §6).

### C6 regression — 6 baseline kuruldu, ardışık çalıştırmada %0.000

> Bu beş blok, platformun tek bir komutta, tamamen mevcut dokümanların kendi kurallarını uygulayarak bulduklarıdır. Toplam **46 bulgu**, hiçbiri daha önce raporlanmamıştı.

---

## 6. Benchmark §5 kabul kriterlerinin karşılığı

| # | Kriter (benchmark §5) | Bu platformda | Durum |
|---|---|---|---|
| 1 | Palet uyumu, ΔE2000 ≤ 12 | **C4 `palette`.** Palet hex'leri `docs/art/art-bible.md` §2 tablolarından **parse edilir**, ikinci bir renk listesi tutulmaz — art-bible değişince kontrol otomatik takip eder. Baskın renk Chromium canvas'ta 5-bit histogramla; ΔE `culori`. | **karşılandı** |
| 2 | HUD/menü kontrastı ≥ 4.5:1 | **C5 `contrast`.** Title + Hub açılır, izlenen seçicilerin bounding box'ı screenshot'tan örneklenir, metin rengi `getComputedStyle`'dan gelir; arka plan = kutu içinde metin renginden yeterince uzak piksellerin, metin parlaklığına **en yakın** %5'lik dilimi (kötümser). WCAG matematiği kütüphanesiz. | **karşılandı** |
| 3 | Görsel regresyon ≤ %0.1 piksel | **C6 `regression`.** 6 görüntü (title, hub, play × 4 unutuş eşiği), `pixelmatch` + `pngjs`, SwiftShader. Determinizm §4.5'te anlatılan üç seam ile çözüldü — ölçülen ardışık fark %0.000. | **karşılandı** |
| 4 | Derinlik ayrımı (Laplacian varyans oranı) | Aynı screenshot üzerinde ~30 satırlık `checks/depth.mjs`, ek bağımlılık **yok** (`planned.mjs`'te bildirili). Yalnızca DOF (V3) uygulanırsa anlamlı — bugün oran ~1.0 ve bu, korunacak bir regresyon değil **boşluğun kanıtı**. | planlı, DOF'a bağlı |
| 5 | Frame bütçesi ≥ 55 FPS | **FPS bu platformun kapsamında değil ve olmamalı.** Yerel makinede FPS donanıma bağlıdır; sahibin makinesinde geçip başka yerde kalan bir eşik, insanlara kapıyı yok saymayı öğretir. Üstelik gate artık SwiftShader'da (yazılım rasterleştirici) koşuyor — oradan ölçülen FPS hiçbir gerçek kullanıcıyı temsil etmez. Donanımdan **bağımsız** yarısı (`renderer.info.render.calls` / `triangles`) `planned.mjs`'te `drawcalls` olarak bildirili, ek bağımlılık gerektirmiyor. | kısmen planlı, FPS gerekçeli kapsam dışı |
| 6 | Post-effect'lerin unutuş uniform'undan ayrışması | Kod incelemesi maddesi; makine kararı değil. En fazla `hazePass.ts`'in `amount` uniform'una yeni bağlanan bir şey var mı diye kaba bir grep yazılabilir — ama yanlış güven verir. Checklist maddesi olarak kalmalı. | kapsam dışı (gerekçeli) |

---

## 7. Açık sorular (karar bekliyor — bu doküman karar vermiyor)

1. **`title_bg_key_art_1344.webp` ne olacak?** Manifest satırı mı yazılacak, yoksa isimlendirme kuralına uyacak şekilde yeniden mi adlandırılacak (`ui_titlebg_01_albedo_1344.webp` gibi — ama 1344 merdiven dışı)? → `art-director`
2. **Spritesheet isimlendirmesi.** `_sheet_2048` sayfada değil karede geçerli; `pipeline.md` §6 bunu tanımlamıyor. Kare kutusu mu, sayfa genişliği mi? → `art-director` + `pipeline.md` §6'ya bir satır
3. **`resolution` kolonu klip süresi tutuyor** (9 satırda `8s`). Ayrı bir `duration` kolonu mu, yoksa piksel değeri mi? → `art-director`
4. **8 MB hedefi hâlâ geçerli mi?** `pipeline.md` §6 bu sayıyı `[P][?]` (ölçüm sonrası düzeltilecek) olarak işaretlemiş; bugün 10.12 MB'tayız. Ya sayı yükselir ya WebP borcu kapanır — ikisi de meşru, ama biri seçilmeli. → sahip + `technical-director`
5. **Font/LUT dosyaları manifeste tabi mi?** Benchmark §9'un kapatılmamış açık sorusu; C1 bunları bugün `untracked-file` diye raporlayacak. → `art-director` + `technical-director`
6. **`ref/` `public/` altında mı kalmalı?** Oyuna girmeyen 1.90 MB kullanıcıya iniyor. → `technical-director`
7. **Hub/Title kontrastı nasıl AA'ya çıkacak?** 12 elemanın 12'si eşiğin altında; busy illüstrasyon üstünde text-shadow ile 4.5:1 zor. Seçenekler: opak plaka, daha koyu scrim, ya da bilinçli olarak "büyük metin 3:1" istisnasına oynamak. → `ux-designer` + `art-director`
8. **`fullRestart()` dünya saatini sıfırlamalı mı?** Bugün sıfırlamıyor; ben yalnızca test-only `resetClock()` ekledim, gerçek davranışa dokunmadım. "Yeni bir gün" gerçekten yeni bir gün mü, yoksa devam eden bir zaman mı — bu bir tasarım sorusu. → `game-designer`
9. **`baselines/*.png` commit edilsin mi?** Önerim evet — inceleyemediğin baseline baseline değildir. **Ama maliyet küçük değil: 6 PNG = 4.8 MB**, ve her kabul edilen görsel değişiklik repo geçmişine bir tur daha ekler. Alternatif: baseline'ları gitignore edip yalnızca yerel tutmak (o zaman kontrol makine-başına kurulur, code review'da görünmez). → sahip

---

## 8. Önerilen sıra

| Sıra | İş | Kim | Bağımlılık |
|---|---|---|---|
| 1 | §5'teki 4 manifest hatasını kapat + §7'nin 1–3. sorularını karara bağla, sonra `--update-baseline` | `art-director` | yok — kod yazılmıyor |
| 2 | §7 soru 7 (kontrast) kararı + `hud.css` düzeltmesi — 12 bulgunun en yükseği | `ux-designer` + `ui-programmer` | yok |
| 3 | `npm run test:assets`'i `pipeline.md` §8 checklist'ine bir satır olarak ekle | `technical-director` | 1 |
| 4 | `scripts/pipeline/` taşıması (tek commit, tek oturum) | `technical-director` | 3 |
| 5 | ASSET-005/007 palet aykırılıkları: retint mi, palet genişletmesi mi | `art-director` | yok |
| 6 | `depth` + `drawcalls` kontrolleri (ek bağımlılık yok) | `qa-lead` | DOF (V3) uygulanınca |
