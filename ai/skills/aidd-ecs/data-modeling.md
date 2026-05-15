# Data modeling: components, resources, archetypes

Reference for modeling components, resources, and archetypes. Data modeling only — no transactions, systems, or higher-level plugin structure. See [SKILL.md](SKILL.md) for full plugin authoring.

---

## Particle simulation example

```ts
import { Database } from '@adobe/data/ecs';
import { Vec3, Vec4, F32 } from '@adobe/data/math';

const particleDataPlugin = Database.Plugin.create({
  components: {
    position: Vec3.schema,
    velocity: Vec3.schema,
    color: Vec4.schema,
    mass: F32.schema,
  },
  resources: {
    gravity: { default: 9.8 as number },
  },
  archetypes: {
    Particle: ['position', 'velocity', 'color', 'mass'],
  },
});
```

---

## Game entity example

```ts
import { Database } from '@adobe/data/ecs';
import { Vec2, F32 } from '@adobe/data/math';

const gamePlugin = Database.Plugin.create({
  components: {
    // Namespace schemas — numeric (linear memory, typed arrays)
    position: Vec2.schema,
    health: F32.schema,
    speed: F32.schema,

    // Inline schemas — strings and booleans
    spriteKey: { type: 'string', default: '' } as const,
    visible: { type: 'boolean', default: true } as const,
    interactive: { type: 'boolean', default: false } as const,

    // Transient — non-persistable values (DOM refs, runtime objects)
    canvasRef: { default: null as unknown as HTMLCanvasElement, transient: true },
  },
  resources: {
    gameName: { default: 'my-game' as string },
    score: { default: 0 as number },
    paused: { default: false as boolean },

    // Late-initialized resource (set in a system initializer)
    connection: { default: null as unknown as WebSocket },
  },
  archetypes: {
    Player: ['position', 'health', 'speed', 'spriteKey', 'visible'],
    Pickup: ['position', 'spriteKey', 'visible', 'interactive'],
  },
});
```

---

## Guidelines

- **Components**: Per-entity data. Use namespace schemas from `@adobe/data/math` (`Vec2`, `Vec3`, `F32`, `U32`, `I32`) for numeric values. Use inline `{ type, default } as const` for strings and booleans.
- **Resources**: Global state. Use **only** `{ default: value as Type }`. Use `null as unknown as Type` for resources initialized later in a system.
- **Archetypes**: One per entity kind. List all components that kind requires.
- **Transient**: Use `transient: true` for non-persistable values (DOM refs, WebSocket connections). These are excluded from serialization.
- **Inspector**: Include `spriteKey` (string) for entity display names and `position` (Vec2) for overlay positioning.
