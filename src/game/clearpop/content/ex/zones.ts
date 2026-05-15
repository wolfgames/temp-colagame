import type { DialogueStep, SpeakerConfig } from '../../ui/TalkingHeads';
import type { ObstacleType } from '../../state/types';

const NANA = {
  neutral:     '/assets/sprites/cozy-kitchen/nana/nana-neutral.png',
  pleased:     '/assets/sprites/cozy-kitchen/nana/nana-pleased.png',
  exasperated: '/assets/sprites/cozy-kitchen/nana/nana-exasperated.png',
  surprised:   '/assets/sprites/cozy-kitchen/nana/nana-surprised.png',
} as const;

export const NANA_SPEAKER: SpeakerConfig = {
  name: 'NANA ROSE',
  image: NANA.neutral,
  side: 'left',
  portrait: { width: 300, offsetX: -80, offsetY: 20 },
};

export interface ZoneContent {
  zone: number;
  orderName: string;
  dishName: string;
  dishImage: string;
  nanaClosingLine: string;
  introDialogue: DialogueStep[];
  quips: string[];
}

const ZONES: Record<number, ZoneContent> = {
  1: {
    zone: 1,
    orderName: 'First Batch of the Season',
    dishName: 'Honey Cake',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-honey-cake.png',
    nanaClosingLine: '"Not bad for the first morning. Not bad at all."',
    introDialogue: [
      { speaker: 'nana', image: NANA.neutral,     message: "Good morning, dearie. The pantry's at it again — everything crystallized overnight." },
      { speaker: 'nana', image: NANA.exasperated, message: "Thirty years and I still haven't fixed that spell. Let's see what we've got." },
    ],
    quips: [
      "Same thing every morning. Let's get to it.",
      "Up and at 'em. The pantry won't clear itself.",
      "Another day, another batch of charms. Here we go.",
      "I'd fix the spell one day. Today is not that day.",
      "Right then. Let's see what we're working with.",
      "The bakery opens in an hour. No dawdling.",
      "The clock's ticking. No more stalling.",
      "Deep breath. Clear the pantry. Bake the thing.",
    ],
  },
  2: {
    zone: 2,
    orderName: "Mrs. Fenn's Birthday",
    dishName: 'Celebration Tart',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-celebration-tart.png',
    nanaClosingLine: '"She\'s going to love it. The pantry came through in the end."',
    introDialogue: [
      { speaker: 'nana', image: NANA.pleased,     message: "A regular came by early this morning just to put in her order. She's counting on us." },
      { speaker: 'nana', image: NANA.exasperated, message: "The pantry is being stubborn. It always knows when it matters." },
    ],
    quips: [
      "She's very particular. The pantry is not helping.",
      "She wants it perfect. I need more time than the pantry is giving me.",
      "A lovely regular, terrible timing for a special order.",
      "The pantry's in a mood. Nothing new there.",
      "Just a little more and we'll have what we need.",
      "Keep going. She's counting on us.",
      "The pantry's starting to come around. One last effort.",
      "One more push. She won't be disappointed.",
    ],
  },
  3: {
    zone: 3,
    orderName: 'A Rainy Tuesday',
    dishName: 'Toasted Marshmallow Cocoa',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-marshmallow-cocoa.png',
    nanaClosingLine: '"Perfect weather for this one. The regulars will be warm."',
    introDialogue: [
      { speaker: 'nana', image: NANA.neutral,     message: "Rainy Tuesday. The cozy regulars will be in all day — I'd better have enough." },
      { speaker: 'nana', image: NANA.exasperated, message: "Charms are always worse in the damp. Don't ask me why." },
    ],
    quips: [
      "Rain outside, warm in here. As it should be.",
      "The regulars like things just so. Let's not let them down.",
      "Cozy day. The pantry should match the mood.",
      "Damp air makes the charms cling. Patience.",
      "Good baking weather, if the pantry agrees.",
      "The kettle's on. Now for the pantry.",
      "The rain's picking up. So is the pace.",
      "Almost through. The bakery smells wonderful already.",
    ],
  },
  4: {
    zone: 4,
    orderName: "A Young Witch's First Lesson",
    dishName: 'Teaching Cookies',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-teaching-cookies.png',
    nanaClosingLine: '"They\'ll remember this batch. I know I will."',
    introDialogue: [
      { speaker: 'nana', image: NANA.pleased,     message: "I promised to bake with a young student this morning. First lesson:" },
      { speaker: 'nana', image: NANA.exasperated, message: "the pantry never cooperates on command. Might as well start the lesson now." },
    ],
    quips: [
      "The student is watching. Make it look effortless.",
      "Teaching is just baking with commentary.",
      "Every witch learns the pantry the hard way. This is their day.",
      "Show, don't tell. Clear the pantry, explain as we go.",
      "A lesson in patience. For both of us.",
      "They're a quick learner. The pantry, less so.",
      "The student's finding their rhythm. Good.",
      "One more. Then tea and a proper debrief.",
    ],
  },
  5: {
    zone: 5,
    orderName: "A Secret Admirer's Order",
    dishName: 'Rose Petal Macarons',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-rose-macarons.png',
    nanaClosingLine: '"Whoever sent that order has good taste. In more ways than one."',
    introDialogue: [
      { speaker: 'nana', image: NANA.surprised,   message: "An anonymous order. No name, no note — just a very specific request." },
      { speaker: 'nana', image: NANA.neutral,     message: "The pantry seemed... interested. That's unusual. Let's not keep it waiting." },
    ],
    quips: [
      "Still no name on the order. Curious.",
      "The pantry seems to know something I don't.",
      "Anonymous orders are either very sweet or very strange.",
      "I've decided to trust it. We'll see.",
      "Whatever this is for, it matters. The pantry can feel it.",
      "The pantry is being almost... cooperative today.",
      "Nearly there. The mystery deepens.",
      "Last push. Then we'll see who comes to collect it.",
    ],
  },
  6: {
    zone: 6,
    orderName: 'The Harvest Festival',
    dishName: 'Spiced Pumpkin Loaf',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-pumpkin-loaf.png',
    nanaClosingLine: '"The festival can start. We\'re ready."',
    introDialogue: [
      { speaker: 'nana', image: NANA.pleased,     message: "Harvest festival week. The whole neighborhood stops by." },
      { speaker: 'nana', image: NANA.exasperated, message: "Every year the pantry acts up the most this week. Every. Single. Year." },
    ],
    quips: [
      "Festival crowd this morning. Big day.",
      "Everyone wants a sample. The pantry needs to keep up.",
      "Harvest season. The whole town is hungry.",
      "Keep the charms moving. We have a queue.",
      "High demand, stubborn pantry. Classic festival week.",
      "More than halfway through. No stopping now.",
      "The energy out there is lovely. In here, less so.",
      "Push through. The neighborhood is waiting.",
    ],
  },
  7: {
    zone: 7,
    orderName: 'A Wedding Cake Commission',
    dishName: 'Seven-Layer Wedding Cake',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-wedding-cake.png',
    nanaClosingLine: '"Seven layers. Every one of them earned. They\'ll be happy."',
    introDialogue: [
      { speaker: 'nana', image: NANA.neutral,     message: "A very particular order came in this morning. Someone who knows exactly what they want." },
      { speaker: 'nana', image: NANA.exasperated, message: "The pantry knows this one matters. That's exactly why it's being difficult." },
    ],
    quips: [
      "A particular order deserves particular care. The pantry will cooperate.",
      "This one can't be rushed. Neither can the pantry.",
      "Patience. We have time. Just barely.",
      "The pantry is being cautious today. So am I.",
      "Getting there. The pantry is coming around.",
      "Careful work. Every step counts.",
      "The pantry's nearly with me. Hold steady.",
      "One final step. It's going to be worth it.",
    ],
  },
  8: {
    zone: 8,
    orderName: 'For Mr. Calloway',
    dishName: "Grandmother's Jam Roll",
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-jam-roll.png',
    nanaClosingLine: '"Some things are worth taking your time over. This was one of them."',
    introDialogue: [
      { speaker: 'nana', image: NANA.neutral,     message: "Old Mr. Calloway came by just to sit in the warm for a bit. Lost his wife." },
      { speaker: 'nana', image: NANA.pleased,     message: "I know what his grandmother used to bake him. Let's see if the pantry will help me out." },
    ],
    quips: [
      "For Mr. Calloway. Take your time with this one.",
      "Some orders are about more than the food.",
      "His grandmother's recipe, as close as I can get it.",
      "The pantry seems quieter today. Respectful, almost.",
      "Comfort food takes the most care.",
      "The pantry's cooperating. I think it understands.",
      "It's coming together. I hope he recognizes the taste.",
      "Last bit. Then a cup of tea by the window.",
    ],
  },
  9: {
    zone: 9,
    orderName: 'The Rival Café Order',
    dishName: 'Truce Shortbread',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-truce-shortbread.png',
    nanaClosingLine: '"They\'ll rave about it and still learn nothing. That\'s fine."',
    introDialogue: [
      { speaker: 'nana', image: NANA.exasperated, message: "That rival bakery sent someone to spy on my recipes. The absolute nerve." },
      { speaker: 'nana', image: NANA.surprised,   message: "Then they had the audacity to place an order. Fine. They'll eat well and learn nothing." },
    ],
    quips: [
      "Spies and customers. The nerve of some people.",
      "They can watch all they like. They won't figure it out.",
      "The secret's in the pantry. And the pantry isn't talking.",
      "Fine. I'll bake for them. With dignity.",
      "Their loss that they ordered after spying. Still won't learn anything.",
      "Their spy is long gone. The baking continues regardless.",
      "Nearly done. The best revenge is a perfect product.",
      "Last one. They'll rave about it and have no idea why.",
    ],
  },
  10: {
    zone: 10,
    orderName: "The Café's Anniversary",
    dishName: 'The Original Charm Cake',
    dishImage: '/assets/sprites/cozy-kitchen/dishes/dish-charm-cake.png',
    nanaClosingLine: '"Thirty years. The pantry and I have an understanding now."',
    introDialogue: [
      { speaker: 'nana', image: NANA.neutral,     message: "Thirty years of this bakery. Thirty years of this pantry." },
      { speaker: 'nana', image: NANA.pleased,     message: "I should be furious at it. Mostly I'm just fond of the old thing." },
      { speaker: 'nana', image: NANA.pleased,     message: "Let's make it a good one." },
    ],
    quips: [
      "Thirty years. Not bad for a botched preservation spell.",
      "The pantry and I have an understanding now.",
      "Some mornings it's easy. Today it's being sentimental.",
      "Can't be angry at something you've worked with this long.",
      "Anniversary baking hits different.",
      "Thirty years and the pantry still makes me work for it.",
      "The bakery's come a long way. So has the pantry.",
      "Final push. Then I'm treating myself to something good.",
    ],
  },
};

// Expression assigned per quip index — cycles with the quip list.
// Pattern: neutral → neutral → exasperated → neutral → pleased → neutral → neutral → pleased
const QUIP_EXPRESSIONS: Array<keyof typeof NANA> = [
  'neutral', 'neutral', 'exasperated', 'neutral', 'pleased', 'neutral', 'neutral', 'pleased',
];

// Blocker-specific quips — shown when a level contains that obstacle type.
// Nana talks about her day, not the mechanics.
const BLOCKER_QUIPS: Partial<Record<ObstacleType, Array<{ message: string; expression: keyof typeof NANA }>>> = {
  cookie: [
    { message: "Those cookies went completely stiff overnight. I still need them for the order though, so.",                 expression: 'exasperated' },
    { message: "A whole batch ruined. The magic gets into everything if you're not careful.",                                expression: 'exasperated' },
    { message: "They were beautiful yesterday. Now look at them. Still. I need what I need.",                               expression: 'neutral'     },
  ],
  egg: [
    { message: "These eggs got caught in the overnight charm buildup. Still perfectly good — just stuck.",                  expression: 'neutral'     },
    { message: "I bought fresh eggs yesterday. The pantry got to them. Of course it did.",                                  expression: 'exasperated' },
    { message: "Eggs, crystallized to the shelf. That spell really does get into everything.",                              expression: 'neutral'     },
  ],
  jelly: [
    { message: "That jam set itself to the shelf again. It does this. I've given up being surprised.",                      expression: 'exasperated' },
    { message: "Sticky little thing. It's not ruined, just stubborn.",                                                      expression: 'neutral'     },
    { message: "That's my jam and I need it. It just doesn't want to be collected today apparently.",                       expression: 'exasperated' },
  ],
  cage: [
    { message: "The herb vines got into everything again. They mean well. They really do.",                                 expression: 'neutral'     },
    { message: "My own herbs, working against me. I raised those from seeds.",                                              expression: 'exasperated' },
    { message: "They grow right over whatever I need most. Every time.",                                                    expression: 'neutral'     },
  ],
  safe: [
    { message: "Something I need is in that box. It just takes a little persuading to open.",                              expression: 'neutral'     },
    { message: "I packed that years ago for safekeeping and now I need what's inside. Of course.",                         expression: 'exasperated' },
    { message: "That box has the good stuff in it. It won't give it up without a fight.",                                   expression: 'neutral'     },
  ],
};

// Priority order — more personality-rich blockers get picked first when multiple are present.
const BLOCKER_PRIORITY: ObstacleType[] = ['egg', 'cookie', 'jelly', 'cage', 'safe'];

// ── Intro story ───────────────────────────────────────────────────────────────

export const INTRO_SLIDES = [
  'Thirty years ago, Nana cast a preservation spell on her pantry. She misread a line.',
  'Every night, her ingredients crystallize into charms. Every morning she has to break them all apart before she can bake a single thing.',
  "She's been meaning to fix it. It's been thirty years.",
] as const;

// ── Zone bridge slides ─────────────────────────────────────────────────────────
// Shown at zone boundaries in the results screen. Simpler than in-game zone
// interstitials — a single title + body recap per zone completion.

export interface ZoneBridgeSlide {
  title: string;
  body: string;
}

const ZONE_BRIDGE_SLIDES: Record<number, ZoneBridgeSlide> = {
  1:  { title: 'First Batch Complete',              body: "Nana's honey cake is done. The pantry cooperated — more or less." },
  2:  { title: "Mrs. Fenn's Order: Delivered",      body: 'The celebration tart came out beautifully. The pantry had opinions, as always.' },
  3:  { title: 'Rainy Tuesday: Handled',            body: 'The marshmallow cocoa went out warm. The regulars are happy.' },
  4:  { title: 'First Lesson: Complete',            body: 'The teaching cookies are done. The student learned something. So did the pantry.' },
  5:  { title: 'Mystery Order: Fulfilled',          body: 'The rose petal macarons are ready. Whoever sent that order has excellent taste.' },
  6:  { title: 'Festival Week: Survived',           body: 'The spiced pumpkin loaf is done. The neighbourhood got their harvest treat.' },
  7:  { title: 'The Commission: Complete',          body: 'Seven layers. Every one earned. The wedding cake is on its way.' },
  8:  { title: "Mr. Calloway's Order: Ready",       body: "Grandmother's jam roll is done. Nana hopes he recognises the taste." },
  9:  { title: 'Rival Order: Fulfilled',            body: "The truce shortbread is boxed. They'll rave about it and learn nothing." },
  10: { title: 'Thirty Years',                      body: "The original charm cake is done. Nana and her pantry have an understanding now." },
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
