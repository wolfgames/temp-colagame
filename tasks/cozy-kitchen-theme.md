# Cozy Kitchen — Theme Production Spec

Theme ID: `cozy-kitchen`
Asset folder: `public/assets/sprites/cozy-kitchen/`
Preview: [tasks/cozy-kitchen-preview.html](cozy-kitchen-preview.html)
Status: in progress — variants being generated, none picked/wired yet.

---

## 1. Scene / backdrop

A sunny kitchen counter. Checkered tea towels, wooden cutting boards, a windowsill of herbs, and copper pots hanging overhead. Warm daylight, cream and butter-yellow palette. Used for the board background and menu/loading screens if needed.

---

## 2. Style contract

Every sprite in this theme must match the existing **egg sprite** (`public/assets/sprites/generic/block-obstacle-egg-128.png`) and **egg nest sprite** (`block-obstacle-egg-nest-128.png`) for:

- **Illustration**: flat cartoon / 2D illustrated, not photorealistic, not 3D-rendered.
- **Palette**: warm, cream / brown / pastel earth tones. Soft saturation.
- **Outline**: a soft dark outline around the whole silhouette.
- **Lighting**: one soft specular highlight (upper area), one soft shadow. No harsh bands.
- **Canvas fill**: the sprite must **fill the full square tile edge-to-edge like a woven nest** — not a small centered subject with empty corners. This is the single most important style constraint and has been the main reason for regenerating variants.
- **Resolution**: generated at 256×256, delivered as 128×128 PNG, transparent background (chroma-keyed from `#ff00ff`).
- **Size naming**: append `-128` to every output filename.

Every generation prompt must reference the egg-nest style and explicitly require "fills the full square block cell, like a woven nest, not a small centered subject on empty space".

---

## 3. Regular blocks (gems)

Unchanged from the current game.

- Base block: `public/assets/sprites/block-base-pale-128.png` (shared across themes — no theme override).
- Tinted per `BLOCK_THEMES[color]` in [block-theme.ts](../src/game/clearpop/renderers/block-theme.ts).

No cozy-kitchen asset needed here.

---

## 4. Obstacle sprites to produce

Each sprite replaces a generic obstacle with a kitchen-themed equivalent. Filenames in the cozy-kitchen folder match the keys the code already expects, so no code change needed beyond switching `THEME` in [sprite-assets.ts](../src/game/clearpop/renderers/sprite-assets.ts) from `'generic'` to `'cozy-kitchen'`.

| Obstacle key | Cozy Kitchen name | Description | Filenames to produce | Status |
|---|---|---|---|---|
| `bubble_block` | **Soap Sud** | Fluffy dishwashing foam on top of a kitchen ingredient. Wipes away with a squeaky-clean sparkle on neighbor pop. | `block-obstacle-bubble-128.png` | 4 variants generated, not picked |
| `egg` (2 states) | **Egg** (unchanged) | Reuse identical sprites from generic theme. | Copy `block-obstacle-egg-128.png`, `block-obstacle-egg-cracked-128.png`, `block-obstacle-egg-nest-128.png` from generic/ | Copy-only |
| `ice` (3 states) | **Ice** (unchanged) | Reuse identical sprites from generic theme. | Copy `block-obstacle-ice-*-128.png` from generic/ | Copy-only |
| `jelly` | **Jam Dollop** | Sticky ruby-red spoonful of jam pinning an ingredient down. Glossy domed blob with fruit-shine highlight. | `block-obstacle-jelly-128.png` | Not generated |
| `cage` | **Silver Cloche** | Polished domed silver lid covering an ingredient. Metallic chrome shine, round knob on top. | `block-rock-stone-128.png` (code's existing key) | Not generated |
| `safe` | **Cookie Jar** | Round ceramic jar with a lid, fills the tile edge-to-edge. | `block-obstacle-safe-128.png` | Not generated |

Note: the `safe` obstacle currently has only 1 sprite. If the two-pop "loose lid → off" effect needs distinct states, we'll add `safe-loose-128.png` and update the renderer. For now, produce the single closed-jar sprite.

---

## 5. Power-up sprites to produce

| Power-up key | Cozy Kitchen name | Description | Filename(s) | Status |
|---|---|---|---|---|
| `rocket` | **Rolling Pin** — split into two sprites | Floury cutting-board fills the tile as a **background**; the rolling pin renders as a **foreground** layer on top. This matches the egg/egg-nest two-layer pattern and gives us an animatable pin (rotation, swoosh) over a static floury board. | `powerup-rocket-bg.png` (flour board) + `powerup-rocket.png` (pin) | 4 pin variants + 4 board variants generated, not picked |
| `bomb` | **Popcorn Pot** | Copper cooking pot with popcorn overflowing edges on all sides so the silhouette fills the whole tile. | `powerup-bomb.png` | 4 variants generated (v2 set), not picked |
| `color_blast` | **Candy Jar** | Square-shaped glass jar packed with colorful gumball candies — the jar itself is the square silhouette. | `powerup-rubiks.png` | 4 variants generated, not picked |

### Rolling Pin rendering note (code change needed)

Unlike the other power-ups which are single sprites, the Rolling Pin is two stacked layers. The power-up renderer currently places a single sprite per cell. To support split layers, we'll need to:

1. Add a `powerup-rocket-bg.png` path to `POWERUP_SPRITE_PATHS` in `sprite-assets.ts` (or a dedicated `POWERUP_BG_PATHS` map).
2. In `placePowerupSprite` ([board-renderer.ts](../src/game/clearpop/renderers/board-renderer.ts)), when `type === 'rocket'`, render the flour bg first, then the pin on top — similar to the two-layer egg + nest pattern.
3. The pin can rotate independently for horizontal vs vertical rockets; the bg stays static.

This is a small, localized change — scope is <30 lines.

Other power-ups keep **existing filenames** so no code change is needed — drop the new PNGs into `public/assets/sprites/cozy-kitchen/powerups/` with these names.

---

## 6. Particle / VFX adjustments (deferred)

These require changes to the juice system, not just sprites:

- Soap Sud: sparkle particles + squeaky-clean shimmer on clear.
- Jam Dollop: glossy smear streak on wipe.
- Silver Cloche: small chime "ting" SFX + lift-off tween.
- Cookie Jar: flour puff + crumb shower on second-pop.
- Rolling Pin: flour-dust trail along the row/column sweep; pin rotation tween.
- Popcorn Pot: popcorn-burst particles (white fluffy) + steam on detonation.
- Candy Jar: colored-candy scatter on detonation.

**Deferred** — captured so we don't lose them, but not needed to ship the sprite swap.

---

## 7. Generation workflow

How we produce variants for each sprite.

### Tool
`mcp__wolfgames-asset-gen__generate_game_asset` — MCP tool that runs a one-shot pipeline: **text-to-image → chroma-key background removal → resize**. Returns a game-ready transparent PNG.

Standard params for this theme:
- `width: 256`, `height: 256` — generate at 2× so we have headroom for later resize
- `num_images: 4` — always produce 4 variants per subject so we can pick
- `aspect_ratio: "1:1"`
- `name: "kitchen-<subject>"` — determines output filename prefix

### Prompt template (copy/adapt)

```
Square game tile icon. <SUBJECT> <STYLE> filling the entire tile edge-to-edge
like a woven nest. <DETAIL>. Flat 2D cartoon illustration, soft dark outline
around the outer square silhouette, warm kitchen palette.
Matches the style of an egg in a woven nest — the subject FILLS THE SQUARE,
does not sit as a small centered icon. No text, on a solid magenta #ff00ff background
```

Key constraints every prompt must include:
- "fills the entire tile edge-to-edge" / "FILLS THE SQUARE" — enforces nest-style canvas use.
- "on a solid magenta #ff00ff background" — required for chroma key.
- "flat 2D cartoon illustration" + "soft dark outline" — matches the egg sprite aesthetic.
- "warm kitchen palette" — theme tone.

### After generation

1. Tool returns 4 FAL URLs + inline previews.
2. `curl` each URL into [tasks/preview-assets/](preview-assets/) keeping the `kitchen-<subject>-<n>.png` filename.
3. Add a new section + 4 `<div class="card">` blocks to [tasks/cozy-kitchen-preview.html](cozy-kitchen-preview.html).
4. `open tasks/cozy-kitchen-preview.html` so the user can pick.
5. On pick, clean any remaining magenta via `mcp__wolfgames-asset-gen__chroma_key` with `tolerance: 100-120, spread: 6-8`.
6. Install the cleaned PNG into `public/assets/sprites/cozy-kitchen/` under the filename in sections 4 / 5.

### When to regenerate

Regenerate instead of tweaking when:
- The subject sits as a small icon with empty corners (canvas not filled).
- Chroma key leaves heavy magenta fringes that cleanup can't fix.
- Silhouette is non-square (tall / narrow / round) when a square is needed.
- The user wants a concept change (e.g. "Popping Kernel → Popcorn Pot", "Spice Shaker → Candy Jar").

---

## 8. Preview workflow

All variants are previewed in a single HTML file. Pick from the preview, then wire in.

### Files
- **Preview page**: [tasks/cozy-kitchen-preview.html](cozy-kitchen-preview.html)
- **Variant PNGs**: [tasks/preview-assets/kitchen-*.png](preview-assets/) (raw 256×256 outputs from asset gen, not yet cleaned)
- **Reference sprites** shown at top of preview: egg + egg-nest from `public/assets/sprites/generic/`

### How to view
```bash
open tasks/cozy-kitchen-preview.html
```

### Per-variant conventions
- Variants named `kitchen-<subject>-<n>.png` (e.g. `kitchen-popcorn-pot-v2-3.png`).
- Variants with remaining magenta chroma bleed are labelled "magenta bleed" / "magenta bg" in the preview — cleaned up via `chroma_key` before wiring.
- Variants are appended as new sections; old variants stay until a set is picked and retired.

---

## 9. Wiring checklist (once sprites exist)

1. For each picked variant, run `chroma_key` at tolerance 100–120, spread 6–8 to clean magenta bleed.
2. Download the cleaned PNGs into `public/assets/sprites/cozy-kitchen/` (and `cozy-kitchen/powerups/` for power-ups) under the filenames in sections 4 and 5.
3. Copy egg + ice sprites from `generic/` → `cozy-kitchen/` (unchanged).
4. Implement the Rolling Pin two-layer rendering (section 5 note).
5. In [sprite-assets.ts](../src/game/clearpop/renderers/sprite-assets.ts), change `const THEME = 'generic'` to `const THEME = 'cozy-kitchen'`.
6. Reload — verify all obstacle + power-up sprites render correctly.
7. Once happy, promote `THEME` to a config value / per-level setting if we want to switch themes dynamically.
