# Game Completeness Checklist

Use this checklist to track progress from a bare archetype to a shippable game. Each section maps to a build pass or template layer.

---

## Pass 1: Core Loop (Archetype)

The base game mechanic — "What am I doing?"

### Interaction

- [ ] Primary interaction defined (tap-swap, tap-clear, swipe-move, etc.)
- [ ] Interaction template applied from `interaction-templates/`
- [ ] Gesture detection working (tap, swipe, flick threshold)
- [ ] Swap/clear animation plays correctly
- [ ] Invalid move feedback (shake, reject animation)

### Board & Pieces

- [ ] Board renders at correct dimensions
- [ ] Pieces fill 100% of cell (spacing from grid gap only)
- [ ] Piece visual style locked (colored rounded rectangles with radial gradients)
- [ ] Stable piece IDs (`key={piece.id}`, not position-based)

### Core Mechanics

- [ ] Match/clear detection working
- [ ] Gravity drop with per-piece animation
- [ ] New piece spawning from top
- [ ] Cascade resolution (chain reactions complete before next move)
- [ ] Cascade escalation (speed, bounce, intensity scale with chain depth)
- [ ] Input blocked during animations

### Scoring

- [ ] Base score per clear/match
- [ ] Combo/chain multiplier
- [ ] Score display updates in real-time
- [ ] Score popup animation at clear location

### Conditions of Satisfaction

- [ ] `condition-core-interaction` — intuitive in 3 seconds
- [ ] `condition-canvas` — pieces large enough for distinctive art (48x48px min)
- [ ] `condition-scoring` — score variation supports leaderboard striation
- [ ] `condition-animated-dynamics` — every action gets a visible physical response
- [ ] `condition-skill-curve` — difficulty scales with player skill

---

## Pass 2: Secondary Mechanics

Pattern-busters and special pieces that add variety to the core loop.

### Special Pieces

- [ ] Match-4 creates a special piece (e.g., line blast)
- [ ] Match-5 creates a special piece (e.g., color bomb)
- [ ] L/T-shape match creates a special piece (e.g., area blast)
- [ ] Special piece activation animation
- [ ] Special piece chain reactions (special + special combos)

### Obstacles

- [ ] At least one obstacle type (e.g., ice, stone, cage)
- [ ] Obstacles have HP / break conditions
- [ ] Obstacles affect gravity and board flow
- [ ] Obstacle clear animation and feedback

### Board Variation

- [ ] Non-standard board shapes (holes, irregular edges)
- [ ] Blocked cells / unmovable pieces
- [ ] Board-specific goals beyond score (clear all obstacles, collect items)

### Pattern-Busters

- [ ] `condition-pattern-busters` — mechanics prevent repetitive/stale strategies
- [ ] Player cannot win by repeating the same pattern indefinitely
- [ ] Multiple viable strategies per board state

---

## Pass 3: Meta Loop

Medium-to-long compulsion loops — "Why am I doing it?" The compelling reason to keep playing even after the core loop reward gets stale.

### Level Progression

- [ ] Level sequence with increasing difficulty
- [ ] Per-level goals (score target, obstacle clear, item collection)
- [ ] Move limit or time limit per level
- [ ] Level complete screen with star rating (1-3 stars)
- [ ] Level select / map screen
- [ ] Difficulty curve tuned (not too steep, not flat)

### Resource Economy

- [ ] Soft currency earned from gameplay (coins, gems)
- [ ] Hard currency (premium, purchased or rare-earned)
- [ ] Currency display in resource indicators
- [ ] Currency spent on boosters, continues, cosmetics

### Unlocks & Collection

- [ ] New content unlocked through progression (themes, pieces, boards)
- [ ] Collection mechanic (collect all X to earn reward)
- [ ] Unlock notifications and celebration

### Narrative / Theme

- [ ] World/zone structure (themed groups of levels)
- [ ] Zone transitions with visual change
- [ ] Light narrative thread connecting zones (optional)
- [ ] Interstitial story beats between zones

### Session Hooks

- [ ] Daily reward / login bonus
- [ ] Limited-time events
- [ ] Energy system or session pacing
- [ ] "One more round" triggers (almost-win, close to unlock)

---

## Pass 4: Superfan Loop

Prestige and competitive systems — "How am I admired?" Supportive reward mechanics gated by progression that only reward the best and most expert players.

### Leaderboards

- [ ] Score-based leaderboard (global, friends, weekly)
- [ ] Leaderboard screen accessible from navbar or post-game
- [ ] Rank display and movement indicators
- [ ] Seasonal leaderboard resets

### Competitive

- [ ] Ranked tiers / divisions
- [ ] Prestige badges visible to other players
- [ ] Competitive seasons with exclusive rewards
- [ ] Tournament or challenge events

### Social / Guild

- [ ] Guilds/clans with membership
- [ ] Guild leaderboards
- [ ] Cooperative goals (guild-wide objectives)
- [ ] Chat or social feed within guild

### Peacocking

- [ ] Rare cosmetics earned through mastery (not just purchase)
- [ ] Profile display (avatar, frame, badge, title)
- [ ] Visible progression markers others can see
- [ ] Exclusive rewards for top percentile players

### Mastery

- [ ] Achievement system (lifetime accomplishments)
- [ ] Mastery levels beyond standard progression
- [ ] Expert-only challenges or modes
- [ ] Stats tracking (games played, longest chain, best score)

---

## Wrapper Templates

Standard game UI components that surround the core gameplay. Each should be built from a locked template in `wrapper-templates/`.

### Screens

- [ ] **Title Screen** — logo, start button, settings button, daily reward teaser
- [ ] **Settings Screen** — music toggle/volume, SFX toggle/volume, account info
- [ ] **Win Screen** — score summary, star rating, celebration animation, next level / replay buttons
- [ ] **Loss Screen** — retry, use booster, return to map
- [ ] **Leaderboard Screen** — global/friends/weekly tabs, player rank highlighted
- [ ] **Interstitial Screen** — narrative text/art between zones or at milestones

### Overlays & Layers

- [ ] **Narrative Layer** — text/dialogue overlay on top of gameplay for mid-game storytelling
- [ ] **Notification System** — toast/banner notifications for achievements, unlocks, events, off-screen state changes
- [ ] **Tutorial Overlay** — highlight + tooltip system for FTUE and new mechanic introduction

### Navigation & HUD

- [ ] **Navbar** — bottom tab navigation for multi-screen games (play, collection, shop, social, profile)
- [ ] **Resource Indicators** — top bar showing soft currency, hard currency, energy, or other resources
- [ ] **Level HUD** — in-game display of moves remaining, score, level goals, pause button

---

## Polish & Ship

Final quality pass before release.

### Visual Polish

- [ ] Consistent color palette across all screens
- [ ] Transitions between screens (fade, slide, zoom)
- [ ] Loading states and spinners where needed
- [ ] Empty states for leaderboards, collections, etc.

### Audio

- [ ] Background music (menu, gameplay, win, loss)
- [ ] SFX for all interactions (tap, clear, cascade, special piece, UI buttons)
- [ ] Audio respects settings toggles
- [ ] Pitch/volume scaling with cascade depth

### Performance

- [ ] Smooth 60fps during cascades and animations
- [ ] No jank on first load or screen transitions
- [ ] Assets preloaded or lazy-loaded appropriately

### Accessibility

- [ ] Touch targets large enough for mobile (44x44px minimum)
- [ ] Color-blind friendly (shape or pattern backup for color)
- [ ] Responsive layout across device sizes
