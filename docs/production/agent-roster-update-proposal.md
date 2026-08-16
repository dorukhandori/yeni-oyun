# Agent roster güncelleme önerisi — araştırma turunun kalıcılaştırılması

> **Bağlam:** 16 Ağustos 2026 araştırma turu. Dört kaynağın haritası: `docs/research/lotophagoi-research-index.md`.
> **Tarih:** 2026-08-16 · **Yazan:** `producer` alt-ajanı, kalan kısmı ana oturum · **Durum:** tamamen uygulandı (ACTIVE_WORK C4 hariç, o ayrı ele alınıyor). Uncommitted.

## 0.1 Uygulama durumu (16 Ağu 2026, sahip onayından sonra)

Sahip "bash filan eklensin, her şey yapılsın" dedi. `producer` alt-ajanının denemesi `.claude/agents/**` ve `CLAUDE.md` düzenlemelerinde izin sistemi tarafından bloklandı (ajan konfigürasyonu, alt-ajan mesajıyla iletilen onay yetkilendiremiyor) — bunlar **ana oturumda, sahiple doğrudan aynı sohbette** uygulandı.

| Madde | Hedef dosya | Durum |
|---|---|---|
| **A1** kaynak listesine playbook | `.claude/agents/art-director.md` | ✅ uygulandı (producer) |
| **A2** tutarlılık kuralı | `.claude/agents/art-director.md` | ✅ uygulandı (ana oturum) |
| **A3** test:assets kapısı | `.claude/agents/art-director.md` | ✅ uygulandı (ana oturum) |
| **A4** `tools:`'a `Bash` | `.claude/agents/art-director.md` | ✅ uygulandı (ana oturum) — Seçenek (a) |
| **B1/B2/B3** | `.claude/agents/technical-director.md` | ✅ uygulandı (ana oturum) |
| **C1/C2/C3** | `.claude/agents/qa-lead.md` | ✅ uygulandı (ana oturum) |
| **D1/D2/D3** | `.claude/agents/gameplay-programmer.md` | ✅ uygulandı (ana oturum) |
| **Pointer (a)** `CLAUDE.md` cümlesi | `CLAUDE.md` | ✅ uygulandı (ana oturum) |
| **Pointer (b)** §8 kapı satırı | `docs/art/pipeline.md` | ✅ uygulandı (producer) |
| **K36** şemsiye madde | `docs/production/roadmap.md` §4.2 | ✅ uygulandı (producer) |
| **K37** bloke edici madde | `docs/production/roadmap.md` §4.1 | ✅ uygulandı (producer) |
| **C3** §1.2 dürüst durum satırları | `docs/production/roadmap.md` §1.2 | ✅ uygulandı (producer) |
| **C4** ACTIVE_WORK 3. durum | `docs/production/ACTIVE_WORK.md` | ⏸ ana oturum, Playwright fazı bitince tek seferde |

Hepsi hâlâ **uncommitted** — bu doküman ne yapıldığının kaydı, commit kararı ayrı.

---

---

## 0. Neden bu öneri var

Dört doküman üretildi (S-listesi, V-listesi, prompt playbook, asset test platformu). Hiçbiri agent davranışını **kendiliğinden** değiştirmez — bir ajan bir sonraki oturumda o dosyaları okumazsa tur boşa gider. Kalıcılık iki yerden gelir:

1. **Agent dosyalarına gömülü referans** — ajanın kendi checklist'i onu oraya gönderir (§1–§2).
2. **Bir kabul kapısı** — `npm run test:assets` "bitti" demeden önce koşulur (§2.2, §2.3).

Üçüncü bir mekanizma (pointer'ın nereye konacağı) §3'te, süreç tarafı §4'te.

---

## 1. Kritik ön bulgu — kapı ile kapıyı açan rol uyuşmuyor

`.claude/agents/art-director.md` satır 4:

```yaml
tools: Read, Glob, Grep, Write, Edit, WebSearch
```

**`Bash` yok.** Yani `public/assets/`'e dosya sokan **tek rol**, o dosyayı doğrulayan `npm run test:assets` kapısını **çalıştıramıyor**. Karşılaştırma: `technical-director`, `qa-lead`, `gameplay-programmer` üçünde de `Bash` var.

Kabul kapısı kalıcılaşacaksa iki yoldan biri seçilmeli — ikisi de §2.1 A4'te, karar sahipte. **Bu, aşağıdaki 9 diff'in en kritik olanı**: çözülmezse "asset kabul kapısı" ilk günden atlanan bir kural olur.

---

## 2. Dokuz somut diff

Format: **dosya · satır · mevcut · önerilen · gerekçe · risk**.

---

### 2.1 `.claude/agents/art-director.md`

#### A1 — kaynak listesine playbook'u ekle

**Satır 8, mevcut:**
```
You are the Art Director for **Lotophagoi (Lotus Adası)**. Read `CLAUDE.md` first. Your source of truth: `docs/art/art-bible.md` (palette, light philosophy, the "forgetting aesthetic"), `docs/art/asset-registry.md`, `docs/art/pipeline.md` (the full Higgsfield media pipeline), `docs/art/prompts/` (prompt templates, `_anatomy.md` is the shared skeleton).
```

**Önerilen (cümle sonuna ekleme):**
```
You are the Art Director for **Lotophagoi (Lotus Adası)**. Read `CLAUDE.md` first. Your source of truth: `docs/art/art-bible.md` (palette, light philosophy, the "forgetting aesthetic"), `docs/art/asset-registry.md`, `docs/art/pipeline.md` (the full Higgsfield media pipeline), `docs/art/prompts/` (prompt templates, `_anatomy.md` is the shared skeleton), `docs/art/asset-prompt-playbook.md` (the operational production flow and the copy-paste prompt-stability examples — how to keep the same character/object consistent across variants).
```

**Gerekçe:** playbook `pipeline.md`'nin tekrarı değil; onu **varsayıp** iki boşluğu kapatıyor (uçtan uca akış + tutarlılık tekniği). Kaynak listesinde adı geçmezse ajan onu bulmaz.
**Risk:** yok — otorite sırası değişmiyor, playbook kendi başlığında "çelişki varsa `pipeline.md`/`art-bible.md` kazanır" diyor.

#### A2 — yeni Binding rule (satır 18'deki naming maddesinden sonra)

**Mevcut satır 18:**
```
- Naming: `category_name_variant_channel_resolution.ext` (see `pipeline.md` §6 for the full table and examples).
```

**Hemen ardına eklenecek yeni madde:**
```
- **Consistency is a technique, not luck.** Before writing any new Higgsfield/Gemini prompt, read `docs/art/asset-prompt-playbook.md`: **A1** — a single-call multi-variant sheet is this project's default consistency mechanism (**seed reuse does not exist here**: `gen-assets.mjs` / `gen-gemini-image.mjs` send no seed, so `seed=none` in `assets.csv` is honesty, not a gap); **A2** — the STYLE / CHARACTER / LOOK+IP blocks are copied byte-identical from `_anatomy.md`, never paraphrased; **B0** — a colour enters a prompt as *name + hex together*, and only if it exists in `art-bible.md` §2; **B1** — the fixed negative paragraph closes every prompt; **A3/B6–B8** — for motion variants the anchor is `--image` (image-to-video from the accepted turnaround), not a re-described character. Deviating from any of these is allowed, but say so and say why.
```

**Gerekçe:** projede üç kez kanıtlanmış (ASSET-001, ASSET-002, ASSET-037) ama hiçbir yerde kural olarak yazılı olmayan teknik. Playbook A2 doğrudan gözlemliyor: aynı fikri farklı kelimelerle yazmak çıktıda fark edilir tutarsızlık üretiyor — ASSET-016/032'nin reddedilme ailesiyle aynı.
**Risk:** düşük. Madde uzun; istenirse tek cümleye indirilip detay playbook'a bırakılabilir.

#### A3 — yeni "What you must NOT do" maddesi

**Mevcut bölüm (satır 23–27) sonuna eklenecek:**
```
- Report an asset as accepted/"done" in `public/assets/` without the `npm run test:assets` verdict being on record (see `docs/production/asset-testing-platform.md`). The machine-checkable half of the `pipeline.md` §8 gate is no longer an eyeball call — manifest, naming and budget are measured. The human half of §8 (NOT photoreal, IP clean, loop seam joins, forgetting not baked in) is still yours and sahip's.
```

**Gerekçe:** C1 bugün 4 gerçek manifest hatası buldu; bunların hepsi `public/assets/`'e girmiş, hiçbiri daha önce raporlanmamıştı. Kapı tam olarak bu sınıf için var.
**Risk:** **A4 çözülmeden bu madde uygulanamaz** — art-director komutu koşamaz.

#### A4 — frontmatter (KARAR GEREKTİRİR, iki seçenek)

**Mevcut satır 4:**
```yaml
tools: Read, Glob, Grep, Write, Edit, WebSearch
```

| Seçenek | Değişiklik | Artı | Eksi |
|---|---|---|---|
| **(a) — önerilen** | `tools: Read, Glob, Grep, Write, Edit, Bash, WebSearch` | Kapı salt-okunur (`scripts/asset-qa/` hiçbir dosyaya, porta, servise yazmıyor — `asset-testing-platform.md` §1.1 bunu açıkça garanti ediyor). A3 uygulanabilir hâle gelir. Sürtünme sıfır. | art-director'a genel shell erişimi açılır; `Bash` dar kapsamlı verilemez. |
| **(b)** | Frontmatter değişmez; A3 şöyle yazılır: *"…the verdict must be on record — if you can't run it yourself, hand off to `technical-director` or ask sahip to run it, and wait."* | Yetki genişlemesi yok. | Her asset kabulü ikinci bir oturum/tur gerektirir. Pratikte atlanır — "koşulmayan kapı yoktur" (`asset-testing-platform.md` §1.2'nin kendi mantığı). |

**Önerim: (a).** Kapı gerçekten salt-okunur ve `npm run dev` açıkken bile güvenli. **Bu senin kararın.**

---

### 2.2 `.claude/agents/technical-director.md`

#### B1 — yeni "In scope" maddesi (satır 24–27 listesine)

```
- **Asset acceptance gate.** Nothing that touches `public/assets/`, `public/assets/assets.csv`, or an asset-writing script under `scripts/` is reported "done" before `npm run test:assets` has been run and its verdict quoted per check. Exit 1 with a *new* finding = not done. `--update-baseline` is sahip's decision ("I've seen these and accept them for now"), never a fix — see `docs/production/asset-testing-platform.md` §1.2.
```

**Gerekçe:** technical-director zaten platformu kurdu ama kendi checklist'inde bir kabul kapısı yok. Bugün `exit 1` alan bir repoda bu kapının varlığı ancak bir kural onu koşturursa anlam taşır.
**Risk:** yok — `Bash` zaten var.

#### B2 — eşik disiplini (aynı bölüme ikinci madde)

```
- **Thresholds live in docs, not in checks.** `scripts/asset-qa/` reads its numbers from `pipeline.md` §6/§7, `art-bible.md` §2 and `ux/screens.md` §3.5 — it never invents one. Changing a threshold is a documentation decision first and a code change second; loosening a check to make the gate green is the failure mode to refuse. If a rule produces false positives, that is evidence the rule itself is under-specified (`asset-testing-platform.md` §2, C2 notu) — record it as an open question, don't silence the check.
```

**Gerekçe:** C2'nin ilk sürümü 20+ yanlış pozitif üretti ve doğru tepki verildi (kural gevşetildi + açık soru yazıldı). Bu refleksi kural hâline getirmek, gelecekteki "kapıyı yeşile boyama" baskısına karşı tek savunma.
**Risk:** yok.

#### B3 — performance budget maddesine ek

**Mevcut satır 25:**
```
- Performance budget: this is a browser prototype — watch draw calls (merge geometry), texture memory, bundle size (`vite build` output)
```

**Önerilen:**
```
- Performance budget: this is a browser prototype — watch draw calls (merge geometry), texture memory, bundle size (`vite build` output). **No concrete frame-rate target is written down anywhere yet** — `docs/research/lotophagoi-visual-quality-benchmark.md` §5 #5 proposes ≥55 FPS at 1080p on an integrated-GPU class machine with the full post chain; approving, changing or rejecting that number is your open item. Every new post-process pass (DOF, AO, LUT, SMAA) must be weighed against it, otherwise "looks like a real game" turns into "runs like a slideshow". Note also that first-download size is over budget today: 10.12 MB vs. the 8 MB target in `pipeline.md` §6.
```

**Gerekçe:** benchmark V11'in tespiti: `roadmap.md` Faz 3.5/7.1 "post-process bütçe ölçümü" diyor ama hiçbir sayı yazılı değil. Sayı olmadan bütçe yok.
**Risk:** yok — sayı öneri olarak işaretli, dayatılmıyor.

---

### 2.3 `.claude/agents/qa-lead.md`

#### C1 — olgusal düzeltme (satır 8)

**Mevcut:**
```
You are the QA Lead for **Lotophagoi (Lotus Adası)**. Read `CLAUDE.md` first. This is a solo browser prototype with no automated test runner configured yet (`package.json` has no test framework) — your job leans toward structured manual verification, not enforcing a CI gate that doesn't exist.
```

**Bu artık yanlış.** `package.json` satır 11: `"test:assets": "node scripts/asset-qa/run.mjs"`.

**Önerilen:**
```
You are the QA Lead for **Lotophagoi (Lotus Adası)**. Read `CLAUDE.md` first. This is a solo browser prototype: the only automated gate that exists is `npm run test:assets` (asset manifest / naming / download budget — `docs/production/asset-testing-platform.md`); there is still **no gameplay/unit test runner and no CI**. So your job is structured manual verification *plus* keeping that one gate honest — not enforcing a CI pipeline that doesn't exist.
```

**Gerekçe:** düzeltilmezse qa-lead her oturumda "otomatik test yok" diyerek var olan tek kapıyı yok sayar.
**Risk:** yok — düzeltme, genişletme değil.

#### C2 — "What 'tested' means" listesine dördüncü madde (satır 16–18 sonrası)

```
- **Asset changes** (anything under `public/assets/`, `assets.csv`, or a script that writes assets) — `npm run test:assets` **is** the evidence. Quote the per-check verdict (`manifest` / `naming` / `budget`: PASS/FAIL + counts), not a summary sentence, and separate **new** findings from ones already accepted in `baseline.json`. This covers only the machine-checkable half of `pipeline.md` §8; "NOT photoreal", "IP clean", "spritesheet loop seam joins", "forgetting not baked into the texture" remain human/sahip gates and are reported as a separate line.
```

**Gerekçe:** qa-lead'in mevcut üç kategorisi (logic / feel / visual-HUD) asset değişikliklerini kapsamıyor — bu boşluk `pipeline.md` §8'in elle kalmasının nedeni (S15).
**Risk:** yok.

#### C3 — release readiness maddesi (bölüm sonuna)

```
- Before saying a build is ready to hand back to sahip, state the `npm run test:assets` exit code plainly. A red gate is not automatically a blocker — but an unmentioned red gate is a reporting failure, and a gate nobody runs is a gate that doesn't exist.
```

**Gerekçe:** `asset-testing-platform.md` §1.2'nin kendi mantığı: kırmızı kalan kapı görmezden gelinir, görmezden gelinen kapı yoktur.
**Risk:** yok.

---

### 2.4 `.claude/agents/gameplay-programmer.md`

#### D1 — yeni code standard (satır 20–25 listesine)

```
- If your change adds, renames or moves a file under `public/assets/`, edits `assets.csv`, or touches an asset-generating script in `scripts/`, run `npm run test:assets` before handing back. A new manifest/naming/budget finding introduced by your change is **your** regression, not the art director's.
```

**Gerekçe:** C1'in bulduğu `title_bg_key_art_1344.webp` tam olarak bu boşluktan geçmiş: canlı kullanılıyor (`hud.css .hub-bg`), manifest satırı yok.
**Risk:** yok — `Bash` zaten var.

#### D2 — yeni code standard: post-process uniform ayrışması

```
- A new post-process pass never binds to `hazePass.ts`'s `amount`/forgetting uniform — it keeps its own. The forgetting effect is a separate runtime layer (`art-bible.md` §4); mixing them breaks that principle and, for DOF specifically, silently blows past the `FX_BLUR` 3px ceiling because the two blurs add up. See `docs/research/lotophagoi-visual-quality-benchmark.md` §8 **R8**. This is a code-review item, so say in your handover which uniform your pass uses.
```

**Gerekçe:** benchmark bunu tek "kritik" red maddesi olarak işaretledi ve `technical-director`'ın code review'da doğrulaması gerektiğini söyledi — ama uygulayan taraf kuralı bilmiyorsa review geç kalır.
**Risk:** yok. Bugün ihlal edilmiş değil; önleyici.

#### D3 — determinizm bilgi notu (aynı listeye ya da "must NOT do"nun üstüne)

```
- **Determinism note:** `src/` currently contains 31 `Math.random()` calls (`burst.ts` 21, `game.ts` 4, `lotus.ts` 3, `lotophagos.ts` 2, `audio.ts` 1) and there is no `?seed=` parameter. Screenshot-based visual regression testing (`asset-testing-platform.md` C6) is blocked on a seeded-RNG seam. The fixed 60 Hz step in `game.ts` is half the job; RNG is the other half. Adding new unseeded randomness makes that seam more expensive — mention it if you do.
```

**Gerekçe:** bu, birinin bir gün ödeyeceği ve her yeni `Math.random()` ile büyüyen bir borç. Ajanın bunu bilmesi ucuz.
**Risk:** yok — kural değil, bilgi.

---

## 3. Üçüncü soru — pointer nereye konacak?

Dört dokümanın (ve indeksin) bir sonraki oturumda bulunabilmesi için bir giriş noktası lazım. Üç seçenek:

### Seçenek 1 — `CLAUDE.md` "Design authority" bölümüne bir cümle
- **Artı:** `CLAUDE.md` her Claude Code oturumunda otomatik yükleniyor. Kaçırılması imkânsız.
- **Eksi:** `CLAUDE.md` proje kimlik dosyası. Onaysız araştırma dokümanlarını oraya koymak onlara olmayan bir otorite ima eder ("Design authority" bölümü tam olarak *neyin kazandığını* söyleyen bölüm). Ayrıca her yeni araştırma turu dosyayı biraz daha büyütür.

### Seçenek 2 — `pipeline.md` başına + `roadmap.md` §1.2'ye ayrı ayrı pointer
- **Artı:** her pointer okuyucunun zaten durduğu yerde. Asset üreten `pipeline.md`'ye bakıyor, durum soran `roadmap.md`'ye.
- **Eksi:** üç ayrı düzenleme, üçü de senkron tutulmalı. `pipeline.md` **bağlayıcı** bir doküman — orada adı geçen bir dosya kolayca "bağlayıcı" sanılır, oysa dördü de öneri.

### Seçenek 3 — ÖNERİLEN: iki satır, ikisi de kalıcı hedeflere işaret eder

**(a)** `CLAUDE.md` "Design authority" paragrafının **sonuna** tek cümle — otorite vermeyen, envanter işaret eden:
```
Araştırma ve tooling çıktıları karar vermez; envanterleri `docs/research/lotophagoi-research-index.md`'de.
```

**(b)** `docs/art/pipeline.md` §8 (kabul kapısı) listesine tek satır:
```
- `npm run test:assets` — manifest/isimlendirme/bütçe kontrolü (`docs/production/asset-testing-platform.md`). Bu listenin ölçülebilir yarısı; kalan maddeler insan kapısı olarak burada kalır.
```

- **Artı:** toplam iki düzenleme. Gelecekteki her araştırma turu **indekse** eklenir, `CLAUDE.md` bir daha büyümez. (b) zaten `asset-testing-platform.md` §8'in 2. sıradaki planlı işi — yani ayrıca yapılacaktı.
- **Eksi:** bir yönlendirme katmanı daha (`CLAUDE.md` → indeks → doküman).

**Önerim: Seçenek 3. Bu senin kararın.**

---

## 4. "Yapının iyileştirilmesi" — roadmap ve ACTIVE_WORK (öneri, uygulanmadı)

### Sorun

`ACTIVE_WORK.md` protokolü diyor ki: *"Bitince: satırını sil (ya da 'bitti' diye işaretle)."* Bu turda üretilen dört dokümanın hepsi **uncommitted**. Ajan satırını silince, commit edilmemiş çıktı görünmez olur. "Son kapanan işler" tablosundaki dil ("Ne yapıldı") **yapıldı** ima ediyor; oysa gerçek durum *"diskte duruyor, commit edilmedi, onaylanmadı."* Sahibin *"bütün bu araştırma nereye gitti"* sorusunun kaynağı tam olarak bu.

### C4 — ACTIVE_WORK'e üçüncü bir durum (en önemli öneri)

Bugün iki durum var: **aktif** / **son kapanan**. Üçüncüsü eklensin:

```markdown
## Beklemede — üretildi, commit edilmedi, sahip onayı bekliyor

| Kim | Tarih | Dosyalar | Ne bekliyor |
|---|---|---|---|
| ... | ... | ... | ... |
```

Kural: bir ajan işini bitirdiğinde satırı **silmez** — çıktısı commit'liyse "son kapanan"a, değilse "beklemede"ye taşır. Bir satır "beklemede"den ancak commit edildiğinde ya da sahip açıkça reddettiğinde çıkar.

**Neden bu K-maddesinden daha önemli:** roadmap §4 sahip kararlarını izler; ACTIVE_WORK **diskteki gerçeği** izler. Kaybolan şey karar değil, çıktının kendisi.

### C1 — roadmap §4.2'ye tek şemsiye madde

```markdown
| **K36** *(16 Ağu 2026)* | **Araştırma turu çıktıları — hangileri alınıyor?** Dört doküman, indeks: `docs/research/lotophagoi-research-index.md`. Alt kalemler: (a) `npm run test:assets` kalıcı kabul kapısı mı, (b) benchmark §6 görsel öncelik sırası (V9→V7→V2→V10) onaylanıyor mu, (c) agent roster güncellemesi (`docs/production/agent-roster-update-proposal.md`) uygulanacak mı, (d) `scripts/pipeline/` taşıması, (e) 4 yeni devDependency (~6.7 MB) kurulsun mu. | açık |
```

**Neden şemsiye:** §4 zaten 35 maddede; beş ayrı K açmak listeyi izlenemez kılar. Bu beş alt kalemin ortak noktası "aynı turun çıktısı, aynı oturumda karara bağlanabilir".

### C2 — roadmap §4.1'e (bloke edici) bir gerçek madde

```markdown
| **K37** *(16 Ağu 2026)* | **8 MB ilk-indirme hedefi hâlâ geçerli mi?** Bugün ölçüldü: **10.12 MB** (%26 aşım; 23 dosya hâlâ PNG, toplam 9.01 MB). `pipeline.md` §6 bu sayıyı zaten `[P][?]` (ölçüm sonrası düzeltilecek) işaretlemiş. Ya hedef yükselir ya WebP borcu kapanır — ikisi de meşru, ama biri seçilmeli. | açık | Asset kabul kapısının kalıcılaşması: karar verilmeden `npm run test:assets` **hiçbir zaman yeşile dönmez**, dönmeyen kapı koşulmaz. |
```

**Neden ayrı ve §4.1'de:** §4.1 tam olarak "iki doküman/kod farklı sayı söylüyor, biri seçilmeden ilerlenemez" sınıfı için var — K1/K2/K3 aynı aileden. Bu, K36'nın içinde bir alt kalem olarak kaybolmamalı.

### C3 — roadmap §1.2 "Art / pipeline"e iki dürüst satır

§1 "dürüst özet" bölümü bugün bu iki gerçeği bilmiyor:

```markdown
- **Asset bütçesi aşımda:** `public/assets/` 10.12 MB, `pipeline.md` §6 hedefi 8 MB (ölçüm: 16 Ağu 2026, `npm run test:assets`). Ayrıca `ref/` altındaki 1.90 MB oyuna girmiyor ama `public/` altında olduğu için indiriliyor.
- **Manifest bütünlüğü kırık:** 4 hata — `ui/title_bg_key_art_1344.webp` canlı kullanılıyor ama `assets.csv` satırı yok; ASSET-021/030/037'nin dosyaları diskte yok. Ayrıntı: `docs/production/asset-testing-platform.md` §5.
```

**Gerekçe:** §1'in tek işi dürüst durum. Ölçülmüş, bilinen, düzeltilmemiş iki sorun orada görünmüyorsa §1 dürüst değil.

---

## 5. Uygulama sırası (onay sonrası)

| Sıra | İş | Kim | Bağımlılık |
|---|---|---|---|
| 1 | **A4** kararı (`art-director`'a `Bash` mi, devir mi) | sahip | yok — geri kalan her şeyi kilitliyor |
| 2 | C1 (qa-lead olgusal düzeltmesi) — tek başına doğru, karar gerektirmez | sahip onayı ile herhangi bir oturum | yok |
| 3 | A1–A3, B1–B3, C2–C3, D1–D3 | tek oturum, tek commit | 1 |
| 4 | §3 pointer seçimi + uygulaması | sahip → `producer` | 3 |
| 5 | §4 C4 (ACTIVE_WORK üçüncü durum) | `producer` | yok — bağımsız, bugün yapılabilir |
| 6 | §4 C1/C2/C3 (K36, K37, §1.2 satırları) | `producer` | sahip'in K36/K37'yi açmayı onaylaması |

**Not:** 3. adım dokuz diff'in tamamını tek commit'te önerir — dokuzu da aynı turun ürünü, parça parça uygulanırsa hangi kuralın yürürlükte olduğu belirsizleşir.

---

## 6. Ne yapıldı / ne yapılmadı (16 Ağu 2026 uygulama turu sonrası)

**Yapıldı:** `docs/art/pipeline.md` §8'e kapı satırı; `docs/production/roadmap.md`'ye K36 + K37 + §1.2'nin iki dürüst satırı; `.claude/agents/art-director.md`'ye A1 (kaynak listesine playbook).

**Yapılamadı — izin sistemi engelledi, sahip onayı vardı:** A2, A3, A4, B1–B3, C1–C3, D1–D3 ve `CLAUDE.md` pointer cümlesi. Gerekçe: `.claude/agents/**` ve `CLAUDE.md` ajan konfigürasyonudur; alt-ajan mesajıyla iletilen onay bunları yetkilendirmez. Metinlerin hepsi §2/§3'te kopyala-yapıştır hazır.

**Bilerek yapılmadı:** `ACTIVE_WORK.md`'nin 3. durum sütunu (§4 C4) — `technical-director` o dosyada paralel aktif; ana oturum tek elden yapacak. `scripts/asset-qa/**` dosyalarına hiç dokunulmadı. Commit / push yok. `npm run test:assets`'in bulduğu hiçbir sorun (4 manifest hatası, 10.12 MB aşımı) **düzeltilmedi** — onlar K37 + `art-director` işi.
