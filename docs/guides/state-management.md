# State Management

> **Superseded:** This doc describes the pre-ECS signals-only pattern. For the current architecture where ECS is the source of truth and signals are a DOM bridge, see [state-architecture.md](state-architecture.md).

Patterns for managing game state with Solid.js signals.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  UI Layer (Solid.js Components)         │
│  - Reads signals reactively             │
│  - Dispatches actions                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Game State (Signals)                   │
│  - src/game/state.ts                    │
│  - Single source of truth               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Game Logic (Pixi.js)                   │
│  - CityLinesGame class                  │
│  - Updates state on events              │
└─────────────────────────────────────────┘
```

---

## Defining State

```typescript
// src/game/state.ts
import { createSignal } from 'solid-js';

// Game progress
export const [currentLevel, setCurrentLevel] = createSignal(1);
export const [score, setScore] = createSignal(0);
export const [moves, setMoves] = createSignal(0);

// Level state
export const [isComplete, setIsComplete] = createSignal(false);
export const [isPaused, setIsPaused] = createSignal(false);

// Derived state
export const isPlaying = () => !isComplete() && !isPaused();
```

---

## Reading State in UI

```tsx
// src/game/screens/GameScreen.tsx
import { score, moves, isComplete } from '../state';

function GameHUD() {
  return (
    <div class="hud">
      <span>Score: {score()}</span>
      <span>Moves: {moves()}</span>

      <Show when={isComplete()}>
        <div class="complete-overlay">Level Complete!</div>
      </Show>
    </div>
  );
}
```

---

## Updating State from Game

```typescript
// src/game/citylines/CityLinesGame.ts
import { setScore, setMoves, setIsComplete } from '../state';

class CityLinesGame {
  private onTileRotated() {
    setMoves(m => m + 1);

    if (this.checkWin()) {
      const bonus = this.calculateBonus();
      setScore(s => s + bonus);
      setIsComplete(true);
    }
  }
}
```

---

## Reacting to State Changes

```typescript
// Play sound when complete
createEffect(() => {
  if (isComplete()) {
    audioManager.playLevelComplete();
  }
});

// Pause game engine when paused
createEffect(() => {
  if (isPaused()) {
    game.pause();
  } else {
    game.resume();
  }
});
```

---

## Complex State Objects

For complex state, use a store:

```typescript
import { createStore } from 'solid-js/store';

interface LevelState {
  id: string;
  grid: TileState[][];
  objectives: Objective[];
  timeRemaining: number;
}

const [level, setLevel] = createStore<LevelState>({
  id: '',
  grid: [],
  objectives: [],
  timeRemaining: 0,
});

// Update nested state
setLevel('grid', 0, 0, 'rotation', 90);
setLevel('timeRemaining', t => t - 1);
setLevel('objectives', 0, 'completed', true);
```

---

## State Reset

```typescript
// Reset for new level
export function resetLevelState() {
  setMoves(0);
  setIsComplete(false);
  setIsPaused(false);
}

// Reset entire game
export function resetGameState() {
  setCurrentLevel(1);
  setScore(0);
  resetLevelState();
}
```

---

## Persistence

```typescript
// Save to localStorage
createEffect(() => {
  const state = {
    currentLevel: currentLevel(),
    score: score(),
  };
  localStorage.setItem('gameState', JSON.stringify(state));
});

// Load on startup
export function loadGameState() {
  const saved = localStorage.getItem('gameState');
  if (saved) {
    const state = JSON.parse(saved);
    setCurrentLevel(state.currentLevel);
    setScore(state.score);
  }
}
```

---

## Best Practices

| Do | Don't |
|----|-------|
| Keep state minimal | Store derived values |
| Update state in one place | Scatter setters everywhere |
| Use derived signals | Duplicate calculations |
| Reset state explicitly | Leave stale state |

---

## Debugging

```typescript
// Log all state changes (dev only)
if (import.meta.env.DEV) {
  createEffect(() => {
    console.log('State:', {
      level: currentLevel(),
      score: score(),
      moves: moves(),
      complete: isComplete(),
    });
  });
}
```

---

## Related

- [Debugging](./debugging.md)
- [Solid.js Store Docs](https://www.solidjs.com/docs/latest/api#createstore)
