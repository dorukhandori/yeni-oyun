# Brainstorm session — pipelines, test platform, repo archive (2026-08-16)

> **Audience:** Next AI agent (Claude Code, Cursor, Grok) continuing this work.  
> **Sahip language:** Turkish in chat; this doc is English per repo convention.  
> **Session type:** Research + strategy brainstorm — **not** gameplay implementation.  
> **Outcome:** Local reference clones (gitignored) + 5 research docs + 1 implementation prompt. Code integration **pending**.

---

## 0. How to use this document

1. Read **§1 Project anchor** — non-negotiable constraints.  
2. Read **§2 Questions sahip asked** — intent behind the research.  
3. Read **§3 Answers we reached** — decisions and honest limits.  
4. Follow **§8 Recommended stack** and **§9 Next actions** for implementation.  
5. Deep detail lives in linked child docs — do not duplicate tuning numbers here.

| Child doc | Contents |
|---|---|
| `docs/research/vibegamedev-reference-index.md` | Chong-U free + kyh alternatives (~490 MB local) |
| `docs/research/high-star-pipeline-scan.md` | Tier A–D GitHub pipeline scan |
| `docs/research/metatransformer-game-stack-scan.md` | gamestack, game-stack rubric, threejs-game-skills |
| `docs/research/lotophagoi-problems-repo-solutions.md` | S1–S19 problem → repo matrix |
| `docs/research/turkish-game-dev-ecosystem.md` | TR studios, communities, platforms |
| `docs/production/agent-prompt-archive-integration.md` | Copy-paste prompt for P0 code integration |

**Local clones (gitignore):** `art-source/reference/{vibegamedev,pipeline-scan,metatransformer,problem-solutions}/`

---

## 1. Project anchor (do not forget)

**Game:** Lotophagoi — browser Odyssey adaptation. Stack: **Vite + TypeScript + Three.js r185**. DOM HUD overlay, not WebGL UI.

**Flow:** Title → Hub (island pick) → play. Lotus card = classic `real` run (12 lotuses, dusk loss, forget = gameover). **Beş yeter** = K35 side quest only (`docs/design/gdd-lotus-island-run.md`).

**Visual identity:** Ege golden-hour palette; forgetting = desaturation + vignette + shorter haze — **screen does not black out**. Authority: `docs/art/art-bible.md`, `docs/design/*`.

**Asset model:**

- Shipping manifest: `public/assets/assets.csv`  
- In-game files: `public/assets/`  
- Raw/work: `art-source/` (not in git)  
- Media today: **Gemini + Veo** (Higgsfield MCP **not connected** yet)

**Hard project decisions (red lines for any repo borrow):**

| Decision | Implication |
|---|---|
| Procedural geometry + AI textures/billboards | **No Tripo → full GLB character pipeline** |
| No Phaser/Unity/Unreal | Ignore Phaser starters even if in Chong-U pack |
| No R3F | `react-three-dom`, `gltfjsx` not applicable |
| Multi-agent repo | Must use `ACTIVE_WORK.md` claim protocol before edits |

**Known pain (15 Aug 2026):** Parallel unclaimed agent writes corrupted local FS (0-byte files). Process matters as much as tools.

---

## 2. Questions sahip asked (chronological)

| # | Question (paraphrase) | What we did |
|---|---|---|
| Q1 | Evaluate Tripo / Chong-U / VibeGameDev pipeline — free archive | Cloned Chong-U free repos + kyh alternatives → `vibegamedev-reference-index.md` |
| Q2 | Scan high-star GitHub game pipelines | Tier A–D scan → `high-star-pipeline-scan.md` |
| Q3 | @metatransformr tweet → gamestack worth it? | Cloned gamestack, game-stack, threejs-game-skills, godogen → `metatransformer-game-stack-scan.md` |
| Q4 | Will these repos **clearly raise** our quality? | Honest answer: **partially** — QA/asset/manifest yes; GDD/mechanic debt no |
| Q5 | Map our problems to repo solutions | S1–S19 taxonomy → `lotophagoi-problems-repo-solutions.md` |
| Q6 | Turkish game dev ecosystem scan | Studios, Discord, ATOM, GameDev.ist → `turkish-game-dev-ecosystem.md` |
| Q7 | Professional agent prompt for integration | `agent-prompt-archive-integration.md` (chat-only first, then filed) |
| Q8 | Consolidate this brainstorm for next AI | **This file** |

---

## 3. Core conclusions (executive)

### 3.1 Will external repos fix Lotophagoi?

**No single repo is a quality leap.** Value comes from **selective integration**:

| Area | Repo-only archive | Archive + 1–3 integrations |
|---|---|---|
| Visual/canvas QA, manifest, asset scripts | ~+5% | **~+65%** (S2–S4, S13–S15) |
| Design/tuning alignment (Faz 1–2) | ~0% | ~+5% (checklists only) |
| Core mechanics (harvest hold, lotus layout, memory bar) | ~+5% reference | ~+10% — **still mostly code + sahip** |
| Multi-agent safety | ~+10% | ~+40% with agentguard + human visual gate |

**Bottom line:** Repos are **reference library + QA safety nets**, not a substitute for Faz 1–2 gameplay work.

### 3.1 Chong-U paid pack

- No reliable public leak of full $399 bundle.  
- Free tier + **kyh/vibedgames** ≈ **70–80%** of paid automation (legal).  
- Best free piece for us: **`vibejam-starter-pack` → `threejs-builder`** skill.

### 3.3 Metatransformer / gamestack tweet

Tweet maps to three concrete OSS layers:

1. **gamestack** — design brain (iteration loop, feel/pacing checklists). Engine-agnostic. **Three.js slot empty** on their roadmap.  
2. **threejs-game-skills** — fills that gap (director, QA, canvas inspector).  
3. **game-stack** — Steam capsule **10-criterion rubric** (MIT package); SaaS optional.

Skip: Singularity, Mesh, token economy — not relevant to browser prototype.

### 3.4 Turkish ecosystem

Large mobile industry; **small** direct Three.js narrative overlap. High value for **playtest, visibility, GGJ/ATOM, ÜNOG** — not for engine-specific code. See `turkish-game-dev-ecosystem.md`.

---

## 4. Pipeline landscape (what we compared)

### 4.1 Three production layers (existing project model)

From `docs/research/ai-pipeline-games.md` / ZEUS playbook:

| Layer | Tool | Role |
|---|---|---|
| Design | Opus/Fable + GDDs | Mechanics, UX, scenario |
| Build | Claude Code / Cursor agents | `src/`, Three.js, HUD |
| Media | Higgsfield MCP (planned) / Gemini+Veo (today) | Textures, sheets, trailer |

Human gates: **intake (~20 min)** and **QA handoff (~25 min)**. Middle is agent-heavy.

### 4.2 Asset pipelines discussed

| Pipeline family | Examples cloned | Lotophagoi fit |
|---|---|---|
| **Prompt-only sheets** | Chong-U `ai-game-spritesheets` | Doryseus prompt discipline |
| **Prompt + Python automation** | kyh `animated-spritesheets`, LayrKits | Video walk → horizontal strip → validation |
| **Manifest-first sprite** | `aldegad/sprite-gen` | `frame_layout` JSON ↔ `sailor.ts` foot anchor |
| **Provider-neutral QA scripts** | `ybuild-ai/ai-game-art-pipeline-skill` | chroma, contact sheet, frame extract |
| **Local browser QA** | `framekit-web` | Offline frame pick after i2v — no upload |
| **PBR texture gen** | `fal-texture-pbr-generator` | Tileable sand/rock experiments |
| **Style guide before gen** | `tnbao91/ai_asset` | Hub UI batch consistency |
| **Tripo / GLB** | threejs-game-skills 3D generator, godogen | **Rejected** — conflicts procedural decision |

**Current local scripts (already in repo):**

- `scripts/sheet-from-video.mjs`, `sheet-from-still.mjs`, `gen-assets.mjs`  
- Gap: not one chained command; Veo clips missing for some tayfa rows; §8 acceptance still manual.

**Proposed unified asset chain (from problem doc):**

```text
Gemini/Veo clip
  → scripts/sheet-from-video.mjs (local)
  → LayrKits chroma + validation JSON
  → sprite-gen manifest.json
  → src/world/sailor.ts loader
  → inspect_sprite_run.py (sprite-gen QA)
```

### 4.3 Agent skill pipelines discussed

| Source | Skills count / focus | Action |
|---|---|---|
| Chong-U `threejs-builder` | ~485 lines monolith | Trim → `.cursor/skills/threejs-lotophagoi/` |
| `awesome-gamedev-agent-skills` | Modular threejs-* | Pick scene + postprocessing + gltf only |
| `threejs-game-skills` | Director + QA + image gen | **Borrow QA inspector + director checklists** |
| gamestack | 26 design skills | Trim iteration-loop, feel, art-direction |
| agentguard | Security scan | Run before importing external skills |

---

## 5. Test platform brainstorm (main technical thread)

Sahip and agents discussed **what automated testing / QA platform** Lotophagoi needs. Current state: **no automated tests**; Hub storybook contrast regressed once (busy map → unreadable labels).

### 5.1 Problem → test need mapping

| ID | Problem | Test need |
|---|---|---|
| S2 | Hub visual regression (contrast) | Canvas screenshot + **objective metrics** |
| S3 | No test suite | Playwright + deterministic game states |
| S4 | assets.csv ↔ disk drift | Manifest script in CI |
| S6, S19 | GDD acceptance not run | Markdown checklist → later automation |
| S17–S18 | No playtest telemetry | Bot playtest template + human session plan |

### 5.2 Candidates evaluated

| Tool / repo | What it does | Verdict |
|---|---|---|
| **`inspect-threejs-canvas.mjs`** (threejs-game-skills) | Playwright capture + luminance entropy, contrast, render budgets; `__THREE_GAME_TEST_HOOKS__` | **P0 adopt** — best stack match |
| **`threejs-visual-qa`** (yomero243) | R3F-oriented golden snapshots; `?testing=true` pattern | **Borrow pattern only** — we are not R3F |
| **`playwright-canvas`** (satelllte) | Playwright Clock + canvas snapshot | P2 POC for animation timing |
| **Chong-U `playwright-testing` skill** | How to write canvas/HUD smoke tests | Playbook, not runtime |
| **game-stack rubric** | 10 weighted capsule criteria (color-contrast, title-readability…) | **Checklist for Hub + future Steam** — not runtime test |
| **godogen `visual_qa.py`** | Screenshot → Gemini vision → fix loop | Idea for later; Godot-specific today |
| **Official three.js Puppeteer examples** | Reference only | Not integrated |
| **`game-quality-gates`** (abczsl520) | Timer lifecycle, scene cleanup wiki | Read for S9–S11 class bugs; not a test runner |
| **BMad `gds-test-design`** | Human playtest plan templates | Optional clone for Faz 6 |

### 5.3 Chosen test architecture (consensus, not yet coded)

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — Deterministic state (game code)                  │
│  window.__LOTOPHAGOI_TEST_HOOKS__                           │
│  setPhase / setProfile / setMemory / setSeed                │
│  URL: ?profile=test&phase=hub&seed=1                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 2 — Canvas inspector (adapted OSS script)             │
│  scripts/qa/inspect-threejs-canvas.mjs                      │
│  npm run qa:canvas -- --state hub                           │
│  Output: artifacts/canvas-inspection/*.png + metrics.json   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 3 — Manifest gate (Node script)                      │
│  scripts/check-assets-manifest.mjs                          │
│  npm run check:assets (before build:pages)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 4 — Design rubric (manual / vision LLM optional)     │
│  game-stack 10 criteria → docs/art/ launch checklist        │
│  screens.md §3.5 contrast rules for Hub                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 5 — Process gate (multi-agent)                       │
│  ACTIVE_WORK.md + visual-change-gate.md + agentguard scan   │
└─────────────────────────────────────────────────────────────┘
```

**Golden scenarios (first targets):**

| URL / state | Validates |
|---|---|
| `?profile=test&phase=hub` | Hub map readability, storybook contrast |
| `?profile=real&phase=play&mem=75` | Forgetting post-process (vignette/haze) |
| `?profile=real&phase=play` (later) | Gameplay smoke |

**Dependencies to add (when implementing):** `@playwright/test`, `pngjs` as devDependencies. Dev server on `:5173` must be running.

### 5.4 What we explicitly rejected as “the test platform”

- Full **game-stack SaaS** (Next.js + Supabase) — overkill before store  
- **R3F test harness** migration  
- **Tripo visual QA mesh pipeline**  
- Replacing sahip playtest with bots only — bots supplement, not replace Faz 6 human sessions

---

## 6. Problem inventory (S1–S19) — quick reference

Full matrix: `lotophagoi-problems-repo-solutions.md`.

| Tier | IDs | Nature | Repo helps? |
|---|---|---|---|
| P0 process/QA | S1–S4 | Agent collision, Hub contrast, no tests, manifest | **Yes** (with integration) |
| P1 design authority | S5–S8 | tuning.md, GDD drift, memory bar on screen | Mostly **no** — sahip + designer |
| P2 mechanics | S9–S12 | Harvest hold, deterministic lotus, audio bug, layout | **No** — Faz 2 code |
| P3 asset pipe | S13–S16 | Tayfa sheets, video chain, §8 gate, anim uncertainty | **Yes** (scripts) |
| P4 playtest | S17–S19 | Metrics, blind playtest, GDD checklist | Partial templates |

---

## 7. Unified “borrow stack” (recommended)

```
gamestack (design brain, trimmed)
  + threejs-game-skills (engine hands + canvas inspector)
  + vibegamedev/threejs-builder (Vite/Three conventions)
  + kyh asset_manifest_check logic (CSV adapt)
  + LayrKits + ybuild-ai scripts (asset post-process)
  + game-stack rubric (store/hub visual checklist, rubric only)
  + agentguard (pre-install external skills)
  + ACTIVE_WORK.md (always)
```

**Do not merge into git:** entire cloned repos — only adapted scripts/skills/checklists.

---

## 8. Implementation priority (ordered)

| Priority | Work item | Source | Problem IDs | Status |
|---|---|---|---|---|
| **P0** | Test hooks + canvas inspector | threejs-game-skills | S2, S3 | **Prompt written, code pending** |
| **P0** | `check-assets-manifest.mjs` | kyh | S4 | **Prompt written, code pending** |
| **P0** | `visual-change-gate.md` | gamestack §6 | S1 | **Prompt written, code pending** |
| **P1** | Trim `threejs-lotophagoi` skill | threejs-builder | — | Optional in prompt |
| **P1** | game-stack rubric → launch checklist TR summary | game-stack | S2, store prep | Doc only |
| **P1** | LayrKits + ybuild-ai → `scripts/pipeline/` | pipeline-scan | S13–S15 | Not started |
| **P1** | GDD acceptance markdown folder | threejs-qa-release | S6, S19 | Not started |
| **P2** | playwright-canvas Clock POC | satelllte | S3 animation | Not started |
| **—** | Faz 1 tuning lock | — | S5 | **Repo cannot unblock** |
| **—** | Faz 2 mechanics | — | S9–S12 | **Repo cannot unblock** |

**Implementation entry point:** paste `docs/production/agent-prompt-archive-integration.md` § PROMPT into a fresh agent session.

---

## 9. Red list (discussed and rejected)

| Item | Reason |
|---|---|
| Tripo / full GLB pipeline | Procedural + billboard project decision |
| Chong-U Phaser starters | Wrong engine |
| AI Forge MCP (Blender/UE) | Subscription, wrong stack |
| game-stack hosted product | Store not imminent |
| react-three-dom / R3F migration | Architecture mismatch |
| Gaia/Dryad WebGPU shaders | TD assessment: risk vs gain |
| Mesh / Singularity / token agents | Product identity / scope |
| Spriterrific cloud API default | Cost + pixel-first |
| Copying 490 MB archives into git | Already gitignored under `art-source/reference/` |

---

## 10. Open questions for sahip

| # | Question | Blocks |
|---|---|---|
| O1 | Hub storybook asset (ASSET-052) — commit pending approval? | Visual baseline for golden screenshot |
| O2 | Install Playwright in dev workflow OK? | P0 canvas QA |
| O3 | Run `agentguard` globally or CI-only note? | S1 skill imports |
| O4 | Priority: P0 QA code vs Faz 1 tuning session? | Roadmap |
| O5 | Higgsfield MCP when connected — replace or parallel Gemini? | Media pipeline doc update |
| O6 | Steam capsule prep timeline — when to formalize rubric doc? | game-stack checklist depth |

---

## 11. Session artifacts (git)

**Branch:** `cursor/vibegamedev-reference-archive-afce`  
**PR:** #7 (research + prompt; no P0 code yet)

| Path | Type |
|---|---|
| `docs/research/vibegamedev-reference-index.md` | Research |
| `docs/research/high-star-pipeline-scan.md` | Research |
| `docs/research/metatransformer-game-stack-scan.md` | Research |
| `docs/research/lotophagoi-problems-repo-solutions.md` | Research |
| `docs/research/turkish-game-dev-ecosystem.md` | Research |
| `docs/production/agent-prompt-archive-integration.md` | Action prompt |
| `docs/research/brainstorm-pipeline-qa-ecosystem-2026-08-16.md` | **This summary** |

**Not in git:** `art-source/reference/**` clones (~500+ MB total).

---

## 12. Instructions for the next AI

1. **If implementing:** Start from `agent-prompt-archive-integration.md` — do not re-research unless repos are missing locally.  
2. **If designing:** Use gamestack skills as **checklists**, not overrides — GDD wins over skill text.  
3. **If adding assets:** Update `assets.csv` + run future `check:assets`; follow `docs/art/pipeline.md` §8.  
4. **If touching Hub visuals:** Read `visual-change-gate.md` (once created) + `screens.md` §3.5 contrast.  
5. **If sahip asks “will repo X help?”:** Check §3.1 ROI table and S-ID matrix — avoid hype.  
6. **Coordination:** Always `git pull` → read `ACTIVE_WORK.md` → claim → work → unclaim.

---

## 13. One-paragraph handoff

We brainstormed whether external GitHub pipelines (Chong-U/VibeGameDev, high-star sprite/Three.js repos, Metatransformer gamestack) could raise Lotophagoi quality. Conclusion: **they help most as QA/manifest/asset post-process layers**, not as gameplay or GDD replacements. We cloned references locally, mapped 19 project problems to repos, and designed a **five-layer test/QA platform** centered on Playwright canvas metrics + manifest checks + human visual gates. Implementation is specified in `agent-prompt-archive-integration.md` but **not yet coded**. Faz 1–2 mechanic debt remains the main quality blocker; repos reduce regression risk while that work continues.

---

*Cross-links:* `AGENTS.md` · `docs/production/roadmap.md` · `docs/art/pipeline.md` · `docs/research/ai-pipeline-games.md`
