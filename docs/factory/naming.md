## 📁 Naming

Quick reference for asset naming convention.

Constraints {
  - NO code changes - reference only
  - Display the naming rules from docs/guides/assets/naming-convention.md
}

Process {
  1. Read docs/guides/assets/naming-convention.md
  2. Display the pattern and category table
  3. If user provides a filename, validate it against the convention
  4. Suggest corrections for non-conforming names
}

Output {
  Pattern: `{category}-{name}[_{variant}].{ext}`

  Categories:
  | Prefix | Description |
  |--------|-------------|
  | `piece-` | Game pieces/blocks |
  | `exit-` | Exit points, goals |
  | `character-` | Character sprites |
  | `bg-` | Backgrounds |
  | `item-` | Collectibles, icons |
  | `prop-` | Stage props |
  | `ui-` | UI elements |
  | `vfx-` | Visual effects |
  | `sfx-` | Sound effects |
  | `music-` | Background music |

  Rules:
  - Always lowercase
  - Hyphen between category and name
  - Underscores for multi-word names and variants
  - No spaces or special characters

  Full spec: docs/guides/assets/naming-convention.md
}
