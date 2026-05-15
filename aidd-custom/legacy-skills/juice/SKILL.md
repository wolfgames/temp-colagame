---
name: juice
description: Visual feedback with particles, screen shake, and GSAP tweens. Use when adding juice effects, combo escalation, or animation polish. Triggers on: juice, particles, screen shake, scale punch, combo, GSAP, tweens, feedback, confetti, freeze frame, animation timing.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Juice -- Making Every Action Feel 10x More Impactful

Juice is the layered visual+audio reinforcement that makes every action feel 10x more impactful than it is. It's the gap between functional and delightful. Without juice: tap -> piece moves. With juice: tap -> piece SNAPS into place with a satisfying thunk, particles scatter, the board pulses.

## Jan Van Valkenburg's Rule

> Add juice until it feels slightly too much -- then pull back 10%.

Every player action should have SOME visual response. Reward moments should make the player FEEL rewarded, not just see a +1. Juice is communication through motion -- it tells the player "yes, that worked" before their conscious mind processes it.

## Feedback Tiers

### Tier 1: Subtle (Every Input)
Moments: every tap, every collection, every small interaction
Effects:
- **Scale punch**: `1.05x` scale for 50ms, then back to 1.0
- **Small particles**: 4-6 tiny particles in entity color
- **Number popup**: Score change floats up and fades

### Tier 2: Noticeable (Meaningful Events)
Moments: obstacle hit, combo trigger, power-up activation
Effects:
- **Screen shake**: Small (3-5px), short (100ms)
- **Color flash**: Brief tint change on affected entity
- **Freeze frame**: 2-frame pause for impact emphasis
- **Medium particles**: 8-12 particles with more spread

### Tier 3: Dramatic (Big Moments)
Moments: level complete, high score, game over, big combo
Effects:
- **Confetti burst**: Screen-wide particle celebration
- **Camera zoom**: Brief zoom in/out for emphasis
- **Slam effect**: Entity scales up then slams to normal
- **Screen shake**: Big (8-12px), sustained (200-300ms)

## Particle System

### Implementation with Pixi Graphics
Use the renderer's native graphics. No external particle engine.

```typescript
import gsap from 'gsap';
import { Container, Graphics } from 'pixi.js';

function particleBurst(
  stage: Container,
  x: number, y: number,
  color: number,
  count = 12
): void {
  for (let i = 0; i < count; i++) {
    const p = new Graphics();
    p.circle(0, 0, 3 + Math.random() * 3);
    p.fill(color);
    p.x = x;
    p.y = y;
    p.alpha = 1;
    stage.addChild(p);

    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const dist = 30 + Math.random() * 40;
    gsap.to(p, {
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      duration: 0.4 + Math.random() * 0.2,
      ease: 'power2.out',
      onComplete: () => { stage.removeChild(p); p.destroy(); },
    });
  }
}
```

### Particle Budget
- Max concurrent particles: 50-80 (mobile performance)
- Shapes: circle, square, star (from theme)
- Colors: ALWAYS from the theme palette
- Lifetime: 200-600ms (short bursts, not lingering)

## Screen Shake

```typescript
function screenShake(container: Container, intensity = 5): void {
  const origX = container.x;
  const origY = container.y;
  gsap.to(container, {
    x: origX + intensity,
    duration: 0.05,
    yoyo: true,
    repeat: 5,
    ease: 'power2.inOut',
    onComplete: () => {
      container.x = origX;
      container.y = origY;
    },
  });
}
```

### Intensity Scaling
| Event | Intensity (px) | Duration (ms) |
|-------|----------------|---------------|
| Small impact | 3-5 | 100 |
| Medium impact | 5-8 | 150 |
| Big impact | 8-12 | 200-300 |
| Fail/error | 2-3 | 80 |

## Scale Punch

Quick scale-up then elastic return. The most versatile juice effect.

```typescript
function popScale(target: Container, scale = 1.2): void {
  gsap.fromTo(target,
    { scaleX: scale, scaleY: scale },
    { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' }
  );
}
```

## Combo Escalation

Effects GROW with combo count. Multiplicative, not additive.

### Scaling Curves
| Combo | Particles | Shake | Popup Size | Pitch |
|-------|-----------|-------|------------|-------|
| 1x | 6 | 3px | 1.0x | Base |
| 2x | 10 | 5px | 1.2x | +10% |
| 3x | 16 | 7px | 1.4x | +20% |
| 4x | 24 | 10px | 1.7x | +30% |
| 5x+ | 32 | 12px | 2.0x | +40% |

### Max Escalation
Cap escalation at combo 5-8 to prevent performance issues. The visual difference between combo 5 and combo 10 should be minimal -- the score difference is enough.

## Animation Timing

### GSAP Easing (use these, don't write custom easings)
| Effect | Easing | Why |
|--------|--------|-----|
| Scale punch | `elastic.out(1, 0.4)` | Bouncy, satisfying overshoot |
| Particle spread | `power2.out` | Fast start, gentle stop |
| Screen shake | `power2.inOut` | Smooth oscillation |
| Number popup | `power1.out` | Float up naturally |
| Color flash | `linear` | Even on/off |
| Confetti | `power3.out` | Dramatic burst, slow settle |

### Duration Ranges
| Effect | Duration (ms) |
|--------|---------------|
| Scale punch | 200-400 |
| Color flash | 100-200 |
| Screen shake | 100-300 |
| Number popup | 600-1000 |
| Confetti | 800-1500 |
| Particle lifetime | 300-600 |

## Sound Sync

**All visual juice triggers on the same frame as corresponding audio.** This is critical for the brain to perceive the effect as a single "hit." Even 2 frames of desync breaks the illusion.

```typescript
// DO: simultaneous
playSound('reward');
particleBurst(stage, x, y, theme.colors.reward);
popScale(entity);

// DON'T: delayed
playSound('reward');
setTimeout(() => particleBurst(...), 50); // BROKEN - async desync
```

## Performance Rules

- **60fps on lowest target device**: Juice that drops frames is worse than no juice
- **Clarity over spectacle**: Player must always see the game state through effects
- **Object pooling**: Reuse particle objects to avoid GC pressure
- **Particle cleanup**: Always destroy particles on animation complete
- **GSAP cleanup**: Kill tweens in the destroy() function

## GSAP Usage Rules

- **Always static imports**: `import gsap from 'gsap'` -- never dynamic `import('gsap')`
- **Never write custom easing functions** -- GSAP has every easing you need
- **Use gsap.to(), gsap.from(), gsap.fromTo()** for all tweens
- **Use gsap.timeline()** for sequenced effects
- **Kill active tweens on cleanup**: `gsap.killTweensOf(target)` in destroy()

## What This Stage Produces

### Files Created
- `juice.ts` -- Particle emitter, screen shake, scale punch, combo escalation functions

### Files Modified
- `gameController.ts` -- Import juice effects, trigger on ludemic moments (REWARD, COLLIDE, FAIL, etc.)

### Stage Constraints
- **Native renderer**: Particles use Pixi Graphics, no external particle engine
- **Performance**: Must not drop below 55fps on mobile
- **Layered on top**: Juice adds to existing visuals, never replaces them
- **Sound coordinated**: Juice triggers align with sound triggers from sound stage
- **Skippable**: Effects must be disableable for accessibility (reduced motion)
- **No new action types**: Don't create ad-hoc action types. Trigger juice from state comparison or direct calls.
- **Static imports**: Always `import gsap from 'gsap'`, never dynamic imports

### Exit Criteria
- Reward triggers visible particle burst
- Screen shake fires on impact
- Tween animations ease smoothly (no linear tweens)
- Juice does not cause frame drops
- All effects coordinate (particles + shake + sound fire together)
- Particle colors match theme palette

## Execute

```sudolang
fn whenImplementingJuice() {
  Constraints {
    Read existing render code FIRST — list current entity shapes before adding particles (proof step)
    Particle shapes must match the game's visual vocabulary (if entities are triangles, particles are triangles)
    All tweens use GSAP with static imports — never dynamic import('gsap')
    Sound and visual juice must fire on the same frame — no setTimeout between them
    Juice must not modify game state or logic — it layers on top
    Combo escalation must follow the scaling curve from the design doc
    Particle budget must stay under 80 concurrent particles for mobile performance
  }
}
```

### Exit Criteria (Given/Should)

- Given a REWARD event, should trigger a visible particle burst with colors from the theme palette
- Given particles are rendered, should match the entity shape vocabulary (triangles if entities are triangles, not default squares)
- Given a screen shake triggers, should use the intensity from the design doc's tier table
- Given combo count increases, should scale particle count and shake intensity per the escalation curve
- Given a visual effect and its corresponding sound, should fire on the same animation frame (no desync)
- Given 80+ particles are active, should stop spawning new ones until count drops (budget enforcement)
- Given all GSAP imports are searched, should find only static `import gsap from 'gsap'` (no dynamic imports)
- Given the juice module is disabled (reduced motion), should render the game identically minus effects
