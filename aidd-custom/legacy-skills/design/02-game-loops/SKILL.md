---
name: 02-game-loops
description: Define level structure, level generation, and progression system. Step 2 of 4.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent
---

# 02 — Game Loops

Wrap the core verb into complete levels (meso), generate them with provable solvability, and layer progression on top (macro). One pass, one doc, three sections.

## Input

Read `design/01-core-identity.md` before running.

## Output

`design/02-game-loops.md` — Fill all three schemas with game-specific values.

**STRICT:** Output ONLY the fields in the schemas. No extra sections.

## Section A: Meso Loop

Every level is a meso-loop instance — setup, challenge, climax, resolution, social artifact.

```json
{
  "meso_loop": {
    "core_verb": string,
    "level_structure": {
      "ki": "setup — what the player sees and understands on entry",
      "sho": "development — what constraint or wrinkle layers on",
      "ten": "twist — what crisis or pressure peaks",
      "ketsu": "resolution — win/lose, score reveal, tease next"
    },
    "state_machine": {
      "states": [string],
      "transitions": [{"from": string, "to": string, "on": string}],
      "max_states": 12,
      "max_transitions": 30
    },
    "scoring_rules": {
      "formula": "deterministic scoring expression",
      "components": [string],
      "multiplier_cascade": "how multipliers stack",
      "deterministic": true,
      "tie_breaking": string
    },
    "challenge_curve": {
      "sample_levels": 3,
      "difficulty_progression": "Ki-level (teach) → Sho-level (test) → Ten-level (master)"
    },
    "social_artifact_contract": {
      "type": "proof_of_knowledge | certify | transfer",
      "format": "emoji_grid | event_receipt | grid_silhouette",
      "spoils_answer": false,
      "curiosity_hook_template": "≤280 char shareable text"
    }
  }
}
```

## Section B: Level Generation

Select the correct solvability strategy, validate sample levels, produce the generation contract.

```json
{
  "level_gen": {
    "archetype": string,
    "strategy": "forward_construction | backward_construction | graph_construction",
    "solver": string,
    "solver_description": string,
    "validated_levels": [
      {
        "level_id": string,
        "solvable": boolean,
        "proof_method": string,
        "proof_summary": string
      }
    ],
    "generation_contract": {
      "strategy": string,
      "solver": string,
      "generation_steps": [string],
      "constraints": object,
      "difficulty_parameters": {
        "tier_1": object,
        "tier_2": object,
        "tier_3": object,
        "tier_4": object
      }
    },
    "all_levels_solvable": boolean
  }
}
```

### Solvability Strategy Catalog

| Archetype | Strategy | Solver | Verification |
|---|---|---|---|
| pattern_decoder_v1 | forward_construction | set_intersection_check | Category sets non-overlapping, union = all items |
| flow_manager_v1 | graph_construction | bfs_dfs_reachability | Each order has valid path, no ambiguous routing |
| grid_manipulator_v1 | backward_construction | backtracking_exact_cover | Start solved, extract pieces, verify forward solvability |

New archetype → declare strategy, provide solver pseudocode, state complexity bound.

## Section C: Macro Loop

Progression system that creates "one more level" compulsion. Parameterize the meso loop — don't reinvent mechanics.

```json
{
  "macro_loop": {
    "progression": {
      "total_levels": number,
      "difficulty_curve": "how difficulty scales across levels",
      "escalate_breathe_rhythm": "pattern (e.g. every 3rd level is relief)",
      "unlock_milestones": ["what unlocks at which level numbers"],
      "mastery_arc": "novice → competent → master",
      "daily_session_target_minutes": number
    },
    "scoring": {
      "base_formula": "how base score is calculated",
      "multiplier_cascade": "how multipliers stack (multiplicative, not additive)",
      "components": ["completion", "speed", "streak", "chain", "risk", "level_mult"],
      "deterministic": true
    },
    "bot_playability": {
      "supports_headless_bot": true,
      "terminal_state_guaranteed": true,
      "replay_fn": "replay_fn(seed, actions) -> outcome",
      "bot_policies": [
        {"name": "random", "strategy": "random valid moves"},
        {"name": string, "strategy": string}
      ]
    },
    "content_contract": {
      "content_source": "data-pack | procedural | hybrid",
      "hot_swappable": true,
      "schema_validated": true,
      "generation_strategy": "reference level-gen strategy"
    },
    "macro_loop_description": "≤400 char summary"
  }
}
```

## Constraints

**Meso:**
- State machine: ≤12 states, ≤30 transitions (GPS hard gate)
- All paths must reach a terminal state (WON or LOST) — no softlocks
- Scoring: deterministic pure function. Explicit formula with base + multiplier. Document tie-breaking.
- Social artifact: must NOT spoil the answer (GPS hard gate)
- Design 3 sample levels following Ki→Sho→Ten difficulty progression
- Meso loop description ≤200 characters

**Level Gen:**
- Every level must be generated from or validated against a known solution
- Difficulty tiers parameterize level generation (entity count, constraint count, solution depth)
- Same seed + same parameters = same level (deterministic)

**Macro:**
- Difficulty: escalate gradually with periodic breathe levels (specify the pattern)
- Scoring: multiplicative stacking (streak x chain x risk), not additive
- At least 2 bot policies (random baseline + one strategic)
- replay_fn(seed, actions) → deterministic outcome
- Every level reaches terminal state in finite actions
- Content: hot-swappable, schema-validated data packs
- Macro loop description ≤400 characters

## Exit Criteria

- Given state machine, should have ≤12 states and ≤30 transitions
- Given all state paths, should reach terminal state (no softlocks)
- Given scoring formula, should be deterministic pure function
- Given social artifact, should NOT spoil the puzzle answer
- Given 3 sample levels, should follow Ki-Sho-Ten difficulty progression
- Given archetype, should select matching solvability strategy from catalog
- Given sample levels, should validate each against solver
- Given seed + parameters, should produce same level deterministically
- Given progression, should have escalate+breathe rhythm with periodic relief
- Given scoring, should use multiplicative stacking (not additive)
- Given bot policies, should have at least 2 (random + strategic)
- Given replay function, should take (seed, actions) and produce deterministic outcome
- Given macro loop description, should be ≤400 characters
- Given the output, should be at `design/02-game-loops.md`
