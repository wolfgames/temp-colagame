---
name: make-variant
description: Generate a new ClearPop variant from a free-form prompt. Produces a Topology selection + a complete Theme + per-level Recipe instantiation, calls the wolf-game-kit MCP for sprites/audio, writes the variant into src/game/clearpop/themes/<slug>/ and a variants/<slug>.ts config that runs end-to-end. Use when the user wants to spin up a new themed ClearPop game (e.g. "make a spaceship game", "make a sushi game", "make a game about feelings").
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, mcp__wolf-game-kit__*
---

# make-variant — Prompt → Playable ClearPop Variant

You translate a free-form prompt into a complete ClearPop variant: one Topology (mechanic shape) + one Theme (presentation skin) + per-level Recipes (parameter fills), then write the files and call the asset MCP so the variant runs on `bun run dev` with `VITE_VARIANT=<slug>`.

## Read first

Before producing any output, read:
- `docs/plans/variant-engine.md` — the genre kernel and bounded library
- `src/game/clearpop/contracts/topology.ts` — Topology contract
- `src/game/clearpop/contracts/theme.ts` — Theme contract
- `src/game/clearpop/contracts/variant.ts` — Variant contract
- `src/game/clearpop/contracts/recipe.ts` — Recipe contract
- `src/game/clearpop/themes/eigenpop/` — the reference theme

The mechanic kernel is locked. Themes vary freely; topology comes from a bounded library; recipes follow the standard curve.

## Pipeline

```
prompt
  ↓ intent extraction       → vocabulary, mood, shape cues, motion cues
  ↓ topology selection      → explicit cue overrides > mood map > default rect-orth-down
  ↓ theme generation        → palette, companion, 10-zone narrative arc, strings, audio brief
  ↓ recipe instantiation    → load standard curve; clamp board size to topology limits; set topology id
  ↓ asset-gen brief         → topology.assetSpec + theme spec → wolf-game-kit MCP
  ↓ write files             → themes/<slug>/ + variants/<slug>.ts
  ↓ verify                  → bun run typecheck && VITE_VARIANT=<slug> bun run dev (smoke)
```

## Topology selection

Topology selection is **two decisions**: (1) the topology *id* from the bounded library, and (2) the topology's *shape parameters*. Both come from the prompt — id from cues/mood, parameters from scale and shape language. Never invent a new topology id; do exercise the parameter range.

### Step 1 — Pick the id

Bounded library: `rect-orth-down`, `hex-down`, `radial-in`.

**Explicit cues override mood.** Search the prompt for these substrings (case-insensitive):

| Cue                           | Topology         |
|-------------------------------|------------------|
| "hex", "honeycomb"            | `hex-down`       |
| "round", "circular"           | `radial-in`      |
| "tunnel", "drain", "vortex"   | `radial-in`      |
| "grid", "classic"             | `rect-orth-down` |

If no explicit cue, classify the prompt's mood and pick from:

| Mood                          | Topology         |
|-------------------------------|------------------|
| calm / orderly / structured   | `rect-orth-down` |
| organic / natural / cozy      | `hex-down`       |
| chaotic / cosmic / dramatic   | `radial-in`      |

Default to `rect-orth-down` when uncertain.

### Step 2 — Pick the shape parameters

Don't fall back to defaults. Each topology family carries a parameter range that materially changes the board's read — a 5×12 rect feels nothing like an 8×8, and a `[1, 8, 16, 24, 32, 40]` radial is a Death Star while `[1, 6, 12]` is a dartboard. Pick parameters that match the prompt's **scale** (intimate vs sprawling) and **shape** (tower vs ring vs target vs sprawl).

#### `rect-orth-down` — `{ cols, rows }`

Any rectangle. Aspect ratio carries narrative weight. Valid range: 5–12 in each dim; total cells ≤ 144.

| Cue / mood                                      | Dims              | Why                                  |
|------------------------------------------------|-------------------|--------------------------------------|
| classic / balanced / puzzle / default          | `8×8`             | Eigen Pop baseline. Neutral.         |
| tower / elevator / climb / waterfall / ascent  | `6×12`, `5×10`    | Tall column dominates the read.      |
| river / parade / convoy / conveyor / panorama  | `12×6`, `10×6`    | Wide horizon, low height.            |
| intimate / focused / mini / pocket             | `6×6`, `5×6`      | Small board, quick levels.           |
| sprawl / abundance / chaos / festival          | `10×10`, `12×12`  | Lots of cells, more combos.          |
| asymmetric / off-kilter / quirky               | `7×9`, `9×11`     | Irregular feel.                      |

#### `hex-down` — `{ radius }`

Hexagonal board of axial radius N → `3·N·(N+1) + 1` cells. Valid range: 2–6.

| Cue / mood                                      | radius | Cells | Why                                 |
|------------------------------------------------|--------|-------|-------------------------------------|
| molecule / atom / cell / crystal / shard       | 2      | 19    | Tiny intimate hex.                  |
| flower / snowflake / brooch / gem / ornament   | 3      | 37    | Compact, jewelled feel.             |
| honeycomb / beehive / standard hex             | 4      | 61    | Default.                            |
| colony / garden / lattice / village            | 5      | 91    | Sprawling hex field.                |
| kingdom / fractal / immense / cathedral floor  | 6      | 127   | Edge of mobile readability — use only when the prompt demands it. |

#### `radial-in` — `{ ringSizes }`

Concentric rings, innermost first. **Invariants:**
- `ringSizes[0]` must be `1` (engine assumes ring 0 is a single center cell; ring 1 connects to it).
- Ring sizes should be non-decreasing.
- Total cells ≤ ~150.

| Cue / mood                                          | ringSizes                          | Cells | Why                                       |
|----------------------------------------------------|------------------------------------|-------|-------------------------------------------|
| target / dartboard / bullseye / tight              | `[1, 6, 12]`                       | 19    | Small target.                             |
| galaxy / vortex / standard radial                  | `[1, 6, 12, 18, 24]`               | 61    | Default radial.                           |
| death star / cathedral dome / coliseum / massive   | `[1, 8, 16, 24, 32, 40]`           | 121   | Imposing scale, evenly expanding.         |
| drain / whirlpool / sinkhole / funnel              | `[1, 4, 8, 16, 32]`                | 61    | Exponential outward — feels like falling. |
| stadium / arena / cylinder (uniform rings)         | `[1, 12, 12, 12]`                  | 37    | Constant ring size reads as a cylinder.   |
| solar system / orbits (sparse outer rings)         | `[1, 6, 12, 24]`                   | 43    | Skipping density gives separation.        |

### Step 3 — Pick a silhouette (optional)

A silhouette carves a recognisable shape out of the base lattice. The base topology (id + params) controls the cell *positions*; the silhouette controls *which cells exist*. Strongly recommended for prompts with a clear iconic shape — Death Star, pyramid, heart, diamond, plus-sign all transform a "themed grid game" into "this board could not be any other game."

Silhouettes live in `src/game/clearpop/topologies/masks.ts` as factory functions. The skill picks one by name and passes it as `cellMask` to the topology constructor. **v1 caveats: convex shapes only.** Non-convex masks (horseshoe, pirate ship, dragon) currently cause gravity to chain across visual gaps — pieces appear to fall through voids. Also, level-gen still iterates the bounding box and may waste some obstacle budget placing blockers in void positions; the renderer hides them and the kernel can't reach them, so it's cosmetic-only.

**Available masks per topology family**

| Topology         | Mask              | Cue / mood                                                |
|------------------|-------------------|-----------------------------------------------------------|
| `rect-orth-down` | `diamond`         | gem, kite, banner, festival                               |
| `rect-orth-down` | `plus`            | crosshair, hospital, target reticle, medical              |
| `rect-orth-down` | `pyramid`         | pyramid, mountain, ziggurat, triangle                     |
| `rect-orth-down` | `heart`           | valentine, love, romance, devotion                        |
| `rect-orth-down` | `circle`          | disc, planet, moon, coin, button                          |
| `rect-orth-down` | `deathStar`       | death star, hollow planet, sphere with notch              |
| `hex-down`       | `triangle`        | wedge, slice, pennant, half-page                          |
| `hex-down`       | `pyramid`         | hex pyramid, glacier, peak                                |
| `hex-down`       | `diamond`         | hex diamond, gem inside the comb                          |
| `radial-in`      | `deathStar`       | death star (notch in the middle ring)                     |
| `radial-in`      | `halfDisc`        | half-moon, semicircle, arc-stage                          |

**How to apply**

1. If the prompt has an iconic shape that matches one of these masks, pick it. Otherwise skip silhouettes (most variants don't need them).
2. Import from `~/game/clearpop/topologies/masks`. Pass the predicate to the topology constructor's `cellMask`.
3. The asset MCP brief for the *frame* asset should describe the silhouette (e.g. "Frame outlining a Death Star silhouette, transparent center"), not the base outline.

```ts
import { rectMasks } from '~/game/clearpop/topologies/masks';
import { createRectOrthDownTopology } from '~/game/clearpop/topologies/rect-orth-down';

const topology = createRectOrthDownTopology({
  cols: 10,
  rows: 10,
  cellMask: rectMasks.deathStar(10, 10),
});
```

### Decision output

Emit BOTH the id and the chosen parameters in the skill output, each with a one-line rationale, plus the silhouette pick if one was chosen. Example:

> `topology.id = radial-in` — prompt mentions "Death Star", round + dramatic.
> `topology.params = { ringSizes: [1, 8, 16, 24, 32, 40] }` — Death Star reads as cathedral-scale, evenly expanding from a single core.
> `topology.mask = radialMasks.deathStar(ringSizes)` — carves the iconic trench notch into the middle ring.

## Theme generation

Generate a fresh Theme satisfying `src/game/clearpop/contracts/theme.ts`. The skill is responsible for inventing:
- `id` / `displayName`: kebab-case slug + human name derived from prompt
- `blocks.slots.{a,b,c}`: three kind names + sprite keys + hex tints fitting the theme
- `blocker`: name + sprite key for the obstacle players clear
- `powerups.{line,area,color}`: theme-appropriate names + sprite keys + vfx keys
- `background` / `frame` / `particles` sprite keys (per zone if narrative warrants it)
- `audio`: sound bank keys (music, sfx) — asset MCP fills in the actual clips
- `companion`: name + an open-ended expression set + a voiceProfile brief for asset-gen. **You decide which expressions the narrative needs** — a stoic Jedi master might use `idle | stern | amused`, a chatty droid might use `idle | excited | sad | alarmed | curious`, a deadpan field biologist might use only `idle | surprised`. The only invariant is that `idle` exists and acts as the fallback for any unknown expression at runtime. Generate one portrait per distinct expression (skip the ones the narrative never references). `IntroSlide.companionExpression` and `BlockerQuipLine.expression` are free-form strings — pick whatever names read clearly in the theme's voice.
- `introSlides`: **1–4 slides** (soft cap). Pick the count that matches the narrative weight — a punchy single-line setup is one slide; a layered setup-mechanic-stakes-launch is four. Going past four invites tap-skipping; going below one means the player drops into level 1 cold. Each slide references an expression name from your companion set; unreferenced expressions need no portrait.
- `zones`: 10 `ZoneContent` entries with intro dialogue, mid-zone quips, and outro line
- `strings`: full `UIStringPack` with theme-appropriate copy
- `branding`: title logo path + start-screen `bgColor`/`bgGradient` + `ctaGradient` + `taglineColor`. This is the brand surface for the first (start) and last (win) screens — without it, the wrapper UI keeps reading as Pantry Pop regardless of theme. Treat the logo as a generated asset (see below); the four color values are chosen from the same palette you used for `blocks.slots[*].tint`.

When the prompt is wild ("3D FPS", "MMO economy"), clamp to the closest valid theme and note what was discarded in the skill output. Never produce a Theme that violates the contract.

## Recipe instantiation

Load the standard difficulty curve from `src/game/clearpop/state/level-configs.ts`. Board *shape* is decided **once per variant** during topology selection (see "Step 2 — Pick the shape parameters" above) and held constant across all 100 levels. Per-level recipes only adjust:
- Color count (2 or 3).
- Blocker count (within obstacle-logic limits).
- Move budget.

For `rect-orth-down` variants only, per-level `cols`/`rows` overrides in `level-configs.ts` are honored if you want zone-by-zone reshape (e.g. zones 1–3 on a 6×8, zones 4–7 on an 8×8, zones 8–10 on a 10×10). For `hex-down` and `radial-in`, those overrides are currently **ignored** (see Known limitations — the topology constructs once at variant boot) and the board stays the size you picked at variant creation.

Do **NOT** alter the difficulty curve itself.

## Asset generation

Call `mcp__wolf-game-kit__*` to generate the assets the theme declares. The MCP exposes ~26 tools across image, audio, music, video, 3D, and VFX generation. **Run `/mcp` and view the tool list to discover the exact tool names and parameters before invoking** — this MCP uses a batch-oriented API (e.g. `create_asset_gen_batch`) rather than per-asset calls, so the workflow is: list tools → pick the right ones → assemble a batch → submit → resolve URLs back into theme sprite keys.

Brief format for each asset combines:
- `topology.assetSpec.pieceShape` (`square` | `hex` | `triangle` | `circle`)
- Visual style (palette, mood, art style) from the prompt
- Per-asset prompt (e.g. "Spaceship piece, 1:1 aspect, on solid magenta background")

Generate at minimum:
- **Block sprites** — one per slot, consistent style.
- **Background** — one full-bleed image (and optionally one per zone if the narrative warrants it; see "Per-zone backgrounds" below).
- **Frame** — board outline / chrome that surrounds the playfield. Skippable for v1; the cozy-kitchen frame stays in place via the eigenpop fallback when omitted.
- **Particles** — at least one variant of the `popcorn-{1,2,3}` and `fire-{1,2,3}` sprites so the pop/refill/combo VFX read in theme. Themes that ship custom particles override the same six keys via `spriteOverrides` (see "Particle overrides" below).
- **Music** — one looping game-music track. The batch endpoint sometimes rejects music params; if so, fall back to the dedicated `generate_music` tool (the standalone endpoint is more permissive).
- **SFX** — at minimum: pop, win, lose. Optionally a power-up trigger SFX if the narrative calls for a distinct sound (e.g. a lightsaber swoosh for a Force-Push color blast).
- **One companion portrait per distinct expression the narrative actually references** (always include `idle`; add the rest only if a slide or quip uses that expression — there is no fixed count).
- **Title logo** — self-contained wordmark, transparent background, sized for a ~360px-wide start-screen header. Slot maps to `theme.branding.logo`, downloaded to `public/assets/sprites/<slug>/logo.png`.
- **Custom power-up sprites** when the theme renames the power-ups (Proton Torpedo, Force Push, Sushi Slicer, etc.). See "Power-up sprites" below — these go through `spriteOverrides` keyed by the engine's `PowerUpType` strings (`'rocket' | 'bomb' | 'color_blast'`), not by `theme.powerups.*.spriteKey`.

Skip anything the MCP doesn't have a tool for and note it in `assets.json` as `status: "pending"`. A pending logo is non-blocking: the win overlay silently omits the logo when the asset 404s.

### Power-up sprites

The engine renders power-ups from textures keyed by `PowerUpType`: `'rocket' | 'bomb' | 'color_blast'`. These are the override keys the sprite loader resolves — `theme.powerups.line.spriteKey` (e.g. `'powerup-rocket'`) is *display metadata only*, it does not feed the loader.

When the theme renames a power-up to fit its narrative (Proton Torpedo, Thermal Detonator, Force Push), the rename only sticks visually if the rendered icon changes too. Generate three new sprite PNGs and wire them through `spriteOverrides` using the engine keys:

```ts
const ASSET_POWERUP_TORPEDO   = '/assets/sprites/star-wars/powerup-torpedo.png';
const ASSET_POWERUP_DETONATOR = '/assets/sprites/star-wars/powerup-detonator.png';
const ASSET_POWERUP_FORCEPUSH = '/assets/sprites/star-wars/powerup-forcepush.png';

const SPRITE_OVERRIDES: SpriteOverrides = {
  // ...block + blocker entries...
  rocket:      ASSET_POWERUP_TORPEDO,    // line   → 'rocket'
  bomb:        ASSET_POWERUP_DETONATOR,  // area   → 'bomb'
  color_blast: ASSET_POWERUP_FORCEPUSH,  // color  → 'color_blast'
};
```

Chroma-key all three (they composite over the board). Without these entries, the renamed power-ups display as the cozy-kitchen rocket/bomb/color-blast icons regardless of what the theme strings call them — a visible art bug.

### Particle overrides

The engine pre-loads six particle textures keyed `popcorn_{1,2,3}` (success pop burst) and `fire_{1,2,3}` (combo blast). Themes that want their own particles override the same keys:

```ts
const SPRITE_OVERRIDES: SpriteOverrides = {
  // ...
  popcorn_1: '/assets/sprites/<slug>/particle-pop-1.png',
  popcorn_2: '/assets/sprites/<slug>/particle-pop-2.png',
  popcorn_3: '/assets/sprites/<slug>/particle-pop-3.png',
  fire_1:    '/assets/sprites/<slug>/particle-combo-1.png',
  fire_2:    '/assets/sprites/<slug>/particle-combo-2.png',
  fire_3:    '/assets/sprites/<slug>/particle-combo-3.png',
};
```

Skip the override and the variant uses eigenpop popcorn/fire — acceptable for v1 if the theme's mood is close enough.

### Per-zone backgrounds

`theme.background.perZone: Record<number, string>` is honored by the sprite loader. Declare it when the narrative arc moves through visually distinct settings (e.g. Outer Rim → Hoth → Endor → Death Star) — the engine swaps the background sprite when the level enters a new zone, falls back to `theme.background.spriteKey` for any zone missing from the map.

```ts
background: {
  spriteKey: '/assets/sprites/<slug>/background.png',   // fallback for missing zones
  perZone: {
    1: '/assets/sprites/<slug>/background-outer-rim.png',
    4: '/assets/sprites/<slug>/background-hoth.png',
    6: '/assets/sprites/<slug>/background-endor.png',
    10: '/assets/sprites/<slug>/background-death-star.png',
  },
},
```

Backgrounds are full-bleed — do NOT chroma-key them. Generate them on whatever non-magenta canvas the prompt produces; download as-is.

### Audio bundle wiring

Themes that ship their own audio register a bundle pair in `src/game/asset-manifest.ts` and declare `audio.bundles` on the theme so the engine routes events to the right Howler channels.

1. Drop the audio files under `public/assets/audio/<slug>/` (one mp3 per clip).
2. For each mp3, write a tiny Howler sprite JSON wrapping it, e.g.:
   ```json
   // public/assets/audio/star-wars/sfx-blaster.json
   { "urls": ["audio/star-wars/sfx-blaster.mp3"], "sprite": { "shot": [0, 1044] } }
   ```
   The `urls` array is just the source file; the `sprite` object names the playable clip with `[startMs, durationMs]`. Use `afinfo`/`ffprobe` to get the duration.
3. Register one bundle per channel in `asset-manifest.ts`:
   ```ts
   {
     name: 'audio-sfx-<slug>',
     assets: [
       { alias: 'audio-sfx-<slug>-blaster',    src: 'audio/<slug>/sfx-blaster.json' },
       { alias: 'audio-sfx-<slug>-lightsaber', src: 'audio/<slug>/sfx-lightsaber.json' },
     ],
   },
   {
     name: 'audio-music-<slug>',
     assets: [{ alias: 'audio-music-<slug>', src: 'audio/<slug>/music-<slug>.json' }],
   },
   ```
   Bundle prefix `audio-*` makes the scaffold's `loadAudio()` pick them up automatically — no extra wiring needed.
4. Declare per-event `SoundRef`s in the theme's `audio` block. The `bundles` field sets the default channel for sfx/music; per-event `channel` overrides route a specific event through a different Howl:
   ```ts
   audio: {
     bundles: {
       sfx:   'audio-sfx-star-wars-blaster',     // default sfx channel
       music: 'audio-music-star-wars',
     },
     music: { game: { sprite: 'music_game' } },
     sfx: {
       pop:        { sprite: 'shot' },                                             // blaster
       colorBlast: { channel: 'audio-sfx-star-wars-lightsaber', sprite: 'ignite' }, // saber
       win:        { channel: 'audio-sfx-star-wars-fanfare',    sprite: 'sting' },  // fanfare
       // …
     },
   },
   ```
5. Themes that don't ship audio assets reuse the canonical sound bank via `audio: EIGENPOP_THEME_AUDIO` (imported from `~/game/audio/sound-bank`). They will still play the cozy-kitchen sfx/music — silent isn't an option.

### Always copy generated assets locally — never reference CDN URLs at runtime

The wolf-game-kit MCP returns assets as CDN URLs (e.g. `https://media.qa.wolf.games/...`). **These URLs are unstable and can break at any time** — bucket lifecycle policies, project deletion, environment swaps, or auth changes can silently 404 every asset in the variant. Theme code and `Pixi Assets.load` calls MUST NOT reference CDN URLs.

For every generated asset (image, audio, music, sfx, vfx, 3D, sprite sheet), after the MCP returns its CDN URL:

1. **Download the file** into the project under a stable, predictable path:
   - Images → `public/assets/sprites/<slug>/<name>.png` (or `.webp`)
   - Audio (music/sfx) → `public/assets/audio/<slug>/<name>.mp3`
   - Spritesheet JSON + PNG → `public/assets/sprites/<slug>/<name>.{json,png}`
   - VFX particle configs → `public/assets/sprites/<slug>/<name>.json`

   Use a deterministic kebab-case filename derived from the slot (e.g. `block-jelly.png`, `blocker-barnacle.png`, `companion-marin.png`, `music-game.mp3`). Do **not** keep the MCP's hashed filename — it carries no meaning and rots references.

   Bash recipe:
   ```bash
   mkdir -p public/assets/sprites/<slug> public/assets/audio/<slug>
   curl -sf "<cdnUrl>" -o public/assets/sprites/<slug>/<name>.png
   ```

2. **Reference the local path from theme code.** In `themes/<slug>/index.ts`, declare local-path constants (one per asset), e.g. `const ASSET_BLOCK_JELLY = '/assets/sprites/<slug>/block-jelly.png';`. Wire those into `spriteOverrides`, `companion.spriteKeys`, `fallbackRecipe.dishImage`, and `zones[*].introDialogue[*].image`. Same in `themes/<slug>/zones.ts`.

3. **Record provenance in `assets.json`.** Each `generated` entry has BOTH fields:
   ```json
   {
     "slot": "blocks.a",
     "status": "generated",
     "localPath": "/assets/sprites/deepsea/block-jelly.png",
     "cdnUrl": "https://media.qa.wolf.games/.../generated-image-1-....png",
     "assetId": "asset_..."
   }
   ```
   `localPath` is what runtime code references; `cdnUrl` is provenance only — it lets a future operator re-download from the source batch if the local file is ever lost, and points at the asset MCP record for regeneration. Never import `cdnUrl` into a `.ts` file.

4. **Verify before declaring done.** `grep -rn "media\.qa\.wolf\.games\|media\.wolf\.games" src/` must return zero hits inside `src/game/clearpop/themes/<slug>/`. If a CDN URL appears in theme code, the variant is one bucket policy change away from a black screen.

This rule is non-negotiable. A variant that ships with CDN URLs in theme code is broken-by-default — it will work in development and silently fail in production weeks later.

### Always strip the magenta background from generated sprites

The MCP generates sprites on a solid magenta canvas (`#ff00ff`) by design — that lets us chroma-key cleanly. **But the chroma key is not automatic for `generate_image` output.** Only `generate_style_sprites` applies it for you. Every other image tool returns the sprite *with the magenta still baked in*, and shipping a sprite like that means every block/blocker/companion renders inside a hot-pink rectangle on top of the GPU canvas.

For every sprite asset that must composite over the board (block slots, blocker, companion expressions, powerup icons, particles, frame elements, VFX) — i.e. everything except full-bleed backgrounds — pipe the image through `mcp__wolf-game-kit__chroma_key` **before** downloading it locally:

1. Call `chroma_key` with the CDN URL from `generate_image` / `edit_image`.
   - `color: "#ff00ff"` (matches the prompt's "on solid magenta background" suffix).
   - Start at defaults; if the result still shows a magenta halo, retry with `tolerance: 120, spread: 8, feather: 0.5`. Cartoon line-art with dark outlines almost always needs these stronger settings to eat the anti-aliased fringe.
   - If chroma key still leaves fringe (photo-real subjects, busy outlines), fall back to `mcp__wolf-game-kit__remove_background` (AI model) and re-upload the result.
2. Download the **chroma-keyed** CDN URL — never the raw `generate_image` URL — into `public/assets/sprites/<slug>/`.
3. Record the chroma-keyed asset id and CDN url in `assets.json`. The pre-chroma url is provenance only; do not reference it.

**Backgrounds are the only exception.** Full-screen backgrounds (`background.png`, zone backdrops) are meant to be opaque and should be saved as-is. Everything else needs an alpha channel.

**Verify before declaring done.** Run `bun run test tests/unit/assets/sprite-transparency.test.ts` (see the test file for the exact assertion). It samples corner pixels of every PNG under `public/assets/sprites/<slug>/` except `background*.png` and fails if any of them is opaque magenta. If the test fails, re-run chroma key with stronger settings and re-download.

A variant that ships with magenta backgrounds visible at runtime is a visible art bug — much louder than a missing asset. Treat the test as a blocking gate.

## Files written

```
src/game/clearpop/themes/<slug>/
  index.ts          — exports `<slug>Theme: Theme` (references LOCAL asset paths only)
  zones.ts          — 10 ZoneContent entries (LOCAL asset paths only)
  strings.ts        — UIStringPack
  assets.json       — manifest of every generated asset with BOTH localPath + cdnUrl
src/game/clearpop/variants/<slug>.ts
                    — exports a Variant builder for VITE_VARIANT=<slug>
public/assets/sprites/<slug>/
                    — local copies of every generated image/spritesheet
public/assets/audio/<slug>/
                    — local copies of every generated music/sfx clip
```

Register the new variant in `src/game/clearpop/variants/index.ts` so `VITE_VARIANT=<slug>` resolves to it.

## Failure modes

- **Prompt is incoherent or asks for impossible mechanics.** Clamp to the closest valid variant. List what was discarded.
- **Asset MCP fails for some sprite.** Fall back to placeholder keys (or the eigenpop key for that slot) and note the asset in `assets.json` as `status: "pending"`.
- **Typecheck fails after write.** Fix the generated Theme to match the contract before declaring done. Never ship a variant that fails `bun run typecheck`.

## Done when

`VITE_VARIANT=<slug> bun run dev` loads the variant, the start screen reflects the theme, the first level boards correctly, a successful tap triggers a clear, gravity, and refill — and the win/lose transitions use the theme's strings + companion sprites.

Additionally, the following must be true before declaring done:
- `grep -rn "media\.\(qa\.\)\?wolf\.games" src/game/clearpop/themes/<slug>/` returns **zero** matches (no CDN URLs in theme code).
- Every `status: "generated"` entry in `assets.json` has both a `localPath` and a `cdnUrl` field.
- Each `localPath` resolves to an actual file on disk under `public/`.
- `bun run test tests/unit/assets/sprite-transparency.test.ts` passes (no opaque-magenta backgrounds remain on non-background sprites).
- `theme.branding` is fully populated (logo path + bgColor + ctaGradient stops + taglineColor). `grep -n "pantry-pop-logo\|#FFF8EE\|#FF8C42\|#E85D26\|#9B6B3E" src/game/clearpop/themes/<slug>/` returns **zero** matches — eigenpop's brand palette must not leak into a non-eigenpop theme.

## Known limitations (current build)

- **Piece visuals are still squares.** All three topologies tile their cells correctly (hex sprites sit at axial centres, radial sprites at ring/angle centres), but `BlockRenderer` paints square texture sprites regardless of `topology.assetSpec.pieceShape`. Layout sizes squares to the smallest centre-to-neighbour distance so they don't overlap, but you'll see slight visual gaps on hex/radial. Drawing true hex/circle pieces from `topology.assetSpec.pieceShape` is the next visual polish step — not blocking for playable variants.
- **Per-level board reshaping for non-rect.** Hex/radial topologies are constructed once per variant (e.g. `cols: 7, rows: 8` for hex) and don't reshape across levels the way rect does. Per-level `cols`/`rows` from `level-configs.ts` are ignored for non-rect variants. Fine for v1; revisit if level designers need shrinking hex boards.
- **Combo geometry for non-rect.** Combos (rocket+rocket, rocket+bomb, etc.) flow through `topology.lineThrough` and `topology.area`, so they execute, but the animations were tuned for rect crosses — the visual sweep on hex/radial may look slightly off until the powerup animators read topology-aware paths.
- **Obstacle types are still eigenpop's.** The level generator and `ObstacleType` union are hardcoded to the cozy-kitchen vocabulary (`marshmallow`, `egg`, `ice`, `jelly`, `cage`, `safe`, `cookie`) plus their hit-state sub-sprites (`marshmallow_toasted`, `egg_1/2/nest`, `cookie_1/2/3`, `ice_1/2/3`). The `Theme` contract only slots `block.a/b/c` and a single `blocker` — there's no `Theme.obstacles[]` yet, so themes can't declare their own obstacle types. **Workaround (see `themes/deepsea/index.ts`):** generate one themed blocker sprite, then alias *every* cozy-kitchen blocker key (including every hit-state sub-sprite) to that one sprite via `spriteOverrides`, and remap `blockerDisplayNames` so the spoken copy stays diegetic. The board reads as your theme regardless of which `ObstacleType` the generator picked. This is a known kludge until the engine grows per-theme obstacle vocabularies — note it explicitly in the variant's `assets.json` when you do it.
