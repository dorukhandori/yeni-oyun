# Metatransformer / gamestack Git repo taraması — Lotophagoi eşlemesi

**Tarih:** 2026-08-16  
**Tetikleyici:** [@metatransformr tweet](https://x.com/metatransformr/status/2088438758454812973) — “güzel fikir” (micro-tool + agentic prod loop)  
**Yerel arşiv:** `art-source/reference/metatransformer/` (~11 MB, gitignore)  
**Envanter:** `art-source/reference/metatransformer/inventory.json`  
**İlgili önceki taramalar:** `docs/research/vibegamedev-reference-index.md`, `docs/research/high-star-pipeline-scan.md`

---

## 1. Executive özet

| Repo | ★ | Lotophagoi değeri |
|---|---|---|
| **[rondorkerin/gamestack](https://github.com/rondorkerin/gamestack)** | 25 | **Yüksek (tasarım)** — cited design brain + `iteration-loop` + headless bench deseni |
| **[Metatransformer/game-stack](https://github.com/Metatransformer/game-stack)** | 0 | **Orta (launch)** — Steam capsule 10-kriter rubric (MIT rubric paketi) |
| **[majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills)** | 1286 | **Yüksek (implementasyon)** — Three.js engine hands; gamestack’in Three.js boşluğunu doldurur |
| **[maxthraxx/godogen](https://github.com/maxthraxx/godogen)** | — | **Orta (QA deseni)** — screenshot + Gemini vision self-repair döngüsü (Godot; fikir taşınır) |
| **[rondorkerin/pixelforge](https://github.com/rondorkerin/pixelforge)** | 1 | **Düşük** — pixel YAML pipeline; Lotophagoi billboard/Ege 3D değil |
| **[Metatransformer/agentguard](https://github.com/Metatransformer/agentguard)** | 5 | **Orta (güvenlik)** — skill/plugin taraması; harici skill borçlanmadan önce |

**Ana bulgu:** Metatransformer ekosistemi **iki katman**:

1. **gamestack** = tasarım beyni (engine-agnostic skill’ler, headless iteration loop)  
2. **game-stack** = tek micro-SaaS (Steam capsule grader) + aynı felsefenin ürün yüzü  

Lotophagoi stack’i (Vite + Three.js + DOM HUD) için **gamestack design brain + threejs-game-skills engine hands** birleşimi en doğru eşleşme. game-stack’in rubric’i store hazırlığında; tam Next.js uygulamasını kopyalamaya gerek yok.

---

## 2. Kim kim — ekosistem haritası

```
@metatransformr (Chubigans / David Chubb — Cook Serve Delicious)
        │
        ├── Valenfeld (procedural co-op RPG, Steam yakında)
        │
        └── Metatransformer org (Nicholas Steele / rondorkerin)
                 ├── game-stack      → micro-tool SaaS (capsule grader)
                 ├── gamestack       → Claude skill marketplace (design brain)
                 ├── agentguard      → npm audit for agent skills
                 ├── the-mesh        → P2P AI agent swarm (public clone 404 — muhtemelen private)
                 └── starframe       → boş/iskelet repo
```

**Not:** `singularity-engine` public GitHub’da yok; tweet’te geçen “tweet→app” hattı repoda doğrulanamadı. Mesh/token katmanı Lotophagoi ile uyumsuz — yalnızca agent orchestration fikri referans.

---

## 3. Clone edilen repolar (yerel)

| Klasör | Boyut | Lisans | Ne içerir |
|---|---|---|---|
| `gamestack/` | 2.5 MB | MIT | 26 first-party skill, `docs/headless-architecture.md`, engine overlays |
| `game-stack/` | 1.1 MB | (repo) | Next.js 16 monorepo, `packages/rubric`, Supabase, OpenAI vision grade API |
| `threejs-game-skills/` | 1.7 MB | MIT | Director, QA release, canvas inspector, visual regression şablonları |
| `godogen/` | 4.9 MB | — | Godot autonomous pipeline, `visual_qa.py`, Tripo+Gemini |
| `pixelforge/` | 600 KB | — | YAML→OpenAI pixel pipeline, review server |

**Yeniden indirme:**

```bash
mkdir -p art-source/reference/metatransformer && cd art-source/reference/metatransformer
git clone --depth 1 https://github.com/rondorkerin/gamestack
git clone --depth 1 https://github.com/Metatransformer/game-stack
git clone --depth 1 https://github.com/majidmanzarpour/threejs-game-skills
git clone --depth 1 https://github.com/maxthraxx/godogen
git clone --depth 1 https://github.com/rondorkerin/pixelforge
```

---

## 4. gamestack — tasarım beyni (detay)

### 4.1 Mimari

| Katman | İçerik | Lotophagoi karşılığı |
|---|---|---|
| **Design brain** | 26 cited skill (feel, pacing, procgen, art-direction…) | GDD’ler zaten otorite — skill’ler *checklist* olarak borçlanılır |
| **Process skills** | `game-design-process`, `procgen-review`, `iteration-loop`, `engine-router` | Feature pass / QA gate playbook |
| **Engine hands** | Godot ✅ · Unreal ✅ · Unity 🟡 · **Three.js ⬜ roadmap** | **`threejs-game-skills` + Chong-U `threejs-builder`** |
| **Overlays** | `overlays/threejs.md` | Lotophagoi mimarisiyle birebir: Vite, instancing, DOM HUD, fixed timestep |

### 4.2 iteration-loop — en değerli parça

`plugins/gamestack/skills/iteration-loop/LOOP.md` şu döngüyü tanımlar:

**Reference → Diff → Prioritize → Generate → Verify**

| Modalite | Preview harness | Lotophagoi örneği |
|---|---|---|
| **Visual** | Tek sistem bench + screenshot | `?profile=test` + hub/play canvas capture |
| **Systemic** | Sim / metrics | `constants.ts` tuning + memory rate sim |
| **Narrative** | Canon grid | `scenario.md` + unutuş kuralları |
| **Variety** | Oatmeal test | Lotus spawn çeşitliliği / sanrı figür rotasyonu |

**Headless desenler (Godot örneği, engine-agnostic fikir):**

- Input → verb → seam (test ile aynı kod yolu)
- Preview bench: parametreli boot, deterministik PNG
- AI playtester API: log + screenshot + input injection
- **§6 human checkpoint:** pahalı görsel değişikliği tek instance + mockup onayı — sahip kapısı

Tam Godot örneği: `gamestack/docs/headless-architecture.md`

### 4.3 Three.js boşluğu — gamestack açıkça söylüyor

`engine-router/SKILL.md` satır 45:

> **Implement in Three.js / web** → ⬜ roadmap — no curated pack yet

`overlays/threejs.md` Lotophagoi’yi tarif eder gibi:

- `THREE.Scene` + instanced meshes  
- Plain TS modules, fixed timestep  
- DOM/CSS HUD  
- Vite ship  

**Sonuç:** gamestack’i Lotophagoi’ye takarken `engine-router` Three.js satırını **`threejs-game-skills` + `vibegamedev/threejs-builder`** ile doldur.

---

## 5. game-stack — Steam Capsule Grader (detay)

### 5.1 Stack

| Parça | Teknoloji |
|---|---|
| Web | Next.js 16 App Router, React 19, Tailwind v4 |
| Auth/Data | Supabase (profiles, gradings, credits) |
| AI | Provider-agnostic adapter; OpenAI vision default |
| Rubric | `packages/rubric` — **10 kriter, ağırlıklı 0–100** |
| Deploy | Vercel |

### 5.2 On kriter (weights)

| # | ID | Ağırlık | Lotophagoi hub/kapsül için |
|---|---|---|---|
| 1 | visual-hierarchy | 12% | Storybook hub: ada adı vs arka plan |
| 2 | title-readability | 14% | “Lotophagoi” / durak adları küçük tile’da |
| 3 | focal-point | 12% | Doryseus veya lotus silueti |
| 4 | color-contrast | 12% | Ege altın saat vs Steam koyu chrome |
| 5 | genre-communication | 13% | “Odyssey collection / exploration” sinyali |
| 6 | brand-identity | 8% | Tutarlı palet (`art-bible.md`) |
| 7 | composition-balance | 9% | 3 duraklı hub crop güvenliği |
| 8 | art-style | 8% | Oyun görseliyle dürüst eşleşme |
| 9 | unique-selling-point | 7% | Unutuş / lotus toplama farkı |
| 10 | emotional-impact | 5% | Melankoli + merak (scenario tonu) |

Rubric kaynak: `game-stack/packages/rubric/src/criteria.ts` — positive/negative signals + score bands + quickCheck tooltips. **MIT rubric paketi olarak dokümana veya checklist’e kopyalanabilir**; SaaS’ın kendisi şart değil.

### 5.3 AI grading prompt disiplini

`packages/ai/src/prompt.ts`:

- Her kriter için görsel kanıt zorunlu  
- Çoğu kapsül 4–7 bandında kalmalı (9–10 nadir)  
- Küçük thumbnail + koyu Steam UI varsayımı  

Lotophagoi Pages/Steam hazırlığında aynı prompt yapısı Gemini/Higgsfield QA kapısına uyarlanabilir.

---

## 6. threejs-game-skills — gamestack’in Three.js “elleri”

Zaten `high-star-pipeline-scan.md` Tier A. Metatransformer taramasıyla **doğrudan tamamlayıcı**:

| Skill | Lotophagoi kullanımı |
|---|---|
| `threejs-game-director` | Phase playbook ↔ `game.ts` state machine |
| `threejs-qa-release` | Playwright canvas inspector, visual harness kararı |
| `threejs-gameplay-systems` | CameraRig, juice, fixed loop referans scaffold |
| `threejs-game-ui-designer` | HUD okunabilirliği (`hud.css` checklist) |
| `threejs-image-generator` | Hub storybook / texture prompt disiplini |

**Somut araç:** `inspect-threejs-canvas.mjs`

- Playwright + canvas pixel metrics (entropy, edge density, luminance contrast)  
- `window.__THREE_GAME_TEST_HOOKS__` ile named state capture  
- Render budget karşılaştırması (desktop/mobile)  

Lotophagoi adaptasyonu: `__LOTOPHAGOI_TEST_HOOKS__` veya mevcut `?profile=test` query ile hub/play/dusk fazları.

---

## 7. godogen — görsel QA döngüsü (Godot, fikir taşınır)

| Adım | godogen | Lotophagoi karşılığı |
|---|---|---|
| Plan + execute skills | `/godogen` + `/godot-task` | `.cursor/skills/` feature pass |
| Asset gen | Gemini 2D + Tripo 3D | Higgsfield/Gemini + **procedural (Tripo yok)** |
| Visual QA | `visual_qa.py` + Gemini Flash | Playwright screenshot + vision model |
| Self-repair | Screenshot diff → code fix | iteration-loop Verify adımı |

**Almayacağımız:** Tripo3D mesh hattı (proje kararı: procedural + billboard).

---

## 8. pixelforge & agentguard

### pixelforge (★1)

- YAML tanım → OpenAI gpt-image-1 → palette enforce → spritesheet  
- Review server (approve/reject/regenerate)  
- **Lotophagoi:** `ai-game-art-pipeline-skill` ve `sprite-gen` zaten daha yakın; pixel oyun değiliz.

### agentguard (★5)

- `npm install -g agentguard` → `agentguard scan ./skill/`  
- eval/exec, credential path, exfil pattern taraması  
- **Öneri:** Harici skill borçlanmadan önce (`gamestack`, `threejs-game-skills`, Chong-U pack) bir kez scan.

---

## 9. Diğer Metatransformer repoları (clone edilmedi)

| Repo | Durum | Not |
|---|---|---|
| `Metatransformer/the-mesh` | Public 404 | P2P agent mesh — alpha SaaS; Lotophagoi dışı |
| `Metatransformer/starframe` | Boş/iskelet | İzle |
| `Metatransformer/xpub` | Markdown→X Article | Pazarlama aracı |
| `Metatransformer/conflicts-render` | 3D globe viz | Oyun dışı |
| `rondorkerin/trippyomniverse` | Next.js iskelet | Kişisel site |

---

## 10. gamestack ↔ mevcut Lotophagoi arşivi

| Kaynak | Rol | Çakışma |
|---|---|---|
| **gamestack** | Tasarım checklist + iteration loop + headless felsefe | GDD otorite — skill’ler *ek* |
| **threejs-game-skills** | Three.js implementasyon + QA | Chong-U `threejs-builder` ile overlap — birleştir |
| **vibegamedev/** | threejs-builder, sprite prompt | gamestack Three.js gap doldurucu |
| **high-star-pipeline-scan/** | sprite-gen, ai-game-art-pipeline | Asset post-process |
| **game-stack rubric** | Store capsule QA | `docs/art/` launch checklist |

**Önerilen birleşik stack:**

```
gamestack (design brain, trim)
    + threejs-game-skills (engine hands, QA inspector)
    + vibegamedev/threejs-builder (Vite scaffold conventions)
    + game-stack rubric (store checklist, rubric only)
    + agentguard (pre-install scan)
```

---

## 11. Lotophagoi eylem önceliği

| Öncelik | Eylem | Effort |
|---|---|---|
| **P0** | `threejs-qa-release` → `inspect-threejs-canvas.mjs` adaptasyonu + test hooks | Küçük |
| **P0** | game-stack rubric → `docs/art/` veya launch checklist (10 kriter, TR özet) | Küçük |
| **P1** | gamestack’ten trim: `iteration-loop`, `game-feel-and-juice`, `art-direction-and-readability` → `.cursor/skills/lotophagoi-design/` | Orta |
| **P1** | `engine-router` overlay: Three.js satırını `threejs-game-skills` ile güncelle (yerel not) | Küçük |
| **P2** | game-stack hosted grader — yalnızca Steam store yaklaşınca | Dış bağımlılık |
| **P2** | pixelforge / godogen Tripo hattı | Red — proje kararı |

---

## 12. Skill kurulum komutları (referans)

```bash
# gamestack (Claude Code marketplace plugin)
# /plugin install gamestack@...  — bkz. gamestack README

# threejs-game-skills (Cursor)
npx skills add majidmanzarpour/threejs-game-skills --skill '*' -a cursor

# agentguard
npm install -g agentguard
agentguard scan art-source/reference/metatransformer/gamestack/plugins/gamestack/skills/
```

---

## 13. Sonuç

Tweet’teki “güzel fikir” büyük olasılıkla **micro-tool + agent skill marketplace + headless verify loop** üçlüsü. Git tarafında somut karşılık:

1. **gamestack** — tasarım disiplinleri ve iteration-loop (Lotophagoi GDD’leriyle uyumlu)  
2. **game-stack** — Steam capsule rubric (launch QA)  
3. **threejs-game-skills** — gamestack’in eksik Three.js engine pack’i  

Singularity/Mesh/token katmanı projeye gerek yok. En hızlı kazanç: **canvas inspector + rubric checklist** — kod tabanına minimal dokunuş, yüksek QA değeri.
