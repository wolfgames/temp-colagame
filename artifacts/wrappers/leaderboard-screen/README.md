# Wrapper Template: Leaderboard Screen

Display winners oriented by score. Shows ranked player entries with the current player highlighted. Supports tabs for different time ranges or friend groups.

## When to Use

- Any game with a score-based ranking system
- Accessed from title screen, win screen, or navigation bar
- Displays global, friends, or weekly rankings

## Screen Flow

```
title-screen → [Leaderboard] → leaderboard-screen → [Back] → title-screen
win-screen   → [Leaderboard] → leaderboard-screen → [Back] → win-screen
```

## Integration Steps

1. Copy `screen-patterns.tsx` into your game's `screens/` directory
2. Adapt only lines marked `// ADAPT:` — tab labels, data source, rank format
3. Copy `screen-animation.css` for entrance animations
4. Wire `onBack` to your navigation
5. Provide leaderboard data (can be local mock data or API-sourced)

## Locked vs Adaptable

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED — do not change values, logic, or structure:             │
│   - Header entrance: 300ms, power2.out                          │
│   - Tab bar transition: 200ms, power2.out                       │
│   - Row stagger: 40ms between entries                           │
│   - Row entrance: 300ms slide-in from right, power2.out         │
│   - Current player row: highlighted, always visible             │
│   - Minimum 48×48px tap targets on tabs and back button         │
│   - Row layout: rank | avatar | name | score                    │
│   - Podium top-3 have distinct styling (gold/silver/bronze)     │
│   - Scroll container with momentum scrolling                    │
│                                                                 │
│ ADAPTABLE — change only where marked // ADAPT:                  │
│   - Tab labels ("Global", "Friends", "Weekly")                  │
│   - Data source (static mock, localStorage, API)                │
│   - Score format (number, time, percentage)                     │
│   - Avatar display (image, initials, icon)                      │
│   - Color palette (podium colors, highlight color)              │
│   - Whether tabs exist (single list vs. tabbed)                 │
│   - Additional row metadata (level, date, etc.)                 │
│                                                                 │
│ If you find an improvement, do NOT apply it in the game.        │
│ Note it for archetype evolution instead.                        │
└─────────────────────────────────────────────────────────────────┘
```

## Layout Structure

```
┌──────────────────────────────┐
│  ← Back       Leaderboard    │  header
│──────────────────────────────│
│  [Global] [Friends] [Weekly] │  tab bar
│──────────────────────────────│
│  🥇  Player1       12,400   │  podium entry (gold)
│  🥈  Player2        9,800   │  podium entry (silver)
│  🥉  Player3        8,250   │  podium entry (bronze)
│──────────────────────────────│
│   4  Player4        7,100   │  regular entry
│   5  Player5        6,500   │  regular entry
│  ...                         │
│──────────────────────────────│
│  ► 42  You          3,200   │  current player (highlighted)
└──────────────────────────────┘
```

## Animation Timing Reference

| Animation | Duration | Ease | Delay |
|-----------|----------|------|-------|
| Header entrance | 300ms | power2.out | 0ms |
| Tab bar entrance | 300ms | power2.out | 100ms |
| Tab switch | 200ms | power2.out | — |
| Podium entries | 400ms | back.out(1.3) | 200ms + 80ms stagger |
| Regular row stagger | 40ms/row | power2.out | 500ms base |
| Row entrance | 300ms | power2.out | staggered |
| Current player highlight | 400ms | power2.out | after rows |
| Scroll momentum | native | -webkit-overflow-scrolling: touch | — |
