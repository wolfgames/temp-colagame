# Wrapper Template: Interstitial Screen

Meta narrative display between game rounds. Shows zone transitions, story beats, character dialogue, or progression milestones. Creates anticipation and context for the next gameplay session.

## When to Use

- Between zones/worlds (every N levels)
- After unlocking a new mechanic or power-up
- Story beats that give context to the next set of levels
- Milestone celebrations (first star, first combo, zone complete)

## Screen Flow

```
win-screen → [Next Level triggers zone change] → interstitial → game (new zone)
win-screen → [milestone reached] → interstitial → game (next level)
```

## Integration Steps

1. Copy `screen-patterns.tsx` into your game's `screens/` directory
2. Adapt only lines marked `// ADAPT:` — narrative content, images, timing
3. Copy `screen-animation.css` for cinematic transitions
4. Wire `onContinue` to resume gameplay
5. Provide narrative data (zone name, story text, character art)

## Locked vs Adaptable

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED — do not change values, logic, or structure:             │
│   - Background crossfade: 800ms, power2.inOut                   │
│   - Title entrance: 600ms, power2.out, slide up                 │
│   - Body text typewriter: 30ms per character                    │
│   - Continue button: appears after text finishes + 500ms delay  │
│   - Button entrance: 300ms, back.out(1.3)                       │
│   - Auto-advance option: configurable delay (default: none)     │
│   - Tap-to-skip: completes typewriter instantly                 │
│   - Layout: full-screen, centered content, dark overlay on art  │
│   - Minimum button tap target: 48×48px                          │
│                                                                 │
│ ADAPTABLE — change only where marked // ADAPT:                  │
│   - Narrative text content                                       │
│   - Background image / art asset path                            │
│   - Character portrait (optional)                                │
│   - Zone/chapter title                                           │
│   - Color palette (accent, overlay opacity)                      │
│   - Whether typewriter effect is used (can be instant)           │
│   - Auto-advance delay (null = manual continue only)             │
│   - Number of text slides (single or multi-page)                 │
│                                                                 │
│ If you find an improvement, do NOT apply it in the game.        │
│ Note it for archetype evolution instead.                        │
└─────────────────────────────────────────────────────────────────┘
```

## Layout Structure

```
┌──────────────────────────────┐
│  ████████████████████████    │  background art (full bleed)
│  ████████████████████████    │
│  ████████████████████████    │
│──────────────── dark overlay │
│                              │
│       Zone 2: The Deep       │  zone title (centered)
│                              │
│   The crystals grow darker   │  narrative text (typewriter)
│   as you descend. Strange    │
│   sounds echo from below...  │
│                              │
│       ┌──────────────┐       │
│       │   Continue   │       │  appears after text
│       └──────────────┘       │
│                              │
│          • • ○               │  page dots (if multi-page)
└──────────────────────────────┘
```

## Animation Timing Reference

| Animation | Duration | Ease | Delay |
|-----------|----------|------|-------|
| Background crossfade | 800ms | power2.inOut | 0ms |
| Dark overlay fade | 600ms | power2.out | 200ms |
| Zone title entrance | 600ms | power2.out | 400ms |
| Typewriter per char | 30ms | linear | 800ms base |
| Tap-to-skip | instant | — | — |
| Continue button | 300ms | back.out(1.3) | text done + 500ms |
| Page transition | 400ms | power2.inOut | — |
| Exit fade | 500ms | power2.in | 0ms |
