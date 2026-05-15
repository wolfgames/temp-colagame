import type { ObstacleType } from '../../state/types';

const DISH_BASE    = '/assets/sprites/cozy-kitchen/dishes/';
const BLOCKER_BASE = '/assets/sprites/cozy-kitchen/blockers/';

// Display names match the design doc's obstacle names exactly.
// The underlying ObstacleType keys are the engine's internal identifiers;
// what players and Nana's dialogue refer to are these names.
export const BLOCKER_DISPLAY_NAME: Record<ObstacleType, string> = {
  egg:          'Pantry Egg',
  ice:          'Pantry Egg',
  jelly:        'Spell Residue',
  cage:         'Vine Tangle',
  safe:         'Grimoire Box',
  cookie:       'Hex Cookie',
  marshmallow:  'Puff Hex',
};

export const BLOCKER_ICON: Record<ObstacleType, string> = {
  egg:          `${BLOCKER_BASE}block-obstacle-egg-128.png`,
  ice:          `${BLOCKER_BASE}block-obstacle-egg-128.png`,
  jelly:        `${BLOCKER_BASE}block-obstacle-jelly-128.png`,
  cage:         `${BLOCKER_BASE}block-rock-stone-128.png`,
  safe:         `${BLOCKER_BASE}block-rock-stone-128.png`,
  cookie:       `${BLOCKER_BASE}block-obstacle-cookie-128.png`,
  marshmallow:  `${BLOCKER_BASE}block-obstacle-marshmallow-128.png`,
};

export interface RecipeSection {
  dishName: string;
  dishImage: string;
  nanaOpeningLine: string;
  nanaClosingLine: string;
}

export function getRecipeKey(blockers: ObstacleType[]): string {
  return [...blockers].sort().join(',');
}

export const RECIPE_SECTIONS: Record<string, RecipeSection> = {
  'marshmallow': {
    dishName: 'Honey Cake',
    dishImage: `${DISH_BASE}dish-honey-cake.png`,
    nanaOpeningLine: "Sweet as summer honey, with just enough warmth to make a weary heart soften.",
    nanaClosingLine: "The honey cake is done. The customer can breathe easy. So can my pantry.",
  },
  'egg': {
    dishName: 'Celebration Tart',
    dishImage: `${DISH_BASE}dish-celebration-tart.png`,
    nanaOpeningLine: "Bright fruit, buttery crust, and enough sweetness to make any celebration feel special.",
    nanaClosingLine: "The celebration tart is done. Mrs. Fenn can enjoy her party. And I can enjoy my peace.",
  },
  'cookie': {
    dishName: 'Truce Shortbread',
    dishImage: `${DISH_BASE}dish-truce-shortbread.png`,
    nanaOpeningLine: "My rival thinks my work isn't up to par? She hasn't tried my shortbread, clearly.",
    nanaClosingLine: "Redemption is a dish best served warm. And with a smile.",
  },
  'cookie,egg,marshmallow': {
    dishName: 'The Original Charm Cake',
    dishImage: `${DISH_BASE}dish-charm-cake.png`,
    nanaOpeningLine: "The Charm Cake. The first recipe my mother ever crafted. And the only one I've never made.",
    nanaClosingLine: "I spent years avoiding this recipe. Turns out, it was exactly what I needed to heal.",
  },
  'cookie,marshmallow': {
    dishName: 'Spiced Pumpkin Loaf',
    dishImage: `${DISH_BASE}dish-pumpkin-loaf.png`,
    nanaOpeningLine: "Hundreds of people turn out for the harvest festival. Not one of them hates the Spiced Pumpkin Loaf. It's Autumn in a bite.",
    nanaClosingLine: "The pumpkin loaf is ready. The festival can start. And the neighborhood can enjoy their warm memories.",
  },
  'cage,cookie,marshmallow': {
    dishName: 'Seven-Layer Wedding Cake',
    dishImage: `${DISH_BASE}dish-wedding-cake.png`,
    nanaOpeningLine: "Love is sweet but my cake is sweeter. Frosting, fondant, and a little magic to make it all come together.",
    nanaClosingLine: "The wedding cake is done. The couple is happy. And my invite to the ceremony is in the mail.",
  },
  'cookie,egg': {
    dishName: 'Rose Petal Macarons',
    dishImage: `${DISH_BASE}dish-rose-macarons.png`,
    nanaOpeningLine: "Soft on the inside, crunchy on the outside. Sounds a bit like me, hehe!",
    nanaClosingLine: "The rose petal macarons are ready. And they look just as lovely as I imagined.",
  },
  'cage,cookie': {
    dishName: 'Teaching Cookies',
    dishImage: `${DISH_BASE}dish-caramel-snaps.png`,
    nanaOpeningLine: "Soft-spiced cookies with a steady warmth — perfect for calming the nerves.",
    nanaClosingLine: "Looks like those cookies gave her the confidence she needed.",
  },
};

export const FALLBACK_RECIPE: RecipeSection = {
  dishName: "Nana's Special",
  dishImage: `${DISH_BASE}dish-honey-cake.png`,
  nanaOpeningLine: "The pantry has ideas of its own today. I've learned not to argue.",
  nanaClosingLine: "The dish is done. The pantry is clear. And the bakery keeps running.",
};

export function getRecipeForBlockers(blockers: ObstacleType[]): RecipeSection {
  return RECIPE_SECTIONS[getRecipeKey(blockers)] ?? FALLBACK_RECIPE;
}

