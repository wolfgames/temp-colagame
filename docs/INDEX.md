# Docs Index

---

## Standards (rules to follow)

| Doc | What it covers |
|-----|----------------|
| [best-practices.md](standards/best-practices.md) | Project structure, assets, modules, game contract, animation |
| [guardrails.md](standards/guardrails.md) | 18 anti-patterns that silently break games |
| [performance.md](standards/performance.md) | 60fps optimization, profiling, memory management |
| [mobile.md](standards/mobile.md) | Viewport, gestures, keyboard, canvas resize, pull-to-refresh |

## Guides (how to do things)

| Doc | What it covers |
|-----|----------------|
| [game-kit-setup.md](guides/game-kit-setup.md) | GitHub Packages config for @wolfgames/* |
| [new-game.md](guides/new-game.md) | Step-by-step guide for creating a new game |
| [naming-convention.md](guides/naming-convention.md) | Asset file naming rules |
| [state-management.md](guides/state-management.md) | Solid.js signals and stores |
| [animation-cookbook.md](guides/animation-cookbook.md) | GSAP patterns for game feel |
| [shared-components.md](guides/shared-components.md) | Using modules from src/modules/ |
| [state-architecture.md](guides/state-architecture.md) | ECS state management, plugin authoring, signal bridge, lifecycle |
| [debugging.md](guides/debugging.md) | DevTools, TuningPanel, common issues |
| [troubleshooting.md](guides/troubleshooting.md) | Common errors and fixes |

## Architecture

| Doc | What it covers |
|-----|----------------|
| [architecture.md](core/architecture.md) | 3-tier design, contracts, provider stack, extension rules |
| [entry-points.md](core/entry-points.md) | How the app boots |
| GameKit API | See `repos/game-kit/` — auth, analytics, assets, Sentry, data CRUD |

## Reports

| Doc | What it covers |
|-----|----------------|
| [clearpop-ecs-integration.md](reports/clearpop-ecs-integration.md) | ECS entity inspection, Inspector usage, debug patterns |
| [clearpop-ecs-migration.md](reports/clearpop-ecs-migration.md) | Migration path from signals to ECS |

## Modules

| Doc | What it covers |
|-----|----------------|
| [modules/index.md](modules/index.md) | Module system overview, categories |
| [modules/writing-a-module.md](modules/writing-a-module.md) | How to create a new module |

## Recipes (reusable implementation patterns)

| Doc | What it covers |
|-----|----------------|
| [progress-persistence.md](recipes/progress-persistence.md) | Save/load with createVersionedStore, migration, mid-level state |
| [manifest-contract.md](recipes/manifest-contract.md) | Asset manifest spec — bundle naming, path rules, validation |
| [asset-pipeline.md](recipes/asset-pipeline.md) | TexturePacker export settings, spritesheet workflow |
| [audio-setup.md](recipes/audio-setup.md) | Howler audio sprite format, dual-format encoding |

## Factory Commands

| Command | What it does |
|---------|--------------|
| [/naming](factory/naming.md) | Asset naming convention reference |
| [/newgame](factory/newgame.md) | Setup checklist for forking a new game |
| /newmodule | Scaffold a new module (see `.cursor/skills/amino-new-module/`) |
| [/commit](factory/commit.md) | Conventional commit format |
| [/deploy](factory/deploy.md) | Deploy to QA/staging/production |

See [factory/index.md](factory/index.md) for the full command reference.
