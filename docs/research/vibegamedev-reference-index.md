# VibeGameDev / Chong-U referans arşivi — indeks ve Lotophagoi eşlemesi

**Tarih:** 2026-08-15  
**Yerel arşiv:** `art-source/reference/vibegamedev/` (~490 MB, gitignore)  
**Otomatik envanter:** `art-source/reference/vibegamedev/inventory.json`

Sahip talebi: Chong-U ücretsiz kaynakları + ücretliye yakın alternatifleri tek klasörde toplama ve Lotophagoi ile eşleme.

---

## 1. Özet bulgu

| Soru | Cevap |
|---|---|
| Tam $399 paket sızdırılmış mı? | **Hayır** — güvenilir public leak yok |
| Ücretsiz katman yeterli mi? | Lotophagoi için **evet** (Three.js + prompt disiplini); 2D pixel otomasyon istenirse **kyh/vibedgames** |
| En değerli ücretsiz parça | `vibejam-starter-pack` → `threejs-builder` skill (~485 satır) |
| Ücretli farkın özü | Agent skill `.md` + Python/uv script otomasyonu + bitmiş oyun kaynakları |

---

## 2. Klasör haritası

### `free/` — Chong-U resmi ücretsiz (12 repo)

| Klasör | Boyut | Ne işe yarar | Lotophagoi |
|---|---|---|---|
| `vibejam-starter-pack` | 34 MB | **8 skill** + 4 starter proje | **Ana kaynak** — `threejs-builder`, `playwright-testing` |
| `ai-game-spritesheets` | 26 MB | 8 prompt şablonu + referans görseller | Doryseus sheet yenileme prompt disiplini |
| `ai-pixel-snapped-game-sprites` | 19 MB | Game-ready sheet + `manifest.json` (foot anchor) | `sailor.ts` manifest/anchor deseni referansı |
| `threejs-forest-census` | 9 MB | Codex + threejs-builder örneği | Sahne/kamera/loop mimarisi |
| `threejs-toonshooter` | 16 MB | Action Three.js starter | Juice / hareket referansı (Phaser değil) |
| `threejs-capacitor-ios-game` | 60 MB | Web → iOS Capacitor referansı | Şimdilik düşük öncelik |
| `phaserjs-tinyswords` | 67 MB | Castle Clash Duel (Phaser) | Lotophagoi motoru değil — yalnızca AI workflow örneği |
| `phaserjs-oakwoods` | 5 MB | RPG platformer (Phaser) | Aynı |
| `pirate-survival-beatemup` | 6 MB | Tutorial **starter** (bitmiş oyun yok) | Prompt sırası fikri, kod değil |
| `vibe-isometric-sprites` | 76 MB | İzometrik sprite workflow | Lotophagoi izometrik değil |
| `spriterrific-skills` | 0.1 MB | Spriterrific API skill | Cloud sprite API — opsiyonel |
| `spriterrific-public` | — | **Repo bulunamadı** (404) | PyPI `spriterrific` CLI ayrı |

### `alternatives/` — ücretliye yakın OSS (3 repo)

| Klasör | Boyut | Ne işe yarar | Lotophagoi |
|---|---|---|---|
| `kyh-vibedgames` | 133 MB | **36 skill**, `animated-spritesheets` + `pixel-snapper` + `asset-pipeline` script'leri | Ücretli sprite otomasyonunun **legal** alternatifi |
| `2dimg2motion` | 24 MB | Statik 2D → animasyon skill | Tayfa sheet denemesi için yedek |
| `spritefusion-pixel-snapper` | 2 MB | MIT pixel grid snap aracı | AI pixel çıktısı temizleme (Lotophagoi pixel değil ama pipeline §8 QA'da işe yarar) |

### `cheatsheets/`

| Dosya | Kaynak |
|---|---|
| `vgd-05-images-2.0.png` | [aiod.dev/vgd-05-cheatsheet](https://aiod.dev/vgd-05-cheatsheet) |
| `vgd-06-pixel-snap.png` | [aiod.dev/vgd-06-cheatsheet](https://aiod.dev/vgd-06-cheatsheet) |
| `spriterrific-api-skill.zip` | GitHub release |

---

## 3. Skill envanteri (Lotophagoi-relevant)

### vibejam-starter-pack (ücretsiz, Chong-U)

| Skill | Satır | Lotophagoi kullanımı |
|---|---|---|
| **threejs-builder** | ~485 | **Yüksek** — scene graph, GLTF, game patterns, r150+ API |
| playwright-testing | ~211 | Canvas/HUD smoke test |
| retro-diffusion | — | Pixel art — Lotophagoi ana stil değil |
| fal-ai-image | — | fal.ai görsel — Higgsfield alternatif API |
| phaser-gamedev / phaser4 | — | Phaser — bu projede kullanılmıyor |
| threejs-capacitor-ios | — | Mobil export — ileride |
| tinyswords-tilemap | — | 2D tilemap — kullanılmıyor |

### kyh-vibedgames (alternatif, ücretli otomasyona en yakın)

| Skill | Chong-U ücretli karşılığı | Lotophagoi |
|---|---|---|
| **animated-spritesheets** | `animated-spritesheets` | Orta — tayfa billboard sheet yenileme |
| **pixel-snapper** | `pixel-snapper` skill | Düşük — pixel değiliz |
| asset-pipeline | `gamedev-assets` | Orta — `assets.csv` orchestration fikri |
| **threejs** (game-engines) | `threejs-builder` (farklı yazar) | Yüksek — ikinci görüş |
| image-to-threejs | — | **Yüksek** — AI texture → Three.js mesh |

**kyh animated-spritesheets akışı (özet):**

1. Onaylı anchor PNG (chroma matte)
2. `sprite_prompt.py pose-board` → tek grid görsel (4×3 hücre)
3. fal/nano-banana ile üretim
4. `process_sheet.py` → chroma clean → pixel snap → normalize → `spritesheet.png` + JSON manifest
5. QC: `sheet_qc.py`

Bu, Chong-U'nun `ai-game-spritesheets` prompt'larının **script otomasyonu** hali.

---

## 4. Lotophagoi ↔ Chong-U eşleme tablosu

| Lotophagoi bileşeni | Bizim dosya | Chong-U / alternatif referans |
|---|---|---|
| Three.js oyun döngüsü | `src/game.ts` | `threejs-builder` → `references/game-patterns.md` |
| GLTF / mesh | `src/world/*.ts` | `threejs-builder` → `gltf-loading-guide.md` |
| Billboard tayfa | `src/world/sailor.ts` | `ai-pixel-snapped-game-sprites` → foot anchor `(128,255)`, manifest.json |
| Asset manifest | `public/assets/assets.csv` | kyh `asset-pipeline` fikri; Chong-U `assets.json` (tinyswords) |
| Pipeline QA | `docs/art/pipeline.md` §8 | `ai-game-spritesheets` prompt 08-normalization |
| Hub / DOM UI | `src/ui/hud.ts` | playwright-testing skill |
| Higgsfield medya | `docs/art/pipeline.md` | Chong-U fal-ai-image / retro-diffusion — farklı API, aynı felsefe |

### Al — kopyala veya skill olarak bağla

1. **`threejs-builder`** → `.cursor/skills/` veya proje `.claude/skills/` altına (henüz entegre değil)
2. **`ai-game-spritesheets/prompts/`** → Doryseus turnaround / walk sheet yenileme
3. **`threejs-forest-census`** → sahne mimarisi referans repo (fork etme, oku)
4. **`kyh-vibedgames/plugins/asset-pipeline`** → sheet otomasyon denemesi

### Alma — Lotophagoi ile uyumsuz

- Phaser starter'ları (oakwoods, tinyswords, pirate beatemup)
- Pixel-first pipeline (retro-diffusion, pixel snap ağırlıklı)
- Spriterrific cloud API (ek maliyet + pixel karakter)
- Tripo/GLB tam geçiş (proje kararı: procedural + texture)

---

## 5. Ücretli pakette olup arşivde olmayanlar

Detay: `art-source/reference/vibegamedev/paid-gap-notes/PAID-GAP.md`

Kısa liste: Chong-U `animated-spritesheets`, `gamedev-assets`, `pixel-snapper` (wrapper), `love2d-gamedev`, `sora-2`, `gpt-image-1-5`, bitmiş pirate oyun, Discord.

**Pratik:** kyh/vibedgames + ücretsiz prompt repoları ≈ ücretli paketin %70–80'i (legal).

---

## 6. threejs-builder — Lotophagoi için kritik noktalar

İndirilen skill'den doğrudan uyumlu maddeler:

- **Scene graph mental model** — `Group` hiyerarşisi (`sailor.root`, lotus field)
- **GLTF -Z facing** — model yönlendirme (`rotation.y = Math.PI`)
- **Fixed timestep vs render** — bizde `STEP = 1000/60` (`game.ts`)
- **Instancing / merge geometries** — `pipeline.md` + proje kuralı
- **Post-processing guardrails** — bloom/haze (`src/render/`)

Skill'de **Phaser, Capacitor, pixel snap** bölümleri var — Lotophagoi slice'ında atlanabilir.

---

## 7. Yeniden indirme komutları

```bash
BASE=art-source/reference/vibegamedev
mkdir -p "$BASE"/{free,alternatives,cheatsheets}

# Ücretsiz Chong-U
for pair in \
  vibejam-starter-pack:chongdashu/vibejam-starter-pack \
  ai-game-spritesheets:chongdashu/ai-game-spritesheets \
  ai-pixel-snapped-game-sprites:chongdashu/ai-pixel-snapped-game-sprites \
  spriterrific-skills:chongdashu/spriterrific-skills \
  vibe-isometric-sprites:chongdashu/vibe-isometric-sprites \
  phaserjs-tinyswords:chongdashu/phaserjs-tinyswords \
  threejs-forest-census:chongdashu/threejs-forest-census \
  threejs-toonshooter:chongdashu/threejs-toonshooter \
  phaserjs-oakwoods:chongdashu/phaserjs-oakwoods \
  pirate-survival-beatemup:chongdashu/pirate-survival-beatemup \
  threejs-capacitor-ios-game:chongdashu/threejs-capacitor-ios-game
do
  name="${pair%%:*}"; repo="${pair##*:}"
  git clone --depth 1 "https://github.com/${repo}.git" "$BASE/free/$name"
done

# Alternatifler
git clone --depth 1 https://github.com/kyh/vibedgames.git "$BASE/alternatives/kyh-vibedgames"
git clone --depth 1 https://github.com/WU-HAOTIAN34/2dimg2motion.git "$BASE/alternatives/2dimg2motion"
git clone --depth 1 https://github.com/Hugo-Dz/spritefusion-pixel-snapper.git "$BASE/alternatives/spritefusion-pixel-snapper"

# Cheatsheets
curl -fsSL -o "$BASE/cheatsheets/vgd-05-images-2.0.png" \
  "https://excalidraw.nyc3.cdn.digitaloceanspaces.com/scene/9Olq7LAHfI6/scene_links/fhSNOsMGlIPbaG1npNs2/6qAVNSh0skWbf07Cs-fQJ.png"
curl -fsSL -o "$BASE/cheatsheets/vgd-06-pixel-snap.png" \
  "https://excalidraw.nyc3.cdn.digitaloceanspaces.com/scene/AFEjVj9Uj3N/scene_links/RE6Ajl2yEbDTpQrNiy8h/GGYknqInss7Z4H1q3-FWO.png"
```

---

## 8. Sonraki adım önerisi (implementasyon değil)

1. `threejs-builder` skill'ini `.cursor/skills/threejs-lotophagoi/` olarak **Lotophagoi'ye trim'le** (constants.ts, EffectComposer, billboard kuralları ekle)
2. `ai-game-spritesheets/prompts/02-south-anchor.md` → Doryseus için Ege paleti placeholder'lı kopya (`art-source/prompts/`)
3. kyh `process_sheet.py` akışını **tek karakter denemesi** olarak çalıştır — Lotophagoi'ye merge etmeden önce

---

*İlgili:* `docs/research/ai-pipeline-games.md` · `docs/art/pipeline.md` · `AGENTS.md` çoklu-ajan protokolü
