# Recipe Narrative Arc Epic

**Status**: 📋 PLANNED
**Goal**: Replace the per-level win interstitial with a section-start interstitial driven by the blocker composition of the upcoming levels.

## Overview

The current interstitial fires after every level win, making it noise rather than narrative. The fix ties Nana's story beats to the natural sections already defined by `getAvailableObstacles` — when the blocker mix changes, Nana tells you what she's making next. The "ingredients" are the blockers; the "recipe" is the dish. One interstitial per section, zero per routine level. The completion interstitial fires at the end of each blocker section (when the mix is about to change), giving roughly 3 payoff moments per zone (~every 6–8 levels).

---

## Task A — Recipe Sections Data

Create `src/game/clearpop/ui/recipe-sections.ts` with the blocker combinations that appear across the 200-level schedule (`safe` excluded — not yet in scope).

**Requirements**:
- Given a `RecipeSection` type is needed, should define `{ dishName: string, dishImage: string, nanaOpeningLine: string }`
- Given `getRecipeKey(blockers: ObstacleType[]): string` is needed, should sort blockers alphabetically and join with `,` to produce a stable lookup key
- Given the combos from the blocker schedule are enumerated below, should define `RECIPE_SECTIONS: Record<string, RecipeSection>` using existing zone dish image paths from `zone-content.ts`
- Given an unknown blocker combination is received, should return a fallback: `{ dishName: "Nana's Special", nanaOpeningLine: "The pantry has ideas of its own today." }`
- Given the function `getRecipeForBlockers(blockers: ObstacleType[]): RecipeSection` is exported, should return the matching entry or the fallback

### Recipe sections by zone

Sections marked ⚠️ have no recipe yet and will use the fallback until defined.

**Zone 1 — levels 1–20**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 1–3 | `bubble_block` | Honey Cake | dish-honey-cake.png | "The pantry's being stubborn. Let's make something worth the trouble." |
| 4–6 | `egg` | Celebration Tart | dish-celebration-tart.png | "Fresh eggs today. We're making something delicate — pay attention." |
| 7–11 | `bubble_block,egg` | Honey Cake | dish-honey-cake.png | "Bubbles and eggs everywhere. Perfect. We'll make a proper honey cake." |
| 12–14 | `cookie` | Truce Shortbread | dish-truce-shortbread.png | "Cookies have taken over the pantry. Good — shortbread it is." |
| 15–16 | `marshmallow` | Toasted Marshmallow Cocoa | dish-marshmallow-cocoa.png | "Marshmallows in the way. Let's toast them and make something warm." |
| 17–19 | `bubble_block,cookie,egg,marshmallow` | The Original Charm Cake | dish-charm-cake.png | "Everything is everywhere. Good. That's when the real recipes happen." |
| 20 | `jelly` | Grandmother's Jam Roll | dish-jam-roll.png | "The jelly's spread into everything. We'll roll it all up properly." |

**Zone 2 — levels 21–40**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 21–25 | `egg` | Celebration Tart | dish-celebration-tart.png | "Fresh eggs today. We're making something delicate — pay attention." |
| 26–33 | `egg,jelly` | Celebration Tart | dish-celebration-tart.png | "Eggs and jelly — this is for a very particular order. Don't rush it." |
| 34–40 | `cookie,egg,jelly` | Grandmother's Jam Roll | dish-jam-roll.png | "Everything's sticky today. Jam roll. We'll make it count." |

**Zone 3 — levels 41–60**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 41–45 | `cookie` | Truce Shortbread | dish-truce-shortbread.png | "Cookies have taken over the pantry. Good — shortbread it is." |
| 46–53 | `cookie,marshmallow` | Toasted Marshmallow Cocoa | dish-marshmallow-cocoa.png | "Cookies and marshmallows. A comfort batch — someone needs cheering up." |
| 54–60 | `cookie,marshmallow,safe` | ⚠️ needs recipe | — | — |

**Zone 4 — levels 61–80**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 61–65 | `jelly` | Grandmother's Jam Roll | dish-jam-roll.png | "The jelly's spread into everything. We'll roll it all up properly." |
| 66–73 | `cage,jelly` | Grandmother's Jam Roll | dish-jam-roll.png | "The jelly's locked itself in. We'll still get to it — one way or another." |
| 74–80 | `cage,jelly,marshmallow` | Toasted Marshmallow Cocoa | dish-marshmallow-cocoa.png | "Caged marshmallows in jelly. Unusual, even for this pantry." |

**Zone 5 — levels 81–100**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 81–85 | `cage` | Hazelnut Praline Cake | dish-praline-cake.png | "Everything worth having takes some prying open." |
| 86–93 | `cage,safe` | ⚠️ needs recipe (safe) | — | — |
| 94–100 | `cage,cookie,safe` | ⚠️ needs recipe (safe) | — | — |

**Zone 6 — levels 101–120**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 101–105 | `bubble_block` | Honey Cake | dish-honey-cake.png | "The pantry's being stubborn. Let's make something worth the trouble." |
| 106–113 | `bubble_block,cookie` | Spiced Pumpkin Loaf | dish-pumpkin-loaf.png | "The cookies are hiding behind bubbles again. Let's hunt them down." |
| 114–120 | `bubble_block,cage,cookie` | Seven-Layer Wedding Cake | dish-wedding-cake.png | "Three kinds of stubborn. This is the hardest batch yet. Worth it." |

**Zone 7 — levels 121–140**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 121–125 | `egg` | Celebration Tart | dish-celebration-tart.png | "Fresh eggs today. We're making something delicate — pay attention." |
| 126–133 | `cookie,egg` | Rose Petal Macarons | dish-rose-macarons.png | "Cookies and eggs — a classic combination. She knows what she's doing." |
| 134–140 | `cookie,egg,safe` | ⚠️ needs recipe (safe) | — | — |

**Zone 8 — levels 141–160**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 141–145 | `cookie` | Truce Shortbread | dish-truce-shortbread.png | "Cookies have taken over the pantry. Good — shortbread it is." |
| 146–153 | `cage,cookie` | Salted Caramel Snaps | dish-caramel-snaps.png | "Locked up and crumbling. Just how I like them." |
| 154–160 | `bubble_block,cage,cookie` | Seven-Layer Wedding Cake | dish-wedding-cake.png | "Three kinds of stubborn. This is the hardest batch yet. Worth it." |

**Zone 9 — levels 161–180**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 161–165 | `cookie` | Truce Shortbread | dish-truce-shortbread.png | "Cookies have taken over the pantry. Good — shortbread it is." |
| 166–173 | `cookie,safe` | ⚠️ needs recipe (safe) | — | — |
| 174–180 | `cookie,egg,safe` | ⚠️ needs recipe (safe) | — | — |

**Zone 10 — levels 181–200**

| Levels | Blockers | Dish | Image | Nana opening line |
|--------|----------|------|-------|-------------------|
| 181–185 | `cage` | Hazelnut Praline Cake | dish-praline-cake.png | "Everything worth having takes some prying open." |
| 186–193 | `cage,safe` | ⚠️ needs recipe (safe) | — | — |
| 194–200 | `cage,cookie,safe` | ⚠️ needs recipe (safe) | — | — |

---

## Task B — Section Interstitial UI

Create `src/game/clearpop/ui/SectionInterstitial-pixi.ts` — the Pixi overlay shown at the start of a new recipe section.

**Requirements**:
- Given a new `SectionInterstitialPixiDeps` interface is needed, should define `{ width, height, recipe: RecipeSection, onComplete: () => void }`
- Given the visual structure from `Interstitial-pixi.ts` is reusable, should replicate dark background + dish image + dish name + Nana portrait + speech bubble + "TAP TO CONTINUE" hint
- Given the tone is forward-looking (section open), should use `nana-neutral.png` portrait and frame the bubble as "Here's what we're making"
- Given the component is created, should return `{ destroy() }` and kill all GSAP tweens + remove children on destroy
- Given the entrance animation is needed, should fade in root, scale up dish holder with `back.out(1.7)`, pulse hint alpha

---

## Task C — Remove Per-Level Win Interstitial + Wire Section Detection

Modify `GameController.ts` to remove the per-level interstitial from the win path and replace it with section-boundary detection on the "Next Level" tap.

**Requirements**:
- Given the current win path calls `createInterstitialPixi` 1 second after every win (line ~315), should remove that call and go directly to `showResultsOverlay(true)` after the 1s delay
- Given a `currentSectionKey: string` private field is needed on `GameController`, should initialise it to `''` and set it to `getRecipeKey(getAvailableObstacles(level))` at the start of each `startLevel()` call
- Given the "Next Level" button tap handler runs (line ~494), should compute `nextLevel` after `incrementLevel()`, then compare `getRecipeKey(getAvailableObstacles(nextLevel))` against `currentSectionKey`
- Given the keys differ (new section) AND no zone interstitial is due, should show `createSectionInterstitialPixi` → on dismiss → `startLevel()`
- Given a zone interstitial is also due (level % 20 === 0), should show the zone interstitial first (existing behaviour); the zone interstitial already handles the section payoff narrative so no section interstitial is needed
- Given it is the very first level (level 1), should skip the section interstitial on initial load (intro interstitial already covers this)
- Given `createInterstitialPixi` import is now unused, should remove the import from `GameController.ts`
