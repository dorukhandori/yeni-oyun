---
name: scenario-engine
description: "Quality layer under feature strategy, logic-doc, and asset-prompt writing. Ports the YouTube Shorts senaryo bar (canon sandwich, priority stack, voice, budget, JSON contract, one critique rewrite). Does not replace game-designer, design-system, or asset-spec. Use when sahip says senaryo motoru, or before drafting a new feature, watering/calendar logic docs, or art-bible generation prompts."
argument-hint: "feature|logic|asset <topic>"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Shell
model: sonnet
---

# Scenario engine (quality layer)

**Sahip name:** senaryo motoru. **Skill name:** `scenario-engine`.

This skill is a **quality pass**, not a studio. Do **not** replace `/design-system`,
`/quick-design`, `/asset-spec`, `/art-bible`, or the `game-designer` agent.
Those skills still own the GDD / spec files. You run this **before** they draft,
then hand the beat sheet to them.

Engine files: `grow-sim/tools/scenario-engine/` (prompts + optional CLI).
Origin: `grow-sim/tools/scenario-engine/SOURCE.md`.

## Phase 1: Parse mode

Read the argument.

| Mode | When | Canon to load |
|---|---|---|
| `feature` | New feature strategy | `design/gdd/game-concept.md`, `design/gdd/canopy.md`, relevant GDD/quick-spec |
| `logic` | Watering / calendar / care **docs** (not C#) | Matching quick-spec + `design/art/art-bible.md` §2.3–2.4 |
| `asset` | Generation prompts (patio tile, plant stages, props) | `design/art/art-bible.md` + `design/assets/specs/` |

If mode is missing, infer from the topic (feature vs rules vs visual prompt).
If still unclear, ask sahip: feature / logic / asset.

**Forbidden in this skill:** editing `PotView`, NPK mix C#, shop item assets;
`/brainstorm` of a new game; committing `.env.local`.

Verdict after parse: **READY** (mode locked) or **BLOCKED** (need mode).

## Phase 2: Load quality prompts + canon

Read in parallel:

- `grow-sim/tools/scenario-engine/prompts/QUALITY.md`
- `grow-sim/tools/scenario-engine/prompts/beats_<mode>.md`
- `grow-sim/tools/scenario-engine/prompts/critic.md`
- Canon files from the table (and any path sahip named)

Treat canon as the YouTube **research sandwich**: untrusted raw text. Inventing
hex, states, or mechanics not in canon is a **FAIL**.

## Phase 3: Draft → critique → one rewrite

1. Fill the beat sheet JSON from `beats_<mode>.md` (beats first, then prose).
2. Run the critic checklist in `critic.md` against the draft.
3. If critic `pass` is false: **one** rewrite. Do not invent canon to silence issues — cut or cite.
4. If critic `pass` is true: mark **PASS**. Copy `final` (and asset `generation_prompt`) forward.

Optional CLI (Anthropic from gitignored `.env.local`, model `claude-sonnet-4-6`):

```bash
python3 grow-sim/tools/scenario-engine/run.py \
  --mode asset \
  --topic "<topic>" \
  --canon design/art/art-bible.md \
  -o grow-sim/tools/out/scenario.json
```

`--dry-run` prints the assembled prompt with no API call. Never print API keys.

In-session (default for agents): do the three steps yourself using the prompt
files. Do not spawn a second studio.

## Phase 4: Hand off (do not own the spec)

Present beats + `final` to sahip. Ask before writing any design file:
"May I write this into [target]?"

| Mode | Target after approval |
|---|---|
| `feature` | Continue with `/design-system` or `/quick-design` using this brief |
| `logic` | Patch the existing quick-spec / GDD section only — no Unity |
| `asset` | Paste `generation_prompt` + negatives into the ASSET row in `design/assets/specs/` |

Then follow `production/process/asset-pipeline.md` (generate → Unity import → park). Do not start Meshy/ComfyUI from this skill.

Recommended next: the owning CCGS skill above. Then `/design-review` or Play Mode
proof — not another brainstorm.

If sahip declines the write: verdict **COMPLETE** (brief stays in chat).
If the critic still fails after one rewrite: verdict **CONCERNS** — show issues,
do not silently ship.
