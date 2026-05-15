# template-clearpop

ClearPop variant-engine template. Each scaffolded repo holds one themed game; scaffold new repos via [`nucleo`](https://github.com/wolfgames/nucleo) + the [`morph-clearpop`](https://github.com/wolfgames/cortex-clearpop-variants) Cortex skill.

## Scaffold a new game

```bash
nucleo scaffold <slug> --template wolfgames/template-clearpop --skill morph-clearpop --prompt "..."
```

`nucleo` clones this template into a new repo, then runs `morph-clearpop` which rewrites the active-game slot in `src/game/clearpop/variants/index.ts` into a brand new themed variant generated from your prompt.

## Local dev

```bash
bun install
bun run dev
```

`bun run dev` boots the active game — in this template that's the `eigenpop` reference theme; in a scaffolded repo it's the morph-generated variant. Same command, different game, every time.

No env vars, no prefixes, no per-game npm scripts. Each repo holds exactly one game.

## Engine self-tests

`VITE_VARIANT` is a dev escape hatch for engine self-tests that exercise the non-rect topologies. It is **not** the way to run the repo's game.

```bash
VITE_VARIANT=hex-test bun run dev      # hex-down topology smoke test
VITE_VARIANT=radial-test bun run dev   # radial-in topology smoke test
```

## Substrate contract

The `morph-clearpop` preflight asserts these substrate files exist before morphing:

- `src/game/clearpop/contracts/{topology,theme,variant,recipe}.ts` — engine contracts
- `src/game/clearpop/state/{scoring,types,level-configs}.ts` — canonical kernel (formula `10 × groupSize^1.5`, power-up thresholds rocket ≥5 / bomb ≥7 / color_blast ≥11)
- `src/game/clearpop/themes/eigenpop/` — reference theme
- `src/game/clearpop/variants/index.ts` — variant registry
- `src/game/clearpop/topologies/` — `rect-orth-down`, `hex-down`, `radial-in`

Don't edit those files casually — breaking the substrate breaks every future scaffolded variant.

## Engine docs

See [`docs/INDEX.md`](docs/INDEX.md) for the full upstream amino engine documentation (architecture, modules, asset pipeline, tuning, debugging).
