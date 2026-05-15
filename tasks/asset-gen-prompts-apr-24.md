# Asset Gen Prompts — Apr 24

Prompts ready for the `wolfgames-asset-gen` MCP (or any image-gen tool). All assets: 128×128 PNG, transparent background, single object centered, ~90% fill of the canvas.

Style reference: match the existing ClearPop obstacle sprites — see [block-obstacle-egg-128.png](../public/assets/block-obstacle-egg-128.png) for the ceramic/cartoon illustrated look (soft outline, rounded forms, stylized specular highlight, hand-drawn feel).

---

## 1. Ice — State 1 (pristine)

**Filename:** `block-obstacle-ice-128.png` (replaces existing)

**Prompt:**

> A single cartoon ice cube game icon, 128×128, transparent background, centered, soft rounded-square silhouette filling ~90% of the canvas. Pale cyan-blue frozen ice material — pristine, glassy, NO cracks. Thin warm-white soft outline. Stylized specular highlight in the upper-left third (off-center oval, 50% opacity white). Subtle inner translucency suggesting depth. Matches a ceramic-cartoon illustrated style — clean vector-art feel, not photorealistic. Background fully transparent. No text, no shadow beneath, no frame.

---

## 2. Ice — State 2 (cracked, mid damage)

**Filename:** `block-obstacle-ice-cracked-128.png`

**Prompt:**

> A single cartoon ice cube game icon, 128×128, transparent background, centered, soft rounded-square silhouette filling ~90% of the canvas. Pale cyan-blue frozen ice with visible hairline cracks — 3-5 dark thin crack lines radiating from center-right across the surface. Same ice material and warm-white outline as pristine state. Stylized specular highlight preserved in upper-left. Cracks are thin jagged lines in slightly darker cyan-gray (~30% opacity), NOT holes or shatters — ice is still intact but damaged. Matches a ceramic-cartoon illustrated style — clean vector-art feel, not photorealistic. Background fully transparent. No text, no shadow, no frame.

---

## 3. Ice — State 3 (shattered, heavy damage)

**Filename:** `block-obstacle-ice-shattered-128.png`

**Prompt:**

> A single cartoon ice cube game icon, 128×128, transparent background, centered, soft rounded-square silhouette filling ~90% of the canvas. Pale cyan-blue ice that is heavily fractured — deep cracks forming web patterns across the whole surface, 6-10 thick jagged crack lines, some small triangular ice shards visibly chipped away from the edges exposing a darker cyan interior. Silhouette still recognizable as a rounded square but outer edge is irregular/chipped. Warm-white outline still visible but broken in places. Specular highlight diminished (~30% size) — this ice is about to break apart. Matches a ceramic-cartoon illustrated style — clean vector-art feel, not photorealistic. Background fully transparent. No text, no shadow, no frame.

---

## 4. Grayscale block base (tintable)

**Filename:** `block-base-gray-128.png`

**Purpose:** Runtime gets tinted per color via `sprite.tint = 0xRRGGBB`. Must be pure grayscale so tint multiplies cleanly (no color casts).

**Prompt:**

> A single cartoon game block icon, 128×128, transparent background, centered, rounded-square silhouette filling ~94% of the canvas. Pure neutral grayscale (no hue tint at all — flat gray range from ~#ffffff highlights to ~#333333 shadows). Soft top-to-bottom lighting: bright top edge, mid-gray body, darker bottom edge suggesting a subtle sphere/dome surface. Stylized specular highlight in the upper-left third (off-center oval, soft, 70% opacity white). Thin white soft outline around the silhouette (18% opacity). Matches a ceramic-cartoon illustrated style — clean vector-art feel, soft rounded corners (8% radius), not photorealistic. Designed to be tinted a single color at runtime so color must come from lightness variation only, never from hue. Background fully transparent. No text, no shadow beneath, no frame, no color.

---

## Usage notes

- Run each prompt through the asset gen pipeline one at a time so we can review + reject individual outputs.
- Save outputs to [public/assets/](../public/assets/) only AFTER Eda approves.
- Do not wire into [sprite-assets.ts](../src/game/clearpop/renderers/sprite-assets.ts) until all 4 are approved.
