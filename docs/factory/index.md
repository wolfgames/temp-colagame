# Factory

Reusable workflows for common development tasks.

---

## Commands

| Command | What it does | Modifies Code? |
|---------|--------------|:--------------:|
| `/naming` | Asset naming convention reference | No |
| `/newgame` | Setup checklist for forking to a new game | No |
| `/newmodule` | Scaffold a new module in modules/ (see `.cursor/skills/amino-new-module/`) | Yes |
| `/commit` | Git commit with conventional format | Yes |
| `/deploy` | Deploy to QA/staging/production | Asks first |

> **Note:** `/newmodule` workflow and templates have moved to `.cursor/skills/amino-new-module/`.

---

## Files

```
docs/factory/
├── index.md          # This file
├── naming.md         # Asset naming reference
├── newgame.md        # New game setup checklist
├── commit.md         # Conventional commit format
└── deploy.md         # Tag-based deployment
```
