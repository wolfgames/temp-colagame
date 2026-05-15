import type { ObstacleType } from '../../state/types';

const DISH_BASE    = '/assets/sprites/cozy-kitchen/dishes/';
const BLOCKER_BASE = '/assets/sprites/cozy-kitchen/blockers/';

export const BLOCKER_DISPLAY_NAME: Record<ObstacleType, string> = {
  marshmallow:  'Marshmallows',
  egg:          'Eggs',
  ice:          'Ice',
  jelly:        'Jelly',
  cage:         'Cages',
  safe:         'Safes',
  cookie:       'Cookies',
};

export const BLOCKER_ICON: Record<ObstacleType, string> = {
  marshmallow:  `${BLOCKER_BASE}block-obstacle-marshmallow-128.png`,
  egg:          `${BLOCKER_BASE}block-obstacle-egg-128.png`,
  ice:          `${BLOCKER_BASE}block-obstacle-egg-128.png`,
  jelly:        `${BLOCKER_BASE}block-obstacle-jelly-128.png`,
  cage:         `${BLOCKER_BASE}block-rock-stone-128.png`,
  safe:         `${BLOCKER_BASE}block-rock-stone-128.png`,
  cookie:       `${BLOCKER_BASE}block-obstacle-cookie-128.png`,
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

const RECIPE_SECTIONS: Record<string, RecipeSection> = {
  'marshmallow': {
    dishName: 'Honey Cake',
    dishImage: `${DISH_BASE}dish-honey-cake.png`,
    nanaOpeningLine: "Marshmallows everywhere — perfect for a honey cake. Let's get to work.",
    nanaClosingLine: "The honey cake is done. Not bad for a stubborn morning.",
  },
  'egg': {
    dishName: 'Celebration Tart',
    dishImage: `${DISH_BASE}dish-celebration-tart.png`,
    nanaOpeningLine: "Fresh eggs today. We're making a celebration tart — pay attention.",
    nanaClosingLine: "The celebration tart is done. Delicate work. It showed.",
  },
  'egg,marshmallow': {
    dishName: 'Honey Cake',
    dishImage: `${DISH_BASE}dish-honey-cake.png`,
    nanaOpeningLine: "Marshmallows and eggs everywhere. Perfect. We'll make a proper honey cake.",
    nanaClosingLine: "There's the honey cake. Worth every bit of the trouble.",
  },
  'cookie': {
    dishName: 'Truce Shortbread',
    dishImage: `${DISH_BASE}dish-truce-shortbread.png`,
    nanaOpeningLine: "Cookies have taken over the pantry. Good — truce shortbread it is.",
    nanaClosingLine: "The truce shortbread is done. Clean. Simple. The kind of thing people remember.",
  },
  'cookie,egg,marshmallow': {
    dishName: 'The Original Charm Cake',
    dishImage: `${DISH_BASE}dish-charm-cake.png`,
    nanaOpeningLine: "Everything is everywhere. Good. That's when the charm cake happens.",
    nanaClosingLine: "The charm cake. Thirty years. And still, every morning, a little magic.",
  },
  'jelly': {
    dishName: "Grandmother's Jam Roll",
    dishImage: `${DISH_BASE}dish-jam-roll.png`,
    nanaOpeningLine: "The jelly's spread into everything. Time for grandmother's jam roll.",
    nanaClosingLine: "The jam roll is done. I hope it tastes like what she remembers.",
  },
  'egg,jelly': {
    dishName: 'Celebration Tart',
    dishImage: `${DISH_BASE}dish-celebration-tart.png`,
    nanaOpeningLine: "Eggs and jelly — exactly what the celebration tart needs. Don't rush it.",
    nanaClosingLine: "The celebration tart is ready. Mrs. Fenn is going to love this.",
  },
  'cookie,egg,jelly': {
    dishName: "Grandmother's Jam Roll",
    dishImage: `${DISH_BASE}dish-jam-roll.png`,
    nanaOpeningLine: "Everything's sticky today. We're making the jam roll. Let's make it count.",
    nanaClosingLine: "The jam roll came together. Messy kitchen, clean result.",
  },
  'cookie,marshmallow': {
    dishName: 'Spiced Pumpkin Loaf',
    dishImage: `${DISH_BASE}dish-pumpkin-loaf.png`,
    nanaOpeningLine: "Marshmallows and cookies in the way. We're hunting them down for the pumpkin loaf.",
    nanaClosingLine: "The pumpkin loaf is ready. The festival can start.",
  },
  'cage,jelly': {
    dishName: "Grandmother's Jam Roll",
    dishImage: `${DISH_BASE}dish-jam-roll.png`,
    nanaOpeningLine: "The jelly's locked itself in. The jam roll is still happening — one way or another.",
    nanaClosingLine: "The jam roll is done. Nothing stays locked forever. Not in this kitchen.",
  },
  'cage,jelly,marshmallow': {
    dishName: 'Toasted Marshmallow Cocoa',
    dishImage: `${DISH_BASE}dish-marshmallow-cocoa.png`,
    nanaOpeningLine: "Caged marshmallows in jelly. Unusual pantry, but the cocoa will be worth it.",
    nanaClosingLine: "The cocoa is done. Unusual pantry. Unusually good result.",
  },
  'cage': {
    dishName: 'Hazelnut Praline Cake',
    dishImage: `${DISH_BASE}dish-praline-cake.png`,
    nanaOpeningLine: "Everything's locked up tight. The praline cake won't make itself.",
    nanaClosingLine: "The praline cake is done. Worth every bit of the cracking.",
  },
  'cage,cookie,marshmallow': {
    dishName: 'Seven-Layer Wedding Cake',
    dishImage: `${DISH_BASE}dish-wedding-cake.png`,
    nanaOpeningLine: "Three kinds of stubborn. This wedding cake will be worth every one of them.",
    nanaClosingLine: "The wedding cake is done. Seven layers. Every one of them earned.",
  },
  'cookie,egg': {
    dishName: 'Rose Petal Macarons',
    dishImage: `${DISH_BASE}dish-rose-macarons.png`,
    nanaOpeningLine: "Cookies and eggs — exactly what the macarons need. She knows what she's doing.",
    nanaClosingLine: "The rose petal macarons are ready. Whoever sent that order has good taste.",
  },
  'cage,cookie': {
    dishName: 'Salted Caramel Snaps',
    dishImage: `${DISH_BASE}dish-caramel-snaps.png`,
    nanaOpeningLine: "Locked up and crumbling — perfect for caramel snaps. Let's get to it.",
    nanaClosingLine: "The caramel snaps are done. Stubborn ingredients. The best ones always are.",
  },
};

const FALLBACK: RecipeSection = {
  dishName: "Nana's Special",
  dishImage: `${DISH_BASE}dish-honey-cake.png`,
  nanaOpeningLine: "The pantry has ideas of its own today.",
  nanaClosingLine: "Nana's special is done. Well. That happened. And it was good.",
};

export function getRecipeForBlockers(blockers: ObstacleType[]): RecipeSection {
  return RECIPE_SECTIONS[getRecipeKey(blockers)] ?? FALLBACK;
}
