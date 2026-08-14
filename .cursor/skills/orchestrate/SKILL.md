---
name: orchestrate
description: "Studio orchestrator skill. Decomposes an owner goal into tasks, auto-assigns agents via agent-routing.yaml, runs them in dependency waves, and tracks status on production/orchestrator/task-board.yaml. Use instead of manually picking agents."
argument-hint: "[goal description] | status | continue [--auto|--confirm|--plan-only] [--target src|cave-farm]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Task, AskUserQuestion, TodoWrite
model: sonnet
context: |
  !echo "=== Orchestrator State ===" && (cat production/orchestrator/task-board.yaml 2>/dev/null | head -40 || echo "no task board") && echo "---" && (head -20 production/session-state/active.md 2>/dev/null || echo "no session state")
---

# Orchestrate — Auto Agent Assignment

This skill is the **single entry point** for multi-agent work. It replaces
"which of 49 agents do I call?" with: state the goal → orchestrator plans →
agents run.

**Invoke as:** `orchestrate [goal]` · `orchestrate status` · `orchestrate continue`

**Agent twin:** `orchestrator` (same behavior, conversational entry)

---

## Phase 0: Parse Command

| Argument pattern | Action |
|------------------|--------|
| `status` | Phase 8 only — print task board |
| `continue` | Phase 7 — resume in-progress run |
| `[goal text]` | Full pipeline Phases 1–7 |

**Flags** (default: `--auto`):
- `--auto` — plan, assign, execute without per-task gates
- `--confirm` — show task board; owner approves before wave 1
- `--plan-only` — write task board; do not spawn agents
- `--target src` (default) or `--target cave-farm` — code root for implement tasks

If no goal and not `status`/`continue`:
> Usage: `orchestrate [goal]` — e.g. `orchestrate lotus toplama hissini güçlendir`

---

## Phase 1: Load Context

Read simultaneously:

1. `.cursor/docs/agent-routing.yaml` — routing table + slice templates
2. `AGENTS.md` — active game + stack
3. `.cursor/rules/project.mdc` — slice constraints (Glowsprig / session = one playable slice)
4. `production/orchestrator/task-board.yaml` — if exists, note active run
5. `production/orchestrator/config.yaml` — if exists (engine override); else use routing defaults
6. Glob `.cursor/agents/*.md` — validate assigned agents exist

Infer project stage:
- No `design/` + `src/` has files → **prototype stage** → prefer `prototyper`, `quick-design`
- `production/stories/` exists → **production stage** → prefer `dev-story` routing for implement tasks

---

## Phase 2: Match Pipeline vs Custom Plan

### 2a. Team pipeline shortcut

If the goal clearly matches a `team_pipelines.triggers` entry in agent-routing.yaml:

1. Announce: "Delegating to team skill: `[skill]`"
2. Invoke that skill's workflow inline (spawn its agents in its documented order)
3. Write a minimal task board noting `delegated_skill: team-*`
4. Skip to Phase 7 report

Examples: "HUD'u baştan tasarla" → `team-ui` · "Sprint QA" → `team-qa`

### 2b. Slice template

If goal matches a `slice_templates` key (or close paraphrase):

1. Expand template tasks into task board entries
2. Assign sequential ids `T1`, `T2`, …
3. Continue to Phase 3

### 2c. Custom decomposition

Break goal into **2–8 tasks**. Each task MUST have:

```yaml
- id: T1
  title: "Human-readable task"
  agent: agent-name        # from .cursor/agents/
  skill: optional-skill    # if a skill drives the work
  status: pending
  depends_on: []           # list of task ids
  wave: 1                  # computed in Phase 3
  target: src              # or variants/cave-farm
  acceptance: "How we know it's done"
```

**Decomposition heuristics for this repo:**

| Goal shape | Typical task chain |
|------------|-------------------|
| Feel / juice tweak | game-designer (quick-design) → gameplay-programmer → qa-tester (smoke) |
| New HUD element | ux-designer → ui-programmer → qa-tester |
| New mechanic | game-designer → prototyper OR gameplay-programmer → qa-tester |
| Art asset | art-director (asset-spec) → optional gameplay-programmer if in-scene |
| "Just build it" | prototyper alone |
| Bug fix | gameplay-programmer or ui-programmer → qa-tester |

Do NOT add design tasks for trivial one-file fixes.

---

## Phase 3: Auto-Assign Agents

For each task without a pre-assigned agent:

1. Score against `task_routes` in agent-routing.yaml (keyword + domain match)
2. Pick highest-confidence route; tie-break with `wave_hint` (design before code)
3. If no match: default implement → `gameplay-programmer`, design → `game-designer`

**Hard blocks:**
- Never assign `unity-*`, `unreal-*`, `godot-*` unless `config.yaml` sets `engine:` to that engine
- Never assign two tasks to the same agent **in the same wave** (serialize if needed)

Compute **waves** via topological sort on `depends_on`. Tasks with no deps → wave 1.

---

## Phase 4: Write Task Board

Ensure directories exist: `production/orchestrator/`, `production/session-state/`

Write `production/orchestrator/task-board.yaml`:

```yaml
run_id: "YYYY-MM-DD-slug-from-goal"
goal: "[owner goal verbatim]"
mode: auto          # auto | confirm | plan-only
target: src
engine: three.js
status: planned     # planned | in_progress | complete | partial | blocked
created: YYYY-MM-DD
updated: YYYY-MM-DD
waves:
  1: [T1, T2]
  2: [T3]
tasks:
  - id: T1
    title: ...
    agent: ...
    skill: ...
    status: pending
    depends_on: []
    wave: 1
    target: src
    acceptance: ...
    result: null
    error: null
```

Update `production/session-state/active.md`:

```markdown
# Active Session

## Orchestrator Run
- **Run ID:** [run_id]
- **Goal:** [goal]
- **Status:** in_progress
- **Current wave:** 1

## Tasks
- [ ] T1 — [title] → [agent]
```

If `--plan-only`: stop here with the task table printed. Do not spawn agents.

If `--confirm`: use `AskUserQuestion`:
- Prompt: "Task board ready. Start wave 1?"
- Options: `[A] Run all waves (Recommended)` · `[B] Plan only — don't spawn yet` · `[C] Edit goal — I'll re-run`

On `[B]` or abort: set status `planned`, stop.

---

## Phase 5: Execute Waves

Set board `status: in_progress`. For each wave in order:

### 5a. Pre-wave gate
- Skip tasks whose dependencies are not `done`
- Skip tasks already `done` or `skipped`

### 5b. Spawn subagents (parallel within wave)

For each ready task, spawn via **Task** tool:

```
subagent_type: [task.agent]
description: "T[id]: [short title]"
prompt: |
  ## Orchestrator Task [id]
  **Run:** [run_id]
  **Goal:** [overall goal]
  **Your task:** [title]
  **Target code root:** [target path — src/ or variants/cave-farm/]
  **Acceptance:** [acceptance criteria]

  ## Read first
  - [list specific file paths — NOT full doc contents]

  ## Rules
  - Stay in scope; flag blockers back to orchestrator
  - Match Three.js/Vite conventions in .cursor/rules/yeni-oyun-canvas.mdc
  - Do not commit unless owner asked

  ## Skill
  If skill `[skill]` applies, follow `.cursor/skills/[skill]/SKILL.md`
run_in_background: true   # when multiple tasks in same wave
```

**Concurrency cap:** max 4 parallel Task spawns.

Mark each spawned task `status: in_progress` on the board before spawning.

### 5c. Collect results

When subagents return:
- `done` + summary → write to `task.result`, set `status: done`
- blocker → `status: blocked`, `error: [reason]`
- In `--auto` mode: continue other waves; blocked tasks don't block unrelated branches

After each wave, update `task-board.yaml` `updated` field and session state checkboxes.

---

## Phase 6: Post-Wave QA (optional, auto-insert)

If the plan includes implementation tasks but no explicit QA task, **auto-append**:

```yaml
- id: T-qa
  title: Smoke check changed paths
  agent: qa-tester
  skill: smoke-check
  depends_on: [last implement task id]
  wave: [last + 1]
```

Only when `--auto` and at least one `gameplay-programmer` or `ui-programmer` task ran.

---

## Phase 7: Finalize

Set board status:
- `complete` — all tasks done
- `partial` — some done, some blocked/skipped
- `blocked` — no progress possible

Print report (see orchestrator agent Output Format).

If `--confirm` was used, ask: "Run `orchestrate continue` for blocked tasks?"

---

## Phase 8: Status / Continue

### `orchestrate status`
Read `task-board.yaml`, print table + next actionable wave. No spawns.

### `orchestrate continue`
1. Load board where `status` ∈ {`planned`, `in_progress`, `partial`, `blocked`}
2. Recompute ready tasks from first incomplete wave
3. Resume Phase 5 for remaining work

---

## Error Handling

| Error | Response |
|-------|----------|
| Unknown agent in route | Fall back to `gameplay-programmer`, log warning in board |
| Subagent timeout/fail | Mark blocked, retry once on `continue` |
| Goal too vague | Ask ONE clarifying question, then plan |
| Goal too large (>8 tasks) | Split: plan first slice only, note remainder in board `backlog:` field |

---

## File Write Protocol

This skill may write ONLY:
- `production/orchestrator/task-board.yaml`
- `production/orchestrator/config.yaml`
- `production/session-state/active.md`

All gameplay/design/QA artifacts are written by delegated subagents.

---

## Examples (owner-facing)

```
orchestrate lotus toplama animasyonuna squash-stretch ekle
orchestrate cave-farm varyantında su shader parlaması --target cave-farm
orchestrate HUD kalp sayısını dinamik yap --confirm
orchestrate status
orchestrate continue
```
