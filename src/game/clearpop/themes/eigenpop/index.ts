/**
 * Eigenpop Theme — the original ClearPop cozy-kitchen variant.
 *
 * Bundles the zones, strings, sprite keys, audio keys, and companion config
 * into a single Theme object satisfying the contracts/theme.ts shape.
 *
 * This is the baseline theme. Step 6's prompt translator will emit similar
 * Theme objects for new variants. GameController currently still imports
 * sub-modules directly (zones.ts, strings.ts, recipes.ts); migrating
 * GameController to consume `variant.theme` is the next decoupling pass.
 */

import type { Theme, IntroSlide, BlockerQuipLine, ZoneBridgeSlide, RecipeSection } from '../../contracts/theme';
import type { ObstacleType } from '../../state/types';
import { EIGENPOP_THEME_AUDIO } from '~/game/audio/sound-bank';
import { STRINGS } from './strings';
import { ALL_ZONES, INTRO_SLIDES as RAW_INTRO_SLIDES, ZONE_BRIDGE_SLIDES } from './zones';
import { BLOCKER_DISPLAY_NAME, RECIPE_SECTIONS, FALLBACK_RECIPE } from './recipes';

const SPRITE_BASE = '/assets/sprites/cozy-kitchen';

const INTRO_SLIDES: readonly IntroSlide[] = [
  { text: RAW_INTRO_SLIDES[0]!, companionExpression: 'idle'      },
  { text: RAW_INTRO_SLIDES[1]!, companionExpression: 'happy'     },
  { text: RAW_INTRO_SLIDES[2]!, companionExpression: 'sad'       },
  { text: RAW_INTRO_SLIDES[3]!, companionExpression: 'happy'     },
];

const BLOCKER_QUIPS: Partial<Record<ObstacleType, readonly BlockerQuipLine[]>> = {
  cookie: [
    { message: "Hex Cookie. Grief that baked itself stone-hard. This one will take a few tries.",                                  expression: 'surprised' },
    { message: "The Hex Cookies are the ones that have been sitting in the pantry for years. They don't shift on the first pass.", expression: 'idle'      },
    { message: "Hex Cookies are the hardest to clear. They're like a brick wall. But I'll get through it.",                        expression: 'surprised' },
  ],
  egg: [
    { message: "Pantry Egg. Fragile little things. They need to be handled with care.",                                            expression: 'surprised' },
    { message: "Don't see these too often. The Pantry Egg means someone out there is on the edge. I treat these gently.",          expression: 'idle'      },
    { message: "These form when someone's been holding a feeling so carefully it's gone delicate. Nearly cracked already.",        expression: 'surprised' },
  ],
  marshmallow: [
    { message: "These pop up when someone has been holding onto something for too long. It takes up space in the mind, and my pantry.", expression: 'sad'   },
    { message: "The Puff Hex expands when a feeling has had nowhere to go. Today it's taken up most of the shelf.",                expression: 'idle'      },
    { message: "When a member of the town is struggling, these puff up in the pantry.",                                            expression: 'surprised' },
  ],
  jelly: [
    { message: "Spell Residue. Old anger gone sticky. Clearing these up is a pain.",                                               expression: 'surprised' },
    { message: "Spell Residue is like molasses. It gets into everything.",                                                         expression: 'idle'      },
    { message: "These charms are thick and sticky. Might need a little elbow grease to get them moving.",                          expression: 'surprised' },
  ],
  cage: [
    { message: "Vine Tangle. The result of chronic worry. The town is stressed, and now, so am I.",                                expression: 'sad'       },
    { message: "Chronic worry looks like this in the pantry — vines over everything, touching what they shouldn't.",               expression: 'idle'      },
    { message: "The Vine Tangles are the worst. They're like a living, breathing mess.",                                           expression: 'surprised' },
  ],
  safe: [
    { message: "Grimoire Box. The result of long-held secrets. Takes a few tries to crack them.",                                  expression: 'surprised' },
    { message: "You never know what you might find in a Grimoire Box. A little extra complication for the morning.",               expression: 'idle'      },
    { message: "Approach these with caution. You never know what you might find inside.",                                          expression: 'happy'     },
  ],
};

const BLOCKER_PRIORITY: readonly ObstacleType[] = [
  'egg',
  'cookie',
  'marshmallow',
  'safe',
  'jelly',
  'cage',
];

const FALLBACK_BRIDGE: ZoneBridgeSlide = ZONE_BRIDGE_SLIDES[1]!;
const ZONE_BRIDGES: Record<number, ZoneBridgeSlide> = ZONE_BRIDGE_SLIDES;

const FALLBACK: RecipeSection = FALLBACK_RECIPE;

export const eigenpopTheme: Theme = {
  id: 'eigenpop',
  displayName: 'Pantry Pop',

  blocks: {
    slots: {
      a: { kindName: 'Blue Block',   spriteKey: 'base_block_blue',   tint: '#9b7ed8' },
      b: { kindName: 'Red Block',    spriteKey: 'base_block_red',    tint: '#f04840' },
      c: { kindName: 'Yellow Block', spriteKey: 'base_block_yellow', tint: '#ffee22' },
    },
  },

  blocker: {
    displayName: 'Blocker',
    spriteKey: 'block-obstacle-marshmallow-128',
  },

  powerups: {
    line:  { displayName: 'Pepper Rocket', spriteKey: 'powerup-rocket',     vfxKey: 'vfx-pepper-fire' },
    area:  { displayName: 'Spice Bomb',    spriteKey: 'powerup-bomb',       vfxKey: 'vfx-spice-blast' },
    color: { displayName: 'Color Blast',   spriteKey: 'powerup-colorblast', vfxKey: 'vfx-color-burst' },
  },

  background: {
    spriteKey: `${SPRITE_BASE}/pantrypop_bg.png`,
  },
  frame: {
    spriteKey: `${SPRITE_BASE}/frame/kitchen-frame`,
  },
  particles: {
    popKey:    'popcorn',
    refillKey: 'sparkle',
    comboKey:  'fire',
  },

  audio: EIGENPOP_THEME_AUDIO,

  companion: {
    name: 'Nana Rose',
    spriteKeys: {
      idle:      `${SPRITE_BASE}/nana/nana-neutral.png`,
      happy:     `${SPRITE_BASE}/nana/nana-pleased.png`,
      sad:       `${SPRITE_BASE}/nana/nana-exasperated.png`,
      surprised: `${SPRITE_BASE}/nana/nana-surprised.png`,
    },
    voiceProfile: 'warm, motherly, lightly sardonic; mid-60s baker, calm authority',
  },

  zones: ALL_ZONES,

  strings: STRINGS,

  branding: {
    logo: '/assets/pantry-pop-logo.png',
    bgColor: '#FFF8EE',
    bgGradient: 'linear-gradient(175deg, #FFF8EE 0%, #FFE8C8 50%, #FFD6A0 100%)',
    ctaGradient: { from: '#FF8C42', to: '#E85D26' },
    taglineColor: '#9B6B3E',
  },

  introSlides: INTRO_SLIDES,
  zoneBridgeSlides: ZONE_BRIDGES,
  blockerDisplayNames: BLOCKER_DISPLAY_NAME,
  blockerQuipPriority: BLOCKER_PRIORITY,
  blockerQuips: BLOCKER_QUIPS,
  recipeSections: RECIPE_SECTIONS,
  fallbackRecipe: FALLBACK,
};

export default eigenpopTheme;
