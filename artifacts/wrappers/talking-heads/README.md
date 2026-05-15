# Wrapper Template: Talking Heads

Character dialogue overlay that sits above gameplay. Two portrait slots (left/right) with a dialogue bubble at the bottom. Tapping anywhere advances to the next line. Characters slide in from their side, inactive speakers dim.

Derived from `clue-hunter-client-lo`'s `IntroDialogue` component.

## Visual Layout

```
+----------------------------------+
|                                  |
|         (gameplay below)         |
|                                  |
|  [LEFT]                [RIGHT]   |   <-- portrait images, bottom-anchored
|  [CHAR]                [CHAR]    |       inactive speaker dimmed to 30%
|  +------------------------------+|
|  | SPEAKER NAME                  ||   <-- dialogue bubble (z above portraits)
|  | Message text here...          ||
|  |            TAP TO CONTINUE >  ||
|  +------------------------------+|
+----------------------------------+
```

## LOCKED (do not change)

- Portrait slide-in duration: 600ms ease-out
- Portrait slide-out duration: 1800ms ease-out (exit)
- Bubble fade duration: 300ms ease-out
- Bubble slide distance: 40px vertical
- Speaker dimming: 500ms transition to brightness 30%
- Same-speaker swap: instant (no slide)
- Different-speaker swap: bubble out (300ms) -> wait 350ms -> slide in if new (600ms) -> bubble in (300ms)
- Exit sequence: bubble out (300ms) -> wait 350ms -> both portraits slide out (1800ms)
- Full-screen click zone (z-50 above gameplay)
- Portrait z-index 0, bubble z-index 1

## ADAPTABLE (// ADAPT: markers)

- Speaker configuration (names, images, sides, portrait dimensions)
- Dialogue step content (speaker, message, image overrides)
- Bubble styling (colors, border, shadow, font)
- Portrait container width and offset
- Last-step footer label ("LET'S GO >" vs "TAP TO CONTINUE >")
- Whether to skip enter/exit animations
- Sound effects (slide, voice)

## Integration

```typescript
import { createTalkingHeads } from './screen-patterns';

// During gameplay, when dialogue should appear:
const controller = createTalkingHeads(gameContainer, {
  steps: [
    { speaker: 'detective', message: 'We need to investigate this area.' },
    { speaker: 'witness', message: 'I saw something strange last night.' },
  ],
  speakers: {
    detective: { name: 'DET. FUENTES', image: '/assets/portraits/detective.png', side: 'left' },
    witness: { name: 'HANNAH COLE', image: '/assets/portraits/witness.png', side: 'right' },
  },
  onComplete: () => { /* resume gameplay */ },
});

// When done:
controller.destroy();
```

## Dependencies

- CSS keyframes in `app.css` (none needed - uses inline CSS transitions)
- No framework dependency (pure DOM)
- Optional: sound effect callbacks for slide/voice
