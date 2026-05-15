---
name: polish
description: Audit a completed game against its design docs and iteratively polish until impressive. Use when the game builds but needs quality improvement, when auditing fidelity to design specs, or when iterating on UI/UX polish. Triggers on: polish, audit, review game, make it better, iterate, improve, refine, quality pass, it doesn't look good, make it impressive.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Polish & Audit — From "It Runs" to "It's Impressive"

A game that builds is not a game that ships. This skill drives the audit-fix-reaudit loop that closes the gap between functional and delightful.

## The Quality Gap

Most first-pass implementations have these problems:
- **Functional but generic** — rectangles instead of designed shapes, 3 colors instead of 7
- **Structurally correct but hollow** — level progression works but every level feels the same
- **Technically sound but lifeless** — no juice, no personality, no reason to keep playing

Polish is not optional decoration. It's the difference between a tech demo and a game someone wants to play.

## Audit Domains

Five domains, each audited independently with a fresh-context sub-agent:

### 1. Mechanics Audit
```
Source docs: design/01-core-identity.md (GDD + micro loop sections),
             design/02-game-loops.md (meso + level gen + macro sections)
Check:
- Core verb matches design (tap/swipe/drag, not a hybrid)
- step() is pure — no side effects, no randomness without seed
- Scoring formula is EXACT — test with known inputs
- Level generation algorithm matches design (not simplified)
- Solvability validator works (zero unsolvable levels in 100 generated)
- State machine has correct states and transitions
- Breathe levels present at correct intervals
- Unlock milestones at correct levels
- Level complete → next level (not game over)
- Bot can complete every level
```

### 2. Visual Audit
```
Source docs: design/03-presentation.md (visual design section), design/01-core-identity.md (GDD section)
Check:
- Entity shapes: exact geometry from design (triangles, circles, hexagons — not substitutes)
- Color palette: every color present, correct hex values
- Color unlock schedule: correct colors available at each progression tier
- Typography: correct font, weight, sizes
- Material voice: does the visual feel match the design's description?
- Background/environment: present or intentionally minimal per design
- No placeholder rectangles remaining
- Sprite quality: procedural Pixi Graphics or proper assets, not dev-art
- Visual hierarchy: primary actions are visually prominent
- Consistent spacing: grid-aligned, no random gaps
```

### 3. Audio Audit
```
Source docs: design/03-presentation.md (sound design section)
Check:
- Every LudemicEvent type has a mapped SFX
- SFX play on the correct frame (no delay after action)
- jsfxr params match design (not default presets)
- Variation strategy implemented (pitch shift, multiple variants)
- Volume/mute controls work
- No silent interactions — every player action has audio feedback
- Audio doesn't clip or overlap badly on rapid actions
```

### 4. Juice Audit
```
Source docs: design/03-presentation.md (juice + visual design sections)
Check:
- Particle shapes match visual vocabulary (not default squares)
- Scale punch on every tap/interaction
- Screen shake on impacts at correct intensities
- Combo escalation: effects grow with combo count per design curve
- Confetti/celebration on level complete
- Freeze frame on big moments
- Sound + visual juice sync (same frame)
- GSAP easing correct (elastic, power2, etc. — not linear)
- Particle budget respected (no frame drops)
- Arc animations, compress animations per design
```

### 5. Flow Audit
```
Source docs: design/04-player-journey.md (lifecycle + FTUE + attract mode sections)
Check:
- Title screen has visual presence (not plain text)
- Max 2 taps to gameplay
- Pause button visible and functional
- Pause overlay stops game logic
- Game over screen shows score, best score, retry option
- Level complete shows interstitial before next level
- FTUE completes in under 30 seconds
- FTUE is skippable
- FTUE teaches through play, not text walls
- Mid-game tutorials at unlock milestones (if designed)
- Attract mode loops 15-30 seconds
- Attract mode has failure beat (AI fails dramatically)
- Hand pointer overlay in attract mode
- Any input exits attract mode
```

## UI Polish Standards (3 escalating passes)

### Pass 1: Does Everything Exist and Work?

The structural pass. Binary checks — it's there or it isn't.

| Check | How to Verify |
|-------|--------------|
| All screens navigable | Tap through title → game → pause → game over → title |
| Pause button visible | Grep for pause in render code |
| Level advancement works | Complete a level, verify next level loads |
| Score displays correctly | Known inputs → expected score formula output |
| Touch targets ≥ 44px | Check hit areas in interactive elements |
| No overlapping elements | Visual inspection at game resolution |
| No off-screen content | Check bounds at 390×844 (iPhone 14) and 360×780 (small Android) |
| Text readable | Font size ≥ 14px for body, ≥ 20px for scores |

### Pass 2: Does It Match the Design Doc?

The fidelity pass. Compare every visual element to the design doc.

| Check | How to Verify |
|-------|--------------|
| Entity geometry exact | Read draw calls, compare to design doc shape descriptions |
| Full color palette | Count colors in theme.ts vs design doc |
| Typography matches | Font family, weight, size per design |
| Environmental elements | Backgrounds, borders, textures per design |
| Visual hierarchy | Primary actions larger/brighter than secondary |
| Spacing consistent | Elements align to grid (typically 4px or 8px) |
| Animations smooth | No jank, 60fps, proper easing |
| Particle shapes correct | Match entity visual vocabulary |
| Transitions polished | Screen changes use fade/slide, not hard cuts |

### Pass 3: Does It Feel Good to Play?

The delight pass. Subjective but structured.

| Check | What "Good" Looks Like |
|-------|----------------------|
| Every action has feedback | Tap → scale punch + sound. No silent interactions. |
| Combos feel escalating | Combo 5 feels dramatically different from combo 1 |
| Winning feels rewarding | Level complete has confetti, celebration SFX, score fanfare |
| Losing feels motivating | Game over shows progress, "one more try" energy |
| Title screen has identity | Unique visual, not a framework default |
| Attract mode is compelling | You'd stop and watch for a moment |
| Tutorial feels like playing | Not "tap here" text walls, but guided discovery |
| Overall cohesion | Colors, shapes, sounds, animations feel like ONE game |
| The "show someone" test | Would you demo this to a friend with pride? |
| The Miyamoto test | Is just doing the verb fun, even without goals? |

## Audit Report Format

Each audit sub-agent produces a report in this format:

```markdown
# {Domain} Audit — Iteration {N}

## Summary
{1 sentence: overall quality level}

## ✅ Matches Design ({count})
- {item}: {evidence}

## ⚠️ Partial ({count})
- {item}: {what's there} → {what design says}

## ❌ Missing or Wrong ({count})
- {item}: expected {X from design}, actual {Y in code}

## 💡 Polish Opportunities
- {things that work but could be more impressive}

## Score: {N}/10
```

## Fix Priority Order

When multiple issues exist, fix in this order:

1. **❌ Mechanics** — Wrong game logic is the worst. Fix scoring, progression, level gen first.
2. **❌ Flow** — Broken navigation (level complete → game over) ruins the experience.
3. **❌ Visual** — Wrong shapes/colors are immediately visible.
4. **⚠️ Juice** — Missing feedback makes actions feel dead.
5. **⚠️ Audio** — Silent interactions feel broken.
6. **⚠️ Polish** — Spacing, alignment, transitions.
7. **💡 Delight** — The "would you show someone" improvements.

## Iteration Strategy

Don't try to fix everything in one pass. Each iteration has a focus:

- **Iteration 1**: Fix all ❌ items across all domains. Get to functional correctness.
- **Iteration 2**: Fix all ⚠️ items. Get to design fidelity. Run UI Pass 2.
- **Iteration 3**: Address 💡 items. Run UI Pass 3. Chase delight.
- **Iteration 4-5**: Diminishing returns. Fix only high-impact remaining items. Ship.

## The "Ship It" Decision

Stop polishing when:
- All ❌ items are resolved
- UI Pass 2 criteria are met (design fidelity)
- At least 7/10 of UI Pass 3 criteria feel good
- The build passes clean
- You've hit 5 iterations (respect diminishing returns)

Or stop early if the user says it's good enough. Polish is infinite — know when to ship.

## Execute

```sudolang
fn whenPolishingAGame() {
  Constraints {
    Always audit with sub-agents for fresh context — never audit from compacted memory
    Audit reports must quote specific design doc values and code line numbers
    Fix ❌ items before ⚠️ items, mechanics before visuals
    UI gets 3 dedicated polish passes with escalating standards
    Every fix must be verified against the design doc, not just "does it build"
    Particle shapes must match entity visual vocabulary throughout all polish
    Stop at 5 iterations — polish is infinite, shipping is finite
    Never remove working features to fix other issues — only add and improve
  }
}
```

### Exit Criteria (Given/Should)

- Given an audit is run, should produce reports for all 5 domains with ✅/⚠️/❌ ratings
- Given ❌ items exist, should fix mechanics issues before visual issues
- Given UI Pass 1 is run, should verify all screens exist and are navigable
- Given UI Pass 2 is run, should verify every visual element matches the design doc
- Given UI Pass 3 is run, should evaluate subjective quality against the 10-item delight checklist
- Given all ❌ items are resolved and UI Pass 2 passes, should be ready to ship
- Given 5 iterations have been completed, should stop and surface any remaining issues to the user
- Given any fix is applied, should not break previously passing checklist items (no regressions)
