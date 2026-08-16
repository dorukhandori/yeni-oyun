# Agent prompt — referans arşivi entegrasyonu (P0)

**Tarih:** 2026-08-16  
**Amaç:** Başka bir ajan oturumuna yapıştırılacak, uygulanabilir görev tanımı.  
**Kullanım:** Aşağıdaki `## PROMPT` bölümünün tamamını kopyala → yeni oturuma yapıştır.

**Ön okuma (ajan):**

| Doküman | Ne için |
|---|---|
| `docs/research/brainstorm-pipeline-qa-ecosystem-2026-08-16.md` | **Bu oturumun tam özeti** — pipeline, test platform, kararlar |
| `docs/research/lotophagoi-problems-repo-solutions.md` | Sorun ID (S1–S19) + repo matrisi + P0 sırası |
| `docs/research/vibegamedev-reference-index.md` | Chong-U / kyh yerel arşiv |
| `docs/research/metatransformer-game-stack-scan.md` | gamestack + threejs-game-skills |
| `docs/research/high-star-pipeline-scan.md` | Pipeline tier taraması |
| `AGENTS.md` § Çoklu-ajan | `ACTIVE_WORK.md` claim protokolü |

**Yerel arşivler (gitignore — clone gerekirse §8 komutları):**

- `art-source/reference/vibegamedev/`
- `art-source/reference/pipeline-scan/`
- `art-source/reference/metatransformer/`
- `art-source/reference/problem-solutions/`

---

## PROMPT

You are implementing **P0 reference-archive integrations** for **Lotophagoi** — a Vite + TypeScript + Three.js r185 browser game (Odyssey adaptation, Ege golden-hour aesthetic, DOM HUD overlay).

**Language:** Code and commit messages in English. Talk to sahip in Turkish if asked.

**Coordination (mandatory before coding):**

1. `git pull origin master`
2. Read `docs/production/ACTIVE_WORK.md` — if someone else owns the same files, stop or split scope.
3. Add your claim row → commit + push **only** `ACTIVE_WORK.md`.
4. Work in small commits. Remove your claim when done.

**Design authority:** Gameplay numbers and mechanics come from `docs/design/` GDDs and `src/constants.ts`. Do not invent tuning. Do not change Lotus `real` vs K35 **Beş yeter** rules without explicit sahip approval.

**What this task IS:** Wire in **quality/safety nets** borrowed from cloned reference repos — canvas visual QA, assets manifest check, trimmed Three.js skill, optional agentguard note.

**What this task IS NOT:**

- Faz 1–2 mechanic debt (HARVEST_HOLD, deterministic lotus, memory bar removal, etc.) — document only, do not scope-creep.
- Phaser / Unity / R3F migration.
- Tripo / procedural mesh generator.
- Copying entire external repos into git — adapt minimal scripts/skills only.
- Touching `variants/cave-farm/`.

---

### Context — why

Research mapped 19 quality problems (S1–S19) to Git repos. Highest ROI integrations:

| Priority | Problem IDs | Action | Source |
|---|---|---|---|
| **P0-1** | S2, S3 | Canvas inspector + test hooks | `threejs-game-skills` → `inspect-threejs-canvas.mjs` |
| **P0-2** | S4 | `assets.csv` ↔ disk manifest check | kyh `asset_manifest_check.py` logic |
| **P0-3** | S1 | Human gate + optional agentguard note | gamestack `iteration-loop` §6 |
| **P1** | — | Trim `threejs-builder` skill for Lotophagoi | vibejam-starter-pack |

Full matrix: `docs/research/lotophagoi-problems-repo-solutions.md` §3–§5.

---

### Deliverable 1 — Test hooks + canvas inspector (P0-1)

**Goal:** Deterministic screenshots and objective pixel metrics for Hub contrast regression (S2) and general canvas QA (S3).

**Reference script (read, do not symlink raw clone):**

`art-source/reference/metatransformer/threejs-game-skills/skills/threejs-qa-release/scripts/inspect-threejs-canvas.mjs`

It expects `window.__THREE_GAME_TEST_HOOKS__` with `setState(name)` and optional `seed(n)`.

**Implement:**

1. Add `window.__LOTOPHAGOI_TEST_HOOKS__` (or alias the name the inspector expects — pick one, document in code comment) in `src/main.ts` or `src/game.ts` exposing at minimum:
   - `setPhase(phase: 'title' | 'hub' | 'play' | ...)` — jump UI/game phase without manual clicks
   - `setProfile(profile: 'real' | 'test' | 'k35')` if URL/profile parsing exists
   - `setMemory(percent: number)` for forgetting vignette states
   - `setSeed(n: number)` if lotus/NPC placement becomes seeded later (stub OK with TODO)

2. Copy/adapt inspector → `scripts/qa/inspect-threejs-canvas.mjs` (keep MIT attribution comment). Trim dependencies to what Lotophagoi needs (`@playwright/test`, `pngjs` as devDependencies).

3. Add npm scripts, e.g.:
   - `"qa:canvas": "node scripts/qa/inspect-threejs-canvas.mjs --url http://127.0.0.1:5173 --state hub"`
   - Document that dev server must be running.

4. **First golden targets** (produce JSON + PNG under `artifacts/canvas-inspection/` — gitignore that folder):
   - `?profile=test&phase=hub` — Hub storybook map; check contrast/entropy vs baseline thresholds
   - `?profile=real&phase=play&mem=75` — forgetting post-process visible

5. Cross-check Hub text readability against `docs/ux/screens.md` §3.5 (contrast). If metrics fail, **report** — do not redesign Hub art in this task unless sahip asks.

**Acceptance:**

- [ ] Hooks callable from browser console and from Playwright page.evaluate
- [ ] Inspector runs without error against local dev URL
- [ ] JSON report includes luminance entropy, p5/p95, dominant color ratio (whatever the script outputs)
- [ ] README snippet in script header lists example commands

---

### Deliverable 2 — Asset manifest check (P0-2)

**Goal:** CI-local script ensuring every shipped file under `public/assets/` has a row in `public/assets/assets.csv` and vice versa (S4).

**Reference:**

`art-source/reference/vibegamedev/alternatives/kyh-vibedgames/plugins/asset-pipeline/skills/asset-pipeline/scripts/asset_manifest_check.py`

**Implement:**

1. `scripts/check-assets-manifest.mjs` (Node ESM, no Python required) that:
   - Parses `public/assets/assets.csv` (skip `#` comment lines; handle `(art-source/...)` placeholder paths as **expected missing**, not errors)
   - Walks `public/assets/**` for `.png`, `.webp`, `.mp4` (and other extensions present in csv)
   - Reports: orphan files, missing files, duplicate asset_id
   - Exit code 1 on hard errors; warn-only for `status=generated` rows pointing outside `public/assets/`

2. npm script: `"check:assets": "node scripts/check-assets-manifest.mjs"`

3. Optional: mention in comment that `npm run build:pages` should run this first (do not wire CI unless trivial — note in PR).

**Acceptance:**

- [ ] Script passes on current repo state OR lists known pre-existing gaps explicitly in PR notes
- [ ] Handles ASSET-011-style `(art-source/...)` entries without false positive
- [ ] Documented usage in script header

---

### Deliverable 3 — Process guardrails (P0-3, docs-only)

**Goal:** Reduce parallel-agent filesystem corruption (S1).

**Implement (lightweight):**

1. Add `docs/production/visual-change-gate.md` (short): expensive visual batch changes (Hub art, palette-wide CSS) require sahip approval before merge; cite gamestack `iteration-loop` §6 idea.

2. In PR description, note: before importing external `.cursor/skills/` from internet, run `agentguard scan` (see `art-source/reference/problem-solutions/agentguard/`). **Do not** npm install agentguard globally in this task unless sahip approves.

**Acceptance:**

- [ ] One-page gate doc exists and links to ACTIVE_WORK protocol

---

### Deliverable 4 — Trimmed Three.js skill (P1, optional if time)

**Goal:** Give future agents Lotophagoi-specific Three.js conventions without 485 lines of Phaser/Capacitor noise.

**Implement:**

1. Create `.cursor/skills/threejs-lotophagoi/SKILL.md` sourced from vibejam `threejs-builder`, keeping only:
   - Scene graph / Group hierarchy
   - Fixed timestep (`STEP = 1000/60` in `src/game.ts`)
   - Merged geometry policy
   - EffectComposer + bloom/haze guardrails (`src/render/`)
   - Billboard + texture loading patterns used in `src/world/`
   - Explicit **skip** list: Phaser, Capacitor, pixel snap, Tripo mesh gen

2. Max ~120 lines. Link to `src/constants.ts` as single tuning surface.

**Acceptance:**

- [ ] Skill file exists and is self-contained
- [ ] No duplicate of entire upstream skill

---

### Verification checklist (before calling done)

```bash
git pull origin master
npm install
npm run build          # must pass
npm run check:assets   # after Deliverable 2
# terminal 1: npm run dev
# terminal 2: npm run qa:canvas -- --state hub
```

Manual: load Hub, confirm no gameplay regression.

---

### PR requirements

- Branch: `cursor/<short-name>-afce`
- Title example: `feat(qa): canvas inspector, assets manifest check, test hooks`
- Body must list: which S-IDs addressed, any known manifest gaps left intentional, artifacts path
- Do **not** commit `artifacts/` or `art-source/reference/` clones

---

### Stop conditions

Stop and ask sahip if:

- Test hooks require refactoring >50 lines of game state machine
- Manifest check reveals >10 unexpected orphans needing asset registry decisions
- Playwright install blocked in environment
- Conflict with another ACTIVE_WORK claim on `src/game.ts`, `src/main.ts`, `src/ui/hud.css`

---

End of prompt.

---

## Kabul özeti (sahip için)

| Teslim | Dosyalar (beklenen) | Sorun ID |
|---|---|---|
| Test hooks | `src/main.ts` veya `src/game.ts` | S3 |
| Canvas QA | `scripts/qa/inspect-threejs-canvas.mjs`, `package.json` devDeps | S2, S3 |
| Manifest | `scripts/check-assets-manifest.mjs` | S4 |
| Süreç | `docs/production/visual-change-gate.md` | S1 |
| Skill (opsiyonel) | `.cursor/skills/threejs-lotophagoi/SKILL.md` | — |

**Sonraki faz (bu prompt kapsam dışı):** LayrKits + ai-game-art-pipeline birleşimi (S13–S15), GDD acceptance checklist (S6, S19), Faz 1–2 mekanik borcu (S5–S12).

---

*İlgili araştırma PR'ı:* `docs/research/lotophagoi-problems-repo-solutions.md` · *Arşiv indeks:* `docs/research/vibegamedev-reference-index.md`
