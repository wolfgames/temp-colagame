---
name: sound-design-elevenlabs
description: SFX design with ElevenLabs AI-generated sound effects via fal.ai. Use as an alternative to jsfxr when higher-fidelity, AI-generated audio is desired. Triggers on: elevenlabs, fal.ai, AI sound, generated audio, realistic SFX, sound effects v2, text-to-audio.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Sound Design (ElevenLabs) -- AI-Generated SFX for Ludemic Moments

Alternative to the jsfxr procedural approach. Uses ElevenLabs Sound Effects v2 via fal.ai to generate high-fidelity SFX from text descriptions. Sounds are generated at build time, saved as static MP3 assets, and played back with Howler.js at runtime.

**When to use this instead of jsfxr:** When the game's aesthetic calls for organic, realistic, or cinematic audio that procedural synthesis can't deliver (e.g., nature sounds, impacts with texture, orchestral stings, ambient effects).

## Core Philosophy

Same as standard sound design — every ludemic moment gets an audio signature. The difference is generation method, not mapping strategy.

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

## Generation Pipeline

Sounds are generated **once** at build time, not at runtime. The pipeline:

1. Read `design/08-sound.md` — extract `sound_character` descriptions per event
2. Run the generation script — calls ElevenLabs via fal.ai for each sound
3. Download MP3 files to `public/sounds/`
4. Wire playback in `sounds.ts` using Howler.js

### API Details

- **Endpoint**: `fal-ai/elevenlabs/sound-effects/v2` (the `/v2` suffix is required — the base endpoint defaults to `v0` which ElevenLabs no longer accepts)
- **Auth**: Requires `FAL_KEY` environment variable
- **Cost**: ~$0.002/second of generated audio
- **Output**: MP3 files (44100Hz, 128kbps default)
- **Response shape**: `fal.subscribe()` returns `{ data: { audio: { url, content_type, file_name, file_size } }, requestId }`. The audio URL is at `result.data.audio.url` — NOT `result.audio.url` or `result.url`.

### Generation Script

Create `scripts/generate-sounds.ts`:

```typescript
import { fal } from "@fal-ai/client";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

interface SoundSpec {
  name: string;
  text: string;
  duration_seconds?: number;
  prompt_influence?: number;
  loop?: boolean;
}

const SOUNDS_DIR = path.resolve("public/sounds");

async function generateSound(spec: SoundSpec): Promise<string> {
  // IMPORTANT: Use the /v2 endpoint. The base endpoint defaults to v0 which is rejected.
  const result = await fal.subscribe("fal-ai/elevenlabs/sound-effects/v2", {
    input: {
      text: spec.text,
      duration_seconds: spec.duration_seconds,
      prompt_influence: spec.prompt_influence ?? 0.5,
      output_format: "mp3_44100_128",
      loop: spec.loop ?? false,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  });

  // IMPORTANT: fal.subscribe() wraps the API response in a { data, requestId } envelope.
  // The audio URL is at result.data.audio.url — NOT result.audio.url.
  const data = (result as { data: { audio: { url: string } } }).data;
  const audioUrl = data.audio.url;

  if (!audioUrl) {
    throw new Error(`No audio URL in response: ${JSON.stringify(result)}`);
  }

  const response = await fetch(audioUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const filePath = path.join(SOUNDS_DIR, `${spec.name}.mp3`);
  await writeFile(filePath, buffer);
  console.log(`  ✓ ${spec.name} → ${filePath} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
  return filePath;
}

async function main(): Promise<void> {
  if (!process.env.FAL_KEY) {
    console.error("FAL_KEY environment variable is required.");
    console.error("Get one at https://fal.ai/dashboard/keys");
    process.exit(1);
  }

  if (!existsSync(SOUNDS_DIR)) {
    await mkdir(SOUNDS_DIR, { recursive: true });
  }

  // Sound specs derived from design/08-sound.md
  // Replace these with your actual sound_character descriptions from the design doc
  const sounds: SoundSpec[] = [
    // ── INPUT FEEDBACK ──
    { name: "tap",           text: "Short soft UI tap click",                          duration_seconds: 0.5 },
    // ── VERB EXECUTION ──
    { name: "action",        text: "Quick satisfying game action confirmation pop",    duration_seconds: 1.0 },
    // ── REWARD ──
    { name: "reward",        text: "Bright ascending positive chime reward",           duration_seconds: 1.0 },
    { name: "combo",         text: "Energetic cascading combo reward with sparkle",    duration_seconds: 1.5 },
    { name: "levelComplete", text: "Triumphant level complete celebration fanfare",    duration_seconds: 2.0 },
    // ── COLLIDE ──
    { name: "collide",       text: "Short percussive contact thud impact",             duration_seconds: 0.5 },
    // ── FAIL ──
    { name: "fail",          text: "Gentle descending negative tone, not harsh",       duration_seconds: 1.0 },
    { name: "gameOver",      text: "Somber game over deflation tone",                  duration_seconds: 2.0 },
    // ── EXTEND ──
    { name: "extend",        text: "Subtle flow continuation whoosh",                  duration_seconds: 0.5 },
    // ── STATE CHANGE ──
    { name: "transition",    text: "Smooth screen transition swoosh",                  duration_seconds: 1.0 },
    { name: "pause",         text: "Soft pause menu open tone",                        duration_seconds: 0.5 },
  ];

  console.log(`Generating ${sounds.length} sounds via ElevenLabs...`);

  for (const spec of sounds) {
    try {
      await generateSound(spec);
    } catch (err) {
      console.error(`  ✗ ${spec.name}: ${err}`);
    }
  }

  console.log("Done.");
}

main();
```

### Running the Generator

```bash
# Install the fal.ai client
bun add -d @fal-ai/client

# Set your API key
export FAL_KEY="your-key-here"

# Run the generator
npx tsx scripts/generate-sounds.ts
```

Add a convenience script to `package.json`:
```json
{
  "scripts": {
    "generate-sounds": "tsx scripts/generate-sounds.ts"
  }
}
```

## Variation Strategy

ElevenLabs produces natural variation between calls. For high-frequency sounds that need distinct variants:

### High-Frequency Sounds (every input)
Generate 3-5 variants by appending variation descriptors to the prompt:
```typescript
{ name: "tap_1", text: "Short soft UI tap click, slightly higher pitch" },
{ name: "tap_2", text: "Short soft UI tap click, slightly lower pitch" },
{ name: "tap_3", text: "Short soft UI tap click, with tiny metallic ring" },
```

### Medium-Frequency Sounds (combos, obstacles)
Generate 2-3 variants with different textures.

### Rare Sounds (level complete, game over)
1 variant — these are signature moments.

## Playback Integration

### sounds.ts

```typescript
import { Howl } from "howler";

const SOUND_FILES: Record<string, string> = {
  tap:           "/sounds/tap.mp3",
  action:        "/sounds/action.mp3",
  reward:        "/sounds/reward.mp3",
  combo:         "/sounds/combo.mp3",
  levelComplete: "/sounds/levelComplete.mp3",
  collide:       "/sounds/collide.mp3",
  fail:          "/sounds/fail.mp3",
  gameOver:      "/sounds/gameOver.mp3",
  extend:        "/sounds/extend.mp3",
  transition:    "/sounds/transition.mp3",
  pause:         "/sounds/pause.mp3",
};

type SoundName = keyof typeof SOUND_FILES;

const howls: Partial<Record<SoundName, Howl>> = {};

function getHowl(name: SoundName): Howl {
  if (!howls[name]) {
    howls[name] = new Howl({
      src: [SOUND_FILES[name]],
      preload: true,
      volume: 0.7,
    });
  }
  return howls[name]!;
}

export function playSound(name: SoundName): void {
  try {
    getHowl(name).play();
  } catch {
    // Audio may fail if user hasn't interacted yet (autoplay policy)
  }
}

export function preloadSounds(): void {
  for (const name of Object.keys(SOUND_FILES) as SoundName[]) {
    getHowl(name);
  }
}
```

### Integration with Game Controller

Same pattern as jsfxr — `playSound` is a drop-in replacement:

```typescript
import { playSound } from './sounds';

const events = getEvents(prevState, nextState);
for (const event of events) {
  switch (event.type) {
    case 'REWARD': playSound('reward'); break;
    case 'COLLIDE': playSound('collide'); break;
    case 'FAIL': playSound('fail'); break;
  }
}
```

## Prompt Engineering for Sound

The `text` field is the most important parameter. Write prompts that are:

- **Specific**: "Bright ascending three-note chime" not "happy sound"
- **Short**: 5-15 words. The model works best with concise descriptions
- **Sensory**: Describe the sound's texture, not its purpose
- **Contextual**: Include the sound family (UI, game, cinematic, etc.)

### Prompt Templates by Category

| Category | Template | Example |
|----------|----------|---------|
| Input feedback | "Short [texture] [object] [action]" | "Short crisp button click" |
| Verb execution | "Quick [mood] [action] [texture]" | "Quick satisfying pop with snap" |
| Reward | "[Mood] ascending [instrument/texture]" | "Bright ascending xylophone arpeggio" |
| Collision | "Short [weight] [material] [impact]" | "Short heavy wooden thud impact" |
| Failure | "Gentle descending [texture], not harsh" | "Gentle descending muted trumpet, not harsh" |
| State change | "[Speed] [texture] [transition type]" | "Smooth whoosh transition swoosh" |

### Tuning Parameters

- **`prompt_influence`** (0-1, default 0.3): Higher = more literal interpretation of prompt. Use 0.5-0.7 for game SFX where you need predictable results.
- **`duration_seconds`** (0.5-22): Keep game SFX short — 0.5s for taps, 1-2s for rewards, max 3s for level complete.
- **`loop`**: Set `true` only for ambient/continuous sounds (timer ticks, tension drones).

## Mix and Volume

### Channel Structure
- Master volume: controlled by scaffold's AudioProvider
- SFX channel: game sounds at 50-80% of master via Howl volume
- Overlap policy: allow (multiple Howl instances can play simultaneously)

### Mute and Volume Controls
Use the scaffold's existing audio system:
- `useAudio()` provides volume, mute, and music toggle
- The AudioProvider in core handles persistence to localStorage
- Wire Howler's global volume to the scaffold's volume state

## Accessibility

### Hard Requirements
- **Mute toggle**: Always available in settings
- **Playable on mute**: Game is fully functional without sound (GPS Gate 11)
- **Volume control**: Granular volume adjustment
- Sounds enhance but never carry essential gameplay information

## What This Stage Produces

### Files Created
- `scripts/generate-sounds.ts` — ElevenLabs generation script
- `public/sounds/*.mp3` — Generated sound effect files
- `sounds.ts` — Howler.js playback with `playSound()` helper

### Files Modified
- `package.json` — Add `@fal-ai/client` dev dep + `generate-sounds` script
- `mygame/screens/gameController.ts` — Import playSound, call on REWARD/COLLIDE/FAIL/EXTEND moments

### Stage Constraints
- **Pre-generated**: Sounds are generated at build time, never at runtime
- **Static assets**: MP3 files served from `public/sounds/`
- **Howler.js playback**: Use Howler for cross-browser audio management
- **Non-blocking**: Sound preloading must not block game initialization (TTI < 3s)
- **Mapped to moments**: Every ludemic moment in the LISA spec has a sound mapping
- **FAL_KEY required**: Generation requires a fal.ai API key (not needed at runtime)

### Exit Criteria
- Sound generation script runs and produces MP3 files
- All ludemic moments have corresponding sound files
- Reward moment triggers positive SFX
- Collision moment triggers contact SFX
- Fail moment triggers negative SFX
- Mute/volume control works
- Sounds do not block initialization
- Sounds feel appropriate for GDD mood
- No API calls at runtime — all sounds are static assets

## Execute

```sudolang
fn whenImplementingElevenLabsSoundDesign() {
  Constraints {
    Read design/08-sound.md and extract sound_character descriptions for prompts
    Every ludemic moment type (REWARD, COLLIDE, FAIL, EXTEND, TEACH) must have a generated MP3
    Generation script must validate FAL_KEY before starting
    All MP3s saved to public/sounds/ with descriptive names
    Howler.js used for playback — lazy-loaded, preloaded after first interaction
    Volume and mute controls wired to the scaffold's AudioProvider
    Variation strategy: multiple variants for high-freq sounds, single for rare
    prompt_influence set to 0.5-0.7 for predictable game SFX
    duration_seconds kept short: 0.5s taps, 1-2s rewards, max 3s celebrations
  }
}
```

### Exit Criteria (Given/Should)

- Given every LudemicEvent type, should have a corresponding MP3 file in public/sounds/
- Given a REWARD event fires, should play the reward MP3 on the same frame
- Given the mute toggle is activated, should silence all game audio
- Given the generation script is run with FAL_KEY, should produce all MP3 files
- Given the generation script is run without FAL_KEY, should exit with a clear error
- Given a sound plays multiple times in succession, should use Howler's sprite/pool for overlap
- Given the sound module is imported, should use Howler.js for playback (not raw Web Audio API)
- Given runtime, should make zero network requests for audio (all pre-generated)
