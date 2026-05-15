# Power-Up Detonation Animations Epic

**Status**: ✅ COMPLETED (2026-04-08)
**Goal**: Make power-up detonation visuals match the design spec exactly — puff+collapse on bomb tiles, mixed-shape particles, and full type-specific combo animations.

## Overview

Power-up detonations feel flat in two spots: bombs use a quick fade instead of the puff-then-collapse that rockets already have, and combos skip detonation animations entirely — tiles just vanish after the anticipation spiral. The spec calls for the same wave/ring/sweep patterns to play on combos (just covering a larger area), plus heavier feedback. Fixing these gaps makes every detonation feel intentional and satisfying.

---

## Fix Bomb Pop Style

Change `animateBombDetonation` to use `popCellWithPunch` (108% puff → collapse) instead of `popCellFast` (instant shrink). The ring-by-ring 42ms stagger is already correct.

**Requirements**:
- Given a bomb detonation, should animate each tile with the puff→collapse sequence (108% scale punch, then 200ms shrink + fade)
- Given tiles in the same Chebyshev ring, should all begin their puff simultaneously

---

## Add Mixed Particle Shapes

Update `spawnExplosionParticles` to emit circles, squares, and triangles (roughly ⅓ each) instead of circles only.

**Requirements**:
- Given a detonation particle burst, should randomly emit circles, squares, and triangles
- Given particles of any shape, should maintain the existing gravity-arc trajectory and fade behavior

---

## Add ComboType to Juice Events

Extend `JuiceEvent` with an optional `comboType` field so the juice orchestrator can route combo events to type-specific handlers.

**Requirements**:
- Given a combo detonation, should include the `comboType` on the fired `JuiceEvent`
- Given the juice orchestrator receiving a `combo_detonated` event, should be able to dispatch by combo type

---

## Add Combo Detonation Animations

Create `animateComboDetonation` that plays the appropriate tile-death pattern based on combo type — rocket wave for rocket combos, ring expansion for bomb combos, reading-order sweep for burst combos, and the dominant pattern for mixed combos.

**Requirements**:
- Given a rocket+rocket combo, should animate the full cross with rocket-style outward wave (popCellWithPunch, 42ms stagger)
- Given a bomb+bomb combo, should animate the 9×9 area with ring-by-ring expansion (popCellWithPunch, 42ms per ring)
- Given a burst+burst combo, should animate the entire board with reading-order sweep (popCellBurst, 52ms stagger)
- Given a rocket+bomb combo, should animate the 3-row+3-col cross with ring-by-ring expansion from center
- Given a rocket+colorburst combo, should animate color-matched cells with burst sweep then rocket line with rocket wave
- Given a bomb+colorburst combo, should animate color-matched cells with burst sweep then bomb square with ring expansion

---

## Wire Combo Animations into GameController

Insert the combo detonation animation call between `executeCombo` and visual cleanup in `handlePowerUpTap`, so combo tile deaths are visually animated instead of instantly cleared.

**Requirements**:
- Given a combo detonation, should play the type-specific animation after anticipation and before gravity
- Given a combo, should fire type-specific combo juice concurrently with the detonation animation

---

## Make Combo Juice Type-Specific

Replace the generic `handleComboDetonated` with type-aware particle staggering — rocket combos get staggered line particles, bomb combos get ring-staggered particles, burst combos get sweep-staggered particles — all with enhanced intensity (heavier shake, zoom punch, confetti).

**Requirements**:
- Given a rocket-type combo, should stagger particles outward along the blast line at 42ms intervals with 14 particles per tile
- Given a bomb-type combo, should stagger particles by ring at 42ms intervals with 14 particles per tile
- Given a burst-type combo, should stagger particles in reading order at 52ms intervals with 22 particles per tile
- Given any combo, should apply heavier screen shake, zoom punch, and confetti on top of the type-specific pattern

---

## Fix Power-Up Sprite Tracking After syncBoard

`placePowerupSprite` (used by `syncBoard`) does not register sprites in `powerupPositionMap`, so `removePowerupAt` and `detachPowerupSprite` silently fail. All three removal paths — bomb, color_burst, and rocket — are broken because the sprite is never found.

**Requirements**:
- Given a board containing powerup cells, when `syncBoard` rebuilds the visuals, should register every powerup sprite in the position map so it is retrievable by grid position
- Given a bomb or color_burst powerup tap, should remove the powerup sprite immediately (no shrink/fade animation)
- Given a rocket powerup tap, should animate the rocket sprite flying in its effect direction before removal
