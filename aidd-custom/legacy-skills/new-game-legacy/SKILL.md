---
name: new-game-legacy
description: >
  Legacy game setup via repo fork. Walk through the 12-step checklist to
  configure a forked scaffold repo for a new game: identity, config, tuning,
  audio, assets, screens, analytics, feature flags, and cleanup.
  This is NOT the prompt-to-play pipeline (see build-game for that).
  Use when: forking the scaffold repo, cloning for a new game, setting up a
  new project from an existing scaffold, choosing a tech stack for a new repo,
  or running the legacy /newgame workflow.
  Triggers on: newgame legacy, fork game, clone game, setup new repo, new game
  from scaffold, legacy game setup, configure forked repo.
user-invocable: true
compatibility: Requires git, bun/npm, and a cloned/forked copy of the scaffold repo.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# 🎮 New Game (Legacy Fork Setup)

Act as a senior game engineer to guide the user through setting up a new game
after forking or cloning the scaffold repo. This is the **legacy setup workflow**
— a manual, checklist-driven process distinct from the prompt-to-play
`build-game` pipeline.

## How This Differs from build-game

| | build-game (prompt-to-play) | new-game-legacy (this skill) |
|---|---|---|
| **Starting point** | An idea or prompt | A forked/cloned scaffold repo |
| **Process** | Automated design → build → polish pipeline | Manual 12-step configuration checklist |
| **Tech stack** | Predetermined by scaffold profile | User selects or confirms stack profile |
| **Output** | Complete playable game | Configured repo ready for game development |
| **Modifies code?** | Yes (heavy, multi-phase) | Guidance-first — shows what to change, user drives |
| **When to use** | "Build me a game from this idea" | "I forked the repo, help me set it up" |

Competencies {
  scaffold repo configuration
  game identity and branding setup
  analytics and feature flag wiring
  asset pipeline configuration
  tech stack selection guidance
}

Constraints {
  Read-only by default — show file paths, expected values, and code snippets.
  Only make changes when the user explicitly asks you to.
  Be specific — show exact file paths, expected values, and diffs.
  Reference the City Lines implementation as the working example.
  Walk through steps in order — do not skip ahead.
  Communicate each step as friendly markdown prose — not raw SudoLang syntax.
  Do ONE step at a time, get user approval before moving on.
}

## Step 0 — Pre-Flight

```sudolang
preFlight() => { repoReady, stackProfile } {
  1. Confirm the user has forked/cloned the scaffold repo
  2. Ask which scaffold profile to use:
     - **Lightning** (recommended): SolidJS + Pixi.js 8 + GSAP + Howler + Tailwind
     - **Game Client** (legacy): Preact + Pixi.js 8 + Zustand
     Read `aidd-custom/skills/scaffold-profiles/SKILL.md` for full profile details.
  3. Ask the user for their game name, slug, and display name
  4. Print the full 12-step checklist overview so the user knows what's ahead
}
```

## Step 1 — Game Identity

```sudolang
configureIdentity(gameName, gameSlug) => identity {
  Update `src/game/config/identity.ts`:

  GAME_ID            → analytics event tag (e.g. "word_quest")
  GAME_SLUG          → URL/storage key prefix (e.g. "wordquest")
  GAME_NAME          → display name (e.g. "Word Quest")
  GAME_CDN_PATH      → CDN path segment (auto-derived from GAME_SLUG)
  GAME_STORAGE_PREFIX → localStorage prefix (auto-derived from GAME_SLUG)

  Files that read from identity.ts (no changes needed if imports are correct):
  - scaffold/systems/telemetry/AnalyticsContext.tsx → GAME_ID, GAME_STORAGE_PREFIX
  - scaffold/systems/telemetry/FeatureFlagContext.tsx → GAME_STORAGE_PREFIX
  - game/analytics/trackers.ts → GAME_ID
  - game/analytics/index.ts → reads via param set defaults
}
```

## Step 2 — Game Config

```sudolang
configureGameConfig() => config {
  Update `src/game/index.ts`:

  gameConfig.screens       → map of screen name → component
  gameConfig.initialScreen → which screen loads first
}
```

## Step 3 — Tuning Defaults

```sudolang
configureTuning() => tuning {
  Update `src/game/tuning/types.ts` and `src/game/tuning/index.ts`:
  - Define GameTuning interface (game-specific tunable values)
  - Set GAME_DEFAULTS with sensible starting values
  - City Lines example: tile sizes, animation speeds, grid config
}
```

## Step 4 — Audio

```sudolang
configureAudio() => audio {
  Replace `src/game/audio/`:
  - sounds.ts → define sound/music assets
  - manager.ts → extend BaseAudioManager with game-specific methods
}
```

## Step 5 — Asset Manifest

```sudolang
configureAssets() => assets {
  1. Replace `public/assets/` with the game's sprites, fonts, images
  2. Follow the manifest contract (docs/core/manifest-contract.md)
     and asset naming convention (docs/guides/assets/naming-convention.md)
  3. Run `bun run check:assets` and `bun run check:manifest` to validate
  4. Update manifest in `src/game/asset-manifest.ts` to match new asset names
  5. Update font loading in `entry-client.tsx` — update font family/URL
}
```

## Step 6 — Screens

```sudolang
configureScreens() => screens {
  Replace `src/game/screens/`:
  - Keep the pattern: each screen is a SolidJS component
  - Wire them into gameConfig.screens (Step 2)
  - Screens access analytics via useAnalytics(), assets via useAssets()
}
```

## Step 7 — Analytics Trackers

```sudolang
configureTrackers() => trackers {
  Replace `src/game/analytics/trackers.ts`:
  - Define game-specific events (what matters for THIS game)
  - Use the same createTracker pattern with param sets
  - Keep base param set, replace/remove level_ctx and level_config as needed
}
```

## Step 8 — Analytics Context

```sudolang
configureAnalyticsContext() => analyticsContext {
  Update `src/game/analytics/index.ts`:
  - Replace CityLinesContext with the game's session state
  - Define own param set schemas (location, config, etc.)
  - Update addParamsDefault to read from the new context
}
```

## Step 9 — Analytics Provider

```sudolang
configureAnalyticsProvider() => analyticsProvider {
  Update `scaffold/systems/telemetry/AnalyticsContext.tsx`:
  - Replace City Lines tracker imports with new trackers
  - Update AnalyticsContextValue type with new tracker signatures
  - Update session_end override to include new session rollup counters
  - Update or remove survey logic if not needed
}
```

## Step 10 — Feature Flags

```sudolang
configureFeatureFlags() => featureFlags {
  Update `scaffold/systems/telemetry/FeatureFlagContext.tsx`:
  - Replace FeatureFlags interface with the game's flags
  - Update DEFAULT_FLAGS with defaults
  - Replace validators (isDifficultyVariant, etc.) with new ones
  - Update processFlags to read flag names from PostHog
  - Update ph.register() super properties
}
```

## Step 11 — Game Logic

```sudolang
replaceGameLogic() => gameLogic {
  Replace `src/game/citylines/` with the game's core:
  - This is 100% game-specific — no scaffold dependencies here
  - Game mechanics, rendering, state machine, etc.
}
```

## Step 12 — Clean Up

```sudolang
cleanUp() => done {
  - Delete `src/game/citylines/` (City Lines game logic)
  - Delete `src/game/shared/` components not needed
  - Delete City Lines level data from `public/levels/`
  - Update `public/` assets (favicon, manifest.json, etc.)
  - Run `bun run typecheck` and `bun run build` to verify clean state
}
```

newGameLegacy = preFlight |> configureIdentity |> configureGameConfig |> configureTuning |> configureAudio |> configureAssets |> configureScreens |> configureTrackers |> configureAnalyticsContext |> configureAnalyticsProvider |> configureFeatureFlags |> replaceGameLogic |> cleanUp

## What You DON'T Touch

These scaffold systems work as-is for any game:

```
scaffold/systems/assets/     ← asset loading pipeline
scaffold/systems/audio/      ← BaseAudioManager
scaffold/systems/screens/    ← screen transitions
scaffold/systems/pause/      ← pause state
scaffold/systems/errors/     ← error boundary + reporter
scaffold/systems/tuning/     ← dev tuning panel
scaffold/systems/manifest/   ← manifest provider
scaffold/lib/                ← gameKit, sentry, posthog bridge
scaffold/config/             ← environment, viewport
scaffold/ui/                 ← shared UI components
```

## localStorage Keys To Be Aware Of

These use `GAME_STORAGE_PREFIX` and will be unique per game:
- `{prefix}ff_{uid}` — feature flag cache
- `{prefix}survey_cd_{uid}` — survey cooldown
- `{prefix}progress` — game save data (if using progress system)
- `{prefix}has_played` — returning player flag
- `{prefix}tutorial-done` — tutorial completion flag

Commands {
  🎮 /new-game-legacy - walk through the 12-step legacy game setup checklist for a forked scaffold repo
}

### Exit Criteria (Given/Should)

- Given `src/game/config/identity.ts` is read, should contain the new game's ID, slug, and display name
- Given `src/game/index.ts` is read, should wire the new game's screens and initial screen
- Given `src/game/tuning/` is inspected, should define game-specific tuning types and defaults
- Given `src/game/citylines/` is checked, should not exist (deleted during cleanup)
- Given `bun run typecheck` is run, should produce zero errors
- Given `bun run build` is run, should produce a successful build
- Given `src/core/` is checked in git diff, should show zero modifications (except telemetry wiring in Steps 9-10)
