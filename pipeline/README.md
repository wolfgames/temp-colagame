# Pipeline

This folder contains every artifact produced and consumed by the game development pipeline. It was scaffolded on first run — edit freely.

## Skills

| Skill | Type | What it does | Invocation |
|-------|------|-------------|------------|
| **pipeline-create-gdd** | skill | Creates a Game Design Document through guided steps | `/pipeline-create-gdd` |
| **pipeline-build-game** | skill | Builds GDD features onto the project through phased sub-agents | `/pipeline-build-game` |
| **pipeline-report** | skill | Generates a structured run report for pipeline iteration | `/pipeline-report` |
| **pipeline-improve** | skill | Reads a run report and outputs prioritized improvements (+ `--audit`) | `/pipeline-improve` |

Each skill's own `README.md` lives beside its `SKILL.md` (in `.cursor/skills/pipeline-*/` or equivalent host location).

## Workflow

```
1. Create GDD        /pipeline-create-gdd        → game-prompt.md
2. Build game        /pipeline-build-game        → runs/run-<NN>/
3. Generate report   /pipeline-report            → runs/run-<NN>/pipeline-report.md
4. Improve           /pipeline-improve           → prioritized fixes
5. (optional) Audit  /pipeline-improve --audit   → health check
```

### Step by step

1. **Create GDD** — Run `pipeline-create-gdd` (step-by-step or full generation). Outputs `game-prompt.md`.
2. **Build game** — Run `pipeline-build-game`. Accepts an inline chat prompt and routes thin prompts through `pipeline-create-gdd` first (see `gdd-gate` config). Creates `runs/run-<NN>/` and executes phases. Auto-scaffolds this folder on first run.
3. **Generate report** — Run `pipeline-report` after a run. Captures user feedback + phase outcomes into the run directory.
4. **Improve** — Run `pipeline-improve`. Reads the latest run's reports and outputs prioritized improvements.
5. **Audit** — Run `pipeline-improve --audit`. Scans all pipeline assets for staleness, naming drift, broken references, and schema violations.

## Folder Structure

```
pipeline/
├── README.md                       # this file
├── game-prompt.md                  # GDD input (shared across runs)
├── game-prompt-draft.md            # (optional) raw chat brief awaiting GDD generation
├── configs/
│   ├── pipeline-config.yml         # runtime behavior (pass, gdd-gate, skip, trace, think-only, debug)
│   └── gdd-config.yml              # GDD section enablement
└── runs/
    ├── run-01/
    │   ├── pipeline-context.yml    # project snapshot (owned by 10-prime)
    │   ├── phase-summary.yml       # per-phase structured handoff
    │   ├── gdd-analysis.yml        # feature delta
    │   ├── implementation-plan.yml # vertical-slice batches
    │   ├── run-log.yml             # at-a-glance phase status
    │   ├── game-report.md          # final game status (for the game team)
    │   ├── pipeline-report.md      # pipeline meta-report (for pipeline maintainers)
    │   ├── prompts/                # dispatch prompts (always written)
    │   │   ├── prime.md
    │   │   ├── analyze-gdd.md
    │   │   └── ...
    │   └── traces/                 # per-phase reasoning (only when trace: true)
    │       └── ...
    └── run-02/
        └── ...
```

## Artifact Formats

| Format | Used for | Why |
|--------|----------|-----|
| **YAML** | Agent-consumed cross-phase artifacts | Token-efficient, structured, agents read only the keys they need |
| **Markdown** | Human-consumed reports | Readable, supports checklists and tables |

## Configuration

### `configs/pipeline-config.yml`

| Setting | Default | Description |
|---------|---------|-------------|
| `pass` | `core` | Target pass for this run: `core` / `secondary` / `meta` / `superfan`. Override at CLI with `--pass`. |
| `require-previous-pass` | `true` | `05-pass-gate` refuses pass N until pass N-1 has a completed run. `--allow-skip-pass` bypasses per-invocation. |
| `gdd-gate` | `auto-handoff` | Thin-prompt behavior: `auto-handoff` (run `pipeline-create-gdd` first), `suggest-confirm` (pause and ask), `proceed-warn` (log WARNING and proceed) |
| `skip-groups` | `[]` | Disable phase categories: `tests` / `polish` / `assets` |
| `model` | *(unset)* | Override the model for all phases (`fast` / `default`) |
| `allow-gdd-overrides` | `false` | Precedence on GDD-vs-skill collisions. `false` (default) = skills always win; `true` = GDD wins on soft collisions while critical rules (see `references/precedence.md`) still win. Every resolution is surfaced in `plan.warnings[]`. |
| `browser-verify` | `smoke` | Browser verification scope in 50-verify. `off` = skip entirely; `smoke` (default) = boot + first-interaction crash check; `journey` = full playability walk. MCP unavailable in smoke/journey is NOT blocking. Supersedes the deprecated `visual-verify` (`true` → `journey`, `false` → `off`). |
| `think-only` | `false` | Skip write-mode phases — produce plans only |
| `debug` | `false` | Log the dispatch prompt instead of dispatching |
| `trace` | `false` | Write per-phase trace files for human inspection |
| `build-cmd` / `test-cmd` | *(unset)* | Explicit override for `$buildCmd` / `$testCmd`. Leave unset to let `10-prime` detect from the host project. |

### `configs/gdd-config.yml`

Two keys: `passes:` (coarse — whole pass on/off: `core` / `secondary` / `meta` / `superfan`) and `sections:` (fine — individual section on/off within an enabled pass). Missing keys default to enabled. `pipeline-create-gdd` executes a section only when BOTH its pass and its section are enabled.

## Passes

The build pipeline runs **exactly one named pass per invocation** — `core`, `secondary`, `meta`, or `superfan`. Gated passes are linear: pass N refuses to start until pass N-1 has a completed run (`05-pass-gate` does a *bounded* read of the newest matching `run-log.yml`). Override per-invocation with `--allow-skip-pass`.

| Pass name   | Numeric | What it layers |
|-------------|---------|----------------|
| `core`      | 1       | Stable core loop — interaction, canvas, scoring, first-level playability |
| `secondary` | 2       | Special pieces, obstacles, pattern-busters, combo scoring |
| `meta`      | 3       | Progression, economy, unlocks, companion, narrative, session hooks |
| `superfan`  | 4       | Leaderboards, bots, replay, ranked/prestige, peacocking |

Numeric ↔ name translation is the single responsibility of `references/passes/index.md` inside the `pipeline-build-game` skill. Machine paths (config, CLI, run-log, phase-summary) use the name strings; numerics appear only in GDD step frontmatter.

The scaffold-only **wrappers pass** (`pre`) is not part of the gated pass system — it's produced once at project init.

## Pipeline Phases

| # | Phase | Mode | What it does |
|---|-------|------|-------------|
| 05 | pass-gate | think | Bounded read of one `run-log.yml` — refuses to start pass N until pass N-1 is `complete`. Skipped for `core`. |
| 10 | prime | think | Load project context, detect stack + build/test commands, initialize `pipeline-context.yml` |
| 20 | analyze | think | Parse GDD → structured feature delta + `cos_required:` per feature + UX zones + lifecycle placement |
| 30 | plan | think | Priority-ordered vertical-slice batches with `cos_covered:` + `ux_zones:` + `acceptance[given/should]` + `test_loci` + `definition_of_done` + CoS exit-criteria cross-check + design-smell pre-scan + pass-scoped viewport budgets |
| 40 | implement | write | Per-batch red-green-wire-walk loop (TDD + in-batch integration + 5-lens UX walk + CoS compliance sub-walk) in priority order; on-demand CoS load per batch |
| 45 | integrate | write | Cross-batch coherence only: global viewport re-derive, asset-fallback unification, orphaned-function sweep, execution-reachability sweep |
| 47 | player-flow | both | Whole-journey walk only: tutorial→L1→transitions, difficulty pacing, theme coherence, whole-game fun test |
| 50 | verify | write | Build + test + guardrails audit (G1–G18) + browser playability verification (max 5 cycles) |
| 60 | stabilize | both | Pass-sliced `cos-walk` + `completeness-walk` + failure path (`complete \| partial \| failed`) + final game report |

**Mode**: `think` = read-only analysis, `write` = modifies code, `both` = reads then fixes.

## Two Reports, Two Audiences

| Report | File | Audience | Content |
|--------|------|----------|---------|
| **Game report** | `game-report.md` | Game team | Feature checklist, known issues, play recommendations |
| **Pipeline report** | `pipeline-report.md` | Pipeline maintainers | Phase outcomes, structural issues, pipeline improvements |

Both include `pipeline_version` for traceability across runs.

## Common Commands

```bash
# Full pipeline run (uses existing game-prompt.md + pipeline-config.yml pass)
/pipeline-build-game

# Inline prompt from chat
/pipeline-build-game <your game idea here>

# Run a specific pass (overrides pipeline-config.yml)
/pipeline-build-game --pass core          # default — stable core loop
/pipeline-build-game --pass secondary     # specials, obstacles, combo scoring
/pipeline-build-game --pass meta          # progression, economy, narrative
/pipeline-build-game --pass superfan      # leaderboards, bots, replay

# Bypass the previous-pass-complete guard (use sparingly — diagnostic only)
/pipeline-build-game --pass meta --allow-skip-pass

# Plans only (no code changes)
/pipeline-build-game --think-only

# Run specific phases
/pipeline-build-game --phase 20 40

# Skip phase groups
/pipeline-build-game --skip tests

# Post-run artifacts
/pipeline-report                # generate pipeline-report.md for this run
/pipeline-improve               # prioritized improvements from the latest run
/pipeline-improve --audit       # pipeline health audit
```
