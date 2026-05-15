export const STRINGS = {
  start: {
    title:   'Pantry Pop',
    tagline: 'Tap. Pop. Treat!',
    play:    '\u25B6  Play',
    loading: 'Loading...',
  },
  intro: {
    eyebrow: "NANA ROSE'S CAF\u00C9",
    title:   'A Little Problem',
  },
  win: {
    title:    'Level Complete!',
    nextLevel: 'Next Level',
    mainMenu: 'Main Menu',
  },
  loss: {
    title:    'Out of Moves',
    retry:    'Retry',
    mainMenu: 'Main Menu',
    encouragement: [
      'So close! Try again!',
      'Almost had it!',
      'You can do this!',
      'One more try!',
    ] as const,
  },
  interstitial: {
    continue: 'Continue',
  },
  hud: {
    ariaLoading:    'Pantry Pop loading...',
    ariaOutOfMoves: 'Out of moves!',
    skipDebug:      'SKIP \u25B6',
  },
} as const;
