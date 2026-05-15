---
name: design
description: Design a game from an idea — produce 4 structured design docs (identity, loops, presentation, journey) via sub-agents. Use when the user wants to design a game, create a GDD, define game mechanics, or run only the design phase without building. Triggers on: design a game, game design, GDD, design docs, game idea, core identity, game loops, design phase.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent
---

# Design Phase — Game Idea to Design Docs

Run all 4 design steps in sequence via sub-agents. Each sub-agent gets fresh context with only the prior docs it needs.

## Speed Directive

Each design doc is a **filled schema + exit criteria**. Not an essay. Not a textbook.

Rules for every design step:
- Fill the JSON schema with concrete, game-specific values
- Write Given/should exit criteria with specific numbers and behaviors
- No concept explanations ("why X matters" sections)
- No restating the skill's instructions in the output
- No sections beyond what the schema defines
- Target: 80-150 lines per doc (consolidated schemas are larger but still concise)

The design docs feed code generation. Builders need values, not philosophy.

## Execution Sequence

| Step | Skill | Read Before Running | Produces |
|------|-------|---------------------|----------|
| 1 | `aidd-custom/skills/design/01-core-identity/SKILL.md` | Game idea only | `design/01-core-identity.md` |
| 2 | `aidd-custom/skills/design/02-game-loops/SKILL.md` | `design/01-core-identity.md` | `design/02-game-loops.md` |
| 3 | `aidd-custom/skills/design/03-presentation/SKILL.md` | `design/01-core-identity.md`, `design/02-game-loops.md` | `design/03-presentation.md` |
| 4 | `aidd-custom/skills/design/04-player-journey/SKILL.md` | `design/01-core-identity.md`, `design/02-game-loops.md`, `design/03-presentation.md` | `design/04-player-journey.md` |

Steps 1 and 2 are sequential. Steps 3 and 4 can run in parallel after step 2 completes.

## Sub-Agent Prompt Template

```
You are running design step {N} ({step_name}).

Read the skill: aidd-custom/skills/design/{NN}-{step_name}/SKILL.md
Read prior docs: {list from 'Read Before Running' column}

Produce: design/{NN}-{step_name}.md

Output rules:
1. Fill every schema field with concrete, game-specific values
2. End with Given/should exit criteria containing specific numbers and behaviors
3. Do not contradict prior design docs
4. Do not explain concepts — output decisions only
5. Target 80-150 lines. No essays.
```

## Context Dependency Graph

```
game_idea
  └─→ 01-core-identity (LISA + GDD + core verb)
        └─→ 02-game-loops (meso + level-gen + macro)
              ├─→ 03-presentation (visual + sound + juice)
              └─→ 04-player-journey (lifecycle + FTUE + attract)
```

## Design Quality Gate

After all 4 documents, verify before moving to build:

- [ ] Core verb is one of: tap, swipe, drag (from step 1)
- [ ] State machine ≤12 states, ≤30 transitions (from step 2)
- [ ] Scoring is deterministic (from step 2)
- [ ] Social artifact does NOT spoil answers (from step 2)
- [ ] Every level has a solvability proof strategy (from step 2)
- [ ] Micro loop description ≤200 chars (from step 1)
- [ ] Meso loop description ≤200 chars (from step 2)
- [ ] Macro loop description ≤400 chars (from step 2)
- [ ] Every doc ends with Given/should exit criteria
- [ ] No contradictions across docs

If any gate fails, fix the offending doc before proceeding.

## Orchestrator Workflow

```
DESIGN_PHASE(game_idea):
  launch step 1 (core-identity), verify output + exit criteria
  launch step 2 (game-loops), verify output + exit criteria
  launch steps 3 + 4 in parallel (presentation, player-journey), verify both
  run Design Quality Gate
  if fail: fix and re-run failing step
  report: "Design phase complete."
```

## Error Recovery

- Contradiction with prior doc → re-run the step, earlier docs take precedence, GDD (in step 1) is source of truth.
- Missing output → verify skill file was read, re-run with explicit instructions.
- Repeated failure → surface to user, game idea may need refinement.
