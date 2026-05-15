---
name: sound-design
description: SFX design with jsfxr synthesis for ludemic moments. Use when implementing game audio, sound effects, or audio feedback systems. Triggers on: sound design, SFX, jsfxr, audio, sound effects, Howler, playSound, sfxr, ludemic moments, mute, volume.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Sound Design -- Audio Feedback for Ludemic Moments

Sound is 50% of game feel. A tap without a sound feels broken. Every player action should have audio confirmation -- the game should feel responsive even with your eyes closed.

## Core Philosophy

Every ludemic moment -- every moment of meaning in gameplay -- gets an audio signature that reinforces the feeling. Map sounds to LISA operations:

| Ludemic Moment | Sound Character | Purpose |
|----------------|-----------------|---------|
| **Input feedback** | Click, tap, touch confirmation | "Your input was registered" |
| **Verb execution** | The core action sound | "The verb happened" |
| **REWARD** | Positive chime, ascending tone | "You did the right thing" |
| **COLLIDE** | Contact sound, percussive | "Entity interaction occurred" |
| **FAIL** | Gentle negative, descending tone | "Wrong action (not punishing)" |
| **EXTEND** | Flow continuation, subtle | "Momentum maintained" |
| **TEACH** | Subtle confirmation | "New concept encountered" |
| **State change** | Transition sound | "Game phase changed" |

## Scaffold Audio Integration

This scaffold provides a complete audio system. DO NOT create a custom audio manager from scratch.

**Extend the existing audio manager** at `src/game/audio/manager.ts`:
- `GameAudioManager` extends `BaseAudioManager` from `~/core/systems/audio`
- Add game-specific play methods (e.g., `playExplosion()`, `playMatch()`)
- Each method calls `this.playSound(SOUND_DEFINITION)`

**Define sounds** in `src/game/audio/sounds.ts`:
- Each sound is a `SoundDefinition { channel, sprite, volume? }`
- `channel` must match an audio bundle name in `src/game/asset-manifest.ts` (e.g., `audio-sfx-mygame`)
- `sprite` is the sound name within the Howler audio sprite

**Register audio bundles** in `src/game/asset-manifest.ts`:
- Use `audio-sfx-<game>` for sound effects
- Use `audio-music-<game>` for music tracks

**Direct playback** (alternative): `deps.coordinator.audio.play(channel, sprite, { volume })`

### File Targets for Sound Stage
```yaml
modify:
  - src/game/audio/sounds.ts              # add SoundDefinition entries
  - src/game/audio/manager.ts             # add play methods
  - src/game/asset-manifest.ts            # register audio-* bundles
  - src/game/mygame/screens/gameController.ts  # wire sound triggers to ludemic events
```

## SFX Event Mapping

### Intensity Levels
| Level | When | Duration | Volume |
|-------|------|----------|--------|
| Low | Every input, small collections | 50-100ms | 30-50% |
| Medium | Combos, obstacles, power-ups | 100-200ms | 50-70% |
| High | Level complete, high score, game over | 200-400ms | 70-100% |

### Sound Profile
Choose a profile that matches the visual theme:
- **8bit**: Chiptune, retro, nostalgic
- **Organic**: Natural, warm, tactile
- **Minimal**: Clean, sparse, modern
- **Synthesized**: Electronic, precise, futuristic

## jsfxr Synthesis

Use jsfxr for procedural sound generation. No external audio files needed.

### Import Pattern
```typescript
// CRITICAL: import { sfxr } not { jsfxr }
import { sfxr } from 'jsfxr';

// Generate and play:
sfxr.toAudio(paramsArray).play();
// or:
sfxr.play(paramsArray);
```

### Parameter Array Format
Params are NUMBER ARRAYS (24 elements), not objects:
```
[oldParams, waveType, attack, sustain, sustainPunch, decay,
 startFreq, minFreq, slide, deltaSlide, vibratoDepth, vibratoSpeed,
 changeAmount, changeSpeed, squareDuty, dutySweep, repeatSpeed,
 phaserOffset, phaserSweep, lpfCutoff, lpfSweep, lpfResonance,
 hpfCutoff, masterVolume]
```

### Wave Types
- `0` = Square (crisp, 8-bit feel)
- `1` = Sawtooth (buzzy, aggressive)
- `2` = Sine (smooth, pure)
- `3` = Noise (percussive, textured)

### Sound Recipes

**Positive chime (reward)**:
```typescript
[0, 0, 0.0, 0.05, 0.5, 0.15, 0.65, 0, 0.1, 0, 0, 0, 0.2, 0.3, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0.5]
// Short, bright, ascending. Wave: square. High start freq with upward slide.
```

**Contact thud (collide)**:
```typescript
[0, 3, 0.0, 0.05, 0.0, 0.1, 0.35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0.5]
// Short, percussive. Wave: noise. Low freq, fast decay.
```

**Gentle negative (fail)**:
```typescript
[0, 0, 0.0, 0.1, 0.0, 0.2, 0.4, 0, -0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0.5]
// Short, descending. Wave: square. Negative slide.
```

**Flow continuation (extend)**:
```typescript
[0, 1, 0.0, 0.03, 0.0, 0.1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0.3]
// Subtle, mid-pitch. Wave: sawtooth. Low volume.
```

**Celebration (level complete)**:
```typescript
[0, 0, 0.0, 0.1, 0.5, 0.4, 0.5, 0, 0.2, 0, 0, 0, 0.3, 0.2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0.5]
// Longer, ascending arpeggio. Wave: square. Sustain punch + positive slide.
```

## Variation Strategy

### High-Frequency Sounds (every input)
Create 3-5 variants with slight parameter tweaks:
- Vary `startFreq` by +/- 5%
- Vary `sustain` by +/- 10%
- Rotate through variants to avoid repetition fatigue

### Medium-Frequency Sounds (combos, obstacles)
Create 2-3 variants:
- Different wave types for variety
- Pitch shift with combo count (rising pitch = building momentum)

### Rare Sounds (level complete, game over)
1 variant is fine -- these are special moments that deserve a consistent signature.

## Implementation Pattern

```typescript
import { sfxr } from 'jsfxr';

const SOUNDS = {
  reward:        [/* params */],
  collide:       [/* params */],
  fail:          [/* params */],
  extend:        [/* params */],
  levelComplete: [/* params */],
} as const;

type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName): void {
  const params = SOUNDS[name];
  if (!params) return;
  try {
    sfxr.toAudio(params as unknown as number[]).play();
  } catch {
    // Audio may fail if user hasn't interacted yet (autoplay policy)
  }
}
```

### Integration with Game Controller
```typescript
import { playSound } from './sounds';

// In event handling:
const events = getEvents(prevState, nextState);
for (const event of events) {
  switch (event.type) {
    case 'REWARD': playSound('reward'); break;
    case 'COLLIDE': playSound('collide'); break;
    case 'FAIL': playSound('fail'); break;
  }
}
```

## Mix and Volume

### Channel Structure
- Master volume: controlled by scaffold's AudioProvider
- SFX channel: game sounds at 50-80% of master
- Overlap policy: allow (multiple sounds can play simultaneously)

### Mute and Volume Controls
Use the scaffold's existing audio system:
- `useAudio()` provides volume, mute, and music toggle
- The AudioProvider in core handles persistence to localStorage
- Do NOT build a custom SoundManager -- use what exists

## Accessibility

### Hard Requirements
- **Mute toggle**: Always available in settings
- **Playable on mute**: Game is fully functional without sound (GPS Gate 11)
- **Volume control**: Granular volume adjustment
- Sounds enhance but never carry essential gameplay information

## What This Stage Produces

### Files Created
- `sounds.ts` -- Sound effect definitions using jsfxr params + `playSound()` helper

### Files Modified
- `mygame/screens/gameController.ts` -- Import playSound, call on REWARD/COLLIDE/FAIL/EXTEND moments

### Stage Constraints
- **Use scaffold audio**: Use the scaffold's audio libraries, don't create a custom SoundManager
- **Synthesized preferred**: Use jsfxr for procedural sounds, no external audio files
- **Non-blocking**: Sound loading must not block game initialization (TTI < 3s)
- **Mapped to moments**: Every ludemic moment in the LISA spec has a sound mapping
- **Sound character limit**: Max 40 chars per sound description

### Exit Criteria
- Sound system can play audio on demand
- Reward moment triggers positive SFX
- Collision moment triggers contact SFX
- Fail moment triggers negative SFX
- Mute/volume control works
- Sounds do not block initialization
- Sounds feel appropriate for GDD mood

## Execute

```sudolang
fn whenImplementingSoundDesign() {
  Constraints {
    Every ludemic moment type (REWARD, COLLIDE, FAIL, EXTEND, TEACH) must have a mapped SFX
    SFX must be generated with jsfxr using parameters from the design doc, not placeholder beeps
    Audio triggers must fire on the same frame as the corresponding state change — no setTimeout
    Volume and mute controls must be wired to the scaffold's AudioProvider
    Variation strategy from the design must be implemented (pitch shift, multiple variants, etc.)
  }
}
```

### Exit Criteria (Given/Should)

- Given every LudemicEvent type, should have a corresponding sound effect mapped
- Given a REWARD event fires, should play the reward SFX on the same frame
- Given the mute toggle is activated, should silence all game audio
- Given the jsfxr parameters are inspected, should match the design doc's synthesis specs (not default presets)
- Given a sound plays multiple times in succession, should apply the variation strategy from the design (pitch shift, alternating variants)
- Given the sound module is imported, should use Howler.js for playback (not raw Web Audio API)
