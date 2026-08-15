# yeni-oyun — Lotophagoi (Lotus Adası)

This file is Claude Code's project memory — loaded automatically every session. It is the Claude Code counterpart to `.cursor/rules/project.mdc` (Cursor's always-on rule); keep the two in sync when the project identity changes. `AGENTS.md` stays the Cursor/CCGS-oriented overview — this file governs Claude Code specifically.

Converse with sahip (the owner) in Turkish. Keep code, comments, and commit messages in English. Never commit unless sahip asks.

## What this is

An Odyssey adaptation: **Doryseus** (original, not Homer's Odysseus), crew = "forgotten sailors". Third-person, WASD + mouse.

**K35 (15 Aug 2026, shipped in `real`):** authority `docs/design/gdd-lotus-island-run.md` + `scenario.md`. Exactly **5** random lotuses; wilt/harvest relocates; day loops (dusk is not a lose); forget event wipes satchel, relocates the hero ship, keeps `delivered`, player stays put. Wandering NPCs + woman share one Offer verb (`gift = 1`, max 4 < 5). Hub satellite **Beş yeter** on Lotus. Helm at 5 unlocks Cyclops badge (level not built). `?profile=test` keeps the old 12 / dusk / soft-lose sandbox.

Hallucination figures still apply on Lotus — not enemies; contact = memory spike + walk-drift.

`variants/cave-farm/` is a separate, earlier prototype (Glowsprig — crystal-cave farm concept). It is archived, not the active game. Do not touch it while working on Lotophagoi unless explicitly asked.

## Stack & commands

Vite + TypeScript + **Three.js r185**. No Phaser, no Unity/Godot/Unreal APIs — this is a from-scratch WebGL prototype.

```bash
npm run dev      # http://localhost:5173/
npm run build     # tsc + vite build
npm run preview
```

Don't kill the dev server needlessly if it's already running.

## Source layout

- `src/main.ts` — entry, kicks off `startGame`
- `src/game.ts` — the whole game loop: fixed 60 Hz timestep (`STEP = 1000/60`), state machine (`title → hub → play → dusk/lost/gameover → won`), input → movement → interaction → memory → render each `step()`
- `src/constants.ts` — **single tuning surface**. Every gameplay number (island shape, player speed, lotus timings, memory rates, day length, palette, render settings) lives here. Never hardcode a gameplay value elsewhere — add or reuse a constant.
- `src/render/` — renderer, camera rig, `EffectComposer` + `UnrealBloomPass`, haze/forgetting post pass
- `src/world/` — scene content builders (terrain, sea, lotus field, ship, lotophagoi NPCs, sailor, geometry helpers), plus: `hallucination.ts` (sanrı figürleri lifecycle), `hillPuzzle.ts` (wind-cairn ritual gating the north cove), `steppingStones.ts` (lily-pad chain gating the northern lotus cluster), `sprite.ts` (cached albedo/data texture loaders, `docs/art/pipeline.md` §6 colorspace rules); each returns `{ group, update(t) }`
- `src/systems/` — input, audio, particle bursts, `spring.ts` (spring physics helper)
- `src/ui/` — DOM overlay HUD (`hud.ts`, `hud.css`), `menu.ts` (Title + Hub screens, `docs/ux/screens.md` §1/§3), `orientation.ts` (mobile landscape-lock gate) — not WebGL UI
- `src/types.ts` — shared `GameState`, `Phase` etc.

## Gameplay code standards

- Merge static geometry (`BufferGeometryUtils.mergeGeometries`) instead of spawning hundreds of meshes
- Point lights use tamed `decay` — an inverse-square light next to the camera blows out the frame
- Prefer small focused modules; keep the build playable after every slice
- Desktop keyboard + mouse is primary; keep touch input working when extending controls (`Input` class already branches on `touchActive`)

## Design authority

`docs/design/` (`game-concept.md`, `gdd-lotus-collection.md`, `gdd-memory-system.md`, `gdd-lotus-hallucination.md`, `tuning.md`) owns gameplay, numbers, and HUD — it wins over `docs/art/` in any conflict. `hallucination-reframe-concept.md` is the design-decision record behind `gdd-lotus-hallucination.md`, not a tuning source itself. `docs/art/` (`art-bible.md`, `asset-registry.md`, `pipeline.md`) fixes visual language and the Higgsfield media pipeline only; it does not change mechanics. `docs/ux/` covers screens/HUD/flow at the UX layer. `docs/production/roadmap.md` is the living "where are we, what's next" status doc — it doesn't decide anything itself, just points at the doc that does; `webgpu-migration-assessment.md` sits next to it as a standing technical-director assessment, not an active migration.

## The `.cursor/` studio kit — what applies here and what doesn't

This repo also carries a large Cursor-native "CCGS" kit (`.cursor/agents/`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`), copied wholesale from `/Users/dori/Desktop/game-project/.cursor/`. It is **Cursor IDE-only** — none of those agents/skills are reachable from Claude Code. Two things to know if you go looking there:

- The `.claude/hooks/*.sh` scripts those hooks call into were never copied to this repo — session-start/gap-detection/commit-push-guard hooks currently no-op silently.
- The `help`/`start` skills expect `.claude/docs/workflow-catalog.yaml`, `production/`, `design/gdd/` — none exist here, so those two skills run partially blind in this project.

`.cursor/rules/reference-canopy/` is an archived rule set for an unrelated product ("Canopy"); it does not apply to Lotophagoi.

## Claude Code agents for this project

`.claude/agents/` holds a curated roster (mirrors the roles `AGENTS.md` recommends for this repo, trimmed of Unity/Godot/Unreal/multi-department boilerplate that doesn't apply to a solo Vite+Three.js prototype):

| Need | Agent |
|---|---|
| What's next / coordination | `producer` |
| Mechanics / systems / tuning | `game-designer` |
| Throwaway slice to test a mechanic | `prototyper` |
| Three.js/TS gameplay implementation | `gameplay-programmer` |
| HUD / DOM overlay implementation | `ui-programmer` |
| Flows, input, accessibility | `ux-designer` |
| Visual identity, palette, asset specs, Higgsfield prompts | `art-director` |
| Test strategy, release readiness | `qa-lead` |
| Test cases, bug reports | `qa-tester` |
| Architecture / tech choices / performance budget | `technical-director` |

There is no real multi-person team behind these — sahip is the only other party. Each agent asks sahip directly rather than escalating to a simulated colleague.

## Delegation protocol

This is a written rule the main session follows, not a background mechanism — nothing routes itself automatically.

When sahip hands over a substantive task that clearly matches one specialist's domain (art direction/asset judgment, mechanics/tuning, gameplay or UI implementation, QA, architecture), **delegate to that agent via the `Agent` tool instead of doing the work inline** in the main thread. For anything cross-cutting, ambiguous, or spanning multiple domains, delegate to `producer` — it owns task routing (see its "Task routing" section) and will spawn the right specialist(s) itself, then verify their output against that specialist's own acceptance criteria before calling it done.

Keep trivial asks (quick questions, one-line fixes, "what does X mean") inline — this protocol is for work substantial enough that a specialist's checklist and framing actually matter. Delegating has a real cost (extra turns, extra tokens) and is not a quality guarantee by itself — it enforces the right checklist gets applied, but someone (sahip or the delegate) still has to actually look at the result.

## MCP

Documented project need: **Higgsfield MCP** (media generation — trailer/key art/texture references; produces no 3D meshes). Not connected yet. See `docs/art/pipeline.md` §3. Setup location (Cursor vs. this Claude app) is still being worked out with sahip — don't assume either is configured without checking.
