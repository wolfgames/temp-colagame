---
name: 04-player-journey
description: Define lifecycle screens, FTUE tutorial, and attract mode demo. Step 4 of 4.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent
---

# 04 — Player Journey

Everything before and after gameplay — the shell that wraps the game, teaches new players, and attracts onlookers. One pass, one doc, three sections.

## Input

Read `design/01-core-identity.md`, `design/02-game-loops.md`, and `design/03-presentation.md` before running.

## Output

`design/04-player-journey.md` — Fill all schemas with game-specific values.

**STRICT:** Output ONLY the fields in the schemas. No extra sections.

## Section A: Game Lifecycle

Wrap gameplay in a complete shell — title, pause, game over, scoreboard, settings.

```json
{
  "lifecycle": {
    "screens": [
      {"name": "TITLE", "purpose": string, "elements": [string]},
      {"name": "MENU", "purpose": string, "options": [string]},
      {"name": "PLAYING", "purpose": "delegates to game loop"},
      {"name": "PAUSED", "purpose": string, "options": [string]},
      {"name": "LEVEL_END", "purpose": string, "elements": [string]},
      {"name": "GAME_OVER", "purpose": string, "elements": [string]},
      {"name": "SCOREBOARD", "purpose": string},
      {"name": "SETTINGS", "purpose": string, "options": [string]}
    ],
    "session_model": {
      "max_taps_to_gameplay": 2,
      "score_persistence": "localStorage",
      "settings_persistence": "localStorage"
    },
    "transitions": {
      "between_screens": "fade | slide (200-400ms)",
      "into_gameplay": "brief countdown or ready prompt",
      "style": "matches game theme"
    },
    "ui_shell": {
      "title_idle_behavior": string,
      "game_over_actions": ["play again", "view scores", "back to menu"],
      "scoreboard_entries": 10,
      "settings_options": ["sfx volume", "mute toggle", "reduced motion", "high contrast"]
    }
  }
}
```

### Screen Graph

| Screen | Purpose | Navigates To |
|---|---|---|
| TITLE | First impression, brand, play CTA | MENU, PLAYING, SETTINGS, SCOREBOARD |
| MENU | Secondary choices | PLAYING, TITLE |
| PLAYING | Game loop + HUD + pause button | PAUSED, LEVEL_END, GAME_OVER |
| PAUSED | Resume or quit | PLAYING, TITLE |
| LEVEL_END | Celebrate, show score, next level | PLAYING, GAME_OVER |
| GAME_OVER | Final score, stats, next actions | PLAYING, SCOREBOARD, TITLE |
| SCOREBOARD | Persistent high scores | TITLE |
| SETTINGS | Audio, accessibility | Previous screen |

## Section B: FTUE

Teach the game through guided play, not text. Player's hands move within 5 seconds. One concept at a time. First attempt must succeed.

```json
{
  "ftue": {
    "tutorial_steps": [
      {"teach": "core_input", "hint_type": "hand gesture + spotlight", "success_condition": string},
      {"teach": "goal", "hint_type": "arrow + brief text", "success_condition": string},
      {"teach": "challenge", "hint_type": "spotlight + brief text", "success_condition": string},
      {"teach": "completion", "hint_type": "none — player should understand", "success_condition": string}
    ],
    "hint_system": {
      "max_words_per_hint": 8,
      "hint_types": ["spotlight", "arrow", "hand gesture", "text bubble"],
      "initial_hint_delay_ms": 2000,
      "repeat_hint_delay_ms": 5000,
      "dismiss_on": "correct action"
    },
    "prompt_style": "coaching — brief, friendly, contextual",
    "tutorial_level_modifications": {
      "simplified_layout": true,
      "reduced_obstacles": true,
      "guaranteed_first_win": true
    },
    "skip_mechanism": {
      "always_available": true,
      "auto_skip_if": "player acts before hints appear",
      "placement": "small corner button"
    },
    "first_run_detection": "localStorage hasPlayed flag",
    "returns_to_screen": "MENU or level 1"
  }
}
```

## Section C: Attract Mode

Self-playing demo. AI plays at 60% skill with a scripted failure beat. The viewer thinks "I could do better."

```json
{
  "attract_mode": {
    "demo_sequence": [
      {"beat": "intro", "duration_s": 3, "action": string, "shows": string},
      {"beat": "competence", "duration_s": 5, "action": string, "shows": string},
      {"beat": "near_miss", "duration_s": 3, "action": string, "shows": string},
      {"beat": "failure", "duration_s": 4, "action": string, "shows": string},
      {"beat": "call_to_action", "duration_s": 5, "action": string, "shows": string}
    ],
    "auto_play": {
      "skill_level_percent": 60,
      "intentional_mistakes": true,
      "reaction_delay_ms": 200,
      "death_is_scripted": true
    },
    "hand_pointer": {
      "visible": true,
      "style": "👆 emoji, follows AI input position",
      "animations": ["tap scale punch", "swipe trail", "idle hover"]
    },
    "triggers": {
      "start_on": "title idle 10s | game over idle 15s | explicit invoke",
      "exit_on": "any user input → immediate transition to title"
    },
    "total_duration_s": "15-30",
    "loops": true,
    "exit_conditions": ["any tap", "any key", "any swipe"]
  }
}
```

### 5-Beat Arc

| Beat | Duration | Purpose |
|---|---|---|
| Intro | 3s | Show core verb in action immediately |
| Competence | 5s | AI plays well — scores tick, combos chain |
| Near miss | 3s | Close call, tension rises |
| Failure | 4s | Scripted death with full juice — "I could do better" |
| Call to action | 5s | Back to title or "Tap to Play" prompt |

## Constraints

**Lifecycle:**
- Game opens to title screen, not gameplay
- Max 2 taps from title to gameplay
- Pause works on button press AND focus loss
- Game over shows final score, stats, clear next actions
- Level complete → next level (not game over)
- Scoreboard persists via localStorage
- Transitions: 200-400ms, themed
- All screens keyboard and screen-reader navigable

**FTUE:**
- Teach through doing — hands move within 5 seconds
- One concept per step, let them succeed, then add next
- First attempt MUST succeed — no fail state in tutorial
- Max 5-8 words per hint. Icons over words.
- Skippable at any point
- Returning players skip automatically (localStorage flag)
- Tutorial uses real game skin
- Phone test: non-gamer plays correctly within 30 seconds

**Attract:**
- Core verb visible within first 3 seconds
- AI plays at ~60% skill with intentional mistakes
- Failure beat is scripted and dramatic — full juice on death
- 👆 emoji hand visible, follows AI input position
- Any user input exits immediately — zero delay
- 15-30 seconds total, then loops
- Uses real game rendering (visuals + audio + juice)
- Show early content only — no late-game spoilers

## Exit Criteria

- Given all 8 screens, should specify purpose and elements/options
- Given title screen, should be the default (not gameplay)
- Given max taps to gameplay, should be ≤2
- Given pause, should work on button press AND focus loss
- Given scoreboard, should persist via localStorage
- Given transitions, should be 200-400ms, themed
- Given tutorial steps, should teach one concept at a time
- Given first attempt, should guarantee success (no fail state)
- Given hints, should use max 5-8 words per prompt
- Given skip mechanism, should be always available
- Given returning players, should skip tutorial automatically
- Given 30-second phone test, should result in correct gameplay
- Given demo sequence, should show core verb within 3 seconds
- Given AI play, should be at 60% skill with intentional mistakes
- Given failure beat, should be scripted and dramatic
- Given user input during attract, should exit immediately
- Given total attract duration, should be 15-30 seconds and loop
- Given the output, should be at `design/04-player-journey.md`
