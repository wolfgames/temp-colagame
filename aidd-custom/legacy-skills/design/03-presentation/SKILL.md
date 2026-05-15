---
name: 03-presentation
description: Define visual identity, sound design, music plan, and juice feedback. Step 3 of 4.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent
---

# 03 — Presentation

Define how the game looks, sounds, and feels. Visual identity, SFX event map, optional music tracks, and layered juice feedback — all in one pass so they reinforce each other.

## Input

Read `design/01-core-identity.md` and `design/02-game-loops.md` before running.

## Output

`design/03-presentation.md` — Fill all schemas with game-specific values.

**STRICT:** Output ONLY the fields in the schemas. No extra sections.

## Section A: Visual Design

Every game object should look lickable. Dimensional, lit, tactile.

```json
{
  "visual_design": {
    "aesthetic_signature": "one sentence — identifiable from a single screenshot",
    "target_feeling": "the physical/emotional sensation the visuals should evoke on first glance",

    "chromatic_architecture": {
      "primary": string,
      "secondary": string,
      "accent": string,
      "background": string,
      "shadow_tint": "hue-shifted dark (never pure black)",
      "highlight_tint": "hue-shifted light (never pure white)",
      "emotional_intent": "what the palette makes the player feel"
    },

    "lighting_model": {
      "direction": "angle in degrees (e.g. 315 = top-left)",
      "elevation": "high | medium | low",
      "warmth": "warm | neutral | cool",
      "consistency": "ALL objects lit from the same direction, no exceptions"
    },

    "object_rendering": {
      "recipe_per_layer": [
        "1. Base fill",
        "2. Internal shadow — darker hue-shifted region, gives volume",
        "3. External shadow — drop/contact shadow, grounds in space",
        "4. Highlight — specular/diffuse spot on toward-light side",
        "5. Edge definition — outline, rim light, or ambient occlusion"
      ],
      "materials": [
        {
          "name": string,
          "used_for": "which game objects",
          "base_treatment": string,
          "internal_shadow": string,
          "external_shadow": string,
          "highlight": string,
          "special_effect": "material-specific behavior (shimmer, squash-stretch, refraction, etc.)",
          "tactile_verb": "squishy, clicky, weighty, snappy"
        }
      ]
    },

    "scene_atmosphere": {
      "backdrop": "textured, not flat — describe pattern, grain, gradient",
      "depth_layers": "how many parallax layers and what they contain",
      "ambient_particles": "dust motes, sparkles, fog wisps, or 'none'",
      "vignette": "true/false + intensity",
      "sense_of_place": "one sentence — where does the player feel they ARE?"
    },

    "affordance_system": {
      "touchable_objects": "full 5-layer rendering, brightest highlights, respond to hover/press",
      "press_response": "shadow shrinks, highlight shifts, object compresses toward surface",
      "ambient_objects": "reduced rendering — fewer layers, muted colors, no interaction response",
      "hierarchy_rule": "touchable objects are ALWAYS more dimensional than ambient"
    },

    "typography": {"heading": string, "body": string, "score": string},
    "sprite_strategy": "svg | css_graphics | sprite_sheet | generated",
    "layout": {
      "base_resolution": "390x844",
      "orientation": "portrait",
      "safe_areas": true,
      "scaling": "proportional"
    },
    "framework": string,
    "renderer": "pixi.js",
    "state_store": string
  }
}
```

### Object Rendering Golden Rule

Every visible game object gets the full 5-layer treatment (base fill, internal shadow, external shadow, highlight, edge definition). Objects without all 5 layers look like flat clip art. **No flat clip art.**

### Material Behavior

| Material | Signature Effect |
|---|---|
| Metal | Animated reflection sweep / shimmer |
| Plastic | Squash-and-stretch on interact, bouncy settle |
| Glass | Sharp specular highlight, refraction edge |
| Clay/rubber | Soft deformation, fingerprint-scale texture |
| Wood | Visible grain, matte highlight, solid feel |
| Paper | Subtle fiber texture, soft fold shadows |

## Section B: Sound Design

Give every ludemic moment an audio signature. Game must be fully playable on mute.

```json
{
  "sound_design": {
    "profile": "8bit | organic | minimal | orchestral | synthesized",
    "events": {
      "input_feedback": [{"moment": string, "sound_character": string, "intensity": "low | medium | high"}],
      "verb_execution": [{"moment": string, "sound_character": string, "intensity": string}],
      "reward": [{"moment": string, "sound_character": string, "intensity": string}],
      "tension": [{"moment": string, "sound_character": string, "intensity": string}],
      "failure": [{"moment": string, "sound_character": string, "intensity": string}],
      "state_change": [{"moment": string, "sound_character": string, "intensity": string}]
    },
    "variations": {
      "high_frequency_sounds": "3-5 variants each",
      "medium_frequency": "2-3 variants",
      "rare_sounds": "1 variant"
    },
    "mix": {
      "master_volume": number,
      "sfx_channel": number,
      "overlap_policy": "allow | replace | queue"
    },
    "music_plan": {
      "has_bgm": "boolean — false if SFX-only is better for this game",
      "tracks": [{"name": string, "loop": boolean, "mood": string, "priority": "required | nice-to-have | optional"}],
      "volume_percent": "20-40% of master"
    },
    "accessibility": {
      "mute_toggle": true,
      "playable_on_mute": true,
      "volume_control": true,
      "music_toggle_independent": true
    }
  }
}
```

### Sound Event Categories

| Category | Purpose | Sources |
|---|---|---|
| input_feedback | System heard the player | Tap ack, hover, drag start |
| verb_execution | Player intent becomes state | Place, drop, swap, match, route |
| reward | Positive outcome | Match, combo, level complete, star |
| tension | Pressure before resolution | Timer tick, near-fail, anticipation |
| failure | Negative outcome | Wrong move, timeout, miss |
| state_change | Game state transition | Level load, screen transition, unlock |

## Section C: Juice

Layered visual+audio reinforcement. Juice sits ON TOP of game logic — never modify state.

```json
{
  "juice": {
    "feedback_tiers": {
      "tier_1_subtle": {
        "moments": [string],
        "effects": ["scale_punch(1.05x, 50ms)", "small particles", "number popup"]
      },
      "tier_2_noticeable": {
        "moments": [string],
        "effects": ["screen_shake(small)", "color_flash", "freeze_frame(2 frames)", "medium particles"]
      },
      "tier_3_dramatic": {
        "moments": [string],
        "effects": ["confetti", "camera zoom", "slam effect", "screen_shake(big)"]
      }
    },
    "particle_budget": {
      "max_concurrent": number,
      "shapes": [string],
      "colors_from_palette": true
    },
    "combo_escalation": {
      "effect_scaling": "how effects grow with combo count",
      "pitch_shift": "sound pitch rises with combo",
      "max_escalation_at": number
    },
    "animation_timing_ms": {
      "scale_punch": number,
      "color_flash": number,
      "screen_shake": number,
      "number_popup": number,
      "confetti": number
    },
    "sound_sync": "all visual juice triggers on same frame as corresponding audio",
    "performance_target": "60fps on lowest target device"
  }
}
```

### Tier Assignments

| Tier | When | Examples |
|---|---|---|
| 1 — Subtle | Every input, every collection | scale_punch, small particles, number popup |
| 2 — Noticeable | Combo trigger, obstacle hit, power up | screen_shake, color_flash, freeze_frame |
| 3 — Dramatic | Level complete, high score, game over, big combo | confetti, camera zoom, slam, big shake |

## Constraints

**Visual:**
- Every game object uses the 5-layer rendering recipe — no exceptions
- Lighting direction and warmth defined once, applied everywhere
- Shadow colors hue-shifted (never pure black), highlights hue-shifted (never pure white)
- Backdrop is textured with spatial depth — never flat color
- Touchable objects always more dimensional than ambient
- Novel aesthetic — must NOT resemble generic framework defaults
- Mobile-first portrait at 390x844

**Sound:**
- Map EVERY ludemic moment from micro/meso/macro loops to one event
- Core verb gets signature sound with pitch variation
- Reward sounds escalate intensity for combos/chains
- Sound profile matches the visual theme
- sound_character: max 40 chars per entry

**Juice:**
- Every player input gets tier 1 feedback — no silent interactions
- Combo escalation multiplicative (not additive)
- Visual juice triggers on same frame as corresponding audio
- Juice layers ON TOP — never modify game logic
- Particle shapes match visual vocabulary
- 60fps on lowest target device

## Exit Criteria

- Given aesthetic signature, should be identifiable from a single screenshot
- Given chromatic architecture, should include hue-shifted shadow/highlight tints (no pure black/white)
- Given lighting model, should define direction, elevation, warmth applied consistently
- Given object rendering, every game object should specify all 5 layers
- Given materials, each should define base, shadow, highlight, AND signature physical effect
- Given scene atmosphere, backdrop should be textured (not flat) with at least 2 depth layers
- Given every ludemic moment, should have a mapped sound event
- Given core verb, should have signature sound with pitch variation
- Given reward sounds, should escalate intensity for combos/chains
- Given mute mode, should be fully playable
- Given every player input, should have tier 1 subtle feedback
- Given combo escalation, should scale multiplicatively
- Given sound sync, should trigger visual + audio on same frame
- Given juice layer, should NOT modify game logic
- Given performance, should maintain 60fps
- Given the output, should be at `design/03-presentation.md`
