# Lotophagoi araştırma indeksi — "profesyonel oyun gibi görünme" turu

> **Bu dosya ne yapar:** 16 Ağustos 2026'da tamamlanan dört parçalı araştırma/tooling turunun tek haritası. Sahibin *"bütün bu araştırma nereye gitti"* sorusuna tek bakışta cevap verir: hangi doküman ne içeriyor, hangi sırayla okunur, hangi aksiyon kimde.
> **Bu dosya ne yapmaz:** karar vermez, otorite değildir. `docs/design/` oynanışı, `docs/art/` görsel dili, `docs/ux/` ekran/akışı belirler; `docs/production/roadmap.md` durumu gösterir. Bu dosya yalnızca **envanter**.
> **Emsal:** `docs/research/vibegamedev-reference-index.md` (uzak dalda) aynı işi repo arşivleri için yapıyor. Bu, onun problem/çıktı tarafındaki eşi.
> **Tarih:** 2026-08-16 · **Yazan:** `producer` alt-ajanı · **Durum:** dört kaynağın **hiçbiri commit edilmedi, hiçbiri sahip onaylı değil.**

---

## 1. Bir bakışta — dört kaynak

| # | Doküman | Nerede | Ne içeriyor | Yazan | Durum |
|---|---|---|---|---|---|
| **1** | `docs/research/lotophagoi-problems-repo-solutions.md` | **Uzak dalda** — `origin/cursor/vibegamedev-reference-archive-afce`. Working tree'de **yok**. | Süreç/QA/manifest sorun envanteri **S1–S19**, her sorun için repo/script/skill eşlemesi, "repo çözer mi?" sütunu, dürüst etki tahmini, red listesi | Cursor oturumu | merge edilmemiş |
| **2** | `docs/research/lotophagoi-visual-quality-benchmark.md` | working tree | Görsel kalite boşlukları **V1–V11** + **V-QA1/2/3**, koddan kanıtla; öncelik planı (V9→V7→V2→V10→V6→V3→V1→V8), ölçülebilir kabul kriterleri, 9 maddelik red listesi | `art-director` | uncommitted, onaysız |
| **3** | `docs/art/asset-prompt-playbook.md` | working tree | Uçtan uca asset üretim akışı (**A0–A6**) + kopyala-yapıştır prompt kararlılığı örnekleri (**B0–B11**); "aynı karakterin varyantlarını tutarlı üretme" tekniğinin adının konması | `art-director` | uncommitted, onaysız |
| **4** | `docs/production/asset-testing-platform.md` **+ `scripts/asset-qa/`** | working tree | Tek komutluk yerel doğrulama kapısı: `npm run test:assets`. Kontrol **C1–C3 çalışıyor**, **C4–C6 planlı**. §5'te gerçekten koşturulmuş çıktı, §7'de 6 açık soru | `technical-director` | uncommitted, onaysız — **turun tek çalışan kodu** |

### Doküman 1'i okuma (working tree'de olmadığı için)

```bash
git show origin/cursor/vibegamedev-reference-archive-afce:docs/research/lotophagoi-problems-repo-solutions.md
```

Aynı dalda duran kardeş dosyalar (aynı komutla okunur): `vibegamedev-reference-index.md`, `high-star-pipeline-scan.md`, `metatransformer-game-stack-scan.md`, `turkish-game-dev-ecosystem.md`, `docs/production/agent-prompt-archive-integration.md`.

> **Uyarı:** doküman 1 birçok yerde `art-source/reference/**` altındaki yerel klonlara atıf yapıyor. O klasör **gitignore'lu** — başka bir makinede/temiz bir checkout'ta o klonlar yoktur. Yeniden indirme komutları o dosyanın §8'inde.

---

## 2. Okuma sırası — üç farklı niyet için

Dördünü baştan sona okumak gerekmiyor. Ne yapacağına göre:

### "Yeni bir asset üreteceğim" (prompt yazacağım)
1. `docs/art/pipeline.md` §4 (prompt anatomisi) + §6/§7/§8 — **bağlayıcı**, önce bu
2. `docs/art/asset-prompt-playbook.md` **A1** (tek-sayfa çoklu-varyant = varsayılan tutarlılık mekanizması), **A2** (hangi blok byte-identical kalır), **B0** (hex→prompt dili tablosu), **B1** (sabit negatif paragraf)
3. Üretim sonrası: `npm run test:assets` → `docs/production/asset-testing-platform.md` §2 (hangi kontrol neyi doğruluyor)
4. `B10` — dürüst durum: **seed reuse bu projede yok**, `assets.csv`'deki `seed=none` bir eksiklik değil

### "Oyunun görünüşünü yükselteceğim"
1. `docs/art/art-bible.md` §1/§2/§9 — **bağlayıcı**, palet ve yasaklar
2. `lotophagoi-visual-quality-benchmark.md` §2 (V1–V11 boşluk tablosu, koddan kanıtlı) → §6 (öncelik sırası) → **§8 (red listesi, özellikle R8)**
3. `asset-testing-platform.md` §6 — benchmark'ın kabul kriterlerinden hangisi makineye devredilebilir, hangisi devredilemez (gerekçeli)

### "Süreç/QA kuracağım"
1. `lotophagoi-problems-repo-solutions.md` §1 (S1–S19 envanteri) → §5 (öncelikli entegrasyon planı) → **§6 (dürüst etki tahmini — repolar tek başına kalite sıçraması değil)**
2. `asset-testing-platform.md` §1 (mimari, modül sözleşmesi) → §5 (bugün gerçekten ne bulundu) → §8 (önerilen sıra)
3. `docs/production/agent-roster-update-proposal.md` — bu turun agent davranışına nasıl gömüleceği (öneri, uygulanmadı)

---

## 3. ID uzayı haritası — çakışma var mı?

Doküman 2 kendi §0'ında bunu açıkça soruyordu ("ana oturum S-listesiyle çapraz kontrol etmeli"). **Çapraz kontrol yapıldı: önekler ayrık, gerçek bir ID çakışması yok.**

| Önek | Kapsam | Kaynak |
|---|---|---|
| `S1–S19` | Süreç / QA / manifest / asset pipeline / playtest sorunları | doküman 1 |
| `V1–V11` | Görsel kalite boşlukları (ışık, post, malzeme, VFX, kamera, UI, yoğunluk) | doküman 2 §2 |
| `V-QA1/2/3` | Görsel kalite için önerilen QA araçları | doküman 2 §4 |
| `C1–C6` | Asset test platformunun kontrol modülleri | doküman 4 §2 |
| `A0–A6` / `B0–B11` | Üretim akışı adımları / prompt örnekleri | doküman 3 |
| `K1–K35` | Sahip kararları (mevcut, ayrı uzay) | `roadmap.md` §4 |

### Aynı sorunun iki ID altında durduğu yerler (birleşme noktaları)

| Sorun | Doküman 1 | Doküman 2 | Nerede kapandı |
|---|---|---|---|
| `assets.csv` ↔ disk uyumsuzluğu | **S4** | — | **C1 `manifest`** — çalışıyor, bugün 4 hata buldu |
| Hub kontrast regresyonu / HUD okunabilirliği | **S2** | **V-QA3** (`wcag-contrast`) | **C5 `contrast`** — planlı, en düşük riskli, tek bağımlılık Playwright |
| Otomatik görsel regresyon testi yok | **S3** | **V-QA1** (`pixelmatch`+Playwright) | **C6 `regression`** — planlı, **önce determinizm seam'i** (`?seed=`) gerekiyor |
| Palet uyumunun göz kararı olması | — | **V-QA2** (`color-thief`) | **C4 `palette`** — planlı, araç `culori`'ye değişti (doküman 4 §4.3, gerekçeli sapma) |
| `pipeline.md` §8 kabul kapısı elle | **S15** | — | Platformun tamamı; ama §8'in insan yarısı (NOT photoreal, IP temiz, döngü seam'i, unutuş texture'a gömülmemiş) **devredilmedi ve devredilmemeli** |

### Hiçbir araştırma dokümanının önermediği ama platformun bulduğu iki kontrol

`C2 naming` ve `C3 budget` ne S-listesinde ne V-listesinde vardı — doğrudan `pipeline.md` §6'dan türetildiler ve **bugün 19 uyarı + 1 hata** ürettiler (örn. `water_foam_01_alpha_512.webp` gerçekte 1267×512 = adının vaat ettiğinin **6.1 katı** doku belleği). Yani platform kendi brief'ini aştı; bu, "eldeki dokümanların kuralları zaten yazılıydı, kimse ölçmüyordu" tespitinin somut kanıtı.

### Kesişmeyen, tek başına duran maddeler

- **V11** (yazılı frame bütçesi yok) — S-listesinde karşılığı yok; doküman 4 §6 #5 bunu **bilerek kapsam dışı** bıraktı (yerel FPS donanıma bağlı, taşınabilir bir kapı olamaz). Açık madde olarak kaldı.
- **S5–S12** (tuning↔constants sapması, eksik mekanikler, deterministik lotus, dalga sesi lowpass) — hiçbir araştırma dokümanı bunları çözmez, **kod + sahip kararı**; doküman 1 §2 bunu "C" sınıfı olarak zaten dürüstçe işaretlemiş.
- **S17–S19** (playtest ölçümü) — `roadmap.md` Faz 6'ya bağlı, bu turda ilerlemedi.

---

## 4. Kim ne yapacak — dört dokümanın aksiyonlarının birleşik listesi

Kaynaklar: doküman 2 §10, doküman 4 §8, doküman 3 A6/B10, doküman 1 §5.

### `art-director`
| İş | Kaynak | Bağımlılık |
|---|---|---|
| C1'in bulduğu **4 manifest hatasını** karara bağla (`title_bg_key_art_1344.webp` satırı, ASSET-021/030/037'nin `(parantez)` unshipped konvansiyonuna geçişi) | doküman 4 §5, §8 sıra 1 | yok — kod yazılmıyor |
| Spritesheet isimlendirmesi + `resolution` kolonu klip süresi tutuyor (9 satır `8s`) → `pipeline.md` §6/§7'ye netlik satırı | doküman 4 §7 #2, #3 | sahip onayı |
| V7 font seçimi — 3 aday sun (`Cormorant` / `Spectral` / `Cinzel`, üçü de OFL) | doküman 2 §10 | sahip kararı |
| V2 LUT "look" yönü — 2 varyant sun | doküman 2 §10 | sahip kararı + `gameplay-programmer` |

### `technical-director`
| İş | Kaynak | Bağımlılık |
|---|---|---|
| `npm run test:assets`'i `pipeline.md` §8 checklist'ine bir satır olarak ekle | doküman 4 §8 sıra 2 | art-director'ın 1. maddesi |
| `scripts/pipeline/` taşıması (üretim ≠ doğrulama; tek commit, tek oturum) | doküman 4 §3, §8 sıra 4 | yukarıdaki |
| **≥55 FPS** frame bütçesi hedefini onayla/değiştir — bugün hiçbir yerde yazılı sayı yok | doküman 2 §5 #5, V11 | sahip |
| `ref/` `public/` altında kalmalı mı (1.90 MB oyuna girmiyor ama iniyor) | doküman 4 §7 #6 | — |
| §4'teki 4 npm paketinin (playwright, pixelmatch, pngjs, culori — ~6.7 MB devDep) kurulum onayı | doküman 4 §4 | sahip |

### `qa-lead`
| İş | Kaynak | Bağımlılık |
|---|---|---|
| C5 `contrast` — Title+Hub saf DOM, determinizm gerekmez, **bugün başlanabilir** | doküman 4 §8 sıra 3 | sahip'in §4 paket onayı, `ui-programmer` |
| C4 `palette` — aynı Playwright oturumunda, ΔE2000 ≤ 12, hex'ler `art-bible.md` §2'den **parse edilir** | doküman 4 §8 sıra 5 | C5 |

### `gameplay-programmer`
| İş | Kaynak | Bağımlılık |
|---|---|---|
| **V9** — güneş diski + lens flare. `art-bible.md` §2 zaten "güneş halesi `#ffcf80`, bloom kaynağı" diyor ama sahnede **görünür bir güneş nesnesi hiç yok**; sıfır yeni onay gerektiren tek madde | doküman 2 §2 V9, §6 sıra 1 | **yok** |
| **V10** — `SMAAPass` (three'nin kendi paketinde) | doküman 2 §6 sıra 4 | yok |
| **V3** — konservatif DOF; **R8 kuralı zorunlu**: `hazePass.ts`'in `amount` uniform'una bağlanmaz | doküman 2 §6 sıra 6, §8 R8 | `technical-director` code review |
| Determinizm seam'i (`?seed=`) — `src/` içinde 31 `Math.random()` çağrısı var (`burst.ts` 21, `game.ts` 4, `lotus.ts` 3, `lotophagos.ts` 2, `audio.ts` 1) | doküman 4 §6 #3 | ayrı sahip kararı; C6'nın ön koşulu |

### `producer` (bu dosya)
| İş | Durum |
|---|---|
| Bu indeks | ✅ |
| `docs/production/agent-roster-update-proposal.md` — turun agent davranışına gömülmesi (öneri) | ✅ (uygulanmadı, öneri) |

### Sahip
Aşağıdaki §5'in tamamı.

---

## 5. Açık soru havuzu — 14 madde, tek yerde

Bugün bu sorular dört ayrı dokümanın dört ayrı bölümünde duruyor. Tek liste:

| # | Soru | Kaynak | Kim sorar |
|---|---|---|---|
| 1 | `ui/title_bg_key_art_1344.webp`: manifest satırı mı yazılacak, yeniden mi adlandırılacak? (1344 merdiven dışı) | doküman 4 §7 #1 | `art-director` |
| 2 | Spritesheet isimlendirmesi: `_sheet_2048` kare kutusu mu sayfa genişliği mi? `pipeline.md` §6 tanımlamıyor | doküman 4 §7 #2 | `art-director` |
| 3 | `resolution` kolonu 9 satırda piksel değil klip süresi (`8s`) tutuyor — ayrı `duration` kolonu mu? | doküman 4 §7 #3 | `art-director` |
| 4 | **8 MB ilk-indirme hedefi hâlâ geçerli mi?** Bugün **10.12 MB**. Ya sayı yükselir ya 23 PNG'nin WebP borcu kapanır | doküman 4 §7 #4 | **sahip + `technical-director`** |
| 5 | Font/LUT dosyaları (AI-üretimi değil) `assets.csv` manifestine tabi mi? C1 bunları bugün `untracked-file` sayacak | doküman 2 §9, doküman 4 §7 #5 | `art-director` + `technical-director` |
| 6 | `ref/` `public/` altında mı kalmalı? 1.90 MB oyuna girmiyor ama kullanıcıya iniyor | doküman 4 §7 #6 | `technical-director` |
| 7 | Frame bütçesi hedefi **≥55 FPS** onaylanıyor mu? Bugün yazılı sayı yok | doküman 2 §5 #5 | `technical-director` → sahip |
| 8 | Bir sayfadan kırpılan her dosyanın `prompt_file`/`model`/`seed`'i tekrar etmesi konvansiyonu `pipeline.md` §7'ye yazılsın mı? (yeni kolon değil, mevcut pratiğin dokümante edilmesi) | doküman 3 A6 `[P][?]` | sahip |
| 9 | `gen-assets.mjs`'in still yoluna `--ref-image` bayrağı (Gemini multimodal `inlineData`) eklensin mi? Still tutarlılığını image-to-video seviyesine çıkarır | doküman 3 B10 `[P][?]` | sahip → `gameplay-programmer`/`technical-director` |
| 10 | V7 webfont: hangi aile? (`Cormorant` / `Spectral` / `Cinzel`) | doküman 2 §10 | sahip |
| 11 | V2 LUT: kaç varyant ve hangi yön? (öneri: 2 — mevcut sıcak grade'in netleşmiş hâli vs. daha doygun altın saat) | doküman 2 §10 | sahip |
| 12 | 4 yeni devDependency (~6.7 MB + repo dışı ~150 MB Chromium cache) kurulsun mu? | doküman 4 §4 | sahip |
| 13 | ~~`art-director`'ın `tools:` satırına `Bash` eklensin mi?~~ **Sahip onayladı (16 Ağu 2026): eklensin.** Ama uygulanamadı — `.claude/agents/**` ajan konfigürasyonu, izin sistemi alt-ajan düzenlemesini blokluyor. **Sahibin kendi eliyle yapması gerekiyor**; tek satır: `tools:` satırına `Bash` | `agent-roster-update-proposal.md` §0.1, §2.1 A4 | **sahip — açık eylem** |
| 14 | ~~Bu dört dokümana pointer nereye?~~ **Karar: Seçenek 3.** (b) `pipeline.md` §8 kapı satırı **uygulandı**; (a) `CLAUDE.md` cümlesi bloklandı, sahip eklemeli | `agent-roster-update-proposal.md` §3 | **sahip — açık eylem** |

---

## 6. Dürüst durum — ne yapıldı, ne yapılmadı

**Yapıldı:**
- Dört doküman yazıldı; ikisi (2, 3) doğrudan kod/registry kanıtına dayanıyor, biri (1) repo taramasına, biri (4) **çalışan koda**.
- `scripts/asset-qa/` gerçekten çalışıyor: `npm run test:assets` bugün koşturuldu, **exit 1**, 3 kontrolün 2'si FAIL. Bulgular gerçek ve daha önce hiç raporlanmamıştı.

**Yapılmadı — ve bunu bilerek söylüyoruz:**
- **Hiçbiri commit edilmedi.** Dördü de working tree'de (biri uzak dalda) duruyor.
- **Hiçbiri sahip onaylı değil.** Dördünün de üst notunda "onay bekliyor" yazıyor.
- **Hiçbir sorun düzeltilmedi.** C1'in 4 manifest hatası, C3'ün 10.12 MB aşımı, C2'nin 19 uyarısı — hepsi bugün de duruyor.
- **Hiçbir yeni npm paketi kurulmadı.** C4/C5/C6 planlı, kod değil.
- **`baseline.json` bilerek oluşturulmadı** — sahip önce listeyi görmeli, sonra neyin kabul edildiğine kendi karar vermeli (doküman 4 §1.2).
- **Agent dosyaları büyük ölçüde değiştirilemedi.** Sahip 16 Ağu 2026'da uygulanmasını onayladı; `art-director`'a yalnızca kaynak-listesi satırı (A1) geçti, kalan 8 diff + `CLAUDE.md` pointer'ı izin sistemi tarafından bloklandı (ajan konfigürasyonu, alt-ajan yetkilendiremez). Metinler kopyala-yapıştır hazır: `docs/production/agent-roster-update-proposal.md` §0.1 tablosu.
- **Uygulanabilenler:** `pipeline.md` §8'e `npm run test:assets` kapı satırı; `roadmap.md`'ye **K36** (şemsiye) + **K37** (bloke edici, 8 MB) + §1.2'ye iki dürüst durum satırı.
- **Doküman 1 hâlâ merge edilmedi** — working tree'de yok, `git show` gerektiriyor.

**Doküman 1'in kendi dürüstlük notu, tekrar edilmeye değer:** repo arşivleri tek başına bariz bir kalite sıçraması değil. Sorunların ~%40'ı repo + küçük entegrasyonla güvenlik ağına alınabilir; ~%45'i kod + Faz 1–2 + sahip onayı; ~%15'i saf süreç. Bu tur ağırlıklı olarak ilk %40'a ve süreç %15'ine dokundu — **oynanışın kendisi bu turda hiç ilerlemedi.**

---

## 7. Bu tur bittikten sonra sıradaki tek dilim (öneri)

`roadmap.md` §5 hâlâ "K35 `real` oynanır — playtest, Kiklop level'ı yok" diyor. Bu tur onu değiştirmedi. Ama **tek bir düşük maliyetli dilim** var ki hiçbir onay beklemiyor:

> **V9 — güneş diski + lens flare.** `art-bible.md` §2 zaten `#ffcf80` güneş halesini "bloom kaynağı" olarak tanımlıyor; `stage.ts`'te bloom'un parlayacağı **hiçbir fiziksel nesne yok**. Yani onaylı bir sanat yönü satırı uygulanmamış duruyor. Sıfır yeni karar, düşük efor, her karede görünür. `gameplay-programmer`.

Diğer her şey (font, LUT, QA katmanı, `scripts/pipeline/` taşıması, manifest temizliği) §5'teki 14 sorudan en az birine bağlı.
