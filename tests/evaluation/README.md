# Scaffold evaluation test suite

Automated runtime evaluation of the game (whatever lives under `src/game/`) against scaffold modifications. **No code in `src/game/` is changed** — the suite only evaluates behavior.

All Playwright e2e tests live here. There is a single Playwright config (`evaluation/playwright.config.ts`) and a single test directory (`evaluation/tests/`).

## Inputs

1. **Game name** — e.g. `mygame`, `dailydispatch`. Used for labeling and storing results under `evaluation-results/<gameName>/`.
2. **Modification (description or id)** — e.g. `unload-bundles` or `smoke`. Selects which tests run (see `modification-suites.ts`).

## Flow

1. **Before modification:** Run the evaluation with `--phase before`. Results are saved to `evaluation-results/<game>/<modification>/before.json`.
2. **Apply your scaffold change** (in `src/core/` or `src/modules/`, not in `src/game/`).
3. **After modification:** Run again with `--phase after`. Results go to `evaluation-results/<game>/<modification>/after.json`.
4. **Compare and report:** Run the report step. It compares before vs after and prints (and optionally writes) a markdown report.

## Commands

All from project root:

```bash
# Run evaluation (starts app via Playwright webServer, runs tests, saves JSON)
bun run evaluate -- --game mygame --modification smoke --phase before
bun run evaluate -- --game mygame --modification smoke --phase after

# Compare and report (use same game + modification to read before/after from default paths)
bun run evaluate:report -- --game mygame --modification smoke

# Or with explicit paths
bun run evaluate:report -- --before evaluation-results/mygame/smoke/before.json --after evaluation-results/mygame/smoke/after.json

# Write report to file
bun run evaluate:report -- --game mygame --modification smoke --output report.md
```

## Using an existing dev server

If you prefer to start the app yourself (e.g. `bun run dev` in another terminal):

```bash
EVALUATION_BASE_URL=http://localhost:5173 bun run evaluate -- --game mygame --modification smoke --phase before
```

Playwright will not start its own webServer when `EVALUATION_BASE_URL` is set.

## Modification suites

Defined in `modification-suites.ts`. Each suite has an `id`, `description`, and a Playwright `grep` pattern. Tests are tagged in specs (e.g. `test.describe('@smoke', () => { ... })`).

| Id              | Description |
|-----------------|-------------|
| `smoke`         | App loads, screens visible, no crash |
| `unload-bundles`| Unload behavior: reload/navigate without crash |

To add a new modification: add an entry to `MODIFICATION_SUITES` and add E2E tests under `evaluation/tests/` with the matching tag.

## Result layout

- **Run result** (`before.json` / `after.json`): `EvaluationRunResult` — runId, gameName, modificationId, phase, timestamp, results[], summary.
- **Report**: Markdown summary with totals, regressions, fixed, added, removed.

## Constraints

- Nothing in `src/game/` is modified by this suite.
- All steps are automated; no manual test execution.
