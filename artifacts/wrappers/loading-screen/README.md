# Wrapper Template: Loading Screen

First thing the player sees. Preloads assets (GPU textures, audio, config) with a progress bar. Transitions to title screen when all bundles are loaded.

## When to Use

- Every game needs this — it's the entry point
- Shown once at app boot
- May re-appear between major asset swaps (e.g. zone change with new tileset)

## Screen Flow

```
[app launch] → loading-screen → [all bundles loaded] → title-screen
```

## Integration Steps

1. Copy `screen-patterns.tsx` into your game's `screens/` directory
2. Adapt only lines marked `// ADAPT:` — bundle list, background color, logo asset
3. Copy `screen-animation.css` for progress bar and entrance animations
4. Wire bundle loading to your asset coordinator
5. Call `goto('start')` when all bundles complete

## Locked vs Adaptable

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED — do not change values, logic, or structure:             │
│   - Progress bar: smooth fill, 200ms transition per step        │
│   - Spinner shown during indeterminate phases                   │
│   - Error state: retry button after 10s timeout or load failure │
│   - Logo entrance: 400ms, power2.out, fade + scale              │
│   - Progress bar entrance: 300ms, power2.out                    │
│   - Exit: 400ms fade-out before screen transition               │
│   - Bundle loading order: boot → theme → core → audio           │
│   - Never show raw loading percentages — use progress bar only  │
│                                                                 │
│ ADAPTABLE — change only where marked // ADAPT:                  │
│   - Background color or gradient                                 │
│   - Logo image path                                              │
│   - Bundle names and loading order                               │
│   - Whether to show a loading tip/hint                           │
│   - Retry button label                                           │
│   - Skip-to-game for dev mode (tuning flag or URL param)         │
│                                                                 │
│ If you find an improvement, do NOT apply it in the game.        │
│ Note it for archetype evolution instead.                        │
└─────────────────────────────────────────────────────────────────┘
```

## Layout Structure

```
┌──────────────────────────────┐
│                              │
│                              │
│          [Logo]              │  centered, 40% from top
│                              │
│       Loading...             │  status text
│                              │
│    ┌────────████───────┐     │  progress bar (60% from top)
│    └───────────────────┘     │
│                              │
│      Tip: Bigger groups      │  optional loading tip
│      earn more points!       │
│                              │
│                              │
│       ┌──────────┐           │  only on error
│       │  Retry   │           │
│       └──────────┘           │
└──────────────────────────────┘
```

## Bundle Loading Pattern

```typescript
// ADAPT: bundle names to match your asset manifest
const BUNDLE_ORDER = ['boot', 'theme', 'core', 'audio'];

async function loadBundles(coordinator, onProgress) {
  const total = BUNDLE_ORDER.length;
  for (let i = 0; i < total; i++) {
    await coordinator.loadBundle(BUNDLE_ORDER[i]);
    onProgress((i + 1) / total);
  }
}
```

## Animation Timing Reference

| Animation | Duration | Ease | Delay |
|-----------|----------|------|-------|
| Logo entrance | 400ms | power2.out | 200ms |
| Status text fade | 200ms | power2.out | 400ms |
| Progress bar entrance | 300ms | power2.out | 500ms |
| Progress bar fill step | 200ms | power2.out | — |
| Loading tip fade | 300ms | power2.out | 800ms |
| Error state entrance | 300ms | power2.out | — |
| Exit fade-out | 400ms | power2.in | 0ms |
