---
name: music-generation
description: AI-generated background music via MiniMax Music 2.0 on fal.ai. Optional add-on to the sound stage. Triggers on: music, background music, soundtrack, BGM, MiniMax, game music, title theme, gameplay loop, ambient music.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Music Generation -- AI Background Music via MiniMax Music 2.0

Optional add-on to the sound stage. Generates background music tracks from text prompts using MiniMax Music v2 via fal.ai. Tracks are generated at build time, saved as static MP3 assets, and played back with Howler.js at runtime.

**The sound design steps (jsfxr / ElevenLabs) handle SFX. This skill handles BGM.** They are complementary — SFX maps to ludemic moments, music maps to game states.

**When to use:** When the game benefits from background music to set mood, build tension, or reward achievement. Not every game needs BGM — fast-paced puzzle games may feel better with SFX only.

## Core Philosophy

Music reinforces the emotional arc of gameplay. Each game state gets a track that matches its mood. Music is always secondary to SFX — it sets atmosphere, never carries gameplay information.

| Game State | Music Character | Purpose |
|------------|-----------------|---------|
| **Title / Menu** | Inviting, sets the tone | "This is the vibe of the game" |
| **Gameplay** | Steady, non-distracting, loopable | "Focus on the puzzle/action" |
| **Tension** | Building energy, rising stakes | "Time is running out" |
| **Victory** | Triumphant, celebratory | "You did it!" |
| **Game Over** | Reflective, not punishing | "Try again" |
| **Attract Mode** | Showcase energy, inviting | "Come play this game" |

## Track Planning

Derive tracks from `design/01-core-identity.md` (GDD section — mood, theme, aesthetic) and game states from `design/02-game-loops.md` (meso loop section).

### Typical Track List (3-6 tracks)

Most mobile games need only 3-4 tracks. More isn't better — repetition with a good loop is fine.

| Track | Duration | Loop | Priority |
|-------|----------|------|----------|
| `gameplay` | Full generation | Yes | Required |
| `title` | Full generation | Yes | Required |
| `gameOver` | Full generation | No | Required |
| `victory` | Full generation | No | Nice-to-have |
| `tension` | Full generation | Yes | Nice-to-have |
| `attract` | Full generation | Yes | Optional (reuse title) |

## Generation Pipeline

Music is generated **once** at build time, not at runtime.

1. Read `design/01-core-identity.md` — extract mood, theme, aesthetic from GDD section
2. Read game state machine from `design/02-game-loops.md` (meso loop section)
3. Write music prompts that match the game's personality
4. Run the generation script — calls MiniMax Music v2 via fal.ai
5. Download MP3 files to `public/music/`
6. Wire playback in `music.ts` using Howler.js

### API Details

- **Endpoint**: `https://fal.run/fal-ai/minimax-music/v2`
- **Auth**: Requires `FAL_KEY` environment variable
- **Cost**: ~$0.03 per generation
- **Output**: MP3 files

### Input Parameters

- **`prompt`** (required, 10-300 chars): Style, mood, and scenario description
- **`lyrics_prompt`** (required, 10-3000 chars): Lyrics or instrumental structure tags. For game BGM, use structure tags with minimal or no lyrics
- **`audio_setting`** (optional): Audio configuration

### Instrumental Prompts

For game BGM, use structure tags without lyrics to get instrumental tracks:

```
[Intro][Verse][Chorus][Bridge][Outro]
```

Or with minimal vocalizations:

```
[Intro]
[Verse](instrumental melody, light humming)
[Chorus](wordless vocal harmony, la la la)
[Bridge](solo instrumental break)
[Outro](fade out)
```

## Generation Script

Create `scripts/generate-music.ts`:

```typescript
import { fal } from "@fal-ai/client";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

interface MusicSpec {
  name: string;
  prompt: string;
  lyrics_prompt: string;
}

const MUSIC_DIR = path.resolve("public/music");

async function generateTrack(spec: MusicSpec): Promise<string> {
  const result = await fal.subscribe("fal-ai/minimax-music/v2", {
    input: {
      prompt: spec.prompt,
      lyrics_prompt: spec.lyrics_prompt,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  });

  const audioUrl = (result.data as { audio: { url: string } }).audio.url;
  const response = await fetch(audioUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const filePath = path.join(MUSIC_DIR, `${spec.name}.mp3`);
  await writeFile(filePath, buffer);
  console.log(`  ✓ ${spec.name} → ${filePath}`);
  return filePath;
}

async function main(): Promise<void> {
  if (!process.env.FAL_KEY) {
    console.error("FAL_KEY environment variable is required.");
    console.error("Get one at https://fal.ai/dashboard/keys");
    process.exit(1);
  }

  if (!existsSync(MUSIC_DIR)) {
    await mkdir(MUSIC_DIR, { recursive: true });
  }

  // Derive these from design/01-core-identity.md GDD section mood + theme
  // Replace prompts with game-specific descriptions
  const tracks: MusicSpec[] = [
    {
      name: "gameplay",
      prompt: "Casual mobile game, upbeat, cheerful, light electronic, steady rhythm, focus-friendly",
      lyrics_prompt: "[Intro](4 bars, light percussion buildup)\n[Verse](main melody, bouncy synth, steady beat)\n[Chorus](fuller arrangement, layered synths, positive energy)\n[Bridge](stripped back, gentle variation)\n[Verse](main melody returns with subtle variation)\n[Chorus](full energy, satisfying loop point)",
    },
    {
      name: "title",
      prompt: "Mobile game title screen, inviting, warm, memorable melody, polished, slightly magical",
      lyrics_prompt: "[Intro](gentle arpeggio, building anticipation)\n[Verse](main theme melody, warm and welcoming)\n[Chorus](full arrangement, memorable hook, inspiring)\n[Outro](gentle fade to loop point)",
    },
    {
      name: "gameOver",
      prompt: "Game over screen, reflective, gentle, not sad, encouraging to retry, soft piano and strings",
      lyrics_prompt: "[Intro](soft piano notes, contemplative)\n[Verse](gentle melody, bittersweet but hopeful)\n[Outro](resolve upward, subtle encouragement)",
    },
    {
      name: "victory",
      prompt: "Level complete celebration, triumphant, joyful, bright brass and percussion, achievement unlocked",
      lyrics_prompt: "[Intro](fanfare burst, exciting)\n[Chorus](triumphant melody, full orchestra feel, celebratory)\n[Outro](satisfying resolution, sparkle)",
    },
  ];

  console.log(`Generating ${tracks.length} music tracks via MiniMax Music...`);

  for (const spec of tracks) {
    try {
      await generateTrack(spec);
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
# Install the fal.ai client (if not already installed from sound generation)
bun add -d @fal-ai/client

# Set your API key
export FAL_KEY="your-key-here"

# Run the generator
npx tsx scripts/generate-music.ts
```

Add a convenience script to `package.json`:
```json
{
  "scripts": {
    "generate-music": "tsx scripts/generate-music.ts",
    "generate-audio": "tsx scripts/generate-sounds.ts && tsx scripts/generate-music.ts"
  }
}
```

## Prompt Engineering for Music

The `prompt` field sets the overall vibe. The `lyrics_prompt` field controls structure and content.

### Prompt Guidelines

- **Be specific about genre**: "lo-fi hip hop" not "chill music"
- **Name instruments**: "acoustic guitar and soft synth pads" not "nice instruments"
- **Describe energy**: "steady mid-tempo, 100 BPM feel" not "medium speed"
- **Match the GDD mood**: If the game is "playful and colorful," the music should be too
- **Keep it 10-300 chars**

### Prompt Templates by Game State

| State | Template |
|-------|----------|
| Gameplay | "[genre], [energy], [mood], steady rhythm, focus-friendly, loopable" |
| Title | "[genre], inviting, [mood], memorable melody, polished" |
| Game Over | "Reflective, gentle, not sad, encouraging, [instruments]" |
| Victory | "Triumphant, joyful, [instruments], celebration, achievement" |
| Tension | "[genre], building intensity, rising stakes, urgent but not stressful" |

### lyrics_prompt for Instrumental BGM

Game music should almost always be instrumental. Use structure tags to control arrangement:

```
[Intro] — Sets the tone, 2-4 bars
[Verse] — Main melody, establishes the track
[Chorus] — Fuller arrangement, emotional peak
[Bridge] — Variation, break from repetition
[Outro] — Resolution or loop point
```

Add parenthetical notes for texture:
```
[Verse](pizzicato strings, bouncy bass, light hi-hat)
[Chorus](full strings, tambourine, melody doubles)
```

### Re-Generation Strategy

If a track doesn't fit the game's mood:
1. Adjust the `prompt` — be more specific about genre/instruments
2. Restructure `lyrics_prompt` — change arrangement, add/remove sections
3. Re-run only the single track: modify the script to generate just that one

## Playback Integration

### music.ts

```typescript
import { Howl } from "howler";

const MUSIC_FILES: Record<string, string> = {
  gameplay: "/music/gameplay.mp3",
  title:    "/music/title.mp3",
  gameOver: "/music/gameOver.mp3",
  victory:  "/music/victory.mp3",
};

type TrackName = keyof typeof MUSIC_FILES;

const tracks: Partial<Record<TrackName, Howl>> = {};
let currentTrack: TrackName | null = null;

function getTrack(name: TrackName): Howl {
  if (!tracks[name]) {
    const isLooping = name === "gameplay" || name === "title";
    tracks[name] = new Howl({
      src: [MUSIC_FILES[name]],
      preload: true,
      loop: isLooping,
      volume: 0.3,
    });
  }
  return tracks[name]!;
}

export function playMusic(name: TrackName): void {
  if (currentTrack === name) return;
  stopMusic();
  try {
    getTrack(name).play();
    currentTrack = name;
  } catch {
    // autoplay policy — will start on first user interaction
  }
}

export function stopMusic(): void {
  if (currentTrack) {
    getTrack(currentTrack).stop();
    currentTrack = null;
  }
}

export function setMusicVolume(volume: number): void {
  Howler.volume(volume);
}

export function pauseMusic(): void {
  if (currentTrack) {
    getTrack(currentTrack).pause();
  }
}

export function resumeMusic(): void {
  if (currentTrack) {
    getTrack(currentTrack).play();
  }
}
```

### Integration with Game Lifecycle

```typescript
import { playMusic, stopMusic, pauseMusic, resumeMusic } from './music';

// State transitions trigger music changes:
function onStateChange(newState: GameState): void {
  switch (newState) {
    case 'TITLE':     playMusic('title'); break;
    case 'PLAYING':   playMusic('gameplay'); break;
    case 'GAME_OVER': playMusic('gameOver'); break;
    case 'VICTORY':   playMusic('victory'); break;
    case 'PAUSED':    pauseMusic(); break;
    case 'RESUMED':   resumeMusic(); break;
  }
}
```

## Mix and Volume

### Channel Balance
- **Music volume**: 20-40% of master (background, never dominant)
- **SFX volume**: 50-80% of master (foreground, responsive)
- **Music ducks on SFX**: Not strictly required for short SFX, but consider ducking on longer sounds (level complete fanfare)

### Crossfade Strategy
When switching tracks (e.g., title → gameplay), fade out over 500ms, then fade in the new track:

```typescript
export function crossfadeTo(name: TrackName, duration = 500): void {
  if (currentTrack === name) return;
  const outgoing = currentTrack ? getTrack(currentTrack) : null;
  const incoming = getTrack(name);

  if (outgoing) {
    outgoing.fade(outgoing.volume(), 0, duration);
    setTimeout(() => outgoing.stop(), duration);
  }

  incoming.volume(0);
  incoming.play();
  incoming.fade(0, 0.3, duration);
  currentTrack = name;
}
```

### Mute and Volume Controls
Wire to the scaffold's existing audio system:
- `useAudio()` provides volume, mute, and music toggle
- The AudioProvider's music toggle should control BGM independently from SFX
- Persist music on/off preference to localStorage

## Accessibility

### Hard Requirements
- **Music toggle**: Independent from SFX mute — players should control music separately
- **Playable on mute**: Music is pure atmosphere, never carries gameplay info
- **Volume control**: Granular music volume adjustment
- **Autoplay policy**: Music starts only after first user interaction (tap to play)

## What This Stage Produces

### Files Created
- `scripts/generate-music.ts` — MiniMax Music generation script
- `public/music/*.mp3` — Generated music tracks
- `music.ts` — Howler.js playback with `playMusic()` / `stopMusic()` helpers

### Files Modified
- `package.json` — Add `generate-music` script (+ `generate-audio` combined script)
- `gameController.ts` or lifecycle controller — Import `playMusic`, call on state transitions

### Stage Constraints
- **Pre-generated**: Music is generated at build time, never at runtime
- **Static assets**: MP3 files served from `public/music/`
- **Howler.js playback**: Use Howler for cross-browser audio management + looping
- **Non-blocking**: Music preloading must not block game initialization (TTI < 3s)
- **State-driven**: Music changes are triggered by game state transitions, not events
- **FAL_KEY required**: Generation requires a fal.ai API key (not needed at runtime)
- **Instrumental**: Game BGM should be instrumental or minimal vocals — lyrics distract

## Execute

```sudolang
fn whenImplementingMusicGeneration() {
  Constraints {
    Read design/01-core-identity.md for mood, theme, and aesthetic direction (GDD section)
    Read design/02-game-loops.md for game states that need distinct tracks (meso loop section)
    Minimum 3 tracks: gameplay (loop), title (loop), gameOver (one-shot)
    Generation script must validate FAL_KEY before starting
    All MP3s saved to public/music/ with descriptive names
    Howler.js used for playback with loop config per track
    Music volume set to 20-40% of master — never louder than SFX
    Music toggle wired independently from SFX mute in AudioProvider
    Crossfade between tracks on state transitions (500ms default)
    Prompts derived from GDD mood — not generic placeholder descriptions
    lyrics_prompt uses structure tags for instrumental arrangement
  }
}
```

### Exit Criteria (Given/Should)

- Given the generation script is run with FAL_KEY, should produce all MP3 track files
- Given the generation script is run without FAL_KEY, should exit with a clear error
- Given the game is on the title screen, should play the title music on loop
- Given gameplay starts, should crossfade from title to gameplay music
- Given game over, should stop gameplay music and play game over track
- Given the music toggle is off, should silence all music but keep SFX
- Given the SFX mute is on, should keep music playing (independent controls)
- Given the game loads, should not autoplay music until first user interaction
- Given runtime, should make zero network requests for music (all pre-generated)
- Given music is playing, should be at 20-40% volume relative to SFX
