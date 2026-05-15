---
name: 01-core-identity
description: Transform a game idea into LISA program, GDD, and core verb definition. Step 1 of 4.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent
---

# 01 — Core Identity

Decompose the game idea into a LISA program, convert it to an implementation-ready GDD, and refine the core verb until it feels good with zero UI. One pass, one doc, three sections.

## Output

`design/01-core-identity.md` — Fill all three schemas with game-specific values. No concept explanations. Every sentence is a design decision.

**STRICT:** Output ONLY the fields in the schemas. No extra sections.

## Section A: LISA Program

```json
{
  "lisa_program": {
    "main_program": {"initialization": [string], "subroutine_calls": [string]},
    "mechanical_layer": {"operations": [string], "state_contract": {"target": "json", "max_size_kb": number}},
    "strategic_layer": {"operations": [string], "motivations": [string]},
    "narrative_layer": {"operations": [string], "theme_tokens": [string]},
    "emergent_behaviors": [string]
  }
}
```

### Instruction Vocabulary

Select opcodes that fit. Not every opcode applies.

**Mechanical:** INPUT, MOVE, COLLIDE, SET, MOD, CMP, TRIG, BRANCH, LOOP, SPAWN, KILL, DISPLAY, SOUND
**Strategic:** REWARD, PUNISH, TEACH, AFFORD, TRUST, INVEST, EXTEND, ESCALATE, TEASE, DELIVER, RISK, COMMIT, HEDGE, COMPRESS, BREATHE, COMPARE, BROADCAST, TEST, LAYER, MASTER
**Narrative:** TRUST, INVEST, REVEAL, CONCEAL, HINT, BOND, PRIDE, SUSPEND, RELEASE, GROW, TEASE

## Section B: Game Design Document

The GDD is the **source of truth** for all downstream steps and build stages.

```json
{
  "gdd": {
    "title": string,
    "high_concept": string,
    "core_gameplay_loop": [string],
    "system_design": {
      "scoring": {"base_formula": string, "multiplier_cascade": [string], "deterministic": true},
      "progression": {"mastery_tiers": [string], "daily_unlocks": [string], "teaching_model": string},
      "onboarding": {"day_1": string, "day_2": string, "day_3": string, "day_4": string},
      "content_generation": {"source": "data-pack | procedural | hybrid", "schema_validation": string}
    },
    "theme_and_presentation": {
      "visual_style": string,
      "audio_style": string,
      "accessibility": [string]
    }
  }
}
```

### LISA → GDD Translation

| LISA Layer | GDD Section | Map |
|---|---|---|
| Mechanical | core_gameplay_loop | INPUT/MOVE/COLLIDE/SET/MOD → ordered player action steps |
| Strategic | system_design | REWARD → scoring; TEACH/ESCALATE → progression; AFFORD/INVEST → onboarding |
| Narrative | theme_and_presentation | Affective/aesthetic layer → visual style, audio style, accessibility |

## Section C: Micro Loop (Fun Refiner)

Distill the GDD into the atomic ludeme — the single verb the player performs. Must feel good with no menus, no score, no levels. Just the verb.

```json
{
  "micro_loop": {
    "core_verb": "tap | swipe | drag",
    "interaction_model": "what the verb does to the game state",
    "headless_step_fn": "step(state, action) => new_state — pure, no render, no random",
    "entities": [
      {"name": string, "role": "player | target | obstacle | boundary", "behavior": string}
    ],
    "feedback": {
      "on_success": "what happens when the verb succeeds",
      "on_failure": "what happens when it fails"
    },
    "tti_seconds_target": number,
    "gps_archetype": "pattern_decoder_v1 | flow_manager_v1 | grid_manipulator_v1 | new",
    "miyamoto_test": "why the verb alone is satisfying with no targets"
  }
}
```

### GPS Archetype Library

| Archetype | Core Verb | Data Structure | Use |
|---|---|---|---|
| pattern_decoder_v1 | tap | category_set | Grouping/sorting puzzles |
| flow_manager_v1 | drag | queue | Routing/classification games |
| grid_manipulator_v1 | drag | grid | Spatial placement games |

No match → propose **new** with justification.

## Constraints

**LISA:**
- Three layers: mechanical (state changes), strategic (motivation), narrative (emotion)
- Mechanics deterministic — no Math.random() in state logic
- State contract under 2KB JSON
- At least one emergent cross-layer feedback loop

**GDD:**
- High concept: one sentence naming the core verb and primary pleasure
- Scoring: deterministic pure function with explicit base + multiplier components
- Social artifact: define what the player shares and how it avoids spoiling answers
- Align to mechanic-fixed / content-variable / social-artifact thesis

**Micro Loop:**
- Core verb MUST be one of: tap, swipe, drag (GPS hard gate)
- step_fn is pure — no render calls, no Math.random() (seeded RNG only)
- TTI under 3 seconds
- Match a GPS archetype or justify a new one
- Micro loop description ≤200 characters

## Exit Criteria

- Given the LISA program, should have opcodes from all three layers
- Given state contract, should be under 2KB JSON
- Given the GDD, should specify: title, core verb, scoring formula, entity names, progression milestones
- Given scoring, should include base formula + multiplier cascade, deterministic
- Given progression, should include mastery_tiers and teaching model
- Given core verb, should be exactly one of: tap, swipe, drag
- Given step function, should be pure (no render, no Math.random)
- Given TTI target, should be under 3 seconds
- Given GPS archetype, should match library or justify new
- Given Miyamoto test, should describe why verb alone satisfies
- Given micro loop description, should be ≤200 characters
- Given the output, should be at `design/01-core-identity.md`
