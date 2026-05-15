# Available Assets

A catalog of all template assets in `public/assets/`. These are ready to use in any game built on this scaffold — replace or extend as needed per project.

---

## Fonts

All fonts are registered in `src/app.css` via `@font-face` and available as named constants in `src/game/fonts.ts`.

**To change the active game font**, update `config.ts`:

```ts
import { FONT_CHEWY } from './fonts';
export const GAME_FONT_FAMILY = FONT_CHEWY;
```

| Constant | Family | Character | Best For |
|---|---|---|---|
| `FONT_BALOO` | Baloo | Rounded, friendly | UI text, body, default |
| `FONT_CHEWY` | Chewy | Bubbly, chunky | Titles, big scores |
| `FONT_COINY` | Coiny | Coin-shaped, bold | Scores, HUD numbers |
| `FONT_GRANDSTANDER` | Grandstander | Sporty, geometric (variable wt + italic) | Titles and body — versatile |
| `FONT_MCLAREN` | McLaren | Rounded, informal | Dialogue, cozy/casual games |
| `FONT_RANCHERS` | Ranchers | Western/retro display | Titles only, high personality |

**Files:** `public/assets/fonts/`

> Grandstander supports weight 100–900 and italic via its variable font axes.
> All others are fixed-weight 400.

---

## Audio

### SFX Bundles

| Bundle | Files | Description |
|---|---|---|
| `sfx-clearpop` | `sfx-clearpop.mp3` + `.json` | Howler sprite bundle — core match/pop sounds |

**Individual SFX** (`public/assets/sfx/`):

| File | Use |
|---|---|
| `button-click.mp3` | UI button tap |
| `pop.mp3` | Tile/piece pop |
| `bomb-blast.mp3` | Bomb power-up explosion |
| `rocket-whoosh.mp3` | Rocket power-up fire |
| `color-blast.mp3` | Color blast power-up |
| `combo-blast.mp3` | Combo chain trigger |
| `blocker-hit.mp3` | Blocker tile hit |
| `blocker-clear.mp3` | Blocker tile cleared |
| `powerup-spawn.mp3` | Power-up appears on board |
| `marshmallow-burn.mp3` | Marshmallow blocker burn (cozy-kitchen theme) |
| `win-stinger.mp3` | Level win |
| `lose-stinger.mp3` | Level lose |
| `reject-thud.mp3` | Invalid move / rejected action |

### Music

| Bundle | Files | Description |
|---|---|---|
| `music-warehouse-puzzle` | `music-warehouse-puzzle.mp3` + `.json` | Howler sprite bundle — looping puzzle track |

---

## Sprite Atlases

| Bundle | JSON | PNG | Description |
|---|---|---|---|
| `eigen-gems` | `eigen-gems.json` | `eigen-gems.png` | Coloured gem tiles (6 colours) |
| `atlas-branding-wolf` | `atlas-branding-wolf.json` | `atlas-branding-wolf.png` | Wolf Games branding sprites |
| `vfx-blast` | `vfx-blast.json` | `vfx-blast.png` | Blast / explosion VFX frames |

---

## Individual Images

| File | Description |
|---|---|
| `eigen-pop-title.png` | Eigen Pop game title lockup |
| `eigen-btn-continue.png` | Pre-rendered "Continue" button |
| `eigen-btn-tap-to-play.png` | Pre-rendered "Tap to Play" button |
| `host-portrait.png` | NPC/host character portrait |
| `pantry-pop-logo.png` | Pantry Pop game logo |

---

## Sprites (Loose — not yet atlased)

> These are source sprites under `public/assets/sprites/`. Pack into an atlas before using in game GPU code (see [asset-pipeline.md](../recipes/asset-pipeline.md)).

### Generic Block Bases

| File | Description |
|---|---|
| `block-base-bubble-128.png` | Bubble style base tile (128px) |
| `block-base-pale-128.png` | Pale/light style base tile (128px) |
| `block-base-plate-128.png` | Plate style base tile (128px) |

### Generic Blockers (`sprites/generic/`)

| File | Description |
|---|---|
| `block-obstacle-bubble-128.png` | Bubble blocker |
| `block-obstacle-egg-128.png` | Egg blocker (intact) |
| `block-obstacle-egg-cracked-128.png` | Egg blocker (cracked) |
| `block-obstacle-egg-nest-128.png` | Egg in nest blocker |
| `block-obstacle-ice-128.png` | Ice blocker (intact) |
| `block-obstacle-ice-cracked-128.png` | Ice blocker (cracked) |
| `block-obstacle-ice-shattered-128.png` | Ice blocker (shattered) |
| `block-obstacle-jelly-128.png` | Jelly blocker |
| `block-obstacle-safe-128.png` | Safe/lock blocker |
| `block-obstacle-stone-128.png` | Stone blocker |
| `block-rock-stone-128.png` | Rock/stone block |
| `stone-block-0..3.png` | Stone block variants (0–3) |

### Generic Power-ups (`sprites/generic/powerups/`)

| File | Description |
|---|---|
| `powerup-bomb.png` | Bomb power-up |
| `powerup-rocket.png` | Rocket power-up |
| `powerup-rubiks.png` | Colour-blast / Rubik's power-up |

### Cozy Kitchen Theme (`sprites/cozy-kitchen/`)

| File | Description |
|---|---|
| `blockers/block-obstacle-cookie-128.png` | Cookie blocker (intact) |
| `blockers/block-obstacle-cookie-bite1-128.png` | Cookie blocker (1 bite) |
| `blockers/block-obstacle-cookie-bite2-128.png` | Cookie blocker (2 bites) |
| `blockers/block-obstacle-marshmallow-128.png` | Marshmallow blocker |
| `blockers/block-obstacle-marshmallow-toasted-128.png` | Toasted marshmallow blocker |
| `powerups/powerup-bomb.png` | Kitchen-themed bomb |
| `powerups/powerup-rocket.png` | Kitchen-themed rocket (rolling pin) |
| `powerups/powerup-rubiks.png` | Kitchen-themed colour blast (candy jar) |
| `particles/fire-1..3.png` | Fire particle frames |
| `particles/popcorn-1..3.png` | Popcorn particle frames |
| `nana/nana-neutral.png` | Nana character — neutral |
| `nana/nana-pleased.png` | Nana character — pleased |
| `nana/nana-surprised.png` | Nana character — surprised |
| `nana/nana-exasperated.png` | Nana character — exasperated |
| `pantry-background.png` | Full pantry background |
| `hud-banner.png` | HUD top banner |
| `star-bar.png` | Star progress bar |

---

## VFX

| Path | Description |
|---|---|
| `vfx/white-circle.png` | White circle — general-purpose particle/flash |
| `vfx/effects/default.json` | Default particle emitter config |

---

## Adding New Assets

- **Fonts**: Drop `.ttf`/`.woff2` into `public/assets/fonts/`, add `@font-face` to `src/app.css`, export a constant from `src/game/fonts.ts`.
- **Sprites**: Follow the naming convention in [naming-convention.md](../guides/naming-convention.md), pack into an atlas, register in [asset-manifest.ts](../../src/game/asset-manifest.ts).
- **Audio**: See [audio-setup.md](../recipes/audio-setup.md) for Howler sprite bundle setup.
- **Validation**: Run `bun run check:assets` and `bun run check:manifest` after adding assets.
