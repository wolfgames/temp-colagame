# Stale Docs Audit: CityLines / DailyDispatch / getUserData

**Status**: 📋 PLANNED
**Date**: 2026-03-25
**Context**: template-amino is a scaffold — docs should reference generic `mygame` patterns, not retired games.

## Summary

20+ doc files reference CityLines and/or DailyDispatch as if they're the active game. These games have been archived/removed. Docs should use `mygame` as the generic reference or be moved to an archive.

Additionally, `getUserData` / `helper.ts` references will be stale once ENG-1626 merges.

---

## Files to update (generalize away from CityLines/DailyDispatch)

### High priority — core architecture docs read by agents

| File | Issue |
|------|-------|
| `docs/core/deep-dive.md` | 50+ CityLines/DailyDispatch references. Diagrams, class structures, sequence charts all use CityLinesGame/DailyDispatchGame |
| `docs/core/scene-graph.md` | Mermaid diagram has `CityLinesGame` as main container |
| `docs/core/architecture-map.md` | Mermaid subgraph labeled `CityLinesGame` |
| `docs/core/entry-point-map.md` | Mermaid diagram references `CityLinesGame` |
| `docs/core/amino-architecture.md` | Examples use `DailyDispatchTuning`, `sfx-daily-dispatch`, `CityLinesGame` |
| `docs/core/scaffold-overview-and-migration.md` | Section "Current Game Structure (CityLines)" with full directory tree |
| `docs/core/entry-points.md` | May reference CityLines in boot sequence |

### Medium priority — guide docs

| File | Issue |
|------|-------|
| `docs/guides/development/state-management.md` | Code examples use `CityLinesGame` class |
| `docs/guides/development/debugging.md` | Code example references `src/game/citylines/CityLinesGame.ts` |
| `docs/guides/progress-persistence.md` | Entire guide uses CityLines as reference impl. 10+ mentions |
| `docs/core/systems/screens.md` | Example instantiates `CityLinesGame` |
| `docs/core/systems/viewport-mode.md` | References `CityLinesGame.autoSizeToViewport()` |
| `docs/core/manifest-contract.md` | Examples use `atlas-tiles-daily-dispatch.json`, `sfx-citylines.json` |

### Low priority — game-specific docs (consider archiving entirely)

| File | Action |
|------|--------|
| `docs/game/daily-dispatch-engine.md` | Archive or delete — documents retired game engine |
| `docs/game/chapter-generation.md` | Archive — DailyDispatch chapter system |
| `docs/game/fallback-patrol-chapters.md` | Archive — DailyDispatch specific |
| `docs/game/cdn-chapter-loading-plan.md` | Archive — DailyDispatch specific |
| `docs/game/gdd.md` | Links to daily-dispatch prototype. Generalize or archive |
| `docs/game/analytics-requirements.md` | Every event payload hardcodes `"game_name": "city_lines"`. Generalize to `mygame` |

---

## Approach

For each file:
1. Replace `CityLinesGame` → `MyGame` (or generic name) in examples
2. Replace `DailyDispatchGame` → `MyGame` in examples
3. Replace game-specific asset names (`atlas-tiles-daily-dispatch`, `sfx-citylines`) with generic equivalents
4. Replace `src/game/citylines/` paths with `src/game/mygame/`
5. Move retired game-specific docs to `docs/archive/` or delete

Keep the patterns and architecture explanations — just swap the concrete game names for scaffold-generic ones.
