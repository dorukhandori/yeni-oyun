# Lotophagoi — sorun analizi ve repo çözüm haritası

**Tarih:** 2026-08-16  
**Amaç:** Projede yaşanan kalite sorunlarını sınıflandırmak; her biri için **somut Git repo / script / skill** önerisi vermek.  
**Yerel arşivler (gitignore):**

| Klasör | İçerik |
|---|---|
| `art-source/reference/vibegamedev/` | Chong-U + kyh alternatifleri |
| `art-source/reference/pipeline-scan/` | Yüksek yıldızlı pipeline taraması |
| `art-source/reference/metatransformer/` | gamestack, game-stack, threejs-game-skills, godogen |
| `art-source/reference/problem-solutions/` | **Yeni:** threejs-visual-qa, game-quality-gates, agentguard, playwright-canvas |

İlgili dokümanlar: `docs/research/vibegamedev-reference-index.md`, `docs/research/high-star-pipeline-scan.md`, `docs/research/metatransformer-game-stack-scan.md`

---

## 1. Sorun envanteri (kanıtlı)

Kaynak: `docs/production/roadmap.md` §1–§4, `ACTIVE_WORK.md`, `AGENTS.md`, sahip playtest geri bildirimleri.

### P0 — Üretim süreci / regresyon riski

| ID | Sorun | Belirti | Repo çözer mi? |
|---|---|---|---|
| **S1** | Paralel ajan aynı dosyaya yazıyor | 15 Ağu 0-byte dosyalar; duplicate ada/fizik işi | Kısmen (disiplin) |
| **S2** | Hub storybook kontrast regresyonu | Busy arka plan → ada adı/rozet okunmuyor; CSS yama | **Evet** (görsel QA) |
| **S3** | Otomatik test yok | Her UI/ render değişikliği elle; Faz 6 öncesi kör nokta | **Evet** |
| **S4** | `assets.csv` ↔ disk uyumsuzluğu riski | Faz 7.2 manifest denetimi henüz yok | **Evet** |

### P1 — Tasarım otoritesi / sayılar

| ID | Sorun | Belirti | Repo çözer mi? |
|---|---|---|---|
| **S5** | `tuning.md` ↔ `constants.ts` tam hizalanmadı | Faz 1 tıkalı; iki profile var ama GDD kabul yok | Hayır (karar + kod) |
| **S6** | GDD kabul kriterleri kodda geçmiyor | 10+14 madde bekliyor (Faz 2) | Kısmen (checklist) |
| **S7** | Kod ↔ GDD çelişkisi | Ekranda unutuş barı (GDD yasak) | Hayır (kod) |
| **S8** | Tasarım dokümanları senkron değil | hub vs multi-island-concept; onay kapanmadı | Hayır (süreç) |

### P2 — Eksik mekanik / oynanış kalitesi

| ID | Sorun | Kaynak |
|---|---|---|
| **S9** | `HARVEST_HOLD`, solmuş ceza, 4 eşik, sapma, sanrı, Esc yok | roadmap §1.3 |
| **S10** | Deterministik lotus yok (`Math.random`) | roadmap §1.3, Faz 2.1 |
| **S11** | Dalga sesi lowpass’ten geçiyor | roadmap §1.3 |
| **S12** | El yerleşimli lotus / 28→5 layout yok | Faz 2.6 |

**Repo notu:** S9–S12 **implementasyon işi** — repolar yalnızca referans/checklist sağlar.

### P3 — Asset pipeline

| ID | Sorun | Belirti |
|---|---|---|
| **S13** | Tayfa walk/teslim sheet’leri yok | Veo clip diskte yok; `sheet-from-video.mjs` hazır ama zincir tek komut değil |
| **S14** | Video→sheet yolu doğrulanmadı | `pipeline.md` §5; Higgsfield bağlı değil |
| **S15** | §8 kabul kapısı otomatik değil | Elle QA |
| **S16** | Karakter animasyonu belirsiz | `ai-pipeline-games.md` “çözülmemiş büyük problem” |

### P4 — Ölçüm / playtest (Faz 6)

| ID | Sorun |
|---|---|
| **S17** | `tuning.md` §11 altı ölçüm log verisi yok |
| **S18** | Haritayı bilmeyen oyuncu playtest yok |
| **S19** | GDD kriter listesi tek tek koşulmuyor |

---

## 2. Çözüm türleri — repo ne zaman yeterli?

| Tür | Açıklama | Örnek sorunlar |
|---|---|---|
| **R** | Repo/script/skill doğrudan entegre edilir | S2, S3, S4, S13–S15 |
| **R+C** | Repo + Lotophagoi’ye özel kod | S3 (test hooks), S13 (sheet-from-video + LayrKits) |
| **C** | Yalnızca kod + sahip kararı | S5, S7, S9–S12 |
| **P** | Süreç (ACTIVE_WORK, Faz sırası) | S1, S8 |
| **R+P** | Repo disiplini + süreç | S1 (iteration-loop §6 + claim board) |

---

## 3. Sorun → repo çözüm matrisi

### S1 — Paralel ajan kaosu

| Öneri | Repo / kaynak | Ne alınır |
|---|---|---|
| **1** | `gamestack` → `iteration-loop/LOOP.md` §6 | Pahalı görsel değişiklik: tek instance + sahip onayı |
| **2** | `Metatransformer/agentguard` | Harici skill kurmadan önce `agentguard scan` |
| **3** | — | `ACTIVE_WORK.md` protokolü (repo değil, zorunlu) |

**Clone:** `art-source/reference/problem-solutions/agentguard/`  
**Entegrasyon:** `.cursor/rules/` veya PR checklist’e “visual batch = human gate”.

---

### S2 + S3 — Görsel QA / Hub kontrast / canvas regression

| Öneri | Repo | Lotophagoi uyumu | Öncelik |
|---|---|---|---|
| **A** | `majidmanzarpour/threejs-game-skills` → `inspect-threejs-canvas.mjs` | Vite + raw Three.js; metrik JSON (entropy, contrast) | **P0** |
| **B** | `yomero243/threejs-visual-qa` | R3F değil; `?testing=true` determinism deseni taşınır | P1 |
| **C** | `satelllte/playwright-canvas` | Playwright Clock + snapshot POC | P2 |
| **D** | `vibegamedev/.../playwright-testing` skill | Test yazım playbook | P1 |
| **E** | `Metatransformer/game-stack` rubric | `color-contrast`, `title-readability` kriterleri hub tile için | P1 |

**Clone:** `problem-solutions/threejs-visual-qa`, `problem-solutions/playwright-canvas`  
**Lotophagoi adaptasyonu:**

```text
?profile=test&phase=hub&seed=1   → screenshot + contrast metrics
?profile=real&phase=play&mem=75  → unutuş vignette doğrulama
```

**Birleştir:** A (inspector) + E (rubric checklist) + mevcut `screens.md` §3.5 kontrast maddesi.

---

### S4 + S7.2 — Manifest bütünlüğü (`assets.csv` ↔ `public/assets/`)

| Öneri | Repo | Script |
|---|---|---|
| **1** | `kyh-vibedgames` | `plugins/asset-pipeline/.../asset_manifest_check.py` — CSV/JSON uyarlaması |
| **2** | `awesome-gamedev-agent-skills` | `create-game-assets/scripts/asset_report.py` |
| **3** | Yerel | `npm run build:pages` öncesi CI script (henüz yok) |

**Clone:** zaten `vibegamedev/alternatives/kyh-vibedgames/`  
**Aksiyon:** `asset_manifest_check.py` mantığını `public/assets/assets.csv` + glob için fork (Lua değil CSV).

---

### S5 — tuning ↔ constants

| Repo | Fayda |
|---|---|
| Yok (doğrudan) | `game-quality-gates` Rule 5 (delta time) — `STEP` zaten var; sayı eşitleme repo işi değil |

**Çözüm:** Faz 1 oturumu (sahip + `game-designer`) — repolar **blokajı kaldırmaz**.

---

### S6 + S19 — GDD kabul kriterleri

| Öneri | Repo | Ne sağlar |
|---|---|---|
| **1** | `threejs-game-skills/threejs-game-director` | Phase playbook + QA matrix |
| **2** | `threejs-game-skills/threejs-qa-release` | `qa-release-checklists.md`, playtest-bot |
| **3** | `gamestack/game-design-fundamentals` | “Machine-checkable tests” dili |
| **4** | `bmad-code-org/bmad-module-game-dev-studio` (★222) | `gds-test-design`, human playtest plan — **clone edilmedi**, referans |
| **5** | Yerel | `tests/gdd-acceptance/` markdown checklist → ileride otomasyon |

**Clone önerisi (opsiyonel):** `bmad-module-game-dev-studio` — yalnızca playtest şablonu için.

---

### S9–S12 — Eksik mekanikler

| Repo | Rol |
|---|---|
| `gamestack/game-feel-and-juice` | Harvest hold, telegraph, juice bütçesi — **tasarım spec** |
| `gamestack/level-design` | El yerleşimli lotus grammar |
| `vibegamedev/threejs-builder` | Implementasyon convention |
| `abczsl520/game-quality-gates` | Timer lifecycle (S11 audio), scene cleanup (phase geçişleri) |

**Clone:** `problem-solutions/game-quality-gates/` (★4, wiki + Three.js guide)

**Kritik:** `game-quality-gates` Rule 4 (timer lifecycle) → dalga/lowpass bug sınıfı; Rule 6 → hub↔play geçişinde dispose.

---

### S13–S16 — Asset / sprite / video pipeline

| Adım | Repo | Dosya |
|---|---|---|
| Video → frame | `ai-game-art-pipeline-skill` | `scripts/extract_video_frames.py` |
| Chroma | aynı + LayrKits | `chroma_key_magenta.py`, `tools/extract_frames_ffmpeg.py` |
| Manifest frame layout | `aldegad/sprite-gen` | `manifest.json` frame_layout sözleşmesi |
| Sheet QC | LayrKits | validation JSON + browser viewer |
| Prompt disiplini | `vibegamedev/ai-game-spritesheets` | Doryseus şablonları |
| Video→sheet (mevcut) | **yerel** `scripts/sheet-from-video.mjs` | ffmpeg + quantize; Veo clip eksik |
| Contact sheet QA | `ai-game-art-pipeline-skill` | `sheet_contact.py` |
| Foot baseline | `vibegamedev/ai-pixel-snapped-game-sprites` | manifest foot anchor |

**Önerilen birleşik hat:**

```text
Gemini/Veo clip → sheet-from-video.mjs (yerel)
  → LayrKits chroma/validate
  → sprite-gen manifest.json
  → sailor.ts strip loader
  → inspect_sprite_run.py (sprite-gen QA)
```

**Clone:** zaten `pipeline-scan/` + `vibegamedev/`

---

### S17–S18 — Playtest ölçümü

| Öneri | Repo |
|---|---|
| Bot playtest | `threejs-qa-release` → `bot-playtest.template.ts`, `playtest-bot.md` |
| Human session | `gamestack/iteration-loop` §4 + BMad `gds-playtest-plan` |
| Telemetri | Kod: `game.ts` JSON log (repo yok — Faz 6.2) |

---

### S1 ek — Skill güvenliği (harici paket kurarken)

| Repo | Komut |
|---|---|
| `Metatransformer/agentguard` | `npm i -g agentguard && agentguard scan .cursor/skills/` |

---

## 4. Yeni bulunan repolar (bu oturum)

| Repo | ★ | Sorun | Yerel |
|---|---|---|---|
| [yomero243/threejs-visual-qa](https://github.com/yomero243/threejs-visual-qa) | düşük | S2, S3 — determinism + golden snapshot | `problem-solutions/threejs-visual-qa/` |
| [abczsl520/game-quality-gates](https://github.com/abczsl520/game-quality-gates) | 4 | S9–S11 sınıfı — timer/audio/cleanup | `problem-solutions/game-quality-gates/` |
| [Metatransformer/agentguard](https://github.com/Metatransformer/agentguard) | 5 | S1 — skill scan | `problem-solutions/agentguard/` |
| [satelllte/playwright-canvas](https://github.com/satelllte/playwright-canvas) | 5 | S3 — Clock API + canvas snapshot | `problem-solutions/playwright-canvas/` |
| [bmad-code-org/bmad-module-game-dev-studio](https://github.com/bmad-code-org/bmad-module-game-dev-studio) | 222 | S17–S18 — playtest plan | clone edilmedi (opsiyonel) |

**Not:** `react-three-dom` Lotophagoi’ye uymaz (R3F yok). `three.js` resmi Puppeteer E2E — örnek odaklı, doğrudan entegre değil; fikir kaynağı.

---

## 5. Öncelikli entegrasyon planı (repo tarafı)

| Sıra | Sorun ID | Aksiyon | Repo kaynağı | Effort |
|---|---|---|---|---|
| 1 | S2, S3 | `inspect-threejs-canvas.mjs` + `__LOTOPHAGOI_TEST_HOOKS__` | threejs-game-skills | Küçük |
| 2 | S4 | `scripts/check-assets-manifest.mjs` (kyh mantığı) | kyh asset_manifest_check | Küçük |
| 3 | S13–S15 | LayrKits + ai-game-art-pipeline script’lerini `scripts/pipeline/` altına adapt | pipeline-scan | Orta |
| 4 | S1 | agentguard pre-install + iteration-loop §6 PR kuralı | agentguard, gamestack | Küçük |
| 5 | S6, S19 | GDD acceptance markdown + threejs-qa checklist | threejs-game-director | Orta |
| 6 | S2 (store) | Capsule rubric checklist | game-stack/rubric | Küçük |
| 7 | S9–S11 | game-quality-gates wiki → phase cleanup audit | game-quality-gates | Okuma |

**Repo dışı zorunlu (aynı anda):** Faz 1 (S5), Faz 2 mekanik (S9–S12), S7 memory bar kaldırma.

---

## 6. Dürüst etki tahmini

| Sorun grubu | Yalnızca repo arşivi | Repo + 1–3 entegrasyon |
|---|---|---|
| S1 süreç | +10% | +40% (agentguard + human gate) |
| S2–S4 QA/görsel/manifest | +5% | **+65%** |
| S5–S8 tasarım/sayı | +0% | +5% (checklist) |
| S9–S12 mekanik | +5% (referans) | +10% |
| S13–S16 asset | +15% (scriptler hazır) | **+55%** |
| S17–S19 playtest | +10% | +35% |

**Genel:** Repolar **tek başına bariz kalite sıçraması değil**; **S2–S4 + S13–S16** için entegre edilirse en yüksek ROI.

---

## 7. Red listesi — araştırma dışı bırak

| Repo / fikir | Neden |
|---|---|
| Tripo / `threejs-3d-generator` | Proje kararı: procedural + billboard |
| Phaser starter’lar (Chong-U) | Motor farklı |
| Mesh / Singularity / token | Ürün kimliği dışı |
| `game-stack` tam SaaS | Store yokken overkill |
| `react-three-dom` | R3F gerekir |
| Gaia/Dryad (roadmap) | WebGPU/`onBeforeCompile` riski |

---

## 8. Hızlı yeniden indirme

```bash
# Mevcut arşivler — bkz. vibegamedev-reference-index.md, metatransformer-game-stack-scan.md

# Yeni problem-solutions
mkdir -p art-source/reference/problem-solutions && cd art-source/reference/problem-solutions
git clone --depth 1 https://github.com/yomero243/threejs-visual-qa
git clone --depth 1 https://github.com/abczsl520/game-quality-gates
git clone --depth 1 https://github.com/Metatransformer/agentguard
git clone --depth 1 https://github.com/satelllte/playwright-canvas
```

---

## 9. Sonuç

1. **Sorunların ~%40’ı** repo + küçük entegrasyonla güvenlik ağına alınabilir (görsel QA, manifest, asset pipeline, skill scan).  
2. **~%45’i** kod + Faz 1–2 + sahip onayı (mekanik, tuning, GDD uyumu).  
3. **~%15’i** saf süreç (ACTIVE_WORK, doküman senkronu).

**En acil repo entegrasyonu:** `threejs-game-skills` canvas inspector (S2, S3) + kyh manifest check (S4) + LayrKits/ai-game-art-pipeline birleşimi (S13–S15).

**Uygulama prompt'u (ajan oturumuna yapıştır):** `docs/production/agent-prompt-archive-integration.md`
