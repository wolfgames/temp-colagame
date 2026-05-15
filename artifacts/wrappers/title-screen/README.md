# Wrapper Template: Title Screen

The first screen players see. Game logo, tagline, primary "Play" button, and optional settings button. Sets the mood and brand identity before gameplay.

## When to Use

- Every game needs a title screen
- First impression — establishes visual identity, color palette, brand
- Gate for audio unlock (mobile browsers require user interaction before sound)

## Screen Flow

```
[app launch] → loading → title-screen → [Play] → game
                                       → [Settings] → settings-screen → title-screen
```

## Integration Steps

1. Copy `screen-patterns.tsx` into your game's `screens/` directory
2. Adapt only lines marked `// ADAPT:` — game title, tagline, colors, logo asset path
3. Copy `screen-animation.css` into your project's CSS or translate timing values to GSAP
4. Wire `onPlay` to your asset loading → audio unlock → screen transition sequence
5. Wire `onSettings` to your settings screen transition (if applicable)

## Locked vs Adaptable

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED — do not change values, logic, or structure:             │
│   - Audio unlock must happen on the Play button tap             │
│   - Logo entrance: 600ms, back.out(1.7), scale 0→1             │
│   - Title entrance: 400ms, power2.out, slide up 20px           │
│   - Button entrance: 300ms, back.out(1.3), stagger 100ms       │
│   - Button hover: scale 1.05, 100ms                            │
│   - Button tap: scale 0.95 → 1.0, 200ms                        │
│   - Button minimum tap target: 48×48px (mobile accessibility)  │
│   - Layout: vertically centered, logo → title → buttons        │
│   - Background must fill viewport (100dvh)                      │
│                                                                 │
│ ADAPTABLE — change only where marked // ADAPT:                  │
│   - Game title text and tagline                                 │
│   - Logo image/asset path                                       │
│   - Background color or gradient                                │
│   - Button labels ("Play", "Settings", etc.)                    │
│   - Color palette (button colors, text colors)                  │
│   - Font family (keep sans-serif default)                       │
│   - Whether settings button exists                              │
│                                                                 │
│ If you find an improvement, do NOT apply it in the game.        │
│ Note it for archetype evolution instead.                        │
└─────────────────────────────────────────────────────────────────┘
```

## Layout Structure

```
┌──────────────────────────────┐
│                              │
│          [Logo]              │  40% from top
│                              │
│        Game Title            │  +60px
│        ~ tagline ~           │  +24px
│                              │
│       ┌──────────┐           │  +80px
│       │   Play   │           │
│       └──────────┘           │
│       ┌──────────┐           │  +16px gap
│       │ Settings │           │
│       └──────────┘           │
│                              │
│         v1.0.0               │  bottom, muted
└──────────────────────────────┘
```

## Animation Timing Reference

| Animation | Duration | Ease | Delay |
|-----------|----------|------|-------|
| Logo entrance | 600ms | back.out(1.7) | 200ms |
| Title slide-up | 400ms | power2.out | 500ms |
| Tagline fade | 300ms | power2.out | 700ms |
| Play button entrance | 300ms | back.out(1.3) | 900ms |
| Settings button entrance | 300ms | back.out(1.3) | 1000ms |
| Version fade | 200ms | power2.out | 1100ms |
| Button hover | 100ms | power2.out | — |
| Button press | 200ms | back.out(1.5) | — |
