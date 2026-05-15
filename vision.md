**Genre:** Tap-to-Clear Puzzle (Clear/Pop)
**Platform:** Mobile Web (portrait, touch-first)
**Target Audience:** Casual puzzle players, adults 30+, multiple-sessions-per-day habit
**Visual Reference:** Toy Blast, Toon Blast, Cookie Jam Blast

---

## 1. Game Overview

Eigen Pop is a tap-to-clear puzzle game. Players tap groups of same-colored blocks to pop them off an 8x8 board. Larger groups spawn power-ups. Each level has one goal: clear all blocker obstacles from the board within a fixed number of moves.

The game is structured as a 200-level campaign across 10 themed zones, each tied to a chapter of the narrative layer.

---

## 2. Core Mechanic

The entire game revolves around **tapping as the main mechanic.**

### How It Works

1. Player taps a block on the board.
2. The game finds all same-colored blocks connected orthogonally (up/down/left/right) to the tapped block. This is the "group."
3. If the group contains **2 or more** blocks, the entire group is cleared.
4. If the group is large enough, a power-up is left behind at the tap location.
5. Gravity pulls remaining blocks downward to fill gaps.
6. New blocks drop in from the top to fill the board. **The board is always full after every clear.**
7. The turn ends. No automatic chain reactions occur.

### Invalid Taps

- Tapping a single block with no same-colored orthogonal neighbors does nothing (rejection shake animation + thud sound).
- Tapping an obstacle cell does nothing (same rejection feedback).
- Tapping during an active animation is queued or ignored depending on state.

### Tap Feedback Layers

Every valid tap triggers simultaneous feedback across four channels:

- **Visual:** pop + particles
- **Audio:** pop with pitch scaled to group size
- **UI:** score fly-up + goal counter updates

---

## 3. The Board

### Grid

- Default size: **8 columns x 8 rows** (this is intentionally smaller than most games to provide more space for partnership reskinning )
- Configurable per level
- Row 0 is the top of the board; row index increases downward
- Board is centered in the viewport with a decorative frame/background

### Gravity

- When blocks are cleared, remaining blocks in each column fall downward to fill gaps.
- After gravity settles, new random blocks drop in from the top to restore a full board.
- Gravity animation: ~200ms per cell of fall distance.
- Blocks have a small landing bounce (~80ms) when they settle.

### Board States

| State | Description |
| --- | --- |
| **Playable** | Board accepts input |
| **Animating** | Clearing/gravity/refill in progress. Input blocked or queued |
| **Won** | All blockers cleared. Remaining moves convert to bonus |
| **Lost** | Moves exhausted without clearing all blockers |

---

## 4. Blocks

### Visual Style

- Blocks with rounded corners, glossy highlight, and subtle inner shadow
- Each block has a **unique color** and rounded square shape
- 3 colors maximum on any given level
- 128x128px sprites packed into a sprite atlas
- Blocks scale slightly (anticipation pulse) when touched before popping

---

## 5. Win & Lose Conditions

### Win Condition

**Clear all blocker obstacles from the board.**

The win triggers immediately when the last blocker is removed, even if moves remain. Remaining moves convert to a bonus sequence (see Section 7, Scoring).

### Lose Condition

**The player loses when moves remaining reaches zero and blockers remain on the board.**

### What Happens on Loss

1. Dark overlay flashes briefly.
2. "Out of Moves" message appears.
3. Continue offer is presented (if available).
4. If declined or unavailable, results screen shows partial progress.
5. One life is deducted.

---

## 6. Moves

- Fixed number of moves per level (default: 30; configurable per level)
- **One tap = one move**, regardless of group size
- Move counter is prominent in the HUD
- Counter pulses and changes color when 5 or fewer moves remain

---

## 7. Scoring

### Base Formula

When a group of blocks is cleared:

> **Group Score = 10 x (Group Size ^ 1.5)**
> 

| Group Size | Score |
| --- | --- |
| 2 | ~28 |
| 3 | ~52 |
| 5 | ~112 |
| 7 | ~185 |
| 9 | ~270 |

### Star Thresholds

Each level has three score thresholds for 1, 2, and 3 stars. Default:

- 1 star: 0
- 2 stars: 4,000
- 3 stars: 7,000

Configurable per level. Stars persist; replaying a level keeps the best star count.

### End-of-Level Bonus

If the player wins with moves remaining, each unused move triggers a bonus sequence:

- Each remaining move creates one rocket power up randomly on board.
- Each one fires on the board.
- Each detonation adds bonus points.

---

## 8. Obstacles & Blockers

Obstacles add strategic depth. **Clearing all obstacles is the win condition.** Each obstacle type requires a specific interaction to remove.

### Obstacle Types

**Bubble Block**

- Occupies a cell. Does not match. Does not fall.
- Cleared by adjacent clears only.
- Not cleared by direct taps or power-up blasts.
- Hit count: 1

**Egg**

- Adjacency-only obstacle.
- 2 hits: wobble, then crack/hatch.
- Only appears during the Zone 1 bubble curriculum (levels 4–20). Not present in procedural zones unless manually placed.

**Ice**

- Covers a block. Prevents it from being tapped as part of a group.
- Cleared by clearing a group adjacent (orthogonal) to the ice.
- Hit count: 3

**Jelly**

- Covers blocks, they are visible underneath.
- Keeps them away from moving with the rest of the grid.
- Cleared when the block sitting adjacent are cleared.
- Hit count: 1

**Cage**

- Traps a block. Prevents it from being matched.
- Cleared by clearing a group adjacent to the cage.
- Hit count: 1

**Safe**

- Multi-hit container.
- 2 adjacent clears: crack, then destroy.

---

### Obstacle Introduction Schedule

| Obstacle | First Appears |
| --- | --- |
| bubble_block | Level 1  |
| egg | Level 4  |
| ice | Level 12 |
| jelly  | Level 20 |
| cage  | Level 32  |
| safe | Level 44 |

---

## 9. Power-Ups

Power-ups are earned through gameplay by clearing large groups. They spawn on the board at the tap location and are activated by tapping them directly (costs 1 move).

### Spawn Thresholds

| Group Size | Power-Up Created |
| --- | --- |
| 5 | Rocket |
| 7 | Bomb |
| 9+ | Color Burst |

### Rocket

- Clears an entire row or column.
- Direction determined by the shape of the cleared group.
- Detonation: outward stagger ~50ms per cell.

### Bomb

- Clears all cells within a 2-tile radius (5x5 zone).
- Detonation: expanding rings ~40ms per ring.

### Color Burst

- Clears every block on the board matching the burst's color.
- Detonation: spiral ~60ms per cell.

### Power-Up Preview

When a player holds over a group large enough to spawn a power-up, a faint icon overlay indicates which power-up will be earned.

---

## 10. Power-Up Combos

Tapping a power-up that is orthogonally adjacent to another power-up activates a combo instead of a solo detonation.

### Combo Matrix

| Combination | Effect | Animation |
| --- | --- | --- |
| Rocket + Rocket | Full row + full column through tap cell | Default combo pop |
| Rocket + Bomb | 3 full rows + 3 full columns centered on tap cell | Default combo pop |
| Bomb + Bomb | Double-radius bomb, radius 4 instead of normal 2 | Ring-out from center |
| Bomb + Color Burst | All cells of burst's color cleared, then bomb blast on each | Cascade bombs placed on color cells, detonated one by one |
| Rocket + Color Burst | All cells of burst's color cleared, then rocket on each | Cascade rockets placed on color cells, fired one by one |
| Color Burst + Color Burst | Clears every tile on the entire board | Wave pop radiating from tap center |

### Combo Selection Logic

When multiple power-ups are adjacent, the game selects the combo partner that would clear the most cells.

### Combo Feel

- 900ms anticipation animation (power-ups orbit/spiral together)
- Heavy screen shake, camera zoom punch, maximum confetti
- Unique combo blast sound
- Heavy haptic pattern (rapid pulse sequence)

---

## 11. Juice & Feedback

### Feedback Philosophy

Every action produces immediate, multi-channel feedback. Intensity scales with significance.

### Three Tiers of Feedback

**Tier 1: Subtle (Every Tap)**

- Anticipation scale: 30–50ms
- Pop: 50ms
- Small particle puff
- Single pop sound
- Light haptic (10ms)

**Tier 2: Noticeable (Power-Ups)**

- Medium screen shake
- Colored flash
- Multi-particle burst
- Pitch-escalated pops
- Medium haptic (25ms)
- Score fly-text

**Tier 3: Dramatic (Bombs, Combos)**

- Heavy shake + slight rotation
- Zoom punch
- Confetti burst
- Multiple overlapping SFX
- Heavy haptic pattern (50ms + pulses)
- Screen-wide color flash
- 1–2 frame freeze for anticipation

### Animation Timing Reference

| Animation | Duration |
| --- | --- |
| Anticipation (pre-tap bulge) | 30–50ms |
| Clear pop (block vanish) | 50ms |
| Gravity fall | 200ms per cell |
| Landing bounce | 80ms |
| Rocket stagger | 50ms per cell |
| Bomb stagger | 40ms per ring |
| Color Burst stagger | 60ms per cell |
| Combo orbit spiral | 900ms |
| Score fly-text | 600ms |
| Host dialogue auto-dismiss | 2000–3500ms |
| Host dialogue cooldown | 8000ms |

---

## 13. Level Design

### Design Philosophy

Levels should feel **composed, not random.** Every board should have a readable silhouette where blocker patterns are legible at a glance.

### Two Visual Groups

1. Blockers form one coherent shape or pattern.
2. Playable blocks fill the negative space around blockers.

### Near-Miss Engineering

Target a 90% near-miss ratio:

- Player runs out by 1–3 moves, not 15.
- Blockers are 80–90% cleared at failure.

### **Board Construction Pipeline**

**Step 1: Build the bubble mask** — decides which cells are bubbles vs gems

The primary path uses `createPocketFirstBubbleBoard` which calls `buildSymmetricPocketBubbleMask` from `pocketStyles.ts`. This generates a **left-right symmetric** bubble mask with pocket-shaped gem openings. It tries up to 32 seeds to find a valid mask.

If pocket-first fails, it falls back to `createStructuredBubbleBoard` which builds the mask procedurally.

**Step 2: Validate the bubble structure** — `validateBubbleStructureRules` enforces 7 hard rules:

| **Rule** | **Constraint** | **Purpose** |
| --- | --- | --- |
| **Coverage** | 60–85% of cells must be bubbles | Board isn't too sparse or too full |
| **Exposure** | 10–25% of bubbles must touch a gem orthogonally | Enough attack surface to start popping |
| **Cohesion** | 70%+ of bubbles in one connected component | No scattered island masses |
| **No small clusters** | No isolated bubble groups < 5 cells (before level 16) | Prevents trivial pops |
| **Checkerboard cap** | Max 3 "checkerboard" 2x2 windows | No Swiss-cheese holes in the mass |
| **No solo gems** | Zero gem cells with no orthogonal gem neighbor | Every gem must be matchable |
| **Top-entry bias** | 55%+ of interface gems (gems touching a bubble) must be in the top half | Player carves downward, not hunting for buried entry points |
| **Perimeter gems** | 50%+ of gems must be on the board edge | Accessible starting positions |

**Step 3: Color the gems** — `assignGemColorsHorizontalBands` (the default for L1–20)

- Fills gems row-by-row in 2-row-high horizontal stripes, each stripe preferring one of the 3 colors
- Respects a **max group size of 6** — no pre-existing group can be larger than 6 connected same-color cells
- Uses `floodFill` during placement to prevent oversized groups
- If the cap is still violated, `recolorGemsForMaxGroup` retries up to 60 times with random coloring

**Step 4: Mirror** — `mirrorHorizontalPlayableGemCells` copies gem colors from the left half to the right to maintain the board's visual symmetry

**Step 5: Egg conversion** (Level 4+) — `applyEggRowPattern` converts some bubble_block cells to eggs using one of 4 rotating row patterns based on `(levelId - 1) % 4`

**Step 6: Final validation** — rejects boards with:

- Zero valid groups (no possible first move)
- Solo gem cells (unmatchable)
- Fewer than `MIN_INITIAL_GEM_CELLS` matchable gems

If all 32 pocket-first attempts fail, it cascades through progressively looser fallbacks — first 160 attempts of random perimeter-expansion masks, then 48 more with varied seeds, then 40 attempts of plain procedural boards with random bubble sprinkling, and finally a last-resort board guaranteed not to crash.

---

## 14. Narrative Layer (Optional / Toggleable)

The narrative layer is a thin wrapper around the campaign. It can be toggled on or off per deployment and is designed for easy reskin without touching core gameplay.

### Structure

- Each zone maps to one chapter: a theme, a setting, and a story.
- Each level completion reveals one story clue.
- Chapter completion reveals the full story beat and links to source content (if applicable).

### What Is Reskinnable

- Chapter themes and settings
- Clue copy and story summaries
- Host character name, portrait, and dialogue tone
- Visual chapter background and frame
- Source content links (e.g., news articles, brand stories)

### What Stays Constant

- Clue reveal timing (tied to level completion)
- Chapter length (20 levels)
- Story arc structure: vague clues early, specific clues late

### Narrative Arc Per Chapter

1. Detached
2. Curious
3. Piecing together
4. The click
5. The reveal

---

## 15. Host Character (Optional / Toggleable)

The host is a companion character that delivers clues and reacts to gameplay events. Disabled if the narrative layer is off.

The host's name, personality, portrait, and dialogue tone are fully configurable per deployment. The system below defines the delivery mechanics only.

### Dialogue Delivery

- Non-modal text strip at top of screen.
- Auto-dismiss: 2–3.5 seconds.
- Non-blocking (pointer-events pass through).
- 8-second cooldown between lines.
- Max 20 words per line.

### Portrait

- 4 expressions: neutral, happy, concerned, excited.
- Small portrait next to dialogue strip.
- Optional idle animation (max 8 frames).

---

## 16. Economy

Coins are the single soft currency. Earned through gameplay, spent on boosters, continues, and life refills.

### Earning Coins

| Source | Amount |
| --- | --- |
| First clear of a level | 10 coins per star + 30 first-clear bonus |
| Replay of a level | 5 coins per star |
| Daily challenge completion | 150 coins |
| Login streak rewards | 25–300 coins depending on day |
| Zone completion reward | 500–1,400 coins depending on zone |
| Zone perfect bonus | +300 coins |

### Spending Coins

| Purchase | Cost |
| --- | --- |
| Boosters | TBD |
| Continue (5 extra moves after loss) | 50 (escalates) |
| Life refill (restore to max) | 100 |

### Starting Balance

TBD

---

## 17. Boosters

TBD

---

## 18. Lives System

- Start with **5 lives** (max)
- Losing a level costs **1 life**
- Winning costs **0 lives**
- Regeneration: **1 life per 30 minutes**
- Max stored: 5 (can temporarily exceed via rewards)
- Refill to max: 100 coins

---

## 19. Continue System

### When It Appears

After the player runs out of moves and loses, a Continue overlay is shown.

### Offer

Pay coins to receive **5 additional moves** and resume from the exact board state.

### Escalating Cost

| Attempt | Cost |
| --- | --- |
| 1st continue | 50 |
| 2nd continue | 75 |
| 3rd continue | 112 |

### Limits

- Max 3 continues per level attempt.
- After 3 continues, the player must restart from scratch.
- Counter resets on a fresh level start.

---

## 20. Dynamic Difficulty Adjustment (DDA)

DDA is invisible assistance for struggling players. It should feel like the player finally figured it out, not like the game went easy on them.

### Trigger

After 2–3 consecutive failures on the same level (lower threshold early game), DDA activates.

### What DDA Does

1. Grants **+2 bonus moves** (displayed as if it were always the move limit).
2. Generates a friendlier starting board (looser clustering, larger natural groups).

### What DDA Does Not Do

- Show any UI indicating help was given.
- Change goals or star thresholds.
- Persist beyond the current attempt.

DDA resets when the player wins any level.

---

## 21. Daily Challenge (Optional)

### Unlock

Available after completing **Level 20**.

### Format

- One-off level generated from the current date as a seed.
- Fixed parameters: 18 moves, single goal (clear all blockers of one target type).
- Same seed = same board for all players that day.

### Refresh

New challenge at UTC midnight.

### Attempts

Max 3 retries per day.

### Rewards

- 150 coins
- 1 random booster (determined by date seed)

---

## 22. Accessibility

### Colorblind Support

- Dual coding: unique shape + color for each block type.
- Shapes always visible regardless of color setting.

### Reduced Motion

- Respects `prefers-reduced-motion`.
- Disables shake, reduces particles, shortens animations.

### Touch Targets

- Minimum 44x44dp for all interactive elements.