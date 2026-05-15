# ClearPop To-Do — Apr 24

Open items from 2026-04-24 review pass. Bugs, missing assets, and new features.

---

## 1. Ice sprite — 3 damage states

**Problem:** Ice blockers currently render with a single sprite. Players can't tell they're making progress when they hit an ice block.

**What we need:**
- Generate 3 distinct ice sprites representing damage progression:
  - State 1: pristine / undamaged
  - State 2: cracked / halfway broken
  - State 3: heavily shattered / about to break
- Swap the active sprite based on remaining HP so the breakage is visible.

**Status:** Not started. Assets need generation + approval.

---

## 2. New grayscale block image — needs approval

**What we need:**
- Generate a new grayscale base image for the standard blocks.
- **Eda must approve before it ships.** Do not auto-wire.

**Status:** Not started.

---

## 3. BUG — Level doesn't end when obstacle goal is cleared

**Problem:** When the goal is "clear all obstacles," the level should end the moment the last obstacle is cleared. Instead, the level flips to a score goal (or some other goal) and keeps going.

**Expected:** Obstacle-goal level → all obstacles cleared → level ends (win).

**Status:** Needs investigation — find the goal-evaluation logic in GameController / win-condition code path.

---

## 4. Rule — Obstacle levels end ONLY when all obstacles are cleared

Related to #3. Encode this as a hard rule:

- If a level's goal is obstacle clearance, the ONLY win condition is "all obstacles cleared."
- No score fallback, no move-limit fallback shifting the goal.
- Running out of moves with obstacles remaining = loss.

**Status:** Depends on #3. Fix the bug and then audit the goal system to ensure this rule holds.

---

## 5. More / more interesting level layouts

**What we need:**
- Expand the layout library beyond what's currently in the level generator.
- Discuss variety: asymmetric shapes, corridors, pockets, split boards, themed arrangements.

**Status:** Discussion needed before implementation. Let's sit down and sketch a layout set.

---

## 6. Create `level-design-layout` skill

**What we need:**
- A new skill (likely under `.cursor/skills/` and/or `.claude/skills/`) that captures layout design principles for ClearPop.
- Should cover: mask rule compliance, variety guidelines, pocket/blocker/goal composition, solvability constraints.
- Outcome: future layout work always routes through this skill.

**Status:** Not started. Write after #5 discussion so the skill reflects the agreed-on layout vocabulary.

---

## 7. End-of-level celebration

**What we need:**
- A satisfying celebration moment when the player wins a level.
- Could include: confetti / particles, score count-up, star rating reveal, sound cue, scale/punch on the win banner.
- Juicy, proportional reward that matches effort.

**Status:** Not started. Scope the celebration before building.

---

## Notes

- Keep this file updated as items are completed. Move finished items to a "Done" section rather than deleting, so we can see progress.
- For #1 and #2, asset generation is the blocker — both need sign-off before wiring.
- For #3 and #4, fix the bug first, then lock the rule so it can't regress.
