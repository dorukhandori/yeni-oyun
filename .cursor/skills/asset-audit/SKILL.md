---
name: asset-audit
description: "Audits game assets for compliance with naming conventions, file size budgets, format standards, and pipeline requirements. Identifies orphaned assets, missing references, and standard violations."
argument-hint: "[category|all]"
user-invocable: true
allowed-tools: Read, Glob, Grep
model: sonnet
# Read-only diagnostic skill — no specialist agent delegation needed
---

## Phase 1: Read Standards

Read, in order:

1. `production/process/asset-pipeline.md` — Canopy production PM
2. `design/art/art-bible.md` §8 — poly / texture ceilings
3. `docs/ccgs/CANOPY-PROJECT-MANIFEST.md` §2 and §4 — folders and `Mesh_` / `Tex_` / `Mat_` / `UI_` / `Sfx_`
4. `design/assets/asset-manifest.md` — expected ASSET-ids
5. `design/assets/templates/unity-import.md` — import rules

Do not use a generic lowercase `category_name_variant_size` pattern for Canopy files. That is the CCGS default, not this game.

---

## Phase 2: Scan Asset Directories

This repo is Unity at `grow-sim/Canopy`. **Do not** scan `assets/art/` — that path is not Canopy.

Glob:

- `grow-sim/Canopy/Assets/_Game/Art/**/*` — meshes, textures, materials
- `grow-sim/Canopy/Assets/_Game/Audio/**/*` — SFX when present
- `design/assets/specs/*.md` — specs vs files
- `design/art/refs/**/*` — approved concept stills (not Unity)

Skip `Library/`, `grow-sim/tools/out/` (scratch), and `.meta` when counting “art files” — still pair each PNG/FBX with its `.meta`.

---

## Phase 3: Run Compliance Checks

**Naming conventions (Canopy):**

- Textures: `Tex_[Name]_[Map].png` e.g. `Tex_PatioTile_Albedo.png`
- Meshes: `Mesh_[Name].fbx`
- Materials: `Mat_[Name].mat`
- UI: `UI_[Name].png`
- Audio: `Sfx_[Name].wav` / `.ogg`
- English Pascal chunks after the prefix. No second palette in the filename.

**File standards:**

- Textures: power-of-two; PNG; max 512 props / 1024 grower or UI (bible §8). No 4K.
- Meshes: tris ≤ category ceiling in bible §8.
- Audio: short one-shots; OGG/WAV.

**Orphaned assets:** Search `_Game/Scripts` and scenes/prefabs **by name** (do not YAML-rewrite). Flag Generated textures with no material reference.

**Missing assets:** Manifest status Done/In Progress but file missing under `Art/`.

**Lane mistakes:** Character concept at 30° (should be T-pose). Prop FBX from Meshy when a primitive + albedo was required.

---

## Phase 4: Output Audit Report

```markdown
# Asset Audit Report -- [Category] -- [Date]

## Summary
- **Total assets scanned**: [N]
- **Naming violations**: [N]
- **Size violations**: [N]
- **Format violations**: [N]
- **Orphaned assets**: [N]
- **Missing assets**: [N]
- **Overall health**: [CLEAN / MINOR ISSUES / NEEDS ATTENTION]

## Naming Violations
| File | Expected Pattern | Issue |
|------|-----------------|-------|

## Size Violations
| File | Budget | Actual | Overage |
|------|--------|--------|---------|

## Format Violations
| File | Expected Format | Actual Format |
|------|----------------|---------------|

## Orphaned Assets (no code references found)
| File | Last Modified | Size | Recommendation |
|------|-------------|------|---------------|

## Missing Assets (referenced but not found)
| Reference Location | Expected Path |
|-------------------|---------------|

## Recommendations
[Prioritized list of fixes]

## Verdict: [COMPLIANT / WARNINGS / NON-COMPLIANT]
```

This skill is read-only — it produces a report but does not write files.

---

## Phase 5: Next Steps

- Fix names to manifest §4 / bible §8.
- Delete confirmed orphans after sahip review.
- Continue production via `production/process/asset-pipeline.md` (one ASSET-id).
- Run `/content-audit` to cross-check counts against GDD-specified requirements.
