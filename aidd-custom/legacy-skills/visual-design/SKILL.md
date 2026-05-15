---
name: visual-design
description: Lickable, dimensional visual identity — 5-layer object rendering, hue-shifted lighting, material physics, scene atmosphere. Use when applying visual design to a game. Triggers on: visual design, palette, typography, material voice, theme, sprites, chromatic architecture, affordance gradient, 5-layer rendering, scene atmosphere, lighting.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Visual Design -- Creating a Visual World Worth Inhabiting

This stage doesn't "skin a prototype" -- it creates a visual world worth inhabiting. The output should be screenshot-worthy: distinctive enough that one image identifies the game, tactile enough that fingers itch to interact, and emotionally resonant enough that the visuals participate in the gameplay experience.

## Design Ambition

```
Think Monument Valley, not Material Design defaults.
Think Candy Crush's glossy gems, not flat colored squares.
Think Alto's atmospheric gradients, not a plain blue background.
Every game deserves its own visual soul -- not a template with swapped colors.
```

## Chromatic Architecture

Colors organized by emotional role, not by CSS property.

### Color Roles
| Role | Purpose | Example |
|------|---------|---------|
| **Identity** | The hue players remember. The game's signature color. | Deep purple for a mystery game |
| **Reward** | Escalates with achievement. Gets brighter/more saturated as player succeeds. | Gold that intensifies with combos |
| **Tension** | Shifts as stakes rise. Creates urgency. | Cool blue that warms to red under pressure |
| **Rest** | Neutral that lets action breathe. The visual "silence." | Desaturated slate |
| **Surface** | Background surface. Sets the stage. | Warm cream for a cozy game |

### Shadow & Highlight Generation

Shadows and highlights are hue-shifted, never flat gray or white. This is what makes objects feel lit instead of stamped.

```typescript
// NOTE: Pixi.js v8 Color class does NOT have toHsl(). Use a manual conversion utility.
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToNumber(h: number, s: number, l: number): number {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return ((Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255));
}

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF];
}

function hueShiftShadow(baseHex: number, warmLight: boolean): number {
  const [r, g, b] = hexToRgb(baseHex);
  const [h, s, l] = rgbToHsl(r, g, b);
  // Warm light → cool shadows (shift +30°), cool light → warm shadows (shift -30°)
  const hShift = warmLight ? 30 : -30;
  return hslToNumber(
    (h + hShift + 360) % 360,
    Math.min(s * 1.1, 100),
    l * 0.45,
  );
}

function hueShiftHighlight(baseHex: number, warmLight: boolean): number {
  const [r, g, b] = hexToRgb(baseHex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const hShift = warmLight ? -10 : 10;
  return hslToNumber(
    (h + hShift + 360) % 360,
    s * 0.6,
    Math.min(l + (100 - l) * 0.65, 97),
  );
}
```

### Implementation
```typescript
const theme = {
  lighting: {
    direction: 315,   // degrees, top-left
    elevation: 'medium' as const,
    warmth: 'warm' as const,
  },
  colors: {
    identity:  { base: 0x4A90D9, shadow: 0x2A4E7A, highlight: 0xA8CCF0 },
    reward:    { base: 0xFFD700, shadow: 0x8B6914, highlight: 0xFFF1A8 },
    tension:   { base: 0xE74C3C, shadow: 0x7A2018, highlight: 0xF5A89E },
    rest:      { base: 0x2C3E50, shadow: 0x131A22, highlight: 0x5D7A8F },
    surface:   { base: 0xECF0F1, shadow: 0xA0AAB0, highlight: 0xFDFEFE },
  },
};
```

**Rule**: No orphan hex codes. Every color has a named emotional role AND pre-computed shadow/highlight variants. No `0x000000` shadows. No `0xFFFFFF` highlights.

## Material Voice

One consistent material philosophy. Everything should feel made of the same substance — and that substance should feel *real*. Each material has a signature physical effect that makes it feel tangible, not decorative.

| Material | Feel | Signature Effect | Best For |
|----------|------|-----------------|----------|
| Paper | Warm, tactile, handmade | Subtle fiber texture, soft fold shadows, slight translucency at edges | Cozy puzzles, word games |
| Glass | Clean, transparent, precise | Sharp specular highlight, refraction distortion at edges, transparency | Minimal puzzles, zen games |
| Clay/Rubber | Organic, soft, squishy | Soft deformation on press, fingerprint-scale noise texture, matte highlight | Children's games, casual |
| Plastic | Glossy, bouncy, toylike | Squash-and-stretch on interact, bouncy overshoot settle, candy-shell highlight | Candy/arcade puzzles |
| Metal/Chrome | Sleek, weighty, reflective | Animated reflection sweep that shifts with time, sharp dual highlights | Sci-fi, tech puzzles |
| Wood | Natural, warm, grounded | Visible grain lines via noise, matte diffuse highlight, solid/weighty on press | Strategy, board games |
| Neon | Electric, vibrant, buzzing | Glow bleed, slight flicker, color-shifted outer aura | Fast-paced arcade |

### Material Implementation Recipe

For whichever material the design doc specifies, implement **all of these** per-object:

```typescript
interface MaterialDefinition {
  name: string;
  borderRadius: number;
  baseTreatment: 'flat' | 'gradient' | 'noisy';
  internalShadow: { color: number; alpha: number; spread: number; position: 'bottom' | 'away-from-light' };
  externalShadow: { color: number; blur: number; offsetX: number; offsetY: number };
  highlight: { shape: 'sharp' | 'soft' | 'broad'; color: number; alpha: number; position: 'top' | 'toward-light' };
  edgeDefinition: 'rim-light' | 'subtle-outline' | 'ambient-occlusion';
  specialEffect: string;
  tactileVerb: string;
}
```

### Material Consistency Rules
- Every UI element, entity, and background shares the same material language
- Border-radius is a material property, not a per-element choice (rounded = organic, sharp = technical)
- Shadow direction comes from `theme.lighting.direction` — all objects agree
- The material's `specialEffect` is implemented at this stage as a static visual treatment (animated version is juice stage)

## Typography Voice

Fonts chosen for personality, not just readability.

| Element | Character | Examples |
|---------|-----------|---------|
| **Heading** | The game's personality | Rounded/bouncy for candy games, sharp/authoritative for strategy |
| **Body** | Readable, friendly | Clean sans-serif that matches the material voice |
| **Score** | Part of the game world | Bold, distinctive, feels like a game element not a debug overlay |

```typescript
fonts: {
  heading: '"Fredoka One", cursive',   // Personality
  body: '"Nunito", sans-serif',        // Readable
  score: '"Fredoka One", cursive',     // Game-world feel
}
```

> **Theme integration**: Theme colors should integrate with `GAME_FONT_FAMILY` from `src/game/config.ts`. The font family is used by the scaffold for UI text rendering.

## 5-Layer Object Rendering

Every visible game object gets 5 layers. Objects missing layers look like flat clip art. **No flat clip art.**

| # | Layer | What It Does | Skip = |
|---|-------|-------------|--------|
| 1 | **Base fill** | Main color identity | Invisible object |
| 2 | **Internal shadow** | Darker hue-shifted region inside the shape, away from light. Gives volume. | Flat sticker |
| 3 | **External shadow** | Drop/contact shadow beneath. Grounds the object in the scene. | Floating decal |
| 4 | **Highlight** | Bright spot on the toward-light side. Shape varies by material. | Unlit, dead |
| 5 | **Edge definition** | Rim light, subtle outline, or ambient occlusion. Separates from backdrop. | Blends into background |

### Pixi Implementation — Full 5-Layer Sprite

Light direction comes from `theme.lighting.direction`. The example below assumes 315° (top-left).

```typescript
import { Container, Graphics } from 'pixi.js';

function createEntity(
  color: { base: number; shadow: number; highlight: number },
  size: number,
  material: MaterialDefinition,
): Container {
  const r = material.borderRadius;
  const container = new Container();

  // --- Layer 3: External shadow (drawn first, rendered behind) ---
  const extShadow = new Graphics();
  extShadow.roundRect(3, 5, size, size, r);
  extShadow.fill({ color: color.shadow, alpha: 0.4 });
  container.addChild(extShadow);

  // --- Layer 1: Base fill ---
  const base = new Graphics();
  base.roundRect(0, 0, size, size, r);
  base.fill(color.base);
  container.addChild(base);

  // --- Layer 2: Internal shadow (away from light = bottom-right for 315° light) ---
  const intShadow = new Graphics();
  intShadow.roundRect(size * 0.1, size * 0.5, size * 0.85, size * 0.48, r);
  intShadow.fill({ color: color.shadow, alpha: 0.3 });
  container.addChild(intShadow);

  // --- Layer 4: Highlight (toward light = top-left for 315° light) ---
  const highlight = new Graphics();
  if (material.highlight.shape === 'sharp') {
    highlight.roundRect(size * 0.08, size * 0.06, size * 0.35, size * 0.15, r * 0.5);
  } else {
    highlight.roundRect(size * 0.06, size * 0.05, size * 0.7, size * 0.35, r);
  }
  highlight.fill({ color: color.highlight, alpha: material.highlight.alpha });
  container.addChild(highlight);

  // --- Layer 5: Edge definition (rim light on light-facing edges) ---
  const rim = new Graphics();
  rim.roundRect(0, 0, size, size, r);
  rim.stroke({ color: color.highlight, alpha: 0.2, width: 1.5 });
  container.addChild(rim);

  return container;
}
```

### What BAD looks like vs GOOD

```
BAD (flat):   [solid color rectangle] + [black drop shadow]
              → looks like a UI button from 2014

GOOD (5-layer): [hue-shifted drop shadow] + [base fill] + [internal shadow gradient]
                + [specular highlight spot] + [rim light edge]
              → looks lickable, dimensional, present in the scene
```

## Scene Atmosphere

The game must feel like a *place*, not a div. A textured backdrop, directional lighting, and spatial depth create the sense of being somewhere.

### Depth Layers (Pixi Container Stack)

Build the scene as a stack of Pixi containers, back to front:

| # | Layer | Contents | Pixi Implementation |
|---|-------|----------|-------------------|
| 1 | **Deep background** | Atmospheric gradient or color wash. Sets mood. | `Graphics` rect with gradient fill spanning the full stage |
| 2 | **Texture layer** | Grain, pattern, noise, or illustration. Breaks up flat color. | Tiling sprite from a subtle noise/pattern texture, low alpha |
| 3 | **Mid-ground** | Environmental detail — distant shapes, soft silhouettes | `Graphics` shapes at low alpha, optionally blurred via `BlurFilter` |
| 4 | **Game surface** | Where entities live. Clear contrast against backdrop. | Main game container |
| 5 | **Atmosphere overlay** | Vignette, light leak, ambient particles | Radial gradient `Graphics` for vignette + `ParticleContainer` for ambient |

### Pixi Implementation — Scene Background

```typescript
import { Container, Graphics, TilingSprite, Texture, BlurFilter } from 'pixi.js';

function createSceneBackground(width: number, height: number): Container {
  const bg = new Container();

  // Layer 1: Deep background gradient
  const sky = new Graphics();
  sky.rect(0, 0, width, height);
  sky.fill({
    // Use a FillGradient or two-tone based on theme
    color: theme.colors.surface.base,
  });
  bg.addChild(sky);

  // Layer 2: Texture grain (use a pre-made noise texture, tiled)
  // Generate or load a small noise texture and tile it
  const grain = new TilingSprite({
    texture: Texture.from('grain-texture.png'), // or generate procedurally
    width, height,
  });
  grain.alpha = 0.06;
  bg.addChild(grain);

  // Layer 3: Vignette overlay — darkened edges focus the eye
  const vignette = new Graphics();
  vignette.rect(0, 0, width, height);
  vignette.fill({ color: 0x000000, alpha: 0.0 });
  // Apply radial alpha mask or draw concentric rects with increasing alpha
  bg.addChild(vignette);

  return bg;
}
```

### Atmosphere Checklist (non-negotiable)

- [ ] Backdrop has visible texture — grain, pattern, gradient mesh, or illustration. **NOT a flat solid color.**
- [ ] At least 2 depth layers create spatial separation between background and game surface
- [ ] Directional lighting is consistent with `theme.lighting.direction` across scene and objects
- [ ] Shadow tints are hue-shifted (warm light = cool shadows). Never gray-on-gray.
- [ ] Edge vignette or atmospheric gradient focuses the eye toward the play area
- [ ] Optional: ambient particles (dust motes, soft sparkles, fog wisps) add life without distracting

## Affordance & Tactile Response

Clear visual hierarchy that communicates interactivity at a glance, plus physical feedback when the player touches things.

### Four Tiers
| Tier | Role | Rendering |
|------|------|-----------|
| **Primary Interactive** | Touch me! | Full 5-layer rendering, most saturated colors, largest external shadow, brightest highlight |
| **Secondary Interactive** | I'm also tappable | 5-layer but quieter — smaller shadow, softer highlight, slightly desaturated |
| **Informational** | Read me | 3 layers (base + internal shadow + edge). No external shadow. Never competes with game objects. |
| **Environmental** | I set the mood | 1-2 layers max. Desaturated, receding, part of the backdrop. |

### Test: 50% Blur
At 50% Gaussian blur, can you still tell what to touch? If yes, the affordance gradient is working. If everything blurs into sameness, the hierarchy needs more contrast.

### Press Response — What Happens on Touch

When the player touches an interactive object, it should feel physically pushed into the surface. This is implemented at the visual design stage as static states (the juice stage adds tweened transitions between them).

| Property | Rest State | Pressed State |
|----------|-----------|---------------|
| External shadow | Full offset + blur | Reduced to ~30% offset, blur shrinks |
| Highlight | Normal position | Shifts slightly away from press point |
| Scale | 1.0 | 0.95 (subtle compress toward surface) |
| Internal shadow | Normal | Slightly expanded (object looks flatter when pressed) |

```typescript
interface PressedVisualState {
  shadowOffsetScale: 0.3;
  shadowBlurScale: 0.5;
  highlightShift: { x: 1; y: 1 };
  scale: 0.95;
  internalShadowAlphaBoost: 0.15;
}
```

### Hierarchy Rule
Touchable objects are ALWAYS more dimensional and vivid than ambient elements. If a background element is competing with a game piece for attention, reduce the background element's layer count and saturation until the hierarchy is obvious.

## Layout

### Mobile-First
- Base resolution: **390x844** (iPhone 14 portrait)
- Orientation: portrait
- Safe areas: respect notch and nav bar via `CSS env()`
- Scaling: proportional with `CSS clamp()` for text

### Negative Space
White space is a design feature, not wasted space. Intentional breathing room between elements lets the visual design sing.

## Pixi Rendering Techniques

Choose what serves the game's material voice. Don't use all of these — use the ones that make THIS game's visual world real.

### Useful Pixi Patterns
- **Stacked `Graphics` layers** — the 5-layer rendering recipe above. Compose containers with multiple draw calls.
- **`TilingSprite`** — for background textures (grain, noise, patterns) that tile seamlessly
- **`BlurFilter`** — on background depth layers for depth-of-field separation
- **`ColorMatrixFilter`** — for cohesive color grading across the scene, or desaturating ambient elements
- **`Graphics` gradients** — for internal shadows, atmospheric backdrops, vignettes
- **Alpha compositing** — layer semi-transparent shapes for soft highlights and ambient occlusion
- **Procedural textures** — generate noise/grain textures at runtime for surface detail
- Custom `@font-face` for game-specific typography — don't settle for system fonts

### Scaffold Asset Integration

Game textures are loaded via `coordinator.getGpuLoader()?.createSprite(atlasAlias, frameName)`. Atlas aliases must match `scene-*` or `core-*` bundle names declared in `src/game/asset-manifest.ts`.

### Pixi Texture Cleanup

When unloading scene bundles, follow teardown order: kill GSAP tweens → removeChild → sprite.destroy() → coordinator.unloadBundle(). See scaffold-profiles skill for details.

## Validation Checklist

Ask yourself — and be honest:
- Would someone screenshot this and share it?
- Can you identify the game from one screenshot?
- Does your finger want to touch the interactive objects? Do they look *lickable*?
- Do colors tell an emotional story? Are shadows hue-shifted (not gray)?
- Does everything feel made of the same substance?
- Does the background feel like a *place* — textured, atmospheric, lit?
- Can you tell what to touch at 50% blur?
- Does every game object have all 5 layers (base, internal shadow, external shadow, highlight, edge)?
- Is lighting consistent — same direction on every object and shadow in the scene?
- Do pressed objects feel pushed into the surface?
- Is the material's signature effect visible (shimmer, squish, grain, glow)?

## What This Stage Produces

### Files Created
- `theme.ts` -- Chromatic architecture tokens + typography tokens as JS constants
- `sprites.ts` -- Visual ludeme factory functions using Pixi Graphics

### Files Modified
- `src/game/mygame/screens/gameController.ts` -- Use sprites.ts for entities, theme.ts for colors, add layered backgrounds
- `src/game/mygame/screens/startView.ts` -- Apply theme colors and typography to start screen
- `StartScreen.tsx` -- Add tailwind theme classes for container styling
- `GameScreen.tsx` -- Add tailwind theme classes for container styling

### Stage Constraints
- **No tweened animation**: Static themed graphics + pressed states only. Tweened transitions are the juice stage.
- **No sound**: Visual only. Audio is the sound stage.
- **No particles**: Ambient atmosphere particles are fine. Game effect particles (explosions, sparkles) are the juice stage.
- **Preserve feel**: Visual identity must NOT change how the game feels to play.
- **Material unity**: One material voice for every object, with its signature effect.
- **Chromatic intent**: Every color has a named emotional role with hue-shifted shadow/highlight.
- **5-layer mandatory**: Every visible game object renders all 5 layers. No exceptions.
- **Consistent lighting**: All objects and shadows lit from the same `theme.lighting.direction`.
- **Textured backdrop**: Background has visible texture and depth layers. Not a flat color.
- **Screenshot worthy**: Output should be distinctive enough to screenshot and share.
- **Mobile first**: Design for 390x844, scale up proportionally.
- **No generic defaults**: No system-ui fallback, no Material Design templates.
- **No pure black/white**: Shadows use hue-shifted darks. Highlights use hue-shifted lights.

### Exit Criteria
- Aesthetic signature identifiable from one screenshot
- Every game object renders all 5 layers (base, internal shadow, external shadow, highlight, edge)
- Material voice consistent across all objects with signature physical effect implemented
- Chromatic architecture uses emotionally named color tokens with hue-shifted shadow/highlight variants
- Lighting direction consistent across all objects and shadows in the scene
- Scene atmosphere has textured backdrop with at least 2 depth layers (not flat color)
- Shadow colors are hue-shifted — zero instances of pure black (0x000000) shadows
- Highlight colors are hue-shifted — zero instances of pure white (0xFFFFFF) highlights
- Affordance gradient makes interactivity hierarchy visually obvious (50% blur test)
- Pressed state defined for interactive objects (shadow compress, highlight shift, scale down)
- Visual ludemes communicate entity purpose through form
- Typography has personality via chosen fonts
- Layout works on 390x844 viewport
- HUD displays score and progress without competing with game objects
- Novel aesthetic does not resemble generic framework defaults

## Execute

```sudolang
fn whenImplementingVisualDesign() {
  Constraints {
    Read existing render code FIRST — list current shapes and colors before making changes (proof step)
    Entity shapes must match the design doc exactly (triangles are triangles, not rounded rectangles)
    Full color palette must be implemented — all colors in the design, not a subset
    Every color token must include base + hue-shifted shadow + hue-shifted highlight variants
    All color tokens must live in a single theme file, not scattered across components
    theme.lighting.direction must be defined and used consistently for all shadow offsets and highlight positions
    Every game object sprite must have all 5 layers: base fill, internal shadow, external shadow, highlight, edge definition
    No shadow may use 0x000000 — use the color's hue-shifted shadow variant
    No highlight may use 0xFFFFFF — use the color's hue-shifted highlight variant
    Background must have visible texture (grain, pattern, or gradient mesh) — flat solid color is a build failure
    Background must have at least 2 depth layers creating spatial separation
    Interactive objects must define a pressed visual state (shadow shrink, highlight shift, scale compress)
    Material signature effect must be visually present (e.g., grain texture for wood, specular spot for glass)
    Sprites must be drawn procedurally with Pixi Graphics or loaded from assets — no placeholder rectangles in final output
    Unlock schedule must show progressive color/element reveals matching the design
  }
}
```

### Exit Criteria (Given/Should)

- Given the theme file is inspected, should contain every color from the design doc with base + shadow + highlight variants
- Given the theme file is inspected, should define `lighting.direction` used by all sprite factories
- Given a game entity is rendered, should have all 5 layers visible (base, internal shadow, external shadow, highlight, edge)
- Given a game entity is rendered, should match the exact shape described in the design (e.g., equilateral triangle, not circle)
- Given any shadow in the codebase, should NOT be 0x000000 — must be a hue-shifted dark
- Given any highlight in the codebase, should NOT be 0xFFFFFF — must be a hue-shifted light
- Given the scene background is rendered, should have visible texture (not a flat solid color)
- Given the scene background is rendered, should have at least 2 depth layers
- Given all objects in a scene, shadows should be offset in the same direction (consistent lighting)
- Given an interactive object, should define rest and pressed visual states
- Given the material specified in the design doc, its signature effect should be visually present
- Given level 1 is loaded, should display only the colors available at level 1 per the unlock schedule
- Given a later level is loaded (past an unlock milestone), should display the newly unlocked colors/elements
- Given the codebase is searched for hardcoded color values outside theme.ts, should find zero matches
- Given the game is visually inspected, should have zero placeholder rectangles remaining
- Given the typography is rendered, should use the font family/weight/size specified in the design
