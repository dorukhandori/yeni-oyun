---
name: ai-native-beginner
description: "Orients a sahip who has never shipped a game on how to work with AI on Canopy (one playable slice, Play proof, what AI may draft vs what sahip decides). Use when they say they never made a game, ask how to use AI/Cursor/Claude for game dev, mention vibe coding, Unity courses vs shipping, or 'AI ile nasıl ilerleriz'. Does not brainstorm a new game. Does not replace help for the next pipeline slice."
argument-hint: "[optional: stuck on Unity course | vibe coding | what should I learn]"
user-invocable: true
allowed-tools: Read, Glob, Grep
model: haiku
---

# AI-native beginner — Canopy

This skill is read-only. It writes no files. It does not start a new game.

Speak Turkish with sahip. Point at English paths/SO names.

Canonical OS: `docs/ccgs/AI-NATIVE-BEGINNER.md`. Next-slice skill remains `help`.

---

## Phase 1: Load live Canopy state

Read (do not skip):

1. `docs/ccgs/AI-NATIVE-BEGINNER.md`
2. `production/stage.txt`
3. `production/roadmap.md`
4. `production/session-state/active.md` (if present)
5. `production/qa/faz1-playbook.md` (if present)

Do **not** read the full CCGS workflow catalog unless they asked for phase gates. Do **not** run `/brainstorm` or `/start` Path A/B.

---

## Phase 2: Classify the ask

| They mean | Do this |
|---|---|
| Never made a game / how AI works / vibe coding / Unity kursu | Orient with this skill, then **one** next slice |
| What is the next pipeline step? | Hand off to `help` after one sentence of OS |
| New game idea | Refuse. Product is Canopy (Touch Grass) |

If both “how AI works” and “what now”: OS first (short), then the single slice from playbook/`active.md`.

---

## Phase 3: Orient (sahip-facing)

Cover all of these, briefly:

1. **Where they are** — stage + Faz from roadmap + last `active.md` task. Name real files (`PC-09`, `grower-create.md`, etc.).
2. **Why not a Unity course first** — Faz 0 walk/tap already Play-passed. Learn Inspector + Play on the current slice. Cite GDC-style “playable faster” only as backing, not as a new process.
3. **Session contract** — ~2 hours, one slice, sahip Game view is the proof. Compiling is not done.
4. **AI vs sahip** — sahip: fantasy, Play pass/fail, park, commit, loop-changing numbers. AI: draft C#/SO/play-case after options. AI must not silently restyle parked UI, YAML-edit scenes, or claim Play passed.
5. **Traps** — vibe spaghetti, Asset Store/Meshy session-eater, eight UX screens, new game when stuck, MCP/Helm auto-placing prefabs.

Do not paste the source table unless they ask “where did this come from?” Then point at the canonical doc.

---

## Phase 4: One next slice

Pick **exactly one** action from live files (same discipline as `help`):

- Prefer `active.md` Next if it is still open (e.g. sahip Play `PC-09` Create, 1× Free Aspect).
- Else first **Coded-unproven** play-case that is the current screen lock (Create before Site).
- Else `help`.

Name the Unity clicks: Hub → `grow-sim/Canopy` → `Farm` → Play.

Never recommend: new brainstorm, Site+Shop+Harvest in one session, installing Unity MCP this turn, finishing a Brackeys series before Play.

---

## Phase 5: Hand off

End with:

- The one slice (repeated in one line)
- Optional: `help` for catalog position; `screen-pipeline` / `asset-pipeline` only if they asked to expand chrome or art
- Do **not** auto-run the next skill

Verdict: **COMPLETE** — sahip oriented; one slice named.

---

## Collaborative Protocol

- Read-only: no Write/Edit. If they ask to install MCP, Helm, or a new engine: explain conflict with Canopy, do not install.
- If they ask you to “just make the whole game”: refuse autonomy; offer the one slice.
- Never present `/brainstorm open` as the next step on this repo.

---

## Follow-Up

Recommended next: sahip does the named Play, or says `help` if they only wanted the pipeline position.
