# Pop / Death Animation Scale Fix Epic

**Status**: ✅ COMPLETED
**Goal**: Fix visual artefacts where bubbles, power-ups, and obstacles scale
incorrectly before their death/pop animation plays.

## Bug Description

Bubble blocks and power-up sprites visually "jump" in size or shift position
before exploding. Two independent causes:

1. Juice animation targets use absolute scale values (1.05, 1.2, …) that
   assume the sprite's resting scale is 1. Sprites sized via `width/height`
   have a fitScale that differs from 1, causing a dramatic size jump.
2. Obstacle and power-up sprites use the default anchor (0, 0), so all scale
   animations grow/shrink from the top-left corner instead of center.

---

## Fix juice animation scale targets

**Requirements**:
- Given a bubble-block sprite whose resting scale differs from 1, the pop
  punch should scale relative to that resting scale (e.g. baseScale × 1.05)
- Given an egg sprite whose resting scale differs from 1, the crack animation
  should scale relative to that resting scale and restore to the same value
- Given any obstacle death animation, the shrink-to-zero target (0) is correct
  and needs no change

## Center sprite anchors for obstacle and power-up sprites

**Requirements**:
- Given an obstacle or power-up sprite placed on the board, it should scale
  from its visual center, not its top-left corner
- Given a power-up sprite that falls during gravity, the target position
  should account for the centered anchor
