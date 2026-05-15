# Wrapper Template: Settings Screen

Audio/music toggle and volume controls. Accessible from the title screen or in-game pause menu. Minimal, focused — no game state changes happen here.

## When to Use

- Every game that has audio (music, SFX)
- Accessed from title screen or pause overlay
- May also surface additional toggles (haptics, notifications) in later passes

## Screen Flow

```
title-screen → [Settings] → settings-screen → [Back] → title-screen
pause-menu   → [Settings] → settings-screen → [Back] → pause-menu
```

## Integration Steps

1. Copy `screen-patterns.tsx` into your game's `screens/` or `ui/` directory
2. Adapt only lines marked `// ADAPT:` — toggle labels, initial values, persistence keys
3. Copy `screen-animation.css` for entrance/exit transitions
4. Wire `onBack` to your navigation (screen transition or overlay dismiss)
5. Wire toggle callbacks to your audio system (`coordinator.setMusicVolume()`, etc.)

## Locked vs Adaptable

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED — do not change values, logic, or structure:             │
│   - Panel entrance: 400ms, power2.out, slide up from bottom    │
│   - Row stagger: 60ms between each setting row                 │
│   - Toggle animation: 200ms, power2.out                        │
│   - Slider thumb: 200ms transition on drag end                 │
│   - Back button: top-left, minimum 48×48px tap target           │
│   - Layout: full-width rows, label left / control right         │
│   - Dark overlay background: rgba(0,0,0,0.8)                   │
│   - Settings persist immediately on change (no "Save" button)  │
│                                                                 │
│ ADAPTABLE — change only where marked // ADAPT:                  │
│   - Setting labels ("Music", "Sound Effects", etc.)             │
│   - Which settings to show (music, sfx, haptics, etc.)          │
│   - Volume range (default 0–100)                                │
│   - Persistence mechanism (localStorage keys, save service)     │
│   - Accent color for toggles and sliders                        │
│   - Whether screen is full-page or overlay panel                │
│                                                                 │
│ If you find an improvement, do NOT apply it in the game.        │
│ Note it for archetype evolution instead.                        │
└─────────────────────────────────────────────────────────────────┘
```

## Layout Structure

```
┌──────────────────────────────┐
│  ← Back          Settings    │  header
│──────────────────────────────│
│                              │
│  Music              [■━━━]  │  toggle
│  Music Volume       ━━●━━━  │  slider
│                              │
│  Sound Effects      [■━━━]  │  toggle
│  SFX Volume         ━━━━●━  │  slider
│                              │
│  Haptics            [■━━━]  │  toggle (mobile only)
│                              │
└──────────────────────────────┘
```

## Animation Timing Reference

| Animation | Duration | Ease | Delay |
|-----------|----------|------|-------|
| Panel slide-up | 400ms | power2.out | 0ms |
| Overlay fade | 300ms | power2.out | 0ms |
| Row stagger entrance | 60ms/row | power2.out | 200ms base |
| Toggle switch | 200ms | power2.out | — |
| Slider thumb release | 200ms | power2.out | — |
| Panel exit (slide down) | 300ms | power2.in | 0ms |
