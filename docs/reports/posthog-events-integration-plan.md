# ClearPop PostHog Events — Integration Report

Status as of 2026-05-04 against the [Notion spec](https://www.notion.so/wolfgames/ClearPop-PostHog-Events-Integration-Report-3534a33771998197bcd5ce53935b275f) and the [event schema doc](https://www.notion.so/3514a33771998075936dd77cb3f8cb27).

## TL;DR

Implementation cherry-picked from template-amino commit [`8f6e78d`](https://github.com/wolfgames/template-amino/commit/8f6e78d2248dfec0176adcc059765c7b50efe948) (May 1, 2026) — earlier session built it there. Now applied to game-amino-clearpop.

- **16 schemas** added to [src/game/setup/events.ts](../../src/game/setup/events.ts) (slim — no auto-attached fields).
- **16 trackers** registered in [src/game/setup/tracking.ts](../../src/game/setup/tracking.ts) plus the 5 framework lifecycle trackers.
- **9 events wired** in [src/game/clearpop/GameController.ts](../../src/game/clearpop/GameController.ts) and [startView.ts](../../src/game/mygame/screens/startView.ts).
- **7 events schema-only** (deferred — no UI yet, or no reliable hook).
- Typecheck: 0 new errors introduced; pre-existing errors unrelated.
- PostHog API key wiring still required (run `amino-posthog` skill).

## Verification against the Notion spec

### Required events (per spec)

| Spec event | Status | Where it lives |
|---|---|---|
| `session_start` | ✅ Auto-fires | Framework `session-tracker.ts` |
| `session_end` | ✅ Auto-fires | Framework `session-tracker.ts` |
| `game_start` | ✅ Wired | [startView.ts:111](../../src/game/mygame/screens/startView.ts#L111) |
| `game_end` | ✅ Wired | Run id + Main Menu (`exit`) + `beforeunload` (`abandoned`) + destroy fallback |
| `level_start` | ✅ Wired | [GameController.ts:286](../../src/game/clearpop/GameController.ts#L286) — fires with `is_retry`/`retry_count` |
| `level_end` | ✅ Replaced | Split into `level_complete` + `level_fail` per integration report recommendation |
| `level_complete` | ✅ Wired | [GameController.ts:347](../../src/game/clearpop/GameController.ts#L347) |
| `level_fail` (moves_exhausted) | ✅ Wired | [GameController.ts:392](../../src/game/clearpop/GameController.ts#L392) |
| `level_fail` (board_blocked) | ✅ Wired | [GameController.ts:426](../../src/game/clearpop/GameController.ts#L426) |
| `move_made` (group_clear) | ✅ Wired | [GameController.ts:707](../../src/game/clearpop/GameController.ts#L707) |
| `move_made` (powerup_activation) | ✅ Wired | [GameController.ts:879](../../src/game/clearpop/GameController.ts#L879) |
| `move_made` (powerup_combo) | ✅ Wired | [GameController.ts:1040](../../src/game/clearpop/GameController.ts#L1040) |
| `powerup_generated` | ✅ Wired | [GameController.ts:717](../../src/game/clearpop/GameController.ts#L717) |
| `powerup_activated` | ✅ Folded | Into `move_made` with `move_type: 'powerup_activation'` |
| `powerup_combo_activated` | ✅ Folded | Into `move_made` with `move_type: 'powerup_combo'` + `combo_pair` |
| `board_blocked` | ✅ Wired | [GameController.ts:422](../../src/game/clearpop/GameController.ts#L422) |
| `screen_enter` | ✅ Auto-fires | Framework + manual tracker registered |
| `screen_exit` | ✅ Auto-fires | Framework + manual tracker registered |

### Gap-fill events (from integration report)

| Event | Status | Notes |
|---|---|---|
| `invalid_tap_summary` | ✅ Wired | Rolled up — fires once per level on complete/fail with count + last response time. [Three call sites](../../src/game/clearpop/GameController.ts#L357) |
| `cascade_chain_completed` | ⚠️ Schema only | Not yet fired — needs `executePowerUp` / `executeComboAction` to surface chain depth |
| `level_restart` | ✅ Folded | Rolled into `level_start` via `is_retry`/`retry_count` (one event, not two) |
| `game_pause` / `game_resume` | ⚠️ Schema only | No in-game pause button distinct from tab-hidden |
| `tutorial_step` | ⚠️ Schema only | FTUE not built |
| `share_clicked` / `share_completed` | ⚠️ Schema only | Share UI not built |
| `hint_used` / `booster_used` | ⚠️ Schema only | Boosters not built |

### Slimming applied

Per the integration report, every event drops these auto-attached fields:

`session_id`, `user_id`, `game_name`, `platform`, `event_id`, `timestamp`, `session_elapsed`

PostHog auto-attaches `$session_id`, `$session_duration`, `distinct_id`, geo data, browser/device. Base params (`game_name`, `game_slug`, `environment`, `session_elapsed`) auto-attach via `['base']` param-set on every tracker.

Additional fields dropped because derivable in HogQL:
- `move_made`: `current_score`, `win_progress`, `moves_remaining`, `time_remaining`
- `level_complete`/`level_fail`: `total_cells_cleared` (from `move_made`)
- `game_end`: `levels_completed`, `total_score_earned`, `longest_combo_chain`, `powerups_*` (all from `move_made`/`level_*` aggregations)

### Naming decisions

- **Framework names over spec names**: `level_complete` + `level_fail` (not `level_end` with `level_end_state`). Cross-game dashboards work without a discriminator.
- **Folded combo flow**: One `move_made` per tap with `move_type` discriminator instead of three separate events. Lower volume, simpler queries.
- **`invalid_tap_summary`** (not `invalid_tap`): batched per level to avoid event volume on every miss-tap.

## What's left

1. **`cascade_chain_completed` wiring** — surface `chainReactions.length` from `executePowerUp` / `executeComboAction` results, fire after the cascade resolves
2. **`error` `game_end_state`** — wire from a global error boundary so unhandled crashes record as a terminal `game_end_state: 'error'` (currently only `exit` and `abandoned` are wired)
3. **PostHog API key** — run `amino-posthog` skill with the ClearPop project's key + host
4. **Manual smoke test** — open PostHog dashboard, play a level, confirm events arrive with expected shapes

## Open questions for the designer

1. **`game_end` semantics on Main Menu** — after win (advance possible), is tapping Main Menu `'exit'` or just `session_end`? Current schema expects `'exit'`.
2. **Run vs session** — does retry-after-fail count as one run or restart the run?
3. **Cascade depth metric** — track chain count, or just total cells cleared?

## File inventory

| File | Change |
|---|---|
| [src/game/setup/events.ts](../../src/game/setup/events.ts) | +177 lines, 16 ClearPop schemas |
| [src/game/setup/tracking.ts](../../src/game/setup/tracking.ts) | +71 lines, 16 trackers + interface |
| [src/game/mygame-contract.ts](../../src/game/mygame-contract.ts) | Analytics typed as `GameTracking` |
| [src/game/mygame/screens/startView.ts](../../src/game/mygame/screens/startView.ts) | Pass `start_source` + `is_returning_player` to `trackGameStart` |
| [src/game/clearpop/GameController.ts](../../src/game/clearpop/GameController.ts) | +155 lines initial + game_end follow-up: run id, Main Menu / beforeunload / destroy hooks |
