# Inspector Panel (Unity-Style Tuning) — Brainstorm

> A Unity-style sidebar for tuning game modules in real-time, replacing Tweakpane with a first-party component that understands the module graph.
> 

---

## The Core Idea

Unity's Inspector isn't just a property editor — it's a **live view of what exists**. You see every component on a GameObject whether it's active or disabled. Disabled ones are grayed out but still visible, still editable. You don't lose context when something isn't on screen.

We want that for our module system. Every primitive, prefab, and logic module that's been registered should appear in the sidebar — always. The panel becomes both a tuning tool AND a map of what's composed into the current screen.

---

## Key Departures from Tweakpane

| Tweakpane | Inspector |
| --- | --- |
| Generic sliders bound to arbitrary values | Schema-driven controls generated from tuning.ts |
| Flat folder hierarchy | Module-aware tree: primitives, prefabs, logic |
| No awareness of component lifecycle | Knows if a module is mounted, dormant, or destroyed |
| Manual binding code | Auto-discovers registered modules |
| Third-party DOM, hard to style | Our own rendering, matches game design tokens |
| Dev-only, hidden in prod | Dev-only by default, could ship a creator mode subset |

---

## Module Lifecycle States

Every module in the inspector has a **presence state** independent of its tuning values:

```
DORMANT (ghost) → mount() → ACTIVE (live) → unmount() → DORMANT (ghost)
                                                          ↓
                              destroy() / screen change → REMOVED
```

### Visual Treatment

| State | Sidebar Appearance | Behavior |
| --- | --- | --- |
| **Active** | Full opacity, white header, live preview thumbnail | Sliders update in real-time, changes reflected immediately |
| **Dormant** | 40% opacity, dashed border, italic label | Sliders still editable — values cached for next mount. Subtle "not on screen" pill badge |
| **Removed** | Collapsed to single line, muted | Click to expand history of last-known values. Option to pin so it stays visible |

The ghost state is the key insight: **you can pre-tune a module before it appears.** Set up the dialogue box timing before the narrative screen loads. Adjust the score popup easing before anyone scores.

---

## Panel Layout

```
+--------------------------------------+
|  Inspector                       < v |  <- collapse / dock
+--------------------------------------+
|  Filter modules...                   |  <- search bar
+--------------------------------------+
|                                      |
|  > PRIMITIVES                        |  <- category header
|  +--------------------------------+  |
|  | * sprite-button         ACTIVE |  |  <- green dot = active
|  |   hoverScale     [====*===] 1.1|  |
|  |   pressScale     [==*=====] 0.9|  |
|  |   Reset                        |  |
|  +--------------------------------+  |
|  +- - - - - - - - - - - - - - - -+  |
|  | o dialogue-box       DORMANT  |  |  <- dashed, faded
|  |   typeSpeed    [===*====] 0.04|  |     still editable
|  |   Reset                        |  |
|  +- - - - - - - - - - - - - - - -+  |
|                                      |
|  > PREFABS                           |
|  +--------------------------------+  |
|  | * gameplay-hud          ACTIVE |  |
|  |   composed of:                 |  |  <- shows composition
|  |     * score-popup              |  |     click to jump
|  |     * hint-button              |  |
|  |   timerFormat  [mm:ss      v] |  |
|  +--------------------------------+  |
|                                      |
|  > LOGIC (collapsed)                 |
|                                      |
+--------------------------------------+
|  Screen: gameplay  | 3 active        |
|  Copy All  |  Import  |  Save        |
+--------------------------------------+
```

---

## Prefab Identity: Universal vs. Instanced

This is the central design question for how prefabs appear in the inspector. There are two fundamentally different kinds of prefab, and they need different treatment.

### The Two Kinds

**Universal prefabs** — One definition, one identity. Every appearance is the same prefab. Change it once, it changes everywhere. Think: companion widget, gameplay HUD, options modal, score popup. There's conceptually *one* companion component in the game — it just shows up in different places.

**Instanced prefabs** — Multiple copies with per-instance differences. Think: hotspots (12 on a scene, each at different positions with different sizes), episode cards (one per episode, different states), evidence items. Same blueprint, but each instance has its own overrides.

The distinction isn't about the code — both use the same module factory. It's about **how the designer thinks about them**.

### Registration API

```tsx
// Universal — singleton tuning, one section in the inspector
inspector.register({
  id: 'companion',
  category: 'prefab',
  identity: 'universal',
  schema: companionTuning.schema,
  defaults: COMPANION_DEFAULTS,
  values: config,
  onChange: (key, value) => { /* updates everywhere */ },
});

// Instanced — each instance gets its own tuning context
inspector.register({
  id: 'hotspot',
  category: 'primitive',
  identity: 'instanced',
  instance: {
    key: 'magnifying-glass',
    label: 'Magnifying Glass',
    context: 'kitchen',
  },
  schema: hotspotTuning.schema,
  defaults: HOTSPOT_DEFAULTS,
  values: thisHotspotConfig,
  onChange: (key, value) => { /* updates only this instance */ },
});
```

### Universal Prefab in Inspector

Single section, always:

```
+------------------------------------+
| * companion                ACTIVE  |
|   avatarSize    [====*===]    64   |
|   bubbleDelay   [==*=====]   400   |
|   ease          [power2.out    v]  |
|   Reset                            |
+------------------------------------+
```

Change `avatarSize` to 80 and every companion appearance updates. Simple.

### Instanced Prefab in Inspector

Class defaults + instance list:

```
+------------------------------------+
| * hotspot (x12)            ACTIVE  |
|                                    |
| -- Class Defaults                  |  <- affects ALL hotspots
|   hitRadius    [====*===]     24   |
|   pulseSpeed   [==*=====]    1.2   |
|   glowColor    [# FFD700        ]  |
|                                    |
| -- Instances           [Bulk off]  |  <- toggle bulk edit
| +- - - - - - - - - - - - - - - -+ |
| | magnifying-glass   (kitchen)   | |
| |   hitRadius  32  <- override   | |  <- bold = differs from class
| |   pulseSpeed .   (class: 1.2)  | |  <- dot = using class default
| +- - - - - - - - - - - - - - - -+ |
| +- - - - - - - - - - - - - - - -+ |
| | bloody-knife       (hallway)   | |
| |   hitRadius  .   (class: 24)   | |  <- all dots = no overrides
| +- - - - - - - - - - - - - - - -+ |
|   ... +10 more instances           |
+------------------------------------+
```

### Value Resolution Chain

For instanced prefabs, every parameter resolves through a 3-layer cascade:

1. **Module Defaults** (defaults.ts, baked into code) — lowest priority
2. **Class Defaults** (set in inspector, all hotspots in this game) — middle
3. **Instance Override** (this specific hotspot is bigger) — highest priority

The inspector shows which layer a value comes from:

| Display | Meaning |
| --- | --- |
| **32 bold** | Instance override — this instance differs from class |
| 24 normal | Class default — set via the Class Defaults section |
| *24 italic gray* | Module default — from defaults.ts, never touched |

### Bulk Edit Mode

For instanced prefabs, toggle Bulk to edit all instances at once. Warning shown when bulk will overwrite existing per-instance overrides. Options: "Apply to all" or "Only non-overridden".

### Embedded Primitives in Prefabs

When a prefab composes primitives, the question is: does the prefab get its own copy of the primitive's values, or does it share the primitive's global values?

**Answer: it depends on the prefab's identity.**

Universal prefabs can declare prefab-level overrides for their embedded primitives. In the inspector these show as blue values, with a link to jump to the primitive's global section.

Instanced prefabs with embedded primitives get a 4-layer cascade:

`Module default -> Primitive global -> Prefab class -> Instance override`

### When to Use Which

| Pattern | Identity | Example | Why |
| --- | --- | --- | --- |
| One widget, always the same | **Universal** | companion, gameplay-hud, options-modal | Singular identity, change once everywhere |
| Multiple copies, same behavior | **Instanced** (no overrides) | score-popups, click-feedback | Many instances, class defaults only |
| Multiple copies, each unique | **Instanced** (with overrides) | hotspots, episode-cards, evidence-items | Position/size/content differ per instance |
| One widget, different per screen | **Instanced** (by context) | navigation-arrows, HUD variants | Same module, context changes config |

### Promote / Demote Workflows

**Promote to class:** Tuning one hotspot and realize they should all be that size? Right-click the instance override, select "Promote to class default." The value moves from instance to class, all others inherit it.

**Demote to instance:** Change a class default, but one instance shouldn't change? Right-click that instance, select "Keep previous value as instance override." That instance pins its old value.

---

## Control Types

| Schema Type | Inspector Control | Notes |
| --- | --- | --- |
| `number` (with min/max) | Slider with number input | Drag OR type exact value |
| `boolean` | Toggle switch |  |
| `string` (enum) | Dropdown | Inferred from options field |
| `color` | Color swatch + picker | Inline swatch, click to expand |
| `vec2` / `point` | X/Y paired inputs | Optional: click-drag on canvas |
| `easing` | Curve preview + dropdown | SVG preview of curve shape |
| `range` | Dual-thumb slider | For min/max pairs |
| `action` | Button | Triggers callback (Play Animation, Reset State) |

---

## Rendering Approach

### Option A: DOM Sidebar (Recommended)

Render as a standard DOM sidebar overlaying the game canvas:

- Native form controls — accessible, keyboard-navigable
- Easy to style with Tailwind / design tokens
- Text selection, copy-paste work naturally
- Scrolling is native
- SolidJS component matching template-amino stack

### Option C: Hybrid (Best of Both)

DOM sidebar for the panel itself, but with a **canvas overlay mode** for spatial tools:

- Click a hotspot's position param to enter "pick mode" on the canvas
- Drag to reposition, inspector updates the coordinates
- Useful for vec2, bounds, anchor type parameters

This is the Unity workflow: most editing is in the Inspector sidebar, but some properties have scene-view gizmos.

---

## Persistence and Export

| Action | What it does |
| --- | --- |
| **Auto-save** | Every change writes to localStorage keyed by inspector:moduleId:key |
| **Copy All** | Serializes all non-default values as JSON — paste into defaults.ts |
| **Save Preset** | Named preset in localStorage (e.g. "aggressive scoring", "gentle hints") |
| **Share** | URL-encoded query string of overrides — send link to teammate |

### Defaults Workflow

1. Tweak values in the inspector during dev
2. When happy, click "Copy All"
3. Paste into the module's `defaults.ts`
4. Commit — the tuning is now baked in
5. Inspector shows everything as "default" again (no bold overrides)

---

## Screen Awareness

The inspector knows which screen is active (via screen-manager system). It can:

- **Auto-filter** to show only modules relevant to the current screen
- **Show all** mode to see every registered module across all screens
- **Screen transition indicator** — flash/highlight modules as they mount/unmount

---

## Unity-Like Interactions

- **Drag-to-Adjust:** Click and drag horizontally on any number label to scrub the value
- **Double-Click to Type:** Double-click a slider value to enter exact numbers
- **Right-Click Context Menu:** Reset to default, copy value, copy path, lock, add keyframe
- **Collapse Memory:** Panel remembers which sections are expanded/collapsed
- **Keyboard Navigation:** Tab/Shift+Tab between controls, arrow keys to adjust, backtick to toggle panel
- **Module Header Actions:** Eye (toggle visibility), Lock, Copy, Pin icons

---

## Implementation Phases

### Phase 1: Core Panel

- DOM sidebar with expand/collapse
- Module registration API
- Slider, toggle, dropdown, color controls
- Active/dormant visual states
- localStorage persistence
- Backtick toggle

### Phase 2: Module Graph

- Prefab composition display
- Universal vs. Instanced identity system
- Screen-aware filtering
- Wired/unwired path indicators
- Search/filter

### Phase 3: Spatial Tools

- Canvas overlay for position/bounds editing
- Drag-to-reposition hotspots
- Visual bounds editor

### Phase 4: Collaboration

- Presets (save/load named configurations)
- URL sharing of tuning overrides
- Promote/demote workflows
- Copy-to-defaults with diff preview

---

## Open Questions

1. **Should dormant modules be editable?** Current thinking: yes, values cached for next mount. But should there be visual confirmation changes won't take effect until mount?
2. **Should logic modules show state?** e.g. evidence-bucket displaying current active clues. Read-only state display below tuning controls? Edges into debugger territory.
3. **Hot-reload integration?** When defaults.ts changes on disk (HMR), should inspector update to reflect new defaults?
4. **Mobile?** Sidebar doesn't work on phone screens. Options: bottom sheet, floating button modal, or disable on mobile.
5. **Creator mode subset?** Could a subset of the inspector be exposed to players for difficulty/visual preferences? Changes the quality bar significantly.
