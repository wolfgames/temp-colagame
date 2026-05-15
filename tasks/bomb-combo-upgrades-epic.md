# Bomb Combo Upgrades Epic

**Status**: 📋 PLANNED
**Goal**: Make bomb+bomb and bomb+pepper combos feel as satisfying and visually distinct as every other power-up combo.

## Overview

Why: Both combos currently animate with plain `popCellWithPunch` ring expansion — no popcorn projectiles, no fire, no personality. They feel inert compared to the rocket and colorblast combos. This epic upgrades their state logic and animations so each combo has a clear, readable identity that matches the game's visual language (popcorn = radial burst, pepper = fire sweep).

---

## Solo Bomb +1 Count Bug Fix

`detonateBomb` loops through the full 3×3 area including the bomb's own cell. The bomb is a powerup, so `clearAndCollect` adds it to `affectedCells`, inflating the count from 8 to 9 and over-scoring by one cell.

**Requirements**:
- Given a solo bomb detonation, should clear exactly 8 surrounding cells (the ring at radius 1) not including the bomb's own position
- Given a solo bomb detonation, `affectedCells.length` should be 8 (not 9) on a fully-filled board

---

## Bomb + Bomb Radius Bug Fix

The `bomb_bomb` combo uses `radius = 4` (a 9×9 area), when the correct pattern is radius 2: the inner 3×3 ring plus one outer ring = a 5×5 area total.

**Requirements**:
- Given bomb+bomb is triggered, should clear a 5×5 area (radius 2) centred on posA: inner square + outer square
- Given bomb+bomb is triggered, `affectedCells` should contain at most 25 cells on a fully-filled board (5×5 minus posA and posB which are pre-emptied)

---

## Bomb + Bomb Animation Upgrade

Upgrade the bomb+bomb combo animation from plain tile pops to the full popcorn projectile arc used by solo bombs.

**Requirements**:
- Given bomb+bomb is triggered, should animate with popcorn projectiles arc-flying to every affected cell (reuse `animateBombDetonation`)
- Given the upgraded animation, should pass `fxLayer` and popcorn textures through `animateComboDetonation` for the `bomb_bomb` case

---

## Bomb + Pepper State Upgrade

Change bomb+pepper from a radius-3 box clear to a full cross (row + column) plus a 3×3 center burst.

**Requirements**:
- Given bomb+pepper is triggered, should clear the full row AND full column through posA (cross pattern)
- Given bomb+pepper is triggered, should additionally clear the immediate 3×3 area around the origin (bomb's radial contribution)
- Given the state change, `affected` cells should be the deduplicated union of cross + center

---

## Pepper + Pepper (rocket_rocket) Full Clear Bug Fix

When two peppers (rockets) are mixed, each rocket should fire in both its row AND column directions. Currently only posA's row and column are cleared; posB's perpendicular direction (the unique column for horizontal neighbors, or unique row for vertical neighbors) is silently skipped.

**Requirements**:
- Given two horizontal pepper neighbors at (R, C1) and (R, C2), when combo fires, should clear row R, column C1, AND column C2
- Given two vertical pepper neighbors at (R1, C) and (R2, C), when combo fires, should clear row R1, row R2, AND column C
- Given the fix, `affectedCells` should include cells from posA's row, posA's column, posB's row, and posB's column (deduplicated)
- Given the fix, the animation should fire a rocket sweep for posB's perpendicular direction in addition to posA's cross

---

## Bomb + Pepper Animation Upgrade

Animate the new bomb+pepper combo with both visual identities firing simultaneously.

**Requirements**:
- Given bomb+pepper is triggered, should play popcorn burst animation for the center 3×3 cells (bomb identity)
- Given bomb+pepper is triggered, should play fire sweep along the full row and column (pepper identity, reuse `animateRocketDetonation`)
- Given both animations, should fire in parallel from the same origin
- Given the upgraded animation, should pass `fxLayer`, popcorn textures, and rocket texture through `animateComboDetonation` for the `rocket_bomb` case
