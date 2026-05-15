import type { SpeakerConfig } from '../../ui/TalkingHeads';
import type { ObstacleType } from '../../state/types';
import type { ZoneContent, ThemeDialogueStep as DialogueStep } from '../../contracts/theme';

export type { ZoneContent };

const NANA = {
  neutral:     '/assets/sprites/cozy-kitchen/nana/nana-neutral.png',
  pleased:     '/assets/sprites/cozy-kitchen/nana/nana-pleased.png',
  exasperated: '/assets/sprites/cozy-kitchen/nana/nana-exasperated.png',
  watchful:    '/assets/sprites/cozy-kitchen/nana/nana-surprised.png',
} as const;

export const NANA_SPEAKER: SpeakerConfig = {
  name: 'NANA ROSE',
  image: NANA.neutral,
  side: 'left',
  portrait: { width: 300, offsetX: -80, offsetY: 20 },
};

const ZONES: Record<number, ZoneContent> = {
  1: {
    zone: 1,
    orderName: 'First Batch of the Season',
    dishName: 'Honey Cake',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-honey-cake.png',
    nanaClosingLine: 'Look at that! Easy as pie. Or cake. Whatever you want to call it.',
    introDialogue: [
      { speaker: 'nana', image: NANA.neutral,     message: "One of my regulars wants a honey cake. I know that recipe like the back of my flour-covered hands." },
      { speaker: 'nana', image: NANA.watchful,    message: "The problem? I need marshmallows. And these pesky charms are in the way. Let's clear them out." },
    ],
    quips: [
      "These charms are the only thing standing between me and a warm oven.",
      "Can’t bake much of anything until these charms stop clogging the shelves.",
      "The pantry’s restless today. Means the town probably is too.",
      "Remove the charms, bake the dish, lighten the heart. Simple as that.",
      "A calm pantry makes for easy baking. Today’s not one of those days.",
      "You learn a lot about people by the state of my pantry.",
      "Some recipes feed the stomach. The best ones feed the spirit too.",
    ],
  },
  2: {
    zone: 2,
    orderName: "Mrs. Fenn's 80th Birthday",
    dishName: 'Celebration Tart',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-celebration-tart.png',
    nanaClosingLine: "The only thing sweeter than the tart is the smile on Mrs. Fenn's face. Her best years are ahead of her.",
    introDialogue: [
      { speaker: 'nana', image: NANA.pleased,     message: "Mrs. Fenn turns eighty today. She gets the same thing every year - a celebration tart." },
      { speaker: 'nana', image: NANA.watchful,    message: "She's throwing herself a party in an hour, and my ingredients are trapped under a mountain of charms. Typical Tuesday." },
    ],
    quips: [
      "People come here for pastries. They leave with a little peace.",
      "Nothing steadies the soul quite like something fresh from the oven.",
      "The oven’s hot, the charms are stubborn, and the day’s just getting started.",
      "No matter how cluttered the pantry gets, there’s always a way through.",
      "Funny thing about these charms — a little of their magic always seeps into the food. That's the secret to my success.",
      "The pantry's starting to clear up. Almost there, Mrs. Fenn.",
      "Last push. A few more ingredients and the tart will be ready. And her problems will be gone.",
    ],
  },
  3: {
    zone: 3,
    orderName: 'A Rainy Tuesday',
    dishName: 'Toasted Marshmallow Cocoa',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-marshmallow-cocoa.png',
    nanaClosingLine: "He sat at the corner table for an hour and sipped his cocoa. When he left, I saw a glimmer of a smile. I consider that a job well done.",
    introDialogue: [
      { speaker: 'nana', image: NANA.neutral,     message: "It's raining. Theo always comes when it's raining. My hot cocoa always raises his spirits." },
      { speaker: 'nana', image: NANA.watchful,    message: "The longer it takes to clear the charms, the deeper his frown gets. This cocoa is important to him." },
    ],
    quips: [
      "The charms keep crowding the cocoa powder. Like they don’t want me reaching it.",
      "Theo's lonely, I think. This cocoa is his only reprieve.",
      "A little charm magic in hot cocoa can warm more than cold hands.",
      "Rainy days make for stubborn charms. Good thing I’ve dealt with worse.",
      "Theo always orders the same thing. Guess some hearts settle into routines.",
      "Nothing chases gloom away like melted chocolate and toasted marshmallow.",
      "Easy now. The charms are fragile today, and so is the mood they came from.",
    ],
  },
  4: {
    zone: 4,
    orderName: "A Young Witch's First Lesson",
    dishName: 'Teaching Cookies',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-teaching-cookies.png',
    nanaClosingLine: "Look at the smile on her face. Sometimes all it takes is warmth, sweetness, and a reminder that you’re stronger than you think",
    introDialogue: [
      { speaker: 'nana', image: NANA.pleased,     message: "A young witch came in this morning. She reminds me of myself at that age. She's nervous but determined." },
      { speaker: 'nana', image: NANA.watchful,    message: "She's got a big magic test coming up. My teaching cookies are her only hope." },
    ],
    quips: [
      "The pantry’s tied itself in knots today. Happens when someone’s carrying too many worries at once.",
      "A nervous heart leaves the pantry tangled from shelf to shelf.",
      "The magic in these cookies should steady her nerves a little.",
      "First lessons always come with fear. Even I wasn’t spared that.",
      "A little cinnamon, a little honey, and a touch of magic goes a long way.",
      "Young witches always carry too much pressure into the bakery.",
      "The oven’s ready. Now we just need the pantry to stop fussing.",
    ],
  },
  5: {
    zone: 5,
    orderName: "An Anonymous Order",
    dishName: 'Rose Petal Macarons',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-rose-macarons.png',
    nanaClosingLine: "Nobody came to collect them. They sat on the counter all morning. Unrequited love remains unrequited... a pity.",
    introDialogue: [
      { speaker: 'nana', image: NANA.watchful,    message: "Strange. We got an anonymous order. Rose petal macarons. My favorite. Not many people know that." },
      { speaker: 'nana', image: NANA.neutral,     message: "I'm far too old for secret admirers. But an order's an order. Let's get cooking." },
    ],
    quips: [
      "Love makes the pantry behave strangely. Too quiet one moment, overflowing the next.",
      "These charms are warm to the touch. Strong feelings tend to leave a trace.",
      "Love’s a messy thing. So is baking.",
      "Macarons are fragile. Handle them wrong and the whole thing falls apart. Feelings aren’t much different.",
      "A careful hand and a hopeful heart — that’s the recipe today.",
      "The charms are nearly gone. The recipe's complete. Time to see who made the order...",
    ],
  },
  6: {
    zone: 6,
    orderName: 'The Harvest Festival',
    dishName: 'Spiced Pumpkin Loaf',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-pumpkin-loaf.png',
    nanaClosingLine: "There you have it. A handful of pumpkin loaves later and the neighborhood is walking on sunshine. Everyone deserves happiness. And today, they get it.",
    introDialogue: [
      { speaker: 'nana', image: NANA.pleased,     message: "The Harvest Festival happens every year. The whole street makes orders at once. It's never not chaotic." },
      { speaker: 'nana', image: NANA.exasperated, message: "There's something extra special in this bread. Is it the magic? Is it the cinnamon? Who's to say?" },
    ],
    quips: [
      "Festival days always overwhelm the pantry. Too many emotions arriving at once.",
      "Every shelf’s overflowing today — excitement, homesickness, joy, grief. A gamut of emotions.",
      "The charms are piling up faster than I can clear them. 'Tis the season for magic, I suppose.",
      "Pumpkin spice and charm dust everywhere. Try not to get dizzy.",
      "Nothing brings people together like warm bread and shared memories.",
      "The energy out there is lovely. In here, it is a lot. But we'll get through it.",
      "The neighborhood needs this dish, even if they don't know it yet.",
    ],
  },
  7: {
    zone: 7,
    orderName: 'The Wedding Commission',
    dishName: 'Seven-Layer Wedding Cake',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-wedding-cake.png',
    nanaClosingLine: "The cake held together beautifully. With any luck, the couple will too.",
    introDialogue: [
      { speaker: 'nana', image: NANA.neutral,     message: "A couple came in with a request for a wedding cake. Love that strong tends to make the pantry act strange." },
      { speaker: 'nana', image: NANA.watchful,    message: "A recipe this complex requires a lot of ingredients. And a lot of patience." },
    ],
    quips: [
      "Seven layers of cake, and somehow even more layers of emotion.",
      "The pantry’s almost glowing. Haven’t seen that since the last wedding commission.",
      "A good wedding cake should taste as good as it looks. And this one will look amazing.",
      "Every layer of this cake counts. We need every ingredient to make it perfect.",
      "I don't want to ruin this. They're in love. And I'm in love with the idea of them being together.",
      "Final layer. The pantry and I have said what needs to be said. Now, they must say I DO.",
    ],
  },
  8: {
    zone: 8,
    orderName: 'A Simple Almond Galette',
    dishName: 'Almond Galette',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-almond-galette.png',
    nanaClosingLine: "I watched the tension leave her shoulders one bite at a time. That’s usually how healing starts around here.",
    introDialogue: [
      { speaker: 'nana', image: NANA.watchful,    message: "Today's customer: a former baker. She used to make this dish herself, years ago. Before she gave it all up." },
      { speaker: 'nana', image: NANA.neutral,     message: "The pantry's carrying all that baggage. Clear these charms and we might be able to help her." },
    ],
    quips: [
      "An almond galette’s a humble thing. Honest food for honest emotions.",
      "You can tell when someone misses the life they almost had.",
      "Sometimes the hardest thing isn’t moving forward. It’s accepting the road you already chose.",
      "There’s something grounding about rolling dough by hand. It's my favorite therapy.",
      "The pantry's almost as nutty as the galette itself. Let's get this done.",
      "A few more cleared shelves and she'll be on her way to a new chapter.",
    ],
  },
  9: {
    zone: 9,
    orderName: 'The Rival Baker',
    dishName: 'Truce Shortbread',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-truce-shortbread.png',
    nanaClosingLine: "Her poker face could use some work. One bite of my shortbread and I knew she loved it.",
    introDialogue: [
      { speaker: 'nana', image: NANA.exasperated, message: "My greatest rival. She came in this morning, sat at the counter for an hour, and ordered shortbread." },
      { speaker: 'nana', image: NANA.watchful,    message: "I don't know what she's up to. But she asked for the shortbread and I'm not about to let her down." },
    ],
    quips: [
      "She walked into my bakery carrying enough pride to clog the whole pantry.",
      "A rival baker ordering my shortbread? Either she’s desperate or curious.",
      "If I cut corners, she'll know. I can't have that.",
      "Baking for someone you dislike builds character. That's what I tell myself anyway.",
      "A good baker can recognize quality, even through clenched teeth.",
      "Last one. The dish is perfect. She's going to like it. Maybe she'll give up her crusade.",
    ],
  },
  10: {
    zone: 10,
    orderName: "The Bakery's Anniversary",
    dishName: 'The Original Charm Cake',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-charm-cake.png',
    nanaClosingLine: "I may never speak to Mom again. But this work? It keeps me close to her. And for that reason... we keep going.",
    introDialogue: [
      { speaker: 'nana', image: NANA.neutral,     message: "Thirty years. I've made dishes for everyone in this town. But today, I'm making one for myself." },
      { speaker: 'nana', image: NANA.watchful,    message: "There's a page in the recipe book I've been avoiding. My mother's final recipe. In her own handwriting." },
      { speaker: 'nana', image: NANA.pleased,     message: "If I can clear the charms, I can make this dish. And maybe, just maybe, I can find some peace." },
    ],
    quips: [
      "Thirty years. Not the life I planned. The one I chose anyway.",
      "I spent years thinking this bakery trapped me. Now I’m not sure who saved who.",
      "The pantry’s carrying my feelings for once. That’s new.",
      "My mother's handwriting...it's been awhile since I've seen it. And it hurts all the same.",
      "The town has always had problems. I've always had solutions. Today, I'm helping myself.",
      "Last one. Then I'll make myself a cup of tea and let my heart rest.",
    ],
  },
};

/**
 * Flat array view of every zone — fed to `eigenpopTheme.zones` so consumers
 * can iterate without knowing the internal record shape.
 */
export const ALL_ZONES: ZoneContent[] = Object.values(ZONES).sort((a, b) => a.zone - b.zone);

// Expression assigned per quip index — cycles with the quip list.
// Pattern: watchful → neutral → watchful → neutral → pleased → neutral → watchful → pleased
const QUIP_EXPRESSIONS: Array<keyof typeof NANA> = [
  'watchful', 'neutral', 'watchful', 'neutral', 'pleased', 'neutral', 'watchful', 'pleased',
];

// Blocker-specific quips — shown when a level contains that obstacle type.
// Named for what they actually are: hardened feelings that resist the morning's work.
const BLOCKER_QUIPS: Partial<Record<ObstacleType, Array<{ message: string; expression: keyof typeof NANA }>>> = {
  cookie: [
    { message: "Hex Cookie. Grief that baked itself stone-hard. This one will take a few tries.",                                        expression: 'watchful'     },
    { message: "The Hex Cookies are the ones that have been sitting in the pantry for years. They don't shift on the first pass.",       expression: 'neutral'      },
    { message: "Hex Cookies are the hardest to clear. They're like a brick wall. But I'll get through it.",                              expression: 'watchful'     },
  ],
  egg: [
    { message: "Pantry Egg. Fragile little things. They need to be handled with care.",                                                expression: 'watchful'     },
    { message: "Don't see these too often. The Pantry Egg means someone out there is on the edge. I treat these gently.",                            expression: 'neutral'      },
    { message: "These form when someone's been holding a feeling so carefully it's gone delicate. Nearly cracked already.",              expression: 'watchful'     },
  ],
  marshmallow: [
    { message: "These pop up when someone has been holding onto something for too long. It takes up space in the mind, and my pantry.",       expression: 'exasperated'  },
    { message: "The Puff Hex expands when a feeling has had nowhere to go. Today it's taken up most of the shelf.",                   expression: 'neutral'      },
    { message: "When a member of the town is struggling, these puff up in the pantry.",                               expression: 'watchful'     },
  ],
  jelly: [
    { message: "Spell Residue. Old anger gone sticky. Clearing these up is a pain.",                          expression: 'watchful'     },
    { message: "Spell Residue is like molasses. It gets into everything.",                  expression: 'neutral'      },
    { message: "These charms are thick and sticky. Might need a little elbow grease to get them moving.",                        expression: 'watchful'     },
  ],
  cage: [
    { message: "Vine Tangle. The result of chronic worry. The town is stressed, and now, so am I.",                            expression: 'exasperated'  },
    { message: "Chronic worry looks like this in the pantry — vines over everything, touching what they shouldn't.",                   expression: 'neutral'      },
    { message: "The Vine Tangles are the worst. They're like a living, breathing mess.",                                  expression: 'watchful'     },
  ],
  safe: [
    { message: "Grimoire Box. The result of long-held secrets. Takes a few tries to crack them.",                                      expression: 'watchful'    },
    { message: "You never know what you might find in a Grimoire Box. A little extra complication for the morning.",        expression: 'neutral'      },
    { message: "Approach these with caution. You never know what you might find inside.",           expression: 'pleased'      },
  ],
};

// Priority order — most narratively specific blockers get picked first when multiple are present.
const BLOCKER_PRIORITY: ObstacleType[] = ['egg', 'cookie', 'marshmallow', 'safe', 'jelly', 'cage'];

// ── Intro story ───────────────────────────────────────────────────────────────

export const INTRO_SLIDES = [
  "Thirty years ago, after the death of my mother, I walked into the bakery to find the pantry overrun with crystallized charms... and I had no idea why.",
  "Mom left me a book that explained it all. The pantry reacts to the emotions people bring into the bakery. Stress, grief, worry - they crystallize into charms that clutter the shelves.",
  "It took me years to understand the process: clear the charms, reach the ingredients, and prepare the customer’s order. The magic in the dish eases their troubles.",
  "The customers don't know any of this. All they know is they feel lighter when they leave than when they arrived. To me, that’s what matters.",
] as const;

// ── Zone bridge slides ─────────────────────────────────────────────────────────
// Shown at zone boundaries in the results screen. A single title + body per zone completion.

export interface ZoneBridgeSlide {
  title: string;
  body: string;
}

export const ZONE_BRIDGE_SLIDES: Record<number, ZoneBridgeSlide> = {
  1:  { title: 'First Batch of the Season',       body: "The honey cake is done. The customer is happy. And I'm ready for a nap." },
  2:  { title: "Mrs. Fenn's Order: Delivered",    body: "The celebration tart came out beautifully. Mr. Fenn gobbled it up and left with a skip in her step." },
  3:  { title: 'Rainy Tuesday: Handled',          body: "Theo sipped the cocoa with a smile. First one I've seen in awhile." },
  4:  { title: "First Lesson: Complete",          body: "The witch is young. She's anxious. But she'll get better in time. I can attest to that." },
  5:  { title: 'Anonymous Order: Fulfilled',      body: "The macarons never left the counter. Not sure who ordered it. But I guess I have an afternoon snack now." },
  6:  { title: 'Festival Week: Survived',         body: "The pumpkin loaves are out and the festival is in full swing. Look at those smiling faces!" },
  7:  { title: 'The Commission: Complete',        body: "Seven layers of love and commitment. With a pinch of magic, of course." },
  8:  { title: 'The Galette: Ready',              body: "The galette's got a crunch. And the customer's got a smile." },
  9:  { title: 'Truce Shortbread: Done',          body: "She'll love this dish, even if she tells everyone she doesn't." },
  10: { title: 'Thirty Years',                   body: "Sometimes, you need to do something for yourself. Today, that something came in the form of cake." },
};

export function getZoneBridgeSlide(zone: number): ZoneBridgeSlide {
  return ZONE_BRIDGE_SLIDES[zone] ?? ZONE_BRIDGE_SLIDES[1]!;
}

export const LEVELS_PER_ZONE = 10;

export function getLevelZone(level: number): number {
  return Math.floor((level - 1) / LEVELS_PER_ZONE) + 1;
}

export function isZoneFirstLevel(level: number): boolean {
  return (level - 1) % LEVELS_PER_ZONE === 0;
}

export function isZoneLastLevel(level: number): boolean {
  return level > 0 && level % LEVELS_PER_ZONE === 0;
}

export function getZoneContent(zone: number): ZoneContent | null {
  return ZONES[zone] ?? null;
}

export function getZoneIntro(zone: number): DialogueStep[] | null {
  return ZONES[zone]?.introDialogue ?? null;
}

export function getLevelQuip(level: number): DialogueStep {
  const zone = getLevelZone(level);
  const zoneData = ZONES[zone] ?? ZONES[1]!;
  const positionInZone = (level - 1) % LEVELS_PER_ZONE;
  const idx = (positionInZone - 1 + zoneData.quips.length) % zoneData.quips.length;
  const quip = zoneData.quips[idx]!;
  const expression = QUIP_EXPRESSIONS[idx % QUIP_EXPRESSIONS.length]!;
  return { speaker: 'nana', image: NANA[expression], message: quip };
}

/**
 * Returns a blocker-specific quip if the level contains a recognised obstacle type.
 * Uses level number for deterministic line selection (no random).
 * Returns null if none of the present blocker types have dialogue.
 */
export function getBlockerQuip(presentTypes: ObstacleType[], level: number): DialogueStep | null {
  const chosen = BLOCKER_PRIORITY.find(t => presentTypes.includes(t));
  if (!chosen) return null;
  const lines = BLOCKER_QUIPS[chosen];
  if (!lines || lines.length === 0) return null;
  const { message, expression } = lines[level % lines.length]!;
  return { speaker: 'nana', image: NANA[expression], message };
}
