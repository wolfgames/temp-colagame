/**
 * Theme Contract
 *
 * Pure data, no logic. A Theme is the visual/audio/narrative skin for one
 * variant. Generated freshly per prompt by the translator.
 *
 * The mechanic always sees the abstract slots 'a' | 'b' | 'c'; the theme
 * names and renders what each slot is. Same for blocker, power-ups, and
 * companion — the engine never imports theme files directly. It receives
 * the active Theme through the Variant passed to GameController.
 */

import type { ObstacleType } from '../state/types';

/**
 * Companion dialogue step. Mirrors the structural shape consumed by the
 * TalkingHeads UI module but is declared here so themes don't depend on a
 * specific UI implementation.
 */
export interface ThemeDialogueStep {
  speaker: string;
  message: string;
  image?: string;
  name?: string;
  side?: 'left' | 'right';
}

/**
 * Per-zone narrative + presentation content. Field names are kept stable
 * across themes; values are theme-specific (e.g. a kitchen theme uses
 * "Honey Cake" for `goalLabel`, a spaceship theme uses "Rescue Capsule").
 */
export interface ZoneContent {
  zone: number;
  /** Headline shown in the intro interstitial. */
  orderName: string;
  /** Player-visible target name. */
  dishName: string;
  /** Sprite path for the target image. */
  dishImage: string;
  /** Companion's closing line after the zone completes. */
  nanaClosingLine: string;
  /** Intro dialogue sequence. */
  introDialogue: ThemeDialogueStep[];
  /** Quips played during the zone (mid-zone or random). */
  quips: string[];
}

/**
 * Between-zone bridge slide shown by ResultsScreen when the player crosses
 * a zone boundary. Stable shape across themes.
 */
export interface ZoneBridgeSlide {
  title: string;
  body: string;
}

/**
 * Companion expression key used by IntroInterstitial-pixi to pick the right
 * portrait per intro slide. Open-ended `string` so the morph-clearpop skill
 * (LLM-driven) can invent the expression set from each variant's narrative
 * — e.g. one theme uses `'idle' | 'amused' | 'alarmed'`, another uses
 * `'idle' | 'stoic' | 'grieving' | 'elated'`. The only invariant is that
 * `'idle'` exists in `CompanionSpec.spriteKeys` and acts as the fallback.
 * Consumers MUST resolve expressions through `companionImageFor` (or an
 * equivalent fallback) so unknown keys land on the idle portrait.
 */
export type CompanionExpression = string;

/**
 * One slide in the game-opening intro sequence. Text is required; the
 * optional `companionExpression` lets the Pixi intro swap the portrait
 * between slides (defaults to `'idle'` when omitted).
 */
export interface IntroSlide {
  text: string;
  companionExpression?: CompanionExpression;
}

/**
 * Recipe — the "what is Nana cooking next" content shown by
 * SectionInterstitial when the blocker mix changes between levels. Keyed
 * by the sorted set of obstacle types present in the upcoming section.
 *
 * Themes that don't ship a recipes table render a stub interstitial; the
 * `getRecipeForBlockers` helper falls back to `Theme.fallbackRecipe`.
 */
export interface RecipeSection {
  dishName: string;
  dishImage: string;
  /** Spoken when the section interstitial appears. */
  nanaOpeningLine: string;
  /** Spoken when the section completes (also surfaced as a zone closing line). */
  nanaClosingLine: string;
}

export type BlockSlot = 'a' | 'b' | 'c';

export interface BlockSlotSpec {
  /** Player-visible name for this block kind (e.g. "Spaceship", "Sushi"). */
  kindName: string;
  /** Asset key in the theme's sprite bundle. */
  spriteKey: string;
  /** Hex tint applied to the neutral block sprite. */
  tint: string;
}

export interface BlockerSpec {
  /** Player-visible name (e.g. "astronaut", "crystal"). */
  displayName: string;
  spriteKey: string;
}

export interface PowerUpSpec {
  displayName: string;
  spriteKey: string;
  vfxKey: string;
}

/**
 * Per-event sound reference. `sprite` is the named clip inside the loaded
 * Howl. `channel` is the asset-bundle alias the Howl was loaded under —
 * when omitted, falls back to `AudioBank.bundles.sfx` (for sfx entries)
 * or `AudioBank.bundles.music` (for music entries). `volume` overrides the
 * scaffold default (which itself differs per event class — pops are quieter
 * than win stings).
 *
 * Example — theme declares one SFX bundle plus an override for the color
 * powerup so it routes through a different Howl:
 * ```ts
 * audio: {
 *   bundles: { sfx: 'audio-sfx-star-wars-blaster', music: 'audio-music-star-wars' },
 *   sfx: {
 *     popMid: { sprite: 'shot' },                                  // → blaster channel
 *     powerup: { channel: 'audio-sfx-star-wars-lightsaber', sprite: 'ignite' },
 *   },
 * }
 * ```
 */
export interface SoundRef {
  /** Asset-bundle alias the Howl was loaded under. Defaults to the
   *  theme's `audio.bundles.sfx` / `audio.bundles.music`. */
  channel?: string;
  /** Sprite name inside the Howl. Must exist in the bundle's sprite JSON. */
  sprite: string;
  /** Optional per-event volume override (0–1). */
  volume?: number;
}

export interface AudioBank {
  /**
   * Asset-bundle aliases for this theme's audio. Bundle names must be
   * registered in `asset-manifest.ts` so the howler loader fetches them
   * during `loadAudio()`. When omitted, falls back to the eigenpop bundles
   * (`audio-sfx-clearpop` / `audio-music-clearpop`) — the bundle's sprite
   * JSON must then contain sprite names matching the keys below.
   */
  bundles?: { sfx?: string; music?: string };

  music: { menu?: SoundRef; game: SoundRef };
  /**
   * One SoundRef per gameplay event the engine plays. The slots mirror
   * SoundBank.sfx so themes can route each event to its own clip — e.g.
   * star-wars routes `colorBlast` through a lightsaber-ignite SFX while
   * keeping the rest on the blaster pew.
   */
  sfx: {
    /** A successful group-clear tap. */
    pop: SoundRef;
    /** Invalid / no-op tap. */
    reject: SoundRef;
    /** A single hit landing on a blocker that has more HP to chew through. */
    blockerHit: SoundRef;
    /** Final hit that destroys a blocker. */
    blockerClear: SoundRef;
    /** A power-up appears on the board (qualifying group cleared). */
    powerUpSpawn: SoundRef;
    /** Line / rocket power-up detonates. */
    rocket: SoundRef;
    /** Area / bomb power-up detonates. */
    bomb: SoundRef;
    /** Color-blast power-up detonates (Force Push, Rainbow Wave, etc.). */
    colorBlast: SoundRef;
    /** Combo detonation (rocket+rocket, bomb+rocket, etc.). */
    combo: SoundRef;
    /** Level win stinger. */
    win: SoundRef;
    /** Level loss stinger. */
    lose: SoundRef;
  };
}

export interface CompanionSpec {
  name: string;
  /**
   * Expression-name → portrait URL. The set is open-ended so each variant
   * can pick whichever expressions its narrative actually needs; `idle` is
   * the only required key and is used as the fallback for any unknown
   * expression at lookup time.
   */
  spriteKeys: { idle: string } & Record<string, string>;
  /** Brief for asset-gen voice generation. */
  voiceProfile: string;
}

/**
 * UI string pack — all player-visible copy for a variant. Structural shape
 * common to every theme; values vary per theme.
 */
export interface UIStringPack {
  start: {
    title: string;
    tagline: string;
    play: string;
    loading: string;
  };
  intro: {
    /** Small eyebrow label above the intro title (e.g. "NANA ROSE'S CAFÉ"). */
    eyebrow: string;
    /** Headline shown above the intro slides (e.g. "A Little Problem"). */
    title: string;
  };
  win: {
    title: string;
    nextLevel: string;
    mainMenu: string;
  };
  loss: {
    title: string;
    retry: string;
    mainMenu: string;
    encouragement: readonly string[];
  };
  interstitial: {
    continue: string;
  };
  hud: {
    ariaLoading: string;
    ariaOutOfMoves: string;
    skipDebug: string;
  };
}

/**
 * Sprite-asset overrides. Keys are the logical sprite ids the renderer
 * resolves (`base_block_blue`, `marshmallow`, `cookie_3`, `powerup-rocket`,
 * etc.); values are absolute URLs (CDN or `/assets/...`). Any key absent
 * from the override map falls through to the eigenpop default in
 * `renderers/sprite-assets.ts`.
 *
 * Special keys `background` and `frame` override the corresponding
 * `theme.background.spriteKey` / `theme.frame.spriteKey` paths at load time.
 */
export type SpriteOverrides = Readonly<Record<string, string>>;

/**
 * Brand surface that morphs with the theme — the bits of the wrapper UI
 * (title logo, start-screen background, primary CTA) that aren't gameplay
 * but still need to look like the variant, not like Pantry Pop. All values
 * are required so the engine never falls back to hardcoded eigenpop art on
 * the first or last screens.
 */
export interface BrandingSpec {
  /** Game title logo shown on the DOM start screen and the Pixi win overlay.
   *  Local sprite path (e.g. `/assets/sprites/<slug>/logo.png`). Never a CDN URL. */
  logo: string;
  /** Solid fallback background color used by the outer screen wrapper before
   *  (and behind) the gradient. CSS color string. */
  bgColor: string;
  /** Optional full CSS `background` value for the start-screen wrapper
   *  (typically a `linear-gradient(...)`). If omitted, `bgColor` is used. */
  bgGradient?: string;
  /** Two-stop linear-gradient anchors for the primary CTA button on DOM screens. */
  ctaGradient: { from: string; to: string };
  /** Color for the tagline text shown under the logo on the start screen. */
  taglineColor: string;
}

/**
 * Quip-line variants the engine plays when a level contains the named
 * obstacle. Each entry carries the spoken message plus the companion
 * expression to display alongside it.
 */
export interface BlockerQuipLine {
  message: string;
  expression: CompanionExpression;
}

export interface Theme {
  id: string;
  displayName: string;

  blocks: {
    /** 3-color slot system. Mechanic sees 'a' | 'b' | 'c'. */
    slots: Record<BlockSlot, BlockSlotSpec>;
  };

  blocker: BlockerSpec;

  powerups: {
    line: PowerUpSpec;
    area: PowerUpSpec;
    color: PowerUpSpec;
  };

  background: { spriteKey: string; perZone?: Record<number, string> };
  frame: { spriteKey: string };
  particles: { popKey: string; refillKey: string; comboKey: string };

  audio: AudioBank;
  companion: CompanionSpec;

  zones: ZoneContent[];
  strings: UIStringPack;

  /**
   * Brand surface for the wrapper UI (title logo, start-screen palette,
   * primary CTA gradient). Required so the start/results screens read as
   * the variant, not as Pantry Pop.
   */
  branding: BrandingSpec;

  /**
   * Opening intro sequence (tap-through slides shown once at game start).
   * Length should be ≥ 1; UI fades out and starts level 1 after the last
   * slide. Each slide's `companionExpression` selects the portrait shown
   * in the Pixi intro.
   */
  introSlides: readonly IntroSlide[];

  /**
   * Zone bridge content keyed by completed zone number. ResultsScreen
   * shows the bridge for the zone the player just finished when they
   * cross a zone boundary. Missing entries fall back to zone 1's bridge.
   */
  zoneBridgeSlides: Record<number, ZoneBridgeSlide>;

  /**
   * Player-visible name per obstacle type (e.g. eigenpop renames
   * `marshmallow` to `"Puff Hex"`; deepsea renames it to `"Barnacle"`).
   * Used by SectionInterstitial and any HUD that surfaces blocker names.
   */
  blockerDisplayNames: Record<ObstacleType, string>;

  /**
   * Optional priority order for picking a blocker quip when more than one
   * obstacle type is present in a level. Higher-priority types appear
   * earlier in the array. If omitted, the engine uses a stable default
   * order.
   */
  blockerQuipPriority?: readonly ObstacleType[];

  /**
   * Optional set of quip lines per obstacle type. The engine selects a
   * deterministic line per level so the same level always shows the same
   * quip. Themes that omit this field get no per-blocker quips.
   */
  blockerQuips?: Partial<Record<ObstacleType, readonly BlockerQuipLine[]>>;

  /**
   * Optional recipe lookup. Keyed by the sorted blocker-set string
   * (e.g. `"cookie,egg,marshmallow"`). When the player enters a section,
   * the engine looks up the recipe; if missing, it uses `fallbackRecipe`.
   */
  recipeSections?: Record<string, RecipeSection>;

  /**
   * Fallback recipe shown when `recipeSections` doesn't contain the
   * current blocker set. Required so the section interstitial always has
   * usable content.
   */
  fallbackRecipe: RecipeSection;

  /**
   * Optional sprite path overrides used by `loadSpriteAssets`. Keys are
   * the logical ids the renderer resolves (see `SpriteOverrides`).
   */
  spriteOverrides?: SpriteOverrides;
}
