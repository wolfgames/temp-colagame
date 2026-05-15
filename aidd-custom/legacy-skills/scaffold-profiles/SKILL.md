---
name: scaffold-profiles
description: Lightning and game_client scaffold documentation. Use when setting up a new game project, choosing a scaffold, or looking up framework APIs. Triggers on: scaffold, lightning, game_client, SolidJS, Preact, project setup, setupGame, GameDeps, screen routing, createPixiAdapter, createProgressService, getStored, setStored.
user-invocable: false
allowed-tools: Read, Glob, Grep
---

# Scaffold Profile

**Stack**: SolidJS 1.x + Pixi.js 8.x + GSAP 3.x + Howler 2.x + jsfxr + Vite + TypeScript strict + Tailwind CSS v4

### Architecture
- **Core** (`src/core/`): Framework plumbing -- screens, audio, errors, settings, viewport, storage. DO NOT EDIT.
- **Modules** (`src/modules/`): Reusable building blocks -- primitives, logic, prefabs.
- **Game** (`src/game/`): Game-specific code. THIS IS WHAT YOU EDIT.

### Scaffold Layout
```
src/game/
  mygame-contract.ts                   # authoritative contract (interfaces + types)
  config.ts                            # game identity, screen wiring, manifest, CDN paths
  state.ts                             # SolidJS signal-based cross-screen state (score, level)
  asset-manifest.ts                    # asset bundle declarations (DOM/GPU/audio)
  index.ts                             # barrel export for game setup
  mygame/
    index.ts                           # barrel: re-exports setupGame + setupStartScreen
    screens/
      gameController.ts                # game controller (DOM or Pixi mode)
      startView.ts                     # start screen controller
      index.ts                         # barrel for screens
  screens/
    LoadingScreen.tsx                   # loading screen (auto-loads boot + theme bundles)
    StartScreen.tsx                     # start screen shell (mounts startView controller)
    GameScreen.tsx                      # game screen shell (mounts gameController)
    ResultsScreen.tsx                   # results/game-over screen (score display + replay)
    components/CompletionOverlay.tsx    # completion overlay component
    useGameData.ts                     # game data hook
    useCompanionDialogue.ts            # companion dialogue hook
  audio/
    manager.ts                         # GameAudioManager extends BaseAudioManager
    sounds.ts                          # SoundDefinition catalog
  tuning/
    types.ts                           # GameTuning interface + GAME_DEFAULTS
    index.ts                           # tuning barrel exports
  setup/
    AnalyticsContext.tsx                # analytics provider (PostHog skeleton)
    FeatureFlagContext.tsx              # feature flag provider (A/B testing skeleton)
    helper.ts                          # setup helpers
```

### Game Contract (mygame-contract.ts)

The contract defines the exact interfaces that `mygame/` must export. This is the authoritative type boundary between the scaffold and your game code.

```typescript
// --- Game Mode ---
type GameMode = 'dom' | 'pixi';
// 'dom'  — DOM/CSS-only game. No GPU init, no scene/core bundles.
// 'pixi' — PixiJS game. Requires initGpu(), expects core/scene bundles.

// --- Game Controller (used by GameScreen.tsx) ---
interface GameControllerDeps {
  coordinator: AssetCoordinatorFacade;
  tuning: { scaffold: ScaffoldTuning; game: GameTuningBase };
  audio: unknown;
  gameData: unknown;
  analytics: unknown;
}

interface GameController {
  init: (container: HTMLDivElement) => void;
  destroy: () => void;
  ariaText: () => string;      // reactive accessibility text
  gameMode?: GameMode;          // defaults to 'dom' if omitted
}

type SetupGame = (deps: GameControllerDeps) => GameController;

// --- Start Screen Controller (used by StartScreen.tsx) ---
interface StartScreenDeps {
  goto: (screen: string) => void;
  coordinator: AssetCoordinatorFacade;
  initGpu: () => Promise<void>;
  unlockAudio: () => void;
  loadCore: (onProgress?: (p: number) => void) => Promise<void>;
  loadAudio: (onProgress?: (p: number) => void) => Promise<void>;
  loadBundle?: (name: string, onProgress?: (p: number) => void) => Promise<void>;
  tuning: { scaffold: ScaffoldTuning; game: GameTuningBase };
  analytics: { trackGameStart: () => void };
}

interface StartScreenController {
  init: (container: HTMLDivElement) => void;
  destroy: () => void;
  backgroundColor: string;     // wrapper background color
}

type SetupStartScreen = (deps: StartScreenDeps) => StartScreenController;
```

**mygame/index.ts** must export:
- `setupGame` satisfying `SetupGame`
- `setupStartScreen` satisfying `SetupStartScreen`

### What the Scaffold Already Provides (DO NOT RECREATE)

| System | How to Use |
|--------|-----------|
| Screen routing + transitions | `goto('loading')`, `goto('start')`, `goto('game')`, `goto('results')` -- screen IDs are: **loading**, **start**, **game**, **results** (NO game_over screen) |
| Audio state (volume, mute) | `useAudio()` from core, persisted to localStorage |
| Asset loading + coordination | `deps.coordinator` -- `loadBundle()`, `loadCore()`, etc. via `AssetCoordinatorFacade` |
| Error boundaries | ScreenBoundary wraps each screen automatically |
| Settings panel | Already in app.tsx provider stack |
| localStorage persistence | `getStored(key, default)` / `setStored(key, val)` |
| Tuning system | `useTuning()` from core -- Tweakpane folders in dev mode |
| Game controller pattern | `setupGame(deps)` returns `{ init, destroy, ariaText, gameMode? }` |
| Start screen shell | StartScreen.tsx + startView.ts -- fill in branding |
| Game screen shell | GameScreen.tsx -- mounts gameController automatically |
| Results screen | ResultsScreen.tsx -- reads `gameState.score()`, offers Play Again / Main Menu |
| Loading screen | LoadingScreen.tsx -- auto-loads boot + theme, progress bar, skip-to-game support |
| GSAP animation | `import gsap from 'gsap'` -- ready for tweens/juice |
| Howler.js audio | Extend `GameAudioManager` in `audio/manager.ts`, define sounds in `audio/sounds.ts` |
| jsfxr synthesis | `import { sfxr } from 'jsfxr'` |
| Tailwind CSS v4 | Utility classes on SolidJS screen components |
| Pause overlay | `<PauseOverlay />` auto-rendered in GameScreen |
| Analytics | `useAnalytics()` from `setup/AnalyticsContext.tsx` |
| Feature flags | `useFeatureFlags()` from `setup/FeatureFlagContext.tsx` |
| Sprite button | `import { SpriteButton } from modules/primitives/sprite-button` |
| Progress service | `createProgressService<T>()` from `modules/logic/progress` |
| Level completion FSM | `createLevelCompletionController()` from `modules/logic/level-completion` |

### Asset Bundles

Bundle naming determines which loader handles assets:

| Prefix | Loader | Use for |
|--------|--------|---------|
| `boot-*` | DOM only | splash screen assets |
| `theme-*` | DOM only | branding/logo (loading screen, pre-GPU) |
| `scene-*` | GPU (Pixi) | game spritesheets, backgrounds, tiles, characters |
| `core-*` | GPU (Pixi) | in-game UI atlases |
| `fx-*` | GPU (Pixi) | particles, effects, VFX spritesheets |
| `audio-*` | Howler | sound effects, music |
| `data-*` | JSON | config files |

**Rules:**
- Bundle names must match `[a-z][a-z0-9-]*` -- only lowercase, digits, hyphens. NO underscores.
- Game atlases MUST use `scene-*` or `core-*` to be accessible via Pixi. Using `theme-*` for game atlases will silently fail.
- For single-asset GPU bundles, set `alias = bundle name` so Pixi lookups work.

### Audio

Extend `BaseAudioManager` with game-specific playback methods:

```typescript
// audio/manager.ts
import { BaseAudioManager } from '~/core/systems/audio';
import { SOUND_BUTTON_CLICK } from './sounds';

export class GameAudioManager extends BaseAudioManager {
  playButtonClick(): void {
    this.playSound(SOUND_BUTTON_CLICK);
  }
}
```

Define sounds as `SoundDefinition` objects:

```typescript
// audio/sounds.ts
import type { SoundDefinition } from '~/core/systems/audio';

export const SOUND_BUTTON_CLICK: SoundDefinition = {
  channel: 'audio-sfx-mygame',   // must match a bundle name in asset-manifest
  sprite: 'button_click',
  volume: 0.7,                    // optional, 0-1
};
```

### State Management

TWO patterns coexist. Use the right one for the right scope:

**1. Cross-screen state** -- SolidJS signals in `src/game/state.ts`

For data that must survive screen transitions (score, level, settings). Shared by GameScreen, ResultsScreen, etc.

```typescript
// state.ts
import { createSignal, createRoot } from 'solid-js';

export interface GameState {
  score: () => number;
  setScore: (score: number) => void;
  addScore: (amount: number) => void;
  level: () => number;
  setLevel: (level: number) => void;
  incrementLevel: () => void;
  reset: () => void;
}

export const gameState = createRoot(createGameState);
```

**2. Session state** -- closure variables inside gameController's `init()`

For data that only lives during one gameplay session (board state, active piece, timers, animation handles). Dies when `destroy()` is called.

```typescript
// mygame/screens/gameController.ts
export const setupGame: SetupGame = (deps: GameControllerDeps): GameController => {
  const [ariaText, setAriaText] = createSignal('Game loading...');
  let wrapper: HTMLDivElement | null = null;
  // Session state lives here as closure variables

  return {
    gameMode: 'dom',
    init(container: HTMLDivElement) {
      // More session state can be created here
    },
    destroy() {
      wrapper?.remove();
      wrapper = null;
    },
    ariaText,
  };
};
```

### Pixi Texture Lifecycle

When using `gameMode: 'pixi'`, you MUST follow this teardown order to avoid renderer crashes:

1. Kill GSAP tweens targeting the sprite
2. `removeChild()` from stage
3. `sprite.destroy()`
4. `coordinator.unloadBundle('scene-*')`

Failure causes: `Cannot read properties of null (reading 'alphaMode')`.

### Pixi Mode Template

When `gameMode: 'pixi'`, the game creates its own `Application` instance inside `init()`:

```typescript
import { Application, Graphics } from 'pixi.js';

export const setupGame: SetupGame = (deps: GameControllerDeps): GameController => {
  const [ariaText, setAriaText] = createSignal('Game loading...');
  let app: Application | null = null;

  return {
    gameMode: 'pixi',
    init(container: HTMLDivElement) {
      app = new Application();
      void app.init({ resizeTo: container, background: '#1a1a2e' }).then(() => {
        container.appendChild(app!.canvas as HTMLCanvasElement);
        // Build your scene graph here
      });
    },
    destroy() {
      app?.destroy(true, { children: true });
      app = null;
    },
    ariaText,
  };
};
```

### Tuning System

Game-specific tuning extends `GameTuningBase` in `tuning/types.ts`:

```typescript
import type { GameTuningBase } from '~/core/systems/tuning/types';

export interface GameTuning extends GameTuningBase {
  devMode: { skipStartScreen: boolean };
  screens: { startBackgroundColor: string; loadingBackgroundColor: string };
  // Add your game-specific tuning sections here
}

export const GAME_DEFAULTS: GameTuning = {
  version: '1.0.0',
  devMode: { skipStartScreen: false },
  screens: { startBackgroundColor: '#BCE083', loadingBackgroundColor: '#BCE083' },
};
```

Access tuning in screen components: `const tuning = useTuning<ScaffoldTuning, GameTuning>();`

### Start Screen Loading Pattern

The start screen is responsible for loading assets before navigating to gameplay:

```typescript
playBtn.addEventListener('click', async () => {
  playBtn.disabled = true;
  await deps.initGpu();        // initialize GPU (required for pixi mode)
  deps.unlockAudio();           // unlock audio context on user gesture
  await deps.loadCore();        // load core-* bundles
  try { await deps.loadAudio(); } catch { /* audio optional */ }
  deps.analytics.trackGameStart();
  deps.goto('game');
}, { once: true });
```

### Stage File Targets

#### Micro
```yaml
create:
  - src/game/mygame/gameState.ts          # pure step function
  - src/game/mygame/types.ts              # GameState, PlayerAction, LudemicEvent
modify:
  - src/game/mygame/screens/gameController.ts  # replace demo with real game
  - src/game/mygame/screens/startView.ts       # update branding
  - src/game/config.ts                         # set game identity
  - src/game/state.ts                          # add game-specific signals
```

#### Meso
```yaml
create:
  - src/game/mygame/levels.ts             # 3-5 level definitions
modify:
  - src/game/mygame/gameState.ts          # extend with level fields
  - src/game/mygame/types.ts              # add LevelDef, LevelStatus
  - src/game/mygame/screens/gameController.ts  # level lifecycle
```

#### Level Gen
```yaml
create:
  - src/game/mygame/levelGenerator.ts
  - src/game/mygame/levelValidator.ts
modify:
  - src/game/mygame/levels.ts             # attach proofs
  - src/game/mygame/types.ts              # SolvabilityProof, GenerationStrategy
```

#### Macro
```yaml
create:
  - src/game/mygame/progression.ts        # uses createProgressService
  - src/game/mygame/replay.ts
  - src/game/mygame/bots/randomBot.ts
  - src/game/mygame/bots/greedyBot.ts
  - src/game/mygame/bots/types.ts
modify:
  - src/game/mygame/gameState.ts
  - src/game/mygame/types.ts
  - src/game/mygame/screens/gameController.ts
```

#### UI (Visual Design)
```yaml
create:
  - src/game/mygame/theme.ts              # color tokens + typography
  - src/game/mygame/sprites.ts            # visual ludeme factories
modify:
  - src/game/mygame/screens/gameController.ts  # use sprites + theme
  - src/game/mygame/screens/startView.ts       # apply theme
  - src/game/screens/StartScreen.tsx             # tailwind theme classes
  - src/game/screens/GameScreen.tsx              # tailwind theme classes
```

#### Sound
```yaml
create:
  - src/game/audio/sounds.ts              # SoundDefinition catalog (already exists, extend it)
modify:
  - src/game/audio/manager.ts             # add playback methods
  - src/game/mygame/screens/gameController.ts  # wire sound triggers
```

#### Juice
```yaml
create:
  - src/game/mygame/juice.ts              # particles + shake via GSAP
modify:
  - src/game/mygame/screens/gameController.ts  # trigger juice on events
```

#### Lifecycle
```yaml
modify:
  - src/game/screens/ResultsScreen.tsx     # customize results display
  - src/game/mygame/screens/gameController.ts  # goto('results') on end
  - src/game/mygame/screens/startView.ts       # polish branding
  - src/game/state.ts                          # add end-of-game signals
```

#### FTUE
```yaml
create:
  - src/game/mygame/tutorial.ts
modify:
  - src/game/mygame/screens/gameController.ts  # wire tutorial
```

#### Attract
```yaml
create:
  - src/game/mygame/attractMode.ts
modify:
  - src/game/mygame/screens/startView.ts   # mount attract behind title
  - src/game/screens/StartScreen.tsx        # pass coordinator for attract
```

### Build Commands
```bash
bun run dev        # dev server
bun run typecheck  # type check
bun run build      # production build
bun run test       # run tests
```

### Available Modules

Reusable building blocks in `src/modules/`:

| Category | Module | Description |
|----------|--------|-------------|
| primitives | `sprite-button` | Pressable sprite with press/release animations |
| primitives | `dialogue-box` | 9-slice speech bubble |
| primitives | `character-sprite` | Atlas-based character rendering |
| primitives | `progress-bar` | Segmented progress display |
| logic | `level-completion` | playing -> completing -> complete state machine |
| logic | `progress` | Versioned save/load (`createProgressService`) |
| logic | `catalog` | Ordered content navigation |
| logic | `loader` | Fetch + transform pipeline |
| prefabs | `avatar-popup` | Character avatar popup |

### Stack Override Rule

If spec artifacts reference "zustand", "preact", or "game_client" -- IGNORE those. They were generated before the scaffold switch. This scaffold uses:
- **UI**: SolidJS (NOT Preact, NOT React)
- **State**: SolidJS signals for cross-screen + closure-based for session (NOT zustand)
- **Persistence**: getStored/setStored (NOT zustand persist)
- **Routing**: ScreenProvider + `goto()` (NOT zustand store)
- **Assets**: `deps.coordinator` (NOT `deps.renderer`)

### Common Fix Patterns

| Problem | Solution |
|---------|----------|
| SolidJS JSX errors | Ensure file is `.tsx` with `vite-plugin-solid` configured |
| Type-only import used as value | Change to regular import |
| Unicode escape in code | Use literal character instead |
| Module not found | Check import path -- use `~/game/`, `~/core/`, `~/modules/` aliases |
| SolidJS destructured props | Access as `props.foo`, never destructure |
| Asset loading | Use `deps.coordinator.loadBundle()`, not a renderer |
| BaseProgress constraint | Add `version: number` to progress data type |
| setupGame contract | Return `{ init, destroy, ariaText, gameMode? }` |
| setupStartScreen contract | Return `{ init, destroy, backgroundColor }` |
| "possibly undefined" | Initialize state variables in closure or use `createSignal` with default |
| Dynamic import warning | Use static `import gsap from 'gsap'` |
| Pixi alphaMode crash | Follow teardown order: kill GSAP -> removeChild -> destroy -> unloadBundle |
| Wrong screen ID | Use `results` (NOT `game_over`) -- only 4 screens: loading, start, game, results |
| Pixi Application setup | Create `new Application()` in `init()`, call `app.init()`, append `app.canvas` |

## Execute

```sudolang
fn whenSettingUpScaffold() {
  Constraints {
    Never recreate systems the scaffold already provides (screen routing, audio, persistence, assets)
    Game code lives in src/game/ — never modify src/core/
    Cross-screen state uses SolidJS signals in state.ts
    Session state uses closure variables inside gameController
    Use SolidJS for screen components, not React or Preact
    Use getStored/setStored for persistence, not zustand persist
    Use deps.coordinator for asset loading, not deps.renderer
    Screen IDs are: loading, start, game, results — there is NO game_over screen
    If spec artifacts reference zustand/preact/game_client, ignore — use scaffold patterns
    Pixi games create their own Application instance in init(), not via an adapter
  }
}
```

### Exit Criteria (Given/Should)

- Given `src/core/` files are checked in git diff, should show zero modifications
- Given the game's cross-screen state is inspected, should use SolidJS signals in `state.ts`
- Given the game's session state is inspected, should use closure variables in `gameController.ts`
- Given screen navigation is implemented, should use `goto('start')`, `goto('game')`, `goto('results')` from `useScreen()`
- Given persistence is implemented, should use `getStored`/`setStored` (not zustand persist or raw localStorage)
- Given the UI framework in `.tsx` files is inspected, should be SolidJS (not React, not Preact)
- Given the scaffold's existing systems are listed, should have zero reimplementations in `src/game/`
- Given `config.ts` is inspected, should contain the game's identity (GAME_ID, GAME_SLUG, GAME_NAME, screen wiring)
- Given `mygame/index.ts` exports are inspected, should export `setupGame` (type `SetupGame`) and `setupStartScreen` (type `SetupStartScreen`)
- Given `mygame-contract.ts` types are used, should reference `GameControllerDeps` (not `GameDeps`) and `deps.coordinator` (not `deps.renderer`)
- Given asset bundles are declared, should follow naming convention (`scene-*`, `core-*`, `audio-*`, `theme-*`) with no underscores in bundle names
