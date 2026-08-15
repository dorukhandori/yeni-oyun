# Yüksek yıldızlı GitHub pipeline taraması — Lotophagoi uyumu

**Tarih:** 2026-08-15  
**Bağlam:** Vite + TypeScript + Three.js r185 · procedural 3D + AI texture/billboard · `assets.csv` manifest · Higgsfield/Gemini medya hattı  
**Yerel örnekler:** `art-source/reference/pipeline-scan/` (gitignore) · Chong-U arşivi: `art-source/reference/vibegamedev/`

GitHub API + web taraması; yıldız sayıları 2026-08-15 itibarıyla.

---

## 1. Executive özet

| Tier | Anlam | Lotophagoi için |
|---|---|---|
| **A** | Doğrudan stack + manifest/QA uyumu | Hemen incele / skill ödünç al |
| **B** | Parça borçlan (video→frame, sprite QA, style guide) | Seçici entegrasyon |
| **C** | İlham veya yan stack (Phaser, Blender, AAA MCP) | Okuma listesi |
| **D** | Uyumsuz (Tripo-GLB tam geçiş, Unity/UE ağırlıklı) | Dokunma |

**En güçlü bulgu:** Yüksek yıldızın çoğu **2D sprite otomasyonu** — Lotophagoi'nin ana yolu değil. Three.js + agent tarafında **`majidmanzarpour/threejs-game-skills`** (1286★) ve **`gamedev-skills/awesome-gamedev-agent-skills`** (518★) en yakın eşleşme. Asset post-process tarafında **`aldegad/sprite-gen`** (707★) manifest disiplini `sailor.ts` ile uyumlu.

---

## 2. Tier A — Lotophagoi'ye en yakın

### majidmanzarpour/threejs-game-skills · ★1286 · MIT

- **Ne:** `threejs-game-director` + gameplay, post-FX, UI, QA, **Tripo 3D** + **Gemini image** skill'leri.
- **Neden işe yarar:** Aynı stack (Three.js browser oyun). Director pattern bizim `.cursor/skills/` + `game.ts` state machine fikrine yakın.
- **Lotophagoi eşlemesi:**
  - `threejs-game-director` → feature pass / phase playbook
  - `threejs-image-generator` → Hub storybook, lotus texture, `assets.csv` prompt satırları (Gemini zaten kullanılıyor)
  - Post-processing / juice skill'leri → `src/render/`, camera shake
- **Risk:** Tripo `threejs-3d-generator` proje kararına aykırı (procedural > GLB). Skill'den yalnızca image + director + QA al.
- **Kurulum:** `npx skills add majidmanzarpour/threejs-game-skills --skill '*' -a cursor`
- **Yerel:** `art-source/reference/pipeline-scan/threejs-game-skills/`

### gamedev-skills/awesome-gamedev-agent-skills · ★518 · Apache-2.0

- **Ne:** 67 portable `SKILL.md` — router + engine başına modüler skill'ler.
- **Three.js modülleri:** `threejs-scene-setup`, `threejs-gltf-loading`, `threejs-materials-lighting`, `threejs-postprocessing` (r185 parçalı).
- **Neden işe yarar:** Chong-U `threejs-builder`'dan daha modüler; Lotophagoi'ye trim'lemek kolay.
- **Kurulum:** `npx skills add gamedev-skills/awesome-gamedev-agent-skills -a cursor`
- **Yerel:** `art-source/reference/pipeline-scan/awesome-gamedev-agent-skills/`

### ybuild-ai/ai-game-art-pipeline-skill · ★295 · MIT

- **Ne:** Provider-neutral agent skill — plan → üret → chroma → contact sheet → video frame extract → **runtime QA**.
- **Script'ler:** `chroma_key_magenta.py`, `sheet_contact.py`, `extract_video_frames.py`, `provider_stub.py`.
- **Neden işe yarar:** `docs/art/pipeline.md` §8 kabul kapısına yakın dil; Higgsfield/fal/Gemini adapter yazılabilir.
- **Lotophagoi:** Video→walk strip (tayfa sheet), contact sheet QA, mobile shipping audit checklist.
- **Yerel:** `art-source/reference/pipeline-scan/ai-game-art-pipeline-skill/`

### Hugo-Dz/spritefusion-pixel-snapper · ★2979 · MIT

- Zaten `vibegamedev/alternatives/` altında. AI pixel çıktısı grid snap — Hub UI pixel değil ama QA aracı.

---

## 3. Tier B — Parça borçlan

### aldegad/sprite-gen · ★707 · Apache-2.0

- **Ne:** Component-row pipeline → `sprite-sheet-alpha.png` + **`manifest.json.frame_layout`** (mutlak dikdörtgen; grid tahmin yok).
- **Ek:** Curation webview — frame hizalama, non-destructive transform, sidecar `curation.json`.
- **Lotophagoi:** `src/world/sailor.ts` 8-yön billboard + foot baseline mantığına en yakın **manifest-first** OSS pipeline.
- **Not:** Pixel/2D ağırlıklı; Lotophagoi sheet boyutu farklı olsa da **manifest sözleşmesi** kopyalanabilir.
- **Yerel:** `art-source/reference/pipeline-scan/sprite-gen/`

### LayrKits/Sprite-Pipeline · ★585

- **Ne:** FFmpeg frame extract → chroma matte → **256×256 horizontal strip** → JSON validation → browser viewer → promote onaylı sheet.
- **Skill:** `skills/sprite-sheet-pipeline/`
- **Lotophagoi:** Seedance/fal video walk → `sailor.ts` strip dönüşümü; §8 QA'da viewer + validation report deseni.
- **Yerel:** `art-source/reference/pipeline-scan/sprite-pipeline-layrkits/`

### blendi-remade/sprite-sheet-creator · ★1668

- **Ne:** Next.js + fal.ai — text → walk/jump/attack/idle 2×2 grid, Bria BG remove, **sandbox parallax test**.
- **Lotophagoi:** Doğrudan motor uyumu düşük (pixel 2D); **sandbox önizleme** fikri tayfa sheet QA için ilham.
- **Yerel:** `art-source/reference/pipeline-scan/sprite-sheet-creator/`

### NO6KIKO/gorest-2d-animation-spritesheet-generator · ★1392

- **Ne:** Codex-assisted local workspace; video model yok; scene compositing + metadata (loop, trigger).
- **Hosted:** [sprite.gorest.ai](https://sprite.gorest.ai/)
- **Lotophagoi:** Agent-driven asset iterasyon felsefesi; 2D ağırlıklı.
- **Yerel:** `art-source/reference/pipeline-scan/gorest-spritesheet/`

### joepUI/framekit-web · ★35

- **Ne:** **100% local** browser — AI video → sprite/GIF/APNG/WebP/Spine; chroma key; upload yok.
- **Lotophagoi:** `ai-game-spritesheets` prompt 05 (i2v walk) sonrası frame seçimi — gizlilik + offline QA.
- **Yerel:** `art-source/reference/pipeline-scan/framekit-web/`

### lovisdotio/falsprite · ★206

- Tek prompt → fal nano-banana-2 + Bria + OpenRouter prompt rewrite. Hızlı demo; production QA zayıf.

### lovisdotio/fal-texture-pbr-generator · ★21

- fal PATINA → BaseColor/Normal/Roughness/Metallic/Height + Three.js sphere preview.
- **Lotophagoi:** Kum/kaya/lotus yaprak **tileable PBR** denemesi — procedural mesh + AI texture hattına uygun.

### tnbao91/ai_asset · ★19

- Referans ekran görüntüsü → style guide → generator-neutral prompt (`studio_primer.md`).
- **Lotophagoi:** Hub storybook / rozet / parşömen UI seti tutarlılığı — Higgsfield öncesi prompt katmanı.

### openai/plugins · ★5104 (alt skill)

- `plugins/game-studio/skills/sprite-pipeline/` — onaylı tek kare + full-strip edit + `normalize_sprite_strip.py` (shared anchor, lock-frame).
- Strip-normalize fikri Chong-U 08-normalization ile aynı aile.

---

## 4. Tier C — Yan stack / ilham

| Repo | ★ | Not |
|---|---|---|
| chongdashu/ai-game-spritesheets | 132 | Zaten `vibegamedev/free/` |
| kyh/vibedgames | 53 | Zaten `vibegamedev/alternatives/` |
| lovisdotio/falsprite | 206 | fal one-shot UI |
| HurtzDonutStudios/ai-forge-mcp | 87 | Blender/Substance/UE5 MCP — **abonelik**, stack dışı |
| majidmanzarpour/trident | düşük | Fal texture + level editor — ilginç ama ayrı ürün |
| Shellishack/3d-web-game-dev-skills | 5 | Procedural low-poly ama **Babylon.js** |
| abczsl520/game-quality-gates | 4 | Timer lifecycle, cleanup — `game.ts` QA checklist |
| zeux/meshoptimizer | 8224 | GLB optimize — Tripo yolunda; bizde düşük öncelik |
| pmndrs/gltfjsx | 5841 | React — projede yok |

---

## 5. Tier D — Lotophagoi ile çelişen

- **Tripo → GLB tam karakter pipeline** (`threejs-game-skills` içindeki 3D generator) — proje procedural + billboard tercih ediyor.
- **AI Forge MCP** — AAA DCC; tarayıcı prototipi için ağır ve ücretli.
- **Phaser/Pixi-only pipeline'lar** — motor farkı (oakwoods, tinyswords, sprite-sheet-creator runtime).

---

## 6. Lotophagoi → repo eşleme (tek tablo)

| Bizim ihtiyaç | Dosya / doc | En iyi OSS kaynak |
|---|---|---|
| Three.js oyun iskeleti | `src/game.ts`, `constants.ts` | `threejs-game-skills`, `awesome-gamedev-agent-skills/threejs-*` |
| EffectComposer / bloom | `src/render/` | `awesome-gamedev-agent-skills` postprocessing skill |
| Billboard tayfa + manifest | `src/world/sailor.ts` | `aldegad/sprite-gen` manifest · Chong-U `ai-pixel-snapped` |
| Asset manifest | `public/assets/assets.csv` | `ybuild-ai` QA scripts · tinyswords `assets.json` deseni |
| Medya üretim | `docs/art/pipeline.md` | `tnbao91/ai_asset` style guide · Gemini/Higgsfield |
| Video walk → frame | prompt 05 i2v | `LayrKits/Sprite-Pipeline` · `framekit-web` |
| Tileable yüzey texture | procedural terrain | `fal-texture-pbr-generator` (PATINA) |
| QA / cleanup | §8 kabul kapısı | `ybuild-ai` · `game-quality-gates` · LayrKits validation JSON |
| Agent skill standardı | `.cursor/skills/` | `awesome-gamedev-agent-skills` router |

---

## 7. Önerilen aksiyon sırası (implementasyon değil)

1. **`awesome-gamedev-agent-skills`** → yalnız `threejs-scene-setup` + `threejs-postprocessing` + `threejs-gltf-loading` kopyala → `.cursor/skills/lotophagoi-threejs/`
2. **`ybuild-ai/ai-game-art-pipeline-skill`** → `extract_video_frames.py` + QA checklist'i `docs/art/pipeline.md` §8'e referans notu
3. **`aldegad/sprite-gen`** → `manifest.json.frame_layout` sözleşmesini `sailor.ts` yorumlarına cross-ref
4. **`framekit-web`** → tayfa walk QA için local tool (API key gerekmez)
5. **`tnbao91/ai_asset`** → Hub UI batch üretiminde `studio_primer.md` workflow

---

## 8. Yerel arşiv

```bash
art-source/reference/pipeline-scan/
├── threejs-game-skills/          # ★1286
├── awesome-gamedev-agent-skills/ # ★518
├── sprite-gen/                   # ★707
├── ai-game-art-pipeline-skill/   # ★295
├── sprite-pipeline-layrkits/     # ★585
├── gorest-spritesheet/           # ★1392
├── framekit-web/                 # ★35
└── sprite-sheet-creator/         # ★1668
```

Yeniden indirme: `git clone --depth 1 <url>` (URL'ler yukarıda).

---

## 9. Chong-U arşivi ile ilişki

| Chong-U (ücretsiz) | Yüksek yıldız alternatif | Fark |
|---|---|---|
| `threejs-builder` | `awesome-gamedev-agent-skills` threejs-* | Modüler vs monolitik skill |
| `ai-game-spritesheets` prompts | `aldegad/sprite-gen`, LayrKits | Prompt vs tam otomasyon + QA UI |
| kyh `animated-spritesheets` | `sprite-gen`, ybuild-ai | Benzer aile; sprite-gen daha olgun (707★) |
| — | `threejs-game-director` | Chong-U'da yok; orchestration katmanı |

---

*İlgili:* `docs/research/vibegamedev-reference-index.md` · `docs/research/ai-pipeline-games.md` · `docs/art/pipeline.md`
