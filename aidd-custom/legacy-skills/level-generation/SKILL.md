---
name: level-generation
description: Procedural level generation with solvability proofs. Use when implementing level generators, difficulty parameterization, or content validation. Triggers on: level generation, procedural, solvability, level validator, backward construction, forward construction, seeded RNG, difficulty tiers, solver.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Level Generation -- Solvability-First Design

Every level the game produces must be provably solvable. No "generate and hope." Either build from the answer (backward construction) or validate with a solver (forward construction + verification).

## Core Principle

Every level must be generated from or validated against a known solution. The generation strategy is chosen per archetype, and the solver must use a documented, well-known algorithm.

## Generation Strategies

### Backward Construction
**Start with the solution, derive the puzzle.**

Best for: grid/packing games, placement puzzles, jigsaw-style games.

Process:
1. Create a solved board (all pieces placed correctly)
2. Extract piece sequence in presentation order
3. The puzzle IS the disassembled solution
4. Solvability guaranteed by construction

Verification: Forward solver confirms solution is reachable.

### Forward Construction
**Build the puzzle, verify it has a solution.**

Best for: category/grouping games, sorting puzzles, pattern matching.

Process:
1. Pick N non-overlapping categories from a canon source
2. Fill items per category
3. Add one-away traps (items that almost belong to another category)
4. Verify: intersection of any two category item sets is empty
5. Verify: union of all category items equals all presented items

Solvability guaranteed by set disjointness.

### Graph Construction
**Build a valid graph, generate challenges from valid paths.**

Best for: routing games, flow puzzles, network management.

Process:
1. Build station graph with edges and routing rules
2. Generate orders only from valid paths (BFS/DFS reachability)
3. Verify: for each order, a path exists from source to destination
4. Verify: no order is ambiguously routable (exactly one correct destination)

Solvability guaranteed by graph traversal.

## Solvability Strategy Catalog

### pattern_decoder_v1 (tap + category_set)
- **Strategy**: forward_construction
- **Solver**: set_intersection_check
- Pick N non-overlapping categories, fill items per category
- Solvability guaranteed by construction (categories defined before items assigned)
- Verify: intersection of any two category item sets must be empty
- Verify: union of all category items equals all presented items

### flow_manager_v1 (drag + queue)
- **Strategy**: graph_construction
- **Solver**: bfs_dfs_reachability
- Build station graph with edges and routing rules
- Generate orders only from valid paths
- Verify: for each order, a path exists from source to destination via BFS/DFS
- Verify: no order is ambiguously routable (exactly one correct destination)

### grid_manipulator_v1 (drag + grid)
- **Strategy**: backward_construction
- **Solver**: backtracking_exact_cover
- Start with solved board (all pieces placed correctly), extract piece sequence
- Guarantees at least one valid placement exists
- Verify: grid area == sum of piece cell counts
- Verify: piece dimensions fit within grid dimensions
- Verify: forward solver confirms solution is reachable

### New Archetypes
If the game doesn't match a catalog archetype, you MUST:
1. Declare the generation strategy (forward, backward, or hybrid)
2. Provide solver pseudocode using a known algorithm
3. State the complexity bound
4. Confirm the algorithm is well-documented and implementable

## Difficulty Parameterization

Levels are generated across 4 difficulty tiers. Same seed + same tier must produce the same level.

### Tier Structure
| Tier | Description | Typical Parameters |
|------|-------------|-------------------|
| Tier 1 | Tutorial/easy | Fewer items, simpler layout, generous time |
| Tier 2 | Normal | Standard complexity, moderate challenge |
| Tier 3 | Hard | More items, tighter constraints, less time |
| Tier 4 | Expert | Maximum complexity, minimal margin for error |

### Parameter Axes
Adjust these per tier (game-specific):
- Grid size / item count
- Number of categories or groups
- Time limit
- Distractor count (one-away traps)
- Constraint tightness
- Required chain length

## Deterministic Generation

```typescript
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generate(tier: number, seed: number): LevelDef {
  const rng = seededRandom(seed);
  // Use rng() instead of Math.random()
  // Same seed + tier always produces the same level
}
```

## Solvability Proof Type

Every level must carry a proof:

```typescript
interface SolvabilityProof {
  method: 'solver_verified';
  passed: boolean;
  evidence: Record<string, unknown>;
  // Evidence includes:
  // - Solution path (for grid games)
  // - Set disjointness proof (for category games)
  // - Reachability proof (for routing games)
}
```

## Validation Rules

1. Every sample level from the meso loop must be checked against the solver
2. If a level fails, regenerate it using the strategy's generation steps
3. If regeneration fails, flag for redesign (the game mechanic may be unsolvable)
4. The generation contract must define how difficulty tiers affect level parameters
5. Same seed + same parameters must produce the same level (deterministic generation)

## What This Stage Produces

### Files Created
- `levelGenerator.ts` -- `generate(tier, seed)` returns a LevelDef using the archetype's strategy
- `levelValidator.ts` -- `validate(level)` returns a SolvabilityProof using the archetype's solver

### Files Modified
- `levels.ts` -- Attach solvability proofs to existing level definitions
- `types.ts` -- Add SolvabilityProof, GenerationStrategy types

### Stage Constraints
- **Known algorithms only**: Solver must use a documented, well-known algorithm
- **Backward for placement**: Grid/packing games must use backward construction
- **Deterministic generation**: Same seed + same tier = same level
- **Proof required**: No level emitted without a SolvabilityProof
- **Extend don't replace**: Build on top of meso loop files
- **Solver must terminate**: Bounded runtime for the grid sizes used

### Exit Criteria
- LevelGenerator produces levels for all 4 difficulty tiers
- LevelValidator correctly validates solvable levels
- LevelValidator correctly rejects unsolvable levels
- All existing levels have solvability proofs
- Generator is deterministic with seed
- Types include SolvabilityProof and GenerationStrategy
- Solver algorithm matches archetype strategy

## Execute

```sudolang
fn whenImplementingLevelGeneration() {
  Constraints {
    Generation algorithm must match the design doc — if it says backward-construction, implement backward-construction
    Every generated level must pass the solvability validator
    Generation must be deterministic given the same seed
    Difficulty parameters must map to the design doc's tier definitions
    Do not simplify to a random shuffle — the algorithm IS the design
  }
}
```

### Exit Criteria (Given/Should)

- Given the same seed, should generate identical levels on every call
- Given a generated level, should pass the solvability validator (provably completable)
- Given the generation algorithm name, should match the design doc (e.g., "backward-construction" not "shuffle")
- Given difficulty tier 1 parameters, should produce levels matching the design's tier 1 spec (entity count, constraint count)
- Given difficulty tier N (highest), should produce levels matching the design's hardest spec
- Given 100 generated levels at any difficulty, should all pass solvability validation (zero unsolvable)
- Given the validator rejects a level, should regenerate with a new seed (not ship the broken level)
